/**
 * CompactSummary — 压缩摘要展示
 *
 * 展示一轮对话的摘要信息：工具使用次数 + token 数 + 耗时。
 */

import React from 'react';
import { Box, Text } from '../primitives.js';

type Props = {
  /** 总 token 消耗 */
  totalTokens: number;
  /** 工具使用次数 */
  toolCount: number;
  /** 耗时（毫秒） */
  durationMs: number;
};

/** 格式化数字：1000 → 1K */
function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function CompactSummary({
  totalTokens,
  toolCount,
  durationMs,
}: Props): React.ReactNode {
  const durationSec = (durationMs / 1000).toFixed(1);

  return (
    <Box paddingLeft={2} marginTop={1}>
      <Text dimColor>
        <Text bold>Summary:</Text>
        {' '}
        {toolCount} tool {toolCount === 1 ? 'use' : 'uses'}
        {' · '}
        {formatNumber(totalTokens)} tokens
        {' · '}
        {durationSec}s
      </Text>
    </Box>
  );
}
