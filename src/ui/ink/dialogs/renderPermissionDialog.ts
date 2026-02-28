/**
 * renderPermissionDialog - 独立 Ink 实例渲染权限对话框
 *
 * 创建独立的 render() 实例，不影响主 UI，
 * 返回 Promise 等待用户决策后自动卸载。
 */

import { render } from 'ink';
import { createElement } from 'react';
import { PermissionDialog } from './PermissionDialog.js';

export function renderPermissionDialog(
  toolName: string,
  params: Record<string, unknown>,
  reason?: string
): Promise<'allow' | 'deny' | 'always'> {
  return new Promise((resolve) => {
    const { unmount } = render(
      createElement(PermissionDialog, {
        toolName,
        params,
        reason,
        onResolve: (result: 'allow' | 'deny' | 'always') => {
          unmount();
          resolve(result);
        },
      }),
      { exitOnCtrlC: false }
    );
  });
}
