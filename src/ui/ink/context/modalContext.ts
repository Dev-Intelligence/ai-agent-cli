/**
 * modalContext — 模态层上下文
 *
 * 为模态层提供终端尺寸约束和滚动引用。
 */

import { createContext } from 'react';
import type { ScrollBoxHandle } from '../primitives.js';

export interface ModalContextValue {
  /** 模态层可用行数 */
  rows: number;
  /** 模态层可用列数 */
  columns: number;
  /** 模态层的 ScrollBox 引用 */
  scrollRef: React.RefObject<ScrollBoxHandle | null> | null;
}

export const ModalContext = createContext<ModalContextValue>({
  rows: 24,
  columns: 80,
  scrollRef: null,
});
