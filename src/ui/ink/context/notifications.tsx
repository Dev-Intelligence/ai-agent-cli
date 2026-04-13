/**
 * notifications — 通知系统上下文
 *
 * 适配 ai-agent-cli 的状态管理（独立 state 而非 AppState）。
 *
 * 功能：
 * - 通知队列（priority: low/medium/high/immediate）
 * - 自动超时清除
 * - 同 key 通知折叠（fold）
 * - 即时通知抢占显示
 * - invalidates 链（新通知可废弃旧通知）
 */

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

// ─── 类型 ───

type Priority = 'low' | 'medium' | 'high' | 'immediate';

interface BaseNotification {
  key: string;
  /** 此通知废弃的其他通知 key 列表 */
  invalidates?: string[];
  priority: Priority;
  timeoutMs?: number;
  /** 同 key 通知折叠函数 */
  fold?: (accumulator: Notification, incoming: Notification) => Notification;
}

interface TextNotification extends BaseNotification {
  text: string;
  color?: string;
}

interface JSXNotification extends BaseNotification {
  jsx: ReactNode;
}

export type Notification = TextNotification | JSXNotification;

export interface NotificationsAPI {
  addNotification: (notif: Notification) => void;
  removeNotification: (key: string) => void;
  current: Notification | null;
}

// ─── 常量 ───

const DEFAULT_TIMEOUT_MS = 8000;

const PRIORITIES: Record<Priority, number> = {
  immediate: 0,
  high: 1,
  medium: 2,
  low: 3,
};

function getNext(queue: Notification[]): Notification | undefined {
  if (queue.length === 0) return undefined;
  return queue.reduce((min, n) =>
    PRIORITIES[n.priority] < PRIORITIES[min.priority] ? n : min,
  );
}

// ─── Context ───

const NotificationsContext = createContext<NotificationsAPI>({
  addNotification: () => {},
  removeNotification: () => {},
  current: null,
});

export function useNotifications(): NotificationsAPI {
  return useContext(NotificationsContext);
}

// ─── Provider ───

export function NotificationsProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<{
    queue: Notification[];
    current: Notification | null;
  }>({ queue: [], current: null });

  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const processQueue = useCallback(() => {
    setState((prev) => {
      const next = getNext(prev.queue);
      if (prev.current !== null || !next) return prev;

      // 设置超时自动清除
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setState((p) => {
          if (p.current?.key !== next.key) return p;
          return { queue: p.queue, current: null };
        });
        // 延迟处理队列（下一 tick）
        setTimeout(() => processQueue(), 0);
      }, next.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      return {
        queue: prev.queue.filter((n) => n !== next),
        current: next,
      };
    });
  }, []);

  const addNotification = useCallback((notif: Notification) => {
    if (notif.priority === 'immediate') {
      // 即时通知：抢占当前显示
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      timeoutRef.current = setTimeout(() => {
        timeoutRef.current = null;
        setState((p) => {
          if (p.current?.key !== notif.key) return p;
          return {
            queue: p.queue.filter((n) => !notif.invalidates?.includes(n.key)),
            current: null,
          };
        });
        setTimeout(() => processQueue(), 0);
      }, notif.timeoutMs ?? DEFAULT_TIMEOUT_MS);

      setState((prev) => ({
        current: notif,
        queue: [
          ...(prev.current ? [prev.current] : []),
          ...prev.queue,
        ].filter((n) => n.priority !== 'immediate' && !notif.invalidates?.includes(n.key)),
      }));
      return;
    }

    // 非即时通知：加入队列
    setState((prev) => {
      // 折叠同 key
      if (notif.fold) {
        if (prev.current?.key === notif.key) {
          const folded = notif.fold(prev.current, notif);
          if (timeoutRef.current) {
            clearTimeout(timeoutRef.current);
            timeoutRef.current = null;
          }
          timeoutRef.current = setTimeout(() => {
            timeoutRef.current = null;
            setState((p) => {
              if (p.current?.key !== folded.key) return p;
              return { queue: p.queue, current: null };
            });
            setTimeout(() => processQueue(), 0);
          }, folded.timeoutMs ?? DEFAULT_TIMEOUT_MS);
          return { current: folded, queue: prev.queue };
        }
        const qIdx = prev.queue.findIndex((n) => n.key === notif.key);
        if (qIdx !== -1) {
          const folded = notif.fold(prev.queue[qIdx]!, notif);
          const q = [...prev.queue];
          q[qIdx] = folded;
          return { current: prev.current, queue: q };
        }
      }

      // 去重
      const exists = prev.queue.some((n) => n.key === notif.key) ||
        prev.current?.key === notif.key;
      if (exists) return prev;

      const invalidatesCurrent = prev.current !== null &&
        notif.invalidates?.includes(prev.current.key);
      if (invalidatesCurrent && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }

      return {
        current: invalidatesCurrent ? null : prev.current,
        queue: [
          ...prev.queue.filter((n) =>
            n.priority !== 'immediate' && !notif.invalidates?.includes(n.key),
          ),
          notif,
        ],
      };
    });
    processQueue();
  }, [processQueue]);

  const removeNotification = useCallback((key: string) => {
    setState((prev) => {
      const isCurrent = prev.current?.key === key;
      const inQueue = prev.queue.some((n) => n.key === key);
      if (!isCurrent && !inQueue) return prev;
      if (isCurrent && timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return {
        current: isCurrent ? null : prev.current,
        queue: prev.queue.filter((n) => n.key !== key),
      };
    });
    processQueue();
  }, [processQueue]);

  // 挂载时处理初始队列
  useEffect(() => {
    if (state.queue.length > 0 && state.current === null) {
      processQueue();
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const api: NotificationsAPI = {
    addNotification,
    removeNotification,
    current: state.current,
  };

  return (
    <NotificationsContext value={api}>
      {children}
    </NotificationsContext>
  );
}
