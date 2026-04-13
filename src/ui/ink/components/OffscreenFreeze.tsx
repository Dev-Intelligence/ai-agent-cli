/**
 * OffscreenFreeze — 屏幕外冻结组件（性能优化）
 *
 * 当子组件滚动到终端视口之外（进入 scrollback）时，冻结其渲染，
 * 防止 spinner / 计时器等动态内容触发不必要的终端重绘。
 *
 * 当前简化版：使用 ref 缓存机制，始终返回最新的 children。
 * 完整版需要 useTerminalViewport hook 来检测可见性。
 */

import React, { useRef } from 'react';
import { Box } from '../primitives.js';

type Props = {
  children: React.ReactNode;
};

export function OffscreenFreeze({ children }: Props): React.ReactNode {
  // 缓存最新的 children 引用
  // 完整版应在不可见时返回缓存引用而非 live children
  const cached = useRef(children);
  cached.current = children;
  return <Box>{cached.current}</Box>;
}
