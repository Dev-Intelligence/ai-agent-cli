/**
 * Feed — 信息流组件
 *
 * 标题 + 行列表 + 可选底部信息。
 */

import { Box, Text } from '../../primitives.js';

export type FeedLine = {
  text: string;
  timestamp?: string;
};

export type FeedConfig = {
  title: string;
  lines: FeedLine[];
  footer?: string;
  emptyMessage?: string;
};

export function calculateFeedWidth(config: FeedConfig): number {
  let maxWidth = config.title.length;
  if (config.lines.length === 0 && config.emptyMessage) {
    maxWidth = Math.max(maxWidth, config.emptyMessage.length);
  } else {
    for (const line of config.lines) {
      const w = line.text.length + (line.timestamp ? line.timestamp.length + 2 : 0);
      maxWidth = Math.max(maxWidth, w);
    }
  }
  if (config.footer) maxWidth = Math.max(maxWidth, config.footer.length);
  return maxWidth;
}

export function Feed({ config, actualWidth: _actualWidth }: { config: FeedConfig; actualWidth: number }) {
  const { title, lines, footer, emptyMessage } = config;

  return (
    <Box flexDirection="column">
      <Text bold>{title}</Text>
      {lines.length === 0 && emptyMessage ? (
        <Text dimColor>{emptyMessage}</Text>
      ) : (
        lines.map((line, i) => (
          <Box key={i}>
            <Text dimColor>{line.text}</Text>
            {line.timestamp && <Text dimColor>  {line.timestamp}</Text>}
          </Box>
        ))
      )}
      {footer && <Text dimColor>{footer}</Text>}
    </Box>
  );
}
