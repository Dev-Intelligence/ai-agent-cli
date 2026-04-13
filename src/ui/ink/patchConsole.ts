/**
 * patchConsole — 拦截 console.log/warn/error 到 TUI
 *
 * 在 Ink 渲染期间，任何 console 输出会破坏 TUI 布局。
 * 此模块将 console 方法重定向到 AppStateStore，
 * 以 system 类型的 CompletedItem 呈现在 UI 中。
 */

import type { AppStateStore } from './store.js';
import { addCompleted } from './store.js';

/**
 * 拦截 console 方法，返回恢复函数
 */
export function patchConsole(store: AppStateStore): () => void {
  const originalLog = console.log;
  const originalWarn = console.warn;
  const originalError = console.error;

  console.log = (...args: unknown[]) => {
    addCompleted(store, {
      type: 'system',
      level: 'info',
      text: args.map(String).join(' '),
    });
  };

  console.warn = (...args: unknown[]) => {
    addCompleted(store, {
      type: 'system',
      level: 'warning',
      text: args.map(String).join(' '),
    });
  };

  console.error = (...args: unknown[]) => {
    addCompleted(store, {
      type: 'system',
      level: 'error',
      text: args.map(String).join(' '),
    });
  };

  return () => {
    console.log = originalLog;
    console.warn = originalWarn;
    console.error = originalError;
  };
}
