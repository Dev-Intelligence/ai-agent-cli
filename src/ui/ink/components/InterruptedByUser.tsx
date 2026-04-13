/**
 * InterruptedByUser — 用户中断提示
 *
 * 展示 "Interrupted · What should Claude do instead?" 提示文本。
 */

import React from 'react';
import { Text } from '../primitives.js';

export function InterruptedByUser(): React.ReactNode {
  return (
    <>
      <Text dimColor>Interrupted </Text>
      <Text dimColor>· What should Claude do instead?</Text>
    </>
  );
}
