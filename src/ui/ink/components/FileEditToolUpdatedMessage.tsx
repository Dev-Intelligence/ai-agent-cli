/**
 * FileEditToolUpdatedMessage — 文件编辑成功结果展示
 *
 * - 顶部显示 "Added N lines / Removed N lines" 统计
 * - 下方渲染 StructuredDiffList（逐词 diff）
 */

import React from 'react';
import type { StructuredPatchHunk } from 'diff';
import { Box, Text } from '../primitives.js';
import { MessageResponse } from './MessageResponse.js';
import { StructuredDiffList } from './StructuredDiff/index.js';

interface Props {
  filePath: string;
  hunks: StructuredPatchHunk[];
}

export function FileEditToolUpdatedMessage({ filePath, hunks }: Props): React.ReactNode {
  const numAdditions = hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter(l => l.startsWith('+')).length,
    0,
  );
  const numRemovals = hunks.reduce(
    (acc, hunk) => acc + hunk.lines.filter(l => l.startsWith('-')).length,
    0,
  );

  const summary = (
    <Text>
      {numAdditions > 0 && (
        <>Added <Text bold>{numAdditions}</Text> {numAdditions === 1 ? 'line' : 'lines'}</>
      )}
      {numAdditions > 0 && numRemovals > 0 && ', '}
      {numRemovals > 0 && (
        <>{numAdditions === 0 ? 'R' : 'r'}emoved <Text bold>{numRemovals}</Text> {numRemovals === 1 ? 'line' : 'lines'}</>
      )}
    </Text>
  );

  if (hunks.length === 0) {
    return (
      <MessageResponse height={1}>
        {summary}
      </MessageResponse>
    );
  }

  const width = Math.max(40, (process.stdout.columns || 80) - 12);

  return (
    <MessageResponse>
      <Box flexDirection="column">
        <Text>{summary}</Text>
        <StructuredDiffList hunks={hunks} dim={false} width={width} filePath={filePath} />
      </Box>
    </MessageResponse>
  );
}
