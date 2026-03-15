import { useEffect, useState } from 'react';
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

// ─── Ownership definitions ────────────────────────────────────────────────────

const OWN: Record<Ownership, {
  label: string; desc: string;
  dot: string; bg: string; border: string; glow: string;
}> = {
  decide: {
    label: 'MINE',
    desc: "You'll answer it",
    dot:    'rgba(251,191,36,0.95)',
    bg:     'rgba(251,191,36,0.07)',
    border: 'rgba(251,191,36,0.32)',
    glow:   '0 0 18px rgba(251,191,36,0.18)',
  },
  ai: {
    label: 'AI',
    desc: 'AI fills from image',
    dot:    'rgba(167,139,250,0.95)',
    bg:     'rgba(167,139,250,0.07)',
    border: 'rgba(167,139,250,0.32)',
    glow:   '0 0 18px rgba(167,139,250,0.18)',
  },
  skip: {
    label: 'SKIP',
    desc: 'Leave blank',
    dot:    'rgba(255,255,255,0.22)',
    bg:     'rgba(255,255,255,0.02)',
    border: 'rgba(255,255,255,0.07)',
    glow:   'none',
  },
};

const CYCLE: Ownership[] = ['decide', 'ai', 'skip'];

// ─── Component ────────────────────────────────────────────────────────────────

export function FieldOwnershipDashboard({
  allFields, fieldOwnership, categoryId,
  onSetOwnership, onSetAll, onStart,
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  const allCats = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
  const cat = allCats.find(c => c.id === categoryId);
  const catColor = cat?.color || '#60a5fa';

  const decideCount = allFields.filter(f => (fieldOwnership[f] ?? 'decide') === 'decide').length;
  const canStart    = decideCount > 0;

  function cycle(fieldLabel: string) {
    const cur = fieldOwnership[fieldLabel] ?? 'decide';
    const idx = CYCLE.indexOf(cur);
    onSetOwnership(fieldLabel, CYCLE[(idx + 1) % CYCLE.length]);
  }

  return (
    <div style={{
      flex: 1, overflowY: 'auto',
      padding: '18px 20px 12px',
      display: 'flex', flexDirection: 'column', gap: 16,
    }}>
      {/* ── Header ── */}
      <div style={{ flexShrink: 0 }}>
        <h3 style={{
          fontSize: 17, fontWeight: 600, letterSpacing: '-0.025em',
          fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
          color: 'rgba(255,255,255,0.9)', margin: '0 0 4px',
        }}>
          Choose your fields
        </h3>
        <p style={{
          fontSize: 11.5, margin: 0, lineHeight: 1.5,
          fontFamily: '-apple-system, "Inter", sans-serif',
          color: 'rgba(255,255,255,0.28)',
        }}>
          Tap each field to set who answers it.
          {' '}<span style={{ color: 'rgba(251,191,36,0.65)' }}>MINE</span> = you,
          {' '}<span style={{ color: 'rgba(167,139,250,0.65)' }}>AI</span> = auto from image,
          {' '}<span style={{ color: 'rgba(255,255,255,0.3)' }}>SKIP</span> = leave blank.
        </p>
      </div>

      {/* ── Batch controls ── */}
      <div style={{ display: 'flex', gap: 6, flexShrink: 0 }}>
        {(Object.keys(OWN) as Ownership[]).map(o => {
          const cfg = OWN[o];
          return (
            <button
              key={o}
              onClick={() => onSetAll(o)}
              style={{
                flex: 1,
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10, padding: '7px 0',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                transition: 'all 0.2s ease',
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background  = cfg.bg;
                el.style.borderColor = cfg.border;
                el.style.boxShadow   = cfg.glow;
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background  = 'rgba(255,255,255,0.03)';
                el.style.borderColor = 'rgba(255,255,255,0.07)';
                el.style.boxShadow   = 'none';
              }}
            >
              <div style={{ width: 6, height: 6, borderRadius: '50%', background: cfg.dot }} />
              <span style={{
                fontSize: 9.5, fontWeight: 700,
                fontFamily: '-apple-system, "SF Mono", monospace',
                letterSpacing: '0.1em',
                color: cfg.dot,
              }}>
                All {cfg.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* ── Field grid ── */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(2, 1fr)',
        gap: 8,
        flex: 1,
      }}>
        {allFields.map((field, idx) => {
          const own = fieldOwnership[field] ?? 'decide';
          const cfg = OWN[own];
          return (
            <button
              key={field}
              onClick={() => cycle(field)}
              title={`${field}: ${cfg.desc} — click to change`}
              style={{
                background: cfg.bg,
                border: `1px solid ${cfg.border}`,
                borderRadius: 14,
                padding: '11px 13px',
                cursor: 'pointer', textAlign: 'left',
                display: 'flex', flexDirection: 'column', gap: 5,
                backdropFilter: 'blur(16px)',
                boxShadow: cfg.glow,
                transition: 'all 0.28s cubic-bezier(0.34,1.56,0.64,1)',
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'translateY(0) scale(1)' : 'translateY(10px) scale(0.95)',
                transitionDelay: `${Math.min(idx * 25, 300)}ms`,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1.03)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.transform = 'scale(1) translateY(0)'}
            >
              {/* State badge */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                  <div style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: cfg.dot,
                    boxShadow: own !== 'skip' ? `0 0 6px ${cfg.dot}` : 'none',
                  }} />
                  <span style={{
                    fontSize: 8.5, fontWeight: 700,
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: cfg.dot,
                    letterSpacing: '0.1em',
                    textTransform: 'uppercase',
                  }}>
                    {cfg.label}
                  </span>
                </div>
                {/* Tap hint (only visible subtly) */}
                <svg width="9" height="9" viewBox="0 0 24 24" fill="none"
                  stroke={cfg.dot.replace(/[\d.]+\)$/, '0.35)')} strokeWidth="2" strokeLinecap="round">
                  <polyline points="9 18 15 12 9 6"/>
                </svg>
              </div>

              {/* Field name */}
              <div style={{
                fontSize: 11, fontWeight: 500,
                color: own === 'skip' ? 'rgba(255,255,255,0.25)' : 'rgba(255,255,255,0.72)',
                fontFamily: '-apple-system, "Inter", sans-serif',
                lineHeight: 1.3,
              }}>
                {field}
              </div>
            </button>
          );
        })}
      </div>

      {/* ── Begin Session ── */}
      <div style={{ flexShrink: 0 }}>
        {/* Field count summary */}
        <div style={{
          display: 'flex', gap: 10, marginBottom: 10,
          fontFamily: '-apple-system, "SF Mono", monospace',
          fontSize: 10,
        }}>
          {(Object.keys(OWN) as Ownership[]).map(o => {
            const count = allFields.filter(f => (fieldOwnership[f] ?? 'decide') === o).length;
            if (count === 0) return null;
            return (
              <span key={o} style={{ color: OWN[o].dot, opacity: 0.75 }}>
                {count} {OWN[o].label}
              </span>
            );
          })}
        </div>

        <button
          disabled={!canStart}
          onClick={onStart}
          style={{
            width: '100%',
            background: canStart ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            border: `1px solid ${canStart ? `${catColor}42` : 'rgba(255,255,255,0.05)'}`,
            color: canStart ? 'rgba(255,255,255,0.88)' : 'rgba(255,255,255,0.2)',
            borderRadius: 18, padding: '13px 20px',
            fontSize: 14, fontWeight: 600,
            cursor: canStart ? 'pointer' : 'not-allowed',
            fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
            letterSpacing: '-0.01em',
            backdropFilter: 'blur(10px)',
            boxShadow: canStart ? `0 0 24px ${catColor}18` : 'none',
            transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10,
          }}
          onMouseEnter={e => {
            if (!canStart) return;
            const el = e.currentTarget as HTMLElement;
            el.style.background  = 'rgba(255,255,255,0.1)';
            el.style.boxShadow   = `0 0 32px ${catColor}28`;
            el.style.transform   = 'scale(1.01)';
          }}
          onMouseLeave={e => {
            if (!canStart) return;
            const el = e.currentTarget as HTMLElement;
            el.style.background  = 'rgba(255,255,255,0.06)';
            el.style.boxShadow   = `0 0 24px ${catColor}18`;
            el.style.transform   = 'scale(1)';
          }}
        >
          {!canStart
            ? 'Select at least one MINE field'
            : (
              <>
                Begin Session — {decideCount} field{decideCount !== 1 ? 's' : ''}
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                  <line x1="5" y1="12" x2="19" y2="12"/>
                  <polyline points="12 5 19 12 12 19"/>
                </svg>
              </>
            )}
        </button>
      </div>
    </div>
  );
}
