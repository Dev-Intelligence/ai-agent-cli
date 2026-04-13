/**
 * SystemMessageView - 系统消息展示
 */

import { Box } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { SystemMessage } from '../SystemMessage.js';

type SystemItem = Extract<CompletedItem, { type: 'system' }>;

export function SystemMessageView({ item }: MessageViewProps<SystemItem>) {
  return (
    <Box marginTop={1}>
      <SystemMessage level={item.level} text={item.text} />
    </Box>
  );
}

registerMessageView('system', SystemMessageView);
