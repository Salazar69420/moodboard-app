import { useRef, useEffect } from 'react';
import { useCollabStore } from '../../stores/useCollabStore';

interface LerpedCursor {
    x: number;
    y: number;
    targetX: number;
    targetY: number;
}

export function RemoteCursors() {
    const peers = useCollabStore((s) => s.peers);
    const cursorsRef = useRef<Map<string, LerpedCursor>>(new Map());
    const domRefs = useRef<Map<string, HTMLDivElement>>(new Map());
    const animFrameRef = useRef<number>(0);

    // Lerp animation loop
    useEffect(() => {
        const FACTOR = 0.15;
        const animate = () => {
            cursorsRef.current.forEach((cursor, peerId) => {
                cursor.x += (cursor.targetX - cursor.x) * FACTOR;
                cursor.y += (cursor.targetY - cursor.y) * FACTOR;
                const el = domRefs.current.get(peerId);
                if (el) {
                    el.style.transform = `translate(${cursor.x}px, ${cursor.y}px)`;
                }
            });
            animFrameRef.current = requestAnimationFrame(animate);
        };
        animFrameRef.current = requestAnimationFrame(animate);
        return () => cancelAnimationFrame(animFrameRef.current);
    }, []);

    // Update targets from peer data
    useEffect(() => {
        for (const peer of peers) {
            const existing = cursorsRef.current.get(peer.id);
            if (existing) {
                existing.targetX = peer.cursorX;
                existing.targetY = peer.cursorY;
            } else {
                cursorsRef.current.set(peer.id, {
                    x: peer.cursorX, y: peer.cursorY,
                    targetX: peer.cursorX, targetY: peer.cursorY,
                });
            }
        }
        // Cleanup stale
        const activeIds = new Set(peers.map(p => p.id));
        cursorsRef.current.forEach((_, id) => {
            if (!activeIds.has(id)) cursorsRef.current.delete(id);
        });
    }, [peers]);

    return (
        <>
            {peers.map(peer => (
                <div
                    key={peer.id}
                    ref={el => {
                        if (el) domRefs.current.set(peer.id, el);
                        else domRefs.current.delete(peer.id);
                    }}
                    style={{
                        position: 'absolute',
                        left: 0,
                        top: 0,
                        pointerEvents: 'none',
                        zIndex: 999,
                        willChange: 'transform',
                    }}
                >
                    {/* Ripple */}
                    <div style={{
                        position: 'absolute',
                        left: -8, top: -8,
                        width: 16, height: 16,
                        borderRadius: '50%',
                        border: `1.5px solid ${peer.color}`,
                        opacity: 0.3,
                        animation: 'cursorRipple 1.5s ease-out infinite',
                    }} />

                    {/* Cursor arrow (SVG) */}
                    <svg width="16" height="20" viewBox="0 0 16 20" style={{
                        filter: `drop-shadow(0 1px 3px rgba(0,0,0,0.6))`,
                    }}>
                        <path
                            d="M0 0L12 9L5.5 10L8 18L5.5 19L3 11L0 14Z"
                            fill={peer.color}
                            stroke="rgba(0,0,0,0.4)"
                            strokeWidth="0.5"
                        />
                    </svg>

                    {/* Name tag */}
                    <div style={{
                        position: 'absolute',
                        left: 16, top: 14,
                        background: peer.color,
                        color: '#fff',
                        fontSize: 9,
                        fontWeight: 600,
                        fontFamily: "'JetBrains Mono', monospace",
                        padding: '2px 6px',
                        borderRadius: 4,
                        whiteSpace: 'nowrap',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.5)',
                        animation: 'fadeIn 0.2s ease-out',
                    }}>
                        {peer.name}
                        {/* Typing dots */}
                        {peer.isTyping && (
                            <span style={{ marginLeft: 4, display: 'inline-flex', gap: 2 }}>
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.7, animation: 'bounceDot 0.6s ease-in-out infinite' }} />
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.7, animation: 'bounceDot 0.6s ease-in-out 0.1s infinite' }} />
                                <span style={{ width: 3, height: 3, borderRadius: '50%', background: '#fff', opacity: 0.7, animation: 'bounceDot 0.6s ease-in-out 0.2s infinite' }} />
                            </span>
                        )}
                    </div>
                </div>
            ))}

            <style>{`
        @keyframes cursorRipple {
          0% { transform: scale(1); opacity: 0.4; }
          100% { transform: scale(2.5); opacity: 0; }
        }
        @keyframes bounceDot {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-3px); }
        }
      `}</style>
        </>
    );
}
