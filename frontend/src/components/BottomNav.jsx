import React from 'react';
import { Home, Folder, Shield, ArrowLeft, ArrowRight } from 'lucide-react';

export function BottomNav({ currentTab, onChangeTab }) {
  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 flex justify-center p-3 pointer-events-none">
      <nav className="flex items-center justify-around w-full max-w-sm crystal-card rounded-full px-4 py-2.5 shadow-2xl pointer-events-auto border border-white/30">
        <button
          onClick={() => window.history.back()}
          className="p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
          title="Back"
        >
          <ArrowLeft size={18} />
        </button>

        <button
          onClick={() => onChangeTab('home')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'home' ? 'text-amber-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
          title="Home"
        >
          <Home size={20} />
        </button>

        <button
          onClick={() => onChangeTab('files')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'files' ? 'text-cyan-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
          title="Files"
        >
          <Folder size={20} />
        </button>

        <button
          onClick={() => onChangeTab('vault')}
          className={`flex flex-col items-center gap-0.5 p-2 rounded-full transition-all ${
            currentTab === 'vault' ? 'text-amber-500 font-bold scale-110' : 'text-slate-400 hover:text-slate-700'
          }`}
          title="Private Vault"
        >
          <Shield size={20} />
        </button>

        <button
          onClick={() => window.history.forward()}
          className="p-2 rounded-full text-slate-400 hover:text-slate-800 transition-colors"
          title="Forward"
        >
          <ArrowRight size={18} />
        </button>
      </nav>
    </div>
  );
}

export default BottomNav;
