import { describe, it, expect, vi, afterEach } from 'vitest';
import { createCombinedAbortSignal } from '../../src/utils/combinedAbortSignal.js';

afterEach(() => {
  vi.useRealTimers();
});

describe('createCombinedAbortSignal', () => {
  it('第一个 signal abort → 组合 signal abort', () => {
    const ac = new AbortController();
    const { signal } = createCombinedAbortSignal(ac.signal);
    expect(signal.aborted).toBe(false);
    ac.abort();
    expect(signal.aborted).toBe(true);
  });

  it('第二个 signal abort → 组合 signal abort', () => {
    const a = new AbortController();
    const b = new AbortController();
    const { signal } = createCombinedAbortSignal(a.signal, { signalB: b.signal });
    b.abort();
    expect(signal.aborted).toBe(true);
  });

  it('任一 signal 已 abort → 立即 abort（快路径）', () => {
    const a = new AbortController();
    a.abort();
    const { signal } = createCombinedAbortSignal(a.signal);
    expect(signal.aborted).toBe(true);
  });

  it('undefined signal + 有超时', async () => {
    vi.useFakeTimers();
    const { signal } = createCombinedAbortSignal(undefined, { timeoutMs: 100 });
    expect(signal.aborted).toBe(false);
    vi.advanceTimersByTime(100);
    expect(signal.aborted).toBe(true);
  });

  it('timeoutMs 到期 → abort', async () => {
    vi.useFakeTimers();
    const ac = new AbortController();
    const { signal } = createCombinedAbortSignal(ac.signal, { timeoutMs: 50 });
    vi.advanceTimersByTime(50);
    expect(signal.aborted).toBe(true);
  });

  it('cleanup 能取消待触发的 timeout', async () => {
    vi.useFakeTimers();
    const ac = new AbortController();
    const { signal, cleanup } = createCombinedAbortSignal(ac.signal, { timeoutMs: 50 });
    cleanup();
    vi.advanceTimersByTime(100);
    expect(signal.aborted).toBe(false);
  });

  it('cleanup 后再 abort 外层 signal 不影响已 cleanup 的组合 signal', () => {
    const ac = new AbortController();
    const { signal, cleanup } = createCombinedAbortSignal(ac.signal);
    cleanup();
    ac.abort();
    expect(signal.aborted).toBe(false);
  });
});
