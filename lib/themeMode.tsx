'use client';

import { createContext, useContext } from 'react';

export type ThemeMode = 'light' | 'dark';
export type ThemePreset = 'default' | 'solid' | 'dry';

type ThemeModeContextValue = {
  mode: ThemeMode;
  toggleMode: () => void;
  preset: ThemePreset;
  cyclePreset: () => void;
};

export const ThemeModeContext = createContext<ThemeModeContextValue | undefined>(undefined);

export function useThemeMode() {
  const context = useContext(ThemeModeContext);

  if (!context) {
    throw new Error('useThemeMode must be used within AppThemeProvider');
  }

  return context;
}
