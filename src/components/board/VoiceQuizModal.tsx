import { createPortal } from 'react-dom';
import { useRef, useEffect, useState } from 'react';
import { useVoiceQuiz } from '../../hooks/useVoiceQuiz';
import { useImageStore } from '../../stores/useImageStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import type { FilledField } from '../../utils/voice-quiz';
import { FieldOwnershipDashboard } from './FieldOwnershipDashboard';

function stripMd(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
}

const STATUS: Record<string, { color: string; label: string; glow: string }> = {
  scoping:               { color: 'rgba(167,139,250,0.9)', label: 'Setup',       glow: 'rgba(167,139,250,0.15)' },
  'mode-select':         { color: 'rgba(148,163,184,0.9)', label: 'Mode',        glow: 'rgba(148,163,184,0.15)' },
  analyzing:             { color: 'rgba(148,163,184,0.9)', label: 'Analyzing',   glow: 'rgba(148,163,184,0.15)' },
  thinking:              { color: 'rgba(148,163,184,0.9)', label: 'Thinking',    glow: 'rgba(148,163,184,0.15)' },
  listening:             { color: 'rgba(251,191,36,0.95)', label: 'Listening',   glow: 'rgba(251,191,36,0.2)'  },
  processing:            { color: 'rgba(148,163,184,0.9)', label: 'Processing',  glow: 'rgba(148,163,184,0.15)' },
  'monologue-recording': { color: 'rgba(251,191,36,0.95)', label: 'Recording',   glow: 'rgba(251,191,36,0.2)'  },
  'monologue-processing':{ color: 'rgba(148,163,184,0.9)', label: 'Processing',  glow: 'rgba(148,163,184,0.15)' },
  confirming:            { color: 'rgba(74,222,128,0.95)', label: 'Review',      glow: 'rgba(74,222,128,0.2)'  },
  error:                 { color: 'rgba(248,113,113,0.95)', label: 'Error',      glow: 'rgba(248,113,113,0.2)'  },
};

export function VoiceQuizModal() {
  const quiz = useVoiceQuiz();
  if (!quiz.isOpen) return null;
  return createPortal(<Overlay quiz={quiz} />, document.body);
}

function Overlay({ quiz }: { quiz: ReturnType<typeof useVoiceQuiz> }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editVal, setEditVal] = useState('');
  const [elapsed, setElapsed] = useState(0);

  const images = useImageStore(s => s.images);
  const image  = images.find(img => img.id === quiz.imageId);
  const imgUrl = useBlobUrl(image?.blobId ?? null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [quiz.messages, quiz.liveTranscript]);

  // Space / Enter = done speaking (guided mode)
  useEffect(() => {
    if (quiz.status !== 'listening') return;
    const fn = (e: KeyboardEvent) => {
      if (e.code === 'Space' || e.code === 'Enter') {
        e.preventDefault();
        quiz.manualStopListening();
      }
    };
    window.addEventListener('keydown', fn);
    return () => window.removeEventListener('keydown', fn);
  }, [quiz.status, quiz.manualStopListening]);

  // Space = stop monologue
  useEffect(() => {
    if (quiz.status !== 'monologue-recording') return;
    const fn = (e: KeyboardEvent) => {
      if (e.code === 'Space') {
        e.preventDefault();
        quiz.stopMonologue();
      }
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

  const s = STATUS[quiz.status] ?? { color: 'rgba(255,255,255,0.4)', label: '', glow: 'transparent' };
  const isListening           = quiz.status === 'listening';
  const isConfirming          = quiz.status === 'confirming';
  const isError               = quiz.status === 'error';
  const isScoping             = quiz.status === 'scoping';
  const isModeSelect          = quiz.status === 'mode-select';
  const isMonologueRecording  = quiz.status === 'monologue-recording';
  const isMonologueProcessing = quiz.status === 'monologue-processing';
  const isThinking            = quiz.status === 'thinking' || quiz.status === 'processing';
  const isAnalyzing           = quiz.status === 'analyzing';
  const showConversation      = !isError && !isConfirming && !isScoping && !isModeSelect && !isMonologueRecording && !isMonologueProcessing;

  // Inferred fields that need explicit director confirmation
  const pendingConfirmation = isConfirming
    ? quiz.filledFields.filter(f => f.wasInferred && !f.wasRejected && !f.isConfirmedByDirector)
    : [];
  const canWrite = isConfirming
    && quiz.filledFields.filter(f => !f.wasRejected).length > 0
    && pendingConfirmation.length === 0;

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60).toString().padStart(2, '0');
    const s2 = (secs % 60).toString().padStart(2, '0');
    return `${m}:${s2}`;
  };

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={quiz.closeQuiz}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(24px) saturate(180%)',
          WebkitBackdropFilter: 'blur(24px) saturate(180%)',
        }}
      />

      {/* ── Sheet ── */}
      <div
        onClick={e => e.stopPropagation()}
        style={{
          position: 'fixed',
          bottom: 0, left: '50%',
          transform: 'translateX(-50%)',
          width: 740,
          maxWidth: '96vw',
          maxHeight: '88vh',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '28px 28px 0 0',
          background: 'rgba(10,11,17,0.75)',
          backdropFilter: 'blur(48px) saturate(220%)',
          WebkitBackdropFilter: 'blur(48px) saturate(220%)',
          border: '1px solid rgba(255,255,255,0.09)',
          borderBottom: 'none',
          boxShadow: '0 -4px 80px rgba(0,0,0,0.7), 0 0 0 0.5px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.08)',
          animation: 'sheetUp 0.36s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag pill */}
        <div style={{
          width: 40, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.1)',
          margin: '12px auto 0',
          flexShrink: 0,
        }} />

        {/* ── Header ── */}
        <div style={{
          padding: '10px 20px 12px',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {/* Animated status orb */}
            <div style={{ position: 'relative', width: 28, height: 28 }}>
              <div style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                background: s.glow,
                filter: 'blur(6px)',
                animation: (isListening || isMonologueRecording) ? 'orbPulse 1s ease infinite alternate' : 'none',
              }} />
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${s.color}, ${s.color.replace('0.95','0.4').replace('0.9','0.3')})`,
                border: `1px solid ${s.color.replace('0.95','0.25').replace('0.9','0.2')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: (isAnalyzing || isThinking || isMonologueProcessing)
                  ? 'orbSpin 2s linear infinite'
                  : (isListening || isMonologueRecording)
                    ? 'orbPulse 0.8s ease infinite alternate'
                    : 'none',
              }}>
                {(isListening || isMonologueRecording) && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="white" opacity={0.9}>
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                )}
              </div>
            </div>

            <div>
              <div style={{
                fontSize: 14, fontWeight: 600,
                color: 'rgba(255,255,255,0.88)',
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", sans-serif',
                letterSpacing: '-0.02em', lineHeight: 1.2,
              }}>
                Voice Director
                {quiz.singleFieldMode && quiz.targetFieldId && (
                  <span style={{
                    marginLeft: 8, fontSize: 10, fontWeight: 500,
                    color: 'rgba(251,191,36,0.7)',
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    letterSpacing: '0.04em',
                  }}>
                    · {quiz.targetFieldId.replace(/-/g, ' ').replace(/\b\w/g, c => c.toUpperCase())}
                  </span>
                )}
              </div>
              <div style={{
                fontSize: 11, color: s.color,
                fontFamily: '-apple-system, "Inter", sans-serif',
                fontWeight: 500, letterSpacing: '0.01em',
              }}>
                {s.label}
              </div>
            </div>
          </div>

          {/* Right side: strict toggle + close */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {/* Improvement 1: Strict / Clarify mode toggle */}
            {!isScoping && !isModeSelect && (
              <button
                onClick={() => quiz.setClarifyMode(!quiz.clarifyMode)}
                title={quiz.clarifyMode
                  ? 'Strict mode ON — AI will ask follow-ups for vague answers'
                  : 'Strict mode OFF — AI may infer values from indirect answers'}
                style={{
                  display: 'flex', alignItems: 'center', gap: 5,
                  background: quiz.clarifyMode ? 'rgba(251,191,36,0.10)' : 'rgba(255,255,255,0.04)',
                  border: `1px solid ${quiz.clarifyMode ? 'rgba(251,191,36,0.3)' : 'rgba(255,255,255,0.08)'}`,
                  borderRadius: 20,
                  padding: '4px 10px',
                  cursor: 'pointer',
                  boxShadow: quiz.clarifyMode ? '0 0 12px rgba(251,191,36,0.2)' : 'none',
                  transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
              >
                <div style={{
                  width: 6, height: 6, borderRadius: '50%',
                  background: quiz.clarifyMode ? 'rgba(251,191,36,0.9)' : 'rgba(255,255,255,0.3)',
                  transition: 'background 0.25s ease',
                }} />
                <span style={{
                  fontSize: 9, fontWeight: 700,
                  fontFamily: '-apple-system, "SF Mono", monospace',
                  letterSpacing: '0.1em',
                  color: quiz.clarifyMode ? 'rgba(251,191,36,0.85)' : 'rgba(255,255,255,0.3)',
                  transition: 'color 0.25s ease',
                }}>STRICT</span>
              </button>
            )}

            <button
              onClick={quiz.closeQuiz}
              style={{
                width: 28, height: 28, borderRadius: '50%',
                background: 'rgba(255,255,255,0.07)',
                border: '1px solid rgba(255,255,255,0.1)',
                color: 'rgba(255,255,255,0.5)',
                cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.14)';
                el.style.color = 'rgba(255,255,255,0.85)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.background = 'rgba(255,255,255,0.07)';
                el.style.color = 'rgba(255,255,255,0.5)';
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
              </svg>
            </button>
          </div>
        </div>

        {/* Single field mode banner */}
        {quiz.singleFieldMode && (
          <div style={{
            margin: '0 20px 8px',
            padding: '7px 12px',
            borderRadius: 10,
            background: 'rgba(251,191,36,0.05)',
            border: '1px solid rgba(251,191,36,0.15)',
            borderLeft: '3px solid rgba(251,191,36,0.5)',
            display: 'flex', alignItems: 'center', gap: 8,
            flexShrink: 0,
          }}>
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.7)" strokeWidth="2">
              <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
            </svg>
            <span style={{
              fontSize: 10, color: 'rgba(251,191,36,0.6)',
              fontFamily: '-apple-system, "Inter", sans-serif',
            }}>
              Re-recording one field — all other fields are preserved.
            </span>
          </div>
        )}

        {/* ── Body ── */}
        <div style={{
          display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>
          {/* Image column */}
          {imgUrl && (
            <div style={{
              width: 200, flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, background: '#060608' }}>
                <img
                  src={imgUrl} alt="Reference"
                  style={{ width: '100%', height: '100%', objectFit: 'contain', display: 'block' }}
                />
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                  background: 'linear-gradient(to top, rgba(10,11,17,0.95) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                {(isListening || isMonologueRecording) && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    boxShadow: `inset 0 0 0 2px ${s.color.replace('0.95','0.5')}`,
                    animation: 'orbPulse 1s ease infinite alternate',
                    pointerEvents: 'none',
                    borderRadius: 2,
                  }} />
                )}
                {quiz.categoryId && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 0, right: 0,
                    textAlign: 'center',
                    fontSize: 9, fontWeight: 700,
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: 'rgba(255,255,255,0.35)',
                    textTransform: 'uppercase', letterSpacing: '0.15em',
                  }}>
                    {quiz.categoryId.replace('edit-', '')}
                  </div>
                )}
              </div>

              {/* Field dots */}
              {quiz.allFields.length > 0 && (
                <div style={{
                  padding: '10px 12px 14px',
                  background: 'rgba(255,255,255,0.02)',
                  flexShrink: 0,
                }}>
                  <div style={{
                    fontSize: 9, fontWeight: 600,
                    fontFamily: '-apple-system, "SF Mono", monospace',
                    color: 'rgba(255,255,255,0.2)',
                    textTransform: 'uppercase', letterSpacing: '0.12em',
                    marginBottom: 7,
                  }}>
                    {quiz.filledFields.filter(f => !f.wasRejected).length} / {quiz.allFields.length}
                  </div>
                  <div style={{ display: 'flex', flexWrap: 'wrap', gap: 4 }}>
                    {quiz.allFields.map(field => {
                      const filled = quiz.filledFields.find(f => f.fieldLabel === field);
                      const ok = filled && !filled.wasRejected;
                      const inferred = filled?.wasInferred && !filled.wasRejected;
                      return (
                        <div
                          key={field}
                          title={field}
                          style={{
                            width: 14, height: 14, borderRadius: 3,
                            border: `1px solid ${ok
                              ? inferred ? 'rgba(251,191,36,0.5)' : 'rgba(74,222,128,0.5)'
                              : 'rgba(255,255,255,0.08)'}`,
                            background: ok
                              ? inferred ? 'rgba(251,191,36,0.2)' : 'rgba(74,222,128,0.2)'
                              : 'rgba(255,255,255,0.03)',
                            transition: 'all 0.35s ease',
                          }}
                        />
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Content column */}
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden', minWidth: 0 }}>

            {/* ── Error ── */}
            {isError && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '28px 24px', gap: 16,
              }}>
                <div style={{
                  width: 44, height: 44, borderRadius: '50%',
                  background: 'rgba(248,113,113,0.1)',
                  border: '1px solid rgba(248,113,113,0.2)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 20, color: 'rgba(248,113,113,0.9)',
                }}>!</div>
                <div style={{
                  fontSize: 13, color: 'rgba(248,113,113,0.85)',
                  fontFamily: '-apple-system, "Inter", sans-serif',
                  lineHeight: 1.55, textAlign: 'center', maxWidth: 300,
                }}>
                  {quiz.errorMessage}
                </div>
                <GlassButton onClick={quiz.closeQuiz} color="rgba(248,113,113,0.8)">
                  Dismiss
                </GlassButton>
              </div>
            )}

            {/* ── Improvement 2: Scoping (field ownership) ── */}
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

            {/* ── Improvement 3: Mode select ── */}
            {isModeSelect && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                padding: '20px 20px 16px', gap: 16,
              }}>
                <div>
                  <div style={{
                    fontSize: 13, fontWeight: 600,
                    color: 'rgba(255,255,255,0.88)',
                    fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
                    letterSpacing: '-0.02em', marginBottom: 4,
                  }}>
                    How do you want to work?
                  </div>
                  <div style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                  }}>
                    {quiz.emptyFields.length} field{quiz.emptyFields.length !== 1 ? 's' : ''} to fill
                  </div>
                </div>

                {/* Guided mode card */}
                <ModeCard
                  title="Guided"
                  description="I'll answer questions one by one. AI asks about each field in sequence."
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round">
                      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
                    </svg>
                  }
                  accentColor="rgba(148,163,184,0.9)"
                  onClick={() => quiz.selectMode('guided')}
                />

                {/* Monologue mode card */}
                <ModeCard
                  title="Free Talk"
                  description="I'll describe the shot my way. AI listens and extracts only what I say — nothing is invented."
                  icon={
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                  }
                  accentColor="rgba(251,191,36,0.95)"
                  onClick={() => quiz.selectMode('monologue')}
                />
              </div>
            )}

            {/* ── Improvement 3: Monologue recording ── */}
            {isMonologueRecording && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                padding: '24px 28px', gap: 24,
              }}>
                {/* Record orb */}
                <div style={{ position: 'relative' }}>
                  <div style={{
                    width: 100, height: 100, borderRadius: '50%',
                    background: 'rgba(251,191,36,0.08)',
                    border: '1px solid rgba(251,191,36,0.25)',
                    backdropFilter: 'blur(20px)',
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'center', justifyContent: 'center',
                    gap: 6,
                    animation: 'orbBreathe 2s ease-in-out infinite',
                    boxShadow: '0 0 40px rgba(251,191,36,0.2)',
                  }}>
                    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(251,191,36,0.85)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                      <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
                      <line x1="12" y1="19" x2="12" y2="23"/>
                      <line x1="8" y1="23" x2="16" y2="23"/>
                    </svg>
                    <span style={{
                      fontSize: 16, fontWeight: 700,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: 'rgba(251,191,36,0.9)',
                      letterSpacing: '-0.02em',
                    }}>
                      {formatTime(elapsed)}
                    </span>
                  </div>
                </div>

                {/* Waveform bars */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 3, height: 24 }}>
                  {Array.from({ length: 28 }, (_, i) => (
                    <div key={i} style={{
                      width: 2, borderRadius: 2,
                      background: 'rgba(251,191,36,0.5)',
                      animation: `waveBar 0.8s ease ${(i * 0.035) % 0.4}s infinite alternate`,
                      height: 4,
                    }} />
                  ))}
                </div>

                <div style={{ textAlign: 'center' }}>
                  <div style={{
                    fontSize: 13, fontWeight: 500,
                    color: 'rgba(255,255,255,0.7)',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    marginBottom: 4,
                  }}>
                    Describe the shot however you like.
                  </div>
                  <div style={{
                    fontSize: 11,
                    color: 'rgba(255,255,255,0.25)',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    fontStyle: 'italic',
                  }}>
                    Only what you say will be saved — nothing invented.
                  </div>
                </div>

                {/* Stop button */}
                <button
                  onClick={quiz.stopMonologue}
                  style={{
                    display: 'flex', alignItems: 'center', gap: 8,
                    background: 'rgba(248,113,113,0.08)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    color: 'rgba(248,113,113,0.85)',
                    borderRadius: 16, padding: '11px 24px',
                    fontSize: 12, fontWeight: 600,
                    cursor: 'pointer',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    backdropFilter: 'blur(10px)',
                    transition: 'all 0.2s ease',
                  }}
                  onMouseEnter={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(248,113,113,0.15)';
                    el.style.boxShadow = '0 0 20px rgba(248,113,113,0.2)';
                  }}
                  onMouseLeave={e => {
                    const el = e.currentTarget as HTMLElement;
                    el.style.background = 'rgba(248,113,113,0.08)';
                    el.style.boxShadow = 'none';
                  }}
                >
                  <svg width="10" height="10" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="4" y="4" width="16" height="16" rx="2"/>
                  </svg>
                  Stop & Analyze
                  <kbd style={{
                    fontSize: 9, fontFamily: '-apple-system, "SF Mono", monospace',
                    opacity: 0.5, background: 'rgba(248,113,113,0.15)',
                    border: '1px solid rgba(248,113,113,0.2)',
                    borderRadius: 4, padding: '1px 5px',
                  }}>Space</kbd>
                </button>
              </div>
            )}

            {/* ── Monologue processing ── */}
            {isMonologueProcessing && (
              <div style={{
                flex: 1, display: 'flex', flexDirection: 'column',
                alignItems: 'center', justifyContent: 'center',
                gap: 14, padding: '28px',
              }}>
                <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                  {[0,1,2].map(i => (
                    <div key={i} style={{
                      width: 6, height: 6, borderRadius: '50%',
                      background: 'rgba(148,163,184,0.5)',
                      animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 12, color: 'rgba(255,255,255,0.3)',
                  fontFamily: '-apple-system, "Inter", sans-serif',
                }}>
                  Extracting what you described…
                </span>
              </div>
            )}

            {/* ── Improvement 4: Confirming with source words ── */}
            {isConfirming && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                {/* Monologue results header */}
                {quiz.inputMode === 'monologue' && (
                  <div style={{ marginBottom: 4 }}>
                    <div style={{
                      fontSize: 11, fontWeight: 600,
                      color: 'rgba(74,222,128,0.7)',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      marginBottom: 2,
                    }}>
                      You described {quiz.filledFields.filter(f => !f.wasRejected).length} of {quiz.allFields.length} fields
                    </div>
                    {quiz.emptyFields.length > 0 && (
                      <div style={{
                        fontSize: 10, color: 'rgba(255,255,255,0.25)',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                      }}>
                        {quiz.emptyFields.length} field{quiz.emptyFields.length !== 1 ? 's' : ''} still empty
                        — you can ask about them after reviewing.
                      </div>
                    )}
                  </div>
                )}

                {!quiz.inputMode || quiz.inputMode === 'guided' ? (
                  <p style={{
                    fontSize: 11, color: 'rgba(255,255,255,0.3)',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    margin: '0 0 4px',
                  }}>
                    Review before writing to node
                    {pendingConfirmation.length > 0 && (
                      <span style={{ color: 'rgba(251,191,36,0.6)', marginLeft: 6 }}>
                        · {pendingConfirmation.length} field{pendingConfirmation.length !== 1 ? 's' : ''} need your confirmation
                      </span>
                    )}
                  </p>
                ) : null}

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
                    fontSize: 12, color: 'rgba(255,255,255,0.2)',
                    fontFamily: '-apple-system, "Inter", sans-serif',
                    textAlign: 'center', padding: '20px 0',
                  }}>
                    No fields to write.
                  </div>
                )}

                {/* Empty fields (monologue mode) */}
                {quiz.inputMode === 'monologue' && quiz.emptyFields.length > 0 && (
                  <div style={{
                    marginTop: 4, padding: '10px 14px', borderRadius: 12,
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid rgba(255,255,255,0.06)',
                  }}>
                    <div style={{
                      fontSize: 9, fontWeight: 700,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: 'rgba(251,191,36,0.5)',
                      textTransform: 'uppercase', letterSpacing: '0.1em',
                      marginBottom: 8,
                    }}>
                      Still empty · {quiz.emptyFields.length}
                    </div>
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: 5 }}>
                      {quiz.emptyFields.map(f => (
                        <span key={f} style={{
                          fontSize: 10, color: 'rgba(255,255,255,0.3)',
                          fontFamily: '-apple-system, "Inter", sans-serif',
                          padding: '3px 8px', borderRadius: 6,
                          background: 'rgba(255,255,255,0.03)',
                          border: '1px solid rgba(255,255,255,0.05)',
                        }}>
                          {f}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action buttons */}
                <div style={{ display: 'flex', gap: 8, paddingTop: 4, flexShrink: 0, flexDirection: 'column' }}>
                  {/* Monologue: ask about remaining empty fields */}
                  {quiz.inputMode === 'monologue' && quiz.emptyFields.length > 0 && (
                    <button
                      onClick={quiz.continueWithGuidedAfterMonologue}
                      style={{
                        background: 'rgba(167,139,250,0.08)',
                        border: '1px solid rgba(167,139,250,0.2)',
                        color: 'rgba(167,139,250,0.85)',
                        borderRadius: 12, padding: '10px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.14)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(167,139,250,0.08)'}
                    >
                      Ask about the empty {quiz.emptyFields.length} →
                    </button>
                  )}

                  <div style={{ display: 'flex', gap: 8 }}>
                    <button
                      onClick={quiz.closeQuiz}
                      style={{
                        background: 'rgba(248,113,113,0.08)',
                        border: '1px solid rgba(248,113,113,0.15)',
                        color: 'rgba(248,113,113,0.8)',
                        borderRadius: 12, padding: '11px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                      }}
                    >Discard</button>
                    <button
                      onClick={() => quiz.confirmFields(quiz.filledFields)}
                      disabled={!canWrite}
                      title={!canWrite && pendingConfirmation.length > 0
                        ? 'Confirm the highlighted fields above first'
                        : undefined}
                      style={{
                        flex: 1,
                        background: canWrite ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                        border: `1px solid ${canWrite ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
                        color: canWrite ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.2)',
                        borderRadius: 12, padding: '11px 20px',
                        fontSize: 13, fontWeight: 600,
                        cursor: canWrite ? 'pointer' : 'not-allowed',
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        transition: 'all 0.25s ease',
                      }}
                    >
                      {canWrite ? 'Write to node' : pendingConfirmation.length > 0
                        ? `Confirm ${pendingConfirmation.length} inferred field${pendingConfirmation.length !== 1 ? 's' : ''} first`
                        : 'Write to node'}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* ── Conversation ── */}
            {showConversation && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {isAnalyzing && quiz.messages.length === 0 && (
                  <div style={{
                    flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center',
                    color: 'rgba(255,255,255,0.2)', fontSize: 12,
                    fontFamily: '-apple-system, "Inter", sans-serif',
                  }}>
                    Reading the image…
                  </div>
                )}

                {quiz.messages.map((msg, i) => (
                  <div key={i} style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                    gap: 4,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: msg.role === 'ai' ? 'rgba(99,179,237,0.45)' : 'rgba(251,191,36,0.45)',
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>
                      {msg.role === 'ai' ? 'Director AI' : 'You'}
                    </span>
                    <div style={{
                      maxWidth: '88%', padding: '9px 14px',
                      borderRadius: msg.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      background: msg.role === 'ai' ? 'rgba(99,179,237,0.07)' : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${msg.role === 'ai' ? 'rgba(99,179,237,0.12)' : 'rgba(251,191,36,0.12)'}`,
                      backdropFilter: 'blur(10px)',
                      fontSize: msg.role === 'ai' ? 12.5 : 13,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
                      color: msg.role === 'ai' ? 'rgba(186,215,242,0.88)' : 'rgba(253,230,138,0.88)',
                      lineHeight: 1.55,
                    }}>
                      {msg.role === 'ai' ? stripMd(msg.text) : msg.text}
                    </div>
                  </div>
                ))}

                {/* Live transcript */}
                {isListening && (
                  <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4 }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: 'rgba(251,191,36,0.45)',
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>You</span>
                    <div style={{
                      maxWidth: '88%', padding: '10px 14px',
                      borderRadius: '14px 4px 14px 14px',
                      background: 'rgba(251,191,36,0.06)',
                      border: '1px solid rgba(251,191,36,0.15)',
                      backdropFilter: 'blur(10px)',
                      fontSize: 13,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      color: 'rgba(253,230,138,0.9)', lineHeight: 1.55,
                      display: 'flex', alignItems: 'flex-start', gap: 8, minHeight: 44,
                    }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: 2, marginTop: 2, flexShrink: 0 }}>
                        {[0,1,2,3].map(i => (
                          <div key={i} style={{
                            width: 2, borderRadius: 2,
                            background: 'rgba(251,191,36,0.7)',
                            animation: `waveBar 0.8s ease ${i * 0.12}s infinite alternate`,
                            height: 8,
                          }} />
                        ))}
                      </div>
                      <span>
                        {quiz.liveTranscript || (
                          <span style={{ color: 'rgba(253,230,138,0.35)', fontStyle: 'italic' }}>
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
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '4px 2px' }}>
                    <div style={{ display: 'flex', gap: 5, alignItems: 'center' }}>
                      {[0,1,2].map(i => (
                        <div key={i} style={{
                          width: 5, height: 5, borderRadius: '50%',
                          background: 'rgba(148,163,184,0.5)',
                          animation: `bounce 1.2s ease ${i * 0.2}s infinite`,
                        }} />
                      ))}
                    </div>
                    <span style={{
                      fontSize: 11, color: 'rgba(255,255,255,0.25)',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.status === 'processing' ? 'Transcribing your answer…' : 'Generating next question…'}
                    </span>
                  </div>
                )}

                <div ref={messagesEndRef} />
              </div>
            )}

            {/* ── Bottom bar ── */}
            {!isError && !isScoping && !isModeSelect && !isMonologueRecording && !isMonologueProcessing && (
              <div style={{
                padding: '10px 16px 14px',
                borderTop: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center',
                justifyContent: 'space-between',
                flexShrink: 0, gap: 10,
              }}>
                <div style={{ flex: 1, display: 'flex', alignItems: 'center', gap: 8 }}>
                  {isListening && (
                    <button
                      onClick={quiz.manualStopListening}
                      style={{
                        background: 'rgba(251,191,36,0.1)',
                        border: '1px solid rgba(251,191,36,0.22)',
                        color: 'rgba(251,191,36,0.9)',
                        borderRadius: 12, padding: '9px 16px',
                        fontSize: 12, fontWeight: 600, cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        backdropFilter: 'blur(10px)', transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.17)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.1)'}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                      Done Speaking
                      <kbd style={{
                        fontSize: 9, fontFamily: '-apple-system, "SF Mono", monospace',
                        opacity: 0.55, background: 'rgba(251,191,36,0.15)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: 4, padding: '1px 6px',
                      }}>Space</kbd>
                    </button>
                  )}
                  {(quiz.status === 'thinking' || quiz.status === 'processing' || quiz.status === 'analyzing') && (
                    <span style={{
                      fontSize: 11, color: 'rgba(255,255,255,0.2)',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.messages.length > 0
                        ? `${Math.floor(quiz.messages.length / 2)} exchange${Math.floor(quiz.messages.length / 2) !== 1 ? 's' : ''}`
                        : 'Starting up…'}
                    </span>
                  )}
                  {isConfirming && (
                    <span style={{
                      fontSize: 11, color: 'rgba(74,222,128,0.7)',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.filledFields.filter(f => !f.wasRejected).length} fields captured
                    </span>
                  )}
                </div>

                {!isConfirming && (
                  <button
                    onClick={quiz.closeQuiz}
                    style={{
                      background: 'rgba(248,113,113,0.06)',
                      border: '1px solid rgba(248,113,113,0.15)',
                      color: 'rgba(248,113,113,0.7)',
                      borderRadius: 12, padding: '9px 14px',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      backdropFilter: 'blur(10px)', flexShrink: 0, transition: 'all 0.15s ease',
                    }}
                    onMouseEnter={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.13)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.9)';
                    }}
                    onMouseLeave={e => {
                      (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.06)';
                      (e.currentTarget as HTMLElement).style.color = 'rgba(248,113,113,0.7)';
                    }}
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
                    </svg>
                    End Session
                  </button>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Status line */}
        <div style={{
          height: 2, background: s.color,
          opacity: (isListening || isMonologueRecording) ? 0.6 : 0.25,
          transition: 'background 0.4s ease, opacity 0.4s ease',
          animation: (isListening || isMonologueRecording) ? 'statusWave 0.7s ease infinite alternate' : 'none',
          flexShrink: 0,
        }} />
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateX(-50%) translateY(100%); opacity: 0; }
          to   { transform: translateX(-50%) translateY(0);    opacity: 1; }
        }
        @keyframes orbPulse {
          from { opacity: 0.4; transform: scale(0.95); }
          to   { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes orbSpin {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes orbBreathe {
          0%,100% { box-shadow: 0 0 20px rgba(251,191,36,0.15), inset 0 1px 0 rgba(255,255,255,0.06); }
          50%     { box-shadow: 0 0 44px rgba(251,191,36,0.35), inset 0 1px 0 rgba(255,255,255,0.1); }
        }
        @keyframes waveBar {
          from { height: 3px;  opacity: 0.4; }
          to   { height: 14px; opacity: 0.9; }
        }
        @keyframes blink { 50% { opacity: 0; } }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-5px); }
        }
        @keyframes statusWave {
          from { opacity: 0.2; }
          to   { opacity: 0.7; }
        }
        @keyframes chipPulse {
          0%,100% { opacity: 0.7; }
          50%     { opacity: 1; }
        }
        @keyframes fieldEnter {
          from { opacity: 0; transform: translateY(6px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </>
  );
}

// ─── Mode Card ────────────────────────────────────────────────────────────────

function ModeCard({
  title, description, icon, accentColor, onClick,
}: {
  title: string;
  description: string;
  icon: React.ReactNode;
  accentColor: string;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.08)',
        borderRadius: 18,
        padding: '18px 20px',
        cursor: 'pointer', textAlign: 'left',
        display: 'flex', alignItems: 'flex-start', gap: 14,
        backdropFilter: 'blur(20px)',
        transition: 'all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
        color: 'rgba(255,255,255,0.7)',
        flex: 1,
      }}
      onMouseEnter={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = `${accentColor.replace('0.95)', '0.06)').replace('0.9)', '0.05)')}`;
        el.style.borderColor = accentColor.replace('0.95)', '0.3)').replace('0.9)', '0.25)');
        el.style.boxShadow = `0 0 24px ${accentColor.replace('0.95)', '0.15)').replace('0.9)', '0.12)')}`;
        el.style.color = 'rgba(255,255,255,0.88)';
        el.style.transform = 'scale(1.01)';
      }}
      onMouseLeave={e => {
        const el = e.currentTarget as HTMLElement;
        el.style.background = 'rgba(255,255,255,0.03)';
        el.style.borderColor = 'rgba(255,255,255,0.08)';
        el.style.boxShadow = 'none';
        el.style.color = 'rgba(255,255,255,0.7)';
        el.style.transform = 'scale(1)';
      }}
    >
      <div style={{
        color: accentColor, flexShrink: 0, marginTop: 1,
        opacity: 0.8,
      }}>
        {icon}
      </div>
      <div>
        <div style={{
          fontSize: 13, fontWeight: 600,
          fontFamily: '-apple-system, "SF Pro Display", "Inter", sans-serif',
          letterSpacing: '-0.01em', marginBottom: 5,
        }}>
          {title}
        </div>
        <div style={{
          fontSize: 11,
          fontFamily: '-apple-system, "Inter", sans-serif',
          lineHeight: 1.5, opacity: 0.65,
        }}>
          {description}
        </div>
      </div>
    </button>
  );
}

// ─── Glass button ─────────────────────────────────────────────────────────────

function GlassButton({
  onClick, children, color = 'rgba(255,255,255,0.6)',
}: { onClick: () => void; children: React.ReactNode; color?: string }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: `${color.replace(/[\d.]+\)$/, '0.08)')}`,
        border: `1px solid ${color.replace(/[\d.]+\)$/, '0.18)')}`,
        color, borderRadius: 12, padding: '9px 18px',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: '-apple-system, "Inter", sans-serif',
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Field Card (Improvement 4 — source words side-by-side) ──────────────────

function FieldCard({
  field, isEditing, editValue,
  onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onReject, onConfirmInferred,
}: {
  field: FilledField; isEditing: boolean; editValue: string;
  onStartEdit: () => void; onSaveEdit: () => void;
  onCancelEdit: () => void; onEditChange: (v: string) => void;
  onReject: () => void;
  onConfirmInferred: () => void;
}) {
  const [reRecording, setReRecording] = useState(false);
  const [reRecordVal, setReRecordVal] = useState('');

  if (field.wasRejected) {
    return (
      <div style={{
        padding: '9px 13px', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)', opacity: 0.35,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{
          fontSize: 11, color: 'rgba(255,255,255,0.4)',
          fontFamily: '-apple-system, "Inter", sans-serif',
          textDecoration: 'line-through',
        }}>{field.fieldLabel}</span>
        <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)' }}>Removed</span>
      </div>
    );
  }

  const needsConfirm = field.wasInferred && !field.isConfirmedByDirector;
  const accent = needsConfirm
    ? 'rgba(251,191,36,'
    : field.wasInferred
      ? 'rgba(74,222,128,'  // confirmed inferred turns green
      : 'rgba(74,222,128,';

  return (
    <div
      style={{
        borderRadius: 14,
        border: `1px solid ${needsConfirm ? 'rgba(251,191,36,0.28)' : `${accent}0.2)`}`,
        background: needsConfirm ? 'rgba(251,191,36,0.05)' : `${accent}0.04)`,
        backdropFilter: 'blur(10px)',
        display: 'flex', flexDirection: 'column',
        transition: 'all 0.35s cubic-bezier(0.34, 1.56, 0.64, 1)',
        animation: 'fieldEnter 0.3s ease',
        overflow: 'hidden',
      }}
    >
      {/* Field label row */}
      <div style={{
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        padding: '10px 14px 6px',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
          <span style={{
            fontSize: 10, fontWeight: 700,
            fontFamily: '-apple-system, "SF Mono", monospace',
            color: needsConfirm ? 'rgba(251,191,36,0.85)' : `${accent}0.8)`,
            textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            {field.fieldLabel}
          </span>
          {needsConfirm && (
            <span style={{
              fontSize: 8, fontWeight: 700,
              fontFamily: '-apple-system, "SF Mono", monospace',
              color: 'rgba(251,191,36,0.8)',
              letterSpacing: '0.1em', textTransform: 'uppercase',
              background: 'rgba(251,191,36,0.1)',
              border: '1px solid rgba(251,191,36,0.25)',
              borderRadius: 8, padding: '2px 7px',
              animation: 'chipPulse 2.5s ease-in-out infinite',
            }}>
              AI INFERRED ◆
            </span>
          )}
        </div>
        {!isEditing && !reRecording && (
          <div style={{ display: 'flex', gap: 5 }}>
            <SmallBtn onClick={onStartEdit}>Edit</SmallBtn>
            <SmallBtn onClick={onReject}>Remove</SmallBtn>
          </div>
        )}
      </div>

      {/* Source words row (director's actual words) */}
      {field.sourceWords && field.sourceWords !== field.value && (
        <div style={{
          margin: '0 14px',
          padding: '6px 10px',
          borderRadius: 8,
          background: 'rgba(251,191,36,0.04)',
          border: '1px solid rgba(251,191,36,0.1)',
          display: 'flex', alignItems: 'flex-start', gap: 6,
        }}>
          <span style={{
            fontSize: 10, color: 'rgba(251,191,36,0.4)',
            fontFamily: '-apple-system, "Inter", sans-serif',
            flexShrink: 0, marginTop: 1,
          }}>"</span>
          <span style={{
            fontSize: 10.5,
            color: 'rgba(251,191,36,0.65)',
            fontFamily: '-apple-system, "Inter", sans-serif',
            fontStyle: 'italic', lineHeight: 1.4,
          }}>
            {field.sourceWords}
          </span>
        </div>
      )}

      {/* Translated value */}
      <div style={{ padding: '6px 14px 10px' }}>
        {isEditing ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={editValue}
              onChange={e => onEditChange(e.target.value)}
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') { e.stopPropagation(); onSaveEdit(); }
                if (e.key === 'Escape') onCancelEdit();
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: 8, color: 'rgba(255,255,255,0.85)',
                fontSize: 12, fontFamily: '-apple-system, "Inter", sans-serif',
                padding: '6px 10px', outline: 'none',
              }}
            />
            <SmallBtn onClick={onSaveEdit}>Save</SmallBtn>
            <SmallBtn onClick={onCancelEdit}>✕</SmallBtn>
          </div>
        ) : reRecording ? (
          <div style={{ display: 'flex', gap: 6 }}>
            <input
              type="text"
              value={reRecordVal}
              onChange={e => setReRecordVal(e.target.value)}
              placeholder="Type your answer…"
              autoFocus
              onKeyDown={e => {
                if (e.key === 'Enter') {
                  e.stopPropagation();
                  onEditChange(reRecordVal);
                  onSaveEdit();
                  setReRecording(false);
                }
                if (e.key === 'Escape') setReRecording(false);
              }}
              style={{
                flex: 1, background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(251,191,36,0.2)',
                borderRadius: 8, color: 'rgba(253,230,138,0.85)',
                fontSize: 12, fontFamily: '-apple-system, "Inter", sans-serif',
                padding: '6px 10px', outline: 'none',
              }}
            />
            <SmallBtn onClick={() => {
              onEditChange(reRecordVal);
              onSaveEdit();
              onConfirmInferred();
              setReRecording(false);
            }}>Save</SmallBtn>
            <SmallBtn onClick={() => setReRecording(false)}>✕</SmallBtn>
          </div>
        ) : (
          <div style={{
            fontSize: 12.5, color: 'rgba(255,255,255,0.82)',
            fontFamily: '-apple-system, "Inter", sans-serif',
            lineHeight: 1.45,
          }}>
            {field.value}
          </div>
        )}

        {/* Confirm inferred / Re-record buttons */}
        {!isEditing && !reRecording && needsConfirm && (
          <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
            <button
              onClick={onConfirmInferred}
              style={{
                background: 'rgba(74,222,128,0.08)',
                border: '1px solid rgba(74,222,128,0.2)',
                color: 'rgba(74,222,128,0.85)',
                borderRadius: 9, padding: '5px 12px',
                fontSize: 10, fontWeight: 600, cursor: 'pointer',
                fontFamily: '-apple-system, "Inter", sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.14)'}
              onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.08)'}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <polyline points="20 6 9 17 4 12"/>
              </svg>
              Looks right
            </button>
            <button
              onClick={() => setReRecording(true)}
              style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.08)',
                color: 'rgba(255,255,255,0.4)',
                borderRadius: 9, padding: '5px 10px',
                fontSize: 10, cursor: 'pointer',
                fontFamily: '-apple-system, "Inter", sans-serif',
                transition: 'all 0.2s ease',
                display: 'flex', alignItems: 'center', gap: 5,
              }}
              onMouseEnter={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'rgba(255,255,255,0.7)';
                el.style.borderColor = 'rgba(255,255,255,0.15)';
              }}
              onMouseLeave={e => {
                const el = e.currentTarget as HTMLElement;
                el.style.color = 'rgba(255,255,255,0.4)';
                el.style.borderColor = 'rgba(255,255,255,0.08)';
              }}
            >
              <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z"/>
                <path d="M19 10v2a7 7 0 0 1-14 0v-2"/>
              </svg>
              Correct it
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

function SmallBtn({ onClick, children }: { onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      style={{
        background: 'rgba(255,255,255,0.05)',
        border: '1px solid rgba(255,255,255,0.08)',
        color: 'rgba(255,255,255,0.45)',
        borderRadius: 6, padding: '3px 9px',
        fontSize: 10, cursor: 'pointer',
        fontFamily: '-apple-system, "Inter", sans-serif',
        transition: 'all 0.12s ease',
      }}
      onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.75)'}
      onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.45)'}
    >
      {children}
    </button>
  );
}
