import React, { useState, useEffect } from 'react';
import { Play, Download, Film, Music, Trash2, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { apiClient } from '../api/client';
import { ActiveDownloadCard } from './ActiveDownloadCard';
import { MediaPlayerModal } from './MediaPlayerModal';

export function FilesView({ activeTask }) {
  const [tab, setTab] = useState('all');
  const [files, setFiles] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');

  const loadFiles = async () => {
    try {
      const data = await apiClient.getFiles(tab);
      setFiles(data);
    } catch (err) {
      console.error(err);
      setErrorMessage(err.message || 'Failed to load media files');
    }
  };

  useEffect(() => {
    loadFiles();
  }, [tab, activeTask?.status]);

  const handleDelete = async (e, fileId) => {
    e.stopPropagation();
    if (!window.confirm('Delete this file from your device?')) return;
    setDeletingId(fileId);
    setErrorMessage('');
    try {
      await apiClient.deleteFile(fileId);
      await loadFiles();
    } catch (err) {
      setErrorMessage(err.message || 'Failed to delete file');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-black text-white tracking-tight uppercase font-mono">
              Media Library
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-md bg-cyan-cyber/15 text-cyan-cyber border border-cyan-cyber/30">
              {files.length} ITEMS
            </span>
          </div>
          <p className="text-xs text-slate-400 font-medium pt-0.5">
            Offline media storage and direct player playback
          </p>
        </div>
      </div>

      {/* Segmented Bento Capsules */}
      <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-obsidian-surface border border-white/10">
        {[
          { id: 'all', label: 'All Media' },
          { id: 'video', label: 'Videos' },
          { id: 'music', label: 'Audio' },
        ].map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={`py-1.5 rounded-xl text-xs font-mono font-bold capitalize transition-all spring-press ${
              tab === t.id
                ? 'bg-cyan-cyber text-obsidian shadow-cyan-glow border border-cyan-200'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {errorMessage && (
        <div className="flex items-center gap-2 p-3 rounded-xl bg-crimson-tactical/15 border border-crimson-tactical/30 text-rose-300 text-xs">
          <AlertCircle size={14} />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Active Download Progress Card */}
      {activeTask && <ActiveDownloadCard task={activeTask} onStatusChange={loadFiles} />}

      {/* Files List */}
      <div className="flex flex-col gap-2.5">
        {files.length === 0 ? (
          <div className="bento-card rounded-3xl p-10 text-center text-slate-400 text-xs border border-white/10 flex flex-col items-center gap-2">
            <Film size={28} className="text-slate-600 mb-1" />
            <span className="font-semibold text-slate-300">No media stored yet</span>
            <span className="text-[11px] text-slate-500">
              Downloaded videos and audio will appear here for instant offline playback.
            </span>
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between p-3.5 bento-card rounded-2xl hover:border-cyan-cyber/40 hover:bg-white/[0.04] transition-all shadow-sm group border border-white/10 spring-press"
            >
              <div
                onClick={() => setSelectedMedia(file)}
                className="flex items-center gap-3 truncate cursor-pointer flex-1"
              >
                <div className="w-12 h-12 rounded-xl bg-obsidian-base border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center text-white shadow-inner">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                  ) : file.category === 'music' ? (
                    <Music size={18} className="text-cyan-cyber" />
                  ) : (
                    <Film size={18} className="text-lime-neon" />
                  )}
                  <div className="absolute inset-0 bg-obsidian-base/50 backdrop-blur-[1px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={15} fill="white" className="text-white drop-shadow" />
                  </div>
                </div>

                <div className="truncate pr-2">
                  <h4 className="font-bold text-xs text-white truncate leading-snug">{file.title}</h4>
                  <div className="flex items-center gap-2 pt-0.5">
                    <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-white/5 text-cyan-cyber font-semibold border border-white/10">
                      {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase font-mono">
                      {file.category || 'media'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Actions */}
              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedMedia(file)}
                  className="p-2 rounded-xl bento-card text-cyan-cyber hover:text-white transition-colors spring-press border border-cyan-cyber/30 hover:border-cyan-cyber"
                  title="Play"
                  aria-label="Play media"
                >
                  <Play size={14} />
                </button>

                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="flex items-center gap-1 px-2.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 text-xs font-semibold shadow-sm transition-all spring-press"
                  title="Save to Phone / Device"
                  aria-label="Save to Phone"
                >
                  <Download size={13} strokeWidth={2.2} />
                </a>

                <button
                  type="button"
                  onClick={(e) => handleDelete(e, file.file_id)}
                  disabled={deletingId === file.file_id}
                  className="p-2 rounded-xl bg-white/5 text-slate-400 hover:bg-crimson-tactical/20 hover:text-rose-300 border border-white/10 hover:border-crimson-tactical/40 transition-all spring-press"
                  title="Delete File"
                  aria-label="Delete File"
                >
                  {deletingId === file.file_id ? (
                    <Loader2 size={13} className="animate-spin text-rose-400" />
                  ) : (
                    <Trash2 size={13} />
                  )}
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

export default FilesView;
