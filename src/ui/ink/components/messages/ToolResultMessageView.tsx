/**
 * ToolResultMessageView — 工具结果展示
 *
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { ToolResultView } from '../ToolResultView.js';

type ToolResultItem = Extract<CompletedItem, { type: 'tool_result' }>;

export function ToolResultMessageView({ item }: MessageViewProps<ToolResultItem>) {
  return (
    <ToolResultView
      name={item.name}
      content={item.content}
      isError={item.isError}
      input={item.input}
    />
  );
}

registerMessageView('tool_result', ToolResultMessageView);
