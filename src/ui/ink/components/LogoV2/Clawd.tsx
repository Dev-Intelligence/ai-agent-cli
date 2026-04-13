/**
 * Clawd — Claude 吉祥物像素字符画
 *
 * React Compiler _c 转换为标准 React。
 *
 * 3 行 × 9 列，使用 Unicode 方块字符。
 * 支持 4 种姿势：default / arms-up / look-left / look-right
 * Apple Terminal 使用背景色填充替代方案。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';

// ─── 姿势类型 ───

export type ClawdPose =
  | 'default'
  | 'arms-up'
  | 'look-left'
  | 'look-right';

// ─── 标准终端姿势片段 ───
// 每行拆分为段，只变化眼睛/手臂部分

type Segments = {
  r1L: string; // 第 1 行左侧（无背景）
  r1E: string; // 第 1 行眼睛（有背景）
  r1R: string; // 第 1 行右侧（无背景）
  r2L: string; // 第 2 行左侧（无背景）
  r2R: string; // 第 2 行右侧（无背景）
};

const POSES: Record<ClawdPose, Segments> = {
  default:      { r1L: ' ▐', r1E: '▛███▜', r1R: '▌', r2L: '▝▜', r2R: '▛▘' },
  'look-left':  { r1L: ' ▐', r1E: '▟███▟', r1R: '▌', r2L: '▝▜', r2R: '▛▘' },
  'look-right': { r1L: ' ▐', r1E: '▙███▙', r1R: '▌', r2L: '▝▜', r2R: '▛▘' },
  'arms-up':    { r1L: '▗▟', r1E: '▛███▜', r1R: '▙▖', r2L: ' ▜', r2R: '▛ ' },
};

// Apple Terminal 用背景色填充，只有眼睛姿势有效
const APPLE_EYES: Record<ClawdPose, string> = {
  default:      ' ▗   ▖ ',
  'look-left':  ' ▘   ▘ ',
  'look-right': ' ▝   ▝ ',
  'arms-up':    ' ▗   ▖ ',
};

// ─── 组件 ───

interface Props {
  pose?: ClawdPose;
}

export function Clawd({ pose = 'default' }: Props): React.ReactNode {
  // Apple Terminal 检测
  if (process.env['TERM_PROGRAM'] === 'Apple_Terminal') {
    return <AppleTerminalClawd pose={pose} />;
  }

  const p = POSES[pose];
  return (
    <Box flexDirection="column">
      {/* 第 1 行：身体侧边 + 眼睛（有背景色） */}
      <Text>
        <Text color="magenta">{p.r1L}</Text>
        <Text color="magenta" backgroundColor="magentaBright">{p.r1E}</Text>
        <Text color="magenta">{p.r1R}</Text>
      </Text>
      {/* 第 2 行：手臂 + 身体（有背景色） */}
      <Text>
        <Text color="magenta">{p.r2L}</Text>
        <Text color="magenta" backgroundColor="magentaBright">█████</Text>
        <Text color="magenta">{p.r2R}</Text>
      </Text>
      {/* 第 3 行：脚 */}
      <Text color="magenta">{'  '}▘▘ ▝▝{'  '}</Text>
    </Box>
  );
}

function AppleTerminalClawd({ pose }: { pose: ClawdPose }): React.ReactNode {
  return (
    <Box flexDirection="column" alignItems="center">
      <Text>
        <Text color="magenta">▗</Text>
        <Text color="magentaBright" backgroundColor="magenta">{APPLE_EYES[pose]}</Text>
        <Text color="magenta">▖</Text>
      </Text>
      <Text backgroundColor="magenta">{' '.repeat(7)}</Text>
      <Text color="magenta">▘▘ ▝▝</Text>
    </Box>
  );
}
