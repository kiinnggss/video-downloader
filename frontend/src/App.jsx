import React, { useState } from 'react';
import { InspectorView } from './components/InspectorView';
import { DownloadsView } from './components/DownloadsView';
import { FilesView } from './components/FilesView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { MiniDownloadBanner } from './components/MiniDownloadBanner';
import { useTelemetry } from './api/telemetry';

export default function App() {
  const [tab, setTab] = useState('home');
  const { activeTask } = useTelemetry();

  const isDownloading = activeTask && (activeTask.status === 'downloading' || activeTask.status === 'paused' || activeTask.status === 'queued');

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      tab === 'vault' ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-900'
    }`}>
      <main className="w-full min-h-screen flex flex-col">
        {tab === 'home' && <InspectorView onDownloadStarted={() => setTab('downloads')} />}
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

      <BottomNav
        currentTab={tab}
        onChangeTab={setTab}
        activeDownloadCount={isDownloading ? 1 : 0}
      />
    </div>
  );
}

