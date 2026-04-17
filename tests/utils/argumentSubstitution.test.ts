import { describe, it, expect } from 'vitest';
import {
  parseArguments,
  parseArgumentNames,
  generateProgressiveArgumentHint,
  substituteArguments,
} from '../../src/utils/argumentSubstitution.js';

describe('parseArguments', () => {
  it('空/空白 → []', () => {
    expect(parseArguments('')).toEqual([]);
    expect(parseArguments('   ')).toEqual([]);
  });
  it('空白分隔', () => {
    expect(parseArguments('a b c')).toEqual(['a', 'b', 'c']);
  });
  it('双引号整体', () => {
    expect(parseArguments('a "hello world" b')).toEqual(['a', 'hello world', 'b']);
  });
  it('单引号整体', () => {
    expect(parseArguments("a 'hello world' b")).toEqual(['a', 'hello world', 'b']);
  });
  it('单引号内反斜杠原样保留（bash 一致）', () => {
    expect(parseArguments(`'a\\b'`)).toEqual(['a\\b']);
  });
  it('双引号内反斜杠转义', () => {
    expect(parseArguments('"a\\"b"')).toEqual(['a"b']);
  });
});

describe('parseArgumentNames', () => {
  it('字符串按空白拆', () => {
    expect(parseArgumentNames('foo bar baz')).toEqual(['foo', 'bar', 'baz']);
  });
  it('数组直接过滤', () => {
    expect(parseArgumentNames(['foo', '', 'bar'])).toEqual(['foo', 'bar']);
  });
  it('纯数字名被过滤（与 $0/$1 简写冲突）', () => {
    expect(parseArgumentNames('1 foo 22')).toEqual(['foo']);
  });
  it('undefined → []', () => {
    expect(parseArgumentNames(undefined)).toEqual([]);
  });
});

describe('generateProgressiveArgumentHint', () => {
  it('全部填完返回 undefined', () => {
    expect(generateProgressiveArgumentHint(['a', 'b'], ['x', 'y'])).toBeUndefined();
  });
  it('剩余部分拼方括号', () => {
    expect(generateProgressiveArgumentHint(['a', 'b', 'c'], ['x'])).toBe(
      '[b] [c]',
    );
  });
});

describe('substituteArguments', () => {
  it('undefined args → 原样', () => {
    expect(substituteArguments('hello $ARGUMENTS', undefined)).toBe('hello $ARGUMENTS');
  });

  it('$ARGUMENTS 整段替换', () => {
    expect(substituteArguments('hi $ARGUMENTS', 'a b')).toBe('hi a b');
  });

  it('$0 / $1 简写', () => {
    expect(substituteArguments('$0-$1', 'a b')).toBe('a-b');
  });

  it('$ARGUMENTS[0] 索引语法', () => {
    expect(substituteArguments('[$ARGUMENTS[1]]', 'a b c')).toBe('[b]');
  });

  it('缺失索引展为空串', () => {
    expect(substituteArguments('x-$5-y', 'a b')).toBe('x--y');
  });

  it('具名参数映射', () => {
    const out = substituteArguments('$who 去 $where', 'alice 北京', true, ['who', 'where']);
    expect(out).toBe('alice 去 北京');
  });

  it('无占位符且 appendIfNoPlaceholder=true → 附加到末尾', () => {
    expect(substituteArguments('hello', 'world')).toBe('hello\n\nARGUMENTS: world');
  });

  it('无占位符且 appendIfNoPlaceholder=false → 不追加', () => {
    expect(substituteArguments('hello', 'world', false)).toBe('hello');
  });

  it('空 args 不附加', () => {
    expect(substituteArguments('hello', '')).toBe('hello');
  });
});
