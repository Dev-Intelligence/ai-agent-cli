/**
 * InkUIController - 通过 AppStore 驱动 Ink UI
 *
 * 不再依赖 bind() 回调注入，直接操作外部 Store。
 */

import type { UIController } from '../UIController.js';
import type { AgentEvent } from '../../core/agentEvent.js';
import type { AppStore } from './store.js';
import { isMarkdownContent } from '../markdown.js';
import { renderPermissionDialog } from './dialogs/renderPermissionDialog.js';

/**
 * 基于 Ink + AppStore 的 UI 控制器实现
 */
export class InkUIController implements UIController {
  private store: AppStore;

  // 流式文本批量 flush 相关
  private _streamFlushTimer: ReturnType<typeof setTimeout> | null = null;
  private _currentStreamText = '';

  constructor(store: AppStore) {
    this.store = store;
  }

  getStore(): AppStore {
    return this.store;
  }

  /**
   * 处理 AgentEvent — generator 事件驱动入口
   */
  async handleEvent(event: AgentEvent): Promise<void> {
    switch (event.type) {
      case 'thinking_start':
        this.showThinking();
        break;

      case 'thinking_stop':
        this.hideThinking();
        break;

      case 'stream_text':
        this.appendStreamText(event.text);
        break;

      case 'stream_done':
        this.finalizeStream(event.fullText, isMarkdownContent(event.fullText));
        break;

      case 'tool_start':
        this.showToolStart(event.toolName, event.input);
        break;

      case 'tool_result':
        if (event.isError) {
          this.showToolOutput(event.result, { isError: true, maxLines: 5 });
        } else {
          this.showToolResult(event.toolName, event.result);
        }
        break;

      case 'permission_request': {
        const result = await this.requestPermission(
          event.toolName,
          event.params,
          event.reason
        );
        event.resolve(result);
        break;
      }

      case 'retry':
        this.showRetry(event.attempt, event.maxAttempts, event.delay, event.error);
        this.showThinking();
        break;

      case 'error':
        this.showError(event.message);
        break;

      case 'info':
        this.showInfo(event.message);
        break;

      case 'warning':
        this.showWarning(event.message);
        break;

      case 'turn_complete':
        // 由调用者处理
        break;
    }
  }

  showThinking(): void {
    this.store.setPhase({ type: 'thinking' });
  }

  hideThinking(): void {
    // 不切换到 input，等待后续 phase 设置
  }

  appendStreamText(text: string): void {
    this._currentStreamText += text;

    // 16ms 批量 flush 避免频繁重渲染
    if (!this._streamFlushTimer) {
      this._streamFlushTimer = setTimeout(() => {
        this._flushStream();
      }, 16);
    }
  }

  private _flushStream(): void {
    this._streamFlushTimer = null;
    this.store.setPhase({ type: 'streaming', text: this._currentStreamText });
  }

  clearStreamedText(_lineCount: number): void {
    this._currentStreamText = '';
    if (this._streamFlushTimer) {
      clearTimeout(this._streamFlushTimer);
      this._streamFlushTimer = null;
    }
  }

  finalizeStream(fullText: string, _isMarkdown: boolean): void {
    if (this._streamFlushTimer) {
      clearTimeout(this._streamFlushTimer);
      this._streamFlushTimer = null;
    }

    this.store.addCompleted({
      type: 'ai_message',
      text: fullText,
    });

    this._currentStreamText = '';
    this.store.setPhase({ type: 'input' });
  }

  showToolStart(toolName: string, input?: Record<string, unknown>): void {
    const detail = input ? JSON.stringify(input).slice(0, 50) : undefined;
    this.store.setPhase({ type: 'tool_active', name: toolName, detail });
  }

  showToolResult(toolName: string, result: string, _input?: Record<string, unknown>): void {
    const summary = result.split('\n')[0].slice(0, 80);
    this.store.addCompleted({
      type: 'tool_call',
      name: toolName,
      result: summary,
    });
  }

  showToolOutput(output: string, opts?: { isError?: boolean; maxLines?: number }): void {
    this.store.addCompleted({
      type: 'tool_call',
      name: 'output',
      result: output,
      isError: opts?.isError,
    });
  }

  showToolError(toolName: string, error: string): void {
    this.store.addCompleted({
      type: 'tool_call',
      name: toolName,
      result: error,
      isError: true,
    });
  }

  async requestPermission(
    toolName: string,
    params: Record<string, unknown>,
    reason?: string
  ): Promise<'allow' | 'deny' | 'always'> {
    // 使用独立 Ink 实例渲染权限对话框，不阻塞主 UI
    return renderPermissionDialog(toolName, params, reason);
  }

  showWarning(msg: string): void {
    this.store.addCompleted({
      type: 'system',
      level: 'warning',
      text: msg,
    });
  }

  showError(msg: string): void {
    this.store.addCompleted({
      type: 'system',
      level: 'error',
      text: msg,
    });
  }

  showInfo(msg: string): void {
    this.store.addCompleted({
      type: 'system',
      level: 'info',
      text: msg,
    });
  }

  showRetry(attempt: number, max: number, delay: number, error: string): void {
    this.store.addCompleted({
      type: 'system',
      level: 'warning',
      text: `API 请求失败，${(delay / 1000).toFixed(1)}秒后重试 (${attempt}/${max})... [${error}]`,
    });
  }

  goToInput(): void {
    this.store.setPhase({ type: 'input' });
  }

  addUserMessage(text: string): void {
    this.store.addCompleted({
      type: 'user_message',
      text,
    });
  }
}
