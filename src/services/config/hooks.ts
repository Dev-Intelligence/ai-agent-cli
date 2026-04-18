/**
 * Hook 配置加载
 * 从 .ai-agent/hooks.json 加载 Hook 配置
 */

import fs from 'fs-extra';
import path from 'node:path';
import type { HookDefinition, HookEvent } from '../../core/hooks.js';
import { getConfigDir } from './configStore.js';
import {
  FlatHookConfigFileSchema,
  HOOK_EVENTS,
} from '../../schemas/hooks.js';

/**
 * Hook 配置文件名
 */
const HOOKS_FILE = 'hooks.json';

/**
 * 有效的事件类型（保留作为 core/hooks.ts 的 HookEvent 子集校验）
 * 与 schemas/hooks.ts 的 HOOK_EVENTS 保持一致
 */
const VALID_EVENTS: ReadonlySet<HookEvent> = new Set<HookEvent>(
  HOOK_EVENTS.filter((e): e is HookEvent =>
    [
      'PreToolUse',
      'PostToolUse',
      'PostToolUseFailure',
      'PermissionRequest',
      'UserPromptSubmit',
      'SessionStart',
      'SessionEnd',
      'SubagentStart',
      'SubagentStop',
      'PreCompact',
      'PostCompact',
    ].includes(e),
  ),
);

/**
 * Hook 配置文件路径（项目级）
 */
function getProjectHooksPath(workdir: string): string {
  return path.join(workdir, '.ai-agent', HOOKS_FILE);
}

/**
 * Hook 配置文件路径（用户级）
 */
function getUserHooksPath(): string {
  return path.join(getConfigDir(), HOOKS_FILE);
}

/**
 * 记录上一次加载时发现的 schema 警告。
 * 由外部（CLI / 诊断命令）读取；避免在 loader 里直接 console。
 */
let lastLoadWarnings: Array<{ file: string; message: string }> = [];

export function getLastHookLoadWarnings(): ReadonlyArray<{
  file: string;
  message: string;
}> {
  return lastLoadWarnings;
}

function resetLoadWarnings(): void {
  lastLoadWarnings = [];
}

function appendLoadWarning(file: string, message: string): void {
  lastLoadWarnings.push({ file, message });
}

/**
 * 加载 Hook 配置
 * 合并项目级和用户级配置
 */
export function loadHooksConfig(workdir: string): HookDefinition[] {
  resetLoadWarnings();
  const projectHooks = loadFromFile(getProjectHooksPath(workdir));
  const userHooks = loadFromFile(getUserHooksPath());

  // 合并: 项目级 + 用户级
  return [...projectHooks, ...userHooks];
}

/**
 * 从文件加载 Hook 配置，走 zod schema 校验。
 *
 * 不合法 / 文件坏 / 不存在 → 返回 []，同时把诊断信息记到 lastLoadWarnings。
 * 这样静默降级不丢失信息，/doctor 可以显示出来。
 */
function loadFromFile(filePath: string): HookDefinition[] {
  if (!fs.existsSync(filePath)) return [];
  let content: string;
  try {
    content = fs.readFileSync(filePath, 'utf-8');
  } catch (err) {
    appendLoadWarning(filePath, `读取失败：${(err as Error).message}`);
    return [];
  }

  let raw: unknown;
  try {
    raw = JSON.parse(content);
  } catch (err) {
    appendLoadWarning(filePath, `JSON 解析失败：${(err as Error).message}`);
    return [];
  }

  const parsed = FlatHookConfigFileSchema.safeParse(raw);
  if (!parsed.success) {
    appendLoadWarning(
      filePath,
      `Schema 校验失败：${parsed.error.issues
        .map(
          (i: { path: (string | number)[]; message: string }) =>
            `${i.path.join('.') || '(root)'} - ${i.message}`,
        )
        .join('; ')}`,
    );
    return [];
  }

  const list = Array.isArray(parsed.data) ? parsed.data : parsed.data.hooks;

  // core/hooks.ts 的 HookEvent 只允许 11 种子集；schema 放宽到 27 种。
  // 过滤掉我们不支持的事件，并在警告里提示用户。
  return list.filter((h: { event: string }) => {
    if (!VALID_EVENTS.has(h.event as HookEvent)) {
      appendLoadWarning(
        filePath,
        `不支持的 hook 事件 "${h.event}"，已忽略该条目`,
      );
      return false;
    }
    return true;
  }) as HookDefinition[];
}

/**
 * 保存 Hook 配置
 */
export function saveHooksConfig(
  workdir: string,
  hooks: HookDefinition[],
  scope: 'project' | 'user' = 'project'
): void {
  const filePath =
    scope === 'project'
      ? getProjectHooksPath(workdir)
      : getUserHooksPath();

  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  fs.writeFileSync(filePath, JSON.stringify({ hooks }, null, 2), 'utf-8');
}
