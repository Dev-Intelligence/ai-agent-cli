/**
 * AssistantThinkingMessage — 助手思考过程展示
 *
 * - 非 verbose/transcript 模式：显示 "∴ Thinking"（折叠）
 * - verbose/transcript 模式：显示 "∴ Thinking…" + 完整思考内容（Markdown，dimColor）
 * - hideInTranscript 时不渲染
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';
import { Markdown } from '../markdown/Markdown.js';
import { CtrlOToExpand } from '../CtrlOToExpand.js';

type Props = {
  /** 思考块内容 */
  thinking: string;
  /** 是否添加顶部间距 */
  addMargin?: boolean;
  /** 是否为 transcript 模式 */
  isTranscriptMode?: boolean;
  /** 是否 verbose */
  verbose?: boolean;
  /** 在 transcript 模式中隐藏此思考块（用于隐藏过去的思考） */
  hideInTranscript?: boolean;
};

export function AssistantThinkingMessage({
  thinking,
  addMargin = false,
  isTranscriptMode = false,
  verbose = false,
  hideInTranscript = false,
}: Props): React.ReactNode {
  if (!thinking) {
    return null;
  }

  if (hideInTranscript) {
    return null;
  }

  const shouldShowFullThinking = isTranscriptMode || verbose;

  // 折叠模式：只显示 "∴ Thinking"
  if (!shouldShowFullThinking) {
    return (
      <Box marginTop={addMargin ? 1 : 0}>
        <Text dimColor italic>∴ Thinking </Text>
        <CtrlOToExpand />
      </Box>
    );
  }

  // 展开模式：显示 "∴ Thinking…" + 思考内容
  return (
    <Box flexDirection="column" gap={1} marginTop={addMargin ? 1 : 0} width="100%">
      <Text dimColor italic>∴ Thinking…</Text>
      <Box paddingLeft={2}>
        <Text dimColor>
          <Markdown>{thinking}</Markdown>
        </Text>
      </Box>
    </Box>
  );
}
