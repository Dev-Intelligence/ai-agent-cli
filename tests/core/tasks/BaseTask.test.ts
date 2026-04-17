import { describe, it, expect } from 'vitest';
import { BaseTask } from '../../../src/core/tasks/BaseTask.js';
import type { LocalShellTaskState } from '../../../src/core/tasks/types.js';
import {
  isLocalShellTask,
  isLocalAgentTask,
  isActiveBackgroundTask,
} from '../../../src/core/tasks/types.js';

/** 测试用具体子类：立刻完成或按需取消 */
class StubShellTask extends BaseTask<LocalShellTaskState> {
  constructor(command: string) {
    super({
      id: 'stub-1',
      type: 'local_shell',
      status: 'pending',
      command,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBackgrounded: true,
    });
  }
  private cancelled = false;

  async onStart(): Promise<void> {
    // 模拟立刻完成
    this.finish({ status: 'completed', exitCode: 0 });
  }
  async onCancel(): Promise<void> {
    this.cancelled = true;
  }
  wasCancelled(): boolean {
    return this.cancelled;
  }
}

class NeverEndingTask extends BaseTask<LocalShellTaskState> {
  constructor() {
    super({
      id: 'stub-forever',
      type: 'local_shell',
      status: 'pending',
      command: 'sleep',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBackgrounded: true,
    });
  }
  async onStart(): Promise<void> {
    // 不做任何事，保持 running
  }
  async onCancel(): Promise<void> {}
}

class FailingTask extends BaseTask<LocalShellTaskState> {
  constructor() {
    super({
      id: 'stub-fail',
      type: 'local_shell',
      status: 'pending',
      command: 'bad',
      createdAt: Date.now(),
      updatedAt: Date.now(),
      isBackgrounded: true,
    });
  }
  async onStart(): Promise<void> {
    throw new Error('boom');
  }
  async onCancel(): Promise<void> {}
}

describe('类型守卫', () => {
  it('isLocalShellTask / isLocalAgentTask 互斥', () => {
    const sh: LocalShellTaskState = {
      id: 'a',
      type: 'local_shell',
      status: 'running',
      command: 'ls',
      createdAt: 0,
      updatedAt: 0,
    };
    expect(isLocalShellTask(sh)).toBe(true);
    expect(isLocalAgentTask(sh)).toBe(false);
  });

  it('null / 非对象 → false', () => {
    expect(isLocalShellTask(null)).toBe(false);
    expect(isLocalShellTask(undefined)).toBe(false);
    expect(isLocalShellTask(42)).toBe(false);
  });
});

describe('isActiveBackgroundTask', () => {
  const base = {
    id: 'a',
    type: 'local_shell' as const,
    command: 'ls',
    createdAt: 0,
    updatedAt: 0,
  };
  it('running + backgrounded=true → 是', () => {
    expect(isActiveBackgroundTask({ ...base, status: 'running', isBackgrounded: true })).toBe(true);
  });
  it('completed → 否', () => {
    expect(isActiveBackgroundTask({ ...base, status: 'completed' })).toBe(false);
  });
  it('前台运行（backgrounded=false）→ 否', () => {
    expect(isActiveBackgroundTask({ ...base, status: 'running', isBackgrounded: false })).toBe(false);
  });
});

describe('BaseTask 生命周期', () => {
  it('start → onStart → completed', async () => {
    const t = new StubShellTask('ls');
    expect(t.status).toBe('pending');
    await t.start();
    expect(t.status).toBe('completed');
    expect(t.getState().exitCode).toBe(0);
    expect(t.isTerminal()).toBe(true);
  });

  it('start 抛错 → failed + error 填充', async () => {
    const t = new FailingTask();
    await expect(t.start()).rejects.toThrow('boom');
    expect(t.status).toBe('failed');
    expect(t.getState().error).toContain('boom');
  });

  it('cancel 调用 onCancel 并置 cancelled', async () => {
    const t = new NeverEndingTask();
    await t.start();
    expect(t.status).toBe('running');
    await t.cancel('user interrupt');
    expect(t.status).toBe('cancelled');
    expect(t.getState().error).toBe('user interrupt');
  });

  it('重复 start 抛错', async () => {
    const t = new StubShellTask('ls');
    await t.start();
    await expect(t.start()).rejects.toThrow(/已启动/);
  });

  it('awaitDone 在终态前挂起，终态后 resolve', async () => {
    const t = new NeverEndingTask();
    await t.start();
    let resolved = false;
    t.awaitDone().then(() => {
      resolved = true;
    });
    await new Promise((r) => setTimeout(r, 5));
    expect(resolved).toBe(false);
    await t.cancel();
    await new Promise((r) => setTimeout(r, 5));
    expect(resolved).toBe(true);
  });

  it('awaitDone 在已终态时立即 resolve', async () => {
    const t = new StubShellTask('x');
    await t.start();
    const result = await t.awaitDone();
    expect(result.status).toBe('completed');
  });

  it('subscribe 监听状态变更', async () => {
    const events: string[] = [];
    const t = new StubShellTask('x');
    t.subscribe((s) => events.push(s.status));
    await t.start();
    expect(events).toContain('running');
    expect(events).toContain('completed');
  });
});
