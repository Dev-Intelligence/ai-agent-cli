/**
 * tokenBudget — 自然语言 token 预算解析
 *
 * 解析用户输入中的 token 预算表达式：
 *   "+500k"         → 500000
 *   "use 2M tokens" → 2000000
 *   "+1.5m"         → 1500000
 */

// 简写格式（锚定在开头/结尾，避免自然语言误匹配）
const SHORTHAND_START_RE = /^\s*\+(\d+(?:\.\d+)?)\s*(k|m|b)\b/i;
const SHORTHAND_END_RE = /\s\+(\d+(?:\.\d+)?)\s*(k|m|b)\s*[.!?]?\s*$/i;
// 详细格式（匹配任意位置）
const VERBOSE_RE = /\b(?:use|spend|用)\s+(\d+(?:\.\d+)?)\s*(k|m|b)\s*tokens?\b/i;

const MULTIPLIERS: Record<string, number> = {
  k: 1_000,
  m: 1_000_000,
  b: 1_000_000_000,
};

function parseBudgetMatch(value: string, suffix: string): number {
  return parseFloat(value) * MULTIPLIERS[suffix.toLowerCase()]!;
}

/** 从文本中解析 token 预算，返回 token 数量或 null */
export function parseTokenBudget(text: string): number | null {
  const startMatch = text.match(SHORTHAND_START_RE);
  if (startMatch) return parseBudgetMatch(startMatch[1]!, startMatch[2]!);
  const endMatch = text.match(SHORTHAND_END_RE);
  if (endMatch) return parseBudgetMatch(endMatch[1]!, endMatch[2]!);
  const verboseMatch = text.match(VERBOSE_RE);
  if (verboseMatch) return parseBudgetMatch(verboseMatch[1]!, verboseMatch[2]!);
  return null;
}

/** 预算进度消息 */
export function getBudgetContinuationMessage(
  pct: number,
  turnTokens: number,
  budget: number,
): string {
  const fmt = (n: number): string => new Intl.NumberFormat('en-US').format(n);
  return `已用 ${pct}% 的 token 目标 (${fmt(turnTokens)} / ${fmt(budget)})。继续工作——不要总结。`;
}
