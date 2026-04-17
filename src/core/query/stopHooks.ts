/**
 * Query 停止钩子链
 *
 * 将原本散落在 loopGenerator.ts 中的"是否应继续下一轮"的判定条件
 * 抽成一个可组合、可测试的链式钩子系统。
 *
 * 使用方式：
 *   const chain = new StopChain()
 *     .add(maxTurnsHook(20))
 *     .add(abortHook(abortController))
 *     .add(finalResponseHook());
 *   const decision = chain.evaluate(context);
 *
 * 当前阶段仅提供数据结构与标准钩子；loopGenerator.ts 仍保留
 * 内联判定，但后续 P1-3 重构时会迁移到本模块。
 */

import type { StopReason } from './transitions.js';

export interface StopContext {
  /** 已消耗轮次（从 1 起） */
  turn: number;
  /** 最大轮次限制 */
  maxTurns: number;
  /** 当前轮产生的工具调用数；0 表示本轮无工具（可终止） */
  toolCallCount: number;
  /** adapter 返回的 stopReason */
  adapterStopReason?: string;
  /** AbortSignal */
  abortSignal?: AbortSignal;
  /** 本次 query 累计 token（可选，用于预算钩子） */
  cumulativeTokens?: number;
}

export interface StopDecision {
  /** true 表示应终止循环 */
  shouldStop: boolean;
  /** 终止原因；shouldStop=false 时未定义 */
  reason?: StopReason;
  /** 给用户展示的说明（可选） */
  message?: string;
}

/** 单个停止钩子：输入上下文，输出"是否终止"的判断 */
export type StopHook = (ctx: StopContext) => StopDecision;

/** 中断信号钩子：signal.aborted 时立即终止 */
export function abortHook(): StopHook {
  return (ctx) => {
    if (ctx.abortSignal?.aborted) {
      return { shouldStop: true, reason: 'aborted', message: '[生成已中断]' };
    }
    return { shouldStop: false };
  };
}

/** 最大轮次钩子：turn >= maxTurns 时终止 */
export function maxTurnsHook(): StopHook {
  return (ctx) => {
    if (ctx.turn >= ctx.maxTurns) {
      return {
        shouldStop: true,
        reason: 'max_turns',
        message: `达到最大轮次限制 (${ctx.maxTurns})`,
      };
    }
    return { shouldStop: false };
  };
}

/** 最终响应钩子：LLM 无工具调用 → 正常收尾 */
export function finalResponseHook(): StopHook {
  return (ctx) => {
    const noTools = ctx.toolCallCount === 0;
    const stoppedNaturally =
      ctx.adapterStopReason !== 'tool_use' && ctx.adapterStopReason !== 'tool_calls';
    if (noTools || stoppedNaturally) {
      return { shouldStop: true, reason: 'final_response' };
    }
    return { shouldStop: false };
  };
}

/** 流式中断钩子：adapter 报告 interrupted */
export function streamInterruptedHook(): StopHook {
  return (ctx) => {
    if (ctx.adapterStopReason === 'interrupted') {
      return { shouldStop: true, reason: 'stream_interrupted', message: '[生成已中断]' };
    }
    return { shouldStop: false };
  };
}

/**
 * 组合式停止链。
 *
 * 按注册顺序依次评估，首个返回 shouldStop=true 的钩子即终止。
 */
export class StopChain {
  private hooks: StopHook[] = [];

  add(hook: StopHook): this {
    this.hooks.push(hook);
    return this;
  }

  evaluate(ctx: StopContext): StopDecision {
    for (const hook of this.hooks) {
      const d = hook(ctx);
      if (d.shouldStop) return d;
    }
    return { shouldStop: false };
  }

  get size(): number {
    return this.hooks.length;
  }
}

/** 快速工厂：注册常用默认链（abort → maxTurns → streamInterrupted → finalResponse） */
export function createDefaultStopChain(): StopChain {
  return new StopChain()
    .add(abortHook())
    .add(streamInterruptedHook())
    .add(maxTurnsHook())
    .add(finalResponseHook());
}
