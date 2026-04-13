/**
 * Store — 外部状态管理（函数式）
 *
 * 组件通过 useAppState(selector) 精确订阅。
 */

import type {
  CompletedItem,
  CompletedItemInput,
  BannerConfig,
  ContextTokenUsage,
  LoadingState,
  StreamingState,
  FocusTarget,
  ActiveToolUse,
} from './types.js';
import { generateId } from './types.js';
import type { Theme } from '../theme.js';

// ─── AppState ───

export interface AppState {
  completedItems: CompletedItem[];
  activeToolUses: ActiveToolUse[];
  theme: Theme;
  loading: LoadingState;
  streaming: StreamingState;
  focus: FocusTarget;
  tokenInfo: string | null;
  contextTokenUsage: ContextTokenUsage | null;
}

// ─── Store 类型 ───

type Listener = () => void;
type OnChange<T> = (args: { newState: T; oldState: T }) => void;

export type Store<T> = {
  getState: () => T;
  setState: (updater: (prev: T) => T) => void;
  subscribe: (listener: Listener) => () => void;
};

export type AppStateStore = Store<AppState>;

// ─── createStore ───

export function createStore<T>(
  initialState: T,
  onChange?: OnChange<T>,
): Store<T> {
  let state = initialState;
  const listeners = new Set<Listener>();

  return {
    getState: () => state,
    setState: (updater: (prev: T) => T) => {
      const prev = state;
      const next = updater(prev);
      if (Object.is(next, prev)) return;
      state = next;
      onChange?.({ newState: next, oldState: prev });
      for (const listener of listeners) listener();
    },
    subscribe: (listener: Listener) => {
      listeners.add(listener);
      return () => listeners.delete(listener);
    },
  };
}

// ─── Action helpers（操作 AppStateStore）───

export function addCompleted(store: AppStateStore, item: CompletedItemInput): string {
  const fullItem = { ...item, id: generateId() } as CompletedItem;
  store.setState((prev) => ({
    ...prev,
    completedItems: [...prev.completedItems, fullItem],
  }));
  return fullItem.id;
}

export function replaceLastCompleted(store: AppStateStore, item: CompletedItem): void {
  store.setState((prev) => ({
    ...prev,
    completedItems: [...prev.completedItems.slice(0, -1), item],
  }));
}

export function updateCompletedById(
  store: AppStateStore,
  id: string,
  updater: (item: CompletedItem) => CompletedItem,
): void {
  store.setState((prev) => ({
    ...prev,
    completedItems: prev.completedItems.map((item) =>
      item.id === id ? updater(item) : item,
    ),
  }));
}

export function setLoading(store: AppStateStore, loading: LoadingState): void {
  store.setState((prev) => ({ ...prev, loading }));
}

export function setStreaming(store: AppStateStore, streaming: StreamingState): void {
  store.setState((prev) => ({ ...prev, streaming }));
}

export function setFocus(store: AppStateStore, focus: FocusTarget): void {
  store.setState((prev) => ({ ...prev, focus }));
}

export function setTokenInfo(store: AppStateStore, info: string | null): void {
  store.setState((prev) => ({ ...prev, tokenInfo: info }));
}

export function setContextTokenUsage(
  store: AppStateStore,
  usage: ContextTokenUsage | null,
): void {
  store.setState((prev) => ({ ...prev, contextTokenUsage: usage }));
}

export function resetToInput(store: AppStateStore): void {
  store.setState((prev) => ({
    ...prev,
    loading: null,
    streaming: null,
    focus: undefined,
  }));
}

/**
 * 原子操作：添加完成项 + 清除所有动态状态
 * 避免两次 setState 导致中间帧
 */
export function addCompletedAndReset(store: AppStateStore, item: CompletedItemInput): void {
  const fullItem = { ...item, id: generateId() } as CompletedItem;
  store.setState((prev) => ({
    ...prev,
    completedItems: [...prev.completedItems, fullItem],
    loading: null,
    streaming: null,
    focus: undefined,
  }));
}

export function addActiveToolUse(store: AppStateStore, toolUse: ActiveToolUse): void {
  store.setState((prev) => ({
    ...prev,
    activeToolUses: [...prev.activeToolUses, toolUse],
  }));
}

export function updateActiveToolUse(
  store: AppStateStore,
  toolUseId: string,
  updater: (item: ActiveToolUse) => ActiveToolUse,
): void {
  store.setState((prev) => ({
    ...prev,
    activeToolUses: prev.activeToolUses.map((item) =>
      item.toolUseId === toolUseId ? updater(item) : item,
    ),
  }));
}

export function removeActiveToolUse(store: AppStateStore, toolUseId: string): void {
  store.setState((prev) => ({
    ...prev,
    activeToolUses: prev.activeToolUses.filter((item) => item.toolUseId !== toolUseId),
  }));
}

// ─── 初始状态 ───

export function createInitialAppState(theme: Theme, bannerConfig?: BannerConfig): AppState {
  const completedItems: CompletedItem[] = [];
  if (bannerConfig) {
    completedItems.push({ id: generateId(), type: 'banner' as const, config: bannerConfig });
  }
  return {
    completedItems,
    activeToolUses: [],
    theme,
    loading: null,
    streaming: null,
    focus: undefined,
    tokenInfo: null,
    contextTokenUsage: null,
  };
}
