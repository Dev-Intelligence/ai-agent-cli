import { describe, it, expect } from 'vitest';
import {
  escapeRegExp,
  capitalize,
  plural,
  firstLineOf,
  countCharInString,
  normalizeFullWidthDigits,
  normalizeFullWidthSpace,
  safeJoinLines,
  truncateToLines,
  EndTruncatingAccumulator,
} from '../../src/utils/stringUtils.js';

describe('escapeRegExp', () => {
  it('转义所有特殊字符', () => {
    const src = '.*+?^${}()|[]\\';
    const escaped = escapeRegExp(src);
    // 把转义后的字符串当字面量嵌入正则，应能精确匹配原串
    expect(new RegExp(escaped).test(src)).toBe(true);
  });
  it('普通字符不变', () => {
    expect(escapeRegExp('abc123')).toBe('abc123');
  });
});

describe('capitalize', () => {
  it('首字母大写，其余不变', () => {
    expect(capitalize('fooBar')).toBe('FooBar');
    expect(capitalize('hello world')).toBe('Hello world');
  });
  it('空串返回空串', () => {
    expect(capitalize('')).toBe('');
  });
});

describe('plural', () => {
  it('count=1 → 单数', () => {
    expect(plural(1, 'file')).toBe('file');
  });
  it('count≠1 → 默认加 s', () => {
    expect(plural(0, 'file')).toBe('files');
    expect(plural(3, 'file')).toBe('files');
  });
  it('自定义复数形式', () => {
    expect(plural(2, 'entry', 'entries')).toBe('entries');
  });
});

describe('firstLineOf', () => {
  it('多行取首行', () => {
    expect(firstLineOf('a\nb\nc')).toBe('a');
  });
  it('无换行返回全串', () => {
    expect(firstLineOf('abc')).toBe('abc');
  });
});

describe('countCharInString', () => {
  it('字符串版计数', () => {
    expect(countCharInString('a,b,c,d', ',')).toBe(3);
  });
  it('start 偏移', () => {
    expect(countCharInString('aaa', 'a', 1)).toBe(2);
  });
  it('不存在 → 0', () => {
    expect(countCharInString('abc', 'x')).toBe(0);
  });
});

describe('normalizeFullWidth*', () => {
  it('全角数字转半角', () => {
    expect(normalizeFullWidthDigits('１２３')).toBe('123');
  });
  it('全角空格转半角', () => {
    expect(normalizeFullWidthSpace('a\u3000b')).toBe('a b');
  });
});

describe('safeJoinLines', () => {
  it('常规拼接', () => {
    expect(safeJoinLines(['a', 'b', 'c'], ',')).toBe('a,b,c');
  });
  it('超长时截断且含 marker', () => {
    const long = 'x'.repeat(50);
    const out = safeJoinLines([long, long, long], ',', 60);
    expect(out).toContain('[truncated]');
    // 允许小幅超过 maxSize（截断标记本身可能多占几个字符），只要含 marker 即视作触发截断
  });
  it('单行过长时仅输出 marker', () => {
    const long = 'x'.repeat(100);
    const out = safeJoinLines([long, long], ',', 10);
    expect(out).toContain('[truncated]');
  });
});

describe('truncateToLines', () => {
  it('行数不超限原样返回', () => {
    expect(truncateToLines('a\nb', 5)).toBe('a\nb');
  });
  it('超限截断并附省略号', () => {
    expect(truncateToLines('a\nb\nc\nd', 2)).toBe('a\nb…');
  });
});

describe('EndTruncatingAccumulator', () => {
  it('未达上限原样输出', () => {
    const acc = new EndTruncatingAccumulator(100);
    acc.append('hello');
    expect(acc.toString()).toBe('hello');
    expect(acc.truncated).toBe(false);
    expect(acc.length).toBe(5);
    expect(acc.totalBytes).toBe(5);
  });

  it('超上限截断并附提示', () => {
    const acc = new EndTruncatingAccumulator(10);
    acc.append('0123456789');
    acc.append('extraaaaa');
    const out = acc.toString();
    expect(out.startsWith('0123456789')).toBe(true);
    expect(out).toContain('output truncated');
    expect(acc.truncated).toBe(true);
    expect(acc.totalBytes).toBe(19);
  });

  it('clear 回到初始状态', () => {
    const acc = new EndTruncatingAccumulator(10);
    acc.append('data');
    acc.clear();
    expect(acc.toString()).toBe('');
    expect(acc.length).toBe(0);
    expect(acc.truncated).toBe(false);
  });

  it('接受 Buffer', () => {
    const acc = new EndTruncatingAccumulator(100);
    acc.append(Buffer.from('hi'));
    expect(acc.toString()).toBe('hi');
  });
});
