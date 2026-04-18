import { describe, it, expect } from 'vitest';
import {
  AppError,
  MalformedCommandError,
  AbortError,
  ConfigParseError,
  ShellError,
  isAbortError,
  hasExactErrorMessage,
  toError,
  errorMessage,
  getErrnoCode,
  isENOENT,
  getErrnoPath,
  shortErrorStack,
  isFsInaccessible,
  classifyAxiosError,
} from '../../src/utils/errors.js';

describe('错误类', () => {
  it('AppError 的 name === 子类构造器名', () => {
    class MyE extends AppError {}
    expect(new MyE('x').name).toBe('MyE');
  });
  it('AbortError name === AbortError', () => {
    expect(new AbortError().name).toBe('AbortError');
  });
  it('ConfigParseError 携带 filePath 与 defaultConfig', () => {
    const e = new ConfigParseError('bad', '/a.json', { fallback: true });
    expect(e.filePath).toBe('/a.json');
    expect(e.defaultConfig).toEqual({ fallback: true });
  });
  it('ShellError 携带四个字段', () => {
    const e = new ShellError('stdout', 'stderr', 42, true);
    expect(e.stdout).toBe('stdout');
    expect(e.code).toBe(42);
    expect(e.interrupted).toBe(true);
  });
  it('MalformedCommandError 继承 AppError', () => {
    expect(new MalformedCommandError('x')).toBeInstanceOf(AppError);
  });
});

describe('isAbortError', () => {
  it('我们的 AbortError', () => {
    expect(isAbortError(new AbortError())).toBe(true);
  });
  it('name=AbortError 的普通 Error', () => {
    const e = new Error('x');
    e.name = 'AbortError';
    expect(isAbortError(e)).toBe(true);
  });
  it('其它错误 → false', () => {
    expect(isAbortError(new Error('x'))).toBe(false);
    expect(isAbortError('string')).toBe(false);
    expect(isAbortError(null)).toBe(false);
  });
});

describe('hasExactErrorMessage / toError / errorMessage', () => {
  it('hasExactErrorMessage 精确匹配 message', () => {
    expect(hasExactErrorMessage(new Error('boom'), 'boom')).toBe(true);
    expect(hasExactErrorMessage(new Error('boom!'), 'boom')).toBe(false);
  });
  it('toError 归一', () => {
    expect(toError('oops')).toBeInstanceOf(Error);
    expect(toError(new Error('x')).message).toBe('x');
  });
  it('errorMessage 提取 message', () => {
    expect(errorMessage(new Error('x'))).toBe('x');
    expect(errorMessage('plain')).toBe('plain');
    expect(errorMessage(42)).toBe('42');
  });
});

describe('getErrnoCode / isENOENT / getErrnoPath / isFsInaccessible', () => {
  it('getErrnoCode 从对象上抽 string code', () => {
    expect(getErrnoCode({ code: 'ENOENT' })).toBe('ENOENT');
    expect(getErrnoCode({ code: 42 })).toBeUndefined();
    expect(getErrnoCode(null)).toBeUndefined();
  });
  it('isENOENT 只认 ENOENT', () => {
    expect(isENOENT({ code: 'ENOENT' })).toBe(true);
    expect(isENOENT({ code: 'EACCES' })).toBe(false);
  });
  it('getErrnoPath 从对象上抽 path', () => {
    expect(getErrnoPath({ path: '/tmp/x' })).toBe('/tmp/x');
    expect(getErrnoPath({ path: 42 })).toBeUndefined();
  });
  it('isFsInaccessible 覆盖 ENOENT/EACCES/EPERM/ENOTDIR/ELOOP', () => {
    expect(isFsInaccessible({ code: 'ENOENT' })).toBe(true);
    expect(isFsInaccessible({ code: 'EACCES' })).toBe(true);
    expect(isFsInaccessible({ code: 'EPERM' })).toBe(true);
    expect(isFsInaccessible({ code: 'ENOTDIR' })).toBe(true);
    expect(isFsInaccessible({ code: 'ELOOP' })).toBe(true);
    expect(isFsInaccessible({ code: 'UNKNOWN' })).toBe(false);
  });
});

describe('shortErrorStack', () => {
  it('非 Error → toString', () => {
    expect(shortErrorStack('oops')).toBe('oops');
  });
  it('Error 无 stack → message', () => {
    const e = new Error('x');
    delete (e as { stack?: string }).stack;
    expect(shortErrorStack(e)).toBe('x');
  });
  it('截短到 maxFrames', () => {
    const e = new Error('x');
    e.stack =
      'Error: x\n    at f1\n    at f2\n    at f3\n    at f4\n    at f5\n    at f6';
    const out = shortErrorStack(e, 2);
    expect(out).toContain('Error: x');
    expect(out).toContain('at f1');
    expect(out).toContain('at f2');
    expect(out).not.toContain('at f3');
  });
  it('帧数 <= maxFrames 时原样返回', () => {
    const e = new Error('x');
    e.stack = 'Error: x\n    at f1\n    at f2';
    expect(shortErrorStack(e, 10)).toBe(e.stack);
  });
});

describe('classifyAxiosError', () => {
  it('非 axios → other', () => {
    expect(classifyAxiosError(new Error('plain'))).toEqual({
      kind: 'other',
      message: 'plain',
    });
  });
  it('401/403 → auth', () => {
    const err = Object.assign(new Error('unauthorized'), {
      isAxiosError: true,
      response: { status: 401 },
    });
    const r = classifyAxiosError(err);
    expect(r).toEqual({ kind: 'auth', status: 401, message: 'unauthorized' });
  });
  it('ECONNABORTED → timeout', () => {
    const err = Object.assign(new Error('timeout'), {
      isAxiosError: true,
      code: 'ECONNABORTED',
    });
    expect(classifyAxiosError(err).kind).toBe('timeout');
  });
  it('ECONNREFUSED / ENOTFOUND → network', () => {
    expect(
      classifyAxiosError(
        Object.assign(new Error('x'), {
          isAxiosError: true,
          code: 'ECONNREFUSED',
        }),
      ).kind,
    ).toBe('network');
    expect(
      classifyAxiosError(
        Object.assign(new Error('x'), {
          isAxiosError: true,
          code: 'ENOTFOUND',
        }),
      ).kind,
    ).toBe('network');
  });
  it('其它 axios 错误 → http', () => {
    expect(
      classifyAxiosError(
        Object.assign(new Error('x'), {
          isAxiosError: true,
          response: { status: 500 },
        }),
      ).kind,
    ).toBe('http');
  });
});
