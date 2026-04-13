/**
 * agent/builtInAgents — 内置代理定义
 *
 * 定义 ai-agent-cli 的内置代理类型。
 */

// ─── 代理定义类型 ───

export interface AgentDefinition {
  /** 代理类型名称（如 'general-purpose', 'Explore', 'Plan'） */
  agentType: string;
  /** 显示名称 */
  displayName: string;
  /** 描述 */
  description: string;
  /** 系统提示词片段（追加到基础系统提示词后） */
  systemPromptSuffix?: string;
  /** 允许使用的工具名列表（空=全部工具） */
  allowedTools?: string[];
  /** 最大轮次 */
  maxTurns?: number;
  /** 是否一次性代理（运行后返回报告） */
  oneShot?: boolean;
}

// ─── 内置代理 ───

const GENERAL_PURPOSE_AGENT: AgentDefinition = {
  agentType: 'general-purpose',
  displayName: 'General Purpose',
  description: '通用代理，可以使用所有工具',
};

const EXPLORE_AGENT: AgentDefinition = {
  agentType: 'Explore',
  displayName: 'Explore',
  description: '快速代码库探索代理，只使用读取和搜索工具',
  allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
  maxTurns: 10,
  oneShot: true,
};

const PLAN_AGENT: AgentDefinition = {
  agentType: 'Plan',
  displayName: 'Plan',
  description: '设计实现计划的代理，只使用读取和搜索工具',
  allowedTools: ['Read', 'Glob', 'Grep', 'Bash'],
  maxTurns: 15,
  oneShot: true,
};

const BASH_AGENT: AgentDefinition = {
  agentType: 'Bash',
  displayName: 'Bash',
  description: '执行 shell 命令的代理',
  allowedTools: ['Bash'],
  maxTurns: 20,
};

const GUIDE_AGENT: AgentDefinition = {
  agentType: 'Guide',
  displayName: 'Guide',
  description: '回答关于工具使用和最佳实践的问题',
  allowedTools: ['Read', 'Glob', 'Grep'],
  maxTurns: 5,
  oneShot: true,
};

// ─── 导出 ───

export function getBuiltInAgents(): AgentDefinition[] {
  return [
    GENERAL_PURPOSE_AGENT,
    EXPLORE_AGENT,
    PLAN_AGENT,
    BASH_AGENT,
    GUIDE_AGENT,
  ];
}

/** 根据类型名查找代理定义 */
export function findAgentByType(agentType: string): AgentDefinition | undefined {
  return getBuiltInAgents().find((a) => a.agentType === agentType);
}
