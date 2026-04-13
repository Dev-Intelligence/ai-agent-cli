/**
 * UserCommandMessage — 用户 Slash 命令展示
 *
 * 以 "➜ /command args" 格式展示用户执行的 slash 命令。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';

type Props = {
  /** 命令名称（不含 / 前缀） */
  command: string;
  /** 命令参数 */
  args?: string;
  /** 是否为技能调用格式 */
  isSkill?: boolean;
  /** 是否添加顶部间距 */
  addMargin?: boolean;
};

export function UserCommandMessage({
  command,
  args,
  isSkill = false,
  addMargin = false,
}: Props): React.ReactNode {
  if (!command) {
    return null;
  }

  // 技能格式：Skill(name)
  if (isSkill) {
    return (
      <Box
        flexDirection="column"
        marginTop={addMargin ? 1 : 0}
        paddingRight={1}
      >
        <Text>
          <Text dimColor>➜ </Text>
          <Text>Skill({command})</Text>
        </Text>
      </Box>
    );
  }

  // Slash 命令格式：➜ /command args
  const content = `/${[command, args].filter(Boolean).join(' ')}`;
  return (
    <Box
      flexDirection="column"
      marginTop={addMargin ? 1 : 0}
      paddingRight={1}
    >
      <Text>
        <Text dimColor>➜ </Text>
        <Text>{content}</Text>
      </Text>
    </Box>
  );
}
