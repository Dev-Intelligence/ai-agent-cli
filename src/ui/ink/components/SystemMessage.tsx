/**
 * SystemMessage - 系统消息组件（成功/错误/警告/信息）
 */

import { Text } from 'ink';
import { STATUS_ICONS } from '../../../core/constants.js';
import { isAccessibilityMode, getInkColors } from '../../theme.js';

export interface SystemMessageProps {
  level: 'success' | 'error' | 'warning' | 'info';
  text: string;
}

export function SystemMessage({ level, text }: SystemMessageProps) {
  if (isAccessibilityMode()) {
    const labelMap = { success: '成功', error: '错误', warning: '警告', info: '信息' };
    return <Text>[{labelMap[level]}] {text}</Text>;
  }

  const colors = getInkColors();
  const icon = STATUS_ICONS[level] || STATUS_ICONS.info;

  const colorMap = {
    success: colors.success,
    error: colors.error,
    warning: colors.warning,
    info: colors.info,
  } as const;

  return (
    <Text>
      <Text color={colorMap[level]}>{icon}</Text>
      {' '}
      {level === 'error' ? (
        <Text color={colors.error} bold>{text}</Text>
      ) : (
        <Text>{text}</Text>
      )}
    </Text>
  );
}
