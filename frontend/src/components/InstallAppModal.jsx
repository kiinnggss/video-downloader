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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div
        className="relative w-full max-w-sm rounded-[32px] p-6 bento-card border border-slate-200 text-slate-950 flex flex-col gap-5 shadow-2xl max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
      >
        {/* Top Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 flex items-center justify-center text-cyan-700 shadow-sm">
              <Smartphone size={20} />
            </div>
            <div>
              <h2 id="install-modal-title" className="text-base font-bold tracking-tight text-slate-950 flex items-center gap-1.5">
                Download to Phone
                <Sparkles size={14} className="text-cyan-600" />
              </h2>
              <p className="text-[11px] text-slate-500">Install as a native full-screen app</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Already installed banner */}
        {isStandalone || installedSuccessfully ? (
          <div className="p-4 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-800 text-xs flex items-center gap-2.5">
            <CheckCircle2 size={18} className="text-cyan-600 flex-shrink-0" />
            <span>Crystal is already installed on your device as a standalone app.</span>
          </div>
        ) : (
          <>
            {/* Value prop pills */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-cyan-500" />
                <span>No App Store needed</span>
              </div>
              <div className="p-2.5 rounded-2xl bg-slate-100 border border-slate-200 flex items-center gap-2 text-slate-700">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                <span>Full-screen view</span>
              </div>
            </div>

            {/* Android / Native Prompt */}
            {installPromptEvent ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs text-slate-600 leading-relaxed">
                  Tap below to add the Crystal app directly to your home screen. It will open without browser bars.
                </p>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3.5 px-4 rounded-2xl bg-lime-neon hover:bg-lime-400 text-obsidian font-black uppercase tracking-wider text-xs shadow-sm transition-all flex items-center justify-center gap-2 spring-press"
                >
                  <Download size={16} strokeWidth={2.8} />
                  <span>Install Crystal App</span>
                </button>
              </div>
            ) : isIOS ? (
              /* iOS Safari instructions */
              <div className="flex flex-col gap-3.5 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-cyan-800 text-[11px] uppercase tracking-wider">
                  How to install on iPhone & iPad:
                </p>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-cyan-700 flex-shrink-0 mt-0.5">
                    <Share2 size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">1. Tap the Share button</span>
                    <p className="text-[11px] text-slate-500">At the bottom of Safari.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-cyan-700 flex-shrink-0 mt-0.5">
                    <PlusSquare size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">2. Tap "Add to Home Screen"</span>
                    <p className="text-[11px] text-slate-500">Scroll down in the share sheet menu.</p>
                  </div>
                </div>

                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg bg-slate-200 text-cyan-700 flex-shrink-0 mt-0.5">
                    <CheckCircle2 size={16} />
                  </div>
                  <div>
                    <span className="font-semibold text-slate-900">3. Tap "Add"</span>
                    <p className="text-[11px] text-slate-500">Crystal will appear on your home screen.</p>
                  </div>
                </div>
              </div>
            ) : (
              /* Chrome / Android fallback without prompt event */
              <div className="flex flex-col gap-2.5 bg-slate-50 rounded-2xl p-4 border border-slate-200 text-xs text-slate-700">
                <p className="font-semibold text-cyan-800 text-[11px] uppercase tracking-wider">
                  Quick Install:
                </p>
                <p className="text-slate-600 leading-relaxed text-[11px]">
                  Tap your browser menu and select <strong className="text-slate-900">"Install app"</strong> or <strong className="text-slate-900">"Add to Home screen"</strong>.
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
