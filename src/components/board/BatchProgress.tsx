import { useUIStore } from '../../stores/useUIStore';

export function BatchProgress() {
  const batchProgress = useUIStore((s) => s.batchProgress);

  if (!batchProgress) return null;

  const pct = Math.round((batchProgress.current / batchProgress.total) * 100);

  return (
    <div
      style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 60,
        display: 'flex',
        flexDirection: 'column',
        gap: 0,
        pointerEvents: 'none',
      }}
    >
      {/* Label */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'center',
          paddingBottom: 3,
        }}
      >
        <span
          style={{
            fontSize: 10,
            color: 'rgba(226,228,240,0.6)',
            fontFamily: "'Inter', system-ui, sans-serif",
            letterSpacing: '0.02em',
          }}
        >
          Generating {batchProgress.current} / {batchProgress.total} variations…
        </span>
      </div>

      {/* Progress bar */}
      <div
        style={{
          width: '100%',
          height: 2,
          background: 'rgba(255,255,255,0.06)',
        }}
      >
        <div
          style={{
            height: '100%',
            width: `${pct}%`,
            background: 'linear-gradient(90deg, #f97316, #fb923c)',
            transition: 'width 0.3s ease',
          }}
        />
      </div>
    </div>
  );
}
