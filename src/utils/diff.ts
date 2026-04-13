/**
 * diff — 结构化 diff 工具
 *
 * 生成文件编辑的 structured patch，处理 &/$ 字符转义。
 */

import { type StructuredPatchHunk, structuredPatch } from 'diff';

export const CONTEXT_LINES = 3;
export const DIFF_TIMEOUT_MS = 5_000;

// diff 库对 & 和 $ 字符处理有 bug，需要转义
const AMPERSAND_TOKEN = '<<:AMPERSAND_TOKEN:>>';
const DOLLAR_TOKEN = '<<:DOLLAR_TOKEN:>>';

function escapeForDiff(s: string): string {
  return s.replaceAll('&', AMPERSAND_TOKEN).replaceAll('$', DOLLAR_TOKEN);
}

function unescapeFromDiff(s: string): string {
  return s.replaceAll(AMPERSAND_TOKEN, '&').replaceAll(DOLLAR_TOKEN, '$');
}

/** 调整 hunk 行号偏移（当 diff 输入是文件切片时使用） */
export function adjustHunkLineNumbers(
  hunks: StructuredPatchHunk[],
  offset: number,
): StructuredPatchHunk[] {
  if (offset === 0) return hunks;
  return hunks.map((h) => ({
    ...h,
    oldStart: h.oldStart + offset,
    newStart: h.newStart + offset,
  }));
}

/** 从新旧内容生成 patch hunks */
export function getPatchFromContents({
  filePath,
  oldContent,
  newContent,
  ignoreWhitespace = false,
  singleHunk = false,
}: {
  filePath: string;
  oldContent: string;
  newContent: string;
  ignoreWhitespace?: boolean;
  singleHunk?: boolean;
}): StructuredPatchHunk[] {
  const result = structuredPatch(
    filePath,
    filePath,
    escapeForDiff(oldContent),
    escapeForDiff(newContent),
    undefined,
    undefined,
    {
      ignoreWhitespace,
      context: singleHunk ? 100_000 : CONTEXT_LINES,
      timeout: DIFF_TIMEOUT_MS,
    },
  );
  if (!result) return [];
  return result.hunks.map((h) => ({
    ...h,
    lines: h.lines.map(unescapeFromDiff),
  }));
}

/** 统计 patch 中新增/删除的行数 */
export function countPatchChanges(
  hunks: StructuredPatchHunk[],
  newFileContent?: string,
): { additions: number; removals: number } {
  if (hunks.length === 0 && newFileContent) {
    return { additions: newFileContent.split(/\r?\n/).length, removals: 0 };
  }
  const additions = hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l) => l.startsWith('+')).length,
    0,
  );
  const removals = hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter((l) => l.startsWith('-')).length,
    0,
  );
  return { additions, removals };
}

/** 将 patch hunks 格式化为可读的 unified diff 文本 */
export function formatPatchAsText(
  filePath: string,
  hunks: StructuredPatchHunk[],
): string {
  if (hunks.length === 0) return '';
  const lines: string[] = [];
  lines.push(`--- ${filePath}`);
  lines.push(`+++ ${filePath}`);
  for (const hunk of hunks) {
    lines.push(`@@ -${hunk.oldStart},${hunk.oldLines} +${hunk.newStart},${hunk.newLines} @@`);
    lines.push(...hunk.lines);
  }
  return lines.join('\n');
}
