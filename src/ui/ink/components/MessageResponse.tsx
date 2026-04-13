/**
 * MessageResponse — 工具结果连接符组件
 *
 * - 前缀用 `NoSelect` + `fromLeftEdge`（全屏选择时隔离 gutter）
 * - 字符序列：两空格 + U+23BF + 普通空格 + U+00A0（与官方 sourcesContent 一致）
 * - 未指定 `height` 时用 `Ratchet lock="offscreen"` 包裹（虚拟列表高度稳定）
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

/** 与官方一致：`  ` + U+23BF + ` ` + U+00A0 */
const MESSAGE_RESPONSE_GUTTER = `  \u23BF \u00a0`;

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
        <Box flexShrink={1} flexGrow={1}>
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
