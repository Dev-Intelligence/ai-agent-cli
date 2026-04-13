/**
 * agent/agentColorManager — 代理颜色管理
 *
 * 为不同代理类型分配不同颜色，用于 UI 区分。
 */

// ─── 类型 ───

export type AgentColorName =
  | 'red' | 'blue' | 'green' | 'yellow'
  | 'purple' | 'orange' | 'pink' | 'cyan';

export const AGENT_COLORS: readonly AgentColorName[] = [
  'red', 'blue', 'green', 'yellow', 'purple', 'orange', 'pink', 'cyan',
] as const;

// ─── 颜色映射 ───

/** 代理颜色 → 终端 ANSI 颜色名 */
export const AGENT_COLOR_TO_ANSI: Record<AgentColorName, string> = {
  red: 'red',
  blue: 'blue',
  green: 'green',
  yellow: 'yellow',
  purple: 'magenta',
  orange: 'yellowBright',
  pink: 'magentaBright',
  cyan: 'cyan',
};

// ─── 全局状态 ───

const agentColorMap = new Map<string, AgentColorName>();

/** 获取代理类型的颜色 */
export function getAgentColor(agentType: string): string | undefined {
  if (agentType === 'general-purpose') return undefined;
  const color = agentColorMap.get(agentType);
  return color ? AGENT_COLOR_TO_ANSI[color] : undefined;
}

/** 设置代理类型的颜色 */
export function setAgentColor(agentType: string, color: AgentColorName | undefined): void {
  if (!color) {
    agentColorMap.delete(agentType);
    return;
  }
  if (AGENT_COLORS.includes(color)) {
    agentColorMap.set(agentType, color);
  }
}

/** 分配下一个可用颜色 */
export function assignNextColor(agentType: string): AgentColorName {
  const used = new Set(agentColorMap.values());
  const available = AGENT_COLORS.find((c) => !used.has(c)) ?? AGENT_COLORS[0]!;
  agentColorMap.set(agentType, available);
  return available;
}
