import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getConfigDir,
  getConfigPath,
  hasConfig,
  loadUserConfig,
  saveUserConfig,
  mergeAndSaveUserConfig,
  removeUserConfig,
  getConfigSummary,
  type UserConfig,
} from '../../../src/services/config/configStore.js';

// 使用隔离的 HOME，避免污染真实用户配置。
// 注：configStore 在每次调用时读 os.homedir()，但 Node 可能缓存结果。
// 改用覆盖 os.homedir 的方式保证精确。
let tmpHome = '';
const originalHomedir = os.homedir;

function setTmpHome(): void {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-home-'));
  (os as unknown as { homedir: () => string }).homedir = () => tmpHome;
}

function restoreHome(): void {
  (os as unknown as { homedir: () => string }).homedir = originalHomedir;
  if (tmpHome && fs.existsSync(tmpHome)) {
    fs.rmSync(tmpHome, { recursive: true, force: true });
  }
  tmpHome = '';
}

const sample: UserConfig = {
  provider: 'anthropic',
  apiKey: 'sk-ant-0123456789abcdef',
  model: 'claude-sonnet-4',
};

describe('configStore 路径', () => {
  beforeEach(setTmpHome);
  afterEach(restoreHome);

  it('getConfigDir → $HOME/.ai-agent', () => {
    expect(getConfigDir()).toBe(path.join(tmpHome, '.ai-agent'));
  });

  it('getConfigPath → $HOME/.ai-agent/config.json', () => {
    expect(getConfigPath()).toBe(path.join(tmpHome, '.ai-agent', 'config.json'));
  });
});

describe('configStore 读写', () => {
  beforeEach(setTmpHome);
  afterEach(restoreHome);

  it('初始状态 hasConfig=false, loadUserConfig=null', () => {
    expect(hasConfig()).toBe(false);
    expect(loadUserConfig()).toBeNull();
  });

  it('save → load 往返', () => {
    saveUserConfig(sample);
    expect(hasConfig()).toBe(true);
    expect(loadUserConfig()).toEqual(sample);
  });

  it('mergeAndSaveUserConfig 保留未改字段', () => {
    saveUserConfig({ ...sample, mascot: 'cat', baseUrl: 'https://x' });
    const merged = mergeAndSaveUserConfig({
      provider: 'openai',
      apiKey: 'sk-new',
      model: 'gpt-4',
    });
    expect(merged.provider).toBe('openai');
    expect(merged.mascot).toBe('cat');
    expect(merged.baseUrl).toBe('https://x');
  });

  it('mergeAndSaveUserConfig clearBaseUrl=true 移除 baseUrl', () => {
    saveUserConfig({ ...sample, baseUrl: 'https://x' });
    const merged = mergeAndSaveUserConfig(
      { provider: 'openai', apiKey: 'k', model: 'm' },
      { clearBaseUrl: true }
    );
    expect(merged.baseUrl).toBeUndefined();
  });

  it('removeUserConfig 删除后 hasConfig=false', () => {
    saveUserConfig(sample);
    expect(removeUserConfig()).toBe(true);
    expect(hasConfig()).toBe(false);
  });

  it('removeUserConfig 不存在时返回 false', () => {
    expect(removeUserConfig()).toBe(false);
  });

  it('损坏 JSON → loadUserConfig 返回 null 而非抛异常', () => {
    fs.mkdirSync(getConfigDir(), { recursive: true });
    fs.writeFileSync(getConfigPath(), '{ broken', 'utf-8');
    expect(loadUserConfig()).toBeNull();
  });
});

describe('getConfigSummary', () => {
  it('脱敏 apiKey 并包含 provider / model', () => {
    const s = getConfigSummary({ ...sample, baseUrl: 'https://api.example' });
    expect(s).toContain('anthropic');
    expect(s).toContain('claude-sonnet-4');
    expect(s).toContain('...');
    expect(s).not.toContain(sample.apiKey);
    expect(s).toContain('https://api.example');
  });
});
