import { describe, it, expect } from 'vitest';
import { findRelevantMemories } from '../../../src/services/memdir/findRelevantMemories.js';
import type { MemoryRecord } from '../../../src/services/memdir/memoryScan.js';

function mk(partial: Partial<MemoryRecord>): MemoryRecord {
  return {
    filePath: '/mem/x.md',
    fileName: 'x.md',
    name: 'default',
    description: '',
    body: '',
    type: undefined,
    mtimeMs: Date.now(),
    ...partial,
  };
}

describe('findRelevantMemories', () => {
  it('空输入 → 空结果', () => {
    expect(findRelevantMemories('', [mk({ name: 'x' })])).toEqual([]);
  });

  it('仅停用词 → 空结果', () => {
    expect(findRelevantMemories('the a is of', [mk({ name: 'x' })])).toEqual([]);
  });

  it('按 description 高权重排名', () => {
    const mems = [
      mk({ name: 'a', description: 'python 数据分析', body: '' }),
      mk({ name: 'b', description: '完全无关', body: 'python 出现一次' }),
    ];
    const result = findRelevantMemories('用 python 做数据分析', mems);
    expect(result[0]?.name).toBe('a');
  });

  it('body 多次命中累加但上限 5', () => {
    const mems = [
      mk({ name: 'spammy', body: 'python '.repeat(20) }),
      mk({ name: 'once', body: 'python 一次' }),
    ];
    const result = findRelevantMemories('python', mems);
    expect(result[0]?.name).toBe('spammy'); // 虽然被封顶但仍高于 once
    // spammy 封顶后得分 = 5；once 得分 = 1
    expect(result[0]?.score).toBeGreaterThanOrEqual(result[1]?.score ?? 0);
  });

  it('user/feedback 类型额外 +1', () => {
    const mems = [
      mk({ name: 'userM', type: 'user', body: 'react' }),
      mk({ name: 'projM', type: 'project', body: 'react' }),
    ];
    const result = findRelevantMemories('react', mems);
    expect(result[0]?.name).toBe('userM');
  });

  it('recency 加权：7 天内得分更高', () => {
    const now = Date.now();
    const mems = [
      mk({ name: 'fresh', body: 'docker', mtimeMs: now - 1 * 86400_000 }),
      mk({ name: 'old', body: 'docker', mtimeMs: now - 200 * 86400_000 }),
    ];
    const result = findRelevantMemories('docker', mems, { now });
    expect(result[0]?.name).toBe('fresh');
  });

  it('limit 截断结果', () => {
    const mems = Array.from({ length: 10 }, (_, i) =>
      mk({ name: `m${i}`, body: 'nodejs' })
    );
    const result = findRelevantMemories('nodejs', mems, { limit: 3 });
    expect(result).toHaveLength(3);
  });

  it('minScore 过滤低分', () => {
    const mems = [mk({ name: 'barely', body: 'foo' })];
    const result = findRelevantMemories('foo', mems, { minScore: 100 });
    expect(result).toEqual([]);
  });

  it('无命中返回空数组', () => {
    const mems = [mk({ name: 'x', body: '毫无关系的内容' })];
    expect(findRelevantMemories('kubernetes', mems)).toEqual([]);
  });
});
