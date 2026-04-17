/**
 * Memdir 路径解析
 *
 * 简化版对照源：claude-code-sourcemap/src/memdir/paths.ts
 * 忽略 Growthbook / Cowork / policySettings 等企业侧逻辑，
 * 保留核心契约：
 *   auto-memory 根目录 = ~/.ai-agent/projects/<sanitized-cwd>/memory/
 *   入口文件 = <auto-memory 根>/MEMORY.md
 */

import path from 'node:path';
import os from 'node:os';

const DIRNAME = 'memory';
const ENTRYPOINT_NAME = 'MEMORY.md';

/** 记忆存储基目录：~/.ai-agent */
export function getMemoryBaseDir(): string {
  return path.join(os.homedir(), '.ai-agent');
}

/**
 * 把一个绝对路径净化成可做文件/目录名的 slug：
 *  - 绝对路径前缀 / 被替换为 "-"
 *  - 盘符 : 被删除
 *  - 其它非安全字符替换为 "-"
 *  - 折叠连续 "-"
 * 保持与 claude-code 行为相似（对 Windows 路径亦适用）。
 */
export function sanitizePathForSlug(absolutePath: string): string {
  const noDrive = absolutePath.replace(/^[A-Za-z]:/, '');
  return noDrive
    .replace(/[\\/]+/g, '-')
    .replace(/[^a-zA-Z0-9._\-\u4e00-\u9fa5]/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** 给定 cwd（默认 process.cwd()），计算其 memdir 目录路径 */
export function getAutoMemPath(cwd: string = process.cwd()): string {
  const projectsDir = path.join(getMemoryBaseDir(), 'projects');
  const slug = sanitizePathForSlug(cwd);
  return path.join(projectsDir, slug, DIRNAME);
}

/** 入口 MEMORY.md 完整路径 */
export function getAutoMemEntrypoint(cwd: string = process.cwd()): string {
  return path.join(getAutoMemPath(cwd), ENTRYPOINT_NAME);
}

/** 判断一个绝对路径是否落在当前 cwd 的 memdir 下 */
export function isAutoMemPath(absolutePath: string, cwd: string = process.cwd()): boolean {
  const normalized = path.normalize(absolutePath);
  const root = getAutoMemPath(cwd) + path.sep;
  return (normalized + path.sep).startsWith(root);
}
