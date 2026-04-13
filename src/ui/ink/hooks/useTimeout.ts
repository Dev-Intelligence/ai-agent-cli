/**
 * useTimeout — 简单超时状态 Hook
 *
 * 用于加载态、对话框延迟显示、动画最小展示时长等场景。
 * resetTrigger 变化时会重新开始计时。
 */

import { useEffect, useState } from 'react';

export function useTimeout(delay: number, resetTrigger?: number): boolean {
  const [isElapsed, setIsElapsed] = useState(false);

  useEffect(() => {
    setIsElapsed(false);
    const timer = setTimeout(() => setIsElapsed(true), delay);
    return () => clearTimeout(timer);
  }, [delay, resetTrigger]);

  return isElapsed;
}
