/**
 * 安全工具函数
 * 提供路径安全检查、命令验证等功能
 */

import path from 'node:path';
import { homedir } from 'node:os';

/**
 * 危险命令模式列表
 */
const DANGEROUS_PATTERNS = [
  /rm\s+-rf\s+[/~]/i, // rm -rf / 或 rm -rf ~
  /rm\s+-rf\s+\*/i, // rm -rf *
  />\s*\/dev\/sd[a-z]/i, // 写入磁盘设备
  /mkfs\./i, // 格式化命令
  /dd\s+if=/i, // dd 命令
  /:(){ :|:& };:/i, // fork bomb
  /chmod\s+-R\s+777\s+\//i, // 危险权限修改
  /curl.*\|\s*(ba)?sh/i, // curl | bash
  /wget.*\|\s*(ba)?sh/i, // wget | bash
];

/**
 * 只读命令白名单（用于 Explore 代理）
 * 按"首词"匹配，多词前缀按"完整前缀"匹配。
 */
const READ_ONLY_COMMANDS = [
  // 基础 POSIX 只读
  'ls',
  'cat',
  'head',
  'tail',
  'less',
  'more',
  'grep',
  'egrep',
  'fgrep',
  'find',
  'wc',
  'diff',
  'file',
  'stat',
  'du',
  'df',
  'pwd',
  'echo',
  'printf',
  'which',
  'whereis',
  'type',
  'command',
  'tree',
  'env',
  'printenv',
  'true',
  'false',
  'test',
  'uname',
  'whoami',
  'id',
  'date',
  'hostname',
  // 进程 / 系统观测
  'ps',
  'top',
  'htop',
  'uptime',
  // 现代检索工具
  'rg',
  'ripgrep',
  'fd',
  'bat',
  'jq',
  'yq',
  // Git 只读
  'git log',
  'git diff',
  'git status',
  'git show',
  'git branch',
  'git remote',
  'git blame',
  'git config --get',
  'git rev-parse',
  'git ls-files',
  'git describe',
  'git tag',
  'git stash list',
  'git worktree list',
  // 版本查询
  'node --version',
  'node -v',
  'python --version',
  'python -V',
  'python3 --version',
  'npm --version',
  'pnpm --version',
  'yarn --version',
  'bun --version',
];

/** 只读模式下绝不允许的参数（即便命令本身在白名单里） */
const READ_ONLY_FORBIDDEN_ARGS: Array<{ cmd: string; arg: RegExp; reason: string }> = [
  { cmd: 'find', arg: /(^|\s)-delete(\s|$)/, reason: 'find -delete 会删除文件' },
  { cmd: 'find', arg: /(^|\s)-exec\b/, reason: 'find -exec 可执行任意命令' },
  { cmd: 'find', arg: /(^|\s)-execdir\b/, reason: 'find -execdir 可执行任意命令' },
  { cmd: 'find', arg: /(^|\s)-ok\b/, reason: 'find -ok 可执行任意命令' },
  { cmd: 'grep', arg: /(^|\s)--include=/, reason: '' }, // 这个其实是允许的，占位忽略
];

/**
 * 安全路径检查
 * 确保路径在工作目录内，防止路径遍历攻击
 */
export function safePath(workdir: string, filePath: string): string {
  const trimmed = filePath.trim();
  if (trimmed.includes('..') || trimmed.includes('~')) {
    throw new Error(`路径非法: ${filePath}`);
  }

  const resolved = path.isAbsolute(trimmed)
    ? path.resolve(trimmed)
    : path.resolve(workdir, trimmed);

  const normalizedResolved = path.normalize(resolved);
  const allowedBases = [workdir, homedir(), '/tmp', '/var/tmp']
    .map((p) => path.resolve(p));

  const isAllowed = allowedBases.some((base) => {
    const rel = path.relative(base, normalizedResolved);
    if (!rel || rel === '') return true;
    if (rel.startsWith('..')) return false;
    if (path.isAbsolute(rel)) return false;
    return true;
  });

  if (!isAllowed) {
    throw new Error(`路径越界: ${filePath} 不在允许目录内`);
  }

  return normalizedResolved;
}

/**
 * 验证 bash 命令安全性
 */
export function validateBashCommand(command: string): void {
  // 检查危险模式
  for (const pattern of DANGEROUS_PATTERNS) {
    if (pattern.test(command)) {
      throw new Error(`危险命令被阻止: ${command}`);
    }
  }
}

/**
 * 验证只读命令（用于 Explore 代理）
 *
 * 多层防护：
 * 1. 拒绝重定向（> >> 2> &>）——写文件
 * 2. 拒绝命令替换（$(...) 反引号）——绕过外层检查
 * 3. 按 ; && || | 切成多段，每段都过白名单
 * 4. 白名单命中后，再额外看是否带禁用参数（find -delete 等）
 */
export function validateReadOnlyCommand(command: string): void {
  // 1. 重定向：> >> &> 2> n> 但允许 2>&1 这种只是把错误流并入
  // 简化：只要出现单独 > 或 >> 就拒绝（过程替换 >() 已在 DANGEROUS_PATTERNS 处理）
  if (/(?<![0-9&>])>{1,2}(?!&\d)/.test(command)) {
    throw new Error(`只读模式下不允许重定向输出: ${command}`);
  }
  // 2. 命令替换：$(...) 或反引号
  if (/\$\(|`/.test(command)) {
    throw new Error(`只读模式下不允许命令替换: ${command}`);
  }
  // 3. 拒绝独立的后台执行 & （但 && / >& / &> / 2>&1 等合法）
  if (/(?<![&>0-9])&(?!&|>)/.test(command)) {
    throw new Error(`只读模式下不允许 & 后台执行: ${command}`);
  }

  // 4. 按 && || ; | 切分（不切单个 & 避免打坏 2>&1）
  const segments = command
    .split(/\s*(?:&&|\|\||[;|])\s*/)
    .map((s) => s.trim())
    .filter(Boolean);

  if (segments.length === 0) {
    throw new Error('只读模式下拒绝空命令');
  }

  for (const seg of segments) {
    validateReadOnlySegment(seg);
  }
}

function validateReadOnlySegment(segment: string): void {
  // 提取命令的第一个词（去掉 env VAR=val 前缀这类情况）
  let cmd = segment.trim();
  // 剥除 "VAR=val " 形式的前导赋值
  while (/^[A-Z_][A-Z0-9_]*=/.test(cmd)) {
    cmd = cmd.replace(/^[A-Z_][A-Z0-9_]*=\S*\s+/, '');
  }
  const firstWord = cmd.split(/\s+/)[0] ?? '';

  const isAllowed = READ_ONLY_COMMANDS.some((allowed) => {
    if (allowed.includes(' ')) {
      return cmd.startsWith(allowed + ' ') || cmd === allowed;
    }
    return firstWord === allowed;
  });

  if (!isAllowed) {
    throw new Error(`只读模式下不允许执行: ${segment}`);
  }

  // 针对白名单命令的额外参数检查
  for (const rule of READ_ONLY_FORBIDDEN_ARGS) {
    if (firstWord !== rule.cmd) continue;
    if (!rule.reason) continue;
    if (rule.arg.test(cmd)) {
      throw new Error(`只读模式下不允许 ${rule.cmd} 的该参数（${rule.reason}）: ${segment}`);
    }
  }
}

/**
 * 截断过长的输出
 */
export function truncateOutput(output: string, maxLength: number): string {
  if (output.length <= maxLength) {
    return output;
  }

  const truncated = output.slice(0, maxLength);
  const remaining = output.length - maxLength;

  return `${truncated}\n\n... (输出已截断，省略 ${remaining} 字符)`;
}

/**
 * 检查文件扩展名是否安全
 */
export function isSafeFileExtension(filePath: string): boolean {
  const dangerousExtensions = ['.exe', '.dll', '.so', '.dylib', '.sh', '.bat', '.cmd', '.ps1'];
  const ext = path.extname(filePath).toLowerCase();
  return !dangerousExtensions.includes(ext);
}

/**
 * 清理用户输入
 */
export function sanitizeInput(input: string): string {
  // 移除控制字符
  let cleaned = '';
  for (let i = 0; i < input.length; i++) {
    const code = input.charCodeAt(i);
    if ((code >= 0x00 && code <= 0x1f) || code === 0x7f) {
      continue;
    }
    cleaned += input[i]!;
  }
  return cleaned;
}
