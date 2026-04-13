/**
 * agent/loadAgentsDir — 加载用户自定义代理
 *
 * 从 .ai-agent/agents/ 目录加载 markdown 格式的自定义代理定义。
 *
 * 文件格式（frontmatter + body）：
 * ---
 * name: my-agent
 * description: 自定义代理
 * tools: [Read, Grep, Bash]
 * maxTurns: 10
 * ---
 * 这里是代理的系统提示词...
 */

import { existsSync, readdirSync, readFileSync } from 'fs';
import { join } from 'path';
import { getBuiltInAgents, type AgentDefinition } from './builtInAgents.js';

// ─── 自定义代理目录 ───

function getAgentsDirs(): string[] {
  return [
    join(process.cwd(), '.ai-agent', 'agents'),
    join(process.env['HOME'] || '~', '.ai-agent', 'agents'),
  ];
}

// ─── 解析 frontmatter ───

interface Frontmatter {
  name?: string;
  description?: string;
  tools?: string[];
  maxTurns?: number;
  oneShot?: boolean;
  color?: string;
}

function parseFrontmatter(content: string): { frontmatter: Frontmatter; body: string } {
  const match = content.match(/^---\n([\s\S]*?)\n---\n?([\s\S]*)$/);
  if (!match) return { frontmatter: {}, body: content };

  const yamlBlock = match[1]!;
  const body = match[2]!;
  const frontmatter: Frontmatter = {};

  for (const line of yamlBlock.split('\n')) {
    const colonIdx = line.indexOf(':');
    if (colonIdx < 0) continue;
    const key = line.slice(0, colonIdx).trim();
    const value = line.slice(colonIdx + 1).trim();

    switch (key) {
      case 'name':
        frontmatter.name = value;
        break;
      case 'description':
        frontmatter.description = value;
        break;
      case 'tools':
        // 解析 [Read, Grep, Bash] 格式
        frontmatter.tools = value
          .replace(/^\[|\]$/g, '')
          .split(',')
          .map((s) => s.trim())
          .filter(Boolean);
        break;
      case 'maxTurns':
        frontmatter.maxTurns = parseInt(value, 10) || undefined;
        break;
      case 'oneShot':
        frontmatter.oneShot = value === 'true';
        break;
      case 'color':
        frontmatter.color = value;
        break;
    }
  }

  return { frontmatter, body };
}

// ─── 加载 ───

/**
 * 从目录加载自定义代理定义
 */
function loadAgentsFromDir(dir: string): AgentDefinition[] {
  if (!existsSync(dir)) return [];

  const agents: AgentDefinition[] = [];
  const files = readdirSync(dir).filter((f) => f.endsWith('.md'));

  for (const file of files) {
    try {
      const content = readFileSync(join(dir, file), 'utf-8');
      const { frontmatter, body } = parseFrontmatter(content);

      const agentType = frontmatter.name || file.replace('.md', '');
      agents.push({
        agentType,
        displayName: agentType,
        description: frontmatter.description || `自定义代理: ${agentType}`,
        systemPromptSuffix: body.trim() || undefined,
        allowedTools: frontmatter.tools,
        maxTurns: frontmatter.maxTurns,
        oneShot: frontmatter.oneShot,
      });
    } catch {
      // 跳过无法解析的文件
    }
  }

  return agents;
}

/**
 * 加载所有代理（内置 + 用户自定义）
 * 用户自定义代理优先级高于内置（同名覆盖）
 */
export function loadAllAgents(): AgentDefinition[] {
  const builtIn = getBuiltInAgents();
  const customAgents: AgentDefinition[] = [];

  for (const dir of getAgentsDirs()) {
    customAgents.push(...loadAgentsFromDir(dir));
  }

  // 合并：用户自定义覆盖同名内置代理
  const merged = new Map<string, AgentDefinition>();
  for (const agent of builtIn) {
    merged.set(agent.agentType, agent);
  }
  for (const agent of customAgents) {
    merged.set(agent.agentType, agent);
  }

  return [...merged.values()];
}

/**
 * 判断是否为内置代理
 */
export function isBuiltInAgent(agentType: string): boolean {
  return getBuiltInAgents().some((a) => a.agentType === agentType);
}

/**
 * 获取代理类型名列表（用于 UI 显示）
 */
export function getAgentTypeNames(): string[] {
  return loadAllAgents().map((a) => a.agentType);
}
