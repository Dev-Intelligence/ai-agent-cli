/**
 * useElapsedTime — 格式化耗时 hook
 *
 * 使用 useSyncExternalStore + setInterval 实现高效的定时更新。
 *
 * @param startTime - Unix 时间戳（毫秒）
 * @param isRunning - 是否正在运行（停止时不再更新）
 * @param ms - 更新间隔（默认 1000ms）
 * @param pausedMs - 暂停总时长（需要减去）
 * @param endTime - 结束时间戳（固定耗时展示）
 * @returns 格式化的耗时字符串（如 "1m 23s"）
 */

import { useCallback, useSyncExternalStore } from 'react';

/** 将毫秒格式化为可读耗时字符串 */
function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  const seconds = Math.floor(ms / 1000);
  if (seconds < 60) return `${seconds}s`;
  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = seconds % 60;
  if (minutes < 60) return `${minutes}m ${remainingSeconds}s`;
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  return `${hours}h ${remainingMinutes}m`;
}

export function useElapsedTime(
  startTime: number,
  isRunning: boolean,
  ms: number = 1000,
  pausedMs: number = 0,
  endTime?: number,
): string {
  const get = () =>
    formatDuration(Math.max(0, (endTime ?? Date.now()) - startTime - pausedMs));

  const subscribe = useCallback(
    (notify: () => void) => {
      if (!isRunning) return () => {};
      const interval = setInterval(notify, ms);
      return () => clearInterval(interval);
    },
    [isRunning, ms],
  );

  return useSyncExternalStore(subscribe, get, get);
}
