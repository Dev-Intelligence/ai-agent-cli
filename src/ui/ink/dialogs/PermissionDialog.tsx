/**
 * PermissionDialog - 权限确认对话框组件
 */

import { useCallback } from 'react';
import { Box, Text, useInput } from 'ink';
import { Select, type SelectOption } from '../components/Select.js';
import type { PermissionDecision } from '../../../core/permissions.js';

export interface PermissionDialogProps {
  toolName: string;
  params: Record<string, unknown>;
  reason?: string;
  onResolve: (result: PermissionDecision) => void;
}

function formatParams(toolName: string, params: Record<string, unknown>): string {
  switch (toolName) {
    case 'bash':
      return String(params.command || '').slice(0, 160);
    case 'write_file':
    case 'edit_file':
    case 'read_file':
      return String(params.path || '').slice(0, 160);
    default:
      return JSON.stringify(params).slice(0, 160);
  }
}

export function PermissionDialog({ toolName, params, reason, onResolve }: PermissionDialogProps) {
  const paramSummary = formatParams(toolName, params);

  const options: SelectOption[] = [
    { label: 'Yes', value: 'allow' },
    { label: `Yes, and don't ask again for ${toolName} in ${process.cwd()}`, value: 'always-tool' },
    { label: 'No, and provide instructions (esc)', value: 'deny' },
  ];

  const handleResolve = useCallback(
    (value: string) => {
      if (value === 'allow') {
        onResolve({ decision: 'allow' });
        return;
      }
      if (value === 'always-tool') {
        onResolve({ decision: 'allow_always', scope: 'tool' });
        return;
      }
      onResolve({ decision: 'deny' });
    },
    [onResolve]
  );

  useInput(
    useCallback(
      (input: string, key: { escape?: boolean; ctrl?: boolean }) => {
        if (key?.escape || input === 'q') {
          onResolve({ decision: 'deny' });
        }
        if (key?.ctrl && input === 'c') {
          onResolve({ decision: 'deny' });
        }
      },
      [onResolve]
    )
  );

  return (
    <Box flexDirection="column" borderStyle="round" borderColor="yellow" paddingX={1}>
      <Text>
        <Text color="yellow" bold>⚡ 权限请求:</Text> {toolName}
      </Text>
      {reason && <Text>  <Text color="blue">📋</Text> {reason}</Text>}
      <Text>  <Text color="blue">📝</Text> {paramSummary}</Text>
      <Text> </Text>
      <Text>Do you want to proceed?</Text>
      <Select options={options} onChange={handleResolve} />
    </Box>
  );
}
