/**
 * PressEnterToContinue — 按回车继续提示
 *
 */

import React from 'react';
import { Text } from '../primitives.js';

export function PressEnterToContinue(): React.ReactNode {
  return (
    <Text color="yellow">
      Press <Text bold>Enter</Text> to continue…
    </Text>
  );
}
