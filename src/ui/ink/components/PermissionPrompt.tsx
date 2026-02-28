/**
 * PermissionPrompt - 权限确认组件
 */

import { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';

export interface PermissionPromptProps {
  toolName: string;
  params: Record<string, unknown>;
  reason?: string;
  onResolve: (result: 'allow' | 'deny' | 'always') => void;
}

function formatParams(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case 'bash':
      return `命令: ${String(params.command || '').slice(0, 80)}`;
    case 'write_file':
      return `文件: ${params.path}`;
    case 'edit_file':
      return `文件: ${params.path}`;
    default:
      return JSON.stringify(params).slice(0, 100);
  }
}

export function PermissionPrompt({ toolName, params, reason, onResolve }: PermissionPromptProps) {
  useInput(useCallback((input: string, key: { return: boolean }) => {
    const lower = input.toLowerCase();
    if (key.return || lower === 'y') {
      onResolve('allow');
    } else if (lower === 'n') {
      onResolve('deny');
    } else if (lower === 'a') {
      onResolve('always');
    }
  }, [onResolve]));

  const paramSummary = formatParams(toolName, params);

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>  <Text color="yellow" bold>⚡ 权限请求:</Text> {toolName}</Text>
      {reason && <Text>  <Text color="blue">📋</Text> {reason}</Text>}
      <Text>  <Text color="blue">📝</Text> {paramSummary}</Text>
      <Text> </Text>
      <Text>  允许执行? [<Text color="green" bold>Y</Text>/n/always]</Text>
    </Box>
  );
}
