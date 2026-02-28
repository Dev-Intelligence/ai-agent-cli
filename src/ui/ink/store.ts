/**
 * AppStore — 外部状态管理
 *
 * 用 useSyncExternalStore 替代 React Context + bind() 回调，
 * 实现精确订阅和 React 外读写。
 */

import type { AppPhase, CompletedItem, CompletedItemInput, BannerConfig } from './types.js';
import { generateId } from './types.js';
import type { Theme } from '../theme.js';

/**
 * 应用状态
 */
export interface AppState {
  phase: AppPhase;
  completedItems: CompletedItem[];
  theme: Theme;
}

/**
 * 外部 Store — React 外可读写，组件通过 useSyncExternalStore 精确订阅
 */
export class AppStore {
  private state: AppState;
  private listeners = new Set<() => void>();

  constructor(initialState: AppState) {
    this.state = initialState;
  }

  getState(): AppState {
    return this.state;
  }

  setState(updater: (prev: AppState) => Partial<AppState>): void {
    const partial = updater(this.state);
    this.state = { ...this.state, ...partial };
    this.listeners.forEach((l) => l());
  }

  subscribe(listener: () => void): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ─── 便捷方法 ───

  setPhase(phase: AppPhase): void {
    this.setState(() => ({ phase }));
  }

  addCompleted(item: CompletedItemInput): void {
    const fullItem = { ...item, id: generateId() } as CompletedItem;
    this.setState((prev) => ({
      completedItems: [...prev.completedItems, fullItem],
    }));
  }

  /**
   * 创建带 banner 的初始状态
   */
  static createInitialState(theme: Theme, bannerConfig?: BannerConfig): AppState {
    const completedItems: CompletedItem[] = [];
    if (bannerConfig) {
      completedItems.push({ id: generateId(), type: 'banner' as const, config: bannerConfig });
    }
    return {
      phase: { type: 'input' },
      completedItems,
      theme,
    };
  }
}
