export const DEFAULT_THEME_ID = 'crystal-slate';

export function normalizeHex(hex) {
  if (typeof hex !== 'string') return null;
  const cleaned = hex.trim().replace(/^#/, '');
  if (/^[0-9a-fA-F]{6}$/.test(cleaned)) {
    return `#${cleaned.toUpperCase()}`;
  }
  if (/^[0-9a-fA-F]{3}$/.test(cleaned)) {
    const expanded = cleaned
      .split('')
      .map((c) => c + c)
      .join('');
    return `#${expanded.toUpperCase()}`;
  }
  return null;
}

export function hexToRgb(hex) {
  const norm = normalizeHex(hex) || '#000000';
  const raw = norm.slice(1);
  return {
    r: parseInt(raw.slice(0, 2), 16),
    g: parseInt(raw.slice(2, 4), 16),
    b: parseInt(raw.slice(4, 6), 16),
  };
}

export function hexToRgba(hex, alpha = 1) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function getContrastTextColor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  return yiq >= 150 ? '#111827' : '#FFFFFF';
}

export function adjustHexBrightness(hex, factor) {
  const { r, g, b } = hexToRgb(hex);
  const clamp = (v) => Math.max(0, Math.min(255, Math.round(v)));
  const nr = clamp(factor < 1 ? r * factor : r + (255 - r) * (factor - 1));
  const ng = clamp(factor < 1 ? g * factor : g + (255 - g) * (factor - 1));
  const nb = clamp(factor < 1 ? b * factor : b + (255 - b) * (factor - 1));
  return `#${[nr, ng, nb].map((x) => x.toString(16).padStart(2, '0')).join('').toUpperCase()}`;
}

export function getReadableAccentText(hex, isDark) {
  const { r, g, b } = hexToRgb(hex);
  const yiq = (r * 299 + g * 587 + b * 114) / 1000;
  if (isDark) {
    return yiq < 130 ? adjustHexBrightness(hex, 1.45) : normalizeHex(hex) || hex;
  }
  return yiq > 145 ? adjustHexBrightness(hex, 0.58) : normalizeHex(hex) || hex;
}

export const THEMES = [
  {
    id: 'crystal-slate',
    name: 'Crystal Slate',
    tagline: 'Clean alabaster utility canvas with crisp cobalt accents',
    inspiration: 'Modern media utility',
    isDark: false,
    metaThemeColor: '#F3F5F8',
    preview: {
      bg: '#F3F5F8',
      sidebar: '#FFFFFF',
      card: '#FFFFFF',
      bar1: '#2563EB',
      bar2: '#0F172A',
      bar3: '#64748B',
      border: '#CBD5E1',
    },
    tokens: {
      '--bg-canvas': '#F3F5F8',
      '--bg-surface': '#FFFFFF',
      '--bg-surface-elevated': '#FFFFFF',
      '--bg-surface-muted': '#E9EEF5',
      '--bg-input': '#F8FAFC',
      '--bg-hero': '#FFFFFF',
      '--text-on-hero': '#0F172A',
      '--text-on-hero-muted': '#475569',
      '--canvas-text': '#0F172A',
      '--canvas-text-muted': '#475569',
      '--text-primary': '#0F172A',
      '--text-secondary': '#334155',
      '--text-muted': '#64748B',
      '--accent': '#2563EB',
      '--accent-hover': '#1D4ED8',
      '--accent-soft': 'rgba(37, 99, 235, 0.11)',
      '--accent-text': '#1D4ED8',
      '--text-on-accent': '#FFFFFF',
      '--accent-secondary': '#0284C7',
      '--accent-secondary-soft': 'rgba(2, 132, 199, 0.12)',
      '--accent-secondary-text': '#0369A1',
      '--accent-vault': '#7C3AED',
      '--accent-vault-soft': 'rgba(124, 58, 237, 0.12)',
      '--accent-vault-text': '#6D28D9',
      '--error-bg': '#FEF2F2',
      '--error-border': '#FCA5A5',
      '--error-text': '#B91C1C',
      '--border-color': 'rgba(15, 23, 42, 0.10)',
      '--border-strong': 'rgba(15, 23, 42, 0.22)',
      '--border-width': '1px',
      '--radius-card': '16px',
      '--radius-button': '12px',
      '--radius-pill': '9999px',
      '--shadow-card': '0 10px 26px -12px rgba(15, 23, 42, 0.10)',
      '--shadow-elevated': '0 18px 36px -12px rgba(15, 23, 42, 0.16)',
      '--shadow-button': '0 6px 16px -6px rgba(37, 99, 235, 0.42)',
      '--dock-bg': 'rgba(255, 255, 255, 0.92)',
      '--dock-pill-bg': '#F1F5F9',
      '--dock-border': 'rgba(15, 23, 42, 0.10)',
      '--dock-shadow': '0 14px 32px -10px rgba(15, 23, 42, 0.18), 0 0 0 1px rgba(15, 23, 42, 0.06)',
      '--dock-icon-inactive': '#64748B',
      '--font-display': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      '--font-body': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  },
  {
    id: 'soul-velvet',
    name: 'Soul Velvet',
    tagline: 'Dusty blush-taupe beauty editorial with serif contrast',
    inspiration: 'Dribbble 14080997',
    isDark: false,
    metaThemeColor: '#C8B1AF',
    preview: {
      bg: '#C8B1AF',
      sidebar: '#E6D5D3',
      card: '#F0E6E5',
      bar1: '#23252A',
      bar2: '#A63D33',
      bar3: '#6E6060',
      border: '#5E4F4E',
    },
    tokens: {
      '--bg-canvas': '#C8B1AF',
      '--bg-surface': '#F0E6E5',
      '--bg-surface-elevated': '#F7F0EF',
      '--bg-surface-muted': '#DFCECC',
      '--bg-input': '#F7F0EF',
      '--bg-hero': '#E6D5D3',
      '--text-on-hero': '#23252A',
      '--text-on-hero-muted': '#4B4344',
      '--canvas-text': '#23252A',
      '--canvas-text-muted': '#463C3C',
      '--text-primary': '#23252A',
      '--text-secondary': '#4B4344',
      '--text-muted': '#6E6060',
      '--accent': '#23252A',
      '--accent-hover': '#16181C',
      '--accent-soft': 'rgba(35, 37, 42, 0.10)',
      '--accent-text': '#181A1E',
      '--text-on-accent': '#F7F0EF',
      '--accent-secondary': '#A63D33',
      '--accent-secondary-soft': 'rgba(166, 61, 51, 0.14)',
      '--accent-secondary-text': '#852D24',
      '--accent-vault': '#8F342B',
      '--accent-vault-soft': 'rgba(143, 52, 43, 0.14)',
      '--accent-vault-text': '#6E241D',
      '--error-bg': '#FDF2F2',
      '--error-border': '#E0A1A1',
      '--error-text': '#9B1C1C',
      '--border-color': 'rgba(35, 37, 42, 0.18)',
      '--border-strong': 'rgba(35, 37, 42, 0.34)',
      '--border-width': '1px',
      '--radius-card': '18px',
      '--radius-button': '14px',
      '--radius-pill': '9999px',
      '--shadow-card': '0 14px 32px -12px rgba(45, 29, 28, 0.16)',
      '--shadow-elevated': '0 22px 46px -12px rgba(35, 24, 24, 0.24)',
      '--shadow-button': '0 8px 18px -6px rgba(35, 37, 42, 0.35)',
      '--dock-bg': 'rgba(232, 217, 215, 0.94)',
      '--dock-pill-bg': '#FAF5F4',
      '--dock-border': 'rgba(35, 37, 42, 0.16)',
      '--dock-shadow': '0 18px 40px -10px rgba(35, 24, 24, 0.22), 0 0 0 4px rgba(247, 240, 239, 0.45)',
      '--dock-icon-inactive': '#615454',
      '--font-display': "'Playfair Display', Georgia, serif",
      '--font-body': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  },
  {
    id: 'fitzgerald-print',
    name: 'Fitzgerald Print',
    tagline: 'Editorial archival paper paired with crimson display type',
    inspiration: 'Dribbble 13793950',
    isDark: false,
    metaThemeColor: '#EAE6DC',
    preview: {
      bg: '#EAE6DC',
      sidebar: '#F5F2EB',
      card: '#F5F2EB',
      bar1: '#B31312',
      bar2: '#141311',
      bar3: '#68645B',
      border: '#1C1B18',
    },
    tokens: {
      '--bg-canvas': '#EAE6DC',
      '--bg-surface': '#F5F2EB',
      '--bg-surface-elevated': '#FAF8F3',
      '--bg-surface-muted': '#E2DDD0',
      '--bg-input': '#FAF8F3',
      '--bg-hero': '#F5F2EB',
      '--text-on-hero': '#141311',
      '--text-on-hero-muted': '#43403A',
      '--canvas-text': '#141311',
      '--canvas-text-muted': '#57534B',
      '--text-primary': '#141311',
      '--text-secondary': '#43403A',
      '--text-muted': '#68645B',
      '--accent': '#B31312',
      '--accent-hover': '#950E0D',
      '--accent-soft': 'rgba(179, 19, 18, 0.11)',
      '--accent-text': '#990F0E',
      '--text-on-accent': '#FAF8F3',
      '--accent-secondary': '#141311',
      '--accent-secondary-soft': 'rgba(20, 19, 17, 0.08)',
      '--accent-secondary-text': '#141311',
      '--accent-vault': '#8F1D14',
      '--accent-vault-soft': 'rgba(143, 29, 20, 0.12)',
      '--accent-vault-text': '#7A160E',
      '--error-bg': '#FBEAEA',
      '--error-border': '#B31312',
      '--error-text': '#950E0D',
      '--border-color': '#1C1B18',
      '--border-strong': '#141311',
      '--border-width': '1.5px',
      '--radius-card': '10px',
      '--radius-button': '8px',
      '--radius-pill': '8px',
      '--shadow-card': '0 2px 0px #1C1B18',
      '--shadow-elevated': '0 5px 0px #1C1B18',
      '--shadow-button': '0 2px 0px #141311',
      '--dock-bg': '#EAE6DC',
      '--dock-pill-bg': '#FAF8F3',
      '--dock-border': '#1C1B18',
      '--dock-shadow': '0 4px 0px #1C1B18, 0 14px 28px rgba(20, 19, 17, 0.14)',
      '--dock-icon-inactive': '#5C5850',
      '--font-display': "'Oswald', 'Plus Jakarta Sans', sans-serif",
      '--font-body': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  },
  {
    id: 'paw-pop',
    name: 'Paw Pop',
    tagline: 'Playful buttercream Memphis card stack with bold ink borders',
    inspiration: 'Dribbble 22060255',
    isDark: false,
    metaThemeColor: '#FDF1C9',
    preview: {
      bg: '#FDF1C9',
      sidebar: '#FFF9E8',
      card: '#E48E58',
      bar1: '#D95877',
      bar2: '#1B140E',
      bar3: '#FFF9E8',
      border: '#1B140E',
    },
    tokens: {
      '--bg-canvas': '#FDF1C9',
      '--bg-surface': '#FFF9E8',
      '--bg-surface-elevated': '#FFFDF6',
      '--bg-surface-muted': '#F8E2A6',
      '--bg-input': '#FFFFFF',
      '--bg-hero': '#E48E58',
      '--text-on-hero': '#1B140E',
      '--text-on-hero-muted': '#3A281A',
      '--canvas-text': '#1B140E',
      '--canvas-text-muted': '#5C4532',
      '--text-primary': '#1B140E',
      '--text-secondary': '#4A3828',
      '--text-muted': '#6E5641',
      '--accent': '#E48E58',
      '--accent-hover': '#D87D45',
      '--accent-soft': 'rgba(228, 142, 88, 0.24)',
      '--accent-text': '#8F3F14',
      '--text-on-accent': '#1B140E',
      '--accent-secondary': '#D95877',
      '--accent-secondary-soft': 'rgba(217, 88, 119, 0.16)',
      '--accent-secondary-text': '#9E2B48',
      '--accent-vault': '#C94A6A',
      '--accent-vault-soft': 'rgba(201, 74, 106, 0.18)',
      '--accent-vault-text': '#8C233E',
      '--error-bg': '#FFE4E6',
      '--error-border': '#1B140E',
      '--error-text': '#9F1239',
      '--border-color': '#1B140E',
      '--border-strong': '#1B140E',
      '--border-width': '2px',
      '--radius-card': '22px',
      '--radius-button': '14px',
      '--radius-pill': '9999px',
      '--shadow-card': '4px 4px 0px #1B140E',
      '--shadow-elevated': '6px 6px 0px #1B140E',
      '--shadow-button': '3px 3px 0px #1B140E',
      '--dock-bg': '#FFF9E8',
      '--dock-pill-bg': '#FDF1C9',
      '--dock-border': '#1B140E',
      '--dock-shadow': '0 5px 0px #1B140E, 0 16px 32px rgba(27, 20, 14, 0.18)',
      '--dock-icon-inactive': '#5C4532',
      '--font-display': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
      '--font-body': "'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif",
    },
  },
];

export function isSupportedThemeId(themeId) {
  return THEMES.some((t) => t.id === themeId);
}

export function getThemeById(themeId) {
  return THEMES.find((t) => t.id === themeId) || THEMES[0];
}
