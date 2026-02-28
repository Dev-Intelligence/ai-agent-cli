/**
 * 主代理循环 - 核心逻辑
 */

import type {
  Message,
  ToolDefinition,
  ToolResult,
  ExecuteToolFunc,
} from './types.js';
import type { ProtocolAdapter } from '../services/ai/adapters/base.js';
import type { PermissionManager } from './permissions.js';
import type { HookManager } from './hooks.js';
import { thinkingSpinner, ToolDisplay, getTheme } from '../ui/index.js';
import { getReminderManager } from './reminder.js';
import { renderMarkdown, isMarkdownContent } from '../ui/markdown.js';
import { withRetry } from '../utils/retry.js';
import type { TokenTracker } from '../utils/tokenTracker.js';

/**
 * 代理循环配置
 */
export interface AgentLoopOptions {
  maxTokens?: number;
  maxTurns?: number;
  silent?: boolean; // 静默模式（用于子代理）
  onToolCall?: (name: string, count: number, elapsed: number) => void; // 工具调用回调
  permissionManager?: PermissionManager;
  hookManager?: HookManager;
  abortController?: AbortController; // 中断控制器
  tokenTracker?: TokenTracker; // Token 追踪器
}

/**
 * 代理循环结果
 */
export interface AgentLoopResult {
  history: Message[];
  toolCount: number;
  elapsed: number;
}

/**
 * 主代理循环
 *
 * 实现思考 → 工具使用 → 响应的循环（流式输出）
 */
export async function agentLoop(
  history: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  adapter: ProtocolAdapter,
  executeTool: ExecuteToolFunc,
  options: AgentLoopOptions = {}
): Promise<Message[]> {
  const {
    maxTokens = 4096,
    maxTurns = 20,
    silent = false,
    onToolCall,
    permissionManager,
    hookManager,
    abortController,
    tokenTracker,
  } = options;

  let currentHistory = [...history];
  let turns = 0;
  let totalToolCount = 0;
  const startTime = Date.now();
  const reminderManager = getReminderManager();

  while (turns < maxTurns) {
    turns++;

    // 检查是否已被中断
    if (abortController?.signal.aborted) {
      break;
    }

    // 用于收集流式文本
    let streamedText = '';

    try {
      // 1. 显示思考动画（非静默模式）
      if (!silent) {
        thinkingSpinner.start();
      }

      // 2. 流式调用 LLM API（带自动重试）
      const streamResult = await withRetry(
        () => {
          // 每次重试前重置流式文本（避免重复内容）
          streamedText = '';
          return adapter.createStreamMessage(
            systemPrompt,
            currentHistory,
            adapter.convertTools(tools),
            maxTokens,
            {
              onText: (text) => {
                if (!silent) {
                  // 第一个文本块到达时停止 spinner
                  if (streamedText === '') {
                    thinkingSpinner.stop();
                  }
                  process.stdout.write(text);
                }
                streamedText += text;
              },
              signal: abortController?.signal,
            }
          );
        },
        { maxRetries: 3 },
        (attempt, error, delay) => {
          if (!silent) {
            // 重试前清除已输出的部分文本
            if (streamedText) {
              const lineCount = streamedText.split('\n').length;
              if (lineCount > 1) {
                process.stdout.write(`\x1b[${lineCount - 1}F`);
              } else {
                process.stdout.write('\r');
              }
              process.stdout.write('\x1b[J');
            }
            const theme = getTheme();
            console.log(theme.warning(`⚠ API 请求失败，${(delay / 1000).toFixed(1)}秒后重试 (${attempt}/3)... [${error.message}]`));
            thinkingSpinner.start();
          }
        }
      );

      // 3. 停止思考动画（如果还在转）
      if (!silent) {
        thinkingSpinner.stop();
      }

      // 3.5 记录 Token 使用
      if (tokenTracker && streamResult.usage) {
        tokenTracker.addRecord(streamResult.usage);
      }

      // 4. 处理中断
      if (streamResult.stopReason === 'interrupted' || abortController?.signal.aborted) {
        if (!silent && streamedText) {
          process.stdout.write('\n');
          const theme = getTheme();
          console.log(theme.textDim('\n[生成已中断]'));
        }
        // 将已接收文本作为部分响应添加到历史
        if (streamedText) {
          currentHistory.push({
            role: 'assistant',
            content: [{ type: 'text', text: streamedText }],
          });
        }
        break;
      }

      // 5. 提取工具调用信息
      const { toolCalls, stopReason } = streamResult;
      const isFinalResponse = toolCalls.length === 0 || (stopReason !== 'tool_use' && stopReason !== 'tool_calls');

      // 6. 流式文本输出后处理（最终响应使用 Markdown 渲染）
      if (!silent && streamedText) {
        if (isFinalResponse && isMarkdownContent(streamedText)) {
          // 清除原始流式输出，替换为 Markdown 渲染版本
          const lineCount = streamedText.split('\n').length;
          if (lineCount > 1) {
            process.stdout.write(`\x1b[${lineCount - 1}F`);
          } else {
            process.stdout.write('\r');
          }
          process.stdout.write('\x1b[J');
          const rendered = renderMarkdown(streamedText);
          process.stdout.write(rendered);
        } else {
          process.stdout.write('\n');
        }
      }

      // 7. 将助手消息添加到历史
      currentHistory.push(streamResult.assistantMessage);

      // 8. 如果没有工具调用，结束循环
      if (isFinalResponse) {
        break;
      }

      // 8. 记录工具调用（用于 reminder）
      const toolNames = toolCalls.map(tc => tc.name);
      reminderManager.recordToolCalls(toolNames);

      // 9. 权限检查（串行检查，可能触发用户确认 UI）
      if (permissionManager) {
        for (const toolCall of toolCalls) {
          const checkResult = permissionManager.check(toolCall.name, toolCall.input);

          if (!checkResult.allowed) {
            // 权限被拒绝
            const toolResults: ToolResult[] = [{
              tool_use_id: toolCall.id,
              content: `权限被拒绝: ${checkResult.reason || '操作不被允许'}`,
              is_error: true,
            }];
            const toolResultsMessage = adapter.formatToolResults(toolResults);
            currentHistory.push(toolResultsMessage);
            continue;
          }

          if (checkResult.needsConfirmation && !silent) {
            // 触发 hook
            if (hookManager?.hasHooksFor('PermissionRequest')) {
              await hookManager.emit('PermissionRequest', {
                toolName: toolCall.name,
                toolInput: toolCall.input,
              });
            }

            const confirmation = await permissionManager.promptConfirmation(
              toolCall.name,
              toolCall.input,
              checkResult.reason
            );

            if (confirmation === 'deny') {
              const toolResults: ToolResult[] = [{
                tool_use_id: toolCall.id,
                content: '用户拒绝了此操作',
                is_error: true,
              }];
              const toolResultsMessage = adapter.formatToolResults(toolResults);
              currentHistory.push(toolResultsMessage);
              continue;
            }
          }
        }
      }

      // 10. PreToolUse Hook
      if (hookManager?.hasHooksFor('PreToolUse')) {
        for (const toolCall of toolCalls) {
          const hookResults = await hookManager.emit('PreToolUse', {
            toolName: toolCall.name,
            toolInput: toolCall.input,
          });

          // 检查是否被 hook 阻止
          const blocked = hookResults.some(r => r.blocked);
          if (blocked) {
            if (!silent) {
              console.log(`  ⚠️ Hook 阻止了工具 ${toolCall.name} 的执行`);
            }
          }
        }
      }

      // 11. 并行执行所有工具
      const toolResults: ToolResult[] = [];

      // 并行执行所有工具调用
      const toolPromises = toolCalls.map(async (toolCall, index) => {
        const toolIndex = totalToolCount + index + 1;
        const elapsed = (Date.now() - startTime) / 1000;

        try {
          // 显示工具开始（非静默模式）
          if (!silent) {
            ToolDisplay.printStart(
              toolCall.name,
              JSON.stringify(toolCall.input).slice(0, 50)
            );
          }

          // 回调（用于子代理进度显示）
          if (onToolCall) {
            onToolCall(toolCall.name, toolIndex, elapsed);
          }

          // 执行工具
          const result = await executeTool(toolCall.name, toolCall.input);

          // PostToolUse Hook
          if (hookManager?.hasHooksFor('PostToolUse')) {
            await hookManager.emit('PostToolUse', {
              toolName: toolCall.name,
              toolInput: toolCall.input,
              toolOutput: result,
            });
          }

          // 显示工具结果（非静默模式）
          const isError = result.startsWith('错误:') || result.startsWith('Error:');

          if (!silent) {
            if (isError) {
              ToolDisplay.printOutput(result, { isError: true, maxLines: 5 });
            } else {
              // 显示摘要
              const summary = result.split('\n')[0].slice(0, 80);
              ToolDisplay.printResult(summary);
            }
          }

          // 返回结果
          return {
            tool_use_id: toolCall.id,
            content: result,
            is_error: isError,
          };
        } catch (error: unknown) {
          const errorMsg = error instanceof Error ? error.message : String(error);

          // PostToolUseFailure Hook
          if (hookManager?.hasHooksFor('PostToolUseFailure')) {
            await hookManager.emit('PostToolUseFailure', {
              toolName: toolCall.name,
              toolInput: toolCall.input,
              error: errorMsg,
            });
          }

          if (!silent) {
            ToolDisplay.printOutput(`工具执行失败: ${errorMsg}`, { isError: true });
          }

          return {
            tool_use_id: toolCall.id,
            content: `工具执行失败: ${errorMsg}`,
            is_error: true,
          };
        }
      });

      // 等待所有工具执行完成
      const results = await Promise.all(toolPromises);
      toolResults.push(...results);
      totalToolCount += toolCalls.length;

      // 12. 格式化工具结果并添加到历史
      const toolResultsMessage = adapter.formatToolResults(toolResults);
      currentHistory.push(toolResultsMessage);

    } catch (error: unknown) {
      // API 调用失败
      if (!silent) {
        thinkingSpinner.stop();
      }

      // 检查是否是中断导致的错误
      if (abortController?.signal.aborted) {
        if (!silent) {
          if (streamedText) {
            process.stdout.write('\n');
          }
          const theme = getTheme();
          console.log(theme.textDim('\n[生成已中断]'));
        }
        if (streamedText) {
          currentHistory.push({
            role: 'assistant',
            content: [{ type: 'text', text: streamedText }],
          });
        }
        break;
      }

      const errorMsg = error instanceof Error ? error.message : String(error);
      if (!silent) {
        console.error(`\nAPI 调用失败: ${errorMsg}`);
      }

      throw error;
    }
  }

  if (turns >= maxTurns && !silent) {
    console.warn(`\n警告: 达到最大轮次限制 (${maxTurns})`);
  }

  return currentHistory;
}

/**
 * 兼容旧版调用方式
 */
export async function agentLoopLegacy(
  history: Message[],
  systemPrompt: string,
  tools: ToolDefinition[],
  adapter: ProtocolAdapter,
  executeTool: ExecuteToolFunc,
  maxTokens: number = 4096,
  maxTurns: number = 20
): Promise<Message[]> {
  return agentLoop(history, systemPrompt, tools, adapter, executeTool, {
    maxTokens,
    maxTurns,
  });
}
