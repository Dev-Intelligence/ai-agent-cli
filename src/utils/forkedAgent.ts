/**
 * forkedAgent — 子代理分叉执行器
 *
 * 适配 ai-agent-cli 的 ProtocolAdapter + agentLoopGenerator 查询循环。
 *
 * 功能：
 * - 从父对话分叉一个独立的子查询循环
 * - 共享父对话的消息历史（prompt cache 复用）
 * - 独立的工具权限和状态隔离
 * - 用量追踪
 *
 * 用法：
 *   const result = await runForkedAgent({
 *     adapter, systemPrompt, parentMessages,
 *     userPrompt: '总结当前会话的关键信息',
 *     tools, executeTool,
 *     forkLabel: 'session_memory',
 *   });
 */

import type { Message, ToolDefinition, ExecuteToolFunc } from '../core/types.js';
import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import { generateUuid } from './uuid.js';

// ─── 类型 ───

export interface ForkedAgentParams {
  /** AI 适配器 */
  adapter: ProtocolAdapter;
  /** 系统提示词 */
  systemPrompt: string;
  /** 父对话历史（用于 prompt cache 复用） */
  parentMessages: Message[];
  /** 子代理的用户提示词 */
  userPrompt: string;
  /** 可用工具定义 */
  tools: ToolDefinition[];
  /** 工具执行函数 */
  executeTool: ExecuteToolFunc;
  /** 标签（用于日志） */
  forkLabel: string;
  /** 最大输出 token 数 */
  maxOutputTokens?: number;
  /** 最大轮次 */
  maxTurns?: number;
  /** 消息回调 */
  onMessage?: (message: Message) => void;
  /** AbortSignal */
  signal?: AbortSignal;
}

export interface ForkedAgentResult {
  /** 子代理产出的所有消息 */
  messages: Message[];
  /** 最终文本响应 */
  resultText: string;
}

// ─── 核心函数 ───

/**
 * 运行分叉的子代理查询循环
 *
 * 1. 构建 initialMessages = parentMessages + userPrompt
 * 2. 运行查询循环（最多 maxTurns 轮）
 * 3. 每轮：调用 adapter.createMessage → 提取文本/工具调用 → 执行工具 → 追加消息
 * 4. 返回所有消息和最终文本
 */
export async function runForkedAgent({
  adapter,
  systemPrompt,
  parentMessages,
  userPrompt,
  tools,
  executeTool,
  forkLabel: _forkLabel,
  maxOutputTokens = 4096,
  maxTurns = 10,
  onMessage,
  signal,
}: ForkedAgentParams): Promise<ForkedAgentResult> {
  const outputMessages: Message[] = [];

  // 构建初始消息：父历史 + 子代理提示
  const messages: Message[] = [
    ...parentMessages,
    { role: 'user', content: userPrompt, uuid: generateUuid() },
  ];

  const convertedTools = adapter.convertTools(tools);

  // 查询循环
  for (let turn = 0; turn < maxTurns; turn++) {
    if (signal?.aborted) break;

    // 调用 AI
    const rawResponse = await adapter.createMessage(
      systemPrompt,
      messages,
      convertedTools,
      maxOutputTokens,
    );

    const { textBlocks, toolCalls } = adapter.extractTextAndToolCalls(rawResponse);

    // 构建 assistant 消息
    const content: any[] = [];
    for (const text of textBlocks) {
      content.push({ type: 'text' as const, text });
    }
    for (const tc of toolCalls) {
      content.push({
        type: 'tool_use' as const,
        id: tc.id,
        name: tc.name,
        input: tc.input,
      });
    }

    const assistantMsg: Message = {
      role: 'assistant',
      content,
      uuid: generateUuid(),
    };
    messages.push(assistantMsg);
    outputMessages.push(assistantMsg);
    onMessage?.(assistantMsg);

    // 无工具调用 → 对话结束
    if (toolCalls.length === 0) break;

    // 执行工具并追加结果
    const toolResults: any[] = [];
    for (const tc of toolCalls) {
      if (signal?.aborted) break;

      try {
        const result = await executeTool(tc.name, tc.input);
        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: tc.id,
          content: typeof result === 'string' ? result : JSON.stringify(result),
        });
      } catch (error) {
        toolResults.push({
          type: 'tool_result' as const,
          tool_use_id: tc.id,
          content: `错误: ${error instanceof Error ? error.message : String(error)}`,
          is_error: true,
        });
      }
    }

    const userMsg: Message = {
      role: 'user',
      content: toolResults,
      uuid: generateUuid(),
    };
    messages.push(userMsg);
    outputMessages.push(userMsg);
    onMessage?.(userMsg);
  }

  // 提取最终文本
  const lastAssistant = [...outputMessages].reverse().find((m) => m.role === 'assistant');
  let resultText = '';
  if (lastAssistant && Array.isArray(lastAssistant.content)) {
    resultText = lastAssistant.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
  } else if (lastAssistant && typeof lastAssistant.content === 'string') {
    resultText = lastAssistant.content;
  }

  return { messages: outputMessages, resultText: resultText || '执行完成' };
}

/**
 * 从分叉结果中提取文本（辅助函数）
 */
export function extractResultText(
  messages: Message[],
  defaultText = '执行完成',
): string {
  const lastAssistant = [...messages].reverse().find((m) => m.role === 'assistant');
  if (!lastAssistant) return defaultText;

  if (typeof lastAssistant.content === 'string') return lastAssistant.content;
  if (Array.isArray(lastAssistant.content)) {
    const text = lastAssistant.content
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('\n');
    return text || defaultText;
  }
  return defaultText;
}
