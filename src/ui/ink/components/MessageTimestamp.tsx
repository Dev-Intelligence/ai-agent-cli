/**
 * MessageTimestamp — 消息时间戳
 *
 * 格式化并展示消息时间戳（如 "10:23 AM"）。
 */

import React from 'react';
import { Box, Text } from '../primitives.js';

type Props = {
  /** Unix 时间戳（毫秒） */
  timestamp: number;
};

export function MessageTimestamp({ timestamp }: Props): React.ReactNode {
  const formatted = new Date(timestamp).toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return (
    <Box>
      <Text dimColor>{formatted}</Text>
    </Box>
  );
}
