/**
 * useAfterFirstRender — 首次渲染后副作用 Hook
 *
 * 该 Hook 主要作为迁移兼容层使用：
 * - 统一承接“仅在首屏完成后执行”的逻辑
 * - 当前实现不主动注入任何业务行为
 * - 后续若需要性能打点或首屏埋点，可直接补在这里
 */

import { useEffect } from 'react';

export function useAfterFirstRender(effect?: () => void): void {
  useEffect(() => {
    effect?.();
  }, [effect]);
}
