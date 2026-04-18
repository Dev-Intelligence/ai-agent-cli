import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  registerCleanup,
  runCleanupFunctions,
  _resetCleanupRegistryForTest,
  _cleanupRegistryCountForTest,
} from '../../src/utils/cleanupRegistry.js';

beforeEach(() => _resetCleanupRegistryForTest());

describe('cleanupRegistry', () => {
  it('注册数量正确', () => {
    registerCleanup(async () => {});
    registerCleanup(async () => {});
    expect(_cleanupRegistryCountForTest()).toBe(2);
  });

  it('返回的反注册函数能摘掉对应清理', () => {
    const fn = async () => {};
    const unregister = registerCleanup(fn);
    expect(_cleanupRegistryCountForTest()).toBe(1);
    unregister();
    expect(_cleanupRegistryCountForTest()).toBe(0);
  });

  it('runCleanupFunctions 并行执行所有已登记', async () => {
    const a = vi.fn().mockResolvedValue(undefined);
    const b = vi.fn().mockResolvedValue(undefined);
    registerCleanup(a);
    registerCleanup(b);
    await runCleanupFunctions();
    expect(a).toHaveBeenCalledTimes(1);
    expect(b).toHaveBeenCalledTimes(1);
  });

  it('单个清理抛错不影响其它清理', async () => {
    const good = vi.fn().mockResolvedValue(undefined);
    registerCleanup(async () => {
      throw new Error('boom');
    });
    registerCleanup(good);
    await expect(runCleanupFunctions()).resolves.not.toThrow();
    expect(good).toHaveBeenCalledTimes(1);
  });

  it('支持同步清理函数', async () => {
    const syncFn = vi.fn();
    registerCleanup(syncFn);
    await runCleanupFunctions();
    expect(syncFn).toHaveBeenCalledTimes(1);
  });
});
