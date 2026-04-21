/**
 * MessageResponse — 工具结果连接符组件
 *
 * 与 Claude Code 一致的视觉：
 *   ● Tool(args)
 *     └ 首行 summary / 单行输出
 *       后续行直接缩进，无额外 gutter
 *
 * 实现要点：
 *   - 用 marginLeft={2} 做整行缩进，不把 leading 空格写进 Text，
 *     避免被 yoga / Ink 布局吃掉导致对齐错乱
 *   - gutter Text 只含 `└ `（2 列宽）。Ink 计算左列宽度 = 2，
 *     右列 children 自动从绝对列 4 开始，多行自然对齐
 *   - 用 U+2514（标准 box drawing）而非 U+23BF / NBSP，wcwidth 稳定为 1
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

/** 左列仅含 elbow + 1 空格；整体缩进由外层 marginLeft={2} 控制 */
const GUTTER_TEXT = '\u2514 ';

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
      <Box
        flexDirection="row"
        marginLeft={2}
        height={height}
        overflowY="hidden"
      >
        <NoSelect fromLeftEdge flexShrink={0}>
          <Text dimColor>{GUTTER_TEXT}</Text>
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
