/**
 * Ratchet — 单向递增高度容器
 *
 * - `lock === 'always'` 或元素不在视口内时，用 `minHeight` 锁定已测得的最大高度，减少虚拟列表抖动。
 * - `useLayoutEffect` 无依赖数组：每轮提交后按当前布局重新测量（与官方 bundle 行为一致）。
 */

import React, { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { Box, measureElement, useTerminalViewport } from '../../primitives.js';
import type { DOMElement } from '../../primitives.js';

interface RatchetProps {
  children: React.ReactNode;
  lock?: 'always' | 'offscreen';
}

export function Ratchet({ children, lock = 'always' }: RatchetProps): React.ReactNode {
  const [viewportRef, { isVisible }] = useTerminalViewport();
  const { rows } = useTerminalSize();
  const innerRef = useRef<DOMElement | null>(null);
  const maxHeight = useRef(0);
  const [minHeight, setMinHeight] = useState(0);

  const outerRef = useCallback(
    (el: DOMElement | null) => {
      viewportRef(el);
    },
    [viewportRef],
  );

  const engaged = lock === 'always' || !isVisible;

  useLayoutEffect(() => {
    if (!innerRef.current) {
      return;
    }
    const { height } = measureElement(innerRef.current);
    if (height > maxHeight.current) {
      maxHeight.current = Math.min(height, rows);
      setMinHeight(maxHeight.current);
    }
  });

  return (
    <Box minHeight={engaged ? minHeight : undefined} ref={outerRef}>
      <Box ref={innerRef} flexDirection="column">
        {children}
      </Box>
    </Box>
  );
}
