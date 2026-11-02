import React from 'react';
import { Home, ArrowDownCircle, Folder, Shield } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Home', icon: Home },
  { id: 'downloads', label: 'Downloads', icon: ArrowDownCircle },
  { id: 'files', label: 'Library', icon: Folder },
  { id: 'vault', label: 'Vault', icon: Shield },
];

export function BottomNav({ currentTab, onChangeTab, activeDownloadCount = 0 }) {
  const activeIndex = TABS.findIndex((t) => t.id === currentTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;

  // Percentage offset for active tab position (4 tabs = 25% each, center at 12.5% + 25% * i)
  const tabPercent = 100 / TABS.length;
  const activeCenterPercent = safeIndex * tabPercent + tabPercent / 2;

  const isVault = currentTab === 'vault';

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-4 px-4 pointer-events-none select-none">
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Main curved navigation bar container */}
        <div
          className={`relative flex items-center justify-around h-16 rounded-[28px] px-2 shadow-2xl transition-all duration-500 backdrop-blur-2xl border ${
            isVault
              ? 'bg-slate-900/90 border-slate-700/60 shadow-black/60'
              : 'bg-white/90 border-white/60 shadow-slate-900/10'
          }`}
        >
          {/* Animated Curved Scoop / Notch Background cutout */}
          <div
            className="absolute top-0 -translate-y-[1px] h-3 transition-all duration-300 ease-out pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
            }}
          >
            <svg
              viewBox="0 0 100 24"
              className={`w-16 h-4 transition-colors duration-500 ${
                isVault ? 'fill-slate-900/90' : 'fill-white/90'
              }`}
            >
              <path d="M 0 0 C 20 0 30 20 50 20 C 70 20 80 0 100 0 Z" />
            </svg>
          </div>

          {/* Animated Elevated Floating Bubble */}
          <div
            className="absolute -top-5 transition-all duration-300 ease-out pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
            }}
          >
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-transform duration-300 active:scale-95 ${
                isVault
                  ? 'bg-gradient-to-tr from-amber-400 to-amber-300 text-slate-950 shadow-amber-400/30'
                  : 'bg-gradient-to-tr from-slate-950 to-slate-800 text-white shadow-slate-900/30'
              }`}
            >
              {React.createElement(TABS[safeIndex].icon, {
                size: 22,
                strokeWidth: 2.2,
                className: 'transition-transform duration-200',
              })}
            </div>
          </div>

          {/* Tab Buttons */}
          {TABS.map((tab, idx) => {
            const isActive = tab.id === currentTab;
            const Icon = tab.icon;
            const showBadge = tab.id === 'downloads' && activeDownloadCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className="relative z-10 flex-1 flex flex-col items-center justify-end h-full pb-2.5 transition-all outline-none"
                aria-label={tab.label}
              >
                {/* Inactive Icon */}
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none h-0 mb-0'
                      : isVault
                      ? 'text-slate-400 hover:text-white mb-1'
                      : 'text-slate-400 hover:text-slate-700 mb-1'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  {showBadge && !isActive && (
                    <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-white animate-pulse" />
                  )}
                </div>

                {/* Active or Inactive Label */}
                <span
                  className={`text-[11px] font-medium tracking-tight transition-all duration-300 ${
                    isActive
                      ? isVault
                        ? 'text-amber-400 font-semibold translate-y-0.5'
                        : 'text-slate-900 font-semibold translate-y-0.5'
                      : 'text-transparent opacity-0 text-[0px]'
                  }`}
                >
                  {tab.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}

export default BottomNav;
