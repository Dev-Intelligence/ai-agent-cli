/**
 * MessageRow — 消息行分发组件
 *
 * 根据消息类型分发到对应的视图组件。
 * 支持 CompletedItem（单项）和 GroupedToolUse（分组）两种类型。
 */

import React from 'react';
import { Box } from '../../primitives.js';
import type { RenderableMessage } from '../Messages.js';
import { CompletedItemView } from '../CompletedItemView.js';
import { GroupedToolUseView } from './GroupedToolUseView.js';
import { CollapsedReadSearchView } from './CollapsedReadSearchView.js';
import { messageRowNeedsTopMargin } from './messageRowTopMargin.js';

export interface MessageRowProps {
  message: RenderableMessage;
  /** 当前消息在列表中的下标 */
  index?: number;
  /** 完整可渲染消息列表（与 index 同时传入时生效） */
  messages?: RenderableMessage[];
}

function MessageRowImpl({ message, index, messages }: MessageRowProps) {
  const addTop =
    index !== undefined && messages !== undefined
      ? messageRowNeedsTopMargin(message, index, messages)
      : true;

  let body: React.ReactNode;
  if (message.type === 'grouped_tool_use') {
    body = <GroupedToolUseView items={message.items} />;
  } else if (message.type === 'collapsed_read_search') {
    body = <CollapsedReadSearchView items={message.items} />;
  } else {
    body = <CompletedItemView item={message} />;
  }

  return (
    <Box flexDirection="column" marginTop={addTop ? 1 : 0} width="100%">
      {body}
    </Box>
  );
}

export const MessageRow = React.memo(MessageRowImpl);
