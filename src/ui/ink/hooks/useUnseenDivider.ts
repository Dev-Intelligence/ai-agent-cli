/**
 * useUnseenDivider — 未读消息分割线追踪
 *
 * 跟踪用户首次滚动离开底部时的 scrollHeight 快照，
 * 用于判断 pill 可见性和新消息计数。
 */

import { useCallback, useRef, useState } from 'react';
import type { ScrollBoxHandle } from '../primitives.js';

export interface UnseenDividerResult {
  /** scrollHeight 快照（pill 可见性判断基准），null 表示在底部 */
  dividerYRef: React.RefObject<number | null>;
  /** 快照后新增的消息数 */
  newMessageCount: number;
  /** 首次滚动离开底部时调用 */
  onScrollAway: (handle: ScrollBoxHandle) => void;
  /** 回到底部时清除 */
  onRepin: () => void;
  /** 点击 pill 跳回底部 */
  jumpToNew: (handle: ScrollBoxHandle | null) => void;
}

export function useUnseenDivider(messageCount: number): UnseenDividerResult {
  const dividerYRef = useRef<number | null>(null);
  const snapshotCountRef = useRef<number>(0);
  const [, forceUpdate] = useState(0);

  const onScrollAway = useCallback((handle: ScrollBoxHandle) => {
    // 已有快照则不重复记录
    if (dividerYRef.current !== null) return;

    // 确认确实离开了底部（scrollTop + viewport < scrollHeight）
    const max = Math.max(0, handle.getScrollHeight() - handle.getViewportHeight());
    if (handle.getScrollTop() + handle.getPendingDelta() >= max) return;

    // 首次离开底部：快照当前 scrollHeight 和消息数
    dividerYRef.current = handle.getScrollHeight();
    snapshotCountRef.current = messageCount;
    forceUpdate((n) => n + 1);
  }, [messageCount]);

  const onRepin = useCallback(() => {
    if (dividerYRef.current === null) return;
    dividerYRef.current = null;
    snapshotCountRef.current = 0;
    forceUpdate((n) => n + 1);
  }, []);

  const jumpToNew = useCallback((handle: ScrollBoxHandle | null) => {
    if (!handle) return;
    // scrollToBottom 设置 stickyScroll=true，确保后续新内容自动跟随
    handle.scrollToBottom();
    dividerYRef.current = null;
    snapshotCountRef.current = 0;
    forceUpdate((n) => n + 1);
  }, []);

  const newMessageCount = dividerYRef.current !== null
    ? Math.max(0, messageCount - snapshotCountRef.current)
    : 0;

  return { dividerYRef, newMessageCount, onScrollAway, onRepin, jumpToNew };
}
