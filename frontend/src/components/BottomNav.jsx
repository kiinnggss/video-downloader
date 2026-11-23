import React from 'react';
import { Compass, ArrowDownCircle, Folder, Shield } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { getContrastTextColor, hexToRgba } from '../theme/themes';

const TAB_DEFS = [
  { id: 'home', label: 'Inspect', icon: Compass, role: 'primary' },
  { id: 'downloads', label: 'Transfers', icon: ArrowDownCircle, role: 'secondary' },
  { id: 'files', label: 'Library', icon: Folder, role: 'primary' },
  { id: 'vault', label: 'Vault', icon: Shield, role: 'vault' },
];

export function BottomNav({ currentTab, onChangeTab, activeDownloadCount = 0 }) {
  const { theme, effectiveAccent } = useTheme();
  const activeIndex = TAB_DEFS.findIndex((t) => t.id === currentTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const activeTab = TAB_DEFS[safeIndex] || TAB_DEFS[0];
  const tabPercent = 100 / TAB_DEFS.length;

  const getTabVisuals = (role) => {
    if (role === 'secondary') {
      const bg = theme.tokens['--accent-secondary'];
      return {
        bubbleBg: bg,
        bubbleIconColor: getContrastTextColor(bg),
        bubbleGlow: hexToRgba(bg, 0.42),
        labelColor: 'var(--accent-secondary-text)',
        dotColor: bg,
      };
    }
    if (role === 'vault') {
      const bg = theme.tokens['--accent-vault'];
      return {
        bubbleBg: bg,
        bubbleIconColor: getContrastTextColor(bg),
        bubbleGlow: hexToRgba(bg, 0.42),
        labelColor: 'var(--accent-vault-text)',
        dotColor: bg,
      };
    }
    return {
      bubbleBg: effectiveAccent,
      bubbleIconColor: getContrastTextColor(effectiveAccent),
      bubbleGlow: hexToRgba(effectiveAccent, 0.42),
      labelColor: 'var(--accent-text)',
      dotColor: effectiveAccent,
    };
  };

  const activeVisuals = getTabVisuals(activeTab.role);

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-4 pointer-events-none select-none">
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Main tactile floating bubble navigation container */}
        <div
          className="relative flex items-center justify-around h-16 rounded-[36px] px-2 surface-dock transition-all duration-500"
          style={{
            borderRadius: theme.id === 'fitzgerald-print' ? '14px' : '36px',
          }}
        >
          {/* Specular hairline reflection along top edge */}
          <div
            className="absolute top-0 left-8 right-8 h-[1px] pointer-events-none"
            style={{
              background: theme.isDark
                ? 'linear-gradient(to right, transparent, rgba(255,255,255,0.22), transparent)'
                : 'linear-gradient(to right, transparent, rgba(255,255,255,0.95), transparent)',
            }}
          />

          {/* Tactile Floating Active Bubble (preserves exact spring glide animation) */}
          <div
            className="absolute -top-5 transition-all duration-400 pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              className="relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300"
              style={{
                backgroundColor: activeVisuals.bubbleBg,
                color: activeVisuals.bubbleIconColor,
                border: `${theme.tokens['--border-width']} solid ${
                  theme.id === 'paw-pop' || theme.id === 'fitzgerald-print'
                    ? theme.tokens['--border-color']
                    : 'rgba(255,255,255,0.55)'
                }`,
                boxShadow:
                  theme.id === 'paw-pop'
                    ? '0 4px 0px #1B140E, 0 8px 18px rgba(27,20,14,0.2)'
                    : `0 10px 24px -4px ${activeVisuals.bubbleGlow}, inset 0 2px 4px rgba(255,255,255,0.45)`,
              }}
            >
              {/* Specular bubble shine */}
              <div className="absolute top-1 left-2.5 right-2.5 h-2.5 rounded-full bg-white/40 blur-[1px] pointer-events-none" />

              {React.createElement(activeTab.icon, {
                size: 20,
                strokeWidth: 2.6,
                className: 'relative z-10',
                style: { color: activeVisuals.bubbleIconColor },
              })}
            </div>
          </div>

          {/* Tab Buttons */}
          {TAB_DEFS.map((tab) => {
            const isActive = tab.id === currentTab;
            const Icon = tab.icon;
            const showBadge = tab.id === 'downloads' && activeDownloadCount > 0;
            const tabVisuals = getTabVisuals(tab.role);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className="relative z-10 flex-1 flex flex-col items-center justify-end h-full pb-2 transition-all outline-none spring-press"
                aria-label={tab.label}
              >
                {/* Inactive Icon */}
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none h-0 mb-0'
                      : 'mb-1'
                  }`}
                  style={!isActive ? { color: 'var(--dock-icon-inactive)' } : undefined}
                >
                  <Icon size={20} strokeWidth={2.1} />
                  {showBadge && !isActive && (
                    <span
                      className="absolute top-2 right-1/4 px-1.5 py-0.5 rounded-full font-mono font-black text-[9px] animate-pulse"
                      style={{
                        backgroundColor: 'var(--accent)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      {activeDownloadCount}
                    </span>
                  )}
                </div>

                {/* High-Contrast Active Label under the selecting tool */}
                <div
                  className={`flex flex-col items-center transition-all duration-300 ${
                    isActive
                      ? 'translate-y-0 opacity-100'
                      : 'opacity-0 translate-y-2 pointer-events-none h-0'
                  }`}
                >
                  <span
                    className="text-[11px] font-mono tracking-tight font-extrabold"
                    style={{ color: tabVisuals.labelColor }}
                  >
                    {tab.label}
                  </span>
                  <span
                    className="w-4 h-1 rounded-full mt-0.5"
                    style={{ backgroundColor: tabVisuals.dotColor }}
                  />
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BottomNav;
