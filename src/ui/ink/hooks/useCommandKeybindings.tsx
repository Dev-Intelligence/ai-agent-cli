/**
 * useCommandKeybindings — 命令层快捷键 Hook
 *
 * 当前先接入一小部分与现有项目能力匹配的全局快捷键：
 * - Ctrl+L: 清屏（保留 banner，不清历史模型状态）
 *
 * 其余动作如 search/help/transcript 暂不强行接线，
 * 等对应 UI 能力落地后再继续扩展，避免出现“按键已占用但无效果”的假实现。
 */

import { useMemo } from 'react';
import { useInput } from '../primitives.js';
import { getDefaultBindings } from '../keybindings/defaultBindings.js';
import { matchesBinding } from '../keybindings/match.js';
import type { AppStateStore } from '../store.js';

export interface UseCommandKeybindingsOptions {
  store: AppStateStore;
  enabled?: boolean;
}

export function useCommandKeybindings({
  store,
  enabled = true,
}: UseCommandKeybindingsOptions): void {
  const bindings = useMemo(() => getDefaultBindings(), []);

  useInput(
    (input, key) => {
      if (!enabled) return;

      for (const binding of bindings) {
        if (binding.context !== 'Global') continue;
        if (!matchesBinding(input, key, binding)) continue;

        switch (binding.action) {
          case 'clear:screen': {
            store.setState((prev) => {
              const banner = prev.completedItems.find((item) => item.type === 'banner');
              return {
                ...prev,
                completedItems: banner ? [banner] : [],
                streaming: null,
                loading: null,
                activeToolUses: [],
              };
            });
            return;
          }

          default:
            // 其他快捷键先不接线，避免与输入态产生歧义行为。
            return;
        }
      }
    },
    { isActive: enabled }
  );
}
