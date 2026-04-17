/**
 * Query 状态机定义
 *
 * 明确列出代理查询循环的各个状态以及合法的状态转换。
 * 当前阶段仅提供纯数据与断言函数，尚未驱动 loopGenerator；
 * 作为后续逐步重构的参考骨架，也用于文档化现有隐式状态。
 *
 * 对照源：claude-code-sourcemap/src/query/transitions.ts（仅存 stub，源码未暴露）
 */

/** 查询状态 */
export enum QueryState {
  /** 初始状态：未开始任何一轮 */
  IDLE = 'idle',
  /** 已发送请求、等待首个流式 token */
  THINKING = 'thinking',
  /** 正在接收流式文本 */
  STREAMING = 'streaming',
  /** LLM 产出工具调用，入队等待执行 */
  TOOL_QUEUED = 'tool_queued',
  /** 有至少一个工具需用户授权 */
  AWAITING_PERMISSION = 'awaiting_permission',
  /** 工具正在并行执行 */
  TOOL_EXECUTING = 'tool_executing',
  /** 工具结果已回填，准备进入下一轮 */
  TOOL_RESULTS_READY = 'tool_results_ready',
  /** 终态：本次查询已结束 */
  STOPPED = 'stopped',
}

/** 终止原因 */
export type StopReason =
  | 'final_response'       // 正常收尾：无工具调用
  | 'max_turns'            // 达到最大轮次
  | 'aborted'              // 被用户/调用方中断
  | 'error'                // 抛异常
  | 'budget_exhausted'     // token 预算用尽或收益递减
  | 'stream_interrupted';  // 流式中被中断

/** 合法转换表（from → 允许的 to 集合） */
const ALLOWED: Readonly<Record<QueryState, readonly QueryState[]>> = {
  [QueryState.IDLE]: [QueryState.THINKING, QueryState.STOPPED],
  [QueryState.THINKING]: [QueryState.STREAMING, QueryState.STOPPED],
  [QueryState.STREAMING]: [
    QueryState.TOOL_QUEUED,
    QueryState.STOPPED,
  ],
  [QueryState.TOOL_QUEUED]: [
    QueryState.AWAITING_PERMISSION,
    QueryState.TOOL_EXECUTING,
    QueryState.STOPPED,
  ],
  [QueryState.AWAITING_PERMISSION]: [
    QueryState.TOOL_EXECUTING,
    QueryState.STOPPED,
  ],
  [QueryState.TOOL_EXECUTING]: [
    QueryState.TOOL_RESULTS_READY,
    QueryState.STOPPED,
  ],
  [QueryState.TOOL_RESULTS_READY]: [
    QueryState.THINKING,
    QueryState.STOPPED,
  ],
  [QueryState.STOPPED]: [],
};

/** 判断 from → to 是否为合法转换 */
export function canTransition(from: QueryState, to: QueryState): boolean {
  return ALLOWED[from].includes(to);
}

/** 断言式转换，失败时抛错，便于开发期尽早发现非法路径 */
export function transition(from: QueryState, to: QueryState): QueryState {
  if (!canTransition(from, to)) {
    throw new Error(`非法状态转换: ${from} → ${to}`);
  }
  return to;
}

/** 是否终态 */
export function isTerminal(state: QueryState): boolean {
  return state === QueryState.STOPPED;
}

/** 是否处于"可产出事件"的中间状态（非 idle、非 stopped） */
export function isActive(state: QueryState): boolean {
  return state !== QueryState.IDLE && state !== QueryState.STOPPED;
}
