import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import type { DirectorGuide } from '../../types';

interface Props {
  guide: DirectorGuide;
  categoryColor: string;
  promptLabel: string;
  onInsert: (text: string) => void;
  onClose: () => void;
  anchorX: number;
  anchorY: number;
}

const PANEL_WIDTH = 340;

export function DirectorGuidePanel({
  guide,
  categoryColor,
  promptLabel,
  onInsert,
  onClose,
  anchorX,
  anchorY,
}: Props) {
  const panelRef = useRef<HTMLDivElement>(null);
  const searchRef = useRef<HTMLInputElement>(null);
  const [expandedOption, setExpandedOption] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    // Delay to avoid instantly closing from the button click that opened us
    const t = setTimeout(() => {
      document.addEventListener('keydown', handleKey);
      document.addEventListener('click', handleClick);
      searchRef.current?.focus();
    }, 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  // Smart horizontal position — flip left if panel would overflow viewport
  const spaceRight = window.innerWidth - anchorX - 8;
  const left = spaceRight >= PANEL_WIDTH
    ? anchorX + 8
    : Math.max(8, anchorX - PANEL_WIDTH - 8);

  // Smart vertical position — clamp to viewport
  const approxHeight = 80 + guide.options.length * 58;
  const rawTop = anchorY - approxHeight / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - approxHeight - 8));

  // Filtered options
  const filteredOptions = search.trim()
    ? guide.options.filter(opt => {
        const q = search.toLowerCase();
        return opt.name.toLowerCase().includes(q)
          || (opt.label || '').toLowerCase().includes(q)
          || (opt.effect || '').toLowerCase().includes(q)
          || (opt.insert || '').toLowerCase().includes(q);
      })
    : guide.options;

  return createPortal(
    <div
      ref={panelRef}
      onPointerDown={(e) => e.stopPropagation()}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left,
        top,
        width: PANEL_WIDTH,
        zIndex: 99999,
        background: 'rgba(9,10,20,0.98)',
        backdropFilter: 'blur(32px) saturate(200%)',
        WebkitBackdropFilter: 'blur(32px) saturate(200%)',
        border: `1px solid ${categoryColor}28`,
        borderRadius: 14,
        padding: '11px',
        boxShadow: `0 24px 64px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05), 0 0 32px ${categoryColor}08`,
        animation: 'dirGuideIn 0.17s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }}
    >
      <style>{`
        @keyframes dirGuideIn {
          from { opacity: 0; transform: scale(0.96) translateX(-4px); }
          to   { opacity: 1; transform: scale(1)    translateX(0);     }
        }
        @keyframes subOptsIn {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginBottom: 7,
        paddingBottom: 7,
        borderBottom: `1px solid ${categoryColor}18`,
      }}>
        <div style={{
          width: 5,
          height: 5,
          borderRadius: '50%',
          background: categoryColor,
          boxShadow: `0 0 8px ${categoryColor}`,
          flexShrink: 0,
        }} />
        <span style={{
          fontSize: 8,
          fontFamily: "'JetBrains Mono', monospace",
          color: categoryColor,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 700,
          flex: 1,
        }}>
          Director's Guide — {promptLabel.replace('?', '')}
        </span>
        <span style={{
          fontSize: 8,
          fontFamily: "'JetBrains Mono', monospace",
          color: `${categoryColor}50`,
          letterSpacing: '0.04em',
        }}>
          {filteredOptions.length}/{guide.options.length}
        </span>
        <button
          onClick={onClose}
          onPointerDown={(e) => e.stopPropagation()}
          style={{
            width: 16,
            height: 16,
            borderRadius: '50%',
            background: 'rgba(255,255,255,0.05)',
            border: '1px solid rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.3)',
            fontSize: 9,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
            lineHeight: 1,
            padding: 0,
          }}
        >
          ✕
        </button>
      </div>

      {/* Context */}
      <div style={{
        fontSize: 10,
        color: 'rgba(255,255,255,0.42)',
        fontFamily: "'Inter', system-ui, sans-serif",
        lineHeight: 1.55,
        marginBottom: 9,
        letterSpacing: '0.01em',
        fontStyle: 'italic',
      }}>
        {guide.context}
      </div>

      {/* Search bar */}
      <div style={{ position: 'relative', marginBottom: 7 }}>
        <svg style={{ position: 'absolute', left: 7, top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none' }}
          width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={`${categoryColor}60`} strokeWidth="2">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          ref={searchRef}
          type="text"
          placeholder="Filter options…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { if (search) { setSearch(''); e.stopPropagation(); } else { onClose(); } } }}
          onPointerDown={e => e.stopPropagation()}
          style={{
            width: '100%',
            background: `${categoryColor}08`,
            border: `1px solid ${categoryColor}20`,
            borderRadius: 7,
            padding: '5px 28px 5px 22px',
            fontSize: 10,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: 'rgba(255,255,255,0.75)',
            outline: 'none',
            caretColor: categoryColor,
            boxSizing: 'border-box',
            transition: 'border-color 0.12s ease',
          }}
          onFocus={e => (e.currentTarget as HTMLElement).style.borderColor = `${categoryColor}45`}
          onBlur={e => (e.currentTarget as HTMLElement).style.borderColor = `${categoryColor}20`}
        />
        {search && (
          <button
            onClick={() => setSearch('')}
            style={{ position: 'absolute', right: 6, top: '50%', transform: 'translateY(-50%)', background: 'none', border: 'none', color: `${categoryColor}60`, cursor: 'pointer', padding: 0, fontSize: 9 }}
          >✕</button>
        )}
      </div>

      {/* Options */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3, maxHeight: 320, overflowY: 'auto' }}>
        {filteredOptions.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '16px 0', fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif", color: 'rgba(255,255,255,0.2)' }}>
            No options match "{search}"
          </div>
        ) : null}
        {filteredOptions.map((opt) => {
          const isExpanded = expandedOption === opt.name;
          const hasSubOptions = opt.subOptions && opt.subOptions.length > 0;

          return (
            <div key={opt.name}>
              <button
                onClick={(e) => { e.stopPropagation(); onInsert(opt.insert); }}
                onPointerDown={(e) => e.stopPropagation()}
                style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: 8,
                  padding: '7px 9px',
                  borderRadius: isExpanded ? '9px 9px 0 0' : 9,
                  background: isExpanded ? `${categoryColor}14` : 'rgba(255,255,255,0.025)',
                  border: isExpanded ? `1px solid ${categoryColor}35` : '1px solid rgba(255,255,255,0.055)',
                  borderBottom: isExpanded ? 'none' : undefined,
                  cursor: 'pointer',
                  textAlign: 'left',
                  transition: 'all 0.12s ease',
                  width: '100%',
                }}
                onMouseEnter={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = `${categoryColor}10`;
                    e.currentTarget.style.borderColor = `${categoryColor}30`;
                  }
                  const plus = e.currentTarget.querySelector('.insert-plus') as HTMLElement;
                  if (plus) { plus.style.background = `${categoryColor}25`; plus.style.borderColor = `${categoryColor}50`; plus.style.color = categoryColor; }
                }}
                onMouseLeave={(e) => {
                  if (!isExpanded) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.025)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.055)';
                  }
                  const plus = e.currentTarget.querySelector('.insert-plus') as HTMLElement;
                  if (plus) { plus.style.background = `${categoryColor}0a`; plus.style.borderColor = `${categoryColor}20`; plus.style.color = `${categoryColor}60`; }
                }}
              >
                {/* Name chip */}
                <div style={{
                  minWidth: 36,
                  fontSize: 8,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: categoryColor,
                  fontWeight: 800,
                  letterSpacing: '0.06em',
                  paddingTop: 2,
                  flexShrink: 0,
                  textTransform: 'uppercase',
                }}>
                  {opt.name}
                </div>

                {/* Text content */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  {opt.label && (
                    <div style={{
                      fontSize: 10,
                      color: 'rgba(255,255,255,0.72)',
                      fontFamily: "'Inter', system-ui, sans-serif",
                      fontWeight: 500,
                      marginBottom: 2,
                      lineHeight: 1.3,
                    }}>
                      {opt.label}
                    </div>
                  )}
                  <div style={{
                    fontSize: 9,
                    color: 'rgba(255,255,255,0.35)',
                    fontFamily: "'Inter', system-ui, sans-serif",
                    lineHeight: 1.45,
                  }}>
                    {opt.effect}
                  </div>
                </div>

                {/* Expand chevron (if sub-options exist) */}
                {hasSubOptions && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      setExpandedOption(isExpanded ? null : opt.name);
                    }}
                    onPointerDown={(e) => e.stopPropagation()}
                    style={{
                      width: 17,
                      height: 17,
                      borderRadius: 5,
                      background: isExpanded ? `${categoryColor}20` : 'rgba(255,255,255,0.04)',
                      border: isExpanded ? `1px solid ${categoryColor}40` : '1px solid rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      color: isExpanded ? categoryColor : 'rgba(255,255,255,0.3)',
                      fontSize: 8,
                      flexShrink: 0,
                      marginTop: 1,
                      cursor: 'pointer',
                      transition: 'all 0.12s ease',
                      lineHeight: 1,
                      padding: 0,
                      transform: isExpanded ? 'rotate(180deg)' : 'none',
                    }}
                    title="Show variants"
                  >
                    ▾
                  </button>
                )}

                {/* Insert + button */}
                <div
                  className="insert-plus"
                  style={{
                    width: 17,
                    height: 17,
                    borderRadius: 5,
                    background: `${categoryColor}0a`,
                    border: `1px solid ${categoryColor}20`,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: `${categoryColor}60`,
                    fontSize: 11,
                    flexShrink: 0,
                    marginTop: 1,
                    fontWeight: 700,
                    transition: 'all 0.12s ease',
                    lineHeight: 1,
                  }}
                >
                  +
                </div>
              </button>

              {/* Sub-options row */}
              {isExpanded && hasSubOptions && (
                <div
                  style={{
                    display: 'flex',
                    flexWrap: 'wrap',
                    gap: 4,
                    padding: '7px 9px 8px',
                    background: `${categoryColor}08`,
                    border: `1px solid ${categoryColor}35`,
                    borderTop: 'none',
                    borderRadius: '0 0 9px 9px',
                    animation: 'subOptsIn 0.14s ease forwards',
                  }}
                >
                  {opt.subOptions!.map((sub) => (
                    <button
                      key={sub.name}
                      onClick={(e) => { e.stopPropagation(); onInsert(sub.insert); }}
                      onPointerDown={(e) => e.stopPropagation()}
                      style={{
                        padding: '3px 8px',
                        borderRadius: 6,
                        background: 'rgba(255,255,255,0.04)',
                        border: `1px solid ${categoryColor}25`,
                        color: 'rgba(255,255,255,0.6)',
                        fontSize: 9,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        cursor: 'pointer',
                        letterSpacing: '0.04em',
                        transition: 'all 0.1s ease',
                        lineHeight: 1.4,
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = `${categoryColor}20`;
                        e.currentTarget.style.borderColor = `${categoryColor}55`;
                        e.currentTarget.style.color = categoryColor;
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = 'rgba(255,255,255,0.04)';
                        e.currentTarget.style.borderColor = `${categoryColor}25`;
                        e.currentTarget.style.color = 'rgba(255,255,255,0.6)';
                      }}
                    >
                      {sub.name}
                    </button>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Footer hint */}
      <div style={{
        marginTop: 8,
        paddingTop: 6,
        borderTop: '1px solid rgba(255,255,255,0.04)',
        fontSize: 8,
        color: 'rgba(255,255,255,0.18)',
        fontFamily: "'JetBrains Mono', monospace",
        letterSpacing: '0.05em',
        display: 'flex',
        alignItems: 'center',
        gap: 4,
      }}>
        <span style={{ color: `${categoryColor}50`, fontWeight: 700 }}>+</span>
        <span>click option to insert · ▾ for variants</span>
      </div>
    </div>,
    document.body
  );
}
