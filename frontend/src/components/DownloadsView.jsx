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
          <h2 className="text-xl font-extrabold text-slate-950 tracking-tight">Downloads</h2>
          <p className="text-xs text-slate-500">Live SSE telemetry & background queue</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-cyan-50 border border-cyan-200 text-cyan-700 flex items-center justify-center shadow-sm">
          <ArrowDownCircle size={20} />
        </div>
      </div>

      {isTaskActive && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
            <span>In Progress</span>
            <span className="font-mono text-cyan-700 font-bold animate-pulse">Live Multi-Thread</span>
          </div>
          <ActiveDownloadCard task={activeTask} />
        </div>
      )}

      {isTaskFinished && (
        <div className="bento-card rounded-3xl p-5 border border-emerald-300 flex flex-col gap-3.5 animate-fade-in shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center shadow-inner">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-bold text-sm text-slate-950">Download Complete</h4>
                <p className="text-xs text-slate-500 truncate max-w-[210px]">{activeTask.title}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-medium">Ready</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={`/api/files/${activeTask.file_id}/download`}
              download={activeTask.filename}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-lime-neon hover:bg-lime-400 text-obsidian text-xs font-black uppercase tracking-wider shadow-sm transition-all spring-press"
            >
              <ArrowDownCircle size={15} strokeWidth={2.8} />
              <span>Save to Device Now</span>
            </a>
            <button
              type="button"
              onClick={onGoToFiles}
              className="px-4 py-3 rounded-2xl bento-card text-slate-700 hover:text-slate-950 text-xs font-semibold border border-slate-200 transition-all spring-press"
            >
              Library
            </button>
          </div>
        </div>
      )}

      {!isTaskActive && !isTaskFinished && (
        <div className="flex flex-col items-center justify-center p-10 text-center bento-card rounded-3xl gap-3 border border-slate-200 shadow-sm">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200 text-slate-400 flex items-center justify-center">
            <CheckCircle size={28} />
          </div>
          <h3 className="font-bold text-slate-950 text-sm">No Active Downloads</h3>
          <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
            Paste any link in the Home tab to start a stream extraction. Completed videos automatically save to your device.
          </p>
          <button
            type="button"
            onClick={onGoToHome}
            className="mt-2 px-5 py-2.5 rounded-xl bg-lime-neon hover:bg-lime-400 text-obsidian font-black uppercase tracking-wider text-xs transition-all flex items-center gap-1.5 shadow-sm spring-press"
          >
            <Sparkles size={14} />
            <span>Inspect a Video</span>
          </button>
        </div>
      )}

      {/* Quick link to completed media */}
      <div className="p-4 rounded-3xl bento-card border border-slate-200 flex items-center justify-between shadow-sm">
        <div className="flex flex-col">
          <span className="text-xs font-bold text-slate-950">Completed Media</span>
          <span className="text-[11px] text-slate-500">Browse and stream your saved files</span>
        </div>
        <button
          type="button"
          onClick={onGoToFiles}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-semibold transition-all border border-slate-200 flex items-center gap-1.5 spring-press"
        >
          <Folder size={13} />
          <span>View Library</span>
        </button>
      </div>
    </div>
  );
}

export default DownloadsView;
