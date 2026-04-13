/**
 * useInputBuffer — 输入缓冲 Hook
 *
 * 用于统一管理“输入值 + 光标偏移”这一对强关联状态，
 * 减少组件内部到处手动同步 value / cursorOffset 的样板代码。
 */

import { useCallback, useState } from 'react';

export interface InputBufferState {
  value: string;
  cursorOffset: number;
}

export interface UseInputBufferResult extends InputBufferState {
  setValue: (value: string) => void;
  setCursorOffset: (offset: number) => void;
  replaceValue: (value: string) => void;
  clear: () => void;
}

export function useInputBuffer(initialValue = ''): UseInputBufferResult {
  const [value, setValueState] = useState(initialValue);
  const [cursorOffset, setCursorOffsetState] = useState(initialValue.length);

  const setValue = useCallback((nextValue: string) => {
    setValueState(nextValue);
    setCursorOffsetState((current) => Math.min(current, nextValue.length));
  }, []);

  const setCursorOffset = useCallback((offset: number) => {
    setCursorOffsetState(Math.max(0, offset));
  }, []);

  const replaceValue = useCallback((nextValue: string) => {
    setValueState(nextValue);
    setCursorOffsetState(nextValue.length);
  }, []);

  const clear = useCallback(() => {
    setValueState('');
    setCursorOffsetState(0);
  }, []);

  return {
    value,
    cursorOffset,
    setValue,
    setCursorOffset,
    replaceValue,
    clear,
  };
}
