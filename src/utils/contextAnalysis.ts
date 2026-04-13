/**
 * contextAnalysis — 上下文 token 分布分析
 *
 * 分析对话历史中各类消息的 token 占比。
 */

import type { Message, ContentBlock } from '../core/types.js';

export interface ContextStats {
  /** 用户消息 token 数 */
  userTokens: number;
  /** AI 消息 token 数 */
  assistantTokens: number;
  /** 工具调用 token 数 */
  toolCallTokens: number;
  /** 工具结果 token 数 */
  toolResultTokens: number;
  /** 系统消息 token 数 */
  systemTokens: number;
  /** 总 token 数（估算） */
  total: number;
  /** 各工具的 token 使用统计 */
  toolBreakdown: Map<string, number>;
  /** 消息数量 */
  messageCount: number;
}

/** 粗略估算字符串的 token 数（~4 字符/token） */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function contentToText(content: Message['content']): string {
  if (typeof content === 'string') return content;
  return content
    .map((block: ContentBlock) => {
      if (block.type === 'text') return block.text;
      if (block.type === 'tool_use') return JSON.stringify(block.input ?? {});
      if (block.type === 'tool_result') {
        if (typeof block.content === 'string') return block.content;
        if (Array.isArray(block.content)) {
          return block.content
            .map((c: any) => (c.type === 'text' ? c.text : ''))
            .join('');
        }
        return '';
      }
      return '';
    })
    .join('\n');
}

/** 分析对话历史的 token 分布 */
export function analyzeContext(messages: Message[]): ContextStats {
  const stats: ContextStats = {
    userTokens: 0,
    assistantTokens: 0,
    toolCallTokens: 0,
    toolResultTokens: 0,
    systemTokens: 0,
    total: 0,
    toolBreakdown: new Map(),
    messageCount: messages.length,
  };

  for (const msg of messages) {
    const text = contentToText(msg.content);
    const tokens = estimateTokens(text);
    stats.total += tokens;

    switch (msg.role) {
      case 'user': {
        // 检查是否包含 tool_result
        if (typeof msg.content !== 'string') {
          for (const block of msg.content) {
            if (block.type === 'tool_result') {
              const resultText = typeof block.content === 'string'
                ? block.content
                : JSON.stringify(block.content ?? '');
              const resultTokens = estimateTokens(resultText);
              stats.toolResultTokens += resultTokens;
              // 按工具名累计
              const toolName = (block as any).toolName || 'unknown';
              stats.toolBreakdown.set(
                toolName,
                (stats.toolBreakdown.get(toolName) || 0) + resultTokens,
              );
            }
          }
        }
        stats.userTokens += tokens;
        break;
      }
      case 'assistant': {
        if (typeof msg.content !== 'string') {
          for (const block of msg.content) {
            if (block.type === 'tool_use') {
              const callTokens = estimateTokens(JSON.stringify(block.input ?? {}));
              stats.toolCallTokens += callTokens;
              stats.toolBreakdown.set(
                block.name,
                (stats.toolBreakdown.get(block.name) || 0) + callTokens,
              );
            }
          }
        }
        stats.assistantTokens += tokens;
        break;
      }
      default:
        stats.systemTokens += tokens;
        break;
    }
  }

  return stats;
}

/** 格式化 token 统计为可读文本 */
export function formatContextStats(stats: ContextStats): string {
  const lines: string[] = [];
  const pct = (n: number) => stats.total > 0 ? `${Math.round((n / stats.total) * 100)}%` : '0%';

  lines.push(`上下文分析 (${stats.messageCount} 条消息, ~${stats.total} tokens):`);
  lines.push(`  用户消息:   ${stats.userTokens} tokens (${pct(stats.userTokens)})`);
  lines.push(`  AI 消息:    ${stats.assistantTokens} tokens (${pct(stats.assistantTokens)})`);
  lines.push(`  工具调用:   ${stats.toolCallTokens} tokens (${pct(stats.toolCallTokens)})`);
  lines.push(`  工具结果:   ${stats.toolResultTokens} tokens (${pct(stats.toolResultTokens)})`);

  if (stats.toolBreakdown.size > 0) {
    lines.push('  工具明细:');
    const sorted = [...stats.toolBreakdown.entries()].sort((a, b) => b[1] - a[1]);
    for (const [name, tokens] of sorted.slice(0, 10)) {
      lines.push(`    ${name}: ${tokens} tokens`);
    }
  }

  return lines.join('\n');
}
