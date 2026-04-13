/**
 * LoadingState — 通用加载态组件
 *
 * 这是 Phase 0 设计系统中的基础能力，负责用统一排版展示：
 * - 一行主加载文案
 * - 可选副标题
 * - 左侧旋转指示器
 *
 * 当前项目先复用已有 ThinkingSpinner 作为默认视觉实现，
 * 后续接入完整 Spinner 子系统后可无缝替换内部实现。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';
import { ThinkingSpinner } from '../ThinkingSpinner.js';

export interface LoadingStateProps {
  /** 主加载文案 */
  message: string;
  /** 是否加粗主文案 */
  bold?: boolean;
  /** 是否使用弱化颜色 */
  dimColor?: boolean;
  /** 可选副标题 */
  subtitle?: string;
}

export function LoadingState({
  message,
  bold = false,
  dimColor = false,
  subtitle,
}: LoadingStateProps): React.ReactNode {
  return (
    <Box flexDirection="column">
      <Box flexDirection="row">
        <ThinkingSpinner />
        <Text bold={bold} dimColor={dimColor}>
          {' '}
          {message}
        </Text>
      </Box>
      {subtitle && <Text dimColor>{subtitle}</Text>}
    </Box>
  );
}
