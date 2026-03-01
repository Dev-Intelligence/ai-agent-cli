/**
 * UserInput - 用户输入组件（基于 Kode-cli 的 TextInput 体系）
 */

import { useCallback, useState } from 'react';
import { Box, Text } from 'ink';
import { getInkColors } from '../../theme.js';
import { UI_SYMBOLS } from '../../../core/constants.js';
import TextInput from './TextInput.js';
import type { Key } from 'ink';

export interface UserInputProps {
  prefix?: string;
  commandNames?: string[];
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
  commandNames = [],
  onSubmit,
  onExit,
  tokenInfo,
}: UserInputProps) {
  const [value, setValue] = useState('');
  const [cursorOffset, setCursorOffset] = useState(0);
  const colors = getInkColors();

  const columns = Math.max(10, (process.stdout.columns || 80) - 2);

  const handleSubmit = useCallback((text: string) => {
    const trimmed = text.trim();
    if (trimmed) {
      commandHistory.add(trimmed);
    }
    setValue('');
    setCursorOffset(0);
    onSubmit(trimmed);
  }, [onSubmit]);

  const handleHistoryUp = useCallback(() => {
    const historyText = commandHistory.up(value);
    if (historyText !== null) {
      setValue(historyText);
      setCursorOffset(historyText.length);
    }
  }, [value]);

  const handleHistoryDown = useCallback(() => {
    const historyText = commandHistory.down();
    if (historyText !== null) {
      setValue(historyText);
      setCursorOffset(historyText.length);
    }
  }, []);

  const handleSpecialKey = useCallback((_input: string, key: Key): boolean => {
    if (!key.tab) return false;

    if (commandNames.length > 0 && value.startsWith('/')) {
      const partial = value.slice(1).toLowerCase();
      const matches = commandNames.filter((name) => name.startsWith(partial));

      if (matches.length === 1) {
        const completed = `/${matches[0]}`;
        setValue(completed);
        setCursorOffset(completed.length);
        return true;
      }

      if (matches.length > 1) {
        let common = matches[0]!;
        for (const match of matches) {
          while (!match.startsWith(common)) {
            common = common.slice(0, -1);
          }
        }
        if (common.length > partial.length) {
          const completed = `/${common}`;
          setValue(completed);
          setCursorOffset(completed.length);
          return true;
        }
      }
    }

    return false;
  }, [commandNames, value]);

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
            onSpecialKey={handleSpecialKey}
          />
        </Box>
      </Box>
      <Text dimColor>{'─'.repeat((process.stdout.columns || 80) - 1)}</Text>
      <Box justifyContent="space-between" width={(process.stdout.columns || 80) - 1}>
        <Text dimColor>{UI_SYMBOLS.statusBar} esc to interrupt · ↑↓ history · /help</Text>
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
