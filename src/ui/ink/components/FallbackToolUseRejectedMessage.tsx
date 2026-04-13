/**
 * FallbackToolUseRejectedMessage — 工具被用户拒绝的通用展示
 *
 * 使用 InterruptedByUser 组件展示中断提示。
 */

import React from 'react';
import { InterruptedByUser } from './InterruptedByUser.js';
import { MessageResponse } from './MessageResponse.js';

export function FallbackToolUseRejectedMessage(): React.ReactNode {
  return (
    <MessageResponse height={1}>
      <InterruptedByUser />
    </MessageResponse>
  );
}
