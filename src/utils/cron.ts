/**
 * cron — Cron 表达式解析与调度
 *
 * 支持标准 5 字段 cron：minute hour day-of-month month day-of-week
 * 字段语法：通配符(*)、步长(star/N)、范围(N-M)、列表(N,M,...)
 */

export type CronFields = {
  minute: number[];
  hour: number[];
  dayOfMonth: number[];
  month: number[];
  dayOfWeek: number[];
};

type FieldRange = { min: number; max: number };

const FIELD_RANGES: FieldRange[] = [
  { min: 0, max: 59 },  // minute
  { min: 0, max: 23 },  // hour
  { min: 1, max: 31 },  // dayOfMonth
  { min: 1, max: 12 },  // month
  { min: 0, max: 6 },   // dayOfWeek (0=Sunday; 7 accepted as alias)
];

function expandField(field: string, range: FieldRange): number[] | null {
  const { min, max } = range;
  const out = new Set<number>();

  for (const part of field.split(',')) {
    // 通配符或步长：* 或 */N
    const stepMatch = part.match(/^\*(?:\/(\d+))?$/);
    if (stepMatch) {
      const step = stepMatch[1] ? parseInt(stepMatch[1], 10) : 1;
      if (step < 1) return null;
      for (let i = min; i <= max; i += step) out.add(i);
      continue;
    }

    // 范围：N-M 或 N-M/S
    const rangeMatch = part.match(/^(\d+)-(\d+)(?:\/(\d+))?$/);
    if (rangeMatch) {
      const lo = parseInt(rangeMatch[1]!, 10);
      const hi = parseInt(rangeMatch[2]!, 10);
      const step = rangeMatch[3] ? parseInt(rangeMatch[3], 10) : 1;
      const isDow = min === 0 && max === 6;
      const effMax = isDow ? 7 : max;
      if (lo > hi || step < 1 || lo < min || hi > effMax) return null;
      for (let i = lo; i <= hi; i += step) {
        out.add(isDow && i === 7 ? 0 : i);
      }
      continue;
    }

    // 单值：N
    const singleMatch = part.match(/^\d+$/);
    if (singleMatch) {
      let n = parseInt(part, 10);
      if (min === 0 && max === 6 && n === 7) n = 0; // 7=Sunday
      if (n < min || n > max) return null;
      out.add(n);
      continue;
    }

    return null;
  }

  if (out.size === 0) return null;
  return Array.from(out).sort((a, b) => a - b);
}

/**
 * 解析 5 字段 cron 表达式
 * @returns CronFields 或 null（无效语法）
 */
export function parseCronExpression(expr: string): CronFields | null {
  const parts = expr.trim().split(/\s+/);
  if (parts.length !== 5) return null;

  const expanded: number[][] = [];
  for (let i = 0; i < 5; i++) {
    const result = expandField(parts[i]!, FIELD_RANGES[i]!);
    if (!result) return null;
    expanded.push(result);
  }

  return {
    minute: expanded[0]!,
    hour: expanded[1]!,
    dayOfMonth: expanded[2]!,
    month: expanded[3]!,
    dayOfWeek: expanded[4]!,
  };
}

/**
 * 计算下次匹配时间（严格在 from 之后）
 * 使用本地时区。最多搜索 366 天。
 */
export function computeNextCronRun(fields: CronFields, from: Date): Date | null {
  const minuteSet = new Set(fields.minute);
  const hourSet = new Set(fields.hour);
  const domSet = new Set(fields.dayOfMonth);
  const monthSet = new Set(fields.month);
  const dowSet = new Set(fields.dayOfWeek);

  const domWild = fields.dayOfMonth.length === 31;
  const dowWild = fields.dayOfWeek.length === 7;

  const t = new Date(from.getTime());
  t.setSeconds(0, 0);
  t.setMinutes(t.getMinutes() + 1);

  const maxIter = 366 * 24 * 60;
  for (let i = 0; i < maxIter; i++) {
    const month = t.getMonth() + 1;
    if (!monthSet.has(month)) {
      t.setMonth(t.getMonth() + 1, 1);
      t.setHours(0, 0, 0, 0);
      continue;
    }

    const dom = t.getDate();
    const dow = t.getDay();
    const dayMatches =
      domWild && dowWild ? true
      : domWild ? dowSet.has(dow)
      : dowWild ? domSet.has(dom)
      : domSet.has(dom) || dowSet.has(dow);

    if (!dayMatches) {
      t.setDate(t.getDate() + 1);
      t.setHours(0, 0, 0, 0);
      continue;
    }

    if (!hourSet.has(t.getHours())) {
      t.setHours(t.getHours() + 1, 0, 0, 0);
      continue;
    }

    if (!minuteSet.has(t.getMinutes())) {
      t.setMinutes(t.getMinutes() + 1);
      continue;
    }

    return t;
  }

  return null;
}

// ─── 人类可读格式 ───

const DAY_NAMES = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

function formatLocalTime(minute: number, hour: number): string {
  const d = new Date(2000, 0, 1, hour, minute);
  return d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' });
}

/**
 * 将 cron 表达式转换为人类可读的描述
 */
export function cronToHuman(cron: string): string {
  const parts = cron.trim().split(/\s+/);
  if (parts.length !== 5) return cron;

  const [minute, hour, dayOfMonth, month, dayOfWeek] = parts as [string, string, string, string, string];

  // 每 N 分钟
  const everyMinMatch = minute.match(/^\*\/(\d+)$/);
  if (everyMinMatch && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyMinMatch[1]!, 10);
    return n === 1 ? 'Every minute' : `Every ${n} minutes`;
  }

  // 每小时
  if (minute.match(/^\d+$/) && hour === '*' && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const m = parseInt(minute, 10);
    if (m === 0) return 'Every hour';
    return `Every hour at :${m.toString().padStart(2, '0')}`;
  }

  // 每 N 小时
  const everyHourMatch = hour.match(/^\*\/(\d+)$/);
  if (minute.match(/^\d+$/) && everyHourMatch && dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    const n = parseInt(everyHourMatch[1]!, 10);
    const m = parseInt(minute, 10);
    const suffix = m === 0 ? '' : ` at :${m.toString().padStart(2, '0')}`;
    return n === 1 ? `Every hour${suffix}` : `Every ${n} hours${suffix}`;
  }

  if (!minute.match(/^\d+$/) || !hour.match(/^\d+$/)) return cron;
  const m = parseInt(minute, 10);
  const h = parseInt(hour, 10);

  // 每天指定时间
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '*') {
    return `Every day at ${formatLocalTime(m, h)}`;
  }

  // 每周指定日
  if (dayOfMonth === '*' && month === '*' && dayOfWeek.match(/^\d$/)) {
    const dayName = DAY_NAMES[parseInt(dayOfWeek, 10) % 7];
    if (dayName) return `Every ${dayName} at ${formatLocalTime(m, h)}`;
  }

  // 工作日
  if (dayOfMonth === '*' && month === '*' && dayOfWeek === '1-5') {
    return `Weekdays at ${formatLocalTime(m, h)}`;
  }

  return cron;
}
