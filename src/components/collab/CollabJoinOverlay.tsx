import { useEffect, useState } from 'react';
import { useCollabStore } from '../../stores/useCollabStore';

export function CollabJoinOverlay() {
    const show = useCollabStore((s) => s.showJoinOverlay);
    const phase = useCollabStore((s) => s.joinPhase);
    const setShow = useCollabStore((s) => s.setShowJoinOverlay);
    const [exiting, setExiting] = useState(false);

    useEffect(() => {
        if (phase === 'ready') {
            const t = setTimeout(() => {
                setExiting(true);
                setTimeout(() => {
                    setShow(false);
                    setExiting(false);
                }, 400);
            }, 1200);
            return () => clearTimeout(t);
        }
    }, [phase, setShow]);

    if (!show) return null;

    const phaseText = {
        connecting: 'Connecting to peers…',
        syncing: 'Syncing board…',
        ready: 'Ready ✓',
    }[phase];

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 600,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                background: '#07080e',
                opacity: exiting ? 0 : 1,
                transition: 'opacity 0.4s ease-out',
            }}
        >
            {/* Aurora background */}
            <div style={{ position: 'absolute', inset: 0, overflow: 'hidden', opacity: 0.4 }}>
                <div style={{
                    position: 'absolute',
                    width: 600, height: 600,
                    top: '30%', left: '20%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(99,102,241,0.3) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'auroraA 8s ease-in-out infinite alternate',
                }} />
                <div style={{
                    position: 'absolute',
                    width: 500, height: 500,
                    top: '40%', right: '15%',
                    borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(249,115,22,0.25) 0%, transparent 70%)',
                    filter: 'blur(80px)',
                    animation: 'auroraB 10s ease-in-out infinite alternate',
                }} />
            </div>

            {/* Connection animation */}
            <div style={{ position: 'relative', marginBottom: 40 }}>
                <svg width="180" height="60" viewBox="0 0 180 60">
                    {/* Connection line */}
                    <line
                        x1="40" y1="30" x2="140" y2="30"
                        stroke="rgba(249,115,22,0.5)"
                        strokeWidth="2"
                        strokeDasharray="100"
                        strokeDashoffset={phase === 'connecting' ? '100' : '0'}
                        style={{ transition: 'stroke-dashoffset 1.5s ease-in-out' }}
                    />
                    {/* Node 1 */}
                    <circle cx="30" cy="30" r="12"
                        fill="rgba(99,102,241,0.15)"
                        stroke="#6366f1"
                        strokeWidth="2"
                    />
                    <circle cx="30" cy="30" r="4" fill="#6366f1" />
                    {/* Node 2 */}
                    <circle cx="150" cy="30" r="12"
                        fill="rgba(249,115,22,0.15)"
                        stroke="#f97316"
                        strokeWidth="2"
                    />
                    <circle cx="150" cy="30" r="4" fill="#f97316" />
                    {/* Ready checkmark */}
                    {phase === 'ready' && (
                        <g transform="translate(90,30)" style={{ animation: 'fadeIn 0.3s ease-out' }}>
                            <circle r="10" fill="rgba(74,222,128,0.15)" stroke="#4ade80" strokeWidth="1.5" />
                            <path d="M-4,0 L-1,3 L4,-3" fill="none" stroke="#4ade80" strokeWidth="2" strokeLinecap="round" />
                        </g>
                    )}
                </svg>
            </div>

            {/* Phase text */}
            <div style={{
                fontSize: 14,
                fontFamily: "'JetBrains Mono', monospace",
                fontWeight: 500,
                color: phase === 'ready' ? '#4ade80' : '#888',
                letterSpacing: '0.04em',
                transition: 'color 0.3s ease',
            }}>
                {phaseText}
            </div>

            <style>{`
        @keyframes auroraA {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(60px, -40px) scale(1.2); }
        }
        @keyframes auroraB {
          0% { transform: translate(0, 0) scale(1); }
          100% { transform: translate(-40px, 30px) scale(1.15); }
        }
      `}</style>
        </div>
    );
}
