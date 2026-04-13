/**
 * renderToken - Markdown token → React 组件分发
 *
 * 分为两类：
 * - renderBlockToken: 块级 token（heading、paragraph、code、list、blockquote 等）
 * - renderInlineTokens: 行内 token 数组（text、strong、em、codespan、link 等）
 */

import React from 'react';
import { Text } from '../../primitives.js';
import type { Token, Tokens } from 'marked';
import { Heading } from './tokens/Heading.js';
import { Paragraph } from './tokens/Paragraph.js';
import { CodeBlock } from './tokens/CodeBlock.js';
import { InlineCode } from './tokens/InlineCode.js';
import { ListBlock } from './tokens/ListBlock.js';
import { Blockquote } from './tokens/Blockquote.js';
import { Link } from './tokens/Link.js';
import { HorizontalRule } from './tokens/HorizontalRule.js';
import { MarkdownTable } from '../MarkdownTable.js';

/**
 * 渲染块级 token 为 React 元素
 */
export function renderBlockToken(token: Token): React.ReactNode {
  switch (token.type) {
    case 'heading':
      return <Heading token={token as Tokens.Heading} />;
    case 'paragraph':
      return <Paragraph token={token as Tokens.Paragraph} />;
    case 'code':
      return <CodeBlock token={token as Tokens.Code} />;
    case 'blockquote':
      return <Blockquote token={token as Tokens.Blockquote} />;
    case 'list':
      return <ListBlock token={token as Tokens.List} />;
    case 'hr':
      return <HorizontalRule />;
    case 'table':
      return <MarkdownTable token={token as Tokens.Table} renderTokens={renderInlineTokens} />;
    case 'space':
      return <Text>{' '}</Text>;
    default:
      // 未知块级 token，尝试当行内处理
      return <Text>{renderInlineToken(token)}</Text>;
  }
}

/**
 * 渲染单个行内 token
 */
function renderInlineToken(token: Token): React.ReactNode {
  switch (token.type) {
    case 'text':
      if ('tokens' in token && token.tokens) {
        return renderInlineTokens(token.tokens as Token[]);
      }
      return (token as Tokens.Text).text;
    case 'strong':
      return <Text bold>{renderInlineTokens((token as Tokens.Strong).tokens)}</Text>;
    case 'em':
      return <Text italic>{renderInlineTokens((token as Tokens.Em).tokens)}</Text>;
    case 'codespan':
      return <InlineCode token={token as Tokens.Codespan} />;
    case 'link':
      return <Link token={token as Tokens.Link} />;
    case 'image':
      return <Text>[Image: {(token as Tokens.Image).title ?? (token as Tokens.Image).href}]</Text>;
    case 'br':
      return '\n';
    case 'escape':
      return (token as Tokens.Escape).text;
    case 'html':
      return <Text dimColor>{(token as Tokens.HTML).text}</Text>;
    default:
      return 'raw' in token ? String((token as any).raw ?? '') : '';
  }
}

/**
 * 渲染行内 token 数组为 React 节点
 */
export function renderInlineTokens(tokens: Token[]): React.ReactNode {
  if (!tokens || tokens.length === 0) return null;
  if (tokens.length === 1) return renderInlineToken(tokens[0]!);

  return (
    <>
      {tokens.map((t, i) => (
        <React.Fragment key={i}>{renderInlineToken(t)}</React.Fragment>
      ))}
    </>
  );
}
