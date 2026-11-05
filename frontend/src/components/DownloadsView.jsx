import React from 'react';
import { ArrowDownCircle, CheckCircle, Sparkles, Folder } from 'lucide-react';
import { ActiveDownloadCard } from './ActiveDownloadCard';

export function DownloadsView({ activeTask, onGoToHome, onGoToFiles }) {
  const isTaskActive = activeTask && (activeTask.status === 'downloading' || activeTask.status === 'paused' || activeTask.status === 'queued');
  const isTaskFinished = activeTask && activeTask.status === 'finished' && activeTask.file_id;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-5 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-extrabold text-white tracking-tight">Downloads</h2>
          <p className="text-xs text-slate-400">Live SSE telemetry & background queue</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 border border-cyan-400/30 text-cyan-300 flex items-center justify-center shadow-inner">
          <ArrowDownCircle size={20} />
        </div>
      </div>

      {isTaskActive && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-300 px-1">
            <span>In Progress</span>
            <span className="font-mono text-cyan-400 animate-pulse">Live Multi-Thread</span>
          </div>
          <ActiveDownloadCard task={activeTask} />
        </div>
      )}

      {isTaskFinished && (
        <div className="glass-cyber-active rounded-3xl p-5 border border-emerald-400/40 flex flex-col gap-3.5 animate-fade-in shadow-2xl">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 border border-emerald-400/30 flex items-center justify-center shadow-inner">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-white">Download Complete</h4>
                <p className="text-xs text-slate-400 truncate max-w-[210px]">{activeTask.title}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-400/30 text-[11px] font-mono font-medium">Ready</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={`/api/files/${activeTask.file_id}/download`}
              download={activeTask.filename}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 text-slate-950 text-xs font-bold shadow-md shadow-cyan-500/20 transition-all active:scale-95"
            >
              <ArrowDownCircle size={15} strokeWidth={2.5} />
              <span>Save to Device Now</span>
            </a>
            <button
              type="button"
              onClick={onGoToFiles}
              className="px-4 py-3 rounded-2xl glass-cyber text-slate-300 hover:text-white text-xs font-semibold border border-white/10 hover:border-cyan-400/40 transition-all"
            >
              Library
            </button>
          </div>
        </div>
      )}

      {!isTaskActive && !isTaskFinished && (
        <div className="flex flex-col items-center justify-center p-10 text-center glass-cyber rounded-3xl gap-3 border border-cyan-500/20 shadow-2xl">
          <div className="w-14 h-14 rounded-2xl bg-white/5 border border-white/10 text-slate-500 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <h3 className="font-bold text-white text-sm">No Active Downloads</h3>
          <p className="text-xs text-slate-400 max-w-xs leading-relaxed">
            Paste any link in the Home tab to start a stream extraction. Completed videos automatically save to your device.
          </p>
          <button
            type="button"
            onClick={onGoToHome}
            className="mt-2 px-5 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 font-bold text-xs transition-all flex items-center gap-1.5 shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <Sparkles size={14} />
            <span>Inspect a Video</span>
          </button>
        </div>
      )}

      {/* Quick link to completed media */}
      <div className="p-4 rounded-3xl glass-cyber border border-white/10 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-white">Completed Media</span>
          <span className="text-[11px] text-slate-400">Browse and stream your saved files</span>
        </div>
        <button
          type="button"
          onClick={onGoToFiles}
          className="px-3.5 py-2 rounded-2xl glass-cyber text-cyan-300 hover:text-white hover:border-cyan-400/40 text-xs font-semibold transition-all border border-cyan-500/30 flex items-center gap-1.5"
        >
          <Folder size={13} />
          <span>View Library</span>
        </button>
      </div>
    </div>
  );
}

export default DownloadsView;
