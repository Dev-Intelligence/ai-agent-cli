/**
 * 组合多个 AbortSignal
 *
 * 生成一个新 signal，在以下任一情况下 abort：
 *   - 传入的 signal abort
 *   - opts.signalB abort
 *   - opts.timeoutMs 到期
 *
 * 注：即便外层需要超时，也优先 `timeoutMs` 而非 `AbortSignal.timeout(ms)`：
 * Bun 下后者的 timer 在触发前一直占用原生内存（实测 ~2.4KB/次），
 * 本实现用 setTimeout + clearTimeout 做到立即回收。
 */

import { createAbortController } from './abortController.js';

export interface CombinedSignalOptions {
  signalB?: AbortSignal;
  timeoutMs?: number;
}

export interface CombinedSignalHandle {
  signal: AbortSignal;
  /** 主动清理：移除 listener、清 timer（业务结束后应调用） */
  cleanup: () => void;
}

export function createCombinedAbortSignal(
  signal: AbortSignal | undefined,
  opts?: CombinedSignalOptions,
): CombinedSignalHandle {
  const { signalB, timeoutMs } = opts ?? {};
  const combined = createAbortController();

  // 快路径：任一已 abort → 立即 abort 返回
  if (signal?.aborted || signalB?.aborted) {
    combined.abort();
    return { signal: combined.signal, cleanup: () => {} };
  }

  let timer: ReturnType<typeof setTimeout> | undefined;
  const abortCombined = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    combined.abort();
  };

  if (timeoutMs !== undefined) {
    timer = setTimeout(abortCombined, timeoutMs);
    // timer.unref?.() 不阻塞进程退出（Node 环境下存在）
    (timer as { unref?: () => void }).unref?.();
  }
  signal?.addEventListener('abort', abortCombined);
  signalB?.addEventListener('abort', abortCombined);

  const cleanup = (): void => {
    if (timer !== undefined) clearTimeout(timer);
    signal?.removeEventListener('abort', abortCombined);
    signalB?.removeEventListener('abort', abortCombined);
  };

  return { signal: combined.signal, cleanup };
}
