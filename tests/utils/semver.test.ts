import { describe, it, expect } from 'vitest';
import { gt, gte, lt, lte, satisfies, order } from '../../src/utils/semver.js';

describe('semver 比较', () => {
  it('gt / gte / lt / lte 基本语义', async () => {
    expect(await gt('2.0.0', '1.0.0')).toBe(true);
    expect(await gt('1.0.0', '1.0.0')).toBe(false);
    expect(await gte('1.0.0', '1.0.0')).toBe(true);
    expect(await lt('1.0.0', '2.0.0')).toBe(true);
    expect(await lte('1.0.0', '1.0.0')).toBe(true);
  });

  it('接受 v 前缀（loose）', async () => {
    // loose 模式允许 "v1.2.3" 这种前缀写法
    expect(await gt('v1.3.0', 'v1.2.0')).toBe(true);
  });

  it('satisfies 支持 range', async () => {
    expect(await satisfies('1.2.3', '^1.0.0')).toBe(true);
    expect(await satisfies('2.0.0', '^1.0.0')).toBe(false);
    expect(await satisfies('1.5.0', '>=1.2 <2.0')).toBe(true);
  });

  it('order 返回 -1 / 0 / 1', async () => {
    expect(await order('1.0.0', '2.0.0')).toBe(-1);
    expect(await order('1.0.0', '1.0.0')).toBe(0);
    expect(await order('2.0.0', '1.0.0')).toBe(1);
  });
});
