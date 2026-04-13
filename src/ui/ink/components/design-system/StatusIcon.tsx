/**
 * StatusIcon — 状态指示图标
 *
 * 根据状态显示对应图标和颜色。
 */

import React from 'react';
import figures from 'figures';
import { Text } from '../../primitives.js';

type Status = 'success' | 'error' | 'warning' | 'info' | 'pending' | 'loading';

interface StatusIconProps {
  status: Status;
  /** 图标后追加空格，方便跟文本组合 */
  withSpace?: boolean;
}

const STATUS_CONFIG: Record<Status, { icon: string; color: string | undefined }> = {
  success: { icon: figures.tick, color: 'success' },
  error: { icon: figures.cross, color: 'error' },
  warning: { icon: figures.warning, color: 'warning' },
  info: { icon: figures.info, color: 'suggestion' },
  pending: { icon: figures.circle, color: undefined },
  loading: { icon: '…', color: undefined },
};

export function StatusIcon({ status, withSpace = false }: StatusIconProps): React.ReactNode {
  const config = STATUS_CONFIG[status];
  return (
    <Text color={config.color} dimColor={!config.color}>
      {config.icon}
      {withSpace && ' '}
    </Text>
  );
}
