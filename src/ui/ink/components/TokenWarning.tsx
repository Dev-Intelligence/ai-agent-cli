/**
 * TokenWarning — Prompt 区上下文容量告警
 *
 * - 当上下文接近自动压缩阈值时显示提醒
 * - 显示“距离 auto-compact 还有多少空间”
 * - 到达更高风险区间时切换为错误色
 *
 * 当前项目适配：
 * - 使用当前项目真实的自动压缩阈值计算
 */

import { Box, Text } from '../primitives.js';
import type { ContextTokenUsage } from '../types.js';
import { calculateTokenWarningState } from '../../../services/compact/autoCompact.js';

export interface TokenWarningProps {
  tokenUsage: ContextTokenUsage | null;
}

export function TokenWarning({ tokenUsage }: TokenWarningProps) {
  if (!tokenUsage) {
    return null;
  }

  const {
    percentLeft,
    isAboveWarningThreshold,
    isAboveErrorThreshold,
  } = calculateTokenWarningState(
    tokenUsage.currentTokens,
    tokenUsage.maxTokens,
  );

  if (!isAboveWarningThreshold) {
    return null;
  }

  const label = `${percentLeft}% until auto-compact`;

  return (
    <Box flexDirection="row">
      <Text
        color={isAboveErrorThreshold ? 'error' : undefined}
        dimColor={!isAboveErrorThreshold}
        wrap="truncate-end"
      >
        {label}
      </Text>
    </Box>
  );
}
