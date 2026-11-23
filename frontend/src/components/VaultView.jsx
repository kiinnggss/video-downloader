import React, { useState, useEffect, useRef } from 'react';
import {
  Lock,
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
  Palette,
  Delete,
} from 'lucide-react';
import { apiClient } from '../api/client';
import { MediaPlayerModal } from './MediaPlayerModal';
import {
  saveLocalVaultMedia,
  listLocalVaultMedia,
  deleteLocalVaultMedia,
} from '../utils/vaultStorage';

const PIN_LEN_STORAGE_KEY = 'crystal_vault_pin_len';
const KEYPAD_KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', 'Clear', '0', 'Back'];

export function VaultView({ onOpenThemeModal }) {
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

  // Multi-selection & inline 2-tap confirm delete state
  const [isSelectMode, setIsSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDeleteId, setConfirmDeleteId] = useState(null);
  const [confirmBatchDelete, setConfirmBatchDelete] = useState(false);

  // VLC modal state
  const [vlcModalOpen, setVlcModalOpen] = useState(false);
  const [vlcCopied, setVlcCopied] = useState(false);

  const fileInputRef = useRef(null);
  const activeObjectUrlRef = useRef(null);

  const revokeActiveObjectUrl = () => {
    if (activeObjectUrlRef.current) {
      URL.revokeObjectURL(activeObjectUrlRef.current);
      activeObjectUrlRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      revokeActiveObjectUrl();
    };
  }, []);

  useEffect(() => {
    if (!confirmDeleteId) return undefined;
    const timer = setTimeout(() => setConfirmDeleteId(null), 3000);
    return () => clearTimeout(timer);
  }, [confirmDeleteId]);

  useEffect(() => {
    if (!confirmBatchDelete) return undefined;
    const timer = setTimeout(() => setConfirmBatchDelete(false), 3000);
    return () => clearTimeout(timer);
  }, [confirmBatchDelete]);

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

      // Merge IndexedDB local records for instant offline playback
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

  const attemptUnlock = async (pinCandidate) => {
    const cleanPin = String(pinCandidate || '').trim();
    if (cleanPin.length < 4 || loading) return;
    setErrorMsg('');
    setLoading(true);
    try {
      const res = await apiClient.unlockVault(cleanPin);
      if (typeof window !== 'undefined') {
        localStorage.setItem(PIN_LEN_STORAGE_KEY, String(cleanPin.length));
      }
      setToken(res.token);
      setPin('');
      await loadVaultFiles(res.token);
    } catch {
      setErrorMsg('Incorrect PIN for this device. Please try again.');
      setPin('');
    } finally {
      setLoading(false);
    }
  };

  const handleUnlock = async (e) => {
    e?.preventDefault();
    await attemptUnlock(pin);
  };

  const handleKeypadPress = (keyVal) => {
    if (loading) return;
    setErrorMsg('');
    if (keyVal === 'Clear') {
      setPin('');
      return;
    }
    if (keyVal === 'Back') {
      setPin((prev) => prev.slice(0, -1));
      return;
    }
    setPin((prev) => {
      if (prev.length >= 6) return prev;
      const next = prev + keyVal;
      const savedLen =
        typeof window !== 'undefined' ? Number(localStorage.getItem(PIN_LEN_STORAGE_KEY) || 0) : 0;
      if (savedLen === 4 && next.length === 4) {
        setTimeout(() => attemptUnlock(next), 90);
      }
      return next;
    });
  };

  // Optional physical keyboard support on Unlock screen
  useEffect(() => {
    if (token || !hasPinConfigured || checkingPinStatus) return undefined;
    const onKeyDown = (e) => {
      if (e.target && ['INPUT', 'TEXTAREA'].includes(e.target.tagName)) return;
      if (/^[0-9]$/.test(e.key)) {
        handleKeypadPress(e.key);
      } else if (e.key === 'Backspace') {
        handleKeypadPress('Back');
      } else if (e.key === 'Enter' && pin.length >= 4) {
        attemptUnlock(pin);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  });

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
      if (typeof window !== 'undefined') {
        localStorage.setItem(PIN_LEN_STORAGE_KEY, String(cleanPin.length));
      }
      setHasPinConfigured(true);
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
      if (typeof window !== 'undefined') {
        localStorage.setItem(PIN_LEN_STORAGE_KEY, String(cleanNew.length));
      }
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

  // Import media from local device into vault + IndexedDB
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

  // 2-tap inline delete single file from backend & local IndexedDB
  const handleDeleteFile = async (e, fileId) => {
    e?.stopPropagation();
    if (confirmDeleteId !== fileId) {
      setConfirmDeleteId(fileId);
      return;
    }
    setConfirmDeleteId(null);
    setLoading(true);
    try {
      await apiClient.deleteFile(fileId, token);
      await deleteLocalVaultMedia(fileId);
      await loadVaultFiles();
      setSelectedIds((prev) => prev.filter((id) => id !== fileId));
      setSuccessMsg('Deleted from Private Vault');
      setTimeout(() => setSuccessMsg(''), 2500);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete file');
    } finally {
      setLoading(false);
    }
  };

  const toggleSelectId = (e, fileId) => {
    e?.stopPropagation();
    setSelectedIds((prev) =>
      prev.includes(fileId) ? prev.filter((id) => id !== fileId) : [...prev, fileId]
    );
  };

  // 2-tap inline batch delete
  const handleBatchDelete = async () => {
    if (!selectedIds.length) return;
    if (!confirmBatchDelete) {
      setConfirmBatchDelete(true);
      return;
    }
    setConfirmBatchDelete(false);
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

  const openVaultMedia = (file) => {
    revokeActiveObjectUrl();
    if (file.localBlob) {
      const objectUrl = URL.createObjectURL(file.localBlob);
      activeObjectUrlRef.current = objectUrl;
      setSelectedMedia({
        ...file,
        stream_url: objectUrl,
        download_url: objectUrl,
      });
      return;
    }
    const authParam = `token=${encodeURIComponent(token || '')}`;
    setSelectedMedia({
      ...file,
      stream_url: `/api/files/${file.file_id}/stream?${authParam}`,
      download_url: `/api/files/${file.file_id}/download?${authParam}`,
    });
  };

  const closeVaultMedia = () => {
    revokeActiveObjectUrl();
    setSelectedMedia(null);
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
        <Loader2 size={24} className="animate-spin" style={{ color: 'var(--accent-vault)' }} />
        <span className="text-xs font-mono" style={{ color: 'var(--canvas-text-muted)' }}>
          Securing vault environment...
        </span>
      </div>
    );
  }

  const dotCount = Math.max(4, Math.min(6, pin.length || 4));

  return (
    <div className="flex flex-col gap-5 w-full max-w-md mx-auto px-4 pt-5 pb-28 min-h-[80vh] animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <h1
              className="font-display text-xl font-extrabold tracking-tight truncate"
              style={{ color: 'var(--canvas-text)' }}
            >
              Private Vault
            </h1>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full flex-shrink-0"
              style={{
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--accent-vault-text)',
                border: '1px solid var(--border-color)',
              }}
            >
              {token ? 'UNLOCKED' : 'PIN LOCKED'}
            </span>
          </div>
          <p className="text-xs pt-0.5" style={{ color: 'var(--canvas-text-muted)' }}>
            Offline IndexedDB storage & VLC export
          </p>
        </div>

        <div className="flex items-center gap-1.5 flex-shrink-0">
          {onOpenThemeModal && (
            <button
              type="button"
              onClick={onOpenThemeModal}
              className="p-2.5 surface-card spring-press"
              style={{ borderRadius: 'var(--radius-button)', color: 'var(--accent-text)' }}
              aria-label="Open theme switcher"
              title="Appearance"
            >
              <Palette size={15} />
            </button>
          )}
          {token && (
            <>
              <button
                type="button"
                onClick={() => setIsChangePinOpen(true)}
                className="p-2.5 surface-card spring-press"
                style={{ borderRadius: 'var(--radius-button)', color: 'var(--accent-vault-text)' }}
                title="Change Vault PIN"
                aria-label="Change Vault PIN"
              >
                <Key size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  revokeActiveObjectUrl();
                  setToken(null);
                  setPin('');
                }}
                className="p-2.5 surface-card spring-press"
                style={{ borderRadius: 'var(--radius-button)', color: 'var(--text-primary)' }}
                title="Lock Vault"
                aria-label="Lock Vault"
              >
                <Lock size={15} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* Notifications */}
      {errorMsg && (
        <div className="flex items-center gap-2 p-3.5 surface-card border-rose-400/70 text-rose-500 text-xs font-semibold">
          <AlertCircle size={15} className="flex-shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {successMsg && (
        <div
          className="flex items-center gap-2 p-3.5 surface-card text-xs font-bold"
          style={{ color: 'var(--accent-text)' }}
        >
          <Check size={15} className="flex-shrink-0" />
          <span>{successMsg}</span>
        </div>
      )}

      {/* INITIAL PIN SETUP SCREEN */}
      {!token && !hasPinConfigured ? (
        <form
          onSubmit={handleInitialPinSetup}
          className="flex flex-col items-center justify-center my-auto surface-card p-7 gap-5 text-center"
        >
          <div
            className="w-14 h-14 rounded-2xl flex items-center justify-center"
            style={{
              backgroundColor: 'var(--accent-vault-soft)',
              color: 'var(--accent-vault-text)',
            }}
          >
            <Key size={24} />
          </div>
          <div className="flex flex-col gap-1">
            <h3 className="font-display font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Create Device PIN
            </h3>
            <p className="text-xs max-w-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
              Choose a 4 to 6 digit PIN to lock private videos and audio on this device.
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
              className="w-full text-center tracking-[0.35em] placeholder:tracking-normal placeholder:text-xs placeholder:font-sans text-lg font-mono font-bold py-3 px-4 rounded-2xl surface-input focus:outline-none"
            />
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={setupConfirmPin}
              onChange={(e) => setSetupConfirmPin(e.target.value)}
              placeholder="Confirm your PIN"
              className="w-full text-center tracking-[0.35em] placeholder:tracking-normal placeholder:text-xs placeholder:font-sans text-lg font-mono font-bold py-3 px-4 rounded-2xl surface-input focus:outline-none"
            />
          </div>

          <button
            type="submit"
            disabled={loading || !setupPin || !setupConfirmPin}
            className="w-full py-3.5 text-xs font-extrabold uppercase tracking-wider spring-press theme-btn-primary"
          >
            {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Set Device PIN & Unlock'}
          </button>
        </form>
      ) : null}

      {/* UNLOCK SCREEN WITH TACTILE NUMERIC KEYPAD */}
      {!token && hasPinConfigured ? (
        <form
          onSubmit={handleUnlock}
          className="flex flex-col items-center justify-center my-auto surface-card p-6 gap-5 text-center"
        >
          <div className="flex flex-col items-center gap-2">
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                backgroundColor: 'var(--accent-vault-soft)',
                color: 'var(--accent-vault-text)',
              }}
            >
              <Lock size={22} />
            </div>
            <h3 className="font-display font-extrabold text-base" style={{ color: 'var(--text-primary)' }}>
              Enter Device PIN
            </h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Tap your 4 to 6 digit PIN to unlock
            </p>
          </div>

          {/* PIN Dot Display */}
          <div className="flex items-center justify-center gap-3 py-1" aria-label={`Entered ${pin.length} digits`}>
            {Array.from({ length: dotCount }).map((_, idx) => {
              const filled = idx < pin.length;
              return (
                <span
                  key={idx}
                  className="w-3.5 h-3.5 rounded-full transition-all duration-150"
                  style={{
                    backgroundColor: filled ? 'var(--accent-vault)' : 'transparent',
                    border: `2px solid ${filled ? 'var(--accent-vault)' : 'var(--border-strong)'}`,
                    transform: filled ? 'scale(1.15)' : 'scale(1)',
                  }}
                />
              );
            })}
          </div>

          {/* 3x4 Tactile Keypad */}
          <div className="grid grid-cols-3 gap-2.5 w-full max-w-[260px]">
            {KEYPAD_KEYS.map((keyLabel) => {
              const isAction = keyLabel === 'Clear' || keyLabel === 'Back';
              return (
                <button
                  key={keyLabel}
                  type="button"
                  onClick={() => handleKeypadPress(keyLabel)}
                  disabled={loading}
                  className="h-12 rounded-2xl font-mono font-bold text-base flex items-center justify-center transition-all spring-press"
                  style={{
                    backgroundColor: isAction ? 'var(--bg-surface-muted)' : 'var(--bg-input)',
                    color: isAction ? 'var(--text-secondary)' : 'var(--text-primary)',
                    border: '1px solid var(--border-color)',
                  }}
                  aria-label={keyLabel === 'Back' ? 'Backspace' : keyLabel}
                >
                  {keyLabel === 'Back' ? (
                    <Delete size={17} />
                  ) : keyLabel === 'Clear' ? (
                    <span className="text-xs font-sans font-bold">Clear</span>
                  ) : (
                    keyLabel
                  )}
                </button>
              );
            })}
          </div>

          <button
            type="submit"
            disabled={loading || pin.length < 4}
            className="w-full py-3.5 text-xs font-extrabold uppercase tracking-wider spring-press theme-btn-primary"
          >
            {loading ? <Loader2 size={15} className="animate-spin mx-auto" /> : 'Unlock Vault'}
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
                className="flex items-center gap-1.5 px-3.5 py-2.5 font-bold text-xs tracking-wide spring-press theme-btn-primary"
              >
                <Plus size={14} strokeWidth={2.6} />
                <span>Import Local Media</span>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setIsSelectMode(!isSelectMode);
                setSelectedIds([]);
                setConfirmBatchDelete(false);
              }}
              className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all spring-press"
              style={
                isSelectMode
                  ? {
                      backgroundColor: 'var(--accent)',
                      color: 'var(--text-on-accent)',
                    }
                  : {
                      backgroundColor: 'var(--bg-surface)',
                      color: 'var(--text-primary)',
                      border: '1px solid var(--border-color)',
                    }
              }
            >
              {isSelectMode ? <CheckSquare size={14} /> : <Square size={14} />}
              <span>{isSelectMode ? 'Done' : 'Select'}</span>
            </button>
          </div>

          {/* Vault Files List */}
          <div className="flex flex-col gap-2.5">
            {vaultFiles.length === 0 ? (
              <div className="surface-card p-10 text-center text-xs flex flex-col items-center gap-2">
                <Shield size={28} style={{ color: 'var(--accent-vault-text)' }} className="mb-1" />
                <span className="font-bold text-sm" style={{ color: 'var(--text-primary)' }}>
                  Your Private Vault is empty
                </span>
                <span className="text-[11px] max-w-xs" style={{ color: 'var(--text-muted)' }}>
                  Tap Import Local Media to move videos or audio from your device into this PIN-locked vault.
                </span>
              </div>
            ) : (
              vaultFiles.map((file) => {
                const isSelected = selectedIds.includes(file.file_id);
                const isConfirming = confirmDeleteId === file.file_id;
                const authDownloadUrl = file.localBlob
                  ? undefined
                  : `/api/files/${file.file_id}/download?token=${encodeURIComponent(token)}`;

                return (
                  <div
                    key={file.file_id}
                    className={`flex items-center justify-between p-3.5 transition-all spring-press gap-2 ${
                      isSelected ? 'surface-card-active' : 'surface-card'
                    }`}
                  >
                    {isSelectMode && (
                      <button
                        type="button"
                        onClick={(e) => toggleSelectId(e, file.file_id)}
                        className="p-1 flex-shrink-0"
                        style={{ color: isSelected ? 'var(--accent-text)' : 'var(--text-muted)' }}
                      >
                        {isSelected ? <CheckSquare size={18} /> : <Square size={18} />}
                      </button>
                    )}

                    <div
                      onClick={() => {
                        if (isSelectMode) {
                          toggleSelectId(null, file.file_id);
                        } else {
                          openVaultMedia(file);
                        }
                      }}
                      className="flex items-center gap-3 min-w-0 cursor-pointer flex-1"
                    >
                      <div
                        className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
                        style={{
                          backgroundColor: 'var(--accent-vault-soft)',
                          color: 'var(--accent-vault-text)',
                        }}
                      >
                        {file.category === 'music' ? <FileAudio size={18} /> : <FileVideo size={18} />}
                      </div>

                      <div className="min-w-0 pr-1">
                        <h4 className="font-bold text-xs truncate leading-snug" style={{ color: 'var(--text-primary)' }}>
                          {file.title}
                        </h4>
                        <div className="flex items-center gap-1.5 pt-1 flex-wrap">
                          <span
                            className="text-[10px] font-mono px-1.5 py-0.5 rounded font-bold"
                            style={{
                              backgroundColor: 'var(--bg-surface-muted)',
                              color: 'var(--accent-vault-text)',
                            }}
                          >
                            {((file.filesize || 0) / (1024 * 1024)).toFixed(2)} MB
                          </span>
                          {file.isStoredLocally && (
                            <span
                              className="text-[9px] font-mono px-1.5 py-0.5 rounded font-bold"
                              style={{
                                backgroundColor: 'var(--accent-soft)',
                                color: 'var(--accent-text)',
                              }}
                            >
                              OFFLINE READY
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => openVaultMedia(file)}
                        className="p-2 rounded-xl transition-colors spring-press"
                        style={{
                          backgroundColor: 'var(--accent-vault-soft)',
                          color: 'var(--accent-vault-text)',
                        }}
                        title="Play"
                        aria-label="Play media"
                      >
                        <Play size={13} fill="currentColor" />
                      </button>

                      {file.localBlob ? (
                        <button
                          type="button"
                          onClick={() => {
                            const url = URL.createObjectURL(file.localBlob);
                            const link = document.createElement('a');
                            link.href = url;
                            link.download = file.filename || file.title;
                            document.body.appendChild(link);
                            link.click();
                            document.body.removeChild(link);
                            setTimeout(() => URL.revokeObjectURL(url), 1000);
                          }}
                          className="p-2 rounded-xl transition-all spring-press"
                          style={{
                            backgroundColor: 'var(--bg-surface-muted)',
                            color: 'var(--text-primary)',
                          }}
                          title="Save to Phone / Device"
                          aria-label="Save to Device"
                        >
                          <Download size={13} />
                        </button>
                      ) : (
                        <a
                          href={authDownloadUrl}
                          download={file.filename}
                          className="p-2 rounded-xl transition-all spring-press"
                          style={{
                            backgroundColor: 'var(--bg-surface-muted)',
                            color: 'var(--text-primary)',
                          }}
                          title="Save to Phone / Device"
                          aria-label="Save to Device"
                        >
                          <Download size={13} />
                        </a>
                      )}

                      <button
                        type="button"
                        onClick={(e) => handleDeleteFile(e, file.file_id)}
                        className={`px-2 py-2 rounded-xl text-[11px] font-bold transition-all spring-press ${
                          isConfirming ? 'bg-rose-600 text-white' : ''
                        }`}
                        style={
                          !isConfirming
                            ? { backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-muted)' }
                            : undefined
                        }
                        title={isConfirming ? 'Tap again to confirm delete' : 'Delete from Vault'}
                        aria-label="Delete from Vault"
                      >
                        {isConfirming ? 'Confirm' : <Trash2 size={13} />}
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
          <div className="w-full max-w-md surface-card-active p-3 flex items-center justify-between gap-2">
            <span className="text-xs font-mono font-bold px-2" style={{ color: 'var(--accent-vault-text)' }}>
              {selectedIds.length} SELECTED
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setVlcModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-2 text-xs font-bold spring-press theme-btn-primary"
              >
                <Radio size={13} />
                <span>Play in VLC</span>
              </button>

              <button
                type="button"
                onClick={handleBatchDelete}
                className={`flex items-center gap-1 px-3 py-2 rounded-xl font-bold text-xs spring-press ${
                  confirmBatchDelete
                    ? 'bg-rose-600 text-white'
                    : 'bg-rose-500/15 text-rose-500 border border-rose-500/30'
                }`}
              >
                <Trash2 size={13} />
                <span>{confirmBatchDelete ? 'Tap to Confirm' : 'Delete'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* VLC PLAYLIST / STREAM MODAL */}
      {vlcModalOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fade-in"
          onClick={() => setVlcModalOpen(false)}
        >
          <div
            className="w-full max-w-sm surface-card p-6 flex flex-col gap-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Radio size={18} style={{ color: 'var(--accent-vault-text)' }} />
                <h3 className="font-display font-extrabold text-sm">Play in VLC</h3>
              </div>
              <button
                type="button"
                onClick={() => setVlcModalOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <p className="text-xs leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
              Open your selected media inside external players like VLC or MX Player with authorized streaming tokens.
            </p>

            <a
              href={playlistUrl}
              download="vault-playlist.m3u"
              className="w-full py-3 font-bold text-xs flex items-center justify-center gap-2 spring-press theme-btn-primary"
            >
              <Download size={14} />
              <span>Download M3U Playlist for VLC</span>
            </a>

            <button
              type="button"
              onClick={handleCopyVlcUrl}
              className="w-full py-2.5 rounded-xl font-bold text-xs flex items-center justify-center gap-2 spring-press"
              style={{
                backgroundColor: 'var(--bg-surface-muted)',
                color: 'var(--text-primary)',
                border: '1px solid var(--border-color)',
              }}
            >
              {vlcCopied ? (
                <>
                  <Check size={14} style={{ color: 'var(--accent-text)' }} />
                  <span style={{ color: 'var(--accent-text)' }}>Playlist Link Copied</span>
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
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/55 backdrop-blur-md animate-fade-in"
          onClick={() => setIsChangePinOpen(false)}
        >
          <form
            onSubmit={handleChangePinSubmit}
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm surface-card p-6 flex flex-col gap-4"
          >
            <div className="flex items-center justify-between border-b pb-2.5" style={{ borderColor: 'var(--border-color)' }}>
              <div className="flex items-center gap-2">
                <Key size={18} style={{ color: 'var(--accent-vault-text)' }} />
                <h3 className="font-display font-extrabold text-sm">Change Vault PIN</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsChangePinOpen(false)}
                className="p-1.5 rounded-lg"
                style={{ color: 'var(--text-muted)' }}
              >
                <X size={16} />
              </button>
            </div>

            <div className="flex flex-col gap-2.5">
              <label className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
                Current PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={currentPinInput}
                onChange={(e) => setCurrentPinInput(e.target.value)}
                placeholder="Enter current PIN"
                className="w-full py-2.5 px-3 rounded-xl surface-input text-sm font-mono focus:outline-none"
              />

              <label className="text-[11px] font-mono pt-1" style={{ color: 'var(--text-muted)' }}>
                New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={newPinInput}
                onChange={(e) => setNewPinInput(e.target.value)}
                placeholder="New 4 to 6 digit PIN"
                className="w-full py-2.5 px-3 rounded-xl surface-input text-sm font-mono focus:outline-none"
              />

              <label className="text-[11px] font-mono pt-1" style={{ color: 'var(--text-muted)' }}>
                Confirm New PIN
              </label>
              <input
                type="password"
                inputMode="numeric"
                pattern="[0-9]*"
                maxLength={6}
                value={confirmPinInput}
                onChange={(e) => setConfirmPinInput(e.target.value)}
                placeholder="Confirm new PIN"
                className="w-full py-2.5 px-3 rounded-xl surface-input text-sm font-mono focus:outline-none"
              />
            </div>

            <button
              type="submit"
              disabled={loading || !currentPinInput || !newPinInput || !confirmPinInput}
              className="w-full py-3 font-bold text-xs uppercase tracking-wider spring-press theme-btn-primary mt-1"
            >
              {loading ? <Loader2 size={14} className="animate-spin mx-auto" /> : 'Save New PIN'}
            </button>
          </form>
        </div>
      )}

      <MediaPlayerModal
        media={selectedMedia}
        isOpen={Boolean(selectedMedia)}
        onClose={closeVaultMedia}
      />
    </div>
  );
}

export default VaultView;
