/**
 * GroupedToolUseView — 分组工具调用视图
 *
 * 将连续的 tool_use + tool_result 展示为分组列表。
 * - 同一工具内：工具头与结果仍紧贴（由 ToolUseView / ToolResultView + MessageResponse 负责）。
 * - 工具与工具之间：`column` + `gap={1}`插入一行间距（连续3+ 个 tool 块时否则会粘在一起）。
 */

import { Box } from '../../primitives.js';
import type { CompletedItem } from '../../types.js';
import { ToolUseView } from '../ToolUseView.js';
import { ToolResultView } from '../ToolResultView.js';

type ToolUseItem = Extract<CompletedItem, { type: 'tool_use' }>;
type ToolResultItem = Extract<CompletedItem, { type: 'tool_result' }>;

export interface GroupedToolUseViewProps {
  items: CompletedItem[];
}

export function GroupedToolUseView({ items }: GroupedToolUseViewProps) {
  // 配对 tool_use 与 tool_result
  const pairs: { use: ToolUseItem; result?: ToolResultItem }[] = [];
  for (const item of items) {
    if (item.type === 'tool_use') {
      pairs.push({ use: item });
    } else if (item.type === 'tool_result') {
      // 匹配最后一个未配对的 use
      const last = [...pairs].reverse().find((p) => p.use.toolUseId === item.toolUseId && !p.result);
      if (last) {
        last.result = item;
      }
    }
  }

  return (
    <Box flexDirection="column" gap={1}>
      {pairs.map((pair) => (
        <Box key={pair.use.id} flexDirection="column">
          <ToolUseView
            name={pair.use.name}
            detail={pair.use.detail}
            status={pair.use.status === 'error' ? 'error' : 'done'}
            animate={false}
          />
          {pair.result && (
            <ToolResultView
              name={pair.result.name}
              content={pair.result.content}
              isError={pair.result.isError}
              input={pair.result.input}
            />
          )}
        </Box>
      ))}
    </Box>
  );
}
