/**
 * NewMessagesPill — 新消息提示药丸
 *
 * 用户滚动离开底部时，在滚动区域底部居中显示 "N 条新消息 ↓" 提示。
 * 点击后跳回底部。支持鼠标 hover 高亮。
 */

import { useState } from 'react';
import { Box, Text } from '../primitives.js';

export interface NewMessagesPillProps {
  /** 新消息数量，0 表示仅显示"跳到底部" */
  count: number;
  onClick?: () => void;
}

export function NewMessagesPill({ count, onClick }: NewMessagesPillProps) {
  const [hover, setHover] = useState(false);
  const label = count > 0 ? `${count} 条新消息` : '跳到底部';
  const bg = hover ? 'cyanBright' : 'cyan';

  return (
    <Box
      position="absolute"
      bottom={0}
      left={0}
      right={0}
      justifyContent="center"
    >
      <Box
        onClick={onClick}
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
      >
        <Text backgroundColor={bg} color="black">
          {' '}{label} ↓{' '}
        </Text>
      </Box>
    </Box>
  );
}
