import React, { useState, useEffect } from 'react';
import { ThemeProvider } from './theme/ThemeContext';
import { InspectorView } from './components/InspectorView';
import { DownloadsView } from './components/DownloadsView';
import { FilesView } from './components/FilesView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { MiniDownloadBanner } from './components/MiniDownloadBanner';
import { InstallAppModal } from './components/InstallAppModal';
import { ThemeSwitcherModal } from './components/ThemeSwitcherModal';
import { useTelemetry } from './api/telemetry';
import { apiClient } from './api/client';

function extractSharedUrlFromLocation() {
  if (typeof window === 'undefined' || !window.location.search) return '';
  try {
    const params = new URLSearchParams(window.location.search);
    const directUrl = params.get('url');
    const sharedText = params.get('text') || '';
    const candidate = directUrl || sharedText;
    const match = candidate.match(/https?:\/\/[^\s"'<>]+/i);
    return match ? match[0] : '';
  } catch {
    return '';
  }
}

function CrystalShell() {
  const [tab, setTab] = useState('home');
  const [installPromptEvent, setInstallPromptEvent] = useState(null);
  const [isInstallModalOpen, setIsInstallModalOpen] = useState(false);
  const [isThemeModalOpen, setIsThemeModalOpen] = useState(false);
  const [sharedUrl, setSharedUrl] = useState(() => extractSharedUrlFromLocation());
  const { activeTask } = useTelemetry();

  const isDownloading = Boolean(
    activeTask &&
      (activeTask.status === 'downloading' ||
        activeTask.status === 'paused' ||
        activeTask.status === 'queued')
  );

  // Clean URL query params after consuming shared target link
  useEffect(() => {
    if (sharedUrl && typeof window !== 'undefined' && window.history?.replaceState) {
      window.history.replaceState({}, document.title, window.location.pathname);
    }
  }, [sharedUrl]);

  // Capture PWA install prompt event on Android/Chrome/Edge
  useEffect(() => {
    const handleBeforeInstallPrompt = (e) => {
      e.preventDefault();
      setInstallPromptEvent(e);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    return () => window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
  }, []);

  // Keep-alive heartbeat: ping every 25 seconds while tab is open
  useEffect(() => {
    apiClient.pingKeepAlive();
    const interval = setInterval(() => {
      apiClient.pingKeepAlive();
    }, 25000);
    return () => clearInterval(interval);
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
    <div className="min-h-screen theme-canvas flex flex-col justify-between">
      <main className="w-full flex-1 flex flex-col pb-24">
        {tab === 'home' && (
          <InspectorView
            sharedUrl={sharedUrl}
            onConsumeSharedUrl={() => setSharedUrl('')}
            onDownloadStarted={() => setTab('downloads')}
            onNavigate={setTab}
            onOpenInstallModal={() => setIsInstallModalOpen(true)}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
            hasInstallPrompt={Boolean(installPromptEvent)}
          />
        )}
        {tab === 'downloads' && (
          <DownloadsView
            activeTask={activeTask}
            onGoToHome={() => setTab('home')}
            onGoToFiles={() => setTab('files')}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
          />
        )}
        {tab === 'files' && (
          <FilesView
            activeTask={activeTask}
            onOpenThemeModal={() => setIsThemeModalOpen(true)}
          />
        )}
        {tab === 'vault' && (
          <VaultView onOpenThemeModal={() => setIsThemeModalOpen(true)} />
        )}
      </main>

      {/* Floating mini download banner when on other screens */}
      {tab !== 'downloads' && isDownloading && (
        <MiniDownloadBanner
          task={activeTask}
          onOpenDownloads={() => setTab('downloads')}
        />
      )}

      {/* Tactile Floating Bubble Navigation Bar */}
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

      {/* Appearance Theme Switcher Modal */}
      <ThemeSwitcherModal
        isOpen={isThemeModalOpen}
        onClose={() => setIsThemeModalOpen(false)}
      />
    </div>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <CrystalShell />
    </ThemeProvider>
  );
}
