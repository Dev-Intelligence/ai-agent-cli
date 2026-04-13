/**
 * sessionMemory — 持久会话笔记
 *
 * 适配 ai-agent-cli 的 forkedAgent + ProtocolAdapter。
 *
 * 功能：
 * - 在对话过程中定期用后台子代理总结关键信息
 * - 写入 .ai-agent/memory/session_memory.md
 * - 通过 compaction 存活（记忆文件不随压缩丢失）
 * - 可配置的触发阈值（tool call 数/token 数）
 */

import { existsSync, readFileSync } from 'fs';
import { mkdir, writeFile } from 'fs/promises';
import { join } from 'path';
import type { Message, ToolDefinition, ExecuteToolFunc } from '../core/types.js';
import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import { runForkedAgent } from '../utils/forkedAgent.js';
import { sequential } from '../utils/sequential.js';

// ─── 配置 ───

export interface SessionMemoryConfig {
  /** 首次触发需要的最小工具调用数 */
  initToolCallThreshold: number;
  /** 后续更新间隔（工具调用数） */
  updateToolCallThreshold: number;
  /** 最大记忆文件大小（字符） */
  maxMemorySize: number;
}

const DEFAULT_CONFIG: SessionMemoryConfig = {
  initToolCallThreshold: 5,
  updateToolCallThreshold: 10,
  maxMemorySize: 5000,
};

// ─── 系统提示词 ───

const SESSION_MEMORY_SYSTEM_PROMPT = `你是一个会话记忆助手。你的任务是维护一个简洁的 Markdown 文件，记录当前会话的关键信息。

规则：
1. 只记录重要的事实、决策和发现
2. 使用简洁的要点格式
3. 按主题分组（如：## 项目结构、## 已完成、## 待办）
4. 每次更新时整合重复内容
5. 总长度不超过 100 行

输出格式：直接输出 Markdown 内容（无代码块包裹）。`;

// ─── 状态 ───

let toolCallsSinceLastUpdate = 0;
let initialized = false;
let running = false;

// ─── 路径 ───

function getSessionMemoryPath(): string {
  return join(process.cwd(), '.ai-agent', 'memory', 'session_memory.md');
}

function getSessionMemoryDir(): string {
  return join(process.cwd(), '.ai-agent', 'memory');
}

// ─── 核心 ───

/**
 * 检查是否应该触发记忆更新
 */
export function shouldUpdateMemory(config: SessionMemoryConfig = DEFAULT_CONFIG): boolean {
  if (running) return false;
  if (!initialized) {
    return toolCallsSinceLastUpdate >= config.initToolCallThreshold;
  }
  return toolCallsSinceLastUpdate >= config.updateToolCallThreshold;
}

/**
 * 记录一次工具调用（供主循环调用）
 */
export function recordToolCall(): void {
  toolCallsSinceLastUpdate++;
}

/**
 * 重置计数器（更新完成后调用）
 */
function resetToolCallCounter(): void {
  toolCallsSinceLastUpdate = 0;
}

/**
 * 读取当前记忆文件内容
 */
function readCurrentMemory(): string {
  const path = getSessionMemoryPath();
  if (!existsSync(path)) return '';
  try {
    return readFileSync(path, 'utf-8');
  } catch {
    return '';
  }
}

/**
 * 更新会话记忆（顺序执行，防止并发写入）
 *
 * 1. 读取当前记忆文件
 * 2. 构建提示词（当前记忆 + 最近对话）
 * 3. 用 forkedAgent 生成更新后的记忆
 * 4. 写回文件
 */
export const updateSessionMemory = sequential(async function updateSessionMemory(
  adapter: ProtocolAdapter,
  messages: Message[],
  _tools: ToolDefinition[],
  executeTool: ExecuteToolFunc,
  _systemPrompt: string,
): Promise<void> {
  if (running) return;
  running = true;

  try {
    const currentMemory = readCurrentMemory();

    // 构建更新提示
    const contextMessages = messages.slice(-20); // 最近 20 条消息
    const conversationSummary = contextMessages
      .map((m) => {
        const role = m.role === 'user' ? '用户' : 'AI';
        const text = typeof m.content === 'string'
          ? m.content.slice(0, 500)
          : Array.isArray(m.content)
            ? m.content
              .filter((b: any) => b.type === 'text')
              .map((b: any) => b.text?.slice(0, 200))
              .join('\n')
            : '';
        return `[${role}]: ${text}`;
      })
      .join('\n\n');

    const userPrompt = currentMemory
      ? `当前记忆文件内容：\n\`\`\`markdown\n${currentMemory}\n\`\`\`\n\n最近的对话内容：\n${conversationSummary}\n\n请更新记忆文件，整合新信息。直接输出更新后的完整 Markdown 内容。`
      : `以下是当前对话的内容：\n${conversationSummary}\n\n请生成会话记忆文件。直接输出 Markdown 内容。`;

    // 用 forkedAgent 运行子查询
    const result = await runForkedAgent({
      adapter,
      systemPrompt: SESSION_MEMORY_SYSTEM_PROMPT,
      parentMessages: [], // 不共享父消息（独立上下文）
      userPrompt,
      tools: [], // 记忆更新不需要工具
      executeTool,
      forkLabel: 'session_memory',
      maxOutputTokens: 2000,
      maxTurns: 1, // 单轮即可
    });

    // 写入文件
    if (result.resultText && result.resultText !== '执行完成') {
      await mkdir(getSessionMemoryDir(), { recursive: true });
      await writeFile(getSessionMemoryPath(), result.resultText, 'utf-8');
    }

    initialized = true;
    resetToolCallCounter();
  } finally {
    running = false;
  }
});

/**
 * 重置会话记忆状态（新会话时调用）
 */
export function resetSessionMemoryState(): void {
  toolCallsSinceLastUpdate = 0;
  initialized = false;
  running = false;
}
