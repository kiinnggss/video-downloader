import React, { useState, useEffect } from 'react';
import { Film, Music, Shield, Check, X } from 'lucide-react';

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
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-slate-950/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md crystal-card rounded-t-3xl sm:rounded-3xl p-6 shadow-crystal flex flex-col gap-5 text-slate-800">
        <div className="flex items-center justify-between pb-2 border-b border-slate-200/50">
          <div>
            <h3 className="font-semibold text-lg text-slate-900">Select Quality</h3>
            <p className="text-xs text-slate-500 truncate max-w-[260px]">{inspectData.title}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-2 rounded-full hover:bg-slate-200/50 text-slate-400"
            aria-label="Close quality picker"
          >
            <X size={20} />
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
                    ? 'bg-amber-400/20 border border-amber-400/50 shadow-sm' 
                    : 'bg-white/40 hover:bg-white/70 border border-white/40'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div className={`p-2 rounded-xl ${isSelected ? 'bg-amber-400 text-slate-900' : 'bg-slate-100 text-slate-500'}`}>
                    {isFmtAudio ? <Music size={18} /> : <Film size={18} />}
                  </div>
                  <div className="text-left">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-sm text-slate-900">{fmt.resolution}</p>
                      {fmt.filesize_approx ? (
                        <span className="text-[11px] font-mono text-slate-400">
                          ~{(fmt.filesize_approx / (1024 * 1024)).toFixed(1)} MB
                        </span>
                      ) : null}
                    </div>
                    <p className="text-xs text-slate-500">{fmt.note}</p>
                  </div>
                </div>
                {isSelected && <Check size={18} className="text-amber-600 mr-2" />}
              </button>
            );
          })}
        </div>

        {/* Vault Destination Toggle */}
        <div 
          onClick={() => setInVault(!inVault)}
          className="flex items-center justify-between p-3.5 rounded-2xl bg-slate-900/5 hover:bg-slate-900/10 cursor-pointer transition-all border border-slate-900/5"
        >
          <div className="flex items-center gap-3">
            <div className={`p-2 rounded-xl ${inVault ? 'bg-slate-900 text-white' : 'bg-slate-200 text-slate-600'}`}>
              <Shield size={18} />
            </div>
            <div>
              <p className="font-medium text-sm text-slate-900">Save to Private Vault</p>
              <p className="text-xs text-slate-500">PIN-protected space</p>
            </div>
          </div>
          <input 
            type="checkbox" 
            checked={inVault} 
            onChange={(e) => setInVault(e.target.checked)} 
            onClick={(e) => e.stopPropagation()}
            className="w-5 h-5 rounded-md accent-slate-900" 
          />
        </div>

        {/* Download action button */}
        <button
          type="button"
          onClick={handleSubmit}
          className="w-full py-4 rounded-full bg-amber-400 hover:bg-amber-500 active:scale-[0.98] text-slate-950 font-semibold shadow-fab-glow transition-all"
        >
          Start Download
        </button>
      </div>
    </div>
  );
}
