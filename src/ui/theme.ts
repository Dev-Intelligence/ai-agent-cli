/**
 * 主题系统 - 集中管理颜色和样式
 */

import chalk, { ChalkInstance } from 'chalk';

/**
 * 主题接口定义
 */
export interface Theme {
  // 品牌色
  primary: ChalkInstance;
  secondary: ChalkInstance;

  // 语义色
  success: ChalkInstance;
  error: ChalkInstance;
  warning: ChalkInstance;
  info: ChalkInstance;

  // 文本色
  text: ChalkInstance;
  textDim: ChalkInstance;
  textBold: ChalkInstance;

  // 边框色
  border: ChalkInstance;
  borderDim: ChalkInstance;

  // Provider 专属色
  provider: ChalkInstance;
}

/**
 * 主题名称
 */
export type ThemeName = 'default' | 'dark' | 'light' | 'monokai';

/**
 * Provider 颜色映射
 */
const PROVIDER_COLORS: Record<string, ChalkInstance> = {
  anthropic: chalk.magenta,
  openai: chalk.green,
  gemini: chalk.blue,
};

/**
 * 内置主题集合
 */
const BUILTIN_THEMES: Record<ThemeName, Theme> = {
  default: {
    primary: chalk.hex('#FFC233'),
    secondary: chalk.cyan,
    success: chalk.green,
    error: chalk.red,
    warning: chalk.yellow,
    info: chalk.blue,
    text: chalk.white,
    textDim: chalk.dim,
    textBold: chalk.bold,
    border: chalk.gray,
    borderDim: chalk.dim.gray,
    provider: chalk.cyan,
  },

  dark: {
    primary: chalk.hex('#BB86FC'),
    secondary: chalk.hex('#03DAC6'),
    success: chalk.hex('#00E676'),
    error: chalk.hex('#CF6679'),
    warning: chalk.hex('#FFB74D'),
    info: chalk.hex('#64B5F6'),
    text: chalk.hex('#E0E0E0'),
    textDim: chalk.dim.hex('#9E9E9E'),
    textBold: chalk.bold.hex('#FFFFFF'),
    border: chalk.hex('#424242'),
    borderDim: chalk.dim.hex('#303030'),
    provider: chalk.hex('#03DAC6'),
  },

  light: {
    primary: chalk.hex('#1976D2'),
    secondary: chalk.hex('#00796B'),
    success: chalk.hex('#2E7D32'),
    error: chalk.hex('#C62828'),
    warning: chalk.hex('#F57F17'),
    info: chalk.hex('#0277BD'),
    text: chalk.hex('#212121'),
    textDim: chalk.hex('#757575'),
    textBold: chalk.bold.hex('#000000'),
    border: chalk.hex('#BDBDBD'),
    borderDim: chalk.hex('#E0E0E0'),
    provider: chalk.hex('#00796B'),
  },

  monokai: {
    primary: chalk.hex('#F92672'),
    secondary: chalk.hex('#66D9EF'),
    success: chalk.hex('#A6E22E'),
    error: chalk.hex('#F92672'),
    warning: chalk.hex('#E6DB74'),
    info: chalk.hex('#66D9EF'),
    text: chalk.hex('#F8F8F2'),
    textDim: chalk.hex('#75715E'),
    textBold: chalk.bold.hex('#F8F8F2'),
    border: chalk.hex('#49483E'),
    borderDim: chalk.dim.hex('#49483E'),
    provider: chalk.hex('#AE81FF'),
  },
};

/**
 * 当前主题名称
 */
let currentThemeName: ThemeName = 'default';

/**
 * 当前主题实例
 */
let currentTheme: Theme = { ...BUILTIN_THEMES.default };

/**
 * 获取当前主题
 */
export function getTheme(): Theme {
  return currentTheme;
}

/**
 * 获取当前主题名称
 */
export function getThemeName(): ThemeName {
  return currentThemeName;
}

/**
 * 获取所有可用主题名
 */
export function getAvailableThemes(): ThemeName[] {
  return Object.keys(BUILTIN_THEMES) as ThemeName[];
}

/**
 * 设置主题（按名称）
 */
export function setTheme(name: string): boolean {
  if (name in BUILTIN_THEMES) {
    currentThemeName = name as ThemeName;
    currentTheme = { ...BUILTIN_THEMES[currentThemeName] };
    return true;
  }
  return false;
}

/**
 * 根据 provider 设置主题
 */
export function setThemeByProvider(provider: string): void {
  currentTheme = {
    ...BUILTIN_THEMES[currentThemeName],
    provider: PROVIDER_COLORS[provider] || chalk.cyan,
  };
}

/**
 * 重置为默认主题
 */
export function resetTheme(): void {
  currentThemeName = 'default';
  currentTheme = { ...BUILTIN_THEMES.default };
}

/**
 * 检测是否为无障碍模式
 */
export function isAccessibilityMode(): boolean {
  return process.env.AI_AGENT_ACCESSIBILITY === 'true';
}

/**
 * Ink 组件用的语义颜色映射
 * 使用 hex 或 ANSI 色名，替代硬编码色值
 */
export interface InkColorMap {
  primary: string;
  secondary: string;
  success: string;
  error: string;
  warning: string;
  info: string;
  border: string;
  borderDim: string;
  textDim: string;
  cursor: string;
  heading: string;
}

/**
 * 内置主题的 Ink 颜色映射
 */
const INK_COLOR_MAPS: Record<ThemeName, InkColorMap> = {
  default: {
    primary: '#FFC233',
    secondary: 'cyan',
    success: 'green',
    error: 'red',
    warning: 'yellow',
    info: 'blue',
    border: 'gray',
    borderDim: 'gray',
    textDim: 'gray',
    cursor: 'yellow',
    heading: 'red',
  },
  dark: {
    primary: '#BB86FC',
    secondary: '#03DAC6',
    success: '#00E676',
    error: '#CF6679',
    warning: '#FFB74D',
    info: '#64B5F6',
    border: '#424242',
    borderDim: '#303030',
    textDim: '#9E9E9E',
    cursor: '#BB86FC',
    heading: '#CF6679',
  },
  light: {
    primary: '#1976D2',
    secondary: '#00796B',
    success: '#2E7D32',
    error: '#C62828',
    warning: '#F57F17',
    info: '#0277BD',
    border: '#BDBDBD',
    borderDim: '#E0E0E0',
    textDim: '#757575',
    cursor: '#1976D2',
    heading: '#C62828',
  },
  monokai: {
    primary: '#F92672',
    secondary: '#66D9EF',
    success: '#A6E22E',
    error: '#F92672',
    warning: '#E6DB74',
    info: '#66D9EF',
    border: '#49483E',
    borderDim: '#49483E',
    textDim: '#75715E',
    cursor: '#F92672',
    heading: '#F92672',
  },
};

/**
 * 获取当前主题的 Ink 颜色映射
 */
export function getInkColors(): InkColorMap {
  return INK_COLOR_MAPS[currentThemeName] || INK_COLOR_MAPS.default;
}
