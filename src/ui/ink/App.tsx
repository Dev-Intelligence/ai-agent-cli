/**
 * Ink 根组件
 *
 * 使用 useAppStore 精确订阅外部 Store，
 * Static 将已完成内容固定，只有 ActiveArea 动态更新。
 */

import { Static, Box } from 'ink';
import type { AppStore } from './store.js';
import { useAppStore } from './hooks.js';
import { CompletedItemView } from './components/CompletedItemView.js';
import { ActiveArea } from './components/ActiveArea.js';
import type { KeybindingRegistry } from '../keybindings.js';

export interface AppProps {
  store: AppStore;
  onInput: (text: string) => void;
  onExit: () => void;
  commandNames: string[];
  keybindingRegistry?: KeybindingRegistry;
}

export function App({ store, onInput, onExit, commandNames, keybindingRegistry }: AppProps) {
  // 精确订阅：只在对应 slice 变化时重渲染
  const phase = useAppStore(store, (s) => s.phase);
  const completedItems = useAppStore(store, (s) => s.completedItems);

  return (
    <Box flexDirection="column">
      <Static items={completedItems}>
        {(item) => <CompletedItemView key={item.id} item={item} />}
      </Static>
      <ActiveArea
        phase={phase}
        onInput={onInput}
        onExit={onExit}
        commandNames={commandNames}
        keybindingRegistry={keybindingRegistry}
      />
    </Box>
  );
}
