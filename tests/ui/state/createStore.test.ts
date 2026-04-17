import { describe, it, expect, vi } from 'vitest';
import { createStore, shallowEqual } from '../../../src/ui/state/createStore.js';

describe('createStore 基础行为', () => {
  it('get 初始值', () => {
    const s = createStore({ count: 0 });
    expect(s.get()).toEqual({ count: 0 });
  });

  it('set 整值替换', () => {
    const s = createStore({ count: 0 });
    s.set({ count: 5 });
    expect(s.get().count).toBe(5);
  });

  it('set 函数更新器', () => {
    const s = createStore({ count: 1 });
    s.set((prev) => ({ count: prev.count + 10 }));
    expect(s.get().count).toBe(11);
  });

  it('相等值（Object.is）不通知', () => {
    const fixed = { a: 1 };
    const s = createStore(fixed);
    const fn = vi.fn();
    s.subscribe(fn);
    s.set(fixed);
    expect(fn).not.toHaveBeenCalled();
  });

  it('subscribe 取消订阅', () => {
    const s = createStore(0);
    const fn = vi.fn();
    const unsub = s.subscribe(fn);
    s.set(1);
    unsub();
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('subscribe listener 收到 (next, prev)', () => {
    const s = createStore(0);
    let seen: [number, number] | null = null;
    s.subscribe((next, prev) => {
      seen = [next, prev];
    });
    s.set(10);
    expect(seen).toEqual([10, 0]);
  });
});

describe('subscribeSelector', () => {
  it('仅派生值变化时触发', () => {
    const s = createStore({ a: 1, b: 100 });
    const fn = vi.fn();
    s.subscribeSelector((v) => v.a, fn);
    s.set({ a: 1, b: 200 }); // a 未变
    expect(fn).not.toHaveBeenCalled();
    s.set({ a: 2, b: 200 });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('自定义 equals 控制触发粒度', () => {
    const s = createStore({ list: [1, 2, 3] });
    const fn = vi.fn();
    s.subscribeSelector((v) => v.list, fn, shallowEqual);
    s.set({ list: [1, 2, 3] }); // 新数组但值相同
    expect(fn).not.toHaveBeenCalled();
    s.set({ list: [1, 2, 4] });
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('selector 取消订阅', () => {
    const s = createStore(0);
    const fn = vi.fn();
    const unsub = s.subscribeSelector((v) => v, fn);
    s.set(1);
    unsub();
    s.set(2);
    expect(fn).toHaveBeenCalledTimes(1);
  });
});

describe('shallowEqual', () => {
  it('原始类型相等', () => {
    expect(shallowEqual(1, 1)).toBe(true);
    expect(shallowEqual('a', 'a')).toBe(true);
    expect(shallowEqual(NaN, NaN)).toBe(true); // Object.is 语义
  });
  it('对象浅等', () => {
    expect(shallowEqual({ a: 1 }, { a: 1 })).toBe(true);
    expect(shallowEqual({ a: 1 }, { a: 2 })).toBe(false);
  });
  it('数组浅等', () => {
    expect(shallowEqual([1, 2], [1, 2])).toBe(true);
    expect(shallowEqual([1, 2], [1, 3])).toBe(false);
    expect(shallowEqual([1, 2], [1, 2, 3])).toBe(false);
  });
  it('嵌套对象按引用比较（浅）', () => {
    const inner = { x: 1 };
    expect(shallowEqual({ a: inner }, { a: inner })).toBe(true);
    expect(shallowEqual({ a: { x: 1 } }, { a: { x: 1 } })).toBe(false);
  });
  it('键数不同 → false', () => {
    expect(shallowEqual({ a: 1 }, { a: 1, b: 2 })).toBe(false);
  });
  it('null / undefined 安全', () => {
    expect(shallowEqual(null, null)).toBe(true);
    expect(shallowEqual(null, {})).toBe(false);
    expect(shallowEqual(undefined, undefined)).toBe(true);
  });
});
