import { createContext, useContext, useMemo, type ReactNode } from 'react';
import {
  getTheme,
  getThemeName,
  getInkColors,
  type Theme,
  type ThemeName,
  type InkColorMap,
} from '../../../theme.js';

export interface ThemeContextValue {
  theme: Theme;
  themeName: ThemeName;
  colors: InkColorMap;
}

const defaultValue: ThemeContextValue = {
  theme: getTheme(),
  themeName: getThemeName(),
  colors: getInkColors(),
};

export const ThemeContext = createContext<ThemeContextValue>(defaultValue);

export interface ThemeProviderProps {
  children: ReactNode;
  value?: Partial<ThemeContextValue>;
}

export function ThemeProvider({ children, value }: ThemeProviderProps) {
  const contextValue = useMemo<ThemeContextValue>(
    () => ({
      theme: value?.theme ?? getTheme(),
      themeName: value?.themeName ?? getThemeName(),
      colors: value?.colors ?? getInkColors(),
    }),
    [value?.colors, value?.theme, value?.themeName],
  );

  return (
    <ThemeContext.Provider value={contextValue}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useThemeContext(): ThemeContextValue {
  return useContext(ThemeContext);
}
