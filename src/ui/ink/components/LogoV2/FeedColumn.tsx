/**
 * FeedColumn — 信息流列（右侧栏）
 *
 * 多个 Feed 垂直排列，中间用 Divider 分隔。
 */

import React from 'react';
import { Box } from '../../primitives.js';
import { Divider } from '../design-system/Divider.js';
import type { FeedConfig } from './Feed.js';
import { calculateFeedWidth, Feed } from './Feed.js';

export function FeedColumn({ feeds, maxWidth }: { feeds: FeedConfig[]; maxWidth: number }) {
  const feedWidths = feeds.map((f) => calculateFeedWidth(f));
  const maxOfAll = Math.max(...feedWidths);
  const actualWidth = Math.min(maxOfAll, maxWidth);

  return (
    <Box flexDirection="column">
      {feeds.map((feed, index) => (
        <React.Fragment key={index}>
          <Feed config={feed} actualWidth={actualWidth} />
          {index < feeds.length - 1 && <Divider color="primary" width={actualWidth} />}
        </React.Fragment>
      ))}
    </Box>
  );
}
