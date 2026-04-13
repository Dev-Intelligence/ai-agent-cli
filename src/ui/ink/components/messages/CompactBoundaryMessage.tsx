/**
 * CompactBoundaryMessage — 上下文压缩边界提示
 *
 * 当对话历史被自动压缩时，在压缩边界处显示提示标记。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';

export function CompactBoundaryMessage(): React.ReactNode {
  return (
    <Box marginY={1}>
      <Text dimColor>
        ✻ Conversation compacted (ctrl+o for history)
      </Text>
    </Box>
  );
}
