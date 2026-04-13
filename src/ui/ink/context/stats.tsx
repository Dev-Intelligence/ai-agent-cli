/**
 * stats — 轻量统计上下文
 *
 * - 计数器（increment）
 * - 仪表盘数值（set）
 * - 时序观察值（observe）
 * - 去重集合（add）
 *
 * 当前不持久化到配置文件，先满足 UI 展示和运行期统计需求。
 */

import React, { createContext, useContext, useMemo } from 'react';

export type StatsStore = {
  increment(name: string, value?: number): void;
  set(name: string, value: number): void;
  observe(name: string, value: number): void;
  add(name: string, value: string): void;
  getAll(): Record<string, number>;
};

function percentile(sorted: number[], p: number): number {
  const index = (p / 100) * (sorted.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  if (lower === upper) {
    return sorted[lower]!;
  }
  return sorted[lower]! + (sorted[upper]! - sorted[lower]!) * (index - lower);
}

const RESERVOIR_SIZE = 1024;

type Histogram = {
  reservoir: number[];
  count: number;
  sum: number;
  min: number;
  max: number;
};

export function createStatsStore(): StatsStore {
  const metrics = new Map<string, number>();
  const histograms = new Map<string, Histogram>();
  const sets = new Map<string, Set<string>>();

  return {
    increment(name: string, value = 1) {
      metrics.set(name, (metrics.get(name) ?? 0) + value);
    },
    set(name: string, value: number) {
      metrics.set(name, value);
    },
    observe(name: string, value: number) {
      let histogram = histograms.get(name);
      if (!histogram) {
        histogram = {
          reservoir: [],
          count: 0,
          sum: 0,
          min: value,
          max: value,
        };
        histograms.set(name, histogram);
      }

      histogram.count++;
      histogram.sum += value;
      histogram.min = Math.min(histogram.min, value);
      histogram.max = Math.max(histogram.max, value);

      // 水库采样：避免长时间运行后样本无限增长。
      if (histogram.reservoir.length < RESERVOIR_SIZE) {
        histogram.reservoir.push(value);
      } else {
        const index = Math.floor(Math.random() * histogram.count);
        if (index < RESERVOIR_SIZE) {
          histogram.reservoir[index] = value;
        }
      }
    },
    add(name: string, value: string) {
      let bucket = sets.get(name);
      if (!bucket) {
        bucket = new Set();
        sets.set(name, bucket);
      }
      bucket.add(value);
    },
    getAll() {
      const result: Record<string, number> = Object.fromEntries(metrics);

      for (const [name, histogram] of histograms) {
        if (histogram.count === 0) continue;
        result[`${name}_count`] = histogram.count;
        result[`${name}_min`] = histogram.min;
        result[`${name}_max`] = histogram.max;
        result[`${name}_avg`] = histogram.sum / histogram.count;

        const sorted = [...histogram.reservoir].sort((a, b) => a - b);
        result[`${name}_p50`] = percentile(sorted, 50);
        result[`${name}_p95`] = percentile(sorted, 95);
        result[`${name}_p99`] = percentile(sorted, 99);
      }

      for (const [name, set] of sets) {
        result[name] = set.size;
      }

      return result;
    },
  };
}

export const StatsContext = createContext<StatsStore | null>(null);

export function StatsProvider({
  store,
  children,
}: {
  store?: StatsStore;
  children: React.ReactNode;
}): React.ReactNode {
  const internalStore = useMemo(() => createStatsStore(), []);
  return (
    <StatsContext.Provider value={store ?? internalStore}>
      {children}
    </StatsContext.Provider>
  );
}

export function useStats(): StatsStore {
  const store = useContext(StatsContext);
  if (!store) {
    throw new Error('useStats 必须在 StatsProvider 内使用');
  }
  return store;
}

export function useCounter(name: string): (value?: number) => void {
  const store = useStats();
  return (value?: number) => store.increment(name, value);
}

export function useGauge(name: string): (value: number) => void {
  const store = useStats();
  return (value: number) => store.set(name, value);
}

export function useTimer(name: string): (value: number) => void {
  const store = useStats();
  return (value: number) => store.observe(name, value);
}

export function useSet(name: string): (value: string) => void {
  const store = useStats();
  return (value: string) => store.add(name, value);
}
