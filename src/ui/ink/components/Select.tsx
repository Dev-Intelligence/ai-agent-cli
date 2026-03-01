/**
 * Select - 简化版选择列表
 */

import { Box, Text, useInput } from 'ink';
import { useCallback, useState } from 'react';
import { getInkColors } from '../../theme.js';

export type SelectOption = {
  label: string;
  value: string;
};

export interface SelectProps {
  options: SelectOption[];
  defaultValue?: string;
  isDisabled?: boolean;
  onChange: (value: string) => void;
}

export function Select({ options, defaultValue, isDisabled = false, onChange }: SelectProps) {
  const colors = getInkColors();
  const initialIndex = Math.max(
    0,
    defaultValue ? options.findIndex((opt) => opt.value === defaultValue) : 0
  );
  const [index, setIndex] = useState(initialIndex === -1 ? 0 : initialIndex);

  const move = useCallback(
    (delta: number) => {
      if (options.length === 0) return;
      setIndex((prev) => {
        const next = (prev + delta + options.length) % options.length;
        return next;
      });
    },
    [options.length]
  );

  useInput((input, key) => {
    if (isDisabled) return;
    if (key.downArrow) {
      move(1);
      return;
    }
    if (key.upArrow) {
      move(-1);
      return;
    }
    if (key.return) {
      const selected = options[index];
      if (selected) {
        onChange(selected.value);
      }
    }
    // 兼容 vim 风格
    if (input === 'j') move(1);
    if (input === 'k') move(-1);
  });

  return (
    <Box flexDirection="column">
      {options.map((option, idx) => {
        const focused = idx === index;
        return (
          <Text key={`${option.value}-${idx}`} color={focused ? colors.primary : undefined}>
            {focused ? '❯ ' : '  '}
            {option.label}
          </Text>
        );
      })}
    </Box>
  );
}
