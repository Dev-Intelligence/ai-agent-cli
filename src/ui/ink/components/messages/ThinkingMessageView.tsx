/**
 * ThinkingMessageView — thinking 类型 CompletedItem 的视图注册
 *
 * 将 thinking 类型的 CompletedItem 连接到 AssistantThinkingMessage 组件。
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { AssistantThinkingMessage } from './AssistantThinkingMessage.js';

type ThinkingItem = Extract<CompletedItem, { type: 'thinking' }>;

function ThinkingMessageView({ item }: MessageViewProps<ThinkingItem>) {
  return (
    <AssistantThinkingMessage thinking={item.thinking} />
  );
}

registerMessageView('thinking', ThinkingMessageView);
