/**
 * StreamingMarkdown — 流式 Markdown 渲染
 *
 *
 * 将流式文本分割为：
 * - stablePrefix：已完成的顶层块（memo 缓存，不重新解析）
 * - unstableSuffix：正在生长的最后一个块（每次 delta 重新解析）
 *
 * marked.lexer 正确处理未闭合的代码围栏作为单个 token，
 * 所以块边界总是安全的。
 *
 * stablePrefix 只单调增长，所以 render 中的 ref 写入在 StrictMode 下是幂等的。
 */

import { useRef } from 'react';
import { Box } from '../../primitives.js';
import { marked } from 'marked';
import { Markdown } from './Markdown.js';

export interface StreamingMarkdownProps {
  children: string;
}

export function StreamingMarkdown({ children }: StreamingMarkdownProps) {
  const stablePrefixRef = useRef('');

  // 如果文本被替换（防御性：通常 unmount 处理）
  if (!children.startsWith(stablePrefixRef.current)) {
    stablePrefixRef.current = '';
  }

  // 只从当前边界开始 lex —— O(unstable length)，不是 O(全文)
  const boundary = stablePrefixRef.current.length;
  const tokens = marked.lexer(children.substring(boundary));

  // 最后一个非空 token 是正在生长的块；之前的都是最终的
  let lastContentIdx = tokens.length - 1;
  while (lastContentIdx >= 0 && tokens[lastContentIdx]!.type === 'space') {
    lastContentIdx--;
  }
  let advance = 0;
  for (let i = 0; i < lastContentIdx; i++) {
    advance += tokens[i]!.raw.length;
  }
  if (advance > 0) {
    stablePrefixRef.current = children.substring(0, boundary + advance);
  }

  const stablePrefix = stablePrefixRef.current;
  const unstableSuffix = children.substring(stablePrefix.length);

  // stablePrefix 在 <Markdown> 内通过 useMemo 缓存，
  // 所以 unstableSuffix 增长时不会重新解析 stablePrefix
  return (
    <Box flexDirection="column" gap={1}>
      {stablePrefix && <Markdown>{stablePrefix}</Markdown>}
      {unstableSuffix && <Markdown>{unstableSuffix}</Markdown>}
    </Box>
  );
}
