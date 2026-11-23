import React, { createContext, useContext, useState, useEffect, useMemo } from 'react';
import {
  THEMES,
  DEFAULT_THEME_ID,
  isSupportedThemeId,
  getThemeById,
  normalizeHex,
  hexToRgba,
  getContrastTextColor,
  adjustHexBrightness,
  getReadableAccentText,
} from './themes';

const STORAGE_KEYS = {
  themeId: 'crystal_theme_id',
  customAccent: 'crystal_custom_accent',
  glassMode: 'crystal_glass_mode',
};

const ThemeContext = createContext(null);

function applyThemeTokens({ themeId, customAccent, glassMode }) {
  if (typeof document === 'undefined') return;
  const baseTheme = getThemeById(themeId);
  const root = document.documentElement;
  const tokens = { ...baseTheme.tokens };

  const validAccent = normalizeHex(customAccent);
  if (validAccent) {
    tokens['--accent'] = validAccent;
    tokens['--accent-hover'] = adjustHexBrightness(validAccent, baseTheme.isDark ? 1.12 : 0.88);
    tokens['--accent-soft'] = hexToRgba(validAccent, baseTheme.isDark ? 0.2 : 0.12);
    tokens['--accent-text'] = getReadableAccentText(validAccent, baseTheme.isDark);
    tokens['--text-on-accent'] = getContrastTextColor(validAccent);
    tokens['--shadow-button'] = `0 8px 20px -6px ${hexToRgba(validAccent, 0.42)}`;
  }

  Object.entries(tokens).forEach(([key, val]) => {
    root.style.setProperty(key, val);
  });

  root.setAttribute('data-theme', baseTheme.id);
  root.setAttribute('data-dark', baseTheme.isDark ? 'true' : 'false');
  root.setAttribute('data-glass', glassMode ? 'true' : 'false');

  const metaTheme = document.querySelector('meta[name="theme-color"]');
  if (metaTheme) {
    metaTheme.setAttribute('content', baseTheme.metaThemeColor);
  }
}

export function ThemeProvider({ children }) {
  const [savedPrefs, setSavedPrefs] = useState(() => {
    if (typeof window === 'undefined') {
      return { themeId: DEFAULT_THEME_ID, customAccent: '', glassMode: false };
    }
    const storedId = localStorage.getItem(STORAGE_KEYS.themeId) || DEFAULT_THEME_ID;
    const supported = isSupportedThemeId(storedId);
    const validTheme = supported ? getThemeById(storedId) : getThemeById(DEFAULT_THEME_ID);
    const storedAccent = supported ? localStorage.getItem(STORAGE_KEYS.customAccent) || '' : '';
    const storedGlass = localStorage.getItem(STORAGE_KEYS.glassMode) === 'true';
    if (!supported && localStorage.getItem(STORAGE_KEYS.themeId)) {
      localStorage.setItem(STORAGE_KEYS.themeId, validTheme.id);
      localStorage.removeItem(STORAGE_KEYS.customAccent);
    }
    return {
      themeId: validTheme.id,
      customAccent: storedAccent,
      glassMode: storedGlass,
    };
  });

  const [previewPrefs, setPreviewPrefs] = useState(null);

  const effectivePrefs = previewPrefs || savedPrefs;
  const activeTheme = useMemo(() => getThemeById(effectivePrefs.themeId), [effectivePrefs.themeId]);

  useEffect(() => {
    applyThemeTokens(effectivePrefs);
  }, [effectivePrefs]);

  const startPreview = () => {
    setPreviewPrefs({ ...savedPrefs });
  };

  const updatePreview = (patch) => {
    setPreviewPrefs((prev) => ({ ...(prev || savedPrefs), ...patch }));
  };

  const commitPreview = () => {
    const next = previewPrefs || savedPrefs;
    setSavedPrefs(next);
    setPreviewPrefs(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.themeId, next.themeId);
      if (next.customAccent) {
        localStorage.setItem(STORAGE_KEYS.customAccent, next.customAccent);
      } else {
        localStorage.removeItem(STORAGE_KEYS.customAccent);
      }
      localStorage.setItem(STORAGE_KEYS.glassMode, next.glassMode ? 'true' : 'false');
    }
  };

  const cancelPreview = () => {
    setPreviewPrefs(null);
  };

  const setThemeDirect = (nextThemeId) => {
    const next = { ...savedPrefs, themeId: getThemeById(nextThemeId).id, customAccent: '' };
    setSavedPrefs(next);
    setPreviewPrefs(null);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEYS.themeId, next.themeId);
      localStorage.removeItem(STORAGE_KEYS.customAccent);
    }
  };

  const value = {
    themes: THEMES,
    theme: activeTheme,
    themeId: effectivePrefs.themeId,
    customAccent: effectivePrefs.customAccent,
    glassMode: effectivePrefs.glassMode,
    effectiveAccent: normalizeHex(effectivePrefs.customAccent) || activeTheme.tokens['--accent'],
    isPreviewing: Boolean(previewPrefs),
    startPreview,
    updatePreview,
    commitPreview,
    cancelPreview,
    setThemeDirect,
  };

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme() {
  const ctx = useContext(ThemeContext);
  if (!ctx) {
    throw new Error('useTheme must be used inside a ThemeProvider');
  }
  return ctx;
}
