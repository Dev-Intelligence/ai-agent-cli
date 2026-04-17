import { describe, it, expect } from 'vitest';
import { parseBindings } from '../../../src/ui/keybindings/parser.js';
import {
  resolveKey,
  resolveKeyWithChordState,
  getBindingDisplayText,
  keystrokesEqual,
} from '../../../src/ui/keybindings/resolver.js';
import type { KeyLike } from '../../../src/ui/keybindings/match.js';

function emptyKey(o: Partial<KeyLike> = {}): KeyLike {
  return {
    upArrow: false,
    downArrow: false,
    leftArrow: false,
    rightArrow: false,
    pageUp: false,
    pageDown: false,
    return: false,
    escape: false,
    ctrl: false,
    shift: false,
    tab: false,
    backspace: false,
    delete: false,
    meta: false,
    super: false,
    ...o,
  };
}

const bindings = parseBindings([
  {
    context: 'Global',
    bindings: {
      'ctrl+k': 'app:clear',
      'ctrl+x ctrl+s': 'app:save',
      'ctrl+x ctrl+k': null,
    },
  },
  {
    context: 'Chat',
    bindings: {
      'ctrl+k': 'chat:override',
    },
  },
]);

describe('resolveKey', () => {
  it('命中单键绑定', () => {
    const r = resolveKey('k', emptyKey({ ctrl: true }), ['Global'], bindings);
    expect(r).toEqual({ type: 'match', action: 'app:clear' });
  });

  it('后定义的 context 覆盖先定义的（同一按键）', () => {
    const r = resolveKey('k', emptyKey({ ctrl: true }), ['Global', 'Chat'], bindings);
    expect(r).toEqual({ type: 'match', action: 'chat:override' });
  });

  it('未激活的 context 不参与匹配', () => {
    const r = resolveKey('k', emptyKey({ ctrl: true }), ['OtherCtx'], bindings);
    expect(r.type).toBe('none');
  });

  it('无匹配 → none', () => {
    const r = resolveKey('z', emptyKey({ ctrl: true }), ['Global'], bindings);
    expect(r.type).toBe('none');
  });
});

describe('getBindingDisplayText', () => {
  it('取到绑定的和弦字符串', () => {
    expect(getBindingDisplayText('app:clear', 'Global', bindings)).toBe('ctrl+k');
    expect(getBindingDisplayText('app:save', 'Global', bindings)).toBe('ctrl+x ctrl+s');
  });

  it('未知动作 → undefined', () => {
    expect(getBindingDisplayText('nope', 'Global', bindings)).toBeUndefined();
  });
});

describe('keystrokesEqual', () => {
  it('alt 与 meta 视为等价', () => {
    const a = {
      key: 'k',
      ctrl: false,
      alt: true,
      meta: false,
      shift: false,
      super: false,
    };
    const b = {
      key: 'k',
      ctrl: false,
      alt: false,
      meta: true,
      shift: false,
      super: false,
    };
    expect(keystrokesEqual(a, b)).toBe(true);
  });

  it('super 与 alt/meta 独立', () => {
    const a = {
      key: 'a',
      ctrl: false,
      alt: true,
      meta: true,
      shift: false,
      super: false,
    };
    const b = {
      key: 'a',
      ctrl: false,
      alt: false,
      meta: false,
      shift: false,
      super: true,
    };
    expect(keystrokesEqual(a, b)).toBe(false);
  });
});

describe('resolveKeyWithChordState', () => {
  it('能作为更长和弦的前缀 → chord_started', () => {
    const r = resolveKeyWithChordState(
      'x',
      emptyKey({ ctrl: true }),
      ['Global'],
      bindings,
      null,
    );
    expect(r.type).toBe('chord_started');
    if (r.type === 'chord_started') expect(r.pending).toHaveLength(1);
  });

  it('和弦完成 → match', () => {
    const step1 = resolveKeyWithChordState(
      'x',
      emptyKey({ ctrl: true }),
      ['Global'],
      bindings,
      null,
    );
    expect(step1.type).toBe('chord_started');
    if (step1.type !== 'chord_started') return;

    const step2 = resolveKeyWithChordState(
      's',
      emptyKey({ ctrl: true }),
      ['Global'],
      bindings,
      step1.pending,
    );
    expect(step2).toEqual({ type: 'match', action: 'app:save' });
  });

  it('和弦里 Escape → chord_cancelled', () => {
    const r = resolveKeyWithChordState(
      '',
      emptyKey({ escape: true }),
      ['Global'],
      bindings,
      [{ key: 'x', ctrl: true, alt: false, shift: false, meta: false, super: false }],
    );
    expect(r.type).toBe('chord_cancelled');
  });

  it('和弦以 null 解绑的目标收尾 → unbound', () => {
    const step1 = resolveKeyWithChordState(
      'x',
      emptyKey({ ctrl: true }),
      ['Global'],
      bindings,
      null,
    );
    if (step1.type !== 'chord_started') return;
    const step2 = resolveKeyWithChordState(
      'k',
      emptyKey({ ctrl: true }),
      ['Global'],
      bindings,
      step1.pending,
    );
    expect(step2.type).toBe('unbound');
  });
});
