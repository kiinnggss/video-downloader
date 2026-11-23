import React, { useEffect, useState } from 'react';
import { X, Check, Palette, RotateCcw, Sparkles } from 'lucide-react';
import { useTheme } from '../theme/ThemeContext';
import { normalizeHex } from '../theme/themes';

const QUICK_ACCENTS = ['#23252A', '#A63D33', '#B31312', '#E48E58', '#D95877'];

export function ThemeSwitcherModal({ isOpen, onClose }) {
  const {
    themes,
    themeId,
    customAccent,
    glassMode,
    effectiveAccent,
    startPreview,
    updatePreview,
    commitPreview,
    cancelPreview,
  } = useTheme();

  const [hexInput, setHexInput] = useState(effectiveAccent);

  useEffect(() => {
    if (isOpen) {
      startPreview();
    }
  }, [isOpen]);

  useEffect(() => {
    setHexInput(effectiveAccent);
  }, [effectiveAccent]);

  if (!isOpen) return null;

  const handleCloseCancel = () => {
    cancelPreview();
    onClose();
  };

  const handleSave = () => {
    commitPreview();
    onClose();
  };

  const handleHexChange = (raw) => {
    setHexInput(raw);
    const valid = normalizeHex(raw);
    if (valid) {
      updatePreview({ customAccent: valid });
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4 bg-black/55 backdrop-blur-md animate-fade-in"
      onClick={handleCloseCancel}
    >
      <div
        className="w-full max-w-md surface-card rounded-t-[28px] sm:rounded-[28px] p-5 flex flex-col gap-4 max-h-[92vh] overflow-y-auto no-scrollbar"
        style={{ borderRadius: 'var(--radius-card)' }}
        role="dialog"
        aria-modal="true"
        aria-labelledby="appearance-modal-title"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Mobile sheet drag handle */}
        <div
          className="w-10 h-1 rounded-full mx-auto -mt-1 sm:hidden"
          style={{ backgroundColor: 'var(--border-strong)' }}
        />

        {/* Header */}
        <div className="flex items-center justify-between pb-2.5 border-b" style={{ borderColor: 'var(--border-color)' }}>
          <div className="flex items-center gap-2.5">
            <div
              className="w-9 h-9 rounded-xl flex items-center justify-center"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >
              <Palette size={18} />
            </div>
            <div>
              <h2
                id="appearance-modal-title"
                className="font-display text-base font-extrabold tracking-tight"
                style={{ color: 'var(--text-primary)' }}
              >
                Appearance
              </h2>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Preview themes live across the entire studio
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseCancel}
            className="p-2 rounded-xl transition-colors spring-press"
            style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
            aria-label="Close appearance settings"
          >
            <X size={16} />
          </button>
        </div>

        {/* Interface theme section */}
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Interface theme
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Choose from 3 curated studio palettes
              </p>
            </div>
            <span
              className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
              style={{ backgroundColor: 'var(--accent-soft)', color: 'var(--accent-text)' }}
            >
              {themes.length} Themes
            </span>
          </div>

          {/* 3-Column Single-Row Miniature Schematic Cards */}
          <div className="grid grid-cols-3 gap-2 py-0.5">
            {themes.map((t) => {
              const isSelected = t.id === themeId;
              return (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => updatePreview({ themeId: t.id, customAccent: '' })}
                  className="flex flex-col rounded-2xl overflow-hidden text-left transition-all spring-press"
                  style={{
                    backgroundColor: 'var(--bg-surface-elevated)',
                    border: isSelected ? `2px solid var(--accent)` : `1.5px solid var(--border-color)`,
                    boxShadow: isSelected ? '0 8px 20px -6px rgba(0, 0, 0, 0.16)' : 'none',
                  }}
                >
                  {/* Miniature Schematic UI Window */}
                  <div
                    className="w-full h-16 p-1.5 flex flex-col gap-1 relative"
                    style={{ backgroundColor: t.preview.bg }}
                  >
                    <div className="flex items-center gap-0.5">
                      <span className="w-1 h-1 rounded-full opacity-75" style={{ backgroundColor: t.preview.bar1 }} />
                      <span className="w-1 h-1 rounded-full opacity-55" style={{ backgroundColor: t.preview.bar2 }} />
                      <span className="w-1 h-1 rounded-full opacity-40" style={{ backgroundColor: t.preview.bar3 }} />
                    </div>

                    <div className="flex-1 flex gap-1 min-h-0">
                      <div
                        className="w-4 rounded p-0.5 flex flex-col gap-0.5"
                        style={{
                          backgroundColor: t.preview.sidebar,
                          border: `1px solid ${t.preview.border}`,
                        }}
                      >
                        <div className="h-0.5 w-full rounded-full" style={{ backgroundColor: t.preview.bar1 }} />
                        <div className="h-0.5 w-3/4 rounded-full opacity-50" style={{ backgroundColor: t.preview.bar3 }} />
                      </div>

                      <div
                        className="flex-1 rounded p-1 flex flex-col justify-between"
                        style={{
                          backgroundColor: t.preview.card,
                          border: `1px solid ${t.preview.border}`,
                        }}
                      >
                        <div className="flex items-center justify-between gap-0.5">
                          <div className="h-1 w-6 rounded-full" style={{ backgroundColor: t.preview.bar1 }} />
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: t.preview.bar2 }} />
                        </div>
                        <div className="flex flex-col gap-0.5">
                          <div className="h-1 w-full rounded-full opacity-75" style={{ backgroundColor: t.preview.bar2 }} />
                          <div className="h-1 w-2/3 rounded-full opacity-40" style={{ backgroundColor: t.preview.bar3 }} />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Card Footer */}
                  <div
                    className="flex items-center justify-between px-2 py-2 border-t gap-1"
                    style={{ borderColor: 'var(--border-color)' }}
                  >
                    <div className="min-w-0">
                      <p
                        className="text-[10px] font-bold leading-tight truncate"
                        style={{ color: 'var(--text-primary)' }}
                      >
                        {t.name}
                      </p>
                      <p className="text-[8.5px] truncate mt-0.5" style={{ color: 'var(--text-muted)' }}>
                        {t.inspiration}
                      </p>
                    </div>

                    <div
                      className="w-3.5 h-3.5 rounded-full flex items-center justify-center flex-shrink-0 transition-all"
                      style={{
                        backgroundColor: isSelected ? 'var(--accent)' : 'transparent',
                        border: isSelected ? 'none' : '1.5px solid var(--border-strong)',
                        color: 'var(--text-on-accent)',
                      }}
                    >
                      {isSelected && <Check size={9} strokeWidth={3} />}
                    </div>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Customize primary color */}
        <div
          className="flex flex-col gap-2 pt-3 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Customize primary color
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Override the accent highlight color
              </p>
            </div>

            <div className="flex items-center gap-1.5">
              <label
                className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl cursor-pointer"
                style={{
                  backgroundColor: 'var(--bg-input)',
                  border: '1px solid var(--border-color)',
                }}
              >
                <input
                  type="color"
                  value={effectiveAccent}
                  onChange={(e) => handleHexChange(e.target.value)}
                  className="w-4 h-4 rounded cursor-pointer border-0 p-0 bg-transparent"
                  aria-label="Pick accent color"
                />
                <input
                  type="text"
                  value={hexInput}
                  onChange={(e) => handleHexChange(e.target.value)}
                  maxLength={7}
                  className="w-16 bg-transparent text-[11px] font-mono font-bold focus:outline-none uppercase"
                  style={{ color: 'var(--text-primary)' }}
                  aria-label="Accent hex code"
                />
              </label>

              {customAccent && (
                <button
                  type="button"
                  onClick={() => updatePreview({ customAccent: '' })}
                  className="p-1.5 rounded-xl transition-colors"
                  style={{ backgroundColor: 'var(--bg-surface-muted)', color: 'var(--text-secondary)' }}
                  title="Reset accent to theme default"
                  aria-label="Reset accent color"
                >
                  <RotateCcw size={13} />
                </button>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
              Quick swatches
            </span>
            <div className="flex items-center gap-1.5">
              {QUICK_ACCENTS.map((hex) => (
                <button
                  key={hex}
                  type="button"
                  onClick={() => handleHexChange(hex)}
                  className="w-5 h-5 rounded-full transition-transform hover:scale-110"
                  style={{
                    backgroundColor: hex,
                    border:
                      effectiveAccent === hex
                        ? '2px solid var(--text-primary)'
                        : '1px solid rgba(255,255,255,0.4)',
                  }}
                  aria-label={`Select swatch ${hex}`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Translucent Glass toggle */}
        <div
          onClick={() => updatePreview({ glassMode: !glassMode })}
          className="flex items-center justify-between pt-3 border-t cursor-pointer select-none"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <div className="flex items-center gap-2">
            <Sparkles size={15} style={{ color: 'var(--accent-text)' }} />
            <div>
              <h3 className="text-xs font-bold" style={{ color: 'var(--text-primary)' }}>
                Translucent glass
              </h3>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
                Add a frosted backdrop blur layer to cards and dock
              </p>
            </div>
          </div>

          <button
            type="button"
            role="switch"
            aria-checked={glassMode}
            className="w-11 h-6 rounded-full transition-colors p-0.5 flex items-center flex-shrink-0"
            style={{
              backgroundColor: glassMode ? 'var(--accent)' : 'var(--bg-surface-muted)',
              border: '1px solid var(--border-color)',
            }}
          >
            <span
              className={`w-[18px] h-[18px] rounded-full shadow-sm transition-transform ${
                glassMode ? 'translate-x-5' : 'translate-x-0'
              }`}
              style={{
                backgroundColor: glassMode ? 'var(--text-on-accent)' : 'var(--text-muted)',
              }}
            />
          </button>
        </div>

        {/* Footer actions */}
        <div
          className="flex items-center justify-end gap-2 pt-3 border-t"
          style={{ borderColor: 'var(--border-color)' }}
        >
          <button
            type="button"
            onClick={handleCloseCancel}
            className="px-4 py-2.5 rounded-xl text-xs font-bold transition-colors spring-press"
            style={{
              backgroundColor: 'var(--bg-surface-muted)',
              color: 'var(--text-secondary)',
              border: '1px solid var(--border-color)',
              borderRadius: 'var(--radius-button)',
            }}
          >
            Cancel
          </button>

          <button
            type="button"
            onClick={handleSave}
            className="px-5 py-2.5 text-xs font-bold transition-all spring-press theme-btn-primary"
          >
            Save preferences
          </button>
        </div>
      </div>
    </div>
  );
}

export default ThemeSwitcherModal;
