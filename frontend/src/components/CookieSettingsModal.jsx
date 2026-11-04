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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md animate-fade-in">
      <div 
        className="relative w-full max-w-md crystal-card rounded-3xl p-6 shadow-2xl shadow-black/20 border border-white/20 bg-slate-900/90 text-white flex flex-col gap-4 max-h-[90vh] overflow-y-auto"
        role="dialog"
        aria-modal="true"
        aria-labelledby="cookie-settings-title"
      >
        {/* Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-2xl bg-amber-400/20 text-amber-400">
              <Key size={18} />
            </div>
            <div>
              <h2 id="cookie-settings-title" className="text-base font-semibold text-white">
                Account & Cookies
              </h2>
              <p className="text-xs text-slate-400">
                Unlock age-restricted and private streams
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
            aria-label="Close dialog"
          >
            <X size={18} />
          </button>
        </div>

        {/* Status Pill */}
        <div className="flex items-center justify-between px-3.5 py-2.5 rounded-2xl bg-white/5 border border-white/10 text-xs">
          <span className="text-slate-300">Device Session:</span>
          {hasCookies ? (
            <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
              <CheckCircle2 size={14} /> Active
            </span>
          ) : (
            <span className="text-slate-400 font-medium">
              None configured
            </span>
          )}
        </div>

        {/* Explainer */}
        <p className="text-xs text-slate-300 leading-relaxed">
          Public videos work automatically with built-in TLS browser emulation. If a video requires account access on YouTube, TikTok, or X, export your cookies in Netscape format and paste them below.
        </p>

        {/* Cookie Input */}
        <div className="flex flex-col gap-1.5">
          <label htmlFor="cookie-input" className="text-[11px] font-medium text-slate-400">
            Netscape Cookies text
          </label>
          <textarea
            id="cookie-input"
            rows={5}
            value={cookieContent}
            onChange={(e) => setCookieContent(e.target.value)}
            placeholder="# Netscape HTTP Cookie File&#10;.youtube.com TRUE / TRUE 1790000000 SID ..."
            className="w-full rounded-2xl bg-black/40 border border-white/10 px-3 py-2 text-xs font-mono text-slate-200 placeholder-slate-600 focus:outline-none focus:border-amber-400/50 resize-none"
          />
        </div>

        {/* Notifications */}
        {statusMsg && (
          <div className="px-3 py-2 rounded-xl bg-emerald-500/20 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
            <CheckCircle2 size={14} className="flex-shrink-0" />
            <span>{statusMsg}</span>
          </div>
        )}

        {errorMsg && (
          <div className="px-3 py-2 rounded-xl bg-rose-500/20 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
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
            className="flex-1 py-2.5 px-4 rounded-full bg-amber-400 hover:bg-amber-300 disabled:opacity-40 text-slate-950 text-xs font-semibold transition-all flex items-center justify-center gap-1.5 shadow-md"
          >
            {loading ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
            <span>Save Cookies</span>
          </button>

          {hasCookies && (
            <button
              type="button"
              onClick={handleClear}
              disabled={loading}
              className="py-2.5 px-3.5 rounded-full bg-white/5 hover:bg-rose-500/20 hover:text-rose-300 border border-white/10 text-slate-300 text-xs font-medium transition-all flex items-center justify-center gap-1"
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
