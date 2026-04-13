/**
 * AssistantRedactedThinkingMessage — 隐藏的思考过程提示
 *
 * 当思考内容被编辑（redacted）时，显示 "✻ Thinking…" 占位。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';

type Props = {
  addMargin?: boolean;
};

export function AssistantRedactedThinkingMessage({
  addMargin = false,
}: Props): React.ReactNode {
  return (
    <Box marginTop={addMargin ? 1 : 0}>
      <Text dimColor italic>
        ✻ Thinking…
      </Text>
    </Box>
  );
}
