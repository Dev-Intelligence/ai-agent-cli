/**
 * QueuedMessageContext — 排队消息上下文
 *
 * 用于给消息渲染层传递“当前是否处于队列展示中”的语义信息，
 * 方便思考消息、工具消息、摘要消息统一处理缩进与布局。
 */

import * as React from 'react';
import { Box } from '../primitives.js';

export type QueuedMessageContextValue = {
  /** 当前消息是否处于排队上下文中 */
  isQueued: boolean;
  /** 是否为当前队列中的第一条消息 */
  isFirst: boolean;
  /** paddingX 对布局宽度造成的缩减量 */
  paddingWidth: number;
};

const QueuedMessageContext = React.createContext<QueuedMessageContextValue | undefined>(undefined);

export function useQueuedMessage(): QueuedMessageContextValue | undefined {
  return React.useContext(QueuedMessageContext);
}

const PADDING_X = 2;

export interface QueuedMessageProviderProps {
  isFirst: boolean;
  useBriefLayout?: boolean;
  children: React.ReactNode;
}

export function QueuedMessageProvider({
  isFirst,
  useBriefLayout,
  children,
}: QueuedMessageProviderProps): React.ReactNode {
  // brief 模式下通常已有内部缩进，这里避免重复 padding。
  const padding = useBriefLayout ? 0 : PADDING_X;

  const value = React.useMemo<QueuedMessageContextValue>(() => ({
    isQueued: true,
    isFirst,
    paddingWidth: padding * 2,
  }), [isFirst, padding]);

  return (
    <QueuedMessageContext.Provider value={value}>
      <Box paddingX={padding}>{children}</Box>
    </QueuedMessageContext.Provider>
  );
}
