/**
 * - 主会话（非 transcript）下 hasMetadata 为 false → addMargin 恒为 true。
 * - 但 user 的 tool_result 行不消费 addMargin，紧接在 assistant 的 tool_use 之后；
 *   因此当上一项为配对的 tool_use 时，当前 tool_result 不应再插入 marginTop。
 */

import type { RenderableMessage } from '../Messages.js';

export function messageRowNeedsTopMargin(
  message: RenderableMessage,
  index: number,
  messages: RenderableMessage[],
): boolean {
  if (index === 0) {
    return true;
  }
  const prev = messages[index - 1];
  if (
    message.type === 'tool_result' &&
    prev?.type === 'tool_use' &&
    message.toolUseId === prev.toolUseId
  ) {
    return false;
  }
  return true;
}
