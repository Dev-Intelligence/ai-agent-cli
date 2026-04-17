/**
 * 记忆类型枚举
 *
 * 对照源：claude-code-sourcemap/src/memdir/memoryTypes.ts
 * 只保留类型定义，不复制 ~200 行的 system prompt 片段；
 * 那些 prompt 片段在本项目里已以中文重写并放在 src/prompts/ 下。
 */

export const MEMORY_TYPES = ['user', 'feedback', 'project', 'reference'] as const;

export type MemoryType = (typeof MEMORY_TYPES)[number];

/** 将原始 frontmatter 值解析为 MemoryType，非法或缺失时返回 undefined */
export function parseMemoryType(raw: unknown): MemoryType | undefined {
  if (typeof raw !== 'string') return undefined;
  return MEMORY_TYPES.find((t) => t === raw);
}
