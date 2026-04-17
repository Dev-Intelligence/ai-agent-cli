import { describe, it, expect } from 'vitest';
import {
  NON_REBINDABLE,
  TERMINAL_RESERVED,
  MACOS_RESERVED,
  getReservedShortcuts,
  normalizeKeyForComparison,
} from '../../../src/ui/keybindings/reservedShortcuts.js';

describe('常量表', () => {
  it('NON_REBINDABLE 包含 ctrl+c / ctrl+d / ctrl+m', () => {
    const keys = NON_REBINDABLE.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(['ctrl+c', 'ctrl+d', 'ctrl+m']));
  });

  it('TERMINAL_RESERVED 包含 ctrl+z 与 ctrl+\\', () => {
    const keys = TERMINAL_RESERVED.map((r) => r.key);
    expect(keys).toEqual(expect.arrayContaining(['ctrl+z', 'ctrl+\\']));
  });

  it('MACOS_RESERVED 仅列 cmd+* 组合', () => {
    for (const r of MACOS_RESERVED) expect(r.key.startsWith('cmd+')).toBe(true);
  });
});

describe('getReservedShortcuts', () => {
  it('必定包含 NON_REBINDABLE 与 TERMINAL_RESERVED', () => {
    const all = getReservedShortcuts().map((r) => r.key);
    expect(all).toEqual(expect.arrayContaining(['ctrl+c', 'ctrl+z']));
  });
});

describe('normalizeKeyForComparison', () => {
  it('修饰键归一（control→ctrl, option→alt, command→cmd）', () => {
    expect(normalizeKeyForComparison('Control+K')).toBe('ctrl+k');
    expect(normalizeKeyForComparison('Option+A')).toBe('alt+a');
    expect(normalizeKeyForComparison('Command+Q')).toBe('cmd+q');
  });

  it('修饰键顺序归一（按字母排序）', () => {
    expect(normalizeKeyForComparison('shift+ctrl+k')).toBe('ctrl+shift+k');
    expect(normalizeKeyForComparison('alt+shift+ctrl+k')).toBe('alt+ctrl+shift+k');
  });

  it('chord 按步归一并保留空格分隔', () => {
    expect(normalizeKeyForComparison('ctrl+x  ctrl+k')).toBe('ctrl+x ctrl+k');
    expect(normalizeKeyForComparison('Shift+Ctrl+X ctrl+b')).toBe('ctrl+shift+x ctrl+b');
  });

  it('空白归一', () => {
    expect(normalizeKeyForComparison('  ctrl+k  ')).toBe('ctrl+k');
  });
});
