import React from 'react';
import { ArrowDownCircle, CheckCircle, Sparkles } from 'lucide-react';
import { ActiveDownloadCard } from './ActiveDownloadCard';

export function DownloadsView({ activeTask, onGoToHome, onGoToFiles }) {
  const isTaskActive = activeTask && (activeTask.status === 'downloading' || activeTask.status === 'paused' || activeTask.status === 'queued');
  const isTaskFinished = activeTask && activeTask.status === 'finished' && activeTask.file_id;

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-4 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight">Downloads</h2>
          <p className="text-xs text-slate-500">Live transfers & automatic device saving</p>
        </div>
        <div className="p-2.5 rounded-2xl bg-cyan-400/10 text-cyan-600">
          <ArrowDownCircle size={22} />
        </div>
      </div>

      {isTaskActive && (
        <div className="flex flex-col gap-3">
          <div className="flex items-center justify-between text-xs font-semibold text-slate-700 px-1">
            <span>In Progress</span>
            <span className="font-mono text-cyan-600 animate-pulse">Live SSE Stream</span>
          </div>
          <ActiveDownloadCard task={activeTask} />
        </div>
      )}

      {isTaskFinished && (
        <div className="crystal-card rounded-3xl p-4 border border-emerald-300/50 bg-emerald-50/20 flex flex-col gap-3 animate-fade-in shadow-crystal">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-emerald-400/20 text-emerald-600">
                <CheckCircle size={20} />
              </div>
              <div>
                <h4 className="font-semibold text-sm text-slate-900">Download Complete</h4>
                <p className="text-xs text-slate-500 truncate max-w-[220px]">{activeTask.title}</p>
              </div>
            </div>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-100 text-emerald-700 text-[11px] font-medium">Ready</span>
          </div>

          <div className="flex items-center gap-2 pt-1">
            <a
              href={`/api/files/${activeTask.file_id}/download`}
              download={activeTask.filename}
              className="flex-1 flex items-center justify-center gap-2 py-2.5 rounded-2xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-medium shadow-sm transition-all active:scale-95"
            >
              <ArrowDownCircle size={15} />
              <span>Save to Device Now</span>
            </a>
            <button
              type="button"
              onClick={onGoToFiles}
              className="px-4 py-2.5 rounded-2xl bg-white/80 hover:bg-white text-slate-700 text-xs font-medium border border-slate-200 transition-all"
            >
              Library
            </button>
          </div>
        </div>
      )}

      {!isTaskActive && !isTaskFinished && (
        <div className="flex flex-col items-center justify-center p-10 text-center crystal-card rounded-3xl gap-3">
          <div className="p-4 rounded-full bg-slate-100 text-slate-400">
            <CheckCircle size={32} />
          </div>
          <h3 className="font-medium text-slate-800 text-sm">No Active Downloads</h3>
          <p className="text-xs text-slate-400 max-w-xs">
            Paste any video link in the Home tab to start a stream extraction. Completed videos automatically save to your device.
          </p>
          <button
            type="button"
            onClick={onGoToHome}
            className="mt-2 px-5 py-2 rounded-full bg-slate-900 text-white text-xs font-medium hover:bg-slate-800 transition-all flex items-center gap-1.5"
          >
            <Sparkles size={14} />
            <span>Inspect a Video</span>
          </button>
        </div>
      )}

      {/* Quick link to completed media */}
      <div className="p-4 rounded-2xl crystal-card border border-white/40 flex items-center justify-between">
        <div className="flex flex-col">
          <span className="text-xs font-semibold text-slate-800">Completed Media</span>
          <span className="text-[11px] text-slate-500">Browse and stream your saved files</span>
        </div>
        <button
          type="button"
          onClick={onGoToFiles}
          className="px-3.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-medium transition-all"
        >
          View Library
        </button>
      </div>
    </div>
  );
}

export default DownloadsView;
