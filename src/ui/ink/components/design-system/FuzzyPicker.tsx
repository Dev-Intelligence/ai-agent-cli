/**
 * FuzzyPicker — 通用模糊选择器
 *
 * 这是 SearchBox / HistorySearch / QuickOpen 一类交互的基础容器。
 * 当前先实现一个与现有项目兼容的轻量版本，提供：
 * - 查询输入框
 * - 结果列表
 * - 可选预览区
 * - Enter / Tab / Esc 等基础交互
 *
 * 过滤逻辑仍由调用方控制：组件只负责展示和导航。
 */

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Box, Text, useInput } from '../../primitives.js';
import TextInput from '../TextInput.js';
import { Pane } from './Pane.js';
import { Byline } from './Byline.js';
import { KeyboardShortcutHint } from './KeyboardShortcutHint.js';
import { ListItem } from './ListItem.js';
import { useTerminalSize } from '../../hooks/useTerminalSize.js';
import { useSearchInput } from '../../hooks/useSearchInput.js';

export interface PickerAction<T> {
  /** 底部提示中显示的动作名 */
  action: string;
  /** 当 Tab/Shift+Tab 触发时执行 */
  handler: (item: T) => void;
}

export interface FuzzyPickerProps<T> {
  title: string;
  placeholder?: string;
  initialQuery?: string;
  items: readonly T[];
  getKey: (item: T) => string;
  renderItem: (item: T, isFocused: boolean) => React.ReactNode;
  renderPreview?: (item: T) => React.ReactNode;
  previewPosition?: 'bottom' | 'right';
  visibleCount?: number;
  direction?: 'down' | 'up';
  onQueryChange: (query: string) => void;
  onSelect: (item: T) => void;
  onTab?: PickerAction<T>;
  onShiftTab?: PickerAction<T>;
  onFocus?: (item: T | undefined) => void;
  onCancel: () => void;
  emptyMessage?: string | ((query: string) => string);
  matchLabel?: string;
  selectAction?: string;
  extraHints?: React.ReactNode;
}

export function FuzzyPicker<T>({
  title,
  placeholder = '输入关键词搜索…',
  initialQuery = '',
  items,
  getKey,
  renderItem,
  renderPreview,
  previewPosition = 'bottom',
  visibleCount = 8,
  direction = 'down',
  onQueryChange,
  onSelect,
  onTab,
  onShiftTab,
  onFocus,
  onCancel,
  emptyMessage = '没有结果',
  matchLabel,
  selectAction = '选择',
  extraHints,
}: FuzzyPickerProps<T>): React.ReactNode {
  const { rows } = useTerminalSize();
  const [focusedIndex, setFocusedIndex] = useState(0);
  const resetHighlightedIndex = useCallback(() => {
    setFocusedIndex(0);
  }, []);
  const {
    query,
    cursorOffset,
    setQuery,
    setCursorOffset,
  } = useSearchInput({
    initialQuery,
    onQueryChange,
    resetHighlightedIndex,
  });

  useEffect(() => {
    setFocusedIndex((current) => Math.min(current, Math.max(0, items.length - 1)));
  }, [items.length]);

  const focusedItem = items[focusedIndex];

  useEffect(() => {
    onFocus?.(focusedItem);
  }, [focusedItem, onFocus]);

  const actualVisibleCount = Math.max(2, Math.min(visibleCount, Math.max(2, rows - 10)));
  const windowStart = Math.max(0, Math.min(focusedIndex - actualVisibleCount + 1, items.length - actualVisibleCount));
  const visibleItems = useMemo(
    () => items.slice(windowStart, windowStart + actualVisibleCount),
    [items, windowStart, actualVisibleCount],
  );

  const emptyText = typeof emptyMessage === 'function' ? emptyMessage(query) : emptyMessage;

  useInput((input, key) => {
    const step = (delta: number) => {
      setFocusedIndex((current) => {
        const maxIndex = Math.max(0, items.length - 1);
        return Math.max(0, Math.min(maxIndex, current + delta));
      });
    };

    if (key.escape) {
      onCancel();
      return;
    }

    if (key.upArrow || (key.ctrl && input === 'p')) {
      step(direction === 'up' ? 1 : -1);
      return;
    }

    if (key.downArrow || (key.ctrl && input === 'n')) {
      step(direction === 'up' ? -1 : 1);
      return;
    }

    if (key.return) {
      if (focusedItem) {
        onSelect(focusedItem);
      }
      return;
    }

    if (key.tab) {
      if (!focusedItem) {
        return;
      }

      const action = key.shift ? onShiftTab ?? onTab : onTab;
      if (action) {
        action.handler(focusedItem);
      } else {
        onSelect(focusedItem);
      }
    }
  });

  const searchBox = (
    <Box>
      <TextInput
        value={query}
        onChange={setQuery}
        onSubmit={() => {
          if (focusedItem) {
            onSelect(focusedItem);
          }
        }}
        onExit={onCancel}
        columns={Math.max(20, (process.stdout.columns || 80) - 6)}
        cursorOffset={cursorOffset}
        onChangeCursorOffset={setCursorOffset}
        focus
        placeholder={placeholder}
      />
    </Box>
  );

  const listBlock = (
    <Box flexDirection="column">
      {visibleItems.length === 0 ? (
        <Text dimColor>{emptyText}</Text>
      ) : (
        visibleItems.map((item, index) => {
          const actualIndex = windowStart + index;
          const isFocused = actualIndex === focusedIndex;
          return (
            <ListItem key={getKey(item)} isFocused={isFocused} styled={false}>
              {renderItem(item, isFocused)}
            </ListItem>
          );
        })
      )}
      {matchLabel && <Text dimColor>{matchLabel}</Text>}
    </Box>
  );

  const preview = renderPreview && focusedItem ? renderPreview(focusedItem) : null;
  const content = previewPosition === 'right' ? (
    <Box flexDirection="row" gap={2}>
      <Box flexDirection="column" flexShrink={0}>
        {listBlock}
      </Box>
      <Box flexDirection="column" flexGrow={1}>{preview}</Box>
    </Box>
  ) : (
    <Box flexDirection="column">
      {listBlock}
      {preview}
    </Box>
  );

  const showInputAbove = direction !== 'up';

  return (
    <Pane color="warning">
      <Box flexDirection="column" gap={1}>
        <Text bold color="warning">
          {title}
        </Text>
        {showInputAbove && searchBox}
        {content}
        {!showInputAbove && searchBox}
        <Text dimColor>
          <Byline>
            <KeyboardShortcutHint shortcut="↑/↓" action="导航" />
            <KeyboardShortcutHint shortcut="Enter" action={selectAction} />
            {onTab && <KeyboardShortcutHint shortcut="Tab" action={onTab.action} />}
            {onShiftTab && <KeyboardShortcutHint shortcut="Shift+Tab" action={onShiftTab.action} />}
            <KeyboardShortcutHint shortcut="Esc" action="取消" />
            {extraHints}
          </Byline>
        </Text>
      </Box>
    </Pane>
  );
}
