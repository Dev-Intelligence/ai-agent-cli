/**
 * HighlightedCode — 代码语法高亮组件
 *
 * 使用 cli-highlight 库对代码进行语法高亮，输出 ANSI 着色字符串。
 *
 * 特性：
 * - LRU 缓存（500 条，避免虚拟滚动 remount 时重复高亮）
 * - Suspense fallback（异步加载 cli-highlight，先显示无高亮版本）
 * - 语言自动检测（基于文件扩展名）
 * - 未知语言回退到 markdown 高亮
 * - tab → 空格转换
 */

import { extname } from 'path';
import React, { Suspense, useMemo } from 'react';
import { Text, Ansi } from '../primitives.js';

// ─── cli-highlight 类型 ───

type CliHighlightModule = {
  highlight: (code: string, options: { language: string }) => string;
  supportsLanguage: (lang: string) => boolean;
};

// ─── 延迟加载 cli-highlight ───

let _hlPromise: Promise<CliHighlightModule | null> | null = null;

function getCliHighlightPromise(): Promise<CliHighlightModule | null> {
  if (!_hlPromise) {
    _hlPromise = import('cli-highlight').then(
      (mod) => mod as unknown as CliHighlightModule,
    ).catch(() => null);
  }
  return _hlPromise;
}

// ─── LRU 缓存  ───

const HL_CACHE_MAX = 500;
const hlCache = new Map<string, string>();

function hashPair(a: string, b: string): string {
  return `${a.length}:${a.slice(0, 100)}|${b.length}:${b.slice(0, 200)}`;
}

function cachedHighlight(hl: CliHighlightModule, code: string, language: string): string {
  const key = hashPair(language, code);
  const hit = hlCache.get(key);
  if (hit !== undefined) {
    hlCache.delete(key);
    hlCache.set(key, hit);
    return hit;
  }
  const out = hl.highlight(code, { language });
  if (hlCache.size >= HL_CACHE_MAX) {
    const first = hlCache.keys().next().value;
    if (first !== undefined) hlCache.delete(first);
  }
  hlCache.set(key, out);
  return out;
}

// ─── Tab 转空格 ───

function convertLeadingTabsToSpaces(code: string): string {
  return code.replace(/^\t+/gm, (tabs) => '  '.repeat(tabs.length));
}

// ─── Props ───

interface HighlightedCodeProps {
  code: string;
  /** 文件路径（用于语言检测） */
  filePath?: string;
  /** 直接指定语言（优先于 filePath） */
  language?: string;
  dim?: boolean;
}

// ─── 主组件 ───

export function HighlightedCode({ code, filePath, language: langProp, dim = false }: HighlightedCodeProps) {
  const codeWithSpaces = useMemo(() => convertLeadingTabsToSpaces(code), [code]);
  const language = langProp || (filePath ? extname(filePath).slice(1) : 'markdown');

  return (
    <Text dimColor={dim}>
      <Suspense fallback={<Ansi>{codeWithSpaces}</Ansi>}>
        <HighlightedInner codeWithSpaces={codeWithSpaces} language={language} />
      </Suspense>
    </Text>
  );
}

// ─── 内部高亮组件（React.use() 在 Suspense 内消费 Promise） ───

function HighlightedInner({ codeWithSpaces, language }: { codeWithSpaces: string; language: string }) {
  const hl = React.use(getCliHighlightPromise());

  const out = useMemo(() => {
    if (!hl) return codeWithSpaces;

    let highlightLang = 'markdown';
    if (language && hl.supportsLanguage(language)) {
      highlightLang = language;
    }

    try {
      return cachedHighlight(hl, codeWithSpaces, highlightLang);
    } catch (e) {
      if (e instanceof Error && e.message.includes('Unknown language')) {
        return cachedHighlight(hl, codeWithSpaces, 'markdown');
      }
      return codeWithSpaces;
    }
  }, [codeWithSpaces, language, hl]);

  return <Ansi>{out}</Ansi>;
}
