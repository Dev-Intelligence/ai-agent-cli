/**
 * 权限配置加载
 * 从 .ai-agent/permissions.json 加载权限配置
 */

import fs from 'fs-extra';
import path from 'node:path';
import type { PermissionConfig, PermissionRule } from '../../core/permissions.js';
import { getConfigDir } from './configStore.js';

/**
 * 权限配置文件名
 */
const PERMISSIONS_FILE = 'permissions.json';

/**
 * 权限配置文件路径（项目级）
 */
function getProjectPermissionsPath(workdir: string): string {
  return path.join(workdir, '.ai-agent', PERMISSIONS_FILE);
}

/**
 * 权限配置文件路径（用户级）
 */
function getUserPermissionsPath(): string {
  return path.join(getConfigDir(), PERMISSIONS_FILE);
}

/**
 * 验证权限规则
 */
function isValidRule(rule: unknown): rule is PermissionRule {
  if (!rule || typeof rule !== 'object') return false;
  const r = rule as Record<string, unknown>;
  return (
    typeof r.tool === 'string' &&
    ['allow', 'deny', 'ask'].includes(r.decision as string)
  );
}

/**
 * 加载权限配置
 * 优先级: 项目级 > 用户级 > 默认
 */
export function loadPermissionsConfig(workdir: string): Partial<PermissionConfig> {
  // 尝试加载项目级配置
  const projectConfig = loadFromFile(getProjectPermissionsPath(workdir));
  if (projectConfig) return projectConfig;

  // 尝试加载用户级配置
  const userConfig = loadFromFile(getUserPermissionsPath());
  if (userConfig) return userConfig;

  return {};
}

/**
 * 从文件加载权限配置
 */
function loadFromFile(filePath: string): Partial<PermissionConfig> | null {
  try {
    if (!fs.existsSync(filePath)) return null;

    const content = fs.readFileSync(filePath, 'utf-8');
    const raw = JSON.parse(content);

    const config: Partial<PermissionConfig> = {};

    if (raw.mode && typeof raw.mode === 'string') {
      config.mode = raw.mode;
    }

    if (Array.isArray(raw.allow)) {
      config.allow = raw.allow.filter(isValidRule);
    }

    if (Array.isArray(raw.deny)) {
      config.deny = raw.deny.filter(isValidRule);
    }

    return config;
  } catch {
    return null;
  }
}

/**
 * 保存权限配置
 */
export function savePermissionsConfig(
  workdir: string,
  config: Partial<PermissionConfig>,
  scope: 'project' | 'user' = 'project'
): void {
  const filePath =
    scope === 'project'
      ? getProjectPermissionsPath(workdir)
      : getUserPermissionsPath();

  const dir = path.dirname(filePath);
  fs.ensureDirSync(dir);
  fs.writeFileSync(filePath, JSON.stringify(config, null, 2), 'utf-8');
}
