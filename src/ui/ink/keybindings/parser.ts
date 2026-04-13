/**
 * keybindings/parser — 快捷键字符串解析器
 *
 * 解析快捷键配置字符串（如 "ctrl+shift+k"）为 ParsedKeystroke 结构。
 */

import type { Chord, KeybindingBlock, ParsedBinding, ParsedKeystroke } from './types.js';

/**
 * 解析单个按键字符串为 ParsedKeystroke
 * 支持修饰键别名：ctrl/control, alt/opt/option/meta, cmd/command/super/win
 */
export function parseKeystroke(input: string): ParsedKeystroke {
  const parts = input.split('+');
  const keystroke: ParsedKeystroke = {
    key: '',
    ctrl: false,
    alt: false,
    shift: false,
    meta: false,
    super: false,
  };
  for (const part of parts) {
    const lower = part.toLowerCase();
    switch (lower) {
      case 'ctrl':
      case 'control':
        keystroke.ctrl = true;
        break;
      case 'alt':
      case 'opt':
      case 'option':
        keystroke.alt = true;
        break;
      case 'shift':
        keystroke.shift = true;
        break;
      case 'meta':
        keystroke.meta = true;
        break;
      case 'cmd':
      case 'command':
      case 'super':
      case 'win':
        keystroke.super = true;
        break;
      case 'esc':
        keystroke.key = 'escape';
        break;
      case 'return':
        keystroke.key = 'enter';
        break;
      case 'space':
        keystroke.key = ' ';
        break;
      case '↑':
        keystroke.key = 'up';
        break;
      case '↓':
        keystroke.key = 'down';
        break;
      case '←':
        keystroke.key = 'left';
        break;
      case '→':
        keystroke.key = 'right';
        break;
      default:
        keystroke.key = lower;
        break;
    }
  }
  return keystroke;
}

/** 解析和弦字符串（空格分隔的多键序列） */
export function parseChord(input: string): Chord {
  if (input === ' ') return [parseKeystroke('space')];
  return input.trim().split(/\s+/).map(parseKeystroke);
}

/** 按键转显示名 */
function keyToDisplayName(key: string): string {
  switch (key) {
    case 'escape': return 'Esc';
    case ' ': return 'Space';
    case 'tab': return 'Tab';
    case 'enter': return 'Enter';
    case 'backspace': return 'Backspace';
    case 'delete': return 'Delete';
    case 'up': return '↑';
    case 'down': return '↓';
    case 'left': return '←';
    case 'right': return '→';
    case 'pageup': return 'PageUp';
    case 'pagedown': return 'PageDown';
    case 'home': return 'Home';
    case 'end': return 'End';
    default: return key;
  }
}

/** ParsedKeystroke → 规范字符串 */
export function keystrokeToString(ks: ParsedKeystroke): string {
  const parts: string[] = [];
  if (ks.ctrl) parts.push('ctrl');
  if (ks.alt) parts.push('alt');
  if (ks.shift) parts.push('shift');
  if (ks.meta) parts.push('meta');
  if (ks.super) parts.push('cmd');
  parts.push(keyToDisplayName(ks.key));
  return parts.join('+');
}

/** Chord → 规范字符串 */
export function chordToString(chord: Chord): string {
  return chord.map(keystrokeToString).join(' ');
}

type DisplayPlatform = 'macos' | 'windows' | 'linux' | 'wsl' | 'unknown';

/** ParsedKeystroke → 平台适配的显示字符串（macOS 用 opt/cmd，其他用 alt/super） */
export function keystrokeToDisplayString(
  ks: ParsedKeystroke,
  platform: DisplayPlatform = 'linux',
): string {
  const parts: string[] = [];
  if (ks.ctrl) parts.push('ctrl');
  if (ks.alt || ks.meta) parts.push(platform === 'macos' ? 'opt' : 'alt');
  if (ks.shift) parts.push('shift');
  if (ks.super) parts.push(platform === 'macos' ? 'cmd' : 'super');
  parts.push(keyToDisplayName(ks.key));
  return parts.join('+');
}

/** Chord → 平台适配的显示字符串 */
export function chordToDisplayString(
  chord: Chord,
  platform: DisplayPlatform = 'linux',
): string {
  return chord.map((ks) => keystrokeToDisplayString(ks, platform)).join(' ');
}

/** 解析快捷键配置块为 ParsedBinding 列表 */
export function parseBindings(blocks: KeybindingBlock[]): ParsedBinding[] {
  const bindings: ParsedBinding[] = [];
  for (const block of blocks) {
    for (const [key, action] of Object.entries(block.bindings)) {
      bindings.push({
        chord: parseChord(key),
        action,
        context: block.context,
      });
    }
  }
  return bindings;
}
