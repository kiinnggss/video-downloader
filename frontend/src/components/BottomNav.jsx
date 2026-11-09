import React from 'react';
import { Compass, ArrowDownCircle, Folder, Shield } from 'lucide-react';

const TABS = [
  {
    id: 'home',
    label: 'Inspect',
    icon: Compass,
    bubbleGradient: 'bg-gradient-to-tr from-cyan-500 via-sky-400 to-blue-500',
    bubbleBorder: 'border-cyan-200/90',
    bubbleShadow: 'shadow-[0_10px_25px_-4px_rgba(6,182,212,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]',
    iconColor: 'text-white',
    textColor: 'text-cyan-950 font-black',
    dotColor: 'bg-cyan-600',
    dockGlow: 'border-cyan-400/30 shadow-[0_20px_50px_-10px_rgba(6,182,212,0.22),0_8px_24px_-4px_rgba(15,23,42,0.08)]',
  },
  {
    id: 'downloads',
    label: 'Transfers',
    icon: ArrowDownCircle,
    bubbleGradient: 'bg-gradient-to-tr from-emerald-500 via-lime-400 to-green-400',
    bubbleBorder: 'border-lime-200/90',
    bubbleShadow: 'shadow-[0_10px_25px_-4px_rgba(132,204,22,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]',
    iconColor: 'text-slate-950',
    textColor: 'text-emerald-950 font-black',
    dotColor: 'bg-emerald-600',
    dockGlow: 'border-emerald-400/30 shadow-[0_20px_50px_-10px_rgba(16,185,129,0.22),0_8px_24px_-4px_rgba(15,23,42,0.08)]',
  },
  {
    id: 'files',
    label: 'Library',
    icon: Folder,
    bubbleGradient: 'bg-gradient-to-tr from-blue-600 via-indigo-500 to-violet-500',
    bubbleBorder: 'border-indigo-200/90',
    bubbleShadow: 'shadow-[0_10px_25px_-4px_rgba(99,102,241,0.5),inset_0_2px_4px_rgba(255,255,255,0.7)]',
    iconColor: 'text-white',
    textColor: 'text-indigo-950 font-black',
    dotColor: 'bg-indigo-600',
    dockGlow: 'border-indigo-400/30 shadow-[0_20px_50px_-10px_rgba(99,102,241,0.22),0_8px_24px_-4px_rgba(15,23,42,0.08)]',
  },
  {
    id: 'vault',
    label: 'Vault',
    icon: Shield,
    bubbleGradient: 'bg-gradient-to-tr from-amber-500 via-amber-400 to-yellow-400',
    bubbleBorder: 'border-amber-200/90',
    bubbleShadow: 'shadow-[0_10px_25px_-4px_rgba(245,158,11,0.55),inset_0_2px_4px_rgba(255,255,255,0.7)]',
    iconColor: 'text-amber-950',
    textColor: 'text-amber-950 font-black',
    dotColor: 'bg-amber-600',
    dockGlow: 'border-amber-400/40 shadow-[0_20px_50px_-10px_rgba(245,158,11,0.25),0_8px_24px_-4px_rgba(15,23,42,0.08)]',
  },
];

export function BottomNav({ currentTab, onChangeTab, activeDownloadCount = 0 }) {
  const activeIndex = TABS.findIndex((t) => t.id === currentTab);
  const safeIndex = activeIndex >= 0 ? activeIndex : 0;
  const currentConfig = TABS[safeIndex] || TABS[0];
  const tabPercent = 100 / TABS.length;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center pb-5 px-4 pointer-events-none select-none">
      <div className="relative w-full max-w-sm pointer-events-auto">
        {/* Main white bubble navigation container */}
        <div
          className={`relative flex items-center justify-around h-16 rounded-[36px] px-2 glass-dock transition-all duration-500 border ${currentConfig.dockGlow}`}
        >
          {/* Specular glass reflection along top edge of bubble */}
          <div className="absolute top-0 left-6 right-6 h-3 rounded-full bg-gradient-to-b from-white/90 to-transparent pointer-events-none" />

          {/* Tactile Floating Active Bubble */}
          <div
            className="absolute -top-5 transition-all duration-400 pointer-events-none flex justify-center"
            style={{
              left: `${safeIndex * tabPercent}%`,
              width: `${tabPercent}%`,
              transitionTimingFunction: 'cubic-bezier(0.34, 1.56, 0.64, 1)',
            }}
          >
            <div
              className={`relative w-12 h-12 rounded-full flex items-center justify-center transition-all duration-300 border ${currentConfig.bubbleBorder} ${currentConfig.bubbleGradient} ${currentConfig.bubbleShadow}`}
            >
              {/* Specular highlight */}
              <div className="absolute top-1 left-2.5 right-2.5 h-3 rounded-full bg-white/60 blur-[1px] pointer-events-none" />

              {React.createElement(currentConfig.icon, {
                size: 20,
                strokeWidth: 2.8,
                className: `${currentConfig.iconColor} relative z-10 drop-shadow-sm`,
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
                className="relative z-10 flex-1 flex flex-col items-center justify-end h-full pb-2 transition-all outline-none spring-press"
                aria-label={tab.label}
              >
                {/* Inactive Icon */}
                <div
                  className={`transition-all duration-300 flex items-center justify-center ${
                    isActive
                      ? 'opacity-0 scale-75 pointer-events-none h-0 mb-0'
                      : 'text-slate-400 hover:text-slate-700 mb-1'
                  }`}
                >
                  <Icon size={20} strokeWidth={2.1} />
                  {showBadge && !isActive && (
                    <span className="absolute top-2 right-1/4 px-1.5 py-0.5 rounded-full bg-emerald-500 text-white font-mono font-black text-[9px] shadow-[0_2px_8px_rgba(16,185,129,0.4)] animate-pulse">
                      {activeDownloadCount}
                    </span>
                  )}
                </div>

                {/* Active Label under the selecting tool */}
                <div
                  className={`flex flex-col items-center transition-all duration-300 ${
                    isActive
                      ? 'translate-y-0 opacity-100'
                      : 'opacity-0 translate-y-2 pointer-events-none h-0'
                  }`}
                >
                  <span
                    className={`text-[11px] font-mono tracking-tight font-extrabold ${tab.textColor}`}
                  >
                    {tab.label}
                  </span>
                  <span
                    className={`w-3.5 h-1 rounded-full mt-0.5 ${tab.dotColor}`}
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
