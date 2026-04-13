/**
 * SearchBox — 搜索框组件
 *
 * 带 🔍 前缀的搜索输入框，支持：
 * - 聚焦/失焦状态切换
 * - 光标位置渲染（inverse 模式）
 * - placeholder 占位符
 * - 无边框模式
 */

import React from 'react';
import { Box, Text } from '../primitives.js';

type Props = {
  /** 当前搜索查询文本 */
  query: string;
  /** 占位符文本 */
  placeholder?: string;
  /** 是否获得焦点 */
  isFocused: boolean;
  /** 终端是否获得焦点 */
  isTerminalFocused?: boolean;
  /** 前缀字符 */
  prefix?: string;
  /** 宽度 */
  width?: number | string;
  /** 光标偏移量 */
  cursorOffset?: number;
  /** 是否无边框 */
  borderless?: boolean;
};

export function SearchBox({
  query,
  placeholder = 'Search…',
  isFocused,
  isTerminalFocused = true,
  prefix = '🔍',
  width,
  cursorOffset,
  borderless = false,
}: Props): React.ReactNode {
  const offset = cursorOffset ?? query.length;

  return (
    <Box
      flexShrink={0}
      borderStyle={borderless ? undefined : 'round'}
      borderColor={isFocused ? 'cyan' : undefined}
      borderDimColor={!isFocused}
      paddingX={borderless ? 0 : 1}
      width={width}
    >
      <Text dimColor={!isFocused}>
        {prefix}{' '}
        {isFocused ? (
          <>
            {query ? (
              isTerminalFocused ? (
                <>
                  <Text>{query.slice(0, offset)}</Text>
                  <Text inverse>
                    {offset < query.length ? query[offset] : ' '}
                  </Text>
                  {offset < query.length && (
                    <Text>{query.slice(offset + 1)}</Text>
                  )}
                </>
              ) : (
                <Text>{query}</Text>
              )
            ) : isTerminalFocused ? (
              <>
                <Text inverse>{placeholder.charAt(0)}</Text>
                <Text dimColor>{placeholder.slice(1)}</Text>
              </>
            ) : (
              <Text dimColor>{placeholder}</Text>
            )}
          </>
        ) : query ? (
          <Text>{query}</Text>
        ) : (
          <Text>{placeholder}</Text>
        )}
      </Text>
    </Box>
  );
}
