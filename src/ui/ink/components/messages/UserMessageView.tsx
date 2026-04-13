/**
 * UserMessageView - 用户消息展示
 *
 * - 深色背景高亮（backgroundColor）
 * - paddingRight={1}
 * - ❯ 前缀 + 消息文本
 */

import { Box, Text } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';

type UserMessageItem = Extract<CompletedItem, { type: 'user_message' }>;

export function UserMessageView({ item, isUserContinuation }: MessageViewProps<UserMessageItem>) {
  return (
    <Box
      flexDirection="column"
      marginTop={isUserContinuation ? 0 : 1}
      backgroundColor="blackBright"
      paddingRight={1}
    >
      <Box flexDirection="row">
        <Box flexShrink={0} minWidth={2}>
          <Text bold>❯</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <Text>{item.text}</Text>
        </Box>
      </Box>
    </Box>
  );
}

registerMessageView('user_message', UserMessageView);
