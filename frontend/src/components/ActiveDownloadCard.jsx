import React from 'react';
import { Pause, Play, X, Zap } from 'lucide-react';

export function ActiveDownloadCard({ task }) {
  if (!task || task.status === 'finished') return null;

  const isDownloading = task.status === 'downloading';
  const downloadedMb = (task.downloaded_bytes / (1024 * 1024)).toFixed(2);
  const totalMb = (task.total_bytes / (1024 * 1024)).toFixed(2);

  return (
    <div className="crystal-card rounded-3xl p-4 shadow-crystal-glow border border-cyan-300/40 animate-fade-in flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5 truncate pr-2">
          <div className="p-2 rounded-xl bg-cyan-400/20 text-cyan-600 flex-shrink-0">
            <Zap size={18} />
          </div>
          <div className="truncate">
            <h4 className="font-semibold text-sm text-slate-900 truncate">{task.title}</h4>
            <span className="text-[11px] font-mono font-medium text-cyan-600">{task.speed}</span>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <span className="text-xs font-semibold text-slate-700 mr-2">{task.progress}%</span>
        </div>
      </div>

      {/* Progress Bar */}
      <div className="w-full h-2 rounded-full bg-slate-200/60 overflow-hidden p-0.5">
        <div 
          className="h-full rounded-full bg-cyan-400 transition-all duration-300 shadow-sm"
          style={{ width: `${task.progress}%` }}
        />
      </div>

      <div className="flex items-center justify-between text-[11px] text-slate-500 font-mono">
        <span>{downloadedMb} MB / {totalMb} MB</span>
        {task.eta_seconds ? <span>ETA: {task.eta_seconds}s</span> : null}
      </div>
    </div>
  );
}

export default ActiveDownloadCard;
