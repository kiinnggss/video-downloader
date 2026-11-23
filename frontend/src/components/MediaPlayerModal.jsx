import React, { useRef, useState, useEffect } from 'react';
import { X, Download, PictureInPicture2, Share2, Gauge } from 'lucide-react';

const SPEED_OPTIONS = [1, 1.25, 1.5, 2];

export function MediaPlayerModal({ media, isOpen, onClose }) {
  const mediaRef = useRef(null);
  const [playbackRate, setPlaybackRate] = useState(1);

  useEffect(() => {
    setPlaybackRate(1);
  }, [media?.file_id, isOpen]);

  useEffect(() => {
    if (mediaRef.current) {
      mediaRef.current.playbackRate = playbackRate;
    }
  }, [playbackRate, isOpen]);

  if (!isOpen || !media) return null;

  const streamSrc = media.stream_url || `/api/files/${media.file_id}/stream`;
  const downloadHref = media.download_url || `/api/files/${media.file_id}/download`;
  const isAudio = media.category === 'music' || media.category === 'audio';
  const canPiP =
    !isAudio && typeof document !== 'undefined' && Boolean(document.pictureInPictureEnabled);
  const canNativeShare = typeof navigator !== 'undefined' && Boolean(navigator.share);

  const handleTogglePiP = async () => {
    try {
      if (!mediaRef.current) return;
      if (document.pictureInPictureElement) {
        await document.exitPictureInPicture();
      } else if (mediaRef.current.requestPictureInPicture) {
        await mediaRef.current.requestPictureInPicture();
      }
    } catch {
      // Picture-in-Picture rejected by browser policy
    }
  };

  const handleShare = async () => {
    if (!navigator?.share) return;
    try {
      const shareUrl =
        typeof window !== 'undefined' && downloadHref.startsWith('/')
          ? `${window.location.origin}${downloadHref}`
          : downloadHref;
      await navigator.share({
        title: media.title || 'Crystal Media',
        url: shareUrl,
      });
    } catch {
      // User cancelled share sheet
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-lg surface-card overflow-hidden flex flex-col"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div
          className="flex items-center justify-between p-4 border-b"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <h3 className="font-display font-bold text-sm truncate pr-3" style={{ color: 'var(--text-primary)' }}>
            {media.title}
          </h3>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full transition-colors flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            aria-label="Close media player"
          >
            <X size={18} />
          </button>
        </div>

        <div className="w-full aspect-video bg-black flex items-center justify-center">
          {isAudio ? (
            <audio ref={mediaRef} controls autoPlay src={streamSrc} className="w-full px-6" />
          ) : (
            <video
              ref={mediaRef}
              controls
              autoPlay
              playsInline
              src={streamSrc}
              className="w-full h-full object-contain"
            />
          )}
        </div>

        {/* Playback speed + PiP + Share + Save toolbar */}
        <div
          className="flex flex-wrap items-center justify-between gap-2 p-4 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          {/* Speed pills */}
          <div className="flex items-center gap-1">
            <Gauge size={13} style={{ color: 'var(--text-muted)' }} className="mr-0.5" />
            {SPEED_OPTIONS.map((rate) => {
              const active = playbackRate === rate;
              return (
                <button
                  key={rate}
                  type="button"
                  onClick={() => setPlaybackRate(rate)}
                  className="px-2 py-1 rounded-lg text-[11px] font-mono font-bold transition-all spring-press"
                  style={
                    active
                      ? { backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }
                      : {
                          backgroundColor: 'var(--bg-surface-muted)',
                          color: 'var(--text-secondary)',
                        }
                  }
                >
                  {rate}x
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2">
            {canPiP && (
              <button
                type="button"
                onClick={handleTogglePiP}
                className="p-2 rounded-xl spring-press"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                title="Picture in Picture"
                aria-label="Picture in Picture"
              >
                <PictureInPicture2 size={15} />
              </button>
            )}

            {canNativeShare && !streamSrc.startsWith('blob:') && (
              <button
                type="button"
                onClick={handleShare}
                className="p-2 rounded-xl spring-press"
                style={{
                  backgroundColor: 'var(--bg-surface-muted)',
                  color: 'var(--text-primary)',
                  border: '1px solid var(--border-color)',
                }}
                title="Share"
                aria-label="Share media"
              >
                <Share2 size={15} />
              </button>
            )}

            <a
              href={downloadHref}
              download={media.filename || media.title}
              className="flex items-center gap-1.5 px-3.5 py-2 font-bold text-xs spring-press theme-btn-primary"
            >
              <Download size={14} strokeWidth={2.5} />
              <span>Save to Device</span>
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}

export default MediaPlayerModal;
