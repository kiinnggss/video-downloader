import React from 'react';
import { X, Download } from 'lucide-react';

export function MediaPlayerModal({ media, isOpen, onClose }) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg glass-cyber rounded-3xl overflow-hidden shadow-2xl border border-cyan-500/30 flex flex-col text-white">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-bold text-sm text-white truncate max-w-[280px]">{media.title}</h3>
          <button 
            type="button"
            onClick={onClose} 
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            aria-label="Close media player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="w-full aspect-video bg-black flex items-center justify-center border-y border-white/5">
          {media.category === 'music' ? (
            <audio controls autoPlay className="w-full px-6 accent-cyan-400">
              <source src={`/api/files/${media.file_id}/stream`} type="audio/mp3" />
            </audio>
          ) : (
            <video controls autoPlay playsInline className="w-full h-full object-contain">
              <source src={`/api/files/${media.file_id}/stream`} type="video/mp4" />
            </video>
          )}
        </div>

        <div className="flex items-center justify-end p-4 border-t border-white/10">
          <a
            href={`/api/files/${media.file_id}/download`}
            download={media.filename}
            className="flex items-center gap-2 px-4 py-2.5 rounded-full bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 text-slate-950 font-bold text-xs transition-all shadow-md shadow-cyan-500/20 active:scale-95"
          >
            <Download size={14} strokeWidth={2.5} /> Save to Phone Storage
          </a>
        </div>
      </div>
    </div>
  );
}

export default MediaPlayerModal;
