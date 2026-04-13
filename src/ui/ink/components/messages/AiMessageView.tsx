/**
 * AiMessageView - AI 回复消息展示
 *
 * - ⏺ 前缀（实心圆点）
 * - 顶部元数据行：model（dimColor）+ elapsed（dimColor）
 * - Markdown 渲染
 * - marginTop={1}
 */

import { Box, Text } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';
import { registerMessageView, type MessageViewProps } from './registry.js';
import { Markdown } from '../markdown/Markdown.js';
import { MessageModel } from '../MessageModel.js';
import { MessageTimestamp } from '../MessageTimestamp.js';

type AiMessageItem = Extract<CompletedItem, { type: 'ai_message' }>;

/** 将毫秒转为可读耗时字符串，如 "1.2s" */
function formatElapsed(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

export function AiMessageView({ item }: MessageViewProps<AiMessageItem>) {
  const hasMetadata = item.model || item.elapsed != null || item.timestamp != null;

  return (
    <Box marginTop={1} alignItems="flex-start" flexDirection="row" width="100%">
      <Box flexDirection="row">
        <Box minWidth={2}>
          <Text color="white">⏺</Text>
        </Box>
        <Box flexDirection="column" flexGrow={1} flexShrink={1}>
          {hasMetadata && (
            <Box flexDirection="row" gap={1}>
              {item.model && <MessageModel model={item.model} />}
              {item.elapsed != null && (
                <Text dimColor>({formatElapsed(item.elapsed)})</Text>
              )}
              {item.timestamp != null && <MessageTimestamp timestamp={item.timestamp} />}
            </Box>
          )}
          <Markdown>{item.text}</Markdown>
        </Box>
      </Box>
    </Box>
  );
}

registerMessageView('ai_message', AiMessageView);
