/**
 * FileContentView — 文件内容展示（带行号 + 语法高亮）
 *
 * read_file 结果带行号 + 语法高亮。
 *
 * 布局：
 *    1 │ import React from 'react';
 *    2 │ import { Box } from './primitives';
 *    3 │
 *    4 │ export function App() {
 */

import { useMemo } from 'react';
import { Box, Text } from '../../primitives.js';
import { HighlightedCode } from '../HighlightedCode.js';

// ─── Props ───

export interface FileContentViewProps {
  /** 文件内容 */
  content: string;
  /** 文件路径（用于语言检测） */
  filePath?: string;
  /** 起始行号（默认 1） */
  startLine?: number;
  /** 最大显示行数（默认 50，防止超长文件） */
  maxLines?: number;
  /** 是否显示行号（默认 true） */
  showLineNumbers?: boolean;
}

// ─── 组件 ───

export function FileContentView({
  content,
  filePath,
  startLine = 1,
  maxLines = 50,
  showLineNumbers = true,
}: FileContentViewProps) {
  const lines = useMemo(() => content.split('\n'), [content]);
  const displayLines = lines.slice(0, maxLines);
  const truncated = lines.length > maxLines;
  const maxLineNum = startLine + displayLines.length - 1;
  const gutterWidth = maxLineNum.toString().length;

  if (!showLineNumbers) {
    // 无行号模式：直接用 HighlightedCode
    return (
      <Box flexDirection="column">
        <HighlightedCode code={displayLines.join('\n')} filePath={filePath} />
        {truncated && (
          <Text dimColor>  ... (+{lines.length - maxLines} 行)</Text>
        )}
      </Box>
    );
  }

  // 带行号模式：逐行渲染
  return (
    <Box flexDirection="column">
      {displayLines.map((line, i) => {
        const lineNum = (startLine + i).toString().padStart(gutterWidth);
        return (
          <Box key={i} flexDirection="row">
            <Text dimColor>{lineNum} │ </Text>
            <Text>{line}</Text>
          </Box>
        );
      })}
      {truncated && (
        <Text dimColor>  ... (+{lines.length - maxLines} 行)</Text>
      )}
    </Box>
  );
}
