/**
 * 通用 Store —— 轻量响应式状态容器
 *
 * 灵感来自 claude-code-sourcemap/src/state/AppStateStore.ts 背后的 Store 抽象，
 * 但不绑定任何具体 AppState 定义。适用于：
 *   - Ink UI 全局状态容器
 *   - 跨模块订阅同一份数据（如任务表、通知、临时 UI 标志）
 *   - 与现有 src/ui/ink/store.ts 并存；逐步迁入高频状态
 *
 * 目标：比 useReducer 更轻，比 Redux 更小；支持 selector 订阅减少无意义重渲染。
 */

export type Listener<T> = (value: T, prev: T) => void;
export type Updater<T> = (prev: T) => T;

export interface Store<T> {
  /** 读当前值（快照，不保证引用稳定） */
  get(): T;
  /** 整体替换或按函数更新 */
  set(next: T | Updater<T>): void;
  /** 订阅整值变更，返回取消订阅 */
  subscribe(listener: Listener<T>): () => void;
  /**
   * 订阅派生值（selector）。
   * - 仅当 selector(value) 的返回值发生变化时触发 listener
   * - equals 可定制比较策略（默认 Object.is）
   */
  subscribeSelector<U>(
    selector: (value: T) => U,
    listener: Listener<U>,
    equals?: (a: U, b: U) => boolean,
  ): () => void;
}

export function createStore<T>(initial: T): Store<T> {
  let value = initial;
  const listeners = new Set<Listener<T>>();

  return {
    get: () => value,

    set: (next) => {
      const prev = value;
      const resolved =
        typeof next === 'function' ? (next as Updater<T>)(prev) : next;
      if (Object.is(prev, resolved)) return;
      value = resolved;
      for (const l of listeners) l(value, prev);
    },

    subscribe: (listener) => {
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },

    subscribeSelector: (selector, listener, equals = Object.is) => {
      let lastDerived = selector(value);
      const wrapped: Listener<T> = (current, prev) => {
        const derived = selector(current);
        if (equals(derived, lastDerived)) return;
        const prevDerived = lastDerived;
        lastDerived = derived;
        listener(derived, prevDerived);
        void prev; // 仅为了消除参数未用的提示，保留签名对齐
      };
      listeners.add(wrapped);
      return () => {
        listeners.delete(wrapped);
      };
    },
  };
}

/**
 * 浅比较 —— 作为 selector 默认比较策略的可选替代，
 * 在 selector 返回对象 / 数组时避免引用变动误触发。
 */
export function shallowEqual<T>(a: T, b: T): boolean {
  if (Object.is(a, b)) return true;
  if (a === null || b === null) return false;
  if (typeof a !== 'object' || typeof b !== 'object') return false;

  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false;
    for (let i = 0; i < a.length; i++) {
      if (!Object.is(a[i], b[i])) return false;
    }
    return true;
  }

  const keysA = Object.keys(a as Record<string, unknown>);
  const keysB = Object.keys(b as Record<string, unknown>);
  if (keysA.length !== keysB.length) return false;
  for (const k of keysA) {
    if (
      !Object.is(
        (a as Record<string, unknown>)[k],
        (b as Record<string, unknown>)[k],
      )
    ) {
      return false;
    }
  }
  return true;
}
