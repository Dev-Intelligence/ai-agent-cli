/**
 * CompactBoundaryMessageView — compact_boundary 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { CompactBoundaryMessage } from './CompactBoundaryMessage.js';

type Item = Extract<CompletedItem, { type: 'compact_boundary' }>;

function CompactBoundaryMessageView(_props: MessageViewProps<Item>) {
  return <CompactBoundaryMessage />;
}

registerMessageView('compact_boundary', CompactBoundaryMessageView);
