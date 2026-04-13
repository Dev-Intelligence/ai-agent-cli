/**
 * RateLimitMessage — 速率限制提示
 *
 * 当前版本不含 Claude AI 订阅升级和商业化相关逻辑（平台特有），
 * 只保留核心的"显示限制文本 + 倒计时"展示。
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from '../../primitives.js';
import { MessageResponse } from '../MessageResponse.js';

type Props = {
  /** 限制提示文本 */
  text: string;
  /** 重试剩余秒数（可选） */
  retryInSeconds?: number;
};

export function RateLimitMessage({ text, retryInSeconds }: Props): React.ReactNode {
  const [countdown, setCountdown] = useState(retryInSeconds ?? 0);

  useEffect(() => {
    if (countdown <= 0) return;
    const timer = setInterval(() => {
      setCountdown((prev) => Math.max(0, prev - 1));
    }, 1000);
    return () => clearInterval(timer);
  }, [countdown]);

  return (
    <MessageResponse>
      <Box flexDirection="column">
        <Text color="yellow">{text}</Text>
        {countdown > 0 && (
          <Text dimColor>Retrying in {countdown}s…</Text>
        )}
      </Box>
    </MessageResponse>
  );
}
