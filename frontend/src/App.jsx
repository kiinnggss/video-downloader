import React, { useState, useEffect } from 'react';
import { InspectorView } from './components/InspectorView';
import { DownloadsView } from './components/DownloadsView';
import { FilesView } from './components/FilesView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { MiniDownloadBanner } from './components/MiniDownloadBanner';
import { InstallAppModal } from './components/InstallAppModal';
import { useTelemetry } from './api/telemetry';
import { apiClient } from './api/client';

export default function App() {
  const [tab, setTab] = useState('home');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const { activeTask } = useTelemetry();

  const isDownloading = Boolean(
    activeTask && (activeTask.status === 'downloading' || activeTask.status === 'paused' || activeTask.status === 'queued')
  );

  // Capture PWA install prompt event on Android/Chrome/Edge
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Keep-alive heartbeat: ping every 15 seconds and on tab focus/visibility/network events
  useEffect(() => {
    const sendHeartbeat = () => {
      apiClient.pingKeepAlive();
      if (typeof navigator !== 'undefined' && navigator.serviceWorker?.controller) {
        navigator.serviceWorker.controller.postMessage({ type: 'PING_KEEPALIVE' });
      }
    };

    sendHeartbeat();
    const interval = setInterval(sendHeartbeat, 15000);

    const handleVisibilityOrFocus = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        sendHeartbeat();
      }
    };

    window.addEventListener('focus', handleVisibilityOrFocus);
    window.addEventListener('online', sendHeartbeat);
    document.addEventListener('visibilitychange', handleVisibilityOrFocus);

    return () => {
      clearInterval(interval);
      window.removeEventListener('focus', handleVisibilityOrFocus);
      window.removeEventListener('online', sendHeartbeat);
      document.removeEventListener('visibilitychange', handleVisibilityOrFocus);
    };
  }, []);

  // Screen Wake Lock: keep mobile screen awake while downloading
  useEffect(() => {
    let wakeLock = null;
    const acquireLock = async () => {
      if (isDownloading && typeof navigator !== 'undefined' && 'wakeLock' in navigator) {
        try {
          wakeLock = await navigator.wakeLock.request('screen');
        } catch {
          // May be rejected if tab is backgrounded
        }
      }
    };
    acquireLock();

    return () => {
      if (wakeLock) {
        wakeLock.release().catch(() => {});
        wakeLock = null;
      }
    };
  }, [isDownloading]);

  return (
    <div className="min-h-screen cyber-mesh-bg text-slate-900 flex flex-col justify-between selection:bg-cyan-500/20 selection:text-cyan-900">
      <main className="w-full flex-1 flex flex-col pb-24">
        {tab === 'home' && (
          <InspectorView 
            onDownloadStarted={() => setTab('downloads')}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            hasInstallPrompt={Boolean(installPromptEvent)}
          />
        )}
        {tab === 'downloads' && (
          <DownloadsView
            activeTask={activeTask}
            onGoToHome={() => setTab('home')}
            onGoToFiles={() => setTab('files')}
          />
        )}
        {tab === 'files' && <FilesView activeTask={activeTask} />}
        {tab === 'vault' && <VaultView />}
      </main>

      {/* Floating mini download banner when on other screens */}
      {tab !== 'downloads' && isDownloading && (
        <MiniDownloadBanner
          task={activeTask}
          onOpenDownloads={() => setTab('downloads')}
        />
      )}

      {/* Fluid Morphing Glass Navigation Bar */}
      <BottomNav
        currentTab={tab}
        onChangeTab={setTab}
        activeDownloadCount={isDownloading ? 1 : 0}
      />

      {/* Download to Phone PWA Modal */}
      <InstallAppModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        installPromptEvent={installPromptEvent}
      />
    </div>
  );
}
