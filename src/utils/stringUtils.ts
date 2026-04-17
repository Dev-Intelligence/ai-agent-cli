/**
 * 通用字符串工具 + 安全的大字符串累积器
 *
 * 所有函数为纯函数，适合 diff 渲染 / shell 输出缓冲等场景。
 */

/**
 * 转义正则元字符，让一个字符串可以作为字面量用于 `new RegExp(...)`。
 */
export function escapeRegExp(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * 首字母大写，其余不变。
 * 注意：与 lodash 的 capitalize 不同，不会把后续字符变小写。
 *
 * @example capitalize('fooBar') → 'FooBar'
 * @example capitalize('hello world') → 'Hello world'
 */
export function capitalize(str: string): string {
  return str.charAt(0).toUpperCase() + str.slice(1);
}

/**
 * 按 count 返回单复数形式，替代内联的 `word${n === 1 ? '' : 's'}` 模式。
 *
 * @example plural(1, 'file') → 'file'
 * @example plural(3, 'file') → 'files'
 * @example plural(2, 'entry', 'entries') → 'entries'
 */
export function plural(
  n: number,
  word: string,
  pluralWord: string = word + 's',
): string {
  return n === 1 ? word : pluralWord;
}

/**
 * 返回首行（不分配完整的 split 数组），用于 diff 渲染的 shebang 识别等场景。
 */
export function firstLineOf(s: string): string {
  const nl = s.indexOf('\n');
  return nl === -1 ? s : s.slice(0, nl);
}

/**
 * 用 indexOf 跳跃统计字符出现次数，避免逐字符迭代。
 * 结构类型化使得 Buffer 也能传入（Buffer.indexOf 接受字符串 needle）。
 */
export function countCharInString(
  str: { indexOf(search: string, start?: number): number },
  char: string,
  start = 0,
): number {
  let count = 0;
  let i = str.indexOf(char, start);
  while (i !== -1) {
    count++;
    i = str.indexOf(char, i + 1);
  }
  return count;
}

/** 全角数字 → 半角数字（适配日文/CJK IME 输入） */
export function normalizeFullWidthDigits(input: string): string {
  return input.replace(/[０-９]/g, (ch) =>
    String.fromCharCode(ch.charCodeAt(0) - 0xfee0),
  );
}

/** 全角空格 → 半角空格（U+3000 → U+0020） */
export function normalizeFullWidthSpace(input: string): string {
  return input.replace(/\u3000/g, ' ');
}

// 内存中单段字符串的上限，防止 RSS 暴涨；
// 超出部分交给 ShellCommand 自己写到磁盘。
const MAX_STRING_LENGTH = 2 ** 25;

/**
 * 按分隔符拼接多行字符串，总长超过 maxSize 时截断并加标记。
 */
export function safeJoinLines(
  lines: string[],
  delimiter: string = ',',
  maxSize: number = MAX_STRING_LENGTH,
): string {
  const truncationMarker = '...[truncated]';
  let result = '';

  for (const line of lines) {
    const delimiterToAdd = result ? delimiter : '';
    const fullAddition = delimiterToAdd + line;

    if (result.length + fullAddition.length <= maxSize) {
      // 完整能塞下
      result += fullAddition;
    } else {
      // 需要截断：尽量塞一部分 + 标记
      const remainingSpace =
        maxSize -
        result.length -
        delimiterToAdd.length -
        truncationMarker.length;

      if (remainingSpace > 0) {
        result +=
          delimiterToAdd + line.slice(0, remainingSpace) + truncationMarker;
      } else {
        result += truncationMarker;
      }
      return result;
    }
  }
  return result;
}

/**
 * 大输出累积器：超过上限后截断"末尾"（保留开头），避免 RangeError。
 * 适合收集长时间运行命令的 stdout/stderr。
 */
export class EndTruncatingAccumulator {
  private content: string = '';
  private isTruncated = false;
  private totalBytesReceived = 0;

  constructor(private readonly maxSize: number = MAX_STRING_LENGTH) {}

  /** 追加数据；必要时截断 */
  append(data: string | Buffer): void {
    const str = typeof data === 'string' ? data : data.toString();
    this.totalBytesReceived += str.length;

    if (this.isTruncated && this.content.length >= this.maxSize) {
      return;
    }

    if (this.content.length + str.length > this.maxSize) {
      const remainingSpace = this.maxSize - this.content.length;
      if (remainingSpace > 0) {
        this.content += str.slice(0, remainingSpace);
      }
      this.isTruncated = true;
    } else {
      this.content += str;
    }
  }

  /** 返回累积结果；发生截断时末尾附带 KB 级提示 */
  toString(): string {
    if (!this.isTruncated) {
      return this.content;
    }
    const truncatedBytes = this.totalBytesReceived - this.maxSize;
    const truncatedKB = Math.round(truncatedBytes / 1024);
    return this.content + `\n... [output truncated - ${truncatedKB}KB removed]`;
  }

  clear(): void {
    this.content = '';
    this.isTruncated = false;
    this.totalBytesReceived = 0;
  }

  get length(): number {
    return this.content.length;
  }

  get truncated(): boolean {
    return this.isTruncated;
  }

  get totalBytes(): number {
    return this.totalBytesReceived;
  }
}

/**
 * 截断文本到最多 maxLines 行；被截断时末尾附加单字符省略号。
 */
export function truncateToLines(text: string, maxLines: number): string {
  const lines = text.split('\n');
  if (lines.length <= maxLines) {
    return text;
  }
  return lines.slice(0, maxLines).join('\n') + '…';
}
