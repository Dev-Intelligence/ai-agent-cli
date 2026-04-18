import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadHooksConfig,
  saveHooksConfig,
  getLastHookLoadWarnings,
} from '../../../src/services/config/hooks.js';

let tmp = '';
let tmpHome = '';
const originalHomedir = os.homedir;

function setup(): void {
  tmp = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-hooks-'));
  tmpHome = path.join(tmp, 'home');
  fs.mkdirSync(tmpHome, { recursive: true });
  (os as unknown as { homedir: () => string }).homedir = () => tmpHome;
}
function teardown(): void {
  (os as unknown as { homedir: () => string }).homedir = originalHomedir;
  if (tmp && fs.existsSync(tmp)) fs.rmSync(tmp, { recursive: true, force: true });
  tmp = tmpHome = '';
}

function writeProjectHooks(json: unknown): string {
  const dir = path.join(tmp, '.ai-agent');
  fs.mkdirSync(dir, { recursive: true });
  const fp = path.join(dir, 'hooks.json');
  fs.writeFileSync(fp, JSON.stringify(json), 'utf-8');
  return fp;
}

describe('loadHooksConfig zod 校验', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('空目录返回空数组，无警告', () => {
    expect(loadHooksConfig(tmp)).toEqual([]);
    expect(getLastHookLoadWarnings()).toEqual([]);
  });

  it('合法 `{ hooks: [...] }` 格式', () => {
    writeProjectHooks({
      hooks: [{ event: 'PreToolUse', command: 'echo pre' }],
    });
    const list = loadHooksConfig(tmp);
    expect(list).toHaveLength(1);
    expect(list[0]?.event).toBe('PreToolUse');
    expect(getLastHookLoadWarnings()).toEqual([]);
  });

  it('合法数组顶层格式', () => {
    writeProjectHooks([{ event: 'PostToolUse', command: 'echo post' }]);
    const list = loadHooksConfig(tmp);
    expect(list).toHaveLength(1);
  });

  it('非 JSON → 空 + 警告', () => {
    const dir = path.join(tmp, '.ai-agent');
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'hooks.json'), 'not json', 'utf-8');
    expect(loadHooksConfig(tmp)).toEqual([]);
    const warns = getLastHookLoadWarnings();
    expect(warns[0]?.message).toContain('JSON');
  });

  it('缺 command → schema 警告', () => {
    writeProjectHooks({ hooks: [{ event: 'PreToolUse' }] });
    expect(loadHooksConfig(tmp)).toEqual([]);
    const warns = getLastHookLoadWarnings();
    expect(warns[0]?.message).toContain('Schema');
  });

  it('非法 event → schema 警告', () => {
    writeProjectHooks({
      hooks: [{ event: 'FakeEvent', command: 'x' }],
    });
    expect(loadHooksConfig(tmp)).toEqual([]);
    const warns = getLastHookLoadWarnings();
    expect(warns[0]?.message).toContain('Schema');
  });

  it('未知 hook 事件（schema 通过但 core 不支持）→ 过滤 + 提示', () => {
    // Stop 是 schemas/hooks.ts 里列的但 core/hooks.ts 的 HookEvent 不包含
    writeProjectHooks({
      hooks: [
        { event: 'Stop', command: 'x' },
        { event: 'PreToolUse', command: 'y' },
      ],
    });
    const list = loadHooksConfig(tmp);
    expect(list).toHaveLength(1);
    expect(list[0]?.event).toBe('PreToolUse');
    const warns = getLastHookLoadWarnings();
    expect(warns.some((w) => w.message.includes('Stop'))).toBe(true);
  });

  it('toolFilter 字段校验', () => {
    writeProjectHooks({
      hooks: [
        {
          event: 'PreToolUse',
          command: 'echo',
          toolFilter: ['Bash', 'Read'],
          timeout: 5000,
          blocking: false,
        },
      ],
    });
    const list = loadHooksConfig(tmp);
    expect(list[0]).toMatchObject({
      event: 'PreToolUse',
      command: 'echo',
      toolFilter: ['Bash', 'Read'],
      timeout: 5000,
      blocking: false,
    });
  });

  it('saveHooksConfig → loadHooksConfig 往返', () => {
    saveHooksConfig(
      tmp,
      [{ event: 'PreToolUse', command: 'save-test' }],
      'project',
    );
    const list = loadHooksConfig(tmp);
    expect(list[0]?.command).toBe('save-test');
  });

  it('多次 load 重置警告', () => {
    writeProjectHooks({ hooks: [{ event: 'Bogus', command: 'x' }] });
    loadHooksConfig(tmp);
    expect(getLastHookLoadWarnings().length).toBeGreaterThan(0);

    // 重新写入合法内容后，警告应清零
    writeProjectHooks({
      hooks: [{ event: 'PreToolUse', command: 'ok' }],
    });
    loadHooksConfig(tmp);
    expect(getLastHookLoadWarnings()).toEqual([]);
  });
});
