import { useEffect, useState } from 'react';

interface SplashScreenProps {
  onComplete: () => void;
}

export function SplashScreen({ onComplete }: SplashScreenProps) {
  const [phase, setPhase] = useState<'enter' | 'hold' | 'exit'>('enter');

  useEffect(() => {
    // Phase timeline:
    // 0ms    — logo begins revealing
    // 1400ms — line sweeps + subtitle fades in
    // 2400ms — begin exit fade
    // 2900ms — unmount + hand off to app
    const holdTimer = setTimeout(() => setPhase('hold'), 100);
    const exitTimer = setTimeout(() => setPhase('exit'), 2200);
    const doneTimer = setTimeout(() => onComplete(), 2800);

    return () => {
      clearTimeout(holdTimer);
      clearTimeout(exitTimer);
      clearTimeout(doneTimer);
    };
  }, [onComplete]);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 99999,
        background: '#060711',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 0,
        animation: phase === 'exit' ? 'splashScreenFadeOut 0.6s ease forwards' : 'none',
        userSelect: 'none',
      }}
    >
      {/* Atmospheric background glow */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background:
            'radial-gradient(ellipse 70% 50% at 50% 55%, rgba(99, 80, 200, 0.10) 0%, transparent 70%),' +
            'radial-gradient(ellipse 40% 30% at 50% 45%, rgba(238, 124, 53, 0.06) 0%, transparent 65%)',
          pointerEvents: 'none',
        }}
      />

      {/* Brand mark — DM Serif Display (#3) */}
      <div
        style={{
          position: 'relative',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '2px',
        }}
      >
        {/* "AIM" — large serif */}
        <h1
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontWeight: 400,
            fontSize: 'clamp(56px, 10vw, 88px)',
            color: '#e4e6f2',
            letterSpacing: '0.12em',
            lineHeight: 1,
            margin: 0,
            animation: phase !== 'enter'
              ? 'splashLogoReveal 1.1s cubic-bezier(0.22, 1, 0.36, 1) forwards'
              : 'none',
            opacity: phase === 'enter' ? 0 : undefined,
          }}
        >
          AIM
        </h1>

        {/* Thin divider line — sweeps in */}
        <div
          style={{
            width: '100%',
            height: '1px',
            background: 'linear-gradient(90deg, transparent, rgba(238, 124, 53, 0.55) 30%, rgba(200, 185, 255, 0.40) 50%, rgba(238, 124, 53, 0.55) 70%, transparent)',
            transformOrigin: 'left center',
            animation: phase === 'hold' || phase === 'exit'
              ? 'splashLineSweep 0.9s cubic-bezier(0.22, 1, 0.36, 1) 0.5s both'
              : 'none',
            marginTop: '2px',
            marginBottom: '2px',
          }}
        />

        {/* "MEDIA" — smaller, spaced */}
        <h2
          style={{
            fontFamily: "'DM Serif Display', Georgia, serif",
            fontWeight: 400,
            fontSize: 'clamp(18px, 3.5vw, 28px)',
            color: 'rgba(228, 230, 242, 0.72)',
            letterSpacing: '0.45em',
            textTransform: 'uppercase',
            lineHeight: 1,
            margin: 0,
            animation: phase !== 'enter'
              ? 'splashSubtitleFade 0.8s ease 0.3s both'
              : 'none',
            opacity: phase === 'enter' ? 0 : undefined,
          }}
        >
          MEDIA
        </h2>

        {/* Subtitle */}
        <p
          style={{
            fontFamily: 'system-ui, -apple-system, sans-serif',
            fontSize: '11px',
            color: 'rgba(110, 115, 134, 0.85)',
            letterSpacing: '0.18em',
            textTransform: 'uppercase',
            marginTop: '20px',
            animation: phase === 'hold' || phase === 'exit'
              ? 'splashSubtitleFade 0.8s ease 0.9s both'
              : 'none',
            opacity: phase === 'enter' ? 0 : undefined,
          }}
        >
          AI Video Generation Assistant
        </p>
      </div>

      {/* Loading indicator — three dots */}
      <div
        style={{
          position: 'absolute',
          bottom: 'calc(48px + env(safe-area-inset-bottom, 0px))',
          display: 'flex',
          gap: '6px',
          animation: phase === 'hold' || phase === 'exit'
            ? 'splashSubtitleFade 0.6s ease 1.2s both'
            : 'none',
          opacity: phase === 'enter' ? 0 : undefined,
        }}
      >
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            style={{
              width: '4px',
              height: '4px',
              borderRadius: '50%',
              background: 'rgba(238, 124, 53, 0.50)',
              animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
            }}
          />
        ))}
      </div>
    </div>
  );
}
