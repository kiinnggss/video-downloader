import React, { useState, useEffect } from 'react';
import { Film, Music, Shield, Check, X, Download, Lock } from 'lucide-react';

export function FormatPickerModal({ inspectData, isOpen, onClose, onConfirm }) {
  const [selectedFormat, setSelectedFormat] = useState(
    inspectData?.formats?.[0]?.format_id || 'best'
  );
  const [isAudio, setIsAudio] = useState(false);
  const [inVault, setInVault] = useState(false);
  const [tabFilter, setTabFilter] = useState('all');

  useEffect(() => {
    if (inspectData?.formats?.length) {
      setSelectedFormat(inspectData.formats[0].format_id);
      setIsAudio(inspectData.formats[0].resolution === 'Audio');
    }
  }, [inspectData]);

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bento-card rounded-t-[36px] sm:rounded-[36px] p-6 shadow-2xl border border-slate-200 flex flex-col gap-4.5 text-slate-950 max-h-[90vh] overflow-y-auto no-scrollbar">
        {/* Tactile Sheet Handle */}
        <div className="w-10 h-1 rounded-full bg-slate-300 mx-auto -mt-1 sm:hidden" />

        {/* Header */}
        <div className="flex items-center justify-between pb-2 border-b border-slate-200">
          <div>
            <h3 className="font-mono font-black text-base text-slate-950 tracking-tight uppercase flex items-center gap-1.5">
              <span>Stream Options</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded-full bg-cyan-50 text-cyan-800 border border-cyan-200">
                HQ
              </span>
            </h3>
            <p className="text-xs text-slate-500 truncate max-w-[260px] font-medium pt-0.5">
              {inspectData.title}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-xl bento-card text-slate-500 hover:text-slate-800 transition-colors spring-press"
            aria-label="Close quality picker"
          >
            <X size={16} />
          </button>
        </div>

        {/* Tactile Media Filter Segmented Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 rounded-2xl bg-slate-100 border border-slate-200">
          {[
            { id: 'all', label: 'All Streams' },
            { id: 'video', label: 'Video HQ' },
            { id: 'audio', label: 'Audio MP3' },
          ].map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setTabFilter(tab.id)}
              className={`py-1.5 rounded-xl text-xs font-mono font-semibold transition-all spring-press ${
                tabFilter === tab.id
                  ? 'bg-white text-slate-950 border border-slate-200 shadow-sm'
                  : 'text-slate-500 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
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
                className={`flex items-center justify-between p-3 rounded-2xl transition-all spring-press text-left border ${
                  isSelected
                    ? 'bg-cyan-50/90 border-cyan-400 text-slate-950 shadow-sm'
                    : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-800'
                }`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div
                    className={`p-2 rounded-xl border flex-shrink-0 ${
                      isSelected
                        ? 'bg-cyan-100 text-cyan-800 border-cyan-300'
                        : 'bg-white text-slate-500 border-slate-200'
                    }`}
                  >
                    {isFmtAudio ? <Music size={16} /> : <Film size={16} />}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-slate-950 font-mono">{fmt.resolution}</p>
                      {fmt.filesize_approx ? (
                        <span className="text-[11px] font-mono px-2 py-0.5 rounded-md bg-slate-100 text-emerald-700 font-bold border border-slate-200">
                          ~{(fmt.filesize_approx / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                    <p className="text-[11px] text-slate-500 truncate">{fmt.note || 'Direct stream'}</p>
                  </div>
                </div>
                {isSelected && (
                  <div className="w-6 h-6 rounded-full bg-cyan-600 text-white flex items-center justify-center flex-shrink-0 ml-2 shadow-sm">
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
          className={`flex items-center justify-between p-3.5 rounded-2xl cursor-pointer transition-all border spring-press ${
            inVault
              ? 'bg-amber-50/90 border-amber-300 shadow-sm'
              : 'bg-slate-50 hover:bg-slate-100 border-slate-200'
          }`}
        >
          <div className="flex items-center gap-3">
            <div
              className={`p-2.5 rounded-xl border ${
                inVault
                  ? 'bg-amber-vault text-obsidian border-amber-300 shadow-sm'
                  : 'bg-white text-slate-400 border-slate-200'
              }`}
            >
              <Shield size={17} strokeWidth={2.5} />
            </div>
            <div>
              <p className="font-bold text-xs text-slate-950 uppercase tracking-wider font-mono">
                Store in Private Vault
              </p>
              <p className="text-[11px] text-slate-500">PIN-protected local storage with VLC streaming</p>
            </div>
          </div>

          <div
            className={`w-11 h-6 rounded-full transition-colors relative flex items-center px-0.5 ${
              inVault ? 'bg-amber-vault' : 'bg-slate-200'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-full bg-white shadow-md transform transition-transform ${
                inVault ? 'translate-x-5 bg-obsidian' : 'translate-x-0'
              }`}
            />
          </div>
        </div>

        {/* Download action button */}
        <button
          type="button"
          onClick={handleSubmit}
          className={`w-full py-3.5 rounded-xl font-black text-xs uppercase tracking-wider shadow-sm transition-all flex items-center justify-center gap-2 spring-press ${
            inVault
              ? 'bg-amber-vault hover:bg-amber-400 text-obsidian shadow-sm'
              : 'bg-lime-neon hover:bg-lime-400 text-obsidian shadow-sm'
          }`}
        >
          {inVault ? (
            <>
              <Lock size={15} strokeWidth={2.8} />
              <span>Save to Private Vault</span>
            </>
          ) : (
            <>
              <Download size={15} strokeWidth={2.8} />
              <span>Start Download</span>
            </>
          )}
        </button>
      </div>
    </div>
  );
}

export default FormatPickerModal;
