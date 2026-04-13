/**
 * FileEditToolUseRejectedMessage — 文件编辑被拒绝展示
 *
 * 显示 "User rejected write/update to path" + 可选的 diff/内容预览（dimColor）。
 */

import path from 'node:path';
import type { StructuredPatchHunk } from 'diff';
import React from 'react';
import { Box, Text } from '../primitives.js';
import { HighlightedCode } from './HighlightedCode.js';
import { MessageResponse } from './MessageResponse.js';
import { StructuredDiffList } from './StructuredDiff/index.js';

const MAX_LINES_TO_RENDER = 10;

type Props = {
  /** 文件路径 */
  file_path: string;
  /** 操作类型 */
  operation: 'write' | 'update';
  /** 更新操作的 diff hunks */
  patch?: StructuredPatchHunk[];
  /** 新建文件的内容 */
  content?: string;
  /** 是否 verbose */
  verbose?: boolean;
};

export function FileEditToolUseRejectedMessage({
  file_path,
  operation,
  patch,
  content,
  verbose = false,
}: Props): React.ReactNode {
  const displayPath = verbose ? file_path : path.relative(process.cwd(), file_path);

  const header = (
    <Box flexDirection="row">
      <Text dimColor>User rejected {operation} to </Text>
      <Text bold dimColor>{displayPath}</Text>
    </Box>
  );

  // 新建文件被拒绝：显示内容预览
  if (operation === 'write' && content !== undefined) {
    const lines = content.split('\n');
    const numLines = lines.length;
    const plusLines = numLines - MAX_LINES_TO_RENDER;
    const truncatedContent = verbose
      ? content
      : lines.slice(0, MAX_LINES_TO_RENDER).join('\n');

    return (
      <MessageResponse>
        <Box flexDirection="column">
          {header}
          <HighlightedCode
            code={truncatedContent || '(No content)'}
            filePath={file_path}
          />
          {!verbose && plusLines > 0 && (
            <Text dimColor>… +{plusLines} lines</Text>
          )}
        </Box>
      </MessageResponse>
    );
  }

  // 更新被拒绝：显示 diff
  if (!patch || patch.length === 0) {
    return <MessageResponse>{header}</MessageResponse>;
  }

  const width = Math.max(40, (process.stdout.columns || 80) - 12);

  return (
    <MessageResponse>
      <Box flexDirection="column">
        {header}
        <StructuredDiffList hunks={patch} dim width={width} filePath={file_path} />
      </Box>
    </MessageResponse>
  );
}
