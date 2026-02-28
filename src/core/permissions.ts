/**
 * 权限确认系统
 * 控制工具执行前的权限检查和用户确认
 */

import * as readline from 'readline';

/**
 * 权限模式
 */
export type PermissionMode =
  | 'ask'              // 每次都询问（默认）
  | 'acceptEdits'      // 自动允许编辑操作
  | 'bypassPermissions' // 跳过所有权限检查
  | 'plan'             // 只允许只读操作
  | 'dontAsk'          // 不询问，自动允许
  | 'default';         // 默认行为

/**
 * 权限规则
 */
export interface PermissionRule {
  tool: string;
  params?: Record<string, string>;
  decision: 'allow' | 'deny' | 'ask';
}

/**
 * 权限配置
 */
export interface PermissionConfig {
  mode: PermissionMode;
  allow: PermissionRule[];
  deny: PermissionRule[];
}

/**
 * 权限检查结果
 */
export interface PermissionCheckResult {
  allowed: boolean;
  needsConfirmation: boolean;
  reason?: string;
}

/**
 * 用户确认结果
 */
export type ConfirmationResult = 'allow' | 'deny' | 'always';

/**
 * 需要权限确认的工具列表（按危险等级分类）
 */
const DANGEROUS_TOOLS: Record<string, string> = {
  bash: '执行 Shell 命令',
  write_file: '创建或覆盖文件',
  edit_file: '编辑文件内容',
};

/**
 * 只读工具（plan 模式下允许）
 */
const READONLY_TOOLS = new Set([
  'read_file',
  'Glob',
  'Grep',
  'WebFetch',
  'WebSearch',
  'TaskCreate',
  'TaskGet',
  'TaskUpdate',
  'TaskList',
  'TodoWrite',
  'AskUserQuestion',
  'TaskOutput',
  'EnterPlanMode',
  'ExitPlanMode',
]);

/**
 * 默认权限配置
 */
const DEFAULT_CONFIG: PermissionConfig = {
  mode: 'default',
  allow: [],
  deny: [],
};

/**
 * 权限管理器
 */
export class PermissionManager {
  private config: PermissionConfig;
  private alwaysAllowed = new Map<string, Set<string>>(); // tool -> Set<paramsHash>

  constructor(config?: Partial<PermissionConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  /**
   * 设置权限模式
   */
  setMode(mode: PermissionMode): void {
    this.config.mode = mode;
  }

  /**
   * 获取当前模式
   */
  getMode(): PermissionMode {
    return this.config.mode;
  }

  /**
   * 添加永久允许规则
   */
  setAlwaysAllow(toolName: string, params?: Record<string, string>): void {
    const paramsHash = params ? JSON.stringify(params) : '*';
    if (!this.alwaysAllowed.has(toolName)) {
      this.alwaysAllowed.set(toolName, new Set());
    }
    this.alwaysAllowed.get(toolName)!.add(paramsHash);
  }

  /**
   * 检查权限
   */
  check(toolName: string, params?: Record<string, unknown>): PermissionCheckResult {
    // 1. bypassPermissions 模式 - 全部允许
    if (this.config.mode === 'bypassPermissions' || this.config.mode === 'dontAsk') {
      return { allowed: true, needsConfirmation: false };
    }

    // 2. plan 模式 - 只允许只读工具
    if (this.config.mode === 'plan') {
      if (READONLY_TOOLS.has(toolName)) {
        return { allowed: true, needsConfirmation: false };
      }
      // bash 工具在 plan 模式下限制为只读命令
      if (toolName === 'bash') {
        return { allowed: true, needsConfirmation: false, reason: '规划模式: bash 限制为只读' };
      }
      return {
        allowed: false,
        needsConfirmation: false,
        reason: `规划模式下不允许使用 ${toolName}`,
      };
    }

    // 3. 检查显式拒绝规则
    for (const rule of this.config.deny) {
      if (this.matchRule(rule, toolName, params)) {
        return {
          allowed: false,
          needsConfirmation: false,
          reason: `被拒绝规则匹配: ${rule.tool}`,
        };
      }
    }

    // 4. 检查显式允许规则
    for (const rule of this.config.allow) {
      if (this.matchRule(rule, toolName, params)) {
        return { allowed: true, needsConfirmation: false };
      }
    }

    // 5. 检查 alwaysAllow
    if (this.isAlwaysAllowed(toolName, params)) {
      return { allowed: true, needsConfirmation: false };
    }

    // 6. acceptEdits 模式 - 自动允许文件编辑
    if (this.config.mode === 'acceptEdits') {
      if (['write_file', 'edit_file'].includes(toolName)) {
        return { allowed: true, needsConfirmation: false };
      }
    }

    // 7. 只读工具无需确认
    if (READONLY_TOOLS.has(toolName)) {
      return { allowed: true, needsConfirmation: false };
    }

    // 8. Task/Skill 工具无需确认
    if (['Task', 'Skill'].includes(toolName)) {
      return { allowed: true, needsConfirmation: false };
    }

    // 9. 危险工具需要确认（ask/default 模式）
    if (DANGEROUS_TOOLS[toolName]) {
      return {
        allowed: true,
        needsConfirmation: true,
        reason: DANGEROUS_TOOLS[toolName],
      };
    }

    // 10. 未知工具，默认允许
    return { allowed: true, needsConfirmation: false };
  }

  /**
   * 向用户请求权限确认
   */
  async promptConfirmation(
    toolName: string,
    params: Record<string, unknown>,
    reason?: string
  ): Promise<ConfirmationResult> {
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
    });

    try {
      // 格式化参数摘要
      const paramSummary = this.formatParams(toolName, params);

      console.log('');
      console.log(`  ⚡ 权限请求: ${toolName}`);
      if (reason) {
        console.log(`  📋 ${reason}`);
      }
      console.log(`  📝 ${paramSummary}`);
      console.log('');

      const answer = await new Promise<string>((resolve) => {
        rl.question('  允许执行? [Y/n/always] ', (input) => {
          resolve(input.trim().toLowerCase());
        });
      });

      rl.close();

      if (answer === 'n' || answer === 'no') {
        return 'deny';
      }
      if (answer === 'always' || answer === 'a') {
        this.setAlwaysAllow(toolName);
        return 'always';
      }
      // 默认允许（Enter / y / yes）
      return 'allow';
    } catch {
      rl.close();
      return 'allow'; // 出错时默认允许
    }
  }

  /**
   * 获取权限配置摘要
   */
  getSummary(): string {
    const lines: string[] = [
      `权限模式: ${this.config.mode}`,
      `允许规则: ${this.config.allow.length} 条`,
      `拒绝规则: ${this.config.deny.length} 条`,
      `永久允许: ${this.alwaysAllowed.size} 个工具`,
    ];

    if (this.alwaysAllowed.size > 0) {
      lines.push('永久允许的工具:');
      for (const [tool, params] of this.alwaysAllowed) {
        lines.push(`  - ${tool} (${params.size} 条规则)`);
      }
    }

    return lines.join('\n');
  }

  /**
   * 匹配规则
   */
  private matchRule(
    rule: PermissionRule,
    toolName: string,
    params?: Record<string, unknown>
  ): boolean {
    if (rule.tool !== toolName) return false;

    if (rule.params && params) {
      for (const [key, value] of Object.entries(rule.params)) {
        if (String(params[key]) !== value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * 检查是否在永久允许列表中
   */
  private isAlwaysAllowed(toolName: string, params?: Record<string, unknown>): boolean {
    const allowed = this.alwaysAllowed.get(toolName);
    if (!allowed) return false;

    if (allowed.has('*')) return true;

    if (params) {
      const paramsHash = JSON.stringify(params);
      return allowed.has(paramsHash);
    }

    return false;
  }

  /**
   * 格式化参数摘要
   */
  private formatParams(toolName: string, params: Record<string, unknown>): string {
    switch (toolName) {
      case 'bash':
        return `命令: ${String(params.command || '').slice(0, 80)}`;
      case 'write_file':
        return `文件: ${params.path}`;
      case 'edit_file':
        return `文件: ${params.path}`;
      default:
        return JSON.stringify(params).slice(0, 100);
    }
  }
}

/**
 * 单例
 */
let permissionManagerInstance: PermissionManager | null = null;

export function getPermissionManager(config?: Partial<PermissionConfig>): PermissionManager {
  if (!permissionManagerInstance) {
    permissionManagerInstance = new PermissionManager(config);
  }
  return permissionManagerInstance;
}

/**
 * 重置单例（用于测试）
 */
export function resetPermissionManager(): void {
  permissionManagerInstance = null;
}
