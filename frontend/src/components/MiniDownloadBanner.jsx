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
        className="w-full max-w-sm glass-cyber rounded-2xl p-2.5 px-3.5 border border-cyan-500/30 flex items-center justify-between gap-3 pointer-events-auto cursor-pointer animate-fade-in hover:border-cyan-400/60 transition-all shadow-cyber-card"
        title="Tap to open Downloads"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          <div className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
            isPaused ? 'bg-amber-500/20 text-amber-400 border-amber-400/30' : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/30'
          }`}>
            <ArrowDownCircle size={17} className={isPaused ? '' : 'animate-pulse'} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-bold text-white truncate">
                {task.title || 'Downloading media...'}
              </h5>
              <span className="text-[11px] font-mono font-semibold text-cyan-400 flex-shrink-0">
                {task.progress}%
              </span>
            </div>

            {/* Mini Progress Line */}
            <div className="w-full h-1.5 rounded-full bg-black/60 border border-white/10 overflow-hidden mt-1">
              <div 
                className={`h-full rounded-full transition-all duration-300 ${
                  isPaused ? 'bg-amber-400' : 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-500 shadow-[0_0_8px_rgba(56,189,248,0.7)]'
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
            className={`p-1.5 rounded-full transition-all active:scale-90 border ${
              isPaused 
                ? 'bg-amber-400 text-slate-950 border-amber-300' 
                : 'bg-cyan-500/20 text-cyan-300 border-cyan-400/40 hover:bg-cyan-500/30'
            }`}
            title={isPaused ? "Resume" : "Pause"}
          >
            {loading ? <Loader2 size={13} className="animate-spin" /> : isPaused ? <Play size={13} /> : <Pause size={13} />}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="p-1.5 rounded-full bg-white/5 text-slate-400 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 transition-all active:scale-90"
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
