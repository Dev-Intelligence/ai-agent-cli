/**
 * ToolCallView - 工具调用显示组件
 */

import { Box, Text } from 'ink';
import { TOOL_ICONS, DEFAULT_ICON } from '../../../core/constants.js';
import { getInkColors } from '../../theme.js';

export interface ToolCallViewProps {
  name: string;
  detail?: string;
  result?: string;
  isError?: boolean;
}

export function ToolCallView({ name, detail, result, isError }: ToolCallViewProps) {
  const colors = getInkColors();
  const icon = TOOL_ICONS[name] || DEFAULT_ICON;

  return (
    <Box flexDirection="column">
      <Text>
        <Text bold color={isError ? colors.error : colors.secondary}>
          {icon} {name}
        </Text>
        {detail && (
          <Text dimColor> ({detail.slice(0, 50)})</Text>
        )}
      </Text>
      {result && (
        <Text dimColor>  └ {result.slice(0, 80)}</Text>
      )}
    </Box>
  );
}
