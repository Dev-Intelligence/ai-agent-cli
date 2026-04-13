/**
 * HistorySearchDialog — 历史搜索对话框
 *
 * 使用 FuzzyPicker 展示输入历史，支持模糊搜索和子序列匹配。
 * 数据源使用当前项目的 getInputHistory()。
 */

import React, { useMemo, useState } from 'react';
import { Box, Text } from '../primitives.js';
import { FuzzyPicker } from './design-system/FuzzyPicker.js';
import { useRegisterOverlay } from '../context/overlayContext.js';
import { useTerminalSize } from '../hooks/useTerminalSize.js';

type Props = {
  /** 初始搜索查询 */
  initialQuery?: string;
  /** 历史记录列表（由调用方传入） */
  history: string[];
  /** 选中后回调 */
  onSelect: (entry: string) => void;
  /** 取消回调 */
  onCancel: () => void;
};

type HistoryItem = {
  /** 原始文本 */
  text: string;
  /** 小写版本（用于搜索） */
  lower: string;
  /** 首行（用于列表展示） */
  firstLine: string;
  /** 唯一标识 */
  key: string;
};

const PREVIEW_ROWS = 6;

/** 子序列匹配：query 的每个字符在 text 中按序出现 */
function isSubsequence(text: string, query: string): boolean {
  let j = 0;
  for (let i = 0; i < text.length && j < query.length; i++) {
    if (text[i] === query[j]) j++;
  }
  return j === query.length;
}

/** 截断文本到指定宽度 */
function truncateToWidth(text: string, width: number): string {
  if (text.length <= width) return text;
  return text.slice(0, width - 1) + '…';
}

export function HistorySearchDialog({
  initialQuery,
  history,
  onSelect,
  onCancel,
}: Props): React.ReactNode {
  useRegisterOverlay('history-search');
  const { columns } = useTerminalSize();

  const [query, setQuery] = useState(initialQuery ?? '');

  // 将历史记录转为可搜索项
  const items = useMemo((): HistoryItem[] => {
    return history.map((text, i) => {
      const nl = text.indexOf('\n');
      return {
        text,
        lower: text.toLowerCase(),
        firstLine: nl === -1 ? text : text.slice(0, nl),
        key: `${i}-${text.slice(0, 20)}`,
      };
    });
  }, [history]);

  // 过滤：精确包含 > 子序列匹配
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return items;
    const exact: HistoryItem[] = [];
    const fuzzy: HistoryItem[] = [];
    for (const item of items) {
      if (item.lower.includes(q)) {
        exact.push(item);
      } else if (isSubsequence(item.lower, q)) {
        fuzzy.push(item);
      }
    }
    return exact.concat(fuzzy);
  }, [items, query]);

  const listWidth = Math.max(30, columns - 6);
  const previewWidth = Math.max(20, columns - 10);

  return (
    <FuzzyPicker
      title="Search prompts"
      placeholder="Filter history…"
      initialQuery={initialQuery}
      items={filtered}
      getKey={item => item.key}
      onQueryChange={setQuery}
      onSelect={item => onSelect(item.text)}
      onCancel={onCancel}
      emptyMessage={q =>
        q ? 'No matching prompts' : 'No history yet'
      }
      selectAction="use"
      direction="up"
      previewPosition="bottom"
      renderItem={(item, isFocused) => (
        <Text color={isFocused ? 'cyan' : undefined}>
          {truncateToWidth(item.firstLine, listWidth)}
        </Text>
      )}
      renderPreview={item => {
        const lines = item.text.split('\n').filter(l => l.trim() !== '');
        const overflow = lines.length > PREVIEW_ROWS;
        const shown = lines.slice(0, overflow ? PREVIEW_ROWS - 1 : PREVIEW_ROWS);
        const more = lines.length - shown.length;
        return (
          <Box
            flexDirection="column"
            borderStyle="round"
            borderDimColor
            paddingX={1}
            height={PREVIEW_ROWS + 2}
          >
            {shown.map((row, i) => (
              <Text key={i} dimColor>
                {truncateToWidth(row, previewWidth)}
              </Text>
            ))}
            {more > 0 && <Text dimColor>{`… +${more} more lines`}</Text>}
          </Box>
        );
      }}
    />
  );
}
