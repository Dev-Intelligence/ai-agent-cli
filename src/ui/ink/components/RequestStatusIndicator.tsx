/**
 * RequestStatusIndicator - 请求状态指示器
 *
 * 动画字符 bounce + 随机动词 + 状态信息。
 *
 * ✳ Pondering… (4s · ↓ 4.4k tokens · esc to interrupt)
 */

import { Box, Text } from '../primitives.js';
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { getInkColors, isAccessibilityMode } from '../../theme.js';
import type { TokenStatsSnapshot } from './EnhancedSpinner.js';
import {
  getRequestStatus,
  subscribeRequestStatus,
  type RequestStatus,
} from '../requestStatus.js';
import { pickRandomVerb } from '../constants/spinnerVerbs.js';

// ─── 动画字符 ───
// Darwin 用 ✶，非 Darwin 用 *
const CHARACTERS =
  process.platform === 'darwin'
    ? ['·', '✢', '✳', '✶', '✻', '✽']
    : ['·', '✢', '*', '✶', '✻', '✽'];

/** 动画帧间隔（ms） 50ms */
const FRAME_INTERVAL = 80;

// ─── 标签 ───

function getLabel(status: RequestStatus, verb: string): string {
  switch (status.kind) {
    case 'thinking':
      return verb;
    case 'streaming':
      return 'Streaming';
    case 'tool':
      return status.detail ? `Running: ${status.detail}` : 'Running tool';
    case 'idle':
      return verb;
  }
}

function formatElapsed(seconds: number): string {
  if (seconds >= 60) {
    const m = Math.floor(seconds / 60);
    const s = Math.round(seconds % 60);
    return `${m}m ${s}s`;
  }
  return `${Math.round(seconds)}s`;
}

function formatTokens(count: number): string {
  if (count >= 1000) {
    return `${(count / 1000).toFixed(1)}k`;
  }
  return String(count);
}

// ─── 组件 ───

export interface RequestStatusIndicatorProps {
  getTokenStats?: () => TokenStatsSnapshot;
}

export function RequestStatusIndicator({
  getTokenStats,
}: RequestStatusIndicatorProps): ReactNode {
  const frames = useMemo(
    () => [...CHARACTERS, ...[...CHARACTERS].reverse()],
    []
  );
  const colors = getInkColors();

  // 随机动词：mount 时选定，保持稳定
  const [verb] = useState(() => pickRandomVerb());

  const [frame, setFrame] = useState(0);
  const [elapsedTime, setElapsedTime] = useState(0);
  const [status, setStatus] = useState<RequestStatus>(() => getRequestStatus());

  const requestStartTime = useRef<number | null>(null);

  useEffect(() => {
    return subscribeRequestStatus((next) => {
      setStatus(next);
      if (next.kind !== 'idle' && requestStartTime.current === null) {
        requestStartTime.current = Date.now();
      }
      if (next.kind === 'idle') {
        requestStartTime.current = null;
        setElapsedTime(0);
      }
    });
  }, []);

  // 动画帧
  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % frames.length);
    }, FRAME_INTERVAL);
    return () => clearInterval(timer);
  }, [frames.length]);

  // 计时器
  useEffect(() => {
    const timer = setInterval(() => {
      if (requestStartTime.current === null) {
        setElapsedTime(0);
        return;
      }
      setElapsedTime(
        Math.floor((Date.now() - requestStartTime.current) / 1000)
      );
    }, 250);
    return () => clearInterval(timer);
  }, []);

  // 无障碍模式
  if (isAccessibilityMode()) {
    const liveStats = getTokenStats?.();
    const tokenCount = liveStats?.totalTokens;
    const tokenText = tokenCount ? ` · ↓ ${formatTokens(tokenCount)} tokens` : '';
    return (
      <Text>
        [处理中] {getLabel(status, verb)} ({formatElapsed(elapsedTime)}
        {tokenText} · esc to interrupt)
      </Text>
    );
  }

  const liveStats = getTokenStats?.();
  const tokenCount = liveStats?.totalTokens;

  const parts: string[] = [];
  parts.push(formatElapsed(elapsedTime));
  if (tokenCount) parts.push(`↓ ${formatTokens(tokenCount)} tokens`);
  parts.push('esc to interrupt');
  const stats = parts.join(' · ');

  const label = getLabel(status, verb);

  return (
    <Box marginTop={1}>
      <Box flexWrap="nowrap" height={1} width={2}>
        <Text color={colors.primary}>{frames[frame]}</Text>
      </Box>
      <Text color={colors.primary}>{label}… </Text>
      <Text color={colors.textDim}>({stats})</Text>
    </Box>
  );
}
