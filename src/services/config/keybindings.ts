/**
 * 按键映射配置加载
 *
 * 从 .ai-agent-cli/keybindings.json 加载用户自定义按键映射
 */

import { readFileSync, existsSync } from 'fs';
import { join } from 'path';
import type { KeyBinding } from '../../ui/keybindings.js';

/**
 * 按键映射配置文件名
 */
const KEYBINDINGS_FILE = 'keybindings.json';

/**
 * 配置目录名
 */
const CONFIG_DIR = '.ai-agent-cli';

/**
 * 加载用户自定义按键映射
 * @param workdir 工作目录
 * @returns 用户自定义按键映射数组（如果文件不存在返回空数组）
 */
export function loadKeybindings(workdir: string): KeyBinding[] {
  const configPath = join(workdir, CONFIG_DIR, KEYBINDINGS_FILE);

  if (!existsSync(configPath)) {
    return [];
  }

  try {
    const content = readFileSync(configPath, 'utf-8');
    const parsed = JSON.parse(content);

    if (!Array.isArray(parsed)) {
      return [];
    }

    // 过滤有效的按键映射
    return parsed.filter(
      (item: unknown): item is KeyBinding =>
        typeof item === 'object' &&
        item !== null &&
        typeof (item as Record<string, unknown>).key === 'string' &&
        typeof (item as Record<string, unknown>).action === 'string'
    );
  } catch {
    // 解析失败，返回空数组
    return [];
  }
}
