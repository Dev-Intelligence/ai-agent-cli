/**
 * Query 级 Token 预算跟踪
 *
 * 从 claude-code-sourcemap/src/query/tokenBudget.ts 移植并简化。
 * 用法场景：当用户输入中声明了 "+500k" / "use 2M tokens" 等预算时，
 * 每轮结束后调用 checkTokenBudget 判断是继续下一轮还是优雅收尾。
 *
 * 行为要点：
 * - 未设置预算（null / 0）或作为子代理调用（agentId 存在）时，直接返回 stop。
 * - 未达 90% 预算且未连续 3 轮收益递减 → 产出 continue（并附带一段
 *   "请继续工作，不要总结"的 nudge 消息，可作为 user message 再注入。
 * - 达到 90% 预算或收益递减 → 返回 stop + completionEvent，供上层记日志。
 */

import { getBudgetContinuationMessage } from '../../utils/tokenBudget.js';

const COMPLETION_THRESHOLD = 0.9;
const DIMINISHING_THRESHOLD = 500;

export interface BudgetTracker {
  continuationCount: number;
  lastDeltaTokens: number;
  lastGlobalTurnTokens: number;
  startedAt: number;
}

export function createBudgetTracker(): BudgetTracker {
  return {
    continuationCount: 0,
    lastDeltaTokens: 0,
    lastGlobalTurnTokens: 0,
    startedAt: Date.now(),
  };
}

export interface ContinueDecision {
  action: 'continue';
  nudgeMessage: string;
  continuationCount: number;
  pct: number;
  turnTokens: number;
  budget: number;
}

export interface StopBudgetDecision {
  action: 'stop';
  completionEvent: {
    continuationCount: number;
    pct: number;
    turnTokens: number;
    budget: number;
    diminishingReturns: boolean;
    durationMs: number;
  } | null;
}

export type TokenBudgetDecision = ContinueDecision | StopBudgetDecision;

/**
 * 判定当前预算状态。
 *
 * @param tracker        预算追踪状态（会被就地更新）
 * @param agentId        若处于子代理环境则传入；子代理不执行预算续航
 * @param budget         用户声明的预算（token 数），null/<=0 表示未设置
 * @param globalTurnTokens 本次 query 累计 token 数
 */
export function checkTokenBudget(
  tracker: BudgetTracker,
  agentId: string | undefined,
  budget: number | null,
  globalTurnTokens: number,
): TokenBudgetDecision {
  if (agentId || budget === null || budget <= 0) {
    return { action: 'stop', completionEvent: null };
  }

  const turnTokens = globalTurnTokens;
  const pct = Math.round((turnTokens / budget) * 100);
  const deltaSinceLastCheck = globalTurnTokens - tracker.lastGlobalTurnTokens;

  const isDiminishing =
    tracker.continuationCount >= 3 &&
    deltaSinceLastCheck < DIMINISHING_THRESHOLD &&
    tracker.lastDeltaTokens < DIMINISHING_THRESHOLD;

  if (!isDiminishing && turnTokens < budget * COMPLETION_THRESHOLD) {
    tracker.continuationCount++;
    tracker.lastDeltaTokens = deltaSinceLastCheck;
    tracker.lastGlobalTurnTokens = globalTurnTokens;
    return {
      action: 'continue',
      nudgeMessage: getBudgetContinuationMessage(pct, turnTokens, budget),
      continuationCount: tracker.continuationCount,
      pct,
      turnTokens,
      budget,
    };
  }

  if (isDiminishing || tracker.continuationCount > 0) {
    return {
      action: 'stop',
      completionEvent: {
        continuationCount: tracker.continuationCount,
        pct,
        turnTokens,
        budget,
        diminishingReturns: isDiminishing,
        durationMs: Date.now() - tracker.startedAt,
      },
    };
  }

  return { action: 'stop', completionEvent: null };
}
