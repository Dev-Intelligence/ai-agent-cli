/**
 * Ink 应用全局状态 Context
 */

import { createContext, useContext } from 'react';
import type { AppPhase, CompletedItem, CompletedItemInput } from './types.js';
import type { Theme } from '../theme.js';

export interface AppState {
  phase: AppPhase;
  completedItems: CompletedItem[];
  theme: Theme;
}

export interface AppContextValue {
  state: AppState;
  addCompleted: (item: CompletedItemInput) => void;
  setPhase: (phase: AppPhase) => void;
}

export const AppContext = createContext<AppContextValue>(null!);

export function useAppContext(): AppContextValue {
  const ctx = useContext(AppContext);
  if (!ctx) {
    throw new Error('useAppContext 必须在 AppContext.Provider 内使用');
  }
  return ctx;
}
