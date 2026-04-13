/**
 * StickyPromptHeader — 置顶提示词面包屑
 *
 * 用户滚动查看历史时，在顶部固定显示当前对话轮次的提示词。
 * 固定高度 1 行，truncate-end 防止长文本溢出。
 * 支持鼠标 hover 高亮，点击跳回原提示位置。
 */

import { useState } from 'react';
import { Box, Text } from '../primitives.js';

export interface StickyPromptHeaderProps {
  text: string;
  onClick?: () => void;
}

export function StickyPromptHeader({ text, onClick }: StickyPromptHeaderProps) {
  const [hover, setHover] = useState(false);
  const bg = hover ? 'gray' : 'blackBright';

  return (
    <Box
      flexShrink={0}
      width="100%"
      height={1}
      paddingRight={1}
      backgroundColor={bg}
      onClick={onClick}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Text color="white" wrap="truncate-end">
        ❯ {text}
      </Text>
    </Box>
  );
}
