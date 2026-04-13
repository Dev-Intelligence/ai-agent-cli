/**
 * Pane — 面板容器
 *
 * 终端中出现在 REPL 提示下方的区域，带有彩色顶部分割线和水平内边距。
 * 用于所有斜杠命令屏幕：/config, /help, /plugins, /stats, /permissions。
 */

import React from 'react';
import { Box } from '../../primitives.js';
import { Divider } from './Divider.js';

interface PaneProps {
  children: React.ReactNode;
  /** 顶部分割线颜色 */
  color?: string;
}

export function Pane({ children, color }: PaneProps): React.ReactNode {
  return (
    <Box flexDirection="column" paddingTop={1}>
      <Divider color={color} />
      <Box flexDirection="column" paddingX={2}>
        {children}
      </Box>
    </Box>
  );
}
