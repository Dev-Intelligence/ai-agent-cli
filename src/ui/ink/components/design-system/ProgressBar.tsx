/**
 * ProgressBar — 终端进度条
 *
 * 使用 Unicode 块状字符 (▏▎▍▌▋▊▉█) 实现亚字符精度。
 */

import React from 'react';
import { Text } from '../../primitives.js';

interface ProgressBarProps {
  /** 进度比例 [0, 1] */
  ratio: number;
  /** 进度条宽度（字符数） */
  width: number;
  /** 填充部分颜色 */
  fillColor?: string;
  /** 空白部分颜色 */
  emptyColor?: string;
}

const BLOCKS = [' ', '▏', '▎', '▍', '▌', '▋', '▊', '▉', '█'];

export function ProgressBar({
  ratio: inputRatio,
  width,
  fillColor,
  emptyColor,
}: ProgressBarProps): React.ReactNode {
  const ratio = Math.min(1, Math.max(0, inputRatio));
  const whole = Math.floor(ratio * width);
  const segments = [BLOCKS[BLOCKS.length - 1]!.repeat(whole)];

  if (whole < width) {
    const remainder = ratio * width - whole;
    const middle = Math.floor(remainder * BLOCKS.length);
    segments.push(BLOCKS[middle]!);

    const empty = width - whole - 1;
    if (empty > 0) {
      segments.push(BLOCKS[0]!.repeat(empty));
    }
  }

  return (
    <Text color={fillColor} backgroundColor={emptyColor}>
      {segments.join('')}
    </Text>
  );
}
