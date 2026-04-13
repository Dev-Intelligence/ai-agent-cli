/**
 * cronTasks — 定时任务存储与管理
 *
 * 适配：bootstrap/state → 本地 Map，去掉 GrowthBook/bun:bundle。
 *
 * 任务类型：
 *   - One-shot（recurring: false）：执行一次后自动删除
 *   - Recurring（recurring: true）：按 cron 调度重复执行，7 天后自动过期
 *
 * 存储：.ai-agent/scheduled_tasks.json
 */

import { randomUUID } from 'crypto';
import { readFileSync } from 'fs';
import { mkdir, readFile, writeFile } from 'fs/promises';
import { join } from 'path';
import { parseCronExpression, computeNextCronRun } from './cron.js';

// ─── 类型 ───

export type CronTask = {
  id: string;
  /** 5 字段 cron 表达式（本地时区） */
  cron: string;
  /** 触发时入队的提示词 */
  prompt: string;
  /** 创建时间（epoch ms） */
  createdAt: number;
  /** 最近一次触发时间（recurring 任务用于计算下次触发） */
  lastFiredAt?: number;
  /** 是否重复执行 */
  recurring?: boolean;
  /** 是否持久化到文件 */
  durable?: boolean;
};

type CronFile = { tasks: CronTask[] };

// ─── 常量 ───

const CRON_FILE_REL = join('.ai-agent', 'scheduled_tasks.json');

/** 抖动配置*/
export type CronJitterConfig = {
  recurringFrac: number;
  recurringCapMs: number;
  oneShotMaxMs: number;
  oneShotFloorMs: number;
  oneShotMinuteMod: number;
  recurringMaxAgeMs: number;
};

export const DEFAULT_CRON_JITTER_CONFIG: CronJitterConfig = {
  recurringFrac: 0.1,
  recurringCapMs: 15 * 60 * 1000,
  oneShotMaxMs: 90 * 1000,
  oneShotFloorMs: 0,
  oneShotMinuteMod: 30,
  recurringMaxAgeMs: 7 * 24 * 60 * 60 * 1000, // 7 天
};

// ─── Session Store（内存中的非持久任务） ───

const sessionTasks = new Map<string, CronTask>();

function addSessionCronTask(task: CronTask): void {
  sessionTasks.set(task.id, task);
}

function getSessionCronTasks(): CronTask[] {
  return [...sessionTasks.values()];
}

function removeSessionCronTasks(ids: string[]): number {
  let removed = 0;
  for (const id of ids) {
    if (sessionTasks.delete(id)) removed++;
  }
  return removed;
}

// ─── 文件路径 ───

export function getCronFilePath(dir?: string): string {
  return join(dir ?? process.cwd(), CRON_FILE_REL);
}

// ─── 读取 ───

export async function readCronTasks(dir?: string): Promise<CronTask[]> {
  let raw: string;
  try {
    raw = await readFile(getCronFilePath(dir), { encoding: 'utf-8' });
  } catch {
    return [];
  }

  let parsed: unknown;
  try { parsed = JSON.parse(raw); } catch { return []; }
  if (!parsed || typeof parsed !== 'object') return [];
  const file = parsed as Partial<CronFile>;
  if (!Array.isArray(file.tasks)) return [];

  const out: CronTask[] = [];
  for (const t of file.tasks) {
    if (!t || typeof t.id !== 'string' || typeof t.cron !== 'string' ||
        typeof t.prompt !== 'string' || typeof t.createdAt !== 'number') continue;
    if (!parseCronExpression(t.cron)) continue;
    out.push({
      id: t.id, cron: t.cron, prompt: t.prompt, createdAt: t.createdAt,
      ...(typeof t.lastFiredAt === 'number' ? { lastFiredAt: t.lastFiredAt } : {}),
      ...(t.recurring ? { recurring: true } : {}),
    });
  }
  return out;
}

/** 同步检查是否有任务 */
export function hasCronTasksSync(dir?: string): boolean {
  try {
    const raw = readFileSync(getCronFilePath(dir), 'utf-8');
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed?.tasks) && parsed.tasks.length > 0;
  } catch { return false; }
}

// ─── 写入 ───

export async function writeCronTasks(tasks: CronTask[], dir?: string): Promise<void> {
  const root = dir ?? process.cwd();
  await mkdir(join(root, '.ai-agent'), { recursive: true });
  // 去掉 durable 运行时字段
  const body: CronFile = {
    tasks: tasks.map(({ durable: _, ...rest }) => rest),
  };
  await writeFile(getCronFilePath(root), JSON.stringify(body, null, 2) + '\n', 'utf-8');
}

// ─── CRUD ───

/** 添加任务，返回 id */
export async function addCronTask(
  cron: string, prompt: string, recurring: boolean, durable: boolean,
): Promise<string> {
  const id = randomUUID().slice(0, 8);
  const task: CronTask = { id, cron, prompt, createdAt: Date.now(), ...(recurring ? { recurring: true } : {}) };
  if (!durable) {
    addSessionCronTask(task);
    return id;
  }
  const tasks = await readCronTasks();
  tasks.push(task);
  await writeCronTasks(tasks);
  return id;
}

/** 删除任务 */
export async function removeCronTasks(ids: string[], dir?: string): Promise<void> {
  if (ids.length === 0) return;
  if (dir === undefined && removeSessionCronTasks(ids) === ids.length) return;
  const idSet = new Set(ids);
  const tasks = await readCronTasks(dir);
  const remaining = tasks.filter((t) => !idSet.has(t.id));
  if (remaining.length === tasks.length) return;
  await writeCronTasks(remaining, dir);
}

/** 标记任务已触发 */
export async function markCronTasksFired(ids: string[], firedAt: number, dir?: string): Promise<void> {
  if (ids.length === 0) return;
  const idSet = new Set(ids);
  const tasks = await readCronTasks(dir);
  let changed = false;
  for (const t of tasks) {
    if (idSet.has(t.id)) { t.lastFiredAt = firedAt; changed = true; }
  }
  if (!changed) return;
  await writeCronTasks(tasks, dir);
}

/** 列出所有任务（文件 + 内存） */
export async function listAllCronTasks(dir?: string): Promise<CronTask[]> {
  const fileTasks = await readCronTasks(dir);
  if (dir !== undefined) return fileTasks;
  const sTasks = getSessionCronTasks().map((t) => ({ ...t, durable: false as const }));
  return [...fileTasks, ...sTasks];
}

// ─── 辅助 ───

/** 下次触发时间（epoch ms） */
export function nextCronRunMs(cron: string, fromMs: number): number | null {
  const fields = parseCronExpression(cron);
  if (!fields) return null;
  const next = computeNextCronRun(fields, new Date(fromMs));
  return next ? next.getTime() : null;
}

/** 抖动 fraction（基于 taskId 的 u32 哈希） */
function jitterFrac(taskId: string): number {
  const frac = parseInt(taskId.slice(0, 8), 16) / 0x1_0000_0000;
  return Number.isFinite(frac) ? frac : 0;
}

/** 带抖动的下次触发（recurring 任务） */
export function jitteredNextCronRunMs(
  cron: string, fromMs: number, taskId: string,
  cfg: CronJitterConfig = DEFAULT_CRON_JITTER_CONFIG,
): number | null {
  const t1 = nextCronRunMs(cron, fromMs);
  if (t1 === null) return null;
  const t2 = nextCronRunMs(cron, t1);
  if (t2 === null) return t1;
  const jitter = Math.min(jitterFrac(taskId) * cfg.recurringFrac * (t2 - t1), cfg.recurringCapMs);
  return t1 + jitter;
}

/** 带抖动的下次触发（one-shot 任务，提前触发避免雷群） */
export function oneShotJitteredNextCronRunMs(
  cron: string, fromMs: number, taskId: string,
  cfg: CronJitterConfig = DEFAULT_CRON_JITTER_CONFIG,
): number | null {
  const t1 = nextCronRunMs(cron, fromMs);
  if (t1 === null) return null;
  if (new Date(t1).getMinutes() % cfg.oneShotMinuteMod !== 0) return t1;
  const lead = cfg.oneShotFloorMs + jitterFrac(taskId) * (cfg.oneShotMaxMs - cfg.oneShotFloorMs);
  return Math.max(t1 - lead, fromMs);
}

/** 查找错过的任务 */
export function findMissedTasks(tasks: CronTask[], nowMs: number): CronTask[] {
  return tasks.filter((t) => {
    const next = nextCronRunMs(t.cron, t.createdAt);
    return next !== null && next < nowMs;
  });
}
