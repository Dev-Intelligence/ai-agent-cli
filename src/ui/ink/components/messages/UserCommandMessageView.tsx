/**
 * UserCommandMessageView — user_command 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { UserCommandMessage } from './UserCommandMessage.js';

type Item = Extract<CompletedItem, { type: 'user_command' }>;

function UserCommandMessageView({ item }: MessageViewProps<Item>) {
  return (
    <UserCommandMessage
      command={item.command}
      args={item.args}
      isSkill={item.isSkill}
      addMargin
    />
  );
}

registerMessageView('user_command', UserCommandMessageView);
