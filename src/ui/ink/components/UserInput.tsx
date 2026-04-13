/**
 * UserInput - 用户输入组件
 */

import { useCallback } from 'react';
import { Box, Text } from '../primitives.js';
import { UI_SYMBOLS } from '../../../core/constants.js';
import TextInput from './TextInput.js';
import { useSlashCompletion } from '../hooks/useSlashCompletion.js';
import { useInputBuffer } from '../hooks/useInputBuffer.js';
import {
  ArrowKeyHistory,
  useArrowKeyHistory,
} from '../hooks/useArrowKeyHistory.js';
import { useSetPromptOverlay } from '../context/promptOverlayContext.js';
import type { SlashCommandItem } from '../completion/types.js';
import { StatusLine } from './StatusLine.js';
import type { TokenStatsSnapshot } from './EnhancedSpinner.js';
import type { ContextTokenUsage } from '../types.js';
import { Notifications } from './Notifications.js';

export interface UserInputProps {
  prefix?: string;
  slashCommands: SlashCommandItem[];
  onSubmit: (text: string) => void;
  onExit: () => void;
  tokenInfo?: string | null;
  contextTokenUsage?: ContextTokenUsage | null;
  modelName?: string;
  provider?: string;
  getTokenStats?: () => TokenStatsSnapshot;
}

/**
 * 用户输入历史记录。
 *
 * 这里保留模块级实例，保证一次 CLI 会话内的多次渲染/重挂载
 * 仍能共享同一份输入历史。
 */
const commandHistory = new ArrowKeyHistory();

export function UserInput({
  prefix = '❯',
  slashCommands,
  onSubmit,
  onExit,
  tokenInfo,
  contextTokenUsage,
  modelName,
  provider,
  getTokenStats,
}: UserInputProps) {
  const {
    value,
    cursorOffset,
    setValue,
    setCursorOffset,
    replaceValue,
    clear,
  } = useInputBuffer();

  const columns = Math.max(10, (process.stdout.columns || 80) - 2);

  const {
    suggestions,
    selectedIndex,
    isActive: completionActive,
  } = useSlashCompletion({
    input: value,
    cursorOffset,
    onInputChange: setValue,
    setCursorOffset,
    commands: slashCommands,
  });

  /**
   * 将 slash 命令补全浮层注册到 PromptOverlayProvider。
   * 真正的渲染交给 FullscreenLayout 顶层处理，避免输入区域被裁剪。
   */
  useSetPromptOverlay(
    completionActive && suggestions.length > 0
      ? {
          suggestions: suggestions.map((suggestion) => ({
            value: suggestion.value,
            displayValue: suggestion.displayValue,
          })),
          selectedSuggestion: selectedIndex,
          maxColumnWidth: Math.max(20, columns - 6),
        }
      : null
  );

  const {
    handleHistoryUp,
    handleHistoryDown,
    addHistoryEntry,
    resetHistoryNavigation,
  } = useArrowKeyHistory({
    history: commandHistory,
    getCurrentInput: () => value,
    applyInput: replaceValue,
    onCursorOffsetChange: setCursorOffset,
    disabled: completionActive,
  });

  const handleSubmit = useCallback((text: string) => {
    if (completionActive && suggestions.length > 0) {
      return;
    }
    const trimmed = text.trim();
    if (trimmed) {
      addHistoryEntry(trimmed);
    }
    clear();
    onSubmit(trimmed);
  }, [addHistoryEntry, clear, completionActive, suggestions.length, onSubmit]);

  const rightStatusText = tokenInfo || null;

  // 底部状态栏信息
  const leftParts: string[] = [];
  leftParts.push('Esc 取消', '↑↓ 历史', '/help');
  const leftStatus = `${UI_SYMBOLS.statusBar} ${leftParts.join(' · ')}`;

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>{'─'.repeat((process.stdout.columns || 80) - 1)}</Text>
      <Box>
        <Box flexShrink={0} width={2}>
          <Text bold>{prefix}</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <TextInput
            multiline
            focus
            value={value}
            onChange={setValue}
            onSubmit={handleSubmit}
            onHistoryUp={handleHistoryUp}
            onHistoryDown={handleHistoryDown}
            onHistoryReset={resetHistoryNavigation}
            onExit={onExit}
            columns={columns}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            disableCursorMovementForUpDownKeys={completionActive}
          />
        </Box>
      </Box>
      <Text dimColor>{'─'.repeat((process.stdout.columns || 80) - 1)}</Text>
      <StatusLine
        modelName={modelName}
        provider={provider}
        getTokenStats={getTokenStats}
      />
      <Notifications tokenUsage={contextTokenUsage || null} />
      <Box justifyContent="space-between" width={(process.stdout.columns || 80) - 1}>
        <Text dimColor>{leftStatus}</Text>
        {rightStatusText && <Text dimColor wrap="truncate-end">{rightStatusText}</Text>}
      </Box>
    </Box>
  );
}

/**
 * 获取命令历史
 */
export function getInputHistory(): string[] {
  return commandHistory.getAll();
}
