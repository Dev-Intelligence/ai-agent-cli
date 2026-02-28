/**
 * Hook 事件系统
 * 支持在工具执行前后触发自定义命令
 */

import { execSync } from 'child_process';

/**
 * Hook 事件类型
 */
export type HookEvent =
  | 'PreToolUse'
  | 'PostToolUse'
  | 'PostToolUseFailure'
  | 'PermissionRequest'
  | 'UserPromptSubmit'
  | 'SessionStart'
  | 'SessionEnd'
  | 'SubagentStart'
  | 'SubagentStop'
  | 'PreCompact'
  | 'PostCompact';

/**
 * Hook 定义
 */
export interface HookDefinition {
  /** 触发事件 */
  event: HookEvent;
  /** 执行的命令 */
  command: string;
  /** 超时（毫秒，默认 10000） */
  timeout?: number;
  /** 是否阻塞执行（默认 true） */
  blocking?: boolean;
  /** 工具名称过滤（仅对 *ToolUse 事件有效） */
  toolFilter?: string[];
}

/**
 * Hook 执行上下文
 */
export interface HookContext {
  toolName?: string;
  toolInput?: Record<string, unknown>;
  toolOutput?: string;
  workdir?: string;
  sessionId?: string;
  agentType?: string;
  error?: string;
  [key: string]: unknown;
}

/**
 * Hook 执行结果
 */
export interface HookResult {
  hook: HookDefinition;
  success: boolean;
  output?: string;
  error?: string;
  blocked?: boolean; // hook 是否阻止了操作
}

/**
 * Hook 配置
 */
export interface HookConfig {
  hooks: HookDefinition[];
}

/**
 * 默认超时
 */
const DEFAULT_TIMEOUT = 10000;

/**
 * Hook 管理器
 */
export class HookManager {
  private hooks: HookDefinition[];
  private workdir: string;

  constructor(workdir: string, hooks: HookDefinition[] = []) {
    this.workdir = workdir;
    this.hooks = hooks;
  }

  /**
   * 添加 Hook
   */
  addHook(hook: HookDefinition): void {
    this.hooks.push(hook);
  }

  /**
   * 移除指定事件的所有 Hook
   */
  removeHooks(event: HookEvent): void {
    this.hooks = this.hooks.filter(h => h.event !== event);
  }

  /**
   * 检查是否有指定事件的 Hook
   */
  hasHooksFor(event: HookEvent): boolean {
    return this.hooks.some(h => h.event === event);
  }

  /**
   * 触发事件
   */
  async emit(event: HookEvent, context: HookContext = {}): Promise<HookResult[]> {
    const matchingHooks = this.getMatchingHooks(event, context);
    if (matchingHooks.length === 0) return [];

    const results: HookResult[] = [];

    for (const hook of matchingHooks) {
      const result = await this.executeHook(hook, event, context);
      results.push(result);

      // 如果阻塞 hook 失败或阻止了操作，停止后续 hook
      if (hook.blocking !== false && (result.blocked || !result.success)) {
        break;
      }
    }

    return results;
  }

  /**
   * 获取匹配的 Hook 列表
   */
  private getMatchingHooks(event: HookEvent, context: HookContext): HookDefinition[] {
    return this.hooks.filter(hook => {
      // 事件匹配
      if (hook.event !== event) return false;

      // 工具名称过滤
      if (hook.toolFilter && hook.toolFilter.length > 0 && context.toolName) {
        if (!hook.toolFilter.includes(context.toolName)) return false;
      }

      return true;
    });
  }

  /**
   * 执行单个 Hook
   */
  private async executeHook(
    hook: HookDefinition,
    event: HookEvent,
    context: HookContext
  ): Promise<HookResult> {
    const timeout = hook.timeout ?? DEFAULT_TIMEOUT;

    // 构建环境变量
    const env: Record<string, string> = {
      ...process.env as Record<string, string>,
      HOOK_EVENT: event,
      HOOK_WORKDIR: context.workdir || this.workdir,
    };

    if (context.toolName) {
      env.HOOK_TOOL_NAME = context.toolName;
    }
    if (context.toolInput) {
      env.HOOK_TOOL_INPUT = JSON.stringify(context.toolInput);
    }
    if (context.toolOutput) {
      // 截断过长的输出
      env.HOOK_TOOL_OUTPUT = context.toolOutput.slice(0, 10000);
    }
    if (context.sessionId) {
      env.HOOK_SESSION_ID = context.sessionId;
    }
    if (context.agentType) {
      env.HOOK_AGENT_TYPE = context.agentType;
    }
    if (context.error) {
      env.HOOK_ERROR = context.error;
    }

    try {
      const output = execSync(hook.command, {
        cwd: this.workdir,
        timeout,
        env,
        encoding: 'utf-8',
        stdio: ['pipe', 'pipe', 'pipe'],
      });

      // 检查输出中是否包含 BLOCK 指令
      const blocked = output.trim().startsWith('BLOCK:');

      return {
        hook,
        success: true,
        output: output.trim(),
        blocked,
      };
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);

      return {
        hook,
        success: false,
        error: errorMsg,
      };
    }
  }

  /**
   * 获取已注册的 Hook 列表
   */
  listHooks(): HookDefinition[] {
    return [...this.hooks];
  }

  /**
   * 获取 Hook 摘要
   */
  getSummary(): string {
    if (this.hooks.length === 0) {
      return '未配置任何 Hook';
    }

    const lines: string[] = [`已配置 ${this.hooks.length} 个 Hook:\n`];

    for (const hook of this.hooks) {
      const blocking = hook.blocking !== false ? '阻塞' : '非阻塞';
      const filter = hook.toolFilter ? ` [${hook.toolFilter.join(', ')}]` : '';
      lines.push(`  ${hook.event}${filter} (${blocking}): ${hook.command}`);
    }

    return lines.join('\n');
  }
}

/**
 * 单例
 */
let hookManagerInstance: HookManager | null = null;

export function getHookManager(workdir?: string, hooks?: HookDefinition[]): HookManager {
  if (!hookManagerInstance && workdir) {
    hookManagerInstance = new HookManager(workdir, hooks);
  }
  return hookManagerInstance!;
}

/**
 * 重置单例（用于测试）
 */
export function resetHookManager(): void {
  hookManagerInstance = null;
}
