/**
 * Hook 配置加载
 * 从 .ai-agent/hooks.json 加载 Hook 配置
 */

import fs from 'fs-extra';
import path from 'node:path';
import type { HookDefinition, HookEvent } from '../../core/hooks.js';
import { getConfigDir } from './configStore.js';

/**
 * Hook 配置文件名
 */
const HOOKS_FILE = 'hooks.json';

/**
 * 有效的事件类型
 */
const VALID_EVENTS: HookEvent[] = [
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
];

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
 * 验证 Hook 定义
 */
function isValidHook(hook: unknown): hook is HookDefinition {
  if (!hook || typeof hook !== 'object') return false;
  const h = hook as Record<string, unknown>;
  return (
    typeof h.event === 'string' &&
    VALID_EVENTS.includes(h.event as HookEvent) &&
    typeof h.command === 'string' &&
    h.command.length > 0
  );
}

/**
 * 加载 Hook 配置
 * 合并项目级和用户级配置
 */
export function loadHooksConfig(workdir: string): HookDefinition[] {
  const projectHooks = loadFromFile(getProjectHooksPath(workdir));
  const userHooks = loadFromFile(getUserHooksPath());

  // 合并: 项目级 + 用户级
  return [...projectHooks, ...userHooks];
}

/**
 * 从文件加载 Hook 配置
 */
function loadFromFile(filePath: string): HookDefinition[] {
  try {
    if (!fs.existsSync(filePath)) return [];

    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);

    if (Array.isArray(raw.hooks)) {
      return raw.hooks.filter(isValidHook);
    }

    if (Array.isArray(raw)) {
      return raw.filter(isValidHook);
    }

    return [];
  } catch {
    return [];
  }
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
