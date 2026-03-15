import { useState, useEffect } from 'react';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';

type Ownership = 'decide' | 'ai' | 'skip';

interface Props {
  allFields: string[];
  fieldOwnership: Record<string, Ownership>;
  categoryId: string | null;
  onSetOwnership: (fieldLabel: string, ownership: Ownership) => void;
  onSetAll: (ownership: Ownership) => void;
  onStart: () => void;
}

const OWNERSHIP_CONFIG: Record<Ownership, {
  label: string;
  color: string;
  bg: string;
  border: string;
  glow: string;
  icon: string;
}> = {
  decide: {
    label: 'MINE',
    color: 'rgba(251,191,36,0.95)',
    bg: 'rgba(251,191,36,0.08)',
    border: 'rgba(251,191,36,0.35)',
    glow: '0 0 16px rgba(251,191,36,0.2)',
    icon: '●',
  },
  ai: {
    label: 'AI',
    color: 'rgba(167,139,250,0.95)',
    bg: 'rgba(167,139,250,0.08)',
    border: 'rgba(167,139,250,0.35)',
    glow: '0 0 16px rgba(167,139,250,0.2)',
    icon: '◆',
  },
  skip: {
    label: 'SKIP',
    color: 'rgba(255,255,255,0.2)',
    bg: 'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.06)',
    glow: 'none',
    icon: '—',
  },
};

const CYCLE: Ownership[] = ['decide', 'ai', 'skip'];

export function FieldOwnershipDashboard({
  allFields,
  fieldOwnership,
  categoryId,
  onSetOwnership,
  onSetAll,
  onStart,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const allCats = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
  const category = allCats.find(c => c.id === categoryId);
  const categoryColor = category?.color || '#60a5fa';

  const decideCount = allFields.filter(f => (fieldOwnership[f] ?? 'decide') === 'decide').length;
  const canStart = decideCount > 0;

  function cycleOwnership(fieldLabel: string) {
    const current = fieldOwnership[fieldLabel] ?? 'decide';
    const idx = CYCLE.indexOf(current);
    const next = CYCLE[(idx + 1) % CYCLE.length];
    onSetOwnership(fieldLabel, next);
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '16px 18px 8px',
      display: 'flex', flexDirection: 'column', gap: 14,
    }}>
      {/* Header */}
      <div style={{ flexShrink: 0 }}>
        <div style={{
          fontSize: 13, fontWeight: 600,
          color: 'rgba(255,255,255,0.88)',
          fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
          letterSpacing: '-0.02em',
          marginBottom: 3,
        }}>
          What will you define?
        </div>
        <div style={{
          fontSize: 11,
          color: 'rgba(255,255,255,0.3)',
          fontFamily: '-apple-system, "Inter", sans-serif',
          lineHeight: 1.4,
        }}>
          Tap each field to choose who decides it.
          <span style={{ color: 'rgba(251,191,36,0.6)', marginLeft: 4 }}>MINE</span> means you'll answer it,
          <span style={{ color: 'rgba(167,139,250,0.6)', marginLeft: 4 }}>AI</span> fills from the image,
          <span style={{ color: 'rgba(255,255,255,0.25)', marginLeft: 4 }}>SKIP</span> leaves it blank.
        </div>
      </div>

      {/* Batch buttons */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {(['decide', 'ai', 'skip'] as Ownership[]).map(o => {
          const cfg = OWNERSHIP_CONFIG[o];
          return (
            <button
              key={o}
              onClick={() => onSetAll(o)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: `1px solid rgba(255,255,255,0.08)`,
                color: cfg.color,
                borderRadius: 10,
                padding: '5px 12px',
                fontSize: 9,
                fontWeight: 700,
                fontFamily: '-apple-system, "SF Mono", monospace',
                letterSpacing: '0.1em',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                backdropFilter: 'blur(10px)',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = cfg.bg;
                el.style.borderColor = cfg.border;
                el.style.boxShadow = cfg.glow;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.04)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
                el.style.boxShadow = 'none';
              }}
            >
              All {cfg.label}
            </button>
          );
        })}
      </div>

      {/* Field grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
        flex: 1,
      }}>
        {allFields.map((field, idx) => {
          const ownership = fieldOwnership[field] ?? 'decide';
          const cfg = OWNERSHIP_CONFIG[ownership];
          return (
            <button
              key={field}
              onClick={() => cycleOwnership(field)}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 14,
                padding: '11px 13px',
                cursor: 'pointer',
                textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 6,
                backdropFilter: 'blur(16px)',
                boxShadow: cfg.glow,
                transition: 'all 0.25s cubic-bezier(0.34, 1.56, 0.64, 1)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0) scale(1)' : `translateY(10px) scale(0.95)`,
                // stagger delay
                transitionDelay: `${idx * 28}ms`,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'scale(1.03)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.transform = 'scale(1) translateY(0)';
              }}
            >
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              }}>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  fontFamily: '-apple-system, "SF Mono", monospace',
                  color: cfg.color,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                }}>
                  {cfg.icon}
                </span>
                <span style={{
                  fontSize: 8,
                  fontFamily: '-apple-system, "SF Mono", monospace',
                  fontWeight: 700,
                  color: cfg.color,
                  letterSpacing: '0.12em',
                  textTransform: 'uppercase',
                  background: `${cfg.border.replace('0.35)', '0.12)')}`,
                  padding: '2px 6px',
                  borderRadius: 6,
                }}>
                  {cfg.label}
                </span>
              </div>
              <div style={{
                fontSize: 11,
                color: ownership === 'skip' ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.7)',
                fontFamily: '-apple-system, "Inter", sans-serif',
                fontWeight: 500,
                lineHeight: 1.3,
              }}>
                {field}
              </div>
            </button>
          );
        })}
      </div>

      {/* Begin session */}
      <div style={{ flexShrink: 0, paddingBottom: 4 }}>
        <div style={{
          fontSize: 10, color: 'rgba(255,255,255,0.2)',
          fontFamily: '-apple-system, "Inter", sans-serif',
          textAlign: 'center', marginBottom: 8,
        }}>
          {decideCount} field{decideCount !== 1 ? 's' : ''} you'll define
          {decideCount === 0 && (
            <span style={{ color: 'rgba(248,113,113,0.6)', marginLeft: 6 }}>
              — select at least one
            </span>
          )}
        </div>
        <button
          disabled={!canStart}
          onClick={onStart}
          style={{
            width: '100%',
            background: canStart ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canStart
              ? `${categoryColor}40`
              : 'rgba(255,255,255,0.05)'}`,
            color: canStart ? 'rgba(255,255,255,0.85)' : 'rgba(255,255,255,0.2)',
            borderRadius: 16,
            padding: '12px 20px',
            fontSize: 13, fontWeight: 600,
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontFamily: '-apple-system, "Inter", sans-serif',
            backdropFilter: 'blur(10px)',
            boxShadow: canStart ? `0 0 20px ${categoryColor}18` : 'none',
            transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
          }}
          onMouseEnter={e => {
            if (!canStart) return;
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'rgba(255,255,255,0.09)';
            el.style.boxShadow = `0 0 28px ${categoryColor}25`;
            el.style.transform = 'scale(1.01)';
          }}
          onMouseLeave={e => {
            if (!canStart) return;
            const el = e.currentTarget as HTMLElement;
            el.style.background = 'rgba(255,255,255,0.06)';
            el.style.boxShadow = `0 0 20px ${categoryColor}18`;
            el.style.transform = 'scale(1)';
          }}
        >
          Begin Session
          {canStart && (
            <svg
              width="14" height="14"
              viewBox="0 0 24 24"
              fill="none" stroke="currentColor"
              strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"
              style={{ transition: 'transform 0.2s ease' }}
            >
              <line x1="5" y1="12" x2="19" y2="12" />
              <polyline points="12 5 19 12 12 19" />
            </svg>
          )}
        </button>
      </div>
    </div>
  );
}
