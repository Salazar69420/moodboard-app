import { useState, useEffect, useRef } from 'react';
import { nanoid } from 'nanoid';
import { useCollabStore } from '../../stores/useCollabStore';
import { useSettingsStore, DEFAULT_MODELS } from '../../stores/useSettingsStore';
import type { ModelEntry } from '../../stores/useSettingsStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { startSession } from '../../collab/yjsProvider';
import { pushAllLocalState, startObserving, startStoreSubscriptions, startPolling } from '../../collab/syncBridge';
import { startBlobTransferService } from '../../collab/blobTransfer';
import { useUIStore } from '../../stores/useUIStore';

// Shared input styles
const inputStyle: React.CSSProperties = {
    display: 'block', width: '100%', marginTop: 6,
    padding: '10px 14px', borderRadius: 12,
    background: 'rgba(255,255,255,0.03)',
    border: '1px solid rgba(255,255,255,0.07)',
    color: '#e5e5e5', fontSize: 13, outline: 'none',
    fontFamily: "'Inter', system-ui, sans-serif",
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box' as const,
};

const labelStyle: React.CSSProperties = {
    fontSize: 10, color: 'rgba(255,255,255,0.35)',
    fontFamily: "'JetBrains Mono', monospace",
    fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase' as const,
};

function parseModelId(id: string): ModelEntry {
    const parts = id.split('/');
    const provider = parts.length > 1 ? parts[0] : 'Custom';
    const rawName = parts.length > 1 ? parts.slice(1).join('/') : id;
    const label = rawName
        .split(/[-_]/)
        .map(w => {
            if (/^(gpt|vl|xl|llm|ai|rl)$/i.test(w)) return w.toUpperCase();
            if (/^\d/.test(w)) return w;
            return w.charAt(0).toUpperCase() + w.slice(1);
        })
        .join(' ');
    return { id, label, provider: provider.charAt(0).toUpperCase() + provider.slice(1), isCustom: true };
}

export function CollabSessionModal() {
    const show = useCollabStore((s) => s.showSessionModal);
    const setShow = useCollabStore((s) => s.setShowSessionModal);
    const localName = useCollabStore((s) => s.localName);
    const setLocalName = useCollabStore((s) => s.setLocalName);
    const setSessionApiKey = useCollabStore((s) => s.setSessionApiKey);
    const setSessionModel = useCollabStore((s) => s.setSessionModel);
    const setShowJoinOverlay = useCollabStore((s) => s.setShowJoinOverlay);
    const setJoinPhase = useCollabStore((s) => s.setJoinPhase);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const showToast = useUIStore((s) => s.showToast);

    const storedApiKey = useSettingsStore((s) => s.apiKey);
    const storedModel = useSettingsStore((s) => s.model);
    const globalCustomModels = useSettingsStore((s) => s.customModels);

    const [name, setName] = useState(localName || 'Anonymous');
    const [apiKey, setApiKey] = useState(storedApiKey);
    const [model, setModel] = useState(storedModel);
    const [joinLink, setJoinLink] = useState('');
    const [customModelInput, setCustomModelInput] = useState('');
    const [sessionModels, setSessionModels] = useState<ModelEntry[]>([]); // session-local custom models
    const [generatedLink, setGeneratedLink] = useState<string | null>(null);
    const [linkCopied, setLinkCopied] = useState(false);
    const linkRef = useRef<HTMLInputElement>(null);

    // Pre-fill join link from URL params
    useEffect(() => {
        if (show) {
            const params = new URLSearchParams(window.location.search);
            const room = params.get('room');
            if (room) {
                setJoinLink(window.location.href);
            }
        }
    }, [show]);

    if (!show) return null;

    const allModels = [...DEFAULT_MODELS, ...globalCustomModels, ...sessionModels];
    // Deduplicate by id
    const uniqueModels = Array.from(new Map(allModels.map(m => [m.id, m])).values());

    const handleAddCustomModel = () => {
        const trimmed = customModelInput.trim();
        if (!trimmed) return;
        // Check if already exists
        if (uniqueModels.some(m => m.id === trimmed)) {
            setModel(trimmed);
            setCustomModelInput('');
            return;
        }
        const newModel = parseModelId(trimmed);
        setSessionModels(prev => [...prev, newModel]);
        setModel(trimmed);
        setCustomModelInput('');
    };

    const handleStart = () => {
        if (!name.trim()) return;
        const roomId = nanoid(10);
        setLocalName(name.trim());
        setSessionApiKey(apiKey);
        setSessionModel(model);

        startSession(roomId, currentProjectId || '');
        setJoinPhase('connecting');
        setShowJoinOverlay(true);

        // Push local state after connection
        setTimeout(() => {
            pushAllLocalState();
            startObserving();
            startStoreSubscriptions();
            startPolling();
            startBlobTransferService();
            setJoinPhase('syncing');
            setTimeout(() => setJoinPhase('ready'), 800);
        }, 1500);

        // Generate and show the link
        const url = new URL(window.location.origin + window.location.pathname);
        url.searchParams.set('room', roomId);
        if (currentProjectId) url.searchParams.set('project', currentProjectId);
        const link = url.toString();
        setGeneratedLink(link);

        // Also store in the collab store for the CollabBar
        useCollabStore.setState({ roomId });

        // Try to copy
        navigator.clipboard.writeText(link).then(() => {
            setLinkCopied(true);
            showToast('Session link copied to clipboard!');
            setTimeout(() => setLinkCopied(false), 2000);
        }).catch(() => {
            // Clipboard failed — that's fine, link is visible
            showToast('Link ready — copy it below');
        });
    };

    const handleJoin = () => {
        if (!name.trim() || !joinLink.trim()) return;
        try {
            const url = new URL(joinLink);
            const roomId = url.searchParams.get('room');
            if (!roomId) {
                showToast('Invalid link — no room ID');
                return;
            }
            setLocalName(name.trim());
            setSessionApiKey(apiKey);
            setSessionModel(model);

            startSession(roomId, currentProjectId || '');
            setJoinPhase('connecting');
            setShowJoinOverlay(true);
            setShow(false);

            setTimeout(() => {
                startObserving();
                startStoreSubscriptions();
                startPolling();
                startBlobTransferService();
                setJoinPhase('syncing');
                setTimeout(() => setJoinPhase('ready'), 1200);
            }, 2000);
        } catch {
            showToast('Invalid link format');
        }
    };

    const handleCopyLink = () => {
        if (!generatedLink) return;
        navigator.clipboard.writeText(generatedLink).then(() => {
            setLinkCopied(true);
            showToast('Copied!');
            setTimeout(() => setLinkCopied(false), 2000);
        }).catch(() => {
            // Fallback — select text
            linkRef.current?.select();
            showToast('Select and copy the link above');
        });
    };

    const onFocus = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'rgba(249,115,22,0.35)';
        e.currentTarget.style.boxShadow = '0 0 0 3px rgba(249,115,22,0.06)';
    };
    const onBlur = (e: React.FocusEvent<HTMLInputElement | HTMLSelectElement>) => {
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.boxShadow = 'none';
    };

    return (
        <div
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 500,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                background: 'rgba(0,0,0,0.55)',
                backdropFilter: 'blur(20px) saturate(180%)',
                WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                animation: 'fadeIn 0.2s ease-out',
            }}
            onClick={() => { if (!generatedLink) setShow(false); }}
        >
            <div
                onClick={e => e.stopPropagation()}
                style={{
                    width: 400,
                    maxHeight: '90vh',
                    overflowY: 'auto',
                    background: 'rgba(12,13,20,0.88)',
                    backdropFilter: 'blur(40px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(200%)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 20,
                    boxShadow: '0 32px 80px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04) inset, 0 1px 0 rgba(255,255,255,0.06) inset',
                    padding: '28px 24px 24px',
                    animation: 'modalSlideUp 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)',
                }}
            >
                {/* ── Generated link view after session start ── */}
                {generatedLink ? (
                    <div style={{ animation: 'fadeIn 0.2s ease-out' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: 10,
                                background: 'rgba(74,222,128,0.1)',
                                border: '1px solid rgba(74,222,128,0.15)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                            }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                                    <polyline points="20 6 9 17 4 12" />
                                </svg>
                            </div>
                            <div>
                                <h3 style={{ fontSize: 15, fontWeight: 600, color: '#fff', margin: 0 }}>Session Started</h3>
                                <p style={{ fontSize: 11, color: 'rgba(255,255,255,0.35)', margin: 0, fontFamily: "'JetBrains Mono', monospace" }}>
                                    Share this link with your collaborator
                                </p>
                            </div>
                        </div>

                        {/* Link display */}
                        <div style={{
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: 12,
                            padding: '3px',
                            display: 'flex',
                            gap: 4,
                            marginBottom: 16,
                        }}>
                            <input
                                ref={linkRef}
                                value={generatedLink}
                                readOnly
                                onClick={e => (e.target as HTMLInputElement).select()}
                                style={{
                                    flex: 1,
                                    padding: '10px 12px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: 'transparent',
                                    color: '#f97316',
                                    fontSize: 11,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    outline: 'none',
                                    letterSpacing: '0.01em',
                                }}
                            />
                            <button
                                onClick={handleCopyLink}
                                style={{
                                    padding: '8px 16px',
                                    borderRadius: 10,
                                    border: 'none',
                                    background: linkCopied ? 'rgba(74,222,128,0.15)' : 'rgba(249,115,22,0.12)',
                                    color: linkCopied ? '#4ade80' : '#f97316',
                                    fontSize: 11,
                                    fontWeight: 600,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: 'pointer',
                                    transition: 'all 0.15s ease',
                                    whiteSpace: 'nowrap',
                                }}
                            >
                                {linkCopied ? '✓ Copied' : 'Copy'}
                            </button>
                        </div>

                        <button
                            onClick={() => { setGeneratedLink(null); setShow(false); }}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 12,
                                border: '1px solid rgba(255,255,255,0.06)',
                                background: 'rgba(255,255,255,0.03)',
                                color: 'rgba(255,255,255,0.5)',
                                fontSize: 12,
                                fontWeight: 500,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                cursor: 'pointer',
                                transition: 'all 0.15s ease',
                            }}
                            onMouseEnter={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.06)';
                                e.currentTarget.style.color = '#fff';
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
                                e.currentTarget.style.color = 'rgba(255,255,255,0.5)';
                            }}
                        >
                            Done
                        </button>
                    </div>
                ) : (
                    /* ── Setup form ── */
                    <>
                        {/* Header */}
                        <div style={{ marginBottom: 22, textAlign: 'center' }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: 14,
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(99,102,241,0.12))',
                                border: '1px solid rgba(255,255,255,0.06)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 12px',
                                boxShadow: '0 0 20px rgba(249,115,22,0.06)',
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.5">
                                    <circle cx="12" cy="12" r="10" />
                                    <path d="M12 6v6l4 2" />
                                </svg>
                            </div>
                            <h3 style={{ fontSize: 16, fontWeight: 600, color: '#fff', margin: '0 0 4px' }}>
                                Sync Session
                            </h3>
                            <p style={{
                                fontSize: 11, color: 'rgba(255,255,255,0.3)', margin: 0,
                                fontFamily: "'JetBrains Mono', monospace",
                            }}>
                                Peer-to-peer • No server • End-to-end
                            </p>
                        </div>

                        {/* Name */}
                        <div style={{ marginBottom: 14 }}>
                            <span style={labelStyle}>Your Name</span>
                            <input
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Enter your name"
                                style={inputStyle}
                                onFocus={onFocus}
                                onBlur={onBlur}
                            />
                        </div>

                        {/* API Key */}
                        <div style={{ marginBottom: 14 }}>
                            <span style={labelStyle}>
                                Session API Key{' '}
                                <span style={{ color: 'rgba(255,255,255,0.15)', fontWeight: 400 }}>· memory only</span>
                            </span>
                            <input
                                value={apiKey}
                                onChange={e => setApiKey(e.target.value)}
                                placeholder="sk-or-..."
                                type="password"
                                style={{ ...inputStyle, fontFamily: "'JetBrains Mono', monospace", fontSize: 12 }}
                                onFocus={onFocus}
                                onBlur={onBlur}
                            />
                        </div>

                        {/* Model */}
                        <div style={{ marginBottom: 20 }}>
                            <span style={labelStyle}>Model</span>
                            <select
                                value={model}
                                onChange={e => setModel(e.target.value)}
                                style={{
                                    ...inputStyle,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontSize: 12,
                                    appearance: 'none',
                                    backgroundImage: `url("data:image/svg+xml,%3Csvg width='10' height='6' viewBox='0 0 10 6' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M1 1l4 4 4-4' stroke='%23666' fill='none' stroke-width='1.5'/%3E%3C/svg%3E")`,
                                    backgroundRepeat: 'no-repeat',
                                    backgroundPosition: 'right 14px center',
                                    paddingRight: 36,
                                }}
                                onFocus={onFocus as any}
                                onBlur={onBlur as any}
                            >
                                {uniqueModels.map(m => (
                                    <option key={m.id} value={m.id} style={{ background: '#111', color: '#e5e5e5' }}>
                                        {m.label} — {m.provider}{m.isCustom ? ' ★' : ''}
                                    </option>
                                ))}
                            </select>

                            {/* Custom model row */}
                            <div style={{ display: 'flex', gap: 6, marginTop: 8 }}>
                                <input
                                    value={customModelInput}
                                    onChange={e => setCustomModelInput(e.target.value)}
                                    onKeyDown={e => { if (e.key === 'Enter') handleAddCustomModel(); }}
                                    placeholder="vendor/model-id"
                                    style={{
                                        flex: 1, padding: '7px 10px', borderRadius: 8,
                                        background: 'rgba(255,255,255,0.02)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        color: 'rgba(255,255,255,0.6)', fontSize: 10.5, outline: 'none',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        transition: 'border-color 0.15s ease',
                                    }}
                                    onFocus={e => e.currentTarget.style.borderColor = 'rgba(249,115,22,0.3)'}
                                    onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)'}
                                />
                                <button
                                    onClick={handleAddCustomModel}
                                    disabled={!customModelInput.trim()}
                                    style={{
                                        padding: '6px 12px', borderRadius: 8,
                                        border: '1px solid rgba(249,115,22,0.2)',
                                        background: customModelInput.trim() ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
                                        color: customModelInput.trim() ? '#f97316' : 'rgba(255,255,255,0.2)',
                                        fontSize: 10, fontWeight: 600, cursor: customModelInput.trim() ? 'pointer' : 'default',
                                        fontFamily: "'JetBrains Mono', monospace",
                                        transition: 'all 0.12s ease',
                                    }}
                                >
                                    + Add
                                </button>
                            </div>
                        </div>

                        {/* Start button */}
                        <button
                            onClick={handleStart}
                            disabled={!name.trim()}
                            style={{
                                width: '100%',
                                padding: '12px',
                                borderRadius: 12,
                                border: '1px solid rgba(249,115,22,0.3)',
                                background: 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))',
                                color: '#f97316',
                                fontSize: 13, fontWeight: 600,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                cursor: name.trim() ? 'pointer' : 'not-allowed',
                                transition: 'all 0.2s ease',
                                boxShadow: '0 0 16px rgba(249,115,22,0.06), inset 0 1px 0 rgba(249,115,22,0.1)',
                                letterSpacing: '0.02em',
                            }}
                            onMouseEnter={e => {
                                if (name.trim()) {
                                    e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.2), rgba(249,115,22,0.1))';
                                    e.currentTarget.style.boxShadow = '0 0 28px rgba(249,115,22,0.12), inset 0 1px 0 rgba(249,115,22,0.15)';
                                    e.currentTarget.style.transform = 'translateY(-1px)';
                                }
                            }}
                            onMouseLeave={e => {
                                e.currentTarget.style.background = 'linear-gradient(135deg, rgba(249,115,22,0.12), rgba(249,115,22,0.06))';
                                e.currentTarget.style.boxShadow = '0 0 16px rgba(249,115,22,0.06), inset 0 1px 0 rgba(249,115,22,0.1)';
                                e.currentTarget.style.transform = 'translateY(0)';
                            }}
                        >
                            Start New Session
                        </button>

                        {/* Divider */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: 12, margin: '18px 0 14px' }}>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                            <span style={{ fontSize: 10, color: 'rgba(255,255,255,0.2)', fontFamily: "'JetBrains Mono', monospace", letterSpacing: '0.08em' }}>OR JOIN</span>
                            <div style={{ flex: 1, height: 1, background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.06), transparent)' }} />
                        </div>

                        {/* Join */}
                        <div style={{
                            display: 'flex',
                            gap: 6,
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.05)',
                            borderRadius: 12,
                            padding: 3,
                        }}>
                            <input
                                value={joinLink}
                                onChange={e => setJoinLink(e.target.value)}
                                onKeyDown={e => { if (e.key === 'Enter') handleJoin(); }}
                                placeholder="Paste session link…"
                                style={{
                                    flex: 1, padding: '10px 12px',
                                    borderRadius: 10, border: 'none',
                                    background: 'transparent',
                                    color: '#e5e5e5', fontSize: 12, outline: 'none',
                                    fontFamily: "'JetBrains Mono', monospace",
                                }}
                            />
                            <button
                                onClick={handleJoin}
                                disabled={!joinLink.trim() || !name.trim()}
                                style={{
                                    padding: '8px 16px', borderRadius: 10,
                                    border: 'none',
                                    background: (joinLink.trim() && name.trim()) ? 'rgba(99,102,241,0.12)' : 'transparent',
                                    color: (joinLink.trim() && name.trim()) ? '#818cf8' : 'rgba(255,255,255,0.15)',
                                    fontSize: 12, fontWeight: 600,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    cursor: (joinLink.trim() && name.trim()) ? 'pointer' : 'default',
                                    transition: 'all 0.15s ease',
                                }}
                                onMouseEnter={e => {
                                    if (joinLink.trim() && name.trim()) {
                                        e.currentTarget.style.background = 'rgba(99,102,241,0.2)';
                                    }
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = (joinLink.trim() && name.trim()) ? 'rgba(99,102,241,0.12)' : 'transparent';
                                }}
                            >
                                Join
                            </button>
                        </div>

                        {/* Close hint */}
                        <div style={{
                            textAlign: 'center', marginTop: 16,
                            fontSize: 10, color: 'rgba(255,255,255,0.15)',
                            fontFamily: "'JetBrains Mono', monospace",
                        }}>
                            press anywhere outside to close
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}
