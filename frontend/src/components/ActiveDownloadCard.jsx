import React, { useState } from 'react';
import { Pause, Play, X, Zap, Loader2, AlertCircle, Activity, Gauge, Clock } from 'lucide-react';
import { apiClient } from '../api/client';

export function ActiveDownloadCard({ task, onStatusChange }) {
  const [loadingAction, setLoadingAction] = useState(false);
  const [actionError, setActionError] = useState('');

  if (!task || task.status === 'finished') return null;

  const isPaused = task.status === 'paused';
  const isCancelled = task.status === 'cancelled';
  const downloadedMb = ((task.downloaded_bytes || 0) / (1024 * 1024)).toFixed(2);
  const totalMb = task.total_bytes && task.total_bytes > 0
    ? (task.total_bytes / (1024 * 1024)).toFixed(2)
    : null;

  const handleTogglePause = async () => {
    if (loadingAction || !task.task_id) return;
    setLoadingAction(true);
    setActionError('');
    try {
      if (isPaused) {
        await apiClient.resumeDownload(task.task_id);
      } else {
        await apiClient.pauseDownload(task.task_id);
      }
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Action failed');
    } finally {
      setLoadingAction(false);
    }
  };

  const handleCancel = async () => {
    if (loadingAction || !task.task_id) return;
    setLoadingAction(true);
    setActionError('');
    try {
      await apiClient.cancelDownload(task.task_id);
      if (onStatusChange) onStatusChange();
    } catch (err) {
      setActionError(err.message || 'Cancellation failed');
    } finally {
      setLoadingAction(false);
    }
  };

  if (isCancelled) {
    return (
      <div className="bento-card rounded-3xl p-4 border border-crimson-tactical/30 animate-fade-in flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-crimson-tactical/15 text-rose-400 border border-crimson-tactical/30">
            <X size={17} />
          </div>
          <div>
            <h4 className="font-bold text-sm text-white">Transfer Terminated</h4>
            <span className="text-[11px] text-slate-400 font-mono truncate max-w-[200px] block">
              {task.title}
            </span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={`bento-telemetry rounded-3xl p-4.5 transition-all duration-300 border ${
        isPaused
          ? 'border-amber-vault/40 bg-amber-950/20 shadow-[0_0_25px_-5px_rgba(255,184,0,0.25)]'
          : 'border-lime-neon/40 shadow-lime-glow'
      } animate-fade-in flex flex-col gap-4`}
    >
      {/* Telemetry Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {/* Radar Beacon */}
          <div className="relative flex items-center justify-center w-6 h-6">
            {!isPaused && <span className="absolute w-5 h-5 rounded-full bg-lime-neon/40 radar-ping" />}
            <span
              className={`w-2.5 h-2.5 rounded-full relative z-10 ${
                isPaused ? 'bg-amber-vault' : 'bg-lime-neon shadow-[0_0_8px_#ccff00]'
              }`}
            />
          </div>
          <span className="text-[11px] font-mono font-black tracking-wider uppercase text-white">
            {isPaused ? 'STREAM PAUSED' : 'LIVE TRANSFER'}
          </span>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePause}
            disabled={loadingAction}
            className={`px-3 py-1.5 rounded-xl font-mono text-xs font-bold transition-all spring-press flex items-center gap-1.5 border ${
              isPaused
                ? 'bg-amber-vault text-obsidian border-amber-300 hover:bg-amber-300 shadow-md'
                : 'bg-lime-neon/15 text-lime-neon border-lime-neon/40 hover:bg-lime-neon hover:text-obsidian'
            }`}
            title={isPaused ? 'Resume Transfer' : 'Pause Transfer'}
            aria-label={isPaused ? 'Resume Transfer' : 'Pause Transfer'}
          >
            {loadingAction ? (
              <Loader2 size={13} className="animate-spin" />
            ) : isPaused ? (
              <>
                <Play size={13} strokeWidth={2.8} />
                <span>Resume</span>
              </>
            ) : (
              <>
                <Pause size={13} strokeWidth={2.8} />
                <span>Pause</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handleCancel}
            disabled={loadingAction}
            className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-crimson-tactical/20 hover:text-rose-300 border border-white/10 hover:border-crimson-tactical/40 transition-all spring-press"
            title="Cancel Download"
            aria-label="Cancel Download"
          >
            <X size={14} />
          </button>
        </div>
      </div>

      {/* Speedometer Gauges Row */}
      <div className="flex items-baseline justify-between pt-1">
        <div className="flex flex-col">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">
            Transfer Speed
          </span>
          <span
            className={`font-mono text-2xl font-black tracking-tight ${
              isPaused ? 'text-amber-vault' : 'text-lime-neon drop-shadow-[0_0_12px_rgba(204,255,0,0.4)]'
            }`}
          >
            {isPaused ? '0.00 KB/s' : task.speed || 'Initializing'}
          </span>
        </div>

        <div className="flex flex-col items-end">
          <span className="text-[10px] font-mono text-slate-400 uppercase tracking-wider">Progress</span>
          <span className="font-mono text-2xl font-black text-white tracking-tight">
            {task.progress}%
          </span>
        </div>
      </div>

      {/* Segmented Gradient Progress Track */}
      <div className="w-full flex flex-col gap-1.5">
        <div className="w-full h-3 rounded-xl bg-obsidian-base border border-white/10 overflow-hidden p-0.5 shadow-inner">
          <div
            className={`h-full rounded-lg transition-all duration-300 ${
              isPaused
                ? 'bg-amber-vault'
                : 'bg-gradient-to-r from-cyan-cyber via-lime-neon to-emerald-400 shadow-[0_0_15px_rgba(204,255,0,0.8)]'
            }`}
            style={{ width: `${Math.max(2, task.progress)}%` }}
          />
        </div>

        {/* Telemetry Chips */}
        <div className="flex items-center justify-between text-[11px] font-mono text-slate-400 pt-0.5">
          <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-300">
            {downloadedMb} MB{totalMb ? ` / ${totalMb} MB` : ''}
          </span>
          {task.eta_seconds && !isPaused ? (
            <span className="flex items-center gap-1 text-cyan-cyber font-semibold px-2 py-0.5 rounded-md bg-cyan-cyber/10 border border-cyan-cyber/20">
              <Clock size={11} />
              <span>{task.eta_seconds}s REMAINING</span>
            </span>
          ) : (
            <span className="text-slate-500 font-mono text-[10px]">
              {isPaused ? 'STANDBY' : 'STREAMING'}
            </span>
          )}
        </div>
      </div>

      <div className="truncate text-xs font-semibold text-slate-300 border-t border-white/5 pt-2">
        {task.title}
      </div>

      {actionError && (
        <div className="flex items-center gap-1.5 text-[11px] text-rose-400 bg-rose-500/10 p-2 rounded-xl border border-rose-500/20">
          <AlertCircle size={13} />
          <span>{actionError}</span>
        </div>
      )}
    </div>
  );
}

export default ActiveDownloadCard;
