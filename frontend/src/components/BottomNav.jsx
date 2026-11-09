import React from 'react';
import { Compass, ArrowDownCircle, Folder, Shield, Zap } from 'lucide-react';

const TABS = [
  { id: 'home', label: 'Inspect', icon: Compass },
  { id: 'downloads', label: 'Transfers', icon: ArrowDownCircle },
  { id: 'files', label: 'Library', icon: Folder },
  { id: 'vault', label: 'Vault', icon: Shield },
];

export function BottomNav({ currentTab, onChangeTab, activeDownloadCount = 0 }) {
  const activeIndex = TABS.findIndex((t) => t.id === currentTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const isVaultActive = currentTab === 'vault';
  const isTransfersActive = currentTab === 'downloads';

  // Percentage offset for active tab position (4 tabs = 25% each)
  const tabPercent = 100 / TABS.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-4 pointer-events-none select-none">
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Main curved cyber glass navigation container */}
        <div
          className={`relative flex items-center justify-around h-16 rounded-[32px] px-2 shadow-2xl glass-dock transition-all duration-500 border ${
            isVaultActive
              ? 'border-amber-vault/40 shadow-[0_15px_35px_-8px_rgba(255,184,0,0.25)]'
              : isTransfersActive
              ? 'border-lime-neon/40 shadow-[0_15px_35px_-8px_rgba(204,255,0,0.25)]'
              : 'border-white/10 shadow-[0_15px_35px_-8px_rgba(0,0,0,0.8)]'
          }`}
        >
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
              className="w-16 h-3.5 fill-[#04060d] opacity-90 transition-all duration-300"
            >
              <path d="M 0 0 C 20 0 30 20 50 20 C 70 20 80 0 100 0 Z" />
            </svg>
          </div>

          {/* Tactile Floating Active Bubble */}
          <div
            className="absolute -top-5.5 transition-all duration-400 pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border shadow-lg ${
                isVaultActive
                  ? 'bg-gradient-to-tr from-amber-600 via-amber-vault to-yellow-300 text-obsidian border-amber-200/80 shadow-[0_8px_20px_rgba(255,184,0,0.5)]'
                  : isTransfersActive
                  ? 'bg-gradient-to-tr from-lime-600 via-lime-neon to-emerald-300 text-obsidian border-lime-200/80 shadow-[0_8px_20px_rgba(204,255,0,0.5)]'
                  : 'bg-gradient-to-tr from-cyan-600 via-cyan-cyber to-blue-300 text-obsidian border-cyan-200/80 shadow-[0_8px_20px_rgba(0,240,255,0.4)]'
              }`}
            >
              {/* Specular highlight */}
              <div className="absolute top-1 left-2.5 right-2.5 h-3 rounded-full bg-white/50 blur-[1px] pointer-events-none" />

              {React.createElement(TABS[safeIndex].icon, {
                size: 20,
                strokeWidth: 2.8,
                className: 'text-obsidian relative z-10 drop-shadow-sm',
              })}
            </div>
          </div>

          {/* Tab Buttons */}
          {TABS.map((tab) => {
            const isActive = tab.id === currentTab;
            const Icon = tab.icon;
            const showBadge = tab.id === 'downloads' && activeDownloadCount > 0;

            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => onChangeTab(tab.id)}
                className="relative z-10 flex-1 flex flex-col items-center justify-end h-full pb-2.5 transition-all outline-none spring-press"
                aria-label={tab.label}
              >
                {/* Inactive Icon */}
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none h-0 mb-0'
                      : 'text-slate-400 hover:text-white mb-1'
                  }`}
                >
                  <Icon size={19} strokeWidth={1.9} />
                  {showBadge && !isActive && (
                    <span className="absolute top-2 right-1/4 px-1.5 py-0.5 rounded-full bg-lime-neon text-obsidian font-mono font-black text-[9px] shadow-[0_0_8px_#ccff00] animate-pulse">
                      {activeDownloadCount}
                    </span>
                  )}
                </div>

                {/* Active Label */}
                <span
                  className={`text-[11px] font-mono tracking-tight transition-all duration-300 font-bold ${
                    isActive
                      ? isVaultActive
                        ? 'text-amber-vault translate-y-0.5 opacity-100 drop-shadow-[0_0_8px_rgba(255,184,0,0.5)]'
                        : isTransfersActive
                        ? 'text-lime-neon translate-y-0.5 opacity-100 drop-shadow-[0_0_8px_rgba(204,255,0,0.5)]'
                        : 'text-cyan-cyber translate-y-0.5 opacity-100 drop-shadow-[0_0_8px_rgba(0,240,255,0.5)]'
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
