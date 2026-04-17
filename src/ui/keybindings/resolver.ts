/**
 * 键位解析器
 *
 * 把 Ink 的 Key 类型抽象为本项目定义的 KeyLike，
 * 便于脱离具体 Ink 版本测试。
 */

import { getKeyName, matchesBinding, type KeyLike } from './match.js';
import { chordToString } from './parser.js';
import type {
  KeybindingContextName,
  ParsedBinding,
  ParsedKeystroke,
} from './types.js';

/** 单键位解析结果 */
export type ResolveResult =
  | { type: 'match'; action: string }
  | { type: 'none' }
  | { type: 'unbound' };

/** 含和弦状态的解析结果 */
export type ChordResolveResult =
  | { type: 'match'; action: string }
  | { type: 'none' }
  | { type: 'unbound' }
  | { type: 'chord_started'; pending: ParsedKeystroke[] }
  | { type: 'chord_cancelled' };

/**
 * 把一次按键解析为动作。
 * 纯函数：无状态、无副作用，仅用来做匹配。
 *
 * @param input 从 Ink 收到的字符输入
 * @param key Ink Key 对象（带各修饰键标志）
 * @param activeContexts 当前激活的上下文列表（如 ['Chat', 'Global']）
 * @param bindings 所有已解析的绑定
 */
export function resolveKey(
  input: string,
  key: KeyLike,
  activeContexts: KeybindingContextName[],
  bindings: ParsedBinding[],
): ResolveResult {
  // 找到最后一条匹配的绑定（后定义的覆盖先定义的，方便用户覆写默认）
  let match: ParsedBinding | undefined;
  const ctxSet = new Set(activeContexts);

  for (const binding of bindings) {
    // 第一阶段：仅处理单键绑定
    if (binding.chord.length !== 1) continue;
    if (!ctxSet.has(binding.context)) continue;

    if (matchesBinding(input, key, binding)) {
      match = binding;
    }
  }

  if (!match) {
    return { type: 'none' };
  }

  if (match.action === null) {
    return { type: 'unbound' };
  }

  return { type: 'match', action: match.action };
}

/**
 * 为一个动作取其显示文本（比如给 "app:toggleTodos" 显示 "ctrl+t"）。
 * 倒序查找确保用户自定义覆盖优先。
 */
export function getBindingDisplayText(
  action: string,
  context: KeybindingContextName,
  bindings: ParsedBinding[],
): string | undefined {
  // 倒序线性查找（等价于 findLast，兼容 TS lib 低于 ES2023 的配置）
  for (let i = bindings.length - 1; i >= 0; i--) {
    const b = bindings[i]!;
    if (b.action === action && b.context === context) {
      return chordToString(b.chord);
    }
  }
  return undefined;
}

/** 用 Ink 的 input/key 构造一个 ParsedKeystroke */
function buildKeystroke(input: string, key: KeyLike): ParsedKeystroke | null {
  const keyName = getKeyName(input, key);
  if (!keyName) return null;

  // 怪癖：Ink 在按 Esc 时会把 meta 也置成 true（参见 input-event.ts）。
  // 这是终端历史原因 —— 单独的 escape 绑定不应因此挂上 meta 修饰。
  const effectiveMeta = key.escape ? false : !!key.meta;

  return {
    key: keyName,
    ctrl: !!key.ctrl,
    alt: effectiveMeta,
    shift: !!key.shift,
    meta: effectiveMeta,
    super: !!key.super,
  };
}

/**
 * 判断两个 ParsedKeystroke 是否等价。
 * 把 alt / meta 合成一个逻辑修饰键 —— 终端无法区分两者
 * （详见 match.ts 的 modifiersMatch），所以 "alt+k" 与 "meta+k" 等价。
 * super（cmd/win）是独立修饰键，只有支持 kitty 协议的终端才会发送。
 */
export function keystrokesEqual(
  a: ParsedKeystroke,
  b: ParsedKeystroke,
): boolean {
  return (
    a.key === b.key &&
    a.ctrl === b.ctrl &&
    a.shift === b.shift &&
    (a.alt || a.meta) === (b.alt || b.meta) &&
    a.super === b.super
  );
}

/** 判断 prefix 是否为 binding.chord 的严格前缀 */
function chordPrefixMatches(
  prefix: ParsedKeystroke[],
  binding: ParsedBinding,
): boolean {
  if (prefix.length >= binding.chord.length) return false;
  for (let i = 0; i < prefix.length; i++) {
    const prefixKey = prefix[i];
    const bindingKey = binding.chord[i];
    if (!prefixKey || !bindingKey) return false;
    if (!keystrokesEqual(prefixKey, bindingKey)) return false;
  }
  return true;
}

/** 判断 chord 是否与 binding.chord 完全一致 */
function chordExactlyMatches(
  chord: ParsedKeystroke[],
  binding: ParsedBinding,
): boolean {
  if (chord.length !== binding.chord.length) return false;
  for (let i = 0; i < chord.length; i++) {
    const chordKey = chord[i];
    const bindingKey = binding.chord[i];
    if (!chordKey || !bindingKey) return false;
    if (!keystrokesEqual(chordKey, bindingKey)) return false;
  }
  return true;
}

/**
 * 支持和弦状态的按键解析。
 *
 * 这个函数处理多键和弦，如 "ctrl+k ctrl+s"。
 *
 * @param pending 当前和弦尚未完成时已经累积的键击（无和弦时为 null）
 */
export function resolveKeyWithChordState(
  input: string,
  key: KeyLike,
  activeContexts: KeybindingContextName[],
  bindings: ParsedBinding[],
  pending: ParsedKeystroke[] | null,
): ChordResolveResult {
  // 和弦中按 Escape → 整串取消
  if (key.escape && pending !== null) {
    return { type: 'chord_cancelled' };
  }

  // 构造当前按下的键击
  const currentKeystroke = buildKeystroke(input, key);
  if (!currentKeystroke) {
    if (pending !== null) {
      return { type: 'chord_cancelled' };
    }
    return { type: 'none' };
  }

  // 把 pending + current 拼成测试序列
  const testChord = pending
    ? [...pending, currentKeystroke]
    : [currentKeystroke];

  // 用 Set 按 active contexts 过滤绑定（O(n) 查找）
  const ctxSet = new Set(activeContexts);
  const contextBindings = bindings.filter((b) => ctxSet.has(b.context));

  // 看当前序列是否可以作为更长和弦的前缀。
  // 用 Map 按 chord 字符串去重：如果后来的 null 解绑覆盖了默认绑定，
  // 那么 "ctrl+x" 不应继续进入等待和弦状态。
  const chordWinners = new Map<string, string | null>();
  for (const binding of contextBindings) {
    if (
      binding.chord.length > testChord.length &&
      chordPrefixMatches(testChord, binding)
    ) {
      chordWinners.set(chordToString(binding.chord), binding.action);
    }
  }
  let hasLongerChords = false;
  for (const action of chordWinners.values()) {
    if (action !== null) {
      hasLongerChords = true;
      break;
    }
  }

  // 若当前按键可以作为更长和弦的起始，优先进入和弦等待
  //（即便存在一个完整的单键匹配，也让更长和弦胜出）
  if (hasLongerChords) {
    return { type: 'chord_started', pending: testChord };
  }

  // 检查是否有完全匹配（最后一个胜出）
  let exactMatch: ParsedBinding | undefined;
  for (const binding of contextBindings) {
    if (chordExactlyMatches(testChord, binding)) {
      exactMatch = binding;
    }
  }

  if (exactMatch) {
    if (exactMatch.action === null) {
      return { type: 'unbound' };
    }
    return { type: 'match', action: exactMatch.action };
  }

  // 既无匹配又无更长和弦可等：和弦中状态 → 取消；否则无事发生
  if (pending !== null) {
    return { type: 'chord_cancelled' };
  }

  return { type: 'none' };
}
