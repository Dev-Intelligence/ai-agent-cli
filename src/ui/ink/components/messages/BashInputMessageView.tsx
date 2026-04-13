/**
 * BashInputMessageView — bash_input 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { UserBashInputMessage } from './UserBashInputMessage.js';

type Item = Extract<CompletedItem, { type: 'bash_input' }>;

function BashInputMessageView({ item }: MessageViewProps<Item>) {
  return <UserBashInputMessage command={item.command} addMargin />;
}

registerMessageView('bash_input', BashInputMessageView);
