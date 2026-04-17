import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { formatBriefTimestamp } from '../../src/utils/formatBriefTimestamp.js';

const originalEnv = { ...process.env };

beforeEach(() => {
  // 固定 locale，避免 CI / 本地差异
  process.env.LC_ALL = 'en_US.UTF-8';
  delete process.env.LC_TIME;
  delete process.env.LANG;
});

afterEach(() => {
  process.env = { ...originalEnv };
});

describe('formatBriefTimestamp', () => {
  it('非法输入 → 空字符串', () => {
    expect(formatBriefTimestamp('not-a-date')).toBe('');
    expect(formatBriefTimestamp('')).toBe('');
  });

  it('当天只显示时间', () => {
    const now = new Date('2026-04-18T13:30:00');
    const iso = new Date('2026-04-18T09:15:00').toISOString();
    const out = formatBriefTimestamp(iso, now);
    // 不写死 "9:15"，但必须包含小时 9 和分钟 15 的某种形态
    expect(out).toMatch(/\b9\b/);
    expect(out).toMatch(/15/);
  });

  it('6 天内显示星期', () => {
    const now = new Date('2026-04-18T12:00:00');
    const iso = new Date('2026-04-15T12:00:00').toISOString(); // 3 天前
    const out = formatBriefTimestamp(iso, now);
    // en_US locale 里星期为英文；匹配一个大写英文词
    expect(out).toMatch(/[A-Z][a-z]+day/);
  });

  it('更早显示 weekday + 月日', () => {
    const now = new Date('2026-04-18T12:00:00');
    const iso = new Date('2026-02-20T16:30:00').toISOString();
    const out = formatBriefTimestamp(iso, now);
    expect(out).toMatch(/Feb|20/);
  });

  it('LC_ALL=C 回退系统默认', () => {
    process.env.LC_ALL = 'C';
    const now = new Date('2026-04-18T12:00:00');
    const iso = new Date('2026-04-18T10:00:00').toISOString();
    const out = formatBriefTimestamp(iso, now);
    expect(typeof out).toBe('string');
    expect(out.length).toBeGreaterThan(0);
  });
});
