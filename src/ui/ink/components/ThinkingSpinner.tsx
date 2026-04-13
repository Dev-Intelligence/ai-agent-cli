/**
 * ThinkingSpinner - 思考中动画组件
 */

import { useState, useEffect } from 'react';
import { Text } from '../primitives.js';
import { isAccessibilityMode, getInkColors } from '../../theme.js';

const DOTS = ['⠋', '⠙', '⠹', '⠸', '⠼', '⠴', '⠦', '⠧', '⠇', '⠏'];

export function ThinkingSpinner() {
  if (isAccessibilityMode()) {
    return <Text>[处理中] 思考中...</Text>;
  }

  const colors = getInkColors();
  const [frame, setFrame] = useState(0);

  useEffect(() => {
    const timer = setInterval(() => {
      setFrame((f) => (f + 1) % DOTS.length);
    }, 80);
    return () => clearInterval(timer);
  }, []);

  return (
    <Text>
      <Text color={colors.cursor}>
        {DOTS[frame]}
      </Text>
      {' '}
      <Text dimColor>思考中...</Text>
    </Text>
  );
}
