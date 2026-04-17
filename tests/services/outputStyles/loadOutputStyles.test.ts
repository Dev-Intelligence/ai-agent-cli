import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {
  loadOutputStyles,
  findOutputStyle,
  getProjectOutputStylesDir,
  getUserOutputStylesDir,
} from '../../../src/services/outputStyles/loadOutputStyles.js';

let tmpRoot = '';
let cwd = '';
let tmpHome = '';
const originalHomedir = os.homedir;

function setup(): void {
  tmpRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-styles-'));
  cwd = path.join(tmpRoot, 'proj');
  tmpHome = path.join(tmpRoot, 'home');
  fs.mkdirSync(cwd, { recursive: true });
  fs.mkdirSync(tmpHome, { recursive: true });
  (os as unknown as { homedir: () => string }).homedir = () => tmpHome;
}

function teardown(): void {
  (os as unknown as { homedir: () => string }).homedir = originalHomedir;
  if (tmpRoot && fs.existsSync(tmpRoot)) fs.rmSync(tmpRoot, { recursive: true, force: true });
  tmpRoot = cwd = tmpHome = '';
}

function writeStyle(dir: string, fileName: string, body: string): void {
  fs.mkdirSync(dir, { recursive: true });
  fs.writeFileSync(path.join(dir, fileName), body, 'utf-8');
}

describe('路径工具', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('项目目录 = <cwd>/.ai-agent/output-styles', () => {
    expect(getProjectOutputStylesDir(cwd)).toBe(
      path.join(cwd, '.ai-agent', 'output-styles'),
    );
  });

  it('用户目录 = $HOME/.ai-agent/output-styles', () => {
    expect(getUserOutputStylesDir()).toBe(
      path.join(tmpHome, '.ai-agent', 'output-styles'),
    );
  });
});

describe('loadOutputStyles', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('两端都无 → []', async () => {
    expect(await loadOutputStyles({ cwd })).toEqual([]);
  });

  it('解析 frontmatter（name / description）', async () => {
    writeStyle(
      getProjectOutputStylesDir(cwd),
      'concise.md',
      '---\nname: 简洁\ndescription: 只看结果\n---\n样式正文',
    );
    const list = await loadOutputStyles({ cwd });
    expect(list).toHaveLength(1);
    expect(list[0]).toMatchObject({
      name: '简洁',
      description: '只看结果',
      prompt: '样式正文',
      source: 'project',
    });
  });

  it('缺 description 时从正文截取', async () => {
    writeStyle(
      getProjectOutputStylesDir(cwd),
      'auto.md',
      '---\nname: 自动描述\n---\n第一句。第二句。',
    );
    const [style] = await loadOutputStyles({ cwd });
    expect(style?.description).toBe('第一句。');
  });

  it('缺 name 时 fallback 到文件名', async () => {
    writeStyle(
      getProjectOutputStylesDir(cwd),
      'brief.md',
      '---\ndescription: d\n---\n内容',
    );
    const [style] = await loadOutputStyles({ cwd });
    expect(style?.name).toBe('brief');
  });

  it('项目级覆盖用户级（同名）', async () => {
    writeStyle(
      getUserOutputStylesDir(),
      's.md',
      '---\nname: shared\ndescription: user\n---\nu',
    );
    writeStyle(
      getProjectOutputStylesDir(cwd),
      's.md',
      '---\nname: shared\ndescription: project\n---\np',
    );
    const list = await loadOutputStyles({ cwd });
    expect(list).toHaveLength(1);
    expect(list[0]?.source).toBe('project');
    expect(list[0]?.description).toBe('project');
  });

  it('不同名共存', async () => {
    writeStyle(getUserOutputStylesDir(), 'a.md', '---\nname: a\n---\n.');
    writeStyle(getProjectOutputStylesDir(cwd), 'b.md', '---\nname: b\n---\n.');
    const list = await loadOutputStyles({ cwd });
    expect(list.map((s) => s.name).sort()).toEqual(['a', 'b']);
  });

  it('损坏文件被跳过', async () => {
    writeStyle(
      getProjectOutputStylesDir(cwd),
      'good.md',
      '---\nname: good\n---\nbody',
    );
    // 写一个二进制看不懂的文件当 .md
    fs.writeFileSync(
      path.join(getProjectOutputStylesDir(cwd), 'bad.md'),
      Buffer.from([0xff, 0xfe, 0xfd]),
    );
    const list = await loadOutputStyles({ cwd });
    expect(list.map((s) => s.name)).toContain('good');
  });

  it('非 .md 文件被忽略', async () => {
    writeStyle(getProjectOutputStylesDir(cwd), 'readme.txt', 'hi');
    expect(await loadOutputStyles({ cwd })).toEqual([]);
  });
});

describe('findOutputStyle', () => {
  beforeEach(setup);
  afterEach(teardown);

  it('命中', async () => {
    writeStyle(
      getProjectOutputStylesDir(cwd),
      'x.md',
      '---\nname: 目标\n---\n内容',
    );
    const s = await findOutputStyle('目标', { cwd });
    expect(s?.prompt).toBe('内容');
  });

  it('未命中返回 undefined', async () => {
    expect(await findOutputStyle('nope', { cwd })).toBeUndefined();
  });
});
