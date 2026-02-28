/**
 * Anthropic Claude 适配器
 */

import Anthropic from '@anthropic-ai/sdk';
import type { Message, ToolDefinition, ToolResult, LLMResponse, ContentBlock, TokenUsage } from '../../../core/types.js';
import { ProtocolAdapter } from './base.js';
import type { StreamCallbacks, StreamResult } from './base.js';

export class AnthropicAdapter extends ProtocolAdapter {
  private client!: Anthropic;

  async initializeClient(): Promise<void> {
    const options: {
      apiKey: string;
      baseURL?: string;
    } = {
      apiKey: this.apiKey,
    };

    if (this.baseUrl) {
      options.baseURL = this.baseUrl;
    }

    this.client = new Anthropic(options);
  }

  convertTools(tools: ToolDefinition[]): unknown[] {
    // Anthropic 使用原生格式，无需转换
    return tools;
  }

  async createMessage(
    system: string,
    messages: Message[],
    tools: unknown[],
    maxTokens: number
  ): Promise<unknown> {
    // 确保客户端已初始化
    if (!this.client) {
      await this.initializeClient();
    }

    // 转换消息格式
    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<any> }> = messages.map((msg) => ({
      role: msg.role,
      content: msg.content as string | Array<any>,
    }));

    // 调用 API
    const response = await this.client.messages.create({
      model: this.model,
      system,
      messages: anthropicMessages,
      tools: tools as Anthropic.Tool[],
      max_tokens: maxTokens,
    });

    return response;
  }

  extractTextAndToolCalls(response: unknown): LLMResponse {
    const msg = response as Anthropic.Message;
    const textBlocks: string[] = [];
    const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

    for (const block of msg.content) {
      if (block.type === 'text') {
        textBlocks.push(block.text);
      } else if (block.type === 'tool_use') {
        toolCalls.push({
          id: block.id,
          name: block.name,
          input: block.input as Record<string, unknown>,
        });
      }
    }

    return {
      textBlocks,
      toolCalls,
      stopReason: msg.stop_reason || 'end_turn',
      usage: {
        inputTokens: msg.usage.input_tokens,
        outputTokens: msg.usage.output_tokens,
        cacheCreationTokens: msg.usage.cache_creation_input_tokens ?? undefined,
        cacheReadTokens: msg.usage.cache_read_input_tokens ?? undefined,
      },
    };
  }

  formatAssistantMessage(response: unknown): Message {
    const msg = response as Anthropic.Message;

    return {
      role: 'assistant',
      content: msg.content as ContentBlock[],
    };
  }

  formatToolResults(results: ToolResult[]): Message {
    const content: ContentBlock[] = results.map((r) => ({
      type: 'tool_result' as const,
      tool_use_id: r.tool_use_id,
      content: r.content,
      is_error: r.is_error,
    }));

    return {
      role: 'user',
      content,
    };
  }

  async createStreamMessage(
    system: string,
    messages: Message[],
    tools: unknown[],
    maxTokens: number,
    callbacks: StreamCallbacks
  ): Promise<StreamResult> {
    if (!this.client) {
      await this.initializeClient();
    }

    const anthropicMessages: Array<{ role: 'user' | 'assistant'; content: string | Array<any> }> = messages.map((msg) => ({
      role: msg.role,
      content: msg.content as string | Array<any>,
    }));

    const stream = this.client.messages.stream({
      model: this.model,
      system,
      messages: anthropicMessages,
      tools: tools as Anthropic.Tool[],
      max_tokens: maxTokens,
    });

    // 处理中断信号
    if (callbacks.signal) {
      const onAbort = () => { stream.abort(); };
      callbacks.signal.addEventListener('abort', onAbort, { once: true });
    }

    // 收集流式文本
    let collectedText = '';

    stream.on('text', (text) => {
      collectedText += text;
      callbacks.onText?.(text);
    });

    try {
      const finalMessage = await stream.finalMessage();

      // 提取结果
      const textBlocks: string[] = [];
      const toolCalls: Array<{ id: string; name: string; input: Record<string, unknown> }> = [];

      for (const block of finalMessage.content) {
        if (block.type === 'text') {
          textBlocks.push(block.text);
        } else if (block.type === 'tool_use') {
          const toolCall = {
            id: block.id,
            name: block.name,
            input: block.input as Record<string, unknown>,
          };
          toolCalls.push(toolCall);
          callbacks.onToolUse?.(toolCall);
        }
      }

      const usage: TokenUsage = {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        cacheCreationTokens: finalMessage.usage.cache_creation_input_tokens ?? undefined,
        cacheReadTokens: finalMessage.usage.cache_read_input_tokens ?? undefined,
      };
      callbacks.onUsage?.(usage);

      return {
        textBlocks,
        toolCalls,
        stopReason: finalMessage.stop_reason || 'end_turn',
        usage,
        assistantMessage: {
          role: 'assistant',
          content: finalMessage.content as ContentBlock[],
          usage,
        },
      };
    } catch (error: unknown) {
      // 如果是中断导致的错误，返回部分结果
      if (callbacks.signal?.aborted) {
        return {
          textBlocks: collectedText ? [collectedText] : [],
          toolCalls: [],
          stopReason: 'interrupted',
          assistantMessage: {
            role: 'assistant',
            content: collectedText ? [{ type: 'text' as const, text: collectedText }] : [],
          },
        };
      }
      throw error;
    }
  }
}
