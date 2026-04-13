/**
 * agent/runAgent — 代理执行核心
 *
 * 适配 ai-agent-cli 的 ProtocolAdapter + forkedAgent。
 *
 * 功能：
 * - 创建独立的子代理查询循环
 * - 可选 worktree 隔离
 * - 代理记忆注入
 * - 工具限制（基于 AgentDefinition.allowedTools）
 * - 结果消息提取
 */

import type { Message, ToolDefinition, ExecuteToolFunc } from '../../core/types.js';
import type { ProtocolAdapter } from '../../services/ai/adapters/base.js';
import { runForkedAgent, extractResultText } from '../../utils/forkedAgent.js';
import { createWorktreeForSession, cleanupWorktree, type WorktreeSession } from '../../utils/worktree.js';
import { buildAgentMemoryPrompt } from './agentMemory.js';
import type { AgentDefinition } from './builtInAgents.js';
import { assignNextColor, getAgentColor } from './agentColorManager.js';

// ─── 类型 ───

export interface RunAgentOptions {
  /** AI 适配器 */
  adapter: ProtocolAdapter;
  /** 基础系统提示词 */
  systemPrompt: string;
  /** 用户提示词（代理任务描述） */
  userPrompt: string;
  /** 父对话历史 */
  parentMessages: Message[];
  /** 可用工具定义（可选，默认全部） */
  tools: ToolDefinition[];
  /** 工具执行函数 */
  executeTool: ExecuteToolFunc;
  /** 代理定义 */
  agentDefinition: AgentDefinition;
  /** 是否使用 worktree 隔离 */
  useWorktree?: boolean;
  /** worktree slug（默认随机生成） */
  worktreeSlug?: string;
  /** AbortSignal */
  signal?: AbortSignal;
  /** 消息回调 */
  onMessage?: (message: Message) => void;
}

export interface RunAgentResult {
  /** 代理产出的所有消息 */
  messages: Message[];
  /** 最终文本响应 */
  resultText: string;
  /** worktree 会话（如果使用了 worktree） */
  worktreeSession?: WorktreeSession;
  /** 代理类型 */
  agentType: string;
  /** 代理颜色 */
  color?: string;
}

// ─── 核心 ───

/**
 * 运行子代理
 *
 * 1. 分配代理颜色
 * 2. 可选创建 worktree
 * 3. 构建代理系统提示词（基础 + 代理定义 suffix + 代理记忆）
 * 4. 过滤工具（基于 allowedTools）
 * 5. 用 forkedAgent 运行查询循环
 * 6. 清理 worktree（如果创建了）
 * 7. 返回结果
 */
export async function runAgent(options: RunAgentOptions): Promise<RunAgentResult> {
  const {
    adapter,
    systemPrompt,
    userPrompt,
    parentMessages,
    tools,
    executeTool,
    agentDefinition,
    useWorktree = false,
    worktreeSlug,
    signal,
    onMessage,
  } = options;

  const { agentType } = agentDefinition;

  // 1. 分配颜色
  let color = getAgentColor(agentType);
  if (!color && agentType !== 'general-purpose') {
    assignNextColor(agentType);
    color = getAgentColor(agentType);
  }

  // 2. 可选创建 worktree
  let worktreeSession: WorktreeSession | undefined;
  if (useWorktree) {
    const slug = worktreeSlug || `agent-${agentType}-${Date.now().toString(36)}`;
    try {
      worktreeSession = await createWorktreeForSession(slug);
    } catch {
      // worktree 创建失败不阻止代理运行
    }
  }

  // 3. 构建系统提示词
  const memoryPrompt = buildAgentMemoryPrompt(agentType);
  const agentSystemPrompt = [
    systemPrompt,
    agentDefinition.systemPromptSuffix || '',
    memoryPrompt,
  ].filter(Boolean).join('\n\n');

  // 4. 过滤工具
  const agentTools = agentDefinition.allowedTools
    ? tools.filter((t) => agentDefinition.allowedTools!.includes(t.name))
    : tools;

  // 5. 运行查询循环
  try {
    const result = await runForkedAgent({
      adapter,
      systemPrompt: agentSystemPrompt,
      parentMessages,
      userPrompt,
      tools: agentTools,
      executeTool,
      forkLabel: `agent:${agentType}`,
      maxTurns: agentDefinition.maxTurns ?? 30,
      onMessage,
      signal,
    });

    return {
      messages: result.messages,
      resultText: result.resultText,
      worktreeSession,
      agentType,
      color: color ?? undefined,
    };
  } finally {
    // 6. 清理 worktree（如果是一次性代理）
    if (worktreeSession && agentDefinition.oneShot) {
      try {
        await cleanupWorktree(true);
      } catch { /* 忽略 */ }
    }
  }
}

/** 从代理消息中提取结果文本 */
export { extractResultText };
