/**
 * UserImageMessage — 用户图片附件展示
 *
 * 以 "[Image #N]" 格式展示用户发送的图片附件。
 */

import React from 'react';
import { Box, Text } from '../../primitives.js';
import { MessageResponse } from '../MessageResponse.js';

type Props = {
  /** 图片序号 */
  imageId?: number;
  /** 是否添加顶部间距（图片开始新的用户回合时使用） */
  addMargin?: boolean;
};

export function UserImageMessage({
  imageId,
  addMargin,
}: Props): React.ReactNode {
  const label = imageId ? `[Image #${imageId}]` : '[Image]';

  // 图片开始新回合时显示间距，否则使用连接符样式
  if (addMargin) {
    return <Box marginTop={1}><Text>{label}</Text></Box>;
  }

  return <MessageResponse><Text>{label}</Text></MessageResponse>;
}
