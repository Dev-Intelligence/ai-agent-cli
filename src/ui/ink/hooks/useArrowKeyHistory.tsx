/**
 * useArrowKeyHistory — 方向键历史导航 Hook
 *
 * 从输入组件中抽离“向上回看历史、向下恢复输入”的行为，
 * 方便 PromptInput / SearchInput 等场景统一复用。
 */

import { useCallback, useRef } from 'react';

/**
 * 简单历史导航器。
 * 内部维护一个临时输入缓存：
 * - 第一次向上翻历史时，记录当前输入
 * - 再向下翻到末尾时，恢复这段临时输入
 */
export class ArrowKeyHistory {
  private readonly history: string[] = [];
  private readonly maxSize: number;
  private index = -1;
  private tempInput = '';

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  add(command: string): void {
    const trimmed = command.trim();
    if (!trimmed) return;
    if (this.history[0] === trimmed) {
      this.reset();
      return;
    }

    this.history.unshift(trimmed);
    if (this.history.length > this.maxSize) {
      this.history.pop();
    }
    this.reset();
  }

  up(currentInput: string): string | null {
    if (this.history.length === 0) return null;

    if (this.index === -1) {
      this.tempInput = currentInput;
    }

    if (this.index < this.history.length - 1) {
      this.index += 1;
      return this.history[this.index] ?? null;
    }

    return null;
  }

  down(): string | null {
    if (this.index > 0) {
      this.index -= 1;
      return this.history[this.index] ?? null;
    }

    if (this.index === 0) {
      this.index = -1;
      return this.tempInput;
    }

    return null;
  }

  reset(): void {
    this.index = -1;
    this.tempInput = '';
  }

  getAll(): string[] {
    return [...this.history];
  }
}

export interface UseArrowKeyHistoryOptions {
  /** 模块级或实例级历史对象 */
  history: ArrowKeyHistory;
  /** 获取当前输入值 */
  getCurrentInput: () => string;
  /** 将历史结果写回输入框 */
  applyInput: (value: string) => void;
  /** 历史切换时同步光标位置 */
  onCursorOffsetChange?: (offset: number) => void;
  /** 是否禁用历史导航 */
  disabled?: boolean;
}

export interface ArrowKeyHistoryBindings {
  addHistoryEntry: (value: string) => void;
  resetHistoryNavigation: () => void;
  handleHistoryUp: () => void;
  handleHistoryDown: () => void;
  getHistoryEntries: () => string[];
}

export function useArrowKeyHistory({
  history,
  getCurrentInput,
  applyInput,
  onCursorOffsetChange,
  disabled = false,
}: UseArrowKeyHistoryOptions): ArrowKeyHistoryBindings {
  const historyRef = useRef(history);
  historyRef.current = history;

  const syncInput = useCallback((nextValue: string) => {
    applyInput(nextValue);
    onCursorOffsetChange?.(nextValue.length);
  }, [applyInput, onCursorOffsetChange]);

  const handleHistoryUp = useCallback(() => {
    if (disabled) return;
    const nextValue = historyRef.current.up(getCurrentInput());
    if (nextValue !== null) {
      syncInput(nextValue);
    }
  }, [disabled, getCurrentInput, syncInput]);

  const handleHistoryDown = useCallback(() => {
    if (disabled) return;
    const nextValue = historyRef.current.down();
    if (nextValue !== null) {
      syncInput(nextValue);
    }
  }, [disabled, syncInput]);

  const addHistoryEntry = useCallback((value: string) => {
    historyRef.current.add(value);
  }, []);

  const resetHistoryNavigation = useCallback(() => {
    historyRef.current.reset();
  }, []);

  const getHistoryEntries = useCallback(() => historyRef.current.getAll(), []);

  return {
    addHistoryEntry,
    resetHistoryNavigation,
    handleHistoryUp,
    handleHistoryDown,
    getHistoryEntries,
  };
}
