/**
 * useExitOnCtrlCD — Ctrl+C / Ctrl+D 全局退出 Hook
 *
 * 用于在 REPL 空闲、且没有对话框抢占焦点时处理“退出应用”动作。
 * 这里故意保持保守：
 * - 若当前存在 focus/dialog，则不接管
 * - 若正在加载，则 Ctrl+C 仍交给 useCancelRequest 处理“中断请求”
 * - Ctrl+D 仅在空闲状态下触发退出
 */

import { useInput } from '../primitives.js';
import type { FocusTarget } from '../types.js';

export interface UseExitOnCtrlCDOptions {
  focus: FocusTarget;
  isLoading: boolean;
  onExit: () => void;
}

export function useExitOnCtrlCD({
  focus,
  isLoading,
  onExit,
}: UseExitOnCtrlCDOptions): void {
  useInput(
    (input, key) => {
      // 有焦点弹层时，不抢占退出键。
      if (focus) return;

      // 加载中时 Ctrl+C 应交给中断逻辑；这里不重复处理。
      if (isLoading) return;

      if (key.ctrl && input === 'c') {
        onExit();
        return;
      }

      if (key.ctrl && input === 'd') {
        onExit();
      }
    },
    { isActive: true }
  );
}
