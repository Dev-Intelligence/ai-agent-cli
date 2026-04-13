/**
 * UserImageMessageView — user_image 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { UserImageMessage } from './UserImageMessage.js';

type Item = Extract<CompletedItem, { type: 'user_image' }>;

function UserImageMessageView({ item }: MessageViewProps<Item>) {
  return <UserImageMessage imageId={item.imageId} addMargin />;
}

registerMessageView('user_image', UserImageMessageView);
