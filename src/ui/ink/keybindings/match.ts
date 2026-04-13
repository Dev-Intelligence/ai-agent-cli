/**
 * keybindings/match — 按键匹配逻辑
 *
 * 将 Ink 的 Key + input 映射到 ParsedKeystroke 进行匹配。
 */

import type { Key } from '../primitives.js';
import type { ParsedBinding, ParsedKeystroke } from './types.js';

type InkModifiers = { ctrl: boolean; shift: boolean; meta: boolean; super: boolean };

function getInkModifiers(key: Key): InkModifiers {
  return {
    ctrl: key.ctrl,
    shift: key.shift,
    meta: key.meta,
    super: (key as any).super ?? false,
  };
}

/**
 * 从 Ink 的 Key + input 提取规范化的键名
 * 将 boolean flag（key.escape 等）映射为字符串名
 */
export function getKeyName(input: string, key: Key): string | null {
  if (key.escape) return 'escape';
  if (key.return) return 'enter';
  if (key.tab) return 'tab';
  if (key.backspace) return 'backspace';
  if (key.delete) return 'delete';
  if (key.upArrow) return 'up';
  if (key.downArrow) return 'down';
  if (key.leftArrow) return 'left';
  if (key.rightArrow) return 'right';
  if (key.pageUp) return 'pageup';
  if (key.pageDown) return 'pagedown';
  if ((key as any).wheelUp) return 'wheelup';
  if ((key as any).wheelDown) return 'wheeldown';
  if ((key as any).home) return 'home';
  if ((key as any).end) return 'end';
  if (input.length === 1) return input.toLowerCase();
  return null;
}

/**
 * 检查修饰键是否匹配
 * Alt 和 Meta 在终端中等价（Ink 用 key.meta 表示两者）
 */
function modifiersMatch(inkMods: InkModifiers, target: ParsedKeystroke): boolean {
  if (inkMods.ctrl !== target.ctrl) return false;
  if (inkMods.shift !== target.shift) return false;
  const targetNeedsMeta = target.alt || target.meta;
  if (inkMods.meta !== targetNeedsMeta) return false;
  if (inkMods.super !== target.super) return false;
  return true;
}

/** 检查按键是否匹配 ParsedKeystroke */
export function matchesKeystroke(
  input: string,
  key: Key,
  target: ParsedKeystroke,
): boolean {
  const keyName = getKeyName(input, key);
  if (keyName !== target.key) return false;
  const inkMods = getInkModifiers(key);
  // Ink 在 Escape 按下时设置 key.meta=true（终端遗留行为），匹配时忽略
  if (key.escape) {
    return modifiersMatch({ ...inkMods, meta: false }, target);
  }
  return modifiersMatch(inkMods, target);
}

/** 检查按键是否匹配 ParsedBinding 的第一个 keystroke（单键绑定） */
export function matchesBinding(
  input: string,
  key: Key,
  binding: ParsedBinding,
): boolean {
  if (binding.chord.length !== 1) return false;
  const keystroke = binding.chord[0];
  if (!keystroke) return false;
  return matchesKeystroke(input, key, keystroke);
}
