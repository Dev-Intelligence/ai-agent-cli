/**
 * agent/agentMemory — 代理持久记忆
 *
 * 为每种代理类型维护独立的记忆目录。
 *
 * 记忆范围：
 * - project：项目级 (.ai-agent/agent-memory/<agentType>/)
 * - user：用户级 (~/.ai-agent/agent-memory/<agentType>/)
 */

import { join, normalize, sep } from 'path';
import { existsSync, mkdirSync, readdirSync, readFileSync, writeFileSync } from 'fs';

// ─── 类型 ───

export type AgentMemoryScope = 'project' | 'user';

// ─── 路径 ───

function sanitizeAgentTypeForPath(agentType: string): string {
  return agentType.replace(/:/g, '-');
}

function getUserMemoryBaseDir(): string {
  return join(process.env['HOME'] || '~', '.ai-agent');
}

/** 获取代理记忆目录 */
export function getAgentMemoryDir(agentType: string, scope: AgentMemoryScope): string {
  const dirName = sanitizeAgentTypeForPath(agentType);
  switch (scope) {
    case 'project':
      return join(process.cwd(), '.ai-agent', 'agent-memory', dirName) + sep;
    case 'user':
      return join(getUserMemoryBaseDir(), 'agent-memory', dirName) + sep;
  }
}

/** 检查路径是否在代理记忆目录内 */
export function isAgentMemoryPath(absolutePath: string): boolean {
  const normalizedPath = normalize(absolutePath);
  const userBase = getUserMemoryBaseDir();

  if (normalizedPath.startsWith(join(userBase, 'agent-memory') + sep)) return true;
  if (normalizedPath.startsWith(join(process.cwd(), '.ai-agent', 'agent-memory') + sep)) return true;

  return false;
}

/** 确保记忆目录存在 */
export function ensureAgentMemoryDir(agentType: string, scope: AgentMemoryScope): string {
  const dir = getAgentMemoryDir(agentType, scope);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/** 列出代理的记忆文件 */
export function listAgentMemoryFiles(agentType: string, scope: AgentMemoryScope): string[] {
  const dir = getAgentMemoryDir(agentType, scope);
  if (!existsSync(dir)) return [];
  return readdirSync(dir).filter((f) => f.endsWith('.md'));
}

/** 读取代理记忆文件 */
export function readAgentMemory(agentType: string, scope: AgentMemoryScope, filename: string): string | null {
  const filepath = join(getAgentMemoryDir(agentType, scope), filename);
  if (!existsSync(filepath)) return null;
  return readFileSync(filepath, 'utf-8');
}

/** 写入代理记忆文件 */
export function writeAgentMemory(agentType: string, scope: AgentMemoryScope, filename: string, content: string): void {
  const dir = ensureAgentMemoryDir(agentType, scope);
  writeFileSync(join(dir, filename), content, 'utf-8');
}

/** 构建代理记忆提示词（包含所有记忆文件内容） */
export function buildAgentMemoryPrompt(agentType: string): string {
  const scopes: AgentMemoryScope[] = ['project', 'user'];
  const parts: string[] = [];

  for (const scope of scopes) {
    const files = listAgentMemoryFiles(agentType, scope);
    for (const file of files) {
      const content = readAgentMemory(agentType, scope, file);
      if (content) {
        parts.push(`--- ${scope}/${file} ---\n${content}`);
      }
    }
  }

  return parts.length > 0 ? `\n\n<agent-memory>\n${parts.join('\n\n')}\n</agent-memory>` : '';
}
