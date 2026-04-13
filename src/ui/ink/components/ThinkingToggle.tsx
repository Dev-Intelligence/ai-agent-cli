/**
 * ThinkingToggle — 思考模式开关
 *
 * 使用 useInput（当前项目的 ink primitives）替代原版的 useKeypress。
 * 左右/Tab 切换选项，Enter 确认，Esc 取消。
 */

import React, { useState } from 'react';
import { Box, Text, useInput } from '../primitives.js';

type Props = {
  /** 当前是否启用 */
  enabled: boolean;
  /** 切换回调 */
  onToggle: (enabled: boolean) => void;
  /** 退出回调 */
  onExit: () => void;
};

export function ThinkingToggle({ enabled, onToggle, onExit }: Props): React.ReactNode {
  const [selectedIndex, setSelectedIndex] = useState(enabled ? 1 : 0);

  useInput((input, key) => {
    if (key.leftArrow || key.rightArrow || input === '\t') {
      setSelectedIndex(i => 1 - i);
    } else if (key.return) {
      onToggle(selectedIndex === 1);
      onExit();
    } else if (key.escape || input === 'q') {
      onExit();
    }
  });

  return (
    <Box flexDirection="column" paddingX={1} paddingTop={1}>
      <Text bold>Thinking Mode</Text>
      <Text dimColor>
        When enabled, Claude will use extended thinking for complex tasks.
      </Text>
      <Box marginTop={1}>
        <Box marginRight={2}>
          <Text color={selectedIndex === 0 ? 'cyan' : undefined}>
            {selectedIndex === 0 ? '❯ ' : '  '}Disabled
          </Text>
        </Box>
        <Box>
          <Text color={selectedIndex === 1 ? 'cyan' : undefined}>
            {selectedIndex === 1 ? '❯ ' : '  '}Enabled
          </Text>
        </Box>
      </Box>
      <Box marginTop={1}>
        <Text dimColor>
          (Use <Text bold>arrow keys</Text> to select, <Text bold>enter</Text>{' '}
          to confirm)
        </Text>
      </Box>
    </Box>
  );
}
