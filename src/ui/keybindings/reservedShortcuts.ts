/**
 * 终端 / 系统保留的键位集合
 *
 * 用于 /doctor 一类的体检命令：提醒用户某些键位即使配置了也不会生效，
 * 或者根本不应被用户重绑（硬编码在软件里）。
 */

export interface ReservedShortcut {
  key: string;
  reason: string;
  severity: 'error' | 'warning';
}

/**
 * 硬编码、绝对不可重绑的键位。
 * 当用户尝试把它们绑到别的动作时，/doctor 应报 error。
 */
export const NON_REBINDABLE: ReservedShortcut[] = [
  {
    key: 'ctrl+c',
    reason: '不可重绑 - 用于中断/退出（硬编码）',
    severity: 'error',
  },
  {
    key: 'ctrl+d',
    reason: '不可重绑 - 用于退出（硬编码）',
    severity: 'error',
  },
  {
    key: 'ctrl+m',
    reason: '不可重绑 - 终端里与 Enter 等价（都发 CR）',
    severity: 'error',
  },
];

/**
 * 终端控制类键位：会被终端/操作系统拦截，基本到不了程序。
 *
 * 注：ctrl+s（XOFF）/ ctrl+q（XON）没有列进来 —— 现代终端默认关掉软流控，
 * 并且我们会把 ctrl+s 用于 stash 特性。
 */
export const TERMINAL_RESERVED: ReservedShortcut[] = [
  {
    key: 'ctrl+z',
    reason: 'Unix 进程挂起（SIGTSTP）',
    severity: 'warning',
  },
  {
    key: 'ctrl+\\',
    reason: '终端退出信号（SIGQUIT）',
    severity: 'error',
  },
];

/**
 * macOS 上会被系统拦截的快捷键。
 */
export const MACOS_RESERVED: ReservedShortcut[] = [
  { key: 'cmd+c', reason: 'macOS 系统复制', severity: 'error' },
  { key: 'cmd+v', reason: 'macOS 系统粘贴', severity: 'error' },
  { key: 'cmd+x', reason: 'macOS 系统剪切', severity: 'error' },
  { key: 'cmd+q', reason: 'macOS 退出应用', severity: 'error' },
  { key: 'cmd+w', reason: 'macOS 关闭窗口/标签', severity: 'error' },
  { key: 'cmd+tab', reason: 'macOS 应用切换器', severity: 'error' },
  { key: 'cmd+space', reason: 'macOS Spotlight', severity: 'error' },
];

/** 平台侦测（基于 process.platform） */
function currentPlatform(): 'macos' | 'windows' | 'linux' | 'other' {
  if (process.platform === 'darwin') return 'macos';
  if (process.platform === 'win32') return 'windows';
  if (process.platform === 'linux') return 'linux';
  return 'other';
}

/**
 * 取当前平台下所有保留键位（non-rebindable + 终端通用 + 平台特定）。
 */
export function getReservedShortcuts(): ReservedShortcut[] {
  const reserved = [...NON_REBINDABLE, ...TERMINAL_RESERVED];
  if (currentPlatform() === 'macos') {
    reserved.push(...MACOS_RESERVED);
  }
  return reserved;
}

/**
 * 把键位字符串归一成统一形式，用于比较。
 * 对 chord（以空白分隔的多步键，如 "ctrl+x ctrl+b"）要逐步归一：
 * 如果先按 '+' 整段拆，会把 "x ctrl" 错拆成一个 mainKey，
 * 下一步又被覆盖，最终只剩 chord 末尾那一步。
 */
export function normalizeKeyForComparison(key: string): string {
  return key.trim().split(/\s+/).map(normalizeStep).join(' ');
}

function normalizeStep(step: string): string {
  const parts = step.split('+');
  const modifiers: string[] = [];
  let mainKey = '';

  for (const part of parts) {
    const lower = part.trim().toLowerCase();
    if (
      [
        'ctrl',
        'control',
        'alt',
        'opt',
        'option',
        'meta',
        'cmd',
        'command',
        'shift',
      ].includes(lower)
    ) {
      // 把同义修饰键名归一：control→ctrl、option→alt、command→cmd
      if (lower === 'control') modifiers.push('ctrl');
      else if (lower === 'option' || lower === 'opt') modifiers.push('alt');
      else if (lower === 'command' || lower === 'cmd') modifiers.push('cmd');
      else modifiers.push(lower);
    } else {
      mainKey = lower;
    }
  }

  modifiers.sort();
  return [...modifiers, mainKey].join('+');
}
