/**
 * Notifications — Prompt 区通知层
 *
 * 当前先接入：
 * - 通知上下文中的当前通知
 * - TokenWarning
 *
 * 由于当前项目还没有完整 PromptOverlay/绝对定位通知层，
 * 这里先以独立单行区域挂到输入区 footer 中，后续可以继续对齐。
 */

import { Box, Text } from '../primitives.js';
import type { ContextTokenUsage } from '../types.js';
import { useNotifications } from '../context/notifications.js';
import { TokenWarning } from './TokenWarning.js';
import { calculateTokenWarningState } from '../../../services/compact/autoCompact.js';

export interface NotificationsProps {
  tokenUsage: ContextTokenUsage | null;
}

export function Notifications({ tokenUsage }: NotificationsProps) {
  const { current } = useNotifications();
  const shouldShowTokenWarning = tokenUsage
    ? calculateTokenWarningState(
        tokenUsage.currentTokens,
        tokenUsage.maxTokens,
      ).isAboveWarningThreshold
    : false;

  if (!current && !shouldShowTokenWarning) {
    return null;
  }

  return (
    <Box flexDirection="column" alignItems="flex-end" flexShrink={0} overflowX="hidden">
      {current && ('jsx' in current ? (
        <Text wrap="truncate-end">{current.jsx}</Text>
      ) : (
        <Text
          color={current.color}
          dimColor={!current.color}
          wrap="truncate-end"
        >
          {current.text}
        </Text>
      ))}
      <TokenWarning tokenUsage={tokenUsage} />
    </Box>
  );
}
