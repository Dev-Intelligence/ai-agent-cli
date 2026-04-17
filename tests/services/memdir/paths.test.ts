import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  getMemoryBaseDir,
  getAutoMemPath,
  getAutoMemEntrypoint,
  isAutoMemPath,
  sanitizePathForSlug,
} from '../../../src/services/memdir/paths.js';

let tmpHome = '';
const originalHomedir = os.homedir;

function setTmpHome(): void {
  tmpHome = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-memdir-'));
  (os as unknown as { homedir: () => string }).homedir = () => tmpHome;
}
function restoreHome(): void {
  (os as unknown as { homedir: () => string }).homedir = originalHomedir;
  if (tmpHome && fs.existsSync(tmpHome)) fs.rmSync(tmpHome, { recursive: true, force: true });
  tmpHome = '';
}

describe('sanitizePathForSlug', () => {
  it('绝对路径折叠为短横线', () => {
    expect(sanitizePathForSlug('/Users/foo/github/bar')).toBe('Users-foo-github-bar');
  });
  it('Windows 盘符被剥离', () => {
    expect(sanitizePathForSlug('C:\\repo\\x')).toBe('repo-x');
  });
  it('多种分隔符折叠', () => {
    expect(sanitizePathForSlug('/a///b\\\\c')).toBe('a-b-c');
  });
  it('保留中文字符', () => {
    expect(sanitizePathForSlug('/Users/小明/项目')).toBe('Users-小明-项目');
  });
});

describe('memdir 路径', () => {
  beforeEach(setTmpHome);
  afterEach(restoreHome);

  it('getMemoryBaseDir = $HOME/.ai-agent', () => {
    expect(getMemoryBaseDir()).toBe(path.join(tmpHome, '.ai-agent'));
  });

  it('getAutoMemPath 使用 cwd 生成 slug', () => {
    const p = getAutoMemPath('/Users/foo/bar');
    expect(p).toBe(
      path.join(tmpHome, '.ai-agent', 'projects', 'Users-foo-bar', 'memory')
    );
  });

  it('getAutoMemEntrypoint 在 memdir 下拼 MEMORY.md', () => {
    const p = getAutoMemEntrypoint('/Users/foo/bar');
    expect(path.basename(p)).toBe('MEMORY.md');
  });

  it('isAutoMemPath: memdir 内返回 true，外部返回 false', () => {
    const cwd = '/Users/foo/bar';
    const memdir = getAutoMemPath(cwd);
    expect(isAutoMemPath(path.join(memdir, 'x.md'), cwd)).toBe(true);
    expect(isAutoMemPath('/tmp/elsewhere.md', cwd)).toBe(false);
  });
});
