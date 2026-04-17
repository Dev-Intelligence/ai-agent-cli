import { describe, it, expect } from 'vitest';
import {
  QueryState,
  canTransition,
  transition,
  isTerminal,
  isActive,
} from '../../../src/core/query/transitions.js';

describe('canTransition', () => {
  it('IDLE → THINKING 合法', () => {
    expect(canTransition(QueryState.IDLE, QueryState.THINKING)).toBe(true);
  });

  it('THINKING → STREAMING 合法', () => {
    expect(canTransition(QueryState.THINKING, QueryState.STREAMING)).toBe(true);
  });

  it('STREAMING → TOOL_QUEUED 合法', () => {
    expect(canTransition(QueryState.STREAMING, QueryState.TOOL_QUEUED)).toBe(true);
  });

  it('TOOL_QUEUED → AWAITING_PERMISSION / TOOL_EXECUTING 均合法', () => {
    expect(canTransition(QueryState.TOOL_QUEUED, QueryState.AWAITING_PERMISSION)).toBe(true);
    expect(canTransition(QueryState.TOOL_QUEUED, QueryState.TOOL_EXECUTING)).toBe(true);
  });

  it('TOOL_RESULTS_READY → THINKING 合法（下一轮）', () => {
    expect(canTransition(QueryState.TOOL_RESULTS_READY, QueryState.THINKING)).toBe(true);
  });

  it('任一状态 → STOPPED 合法（除 STOPPED 自身）', () => {
    const all = [
      QueryState.IDLE,
      QueryState.THINKING,
      QueryState.STREAMING,
      QueryState.TOOL_QUEUED,
      QueryState.AWAITING_PERMISSION,
      QueryState.TOOL_EXECUTING,
      QueryState.TOOL_RESULTS_READY,
    ];
    for (const s of all) {
      expect(canTransition(s, QueryState.STOPPED)).toBe(true);
    }
  });

  it('STOPPED → 任何状态 都不合法', () => {
    expect(canTransition(QueryState.STOPPED, QueryState.IDLE)).toBe(false);
    expect(canTransition(QueryState.STOPPED, QueryState.THINKING)).toBe(false);
    expect(canTransition(QueryState.STOPPED, QueryState.STOPPED)).toBe(false);
  });

  it('跨阶段非法：IDLE → TOOL_EXECUTING', () => {
    expect(canTransition(QueryState.IDLE, QueryState.TOOL_EXECUTING)).toBe(false);
  });

  it('THINKING → TOOL_QUEUED 非法（必须经 STREAMING）', () => {
    expect(canTransition(QueryState.THINKING, QueryState.TOOL_QUEUED)).toBe(false);
  });

  it('TOOL_EXECUTING → THINKING 非法（必须经 TOOL_RESULTS_READY）', () => {
    expect(canTransition(QueryState.TOOL_EXECUTING, QueryState.THINKING)).toBe(false);
  });
});

describe('transition（断言式）', () => {
  it('合法时返回目标状态', () => {
    expect(transition(QueryState.IDLE, QueryState.THINKING)).toBe(QueryState.THINKING);
  });

  it('非法时抛错，信息含 from → to', () => {
    expect(() => transition(QueryState.IDLE, QueryState.TOOL_EXECUTING)).toThrowError(
      /idle.*tool_executing/i
    );
  });
});

describe('isTerminal / isActive', () => {
  it('只有 STOPPED 是终态', () => {
    expect(isTerminal(QueryState.STOPPED)).toBe(true);
    expect(isTerminal(QueryState.IDLE)).toBe(false);
    expect(isTerminal(QueryState.THINKING)).toBe(false);
  });

  it('IDLE 和 STOPPED 非 active，其他均 active', () => {
    expect(isActive(QueryState.IDLE)).toBe(false);
    expect(isActive(QueryState.STOPPED)).toBe(false);
    expect(isActive(QueryState.THINKING)).toBe(true);
    expect(isActive(QueryState.STREAMING)).toBe(true);
    expect(isActive(QueryState.TOOL_EXECUTING)).toBe(true);
  });
});
