import React from 'react';
import { ArrowDownCircle, CheckCircle, Sparkles, Folder, ArrowRight } from 'lucide-react';
import { ActiveDownloadCard } from './ActiveDownloadCard';

export function DownloadsView({ activeTask, onGoToHome, onGoToFiles }) {
  const isTaskActive =
    activeTask &&
    (activeTask.status === 'downloading' ||
      activeTask.status === 'paused' ||
      activeTask.status === 'queued');
  const isTaskFinished = activeTask && activeTask.status === 'finished' && activeTask.file_id;

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-extrabold text-slate-950 tracking-tight">Transfers</h2>
          <p className="text-xs text-slate-500 font-medium">
            Active stream transfers & completed downloads
          </p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shadow-sm">
          <ArrowDownCircle size={20} />
        </div>
      </div>

      {isTaskActive && (
        <div className="flex flex-col gap-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-700 px-1">
            <span>In Progress</span>
            <span className="font-mono text-emerald-700 font-bold flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
              <span>Multi-Thread Active</span>
            </span>
          </div>
          <ActiveDownloadCard task={activeTask} />
        </div>
      )}

      {isTaskFinished && (
        <div className="bento-card rounded-3xl p-5 border border-emerald-300 flex flex-col gap-4 animate-fade-in shadow-md">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <div className="w-10 h-10 rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-200 flex items-center justify-center flex-shrink-0">
                <CheckCircle size={20} />
              </div>
              <div className="min-w-0">
                <h4 className="font-extrabold text-sm text-slate-950">Download Complete</h4>
                <p className="text-xs text-slate-500 truncate">{activeTask.title}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-[11px] font-mono font-bold flex-shrink-0">
              Ready
            </span>
          </div>

          <div className="flex items-center gap-2 pt-0.5">
            <a
              href={`/api/files/${activeTask.file_id}/download`}
              download={activeTask.filename}
              className="flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white text-xs font-bold uppercase tracking-wide shadow-md transition-all spring-press"
            >
              <ArrowDownCircle size={15} className="text-lime-neon" strokeWidth={2.6} />
              <span>Save to Device Now</span>
            </a>
            <button
              type="button"
              onClick={onGoToFiles}
              className="px-4 py-3 rounded-2xl bg-slate-100 hover:bg-slate-200 text-slate-800 text-xs font-bold border border-slate-200 transition-all spring-press"
            >
              Library
            </button>
          </div>
        </div>
      )}

      {!isTaskActive && !isTaskFinished && (
        <div className="flex flex-col items-center justify-center p-9 text-center bento-card rounded-3xl gap-3.5">
          <div className="w-14 h-14 rounded-2xl bg-slate-100 border border-slate-200/90 text-slate-500 flex items-center justify-center">
            <CheckCircle size={26} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-extrabold text-slate-950 text-base tracking-tight">
              No active transfers
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Paste any link in the Inspect tab to start a stream extraction. Completed files save directly to your device or private vault.
            </p>
          </div>
          <button
            type="button"
            onClick={onGoToHome}
            className="mt-1 px-5 py-3 rounded-2xl bg-slate-950 hover:bg-slate-800 text-white font-bold tracking-wide text-xs transition-all flex items-center gap-2 shadow-md spring-press"
          >
            <Sparkles size={14} className="text-lime-neon" />
            <span>Inspect a Video</span>
            <ArrowRight size={13} className="text-slate-400" />
          </button>
        </div>
      )}

      {/* Quick link to completed media */}
      <div className="p-4 rounded-3xl bento-card flex items-center justify-between">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-extrabold text-slate-950">Completed Media</span>
          <span className="text-[11px] text-slate-500">Browse and stream your saved files</span>
        </div>
        <button
          type="button"
          onClick={onGoToFiles}
          className="px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200/80 text-slate-800 text-xs font-bold transition-all border border-slate-200/90 flex items-center gap-1.5 spring-press"
        >
          <Folder size={13} className="text-indigo-600" />
          <span>View Library</span>
        </button>
      </div>
    </div>
  );
}

export default DownloadsView;
