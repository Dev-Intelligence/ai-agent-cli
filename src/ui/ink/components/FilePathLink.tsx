/**
 * FilePathLink — 文件路径超链接
 *
 * 将文件路径渲染为 OSC 8 超链接（file:// 协议），
 * 让 iTerm 等终端可以正确识别并点击打开文件。
 */

import React from 'react';
import { pathToFileURL } from 'url';
import { Text } from '../primitives.js';

type Props = {
  /** 绝对文件路径 */
  filePath: string;
  /** 可选的显示文本（默认显示 filePath） */
  children?: React.ReactNode;
};

export function FilePathLink({ filePath, children }: Props): React.ReactNode {
  // 使用 file:// URL 协议让终端识别为可点击链接
  const url = pathToFileURL(filePath).href;
  return (
    <Text>
      {`\x1b]8;;${url}\x07`}
      {children ?? filePath}
      {'\x1b]8;;\x07'}
    </Text>
  );
}
