/**
 * toolUseSummaryGenerator — 工具批次摘要生成器
 *
 * 适配：queryHaiku → ai-agent-cli 的 ProtocolAdapter。
 *
 * 用快速模型生成已完成工具调用的单行摘要（30 字符以内），
 * 用于移动端/SDK 进度展示。
 */

import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import { generateUuid } from '../utils/uuid.js';

// ─── 系统提示词 ───

const TOOL_USE_SUMMARY_SYSTEM_PROMPT = `Write a short summary label describing what these tool calls accomplished. It appears as a single-line row in a mobile app and truncates around 30 characters, so think git-commit-subject, not sentence.

Keep the verb in past tense and the most distinctive noun. Drop articles, connectors, and long location context first.

Examples:
- Searched in auth/
- Fixed NPE in UserService
- Created signup endpoint
- Read config.json
- Ran failing tests`;

// ─── 类型 ───

type ToolInfo = {
  name: string;
  input: unknown;
  output: unknown;
};

export type GenerateToolUseSummaryParams = {
  tools: ToolInfo[];
  adapter: ProtocolAdapter;
  signal?: AbortSignal;
  lastAssistantText?: string;
};

// ─── 生成器 ───

/**
 * 生成工具批次的人类可读摘要
 * @returns 简短摘要字符串，失败返回 null
 */
export async function generateToolUseSummary({
  tools,
  adapter,
  lastAssistantText,
}: GenerateToolUseSummaryParams): Promise<string | null> {
  if (tools.length === 0) return null;

  try {
    // 构建工具执行的简明表示
    const toolSummaries = tools
      .map((tool) => {
        const inputStr = truncateJson(tool.input, 300);
        const outputStr = truncateJson(tool.output, 300);
        return `Tool: ${tool.name}\nInput: ${inputStr}\nOutput: ${outputStr}`;
      })
      .join('\n\n');

    const contextPrefix = lastAssistantText
      ? `User's intent (from assistant's last message): ${lastAssistantText.slice(0, 200)}\n\n`
      : '';

    const userPrompt = `${contextPrefix}Tools completed:\n\n${toolSummaries}\n\nLabel:`;

    // 调用 adapter 生成摘要
    const rawResponse = await adapter.createMessage(
      TOOL_USE_SUMMARY_SYSTEM_PROMPT,
      [{ role: 'user', content: userPrompt, uuid: generateUuid() }],
      adapter.convertTools([]),
      100, // 短输出
    );

    const { textBlocks } = adapter.extractTextAndToolCalls(rawResponse);
    const summary = textBlocks.join('').trim();
    return summary || null;
  } catch {
    // 摘要是非关键功能，失败不影响主流程
    return null;
  }
}

// ─── 辅助 ───

function truncateJson(value: unknown, maxLength: number): string {
  try {
    const str = JSON.stringify(value);
    if (str.length <= maxLength) return str;
    return str.slice(0, maxLength - 3) + '...';
  } catch {
    return '[unable to serialize]';
  }
}
