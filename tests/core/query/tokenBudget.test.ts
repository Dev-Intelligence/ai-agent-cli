import { describe, it, expect } from 'vitest';
import {
  createBudgetTracker,
  checkTokenBudget,
} from '../../../src/core/query/tokenBudget.js';

describe('checkTokenBudget', () => {
  it('未设预算 → stop(null)', () => {
    const t = createBudgetTracker();
    const d = checkTokenBudget(t, undefined, null, 123);
    expect(d.action).toBe('stop');
    if (d.action === 'stop') expect(d.completionEvent).toBeNull();
  });

  it('子代理 (agentId 存在) → stop', () => {
    const t = createBudgetTracker();
    const d = checkTokenBudget(t, 'agent-1', 1_000_000, 500);
    expect(d.action).toBe('stop');
  });

  it('budget<=0 → stop', () => {
    const t = createBudgetTracker();
    expect(checkTokenBudget(t, undefined, 0, 100).action).toBe('stop');
    expect(checkTokenBudget(t, undefined, -5, 100).action).toBe('stop');
  });

  it('预算未达 90% → continue + nudge', () => {
    const t = createBudgetTracker();
    const d = checkTokenBudget(t, undefined, 1_000_000, 100_000);
    expect(d.action).toBe('continue');
    if (d.action === 'continue') {
      expect(d.pct).toBe(10);
      expect(d.nudgeMessage).toContain('10%');
      expect(d.continuationCount).toBe(1);
    }
  });

  it('达到 >=90% 预算且无既往 continue → stop(null)', () => {
    const t = createBudgetTracker();
    const d = checkTokenBudget(t, undefined, 1_000_000, 950_000);
    expect(d.action).toBe('stop');
    if (d.action === 'stop') expect(d.completionEvent).toBeNull();
  });

  it('多轮续航后达到预算 → stop + completionEvent', () => {
    const t = createBudgetTracker();
    checkTokenBudget(t, undefined, 1_000_000, 100_000); // continue #1
    const d = checkTokenBudget(t, undefined, 1_000_000, 950_000); // 达标
    expect(d.action).toBe('stop');
    if (d.action === 'stop') {
      expect(d.completionEvent).not.toBeNull();
      expect(d.completionEvent!.continuationCount).toBe(1);
      expect(d.completionEvent!.pct).toBe(95);
      expect(d.completionEvent!.diminishingReturns).toBe(false);
    }
  });

  it('收益递减：连续 3 次 continue 且 delta<500 → stop(diminishingReturns=true)', () => {
    const t = createBudgetTracker();
    // 3 次 continue（每次推进很小）
    checkTokenBudget(t, undefined, 1_000_000, 100);
    checkTokenBudget(t, undefined, 1_000_000, 200);
    checkTokenBudget(t, undefined, 1_000_000, 300);
    // 第 4 次检查：仍小 delta → 应判递减
    const d = checkTokenBudget(t, undefined, 1_000_000, 400);
    expect(d.action).toBe('stop');
    if (d.action === 'stop') {
      expect(d.completionEvent).not.toBeNull();
      expect(d.completionEvent!.diminishingReturns).toBe(true);
    }
  });

  it('tracker 在每次 continue 后被就地更新', () => {
    const t = createBudgetTracker();
    checkTokenBudget(t, undefined, 1_000_000, 100_000);
    expect(t.continuationCount).toBe(1);
    expect(t.lastGlobalTurnTokens).toBe(100_000);
    checkTokenBudget(t, undefined, 1_000_000, 200_000);
    expect(t.continuationCount).toBe(2);
    expect(t.lastGlobalTurnTokens).toBe(200_000);
  });
});
