/**
 * useSearchInput — 搜索输入状态 Hook
 *
 * 为 SearchBox / HistorySearch / QuickOpen 等场景提供统一的查询状态管理：
 * - query 与 cursorOffset 联动
 * - 输入变更时自动重置高亮项
 * - 对外暴露 clear / replace 等常用操作
 */

import { useCallback, useEffect, useState } from 'react';

export interface UseSearchInputOptions {
  initialQuery?: string;
  /** 查询变化时触发 */
  onQueryChange?: (query: string) => void;
  /** 查询变化时是否自动重置选中索引 */
  resetHighlightedIndex?: () => void;
}

export interface UseSearchInputResult {
  query: string;
  cursorOffset: number;
  setQuery: (query: string) => void;
  replaceQuery: (query: string) => void;
  setCursorOffset: (offset: number) => void;
  clearQuery: () => void;
}

export function useSearchInput({
  initialQuery = '',
  onQueryChange,
  resetHighlightedIndex,
}: UseSearchInputOptions = {}): UseSearchInputResult {
  const [query, setQueryState] = useState(initialQuery);
  const [cursorOffset, setCursorOffsetState] = useState(initialQuery.length);

  useEffect(() => {
    onQueryChange?.(query);
  }, [onQueryChange, query]);

  const setQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
    setCursorOffsetState((current) => Math.min(current, nextQuery.length));
    resetHighlightedIndex?.();
  }, [resetHighlightedIndex]);

  const replaceQuery = useCallback((nextQuery: string) => {
    setQueryState(nextQuery);
    setCursorOffsetState(nextQuery.length);
    resetHighlightedIndex?.();
  }, [resetHighlightedIndex]);

  const setCursorOffset = useCallback((offset: number) => {
    setCursorOffsetState(Math.max(0, offset));
  }, []);

  const clearQuery = useCallback(() => {
    setQueryState('');
    setCursorOffsetState(0);
    resetHighlightedIndex?.();
  }, [resetHighlightedIndex]);

  return {
    query,
    cursorOffset,
    setQuery,
    replaceQuery,
    setCursorOffset,
    clearQuery,
  };
}
