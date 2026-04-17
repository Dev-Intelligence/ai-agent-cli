/**
 * 记忆文件扫描与解析
 *
 * 约定：
 *   - 记忆文件位于 memdir 根目录下（扩展名 .md）
 *   - MEMORY.md 是索引，不作为独立记忆项
 *   - 每个 .md 前有 YAML frontmatter：name / description / type
 *   - frontmatter 之后即记忆正文
 */

import fs from 'fs-extra';
import path from 'node:path';
import matter from 'gray-matter';
import { getAutoMemPath } from './paths.js';
import { MEMORY_TYPES, parseMemoryType, type MemoryType } from './memoryTypes.js';

const ENTRYPOINT = 'MEMORY.md';

export interface MemoryRecord {
  /** 绝对路径 */
  filePath: string;
  /** 相对于 memdir 的文件名（eg. `user_role.md`） */
  fileName: string;
  name: string;
  description: string;
  type: MemoryType | undefined;
  /** 记忆正文（frontmatter 之后） */
  body: string;
  /** 文件的 mtime（ms），用于老化/排序 */
  mtimeMs: number;
}

export interface ScanOptions {
  /** 强制指定 memdir；默认由 getAutoMemPath(cwd) 计算 */
  memdirPath?: string;
  /** 默认 process.cwd() */
  cwd?: string;
}

/** 扫描当前项目的 memdir，返回所有合法记忆记录 */
export async function scanMemories(options: ScanOptions = {}): Promise<MemoryRecord[]> {
  const memdir = options.memdirPath ?? getAutoMemPath(options.cwd);
  if (!(await fs.pathExists(memdir))) return [];

  const entries = await fs.readdir(memdir);
  const records: MemoryRecord[] = [];

  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    if (entry === ENTRYPOINT) continue; // 索引文件不参与
    const filePath = path.join(memdir, entry);
    try {
      const stats = await fs.stat(filePath);
      if (!stats.isFile()) continue;
      const raw = await fs.readFile(filePath, 'utf-8');
      const parsed = matter(raw);
      const fm = parsed.data as Record<string, unknown>;
      const name = typeof fm.name === 'string' ? fm.name : entry.replace(/\.md$/, '');
      const description = typeof fm.description === 'string' ? fm.description : '';
      const type = parseMemoryType(fm.type);
      records.push({
        filePath,
        fileName: entry,
        name,
        description,
        type,
        body: parsed.content.trim(),
        mtimeMs: stats.mtimeMs,
      });
    } catch {
      // 跳过损坏文件，不中断整次扫描
    }
  }

  return records;
}

/** 按类型分桶 */
export function groupByType(records: MemoryRecord[]): Record<MemoryType | 'unknown', MemoryRecord[]> {
  const groups: Record<MemoryType | 'unknown', MemoryRecord[]> = {
    user: [],
    feedback: [],
    project: [],
    reference: [],
    unknown: [],
  };
  for (const r of records) {
    const key = r.type ?? 'unknown';
    groups[key].push(r);
  }
  return groups;
}

/** 已知类型枚举（便于 CLI 展示） */
export { MEMORY_TYPES };
