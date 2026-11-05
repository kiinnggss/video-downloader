import React, { useState, useEffect } from 'react';
import { X, Smartphone, Download, Share2, PlusSquare, CheckCircle2, Sparkles } from 'lucide-react';

export function InstallAppModal({ isOpen, onClose, installPromptEvent }) {
  const [isIOS, setIsIOS] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [installedSuccessfully, setInstalledSuccessfully] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const userAgent = window.navigator.userAgent.toLowerCase();
      setIsIOS(/iphone|ipad|ipod/.test(userAgent));
      const standalone = window.matchMedia('(display-mode: standalone)').matches || window.navigator.standalone;
      setIsStandalone(Boolean(standalone));
    }
  }, []);

  const handleNativeInstall = async () => {
    if (installPromptEvent) {
      installPromptEvent.prompt();
      const choiceResult = await installPromptEvent.userChoice;
      if (choiceResult.outcome === 'accepted') {
        setInstalledSuccessfully(true);
        setTimeout(() => {
          onClose();
        }, 2000);
      }
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-sm rounded-[32px] p-6 glass-cyber border border-cyan-500/30 text-white flex flex-col gap-5 shadow-2xl shadow-cyan-950/50 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-cyan-500/20 to-blue-600/30 border border-cyan-400/40 flex items-center justify-center text-cyan-300 shadow-inner">
              <Smartphone size={20} />
            </div>
            <div>
              <h2 id="install-modal-title" className="text-base font-bold tracking-tight text-white flex items-center gap-1.5">
                Download to Phone
                <Sparkles size={14} className="text-cyan-400" />
              </h2>
              <p className="text-[11px] text-slate-400">Install as a native full-screen app</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Already installed banner */}
        {isStandalone || installedSuccessfully ? (
          <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-cyan-400 flex-shrink-0" />
            <span>Crystal is already installed on your device as a standalone app.</span>
          </div>
        ) : (
          <>
            {/* Value prop pills */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-cyan-400" />
                <span>No App Store needed</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-white/[0.04] border border-white/10 flex items-center gap-2 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-blue-400" />
                <span>Full-screen experience</span>
              </div>
            </div>

            {/* Android / Native Prompt */}
            {installPromptEvent ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-300 leading-relaxed">
                  Tap below to add the Crystal app directly to your home screen. It will open without browser bars.
                </p>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 text-slate-950 font-bold text-xs shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2 active:scale-95"
                >
                  <Download size={16} strokeWidth={2.5} />
                  <span>Install Crystal App</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari instructions */
              <div className="flex flex-col gap-3.5 bg-black/40 rounded-2xl p-4 border border-white/10 text-xs text-slate-300">
                <p className="font-semibold text-cyan-300 text-[11px] uppercase tracking-wider">
                  How to install on iPhone & iPad:
                </p>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white/10 text-cyan-400 flex-shrink-0 mt-0.5">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-white">1. Tap the Share button</span>
                    <p className="text-[11px] text-slate-400">At the bottom of Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white/10 text-cyan-400 flex-shrink-0 mt-0.5">
                    <PlusSquare size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-white">2. Tap "Add to Home Screen"</span>
                    <p className="text-[11px] text-slate-400">Scroll down in the share sheet menu.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-white/10 text-cyan-400 flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-white">3. Tap "Add"</span>
                    <p className="text-[11px] text-slate-400">Crystal will appear on your home screen.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Chrome / Android fallback without prompt event */
              <div className="flex flex-col gap-2.5 bg-black/40 rounded-2xl p-4 border border-white/10 text-xs text-slate-300">
                <p className="font-semibold text-cyan-300 text-[11px] uppercase tracking-wider">
                  Quick Install:
                </p>
                <p className="text-slate-300 leading-relaxed text-[11px]">
                  Tap your browser menu (the three dots in the top or bottom corner) and select <strong className="text-white">"Install app"</strong> or <strong className="text-white">"Add to Home screen"</strong>.
                </p>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}

export default InstallAppModal;
