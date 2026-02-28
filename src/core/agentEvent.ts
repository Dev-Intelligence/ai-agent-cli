/**
 * AgentEvent — 代理循环事件流类型定义
 *
 * Generator 版 agentLoop 产出的事件联合类型，
 * 彻底解耦业务逻辑与 UI 渲染。
 */

import type { Message } from './types.js';

export type AgentEvent =
  | { type: 'thinking_start' }
  | { type: 'thinking_stop' }
  | { type: 'stream_text'; text: string }
  | { type: 'stream_done'; fullText: string }
  | { type: 'tool_start'; toolName: string; input: Record<string, unknown> }
  | { type: 'tool_result'; toolName: string; result: string; isError: boolean }
  | {
      type: 'permission_request';
      toolName: string;
      params: Record<string, unknown>;
      reason?: string;
      resolve: (r: 'allow' | 'deny' | 'always') => void;
    }
  | { type: 'retry'; attempt: number; maxAttempts: number; delay: number; error: string }
  | { type: 'error'; message: string }
  | { type: 'info'; message: string }
  | { type: 'warning'; message: string }
  | { type: 'turn_complete'; history: Message[] };
