/**
 * agent/constants — Agent 工具常量
 *
 */

export const AGENT_TOOL_NAME = 'Agent';
export const LEGACY_AGENT_TOOL_NAME = 'Task';

/** 一次性代理类型（运行后返回报告，不需要 SendMessage 继续） */
export const ONE_SHOT_BUILTIN_AGENT_TYPES: ReadonlySet<string> = new Set([
  'Explore',
  'Plan',
]);
