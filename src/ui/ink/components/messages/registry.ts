/**
 * 消息组件注册表（无循环依赖的独立模块）
 */

import type { FC } from 'react';
import type { CompletedItem } from '../../types.js';

// 消息组件 Props 统一接口
export type MessageViewProps<T extends CompletedItem = CompletedItem> = {
  item: T;
  /** 是否为连续用户消息（第二条起不加 marginTop） */
  isUserContinuation?: boolean;
};

// 注册表：type → 组件
const registry = new Map<CompletedItem['type'], FC<MessageViewProps<any>>>();

/**
 * 注册消息组件
 */
export function registerMessageView<T extends CompletedItem['type']>(
  type: T,
  component: FC<MessageViewProps<Extract<CompletedItem, { type: T }>>>,
): void {
  registry.set(type, component as FC<MessageViewProps<any>>);
}

/**
 * 获取消息组件
 */
export function getMessageView(type: CompletedItem['type']): FC<MessageViewProps<any>> | undefined {
  return registry.get(type);
}
