/**
 * Markdown - React 组件式 Markdown 渲染
 *
 * 使用 marked.lexer 解析 → renderBlockToken 递归映射为 Ink 组件树
 * 替代旧的 chalk 字符串拼接方式，支持 Box 布局控制
 */

import React, { useMemo } from 'react';
import { Box } from '../../primitives.js';
import { marked, type Token } from 'marked';
import { renderBlockToken } from './renderToken.js';

const STRIPPED_TAGS = [
  'commit_analysis',
  'context',
  'function_analysis',
  'pr_analysis',
];

function stripSystemMessages(content: string): string {
  const regex = new RegExp(`<(${STRIPPED_TAGS.join('|')})>.*?</\\1>\n?`, 'gs');
  return content.replace(regex, '').trim();
}

export interface MarkdownProps {
  children: string;
}

export function Markdown({ children }: MarkdownProps) {
  const tokens = useMemo(() => {
    const cleaned = stripSystemMessages(children);
    if (!cleaned) return [];
    return marked.lexer(cleaned);
  }, [children]);

  if (tokens.length === 0) return null;

  return (
    <Box flexDirection="column">
      {tokens.map((token: Token, index: number) => (
        <React.Fragment key={index}>
          {renderBlockToken(token)}
        </React.Fragment>
      ))}
    </Box>
  );
}
