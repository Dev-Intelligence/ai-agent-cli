/**
 * BashOutputMessageView — bash_output 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { UserBashOutputMessage } from './UserBashOutputMessage.js';

type Item = Extract<CompletedItem, { type: 'bash_output' }>;

function BashOutputMessageView({ item }: MessageViewProps<Item>) {
  return <UserBashOutputMessage stdout={item.stdout} stderr={item.stderr} />;
}

registerMessageView('bash_output', BashOutputMessageView);
