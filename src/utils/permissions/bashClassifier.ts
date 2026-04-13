/**
 * bashClassifier — Bash 命令安全分类器
 *
 * ai-agent-cli 版本提供基础的模式匹配分类（无 LLM 调用）。
 */

import { matchDangerousPattern, detectCommandInjection } from './dangerousPatterns.js';

export type ClassifierResult = {
  matches: boolean;
  matchedDescription?: string;
  confidence: 'high' | 'medium' | 'low';
  reason: string;
};

export type ClassifierBehavior = 'deny' | 'ask' | 'allow';

export type RiskLevel = 'safe' | 'low' | 'medium' | 'high' | 'critical';

// ─── 分类器 ───

/**
 * 对 bash 命令进行安全风险分类
 * 基于模式匹配（非 LLM），返回风险级别和原因
 */
export function classifyBashCommand(command: string): {
  risk: RiskLevel;
  reason: string;
  pattern?: string;
} {
  // 空命令
  if (!command.trim()) {
    return { risk: 'safe', reason: '空命令' };
  }

  // 命令注入检测
  const injection = detectCommandInjection(command);
  if (injection.detected) {
    return { risk: 'high', reason: injection.reason! };
  }

  // 危险模式匹配
  const dangerousMatch = matchDangerousPattern(command);
  if (dangerousMatch) {
    // 一些模式是 critical（sudo、eval），一些是 high（python、node）
    const criticalPatterns = ['sudo', 'eval', 'exec'];
    const risk: RiskLevel = criticalPatterns.includes(dangerousMatch) ? 'critical' : 'high';
    return { risk, reason: `匹配危险模式: ${dangerousMatch}`, pattern: dangerousMatch };
  }

  // 只读命令
  const readOnlyPrefixes = [
    'ls', 'cat', 'head', 'tail', 'wc', 'echo', 'pwd', 'whoami',
    'date', 'which', 'type', 'file', 'stat', 'du', 'df',
    'grep', 'find', 'rg', 'fd', 'ag',
    'git status', 'git log', 'git diff', 'git show', 'git branch',
    'git remote', 'git tag',
  ];
  const trimmed = command.trim().toLowerCase();
  for (const prefix of readOnlyPrefixes) {
    if (trimmed === prefix || trimmed.startsWith(prefix + ' ')) {
      return { risk: 'safe', reason: `只读命令: ${prefix}` };
    }
  }

  // 写入命令
  const writePrefixes = [
    'rm', 'mv', 'cp', 'mkdir', 'touch', 'chmod', 'chown',
    'git add', 'git commit', 'git push', 'git checkout', 'git reset',
    'git merge', 'git rebase',
    'npm install', 'pnpm install', 'yarn add', 'pip install',
  ];
  for (const prefix of writePrefixes) {
    if (trimmed === prefix || trimmed.startsWith(prefix + ' ')) {
      return { risk: 'medium', reason: `写入命令: ${prefix}` };
    }
  }

  // 默认：低风险（未知命令）
  return { risk: 'low', reason: '未分类命令' };
}

/**
 * 快速检查命令是否需要用户确认
 */
export function shouldAskPermission(command: string): boolean {
  const { risk } = classifyBashCommand(command);
  return risk === 'high' || risk === 'critical';
}
