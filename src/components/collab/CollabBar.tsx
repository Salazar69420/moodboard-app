import { useState, useRef, useEffect } from 'react';
import { useCollabStore } from '../../stores/useCollabStore';
import { stopSession } from '../../collab/yjsProvider';
import { pushAllLocalState } from '../../collab/syncBridge';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';

export function CollabBar() {
    const isConnected = useCollabStore((s) => s.isConnected);
    const isConnecting = useCollabStore((s) => s.isConnecting);
    const peers = useCollabStore((s) => s.peers);
    const roomId = useCollabStore((s) => s.roomId);
    const setShowSessionModal = useCollabStore((s) => s.setShowSessionModal);
    const showToast = useUIStore((s) => s.showToast);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const [showLinkPopup, setShowLinkPopup] = useState(false);
    const [linkCopied, setLinkCopied] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const popupRef = useRef<HTMLDivElement>(null);

    // Close popup on outside click
    useEffect(() => {
        if (!showLinkPopup) return;
        const handler = (e: MouseEvent) => {
            if (popupRef.current && !popupRef.current.contains(e.target as Node)) {
                setShowLinkPopup(false);
            }
        };
        document.addEventListener('mousedown', handler);
        return () => document.removeEventListener('mousedown', handler);
    }, [showLinkPopup]);

    const getShareLink = () => {
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('room', roomId || '');
        if (currentProjectId) url.searchParams.set('project', currentProjectId);
        return url.toString();
    };

    const handleCopyLink = () => {
        const link = getShareLink();
        navigator.clipboard.writeText(link).then(() => {
            setLinkCopied(true);
            showToast('Link copied!');
            setTimeout(() => setLinkCopied(false), 2000);
        }).catch(() => {
            showToast('Failed to copy');
        });
    };

    // Not in session
    if (!isConnected && !isConnecting) {
        return (
            <button
                onClick={() => setShowSessionModal(true)}
                style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                    padding: '5px 14px',
                    borderRadius: 10,
                    fontSize: 11,
                    fontFamily: "'Inter', system-ui, sans-serif",
                    fontWeight: 500,
                    background: 'rgba(255,255,255,0.03)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    flexShrink: 0,
                }}
                onMouseEnter={e => {
                    e.currentTarget.style.background = 'rgba(249,115,22,0.06)';
                    e.currentTarget.style.borderColor = 'rgba(249,115,22,0.15)';
                    e.currentTarget.style.color = '#f97316';
                    e.currentTarget.style.boxShadow = '0 0 12px rgba(249,115,22,0.04)';
                }}
                onMouseLeave={e => {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                    e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                    e.currentTarget.style.boxShadow = 'none';
                }}
            >
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                    style={{ opacity: 0.7 }}>
                    <circle cx="18" cy="5" r="3" />
                    <circle cx="6" cy="12" r="3" />
                    <circle cx="18" cy="19" r="3" />
                    <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                    <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                </svg>
                Sync
            </button>
        );
    }

    // Connecting
    if (isConnecting) {
        return (
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 7,
                padding: '5px 14px',
                borderRadius: 10,
                fontSize: 11,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                background: 'rgba(249,115,22,0.04)',
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(249,115,22,0.12)',
                color: '#f97316',
                flexShrink: 0,
            }}>
                <div style={{
                    width: 10, height: 10,
                    border: '1.5px solid rgba(249,115,22,0.15)',
                    borderTopColor: '#f97316',
                    borderRadius: '50%',
                    animation: 'spin 0.7s linear infinite',
                }} />
                Connecting…
            </div>
        );
    }

    // Connected
    return (
        <div ref={popupRef} style={{ position: 'relative', flexShrink: 0 }}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: 4,
                padding: '3px 4px 3px 10px',
                borderRadius: 10,
                fontSize: 11,
                fontFamily: "'Inter', system-ui, sans-serif",
                background: 'rgba(255,255,255,0.03)',
                backdropFilter: 'blur(16px) saturate(180%)',
                border: '1px solid rgba(255,255,255,0.06)',
                boxShadow: '0 0 0 1px rgba(255,255,255,0.02) inset',
            }}>
                {/* Live dot */}
                <div style={{
                    width: 6, height: 6,
                    borderRadius: '50%',
                    background: '#4ade80',
                    boxShadow: '0 0 8px rgba(74,222,128,0.5)',
                    animation: 'pulse 2s ease-in-out infinite',
                }} />

                {/* Presence dots */}
                <div style={{ display: 'flex', alignItems: 'center', marginLeft: 4, marginRight: 2 }}>
                    {peers.map((peer, i) => (
                        <div
                            key={peer.id}
                            title={peer.name}
                            style={{
                                width: 8, height: 8,
                                borderRadius: '50%',
                                background: peer.color,
                                border: '1.5px solid rgba(0,0,0,0.5)',
                                boxShadow: `0 0 6px ${peer.color}40`,
                                marginLeft: i > 0 ? -3 : 0,
                                animation: 'fadeIn 0.3s ease-out',
                                zIndex: peers.length - i,
                                position: 'relative',
                                transition: 'transform 0.2s ease',
                            }}
                        />
                    ))}
                    {peers.length === 0 && (
                        <span style={{ color: 'rgba(255,255,255,0.25)', fontSize: 10, fontFamily: "'JetBrains Mono', monospace" }}>
                            waiting
                        </span>
                    )}
                </div>

                {/* Sync Board button */}
                <button
                    onClick={() => {
                        setIsSyncing(true);
                        pushAllLocalState();
                        showToast('Syncing board to peers…');
                        setTimeout(() => {
                            setIsSyncing(false);
                            showToast('Board synced ✓');
                        }, 1500);
                    }}
                    disabled={isSyncing}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: isSyncing ? 'rgba(74,222,128,0.08)' : 'rgba(255,255,255,0.03)',
                        color: isSyncing ? '#4ade80' : 'rgba(255,255,255,0.4)',
                        fontSize: 10,
                        fontWeight: 500,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        cursor: isSyncing ? 'wait' : 'pointer',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => {
                        if (!isSyncing) {
                            e.currentTarget.style.background = 'rgba(74,222,128,0.06)';
                            e.currentTarget.style.color = '#4ade80';
                            e.currentTarget.style.borderColor = 'rgba(74,222,128,0.15)';
                        }
                    }}
                    onMouseLeave={e => {
                        if (!isSyncing) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.06)';
                        }
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
                        style={{ animation: isSyncing ? 'spin 0.8s linear infinite' : 'none' }}>
                        <path d="M21 12a9 9 0 11-6.219-8.56" />
                    </svg>
                    {isSyncing ? 'Syncing…' : 'Sync'}
                </button>

                {/* Share button */}
                <button
                    onClick={() => setShowLinkPopup(!showLinkPopup)}
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 4,
                        padding: '4px 10px',
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.06)',
                        background: showLinkPopup ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.03)',
                        color: showLinkPopup ? '#f97316' : 'rgba(255,255,255,0.4)',
                        fontSize: 10,
                        fontWeight: 500,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => {
                        if (!showLinkPopup) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                            e.currentTarget.style.color = '#fff';
                        }
                    }}
                    onMouseLeave={e => {
                        if (!showLinkPopup) {
                            e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                            e.currentTarget.style.color = 'rgba(255,255,255,0.4)';
                        }
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="18" cy="5" r="3" />
                        <circle cx="6" cy="12" r="3" />
                        <circle cx="18" cy="19" r="3" />
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49" />
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49" />
                    </svg>
                    Share
                </button>

                {/* Disconnect */}
                <button
                    onClick={stopSession}
                    title="Disconnect"
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        width: 24, height: 24,
                        borderRadius: 7,
                        border: '1px solid rgba(255,255,255,0.04)',
                        background: 'transparent',
                        color: 'rgba(255,255,255,0.25)',
                        cursor: 'pointer',
                        transition: 'all 0.12s ease',
                    }}
                    onMouseEnter={e => {
                        e.currentTarget.style.background = 'rgba(239,68,68,0.08)';
                        e.currentTarget.style.color = '#ef4444';
                        e.currentTarget.style.borderColor = 'rgba(239,68,68,0.15)';
                    }}
                    onMouseLeave={e => {
                        e.currentTarget.style.background = 'transparent';
                        e.currentTarget.style.color = 'rgba(255,255,255,0.25)';
                        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)';
                    }}
                >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <line x1="18" y1="6" x2="6" y2="18" />
                        <line x1="6" y1="6" x2="18" y2="18" />
                    </svg>
                </button>
            </div>

            {/* Share link popup */}
            {showLinkPopup && (
                <div style={{
                    position: 'absolute',
                    top: 'calc(100% + 8px)',
                    right: 0,
                    width: 340,
                    background: 'rgba(12,13,20,0.92)',
                    backdropFilter: 'blur(32px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(32px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 14,
                    padding: 4,
                    boxShadow: '0 16px 48px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03) inset',
                    animation: 'fadeIn 0.15s ease-out',
                    zIndex: 100,
                }}>
                    <div style={{
                        padding: '10px 12px 8px',
                        fontSize: 10,
                        color: 'rgba(255,255,255,0.3)',
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        letterSpacing: '0.06em',
                        textTransform: 'uppercase',
                    }}>
                        Session Link
                    </div>
                    <div style={{
                        display: 'flex', gap: 4,
                        background: 'rgba(255,255,255,0.02)',
                        borderRadius: 10,
                        padding: 3,
                        margin: '0 4px 8px',
                    }}>
                        <input
                            value={getShareLink()}
                            readOnly
                            onClick={e => (e.target as HTMLInputElement).select()}
                            style={{
                                flex: 1,
                                padding: '8px 10px',
                                borderRadius: 8,
                                border: 'none',
                                background: 'transparent',
                                color: '#f97316',
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                outline: 'none',
                            }}
                        />
                        <button
                            onClick={handleCopyLink}
                            style={{
                                padding: '6px 14px', borderRadius: 8,
                                border: 'none',
                                background: linkCopied ? 'rgba(74,222,128,0.12)' : 'rgba(249,115,22,0.1)',
                                color: linkCopied ? '#4ade80' : '#f97316',
                                fontSize: 10, fontWeight: 600,
                                fontFamily: "'JetBrains Mono', monospace",
                                cursor: 'pointer',
                                transition: 'all 0.12s ease',
                                whiteSpace: 'nowrap',
                            }}
                        >
                            {linkCopied ? '✓ Copied' : 'Copy'}
                        </button>
                    </div>
                </div>
            )}

            <style>{`
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
      `}</style>
        </div>
    );
}
