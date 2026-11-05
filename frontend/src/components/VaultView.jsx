import React, { useState } from 'react';
import { Lock, Unlock, Play, Download, Shield } from 'lucide-react';
import { apiClient } from '../api/client';
import { MediaPlayerModal } from './MediaPlayerModal';

export function VaultView() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(null);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);

  const handleUnlock = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    try {
      const res = await apiClient.unlockVault(pin);
      setToken(res.token);
      const files = await apiClient.getVaultFiles(res.token);
      setVaultFiles(files);
    } catch (err) {
      setErrorMsg('Incorrect PIN. Please try again.');
    }
  };

  return (
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-5 pb-28 min-h-[80vh] animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-extrabold text-white tracking-tight">Private Vault</h1>
          <p className="text-xs text-slate-400">Encrypted PIN-secured storage</p>
        </div>
        <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/30 flex items-center justify-center shadow-inner">
          {token ? <Unlock size={18} /> : <Lock size={18} />}
        </div>
      </div>

      {!token ? (
        <form onSubmit={handleUnlock} className="flex flex-col items-center justify-center my-auto glass-cyber rounded-[32px] p-8 gap-5 text-center border border-cyan-500/30 shadow-2xl">
          <div className="w-16 h-16 rounded-2xl bg-cyan-500/20 text-cyan-300 border border-cyan-400/40 flex items-center justify-center shadow-inner">
            <Lock size={30} className="drop-shadow-sm" />
          </div>
          <div>
            <h3 className="font-extrabold text-white text-base">Enter PIN to Unlock</h3>
            <p className="text-xs text-slate-400 mt-1">Default PIN is <span className="font-mono text-cyan-400 font-semibold">1234</span></p>
          </div>

          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-40 text-center tracking-widest text-2xl font-mono py-2.5 rounded-2xl glass-cyber-input border border-cyan-500/40 text-white focus:outline-none focus:border-cyan-400 focus:ring-2 focus:ring-cyan-500/20 shadow-inner"
          />

          {errorMsg && <p className="text-xs text-rose-400 font-medium">{errorMsg}</p>}

          <button
            type="submit"
            disabled={!pin}
            className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-cyan-400 via-blue-500 to-indigo-600 hover:from-cyan-300 hover:via-blue-400 hover:to-indigo-500 font-bold text-slate-950 text-xs shadow-md shadow-cyan-500/25 transition-all disabled:opacity-40 active:scale-95"
          >
            Unlock Vault
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {vaultFiles.length === 0 ? (
            <div className="glass-cyber rounded-3xl p-10 text-center text-slate-400 text-xs border border-cyan-500/20">
              No private media files stored in your vault.
            </div>
          ) : (
            vaultFiles.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-3 glass-cyber rounded-2xl border border-white/10 hover:border-cyan-400/40 transition-all shadow-sm"
              >
                <div onClick={() => setSelectedMedia(file)} className="flex items-center gap-3 truncate cursor-pointer flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-950 border border-white/10 flex items-center justify-center text-cyan-400 flex-shrink-0">
                    <Play size={18} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-semibold text-sm text-white truncate">{file.title}</h4>
                    <span className="text-xs text-cyan-400/80 font-mono">
                      {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="p-2 rounded-full glass-cyber text-slate-400 hover:text-white transition-colors"
                  title="Save to Phone"
                >
                  <Download size={16} />
                </a>
              </div>
            ))
          )}
        </div>
      )}

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={!!selectedMedia}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

export default VaultView;
