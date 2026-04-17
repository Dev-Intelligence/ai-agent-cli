/**
 * Task 基类
 *
 * 为未来把 backgroundTasks.ts / runAgent.ts 的后台分支重构为多态 Task 提供骨架。
 * 基类职责：
 *   - 维护状态机：pending → running → (completed | failed | cancelled)
 *   - 暴露生命周期钩子 onStart / onFinish
 *   - 提供 await-完成、取消、状态查询
 *
 * 不直接执行任何业务逻辑；每个子类在 start() 中启动自己的实现。
 */

import type { TaskState, TaskStatus } from './types.js';

export type TaskListener = (state: Readonly<TaskState>) => void;

export abstract class BaseTask<S extends TaskState = TaskState> {
  protected state: S;
  private listeners = new Set<TaskListener>();
  private donePromise: Promise<S> | null = null;
  private resolveDone: ((s: S) => void) | null = null;

  constructor(initial: S) {
    this.state = initial;
  }

  /** 子类实现：真正的业务启动（例如 spawn 子进程 / 启动子代理循环） */
  protected abstract onStart(): Promise<void> | void;

  /** 子类实现：真正的中断（例如 kill 子进程 / 触发 abort） */
  protected abstract onCancel(reason?: string): Promise<void> | void;

  /** 状态查询（快照） */
  getState(): Readonly<S> {
    return this.state;
  }

  get id(): string {
    return this.state.id;
  }

  get status(): TaskStatus {
    return this.state.status;
  }

  /** 监听状态变更；返回取消订阅函数 */
  subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  /** 启动任务（只能启动一次） */
  async start(): Promise<void> {
    if (this.state.status !== 'pending') {
      throw new Error(`任务 ${this.id} 已启动，当前状态: ${this.state.status}`);
    }
    this.update({ status: 'running' } as Partial<S>);
    try {
      await this.onStart();
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      this.finish({ status: 'failed', error: msg } as Partial<S> & { status: 'failed' });
      throw err;
    }
  }

  /** 取消运行中的任务 */
  async cancel(reason?: string): Promise<void> {
    if (this.state.status !== 'running' && this.state.status !== 'pending') {
      return;
    }
    try {
      await this.onCancel(reason);
    } finally {
      this.finish({ status: 'cancelled', error: reason } as Partial<S> & { status: 'cancelled' });
    }
  }

  /** 等待任务终态（resolve 返回终态时的 state 快照） */
  awaitDone(): Promise<S> {
    if (this.isTerminal()) return Promise.resolve(this.state);
    if (!this.donePromise) {
      this.donePromise = new Promise((resolve) => {
        this.resolveDone = resolve;
      });
    }
    return this.donePromise;
  }

  /** 判断是否处于终态 */
  isTerminal(): boolean {
    return (
      this.state.status === 'completed' ||
      this.state.status === 'failed' ||
      this.state.status === 'cancelled'
    );
  }

  // ─── 子类工具 ─────────────────────────────────────────────────────────
  /** 更新部分字段 + 广播。终态变更应通过 finish() 走，以保证 finishedAt 正确。 */
  protected update(patch: Partial<S>): void {
    this.state = { ...this.state, ...patch, updatedAt: Date.now() } as S;
    for (const l of this.listeners) l(this.state);
  }

  /** 标记终态 */
  protected finish(patch: Partial<S> & { status: 'completed' | 'failed' | 'cancelled' }): void {
    this.state = {
      ...this.state,
      ...patch,
      finishedAt: Date.now(),
      updatedAt: Date.now(),
    } as S;
    for (const l of this.listeners) l(this.state);
    if (this.resolveDone) {
      this.resolveDone(this.state);
      this.resolveDone = null;
    }
  }
}
