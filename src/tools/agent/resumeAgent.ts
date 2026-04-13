/**
 * agent/resumeAgent — 代理恢复
 *
 * 从会话日志中恢复之前中断的代理继续执行。
 */

import type { Message, ToolDefinition, ExecuteToolFunc } from '../../core/types.js';
import type { ProtocolAdapter } from '../../services/ai/adapters/base.js';
import { runAgent, type RunAgentResult } from './runAgent.js';
import { findAgentByType } from './builtInAgents.js';
import { loadAllAgents } from './loadAgentsDir.js';

// ─── 类型 ───

export interface ResumeAgentOptions {
  /** 代理 ID（用于查找历史消息） */
  agentId: string;
  /** 代理类型 */
  agentType: string;
  /** 恢复时的额外消息（如 SendMessage 内容） */
  resumeMessage?: string;
  /** AI 适配器 */
  adapter: ProtocolAdapter;
  /** 系统提示词 */
  systemPrompt: string;
  /** 代理之前的消息历史 */
  previousMessages: Message[];
  /** 可用工具 */
  tools: ToolDefinition[];
  /** 工具执行函数 */
  executeTool: ExecuteToolFunc;
  /** AbortSignal */
  signal?: AbortSignal;
  /** 消息回调 */
  onMessage?: (message: Message) => void;
}

// ─── 恢复 ───

/**
 * 恢复之前中断的代理
 *
 * 1. 查找代理定义（内置 + 用户自定义）
 * 2. 用之前的消息历史作为 parentMessages
 * 3. 用 resumeMessage 或默认提示词继续执行
 */
export async function resumeAgent(options: ResumeAgentOptions): Promise<RunAgentResult> {
  const {
    agentType,
    resumeMessage,
    adapter,
    systemPrompt,
    previousMessages,
    tools,
    executeTool,
    signal,
    onMessage,
  } = options;

  // 查找代理定义
  const allAgents = loadAllAgents();
  const agentDefinition = allAgents.find((a) => a.agentType === agentType)
    ?? findAgentByType(agentType)
    ?? {
      agentType,
      displayName: agentType,
      description: `恢复的代理: ${agentType}`,
    };

  // 构建恢复提示词
  const userPrompt = resumeMessage || '继续之前的工作。';

  return runAgent({
    adapter,
    systemPrompt,
    userPrompt,
    parentMessages: previousMessages,
    tools,
    executeTool,
    agentDefinition,
    signal,
    onMessage,
  });
}
