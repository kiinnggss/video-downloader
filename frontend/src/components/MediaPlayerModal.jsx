import React from 'react';
import { X, Download } from 'lucide-react';

export function MediaPlayerModal({ media, isOpen, onClose }) {
  if (!isOpen || !media) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-lg crystal-card-dark rounded-3xl overflow-hidden shadow-2xl flex flex-col text-white">
        <div className="flex items-center justify-between p-4 border-b border-white/10">
          <h3 className="font-medium text-sm truncate max-w-[280px]">{media.title}</h3>
          <button onClick={onClose} className="p-1.5 rounded-full hover:bg-white/10 text-white/70">
            <X size={18} />
          </button>
        </div>

        <div className="w-full aspect-video bg-black flex items-center justify-center">
          {media.category === 'music' ? (
            <audio controls autoPlay className="w-full px-6">
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
            className="flex items-center gap-2 px-4 py-2 rounded-full bg-amber-400 text-slate-950 font-medium text-xs hover:bg-amber-300 transition-all shadow-sm"
          >
            <Download size={14} /> Save to Phone
          </a>
        </div>
      </div>
    </div>
  );
}

export default MediaPlayerModal;
