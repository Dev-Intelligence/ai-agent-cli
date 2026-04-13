/**
 * useMinDisplayTime — 保证可见状态至少展示一段时间
 *
 * 常用于加载指示器，避免异步操作很快完成时 UI 闪一下就消失，
 * 从而造成视觉抖动和“误以为没有发生任何事”的体验问题。
 */

import { useEffect, useRef, useState } from 'react';

/**
 * 返回一个受最短展示时长约束的可见状态。
 *
 * @param visible 外部真实可见状态
 * @param minimumMs 最短展示时长（毫秒）
 */
export function useMinDisplayTime(visible: boolean, minimumMs: number): boolean {
  const [displayVisible, setDisplayVisible] = useState(visible);
  const shownAtRef = useRef<number | null>(visible ? Date.now() : null);
  const timeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }

    if (visible) {
      shownAtRef.current = Date.now();
      setDisplayVisible(true);
      return;
    }

    if (!displayVisible) {
      return;
    }

    const shownAt = shownAtRef.current;
    if (shownAt === null) {
      setDisplayVisible(false);
      return;
    }

    const elapsed = Date.now() - shownAt;
    const remaining = Math.max(0, minimumMs - elapsed);

    if (remaining === 0) {
      setDisplayVisible(false);
      return;
    }

    timeoutRef.current = setTimeout(() => {
      setDisplayVisible(false);
      timeoutRef.current = null;
    }, remaining);

    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [visible, minimumMs, displayVisible]);

  return displayVisible;
}
