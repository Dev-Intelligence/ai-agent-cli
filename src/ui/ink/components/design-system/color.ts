/**
 * color — 主题感知颜色函数
 *
 * 柯里化函数，将主题 key 或原始颜色值统一解析为 colorize 调用。
 */

import type { InkColorMap } from '../../../theme.js';
import { getInkColors } from '../../../theme.js';

/**
 * 解析颜色值：主题 key → 实际颜色值，原始值透传
 */
export function resolveThemeColor(c: keyof InkColorMap | string | undefined): string | undefined {
  if (!c) return undefined;

  // 原始颜色值直接透传
  if (
    c.startsWith('rgb(') ||
    c.startsWith('#') ||
    c.startsWith('ansi256(') ||
    c.startsWith('ansi:')
  ) {
    return c;
  }

  // 主题 key 查找
  const colors = getInkColors();
  if (c in colors) {
    return colors[c as keyof InkColorMap];
  }

  // 标准 ANSI 颜色名直接透传
  return c;
}
