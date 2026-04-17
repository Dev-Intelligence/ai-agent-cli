import { describe, it, expect } from 'vitest';
import {
  parseTokenBudget,
  getBudgetContinuationMessage,
} from '../../src/utils/tokenBudget.js';

describe('parseTokenBudget', () => {
  it('行首 +500k', () => {
    expect(parseTokenBudget('+500k')).toBe(500_000);
  });

  it('行首 +1.5m', () => {
    expect(parseTokenBudget('+1.5m')).toBe(1_500_000);
  });

  it('行首 +2B', () => {
    expect(parseTokenBudget('+2B')).toBe(2_000_000_000);
  });

  it('行尾 +500k.', () => {
    expect(parseTokenBudget('go for it +500k.')).toBe(500_000);
  });

  it('详细格式 use 2M tokens', () => {
    expect(parseTokenBudget('please use 2M tokens now')).toBe(2_000_000);
  });

  // 注：源码 VERBOSE_RE 虽列了中文"用"，但因 \b 在中文字符上失效，实际无法匹配。
  // 此处锁住当前行为，待 P1 修复后再更新预期。
  it('中文 "用" 因 \\b 边界失效目前匹配不到（锁定现状）', () => {
    expect(parseTokenBudget('用 300k tokens 处理')).toBeNull();
  });

  it('无匹配返回 null', () => {
    expect(parseTokenBudget('hello world')).toBeNull();
  });

  it('随机数字不误匹配', () => {
    expect(parseTokenBudget('see 500 abc')).toBeNull();
  });
});

describe('getBudgetContinuationMessage', () => {
  it('包含百分比和千分位数字', () => {
    const msg = getBudgetContinuationMessage(25, 125_000, 500_000);
    expect(msg).toContain('25%');
    expect(msg).toContain('125,000');
    expect(msg).toContain('500,000');
    expect(msg).toContain('不要总结');
  });
});
