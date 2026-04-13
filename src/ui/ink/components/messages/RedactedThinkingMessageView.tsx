/**
 * RedactedThinkingMessageView — redacted_thinking 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { AssistantRedactedThinkingMessage } from './AssistantRedactedThinkingMessage.js';

type Item = Extract<CompletedItem, { type: 'redacted_thinking' }>;

function RedactedThinkingMessageView(_props: MessageViewProps<Item>) {
  return <AssistantRedactedThinkingMessage />;
}

registerMessageView('redacted_thinking', RedactedThinkingMessageView);
