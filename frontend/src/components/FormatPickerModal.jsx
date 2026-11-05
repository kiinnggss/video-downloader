import React, { useState, useEffect } from 'react';
import { Film, Music, Shield, Check, X, Download } from 'lucide-react';

export function FormatPickerModal({ inspectData, isOpen, onClose, onConfirm }) {
  const [selectedFormat, setSelectedFormat] = useState(
    inspectData?.formats?.[0]?.format_id || 'best'
  );
  const [isAudio, setIsAudio] = useState(false);
  const [inVault, setInVault] = useState(false);

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

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/80 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md glass-cyber rounded-t-[32px] sm:rounded-[32px] p-6 shadow-2xl border border-cyan-500/30 flex flex-col gap-5 text-white">
        <div className="flex items-center justify-between pb-3 border-b border-white/10">
          <div>
            <h3 className="font-extrabold text-lg text-white">Select Stream Quality</h3>
            <p className="text-xs text-slate-400 truncate max-w-[260px]">{inspectData.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close quality picker"
          >
            <X size={18} />
          </button>
        </div>

        {/* Formats list */}
        <div className="flex flex-col gap-2 max-h-60 overflow-y-auto pr-1">
          {inspectData.formats?.map((fmt) => {
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
                className={`flex items-center justify-between p-3.5 rounded-2xl transition-all ${
                  isSelected 
                    ? 'bg-cyan-500/20 border border-cyan-400 text-white shadow-[0_0_15px_rgba(56,189,248,0.25)]' 
                    : 'bg-black/30 hover:bg-black/50 border border-white/10 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl border ${isSelected ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/40' : 'bg-white/5 text-slate-400 border-white/10'}`}>
                    {isFmtAudio ? <Music size={18} /> : <Film size={18} />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-bold text-sm text-white">{fmt.resolution}</p>
                      {fmt.filesize_approx ? (
                        <span className="text-[11px] font-mono text-cyan-400/80">
                          ~{(fmt.filesize_approx / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-400">{fmt.note}</p>
                  </div>
                </div>
                {isSelected && <Check size={18} className="text-cyan-400 mr-2 drop-shadow" />}
              </button>
            );
          })}
        </div>

        {/* Vault Destination Toggle */}
        <div 
          onClick={() => setInVault(!inVault)}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-black/40 hover:bg-black/60 cursor-pointer transition-all border border-white/10"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl border ${inVault ? 'bg-cyan-500/30 text-cyan-300 border-cyan-400/40' : 'bg-white/5 text-slate-400 border-white/10'}`}>
              <Shield size={18} />
            </div>
            <div>
              <p className="font-bold text-sm text-white">Save to Private Vault</p>
              <p className="text-xs text-slate-400">PIN-protected space</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={inVault} 
            onChange={(e) => setInVault(e.target.checked)} 
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded-md accent-cyan-400 cursor-pointer" 
          />
        </div>

        {/* Download action button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 active:scale-[0.98] text-slate-950 font-extrabold text-sm shadow-lg shadow-cyan-500/25 transition-all flex items-center justify-center gap-2"
        >
          {inVault ? (
            <>
              <Shield size={18} strokeWidth={2.5} />
              <span>Save to Private Vault</span>
            </>
          ) : (
            <>
              <Download size={18} strokeWidth={2.5} />
              <span>Download Straight to Phone</span>
            </>
          )}
        </button>
        <p className="text-[11px] text-center text-slate-400 -mt-2">
          {inVault 
            ? 'Encrypts and stores securely inside your private vault.' 
            : 'Streams directly into your phone storage with high-speed multi-threading.'}
        </p>
      </div>
    </div>
  );
}

export default FormatPickerModal;
