/**
 * 给消息标签 / 聊天列表等场景格式化时间戳。
 *
 * 展示方式按年龄分档（类似消息 app）：
 *   - 当天：       "13:30" 或 "1:30 PM"（取决于 locale）
 *   - 6 天内：     "周日, 16:15"
 *   - 更早：       "周日, 2 月 20 日, 16:30"
 *
 * 尊重 POSIX 环境变量 LC_ALL / LC_TIME / LANG 决定 12h vs 24h、
 * 周名、月名等；Node/V8 在某些平台上 `toLocaleString(undefined)`
 * 不读 POSIX 变量，所以这里自己解析成 BCP 47 locale tag。
 *
 * `now` 可注入，方便测试。
 */
export function formatBriefTimestamp(
  isoString: string,
  now: Date = new Date(),
): string {
  const d = new Date(isoString);
  if (Number.isNaN(d.getTime())) {
    return '';
  }

  const locale = getLocale();
  const dayDiff = startOfDay(now) - startOfDay(d);
  const daysAgo = Math.round(dayDiff / 86_400_000);

  if (daysAgo === 0) {
    return d.toLocaleTimeString(locale, {
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  if (daysAgo > 0 && daysAgo < 7) {
    return d.toLocaleString(locale, {
      weekday: 'long',
      hour: 'numeric',
      minute: '2-digit',
    });
  }

  return d.toLocaleString(locale, {
    weekday: 'long',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

/**
 * 从 POSIX 环境变量推断 BCP 47 locale。
 * 优先级 LC_ALL > LC_TIME > LANG；失败返回 undefined 走系统默认。
 * POSIX 格式（en_GB.UTF-8）→ BCP 47（en-GB）。
 */
function getLocale(): string | undefined {
  const raw =
    process.env.LC_ALL || process.env.LC_TIME || process.env.LANG || '';
  if (!raw || raw === 'C' || raw === 'POSIX') {
    return undefined;
  }
  const base = raw.split('.')[0]!.split('@')[0]!;
  if (!base) {
    return undefined;
  }
  const tag = base.replaceAll('_', '-');
  // 用 Intl 构造器验证 tag 合法性，非法则退回默认
  try {
    new Intl.DateTimeFormat(tag);
    return tag;
  } catch {
    return undefined;
  }
}

function startOfDay(d: Date): number {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
}
