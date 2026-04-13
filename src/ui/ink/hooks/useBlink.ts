/**
 * useBlink — 闪烁显示状态 Hook
 *
 * 当前项目先实现一个轻量版本：
 * - enabled=false 时始终返回可见
 * - enabled=true 时按 intervalMs 周期翻转可见性
 *
 * 暂未接入：
 * - 全局同步动画时钟
 * - 终端焦点感知
 * - 屏幕外暂停
 */

import { useEffect, useState } from 'react';

const DEFAULT_INTERVAL_MS = 600;

export function useBlink(
  enabled: boolean,
  intervalMs: number = DEFAULT_INTERVAL_MS,
): [ref: (element: unknown | null) => void, isVisible: boolean] {
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    if (!enabled) {
      setIsVisible(true);
      return;
    }

    const timer = setInterval(() => {
      setIsVisible((prev) => !prev);
    }, intervalMs);

    return () => clearInterval(timer);
  }, [enabled, intervalMs]);

  // 这里保留 ref 签名，以兼容后续切换到完整版实现。
  const noopRef = () => {};
  return [noopRef, isVisible];
}
