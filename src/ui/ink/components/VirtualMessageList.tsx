/**
 * VirtualMessageList — 虚拟滚动消息列表
 *
 * React Compiler _c 转换为标准 React（useMemo/useCallback/React.memo）。
 *
 * 包含：
 * - VirtualItem：单个 item 的包装器（measureRef + hover/click）
 * - StickyTracker：细粒度滚动订阅，追踪视口顶部的用户提示词
 * - stickyPromptText：从 RenderableMessage 提取可显示的提示文本
 * - JumpHandle 类型定义（搜索/导航接口，后续实现）
 *
 * 适配点：RenderableMessage 使用 ai-agent-cli 的类型（CompletedItem 联合体）
 */

import React, {
  useCallback,
  useContext,
  useEffect,
  useImperativeHandle,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { RefObject } from 'react';
import { useVirtualScroll } from '../hooks/useVirtualScroll.js';
import type { ScrollBoxHandle } from '../primitives.js';
import { Box } from '../primitives.js';
import type { RenderableMessage } from './Messages.js';
import { MessageRow } from './messages/MessageRow.js';
import { ScrollChromeContext } from './FullscreenLayout.js';

// ─── 常量 ───

/** 大型粘贴提示词的文本截断上限 */
const STICKY_TEXT_CAP = 500;

// @ts-ignore — vendor ink DOMElement
type DOMElement = any;

// ─── StickyPrompt 文本提取 ───

/**
 * 从 RenderableMessage 中提取真实用户提示词文本。
 * 适配 ai-agent-cli 的 CompletedItem 类型：只有 user_message 有可显示文本。
 */
const promptTextCache = new WeakMap<RenderableMessage, string | null>();

function stickyPromptText(msg: RenderableMessage): string | null {
  const cached = promptTextCache.get(msg);
  if (cached !== undefined) return cached;
  const result = computeStickyPromptText(msg);
  promptTextCache.set(msg, result);
  return result;
}

function computeStickyPromptText(msg: RenderableMessage): string | null {
  if (msg.type !== 'user_message') return null;
  const text = (msg as any).text;
  if (!text || typeof text !== 'string') return null;
  const trimmed = text.trim();
  if (trimmed === '' || trimmed.startsWith('<')) return null;
  return trimmed;
}

// ─── JumpHandle 类型（搜索/导航接口，后续实现） ───

export type JumpHandle = {
  jumpToIndex: (i: number) => void;
  setSearchQuery: (q: string) => void;
  nextMatch: () => void;
  prevMatch: () => void;
  setAnchor: () => void;
  warmSearchIndex: () => Promise<number>;
  disarmSearch: () => void;
};

// ─── VirtualItem 包装器 ───

interface VirtualItemProps {
  itemKey: string;
  msg: RenderableMessage;
  idx: number;
  allMessages: RenderableMessage[];
  measureRef: (key: string) => (el: DOMElement | null) => void;
  renderItem: (msg: RenderableMessage, idx: number, all: RenderableMessage[]) => React.ReactNode;
}

/**
 * 单个虚拟 item 的包装器。
 * 挂载 measureRef 到根 Box 用于 Yoga 高度测量。
 */
const VirtualItem = React.memo(function VirtualItem({
  itemKey: k,
  msg,
  idx,
  allMessages,
  measureRef,
  renderItem,
}: VirtualItemProps) {
  const ref = measureRef(k);
  return (
    <Box ref={ref} flexDirection="column">
      {renderItem(msg, idx, allMessages)}
    </Box>
  );
});

// ─── Props ───

export interface VirtualMessageListProps {
  messages: RenderableMessage[];
  scrollRef: RefObject<ScrollBoxHandle | null>;
  columns: number;
  itemKey: (msg: RenderableMessage) => string;
  renderItem?: (msg: RenderableMessage, idx: number, all: RenderableMessage[]) => React.ReactNode;
  /** 启用 StickyTracker（通过 ScrollChromeContext 写入 sticky prompt） */
  trackStickyPrompt?: boolean;
  /** JumpHandle ref（搜索/导航，后续实现） */
  jumpRef?: RefObject<JumpHandle | null>;
}

// ─── 默认渲染函数 ───

function defaultRenderItem(
  msg: RenderableMessage,
  idx: number,
  all: RenderableMessage[],
): React.ReactNode {
  return <MessageRow message={msg} index={idx} messages={all} />;
}

// ─── VirtualMessageList 主组件 ───

function VirtualMessageListImpl({
  messages,
  scrollRef,
  columns,
  itemKey,
  renderItem = defaultRenderItem,
  trackStickyPrompt = true,
  jumpRef,
}: VirtualMessageListProps) {
  // 构建 key 数组（增量追加优化可后续添加）
  const keys = React.useMemo(
    () => messages.map(itemKey),
    [messages, itemKey],
  );

  const {
    range,
    topSpacer,
    bottomSpacer,
    measureRef,
    spacerRef,
    offsets,
    getItemTop,
    getItemElement,
    scrollToIndex,
  } = useVirtualScroll(scrollRef, keys, columns);

  const [start, end] = range;

  // JumpHandle 骨架（后续实现搜索/导航时填充）
  useImperativeHandle(jumpRef, () => ({
    jumpToIndex: (i: number) => scrollToIndex(i),
    setSearchQuery: (_q: string) => {},
    nextMatch: () => {},
    prevMatch: () => {},
    setAnchor: () => {},
    warmSearchIndex: async () => 0,
    disarmSearch: () => {},
  }), [scrollToIndex]);

  return (
    <>
      {/* 顶部占位 spacer */}
      <Box ref={spacerRef} height={topSpacer} flexShrink={0} />

      {/* 可见 item */}
      {messages.slice(start, end).map((msg, i) => {
        const idx = start + i;
        const k = keys[idx]!;
        return (
          <VirtualItem
            key={k}
            itemKey={k}
            msg={msg}
            idx={idx}
            allMessages={messages}
            measureRef={measureRef}
            renderItem={renderItem}
          />
        );
      })}

      {/* 底部占位 spacer */}
      {bottomSpacer > 0 && <Box height={bottomSpacer} flexShrink={0} />}

      {/* StickyTracker：细粒度滚动订阅，追踪视口顶部的用户提示词 */}
      {trackStickyPrompt && (
        <StickyTracker
          messages={messages}
          start={start}
          end={end}
          offsets={offsets}
          getItemTop={getItemTop}
          getItemElement={getItemElement}
          scrollRef={scrollRef}
        />
      )}
    </>
  );
}

export const VirtualMessageList = React.memo(VirtualMessageListImpl);

// ─── StickyTracker ───

const NOOP_UNSUB = () => {};

/**
 * StickyTracker — 效果组件，追踪视口顶部最近的用户提示词。
 *
 * 独立组件（非 hook）：可以用比 SCROLL_QUANTUM 更细的粒度订阅滚动，
 * 而不导致 VirtualMessageList 主体重渲染。
 *
 * 算法：从挂载范围尾部向前走，找到第一个 top < scrollTarget 的 item，
 * 然后向前搜索最近的 user_message 作为 sticky 文本。
 */
function StickyTracker({
  messages,
  start,
  end,
  offsets,
  getItemTop,
  getItemElement,
  scrollRef,
}: {
  messages: RenderableMessage[];
  start: number;
  end: number;
  offsets: ArrayLike<number>;
  getItemTop: (index: number) => number;
  getItemElement: (index: number) => DOMElement | null;
  scrollRef: RefObject<ScrollBoxHandle | null>;
}): null {
  const { setStickyPrompt } = useContext(ScrollChromeContext);

  // 细粒度滚动订阅：每个滚动动作都触发此组件 re-render（不影响父组件）
  const subscribe = useCallback(
    (listener: () => void) => scrollRef.current?.subscribe(listener) ?? NOOP_UNSUB,
    [scrollRef],
  );
  useSyncExternalStore(subscribe, () => {
    const s = scrollRef.current;
    if (!s) return NaN;
    const t = s.getScrollTop() + s.getPendingDelta();
    return s.isSticky() ? -1 - t : t;
  });

  const isSticky = scrollRef.current?.isSticky() ?? true;
  const target = Math.max(
    0,
    (scrollRef.current?.getScrollTop() ?? 0) + (scrollRef.current?.getPendingDelta() ?? 0),
  );

  // 从挂载范围尾部向前走，找到第一个可见 item
  let firstVisible = start;
  for (let i = end - 1; i >= start; i--) {
    const top = getItemTop(i);
    if (top >= 0) {
      if (top < target) break;
    }
    firstVisible = i;
  }

  // 从 firstVisible 向前搜索最近的 user_message
  let idx = -1;
  let text: string | null = null;
  if (firstVisible > 0 && !isSticky) {
    for (let i = firstVisible - 1; i >= 0; i--) {
      const t = stickyPromptText(messages[i]!);
      if (t === null) continue;
      // 检查 ❯ 行是否仍可见（top+1 >= target 表示还在视口内，跳过）
      const top = getItemTop(i);
      if (top >= 0 && top + 1 >= target) continue;
      idx = i;
      text = t;
      break;
    }
  }

  // 去重：只在 idx 变化时更新 sticky prompt
  const lastIdx = useRef(-1);

  useEffect(() => {
    if (lastIdx.current === idx) return;
    lastIdx.current = idx;

    if (text === null) {
      setStickyPrompt(null);
      return;
    }

    // 只取第一段（空行分割），截断到 STICKY_TEXT_CAP
    const trimmed = text.trimStart();
    const paraEnd = trimmed.search(/\n\s*\n/);
    const collapsed = (paraEnd >= 0 ? trimmed.slice(0, paraEnd) : trimmed)
      .slice(0, STICKY_TEXT_CAP)
      .replace(/\s+/g, ' ')
      .trim();

    if (collapsed === '') {
      setStickyPrompt(null);
      return;
    }

    const capturedIdx = idx;
    setStickyPrompt({
      text: collapsed,
      scrollTo: () => {
        // 点击后隐藏 header，保持 paddingTop=0
        setStickyPrompt('clicked');
        // scrollToElement 延迟 Yoga 位置读取到渲染时——无竞态
        const el = getItemElement(capturedIdx);
        if (el) {
          scrollRef.current?.scrollToElement(el, 1);
        } else {
          // 未挂载（在 topSpacer 中），滚动到估算位置
          const baseOffset = offsets[firstVisible]!;
          const estimate = Math.max(0, baseOffset + (offsets[capturedIdx] ?? 0));
          scrollRef.current?.scrollTo(estimate);
        }
      },
    });
  }); // 无 deps——每次 render 都运行，内部 guard 短路

  return null;
}
