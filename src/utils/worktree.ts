/**
 * worktree — Git Worktree 管理
 *
 * 适配：去掉 bootstrap/state、settings、bun:bundle 等内部依赖，
 * 用 process.cwd() 替代 getCwd()，用 execSync/spawnSync 替代 execFileNoThrow。
 *
 * 功能：
 * - 创建/恢复 git worktree（.ai-agent/worktrees/<slug>/）
 * - 新分支 worktree-<slug> 基于 origin/main
 * - node_modules 等大目录 symlink
 * - .worktreeinclude 文件复制
 * - 清理 worktree（git worktree remove）
 * - 子代理 worktree 创建/清理
 */

import { spawnSync } from 'child_process';
import { existsSync } from 'fs';
import { mkdir, symlink } from 'fs/promises';
import { join } from 'path';

// ─── 常量 ───

const VALID_WORKTREE_SLUG_SEGMENT = /^[a-zA-Z0-9._-]+$/;
const MAX_WORKTREE_SLUG_LENGTH = 64;

/** 阻止 git 弹出凭证提示（会挂起 CLI） */
const GIT_NO_PROMPT_ENV = {
  GIT_TERMINAL_PROMPT: '0',
  GIT_ASKPASS: '',
};

// ─── 类型 ───

export type WorktreeSession = {
  originalCwd: string;
  worktreePath: string;
  worktreeName: string;
  worktreeBranch?: string;
  originalBranch?: string;
  originalHeadCommit?: string;
  creationDurationMs?: number;
};

type WorktreeCreateResult = {
  worktreePath: string;
  worktreeBranch: string;
  headCommit: string;
  existed: boolean;
  baseBranch?: string;
};

// ─── 全局状态 ───

let currentWorktreeSession: WorktreeSession | null = null;

export function getCurrentWorktreeSession(): WorktreeSession | null {
  return currentWorktreeSession;
}

export function restoreWorktreeSession(session: WorktreeSession | null): void {
  currentWorktreeSession = session;
}

// ─── 验证 ───

/**
 * 验证 worktree slug（防止路径遍历和目录逃逸）
 */
export function validateWorktreeSlug(slug: string): void {
  if (slug.length > MAX_WORKTREE_SLUG_LENGTH) {
    throw new Error(`无效的 worktree 名称：必须 ${MAX_WORKTREE_SLUG_LENGTH} 字符以内（当前 ${slug.length}）`);
  }
  for (const segment of slug.split('/')) {
    if (segment === '.' || segment === '..') {
      throw new Error(`无效的 worktree 名称 "${slug}"：不能包含 "." 或 ".." 路径段`);
    }
    if (!VALID_WORKTREE_SLUG_SEGMENT.test(segment)) {
      throw new Error(`无效的 worktree 名称 "${slug}"：每个 "/" 分隔段只能包含字母、数字、点、下划线和连字符`);
    }
  }
}

// ─── 路径辅助 ───

function worktreesDir(repoRoot: string): string {
  return join(repoRoot, '.ai-agent', 'worktrees');
}

function flattenSlug(slug: string): string {
  return slug.replaceAll('/', '+');
}

export function worktreeBranchName(slug: string): string {
  return `worktree-${flattenSlug(slug)}`;
}

function worktreePathFor(repoRoot: string, slug: string): string {
  return join(worktreesDir(repoRoot), flattenSlug(slug));
}

// ─── Git 辅助 ───

function gitExe(): string {
  return 'git';
}

function findGitRoot(cwd: string): string | null {
  try {
    const result = spawnSync(gitExe(), ['rev-parse', '--show-toplevel'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.status === 0 ? result.stdout.trim() : null;
  } catch { return null; }
}

function getCurrentBranch(cwd: string): string {
  try {
    const result = spawnSync(gitExe(), ['branch', '--show-current'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    return result.stdout.trim() || 'HEAD';
  } catch { return 'HEAD'; }
}

function getDefaultBranch(cwd: string): string {
  try {
    const result = spawnSync(gitExe(), ['symbolic-ref', 'refs/remotes/origin/HEAD', '--short'], {
      cwd, encoding: 'utf-8', stdio: ['ignore', 'pipe', 'pipe'],
    });
    if (result.status === 0) return result.stdout.trim().replace('origin/', '');
  } catch { /* fallback */ }
  return 'main';
}

function execGit(args: string[], cwd: string): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(gitExe(), args, {
    cwd, encoding: 'utf-8',
    stdio: ['ignore', 'pipe', 'pipe'],
    env: { ...process.env, ...GIT_NO_PROMPT_ENV },
  });
  return { code: result.status ?? 1, stdout: result.stdout ?? '', stderr: result.stderr ?? '' };
}

// ─── Worktree 创建 ───

async function getOrCreateWorktree(repoRoot: string, slug: string): Promise<WorktreeCreateResult> {
  const worktreePath = worktreePathFor(repoRoot, slug);
  const branch = worktreeBranchName(slug);

  // 快速恢复：worktree 已存在
  if (existsSync(join(worktreePath, '.git'))) {
    const { stdout } = execGit(['rev-parse', 'HEAD'], worktreePath);
    return { worktreePath, worktreeBranch: branch, headCommit: stdout.trim(), existed: true };
  }

  // 新建 worktree
  await mkdir(worktreesDir(repoRoot), { recursive: true });

  const defaultBranch = getDefaultBranch(repoRoot);
  const originRef = `origin/${defaultBranch}`;

  // 尝试 fetch（大仓库可能很慢，skip 如果已有）
  const { code: checkCode } = execGit(['rev-parse', '--verify', originRef], repoRoot);
  let baseBranch = originRef;
  if (checkCode !== 0) {
    const { code: fetchCode } = execGit(['fetch', 'origin', defaultBranch], repoRoot);
    baseBranch = fetchCode === 0 ? originRef : 'HEAD';
  }

  // 获取 base SHA
  const { stdout: baseSha, code: shaCode } = execGit(['rev-parse', baseBranch], repoRoot);
  if (shaCode !== 0) {
    throw new Error(`无法解析基础分支 "${baseBranch}"：git rev-parse 失败`);
  }

  // git worktree add -B <branch> <path> <base>
  const { code: createCode, stderr: createStderr } = execGit(
    ['worktree', 'add', '-B', branch, worktreePath, baseBranch],
    repoRoot,
  );
  if (createCode !== 0) {
    throw new Error(`创建 worktree 失败：${createStderr}`);
  }

  // 后处理：symlink node_modules 等
  await symlinkLargeDirectories(repoRoot, worktreePath);

  return { worktreePath, worktreeBranch: branch, headCommit: baseSha.trim(), existed: false, baseBranch };
}

/** symlink 大目录避免磁盘膨胀 */
async function symlinkLargeDirectories(repoRoot: string, worktreePath: string): Promise<void> {
  const dirsToSymlink = ['node_modules', '.pnpm-store', '.yarn', 'vendor'];
  for (const dir of dirsToSymlink) {
    const sourcePath = join(repoRoot, dir);
    const destPath = join(worktreePath, dir);
    try {
      if (existsSync(sourcePath) && !existsSync(destPath)) {
        await symlink(sourcePath, destPath, 'dir');
      }
    } catch { /* 忽略 */ }
  }
}

// ─── 公共 API ───

/**
 * 为当前会话创建 worktree
 */
export async function createWorktreeForSession(slug: string): Promise<WorktreeSession> {
  validateWorktreeSlug(slug);

  const originalCwd = process.cwd();
  const gitRoot = findGitRoot(originalCwd);
  if (!gitRoot) {
    throw new Error('无法创建 worktree：不在 git 仓库中');
  }

  const originalBranch = getCurrentBranch(originalCwd);
  const createStart = Date.now();

  const { worktreePath, worktreeBranch, headCommit, existed } =
    await getOrCreateWorktree(gitRoot, slug);

  const creationDurationMs = existed ? undefined : Date.now() - createStart;

  currentWorktreeSession = {
    originalCwd,
    worktreePath,
    worktreeName: slug,
    worktreeBranch,
    originalBranch,
    originalHeadCommit: headCommit,
    creationDurationMs,
  };

  return currentWorktreeSession;
}

/**
 * 保留 worktree 并退出（不清理）
 */
export async function keepWorktree(): Promise<void> {
  if (!currentWorktreeSession) return;

  // 切回原始目录
  try { process.chdir(currentWorktreeSession.originalCwd); } catch { /* 忽略 */ }
  currentWorktreeSession = null;
}

/**
 * 清理 worktree 并退出
 */
export async function cleanupWorktree(discardChanges = false): Promise<void> {
  if (!currentWorktreeSession) return;

  const { worktreePath, originalCwd, worktreeBranch } = currentWorktreeSession;

  // 切回原始目录
  try { process.chdir(originalCwd); } catch { /* 忽略 */ }

  // 检查是否有未提交的变更
  if (!discardChanges) {
    const { stdout: statusOut } = execGit(['status', '--porcelain'], worktreePath);
    if (statusOut.trim().length > 0) {
      throw new Error(
        `Worktree 有未提交的变更。使用 discardChanges=true 强制清理，或先提交/暂存变更。\n` +
        `变更文件：\n${statusOut}`,
      );
    }

    // 检查是否有未推送的 commits
    const gitRoot = findGitRoot(originalCwd);
    if (gitRoot && worktreeBranch) {
      const { stdout: logOut } = execGit(
        ['log', '--oneline', `origin/HEAD..${worktreeBranch}`, '--'],
        gitRoot,
      );
      if (logOut.trim().length > 0) {
        throw new Error(
          `Worktree 分支 ${worktreeBranch} 有未推送的 commits：\n${logOut}\n` +
          `使用 discardChanges=true 强制清理。`,
        );
      }
    }
  }

  // git worktree remove
  const gitRoot = findGitRoot(originalCwd);
  if (gitRoot) {
    const removeArgs = ['worktree', 'remove'];
    if (discardChanges) removeArgs.push('--force');
    removeArgs.push(worktreePath);
    execGit(removeArgs, gitRoot);

    // 删除分支
    if (worktreeBranch) {
      execGit(['branch', '-D', worktreeBranch], gitRoot);
    }
  }

  currentWorktreeSession = null;
}

/**
 * 为子代理创建 worktree
 */
export async function createAgentWorktree(slug: string): Promise<{
  worktreePath: string;
  worktreeBranch: string;
}> {
  validateWorktreeSlug(slug);
  const cwd = process.cwd();
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) throw new Error('无法创建代理 worktree：不在 git 仓库中');

  const { worktreePath, worktreeBranch } = await getOrCreateWorktree(gitRoot, slug);
  return { worktreePath, worktreeBranch };
}

/**
 * 清理子代理 worktree
 */
export async function removeAgentWorktree(
  worktreePath: string,
  worktreeBranch: string,
): Promise<void> {
  const gitRoot = findGitRoot(process.cwd());
  if (!gitRoot) return;

  execGit(['worktree', 'remove', '--force', worktreePath], gitRoot);
  execGit(['branch', '-D', worktreeBranch], gitRoot);
}

/**
 * 列出当前仓库的所有 worktree
 */
export function listWorktrees(): string[] {
  const cwd = process.cwd();
  const gitRoot = findGitRoot(cwd);
  if (!gitRoot) return [];

  const { stdout, code } = execGit(['worktree', 'list', '--porcelain'], gitRoot);
  if (code !== 0) return [];

  return stdout
    .split('\n')
    .filter((line) => line.startsWith('worktree '))
    .map((line) => line.slice('worktree '.length));
}
