/**
 * CollapsedReadSearchView — 折叠的读/搜索工具摘要
 *
 *   ⏺ Read 6 files, searched 3 patterns
 *
 * 将多个连续的 read/search/glob 工具调用折叠为单行。
 * dim 灰色显示，⏺ 前缀与 ToolUseView 一致。
 */

import { Box, Text } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';

type ToolUseItem = Extract<CompletedItem, { type: 'tool_use' }>;

export interface CollapsedReadSearchViewProps {
  items: CompletedItem[];
}

/** 读/搜索类工具名集合 */
const READ_SEARCH_TOOLS = new Set([
  'read_file', 'Read', 'FileReadTool',
  'search', 'Grep', 'grep', 'GrepTool',
  'glob', 'Glob', 'GlobTool',
  'find_file', 'list_dir',
  'WebSearch', 'web_search',
  'WebFetch', 'web_fetch',
]);

export function isReadSearchTool(name: string): boolean {
  return READ_SEARCH_TOOLS.has(name);
}

/**
 * 构建折叠摘要文本
 */
function buildSummaryText(toolUses: ToolUseItem[]): string {
  const groups = new Map<string, number>();
  for (const t of toolUses) {
    const name = normalizeToolName(t.name);
    groups.set(name, (groups.get(name) || 0) + 1);
  }

  const parts: string[] = [];
  for (const [name, count] of groups) {
    switch (name) {
      case 'Read':
        parts.push(`Read ${count} file${count > 1 ? 's' : ''}`);
        break;
      case 'Grep':
        parts.push(`searched ${count} pattern${count > 1 ? 's' : ''}`);
        break;
      case 'Glob':
        parts.push(`globbed ${count} pattern${count > 1 ? 's' : ''}`);
        break;
      case 'WebSearch':
        parts.push(`${count} web search${count > 1 ? 'es' : ''}`);
        break;
      case 'WebFetch':
        parts.push(`fetched ${count} URL${count > 1 ? 's' : ''}`);
        break;
      default:
        parts.push(`${name} ×${count}`);
    }
  }

  return parts.join(', ');
}

function normalizeToolName(name: string): string {
  if (name === 'read_file' || name === 'Read' || name === 'FileReadTool') return 'Read';
  if (name === 'search' || name === 'Grep' || name === 'grep' || name === 'GrepTool') return 'Grep';
  if (name === 'glob' || name === 'Glob' || name === 'GlobTool') return 'Glob';
  if (name === 'WebSearch' || name === 'web_search') return 'WebSearch';
  if (name === 'WebFetch' || name === 'web_fetch') return 'WebFetch';
  return name;
}

export function CollapsedReadSearchView({ items }: CollapsedReadSearchViewProps) {
  const toolUses = items.filter((i): i is ToolUseItem => i.type === 'tool_use');
  const summary = buildSummaryText(toolUses);

  // 提取文件路径列表（最多显示 3 个）
  const filePaths = toolUses
    .map((t) => t.detail)
    .filter(Boolean)
    .slice(0, 3);

  const pathHint = filePaths.length > 0
    ? ` (${filePaths.join(', ')}${toolUses.length > 3 ? ', ...' : ''})`
    : '';

  return (
    <Box flexDirection="row" height={1}>
      <Box minWidth={2}>
        <Text dimColor>⏺</Text>
      </Box>
      <Text dimColor>
        {summary}{pathHint}
      </Text>
    </Box>
  );
}
