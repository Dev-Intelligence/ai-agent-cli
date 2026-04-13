/**
 * DividerView - 分隔线展示
 */

import { Text } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';

type DividerItem = Extract<CompletedItem, { type: 'divider' }>;

export function DividerView({ item: _item }: MessageViewProps<DividerItem>) {
  return <Text dimColor>{'─'.repeat(50)}</Text>;
}

registerMessageView('divider', DividerView);
