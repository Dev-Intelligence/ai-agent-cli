/**
 * StatusLine - 独立状态栏组件
 *
 * - 仅在用户配置了 statusline 命令时显示
 * - 通过外部命令动态生成内容
 * - 在内容尚未返回时保留一行高度，避免输入区跳动
 */

import { useMemo } from 'react';
import { PRODUCT_VERSION } from '../../../core/constants.js';
import { getStatusLineCommand } from '../../../services/ui/statusline.js';
import { Ansi, Box, Text } from '../primitives.js';
import { useStatusLine, type StatusLineContext } from '../hooks/useStatusLine.js';
import type { TokenStatsSnapshot } from './EnhancedSpinner.js';

export interface StatusLineProps {
  modelName?: string;
  provider?: string;
  getTokenStats?: () => TokenStatsSnapshot;
}

/**
 * 判断当前是否启用了 statusline 命令。
 */
export function shouldShowStatusLine(): boolean {
  return Boolean(getStatusLineCommand());
}

export function StatusLine({
  modelName,
  provider,
  getTokenStats,
}: StatusLineProps) {
  const stats = getTokenStats?.();
  const context = useMemo<StatusLineContext>(() => ({
    model: modelName,
    provider,
    workdir: process.cwd(),
    version: PRODUCT_VERSION,
    cost: stats
      ? {
          totalTokens: stats.totalTokens,
          totalCost: stats.totalCost,
        }
      : undefined,
  }), [
    modelName,
    provider,
    stats?.totalTokens,
    stats?.totalCost,
  ]);

  const statusLineText = useStatusLine(context);

  if (!shouldShowStatusLine()) {
    return null;
  }

  return (
    <Box paddingX={2}>
      {statusLineText ? (
        <Ansi dimColor>{statusLineText}</Ansi>
      ) : (
        // 预留一行高度，避免状态栏首次返回内容时挤压输入区域。
        <Text> </Text>
      )}
    </Box>
  );
}
