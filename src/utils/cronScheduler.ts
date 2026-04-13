/**
 * cronScheduler — 定时任务调度器
 *
 * 适配：去掉 chokidar 文件监控 + 跨进程锁（单进程场景），保留：
 * - 1 秒 check 循环
 * - per-task nextFireAt 缓存
 * - jitter 抖动
 * - recurring 重调度
 * - one-shot 自动删除
 * - 过期任务自动清理（7 天）
 * - 错过任务检测
 * - inFlight 防重复触发
 */

import { cronToHuman } from './cron.js';
import {
  type CronJitterConfig,
  type CronTask,
  DEFAULT_CRON_JITTER_CONFIG,
  findMissedTasks,
  jitteredNextCronRunMs,
  listAllCronTasks,
  markCronTasksFired,
  oneShotJitteredNextCronRunMs,
  removeCronTasks,
} from './cronTasks.js';

const CHECK_INTERVAL_MS = 1000;

/** 判断 recurring 任务是否过期（超过 maxAgeMs） */
export function isRecurringTaskAged(t: CronTask, nowMs: number, maxAgeMs: number): boolean {
  if (maxAgeMs === 0) return false;
  return Boolean(t.recurring && nowMs - t.createdAt >= maxAgeMs);
}

// ─── 类型 ───

export type CronSchedulerOptions = {
  /** 任务触发时回调 */
  onFire: (prompt: string) => void;
  /** 当前是否在加载中（加载时延迟触发） */
  isLoading: () => boolean;
  /** 抖动配置 */
  jitterConfig?: CronJitterConfig;
};

export type CronScheduler = {
  start: () => void;
  stop: () => void;
  /** 最近一次触发时间（epoch ms），null 表示无任务 */
  getNextFireTime: () => number | null;
};

// ─── 调度器 ───

export function createCronScheduler(options: CronSchedulerOptions): CronScheduler {
  const { onFire, isLoading, jitterConfig = DEFAULT_CRON_JITTER_CONFIG } = options;

  let tasks: CronTask[] = [];
  const nextFireAt = new Map<string, number>();
  const inFlight = new Set<string>();
  const missedAsked = new Set<string>();
  let checkTimer: ReturnType<typeof setInterval> | null = null;
  let stopped = false;

  /** 加载任务（文件 + 内存） */
  async function load(initial: boolean) {
    const next = await listAllCronTasks();
    if (stopped) return;
    tasks = next;

    // 首次加载：检测错过的一次性任务
    if (initial) {
      const now = Date.now();
      const missed = findMissedTasks(next, now).filter(
        (t) => !t.recurring && !missedAsked.has(t.id),
      );
      if (missed.length > 0) {
        for (const t of missed) {
          missedAsked.add(t.id);
          nextFireAt.set(t.id, Infinity);
        }
        onFire(buildMissedTaskNotification(missed));
        void removeCronTasks(missed.map((t) => t.id)).catch(() => {});
      }
    }
  }

  /** 1 秒 check 循环 */
  function check() {
    if (isLoading()) return;
    const now = Date.now();
    const seen = new Set<string>();
    const firedRecurring: string[] = [];

    for (const t of tasks) {
      seen.add(t.id);
      if (inFlight.has(t.id)) continue;

      // 首次遇到：计算下次触发时间
      let next = nextFireAt.get(t.id);
      if (next === undefined) {
        next = t.recurring
          ? (jitteredNextCronRunMs(t.cron, t.lastFiredAt ?? t.createdAt, t.id, jitterConfig) ?? Infinity)
          : (oneShotJitteredNextCronRunMs(t.cron, t.createdAt, t.id, jitterConfig) ?? Infinity);
        nextFireAt.set(t.id, next);
      }

      if (now < next) continue;

      // ─── 触发 ───
      onFire(t.prompt);

      // 过期检测
      const aged = isRecurringTaskAged(t, now, jitterConfig.recurringMaxAgeMs);

      if (t.recurring && !aged) {
        // 重调度：从 now 重新计算（避免长时间阻塞后的快速追赶）
        const newNext = jitteredNextCronRunMs(t.cron, now, t.id, jitterConfig) ?? Infinity;
        nextFireAt.set(t.id, newNext);
        if (t.durable !== false) firedRecurring.push(t.id);
      } else {
        // 一次性或过期 recurring：删除
        inFlight.add(t.id);
        void removeCronTasks([t.id])
          .catch(() => {})
          .finally(() => inFlight.delete(t.id));
        nextFireAt.delete(t.id);
      }
    }

    // 批量持久化 lastFiredAt
    if (firedRecurring.length > 0) {
      for (const id of firedRecurring) inFlight.add(id);
      void markCronTasksFired(firedRecurring, now)
        .catch(() => {})
        .finally(() => { for (const id of firedRecurring) inFlight.delete(id); });
    }

    // 清理已删除任务的 schedule
    if (seen.size === 0) {
      nextFireAt.clear();
    } else {
      for (const id of nextFireAt.keys()) {
        if (!seen.has(id)) nextFireAt.delete(id);
      }
    }
  }

  function start() {
    if (stopped) return;
    void load(true).then(() => {
      if (stopped) return;
      checkTimer = setInterval(check, CHECK_INTERVAL_MS);
      checkTimer.unref?.();
    });
  }

  function stop() {
    stopped = true;
    if (checkTimer) { clearInterval(checkTimer); checkTimer = null; }
  }

  function getNextFireTime(): number | null {
    let min = Infinity;
    for (const t of nextFireAt.values()) {
      if (t < min) min = t;
    }
    return min === Infinity ? null : min;
  }

  return { start, stop, getNextFireTime };
}

// ─── 错过任务通知 ───

function buildMissedTaskNotification(tasks: CronTask[]): string {
  if (tasks.length === 1) {
    const t = tasks[0]!;
    return `[定时任务] 在 Claude 未运行期间错过了一个任务：\n` +
      `  计划时间：${cronToHuman(t.cron)}\n` +
      `  提示词：${t.prompt}\n\n` +
      `是否现在执行？`;
  }
  const lines = [`[定时任务] 在 Claude 未运行期间错过了 ${tasks.length} 个任务：\n`];
  for (const t of tasks) {
    lines.push(`  - ${cronToHuman(t.cron)}：${t.prompt.slice(0, 80)}`);
  }
  lines.push('\n是否现在执行？');
  return lines.join('\n');
}
