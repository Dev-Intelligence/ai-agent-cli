/**
 * 规划模式管理器
 *
 * 规划模式允许代理在执行前先探索和设计实现方案
 */

import path from 'node:path';
import fs from 'fs-extra';
import { loadPromptWithVars } from '../services/promptLoader.js';

/**
 * 规划模式状态
 */
interface PlanModeState {
  isActive: boolean;
  planFilePath: string;
  taskDescription: string;
  startTime: number;
}

/**
 * 规划模式管理器
 */
export class PlanModeManager {
  private state: PlanModeState | null = null;
  private workdir: string;

  constructor(workdir: string) {
    this.workdir = workdir;
  }

  /**
   * 进入规划模式
   */
  enterPlanMode(taskDescription: string): string {
    if (this.state?.isActive) {
      return '错误: 已经处于规划模式中';
    }

    const planFilePath = path.join(this.workdir, '.ai-agent-plan.md');

    this.state = {
      isActive: true,
      planFilePath,
      taskDescription,
      startTime: Date.now(),
    };

    // 创建初始计划文件
    const initialContent = loadPromptWithVars('system/plan-mode-template.md', {
      taskDescription,
    });

    fs.writeFileSync(planFilePath, initialContent, 'utf-8');

    return loadPromptWithVars('system/plan-mode-enter.md', {
      planFilePath,
    });
  }

  /**
   * 退出规划模式
   */
  exitPlanMode(): { success: boolean; plan: string; error?: string } {
    if (!this.state?.isActive) {
      return {
        success: false,
        plan: '',
        error: '错误: 当前不在规划模式中',
      };
    }

    // 读取计划文件
    let planContent = '';
    try {
      if (fs.existsSync(this.state.planFilePath)) {
        planContent = fs.readFileSync(this.state.planFilePath, 'utf-8');
      } else {
        return {
          success: false,
          plan: '',
          error: '错误: 计划文件不存在',
        };
      }
    } catch (error) {
      return {
        success: false,
        plan: '',
        error: `错误: 无法读取计划文件: ${error}`,
      };
    }

    const elapsed = (Date.now() - this.state.startTime) / 1000;

    // 清除状态
    this.state = null;

    return {
      success: true,
      plan: loadPromptWithVars('system/plan-mode-exit.md', {
        elapsedSeconds: elapsed.toFixed(1),
        planContent,
      }),
    };
  }

  /**
   * 检查是否在规划模式中
   */
  isInPlanMode(): boolean {
    return this.state?.isActive ?? false;
  }

  /**
   * 获取计划文件路径
   */
  getPlanFilePath(): string | null {
    return this.state?.planFilePath ?? null;
  }

  /**
   * 获取任务描述
   */
  getTaskDescription(): string | null {
    return this.state?.taskDescription ?? null;
  }
}

/**
 * 全局实例
 */
let planModeManagerInstance: PlanModeManager | null = null;

export function getPlanModeManager(workdir?: string): PlanModeManager {
  if (!planModeManagerInstance && workdir) {
    planModeManagerInstance = new PlanModeManager(workdir);
  }
  if (!planModeManagerInstance) {
    throw new Error('PlanModeManager 未初始化');
  }
  return planModeManagerInstance;
}

export function resetPlanModeManager(): void {
  planModeManagerInstance = null;
}
