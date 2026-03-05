/**
 * 系统提示词生成 - 模块化设计（文件化模板）
 */

import { getAgentTypeDescriptions, getAgentByType } from './agents.js';
import type { AgentType } from './types.js';
import { PROJECT_FILE, PRODUCT_NAME, PROJECT_DIR } from './constants.js';
import { loadPromptWithVars } from '../services/promptLoader.js';
import { getSessionId } from '../services/session/sessionId.js';
import fs from 'fs-extra';
import path from 'node:path';
import {
  getCurrentOutputStyle as getCurrentOutputStyleFromRegistry,
  getOutputStylePrompt,
  setCurrentOutputStyle,
  type OutputStyleName,
} from './outputStyles.js';

export function getCurrentOutputStyle(): OutputStyleName {
  return getCurrentOutputStyleFromRegistry();
}

export function setOutputStyle(style: OutputStyleName): void {
  setCurrentOutputStyle(style);
}

/**
 * 获取环境信息
 */
export function getEnvInfo(workdir: string): string {
  return `<env>
工作目录: ${workdir}
操作系统: ${process.platform}
Node版本: ${process.version}
当前日期: ${new Date().toLocaleDateString('zh-CN')}
</env>`;
}

export type IdentityMode = 'default' | 'sdk' | 'custom';

export type ToolUseContext = {
  options?: Record<string, unknown>;
};

export type MainThreadAgentDefinition = {
  getSystemPrompt?: (options?: { toolUseContext?: { options?: Record<string, unknown> } }) => string;
  systemPrompt?: string;
  memory?: string;
};

export type ComposeSystemPromptOptions = {
  mainThreadAgentDefinition?: MainThreadAgentDefinition;
  toolUseContext?: ToolUseContext;
  customSystemPrompt?: string;
  defaultSystemPrompt?: string;
  appendSystemPrompt?: string;
  overrideSystemPrompt?: string;
};

export type AssembleSystemPromptOptions = {
  includeScratchpad?: boolean;
  includeEnv?: boolean;
  includeDynamicBoundary?: boolean;
};

const SYSTEM_PROMPT_DYNAMIC_BOUNDARY = '__SYSTEM_PROMPT_DYNAMIC_BOUNDARY__';

function resolveIdentityMode(value: unknown): IdentityMode {
  if (value === 'sdk') return 'sdk';
  if (value === 'custom') return 'custom';
  return 'default';
}

function getIdentityPrompt(identityMode: IdentityMode): string {
  if (identityMode === 'sdk') {
    return loadPromptWithVars('system/identity-sdk.md', { productName: PRODUCT_NAME });
  }
  if (identityMode === 'custom') {
    return loadPromptWithVars('system/identity-custom-agent.md', { productName: PRODUCT_NAME });
  }
  return loadPromptWithVars('system/identity.md', { productName: PRODUCT_NAME });
}

function getScratchpadDir(workdir: string): string {
  const sessionId = getSessionId();
  return path.join(workdir, PROJECT_DIR, 'scratchpad', sessionId);
}

function getScratchpadInfo(workdir: string): string {
  const scratchpadDir = getScratchpadDir(workdir);
  return loadPromptWithVars('system/scratchpad.md', { scratchpadDir });
}

function loadClaudeInstructions(workdir: string, projectFile: string): string | null {
  const filePath = path.join(workdir, projectFile);
  if (!fs.existsSync(filePath)) return null;
  try {
    const content = fs.readFileSync(filePath, 'utf8').trim();
    if (!content) return null;
    const header = loadPromptWithVars('system/claude-instructions-header.md', {});
    return `${header}\n\n${content}`;
  } catch {
    return null;
  }
}

function getBaseSystemPromptSections(
  workdir: string,
  projectFile: string,
  identityMode: IdentityMode
): string[] {
  const claudeInstructions = loadClaudeInstructions(workdir, projectFile);
  return [
    getIdentityPrompt(identityMode),
    ...(claudeInstructions ? [claudeInstructions] : []),
    loadPromptWithVars('system/security.md', {}),
    loadPromptWithVars('system/task-management.md', {}),
    loadPromptWithVars('system/memory.md', { projectFile }),
    ...(getCurrentOutputStyle() === 'default'
      ? [loadPromptWithVars('system/tone-default.md', {})]
      : []),
    loadPromptWithVars('system/proactiveness.md', {}),
    loadPromptWithVars('system/code-conventions.md', {}),
    ...(getCurrentOutputStyle() === 'default' || getCurrentOutputStyle() === 'explanatory'
      ? [loadPromptWithVars('system/workflow.md', {})]
      : []),
    loadPromptWithVars('system/tool-usage.md', {}),
  ];
}

function buildDefaultSystemPrompt(
  workdir: string,
  projectFile: string,
  identityMode: IdentityMode
): string {
  return getBaseSystemPromptSections(workdir, projectFile, identityMode)
    .filter(Boolean)
    .join('\n\n');
}

function buildAppendSystemPrompt(
  skillDescriptions: string,
  agentDescriptions: string,
  extraAppend?: string
): string | null {
  const sections: string[] = [];

  if (skillDescriptions) {
    sections.push(`## 可用技能\n\n${skillDescriptions}`);
  }
  if (agentDescriptions) {
    sections.push(`## 子代理类型\n\n${agentDescriptions}`);
  }

  const outputStylePrompt = getOutputStylePrompt();
  if (outputStylePrompt) {
    sections.push(outputStylePrompt);
  }

  if (extraAppend) {
    sections.push(extraAppend);
  }

  const joined = sections.filter(Boolean).join('\n\n');
  return joined ? joined : null;
}

function buildDynamicSystemPrompt(
  workdir: string,
  options?: AssembleSystemPromptOptions
): string | null {
  const sections: string[] = [];

  if (options?.includeScratchpad !== false) {
    sections.push(getScratchpadInfo(workdir));
  }
  if (options?.includeEnv !== false) {
    sections.push(getEnvInfo(workdir));
  }

  const joined = sections.filter(Boolean).join('\n\n');
  return joined ? joined : null;
}

function resolveMainThreadSystemPrompt(
  definition?: MainThreadAgentDefinition,
  toolUseContext?: ToolUseContext
): string | null {
  if (!definition) return null;

  if (typeof definition.getSystemPrompt === 'function') {
    return definition.getSystemPrompt({
      toolUseContext: toolUseContext ? { options: toolUseContext.options ?? {} } : undefined,
    });
  }

  if (typeof definition.systemPrompt === 'string') {
    return definition.systemPrompt;
  }

  return null;
}

/**
 * 组合主系统提示词（Claude Z51 结构）
 */
export function composeSystemPrompt(options: ComposeSystemPromptOptions): string[] {
  const overridePrompt = options.overrideSystemPrompt?.trim();
  if (overridePrompt) return [overridePrompt];

  const mainPrompt = resolveMainThreadSystemPrompt(
    options.mainThreadAgentDefinition,
    options.toolUseContext
  );
  const basePrompt =
    mainPrompt ||
    options.customSystemPrompt?.trim() ||
    options.defaultSystemPrompt?.trim() ||
    '';

  const sections: string[] = [];
  if (basePrompt) sections.push(basePrompt);

  const appendPrompt = options.appendSystemPrompt?.trim();
  if (appendPrompt) sections.push(appendPrompt);

  return sections;
}

/**
 * 组装最终系统提示词（Claude fF1 结构）
 */
export function assembleSystemPrompt(
  basePrompts: string[],
  workdir: string,
  options?: AssembleSystemPromptOptions
): string {
  const notes = loadPromptWithVars('system/claude-notes.md', {});
  const dynamic = buildDynamicSystemPrompt(workdir, options);

  const sections: string[] = [...basePrompts.filter(Boolean), notes];

  if (dynamic) {
    if (options?.includeDynamicBoundary !== false) {
      sections.push(SYSTEM_PROMPT_DYNAMIC_BOUNDARY);
    }
    sections.push(dynamic);
  }

  return sections.filter(Boolean).join('\n\n');
}

/**
 * 创建系统提示词（模块化组合）
 */
export function createSystemPrompt(
  workdir: string,
  skillDescriptions: string,
  agentDescriptions: string,
  options?: {
    projectFile?: string;
    identityMode?: IdentityMode;
    mainThreadAgentDefinition?: MainThreadAgentDefinition;
    toolUseContext?: ToolUseContext;
    customSystemPrompt?: string;
    appendSystemPrompt?: string;
    overrideSystemPrompt?: string;
    includeScratchpad?: boolean;
    includeEnv?: boolean;
    includeDynamicBoundary?: boolean;
  }
): string {
  const projectFile = options?.projectFile || PROJECT_FILE;
  const identityMode = resolveIdentityMode(options?.identityMode ?? process.env.AI_AGENT_IDENTITY_MODE);
  const defaultSystemPrompt = buildDefaultSystemPrompt(workdir, projectFile, identityMode);
  const appendSystemPrompt = buildAppendSystemPrompt(
    skillDescriptions,
    agentDescriptions,
    options?.appendSystemPrompt
  );

  const basePrompts = composeSystemPrompt({
    mainThreadAgentDefinition: options?.mainThreadAgentDefinition,
    toolUseContext: options?.toolUseContext,
    customSystemPrompt: options?.customSystemPrompt,
    defaultSystemPrompt,
    appendSystemPrompt: appendSystemPrompt ?? undefined,
    overrideSystemPrompt: options?.overrideSystemPrompt,
  });

  return assembleSystemPrompt(basePrompts, workdir, {
    includeScratchpad: options?.includeScratchpad,
    includeEnv: options?.includeEnv,
    includeDynamicBoundary: options?.includeDynamicBoundary,
  });
}

/**
 * 创建子代理的系统提示词
 */
export function getAgentBasePrompt(_workdir: string): string {
  return [
    loadPromptWithVars('system/identity-subagent.md', { productName: PRODUCT_NAME }),
    loadPromptWithVars('system/subagent-response.md', {}),
  ].join('\n\n');
}

export function createSubagentSystemPrompt(
  workdir: string,
  agentType: AgentType,
  options?: { taskDescription?: string }
): string {
  const basePrompt = getAgentBasePrompt(workdir);
  const config = getAgentByType(agentType);
  const agentSystemPrompt = [
    basePrompt,
    config?.systemPrompt ?? '',
  ].filter(Boolean).join('\n\n');

  return loadPromptWithVars('system/subagent-wrapper.md', {
    agentSystemPrompt,
    taskDescription: options?.taskDescription ?? '',
    envInfo: getEnvInfo(workdir),
  });
}

/**
 * 获取代理类型描述（用于系统提示词）
 */
export function getAgentDescriptions(): string {
  return getAgentTypeDescriptions();
}
