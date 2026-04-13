/**
 * format — 显示格式化工具
 *
 * 纯函数，无外部依赖。
 */

/**
 * 格式化字节数为可读字符串
 * @example formatFileSize(1536) → "1.5KB"
 */
export function formatFileSize(sizeInBytes: number): string {
  const kb = sizeInBytes / 1024;
  if (kb < 1) return `${sizeInBytes} bytes`;
  if (kb < 1024) return `${kb.toFixed(1).replace(/\.0$/, '')}KB`;
  const mb = kb / 1024;
  if (mb < 1024) return `${mb.toFixed(1).replace(/\.0$/, '')}MB`;
  const gb = mb / 1024;
  return `${gb.toFixed(1).replace(/\.0$/, '')}GB`;
}

/**
 * 格式化毫秒为短秒数
 * @example formatSecondsShort(1234) → "1.2s"
 */
export function formatSecondsShort(ms: number): string {
  return `${(ms / 1000).toFixed(1)}s`;
}

/**
 * 格式化毫秒为时长字符串
 * @example formatDuration(65000) → "1m 5s"
 * @example formatDuration(3661000) → "1h 1m 1s"
 */
export function formatDuration(
  ms: number,
  options?: { hideTrailingZeros?: boolean; mostSignificantOnly?: boolean },
): string {
  if (ms === 0) return '0s';
  if (ms < 1) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 60000) return `${Math.floor(ms / 1000)}s`;

  let days = Math.floor(ms / 86400000);
  let hours = Math.floor((ms % 86400000) / 3600000);
  let minutes = Math.floor((ms % 3600000) / 60000);
  let seconds = Math.round((ms % 60000) / 1000);

  // 进位处理
  if (seconds === 60) { seconds = 0; minutes++; }
  if (minutes === 60) { minutes = 0; hours++; }
  if (hours === 24) { hours = 0; days++; }

  const hide = options?.hideTrailingZeros;

  if (options?.mostSignificantOnly) {
    if (days > 0) return `${days}d`;
    if (hours > 0) return `${hours}h`;
    if (minutes > 0) return `${minutes}m`;
    return `${seconds}s`;
  }

  if (days > 0) {
    const parts = [`${days}d`];
    if (hours > 0 || !hide) parts.push(`${hours}h`);
    if (minutes > 0 || !hide) parts.push(`${minutes}m`);
    if (seconds > 0 || !hide) parts.push(`${seconds}s`);
    return parts.join(' ');
  }
  if (hours > 0) {
    const parts = [`${hours}h`];
    if (minutes > 0 || !hide) parts.push(`${minutes}m`);
    if (seconds > 0 || !hide) parts.push(`${seconds}s`);
    return parts.join(' ');
  }
  const parts = [`${minutes}m`];
  if (seconds > 0 || !hide) parts.push(`${seconds}s`);
  return parts.join(' ');
}

/**
 * 格式化数字为千分位字符串
 * @example formatNumber(12345) → "12,345"
 */
export function formatNumber(n: number): string {
  return new Intl.NumberFormat('en-US').format(n);
}

/**
 * 格式化 token 数为紧凑形式
 * @example formatTokens(1500) → "1.5k"
 * @example formatTokens(2500000) → "2.5M"
 */
export function formatTokens(count: number): string {
  if (count >= 1_000_000) return `${(count / 1_000_000).toFixed(1)}M`;
  if (count >= 1000) return `${(count / 1000).toFixed(1)}k`;
  return String(count);
}

/**
 * 截断字符串到指定宽度（终端列数），尾部加 '…'
 */
export function truncateToWidth(text: string, maxWidth: number): string {
  if (text.length <= maxWidth) return text;
  if (maxWidth <= 1) return '…';
  return text.slice(0, maxWidth - 1) + '…';
}

/**
 * 中间截断文件路径，保留目录前缀和文件名
 * @example truncatePathMiddle("src/components/deeply/nested/MyComponent.tsx", 30)
 *          → "src/components/…/MyComponent.tsx"
 */
export function truncatePathMiddle(filePath: string, maxLength: number): string {
  if (filePath.length <= maxLength) return filePath;
  if (maxLength <= 0) return '…';
  if (maxLength < 5) return truncateToWidth(filePath, maxLength);

  const lastSlash = filePath.lastIndexOf('/');
  const filename = lastSlash >= 0 ? filePath.slice(lastSlash) : filePath;
  const directory = lastSlash >= 0 ? filePath.slice(0, lastSlash) : '';

  if (filename.length >= maxLength - 1) {
    return '…' + filePath.slice(-(maxLength - 1));
  }

  const availableForDir = maxLength - 1 - filename.length;
  if (availableForDir <= 0) {
    return '…' + filename.slice(-(maxLength - 1));
  }

  return directory.slice(0, availableForDir) + '…' + filename;
}
