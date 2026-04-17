import { describe, it, expect } from 'vitest';
import { CircularBuffer } from '../../src/utils/circularBuffer.js';

describe('CircularBuffer', () => {
  it('未满时 toArray 返回插入顺序', () => {
    const b = new CircularBuffer<number>(5);
    b.add(1);
    b.add(2);
    b.add(3);
    expect(b.toArray()).toEqual([1, 2, 3]);
    expect(b.length()).toBe(3);
  });

  it('满后继续添加会覆盖最旧元素', () => {
    const b = new CircularBuffer<number>(3);
    b.addAll([1, 2, 3, 4, 5]);
    expect(b.toArray()).toEqual([3, 4, 5]);
    expect(b.length()).toBe(3);
  });

  it('getRecent 返回最近 N 个，顺序从旧到新', () => {
    const b = new CircularBuffer<number>(5);
    b.addAll([1, 2, 3, 4, 5, 6]);
    expect(b.getRecent(3)).toEqual([4, 5, 6]);
    expect(b.getRecent(100)).toEqual([2, 3, 4, 5, 6]);
  });

  it('clear 后回到初始状态', () => {
    const b = new CircularBuffer<string>(2);
    b.add('a');
    b.clear();
    expect(b.length()).toBe(0);
    expect(b.toArray()).toEqual([]);
  });

  it('空缓冲区 toArray/getRecent 返回 []', () => {
    const b = new CircularBuffer<number>(3);
    expect(b.toArray()).toEqual([]);
    expect(b.getRecent(10)).toEqual([]);
  });
});
