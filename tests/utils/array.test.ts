import { describe, it, expect } from 'vitest';
import { intersperse, count, uniq } from '../../src/utils/array.js';

describe('intersperse', () => {
  it('空数组 → 空数组', () => {
    expect(intersperse([], () => 'x')).toEqual([]);
  });
  it('单元素不插分隔', () => {
    expect(intersperse(['a'], () => '-')).toEqual(['a']);
  });
  it('每两个元素之间插入分隔（索引感知）', () => {
    expect(intersperse(['a', 'b', 'c'], (i) => `#${i}`)).toEqual([
      'a',
      '#1',
      'b',
      '#2',
      'c',
    ]);
  });
});

describe('count', () => {
  it('统计满足条件的数量', () => {
    expect(count([1, 2, 3, 4], (x) => x % 2 === 0)).toBe(2);
  });
  it('空数组 → 0', () => {
    expect(count([], () => true)).toBe(0);
  });
  it('谓词返回 falsy 不计数', () => {
    expect(count([0, '', null, undefined, NaN, 1], (x) => x)).toBe(1);
  });
});

describe('uniq', () => {
  it('原生 Set 去重并保留首次出现顺序', () => {
    expect(uniq([3, 1, 2, 1, 3])).toEqual([3, 1, 2]);
  });
  it('接受 Iterable', () => {
    function* gen() {
      yield 'a';
      yield 'b';
      yield 'a';
    }
    expect(uniq(gen())).toEqual(['a', 'b']);
  });
});
