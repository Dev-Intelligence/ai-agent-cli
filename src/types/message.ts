/**
 * types/message — 消息类型系统
 *
 * 定义对话中所有消息的类型联合体。
 *
 * 包含：用户消息、助手消息、系统消息、进度消息、附件消息等。
 *
 * ai-agent-cli 在保留现有 CompletedItem 类型的同时，
 */

import type { UUID } from 'crypto';

// ─── 基础内容块类型（对齐 Anthropic SDK） ───

export interface TextBlock {
  type: 'text';
  text: string;
}

export interface ToolUseBlock {
  type: 'tool_use';
  id: string;
  name: string;
  input: Record<string, unknown>;
}

export interface ToolResultBlock {
  type: 'tool_result';
  tool_use_id: string;
  content: string | Array<TextBlock | { type: 'image'; source: unknown }>;
  is_error?: boolean;
  toolName?: string;
}

export interface ThinkingBlock {
  type: 'thinking';
  thinking: string;
}

export type ContentBlock = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock;

// ─── 消息内容参数（发送给 API 的格式） ───

export type ContentBlockParam = TextBlock | ToolUseBlock | ToolResultBlock | ThinkingBlock;


/** 用户消息 */
export interface UserMessage {
  type: 'user';
  uuid: UUID;
  /** 是否为元消息（工具结果、系统注入等） */
  isMeta?: boolean;
  /** 是否仅在转录模式可见 */
  isVisibleInTranscriptOnly?: boolean;
  message: {
    role: 'user';
    content: ContentBlockParam[];
  };
}

/** 助手消息 */
export interface AssistantMessage {
  type: 'assistant';
  uuid: UUID;
  /** 是否为 API 错误消息 */
  isApiErrorMessage?: boolean;
  message: {
    role: 'assistant';
    content: ContentBlockParam[];
  };
}

/** 系统消息 */
export interface SystemMessage {
  type: 'system';
  uuid: UUID;
  subtype: string;
  message: {
    role: 'user';
    content: ContentBlockParam[];
  };
}

/** 进度消息 */
export interface ProgressMessage {
  type: 'progress';
  uuid: UUID;
  message: {
    role: 'user';
    content: ContentBlockParam[];
  };
}

/** 附件消息 */
export interface AttachmentMessage {
  type: 'attachment';
  uuid: UUID;
  attachment: {
    type: string;
    isMeta?: boolean;
    origin?: unknown;
    commandMode?: string;
    prompt?: string | ContentBlockParam[];
  };
  message: {
    role: 'user';
    content: ContentBlockParam[];
  };
}

/** 墓碑消息（已删除/压缩的占位符） */
export interface TombstoneMessage {
  type: 'tombstone';
  uuid: UUID;
  message: {
    role: 'user';
    content: ContentBlockParam[];
  };
}

// ─── 消息联合体 ───

export type NormalizedMessage = UserMessage | AssistantMessage;

export type RichMessage =
  | UserMessage
  | AssistantMessage
  | SystemMessage
  | ProgressMessage
  | AttachmentMessage
  | TombstoneMessage;

/**
 * RenderableMessage — 用于 UI 渲染的消息类型
 * 包含原始消息 + 分组消息 + 折叠消息
 */
export type RenderableMessage = RichMessage | {
  type: 'grouped_tool_use';
  uuid: UUID;
  toolName: string;
  messages: RichMessage[];
} | {
  type: 'collapsed_read_search';
  uuid: UUID;
  toolName: string;
  messages: RichMessage[];
  count: number;
};

// ─── 流式类型 ───

export interface StreamingToolUse {
  toolUseId: string;
  name: string;
  contentBlock: unknown;
}

export interface StreamingThinking {
  thinking: string;
}

export interface StreamEvent {
  type: 'stream_event';
  event: unknown;
}

export interface RequestStartEvent {
  type: 'stream_request_start';
}

// ─── 消息查找表类型 ───

export interface MessageLookups {
  /** tool_use_id → 对应的 tool_use 消息 */
  toolUseByToolUseID: Map<string, AssistantMessage>;
  /** tool_use_id → 对应的 tool_result 消息 */
  toolResultByToolUseID: Map<string, UserMessage>;
  /** 消息 uuid → 消息 */
  messageByUuid: Map<UUID, RichMessage>;
}

// ─── 辅助函数 ───

/** 从消息中获取 tool_use_id */
export function getToolUseID(msg: RichMessage): string | null {
  if (msg.type !== 'assistant' && msg.type !== 'user') return null;
  const block = msg.message.content[0];
  if (!block) return null;
  if (block.type === 'tool_use') return block.id;
  if (block.type === 'tool_result') return block.tool_use_id;
  return null;
}

/** 从消息中获取所有 tool_use_id */
export function getToolUseIDs(msg: RichMessage): string[] {
  if (msg.type !== 'assistant' && msg.type !== 'user') return [];
  return msg.message.content
    .filter((b): b is ToolUseBlock | ToolResultBlock => b.type === 'tool_use' || b.type === 'tool_result')
    .map((b) => b.type === 'tool_use' ? b.id : (b as ToolResultBlock).tool_use_id);
}

/** 判断消息是否为空 */
export function isNotEmptyMessage(msg: RichMessage): boolean {
  if (msg.type === 'tombstone') return false;
  const content = msg.message.content;
  if (content.length === 0) return false;
  if (content.length === 1 && content[0]!.type === 'text' && (content[0] as TextBlock).text.trim() === '') return false;
  return true;
}

/** 从消息中提取文本内容 */
export function extractTextContent(content: ContentBlockParam[], separator = '\n'): string {
  return content
    .filter((b): b is TextBlock => b.type === 'text')
    .map((b) => b.text)
    .join(separator);
}

/** 判断是否应该显示用户消息 */
export function shouldShowUserMessage(msg: UserMessage): boolean {
  if (msg.isMeta) return false;
  if (msg.isVisibleInTranscriptOnly) return false;
  const block = msg.message.content[0];
  if (!block) return false;
  if (block.type === 'tool_result') return false;
  return true;
}
