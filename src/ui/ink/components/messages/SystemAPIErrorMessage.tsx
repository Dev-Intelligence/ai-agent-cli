/**
 * SystemAPIErrorMessage — API 错误展示
 *
 * 显示 API 错误信息 + 重试倒计时 + 重试次数。
 * 当前版本不含 formatAPIError（平台特有），直接使用错误文本。
 */

import React, { useState, useEffect } from 'react';
import { Box, Text } from '../../primitives.js';
import { MessageResponse } from '../MessageResponse.js';

const MAX_API_ERROR_CHARS = 1000;

type Props = {
  /** 错误信息 */
  error: string;
  /** 重试剩余毫秒 */
  retryInMs?: number;
  /** 当前重试次数 */
  retryAttempt?: number;
  /** 最大重试次数 */
  maxRetries?: number;
  /** 是否 verbose */
  verbose?: boolean;
};

export function SystemAPIErrorMessage({
  error,
  retryInMs = 0,
  retryAttempt = 0,
  maxRetries = 3,
  verbose = false,
}: Props): React.ReactNode {
  const [countdownMs, setCountdownMs] = useState(0);
  const done = countdownMs >= retryInMs;

  useEffect(() => {
    if (done || retryInMs <= 0) return;
    const timer = setInterval(() => {
      setCountdownMs((prev) => prev + 1000);
    }, 1000);
    return () => clearInterval(timer);
  }, [done, retryInMs]);

  const retryInSecondsLive = Math.max(0, Math.round((retryInMs - countdownMs) / 1000));
  const truncated = !verbose && error.length > MAX_API_ERROR_CHARS;
  const displayError = truncated ? error.slice(0, MAX_API_ERROR_CHARS) + '…' : error;

  return (
    <MessageResponse>
      <Box flexDirection="column">
        <Text color="red">{displayError}</Text>
        {retryInMs > 0 && !done && (
          <Text dimColor>
            Retrying in {retryInSecondsLive}s (attempt {retryAttempt}/{maxRetries})…
          </Text>
        )}
        {retryInMs > 0 && done && (
          <Text dimColor>Retrying…</Text>
        )}
      </Box>
    </MessageResponse>
  );
}
