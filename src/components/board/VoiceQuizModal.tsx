import { createPortal } from 'react-dom';
import { useRef, useEffect, useState } from 'react';
import { useVoiceQuiz } from '../../hooks/useVoiceQuiz';
import { useImageStore } from '../../stores/useImageStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import type { FilledField } from '../../utils/voice-quiz';
import { FieldOwnershipDashboard } from './FieldOwnershipDashboard';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function stripMd(t: string) {
  return t.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
}

function formatTime(secs: number) {
  const m = Math.floor(secs / 60).toString().padStart(2, '0');
  const s = (secs % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

// ─── Colour system ────────────────────────────────────────────────────────────

const C = {
  amber:    (a = 0.9) => `rgba(251,191,36,${a})`,
  green:    (a = 0.9) => `rgba(74,222,128,${a})`,
  purple:   (a = 0.9) => `rgba(167,139,250,${a})`,
  blue:     (a = 0.9) => `rgba(99,179,237,${a})`,
  red:      (a = 0.9) => `rgba(248,113,113,${a})`,
  white:    (a = 0.9) => `rgba(255,255,255,${a})`,
  ink:      (a = 0.9) => `rgba(8,8,12,${a})`,
};

const STATUS_MAP: Record<string, { color: ReturnType<typeof C.amber>; label: string }> = {
  scoping:               { color: C.purple(),   label: 'Setup'      },
  'mode-select':         { color: C.white(0.5), label: 'Mode'       },
  analyzing:             { color: C.white(0.4), label: 'Analyzing'  },
  thinking:              { color: C.white(0.4), label: 'Thinking'   },
  listening:             { color: C.amber(),    label: 'Listening'  },
  processing:            { color: C.white(0.4), label: 'Processing' },
  'monologue-recording': { color: C.amber(),    label: 'Recording'  },
  'monologue-processing':{ color: C.white(0.4), label: 'Processing' },
  confirming:            { color: C.green(),    label: 'Review'     },
  error:                 { color: C.red(),      label: 'Error'      },
};

// ─── Root ─────────────────────────────────────────────────────────────────────

export function VoiceQuizModal() {
  const quiz = useVoiceQuiz();
  if (!quiz.isOpen) return null;
  return createPortal(<Sheet quiz={quiz} />, document.body);
}

// ─── Sheet ────────────────────────────────────────────────────────────────────

function Sheet({ quiz }: { quiz: ReturnType<typeof useVoiceQuiz> }) {
  const endRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal,   setEditVal]   = useState('');
  const [elapsed,   setElapsed]   = useState(0);

  const images = useImageStore(s => s.images);
  const image  = images.find(img => img.id === quiz.imageId);
  const imgUrl = useBlobUrl(image?.blobId ?? null);

  // Scroll chat to bottom
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [quiz.messages, quiz.liveTranscript]);

  // Space / Enter → done speaking
  useEffect(() => {
    if (quiz.status !== 'listening') return;
    const fn = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') { e.preventDefault(); quiz.manualStopListening(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [quiz.status, quiz.manualStopListening]);

  // Space → stop monologue
  useEffect(() => {
    if (quiz.status !== 'monologue-recording') return;
    const fn = (e: KeyboardEvent) => {
      if (e.code === 'Space') { e.preventDefault(); quiz.stopMonologue(); }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [quiz.status, quiz.stopMonologue]);

  // Monologue timer
  useEffect(() => {
    if (quiz.status !== 'monologue-recording') { setElapsed(0); return; }
    const id = setInterval(() => setElapsed(e => e + 1), 1000);
    return () => clearInterval(id);
  }, [quiz.status]);

  const s             = STATUS_MAP[quiz.status] ?? { color: C.white(0.4), label: '' };
  const isScoping     = quiz.status === 'scoping';
  const isModeSelect  = quiz.status === 'mode-select';
  const isListening   = quiz.status === 'listening';
  const isConfirming  = quiz.status === 'confirming';
  const isError       = quiz.status === 'error';
  const isMonRec      = quiz.status === 'monologue-recording';
  const isMonProc     = quiz.status === 'monologue-processing';
  const isBusy        = quiz.status === 'thinking' || quiz.status === 'processing' || quiz.status === 'analyzing';
  const showChat      = !isError && !isConfirming && !isScoping && !isModeSelect && !isMonRec && !isMonProc;

  // Inferred fields still needing confirmation
  const pending  = isConfirming ? quiz.filledFields.filter(f => f.wasInferred && !f.wasRejected && !f.isConfirmedByDirector) : [];
  const canWrite = isConfirming && quiz.filledFields.filter(f => !f.wasRejected).length > 0 && pending.length === 0;

  const activeColor = s.color;
  const isActive    = isListening || isMonRec;

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={quiz.closeQuiz}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.65)',
          backdropFilter: 'blur(28px) saturate(160%)',
          WebkitBackdropFilter: 'blur(28px) saturate(160%)',
        }}
      />

      {/* ── Sheet ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 720, maxWidth: '96vw',
          maxHeight: '90vh',
          zIndex: 9999,
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '32px 32px 0 0',
          background: C.ink(0.88),
          backdropFilter: 'blur(64px) saturate(200%)',
          WebkitBackdropFilter: 'blur(64px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderBottom: 'none',
          boxShadow: [
            '0 -8px 80px rgba(0,0,0,0.8)',
            '0 0 0 0.5px rgba(255,255,255,0.05)',
            `inset 0 1px 0 rgba(255,255,255,0.1)`,
          ].join(', '),
          animation: 'sheetUp 0.4s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag pill */}
        <div style={{
          width: 36, height: 5, borderRadius: 3,
          background: C.white(0.12),
          margin: '10px auto 0', flexShrink: 0,
        }} />

        {/* ── Header ── */}
        <div style={{
          padding: '12px 20px 10px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          {/* Left — status */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Status orb */}
            <div style={{ position: 'relative', flexShrink: 0 }}>
              <div style={{
                position: 'absolute', inset: -3, borderRadius: '50%',
                background: activeColor,
                filter: 'blur(8px)',
                opacity: isActive ? 0.5 : 0.15,
                animation: isActive ? 'orbGlow 1s ease infinite alternate' : 'none',
              }} />
              <div style={{
                width: 30, height: 30, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${activeColor}, ${activeColor.replace(/[\d.]+\)$/, '0.35)')})`,
                border: `1px solid ${activeColor.replace(/[\d.]+\)$/, '0.2)')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: isBusy ? 'orbSpin 2s linear infinite' : isActive ? 'orbPulse 0.9s ease infinite alternate' : 'none',
              }}>
                {isActive && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity={0.9}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 15, fontWeight: 600, letterSpacing: '-0.025em',
                fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
                color: C.white(0.9), lineHeight: 1.2,
                display: 'flex', alignItems: 'center', gap: 8,
              }}>
                Voice Director
                {quiz.singleFieldMode && (
                  <span style={{
                    fontSize: 10, fontWeight: 500, letterSpacing: '0.03em',
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: C.amber(0.7),
                    background: C.amber(0.08),
                    border: `1px solid ${C.amber(0.18)}`,
                    borderRadius: 6, padding: '2px 7px',
                  }}>
                    Re-record
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11, color: s.color, fontWeight: 500,
                fontFamily: '-apple-system, "Inter", sans-serif',
                letterSpacing: '0.01em',
              }}>
                {s.label}
              </div>
            </div>
          </div>

          {/* Right — controls */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* STRICT MODE toggle — shown during active quiz only */}
            {!isScoping && !isModeSelect && (
              <button
                onClick={() => quiz.setClarifyMode(!quiz.clarifyMode)}
                title={quiz.clarifyMode
                  ? 'Strict Mode ON: AI will ask a follow-up when your answer is vague or indirect. Click to turn off.'
                  : 'Strict Mode OFF: AI will make reasonable inferences from vague answers. Click to turn on.'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  background: quiz.clarifyMode ? C.amber(0.1) : C.white(0.04),
                  border: `1px solid ${quiz.clarifyMode ? C.amber(0.3) : C.white(0.08)}`,
                  borderRadius: 20,
                  padding: '5px 12px',
                  cursor: 'pointer',
                  boxShadow: quiz.clarifyMode ? `0 0 16px ${C.amber(0.2)}` : 'none',
                  transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
                }}
              >
                {/* Toggle track */}
                <div style={{
                  width: 24, height: 14, borderRadius: 7,
                  background: quiz.clarifyMode ? C.amber(0.6) : C.white(0.1),
                  position: 'relative',
                  transition: 'background 0.25s ease',
                  flexShrink: 0,
                }}>
                  <div style={{
                    position: 'absolute',
                    top: 2, left: quiz.clarifyMode ? 12 : 2,
                    width: 10, height: 10, borderRadius: '50%',
                    background: 'white',
                    transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                    boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                  }} />
                </div>
                <span style={{
                  fontSize: 10, fontWeight: 700,
                  fontFamily: '-apple-system, "SF Mono", monospace',
                  letterSpacing: '0.1em',
                  color: quiz.clarifyMode ? C.amber(0.9) : C.white(0.35),
                  transition: 'color 0.25s ease',
                }}>STRICT</span>
              </button>
            )}

            {/* Close */}
            <button
              onClick={quiz.closeQuiz}
              style={{
                width: 30, height: 30, borderRadius: '50%',
                background: C.white(0.06),
                border: `1px solid ${C.white(0.1)}`,
                color: C.white(0.5),
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease', flexShrink: 0,
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = C.white(0.12); (e.currentTarget as HTMLElement).style.color = C.white(0.85); }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = C.white(0.06); (e.currentTarget as HTMLElement).style.color = C.white(0.5); }}
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Single-field re-record banner */}
        {quiz.singleFieldMode && (
          <div style={{
            margin: '0 20px 8px',
            padding: '8px 14px',
            borderRadius: 12,
            background: C.amber(0.05),
            border: `1px solid ${C.amber(0.15)}`,
            borderLeft: `3px solid ${C.amber(0.5)}`,
            fontSize: 11, color: C.amber(0.65),
            fontFamily: '-apple-system, "Inter", sans-serif',
            flexShrink: 0,
          }}>
            Re-recording <strong style={{ color: C.amber(0.85), fontWeight: 600 }}>
              {quiz.targetFieldId?.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
            </strong> — all other fields preserved.
          </div>
        )}

        {/* ── Body ── */}
        <div style={{
          display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
          borderTop: `1px solid ${C.white(0.06)}`,
        }}>
          {/* Image column */}
          {imgUrl && (
            <div style={{
              width: 180, flexShrink: 0,
              borderRight: `1px solid ${C.white(0.05)}`,
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden', background: '#04040a',
            }}>
              {/* Image */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0 }}>
                <img src={imgUrl} alt="Reference"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
                {/* Fade bottom */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                  background: 'linear-gradient(to top, rgba(4,4,10,0.95), transparent)',
                  pointerEvents: 'none',
                }} />
                {/* Active ring */}
                {isActive && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    boxShadow: `inset 0 0 0 2px ${activeColor.replace(/[\d.]+\)$/, '0.5)')}`,
                    animation: 'orbPulse 1s ease infinite alternate',
                    pointerEvents: 'none',
                  }} />
                )}
                {quiz.categoryId && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 0, right: 0,
                    textAlign: 'center',
                    fontSize: 9, fontWeight: 700,
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: C.white(0.3),
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                  }}>
                    {quiz.categoryId.replace('edit-', '')}
                  </div>
                )}
              </div>

              {/* Field progress dots */}
              {quiz.allFields.length > 0 && (
                <div style={{
                  padding: '10px 12px 14px',
                  background: C.white(0.015),
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600,
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: C.white(0.2),
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    marginBottom: 8,
                  }}>
                    {quiz.filledFields.filter(f => !f.wasRejected).length} / {quiz.allFields.length} fields
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {quiz.allFields.map(field => {
                      const f = quiz.filledFields.find(x => x.fieldLabel === field);
                      const filled    = f && !f.wasRejected;
                      const inferred  = f?.wasInferred && !f.wasRejected;
                      const confirmed = filled && f?.isConfirmedByDirector;
                      return (
                        <div key={field} title={field} style={{
                          width: 14, height: 14, borderRadius: 4,
                          border: `1px solid ${filled
                            ? inferred && !confirmed ? C.amber(0.5)
                              : C.green(0.5)
                            : C.white(0.08)}`,
                          background: filled
                            ? inferred && !confirmed ? C.amber(0.18)
                              : C.green(0.18)
                            : C.white(0.03),
                          transition: 'all 0.3s ease',
                        }} />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {/* ── Error ── */}
            {isError && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '32px 28px', gap: 18,
              }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: C.red(0.1), border: `1px solid ${C.red(0.2)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, color: C.red(0.9),
                }}>!</div>
                <p style={{
                  fontSize: 13, color: C.red(0.8), lineHeight: 1.6,
                  fontFamily: '-apple-system, "Inter", sans-serif',
                  textAlign: 'center', maxWidth: 280, margin: 0,
                }}>
                  {quiz.errorMessage}
                </p>
                <Pill color={C.red(0.8)} onClick={quiz.closeQuiz}>Dismiss</Pill>
              </div>
            )}

            {/* ── Scoping (Field Ownership) ── */}
            {isScoping && (
              <FieldOwnershipDashboard
                allFields={quiz.allFields}
                fieldOwnership={quiz.fieldOwnership}
                categoryId={quiz.categoryId}
                onSetOwnership={quiz.setFieldOwnership}
                onSetAll={quiz.setAllOwnership}
                onStart={quiz.startFromOwnership}
              />
            )}

            {/* ── Mode Select ── */}
            {isModeSelect && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                padding: '20px 20px 16px', gap: 14,
              }}>
                {/* Header */}
                <div>
                  <div style={{
                    fontSize: 16, fontWeight: 600, letterSpacing: '-0.02em',
                    fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
                    color: C.white(0.9), marginBottom: 3,
                  }}>
                    How do you want to work?
                  </div>
                  <div style={{
                    fontSize: 11, color: C.white(0.3),
                    fontFamily: '-apple-system, "Inter", sans-serif',
                  }}>
                    {quiz.emptyFields.length} field{quiz.emptyFields.length !== 1 ? 's' : ''} to fill
                  </div>
                </div>

                {/* Guided card */}
                <ModeCard
                  title="Guided Q&A"
                  subtitle="I'll answer questions one by one"
                  detail="AI asks a single focused question for each field. Best when you want to be precise."
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  }
                  accent={C.blue(0.9)}
                  onClick={() => quiz.selectMode('guided')}
                />

                {/* Free Talk card */}
                <ModeCard
                  title="Free Talk"
                  subtitle="Describe the shot in your own words"
                  detail="AI only saves what you explicitly say — nothing is invented or inferred."
                  icon={
                    <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  }
                  accent={C.amber(0.9)}
                  onClick={() => quiz.selectMode('monologue')}
                />

                {/* Strict mode nudge */}
                <div style={{
                  padding: '10px 14px', borderRadius: 12,
                  background: C.white(0.02),
                  border: `1px solid ${C.white(0.06)}`,
                  display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                }}>
                  <div>
                    <span style={{
                      fontSize: 11, fontWeight: 600,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      color: quiz.clarifyMode ? C.amber(0.85) : C.white(0.5),
                    }}>
                      Strict Mode
                    </span>
                    <span style={{
                      fontSize: 10, color: C.white(0.25),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      marginLeft: 8,
                    }}>
                      {quiz.clarifyMode
                        ? 'ON — vague answers will trigger a follow-up'
                        : 'OFF — AI makes reasonable inferences'}
                    </span>
                  </div>
                  <button
                    onClick={() => quiz.setClarifyMode(!quiz.clarifyMode)}
                    style={{
                      width: 36, height: 22, borderRadius: 11,
                      background: quiz.clarifyMode ? C.amber(0.7) : C.white(0.1),
                      border: 'none', cursor: 'pointer',
                      position: 'relative',
                      transition: 'background 0.25s ease',
                      flexShrink: 0,
                    }}
                  >
                    <div style={{
                      position: 'absolute',
                      top: 3, left: quiz.clarifyMode ? 17 : 3,
                      width: 16, height: 16, borderRadius: '50%',
                      background: 'white',
                      transition: 'left 0.25s cubic-bezier(0.34,1.56,0.64,1)',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.4)',
                    }} />
                  </button>
                </div>
              </div>
            )}

            {/* ── Monologue Recording ── */}
            {isMonRec && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '28px', gap: 28,
              }}>
                {/* Orb */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    position: 'absolute', inset: -16, borderRadius: '50%',
                    background: C.amber(0.12),
                    filter: 'blur(20px)',
                    animation: 'orbGlow 1.5s ease infinite alternate',
                  }} />
                  <div style={{
                    width: 110, height: 110, borderRadius: '50%',
                    background: `radial-gradient(circle at 35% 30%, ${C.amber(0.16)}, ${C.amber(0.05)})`,
                    border: `1px solid ${C.amber(0.3)}`,
                    backdropFilter: 'blur(20px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center', gap: 6,
                    animation: 'orbBreathe 2.2s ease-in-out infinite',
                    boxShadow: `0 0 50px ${C.amber(0.18)}, inset 0 1px 0 ${C.amber(0.2)}`,
                  }}>
                    <svg width="26" height="26" viewBox="0 0 24 24" fill="none"
                      stroke={C.amber(0.88)} strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    <span style={{
                      fontSize: 18, fontWeight: 700, letterSpacing: '-0.03em',
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: C.amber(0.92),
                    }}>
                      {formatTime(elapsed)}
                    </span>
                  </div>
                </div>

                {/* Waveform */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 28 }}>
                  {Array.from({ length: 30 }, (_, i) => (
                    <div key={i} style={{
                      width: 2.5, borderRadius: 2,
                      background: C.amber(0.55),
                      animation: `waveBar 0.8s ease ${(i * 0.033) % 0.4}s infinite alternate`,
                    }} />
                  ))}
                </div>

                <div style={{ textAlign: 'center', maxWidth: 320 }}>
                  <p style={{
                    fontSize: 14, fontWeight: 500, color: C.white(0.75),
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    margin: '0 0 6px',
                  }}>
                    Describe the shot however you like.
                  </p>
                  <p style={{
                    fontSize: 11, color: C.white(0.28),
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    fontStyle: 'italic', margin: 0, lineHeight: 1.5,
                  }}>
                    Only what you explicitly say will be saved — nothing is invented.
                  </p>
                </div>

                <button
                  onClick={quiz.stopMonologue}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 9,
                    background: C.red(0.08), border: `1px solid ${C.red(0.2)}`,
                    color: C.red(0.85), borderRadius: 18,
                    padding: '12px 28px', fontSize: 13, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.red(0.15); el.style.boxShadow = `0 0 24px ${C.red(0.18)}`; }}
                  onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.red(0.08); el.style.boxShadow = 'none'; }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2.5"/>
                  </svg>
                  Stop & Analyze
                  <kbd style={{
                    fontSize: 10, fontFamily: '-apple-system, "SF Mono", monospace',
                    opacity: 0.5, background: C.red(0.12),
                    border: `1px solid ${C.red(0.2)}`,
                    borderRadius: 5, padding: '1px 6px',
                  }}>Space</kbd>
                </button>
              </div>
            )}

            {/* ── Monologue processing ── */}
            {isMonProc && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center', gap: 16,
              }}>
                <div style={{ display: 'flex', gap: 6 }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 7, height: 7, borderRadius: '50%',
                      background: C.white(0.4),
                      animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 12, color: C.white(0.3),
                  fontFamily: '-apple-system, "Inter", sans-serif',
                }}>
                  Extracting what you described…
                </span>
              </div>
            )}

            {/* ── Confirming / Review ── */}
            {isConfirming && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px 8px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Header */}
                <div style={{ marginBottom: 2, flexShrink: 0 }}>
                  {quiz.inputMode === 'monologue' ? (
                    <>
                      <div style={{
                        fontSize: 13, fontWeight: 600,
                        color: C.green(0.8),
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        marginBottom: 2,
                      }}>
                        You described {quiz.filledFields.filter(f => !f.wasRejected).length} of {quiz.allFields.length} fields
                      </div>
                      {quiz.emptyFields.length > 0 && (
                        <div style={{
                          fontSize: 10, color: C.white(0.25),
                          fontFamily: '-apple-system, "Inter", sans-serif',
                        }}>
                          {quiz.emptyFields.length} field{quiz.emptyFields.length !== 1 ? 's' : ''} not described — review below, then choose to fill them or write as-is.
                        </div>
                      )}
                    </>
                  ) : (
                    <div style={{
                      fontSize: 12, color: C.white(0.3),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      Review before writing
                      {pending.length > 0 && (
                        <span style={{ color: C.amber(0.7), marginLeft: 8 }}>
                          · {pending.length} field{pending.length !== 1 ? 's' : ''} need your confirmation
                        </span>
                      )}
                    </div>
                  )}
                </div>

                {/* Field cards */}
                {quiz.filledFields.map(field => (
                  <FieldCard
                    key={field.fieldId}
                    field={field}
                    isEditing={editingId === field.fieldId}
                    editValue={editVal}
                    onStartEdit={() => { setEditingId(field.fieldId); setEditVal(field.value); }}
                    onSaveEdit={() => { quiz.editField(field.fieldId, editVal); setEditingId(null); }}
                    onCancelEdit={() => setEditingId(null)}
                    onEditChange={setEditVal}
                    onReject={() => quiz.rejectField(field.fieldId)}
                    onConfirmInferred={() => quiz.confirmInferredField(field.fieldId)}
                  />
                ))}

                {quiz.filledFields.filter(f => !f.wasRejected).length === 0 && (
                  <div style={{
                    fontSize: 12, color: C.white(0.2),
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    textAlign: 'center', padding: '24px 0',
                  }}>
                    No fields captured.
                  </div>
                )}

                {/* Empty fields pill list (monologue) */}
                {quiz.inputMode === 'monologue' && quiz.emptyFields.length > 0 && (
                  <div style={{
                    marginTop: 2, padding: '12px 14px', borderRadius: 14,
                    background: C.white(0.02),
                    border: `1px solid ${C.white(0.06)}`,
                    flexShrink: 0,
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: C.amber(0.5),
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      marginBottom: 8,
                    }}>
                      Not described · {quiz.emptyFields.length}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {quiz.emptyFields.map(f => (
                        <span key={f} style={{
                          fontSize: 10, color: C.white(0.3),
                          fontFamily: '-apple-system, "Inter", sans-serif',
                          padding: '3px 9px', borderRadius: 6,
                          background: C.white(0.03),
                          border: `1px solid ${C.white(0.06)}`,
                        }}>{f}</span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Actions */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 8, paddingTop: 4, flexShrink: 0 }}>
                  {quiz.inputMode === 'monologue' && quiz.emptyFields.length > 0 && (
                    <button
                      onClick={quiz.continueWithGuidedAfterMonologue}
                      style={{
                        background: C.purple(0.08), border: `1px solid ${C.purple(0.2)}`,
                        color: C.purple(0.85), borderRadius: 14, padding: '10px 18px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.purple(0.14)}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.purple(0.08)}
                    >
                      Fill the remaining {quiz.emptyFields.length} with Q&A →
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <Pill color={C.red(0.75)} onClick={quiz.closeQuiz}>Discard</Pill>
                    <button
                      onClick={() => quiz.confirmFields(quiz.filledFields)}
                      disabled={!canWrite}
                      title={!canWrite && pending.length > 0 ? 'Confirm the highlighted fields first' : undefined}
                      style={{
                        flex: 1,
                        background: canWrite ? C.green(0.12) : C.white(0.04),
                        border: `1px solid ${canWrite ? C.green(0.25) : C.white(0.07)}`,
                        color: canWrite ? C.green(0.9) : C.white(0.2),
                        borderRadius: 14, padding: '12px 20px',
                        fontSize: 13, fontWeight: 600,
                        cursor: canWrite ? 'pointer' : 'not-allowed',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        transition: 'all 0.25s ease',
                        boxShadow: canWrite ? `0 0 24px ${C.green(0.12)}` : 'none',
                      }}
                      onMouseEnter={e => { if (canWrite) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 32px ${C.green(0.2)}`; }}
                      onMouseLeave={e => { if (canWrite) (e.currentTarget as HTMLElement).style.boxShadow = `0 0 24px ${C.green(0.12)}`; }}
                    >
                      {canWrite
                        ? 'Write to node'
                        : pending.length > 0
                          ? `Confirm ${pending.length} inferred field${pending.length !== 1 ? 's' : ''} first`
                          : 'Write to node'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Conversation ── */}
            {showChat && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex', flexDirection: 'column', gap: 12,
              }}>
                {/* Analyzing placeholder */}
                {quiz.status === 'analyzing' && quiz.messages.length === 0 && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    flexDirection: 'column', gap: 12,
                  }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 6, height: 6, borderRadius: '50%',
                          background: C.white(0.3),
                          animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 12, color: C.white(0.25),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>Reading the image…</span>
                  </div>
                )}

                {/* Strict mode active hint */}
                {quiz.clarifyMode && (isListening || quiz.status === 'thinking') && (
                  <div style={{
                    padding: '7px 12px', borderRadius: 10,
                    background: C.amber(0.06), border: `1px solid ${C.amber(0.15)}`,
                    fontSize: 10, color: C.amber(0.6),
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    display: 'flex', alignItems: 'center', gap: 7,
                    flexShrink: 0,
                  }}>
                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: C.amber(0.7), flexShrink: 0 }} />
                    Strict Mode — speak clearly, AI will ask again if your answer is vague
                  </div>
                )}

                {/* Messages */}
                {quiz.messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                    gap: 4,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: msg.role === 'ai' ? C.blue(0.4) : C.amber(0.4),
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>
                      {msg.role === 'ai' ? 'Director AI' : 'You'}
                    </span>
                    <div style={{
                      maxWidth: '86%',
                      padding: '10px 15px',
                      borderRadius: msg.role === 'ai' ? '5px 16px 16px 16px' : '16px 5px 16px 16px',
                      background: msg.role === 'ai' ? C.blue(0.07) : C.amber(0.07),
                      border: `1px solid ${msg.role === 'ai' ? C.blue(0.12) : C.amber(0.12)}`,
                      backdropFilter: 'blur(10px)',
                      fontSize: msg.role === 'ai' ? 12.5 : 13,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      color: msg.role === 'ai' ? 'rgba(186,215,242,0.88)' : 'rgba(253,230,138,0.88)',
                      lineHeight: 1.55,
                    }}>
                      {msg.role === 'ai' ? stripMd(msg.text) : msg.text}
                    </div>
                  </div>
                ))}

                {/* Live transcript */}
                {isListening && (
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: 4,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: C.amber(0.4),
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>You</span>
                    <div style={{
                      maxWidth: '86%', padding: '11px 15px',
                      borderRadius: '16px 5px 16px 16px',
                      background: C.amber(0.06), border: `1px solid ${C.amber(0.15)}`,
                      backdropFilter: 'blur(10px)',
                      fontSize: 13, fontFamily: '-apple-system, "Inter", sans-serif',
                      color: 'rgba(253,230,138,0.9)', lineHeight: 1.55,
                      display: 'flex', alignItems: 'flex-start', gap: 9, minHeight: 46,
                    }}>
                      {/* Mini waveform */}
                      <div style={{ display: 'flex', gap: 2, alignItems: 'center', marginTop: 3, flexShrink: 0 }}>
                        {[0, 1, 2, 3].map(i => (
                          <div key={i} style={{
                            width: 2, borderRadius: 2,
                            background: C.amber(0.7),
                            animation: `waveBar 0.8s ease ${i * 0.13}s infinite alternate`,
                          }} />
                        ))}
                      </div>
                      <span>
                        {quiz.liveTranscript || (
                          <span style={{ color: 'rgba(253,230,138,0.3)', fontStyle: 'italic' }}>
                            Speak now…
                          </span>
                        )}
                        <span style={{ animation: 'blink 1s step-end infinite', marginLeft: 1 }}>|</span>
                      </span>
                    </div>
                  </div>
                )}

                {/* Thinking dots */}
                {(quiz.status === 'thinking' || quiz.status === 'processing') && (
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '2px 4px',
                  }}>
                    <div style={{ display: 'flex', gap: 5 }}>
                      {[0, 1, 2].map(i => (
                        <div key={i} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: C.white(0.4),
                          animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 11, color: C.white(0.25),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.status === 'processing' ? 'Transcribing…' : 'Generating question…'}
                    </span>
                  </div>
                )}

                <div ref={endRef} />
              </div>
            )}

            {/* ── Bottom bar ── */}
            {!isError && !isScoping && !isModeSelect && !isMonRec && !isMonProc && (
              <div style={{
                padding: '10px 16px 14px',
                borderTop: `1px solid ${C.white(0.05)}`,
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0, gap: 10,
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 10 }}>
                  {isListening && (
                    <button
                      onClick={quiz.manualStopListening}
                      style={{
                        background: C.amber(0.1), border: `1px solid ${C.amber(0.22)}`,
                        color: C.amber(0.9), borderRadius: 14,
                        padding: '9px 18px', fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 8,
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.amber(0.18)}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.amber(0.1)}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2.5"/>
                      </svg>
                      Done Speaking
                      <kbd style={{
                        fontSize: 9, fontFamily: '-apple-system, "SF Mono", monospace',
                        opacity: 0.55, background: C.amber(0.15),
                        border: `1px solid ${C.amber(0.2)}`,
                        borderRadius: 5, padding: '1px 6px',
                      }}>Space</kbd>
                    </button>
                  )}

                  {isBusy && (
                    <span style={{
                      fontSize: 11, color: C.white(0.2),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.messages.length > 0
                        ? `${Math.floor(quiz.messages.length / 2)} exchange${Math.floor(quiz.messages.length / 2) !== 1 ? 's' : ''}`
                        : 'Starting…'}
                    </span>
                  )}

                  {isConfirming && (
                    <span style={{
                      fontSize: 11, color: C.green(0.7),
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.filledFields.filter(f => !f.wasRejected).length} field{quiz.filledFields.filter(f => !f.wasRejected).length !== 1 ? 's' : ''} captured
                    </span>
                  )}
                </div>

                {!isConfirming && (
                  <button
                    onClick={quiz.closeQuiz}
                    style={{
                      background: C.red(0.06), border: `1px solid ${C.red(0.14)}`,
                      color: C.red(0.65), borderRadius: 12,
                      padding: '8px 14px', fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 6,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      backdropFilter: 'blur(10px)', flexShrink: 0,
                      transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.red(0.13); el.style.color = C.red(0.9); }}
                    onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.background = C.red(0.06); el.style.color = C.red(0.65); }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    {quiz.filledFields.filter(f => !f.wasRejected).length > 0 ? 'Save & Exit' : 'Cancel'}
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status bar */}
        <div style={{
          height: 2,
          background: s.color,
          opacity: isActive ? 0.65 : 0.2,
          transition: 'background 0.4s ease, opacity 0.4s ease',
          animation: isActive ? 'statusWave 0.8s ease infinite alternate' : 'none',
          flexShrink: 0,
        }} />
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes orbPulse {
          from { opacity: 0.5; transform: scale(0.96); }
          to   { opacity: 1;   transform: scale(1.04); }
        }
        @keyframes orbGlow {
          from { opacity: 0.35; transform: scale(0.95); }
          to   { opacity: 0.7;  transform: scale(1.05); }
        }
        @keyframes orbSpin {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes orbBreathe {
          0%,100% { box-shadow: 0 0 24px rgba(251,191,36,0.12), inset 0 1px 0 rgba(255,255,255,0.05); transform: scale(1); }
          50%     { box-shadow: 0 0 52px rgba(251,191,36,0.32), inset 0 1px 0 rgba(255,255,255,0.1); transform: scale(1.02); }
        }
        @keyframes waveBar {
          from { height: 3px;  opacity: 0.35; }
          to   { height: 15px; opacity: 0.9; }
        }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes bounce {
          0%,80%,100% { transform: translateY(0); }
          40%         { transform: translateY(-5px); }
        }
        @keyframes statusWave {
          from { opacity: 0.25; }
          to   { opacity: 0.75; }
        }
        @keyframes chipPulse {
          0%,100% { opacity: 0.65; }
          50%     { opacity: 1; }
        }
        @keyframes fieldIn {
          from { opacity: 0; transform: translateY(5px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  title, subtitle, detail, icon, accent, onClick,
}: {
  title: string; subtitle: string; detail: string;
  icon: React.ReactNode; accent: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.white(0.03),
        border: `1px solid ${C.white(0.08)}`,
        borderRadius: 20,
        padding: '18px 20px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'flex-start', gap: 16,
        backdropFilter: 'blur(20px)',
        transition: 'all 0.3s cubic-bezier(0.34,1.56,0.64,1)',
        flex: 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background   = accent.replace(/[\d.]+\)$/, '0.07)');
        el.style.borderColor  = accent.replace(/[\d.]+\)$/, '0.28)');
        el.style.boxShadow    = `0 0 28px ${accent.replace(/[\d.]+\)$/, '0.14)')}`;
        el.style.transform    = 'scale(1.01)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background   = C.white(0.03);
        el.style.borderColor  = C.white(0.08);
        el.style.boxShadow    = 'none';
        el.style.transform    = 'scale(1)';
      }}
    >
      {/* Icon */}
      <div style={{
        width: 44, height: 44, borderRadius: 14, flexShrink: 0,
        background: accent.replace(/[\d.]+\)$/, '0.08)'),
        border: `1px solid ${accent.replace(/[\d.]+\)$/, '0.18)')}`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: accent, marginTop: 1,
      }}>
        {icon}
      </div>

      {/* Text */}
      <div style={{ flex: 1 }}>
        <div style={{
          fontSize: 14, fontWeight: 600, letterSpacing: '-0.01em',
          fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
          color: C.white(0.9), marginBottom: 3,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 11.5, fontWeight: 500,
          fontFamily: '-apple-system, "Inter", sans-serif',
          color: C.white(0.55), marginBottom: 5,
        }}>
          {subtitle}
        </div>
        <div style={{
          fontSize: 10.5,
          fontFamily: '-apple-system, "Inter", sans-serif',
          color: C.white(0.3), lineHeight: 1.45,
        }}>
          {detail}
        </div>
      </div>

      {/* Chevron */}
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none"
        stroke={C.white(0.25)} strokeWidth="2" strokeLinecap="round" style={{ marginTop: 14, flexShrink: 0 }}>
        <polyline points="9 18 15 12 9 6"/>
      </svg>
    </button>
  );
}

// ─── Glass Pill button ────────────────────────────────────────────────────────

function Pill({ onClick, children, color = C.white(0.6) }: {
  onClick: () => void; children: React.ReactNode; color?: string;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: color.replace(/[\d.]+\)$/, '0.08)'),
        border: `1px solid ${color.replace(/[\d.]+\)$/, '0.18)')}`,
        color, borderRadius: 14, padding: '10px 18px',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: '-apple-system, "Inter", sans-serif',
        backdropFilter: 'blur(10px)',
        transition: 'all 0.15s ease',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = color.replace(/[\d.]+\)$/, '0.15)')}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = color.replace(/[\d.]+\)$/, '0.08)')}
    >
      {children}
    </button>
  );
}

// ─── Field Card ───────────────────────────────────────────────────────────────

function FieldCard({
  field, isEditing, editValue,
  onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onReject, onConfirmInferred,
}: {
  field: FilledField; isEditing: boolean; editValue: string;
  onStartEdit: () => void; onSaveEdit: () => void;
  onCancelEdit: () => void; onEditChange: (v: string) => void;
  onReject: () => void; onConfirmInferred: () => void;
}) {
  const [correcting, setCorrecting] = useState(false);
  const [correctVal, setCorrectVal] = useState('');

  // Rejected — show strike-through row
  if (field.wasRejected) {
    return (
      <div style={{
        padding: '9px 14px', borderRadius: 12,
        border: `1px solid ${C.white(0.05)}`,
        background: C.white(0.02), opacity: 0.35,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        animation: 'fieldIn 0.25s ease',
      }}>
        <span style={{
          fontSize: 11, color: C.white(0.4),
          fontFamily: '-apple-system, "Inter", sans-serif',
          textDecoration: 'line-through',
        }}>{field.fieldLabel}</span>
        <span style={{ fontSize: 10, color: C.white(0.2) }}>Removed</span>
      </div>
    );
  }

  const needsConfirm = field.wasInferred && !field.isConfirmedByDirector;
  const borderColor  = needsConfirm ? C.amber(0.28) : C.green(0.2);
  const bgColor      = needsConfirm ? C.amber(0.05) : C.green(0.04);
  const labelColor   = needsConfirm ? C.amber(0.85) : C.green(0.8);
  const leftBar      = needsConfirm ? C.amber(0.5)  : C.green(0.4);

  return (
    <div style={{
      borderRadius: 14,
      border: `1px solid ${borderColor}`,
      borderLeft: `3px solid ${leftBar}`,
      background: bgColor,
      backdropFilter: 'blur(12px)',
      display: 'flex', flexDirection: 'column',
      transition: 'all 0.3s ease',
      animation: 'fieldIn 0.3s ease',
      overflow: 'hidden',
    }}>
      {/* Top row — label + chips + actions */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px 0',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, flex: 1, minWidth: 0 }}>
          <span style={{
            fontSize: 9.5, fontWeight: 700,
            fontFamily: '-apple-system, "SF Mono", monospace',
            color: labelColor,
            textTransform: 'uppercase', letterSpacing: '0.09em',
          }}>
            {field.fieldLabel}
          </span>

          {/* AI INFERRED badge */}
          {needsConfirm && (
            <span style={{
              fontSize: 8, fontWeight: 700,
              fontFamily: '-apple-system, "SF Mono", monospace',
              color: C.amber(0.85),
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: C.amber(0.1),
              border: `1px solid ${C.amber(0.25)}`,
              borderRadius: 6, padding: '2px 7px',
              animation: 'chipPulse 2.5s ease-in-out infinite',
              flexShrink: 0,
            }}>
              AI INFERRED ◆
            </span>
          )}
          {/* Confirmed inferred badge */}
          {field.wasInferred && field.isConfirmedByDirector && (
            <span style={{
              fontSize: 8, fontWeight: 700,
              fontFamily: '-apple-system, "SF Mono", monospace',
              color: C.green(0.7),
              letterSpacing: '0.09em', textTransform: 'uppercase',
              background: C.green(0.06),
              border: `1px solid ${C.green(0.15)}`,
              borderRadius: 6, padding: '2px 7px',
              flexShrink: 0,
            }}>
              ✓ CONFIRMED
            </span>
          )}
        </div>

        {!isEditing && !correcting && (
          <div style={{ display: 'flex', gap: 5, flexShrink: 0 }}>
            <SmallBtn onClick={onStartEdit}>Edit</SmallBtn>
            <SmallBtn onClick={onReject}>Remove</SmallBtn>
          </div>
        )}
      </div>

      {/* Source words — director's actual words */}
      {field.sourceWords && field.sourceWords !== field.value && (
        <div style={{
          margin: '6px 14px 0',
          padding: '6px 10px',
          borderRadius: 8,
          background: C.amber(0.04),
          border: `1px solid ${C.amber(0.1)}`,
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={C.amber(0.35)} strokeWidth="2" style={{ flexShrink: 0, marginTop: 1 }}>
            <path d="M3 21c3 0 7-1 7-8V5c0-1.25-.756-2.017-2-2H4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2 1 0 1 0 1 1v1c0 1-1 2-2 2s-1 .008-1 1.031V20c0 1 0 1 1 1z"/>
            <path d="M15 21c3 0 7-1 7-8V5c0-1.25-.757-2.017-2-2h-4c-1.25 0-2 .75-2 1.972V11c0 1.25.75 2 2 2h.75c0 2.25.25 4-2.75 4v3c0 1 0 1 1 1z"/>
          </svg>
          <span style={{
            fontSize: 10.5, color: C.amber(0.65),
            fontFamily: '-apple-system, "Inter", sans-serif',
            fontStyle: 'italic', lineHeight: 1.4,
          }}>
            {field.sourceWords}
          </span>
        </div>
      )}

      {/* Value row */}
      <div style={{ padding: '6px 14px 10px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              autoFocus type="text"
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              onKeyDown={e => {
                if (e.key === 'Enter') { e.stopPropagation(); onSaveEdit(); }
                if (e.key === 'Escape') onCancelEdit();
              }}
              style={{
                flex: 1, background: C.white(0.04),
                border: `1px solid ${C.white(0.1)}`,
                borderRadius: 8, color: C.white(0.85),
                fontSize: 12, fontFamily: '-apple-system, "Inter", sans-serif',
                padding: '6px 10px', outline: 'none',
              }}
            />
            <SmallBtn onClick={onSaveEdit}>Save</SmallBtn>
            <SmallBtn onClick={onCancelEdit}>✕</SmallBtn>
          </div>
        ) : correcting ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              autoFocus type="text"
              value={correctVal}
              onChange={e => setCorrectVal(e.target.value)}
              placeholder="Type the correct value…"
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onEditChange(correctVal); onSaveEdit(); onConfirmInferred(); setCorrecting(false);
                }
                if (e.key === 'Escape') setCorrecting(false);
              }}
              style={{
                flex: 1, background: C.white(0.04),
                border: `1px solid ${C.amber(0.2)}`,
                borderRadius: 8, color: 'rgba(253,230,138,0.85)',
                fontSize: 12, fontFamily: '-apple-system, "Inter", sans-serif',
                padding: '6px 10px', outline: 'none',
              }}
            />
            <SmallBtn onClick={() => {
              onEditChange(correctVal); onSaveEdit(); onConfirmInferred(); setCorrecting(false);
            }}>Save</SmallBtn>
            <SmallBtn onClick={() => setCorrecting(false)}>✕</SmallBtn>
          </div>
        ) : (
          <div style={{
            fontSize: 13, color: C.white(0.84),
            fontFamily: '-apple-system, "Inter", sans-serif',
            lineHeight: 1.45,
          }}>
            {field.value}
          </div>
        )}

        {/* Confirm / Correct buttons for inferred fields */}
        {!isEditing && !correcting && needsConfirm && (
          <div style={{ display: 'flex', gap: 7, marginTop: 10 }}>
            <button
              onClick={onConfirmInferred}
              style={{
                background: C.green(0.09), border: `1px solid ${C.green(0.22)}`,
                color: C.green(0.88),
                borderRadius: 10, padding: '6px 14px',
                fontSize: 11, fontWeight: 600, cursor: 'pointer',
                fontFamily: '-apple-system, "Inter", sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = C.green(0.16)}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = C.green(0.09)}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Looks right
            </button>
            <button
              onClick={() => { setCorrecting(true); setCorrectVal(field.value); }}
              style={{
                background: C.white(0.04), border: `1px solid ${C.white(0.09)}`,
                color: C.white(0.45),
                borderRadius: 10, padding: '6px 12px',
                fontSize: 11, cursor: 'pointer',
                fontFamily: '-apple-system, "Inter", sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => { const el = e.currentTarget as HTMLElement; el.style.color = C.white(0.75); el.style.borderColor = C.white(0.15); }}
              onMouseLeave={e => { const el = e.currentTarget as HTMLElement; el.style.color = C.white(0.45); el.style.borderColor = C.white(0.09); }}
            >
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
              </svg>
              Correct it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── Small action button ──────────────────────────────────────────────────────

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: C.white(0.04),
        border: `1px solid ${C.white(0.08)}`,
        color: C.white(0.4),
        borderRadius: 7, padding: '3px 10px',
        fontSize: 10, cursor: 'pointer',
        fontFamily: '-apple-system, "Inter", sans-serif',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = C.white(0.78)}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = C.white(0.4)}
    >
      {children}
    </button>
  );
}
