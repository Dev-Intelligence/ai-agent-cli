/**
 * 上下文压缩系统
 * 当对话历史接近上下文窗口限制时，自动压缩早期消息
 */

import type { Message } from './types.js';
import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import { toolResultContentToText } from './toolResult.js';
import { generateUuid } from '../utils/uuid.js';
import { loadPromptWithVars } from '../services/promptLoader.js';
import { getAutoCompactThreshold, getEffectiveContextWindowSize } from '../services/compact/autoCompact.js';

/**
 * 压缩配置
 */
export interface CompactionConfig {
  /** 触发压缩的上下文使用百分比（默认 80） */
  threshold: number;
  /** 保留最近 N 条消息不参与压缩（默认 4） */
  preserveLastN: number;
  /** 摘要的最大 token 数（默认 2000） */
  summaryMaxTokens: number;
}

/**
 * 压缩结果
 */
export interface CompactionResult {
  newHistory: Message[];
  originalLength: number;
  compressedLength: number;
  summary: string;
}

/**
 * 默认压缩配置
 */
const DEFAULT_CONFIG: CompactionConfig = {
  threshold: 80,
  preserveLastN: 4,
  summaryMaxTokens: 2000,
};

/**
 * 摘要生成模板（文件化）
 */
const SUMMARY_PROMPT = loadPromptWithVars('compression/summary-user.md', {});
const SUMMARY_SYSTEM_PROMPT = loadPromptWithVars('compression/summary-system.md', {});

/**
 * 上下文压缩器
 */
export class ContextCompressor {
  private adapter: ProtocolAdapter;
  private modelContextLength: number;
  private config: CompactionConfig;

  // ─── Circuit Breaker（断路器）───
  /** 连续压缩失败次数 */
  private consecutiveFailures = 0;
  /** 最大连续失败次数，超过后停止自动压缩 */
  private static readonly MAX_CONSECUTIVE_FAILURES = 3;

  constructor(
    adapter: ProtocolAdapter,
    modelContextLength: number,
    config?: Partial<CompactionConfig>
  ) {
    this.adapter = adapter;
    this.modelContextLength = modelContextLength;
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 有效上下文窗口大小（扣除预留输出 token）
   */
  getEffectiveContextWindowSize(): number {
    return getEffectiveContextWindowSize(this.modelContextLength);
  }

  /**
   * 检查是否需要压缩
   */
  shouldCompact(history: Message[]): boolean {
    // 断路器：连续失败太多次则停止
    if (this.consecutiveFailures >= ContextCompressor.MAX_CONSECUTIVE_FAILURES) {
      return false;
    }

    const estimatedTokens = this.estimateTokens(history);
    const autoCompactThreshold = getAutoCompactThreshold(
      this.modelContextLength,
      this.config.threshold,
    );
    return estimatedTokens >= autoCompactThreshold;
  }

  /**
   * 执行压缩
   */
  async compact(history: Message[], systemPrompt: string): Promise<CompactionResult> {
    try {
      const result = await this._doCompact(history, systemPrompt);
      // 成功：重置断路器
      this.consecutiveFailures = 0;
      return result;
    } catch (error) {
      // 失败：递增断路器
      this.consecutiveFailures++;
      throw error;
    }
  }

  private async _doCompact(history: Message[], systemPrompt: string): Promise<CompactionResult> {
    const preserveCount = this.config.preserveLastN;

    // 如果历史太短，不需要压缩
    if (history.length <= preserveCount + 1) {
      return {
        newHistory: history,
        originalLength: history.length,
        compressedLength: history.length,
        summary: '',
      };
    }

    // 分割：需要压缩的早期消息 + 保留的最近消息
    const toCompress = history.slice(0, -preserveCount);
    const toPreserve = history.slice(-preserveCount);

    // 生成摘要
    const summary = await this.generateSummary(toCompress, systemPrompt);

    // 构建新的历史
    const summaryMessage: Message = {
      role: 'user',
      content: loadPromptWithVars('compression/summary-wrap.md', { summary }),
      uuid: generateUuid(),
    };

    const newHistory: Message[] = [summaryMessage, ...toPreserve];

    return {
      newHistory,
      originalLength: history.length,
      compressedLength: newHistory.length,
      summary,
    };
  }

  /**
   * 生成对话摘要
   */
  private async generateSummary(messages: Message[], _systemPrompt: string): Promise<string> {
    try {
      // 将消息格式化为文本
      const conversationText = messages
        .map((msg) => {
          const role = msg.role === 'user' ? '用户' : '助手';
          const content = typeof msg.content === 'string'
            ? msg.content
            : msg.content
              .filter((block) => block.type === 'text')
              .map((block) => ('text' in block ? block.text : ''))
              .join('\n');

          // 截断过长的单条消息
          const truncated = content.length > 3000
            ? content.slice(0, 3000) + '\n...(已截断)'
            : content;

          return `[${role}]: ${truncated}`;
        })
        .join('\n\n');

      // 调用 LLM 生成摘要
      const summaryMessages: Message[] = [
        {
          role: 'user',
          content: `${SUMMARY_PROMPT}\n\n---\n\n对话历史:\n\n${conversationText}`,
          uuid: generateUuid(),
        },
      ];

      const rawResponse = await this.adapter.createMessage(
        SUMMARY_SYSTEM_PROMPT,
        summaryMessages,
        this.adapter.convertTools([]),
        this.config.summaryMaxTokens
      );

      const { textBlocks } = this.adapter.extractTextAndToolCalls(rawResponse);

      if (textBlocks.length > 0) {
        return textBlocks.join('\n\n');
      }

      // 降级：简单截断
      return this.fallbackSummary(messages);
    } catch (error: unknown) {
      // LLM 调用失败时降级
      return this.fallbackSummary(messages);
    }
  }

  /**
   * 降级摘要（不使用 LLM）
   */
  private fallbackSummary(messages: Message[]): string {
    const lines: string[] = ['[自动摘要 - LLM 不可用]', ''];

    // 只保留关键信息
    for (const msg of messages) {
      const role = msg.role === 'user' ? '用户' : '助手';
      const content = typeof msg.content === 'string'
        ? msg.content
        : msg.content
          .filter((block) => block.type === 'text')
          .map((block) => ('text' in block ? block.text : ''))
          .join('\n');

      // 只保留每条消息的前 200 字符
      const summary = content.slice(0, 200);
      lines.push(`[${role}]: ${summary}${content.length > 200 ? '...' : ''}`);
    }

    return lines.join('\n');
  }

  /**
   * 估算消息的 token 数
   * 简单估算：中文约 2 字符/token，英文约 4 字符/token，取平均 3 字符/token
   */
  private estimateTokens(history: Message[]): number {
    let totalChars = 0;

    for (const msg of history) {
      if (typeof msg.content === 'string') {
        totalChars += msg.content.length;
      } else {
        for (const block of msg.content) {
          if (block.type === 'text') {
            totalChars += block.text.length;
          } else if (block.type === 'tool_use') {
            totalChars += JSON.stringify(block.input).length;
          } else if (block.type === 'tool_result') {
            totalChars += toolResultContentToText(block.content).length;
          }
        }
      }

      // 如果有 token 使用统计，直接使用
      if (msg.usage) {
        return msg.usage.inputTokens + msg.usage.outputTokens;
      }
    }

    return Math.ceil(totalChars / 3);
  }

  // ─── Micro Compact：就地清理旧工具结果 ───

  /** 可被清理的工具名集合 */
  private static readonly CLEARABLE_TOOLS = new Set([
    'read_file', 'Read', 'FileReadTool',
    'Bash', 'bash', 'BashTool',
    'Grep', 'grep', 'GrepTool',
    'Glob', 'glob', 'GlobTool',
    'web_search', 'WebSearch', 'WebSearchTool',
    'web_fetch', 'WebFetch', 'WebFetchTool',
    'mcp__', // MCP 工具前缀
  ]);

  /** 检查工具名是否可被 microCompact 清理 */
  private isClearableTool(name: string): boolean {
    if (ContextCompressor.CLEARABLE_TOOLS.has(name)) return true;
    // MCP 工具以 mcp__ 开头
    if (name.startsWith('mcp__')) return true;
    return false;
  }

  /**
   * Micro Compact — 就地清理旧的工具结果
   *
   * 不调用 LLM，直接将较早的 tool_result 内容替换为简短占位符。
   * 只清理已知安全的工具（read、bash、grep、glob、web 等），
   * 保留最近 N 条消息不清理。
   *
   * @returns 新的历史（工具结果被清理），null 表示无需清理
   */
  microCompact(history: Message[]): Message[] | null {
    const preserveCount = Math.max(this.config.preserveLastN, 6);

    if (history.length <= preserveCount) return null;

    const cutoff = history.length - preserveCount;
    let changed = false;
    const newHistory = history.map((msg, idx) => {
      if (idx >= cutoff) return msg; // 保留最近消息
      if (msg.role !== 'user') return msg;
      if (typeof msg.content === 'string') return msg;

      const newContent = msg.content.map((block) => {
        if (block.type !== 'tool_result') return block;
        // 检查对应的 tool_use 名称
        const toolName = (block as any).toolName || '';
        if (!this.isClearableTool(toolName)) return block;

        const currentContent = typeof block.content === 'string'
          ? block.content
          : JSON.stringify(block.content ?? '');

        // 只清理较长的内容（>200 字符才值得清理）
        if (currentContent.length < 200) return block;

        changed = true;
        return {
          ...block,
          content: `[已清理: ${toolName} 输出 ${currentContent.length} 字符]`,
        };
      });

      return { ...msg, content: newContent };
    });

    return changed ? newHistory : null;
  }
}
