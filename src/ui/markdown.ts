/**
 * Markdown 终端渲染器
 * 将 Markdown 文本渲染为带颜色和格式的终端输出
 */

import { Marked } from 'marked';
import { markedTerminal } from 'marked-terminal';
import { highlight } from 'cli-highlight';
import { getTheme } from './theme.js';

// 创建 Marked 实例，配置终端渲染器
const marked = new Marked();

/**
 * 初始化 Markdown 渲染器
 */
function initRenderer(): void {
  const theme = getTheme();

  marked.use(
    markedTerminal({
      // 代码块使用 cli-highlight 做语法高亮
      code(code: string, lang?: string): string {
        try {
          return highlight(code, {
            language: lang || 'auto',
            ignoreIllegals: true,
          });
        } catch {
          return code;
        }
      },
      // 自定义样式
      firstHeading: theme.textBold,
      showSectionPrefix: false,
      reflowText: true,
      width: Math.min(process.stdout.columns || 80, 120),
      tab: 2,
    }) as any
  );
}

// 初始化
initRenderer();

/**
 * 渲染 Markdown 文本为终端格式
 */
export function renderMarkdown(text: string): string {
  try {
    // 重新初始化以获取最新主题
    initRenderer();
    const rendered = marked.parse(text);
    if (typeof rendered === 'string') {
      // 移除末尾多余空行
      return rendered.replace(/\n{3,}$/g, '\n');
    }
    return text;
  } catch {
    // 渲染失败时返回原文
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
