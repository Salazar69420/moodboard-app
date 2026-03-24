import { useState } from 'react';
import type { EvalResult } from '../../types';

interface EvalBadgeProps {
  evalResult: EvalResult | undefined;
  isEvaluating?: boolean;
}

export function EvalBadge({ evalResult, isEvaluating }: EvalBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false);

  if (isEvaluating) {
    return (
      <div
        style={{
          width: 8,
          height: 8,
          borderRadius: '50%',
          background: '#f59e0b',
          boxShadow: '0 0 6px rgba(245,158,11,0.7)',
          animation: 'pulse 1.2s ease-in-out infinite',
          flexShrink: 0,
        }}
        title="Evaluating output…"
      />
    );
  }

  if (!evalResult) return null;

  const isPassing = evalResult.status === 'pass';
  const color = isPassing ? '#4ade80' : '#f87171';
  const glow = isPassing ? 'rgba(74,222,128,0.5)' : 'rgba(248,113,113,0.5)';
  const icon = isPassing ? '✓' : '✗';
  const label = isPassing
    ? `Score: ${evalResult.score}/100`
    : `Score: ${evalResult.score}/100`;

  return (
    <div
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onPointerEnter={() => setShowTooltip(true)}
      onPointerLeave={() => setShowTooltip(false)}
    >
      {/* Badge */}
      <div
        style={{
          width: 16,
          height: 16,
          borderRadius: '50%',
          background: `${color}22`,
          border: `1.5px solid ${color}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 9,
          fontWeight: 800,
          color,
          boxShadow: showTooltip ? `0 0 8px ${glow}` : 'none',
          cursor: 'default',
          transition: 'box-shadow 0.15s ease',
          userSelect: 'none',
          flexShrink: 0,
        }}
      >
        {icon}
      </div>

      {/* Tooltip */}
      {showTooltip && (
        <div
          style={{
            position: 'absolute',
            bottom: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            marginBottom: 6,
            background: 'rgba(7,8,14,0.97)',
            backdropFilter: 'blur(20px)',
            border: `1px solid ${color}44`,
            borderRadius: 10,
            padding: '8px 12px',
            fontSize: 10,
            fontFamily: "'Inter', system-ui, sans-serif",
            color: 'rgba(226,228,240,0.9)',
            minWidth: 180,
            maxWidth: 260,
            boxShadow: '0 8px 24px rgba(0,0,0,0.7)',
            zIndex: 200,
            whiteSpace: 'normal',
            animation: 'tooltipFadeIn 0.15s ease forwards',
            pointerEvents: 'none',
          }}
        >
          <div style={{ fontWeight: 700, color, marginBottom: 4, fontSize: 11 }}>
            {isPassing ? '✓ Passed Evaluation' : '✗ Evaluation Notes'}
          </div>
          <div style={{ marginBottom: 3 }}>{label}</div>
          {evalResult.critique && (
            <div style={{ color: 'rgba(226,228,240,0.65)', fontSize: 9, marginTop: 4 }}>
              {evalResult.critique}
            </div>
          )}
          {evalResult.suggestion && !isPassing && (
            <div style={{ color: '#f59e0b', fontSize: 9, marginTop: 3 }}>
              → {evalResult.suggestion}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
