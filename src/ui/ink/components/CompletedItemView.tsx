/**
 * CompletedItemView - Static 区域项路由组件
 *
 * 通过消息注册表分发到对应的消息组件
 */

import type { CompletedItem } from '../types.js';
import { getMessageView } from './messages/index.js';

export interface CompletedItemViewProps {
  item: CompletedItem;
}

export function CompletedItemView({ item }: CompletedItemViewProps) {
  const View = getMessageView(item.type);
  if (!View) return null;
  return <View item={item} />;
}
