/**
 * StreamingText - 流式 AI 响应显示组件
 */

import { Text } from 'ink';
import { getInkColors } from '../../theme.js';

export interface StreamingTextProps {
  text: string;
}

export function StreamingText({ text }: StreamingTextProps) {
  const colors = getInkColors();

  return (
    <Text>
      {text}
      <Text color={colors.cursor}>▊</Text>
    </Text>
  );
}
