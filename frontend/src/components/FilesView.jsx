import React, { useState, useEffect } from 'react';
import { Play, Download, Film, Music } from 'lucide-react';
import { apiClient } from '../api/client';
import { ActiveDownloadCard } from './ActiveDownloadCard';
import { MediaPlayerModal } from './MediaPlayerModal';

export function FilesView({ activeTask }) {
  const [tab, setTab] = useState('all');
  const [files, setFiles] = useState([]);
  const [selectedMedia, setSelectedMedia] = useState(null);

  const loadFiles = async () => {
    try {
      const data = await apiClient.getFiles(tab);
      setFiles(data);
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    loadFiles();
  }, [tab, activeTask?.status]);

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Media Library</h1>
          <p className="text-xs text-slate-400">Offline playback & instant phone storage</p>
        </div>
      </div>

      {/* Segmented Cyber Pill Tabs */}
      <div className="flex items-center p-1 rounded-full glass-cyber-input border border-cyan-500/30 shadow-inner">
        {['all', 'video', 'music'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-full text-xs font-bold capitalize transition-all ${
              tab === t 
                ? 'bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 text-slate-950 shadow-md shadow-cyan-500/25' 
                : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'all' ? 'All Media' : t === 'video' ? 'Videos' : 'Audio'}
          </button>
        ))}
      </div>

      {/* Active Download Progress Card */}
      {activeTask && <ActiveDownloadCard task={activeTask} />}

      {/* Files List */}
      <div className="flex flex-col gap-2.5">
        {files.length === 0 ? (
          <div className="glass-cyber rounded-3xl p-10 text-center text-slate-400 text-xs border border-cyan-500/20">
            No completed media in this section.
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between p-3 glass-cyber rounded-2xl hover:border-cyan-400/50 hover:bg-white/[0.04] transition-all shadow-sm group border border-white/10"
            >
              <div 
                onClick={() => setSelectedMedia(file)}
                className="flex items-center gap-3 truncate cursor-pointer flex-1"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 overflow-hidden flex-shrink-0 relative flex items-center justify-center text-white">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                  ) : file.category === 'music' ? (
                    <Music size={20} className="text-cyan-400" />
                  ) : (
                    <Film size={20} className="text-blue-400" />
                  )}
                  <div className="absolute inset-0 bg-black/40 backdrop-blur-[2px] flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} fill="white" className="text-white drop-shadow" />
                  </div>
                </div>

                <div className="truncate pr-2">
                  <h4 className="font-semibold text-sm text-white truncate">{file.title}</h4>
                  <span className="text-xs text-cyan-400/80 font-mono">
                    {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1.5 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setSelectedMedia(file)}
                  className="p-2 rounded-full glass-cyber text-cyan-400 hover:text-white transition-colors"
                  title="Play"
                >
                  <Play size={15} />
                </button>
                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-full bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 hover:text-white border border-cyan-400/30 text-xs font-semibold shadow-sm transition-all active:scale-95"
                  title="Save to Phone / Device"
                >
                  <Download size={13} strokeWidth={2.2} />
                  <span>Save</span>
                </a>
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
