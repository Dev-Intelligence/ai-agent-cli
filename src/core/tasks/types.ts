/**
 * Task 基础类型 + 多态 Task 状态联合
 *
 * 对照源：claude-code-sourcemap/src/Task.ts + src/tasks/types.ts
 * 本阶段作为设计骨架加入；现有 src/core/backgroundTasks.ts 与
 * src/services/session/backgroundAgentTasks.ts 暂不迁移，待后续改造时
 * 逐个子类化接入。
 */

/** Task 状态 */
export type TaskStatus =
  | 'pending'
  | 'running'
  | 'completed'
  | 'failed'
  | 'cancelled';

/** 所有 Task 共享的基础字段 */
export interface TaskStateBase {
  id: string;
  /** 人类可读的任务标题 */
  title?: string;
  status: TaskStatus;
  createdAt: number;
  updatedAt: number;
  /** 结束时间（成功 / 失败 / 取消后填充） */
  finishedAt?: number;
  /** 背景化状态：false 为前台运行，true 表示已背景化 */
  isBackgrounded?: boolean;
  /** 若由子代理产生则记录其 id，便于父代理退出时级联清理 */
  agentId?: string;
  /** 错误信息（失败时） */
  error?: string;
}

/** 本地 shell 任务（对应 Claude Code `LocalShellTask`） */
export interface LocalShellTaskState extends TaskStateBase {
  type: 'local_shell';
  command: string;
  /** 退出码（完成后） */
  exitCode?: number;
  /** 是否被中断 */
  interrupted?: boolean;
}

/** 本地子代理任务（对应 Claude Code `LocalAgentTask`） */
export interface LocalAgentTaskState extends TaskStateBase {
  type: 'local_agent';
  /** 调用子代理时的 description（/task 入参） */
  description: string;
  /** 子代理类型：Explore / Plan / general-purpose 等 */
  subagentType?: string;
  /** 子代理最终输出（完成后） */
  output?: string;
}

/** 背景任务联合 */
export type TaskState = LocalShellTaskState | LocalAgentTaskState;

// ─── 类型守卫 ─────────────────────────────────────────────────────────────

export function isLocalShellTask(t: unknown): t is LocalShellTaskState {
  return (
    typeof t === 'object' &&
    t !== null &&
    (t as { type?: unknown }).type === 'local_shell'
  );
}

export function isLocalAgentTask(t: unknown): t is LocalAgentTaskState {
  return (
    typeof t === 'object' &&
    t !== null &&
    (t as { type?: unknown }).type === 'local_agent'
  );
}

/** 判断任务是否应出现在背景任务指示器中 */
export function isActiveBackgroundTask(t: TaskState): boolean {
  if (t.status !== 'running' && t.status !== 'pending') return false;
  if (t.isBackgrounded === false) return false;
  return true;
}
