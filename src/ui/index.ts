/**
 * UI 模块统一导出
 */

// UIController
export type { UIController } from './UIController.js';

// Ink UI
export { InkUIController } from './ink/InkUIController.js';
export { App } from './ink/App.js';
export type { BannerConfig, CompletedItem, CompletedItemInput } from './ink/types.js';

// 主题
export { getTheme, setThemeByProvider, resetTheme, setTheme, getThemeName, getAvailableThemes, isAccessibilityMode } from './theme.js';
export type { Theme, ThemeName } from './theme.js';

// 常量
export {
  PRODUCT_NAME,
  PRODUCT_VERSION,
  ASCII_LOGO,
  TOOL_ICONS,
  DEFAULT_ICON,
  BORDER,
  STATUS_ICONS,
} from '../core/constants.js';

// 工具函数
export {
  stripAnsi,
  getDisplayWidth,
  padRight,
  truncate,
  getMaxWidth,
  centerText,
} from './utils.js';
