import { createPortal } from 'react-dom';
import { useRef, useEffect, useState } from 'react';
import { useVoiceQuiz } from '../../hooks/useVoiceQuiz';
import { useImageStore } from '../../stores/useImageStore';
import { useBlobUrl } from '../../hooks/useBlobUrl';
import type { FilledField } from '../../utils/voice-quiz';

// Strip markdown bold markers from AI text
function stripMd(text: string): string {
  return text.replace(/\*\*(.*?)\*\*/g, '$1').replace(/__(.*?)__/g, '$1');
}

const STATUS: Record<string, { color: string; label: string; glow: string }> = {
  analyzing:  { color: 'rgba(148,163,184,0.9)', label: 'Analyzing',  glow: 'rgba(148,163,184,0.15)' },
  thinking:   { color: 'rgba(148,163,184,0.9)', label: 'Thinking',   glow: 'rgba(148,163,184,0.15)' },
  listening:  { color: 'rgba(251,191,36,0.95)', label: 'Listening',  glow: 'rgba(251,191,36,0.2)'  },
  processing: { color: 'rgba(148,163,184,0.9)', label: 'Processing', glow: 'rgba(148,163,184,0.15)' },
  confirming: { color: 'rgba(74,222,128,0.95)', label: 'Review',     glow: 'rgba(74,222,128,0.2)'  },
  error:      { color: 'rgba(248,113,113,0.95)', label: 'Error',     glow: 'rgba(248,113,113,0.2)'  },
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

  const images = useImageStore(s => s.images);
  const image  = images.find(img => img.id === quiz.imageId);
  const imgUrl = useBlobUrl(image?.blobId ?? null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [quiz.messages, quiz.liveTranscript]);

  // Space / Enter = done speaking
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

  const s = STATUS[quiz.status] ?? { color: 'rgba(255,255,255,0.4)', label: '', glow: 'transparent' };
  const isListening  = quiz.status === 'listening';
  const isConfirming = quiz.status === 'confirming';
  const isError      = quiz.status === 'error';

  return (
    <>
      {/* ── Backdrop ── */}
      <div
        onClick={quiz.closeQuiz}
        style={{
          position: 'fixed', inset: 0, zIndex: 9990,
          background: 'rgba(0,0,0,0.55)',
          backdropFilter: 'blur(20px) saturate(180%)',
          WebkitBackdropFilter: 'blur(20px) saturate(180%)',
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
          maxHeight: '84vh',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          borderRadius: '24px 24px 0 0',
          background: 'rgba(12,13,18,0.72)',
          backdropFilter: 'blur(40px) saturate(200%)',
          WebkitBackdropFilter: 'blur(40px) saturate(200%)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderBottom: 'none',
          boxShadow: `0 -2px 80px rgba(0,0,0,0.6), 0 0 0 0.5px rgba(255,255,255,0.05), inset 0 1px 0 rgba(255,255,255,0.06)`,
          animation: 'sheetUp 0.32s cubic-bezier(0.32,0.72,0,1)',
        }}
      >
        {/* Drag pill */}
        <div style={{
          width: 36, height: 4, borderRadius: 2,
          background: 'rgba(255,255,255,0.12)',
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
              {/* Glow ring */}
              <div style={{
                position: 'absolute', inset: -2,
                borderRadius: '50%',
                background: s.glow,
                filter: 'blur(6px)',
                animation: isListening ? 'orbPulse 1s ease infinite alternate' : 'none',
              }} />
              {/* Core */}
              <div style={{
                width: 28, height: 28, borderRadius: '50%',
                background: `radial-gradient(circle at 35% 35%, ${s.color}, ${s.color.replace('0.95','0.4').replace('0.9','0.3')})`,
                border: `1px solid ${s.color.replace('0.95','0.25').replace('0.9','0.2')}`,
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                animation: (quiz.status === 'thinking' || quiz.status === 'analyzing' || quiz.status === 'processing')
                  ? 'orbSpin 2s linear infinite'
                  : isListening
                    ? 'orbPulse 0.8s ease infinite alternate'
                    : 'none',
              }}>
                {isListening && (
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
                letterSpacing: '-0.02em',
                lineHeight: 1.2,
              }}>
                Voice Director
              </div>
              <div style={{
                fontSize: 11,
                color: s.color,
                fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Text", "Inter", sans-serif',
                fontWeight: 500,
                letterSpacing: '0.01em',
              }}>
                {s.label}
              </div>
            </div>
          </div>

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

        {/* ── Body: image + content ── */}
        <div style={{
          display: 'flex', flex: 1, overflow: 'hidden', minHeight: 0,
          borderTop: '1px solid rgba(255,255,255,0.05)',
        }}>

          {/* Image column */}
          {imgUrl && (
            <div style={{
              width: 220, flexShrink: 0,
              borderRight: '1px solid rgba(255,255,255,0.05)',
              display: 'flex', flexDirection: 'column',
              overflow: 'hidden',
            }}>
              {/* Image */}
              <div style={{ flex: 1, position: 'relative', overflow: 'hidden', minHeight: 0, background: '#060608' }}>
                <img
                  src={imgUrl}
                  alt="Reference"
                  style={{
                    width: '100%', height: '100%',
                    objectFit: 'contain', display: 'block',
                    transition: 'transform 0.4s ease',
                  }}
                />
                {/* Gradient */}
                <div style={{
                  position: 'absolute', bottom: 0, left: 0, right: 0, height: 80,
                  background: 'linear-gradient(to top, rgba(12,13,18,0.95) 0%, transparent 100%)',
                  pointerEvents: 'none',
                }} />
                {/* Listening border */}
                {isListening && (
                  <div style={{
                    position: 'absolute', inset: 0,
                    boxShadow: `inset 0 0 0 2px ${s.color.replace('0.95','0.5')}`,
                    animation: 'orbPulse 1s ease infinite alternate',
                    pointerEvents: 'none',
                  }} />
                )}
                {/* Category */}
                {quiz.categoryId && (
                  <div style={{
                    position: 'absolute', bottom: 10, left: 0, right: 0,
                    textAlign: 'center',
                    fontSize: 9, fontWeight: 700,
                    fontFamily: '-apple-system, "SF Mono", "JetBrains Mono", monospace',
                    color: 'rgba(255,255,255,0.4)',
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
                      const ok = quiz.filledFields.some(f => f.fieldLabel === field && !f.wasRejected);
                      return (
                        <div
                          key={field}
                          title={field}
                          style={{
                            width: 14, height: 14, borderRadius: 3,
                            border: `1px solid ${ok ? 'rgba(74,222,128,0.5)' : 'rgba(255,255,255,0.08)'}`,
                            background: ok ? 'rgba(74,222,128,0.2)' : 'rgba(255,255,255,0.03)',
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
          <div style={{
            flex: 1, display: 'flex', flexDirection: 'column',
            overflow: 'hidden', minWidth: 0,
          }}>

            {/* Error */}
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

            {/* Confirm */}
            {isConfirming && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex', flexDirection: 'column', gap: 8,
              }}>
                <p style={{
                  fontSize: 11, color: 'rgba(255,255,255,0.3)',
                  fontFamily: '-apple-system, "Inter", sans-serif',
                  margin: '0 0 4px',
                }}>
                  Review before writing to node
                </p>
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
                <div style={{ display: 'flex', gap: 8, paddingTop: 4, flexShrink: 0 }}>
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
                    disabled={quiz.filledFields.filter(f => !f.wasRejected).length === 0}
                    style={{
                      flex: 1,
                      background: quiz.filledFields.filter(f => !f.wasRejected).length > 0
                        ? 'rgba(74,222,128,0.12)' : 'rgba(255,255,255,0.04)',
                      border: `1px solid ${quiz.filledFields.filter(f => !f.wasRejected).length > 0
                        ? 'rgba(74,222,128,0.25)' : 'rgba(255,255,255,0.06)'}`,
                      color: quiz.filledFields.filter(f => !f.wasRejected).length > 0
                        ? 'rgba(74,222,128,0.9)' : 'rgba(255,255,255,0.2)',
                      borderRadius: 12, padding: '11px 20px',
                      fontSize: 13, fontWeight: 600,
                      cursor: quiz.filledFields.filter(f => !f.wasRejected).length > 0 ? 'pointer' : 'not-allowed',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}
                  >Write to node</button>
                </div>
              </div>
            )}

            {/* Conversation */}
            {!isError && !isConfirming && (
              <div style={{
                flex: 1, overflowY: 'auto',
                padding: '14px 18px',
                display: 'flex', flexDirection: 'column', gap: 10,
              }}>
                {quiz.status === 'analyzing' && quiz.messages.length === 0 && (
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
                    display: 'flex',
                    flexDirection: 'column',
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
                      maxWidth: '88%',
                      padding: '9px 14px',
                      borderRadius: msg.role === 'ai' ? '4px 14px 14px 14px' : '14px 4px 14px 14px',
                      background: msg.role === 'ai'
                        ? 'rgba(99,179,237,0.07)'
                        : 'rgba(251,191,36,0.07)',
                      border: `1px solid ${msg.role === 'ai'
                        ? 'rgba(99,179,237,0.12)'
                        : 'rgba(251,191,36,0.12)'}`,
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
                  <div style={{
                    display: 'flex', flexDirection: 'column',
                    alignItems: 'flex-end', gap: 4,
                  }}>
                    <span style={{
                      fontSize: 9, fontWeight: 600,
                      fontFamily: '-apple-system, "SF Mono", monospace',
                      color: 'rgba(251,191,36,0.45)',
                      textTransform: 'uppercase', letterSpacing: '0.12em',
                    }}>You</span>
                    <div style={{
                      maxWidth: '88%',
                      padding: '10px 14px',
                      borderRadius: '14px 4px 14px 14px',
                      background: 'rgba(251,191,36,0.06)',
                      border: '1px solid rgba(251,191,36,0.15)',
                      backdropFilter: 'blur(10px)',
                      fontSize: 13,
                      fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
                      color: 'rgba(253,230,138,0.9)',
                      lineHeight: 1.55,
                      display: 'flex', alignItems: 'flex-start', gap: 8,
                      minHeight: 44,
                    }}>
                      {/* Mic wave bars */}
                      <div style={{
                        display: 'flex', alignItems: 'center', gap: 2,
                        marginTop: 2, flexShrink: 0,
                      }}>
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
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 10,
                    padding: '4px 2px',
                  }}>
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
            {!isError && (
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
                        borderRadius: 12,
                        padding: '9px 16px',
                        fontSize: 12, fontWeight: 600,
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', gap: 7,
                        fontFamily: '-apple-system, "Inter", sans-serif',
                        backdropFilter: 'blur(10px)',
                        transition: 'all 0.15s ease',
                      }}
                      onMouseEnter={e => (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.17)'}
                      onMouseLeave={e => (e.currentTarget as HTMLElement).style.background = 'rgba(251,191,36,0.1)'}
                    >
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="currentColor">
                        <rect x="4" y="4" width="16" height="16" rx="2"/>
                      </svg>
                      Done Speaking
                      <kbd style={{
                        fontSize: 9,
                        fontFamily: '-apple-system, "SF Mono", monospace',
                        opacity: 0.55,
                        background: 'rgba(251,191,36,0.15)',
                        border: '1px solid rgba(251,191,36,0.2)',
                        borderRadius: 4,
                        padding: '1px 6px',
                      }}>Space</kbd>
                    </button>
                  )}
                  {(quiz.status === 'thinking' || quiz.status === 'processing' || quiz.status === 'analyzing') && (
                    <span style={{
                      fontSize: 11, color: 'rgba(255,255,255,0.2)',
                      fontFamily: '-apple-system, "Inter", sans-serif',
                    }}>
                      {quiz.messages.length > 0
                        ? `${Math.floor(quiz.messages.length / 2)} exchanges`
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
                      borderRadius: 12,
                      padding: '9px 14px',
                      fontSize: 12, fontWeight: 600,
                      cursor: 'pointer',
                      display: 'flex', alignItems: 'center', gap: 5,
                      fontFamily: '-apple-system, "Inter", sans-serif',
                      backdropFilter: 'blur(10px)',
                      flexShrink: 0,
                      transition: 'all 0.15s ease',
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
          opacity: isListening ? 0.6 : 0.25,
          transition: 'background 0.4s ease, opacity 0.4s ease',
          animation: isListening ? 'statusWave 0.7s ease infinite alternate' : 'none',
          flexShrink: 0,
        }} />
      </div>

      <style>{`
        @keyframes sheetUp {
          from { transform: translateX(-50%) translateY(100%); }
          to   { transform: translateX(-50%) translateY(0); }
        }
        @keyframes orbPulse {
          from { opacity: 0.4; transform: scale(0.95); }
          to   { opacity: 1;   transform: scale(1.05); }
        }
        @keyframes orbSpin {
          from { filter: hue-rotate(0deg); }
          to   { filter: hue-rotate(360deg); }
        }
        @keyframes waveBar {
          from { height: 3px;  opacity: 0.4; }
          to   { height: 12px; opacity: 0.9; }
        }
        @keyframes blink {
          50% { opacity: 0; }
        }
        @keyframes bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40%           { transform: translateY(-5px); }
        }
        @keyframes statusWave {
          from { opacity: 0.2; }
          to   { opacity: 0.7; }
        }
      `}</style>
    </>
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
        color,
        borderRadius: 12, padding: '9px 18px',
        fontSize: 12, fontWeight: 600, cursor: 'pointer',
        fontFamily: '-apple-system, "Inter", sans-serif',
        backdropFilter: 'blur(10px)',
      }}
    >
      {children}
    </button>
  );
}

// ─── Field Card ───────────────────────────────────────────────────────────────

function FieldCard({
  field, isEditing, editValue,
  onStartEdit, onSaveEdit, onCancelEdit, onEditChange, onReject,
}: {
  field: FilledField; isEditing: boolean; editValue: string;
  onStartEdit: () => void; onSaveEdit: () => void;
  onCancelEdit: () => void; onEditChange: (v: string) => void;
  onReject: () => void;
}) {
  if (field.wasRejected) {
    return (
      <div style={{
        padding: '9px 13px', borderRadius: 12,
        border: '1px solid rgba(255,255,255,0.05)',
        background: 'rgba(255,255,255,0.02)',
        opacity: 0.35,
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

  const accent = field.wasInferred ? 'rgba(251,191,36,' : 'rgba(74,222,128,';
  return (
    <div style={{
      padding: '11px 14px', borderRadius: 12,
      border: `1px solid ${accent}0.18)`,
      background: `${accent}0.04)`,
      backdropFilter: 'blur(10px)',
      display: 'flex', flexDirection: 'column', gap: 7,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{
          fontSize: 10, fontWeight: 700,
          fontFamily: '-apple-system, "SF Mono", monospace',
          color: `${accent}0.8)`,
          textTransform: 'uppercase', letterSpacing: '0.08em',
        }}>
          {field.fieldLabel}
          {field.wasInferred && (
            <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.55, fontWeight: 400 }}>inferred</span>
          )}
        </span>
        {!isEditing && (
          <div style={{ display: 'flex', gap: 5 }}>
            <SmallBtn onClick={onStartEdit}>Edit</SmallBtn>
            <SmallBtn onClick={onReject}>Remove</SmallBtn>
          </div>
        )}
      </div>

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
      ) : (
        <>
          <div style={{
            fontSize: 13, color: 'rgba(255,255,255,0.82)',
            fontFamily: '-apple-system, BlinkMacSystemFont, "Inter", sans-serif',
            lineHeight: 1.45,
          }}>
            {field.value}
          </div>
          {field.sourceWords && (
            <div style={{
              fontSize: 10, color: 'rgba(255,255,255,0.25)',
              fontFamily: '-apple-system, "Inter", sans-serif', fontStyle: 'italic',
            }}>
              from: &ldquo;{field.sourceWords}&rdquo;
            </div>
          )}
        </>
      )}
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
