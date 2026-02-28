/**
 * UIController 接口
 * 抽象所有 UI 输出操作，使核心逻辑与具体 UI 实现解耦
 */

/**
 * UI 控制器接口
 */
export interface UIController {
  /** 显示思考中动画 */
  showThinking(): void;

  /** 隐藏思考中动画 */
  hideThinking(): void;

  /** 追加流式文本 */
  appendStreamText(text: string): void;

  /** 完成流式输出，渲染最终文本 */
  finalizeStream(fullText: string, isMarkdown: boolean): void;

  /** 显示工具开始执行 */
  showToolStart(toolName: string, input?: Record<string, unknown>): void;

  /** 显示工具执行结果 */
  showToolResult(toolName: string, result: string, input?: Record<string, unknown>): void;

  /** 显示工具输出（多行） */
  showToolOutput(output: string, opts?: { isError?: boolean; maxLines?: number }): void;

  /** 显示工具错误 */
  showToolError(toolName: string, error: string): void;

  /** 请求权限确认 */
  requestPermission(
    toolName: string,
    params: Record<string, unknown>,
    reason?: string
  ): Promise<'allow' | 'deny' | 'always'>;

  /** 显示警告消息 */
  showWarning(msg: string): void;

  /** 显示错误消息 */
  showError(msg: string): void;

  /** 显示信息消息 */
  showInfo(msg: string): void;

  /** 显示重试提示 */
  showRetry(attempt: number, max: number, delay: number, error: string): void;

  /** 清除已输出的流式文本（用于重试/markdown 替换） */
  clearStreamedText(lineCount: number): void;
}
