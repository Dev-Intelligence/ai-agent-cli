import { describe, it, expect } from 'vitest';
import {
  normalizeToolExecutionResult,
  toolResultContentToText,
} from '../../src/core/toolResult.js';

describe('normalizeToolExecutionResult', () => {
  it('字符串结果 → 同时作为 content 与 uiContent', () => {
    const r = normalizeToolExecutionResult('hello');
    expect(r.content).toBe('hello');
    expect(r.uiContent).toBe('hello');
    expect(r.isError).toBe(false);
  });

  it('识别中文错误前缀', () => {
    const r = normalizeToolExecutionResult('错误: 未知工具 "foo"');
    expect(r.isError).toBe(true);
  });

  it('识别英文 Error 前缀', () => {
    const r = normalizeToolExecutionResult('Error: boom');
    expect(r.isError).toBe(true);
  });

  it('识别工具执行错误前缀', () => {
    const r = normalizeToolExecutionResult('工具执行错误: xx');
    expect(r.isError).toBe(true);
  });

  it('对象结果：显式 isError 优先', () => {
    const r = normalizeToolExecutionResult({ content: 'ok', isError: true });
    expect(r.isError).toBe(true);
  });

  it('对象结果：缺省 uiContent 时取 content 字符串', () => {
    const r = normalizeToolExecutionResult({ content: 'abc' });
    expect(r.uiContent).toBe('abc');
    expect(r.isError).toBe(false);
  });

  it('对象结果：content 为块数组时 uiContent 为空字符串', () => {
    const r = normalizeToolExecutionResult({
      content: [{ type: 'text', text: 'a' }],
    });
    expect(r.uiContent).toBe('');
    expect(r.content).toEqual([{ type: 'text', text: 'a' }]);
  });

  it('保留 rawOutput / terminalId', () => {
    const r = normalizeToolExecutionResult({
      content: 'ok',
      rawOutput: { foo: 1 },
      terminalId: 't1',
    });
    expect(r.rawOutput).toEqual({ foo: 1 });
    expect(r.terminalId).toBe('t1');
  });
});

describe('toolResultContentToText', () => {
  it('直接返回字符串', () => {
    expect(toolResultContentToText('hi')).toBe('hi');
  });

  it('多 text 块以换行拼接', () => {
    expect(
      toolResultContentToText([
        { type: 'text', text: 'a' },
        { type: 'text', text: 'b' },
      ])
    ).toBe('a\nb');
  });

  it('全非文本时返回占位提示', () => {
    expect(
      toolResultContentToText([
        { type: 'image', source: { type: 'base64', media_type: 'image/png', data: 'x' } } as never,
      ])
    ).toBe('（非文本内容已省略）');
  });
});
