import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  memoizeWithTTL,
  memoizeWithTTLAsync,
} from '../../src/utils/memoize.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('memoizeWithTTL', () => {
  it('同 args 只算一次', () => {
    const fn = vi.fn((n: number) => n * 2);
    const m = memoizeWithTTL(fn);
    expect(m(3)).toBe(6);
    expect(m(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('不同 args 各算一次', () => {
    const fn = vi.fn((n: number) => n + 1);
    const m = memoizeWithTTL(fn);
    m(1);
    m(2);
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('过期后返回旧值并后台刷新', async () => {
    let counter = 0;
    const m = memoizeWithTTL(() => ++counter, 10);
    expect(m()).toBe(1);
    await new Promise((r) => setTimeout(r, 20));
    // 过期：返回旧值 1，同时后台刷新
    expect(m()).toBe(1);
    // 让微任务跑完
    await new Promise((r) => setTimeout(r, 0));
    // 再调：看到刷新后的新值
    expect(m()).toBe(2);
  });

  it('cache.clear 后重算', () => {
    const fn = vi.fn(() => 'x');
    const m = memoizeWithTTL(fn);
    m();
    m.cache.clear();
    m();
    expect(fn).toHaveBeenCalledTimes(2);
  });
});

describe('memoizeWithTTLAsync', () => {
  it('并发冷启动共享一次 f() 调用', async () => {
    const fn = vi.fn(async () => {
      await new Promise((r) => setTimeout(r, 10));
      return 'v';
    });
    const m = memoizeWithTTLAsync(fn);
    const [a, b, c] = await Promise.all([m(), m(), m()]);
    expect(a).toBe('v');
    expect(b).toBe('v');
    expect(c).toBe('v');
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('同 args 多次命中缓存', async () => {
    const fn = vi.fn(async (n: number) => n * 2);
    const m = memoizeWithTTLAsync(fn);
    expect(await m(3)).toBe(6);
    expect(await m(3)).toBe(6);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('失败不落 cache', async () => {
    let times = 0;
    const fn = vi.fn(async () => {
      times++;
      if (times === 1) throw new Error('boom');
      return 'ok';
    });
    const m = memoizeWithTTLAsync(fn);
    await expect(m()).rejects.toThrow('boom');
    // 第一次失败后没写 cache，第二次会重新走 f
    expect(await m()).toBe('ok');
    expect(fn).toHaveBeenCalledTimes(2);
  });

  it('cache.clear 时取消 inFlight 记录', async () => {
    const fn = vi.fn(async () => 'v');
    const m = memoizeWithTTLAsync(fn);
    const p1 = m();
    m.cache.clear();
    // 第二次调用不应复用老 inFlight（因为 clear 把它清了）
    const p2 = m();
    await Promise.all([p1, p2]);
    expect(fn).toHaveBeenCalledTimes(2);
  });
});
