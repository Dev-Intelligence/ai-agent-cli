/**
 * 输出样式（output styles）加载器
 *
 * 扫描项目 .ai-agent/output-styles/*.md 与用户 ~/.ai-agent/output-styles/*.md，
 * 解析 frontmatter 得到样式配置。项目级优先于用户级。
 *
 * 单个样式文件结构：
 * ```
 * ---
 * name: 简洁模式
 * description: 只输出结果，不写 why
 * ---
 * 样式提示词正文……
 * ```
 */

import fs from 'fs-extra';
import path from 'node:path';
import os from 'node:os';
import matter from 'gray-matter';

/** 样式来源 */
export type OutputStyleSource = 'project' | 'user';

/** 单个输出样式配置 */
export interface OutputStyleConfig {
  /** 样式名（若 frontmatter 无 name 则取文件名） */
  name: string;
  /** 描述（frontmatter.description，缺省取正文首句） */
  description: string;
  /** 提示词正文（frontmatter 之后的全部内容） */
  prompt: string;
  /** 来源 */
  source: OutputStyleSource;
  /** 文件绝对路径 */
  filePath: string;
}

const STYLES_SUBDIR = 'output-styles';

/** 项目目录的样式目录（<cwd>/.ai-agent/output-styles） */
export function getProjectOutputStylesDir(cwd: string = process.cwd()): string {
  return path.join(cwd, '.ai-agent', STYLES_SUBDIR);
}

/** 用户目录的样式目录（~/.ai-agent/output-styles） */
export function getUserOutputStylesDir(): string {
  return path.join(os.homedir(), '.ai-agent', STYLES_SUBDIR);
}

/** 从 markdown 正文中截取描述（首段或首句，用于缺省 description） */
function extractDescriptionFromMarkdown(content: string, fallback: string): string {
  const trimmed = content.trim();
  if (!trimmed) return fallback;
  // 取首段：以两个换行断开
  const firstPara = trimmed.split(/\n\s*\n/)[0]!.trim();
  if (!firstPara) return fallback;
  // 按首句切：中文句号或常见结束标点后视作句界
  // 英文句子习惯带空白分隔（规避缩写误判）；中文/日文无空白也视作断句
  const cnMatch = firstPara.match(/^[^。！？]*[。！？]/);
  if (cnMatch) return cnMatch[0].trim();
  const enMatch = firstPara.match(/^[^.!?]*[.!?](?=\s|$)/);
  if (enMatch) return enMatch[0].trim();
  return firstPara;
}

async function loadSingleFile(
  filePath: string,
  source: OutputStyleSource,
): Promise<OutputStyleConfig | null> {
  try {
    const raw = await fs.readFile(filePath, 'utf-8');
    const parsed = matter(raw);
    const fm = parsed.data as Record<string, unknown>;
    const fileName = path.basename(filePath).replace(/\.md$/, '');
    const name =
      typeof fm.name === 'string' && fm.name.trim() ? fm.name.trim() : fileName;
    const description =
      typeof fm.description === 'string' && fm.description.trim()
        ? fm.description.trim()
        : extractDescriptionFromMarkdown(parsed.content, `自定义样式 ${fileName}`);
    return {
      name,
      description,
      prompt: parsed.content.trim(),
      source,
      filePath,
    };
  } catch {
    return null;
  }
}

async function scanDir(
  dir: string,
  source: OutputStyleSource,
): Promise<OutputStyleConfig[]> {
  if (!(await fs.pathExists(dir))) return [];
  const entries = await fs.readdir(dir);
  const results: OutputStyleConfig[] = [];
  for (const entry of entries) {
    if (!entry.endsWith('.md')) continue;
    const full = path.join(dir, entry);
    const stats = await fs.stat(full).catch(() => null);
    if (!stats?.isFile()) continue;
    const cfg = await loadSingleFile(full, source);
    if (cfg) results.push(cfg);
  }
  return results;
}

/**
 * 加载所有可用的输出样式。
 * 同名样式项目级覆盖用户级（按 name 去重，项目级优先）。
 */
export async function loadOutputStyles(options?: {
  cwd?: string;
  projectDir?: string;
  userDir?: string;
}): Promise<OutputStyleConfig[]> {
  const projectDir = options?.projectDir ?? getProjectOutputStylesDir(options?.cwd);
  const userDir = options?.userDir ?? getUserOutputStylesDir();

  const [projectStyles, userStyles] = await Promise.all([
    scanDir(projectDir, 'project'),
    scanDir(userDir, 'user'),
  ]);

  const merged = new Map<string, OutputStyleConfig>();
  // 先 user，再 project 覆盖
  for (const s of userStyles) merged.set(s.name, s);
  for (const s of projectStyles) merged.set(s.name, s);
  return [...merged.values()];
}

/** 按名字精确查找一个样式 */
export async function findOutputStyle(
  name: string,
  options?: Parameters<typeof loadOutputStyles>[0],
): Promise<OutputStyleConfig | undefined> {
  const all = await loadOutputStyles(options);
  return all.find((s) => s.name === name);
}
