/**
 * UserInput - 用户输入组件
 */

import { useCallback, useMemo, useState } from 'react';
import { Box, Text } from 'ink';
import { getInkColors } from '../../theme.js';
import { UI_SYMBOLS } from '../../../core/constants.js';
import TextInput from './TextInput.js';
import { useSlashCompletion } from '../hooks/useSlashCompletion.js';
import type { SlashCommandItem } from '../completion/types.js';

export interface UserInputProps {
  prefix?: string;
  slashCommands: SlashCommandItem[];
  onSubmit: (text: string) => void;
  onExit: () => void;
  tokenInfo?: string | null;
}

/**
 * 命令历史记录
 */
class CommandHistory {
  private history: string[] = [];
  private index = -1;
  private maxSize: number;
  private tempInput = '';

  constructor(maxSize = 100) {
    this.maxSize = maxSize;
  }

  add(command: string): void {
    if (!command.trim()) return;
    if (this.history[0] === command) return;
    this.history.unshift(command);
    if (this.history.length > this.maxSize) {
      this.history.pop();
    }
    this.reset();
  }

  up(currentInput: string): string | null {
    if (this.history.length === 0) return null;
    if (this.index === -1) {
      this.tempInput = currentInput;
    }
    if (this.index < this.history.length - 1) {
      this.index++;
      return this.history[this.index]!;
    }
    return null;
  }

  down(): string | null {
    if (this.index > 0) {
      this.index--;
      return this.history[this.index]!;
    } else if (this.index === 0) {
      this.index = -1;
      return this.tempInput;
    }
    return null;
  }

  reset(): void {
    this.index = -1;
    this.tempInput = '';
  }

  getAll(): string[] {
    return [...this.history];
  }
}

// 模块级命令历史实例（跨渲染保持）
const commandHistory = new CommandHistory();

export function UserInput({
  prefix = '❯',
  slashCommands,
  onSubmit,
  onExit,
  tokenInfo,
}: UserInputProps) {
  const [value, setValue] = useState('');
  const [cursorOffset, setCursorOffset] = useState(0);
  const colors = getInkColors();

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

  const handleSubmit = useCallback((text: string) => {
    if (completionActive && suggestions.length > 0) {
      return;
    }
    const trimmed = text.trim();
    if (trimmed) {
      commandHistory.add(trimmed);
    }
    setValue('');
    setCursorOffset(0);
    onSubmit(trimmed);
  }, [completionActive, suggestions.length, onSubmit]);

  const handleHistoryUp = useCallback(() => {
    if (completionActive) return;
    const historyText = commandHistory.up(value);
    if (historyText !== null) {
      setValue(historyText);
      setCursorOffset(historyText.length);
    }
  }, [completionActive, value]);

  const handleHistoryDown = useCallback(() => {
    if (completionActive) return;
    const historyText = commandHistory.down();
    if (historyText !== null) {
      setValue(historyText);
      setCursorOffset(historyText.length);
    }
  }, [completionActive]);

  const renderedSuggestions = useMemo(() => {
    if (!completionActive || suggestions.length === 0) return null;
    return suggestions.map((suggestion, index) => {
      const isSelected = index === selectedIndex;
      return (
        <Box key={`${suggestion.value}-${index}`}>
          <Text color={isSelected ? colors.primary : undefined} dimColor={!isSelected}>
            {isSelected ? '◆ ' : '  '}
            {suggestion.displayValue}
          </Text>
        </Box>
      );
    });
  }, [completionActive, suggestions, selectedIndex, colors.primary]);

  return (
    <Box flexDirection="column" marginTop={1}>
      <Text dimColor>{'─'.repeat((process.stdout.columns || 80) - 1)}</Text>
      <Box>
        <Box flexShrink={0} width={2}>
          <Text color={colors.cursor} bold>{prefix}</Text>
        </Box>
        <Box flexGrow={1} flexShrink={1}>
          <TextInput
            multiline
            focus
            value={value}
            onChange={(next) => {
              setValue(next);
              if (cursorOffset > next.length) {
                setCursorOffset(next.length);
              }
            }}
            onSubmit={handleSubmit}
            onHistoryUp={handleHistoryUp}
            onHistoryDown={handleHistoryDown}
            onHistoryReset={() => commandHistory.reset()}
            onExit={onExit}
            columns={columns}
            cursorOffset={cursorOffset}
            onChangeCursorOffset={setCursorOffset}
            disableCursorMovementForUpDownKeys={completionActive}
          />
        </Box>
      </Box>
      {renderedSuggestions && (
        <Box flexDirection="column" paddingLeft={2}>
          {renderedSuggestions}
          <Box marginTop={1}>
            <Text dimColor>↑↓ 选择 · → 接受 · Tab 循环 · Esc 关闭</Text>
          </Box>
        </Box>
      )}
      <Text dimColor>{'─'.repeat((process.stdout.columns || 80) - 1)}</Text>
      <Box justifyContent="space-between" width={(process.stdout.columns || 80) - 1}>
        <Text dimColor>{UI_SYMBOLS.statusBar} Esc 取消 · ↑↓ 历史 · /help</Text>
        {tokenInfo && <Text dimColor>{tokenInfo}</Text>}
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
