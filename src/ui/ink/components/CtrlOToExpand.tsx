/**
 * CtrlOToExpand — Ctrl+O 展开提示
 *
 * 显示 "(ctrl+o to expand)" 提示文本。
 */

import React from 'react';
import { Text } from '../primitives.js';

export function CtrlOToExpand(): React.ReactNode {
  return (
    <Text dimColor>
      (ctrl+o to expand)
    </Text>
  );
}
