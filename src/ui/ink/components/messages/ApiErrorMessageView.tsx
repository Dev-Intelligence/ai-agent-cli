/**
 * ApiErrorMessageView — api_error 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { SystemAPIErrorMessage } from './SystemAPIErrorMessage.js';

type Item = Extract<CompletedItem, { type: 'api_error' }>;

function ApiErrorMessageView({ item }: MessageViewProps<Item>) {
  return (
    <SystemAPIErrorMessage
      error={item.error}
      retryInMs={item.retryInMs}
      retryAttempt={item.retryAttempt}
      maxRetries={item.maxRetries}
    />
  );
}

registerMessageView('api_error', ApiErrorMessageView);
