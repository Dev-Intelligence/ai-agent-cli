/**
 * messageActions — 消息动作覆盖层
 *
 * 提供消息导航、复制等快捷操作。
 * 使用当前项目的 useInput（替代 useKeypress）和 overlayContext。
 */

import React, { createContext, useCallback, useState } from 'react';
import { Box, Text, useInput } from '../primitives.js';
import { useRegisterOverlay } from '../context/overlayContext.js';
import { execSync } from 'node:child_process';

// ─── Context：标记当前消息是否被选中 ───

export const MessageActionsSelectedContext = createContext(false);

/** 虚拟列表内部标记（用于禁用 OffscreenFreeze 等） */
export const InVirtualListContext = createContext(false);

// ─── 类型 ───

export type NavigableMessage = {
  id: string;
  type: 'user' | 'assistant';
  content: string;
};

type Props = {
  messages: NavigableMessage[];
  onClose: () => void;
};

// ─── 剪贴板工具 ───

function copyToClipboard(text: string): void {
  try {
    const cmd = process.platform === 'darwin' ? 'pbcopy' : 'xclip -selection clipboard';
    execSync(cmd, { input: text, stdio: ['pipe', 'ignore', 'ignore'] });
  } catch {
    // 静默失败
  }
}

// ─── 组件 ───

export function MessageActionsOverlay({ messages, onClose }: Props): React.ReactNode {
  useRegisterOverlay('message-actions');
  const [selectedIndex, setSelectedIndex] = useState(messages.length - 1);

  const handleCopy = useCallback((content: string) => {
    copyToClipboard(content);
    onClose();
  }, [onClose]);

  useInput((input, key) => {
    if (key.upArrow) {
      setSelectedIndex(i => Math.max(0, i - 1));
    } else if (key.downArrow) {
      setSelectedIndex(i => Math.min(messages.length - 1, i + 1));
    } else if (input === 'c') {
      const msg = messages[selectedIndex];
      if (msg) handleCopy(msg.content);
    } else if (key.escape || input === 'q') {
      onClose();
    }
  });

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="cyan" paddingX={1}>
      <Text bold>Message Actions</Text>
      <Text dimColor>Navigate with arrows, C to copy</Text>
      <Box marginTop={1}>
        <Text dimColor>
          [{selectedIndex + 1}/{messages.length}]{' '}
          {messages[selectedIndex]?.type === 'user' ? 'User' : 'Assistant'}
        </Text>
      </Box>
      <Box marginTop={1} flexDirection="row">
        <Text bold color="cyan">C</Text>
        <Text> copy  </Text>
        <Text bold color="cyan">Esc</Text>
        <Text> close</Text>
      </Box>
    </Box>
  );
}
