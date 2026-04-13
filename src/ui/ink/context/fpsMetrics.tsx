/**
 * fpsMetrics — FPS 指标上下文
 *
 * 当前作为兼容层提供：
 * - Provider 注入获取函数
 * - 子组件按需读取 FPS 数据
 *
 * 这样后续即使没有完整的 fpsTracker，也不会阻塞 Provider 层接入。
 */

import React, { createContext, useContext } from 'react';

/**
 * FPS 指标的最小结构。
 * 如果未来接入完整渲染性能统计，可在这里继续扩展字段。
 */
export interface FpsMetrics {
  fps?: number;
  droppedFrames?: number;
  averageFrameTimeMs?: number;
}

export type FpsMetricsGetter = () => FpsMetrics | undefined;

const FpsMetricsContext = createContext<FpsMetricsGetter | undefined>(undefined);

export function FpsMetricsProvider({
  getFpsMetrics,
  children,
}: {
  getFpsMetrics: FpsMetricsGetter;
  children: React.ReactNode;
}): React.ReactNode {
  return (
    <FpsMetricsContext.Provider value={getFpsMetrics}>
      {children}
    </FpsMetricsContext.Provider>
  );
}

export function useFpsMetrics(): FpsMetricsGetter | undefined {
  return useContext(FpsMetricsContext);
}
