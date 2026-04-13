/**
 * App — Provider 层 + REPL 屏幕
 *
 * Provider 层负责包裹上下文，REPL 负责具体编排。
 */

import type { AppStateStore } from './store.js';
import { REPL } from './screens/REPL.js';
import type { TokenStatsSnapshot } from './components/EnhancedSpinner.js';
import type { SlashCommandItem } from './completion/types.js';
import { NotificationsProvider } from './context/notifications.js';
import { OverlayProvider } from './context/overlayContext.js';
import { ThemeProvider } from './components/design-system/ThemeProvider.js';
import { StatsProvider } from './context/stats.js';
import { FpsMetricsProvider } from './context/fpsMetrics.js';

export interface AppProps {
  store: AppStateStore;
  onInput: (text: string) => void;
  onExit: () => void;
  onInterrupt: () => void;
  slashCommands: SlashCommandItem[];
  getTokenStats?: () => TokenStatsSnapshot;
  modelName?: string;
  provider?: string;
  /**
   * FPS 指标获取函数。
   * 当前可选，未提供时返回 undefined。
   */
  getFpsMetrics?: () => { fps?: number; droppedFrames?: number; averageFrameTimeMs?: number } | undefined;
}

export function App(props: AppProps) {
  // 这里按 Phase 0 先补齐基础 Provider 层：
  // Notifications / Overlay / Theme / Stats / FPS。
  // 后续如果继续对齐，可在这里继续挂载更多上下文。
  return (
    <FpsMetricsProvider getFpsMetrics={props.getFpsMetrics ?? (() => undefined)}>
      <StatsProvider>
        <ThemeProvider>
          <OverlayProvider>
            <NotificationsProvider>
              <REPL {...props} />
            </NotificationsProvider>
          </OverlayProvider>
        </ThemeProvider>
      </StatsProvider>
    </FpsMetricsProvider>
  );
}
