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

  // Percentage offset for active tab position (4 tabs = 25% each)
  const tabPercent = 100 / TABS.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-4 pointer-events-none select-none">
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Main curved cyber glass navigation container */}
        <div className="relative flex items-center justify-around h-16 rounded-[30px] px-2 shadow-2xl glass-dock transition-all duration-500">
          
          {/* Subtle curved light notch cutout */}
          <div
            className="absolute top-0 -translate-y-[1px] h-3.5 transition-all duration-400 pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <svg
              viewBox="0 0 100 24"
              className="w-16 h-3.5 fill-[#080e22] opacity-90 transition-all duration-300"
            >
              <path d="M 0 0 C 20 0 30 20 50 20 C 70 20 80 0 100 0 Z" />
            </svg>
          </div>

          {/* 3D Isometric Floating Active Bubble */}
          <div
            className="absolute -top-5.5 transition-all duration-400 pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div className="relative w-12 h-12 rounded-full flex items-center justify-center glass-3d-bubble transition-transform duration-300">
              {/* Specular light highlight reflection */}
              <div className="absolute top-1 left-2.5 right-2.5 h-3 rounded-full bg-white/40 blur-[1px] pointer-events-none" />
              
              {React.createElement(TABS[safeIndex].icon, {
                size: 22,
                strokeWidth: 2.4,
                className: 'text-white relative z-10 drop-shadow-md',
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
                className="relative z-10 flex-1 flex flex-col items-center justify-end h-full pb-2.5 transition-all outline-none active:scale-95"
                aria-label={tab.label}
              >
                {/* Inactive Icon */}
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none h-0 mb-0'
                      : 'text-slate-400 hover:text-cyan-300 mb-1'
                  }`}
                >
                  <Icon size={20} strokeWidth={1.8} />
                  {showBadge && !isActive && (
                    <span className="absolute top-2 right-1/4 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-[#050814] animate-pulse" />
                  )}
                </div>

                {/* Active Label */}
                <span
                  className={`text-[11px] tracking-tight transition-all duration-300 font-semibold ${
                    isActive
                      ? 'text-cyan-400 translate-y-0.5 opacity-100 drop-shadow-[0_0_8px_rgba(56,189,248,0.5)]'
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
