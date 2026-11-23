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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="relative w-full max-w-sm rounded-[28px] p-6 surface-card flex flex-col gap-5 max-h-[90vh] overflow-y-auto no-scrollbar"
        role="dialog"
        aria-modal="true"
        aria-labelledby="install-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-soft)',
                color: 'var(--accent-text)',
              }}
            >
              <Smartphone size={20} />
            </div>
            <div>
              <h2 id="install-modal-title" className="font-display text-base font-extrabold flex items-center gap-1.5" style={{ color: 'var(--text-primary)' }}>
                <span>Download to Phone</span>
                <Sparkles size={14} style={{ color: 'var(--accent-text)' }} />
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Install as a native full-screen app
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors"
            style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {isStandalone || installedSuccessfully ? (
          <div
            className="p-4 rounded-2xl text-xs flex items-center gap-2.5 font-semibold"
            style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}
          >
            <CheckCircle2 size={18} className="flex-shrink-0" />
            <span>Crystal is installed on your device as a standalone app.</span>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div
                className="p-2.5 rounded-2xl flex items-center gap-2 font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent)' }} />
                <span>Direct Share Target</span>
              </div>
              <div
                className="p-2.5 rounded-2xl flex items-center gap-2 font-medium"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: 'var(--accent-secondary)' }} />
                <span>Full-screen view</span>
              </div>
            </div>

            {installPromptEvent ? (
              <div className="flex flex-col gap-3">
                <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
                  Tap below to add Crystal directly to your home screen. You can also share video links straight into Crystal from your phone Share sheet.
                </p>
                <button
                  type="button"
                  onClick={handleNativeInstall}
                  className="w-full py-3.5 px-4 font-extrabold uppercase tracking-wider text-xs flex items-center justify-center gap-2 spring-press theme-btn-primary"
                >
                  <Download size={16} strokeWidth={2.6} />
                  <span>Install Crystal App</span>
                </button>
              </div>
            ) : isIOS ? (
              <div
                className="flex flex-col gap-3 rounded-2xl p-4 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <p className="font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                  How to install on iPhone & iPad:
                </p>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-text)' }}>
                    <Share2 size={15} />
                  </div>
                  <div>
                    <span className="font-bold">1. Tap the Share button</span>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>At the bottom of Safari.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-text)' }}>
                    <PlusSquare size={15} />
                  </div>
                  <div>
                    <span className="font-bold">2. Tap Add to Home Screen</span>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Scroll down in the share sheet menu.</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <div className="p-1.5 rounded-lg" style={{ backgroundColor: 'var(--bg-surface)', color: 'var(--accent-text)' }}>
                    <CheckCircle2 size={15} />
                  </div>
                  <div>
                    <span className="font-bold">3. Tap Add</span>
                    <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>Crystal will appear on your home screen.</p>
                  </div>
                </div>
              </div>
            ) : (
              <div
                className="flex flex-col gap-2 rounded-2xl p-4 text-xs"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <p className="font-bold text-[11px] uppercase tracking-wider" style={{ color: 'var(--accent-text)' }}>
                  Quick Install:
                </p>
                <p className="leading-relaxed text-[11px]">
                  Open your browser menu and select <strong style={{ color: 'var(--text-primary)' }}>Install app</strong> or <strong style={{ color: 'var(--text-primary)' }}>Add to Home screen</strong>.
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
