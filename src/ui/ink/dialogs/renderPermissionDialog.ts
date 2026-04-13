/**
 * renderPermissionDialog - 独立 Ink 实例渲染权限对话框
 */

import { createElement } from 'react';
import { render } from '../primitives.js';
import { PermissionDialog } from './PermissionDialog.js';
import type { PermissionDecision } from '../../../core/permissions.js';

export async function renderPermissionDialog(
  toolName: string,
  params: Record<string, unknown>,
  reason?: string
): Promise<PermissionDecision> {
  return new Promise(async (resolve) => {
    const { unmount } = await render(
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
