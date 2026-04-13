/**
 * keybindings — 快捷键系统统一导出
 */

export type { ParsedKeystroke, Chord, KeybindingContextName, ParsedBinding, KeybindingBlock } from './types.js';
export { parseKeystroke, parseChord, parseBindings, keystrokeToString, chordToString, keystrokeToDisplayString, chordToDisplayString } from './parser.js';
export { getKeyName, matchesKeystroke, matchesBinding } from './match.js';
export { resolveKey, resolveKeyWithChordState, getBindingDisplayText, keystrokesEqual } from './resolver.js';
export type { ResolveResult, ChordResolveResult } from './resolver.js';
export { DEFAULT_KEYBINDING_BLOCKS, getDefaultBindings } from './defaultBindings.js';
