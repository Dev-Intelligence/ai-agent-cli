/**
 * 主题 Context — 在 Ink 组件树中提供主题
 */

import { createContext, useContext } from 'react';
import type { Theme } from '../theme.js';
import { getTheme } from '../theme.js';

export const ThemeContext = createContext<Theme>(getTheme());

export function useTheme(): Theme {
  return useContext(ThemeContext);
}
