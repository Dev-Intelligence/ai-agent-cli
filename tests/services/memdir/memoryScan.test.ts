import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { scanMemories, groupByType } from '../../../src/services/memdir/memoryScan.js';
import { parseMemoryType, MEMORY_TYPES } from '../../../src/services/memdir/memoryTypes.js';

let memdir = '';

function setupMemdir(): void {
  memdir = fs.mkdtempSync(path.join(os.tmpdir(), 'aac-mems-'));
}
function teardown(): void {
  if (memdir && fs.existsSync(memdir)) fs.rmSync(memdir, { recursive: true, force: true });
  memdir = '';
}

function write(file: string, content: string): void {
  fs.writeFileSync(path.join(memdir, file), content, 'utf-8');
}

describe('parseMemoryType', () => {
  it('合法类型直通', () => {
    for (const t of MEMORY_TYPES) expect(parseMemoryType(t)).toBe(t);
  });
  it('非法值返回 undefined', () => {
    expect(parseMemoryType('foo')).toBeUndefined();
    expect(parseMemoryType(123)).toBeUndefined();
    expect(parseMemoryType(undefined)).toBeUndefined();
  });
});

describe('scanMemories', () => {
  beforeEach(setupMemdir);
  afterEach(teardown);

  it('空目录 → []', async () => {
    expect(await scanMemories({ memdirPath: memdir })).toEqual([]);
  });

  it('不存在的目录 → []', async () => {
    expect(await scanMemories({ memdirPath: path.join(memdir, 'nope') })).toEqual([]);
  });

  it('跳过 MEMORY.md 与非 .md 文件', async () => {
    write('MEMORY.md', '---\nname: idx\n---\n内容');
    write('readme.txt', 'hi');
    write('user_role.md', '---\nname: user-role\ndescription: 用户画像\ntype: user\n---\n正文');
    const records = await scanMemories({ memdirPath: memdir });
    expect(records.map((r) => r.fileName)).toEqual(['user_role.md']);
  });

  it('正确解析 frontmatter 与正文', async () => {
    write(
      'feedback_terse.md',
      '---\nname: feedback-terse\ndescription: 用户希望简短回答\ntype: feedback\n---\n正文内容'
    );
    const [rec] = await scanMemories({ memdirPath: memdir });
    expect(rec).toBeDefined();
    expect(rec?.name).toBe('feedback-terse');
    expect(rec?.description).toBe('用户希望简短回答');
    expect(rec?.type).toBe('feedback');
    expect(rec?.body).toBe('正文内容');
  });

  it('缺 frontmatter 时 name 回退到文件名', async () => {
    write('no_frontmatter.md', '就是正文');
    const [rec] = await scanMemories({ memdirPath: memdir });
    expect(rec?.name).toBe('no_frontmatter');
    expect(rec?.type).toBeUndefined();
  });

  it('非法 type 字段 → type=undefined 但仍保留记录', async () => {
    write('bad.md', '---\nname: x\ntype: bogus\n---\n正文');
    const [rec] = await scanMemories({ memdirPath: memdir });
    expect(rec?.type).toBeUndefined();
  });
});

describe('groupByType', () => {
  it('按类型分桶', () => {
    const records = [
      { type: 'user', name: 'a' } as never,
      { type: 'user', name: 'b' } as never,
      { type: 'feedback', name: 'c' } as never,
      { type: undefined, name: 'd' } as never,
    ];
    const g = groupByType(records);
    expect(g.user).toHaveLength(2);
    expect(g.feedback).toHaveLength(1);
    expect(g.unknown).toHaveLength(1);
    expect(g.project).toHaveLength(0);
  });
});
