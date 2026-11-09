import React from 'react';
import { X, Download } from 'lucide-react';

export function MediaPlayerModal({ media, isOpen, onClose }) {
  if (!isOpen || !media) return null;

  const streamSrc = media.stream_url || `/api/files/${media.file_id}/stream`;
  const downloadHref = media.download_url || `/api/files/${media.file_id}/download`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/70 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg bento-card rounded-3xl overflow-hidden shadow-2xl border border-slate-200 flex flex-col text-slate-950 bg-white">
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h3 className="font-bold text-sm text-slate-950 truncate max-w-[280px]">{media.title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-slate-100 text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close media player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="w-full aspect-video bg-black flex items-center justify-center border-y border-slate-200">
          {media.category === 'music' ? (
            <audio controls autoPlay className="w-full px-6 accent-cyan-600">
              <source src={streamSrc} type="audio/mp3" />
            </audio>
          ) : (
            <video controls autoPlay playsInline className="w-full h-full object-contain">
              <source src={streamSrc} type="video/mp4" />
            </video>
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-slate-200">
          <a
            href={downloadHref}
            download={media.filename}
            className="flex items-center gap-2 px-4 py-2.5 rounded-xl bg-lime-neon hover:bg-lime-400 text-obsidian font-black uppercase tracking-wider text-xs transition-all shadow-sm spring-press"
          >
            <Download size={14} strokeWidth={2.8} /> Save to Phone Storage
          </a>
        </div>
      </div>
    </div>
  );
}

export default MediaPlayerModal;
