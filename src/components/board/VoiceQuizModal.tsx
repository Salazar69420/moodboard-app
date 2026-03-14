import { createPortal } from 'react-dom';
import { useRef, useEffect, useState } from 'react';
import { useVoiceQuiz } from '../../hooks/useVoiceQuiz';
import type { FilledField } from '../../utils/voice-quiz';

// ─── Status indicator styles ─────────────────────────────────────────────────

const STATUS_STYLES: Record<string, { color: string; label: string }> = {
  analyzing: { color: '#94a3b8', label: 'Analyzing image...' },
  thinking: { color: '#94a3b8', label: 'Thinking...' },
  speaking: { color: '#60a5fa', label: 'AI Speaking' },
  listening: { color: '#f59e0b', label: 'Listening...' },
  processing: { color: '#94a3b8', label: 'Processing...' },
  confirming: { color: '#4ade80', label: 'Review & Confirm' },
  error: { color: '#ef4444', label: 'Error' },
};

export function VoiceQuizModal() {
  const quiz = useVoiceQuiz();

  if (!quiz.isOpen) return null;

  return createPortal(
    <VoiceQuizOverlay quiz={quiz} />,
    document.body,
  );
}

function VoiceQuizOverlay({ quiz }: { quiz: ReturnType<typeof useVoiceQuiz> }) {
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState('');

  // Auto-scroll messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [quiz.messages, quiz.liveTranscript]);

  const statusInfo = STATUS_STYLES[quiz.status] || { color: '#555', label: '' };

  return (
    <>
      {/* Backdrop */}
      <div
        style={{
          position: 'fixed',
          inset: 0,
          backgroundColor: 'rgba(0,0,0,0.6)',
          backdropFilter: 'blur(2px)',
          zIndex: 9998,
          transition: 'all 0.4s ease',
        }}
        onClick={quiz.closeQuiz}
      />

      {/* Modal Card */}
      <div
        style={{
          position: 'fixed',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 480,
          maxWidth: '90vw',
          maxHeight: '80vh',
          background: '#0a0b10',
          border: '1px solid #1e1e2e',
          borderRadius: 16,
          boxShadow: '0 24px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255,255,255,0.03)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'modalSlideUp 0.25s ease-out',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '14px 18px',
          borderBottom: '1px solid #1a1a2a',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexShrink: 0,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: statusInfo.color,
              boxShadow: `0 0 8px ${statusInfo.color}80`,
              animation: quiz.status === 'listening'
                ? 'voiceQuizPulse 0.6s ease infinite alternate'
                : quiz.status === 'speaking'
                  ? 'voiceQuizPulse 1.5s ease infinite alternate'
                  : quiz.status === 'thinking' || quiz.status === 'analyzing' || quiz.status === 'processing'
                    ? 'voiceQuizPulse 2s ease infinite alternate'
                    : 'none',
            }} />
            <span style={{
              fontSize: 13,
              fontFamily: "'Inter', system-ui, sans-serif",
              fontWeight: 600,
              color: '#e5e5e5',
            }}>
              Voice Director
            </span>
            <span style={{
              fontSize: 10,
              fontFamily: "'JetBrains Mono', monospace",
              color: statusInfo.color,
              background: `${statusInfo.color}15`,
              border: `1px solid ${statusInfo.color}30`,
              borderRadius: 4,
              padding: '1px 6px',
            }}>
              {statusInfo.label}
            </span>
          </div>
          <button
            onClick={quiz.closeQuiz}
            style={{
              background: 'none', border: 'none', color: '#555', cursor: 'pointer',
              padding: 4, borderRadius: 4, display: 'flex',
            }}
            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#e5e5e5'}
            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Field tracker dots */}
        {quiz.allFields.length > 0 && (
          <div style={{
            padding: '8px 18px',
            display: 'flex',
            gap: 6,
            flexWrap: 'wrap',
            borderBottom: '1px solid #1a1a2a',
            flexShrink: 0,
          }}>
            {quiz.allFields.map(field => {
              const resolved = quiz.filledFields.some(f => f.fieldLabel === field && !f.wasRejected);
              return (
                <div
                  key={field}
                  title={field}
                  style={{
                    width: 20, height: 20,
                    borderRadius: 5,
                    border: `1px solid ${resolved ? '#4ade8050' : '#2a2a3a'}`,
                    background: resolved ? 'rgba(74,222,128,0.15)' : '#111118',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    color: resolved ? '#4ade80' : '#444',
                    fontFamily: "'JetBrains Mono', monospace",
                    transition: 'all 0.4s ease',
                  }}
                >
                  {resolved ? '\u25C9' : '\u25CB'}
                </div>
              );
            })}
            <span style={{
              fontSize: 9, color: '#555', fontFamily: "'Inter', system-ui, sans-serif",
              alignSelf: 'center', marginLeft: 4,
            }}>
              {quiz.filledFields.filter(f => !f.wasRejected).length}/{quiz.allFields.length} fields
            </span>
          </div>
        )}

        {/* Error state */}
        {quiz.status === 'error' && (
          <div style={{
            padding: '20px 18px',
            textAlign: 'center',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            gap: 12,
          }}>
            <div style={{
              fontSize: 13, color: '#ef4444',
              fontFamily: "'Inter', system-ui, sans-serif",
              maxWidth: 350,
              lineHeight: 1.5,
            }}>
              {quiz.errorMessage}
            </div>
            <button
              onClick={quiz.closeQuiz}
              style={{
                background: 'rgba(239,68,68,0.1)',
                border: '1px solid rgba(239,68,68,0.3)',
                color: '#ef4444',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                cursor: 'pointer',
              }}
            >
              Close
            </button>
          </div>
        )}

        {/* Confirmation screen */}
        {quiz.status === 'confirming' && (
          <div style={{
            padding: '16px 18px',
            overflowY: 'auto',
            flex: 1,
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            <div style={{
              fontSize: 12, color: '#888',
              fontFamily: "'Inter', system-ui, sans-serif",
              marginBottom: 4,
            }}>
              Review extracted fields before writing to node:
            </div>

            {quiz.filledFields.map(field => (
              <FieldConfirmCard
                key={field.fieldId}
                field={field}
                isEditing={editingFieldId === field.fieldId}
                editValue={editValue}
                onStartEdit={() => { setEditingFieldId(field.fieldId); setEditValue(field.value); }}
                onSaveEdit={() => { quiz.editField(field.fieldId, editValue); setEditingFieldId(null); }}
                onCancelEdit={() => setEditingFieldId(null)}
                onEditChange={setEditValue}
                onReject={() => quiz.rejectField(field.fieldId)}
              />
            ))}

            {quiz.filledFields.filter(f => !f.wasRejected).length === 0 && (
              <div style={{
                fontSize: 12, color: '#666',
                fontFamily: "'Inter', system-ui, sans-serif",
                textAlign: 'center',
                padding: 20,
              }}>
                No fields to write. Close or retry.
              </div>
            )}

            <button
              onClick={() => quiz.confirmFields(quiz.filledFields)}
              disabled={quiz.filledFields.filter(f => !f.wasRejected).length === 0}
              style={{
                marginTop: 8,
                background: quiz.filledFields.filter(f => !f.wasRejected).length > 0
                  ? 'rgba(74,222,128,0.12)' : '#111',
                border: `1px solid ${quiz.filledFields.filter(f => !f.wasRejected).length > 0
                  ? 'rgba(74,222,128,0.3)' : '#222'}`,
                color: quiz.filledFields.filter(f => !f.wasRejected).length > 0
                  ? '#4ade80' : '#444',
                borderRadius: 10,
                padding: '12px 20px',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                cursor: quiz.filledFields.filter(f => !f.wasRejected).length > 0
                  ? 'pointer' : 'not-allowed',
                transition: 'all 0.15s ease',
                flexShrink: 0,
              }}
            >
              Write to node
            </button>
          </div>
        )}

        {/* Conversation view (non-error, non-confirming) */}
        {quiz.status !== 'error' && quiz.status !== 'confirming' && (
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '14px 18px',
            display: 'flex',
            flexDirection: 'column',
            gap: 10,
          }}>
            {/* Analyzing state */}
            {quiz.status === 'analyzing' && quiz.messages.length === 0 && (
              <div style={{
                textAlign: 'center',
                padding: '40px 20px',
                color: '#666',
                fontSize: 13,
                fontFamily: "'Inter', system-ui, sans-serif",
              }}>
                Analyzing image...
              </div>
            )}

            {/* Messages */}
            {quiz.messages.map((msg, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: msg.role === 'ai' ? 'flex-start' : 'flex-end',
                  gap: 3,
                }}
              >
                <span style={{
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: msg.role === 'ai' ? '#60a5fa80' : '#f59e0b80',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  {msg.role === 'ai' ? 'AI' : 'You'}
                </span>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: msg.role === 'ai'
                    ? 'rgba(96,165,250,0.08)'
                    : 'rgba(245,158,11,0.08)',
                  border: `1px solid ${msg.role === 'ai' ? 'rgba(96,165,250,0.15)' : 'rgba(245,158,11,0.15)'}`,
                  fontSize: msg.role === 'ai' ? 12 : 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: msg.role === 'ai' ? '#c4d5f0' : '#fde68a',
                  lineHeight: 1.5,
                }}>
                  {msg.text}
                </div>
              </div>
            ))}

            {/* Live transcript while listening */}
            {quiz.status === 'listening' && (
              <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'flex-end',
                gap: 3,
              }}>
                <span style={{
                  fontSize: 9,
                  fontFamily: "'JetBrains Mono', monospace",
                  color: '#f59e0b80',
                  textTransform: 'uppercase',
                  letterSpacing: '0.1em',
                }}>
                  You
                </span>
                <div style={{
                  maxWidth: '85%',
                  padding: '10px 14px',
                  borderRadius: 12,
                  background: 'rgba(245,158,11,0.06)',
                  border: '1px solid rgba(245,158,11,0.12)',
                  fontSize: 13,
                  fontFamily: "'Inter', system-ui, sans-serif",
                  color: '#fbbf24',
                  lineHeight: 1.5,
                  minHeight: 38,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                }}>
                  <span style={{
                    width: 6, height: 6, borderRadius: '50%',
                    background: '#f59e0b',
                    animation: 'voiceQuizPulse 0.6s ease infinite alternate',
                    flexShrink: 0,
                  }} />
                  {quiz.liveTranscript || 'Listening...'}
                  <span style={{
                    animation: 'voiceQuizBlink 1s step-end infinite',
                    color: '#f59e0b',
                  }}>|</span>
                </div>
              </div>
            )}

            {/* Thinking/processing indicator */}
            {(quiz.status === 'thinking' || quiz.status === 'processing') && (
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                padding: '8px 14px',
              }}>
                <div style={{
                  display: 'flex', gap: 4,
                }}>
                  {[0, 1, 2].map(i => (
                    <div key={i} style={{
                      width: 4, height: 4, borderRadius: '50%',
                      background: '#94a3b8',
                      animation: `voiceQuizBounce 1.2s ease infinite ${i * 0.2}s`,
                    }} />
                  ))}
                </div>
                <span style={{
                  fontSize: 11, color: '#666',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}>
                  {quiz.status === 'processing' ? 'Transcribing...' : 'Generating question...'}
                </span>
              </div>
            )}

            <div ref={messagesEndRef} />
          </div>
        )}

        {/* Bottom controls */}
        {quiz.status === 'listening' && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #1a1a2a',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <button
              onClick={quiz.manualStopListening}
              style={{
                background: 'rgba(245,158,11,0.12)',
                border: '1px solid rgba(245,158,11,0.3)',
                color: '#f59e0b',
                borderRadius: 10,
                padding: '10px 24px',
                fontSize: 12,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 600,
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
              }}
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
                <rect x="4" y="4" width="16" height="16" rx="2" />
              </svg>
              Done Speaking
            </button>
          </div>
        )}

        {quiz.status === 'speaking' && (
          <div style={{
            padding: '12px 18px',
            borderTop: '1px solid #1a1a2a',
            display: 'flex',
            justifyContent: 'center',
            flexShrink: 0,
          }}>
            <span style={{
              fontSize: 11, color: '#60a5fa', fontFamily: "'Inter', system-ui, sans-serif",
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5" />
                <path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.07" />
              </svg>
              AI is speaking...
            </span>
          </div>
        )}

        {/* Status bar */}
        <div style={{
          height: 3,
          background: statusInfo.color,
          opacity: 0.6,
          transition: 'background 0.3s ease',
          animation: quiz.status === 'listening'
            ? 'voiceQuizWave 0.5s ease infinite alternate'
            : quiz.status === 'speaking'
              ? 'voiceQuizPulse 2s ease infinite'
              : 'none',
          flexShrink: 0,
        }} />
      </div>

      {/* Animations */}
      <style>{`
        @keyframes voiceQuizPulse {
          0% { opacity: 0.4; }
          100% { opacity: 1; }
        }
        @keyframes voiceQuizBlink {
          50% { opacity: 0; }
        }
        @keyframes voiceQuizBounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
        @keyframes voiceQuizWave {
          0% { opacity: 0.3; }
          100% { opacity: 0.8; }
        }
      `}</style>
    </>
  );
}

// ─── Field Confirm Card ──────────────────────────────────────────────────────

function FieldConfirmCard({
  field,
  isEditing,
  editValue,
  onStartEdit,
  onSaveEdit,
  onCancelEdit,
  onEditChange,
  onReject,
}: {
  field: FilledField;
  isEditing: boolean;
  editValue: string;
  onStartEdit: () => void;
  onSaveEdit: () => void;
  onCancelEdit: () => void;
  onEditChange: (v: string) => void;
  onReject: () => void;
}) {
  if (field.wasRejected) {
    return (
      <div style={{
        padding: '10px 14px',
        borderRadius: 10,
        border: '1px solid #222',
        background: '#0d0d10',
        opacity: 0.4,
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 11, color: '#666',
          fontFamily: "'Inter', system-ui, sans-serif",
          textDecoration: 'line-through',
        }}>
          {field.fieldLabel}
        </span>
        <span style={{ fontSize: 10, color: '#555' }}>Removed</span>
      </div>
    );
  }

  return (
    <div style={{
      padding: '12px 14px',
      borderRadius: 10,
      border: `1px solid ${field.wasInferred ? 'rgba(245,158,11,0.25)' : 'rgba(74,222,128,0.2)'}`,
      background: field.wasInferred ? 'rgba(245,158,11,0.04)' : 'rgba(74,222,128,0.04)',
      display: 'flex',
      flexDirection: 'column',
      gap: 6,
    }}>
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
      }}>
        <span style={{
          fontSize: 10,
          fontFamily: "'JetBrains Mono', monospace",
          color: field.wasInferred ? '#f59e0b' : '#4ade80',
          textTransform: 'uppercase',
          letterSpacing: '0.08em',
          fontWeight: 700,
        }}>
          {field.fieldLabel}
          {field.wasInferred && (
            <span style={{ marginLeft: 6, fontSize: 9, opacity: 0.7 }}>inferred</span>
          )}
        </span>
        <div style={{ display: 'flex', gap: 4 }}>
          {!isEditing && (
            <>
              <button
                onClick={onStartEdit}
                style={{
                  background: 'rgba(255,255,255,0.05)',
                  border: '1px solid rgba(255,255,255,0.1)',
                  color: '#888',
                  borderRadius: 5,
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Edit
              </button>
              <button
                onClick={onReject}
                style={{
                  background: 'rgba(239,68,68,0.06)',
                  border: '1px solid rgba(239,68,68,0.15)',
                  color: '#666',
                  borderRadius: 5,
                  padding: '3px 8px',
                  fontSize: 10,
                  cursor: 'pointer',
                  fontFamily: "'Inter', system-ui, sans-serif",
                }}
              >
                Remove
              </button>
            </>
          )}
        </div>
      </div>

      {isEditing ? (
        <div style={{ display: 'flex', gap: 6 }}>
          <input
            type="text"
            value={editValue}
            onChange={e => onEditChange(e.target.value)}
            autoFocus
            onKeyDown={e => { if (e.key === 'Enter') onSaveEdit(); if (e.key === 'Escape') onCancelEdit(); }}
            style={{
              flex: 1, background: '#0a0a0a', border: '1px solid #2a2a2a',
              borderRadius: 6, color: '#e5e5e5', fontSize: 12,
              fontFamily: "'Inter', system-ui, sans-serif",
              padding: '6px 10px', outline: 'none',
            }}
          />
          <button
            onClick={onSaveEdit}
            style={{
              background: 'rgba(74,222,128,0.1)', border: '1px solid rgba(74,222,128,0.25)',
              color: '#4ade80', borderRadius: 6, padding: '4px 10px',
              fontSize: 10, cursor: 'pointer',
            }}
          >
            Save
          </button>
          <button
            onClick={onCancelEdit}
            style={{
              background: '#111', border: '1px solid #222',
              color: '#666', borderRadius: 6, padding: '4px 10px',
              fontSize: 10, cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      ) : (
        <>
          <div style={{
            fontSize: 13, color: '#e5e5e5',
            fontFamily: "'Inter', system-ui, sans-serif",
            lineHeight: 1.4,
          }}>
            {field.value}
          </div>
          {field.sourceWords && (
            <div style={{
              fontSize: 10, color: '#666',
              fontFamily: "'Inter', system-ui, sans-serif",
              fontStyle: 'italic',
            }}>
              from your words: &ldquo;{field.sourceWords}&rdquo;
            </div>
          )}
        </>
      )}
    </div>
  );
}
