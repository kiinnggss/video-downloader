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
        className="w-full max-w-sm bento-telemetry rounded-2xl p-2.5 px-3.5 border border-lime-neon/30 flex items-center justify-between gap-3 pointer-events-auto cursor-pointer animate-fade-in hover:border-lime-neon/60 transition-all shadow-lime-glow spring-press"
        title="Tap to inspect active download"
      >
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Radar indicator */}
          <div
            className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 border ${
              isPaused
                ? 'bg-amber-vault/20 text-amber-vault border-amber-vault/30'
                : 'bg-lime-neon/15 text-lime-neon border-lime-neon/40 shadow-inner'
            }`}
          >
            <ArrowDownCircle size={16} className={isPaused ? '' : 'animate-pulse'} />
          </div>

          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <h5 className="text-xs font-bold text-white truncate">
                {task.title || 'Downloading stream...'}
              </h5>
              <span className="text-[11px] font-mono font-black text-lime-neon flex-shrink-0">
                {task.progress}%
              </span>
            </div>

            {/* Segmented mini progress */}
            <div className="w-full h-1.5 rounded-full bg-obsidian-base border border-white/10 overflow-hidden mt-1.5">
              <div
                className={`h-full rounded-full transition-all duration-300 ${
                  isPaused
                    ? 'bg-amber-vault'
                    : 'bg-gradient-to-r from-cyan-cyber via-lime-neon to-emerald-400 shadow-[0_0_8px_rgba(204,255,0,0.8)]'
                }`}
                style={{ width: `${Math.max(3, task.progress)}%` }}
              />
            </div>
          </div>
        </div>

        {/* Quick controls */}
        <div className="flex items-center gap-1.5 flex-shrink-0">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loading}
            className={`p-1.5 rounded-lg transition-all spring-press border ${
              isPaused
                ? 'bg-amber-vault text-obsidian border-amber-300 font-bold'
                : 'bg-lime-neon/20 text-lime-neon border-lime-neon/40 hover:bg-lime-neon hover:text-obsidian'
            }`}
            title={isPaused ? 'Resume' : 'Pause'}
          >
            {loading ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isPaused ? (
              <Play size={13} strokeWidth={2.5} />
            ) : (
              <Pause size={13} strokeWidth={2.5} />
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loading}
            className="p-1.5 rounded-lg bg-white/5 text-slate-400 hover:bg-crimson-tactical/20 hover:text-rose-300 border border-white/10 transition-all spring-press"
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
