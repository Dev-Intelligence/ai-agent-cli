/**
 * ThemedText — 语义化颜色文本组件
 *
 * 接受 InkColorMap key 或原始颜色字符串，统一颜色解析。
 *
 * 用法：
 *   <ThemedText color="primary">主色文本</ThemedText>
 *   <ThemedText color="error" bold>错误</ThemedText>
 *   <ThemedText color="#FF0000">自定义色</ThemedText>
 *   <ThemedText dim>灰色文本</ThemedText>
 */

import type { PropsWithChildren } from 'react';
import { Text } from '../../primitives.js';
import { getInkColors, type InkColorMap } from '../../../theme.js';

/** InkColorMap 的 key 集合 */
const COLOR_MAP_KEYS = new Set<string>([
  'primary', 'secondary', 'success', 'error', 'warning', 'info',
  'border', 'borderDim', 'textDim', 'cursor', 'heading',
]);

/** 判断是否为原始颜色值（hex、rgb、ansi） */
function isRawColor(value: string): boolean {
  return (
    value.startsWith('#') ||
    value.startsWith('rgb(') ||
    value.startsWith('ansi')
  );
}

/** 解析颜色：语义 key → 实际颜色值，原始值透传 */
function resolveColor(color: string | undefined): string | undefined {
  if (!color) return undefined;
  if (isRawColor(color)) return color;
  if (COLOR_MAP_KEYS.has(color)) {
    const colors = getInkColors();
    return colors[color as keyof InkColorMap];
  }
  // 标准 ANSI 颜色名（red, green, blue 等）直接透传
  return color;
}

export interface ThemedTextProps {
  /** 语义颜色 key（InkColorMap）或原始颜色字符串 */
  color?: keyof InkColorMap | string;
  /** 背景色，同 color 规则 */
  backgroundColor?: keyof InkColorMap | string;
  /** 使用 textDim 色（替代 ANSI dim，可与 bold 组合） */
  dim?: boolean;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  strikethrough?: boolean;
  inverse?: boolean;
  wrap?: 'wrap' | 'truncate' | 'truncate-end' | 'truncate-middle' | 'truncate-start';
}

export function ThemedText({
  color,
  backgroundColor,
  dim,
  children,
  ...rest
}: PropsWithChildren<ThemedTextProps>) {
  const resolved = dim && !color ? resolveColor('textDim') : resolveColor(color);
  const resolvedBg = resolveColor(backgroundColor);

  return (
    <Text
      color={resolved}
      backgroundColor={resolvedBg}
      dimColor={dim && !color ? undefined : dim}
      {...rest}
    >
      {children}
    </Text>
  );
}
