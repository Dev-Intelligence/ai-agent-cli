/**
 * ToolUseMessageView - 工具调用展示
 *
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { ToolUseView } from '../ToolUseView.js';

type ToolUseItem = Extract<CompletedItem, { type: 'tool_use' }>;

export function ToolUseMessageView({ item }: MessageViewProps<ToolUseItem>) {
  return (
    <ToolUseView
      name={item.name}
      detail={item.detail}
      status={item.status === 'error' ? 'error' : 'done'}
      animate={false}
    />
  );
}

registerMessageView('tool_use', ToolUseMessageView);
