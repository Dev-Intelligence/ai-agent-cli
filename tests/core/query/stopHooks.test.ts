import { describe, it, expect } from 'vitest';
import {
  StopChain,
  abortHook,
  maxTurnsHook,
  finalResponseHook,
  streamInterruptedHook,
  createDefaultStopChain,
} from '../../../src/core/query/stopHooks.js';

function makeCtx(partial: Parameters<typeof finalResponseHook>[0] extends never
  ? never
  : Partial<Parameters<ReturnType<typeof finalResponseHook>>[0]>) {
  return {
    turn: 1,
    maxTurns: 20,
    toolCallCount: 1,
    ...partial,
  } as Parameters<ReturnType<typeof finalResponseHook>>[0];
}

describe('maxTurnsHook', () => {
  const hook = maxTurnsHook();
  it('turn < max 不停', () => {
    expect(hook(makeCtx({ turn: 5, maxTurns: 20 })).shouldStop).toBe(false);
  });
  it('turn === max 停', () => {
    const d = hook(makeCtx({ turn: 20, maxTurns: 20 }));
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe('max_turns');
    expect(d.message).toContain('20');
  });
});

describe('abortHook', () => {
  const hook = abortHook();
  it('无信号不停', () => {
    expect(hook(makeCtx({})).shouldStop).toBe(false);
  });
  it('signal.aborted=true 停', () => {
    const ac = new AbortController();
    ac.abort();
    const d = hook(makeCtx({ abortSignal: ac.signal }));
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe('aborted');
  });
});

describe('finalResponseHook', () => {
  const hook = finalResponseHook();
  it('无工具调用 → 停（final_response）', () => {
    const d = hook(makeCtx({ toolCallCount: 0, adapterStopReason: 'end_turn' }));
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe('final_response');
  });
  it('有工具调用 + tool_use stopReason → 不停', () => {
    expect(
      hook(makeCtx({ toolCallCount: 2, adapterStopReason: 'tool_use' })).shouldStop
    ).toBe(false);
  });
  it('有工具调用 但 stopReason 非工具类 → 停', () => {
    expect(
      hook(makeCtx({ toolCallCount: 2, adapterStopReason: 'end_turn' })).shouldStop
    ).toBe(true);
  });
});

describe('streamInterruptedHook', () => {
  const hook = streamInterruptedHook();
  it('interrupted → 停', () => {
    const d = hook(makeCtx({ adapterStopReason: 'interrupted' }));
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe('stream_interrupted');
  });
  it('其他 stopReason → 不停', () => {
    expect(hook(makeCtx({ adapterStopReason: 'end_turn' })).shouldStop).toBe(false);
  });
});

describe('StopChain', () => {
  it('首个 shouldStop=true 的钩子胜出', () => {
    const chain = new StopChain()
      .add(() => ({ shouldStop: false }))
      .add(() => ({ shouldStop: true, reason: 'max_turns', message: 'A' }))
      .add(() => ({ shouldStop: true, reason: 'error', message: 'B' }));
    const d = chain.evaluate(makeCtx({}));
    expect(d.shouldStop).toBe(true);
    expect(d.reason).toBe('max_turns');
    expect(d.message).toBe('A');
  });

  it('全部不停 → 返回 shouldStop=false', () => {
    const chain = new StopChain()
      .add(() => ({ shouldStop: false }))
      .add(() => ({ shouldStop: false }));
    expect(chain.evaluate(makeCtx({})).shouldStop).toBe(false);
  });

  it('size 反映注册数', () => {
    const chain = new StopChain().add(() => ({ shouldStop: false }));
    expect(chain.size).toBe(1);
  });
});

describe('createDefaultStopChain', () => {
  it('默认注册 4 个钩子', () => {
    expect(createDefaultStopChain().size).toBe(4);
  });

  it('abort 优先于 maxTurns', () => {
    const chain = createDefaultStopChain();
    const ac = new AbortController();
    ac.abort();
    const d = chain.evaluate(makeCtx({
      turn: 100,
      maxTurns: 1,
      abortSignal: ac.signal,
    }));
    expect(d.reason).toBe('aborted');
  });
});
