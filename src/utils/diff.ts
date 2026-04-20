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

/**
 * 将 patch hunks 渲染为终端友好的带行号 diff，用于 Edit/Write 工具的
 * uiContent 展示。每行格式：
 *   - 上下文行：`       NNN | content`
 *   - 删除行：  `  ─── NNN | content`
 *   - 新增行：  `  +++ NNN | content`
 * 多 hunk 之间用 `  ⋯` 隔开。
 */
export function renderHunksForUI(hunks: StructuredPatchHunk[]): string {
  if (hunks.length === 0) return '';
  const outLines: string[] = [];
  // 行号宽度按所有 hunk 里出现的最大行号算
  const maxLine = hunks.reduce((m, h) => {
    return Math.max(
      m,
      h.oldStart + h.oldLines,
      h.newStart + h.newLines,
    );
  }, 0);
  const width = String(maxLine).length;

  for (let hi = 0; hi < hunks.length; hi++) {
    const h = hunks[hi]!;
    if (hi > 0) outLines.push('  ⋯');
    let oldN = h.oldStart;
    let newN = h.newStart;
    for (const raw of h.lines) {
      const marker = raw[0] ?? ' ';
      const text = raw.slice(1);
      if (marker === '\\') continue; // "\ No newline at end of file"
      const pad = (n: number): string => String(n).padStart(width);
      if (marker === '-') {
        outLines.push(`  ─── ${pad(oldN)} | ${text}`);
        oldN++;
      } else if (marker === '+') {
        outLines.push(`  +++ ${pad(newN)} | ${text}`);
        newN++;
      } else {
        outLines.push(`       ${pad(newN)} | ${text}`);
        oldN++;
        newN++;
      }
    }
  }
  return outLines.join('\n');
}

/**
 * 简短摘要：`1 hunk, +3, -2` 或 `2 hunks, +5`。
 */
export function summarizeHunks(hunks: StructuredPatchHunk[]): string {
  const { additions, removals } = countPatchChanges(hunks);
  const hunkWord = hunks.length === 1 ? 'hunk' : 'hunks';
  const parts: string[] = [`${hunks.length} ${hunkWord}`];
  if (additions > 0) parts.push(`+${additions}`);
  if (removals > 0) parts.push(`-${removals}`);
  return parts.join(', ');
}
