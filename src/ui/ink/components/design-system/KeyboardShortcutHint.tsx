/**
 * KeyboardShortcutHint — 快捷键提示
 *
 * 渲染 "ctrl+o to expand" 或 "(tab to toggle)" 风格的提示。
 *
 * @example
 * <Text dimColor><KeyboardShortcutHint shortcut="esc" action="cancel" /></Text>
 * <Text dimColor><KeyboardShortcutHint shortcut="ctrl+o" action="expand" parens /></Text>
 */

import React from 'react';
import { Text } from '../../primitives.js';

interface KeyboardShortcutHintProps {
  shortcut: string;
  action: string;
  parens?: boolean;
  bold?: boolean;
}

export function KeyboardShortcutHint({
  shortcut,
  action,
  parens = false,
  bold = false,
}: KeyboardShortcutHintProps): React.ReactNode {
  const shortcutText = bold ? <Text bold>{shortcut}</Text> : shortcut;

  if (parens) {
    return <Text>({shortcutText} to {action})</Text>;
  }
  return <Text>{shortcutText} to {action}</Text>;
}
