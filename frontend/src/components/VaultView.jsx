import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
  Unlock,
  Play,
  Download,
  Shield,
  Key,
  Plus,
  Trash2,
  CheckSquare,
  Square,
  AlertCircle,
  Check,
  X,
  Loader2,
  FileVideo,
  FileAudio,
  Radio,
  Copy,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { MediaPlayerModal } from './MediaPlayerModal';
import {
  saveLocalVaultMedia,
  listLocalVaultMedia,
  deleteLocalVaultMedia,
} from '../utils/vaultStorage';

export function VaultView() {
  const [pin, setPin] = useState('');
  const [token, setToken] = useState(null);
  const [vaultFiles, setVaultFiles] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [selectedMedia, setSelectedMedia] = useState(null);
  const [loading, setLoading] = useState(false);
  const [hasPinConfigured, setHasPinConfigured] = useState(true);
  const [checkingPinStatus, setCheckingPinStatus] = useState(true);

  // New PIN setup state for devices without a PIN
  const [setupPin, setSetupPin] = useState('');
  const [setupConfirmPin, setSetupConfirmPin] = useState('');

  // Change PIN modal state
  const [isChangePinOpen, setIsChangePinOpen] = useState(false);
  const [currentPinInput, setCurrentPinInput] = useState('');
  const [newPinInput, setNewPinInput] = useState('');
  const [confirmPinInput, setConfirmPinInput] = useState('');

  // Multi-selection state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);

  // VLC modal state
  const [vlcModalOpen, setVlcModalOpen] = useState(false);
  const [vlcCopied, setVlcCopied] = useState(false);

  const fileInputRef = useRef(null);

  // Check whether device already has a PIN
  useEffect(() => {
    async function checkPin() {
      try {
        const res = await apiClient.checkVaultPinStatus();
        setHasPinConfigured(Boolean(res.has_pin));
      } catch (err) {
        console.error('Failed to check PIN status:', err);
      } finally {
        setCheckingPinStatus(false);
      }
    }
    checkPin();
  }, []);

  const loadVaultFiles = async (authToken) => {
    try {
      const activeToken = authToken || token;
      if (!activeToken) return;
      const remoteFiles = await apiClient.getVaultFiles(activeToken);
      
      // Also check local IndexedDB files to ensure device persistence
      const localRecords = await listLocalVaultMedia();
      const localMap = new Map(localRecords.map((r) => [String(r.file_id), r]));

      const combined = remoteFiles.map((file) => {
        const local = localMap.get(String(file.file_id));
        return {
          ...file,
          isStoredLocally: Boolean(local),
          localBlob: local?.blob || null,
        };
      });

      setVaultFiles(combined);
    } catch (err) {
      console.error('Failed to load vault files:', err);
    }
  };

  const handleUnlock = async (e) => {
    e?.preventDefault();
    const cleanPin = String(pin || '').trim();
    if (!cleanPin) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiClient.unlockVault(cleanPin);
      setToken(res.token);
      await loadVaultFiles(res.token);
    } catch (err) {
      setErrorMsg('Incorrect PIN for this device. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInitialPinSetup = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const cleanPin = String(setupPin || '').trim();
    const cleanConfirm = String(setupConfirmPin || '').trim();
    if (cleanPin.length < 4) {
      setErrorMsg('PIN must be at least 4 digits');
      return;
    }
    if (cleanPin !== cleanConfirm) {
      setErrorMsg('PINs do not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.setVaultPin(cleanPin);
      setHasPinConfigured(true);
      // Automatically unlock with the chosen PIN
      const res = await apiClient.unlockVault(cleanPin);
      setToken(res.token);
      await loadVaultFiles(res.token);
      setSuccessMsg('Device PIN successfully set');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to configure PIN');
    } finally {
      setLoading(false);
    }
  };

  const handleChangePinSubmit = async (e) => {
    e?.preventDefault();
    setErrorMsg('');
    const cleanCurrent = String(currentPinInput || '').trim();
    const cleanNew = String(newPinInput || '').trim();
    const cleanConfirm = String(confirmPinInput || '').trim();
    if (!cleanCurrent) {
      setErrorMsg('Current PIN is required');
      return;
    }
    if (cleanNew.length < 4) {
      setErrorMsg('New PIN must be at least 4 digits');
      return;
    }
    if (cleanNew !== cleanConfirm) {
      setErrorMsg('New PIN confirmation does not match');
      return;
    }

    setLoading(true);
    try {
      await apiClient.setVaultPin(cleanNew, cleanCurrent);
      setIsChangePinOpen(false);
      setCurrentPinInput('');
      setNewPinInput('');
      setConfirmPinInput('');
      setSuccessMsg('Vault PIN updated successfully');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to change PIN');
    } finally {
      setLoading(false);
    }
  };

  // Import media from local device into vault
  const handleFileUpload = async (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length || !token) return;

    setLoading(true);
    setErrorMsg('');
    try {
      for (const file of files) {
        const uploadedRecord = await apiClient.uploadVaultFile(file, token);
        await saveLocalVaultMedia(uploadedRecord.file_id, file, {
          title: file.name,
          filename: file.name,
          category: file.type.startsWith('audio') ? 'music' : 'video',
          filesize: file.size,
        });
      }
      await loadVaultFiles();
      setSuccessMsg(`Imported ${files.length} item(s) into vault`);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to upload file to vault');
    } finally {
      setLoading(false);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    }
  };

  // Delete single file from both backend and local IndexedDB
  const handleDeleteFile = async (e, fileId) => {
    e?.stopPropagation();
    if (!window.confirm('Delete this file from your private vault?')) return;
    setLoading(true);
    try {
      await apiClient.deleteFile(fileId, token);
      await deleteLocalVaultMedia(fileId);
      await loadVaultFiles();
      setSelectedIds((prev) => prev.filter((id) => id !== fileId));
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  // Toggle selection for an item
  const toggleSelectId = (e, fileId) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  // Batch delete selected files
  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!window.confirm(`Delete ${selectedIds.length} item(s) from your private vault?`)) return;
    setLoading(true);
    try {
      for (const id of selectedIds) {
        await apiClient.deleteFile(id, token);
        await deleteLocalVaultMedia(id);
      }
      setSelectedIds([]);
      await loadVaultFiles();
      setSuccessMsg('Selected items deleted');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete selected items');
    } finally {
      setLoading(false);
    }
  };

  const playlistUrl = apiClient.getVaultPlaylistUrl(token, selectedIds);
  const fullPlaylistUrl =
    typeof window !== 'undefined' ? `${window.location.origin}${playlistUrl}` : playlistUrl;

  const handleCopyVlcUrl = () => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(fullPlaylistUrl);
      setVlcCopied(true);
      setTimeout(() => setVlcCopied(false), 2500);
    }
  };

  if (checkingPinStatus) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] gap-3">
        <Loader2 size={24} className="animate-spin text-amber-500" />
        <span className="text-xs text-slate-500 font-mono">Securing vault environment...</span>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 min-h-[80vh] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-extrabold text-slate-950 tracking-tight">
              Private Vault
            </h1>
            <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-800 border border-amber-200">
              {token ? 'UNLOCKED' : 'PIN LOCKED'}
            </span>
          </div>
          <p className="text-xs text-slate-500 font-medium pt-0.5">
            Local device media storage with VLC playlist export
          </p>
        </div>

        {token && (
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={() => setIsChangePinOpen(true)}
              className="p-2 rounded-xl bento-card text-slate-600 hover:text-amber-600 transition-colors spring-press border border-slate-200"
              title="Change Vault PIN"
              aria-label="Change Vault PIN"
            >
              <Key size={16} />
            </button>
            <button
              type="button"
              onClick={() => setToken(null)}
              className="p-2 rounded-xl bento-card text-slate-600 hover:text-rose-600 transition-colors spring-press border border-slate-200"
              title="Lock Vault"
              aria-label="Lock Vault"
            >
              <Lock size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 text-xs">
          <AlertCircle size={15} />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div className="flex items-center gap-2 p-3.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-mono">
          <Check size={15} />
          <span>{successMsg}</span>
        </div>
      )}

      {/* INITIAL PIN SETUP SCREEN */}
      {!token && !hasPinConfigured ? (
        <form
          onSubmit={handleInitialPinSetup}
          className="flex flex-col items-center justify-center my-auto bento-card rounded-3xl p-7 gap-5 text-center border border-amber-200/90 shadow-lg"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-center shadow-md">
            <Key size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-extrabold text-slate-950 text-base tracking-tight">
              Create Device PIN
            </h3>
            <p className="text-xs text-slate-500 max-w-xs leading-relaxed">
              Choose a 4 to 6 digit PIN to lock and protect private media on this device.
            </p>
          </div>

          <div className="flex flex-col gap-3 w-full max-w-xs">
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={setupPin}
              onChange={(e) => setSetupPin(e.target.value)}
              placeholder="Enter 4 to 6 digit PIN"
              className="w-full text-center tracking-[0.35em] placeholder:tracking-normal placeholder:text-xs placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 text-lg font-mono font-bold py-3 px-4 rounded-2xl bento-command-bar border border-slate-200 text-slate-950 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={setupConfirmPin}
              onChange={(e) => setSetupConfirmPin(e.target.value)}
              placeholder="Confirm your PIN"
              className="w-full text-center tracking-[0.35em] placeholder:tracking-normal placeholder:text-xs placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 text-lg font-mono font-bold py-3 px-4 rounded-2xl bento-command-bar border border-slate-200 text-slate-950 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !setupPin || !setupConfirmPin}
            className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200/90 disabled:shadow-none text-amber-400 font-bold text-xs uppercase tracking-wider shadow-md transition-all spring-press"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin mx-auto text-amber-400" />
            ) : (
              'Set Device PIN & Unlock'
            )}
          </button>
        </form>
      ) : null}

      {/* UNLOCK SCREEN */}
      {!token && hasPinConfigured ? (
        <form
          onSubmit={handleUnlock}
          className="flex flex-col items-center justify-center my-auto bento-card rounded-3xl p-8 gap-5 text-center border border-amber-200/90 shadow-lg"
        >
          <div className="w-14 h-14 rounded-2xl bg-slate-950 text-amber-400 border border-slate-800 flex items-center justify-center shadow-md">
            <Lock size={24} />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-950 text-base tracking-tight">
              Enter Device PIN
            </h3>
            <p className="text-xs text-slate-500 mt-1">
              Unlock your private media vault on this device
            </p>
          </div>

          <input
            type="password"
            inputMode="numeric"
            pattern="[0-9]*"
            maxLength={6}
            value={pin}
            onChange={(e) => setPin(e.target.value)}
            placeholder="Enter PIN"
            className="w-52 text-center tracking-[0.4em] placeholder:tracking-normal placeholder:text-xs placeholder:font-sans placeholder:font-medium placeholder:text-slate-400 text-xl font-mono font-bold py-3 px-4 rounded-2xl bento-command-bar border border-slate-200 text-slate-950 focus:outline-none focus:border-amber-500 focus:ring-4 focus:ring-amber-500/15"
          />

          <button
            type="submit"
            disabled={loading || !pin}
            className="w-full py-3.5 rounded-2xl bg-slate-950 hover:bg-slate-800 disabled:bg-slate-100 disabled:text-slate-400 disabled:border disabled:border-slate-200/90 disabled:shadow-none text-amber-400 font-bold text-xs uppercase tracking-wider shadow-md transition-all spring-press"
          >
            {loading ? (
              <Loader2 size={15} className="animate-spin mx-auto text-amber-400" />
            ) : (
              'Unlock Vault'
            )}
          </button>
        </form>
      ) : null}

      {/* UNLOCKED VAULT CONTENT */}
      {token && (
        <div className="flex flex-col gap-4">
          {/* Action Toolbar */}
          <div className="flex items-center justify-between gap-2">
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileUpload}
                multiple
                accept="video/*,audio/*"
                className="hidden"
              />
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                disabled={loading}
                className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-slate-950 hover:bg-slate-800 text-amber-400 font-bold text-xs tracking-wide shadow-sm spring-press"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>Import Local Media</span>
              </button>
            </div>

            <div className="flex items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  setIsSelectMode(!isSelectMode);
                  setSelectedIds([]);
                }}
                className={`flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-mono font-semibold transition-all spring-press ${
                  isSelectMode
                    ? 'bg-slate-200 text-slate-900 border-slate-300'
                    : 'bento-card text-slate-600 hover:text-slate-900 border-slate-200'
                }`}
              >
                {isSelectMode ? <CheckSquare size={13} /> : <Square size={13} />}
                <span>{isSelectMode ? 'Exit Select' : 'Select'}</span>
              </button>
            </div>
          </div>

          {/* Vault Files List */}
          <div className="flex flex-col gap-2.5">
            {vaultFiles.length === 0 ? (
              <div className="bento-card rounded-3xl p-10 text-center text-slate-500 text-xs border border-slate-200 flex flex-col items-center gap-2">
                <Shield size={28} className="text-amber-500 mb-1" />
                <span className="font-semibold text-slate-800">Your Private Vault is empty</span>
                <span className="text-[11px] text-slate-500 max-w-xs">
                  Tap "Import Local Media" to move videos or audio from your phone or device into this vault.
                </span>
              </div>
            ) : (
              vaultFiles.map((file) => {
                const isSelected = selectedIds.includes(file.file_id);
                return (
                  <div
                    key={file.file_id}
                    className={`flex items-center justify-between p-3.5 bento-card rounded-2xl transition-all border spring-press ${
                      isSelected
                        ? 'border-amber-500 bg-amber-50/70 shadow-sm'
                        : 'border-slate-200/90 hover:border-amber-400'
                    }`}
                  >
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelectId(e, file.file_id)}
                        className="p-1 mr-2 text-amber-600"
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} className="text-slate-400" />}
                      </button>
                    )}

                    <div
                      onClick={() => {
                        if (isSelectMode) {
                          toggleSelectId(null, file.file_id);
                        } else {
                          setSelectedMedia({
                            ...file,
                            stream_url: `/api/files/${file.file_id}/stream?token=${encodeURIComponent(token)}`,
                          });
                        }
                      }}
                      className="flex items-center gap-3 truncate cursor-pointer flex-1"
                    >
                      <div className="w-12 h-12 rounded-xl bg-slate-900 border border-slate-200 flex items-center justify-center text-amber-400 flex-shrink-0 shadow-inner">
                        {file.category === 'music' ? (
                          <FileAudio size={18} />
                        ) : (
                          <FileVideo size={18} />
                        )}
                      </div>
                      <div className="truncate pr-2">
                        <h4 className="font-bold text-xs text-slate-950 truncate leading-snug">
                          {file.title}
                        </h4>
                        <div className="flex items-center gap-2 pt-0.5">
                          <span className="text-[10px] font-mono px-1.5 py-0.2 rounded bg-slate-100 text-amber-700 font-semibold border border-slate-200">
                            {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          {file.isStoredLocally && (
                            <span className="text-[9px] font-mono px-1.5 py-0.2 rounded bg-emerald-100 text-emerald-800 font-bold">
                              LOCAL DEVICE
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() =>
                          setSelectedMedia({
                            ...file,
                            stream_url: `/api/files/${file.file_id}/stream?token=${encodeURIComponent(token)}`,
                          })
                        }
                        className="p-2 rounded-xl bento-card text-amber-700 hover:text-amber-900 transition-colors spring-press border border-amber-300"
                        title="Play"
                        aria-label="Play media"
                      >
                        <Play size={14} />
                      </button>

                      <a
                        href={`/api/files/${file.file_id}/download?token=${encodeURIComponent(token)}`}
                        download={file.filename}
                        className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 border border-slate-200 transition-all spring-press"
                        title="Save to Phone / Device"
                        aria-label="Save to Device"
                      >
                        <Download size={13} strokeWidth={2.2} />
                      </a>

                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(e, file.file_id)}
                        className="p-2 rounded-xl bg-slate-100 text-slate-500 hover:bg-rose-50 hover:text-rose-600 border border-slate-200 hover:border-rose-300 transition-all spring-press"
                        title="Delete from Vault"
                        aria-label="Delete from Vault"
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* MULTI-SELECT FLOATING ACTION BAR */}
      {token && isSelectMode && selectedIds.length > 0 && (
        <div className="fixed bottom-24 left-4 right-4 z-40 flex justify-center">
          <div className="w-full max-w-md bento-card rounded-2xl p-3 border border-amber-400 shadow-xl flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold text-amber-800 px-2">
              {selectedIds.length} SELECTED
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVlcModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-vault hover:bg-amber-400 text-obsidian font-mono font-bold text-xs uppercase tracking-wider spring-press"
              >
                <Radio size={13} strokeWidth={2.5} />
                <span>Play in VLC</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className="flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-100 hover:bg-rose-200 text-rose-800 border border-rose-300 font-mono font-bold text-xs uppercase spring-press"
              >
                <Trash2 size={13} />
                <span>Delete</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VLC PLAYLIST / STREAM MODAL */}
      {vlcModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-sm bento-card rounded-3xl p-6 border border-amber-300 shadow-2xl flex flex-col gap-4 text-slate-950">
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Radio size={18} className="text-amber-600" />
                <h3 className="font-mono font-black text-sm uppercase">Play in VLC</h3>
              </div>
              <button
                type="button"
                onClick={() => setVlcModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs text-slate-600 leading-relaxed">
              Open your selected media inside external players like VLC or MX Player with authorized streaming tokens.
            </p>

            <a
              href={playlistUrl}
              download="vault-playlist.m3u"
              className="w-full py-3 rounded-xl bg-amber-vault hover:bg-amber-400 text-obsidian font-mono font-black text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-sm spring-press"
            >
              <Download size={14} strokeWidth={2.8} />
              <span>Download M3U Playlist for VLC</span>
            </a>

            <button
              type="button"
              onClick={handleCopyVlcUrl}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-mono font-semibold text-xs flex items-center justify-center gap-2 border border-slate-200 spring-press"
            >
              {vlcCopied ? (
                <>
                  <Check size={14} className="text-emerald-600" />
                  <span className="text-emerald-700">Link Copied!</span>
                </>
              ) : (
                <>
                  <Copy size={14} />
                  <span>Copy Stream URL for VLC</span>
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* CHANGE PIN MODAL */}
      {isChangePinOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <form
            onSubmit={handleChangePinSubmit}
            className="w-full max-w-sm bento-card rounded-3xl p-6 border border-amber-300 shadow-2xl flex flex-col gap-4 text-slate-950"
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-2">
              <div className="flex items-center gap-2">
                <Key size={18} className="text-amber-600" />
                <h3 className="font-mono font-black text-sm uppercase">Change Vault PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePinOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700"
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-mono text-slate-600">Current PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                placeholder="Current PIN"
                className="w-full py-2 px-3 rounded-xl bento-command-bar border border-slate-200 text-sm font-mono text-slate-950 focus:outline-none focus:border-amber-500"
              />

              <label className="text-[11px] font-mono text-slate-600 pt-1">New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="New 4-digit PIN"
                className="w-full py-2 px-3 rounded-xl bento-command-bar border border-slate-200 text-sm font-mono text-slate-950 focus:outline-none focus:border-amber-500"
              />

              <label className="text-[11px] font-mono text-slate-600 pt-1">Confirm New PIN</label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                placeholder="Confirm new PIN"
                className="w-full py-2 px-3 rounded-xl bento-command-bar border border-slate-200 text-sm font-mono text-slate-950 focus:outline-none focus:border-amber-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !currentPinInput || !newPinInput || !confirmPinInput}
              className="w-full py-3 rounded-xl bg-amber-vault hover:bg-amber-400 disabled:opacity-30 text-obsidian font-mono font-black text-xs uppercase tracking-wider shadow-sm transition-all spring-press mt-2"
            >
              {loading ? <Loader2 size={14} className="animate-spin mx-auto text-obsidian" /> : 'Save New PIN'}
            </button>
          </form>
        </div>
      )}

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={Boolean(selectedMedia)}
        onClose={() => setSelectedMedia(null)}
      />
    </div>
  );
}

export default VaultView;
