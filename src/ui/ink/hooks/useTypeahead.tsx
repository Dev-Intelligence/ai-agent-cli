/**
 * useTypeahead — 键入搜索辅助 Hook（基础版）
 *
 * 当前作为 Phase 0 的占位基础设施，服务于 Select / CustomSelect / FuzzyPicker 等场景。
 * 功能保持最小可用：
 * - 累积字符形成搜索词
 * - 一段时间不输入后自动清空
 * - 返回匹配到的第一项索引
 */

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

export interface UseTypeaheadOptions<T> {
  items: readonly T[];
  getText: (item: T) => string;
  resetMs?: number;
}

export interface UseTypeaheadResult {
  query: string;
  matchedIndex: number;
  pushChar: (char: string) => void;
  clear: () => void;
}

export function useTypeahead<T>({
  items,
  getText,
  resetMs = 800,
}: UseTypeaheadOptions<T>): UseTypeaheadResult {
  const [query, setQuery] = useState('');
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const clear = useCallback(() => {
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
    setQuery('');
  }, []);

  const pushChar = useCallback((char: string) => {
    if (!char || char.length !== 1) return;

    setQuery((prev) => prev + char.toLowerCase());

    if (timerRef.current) {
      clearTimeout(timerRef.current);
    }
    timerRef.current = setTimeout(() => {
      timerRef.current = null;
      setQuery('');
    }, resetMs);
  }, [resetMs]);

  useEffect(() => clear, [clear]);

  const matchedIndex = useMemo(() => {
    if (!query) return -1;
    return items.findIndex((item) =>
      getText(item).toLowerCase().startsWith(query),
    );
  }, [getText, items, query]);

  return { query, matchedIndex, pushChar, clear };
}
