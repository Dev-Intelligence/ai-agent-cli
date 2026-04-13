/**
 * ListItem — 列表项组件
 *
 * 用于选择 UI（下拉框、多选、菜单）中的列表项。
 * 支持聚焦指示器 (❯)、选中标记 (✓)、滚动提示 (↓↑)。
 */

import React from 'react';
import type { ReactNode } from 'react';
import figures from 'figures';
import { Box, Text } from '../../primitives.js';

interface ListItemProps {
  /** 当前是否被键盘聚焦 */
  isFocused: boolean;
  /** 是否被选中 */
  isSelected?: boolean;
  children: ReactNode;
  /** 子标题描述 */
  description?: string;
  /** 显示向下滚动箭头 */
  showScrollDown?: boolean;
  /** 显示向上滚动箭头 */
  showScrollUp?: boolean;
  /** 是否自动应用状态颜色 */
  styled?: boolean;
  /** 是否禁用 */
  disabled?: boolean;
}

export function ListItem({
  isFocused,
  isSelected = false,
  children,
  description,
  showScrollDown,
  showScrollUp,
  styled = true,
  disabled = false,
}: ListItemProps): React.ReactNode {
  function renderIndicator(): ReactNode {
    if (disabled) {
      return <Text> </Text>;
    }
    if (isFocused) {
      return <Text color="suggestion">{figures.pointer}</Text>;
    }
    if (showScrollDown) {
      return <Text dimColor>{figures.arrowDown}</Text>;
    }
    if (showScrollUp) {
      return <Text dimColor>{figures.arrowUp}</Text>;
    }
    return <Text> </Text>;
  }

  function getTextColor(): string | undefined {
    if (disabled) return 'inactive';
    if (!styled) return undefined;
    if (isSelected) return 'success';
    if (isFocused) return 'suggestion';
    return undefined;
  }

  const textColor = getTextColor();

  return (
    <Box flexDirection="column">
      <Box flexDirection="row" gap={1}>
        {renderIndicator()}
        {styled ? (
          <Text color={textColor} dimColor={disabled}>
            {children}
          </Text>
        ) : (
          children
        )}
        {isSelected && !disabled && <Text color="success">{figures.tick}</Text>}
      </Box>
      {description && (
        <Box paddingLeft={2}>
          <Text color="inactive">{description}</Text>
        </Box>
      )}
    </Box>
  );
}
