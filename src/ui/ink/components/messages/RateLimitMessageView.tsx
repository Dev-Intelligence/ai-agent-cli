/**
 * RateLimitMessageView — rate_limit 类型的视图注册
 */

import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { RateLimitMessage } from './RateLimitMessage.js';

type Item = Extract<CompletedItem, { type: 'rate_limit' }>;

function RateLimitMessageView({ item }: MessageViewProps<Item>) {
  return <RateLimitMessage text={item.text} retryInSeconds={item.retryInSeconds} />;
}

registerMessageView('rate_limit', RateLimitMessageView);
