/**
 * agent/agentToolUtils — 代理工具管理工具函数
 *
 * 提供代理工具过滤、解析、结果提取等功能。
 */

import type { ToolDefinition } from '../../core/types.js';
import type { AgentDefinition } from './builtInAgents.js';
import { AGENT_TOOL_NAME } from './constants.js';

// ─── 禁止代理使用的工具 ───

/** 所有代理都不能使用的工具 */
const ALL_AGENT_DISALLOWED_TOOLS = new Set([
  'TeamCreate',
  'TeamDelete',
]);

/** 自定义代理不能使用的工具（内置代理可以） */
const CUSTOM_AGENT_DISALLOWED_TOOLS = new Set([
  'SendMessage',
  'RemoteTrigger',
]);

/** 异步代理允许使用的工具 */
const ASYNC_AGENT_ALLOWED_TOOLS = new Set([
  'Read', 'read_file',
  'Write', 'write_file',
  'Edit', 'file_edit',
  'Bash', 'bash',
  'Glob', 'glob',
  'Grep', 'grep',
  'WebFetch', 'web_fetch',
  'WebSearch', 'web_search',
  AGENT_TOOL_NAME,
  'TaskCreate', 'TaskUpdate', 'TaskGet', 'TaskList',
  'TodoWrite',
]);

// ─── 类型 ───

export interface ResolvedAgentTools {
  /** 是否使用通配符（允许所有工具） */
  hasWildcard: boolean;
  /** 有效的工具名列表 */
  validTools: string[];
  /** 无效的工具名列表（在 allowedTools 中指定但实际不存在的） */
  invalidTools: string[];
  /** 解析后的工具定义列表 */
  resolvedTools: ToolDefinition[];
}

// ─── 工具过滤 ───

/**
 * 过滤代理可用的工具
 *
 * - MCP 工具（mcp__ 前缀）始终允许
 * - ALL_AGENT_DISALLOWED_TOOLS 中的工具始终禁止
 * - 自定义代理额外禁止 CUSTOM_AGENT_DISALLOWED_TOOLS
 * - 异步代理只允许 ASYNC_AGENT_ALLOWED_TOOLS
 */
export function filterToolsForAgent({
  tools,
  isBuiltIn,
  isAsync = false,
}: {
  tools: ToolDefinition[];
  isBuiltIn: boolean;
  isAsync?: boolean;
}): ToolDefinition[] {
  return tools.filter((tool) => {
    // MCP 工具始终允许
    if (tool.name.startsWith('mcp__')) return true;

    // 全局禁止列表
    if (ALL_AGENT_DISALLOWED_TOOLS.has(tool.name)) return false;

    // 自定义代理额外禁止
    if (!isBuiltIn && CUSTOM_AGENT_DISALLOWED_TOOLS.has(tool.name)) return false;

    // 异步代理只允许白名单
    if (isAsync && !ASYNC_AGENT_ALLOWED_TOOLS.has(tool.name)) return false;

    return true;
  });
}

/**
 * 解析代理定义中的 allowedTools，验证有效性
 *
 * - '*' 或空 = 使用所有可用工具（通配符）
 * - 具体名称列表 = 过滤 + 验证
 */
export function resolveAgentTools(
  agentDef: AgentDefinition,
  availableTools: ToolDefinition[],
  isBuiltIn: boolean,
): ResolvedAgentTools {
  // 先过滤代理不允许的工具
  const filtered = filterToolsForAgent({ tools: availableTools, isBuiltIn });

  // 通配符：使用所有过滤后的工具
  if (!agentDef.allowedTools || agentDef.allowedTools.length === 0) {
    return {
      hasWildcard: true,
      validTools: filtered.map((t) => t.name),
      invalidTools: [],
      resolvedTools: filtered,
    };
  }

  // 具体列表：验证每个工具名
  const validTools: string[] = [];
  const invalidTools: string[] = [];
  const resolvedTools: ToolDefinition[] = [];

  for (const name of agentDef.allowedTools) {
    const tool = filtered.find((t) => t.name === name);
    if (tool) {
      validTools.push(name);
      resolvedTools.push(tool);
    } else {
      invalidTools.push(name);
    }
  }

  return { hasWildcard: false, validTools, invalidTools, resolvedTools };
}

// ─── 结果提取 ───

/** 统计消息中的工具调用次数 */
export function countToolUses(messages: Array<{ role: string; content: string | any[] }>): number {
  let count = 0;
  for (const msg of messages) {
    if (msg.role !== 'assistant' || typeof msg.content === 'string') continue;
    for (const block of msg.content) {
      if (block.type === 'tool_use') count++;
    }
  }
  return count;
}

/** 获取最后一个工具调用的名称 */
export function getLastToolUseName(message: { content: string | any[] }): string | undefined {
  if (typeof message.content === 'string') return undefined;
  for (let i = message.content.length - 1; i >= 0; i--) {
    if (message.content[i].type === 'tool_use') return message.content[i].name;
  }
  return undefined;
}

/** 从代理结果中提取部分结果文本 */
export function extractPartialResult(
  messages: Array<{ role: string; content: string | any[] }>,
  maxLength = 1000,
): string {
  // 从最后一条 assistant 消息中提取文本
  for (let i = messages.length - 1; i >= 0; i--) {
    const msg = messages[i]!;
    if (msg.role !== 'assistant') continue;
    if (typeof msg.content === 'string') {
      return msg.content.slice(0, maxLength);
    }
    const texts = msg.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
    if (texts) return texts.slice(0, maxLength);
  }
  return '';
}
