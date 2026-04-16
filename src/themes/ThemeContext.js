// src/themes/ThemeContext.js
import React, { createContext, useContext, useEffect, useMemo, useState } from 'react';
import { THEMES, DEFAULT_THEME } from './themes';
import { getSetting, setSetting } from '../storage/db';

const ThemeContext = createContext(null);

export function ThemeProvider({ children }) {
  const [themeId, setThemeId] = useState(DEFAULT_THEME);
  const [accentOverride, setAccentOverride] = useState(null);
  const [fontSize, setFontSizeState] = useState(16);
  const [lineHeight, setLineHeightState] = useState(1.75);

  const baseTheme = THEMES[themeId] || THEMES[DEFAULT_THEME];

  const theme = useMemo(() => {
    return {
      ...baseTheme,
      accent: accentOverride || baseTheme.accent,
      fontSize,
      lineHeight,
    };
  }, [baseTheme, accentOverride, fontSize, lineHeight]);

  useEffect(() => {
    let mounted = true;

    const loadThemeSettings = async () => {
      const savedTheme = await getSetting('theme');
      const nextThemeId = savedTheme && THEMES[savedTheme] ? savedTheme : DEFAULT_THEME;

      const [savedAccent, savedFontSize, savedLineHeight] = await Promise.all([
        getSetting(`accent_${nextThemeId}`),
        getSetting('font_size'),
        getSetting('line_height'),
      ]);

      if (!mounted) return;

      setThemeId(nextThemeId);
      setAccentOverride(savedAccent || null);
      setFontSizeState(savedFontSize ? parseInt(savedFontSize, 10) : 16);
      setLineHeightState(savedLineHeight ? parseFloat(savedLineHeight) : 1.75);
    };

    loadThemeSettings();

    return () => {
      mounted = false;
    };
  }, []);

  const changeTheme = async (id) => {
    const nextThemeId = THEMES[id] ? id : DEFAULT_THEME;

    setThemeId(nextThemeId);
    await setSetting('theme', nextThemeId);

    const savedAccent = await getSetting(`accent_${nextThemeId}`);
    setAccentOverride(savedAccent || null);
  };

  const refreshThemeSettings = async () => {
    const [savedAccent, savedFontSize, savedLineHeight] = await Promise.all([
      getSetting(`accent_${themeId}`),
      getSetting('font_size'),
      getSetting('line_height'),
    ]);

    setAccentOverride(savedAccent || null);
    setFontSizeState(savedFontSize ? parseInt(savedFontSize, 10) : 16);
    setLineHeightState(savedLineHeight ? parseFloat(savedLineHeight) : 1.75);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        themeId,
        changeTheme,
        refreshThemeSettings,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}