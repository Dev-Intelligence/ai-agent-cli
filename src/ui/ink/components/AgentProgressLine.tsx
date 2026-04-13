/**
 * AgentProgressLine — Agent 任务进度行
 *
 * 以树形结构展示 Agent 子任务：
 * - ├─ / └─ 前缀
 * - Agent 类型 + 描述 + 工具使用次数 + token 数
 * - 状态行：⎿ Initializing… / Done / Running in the background
 */

import React from 'react';
import { Box, Text } from '../primitives.js';

type Props = {
  /** Agent 类型名 */
  agentType: string;
  /** 描述文本 */
  description?: string;
  /** Agent 名称 */
  name?: string;
  /** 任务描述 */
  taskDescription?: string;
  /** 工具使用次数 */
  toolUseCount: number;
  /** Token 消耗量 */
  tokens: number | null;
  /** 是否为列表中最后一个 */
  isLast: boolean;
  /** 是否已完成 */
  isResolved: boolean;
  /** 是否出错 */
  isError?: boolean;
  /** 是否异步运行 */
  isAsync?: boolean;
  /** 最近工具信息 */
  lastToolInfo?: string | null;
  /** 是否隐藏类型 */
  hideType?: boolean;
};

/** 格式化数字：1000 → 1K */
function formatNumber(n: number): string {
  if (n < 1000) return String(n);
  if (n < 1_000_000) return `${(n / 1000).toFixed(1)}K`;
  return `${(n / 1_000_000).toFixed(1)}M`;
}

export function AgentProgressLine({
  agentType,
  description,
  name,
  taskDescription,
  toolUseCount,
  tokens,
  isLast,
  isResolved,
  isError: _isError,
  isAsync = false,
  lastToolInfo,
  hideType = false,
}: Props): React.ReactNode {
  const treeChar = isLast ? '└─' : '├─';
  const isBackgrounded = isAsync && isResolved;

  const getStatusText = (): string => {
    if (!isResolved) {
      return lastToolInfo || 'Initializing…';
    }
    if (isBackgrounded) {
      return taskDescription ?? 'Running in the background';
    }
    return 'Done';
  };

  return (
    <Box flexDirection="column">
      <Box paddingLeft={3}>
        <Text dimColor>{treeChar} </Text>
        <Text dimColor={!isResolved}>
          {hideType ? (
            <>
              <Text bold>{name ?? description ?? agentType}</Text>
              {name && description && <Text dimColor>: {description}</Text>}
            </>
          ) : (
            <>
              <Text bold>{agentType}</Text>
              {description && (
                <> ({description})</>
              )}
            </>
          )}
          {!isBackgrounded && (
            <>
              {' · '}
              {toolUseCount} tool {toolUseCount === 1 ? 'use' : 'uses'}
              {tokens !== null && <> · {formatNumber(tokens)} tokens</>}
            </>
          )}
        </Text>
      </Box>
      {!isBackgrounded && (
        <Box paddingLeft={3} flexDirection="row">
          <Text dimColor>{isLast ? '   ⎿  ' : '│  ⎿  '}</Text>
          <Text dimColor>{getStatusText()}</Text>
        </Box>
      )}
    </Box>
  );
}
