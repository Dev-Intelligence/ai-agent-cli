import { describe, it, expect } from 'vitest';
import {
  BashCommandHookSchema,
  PromptHookSchema,
  HttpHookSchema,
  AgentHookSchema,
  HookCommandSchema,
  HookMatcherSchema,
  HooksSchema,
  HOOK_EVENTS,
  SHELL_TYPES,
} from '../../src/schemas/hooks.js';

describe('BashCommandHookSchema', () => {
  it('最小合法对象', () => {
    const r = BashCommandHookSchema.safeParse({ type: 'command', command: 'echo hi' });
    expect(r.success).toBe(true);
  });

  it('shell 枚举校验', () => {
    const r = BashCommandHookSchema.safeParse({
      type: 'command',
      command: 'x',
      shell: 'zsh',
    });
    expect(r.success).toBe(false);
  });

  it('timeout 必须为正数', () => {
    const ok = BashCommandHookSchema.safeParse({
      type: 'command',
      command: 'x',
      timeout: 5,
    });
    const neg = BashCommandHookSchema.safeParse({
      type: 'command',
      command: 'x',
      timeout: -1,
    });
    expect(ok.success).toBe(true);
    expect(neg.success).toBe(false);
  });

  it('完整字段全通过', () => {
    const r = BashCommandHookSchema.safeParse({
      type: 'command',
      command: 'x',
      if: 'Bash(git *)',
      shell: 'bash',
      timeout: 10,
      statusMessage: 'running',
      once: true,
      async: true,
      asyncRewake: false,
    });
    expect(r.success).toBe(true);
  });
});

describe('PromptHookSchema', () => {
  it('需要 prompt 字段', () => {
    expect(PromptHookSchema.safeParse({ type: 'prompt' }).success).toBe(false);
    expect(
      PromptHookSchema.safeParse({ type: 'prompt', prompt: 'p' }).success,
    ).toBe(true);
  });
});

describe('HttpHookSchema', () => {
  it('url 必须合法', () => {
    expect(
      HttpHookSchema.safeParse({ type: 'http', url: 'not-a-url' }).success,
    ).toBe(false);
    expect(
      HttpHookSchema.safeParse({ type: 'http', url: 'https://example.com' })
        .success,
    ).toBe(true);
  });

  it('headers 为字符串字典', () => {
    const r = HttpHookSchema.safeParse({
      type: 'http',
      url: 'https://x',
      headers: { Authorization: 'Bearer $TOKEN' },
      allowedEnvVars: ['TOKEN'],
    });
    expect(r.success).toBe(true);
  });
});

describe('AgentHookSchema', () => {
  it('缺 prompt 失败', () => {
    expect(AgentHookSchema.safeParse({ type: 'agent' }).success).toBe(false);
  });
  it('有 prompt + model 通过', () => {
    expect(
      AgentHookSchema.safeParse({
        type: 'agent',
        prompt: '验证单测通过',
        model: 'claude-sonnet-4-6',
      }).success,
    ).toBe(true);
  });
});

describe('HookCommandSchema discriminated union', () => {
  it('按 type 分发', () => {
    const cmd = HookCommandSchema.safeParse({ type: 'command', command: 'x' });
    const prompt = HookCommandSchema.safeParse({ type: 'prompt', prompt: 'p' });
    const http = HookCommandSchema.safeParse({ type: 'http', url: 'https://x' });
    const agent = HookCommandSchema.safeParse({ type: 'agent', prompt: 'q' });
    expect([cmd.success, prompt.success, http.success, agent.success]).toEqual([
      true,
      true,
      true,
      true,
    ]);
  });

  it('未知 type 拒绝', () => {
    expect(
      HookCommandSchema.safeParse({ type: 'webhook', url: 'x' }).success,
    ).toBe(false);
  });
});

describe('HookMatcherSchema', () => {
  it('hooks 必填、matcher 可选', () => {
    expect(HookMatcherSchema.safeParse({ hooks: [] }).success).toBe(true);
    expect(HookMatcherSchema.safeParse({}).success).toBe(false);
  });
});

describe('HooksSchema', () => {
  it('以 hook 事件名为键', () => {
    const r = HooksSchema.safeParse({
      PreToolUse: [
        { matcher: 'Bash', hooks: [{ type: 'command', command: 'echo pre' }] },
      ],
      PostToolUse: [{ hooks: [] }],
    });
    expect(r.success).toBe(true);
  });

  it('未知事件名拒绝', () => {
    const r = HooksSchema.safeParse({ BogusEvent: [{ hooks: [] }] });
    expect(r.success).toBe(false);
  });
});

describe('常量', () => {
  it('HOOK_EVENTS 是只读数组', () => {
    expect(HOOK_EVENTS).toContain('PreToolUse');
    expect(HOOK_EVENTS).toContain('PostToolUse');
    expect(HOOK_EVENTS.length).toBeGreaterThan(10);
  });

  it('SHELL_TYPES 包含 bash / powershell', () => {
    expect(SHELL_TYPES).toEqual(['bash', 'powershell']);
  });
});
