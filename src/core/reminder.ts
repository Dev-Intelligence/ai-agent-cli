/**
 * System Reminder 机制
 * 多类型提醒系统，支持优先级排序和上下文感知
 * 用于提醒模型使用 Todo 工具进行结构化规划
 */

import { DEFAULTS, PROJECT_FILE } from './constants.js';
import { loadPromptWithVars } from '../services/promptLoader.js';

/**
 * 提醒消息类型
 */
export interface ReminderMessage {
  type: 'initial' | 'nag' | 'context' | 'security';
  content: string;
  priority: number; // 优先级，数字越小优先级越高
}

/**
 * 提醒消息模板
 */
export const REMINDERS: Record<string, ReminderMessage> = {
  initial: {
    type: 'initial',
    content: loadPromptWithVars('system/reminders/initial.md', {}),
    priority: 1,
  },
  nag: {
    type: 'nag',
    content: loadPromptWithVars('system/reminders/nag.md', {}),
    priority: 2,
  },
  security: {
    type: 'security',
    content: loadPromptWithVars('system/reminders/security.md', {}),
    priority: 0,
  },
};

/**
 * Reminder 管理器
 * 增强版：支持多种提醒类型和上下文感知
 */
export class ReminderManager {
  private roundsWithoutTodo = 0;
  private isFirstMessage = true;
  private readonly nagThreshold: number;
  private hasContext = false;
  private suspiciousFileDetected = false;
  private projectFileName = PROJECT_FILE;

  constructor(nagThreshold = DEFAULTS.todoNagThreshold) {
    this.nagThreshold = nagThreshold;
  }

  /**
   * 设置项目指令文件名（用于动态提示）
   */
  setProjectFileName(projectFileName?: string): void {
    if (projectFileName && projectFileName.trim()) {
      this.projectFileName = projectFileName.trim();
    }
  }

  private buildContextReminder(): ReminderMessage {
    return {
      type: 'context',
      content: loadPromptWithVars('system/reminders/context.md', {
        projectFileName: this.projectFileName,
      }),
      priority: 3,
    };
  }

  /**
   * 获取当前应该注入的所有 reminders
   */
  getReminders(): ReminderMessage[] {
    const reminders: ReminderMessage[] = [];

    // 安全提醒（如果检测到可疑文件）
    if (this.suspiciousFileDetected) {
      reminders.push(REMINDERS.security);
    }

    // 首条消息提醒
    if (this.isFirstMessage) {
      reminders.push(REMINDERS.initial);
    }

    // Todo 使用提醒
    if (this.roundsWithoutTodo >= this.nagThreshold) {
      reminders.push(REMINDERS.nag);
    }

    // 上下文提醒
    if (this.hasContext && this.isFirstMessage) {
      reminders.push(this.buildContextReminder());
    }

    // 按优先级排序
    return reminders.sort((a, b) => a.priority - b.priority);
  }

  /**
   * 获取格式化的提醒字符串
   */
  getFormattedReminders(): string {
    const reminders = this.getReminders();
    if (reminders.length === 0) {
      return '';
    }
    return reminders.map(r => r.content).join('\n');
  }

  /**
   * 获取单个提醒（向后兼容）
   */
  getReminder(): string | null {
    const formatted = this.getFormattedReminders();
    return formatted || null;
  }

  /**
   * 标记第一条消息已发送
   */
  markFirstMessageSent(): void {
    this.isFirstMessage = false;
  }

  /**
   * 记录一轮工具调用（检查是否使用了 Todo）
   */
  recordToolCalls(toolNames: string[]): void {
    const usedTodo = toolNames.includes('TodoWrite');
    if (usedTodo) {
      this.roundsWithoutTodo = 0;
    } else {
      this.roundsWithoutTodo++;
    }

    // 检查是否读取了可疑文件
    if (toolNames.includes('read_file')) {
      // 这里可以添加更复杂的检测逻辑
    }
  }

  /**
   * 设置是否有项目上下文
   */
  setHasContext(hasContext: boolean): void {
    this.hasContext = hasContext;
  }

  /**
   * 标记检测到可疑文件
   */
  markSuspiciousFile(): void {
    this.suspiciousFileDetected = true;
  }

  /**
   * 清除可疑文件标记
   */
  clearSuspiciousFile(): void {
    this.suspiciousFileDetected = false;
  }

  /**
   * 重置计数器
   */
  reset(): void {
    this.roundsWithoutTodo = 0;
    this.isFirstMessage = true;
    this.suspiciousFileDetected = false;
  }

  /**
   * 获取当前轮数
   */
  getRoundsWithoutTodo(): number {
    return this.roundsWithoutTodo;
  }
}

// 单例
let reminderInstance: ReminderManager | null = null;

export function getReminderManager(): ReminderManager {
  if (!reminderInstance) {
    reminderInstance = new ReminderManager();
  }
  return reminderInstance;
}

export function resetReminderManager(): void {
  reminderInstance = null;
}
