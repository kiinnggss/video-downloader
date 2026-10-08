import React, { useState, useEffect } from 'react';
import { Play, Download, MoreVertical, Film, Music } from 'lucide-react';
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
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-4 pb-28">
      <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Files</h1>

      {/* Segmented Pill Tabs */}
      <div className="flex items-center p-1 rounded-full crystal-card shadow-sm">
        {['all', 'video', 'music'].map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 py-1.5 rounded-full text-xs font-semibold capitalize transition-all ${
              tab === t 
                ? 'bg-slate-900 text-white shadow-sm' 
                : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            {t === 'all' ? 'Download' : t === 'video' ? 'Local Video' : 'Music'}
          </button>
        ))}
      </div>

      {/* Active Download Progress Card */}
      {activeTask && <ActiveDownloadCard task={activeTask} />}

      {/* Files List */}
      <div className="flex flex-col gap-2.5">
        {files.length === 0 ? (
          <div className="crystal-card rounded-3xl p-10 text-center text-slate-400 text-xs">
            No completed files found in this category.
          </div>
        ) : (
          files.map((file) => (
            <div
              key={file.file_id}
              className="flex items-center justify-between p-3 crystal-card rounded-2xl hover:bg-white/80 transition-all shadow-sm group"
            >
              <div 
                onClick={() => setSelectedMedia(file)}
                className="flex items-center gap-3 truncate cursor-pointer flex-1"
              >
                <div className="w-12 h-12 rounded-xl bg-slate-900 overflow-hidden flex-shrink-0 relative flex items-center justify-center text-white">
                  {file.thumbnail ? (
                    <img src={file.thumbnail} alt={file.title} className="w-full h-full object-cover" />
                  ) : file.category === 'music' ? (
                    <Music size={20} className="text-amber-400" />
                  ) : (
                    <Film size={20} className="text-cyan-400" />
                  )}
                  <div className="absolute inset-0 bg-black/20 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                    <Play size={16} fill="white" className="text-white" />
                  </div>
                </div>

                <div className="truncate pr-2">
                  <h4 className="font-medium text-sm text-slate-900 truncate">{file.title}</h4>
                  <span className="text-xs text-slate-400 font-mono">
                    {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  onClick={() => setSelectedMedia(file)}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-600"
                  title="Play"
                >
                  <Play size={16} />
                </button>
                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="p-2 rounded-full hover:bg-slate-200/50 text-slate-600"
                  title="Save to Phone"
                >
                  <Download size={16} />
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
