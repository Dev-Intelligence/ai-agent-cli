/**
 * useVirtualScroll — 虚拟滚动核心 hook
 *
 * React Compiler _c 无需转换（原版未使用）。
 *
 * 在 ScrollBox 内只挂载视口 + 超扫区域的 item，用 spacer Box 占位其余。
 * 高度缓存 + 累积偏移数组 + 三分支范围计算 + useSyncExternalStore 量化订阅。
 *
 * 关键常量：
 *   DEFAULT_ESTIMATE=3     未测量 item 的默认行高（宁低不高）
 *   OVERSCAN_ROWS=80       视口上下额外渲染行数
 *   SCROLL_QUANTUM=40      scrollTop 量化 bin（跨 bin 才 re-render）
 *   PESSIMISTIC_HEIGHT=1   覆盖计算的最坏假设高度
 *   MAX_MOUNTED_ITEMS=300  最大同时挂载 item 数
 *   SLIDE_STEP=25          快速滚动时每次 commit 最多新增 item 数
 *   COLD_START_COUNT=30    首次布局前渲染的尾部 item 数
 */

import type { RefObject } from 'react';
import {
  useCallback,
  useDeferredValue,
  useLayoutEffect,
  useMemo,
  useRef,
  useSyncExternalStore,
} from 'react';
import type { ScrollBoxHandle } from '../primitives.js';

// ─── DOMElement 类型（从 vendor ink 导入） ───
// @ts-ignore — vendor ink 文件有 @ts-nocheck
type DOMElement = import('../../../vendor/ink/dom.js').DOMElement;

// ─── 常量 ───

/** 未测量 item 的默认行高（宁低不高：低估多挂载几个，高估留白） */
const DEFAULT_ESTIMATE = 3;
/** 视口上下额外渲染行数（宽裕值，因为真实高度可能是估算的 10 倍） */
const OVERSCAN_ROWS = 80;
/** ScrollBox 首次布局前渲染的尾部 item 数 */
const COLD_START_COUNT = 30;
/** scrollTop 量化 bin 大小（跨 bin 才触发 React re-render） */
const SCROLL_QUANTUM = OVERSCAN_ROWS >> 1;
/** 覆盖计算的最坏假设高度（1 行 = MessageRow 最小可能） */
const PESSIMISTIC_HEIGHT = 1;
/** 最大同时挂载 item 数（限制 fiber 分配） */
const MAX_MOUNTED_ITEMS = 300;
/** 快速滚动时每次 commit 最多新增 item 数（防止 ~290ms 阻塞） */
const SLIDE_STEP = 25;

const NOOP_UNSUB = () => {};

// ─── 返回类型 ───

export type VirtualScrollResult = {
  /** [startIndex, endIndex) 半开区间 */
  range: readonly [number, number];
  /** 首个渲染 item 之前的 spacer 高度（行） */
  topSpacer: number;
  /** 最后渲染 item 之后的 spacer 高度（行） */
  bottomSpacer: number;
  /** callback ref 工厂：挂载到每个 item 的根 Box */
  measureRef: (key: string) => (el: DOMElement | null) => void;
  /** 顶部 spacer Box 的 ref（其 Yoga computedTop = listOrigin） */
  spacerRef: RefObject<DOMElement | null>;
  /** 累积 y 偏移数组：offsets[i] = item i 上方的总行数，offsets[n] = 总高度 */
  offsets: ArrayLike<number>;
  /** 读取 item 的 Yoga computedTop，未挂载返回 -1 */
  getItemTop: (index: number) => number;
  /** 获取 item 的 DOMElement，未挂载返回 null */
  getItemElement: (index: number) => DOMElement | null;
  /** 获取 item 的测量高度，未测量返回 undefined */
  getItemHeight: (index: number) => number | undefined;
  /** 滚动到 item i 的位置 */
  scrollToIndex: (i: number) => void;
};

// ─── Hook ───

export function useVirtualScroll(
  scrollRef: RefObject<ScrollBoxHandle | null>,
  itemKeys: readonly string[],
  /** 终端列数（变化时按比例缩放高度缓存，避免清空导致 190 个 item 重新挂载） */
  columns: number,
): VirtualScrollResult {
  const heightCache = useRef(new Map<string, number>());
  // 每次 heightCache 变更时递增，触发偏移数组重建
  const offsetVersionRef = useRef(0);
  // 上次 commit 的 scrollTop，用于检测快速滚动（slide cap 门控）
  const lastScrollTopRef = useRef(0);
  const offsetsRef = useRef<{ arr: Float64Array; version: number; n: number }>({
    arr: new Float64Array(0),
    version: -1,
    n: -1,
  });
  const itemRefs = useRef(new Map<string, DOMElement>());
  const refCache = useRef(new Map<string, (el: DOMElement | null) => void>());

  // ─── 列数变化：按比例缩放高度缓存 ───
  const prevColumns = useRef(columns);
  const skipMeasurementRef = useRef(false);
  const prevRangeRef = useRef<readonly [number, number] | null>(null);
  const freezeRendersRef = useRef(0);

  if (prevColumns.current !== columns) {
    const ratio = prevColumns.current / columns;
    prevColumns.current = columns;
    // 按比例缩放而非清空——避免 190 个 item 重新挂载（~600ms 阻塞）
    for (const [k, h] of heightCache.current) {
      heightCache.current.set(k, Math.max(1, Math.round(h * ratio)));
    }
    offsetVersionRef.current++;
    skipMeasurementRef.current = true;
    freezeRendersRef.current = 2; // 冻结 2 帧让 Yoga 重新布局
  }

  const frozenRange = freezeRendersRef.current > 0 ? prevRangeRef.current : null;
  // list 在 ScrollBox 内容区的 y 偏移（Logo、StatusNotices 等前置兄弟的累积高度）
  const listOriginRef = useRef(0);
  const spacerRef = useRef<DOMElement | null>(null);

  // ─── useSyncExternalStore：量化滚动订阅 ───
  // 将 scrollTop 量化到 SCROLL_QUANTUM bin，跨 bin 才触发 re-render
  // sticky 编码到符号位：scrollToBottom 不移动 scrollTop 但改变 sticky 状态
  const subscribe = useCallback(
    (listener: () => void) =>
      scrollRef.current?.subscribe(listener) ?? NOOP_UNSUB,
    [scrollRef],
  );
  useSyncExternalStore(subscribe, () => {
    const s = scrollRef.current;
    if (!s) return NaN;
    // 使用目标值（scrollTop + pendingDelta）而非已提交的 scrollTop
    // scrollBy 只修改 pendingDelta，已提交的 scrollTop 滞后
    const target = s.getScrollTop() + s.getPendingDelta();
    const bin = Math.floor(target / SCROLL_QUANTUM);
    return s.isSticky() ? ~bin : bin;
  });

  // 读取真实的已提交 scrollTop（非量化版）用于范围计算
  const scrollTop = scrollRef.current?.getScrollTop() ?? -1;
  const pendingDelta = scrollRef.current?.getPendingDelta() ?? 0;
  const viewportH = scrollRef.current?.getViewportHeight() ?? 0;
  const isSticky = scrollRef.current?.isSticky() ?? true;

  // ─── GC 过期缓存条目（compaction、/clear） ───
  // eslint-disable-next-line react-hooks/exhaustive-deps
  useMemo(() => {
    const live = new Set(itemKeys);
    let dirty = false;
    for (const k of heightCache.current.keys()) {
      if (!live.has(k)) {
        heightCache.current.delete(k);
        dirty = true;
      }
    }
    for (const k of refCache.current.keys()) {
      if (!live.has(k)) refCache.current.delete(k);
    }
    if (dirty) offsetVersionRef.current++;
  }, [itemKeys]);

  // ─── 偏移数组计算（惰性重建） ───
  const n = itemKeys.length;
  if (
    offsetsRef.current.version !== offsetVersionRef.current ||
    offsetsRef.current.n !== n
  ) {
    const arr =
      offsetsRef.current.arr.length >= n + 1
        ? offsetsRef.current.arr
        : new Float64Array(n + 1);
    arr[0] = 0;
    for (let i = 0; i < n; i++) {
      arr[i + 1] =
        arr[i]! + (heightCache.current.get(itemKeys[i]!) ?? DEFAULT_ESTIMATE);
    }
    offsetsRef.current = { arr, version: offsetVersionRef.current, n };
  }
  const offsets = offsetsRef.current.arr;
  const totalHeight = offsets[n]!;

  // ─── 范围计算 ───
  let start: number;
  let end: number;

  if (frozenRange) {
    // 列数刚变化，保持旧范围避免挂载抖动
    [start, end] = frozenRange;
    start = Math.min(start, n);
    end = Math.min(end, n);
  } else if (viewportH === 0 || scrollTop < 0) {
    // 冷启动：ScrollBox 还没布局，渲染尾部
    start = Math.max(0, n - COLD_START_COUNT);
    end = n;
  } else {
    if (isSticky) {
      // ─── Sticky（底部）：从尾部向前扫描 ───
      const budget = viewportH + OVERSCAN_ROWS;
      start = n;
      while (start > 0 && totalHeight - offsets[start - 1]! < budget) {
        start--;
      }
      end = n;
    } else {
      // ─── 非 Sticky（滚动中）：二分查找 + 前向覆盖 ───
      const listOrigin = listOriginRef.current;
      // 限制 [committed..target] 跨度，防止 pendingDelta 无限增长的死亡螺旋
      const MAX_SPAN_ROWS = viewportH * 3;
      const rawLo = Math.min(scrollTop, scrollTop + pendingDelta);
      const rawHi = Math.max(scrollTop, scrollTop + pendingDelta);
      const span = rawHi - rawLo;
      const clampedLo =
        span > MAX_SPAN_ROWS
          ? pendingDelta < 0 ? rawHi - MAX_SPAN_ROWS : rawLo
          : rawLo;
      const clampedHi = clampedLo + Math.min(span, MAX_SPAN_ROWS);
      const effLo = Math.max(0, clampedLo - listOrigin);
      const effHi = clampedHi - listOrigin;
      const lo = effLo - OVERSCAN_ROWS;

      // 二分查找 start（offsets 单调递增）
      {
        let l = 0;
        let r = n;
        while (l < r) {
          const m = (l + r) >> 1;
          if (offsets[m + 1]! <= lo) l = m + 1;
          else r = m;
        }
        start = l;
      }

      // 守卫：不跳过已挂载但未测量的 item（防止用 DEFAULT_ESTIMATE 替代导致闪烁）
      {
        const p = prevRangeRef.current;
        if (p && p[0] < start) {
          for (let i = p[0]; i < Math.min(start, p[1]); i++) {
            const k = itemKeys[i]!;
            if (itemRefs.current.has(k) && !heightCache.current.has(k)) {
              start = i;
              break;
            }
          }
        }
      }

      // 前向覆盖：用 PESSIMISTIC_HEIGHT 确保覆盖视口 + 双倍超扫
      const needed = viewportH + 2 * OVERSCAN_ROWS;
      const maxEnd = Math.min(n, start + MAX_MOUNTED_ITEMS);
      let coverage = 0;
      end = start;
      while (
        end < maxEnd &&
        (coverage < needed || offsets[end]! < effHi + viewportH + OVERSCAN_ROWS)
      ) {
        coverage +=
          heightCache.current.get(itemKeys[end]!) ?? PESSIMISTIC_HEIGHT;
        end++;
      }
    }

    // 反向覆盖补充（sticky 路径也需要，因为估算可能不够）
    const needed = viewportH + 2 * OVERSCAN_ROWS;
    const minStart = Math.max(0, end - MAX_MOUNTED_ITEMS);
    let coverage = 0;
    for (let i = start; i < end; i++) {
      coverage += heightCache.current.get(itemKeys[i]!) ?? PESSIMISTIC_HEIGHT;
    }
    while (start > minStart && coverage < needed) {
      start--;
      coverage +=
        heightCache.current.get(itemKeys[start]!) ?? PESSIMISTIC_HEIGHT;
    }

    // ─── Slide cap：限制每次 commit 的新增挂载数 ───
    const prev = prevRangeRef.current;
    const scrollVelocity =
      Math.abs(scrollTop - lastScrollTopRef.current) + Math.abs(pendingDelta);
    if (prev && scrollVelocity > viewportH * 2) {
      const [pS, pE] = prev;
      if (start < pS - SLIDE_STEP) start = pS - SLIDE_STEP;
      if (end > pE + SLIDE_STEP) end = pE + SLIDE_STEP;
      if (start > end) end = Math.min(start + SLIDE_STEP, n);
    }
    lastScrollTopRef.current = scrollTop;
  }

  // 冻结帧递减
  if (freezeRendersRef.current > 0) {
    freezeRendersRef.current--;
  } else {
    prevRangeRef.current = [start, end];
  }

  // ─── useDeferredValue 时间切片 ───
  // 只延迟范围增长（新增挂载昂贵），收缩即时（卸载便宜）
  const dStart = useDeferredValue(start);
  const dEnd = useDeferredValue(end);
  let effStart = start < dStart ? dStart : start;
  let effEnd = end > dEnd ? dEnd : end;

  // 跳过延迟：反转范围 / sticky / 向下滚动
  if (effStart > effEnd || isSticky) {
    effStart = start;
    effEnd = end;
  }
  if (pendingDelta > 0) {
    effEnd = end;
  }

  // ─── MAX_MOUNTED_ITEMS 最终裁剪 ───
  if (effEnd - effStart > MAX_MOUNTED_ITEMS) {
    const mid = (offsets[effStart]! + offsets[effEnd]!) / 2;
    if (scrollTop - listOriginRef.current < mid) {
      effEnd = effStart + MAX_MOUNTED_ITEMS;
    } else {
      effStart = effEnd - MAX_MOUNTED_ITEMS;
    }
  }

  // ─── setClampBounds：渲染时 scrollTop 钳制 ───
  const listOrigin = listOriginRef.current;
  const effTopSpacer = offsets[effStart]!;
  const clampMin = effStart === 0 ? 0 : effTopSpacer + listOrigin;
  const clampMax =
    effEnd === n
      ? Infinity
      : Math.max(effTopSpacer, offsets[effEnd]! - viewportH) + listOrigin;

  useLayoutEffect(() => {
    if (isSticky) {
      scrollRef.current?.setClampBounds(undefined, undefined);
    } else {
      scrollRef.current?.setClampBounds(clampMin, clampMax);
    }
  });

  // ─── useLayoutEffect：测量 Yoga 高度 ───
  useLayoutEffect(() => {
    // 读取 spacer 的 Yoga computedTop 作为 listOrigin
    const spacerYoga = (spacerRef.current as any)?.yogaNode;
    if (spacerYoga && spacerYoga.getComputedWidth() > 0) {
      listOriginRef.current = spacerYoga.getComputedTop();
    }
    // 跳过 resize 后的首帧测量（Yoga 还是旧宽度的值）
    if (skipMeasurementRef.current) {
      skipMeasurementRef.current = false;
      return;
    }
    let anyChanged = false;
    for (const [key, el] of itemRefs.current) {
      const yoga = (el as any).yogaNode;
      if (!yoga) continue;
      const h = yoga.getComputedHeight();
      const prev = heightCache.current.get(key);
      if (h > 0) {
        if (prev !== h) {
          heightCache.current.set(key, h);
          anyChanged = true;
        }
      } else if (yoga.getComputedWidth() > 0 && prev !== 0) {
        // width>0 证明 Yoga 已布局，height=0 是真正的空 item
        heightCache.current.set(key, 0);
        anyChanged = true;
      }
    }
    if (anyChanged) offsetVersionRef.current++;
  });

  // ─── measureRef：稳定的 per-key callback ref ───
  const measureRef = useCallback((key: string) => {
    let fn = refCache.current.get(key);
    if (!fn) {
      fn = (el: DOMElement | null) => {
        if (el) {
          itemRefs.current.set(key, el);
        } else {
          // unmount：yogaNode 仍有效，捕获最终高度
          const yoga = (itemRefs.current.get(key) as any)?.yogaNode;
          if (yoga && !skipMeasurementRef.current) {
            const h = yoga.getComputedHeight();
            if (
              (h > 0 || yoga.getComputedWidth() > 0) &&
              heightCache.current.get(key) !== h
            ) {
              heightCache.current.set(key, h);
              offsetVersionRef.current++;
            }
          }
          itemRefs.current.delete(key);
        }
      };
      refCache.current.set(key, fn);
    }
    return fn;
  }, []);

  // ─── 访问器 ───
  const getItemTop = useCallback(
    (index: number) => {
      const yoga = (itemRefs.current.get(itemKeys[index]!) as any)?.yogaNode;
      if (!yoga || yoga.getComputedWidth() === 0) return -1;
      return yoga.getComputedTop();
    },
    [itemKeys],
  );

  const getItemElement = useCallback(
    (index: number) => itemRefs.current.get(itemKeys[index]!) ?? null,
    [itemKeys],
  );

  const getItemHeight = useCallback(
    (index: number) => heightCache.current.get(itemKeys[index]!),
    [itemKeys],
  );

  const scrollToIndex = useCallback(
    (i: number) => {
      const o = offsetsRef.current;
      if (i < 0 || i >= o.n) return;
      scrollRef.current?.scrollTo(o.arr[i]! + listOriginRef.current);
    },
    [scrollRef],
  );

  const effBottomSpacer = totalHeight - offsets[effEnd]!;

  return {
    range: [effStart, effEnd],
    topSpacer: effTopSpacer,
    bottomSpacer: effBottomSpacer,
    measureRef,
    spacerRef,
    offsets,
    getItemTop,
    getItemElement,
    getItemHeight,
    scrollToIndex,
  };
}
