/**
 * useTerminalSize — 终端尺寸追踪
 *
 * 监听 process.stdout 的 resize 事件，返回当前终端行列数。
 */

import { useState, useEffect } from 'react';

export function useTerminalSize(): { rows: number; columns: number } {
  const [size, setSize] = useState({
    rows: process.stdout.rows || 24,
    columns: process.stdout.columns || 80,
  });

  useEffect(() => {
    const onResize = () => {
      setSize({
        rows: process.stdout.rows || 24,
        columns: process.stdout.columns || 80,
      });
    };
    process.stdout.on('resize', onResize);
    return () => {
      process.stdout.off('resize', onResize);
    };
  }, []);

  return size;
}
