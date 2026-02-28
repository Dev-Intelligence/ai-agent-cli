/**
 * Markdown 终端渲染器
 *
 * 1. 使用 marked 的 lexer 将 Markdown 解析为 token AST
 * 2. 自定义递归函数遍历 token 树，用 chalk 渲染为终端 ANSI 输出
 * 3. 代码块使用 highlight.js（cli-highlight）做语法高亮
 *
 * 不使用 marked-terminal，以获得更精确的渲染控制
 */

import { Lexer, type Token, type Tokens } from 'marked';
import { highlight, supportsLanguage } from 'cli-highlight';
import chalk from 'chalk';
import { EOL } from 'node:os';

/**
 * 有序列表编号样式（支持嵌套层级）
 */
const ALPHA_LIST = 'abcdefghijklmnopqrstuvwxyz';
const ROMAN_LIST = [
  'i','ii','iii','iv','v','vi','vii','viii','ix','x',
  'xi','xii','xiii','xiv','xv','xvi','xvii','xviii','xix','xx',
];

function getOrderedPrefix(depth: number, num: number): string {
  switch (depth) {
    case 0:
    case 1:
      return num.toString();
    case 2:
      return ALPHA_LIST[num - 1] ?? num.toString();
    case 3:
      return ROMAN_LIST[num - 1] ?? num.toString();
    default:
      return num.toString();
  }
}

/**
 * 去除 ANSI 转义序列，计算纯文本宽度
 */
function stripAnsiLength(str: string): number {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '').length;
}

/**
 * 去除 ANSI 转义序列
 */
function stripAnsi(str: string): string {
  // eslint-disable-next-line no-control-regex
  return str.replace(/\x1b\[[0-9;]*m/g, '');
}

/**
 * 超链接渲染（支持终端超链接 OSC 8）
 */
function renderLink(href: string, text?: string): string {
  const display = text ?? href;
  // 检测终端是否支持超链接
  if (process.env.TERM_PROGRAM === 'iTerm.app' ||
      process.env.TERM_PROGRAM === 'WezTerm' ||
      process.env.VTE_VERSION) {
    return `\x1b]8;;${href}\x07${chalk.blue(display)}\x1b]8;;\x07`;
  }
  return chalk.blue(display);
}

/**
 * 递归渲染 marked token 为终端 ANSI 字符串
 *
 * @param token - marked token 节点
 * @param depth - 列表嵌套深度
 * @param orderedNum - 有序列表当前编号（null 表示无序列表）
 * @param parent - 父 token（用于判断上下文）
 */
function renderToken(
  token: Token,
  depth: number = 0,
  orderedNum: number | null = null,
  parent: Token | null = null,
): string {
  switch (token.type) {
    case 'blockquote': {
      const t = token as Tokens.Blockquote;
      const inner = (t.tokens ?? []).map(t2 => renderToken(t2)).join('');
      return chalk.dim.italic(inner);
    }

    case 'code': {
      const t = token as Tokens.Code;
      let lang = 'plaintext';
      if (t.lang && supportsLanguage(t.lang)) {
        lang = t.lang;
      }
      try {
        return highlight(t.text, { language: lang }) + EOL;
      } catch {
        return t.text + EOL;
      }
    }

    case 'codespan': {
      const t = token as Tokens.Codespan;
      return chalk.yellow(t.text);
    }

    case 'em': {
      const t = token as Tokens.Em;
      return chalk.italic((t.tokens ?? []).map(t2 => renderToken(t2)).join(''));
    }

    case 'strong': {
      const t = token as Tokens.Strong;
      return chalk.bold((t.tokens ?? []).map(t2 => renderToken(t2)).join(''));
    }

    case 'heading': {
      const t = token as Tokens.Heading;
      const text = (t.tokens ?? []).map(t2 => renderToken(t2)).join('');
      switch (t.depth) {
        case 1:
          return chalk.bold.italic.underline(text) + EOL + EOL;
        case 2:
          return chalk.bold(text) + EOL + EOL;
        default:
          return chalk.bold(text) + EOL + EOL;
      }
    }

    case 'hr':
      return '---';

    case 'image': {
      const t = token as Tokens.Image;
      return t.href;
    }

    case 'link': {
      const t = token as Tokens.Link;
      if (t.href.startsWith('mailto:')) {
        return t.href.replace(/^mailto:/, '');
      }
      return renderLink(t.href);
    }

    case 'list': {
      const t = token as Tokens.List;
      return t.items.map((item, i) =>
        renderToken(item, depth, t.ordered ? Number(t.start ?? 1) + i : null, t as unknown as Token)
      ).join('');
    }

    case 'list_item': {
      const t = token as Tokens.ListItem;
      return (t.tokens ?? []).map(t2 =>
        `${'  '.repeat(depth)}${renderToken(t2, depth + 1, orderedNum, token)}`
      ).join('');
    }

    case 'paragraph': {
      const t = token as Tokens.Paragraph;
      return (t.tokens ?? []).map(t2 => renderToken(t2, depth, orderedNum, token)).join('') + EOL;
    }

    case 'space':
      return EOL;

    case 'br':
      return EOL;

    case 'text': {
      const t = token as Tokens.Text;
      // 在 list_item 上下文中添加 bullet/编号前缀
      if (parent?.type === 'list_item') {
        const prefix = orderedNum === null
          ? '- '
          : `${getOrderedPrefix(depth, orderedNum)}. `;
        const content = t.tokens
          ? t.tokens.map(t2 => renderToken(t2, depth, orderedNum, token)).join('')
          : t.text;
        return `${prefix}${content}${EOL}`;
      }
      return t.text;
    }

    case 'table': {
      const t = token as Tokens.Table;
      // 计算每列最大宽度
      const colWidths = t.header.map((cell, colIdx) => {
        const headerText = stripAnsi(
          (cell.tokens ?? []).map(t2 => renderToken(t2)).join('')
        );
        let maxWidth = headerText.length;
        for (const row of t.rows) {
          const cellText = stripAnsi(
            (row[colIdx]?.tokens ?? []).map(t2 => renderToken(t2)).join('')
          );
          maxWidth = Math.max(maxWidth, cellText.length);
        }
        return Math.max(maxWidth, 3);
      });

      let result = '| ';
      // 渲染表头
      t.header.forEach((cell, colIdx) => {
        const rendered = (cell.tokens ?? []).map(t2 => renderToken(t2)).join('');
        const plainLen = stripAnsiLength(rendered);
        const padding = colWidths[colIdx] - plainLen;
        result += rendered + ' '.repeat(Math.max(0, padding)) + ' | ';
      });
      result = result.trimEnd() + EOL;

      // 分隔线
      result += '|';
      colWidths.forEach(w => {
        result += '-'.repeat(w + 2) + '|';
      });
      result += EOL;

      // 渲染行
      t.rows.forEach(row => {
        result += '| ';
        row.forEach((cell, colIdx) => {
          const rendered = (cell.tokens ?? []).map(t2 => renderToken(t2)).join('');
          const plainLen = stripAnsiLength(rendered);
          const padding = colWidths[colIdx] - plainLen;
          result += rendered + ' '.repeat(Math.max(0, padding)) + ' | ';
        });
        result = result.trimEnd() + EOL;
      });
      return result + EOL;
    }

    case 'escape': {
      const t = token as Tokens.Escape;
      return t.text;
    }

    case 'del':
    case 'html':
    case 'def':
      return '';

    default:
      return '';
  }
}

/**
 * 配置 marked lexer（禁用 del 标记以避免 ~text~ 被误解析）
 */
let configured = false;
function ensureConfigured(): void {
  if (configured) return;
  configured = true;
}

/**
 * 渲染 Markdown 文本为终端格式
 */
export function renderMarkdown(text: string): string {
  try {
    ensureConfigured();
    const tokens = Lexer.lex(text);
    const result = tokens.map(t => renderToken(t)).join('');
    // 清理末尾多余空行
    return result.replace(/\n{3,}/g, '\n\n').replace(/\n{2,}$/, '\n');
  } catch {
    // 解析失败时返回原文
    return text;
  }
}

/**
 * 检测文本是否包含 Markdown 语法
 */
export function isMarkdownContent(text: string): boolean {
  const patterns = [
    /^#{1,6}\s/m,           // 标题
    /^\s*[-*+]\s/m,         // 无序列表
    /^\s*\d+\.\s/m,         // 有序列表
    /```[\s\S]*?```/,       // 代码块
    /`[^`]+`/,              // 行内代码
    /\*\*[^*]+\*\*/,        // 粗体
    /\*[^*]+\*/,            // 斜体
    /^\s*>/m,               // 引用
    /\[.+?\]\(.+?\)/,       // 链接
    /^\|.+\|$/m,            // 表格
  ];

  return patterns.some(p => p.test(text));
}
