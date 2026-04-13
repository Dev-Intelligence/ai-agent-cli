/**
 * StatusNotices — 启动提醒组件
 *
 * - 放在启动横幅下方、消息列表上方
 * - 只显示启动时的重要风险提醒
 * - 没有提醒时直接不渲染
 */

import * as React from 'react';
import { Box } from '../primitives.js';
import {
  createStatusNoticeContext,
  getActiveNotices,
} from '../utils/statusNoticeDefinitions.js';

export interface StatusNoticesProps {
  workdir: string;
  projectFile: string;
}

export function StatusNotices({
  workdir,
  projectFile,
}: StatusNoticesProps) {
  const context = React.useMemo(
    () => createStatusNoticeContext(workdir, projectFile),
    [workdir, projectFile],
  );

  const activeNotices = React.useMemo(
    () => getActiveNotices(context),
    [context],
  );

  if (activeNotices.length === 0) {
    return null;
  }

  return (
    <Box flexDirection="column" paddingLeft={1}>
      {activeNotices.map((notice) => (
        <React.Fragment key={notice.id}>
          {notice.render(context)}
        </React.Fragment>
      ))}
    </Box>
  );
}
