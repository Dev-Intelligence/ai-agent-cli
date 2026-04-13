/**
 * Divider — 水平分割线
 *
 *
 * 用法：
 *   <Divider />                    ────────────────────
 *   <Divider title="Section" />    ─── Section ───────
 *   <Divider color="primary" />    主色分割线
 *   <Divider char="═" />           ════════════════════
 */

import { Box } from '../../primitives.js';
import { ThemedText } from './ThemedText.js';
import type { InkColorMap } from '../../../theme.js';

export interface DividerProps {
  /** 终端宽度，默认 process.stdout.columns */
  width?: number;
  /** 分割线颜色（语义 key 或原始色），默认 dim */
  color?: keyof InkColorMap | string;
  /** 填充字符，默认 '─' */
  char?: string;
  /** 居中标题 */
  title?: string;
  /** 标题两侧间距字符数，默认 1 */
  padding?: number;
}

export function Divider({
  width,
  color,
  char = '─',
  title,
  padding = 1,
}: DividerProps) {
  const cols = width ?? process.stdout.columns ?? 80;

  if (!title) {
    return (
      <Box>
        <ThemedText color={color} dim={!color}>
          {char.repeat(cols)}
        </ThemedText>
      </Box>
    );
  }

  const pad = ' '.repeat(padding);
  const titleStr = `${pad}${title}${pad}`;
  const remaining = Math.max(0, cols - titleStr.length);
  const left = Math.floor(remaining / 2);
  const right = remaining - left;

  return (
    <Box>
      <ThemedText color={color} dim={!color}>
        {char.repeat(left)}{titleStr}{char.repeat(right)}
      </ThemedText>
    </Box>
  );
}
