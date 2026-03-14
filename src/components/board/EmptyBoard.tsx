import { useState, useEffect } from 'react';

const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

export function EmptyBoard() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    const id = requestAnimationFrame(() => setMounted(true));
    return () => cancelAnimationFrame(id);
  }, []);

  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none">
      <div
        className="text-center max-w-sm"
        style={{
          opacity: mounted ? 1 : 0,
          transform: mounted ? 'translateY(0) scale(1)' : 'translateY(16px) scale(0.94)',
          transition: 'opacity 0.6s cubic-bezier(0.22, 1, 0.36, 1), transform 0.6s cubic-bezier(0.22, 1, 0.36, 1)',
        }}
      >
        {/* Ghost placeholder grid (U11) */}
        <div style={{
          display: 'flex',
          gap: 12,
          justifyContent: 'center',
          marginBottom: 28,
        }}>
          {[0, 1, 2].map(i => (
            <div
              key={i}
              className="ghost-placeholder"
              style={{
                width: i === 1 ? 72 : 56,
                height: i === 1 ? 88 : 72,
                borderRadius: 8,
                border: '1.5px dashed rgba(255,255,255,0.06)',
                background: 'rgba(255,255,255,0.015)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                animationDelay: `${i * 400}ms`,
              }}
            >
              {i === 1 ? (
                <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="1.2">
                  <rect x="3" y="3" width="18" height="18" rx="2" />
                  <circle cx="8.5" cy="8.5" r="1.5" />
                  <path d="M21 15l-5-5L5 21" />
                </svg>
              ) : (
                <div style={{
                  width: 20,
                  height: 2,
                  borderRadius: 1,
                  background: 'rgba(255,255,255,0.05)',
                }} />
              )}
            </div>
          ))}
        </div>

        {/* Title */}
        <p style={{
          color: 'rgba(255,255,255,0.25)',
          fontSize: 15,
          fontFamily: "'DM Serif Display', serif",
          marginBottom: 6,
          letterSpacing: '0.02em',
        }}>
          Your canvas awaits
        </p>

        <p style={{
          color: 'rgba(255,255,255,0.15)',
          fontSize: 11,
          fontFamily: "'Inter', system-ui, sans-serif",
          marginBottom: 20,
          lineHeight: 1.6,
        }}>
          {IS_TOUCH
            ? 'Use the upload button above to add images'
            : 'Drop images here or paste from clipboard'}
        </p>

        <div style={{
          display: 'flex',
          flexDirection: 'column' as const,
          gap: 6,
          fontSize: 11,
          color: 'rgba(255,255,255,0.12)',
        }}>
          {IS_TOUCH ? (
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="2">
                <path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4" />
                <polyline points="17 8 12 3 7 8" />
                <line x1="12" y1="3" x2="12" y2="15" />
              </svg>
              <span>Tap the upload button in the header</span>
            </div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center' }}>
                <kbd style={{
                  background: 'rgba(255,255,255,0.04)',
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: 4,
                  padding: '1px 6px',
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 10,
                  color: 'rgba(255,255,255,0.25)',
                }}>Ctrl+V</kbd>
                <span>Paste from clipboard</span>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'center', color: 'rgba(255,255,255,0.08)' }}>
                <span>or drag &amp; drop image files</span>
              </div>
              <div style={{
                marginTop: 10,
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                justifyContent: 'center',
                fontSize: 9,
                color: 'rgba(255,255,255,0.08)',
                fontFamily: "'JetBrains Mono', monospace",
              }}>
                <span>supports</span>
                <span style={{
                  background: 'rgba(249,115,22,0.06)',
                  border: '1px solid rgba(249,115,22,0.12)',
                  borderRadius: 3,
                  padding: '0 4px',
                  color: 'rgba(249,115,22,0.3)',
                }}>images</span>
                <span>+</span>
                <span style={{
                  background: 'rgba(34,211,238,0.06)',
                  border: '1px solid rgba(34,211,238,0.12)',
                  borderRadius: 3,
                  padding: '0 4px',
                  color: 'rgba(34,211,238,0.3)',
                }}>video</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
