import React, { useState } from 'react';
import { InspectorView } from './components/InspectorView';
import { FilesView } from './components/FilesView';
import { VaultView } from './components/VaultView';
import { BottomNav } from './components/BottomNav';
import { useTelemetry } from './api/telemetry';

export default function App() {
  const [tab, setTab] = useState('home');
  const { activeTask } = useTelemetry();

  return (
    <div className={`min-h-screen transition-colors duration-500 ${
      tab === 'vault' ? 'bg-slate-950 text-white' : 'bg-gradient-to-b from-slate-100 via-slate-50 to-amber-50/20 text-slate-900'
    }`}>
      <main className="w-full min-h-screen flex flex-col">
        {tab === 'home' && <InspectorView onDownloadStarted={() => setTab('files')} />}
        {tab === 'files' && <FilesView activeTask={activeTask} />}
        {tab === 'vault' && <VaultView />}
      </main>

      <BottomNav currentTab={tab} onChangeTab={setTab} />
    </div>
  );
}
