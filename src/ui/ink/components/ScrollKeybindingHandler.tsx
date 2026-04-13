/**
 * ScrollKeybindingHandler — 滚动快捷键处理器
 *
 * 包含：
 * - 双模式滚轮加速算法（native terminal + xterm.js）
 * - 编码器弹跳检测（bounce debounce）
 * - jumpBy / scrollDown / scrollUp（含 pendingDelta 感知）
 * - modalPagerAction（g/G/j/k/ctrl+u/d/b/f/Space 等）
 * - shouldClearSelectionOnKey / selectionFocusMoveForKey
 *
 * 适配：useKeybindings → useInput（keybindings 上下文已移植但尚未接入 Provider）
 * 选区操作暂桩化（vendor ink selection 已有但需 Provider 接入）
 */

import React, { type RefObject, useRef } from 'react';
import { useInput } from '../primitives.js';
import type { ScrollBoxHandle, Key } from '../primitives.js';
import { matchesBinding } from '../keybindings/match.js';
import { getDefaultBindings } from '../keybindings/defaultBindings.js';

// ─── Props ───

type Props = {
  scrollRef: RefObject<ScrollBoxHandle | null>;
  isActive: boolean;
  /** 每次滚动后回调（sticky 状态 + handle） */
  onScroll?: (sticky: boolean, handle: ScrollBoxHandle) => void;
  /** 启用模态分页键（g/G/j/k/ctrl+u/d/b/f），仅在无文本输入竞争时安全 */
  isModal?: boolean;
};

// ─── 滚轮加速常量（native terminal） ───

/** 加速窗口（ms）：sub-40ms 事件递增倍率，超时重置 */
const WHEEL_ACCEL_WINDOW_MS = 40;
/** 每次事件的倍率增量 */
const WHEEL_ACCEL_STEP = 0.3;
/** 最大倍率 */
const WHEEL_ACCEL_MAX = 6;

// ─── 编码器弹跳检测 + 鼠标模式 ───

/** 弹跳确认的最大间隔（ms） */
const WHEEL_BOUNCE_GAP_MAX_MS = 200;
/** 鼠标模式步进（事件率低，步进大补偿） */
const WHEEL_MODE_STEP = 15;
/** 鼠标模式倍率上限 */
const WHEEL_MODE_CAP = 15;
/** 鼠标模式单次增长上限（防突变） */
const WHEEL_MODE_RAMP = 3;
/** 空闲脱离阈值（ms）：长时间无事件则脱离鼠标模式 */
const WHEEL_MODE_IDLE_DISENGAGE_MS = 1500;

// ─── xterm.js 衰减曲线 ───

/** 半衰期（ms） */
const WHEEL_DECAY_HALFLIFE_MS = 150;
/** 衰减步进 */
const WHEEL_DECAY_STEP = 5;
/** 同批事件间隔阈值（ms） */
const WHEEL_BURST_MS = 5;
/** 慢速/快速分界间隔（ms） */
const WHEEL_DECAY_GAP_MS = 80;
/** 慢速倍率上限 */
const WHEEL_DECAY_CAP_SLOW = 3;
/** 快速倍率上限 */
const WHEEL_DECAY_CAP_FAST = 6;
/** 空闲重置阈值（ms） */
const WHEEL_DECAY_IDLE_MS = 500;

// ─── 滚轮加速状态 ───

export type WheelAccelState = {
  time: number;
  mult: number;
  dir: 0 | 1 | -1;
  xtermJs: boolean;
  frac: number;
  base: number;
  pendingFlip: boolean;
  wheelMode: boolean;
  burstCount: number;
};

/**
 * 计算单次滚轮事件的行数（双模式算法）
 * 返回 0 表示方向翻转被延迟（弹跳检测中）
 */
export function computeWheelStep(state: WheelAccelState, dir: 1 | -1, now: number): number {
  if (!state.xtermJs) {
    // ─── native terminal 路径 ───

    // 空闲脱离鼠标模式
    if (state.wheelMode && now - state.time > WHEEL_MODE_IDLE_DISENGAGE_MS) {
      state.wheelMode = false;
      state.burstCount = 0;
      state.mult = state.base;
    }

    // 解析延迟翻转（弹跳检测）
    if (state.pendingFlip) {
      state.pendingFlip = false;
      if (dir !== state.dir || now - state.time > WHEEL_BOUNCE_GAP_MAX_MS) {
        // 真实反转：新方向持续或翻转太迟
        state.dir = dir;
        state.time = now;
        state.mult = state.base;
        return Math.floor(state.mult);
      }
      // 弹跳确认：翻转回原方向
      state.wheelMode = true;
    }

    const gap = now - state.time;
    if (dir !== state.dir && state.dir !== 0) {
      // 方向翻转：延迟决定（下个事件区分弹跳 vs 真实反转）
      state.pendingFlip = true;
      state.time = now;
      return 0;
    }
    state.dir = dir;
    state.time = now;

    // 鼠标模式（sticky，直到设备切换信号）
    if (state.wheelMode) {
      if (gap < WHEEL_BURST_MS) {
        // 同批 burst 检测 + 设备切换守卫
        if (++state.burstCount >= 5) {
          // 5+ 连续 <5ms 事件 → 触控板签名 → 脱离鼠标模式
          state.wheelMode = false;
          state.burstCount = 0;
          state.mult = state.base;
        } else {
          return 1;
        }
      } else {
        state.burstCount = 0;
      }
    }

    if (state.wheelMode) {
      // xterm.js 衰减曲线 + 更高步进/上限
      const m = Math.pow(0.5, gap / WHEEL_DECAY_HALFLIFE_MS);
      const cap = Math.max(WHEEL_MODE_CAP, state.base * 2);
      const next = 1 + (state.mult - 1) * m + WHEEL_MODE_STEP * m;
      state.mult = Math.min(cap, next, state.mult + WHEEL_MODE_RAMP);
      return Math.floor(state.mult);
    }

    // 触控板/高分辨率（native，非鼠标模式）
    if (gap > WHEEL_ACCEL_WINDOW_MS) {
      state.mult = state.base;
    } else {
      const cap = Math.max(WHEEL_ACCEL_MAX, state.base * 2);
      state.mult = Math.min(cap, state.mult + WHEEL_ACCEL_STEP);
    }
    return Math.floor(state.mult);
  }

  // ─── xterm.js (VS Code) 路径 ───
  const gap = now - state.time;
  const sameDir = dir === state.dir;
  state.time = now;
  state.dir = dir;

  if (sameDir && gap < WHEEL_BURST_MS) return 1;
  if (!sameDir || gap > WHEEL_DECAY_IDLE_MS) {
    state.mult = 2;
    state.frac = 0;
  } else {
    const m = Math.pow(0.5, gap / WHEEL_DECAY_HALFLIFE_MS);
    const cap = gap >= WHEEL_DECAY_GAP_MS ? WHEEL_DECAY_CAP_SLOW : WHEEL_DECAY_CAP_FAST;
    state.mult = Math.min(cap, 1 + (state.mult - 1) * m + WHEEL_DECAY_STEP * m);
  }
  const total = state.mult + state.frac;
  const rows = Math.floor(total);
  state.frac = total - rows;
  return rows;
}

/** 读取 CLAUDE_CODE_SCROLL_SPEED 环境变量，默认 1 */
export function readScrollSpeedBase(): number {
  const raw = process.env['CLAUDE_CODE_SCROLL_SPEED'];
  if (!raw) return 1;
  const n = parseFloat(raw);
  return Number.isNaN(n) || n <= 0 ? 1 : Math.min(n, 20);
}

/** 初始化滚轮加速状态 */
export function initWheelAccel(xtermJs = false, base = 1): WheelAccelState {
  return { time: 0, mult: base, dir: 0, xtermJs, frac: 0, base, pendingFlip: false, wheelMode: false, burstCount: 0 };
}

/** 检测是否为 xterm.js 终端 */
function detectXtermJs(): boolean {
  const tp = process.env['TERM_PROGRAM'];
  return tp === 'vscode' || tp === 'cursor' || tp === 'windsurf';
}

function initAndLogWheelAccel(): WheelAccelState {
  return initWheelAccel(detectXtermJs(), readScrollSpeedBase());
}

// ─── 键盘翻页辅助函数 ───

/**
 * 同步翻页跳转（scrollTo 直接写 scrollTop，清除 pendingDelta）
 * 目标相对于 scrollTop + pendingDelta（mid-wheel-burst 时跳到滚轮目标位置）
 */
export function jumpBy(s: ScrollBoxHandle, delta: number): boolean {
  const max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
  const target = s.getScrollTop() + s.getPendingDelta() + delta;
  if (target >= max) {
    s.scrollTo(max);
    s.scrollToBottom();
    return true;
  }
  s.scrollTo(Math.max(0, target));
  return false;
}

/** 向下滚动（scrollBy 异步累积），到底部时恢复 sticky */
function scrollDown(s: ScrollBoxHandle, amount: number): boolean {
  const max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
  const effectiveTop = s.getScrollTop() + s.getPendingDelta();
  if (effectiveTop + amount >= max) {
    s.scrollToBottom();
    return true;
  }
  s.scrollBy(amount);
  return false;
}

/** 向上滚动（钳制到 0，防止 MX Master 自由旋转的负值累积） */
export function scrollUp(s: ScrollBoxHandle, amount: number): void {
  const effectiveTop = s.getScrollTop() + s.getPendingDelta();
  if (effectiveTop - amount <= 0) {
    s.scrollTo(0);
    return;
  }
  s.scrollBy(-amount);
}

// ─── Modal Pager ───

export type ModalPagerAction = 'lineUp' | 'lineDown' | 'halfPageUp' | 'halfPageDown' | 'fullPageUp' | 'fullPageDown' | 'top' | 'bottom';

/** 按键 → 模态分页动作 */
export function modalPagerAction(
  input: string,
  key: Pick<Key, 'ctrl' | 'meta' | 'shift' | 'upArrow' | 'downArrow'> & { home?: boolean; end?: boolean },
): ModalPagerAction | null {
  if (key.meta) return null;
  if (!key.ctrl && !key.shift) {
    if (key.upArrow) return 'lineUp';
    if (key.downArrow) return 'lineDown';
    if ((key as any).home) return 'top';
    if ((key as any).end) return 'bottom';
  }
  if (key.ctrl) {
    if (key.shift) return null;
    switch (input) {
      case 'u': return 'halfPageUp';
      case 'd': return 'halfPageDown';
      case 'b': return 'fullPageUp';
      case 'f': return 'fullPageDown';
      case 'n': return 'lineDown';
      case 'p': return 'lineUp';
      default: return null;
    }
  }
  const c = input[0];
  if (!c || input !== c.repeat(input.length)) return null;
  if (c === 'G' || (c === 'g' && key.shift)) return 'bottom';
  if (key.shift) return null;
  switch (c) {
    case 'g': return 'top';
    case 'j': return 'lineDown';
    case 'k': return 'lineUp';
    case ' ': return 'fullPageDown';
    case 'b': return 'fullPageUp';
    default: return null;
  }
}

/** 应用模态分页动作到 ScrollBox */
export function applyModalPagerAction(
  s: ScrollBoxHandle,
  act: ModalPagerAction | null,
): boolean | null {
  switch (act) {
    case null: return null;
    case 'lineUp':
    case 'lineDown':
      return jumpBy(s, act === 'lineDown' ? 1 : -1);
    case 'halfPageUp':
    case 'halfPageDown': {
      const half = Math.max(1, Math.floor(s.getViewportHeight() / 2));
      return jumpBy(s, act === 'halfPageDown' ? half : -half);
    }
    case 'fullPageUp':
    case 'fullPageDown': {
      const page = Math.max(1, s.getViewportHeight());
      return jumpBy(s, act === 'fullPageDown' ? page : -page);
    }
    case 'top':
      s.scrollTo(0);
      return false;
    case 'bottom': {
      const max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
      s.scrollTo(max);
      s.scrollToBottom();
      return true;
    }
  }
}

// ─── 选区辅助（类型导出，供外部使用） ───

/** 是否应清除选区 */
export function shouldClearSelectionOnKey(key: Key): boolean {
  if ((key as any).wheelUp || (key as any).wheelDown) return false;
  const isNav = key.leftArrow || key.rightArrow || key.upArrow || key.downArrow ||
    (key as any).home || (key as any).end || key.pageUp || key.pageDown;
  if (isNav && (key.shift || key.meta || (key as any).super)) return false;
  return true;
}

// ─── 主组件 ───

export function ScrollKeybindingHandler({
  scrollRef,
  isActive,
  onScroll,
  isModal = false,
}: Props): React.ReactNode {
  // 懒初始化滚轮加速状态（首次 wheel 事件时 XTVERSION 探测已完成）
  const wheelAccel = useRef<WheelAccelState | null>(null);

  // 默认绑定（Scroll context）
  const bindings = getDefaultBindings();

  // ─── 主 useInput：处理所有滚动动作 ───
  useInput((input: string, key: Key) => {
    const s = scrollRef.current;
    if (!s) return;

    // ─── Scroll context 绑定匹配 ───
    for (const binding of bindings) {
      if (binding.context !== 'Scroll') continue;
      if (!matchesBinding(input, key, binding)) continue;

      switch (binding.action) {
        case 'scroll:pageUp': {
          const d = -Math.max(1, Math.floor(s.getViewportHeight() / 2));
          const sticky = jumpBy(s, d);
          onScroll?.(sticky, s);
          return;
        }
        case 'scroll:pageDown': {
          const d = Math.max(1, Math.floor(s.getViewportHeight() / 2));
          const sticky = jumpBy(s, d);
          onScroll?.(sticky, s);
          return;
        }
        case 'scroll:lineUp': {
          if (s.getScrollHeight() <= s.getViewportHeight()) return;
          wheelAccel.current ??= initAndLogWheelAccel();
          scrollUp(s, computeWheelStep(wheelAccel.current, -1, performance.now()));
          onScroll?.(false, s);
          return;
        }
        case 'scroll:lineDown': {
          if (s.getScrollHeight() <= s.getViewportHeight()) return;
          wheelAccel.current ??= initAndLogWheelAccel();
          const step = computeWheelStep(wheelAccel.current, 1, performance.now());
          const reachedBottom = scrollDown(s, step);
          onScroll?.(reachedBottom, s);
          return;
        }
        case 'scroll:top': {
          s.scrollTo(0);
          onScroll?.(false, s);
          return;
        }
        case 'scroll:bottom': {
          const max = Math.max(0, s.getScrollHeight() - s.getViewportHeight());
          s.scrollTo(max);
          s.scrollToBottom();
          onScroll?.(true, s);
          return;
        }
      }
    }

    // ─── Modal pager 键（仅在 isModal 时启用） ───
    if (isModal) {
      const act = modalPagerAction(input, key as any);
      const sticky = applyModalPagerAction(s, act);
      if (sticky !== null) {
        onScroll?.(sticky, s);
        return;
      }
    }
  }, { isActive });

  return null;
}
