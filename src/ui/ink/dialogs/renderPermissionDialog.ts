/**
 * renderPermissionDialog - 独立 Ink 实例渲染权限对话框
 */

import { createElement } from 'react';
import { render } from 'ink';
import { PermissionDialog } from './PermissionDialog.js';
import type { PermissionDecision } from '../../../core/permissions.js';

export function renderPermissionDialog(
  toolName: string,
  params: Record<string, unknown>,
  reason?: string
): Promise<PermissionDecision> {
  return new Promise((resolve) => {
    const { unmount } = render(
      createElement(PermissionDialog, {
        toolName,
        params,
        reason,
        onResolve: (result: PermissionDecision) => {
          resolve(result);
          unmount();
        },
      })
    );
  });
}
