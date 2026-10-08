import React, { useState } from 'react';
import { Lock, Unlock, ShieldAlert, Play, Download } from 'lucide-react';
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
    <div className="flex flex-col gap-6 w-full max-w-md mx-auto px-4 pt-4 pb-28 min-h-[80vh]">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold text-white tracking-tight">Private Folder</h1>
        <div className="p-2 rounded-full bg-white/10 text-white/70">
          {token ? <Unlock size={18} /> : <Lock size={18} />}
        </div>
      </div>

      {!token ? (
        <form onSubmit={handleUnlock} className="flex flex-col items-center justify-center my-auto crystal-card-dark rounded-3xl p-8 gap-5 text-center">
          <div className="p-4 rounded-full bg-white/5 text-amber-400">
            <Lock size={32} />
          </div>
          <div>
            <h3 className="font-semibold text-white text-base">Enter PIN to Unlock</h3>
            <p className="text-xs text-slate-400 mt-1">Default PIN is 1234</p>
          </div>

          <input
            type="password"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="••••"
            className="w-36 text-center tracking-widest text-2xl font-mono py-2 rounded-2xl bg-white/10 border border-white/20 text-white focus:outline-none focus:border-amber-400"
          />

          {errorMsg && <p className="text-xs text-rose-400">{errorMsg}</p>}

          <button
            type="submit"
            disabled={!pin}
            className="w-full py-3.5 rounded-full bg-amber-400 hover:bg-amber-500 font-semibold text-slate-950 text-sm transition-all disabled:opacity-50"
          >
            Unlock Vault
          </button>
        </form>
      ) : (
        <div className="flex flex-col gap-3">
          {vaultFiles.length === 0 ? (
            <div className="crystal-card-dark rounded-3xl p-10 text-center text-slate-400 text-xs">
              No private media files stored in your vault.
            </div>
          ) : (
            vaultFiles.map((file) => (
              <div
                key={file.file_id}
                className="flex items-center justify-between p-3 crystal-card-dark rounded-2xl shadow-sm"
              >
                <div onClick={() => setSelectedMedia(file)} className="flex items-center gap-3 truncate cursor-pointer flex-1">
                  <div className="w-12 h-12 rounded-xl bg-slate-800 flex items-center justify-center text-white flex-shrink-0">
                    <Play size={18} />
                  </div>
                  <div className="truncate">
                    <h4 className="font-medium text-sm text-white truncate">{file.title}</h4>
                    <span className="text-xs text-slate-400 font-mono">
                      {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                    </span>
                  </div>
                </div>

                <a
                  href={`/api/files/${file.file_id}/download`}
                  download={file.filename}
                  className="p-2 rounded-full hover:bg-white/10 text-white/70"
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
