/**
 * MessageModel — 模型标签
 *
 * 以 dimColor 展示模型名称。
 */

import React from 'react';
import { Box, Text } from '../primitives.js';

type Props = {
  /** 模型名称 */
  model: string;
};

export function MessageModel({ model }: Props): React.ReactNode {
  return (
    <Box>
      <Text dimColor>{model}</Text>
    </Box>
  );
}
