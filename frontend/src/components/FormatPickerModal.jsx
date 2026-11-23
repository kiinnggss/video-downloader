import React, { useState, useEffect } from 'react';
import { Film, Music, Shield, Check, X, Download, Lock } from 'lucide-react';

export function FormatPickerModal({
  inspectData,
  isOpen,
  defaultInVault = false,
  onClose,
  onConfirm,
}) {
  const [selectedFormat, setSelectedFormat] = useState(
    inspectData?.formats?.[0]?.format_id || 'best'
  );
  const [isAudio, setIsAudio] = useState(false);
  const [inVault, setInVault] = useState(defaultInVault);
  const [tabFilter, setTabFilter] = useState('all');

  useEffect(() => {
    if (inspectData?.formats?.length) {
      setSelectedFormat(inspectData.formats[0].format_id);
      setIsAudio(inspectData.formats[0].resolution === 'Audio');
    }
  }, [inspectData]);

  useEffect(() => {
    if (isOpen) {
      setInVault(Boolean(defaultInVault));
    }
  }, [isOpen, defaultInVault]);

  if (!isOpen || !inspectData) return null;

  const handleSubmit = () => {
    onConfirm({
      url: inspectData.url,
      format_id: selectedFormat,
      is_audio: isAudio,
      in_vault: inVault,
    });
    onClose();
  };

  const filteredFormats = (inspectData.formats || []).filter((fmt) => {
    if (tabFilter === 'video') return fmt.resolution !== 'Audio';
    if (tabFilter === 'audio') return fmt.resolution === 'Audio';
    return true;
  });

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md surface-card rounded-t-[32px] sm:rounded-[32px] p-6 flex flex-col gap-4 max-h-[90vh] overflow-y-auto no-scrollbar"
        onClick={(e) => e.stopPropagation()}
      >
        <div
          className="w-10 h-1 rounded-full mx-auto -mt-1 sm:hidden"
          style={{ backgroundColor: 'var(--border-strong)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="min-w-0 pr-2">
            <h3 className="font-display font-extrabold text-base flex items-center gap-2" style={{ color: 'var(--text-primary)' }}>
              <span>Stream Options</span>
              <span
                className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                style={{
                  backgroundColor: 'var(--accent-soft)',
                  color: 'var(--accent-text)',
                }}
              >
                HQ
              </span>
            </h3>
            <p className="text-xs truncate pt-0.5" style={{ color: 'var(--text-muted)' }}>
              {inspectData.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl spring-press flex-shrink-0"
            style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            aria-label="Close quality picker"
          >
            <X size={16} />
          </button>
        </div>

        {/* Media Filter Segmented Tabs */}
        <div
          className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl surface-muted"
          style={{ borderRadius: 'var(--radius-button)' }}
        >
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'video', label: 'Video HQ' },
            { id: 'audio', label: 'Audio MP3' },
          ].map((tab) => {
            const active = tabFilter === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                onClick={() => setTabFilter(tab.id)}
                className="py-1.5 rounded-xl text-xs font-bold transition-all spring-press"
                style={
                  active
                    ? { backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }
                    : { color: 'var(--text-secondary)' }
                }
              >
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Formats list */}
        <div className="flex flex-col gap-2 max-h-56 overflow-y-auto pr-0.5 no-scrollbar">
          {filteredFormats.map((fmt) => {
            const isFmtAudio = fmt.resolution === 'Audio';
            const isSelected = selectedFormat === fmt.format_id;
            return (
              <button
                key={fmt.format_id}
                type="button"
                onClick={() => {
                  setSelectedFormat(fmt.format_id);
                  setIsAudio(isFmtAudio);
                }}
                className="flex items-center justify-between p-3 rounded-2xl transition-all spring-press text-left"
                style={{
                  backgroundColor: isSelected ? 'var(--accent-soft)' : 'var(--bg-surface-muted)',
                  border: isSelected ? '1.5px solid var(--accent)' : '1px solid var(--border-color)',
                  color: 'var(--text-primary)',
                }}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className="p-2 rounded-xl flex-shrink-0"
                    style={{
                      backgroundColor: isSelected ? 'var(--accent)' : 'var(--bg-surface)',
                      color: isSelected ? 'var(--text-on-accent)' : 'var(--text-muted)',
                    }}
                  >
                    {isFmtAudio ? <Music size={16} /> : <Film size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm font-mono">{fmt.resolution}</p>
                      {fmt.filesize_approx ? (
                        <span
                          className="text-[11px] font-mono px-2 py-0.5 rounded-md font-bold"
                          style={{
                            backgroundColor: 'var(--bg-surface)',
                            color: 'var(--accent-text)',
                          }}
                        >
                          ~{(fmt.filesize_approx / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] truncate" style={{ color: 'var(--text-muted)' }}>
                      {fmt.note || 'Direct stream'}
                    </p>
                  </div>
                </div>
                {isSelected && (
                  <div
                    className="w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0 ml-2"
                    style={{ backgroundColor: 'var(--accent)', color: 'var(--text-on-accent)' }}
                  >
                    <Check size={14} strokeWidth={3} />
                  </div>
                )}
              </button>
            );
          })}
        </div>

        {/* Vault Destination Toggle */}
        <div
          onClick={() => setInVault(!inVault)}
          className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all spring-press"
          style={{
            backgroundColor: inVault ? 'var(--accent-vault-soft)' : 'var(--bg-surface-muted)',
            border: inVault ? '1.5px solid var(--accent-vault)' : '1px solid var(--border-color)',
          }}
        >
          <div className="flex items-center gap-3">
            <div
              className="p-2.5 rounded-xl"
              style={{
                backgroundColor: inVault ? 'var(--accent-vault)' : 'var(--bg-surface)',
                color: inVault ? '#FFFFFF' : 'var(--text-muted)',
              }}
            >
              <Shield size={17} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-xs uppercase tracking-wider font-mono" style={{ color: 'var(--text-primary)' }}>
                Store in Private Vault
              </p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                PIN-protected storage & VLC export
              </p>
            </div>
          </div>

          <div
            className="w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 flex-shrink-0"
            style={{ backgroundColor: inVault ? 'var(--accent-vault)' : 'var(--border-strong)' }}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                inVault ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Download action button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-3.5 font-extrabold text-xs uppercase tracking-wider flex items-center justify-center gap-2 spring-press theme-btn-primary"
          style={
            inVault
              ? { backgroundColor: 'var(--accent-vault)', color: '#FFFFFF' }
              : undefined
          }
        >
          {inVault ? (
            <>
              <Lock size={15} strokeWidth={2.6} />
              <span>Save to Private Vault</span>
            </>
          ) : (
            <>
              <Download size={15} strokeWidth={2.6} />
              <span>Start Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default FormatPickerModal;
