/**
 * UserBashInputMessage — 用户 Bash 命令输入展示
 *
 * 以 "! command" 格式展示用户在 REPL 中直接执行的 shell 命令。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';

type Props = {
  /** 用户输入的命令 */
  command: string;
  /** 是否添加顶部间距 */
  addMargin?: boolean;
};

export function UserBashInputMessage({ command, addMargin = false }: Props): React.ReactNode {
  if (!command) {
    return null;
  }

  return (
    <Box flexDirection="row" marginTop={addMargin ? 1 : 0} paddingRight={1}>
      <Text color="yellow">! </Text>
      <Text>{command}</Text>
    </Box>
  );
}
