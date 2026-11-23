import React from 'react';
import { Compass, ArrowDownCircle, Folder, Shield } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { hexToRgba, getContrastTextColor } from '../theme/themes';

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

  const isEditorialSharp = theme.id === 'fitzgerald-print';
  const hasInkFrame = theme.id === 'paw-pop' || theme.id === 'fitzgerald-print';

  const getTabVisuals = (role) => {
    if (role === 'secondary') {
      const accentHex = theme.tokens['--accent-secondary'];
      return {
        accentHex,
        softBg: 'var(--accent-secondary-soft)',
        textColor: 'var(--accent-secondary-text)',
      };
    }
    if (role === 'vault') {
      const accentHex = theme.tokens['--accent-vault'];
      return {
        accentHex,
        softBg: 'var(--accent-vault-soft)',
        textColor: 'var(--accent-vault-text)',
      };
    }
    return {
      accentHex: effectiveAccent,
      softBg: hexToRgba(effectiveAccent, 0.13),
      textColor: 'var(--accent-text)',
    };
  };

  const activeVisuals = getTabVisuals(activeTab.role);

  return (
    <nav
      aria-label="Primary navigation"
      className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-4 pointer-events-none select-none"
    >
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Self-contained Floating Pill Navigation Dock */}
        <div
          className="relative grid grid-cols-4 items-center h-[68px] p-1.5 surface-dock transition-all duration-300"
          style={{
            borderRadius: isEditorialSharp ? '14px' : '9999px',
          }}
        >
          {/* Pixel-exact Sliding Active Capsule (inset-1.5 matches p-1.5 content box) */}
          <div className="absolute inset-1.5 pointer-events-none">
            <div
              className="h-full px-0.5"
              style={{
                width: '25%',
                transform: `translateX(${safeIndex * 100}%)`,
                transitionProperty: 'transform',
                transitionDuration: '380ms',
                transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
              }}
            >
              <div
                className="w-full h-full flex justify-center transition-colors duration-300"
                style={{
                  backgroundColor: 'var(--dock-pill-bg)',
                  borderRadius: isEditorialSharp ? '10px' : '9999px',
                  border: hasInkFrame
                    ? `${theme.tokens['--border-width']} solid var(--border-color)`
                    : '1px solid rgba(255, 255, 255, 0.65)',
                  boxShadow:
                    theme.id === 'paw-pop'
                      ? '0 2px 0px #1B140E'
                      : theme.id === 'fitzgerald-print'
                      ? '0 1px 0px #1C1B18'
                      : '0 6px 16px -4px rgba(35, 24, 24, 0.12)',
                }}
              >
                {/* Navio-style centered top accent indicator bar */}
                <span
                  className="w-5 h-[3px] rounded-full mt-1 transition-colors duration-300"
                  style={{ backgroundColor: activeVisuals.accentHex }}
                />
              </div>
            </div>
          </div>

          {/* Interactive Tab Buttons */}
          {TAB_DEFS.map((tab) => {
            const isActive = tab.id === currentTab;
            const Icon = tab.icon;
            const showBadge = tab.id === 'downloads' && activeDownloadCount > 0;
            const visuals = getTabVisuals(tab.role);

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className="relative z-10 flex flex-col items-center justify-center h-full gap-0.5 pt-1 outline-none spring-press"
                aria-label={tab.label}
                aria-current={isActive ? 'page' : undefined}
              >
                {/* Animated Micro-Well around Active Icon (Shot 22126248) */}
                <div
                  className="relative w-8 h-7 rounded-full flex items-center justify-center transition-all duration-300"
                  style={{
                    backgroundColor: isActive ? visuals.softBg : 'transparent',
                    color: isActive ? visuals.textColor : 'var(--dock-icon-inactive)',
                    transform: isActive ? 'scale(1.06)' : 'scale(1)',
                  }}
                >
                  <Icon size={18} strokeWidth={isActive ? 2.4 : 1.9} />

                  {showBadge && (
                    <span
                      className="absolute -top-0.5 -right-1.5 min-w-[16px] h-4 px-1 rounded-full font-mono font-black text-[9px] flex items-center justify-center shadow-sm"
                      style={{
                        backgroundColor: visuals.accentHex,
                        color: getContrastTextColor(visuals.accentHex),
                      }}
                    >
                      {activeDownloadCount}
                    </span>
                  )}
                </div>

                {/* Always-Visible Crisp Tab Label */}
                <span
                  className="text-[10.5px] leading-none tracking-tight transition-colors duration-200"
                  style={{
                    color: isActive ? visuals.textColor : 'var(--dock-icon-inactive)',
                    fontWeight: isActive ? 800 : 600,
                  }}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </nav>
  );
}

export default BottomNav;
