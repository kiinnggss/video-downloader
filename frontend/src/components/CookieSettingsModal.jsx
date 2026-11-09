import React, { useState, useEffect } from 'react';
import { X, ShieldCheck, Key, Trash2, CheckCircle2, AlertCircle, Loader2 } from 'lucide-react';
import { apiClient } from '../api/client';

export function CookieSettingsModal({ isOpen, onClose }) {
  const [cookieContent, setCookieContent] = useState('');
  const [hasCookies, setHasCookies] = useState(false);
  const [loading, setLoading] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      loadStatus();
    }
  }, [isOpen]);

  const loadStatus = async () => {
    try {
      const data = await apiClient.getCookieStatus();
      setHasCookies(Boolean(data.has_cookies));
      setStatusMsg('');
      setErrorMsg('');
    } catch {
      // Keep previous state on background failure
    }
  };

  const handleSave = async () => {
    if (!cookieContent.trim()) {
      setErrorMsg('Paste your cookies before saving.');
      return;
    }
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await apiClient.saveCookies(cookieContent.trim());
      setHasCookies(true);
      setCookieContent('');
      setStatusMsg('Cookies saved for this device.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to save cookies.');
    } finally {
      setLoading(false);
    }
  };

  const handleClear = async () => {
    setLoading(true);
    setStatusMsg('');
    setErrorMsg('');
    try {
      await apiClient.clearCookies();
      setHasCookies(false);
      setCookieContent('');
      setStatusMsg('Session cookies removed.');
      setTimeout(() => setStatusMsg(''), 4000);
    } catch (err) {
      setErrorMsg(err.message || 'Failed to clear cookies.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md bento-card rounded-3xl p-6 shadow-2xl border border-slate-200 text-slate-950 flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-100 text-amber-700 border border-amber-200">
              <Key size={18} />
            </div>
            <div>
              <h2 id="cookie-settings-title" className="text-base font-bold text-slate-950">
                Account & Cookies
              </h2>
              <p className="text-xs text-slate-500">
                Unlock age-restricted and private streams
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-slate-700 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-slate-100 border border-slate-200 text-xs">
          <span className="text-slate-600 font-medium">Device Session:</span>
          {hasCookies ? (
            <span className="flex items-center gap-1.5 text-emerald-700 font-bold">
              <CheckCircle2 size={14} /> Active
            </span>
          ) : (
            <span className="text-slate-500 font-medium">
              None configured
            </span>
          )}
        </div>

        {/* Explainer */}
        <p className="text-xs text-slate-600 leading-relaxed">
          Public videos work automatically with built-in TLS browser emulation. If a video requires account access on YouTube, TikTok, or X, export your cookies in Netscape format and paste them below.
        </p>

        {/* Cookie Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cookie-input" className="text-[11px] font-medium text-slate-600">
            Netscape Cookies text
          </label>
          <textarea
            id="cookie-input"
            rows={5}
            value={cookieContent}
            onChange={(e) => setCookieContent(e.target.value)}
            placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / TRUE 1790000000 SID ..."
            className="w-full rounded-2xl bg-white border border-slate-200 p-3 text-xs font-mono text-slate-900 placeholder-slate-400 focus:outline-none focus:border-amber-500 shadow-sm resize-none"
          />
        </div>

        {/* Notifications */}
        {statusMsg && (
          <div className="px-3 py-2 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="px-3 py-2 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle size={14} className="flex-shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <button
            type="button"
            onClick={handleSave}
            disabled={loading || !cookieContent.trim()}
            className="flex-1 py-2.5 px-4 rounded-xl bg-lime-neon hover:bg-lime-400 disabled:opacity-30 text-obsidian text-xs font-black uppercase tracking-wider transition-all flex items-center justify-center gap-1.5 shadow-sm spring-press"
          >
            {loading ? <Loader2 size={14} className="animate-spin text-obsidian" /> : <ShieldCheck size={14} />}
            <span>Save Cookies</span>
          </button>

          {hasCookies && (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="py-2.5 px-3.5 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 border border-slate-200 text-xs font-semibold transition-all flex items-center justify-center gap-1 spring-press"
              title="Remove stored cookies"
            >
              <Trash2 size={14} />
              <span>Clear</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default CookieSettingsModal;
