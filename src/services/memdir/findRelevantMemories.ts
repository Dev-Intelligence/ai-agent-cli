/**
 * 找出与当前用户输入相关的记忆。
 *
 * 对照源：claude-code-sourcemap/src/memdir/findRelevantMemories.ts（未暴露）
 * 此处实现一个务实的朴素评分：
 *   - description 命中关键词 +3 分
 *   - name 命中 +2 分
 *   - body 命中 +1 分（最多 5 次）
 *   - type === 'user' 或 'feedback' 再 +1 分（优先使用户画像/反馈）
 *   - mtime 越新加权越高（log-scaled）
 *
 * 返回按分数降序的前 N 条记忆。
 */

import type { MemoryRecord } from './memoryScan.js';

const STOPWORDS = new Set<string>([
  'the', 'is', 'are', 'a', 'an', 'of', 'and', 'or', 'to', 'for', 'with',
  '的', '和', '与', '是', '在', '了', '有', '这', '那', '我', '你', '他',
]);

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .split(/[^\p{L}\p{N}]+/u)
    .filter((t) => t.length >= 2 && !STOPWORDS.has(t));
}

function countOccurrences(haystack: string, needle: string): number {
  if (!needle) return 0;
  let count = 0;
  let idx = 0;
  const lower = haystack.toLowerCase();
  while ((idx = lower.indexOf(needle, idx)) !== -1) {
    count++;
    idx += needle.length;
  }
  return count;
}

export interface RankedMemory extends MemoryRecord {
  score: number;
}

export interface FindOptions {
  /** 返回前 N 条 */
  limit?: number;
  /** 得分阈值，低于此值的记忆即使排在前面也不返回 */
  minScore?: number;
  /** 用于计算 recency 的当前时间戳（默认 Date.now()） */
  now?: number;
}

export function findRelevantMemories(
  userInput: string,
  memories: readonly MemoryRecord[],
  options: FindOptions = {},
): RankedMemory[] {
  const limit = options.limit ?? 5;
  const minScore = options.minScore ?? 1;
  const now = options.now ?? Date.now();

  const tokens = tokenize(userInput);
  if (tokens.length === 0) return [];

  const ranked: RankedMemory[] = [];
  for (const mem of memories) {
    let score = 0;
    const description = mem.description.toLowerCase();
    const name = mem.name.toLowerCase();
    const body = mem.body.toLowerCase();
    for (const token of tokens) {
      if (description.includes(token)) score += 3;
      if (name.includes(token)) score += 2;
      const bodyHits = Math.min(countOccurrences(body, token), 5);
      score += bodyHits;
    }
    if (score === 0) continue;

    if (mem.type === 'user' || mem.type === 'feedback') score += 1;

    // Recency: 最近 7 天内 +2；30 天内 +1；更早 +0
    const ageDays = (now - mem.mtimeMs) / (1000 * 60 * 60 * 24);
    if (ageDays <= 7) score += 2;
    else if (ageDays <= 30) score += 1;

    ranked.push({ ...mem, score });
  }

  ranked.sort((a, b) => b.score - a.score || b.mtimeMs - a.mtimeMs);
  return ranked.filter((r) => r.score >= minScore).slice(0, limit);
}
