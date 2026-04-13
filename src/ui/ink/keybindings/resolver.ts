/**
 * keybindings/resolver — 按键解析与和弦状态管理
 *
 * 处理单键绑定和多键和弦（如 ctrl+k ctrl+s）。
 */

import type { Key } from '../primitives.js';
import { getKeyName, matchesBinding } from './match.js';
import { chordToString } from './parser.js';
import type { KeybindingContextName, ParsedBinding, ParsedKeystroke } from './types.js';

export type ResolveResult =
  | { type: 'match'; action: string }
  | { type: 'none' }
  | { type: 'unbound' };

export type ChordResolveResult =
  | { type: 'match'; action: string }
  | { type: 'none' }
  | { type: 'unbound' }
  | { type: 'chord_started'; pending: ParsedKeystroke[] }
  | { type: 'chord_cancelled' };

/** 解析单键输入到 action */
export function resolveKey(
  input: string,
  key: Key,
  activeContexts: KeybindingContextName[],
  bindings: ParsedBinding[],
): ResolveResult {
  let match: ParsedBinding | undefined;
  const ctxSet = new Set(activeContexts);

  for (const binding of bindings) {
    if (binding.chord.length !== 1) continue;
    if (!ctxSet.has(binding.context)) continue;
    if (matchesBinding(input, key, binding)) {
      match = binding;
    }
  }

  if (!match) return { type: 'none' };
  if (match.action === null) return { type: 'unbound' };
  return { type: 'match', action: match.action };
}

/** 获取 action 的显示文本（如 "ctrl+t"） */
export function getBindingDisplayText(
  action: string,
  context: KeybindingContextName,
  bindings: ParsedBinding[],
): string | undefined {
  const binding = [...bindings].reverse().find(
    (b) => b.action === action && b.context === context,
  );
  return binding ? chordToString(binding.chord) : undefined;
}

/** 从 Ink input/key 构建 ParsedKeystroke */
function buildKeystroke(input: string, key: Key): ParsedKeystroke | null {
  const keyName = getKeyName(input, key);
  if (!keyName) return null;
  const effectiveMeta = key.escape ? false : key.meta;
  return {
    key: keyName,
    ctrl: key.ctrl,
    alt: effectiveMeta,
    shift: key.shift,
    meta: effectiveMeta,
    super: (key as any).super ?? false,
  };
}

/** 比较两个 ParsedKeystroke 是否等价 */
export function keystrokesEqual(a: ParsedKeystroke, b: ParsedKeystroke): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    (a.alt || a.meta) === (b.alt || b.meta) &&
    a.super === b.super
  );
}

/** 检查和弦前缀是否匹配绑定 */
function chordPrefixMatches(prefix: ParsedKeystroke[], binding: ParsedBinding): boolean {
  if (prefix.length >= binding.chord.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    if (!prefix[i] || !binding.chord[i]) return false;
    if (!keystrokesEqual(prefix[i]!, binding.chord[i]!)) return false;
  }
  return true;
}

/** 检查完整和弦是否精确匹配绑定 */
function chordExactlyMatches(chord: ParsedKeystroke[], binding: ParsedBinding): boolean {
  if (chord.length !== binding.chord.length) return false;
  for (let i = 0; i < chord.length; i++) {
    if (!chord[i] || !binding.chord[i]) return false;
    if (!keystrokesEqual(chord[i]!, binding.chord[i]!)) return false;
  }
  return true;
}

/**
 * 带和弦状态的按键解析
 * 处理多键和弦（如 ctrl+k ctrl+s）：
 * - Escape 取消和弦
 * - 前缀匹配 → chord_started
 * - 精确匹配 → match
 * - 无匹配 → chord_cancelled（有 pending 时）或 none
 */
export function resolveKeyWithChordState(
  input: string,
  key: Key,
  activeContexts: KeybindingContextName[],
  bindings: ParsedBinding[],
  pending: ParsedKeystroke[] | null,
): ChordResolveResult {
  if (key.escape && pending !== null) {
    return { type: 'chord_cancelled' };
  }

  const currentKeystroke = buildKeystroke(input, key);
  if (!currentKeystroke) {
    return pending !== null ? { type: 'chord_cancelled' } : { type: 'none' };
  }

  const testChord = pending ? [...pending, currentKeystroke] : [currentKeystroke];
  const ctxSet = new Set(activeContexts);
  const contextBindings = bindings.filter((b) => ctxSet.has(b.context));

  // 检查是否为更长和弦的前缀
  const chordWinners = new Map<string, string | null>();
  for (const binding of contextBindings) {
    if (binding.chord.length > testChord.length && chordPrefixMatches(testChord, binding)) {
      chordWinners.set(chordToString(binding.chord), binding.action);
    }
  }
  let hasLongerChords = false;
  for (const action of chordWinners.values()) {
    if (action !== null) { hasLongerChords = true; break; }
  }
  if (hasLongerChords) {
    return { type: 'chord_started', pending: testChord };
  }

  // 检查精确匹配
  let exactMatch: ParsedBinding | undefined;
  for (const binding of contextBindings) {
    if (chordExactlyMatches(testChord, binding)) {
      exactMatch = binding;
    }
  }
  if (exactMatch) {
    return exactMatch.action === null ? { type: 'unbound' } : { type: 'match', action: exactMatch.action };
  }

  return pending !== null ? { type: 'chord_cancelled' } : { type: 'none' };
}
