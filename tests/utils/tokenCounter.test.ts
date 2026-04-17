import { describe, it, expect } from 'vitest';
import {
  estimateTokens,
  formatTokenCount,
  getTokenPercentage,
  isTokenWarning,
  isTokenDanger,
  formatTokenUsage,
} from '../../src/utils/tokenCounter.js';

describe('estimateTokens', () => {
  it('英文按 ~4 字符/token', () => {
    expect(estimateTokens('abcd')).toBe(1);
    expect(estimateTokens('abcdefgh')).toBe(2);
  });

  it('中文按 ~2 字符/token', () => {
    expect(estimateTokens('你好')).toBe(1);
    expect(estimateTokens('你好世界')).toBe(2);
  });

  it('中英混合累加', () => {
    expect(estimateTokens('你好abcd')).toBe(2);
  });
});

describe('formatTokenCount', () => {
  it('<1000 原样输出', () => {
    expect(formatTokenCount(0)).toBe('0');
    expect(formatTokenCount(999)).toBe('999');
  });

  it('1000-9999 保留 1 位小数并加 k', () => {
    expect(formatTokenCount(1500)).toBe('1.5k');
    expect(formatTokenCount(9999)).toBe('10.0k');
  });

  it('>=10000 取整 k', () => {
    expect(formatTokenCount(12_345)).toBe('12k');
    expect(formatTokenCount(200_000)).toBe('200k');
  });
});

describe('getTokenPercentage', () => {
  it('max=0 返回 0', () => {
    expect(getTokenPercentage(100, 0)).toBe(0);
  });

  it('按比例四舍五入', () => {
    expect(getTokenPercentage(50, 100)).toBe(50);
    expect(getTokenPercentage(255, 1000)).toBe(26);
  });
});

describe('isTokenWarning / isTokenDanger', () => {
  it('警告阈值 80%', () => {
    expect(isTokenWarning(79, 100)).toBe(false);
    expect(isTokenWarning(80, 100)).toBe(true);
  });

  it('危险阈值 95%', () => {
    expect(isTokenDanger(94, 100)).toBe(false);
    expect(isTokenDanger(95, 100)).toBe(true);
  });
});

describe('formatTokenUsage', () => {
  it('格式 current/max (pct%)', () => {
    expect(formatTokenUsage(12_500, 200_000)).toBe('13k/200k (6%)');
  });
});
