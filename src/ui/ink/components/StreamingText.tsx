/**
 * StreamingText - 流式 AI 响应显示组件
 *
 * 两列布局：固定宽度 ● 前缀 + 自适应文本区域
 * 使用 React 组件式 Markdown 渲染
 */

import { Box, Text } from '../primitives.js';
import { UI_SYMBOLS } from '../../../core/constants.js';
import { getInkColors } from '../../theme.js';
import { Markdown } from './markdown/Markdown.js';

export interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  const colors = getInkColors();

  return (
    <Box marginTop={1}>
      <Box flexShrink={0} width={2}>
        <Text color={colors.secondary}>{UI_SYMBOLS.aiPrefix}</Text>
      </Box>
      <Box flexGrow={1} flexShrink={1}>
        <Markdown>{text}</Markdown>
        <Text color={colors.cursor}>▊</Text>
      </Box>
    </Box>
  );
}
