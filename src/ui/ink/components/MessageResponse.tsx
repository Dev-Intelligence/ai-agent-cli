/**
 * MessageResponse — 工具结果连接符组件
 *
 * 与 Claude Code 一致的视觉：
 *   ● Tool(args)
 *     ⎿ 首行 summary / 单行输出
 *        后续行直接缩进，无额外 gutter
 *
 * 实现要点：
 *   - 两列 flex row：左列只画一次 gutter（elbow + 空格），
 *     右列承载 children；Ink 让多行 children 自然向下扩展，
 *     靠 flex 列宽保证对齐到 elbow 右侧
 *   - Gutter 字符用 `  └ `（2 空格 + U+2514 + 1 空格 = 4 列）
 *     全是 wcwidth 稳定的字符，避免 U+23BF / NBSP 在不同终端
 *     被渲染成非 1 列宽度导致后续行错位
 */

import React, { useContext, createContext } from 'react';
import { Box, Text, NoSelect } from '../primitives.js';
import { Ratchet } from './design-system/Ratchet.js';

// ─── Props ───

interface MessageResponseProps {
  children: React.ReactNode;
  /** 固定高度（行数）。指定后用 overflowY="hidden" 裁剪 */
  height?: number;
}

/** 与 Claude Code 一致：`  ` + U+2514 (└) + ` ` = 4 列稳定宽度 */
const MESSAGE_RESPONSE_GUTTER = '  \u2514 ';

// ─── 嵌套检测 Context（防止渲染多层连接符） ───

const MessageResponseContext = createContext(false);

function MessageResponseProvider({ children }: { children: React.ReactNode }) {
  return (
    <MessageResponseContext.Provider value={true}>
      {children}
    </MessageResponseContext.Provider>
  );
}

// ─── 组件 ───

export function MessageResponse({ children, height }: MessageResponseProps) {
  const isMessageResponse = useContext(MessageResponseContext);

  if (isMessageResponse) {
    return <>{children}</>;
  }

  const inner = (
    <MessageResponseProvider>
      <Box flexDirection="row" height={height} overflowY="hidden">
        <NoSelect fromLeftEdge flexShrink={0}>
          <Text dimColor>{MESSAGE_RESPONSE_GUTTER}</Text>
        </NoSelect>
        <Box flexShrink={1} flexGrow={1} flexDirection="column">
          {children}
        </Box>
      </Box>
    </MessageResponseProvider>
  );

  if (height !== undefined) {
    return inner;
  }

  return <Ratchet lock="offscreen">{inner}</Ratchet>;
}
