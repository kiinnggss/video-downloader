import React, { useState } from 'react';
import { Pause, Play, X, ArrowDownCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

export function MiniDownloadBanner({ task, onOpenDownloads }) {
  const [loading, setLoading] = useState(false);

  if (!task || task.status === 'finished' || task.status === 'cancelled') {
    return null;
  }

  const isPaused = task.status === 'paused';

  const handleTogglePause = async (e) => {
    e.stopPropagation();
    if (loading || !task.task_id) return;
    setLoading(true);
    try {
      if (isPaused) {
        await apiClient.resumeDownload(task.task_id);
      } else {
        await apiClient.pauseDownload(task.task_id);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = async (e) => {
    e.stopPropagation();
    if (loading || !task.task_id) return;
    setLoading(true);
    try {
      await apiClient.cancelDownload(task.task_id);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 left-4 right-4 z-30 flex justify-center pointer-events-none">
      <div 
        onClick={onOpenDownloads}
        className="w-full max-w-sm crystal-card rounded-2xl p-2.5 px-3.5 shadow-crystal-glow border border-white/40 flex items-center justify-between gap-3 backdrop-blur-xl bg-white/85 pointer-events-auto cursor-pointer animate-fade-in hover:bg-white/95 transition-all"
        title="Tap to open Downloads"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`p-2 rounded-xl flex-shrink-0 ${
            isPaused ? 'bg-amber-400/20 text-amber-600' : 'bg-cyan-400/20 text-cyan-600'
          }`}>
            <ArrowDownCircle size={18} className={isPaused ? '' : 'animate-pulse'} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-semibold text-slate-800 truncate">
                {task.title || 'Downloading media...'}
              </h5>
              <span className="text-[11px] font-mono font-medium text-slate-600 flex-shrink-0">
                {task.progress}%
              </span>
            </div>

            {/* Mini Progress Line */}
            <div className="w-full h-1.5 rounded-full bg-slate-200/80 overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isPaused ? 'bg-amber-400' : 'bg-cyan-400'
                }`}
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loading}
            className={`p-1.5 rounded-full transition-all active:scale-90 ${
              isPaused 
                ? 'bg-amber-500 text-white hover:bg-amber-600' 
                : 'bg-slate-200/80 text-slate-700 hover:bg-slate-300'
            }`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="p-1.5 rounded-full bg-slate-200/80 text-slate-500 hover:bg-rose-100 hover:text-rose-600 transition-all active:scale-90"
            title="Cancel"
          >
            <X size={13} />
          </button>
        </div>
      </div>
    </div>
  );
}

export default MiniDownloadBanner;
