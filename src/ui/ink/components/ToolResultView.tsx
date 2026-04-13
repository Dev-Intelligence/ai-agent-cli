/**
 * ToolResultView — 工具结果展示
 *
 * - 取消/拒绝 → FallbackToolUseRejectedMessage
 * - edit_file 成功 → FileEditToolUpdatedMessage（含 diff 统计 + StructuredDiffList）
 * - edit_file 失败 → FallbackToolUseErrorMessage
 * - write_file → 文件名单行
 * - read_file → 行数摘要 + 语法高亮前几行
 * - bash → 截断输出
 * - 其他错误 → FallbackToolUseErrorMessage
 */

import path from 'node:path';
import { Box, Text } from '../primitives.js';
import { TOOL_CANCEL_MESSAGE, TOOL_REJECT_MESSAGE } from '../../../core/constants.js';
import { getInkColors } from '../../theme.js';
import { HighlightedCode } from './HighlightedCode.js';
import { MessageResponse } from './MessageResponse.js';
import { getPatchFromContents } from '../../../utils/diff.js';
import { FallbackToolUseErrorMessage } from './FallbackToolUseErrorMessage.js';
import { FallbackToolUseRejectedMessage } from './FallbackToolUseRejectedMessage.js';
import { FileEditToolUpdatedMessage } from './FileEditToolUpdatedMessage.js';

// ─── Props ───

export interface ToolResultViewProps {
  name: string;
  content: string;
  isError?: boolean;
  input?: Record<string, unknown>;
}

// ─── 常量 ───

const MAX_RENDERED_LINES = 10;
const MAX_READ_FILE_LINES = 5;

// ─── 工具类型判断 ───

function isEditTool(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n === 'edit_file' || n === 'edit' || n === 'fileedittool' ||
    n === 'str_replace_based_edit_tool'
  );
}

function isReadTool(name: string): boolean {
  const n = name.toLowerCase();
  return n === 'read_file' || n === 'read' || n === 'filereadtool' || n === 'view_file';
}

function isWriteTool(name: string): boolean {
  const n = name.toLowerCase();
  return (
    n === 'write_file' || n === 'write' || n === 'filewritetool' ||
    n === 'create_file'
  );
}

function isBashTool(name: string): boolean {
  return name.toLowerCase() === 'bash';
}

// ─── 辅助函数 ───

/** 从 input 中提取文件路径 */
function getFilePath(input?: Record<string, unknown>): string {
  if (!input) return '';
  for (const key of ['file_path', 'path', 'relative_path']) {
    if (typeof input[key] === 'string') return input[key] as string;
  }
  return '';
}

/** 从文件路径推断语言 */
function getLanguageFromPath(filePath: string): string {
  const ext = path.extname(filePath).slice(1);
  return ext || 'plaintext';
}

/** 截断文本并返回剩余行数 */
function truncateLines(text: string, maxLines: number): { shown: string; extra: number } {
  const lines = text.split('\n');
  const shown = lines.slice(0, maxLines).join('\n');
  const extra = Math.max(0, lines.length - maxLines);
  return { shown, extra };
}

// ─── 组件 ───

export function ToolResultView({ name, content, isError, input }: ToolResultViewProps) {
  const colors = getInkColors();
  const trimmed = content.trim();

  // ─── 取消 ───
  if (trimmed === TOOL_CANCEL_MESSAGE) {
    return <FallbackToolUseRejectedMessage />;
  }

  // ─── 拒绝 ───
  if (trimmed === TOOL_REJECT_MESSAGE) {
    return <FallbackToolUseRejectedMessage />;
  }

  // ─── edit_file 成功：FileEditToolUpdatedMessage（含 diff 统计 + StructuredDiffList）───
  if (isEditTool(name) && !isError && input) {
    const oldStr = typeof input.old_string === 'string' ? input.old_string : '';
    const newStr = typeof input.new_string === 'string' ? input.new_string : '';
    const filePath = getFilePath(input);

    if (oldStr || newStr) {
      const hunks = getPatchFromContents({
        filePath: filePath || 'file',
        oldContent: oldStr,
        newContent: newStr,
      });

      if (hunks.length > 0) {
        return <FileEditToolUpdatedMessage filePath={filePath} hunks={hunks} />;
      }
    }

    // diff 为空 → 单行摘要
    return (
      <MessageResponse height={1}>
        <Text dimColor>{trimmed || 'File updated'}</Text>
      </MessageResponse>
    );
  }

  // ─── edit_file 失败 ───
  if (isEditTool(name) && isError) {
    return <FallbackToolUseErrorMessage result={trimmed} verbose={false} />;
  }

  // ─── write_file：简洁摘要 ───
  if (isWriteTool(name) && !isError) {
    const filePath = getFilePath(input);
    return (
      <MessageResponse height={1}>
        <Text color={colors.success}>{filePath ? path.basename(filePath) : trimmed}</Text>
      </MessageResponse>
    );
  }

  // ─── read_file：结构化摘要（行数）+ 可选语法高亮 ───
  if (isReadTool(name) && !isError) {
    const contentText = trimmed || '(No content)';
    if (contentText === 'Read image' || contentText === 'Read pdf') {
      return (
        <MessageResponse height={1}>
          <Text dimColor>{contentText}</Text>
        </MessageResponse>
      );
    }
    const filePath = getFilePath(input);
    const language = getLanguageFromPath(filePath);
    const lines = contentText.split('\n');
    const numLines = lines.length;
    const { shown, extra } = truncateLines(contentText, MAX_READ_FILE_LINES);

    return (
      <MessageResponse>
        <Box flexDirection="column">
          <Text dimColor>
            Read <Text bold>{numLines}</Text> {numLines === 1 ? 'line' : 'lines'}
          </Text>
          <HighlightedCode code={shown || '(No content)'} language={language} filePath={filePath} />
          {extra > 0 && (
            <Text dimColor>... (+{extra} lines)</Text>
          )}
        </Box>
      </MessageResponse>
    );
  }

  // ─── bash：输出截断展示 ───
  if (isBashTool(name) && !isError) {
    if (!trimmed) {
      return (
        <MessageResponse height={1}>
          <Text dimColor>(no output)</Text>
        </MessageResponse>
      );
    }
    const { shown, extra } = truncateLines(trimmed, MAX_RENDERED_LINES);
    return (
      <MessageResponse>
        <Box flexDirection="column">
          <Text dimColor>{shown}</Text>
          {extra > 0 && (
            <Text dimColor>... (+{extra} lines)</Text>
          )}
        </Box>
      </MessageResponse>
    );
  }

  // ─── 其他错误结果 → FallbackToolUseErrorMessage ───
  if (isError) {
    return <FallbackToolUseErrorMessage result={trimmed} verbose={false} />;
  }

  // ─── 通用 fallback ───
  if (!trimmed) return null;

  const { shown, extra } = truncateLines(trimmed, MAX_RENDERED_LINES);
  return (
    <MessageResponse>
      <Box flexDirection="column">
        <Text dimColor>{shown}</Text>
        {extra > 0 && (
          <Text dimColor>... (+{extra} lines)</Text>
        )}
      </Box>
    </MessageResponse>
  );
}
