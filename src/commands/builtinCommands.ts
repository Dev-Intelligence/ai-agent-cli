/**
 * 内置斜杠命令
 * 提取自 cli.ts 的命令逻辑，以 SlashCommand 对象形式注册
 */

import type { SlashCommand } from './registry.js';
import { getConfigSummary } from '../services/config/configStore.js';
import { runReconfigureWizard } from '../services/config/setup.js';
import { countTokensFromUsage, formatTokenCount, getTokenPercentage } from '../utils/tokenCounter.js';
import { getModelContextLength, getModelDisplayName } from '../utils/modelConfig.js';
import { getPermissionManager } from '../core/permissions.js';
import type { PermissionMode } from '../core/permissions.js';
import { getHookManager } from '../core/hooks.js';

/**
 * /help 命令
 */
export const helpCommand: SlashCommand = {
  name: 'help',
  aliases: ['h'],
  description: '显示帮助信息',
  async execute(_args, _context) {
    // 返回 undefined，由 registry.getHelp() 生成帮助内容
    return undefined;
  },
};

/**
 * /clear 命令
 */
export const clearCommand: SlashCommand = {
  name: 'clear',
  aliases: ['c'],
  description: '清空对话历史',
  async execute(_args, context) {
    context.history.splice(0, context.history.length);
    context.reminderManager.reset();
    return '对话历史已清空';
  },
};

/**
 * /config 命令
 */
export const configCommand: SlashCommand = {
  name: 'config',
  description: '查看当前配置',
  async execute(_args, context) {
    return '\n当前配置:\n' + getConfigSummary(context.userConfig as any) + '\n';
  },
};

/**
 * /config set 命令
 */
export const configSetCommand: SlashCommand = {
  name: 'config set',
  description: '重新配置',
  async execute(_args, _context) {
    const newConfig = await runReconfigureWizard();
    if (newConfig) {
      return '配置已更新，请重新启动 CLI 以使用新配置。';
    }
    return undefined;
  },
};

/**
 * /history 命令
 */
export const historyCommand: SlashCommand = {
  name: 'history',
  description: '显示输入历史',
  async execute(_args, context) {
    const inputHistory = context.input.getHistory();
    if (inputHistory.length === 0) {
      return '暂无输入历史';
    }

    const lines = ['输入历史:'];
    inputHistory.slice(0, 10).forEach((h: string, i: number) => {
      lines.push(`  ${i + 1}. ${h}`);
    });
    return lines.join('\n');
  },
};

/**
 * /compact 命令 - 手动触发上下文压缩
 */
export const compactCommand: SlashCommand = {
  name: 'compact',
  description: '手动压缩对话上下文',
  async execute(_args, context) {
    if (!context.compressor || !context.systemPrompt) {
      return '上下文压缩功能未启用';
    }

    try {
      const result = await context.compressor.compact(
        context.history as any[],
        context.systemPrompt
      );

      // 替换历史
      context.history.splice(0, context.history.length);
      for (const msg of result.newHistory as any[]) {
        context.history.push(msg);
      }

      return '上下文已压缩';
    } catch (error: unknown) {
      const errorMsg = error instanceof Error ? error.message : String(error);
      return `压缩失败: ${errorMsg}`;
    }
  },
};

/**
 * /cost 命令 - 显示 token 用量
 */
export const costCommand: SlashCommand = {
  name: 'cost',
  description: '显示 Token 使用统计',
  async execute(_args, context) {
    const currentTokens = countTokensFromUsage(context.history as any[]);
    const maxTokens = getModelContextLength(
      context.userConfig.provider as string || context.config.provider,
      context.userConfig.model as string || context.config.model
    );

    const percentage = getTokenPercentage(currentTokens, maxTokens);
    const modelDisplay = getModelDisplayName(
      context.userConfig.model as string || context.config.model
    );

    const lines = [
      `\nToken 使用统计:`,
      `  模型: ${modelDisplay}`,
      `  已使用: ${formatTokenCount(currentTokens)}`,
      `  上下文窗口: ${formatTokenCount(maxTokens)}`,
      `  使用率: ${percentage}%`,
    ];

    return lines.join('\n');
  },
};

/**
 * /model 命令 - 显示/切换模型
 */
export const modelCommand: SlashCommand = {
  name: 'model',
  description: '查看当前模型',
  async execute(_args, context) {
    const modelDisplay = getModelDisplayName(context.config.model);
    return `当前模型: ${modelDisplay} (${context.config.provider})`;
  },
};

/**
 * /provider 命令 - 显示提供商
 */
export const providerCommand: SlashCommand = {
  name: 'provider',
  description: '查看当前提供商',
  async execute(_args, context) {
    return `当前提供商: ${context.config.getProviderDisplayName()} (${context.config.provider})`;
  },
};

/**
 * /permissions 命令 - 查看/修改权限模式
 */
export const permissionsCommand: SlashCommand = {
  name: 'permissions',
  aliases: ['perm'],
  description: '查看或修改权限模式',
  async execute(args, _context) {
    const pm = getPermissionManager();

    if (args) {
      const validModes: PermissionMode[] = [
        'ask', 'acceptEdits', 'bypassPermissions', 'plan', 'dontAsk', 'default',
      ];

      if (validModes.includes(args as PermissionMode)) {
        pm.setMode(args as PermissionMode);
        return `权限模式已切换为: ${args}`;
      }

      return `无效的权限模式: ${args}\n可用模式: ${validModes.join(', ')}`;
    }

    return pm.getSummary();
  },
};

/**
 * /hooks 命令 - 查看已配置的 Hook
 */
export const hooksCommand: SlashCommand = {
  name: 'hooks',
  description: '查看已配置的 Hook',
  async execute(_args, _context) {
    const hm = getHookManager();
    if (!hm) {
      return 'Hook 系统未初始化';
    }
    return hm.getSummary();
  },
};

/**
 * 获取所有内置命令
 */
export function getBuiltinCommands(): SlashCommand[] {
  return [
    helpCommand,
    clearCommand,
    configCommand,
    configSetCommand,
    historyCommand,
    compactCommand,
    costCommand,
    modelCommand,
    providerCommand,
    permissionsCommand,
    hooksCommand,
  ];
}
