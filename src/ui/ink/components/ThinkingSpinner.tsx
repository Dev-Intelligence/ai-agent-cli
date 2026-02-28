/**
 * ThinkingSpinner - 思考中动画组件
 */

import { Text } from 'ink';
import InkSpinner from 'ink-spinner';
import { isAccessibilityMode, getInkColors } from '../../theme.js';

export function ThinkingSpinner() {
  if (isAccessibilityMode()) {
    return <Text>[处理中] 思考中...</Text>;
  }

  const colors = getInkColors();

  return (
    <Text>
      <Text color={colors.cursor}>
        <InkSpinner type="dots" />
      </Text>
      {' '}
      <Text dimColor>思考中...</Text>
    </Text>
  );
}
