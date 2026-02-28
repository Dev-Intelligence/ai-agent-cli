/**
 * Grep 工具 - 快速内容搜索
 * 支持正则表达式、文件过滤、多种输出模式
 * 支持多行匹配、文件类型过滤、分页
 */

import fg from 'fast-glob';
import fs from 'fs-extra';
import path from 'node:path';

/**
 * Grep 输出模式
 */
export type GrepOutputMode = 'content' | 'files_with_matches' | 'count';

/**
 * Grep 选项
 */
export interface GrepOptions {
  pattern: string;
  path?: string;
  glob?: string;
  outputMode?: GrepOutputMode;
  caseInsensitive?: boolean;
  contextBefore?: number;
  contextAfter?: number;
  maxResults?: number;
  multiline?: boolean;
  fileType?: string;
  headLimit?: number;
  offset?: number;
}

/**
 * 匹配结果
 */
interface MatchResult {
  file: string;
  lineNumber: number;
  line: string;
  contextBefore?: string[];
  contextAfter?: string[];
}

/**
 * 文件类型到 glob 模式映射
 */
const FILE_TYPE_MAP: Record<string, string> = {
  js: '**/*.{js,jsx,mjs,cjs}',
  ts: '**/*.{ts,tsx,mts,cts}',
  py: '**/*.{py,pyw,pyi}',
  rust: '**/*.rs',
  go: '**/*.go',
  java: '**/*.java',
  c: '**/*.{c,h}',
  cpp: '**/*.{cpp,cc,cxx,hpp,hh,hxx}',
  rb: '**/*.{rb,erb}',
  php: '**/*.php',
  swift: '**/*.swift',
  kotlin: '**/*.{kt,kts}',
  scala: '**/*.{scala,sc}',
  html: '**/*.{html,htm}',
  css: '**/*.{css,scss,sass,less}',
  json: '**/*.json',
  yaml: '**/*.{yaml,yml}',
  xml: '**/*.xml',
  md: '**/*.{md,mdx}',
  sql: '**/*.sql',
  sh: '**/*.{sh,bash,zsh}',
};

/**
 * 执行 Grep 内容搜索
 */
export async function runGrep(
  workdir: string,
  pattern: string,
  searchPath?: string,
  globPattern?: string,
  outputMode: GrepOutputMode = 'files_with_matches',
  caseInsensitive: boolean = false,
  contextBefore: number = 0,
  contextAfter: number = 0,
  maxResults: number = 100,
  multiline: boolean = false,
  fileType?: string,
  headLimit: number = 0,
  offset: number = 0
): Promise<string> {
  try {
    const cwd = searchPath ? path.resolve(workdir, searchPath) : workdir;

    // 确定要搜索的文件模式
    let filePattern = globPattern || '**/*';

    // 如果指定了文件类型，优先使用类型映射
    if (fileType && FILE_TYPE_MAP[fileType]) {
      filePattern = FILE_TYPE_MAP[fileType];
    }

    const defaultIgnore = [
      '**/node_modules/**',
      '**/.git/**',
      '**/dist/**',
      '**/build/**',
      '**/.next/**',
      '**/.cache/**',
      '**/coverage/**',
      '**/*.min.js',
      '**/*.map',
    ];

    const files = await fg(filePattern, {
      cwd,
      ignore: defaultIgnore,
      absolute: false,
      onlyFiles: true,
    });

    // 创建正则表达式
    let flags = caseInsensitive ? 'gi' : 'g';
    if (multiline) {
      flags += 's'; // DOTALL 模式，. 匹配换行符
    }
    const regex = new RegExp(pattern, flags);

    // 搜索匹配
    const matches: MatchResult[] = [];
    const filesWithMatches = new Set<string>();
    const fileCounts = new Map<string, number>();

    for (const file of files) {
      const filePath = path.join(cwd, file);

      try {
        const content = await fs.readFile(filePath, 'utf-8');

        // 多行匹配模式：整文件匹配
        if (multiline) {
          // 重置 lastIndex
          regex.lastIndex = 0;
          let match;
          while ((match = regex.exec(content)) !== null) {
            filesWithMatches.add(file);
            fileCounts.set(file, (fileCounts.get(file) || 0) + 1);

            if (outputMode === 'content') {
              // 计算匹配所在的行号
              const beforeMatch = content.slice(0, match.index);
              const lineNumber = beforeMatch.split('\n').length;
              const matchedText = match[0];
              const matchLines = matchedText.split('\n');

              matches.push({
                file,
                lineNumber,
                line: matchLines.length > 1
                  ? matchLines[0] + ` ... (+${matchLines.length - 1} lines)`
                  : matchLines[0],
              });

              if (matches.length >= maxResults) break;
            }

            // 防止零宽匹配导致无限循环
            if (match[0].length === 0) regex.lastIndex++;
          }
        } else {
          // 单行匹配模式（原始逻辑）
          const lines = content.split('\n');

          for (let i = 0; i < lines.length; i++) {
            const line = lines[i];

            // 每次测试前重置 lastIndex
            regex.lastIndex = 0;
            if (regex.test(line)) {
              filesWithMatches.add(file);
              fileCounts.set(file, (fileCounts.get(file) || 0) + 1);

              if (outputMode === 'content') {
                // 获取上下文
                const contextBeforeLines =
                  contextBefore > 0
                    ? lines.slice(Math.max(0, i - contextBefore), i)
                    : undefined;

                const contextAfterLines =
                  contextAfter > 0
                    ? lines.slice(i + 1, Math.min(lines.length, i + 1 + contextAfter))
                    : undefined;

                matches.push({
                  file,
                  lineNumber: i + 1,
                  line,
                  contextBefore: contextBeforeLines,
                  contextAfter: contextAfterLines,
                });

                // 限制匹配数
                if (matches.length >= maxResults) {
                  break;
                }
              }
            }
          }
        }

        if (matches.length >= maxResults) {
          break;
        }
      } catch (err) {
        // 跳过无法读取的文件（二进制文件等）
        continue;
      }
    }

    // 应用分页（offset 和 headLimit）
    function applyPagination<T>(items: T[]): T[] {
      let result = items;
      if (offset > 0) {
        result = result.slice(offset);
      }
      if (headLimit > 0) {
        result = result.slice(0, headLimit);
      }
      return result;
    }

    // 根据输出模式格式化结果
    if (outputMode === 'files_with_matches') {
      if (filesWithMatches.size === 0) {
        return `未找到匹配 "${pattern}" 的文件`;
      }

      let fileList = Array.from(filesWithMatches);
      fileList = applyPagination(fileList);

      let result = `找到 ${filesWithMatches.size} 个包含匹配的文件`;
      if (offset > 0 || headLimit > 0) {
        result += ` (显示 ${fileList.length} 个)`;
      }
      result += `:\n\n`;
      result += fileList.join('\n');

      return result;
    } else if (outputMode === 'count') {
      if (fileCounts.size === 0) {
        return `未找到匹配 "${pattern}" 的内容`;
      }

      let entries = Array.from(fileCounts.entries());
      entries = applyPagination(entries);

      let result = `匹配统计:\n\n`;
      for (const [file, count] of entries) {
        result += `${count}:${file}\n`;
      }

      return result;
    } else {
      // content 模式
      if (matches.length === 0) {
        return `未找到匹配 "${pattern}" 的内容`;
      }

      const paginatedMatches = applyPagination(matches);

      let result = `找到 ${matches.length} 处匹配`;
      if (matches.length >= maxResults) {
        result += ` (已达到最大显示数量 ${maxResults})`;
      }
      if (offset > 0 || headLimit > 0) {
        result += ` (显示 ${paginatedMatches.length} 处)`;
      }
      result += `:\n\n`;

      for (const match of paginatedMatches) {
        result += `${match.file}:${match.lineNumber}\n`;

        // 显示上下文
        if (match.contextBefore) {
          for (const line of match.contextBefore) {
            result += `  ${line}\n`;
          }
        }

        result += `> ${match.line}\n`;

        if (match.contextAfter) {
          for (const line of match.contextAfter) {
            result += `  ${line}\n`;
          }
        }

        result += `\n`;
      }

      return result;
    }
  } catch (error: unknown) {
    if (error instanceof Error) {
      return `Grep 错误: ${error.message}`;
    }
    return `Grep 错误: ${String(error)}`;
  }
}
