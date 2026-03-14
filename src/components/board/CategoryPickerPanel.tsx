import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { ShotCategory, EditCategory } from '../../types';

interface Props {
  categories: (ShotCategory | EditCategory)[];
  addedIds: Set<string>;
  anchorX: number;
  anchorY: number;
  onAdd: (categoryId: string) => void;
  onClose: () => void;
}

const PANEL_WIDTH = 260;

export function CategoryPickerPanel({ categories, addedIds, anchorX, anchorY, onAdd, onClose }: Props) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    const handleClick = (e: MouseEvent) => {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) onClose();
    };
    const t = setTimeout(() => {
      document.addEventListener('keydown', handleKey);
      document.addEventListener('click', handleClick);
    }, 60);
    return () => {
      clearTimeout(t);
      document.removeEventListener('keydown', handleKey);
      document.removeEventListener('click', handleClick);
    };
  }, [onClose]);

  const approxHeight = 56 + categories.length * 42;
  const spaceRight = window.innerWidth - anchorX - 8;
  const left = spaceRight >= PANEL_WIDTH ? anchorX + 12 : Math.max(8, anchorX - PANEL_WIDTH - 12);
  const rawTop = anchorY - approxHeight / 2;
  const top = Math.max(8, Math.min(rawTop, window.innerHeight - approxHeight - 8));

  const allAdded = categories.every(c => addedIds.has(c.id));

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
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 14,
        padding: '11px',
        boxShadow: '0 24px 64px rgba(0,0,0,0.92), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.05)',
        animation: 'catPickIn 0.17s cubic-bezier(0.22, 1, 0.36, 1) forwards',
      }}
    >
      <style>{`
        @keyframes catPickIn {
          from { opacity: 0; transform: scale(0.96) translateX(-4px); }
          to   { opacity: 1; transform: scale(1)    translateX(0);    }
        }
      `}</style>

      {/* Header */}
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: 7,
        marginBottom: 8,
        paddingBottom: 7,
        borderBottom: '1px solid rgba(255,255,255,0.07)',
      }}>
        <span style={{
          fontSize: 8,
          fontFamily: "'JetBrains Mono', monospace",
          color: 'rgba(255,255,255,0.5)',
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          fontWeight: 700,
          flex: 1,
        }}>
          Add Note
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

      {/* Category list */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
        {categories.map((cat) => {
          const isAdded = addedIds.has(cat.id);
          return (
            <button
              key={cat.id}
              onClick={() => { if (!isAdded) onAdd(cat.id); }}
              onPointerDown={(e) => e.stopPropagation()}
              disabled={isAdded}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 9,
                padding: '7px 9px',
                borderRadius: 9,
                background: isAdded ? 'rgba(255,255,255,0.015)' : 'rgba(255,255,255,0.03)',
                border: `1px solid ${isAdded ? 'rgba(255,255,255,0.04)' : cat.color + '28'}`,
                cursor: isAdded ? 'default' : 'pointer',
                textAlign: 'left',
                width: '100%',
                opacity: isAdded ? 0.45 : 1,
                transition: 'all 0.12s ease',
              }}
              onMouseEnter={(e) => {
                if (!isAdded) {
                  e.currentTarget.style.background = `${cat.color}12`;
                  e.currentTarget.style.borderColor = `${cat.color}50`;
                }
              }}
              onMouseLeave={(e) => {
                if (!isAdded) {
                  e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                  e.currentTarget.style.borderColor = `${cat.color}28`;
                }
              }}
            >
              <span style={{ fontSize: 14, flexShrink: 0, lineHeight: 1 }}>{cat.icon}</span>
              <span style={{
                flex: 1,
                fontSize: 11,
                fontFamily: "'Inter', system-ui, sans-serif",
                color: isAdded ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.75)',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}>
                {cat.label}
              </span>
              {isAdded ? (
                <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.25)' }}>✓</span>
              ) : (
                <span style={{
                  width: 16,
                  height: 16,
                  borderRadius: 5,
                  background: `${cat.color}12`,
                  border: `1px solid ${cat.color}30`,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: `${cat.color}80`,
                  fontSize: 11,
                  fontWeight: 700,
                  flexShrink: 0,
                  lineHeight: 1,
                }}>
                  +
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer */}
      {allAdded && (
        <div style={{
          marginTop: 8,
          paddingTop: 6,
          borderTop: '1px solid rgba(255,255,255,0.04)',
          fontSize: 8,
          color: 'rgba(255,255,255,0.25)',
          fontFamily: "'JetBrains Mono', monospace",
          letterSpacing: '0.05em',
          textAlign: 'center',
        }}>
          All notes added
        </div>
      )}
    </div>,
    document.body
  );
}
