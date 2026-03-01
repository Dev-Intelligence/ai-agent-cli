/**
 * 双击/双按判定（基于 Kode-cli）
 */

import { useRef } from 'react';

export const DOUBLE_PRESS_TIMEOUT_MS = 2000;

export function useDoublePress(
  setPending: (pending: boolean) => void,
  onDoublePress: () => void,
  onFirstPress?: () => void
): () => void {
  const lastPressRef = useRef<number>(0);
  const timeoutRef = useRef<NodeJS.Timeout | undefined>();

  return () => {
    const now = Date.now();
    const timeSinceLastPress = now - lastPressRef.current;

    if (timeSinceLastPress <= DOUBLE_PRESS_TIMEOUT_MS && timeoutRef.current) {
      clearTimeout(timeoutRef.current);
      timeoutRef.current = undefined;
      onDoublePress();
      setPending(false);
    } else {
      onFirstPress?.();
      setPending(true);
      timeoutRef.current = setTimeout(
        () => setPending(false),
        DOUBLE_PRESS_TIMEOUT_MS
      );
    }

    lastPressRef.current = now;
  };
}
