import { describe, it, expect } from 'vitest';
import {
  getPatchFromContents,
  renderHunksForUI,
  summarizeHunks,
  countPatchChanges,
  formatPatchAsText,
} from '../../src/utils/diff.js';

describe('renderHunksForUI', () => {
  it('空 hunk → 空串', () => {
    expect(renderHunksForUI([])).toBe('');
  });

  it('纯新增块带 +++ 前缀与行号', () => {
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: 'line 1\nline 2\nline 3\n',
      newContent: 'line 1\nline 2\ninserted\nline 3\n',
    });
    const out = renderHunksForUI(hunks);
    expect(out).toContain('+++');
    expect(out).toContain('inserted');
    // 上下文行带空格前缀（无 ───/+++）
    expect(out).toMatch(/       \d+ \| line 1/);
  });

  it('纯删除块带 ─── 前缀', () => {
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: 'line 1\nREMOVE\nline 3\n',
      newContent: 'line 1\nline 3\n',
    });
    const out = renderHunksForUI(hunks);
    expect(out).toContain('───');
    expect(out).toContain('REMOVE');
  });

  it('替换块：旧行 ─── + 新行 +++', () => {
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: 'foo\nOLD\nbar\n',
      newContent: 'foo\nNEW\nbar\n',
    });
    const out = renderHunksForUI(hunks);
    expect(out).toContain('─── ');
    expect(out).toContain('+++ ');
    expect(out).toContain('OLD');
    expect(out).toContain('NEW');
  });

  it('行号右对齐，宽度按最大行号算', () => {
    const big = Array.from({ length: 120 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
    const modified = big.replace('line 100', 'LINE_ONE_HUNDRED');
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: big,
      newContent: modified,
    });
    const out = renderHunksForUI(hunks);
    // 120 是 3 位数，所以所有行号应该是 3 列宽
    expect(out).toMatch(/\| line \d/); // 至少有行内容
    // 检查 +++ 行的行号宽度
    const plusLine = out.split('\n').find((l) => l.startsWith('  +++'));
    expect(plusLine).toBeDefined();
    expect(plusLine!).toMatch(/\+\+\+ {0,2}\d{1,3} \|/);
  });

  it('多 hunk 之间用 ⋯ 隔开', () => {
    const old = Array.from({ length: 30 }, (_, i) => `line ${i + 1}`).join('\n') + '\n';
    const updated = old
      .replace('line 3', 'LINE_THREE')
      .replace('line 27', 'LINE_TWENTY_SEVEN');
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: old,
      newContent: updated,
    });
    expect(hunks.length).toBeGreaterThan(1);
    const out = renderHunksForUI(hunks);
    expect(out).toContain('⋯');
  });

  it('忽略 "\\ No newline at end of file" 行', () => {
    const hunks = [
      {
        oldStart: 1,
        oldLines: 1,
        newStart: 1,
        newLines: 1,
        lines: ['-old', '+new', '\\ No newline at end of file'],
      },
    ];
    const out = renderHunksForUI(hunks);
    expect(out).not.toContain('No newline');
  });
});

describe('summarizeHunks', () => {
  it('空 → "0 hunks"', () => {
    expect(summarizeHunks([])).toBe('0 hunks');
  });

  it('1 hunk 纯新增 → "1 hunk, +N"', () => {
    const hunks = getPatchFromContents({
      filePath: 'a',
      oldContent: 'a\n',
      newContent: 'a\nb\nc\n',
    });
    const s = summarizeHunks(hunks);
    expect(s).toMatch(/^1 hunk, \+\d+$/);
  });

  it('1 hunk 混合改动 → "1 hunk, +N, -M"', () => {
    const hunks = getPatchFromContents({
      filePath: 'a',
      oldContent: 'a\nOLD\nc\n',
      newContent: 'a\nNEW\nd\n',
    });
    expect(summarizeHunks(hunks)).toMatch(/^1 hunk, \+\d+, -\d+$/);
  });

  it('多 hunk 用 "hunks" 复数', () => {
    const hunks = [
      { oldStart: 1, oldLines: 1, newStart: 1, newLines: 1, lines: ['-a', '+b'] },
      { oldStart: 10, oldLines: 1, newStart: 10, newLines: 1, lines: ['-c', '+d'] },
    ];
    expect(summarizeHunks(hunks)).toMatch(/^2 hunks/);
  });
});

describe('countPatchChanges / formatPatchAsText 回归', () => {
  it('countPatchChanges 数量正确', () => {
    const hunks = getPatchFromContents({
      filePath: 'a',
      oldContent: 'a\nb\nc\n',
      newContent: 'a\nX\nY\nc\n',
    });
    const { additions, removals } = countPatchChanges(hunks);
    expect(additions).toBe(2);
    expect(removals).toBe(1);
  });

  it('formatPatchAsText 仍产出 unified diff 格式', () => {
    const hunks = getPatchFromContents({
      filePath: 'a.ts',
      oldContent: 'foo\n',
      newContent: 'bar\n',
    });
    const text = formatPatchAsText('a.ts', hunks);
    expect(text).toContain('--- a.ts');
    expect(text).toContain('+++ a.ts');
    expect(text).toContain('@@');
  });
});
