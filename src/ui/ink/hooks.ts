/**
 * useAppState — 精确订阅 Hook
 *
 * 基于 useSyncExternalStore，组件只在选择的 state slice 变化时重渲染。
 */

import { useSyncExternalStore, useRef, useCallback, useState, useEffect } from 'react';
import type { AppStateStore, AppState } from './store.js';

/**
 * 精确订阅 AppStateStore 的某个切片
 *
 * @example
 * const items = useAppState(store, s => s.completedItems);
 */
export function useAppState<T>(store: AppStateStore, selector: (s: AppState) => T): T {
  const prevRef = useRef<T>(undefined as T);
  const selectorRef = useRef(selector);
  selectorRef.current = selector;

  const getSnapshot = useCallback(() => {
    const next = selectorRef.current(store.getState());
    if (Object.is(prevRef.current, next)) {
      return prevRef.current as T;
    }
    prevRef.current = next;
    return next;
  }, [store]);

  const subscribe = useCallback(
    (listener: () => void) => store.subscribe(listener),
    [store]
  );

  return useSyncExternalStore(subscribe, getSnapshot);
}

/**
 * useElapsedTime — 每 100ms 更新一次经过时间
 *
 * @param startTime 起始时间戳（Date.now()），传 null 停止计时
 * @returns 经过的秒数
 */
export function useElapsedTime(startTime: number | null): number {
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (startTime === null) {
      setElapsed(0);
      return;
    }

    setElapsed((Date.now() - startTime) / 1000);

    const timer = setInterval(() => {
      setElapsed((Date.now() - startTime) / 1000);
    }, 100);

    return () => clearInterval(timer);
  }, [startTime]);

  return elapsed;
}

export { useAfterFirstRender } from './hooks/useAfterFirstRender.js';
export { useTimeout } from './hooks/useTimeout.js';
export { useMinDisplayTime } from './hooks/useMinDisplayTime.js';
export { useBlink } from './hooks/useBlink.js';
export { useTypeahead } from './hooks/useTypeahead.js';
export { useInputBuffer } from './hooks/useInputBuffer.js';
export { usePasteHandler } from './hooks/usePasteHandler.js';
export { useSearchInput } from './hooks/useSearchInput.js';
export { ArrowKeyHistory, useArrowKeyHistory } from './hooks/useArrowKeyHistory.js';
export { useExitOnCtrlCD } from './hooks/useExitOnCtrlCD.js';
export { useCommandKeybindings } from './hooks/useCommandKeybindings.js';
