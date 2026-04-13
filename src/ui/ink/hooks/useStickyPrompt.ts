/**
 * useStickyPrompt — 置顶提示词追踪
 *
 * 当用户滚动查看历史时，找到最近的用户消息作为 sticky header 文本。
 * 简化版：不依赖虚拟滚动，直接从 completedItems 倒序查找最后一个 user_message。
 */

import { useCallback, useMemo } from 'react';
import type { RefObject } from 'react';
import type { CompletedItem } from '../types.js';
import type { ScrollBoxHandle } from '../primitives.js';

/** Sticky 文本最大截取长度 */
const STICKY_TEXT_CAP = 500;

export interface StickyPromptResult {
  /** 最近一条用户提示词文本，null 表示无可用 sticky */
  stickyText: string | null;
  /** 点击 sticky header 跳回底部 */
  scrollToPrompt: () => void;
}

export function useStickyPrompt(
  completedItems: CompletedItem[],
  scrollRef: RefObject<ScrollBoxHandle | null>,
  isSticky: boolean,
): StickyPromptResult {
  // 倒序找最后一条 user_message
  const stickyText = useMemo(() => {
    if (isSticky) return null;
    for (let i = completedItems.length - 1; i >= 0; i--) {
      const item = completedItems[i]!;
      if (item.type === 'user_message') {
        const text = item.text.trim();
        if (text.length === 0) continue;
        return text.length > STICKY_TEXT_CAP
          ? text.slice(0, STICKY_TEXT_CAP)
          : text;
      }
    }
    return null;
  }, [completedItems, isSticky]);

  const scrollToPrompt = useCallback(() => {
    scrollRef.current?.scrollToBottom();
  }, [scrollRef]);

  return { stickyText, scrollToPrompt };
}
