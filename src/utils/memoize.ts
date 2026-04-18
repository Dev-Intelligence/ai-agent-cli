/**
 * 带 TTL 的记忆化（memoize with TTL）
 *
 * 两种使用场景：
 *   - memoizeWithTTL：同步函数
 *   - memoizeWithTTLAsync：异步函数（含 in-flight dedup）
 *
 * 行为（write-through cache）：
 *   - 无缓存：阻塞计算后写入
 *   - 缓存未过期：直接返回
 *   - 缓存已过期：立即返回旧值，后台异步刷新
 *
 * 标记 refreshing=true 避免并发刷新。刷新结果通过 identity-guard
 * 写回：若期间 clear() 或有新值，老结果不会覆盖新值。
 */

type CacheEntry<T> = {
  value: T;
  timestamp: number;
  refreshing: boolean;
};

const DEFAULT_TTL_MS = 5 * 60 * 1000;

/** 安全的 stringify：循环引用也不抛，用于生成 args cache key */
function stableStringify(value: unknown): string {
  const seen = new WeakSet<object>();
  return JSON.stringify(value, (_k, v) => {
    if (typeof v === 'object' && v !== null) {
      if (seen.has(v as object)) return '[Circular]';
      seen.add(v as object);
    }
    return v as unknown;
  });
}

export interface MemoizedFunction<Args extends unknown[], R> {
  (...args: Args): R;
  cache: { clear: () => void };
}

export function memoizeWithTTL<Args extends unknown[], R>(
  f: (...args: Args) => R,
  cacheLifetimeMs: number = DEFAULT_TTL_MS,
): MemoizedFunction<Args, R> {
  const cache = new Map<string, CacheEntry<R>>();

  const memoized = (...args: Args): R => {
    const key = stableStringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    // 冷启动：阻塞计算
    if (!cached) {
      const value = f(...args);
      cache.set(key, { value, timestamp: now, refreshing: false });
      return value;
    }

    // 过期 + 未在刷新：后台异步刷新，立刻返回旧值
    if (now - cached.timestamp > cacheLifetimeMs && !cached.refreshing) {
      cached.refreshing = true;
      const staleEntry = cached;

      // 使用 queueMicrotask 避免 Promise 链的额外开销
      queueMicrotask(() => {
        try {
          const newValue = f(...args);
          // identity-guard：仅当这条还是当初那条 stale entry 时才覆盖
          if (cache.get(key) === staleEntry) {
            cache.set(key, {
              value: newValue,
              timestamp: Date.now(),
              refreshing: false,
            });
          }
        } catch {
          // 刷新失败：清掉这条 stale，下次冷启动重算
          if (cache.get(key) === staleEntry) {
            cache.delete(key);
          }
        }
      });

      return cached.value;
    }

    return cache.get(key)!.value;
  };

  memoized.cache = {
    clear: () => cache.clear(),
  };

  return memoized;
}

export interface MemoizedAsyncFunction<Args extends unknown[], R> {
  (...args: Args): Promise<R>;
  cache: { clear: () => void };
}

export function memoizeWithTTLAsync<Args extends unknown[], R>(
  f: (...args: Args) => Promise<R>,
  cacheLifetimeMs: number = DEFAULT_TTL_MS,
): MemoizedAsyncFunction<Args, R> {
  const cache = new Map<string, CacheEntry<R>>();
  // 冷启动并发去重：N 个并发冷请求共享一次 f() 调用。
  // 否则比如刷新 AWS 凭据的场景会同时拉起 N 个 `aws sso login`。
  const inFlight = new Map<string, Promise<R>>();

  const memoized = async (...args: Args): Promise<R> => {
    const key = stableStringify(args);
    const cached = cache.get(key);
    const now = Date.now();

    if (!cached) {
      const pending = inFlight.get(key);
      if (pending) return pending;
      const promise = f(...args);
      inFlight.set(key, promise);
      try {
        const result = await promise;
        // identity-guard：await 期间如果 clear 了，不再写 cache
        if (inFlight.get(key) === promise) {
          cache.set(key, {
            value: result,
            timestamp: now,
            refreshing: false,
          });
        }
        return result;
      } finally {
        if (inFlight.get(key) === promise) {
          inFlight.delete(key);
        }
      }
    }

    if (now - cached.timestamp > cacheLifetimeMs && !cached.refreshing) {
      cached.refreshing = true;
      const staleEntry = cached;
      f(...args)
        .then((newValue) => {
          if (cache.get(key) === staleEntry) {
            cache.set(key, {
              value: newValue,
              timestamp: Date.now(),
              refreshing: false,
            });
          }
        })
        .catch(() => {
          if (cache.get(key) === staleEntry) {
            cache.delete(key);
          }
        });
      return cached.value;
    }

    return cache.get(key)!.value;
  };

  memoized.cache = {
    clear: () => {
      cache.clear();
      inFlight.clear();
    },
  };

  return memoized;
}
