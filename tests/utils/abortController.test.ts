import { describe, it, expect } from 'vitest';
import {
  createAbortController,
  createChildAbortController,
} from '../../src/utils/abortController.js';

describe('createAbortController', () => {
  it('返回可 abort 的 AbortController', () => {
    const ac = createAbortController();
    expect(ac.signal.aborted).toBe(false);
    ac.abort('stop');
    expect(ac.signal.aborted).toBe(true);
    expect(ac.signal.reason).toBe('stop');
  });

  it('自定义 maxListeners 不抛错', () => {
    const ac = createAbortController(10);
    expect(ac.signal.aborted).toBe(false);
  });
});

describe('createChildAbortController', () => {
  it('父 abort → 子被级联 abort', () => {
    const parent = createAbortController();
    const child = createChildAbortController(parent);
    parent.abort('by-parent');
    expect(child.signal.aborted).toBe(true);
    expect(child.signal.reason).toBe('by-parent');
  });

  it('子 abort → 父保持未 abort', () => {
    const parent = createAbortController();
    const child = createChildAbortController(parent);
    child.abort('by-child');
    expect(child.signal.aborted).toBe(true);
    expect(parent.signal.aborted).toBe(false);
  });

  it('父已 abort 时新建子立刻 abort（快路径）', () => {
    const parent = createAbortController();
    parent.abort('already');
    const child = createChildAbortController(parent);
    expect(child.signal.aborted).toBe(true);
    expect(child.signal.reason).toBe('already');
  });

  it('多子并存时父 abort 全部级联', () => {
    const parent = createAbortController();
    const c1 = createChildAbortController(parent);
    const c2 = createChildAbortController(parent);
    parent.abort();
    expect(c1.signal.aborted).toBe(true);
    expect(c2.signal.aborted).toBe(true);
  });
});
