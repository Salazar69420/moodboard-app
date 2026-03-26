import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import type { BoardImage, CategoryNote } from '../../types';
import { SHOT_CATEGORIES } from '../../types';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { generatePrompt, generateThinkingTrace, type PromptResult, type MultishotShot } from '../../utils/prompt-generator';
import { useBoardStore } from '../../stores/useBoardStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';

// Decorative waveform SVG path for shot cards (purely visual, like Higgsfield)
const WAVEFORM_PATH = "M0,12 C8,6 16,18 24,12 C32,6 40,18 48,12 C56,6 64,18 72,12 C80,6 88,18 96,12";
function ShotCardWave({ color }: { color: string }) {
    return (
        <svg width="96" height="24" viewBox="0 0 96 24" fill="none" style={{ display: 'block', opacity: 0.5 }}>
            <path d={WAVEFORM_PATH} stroke={color} strokeWidth="1.5" fill="none" strokeLinecap="round" />
        </svg>
    );
}

interface Props {
    image: BoardImage;
    notes: CategoryNote[];
    connectedImages?: BoardImage[];
}

export function PromptGenerator({ image, notes, connectedImages = [] }: Props) {
    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);
    const toggleSettings = useSettingsStore((s) => s.toggleSettings);
    const addPromptNode = useBoardStore((s) => s.addPromptNode);
    const godModeNodes = useBoardStore((s) => s.godModeNodes);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);

    const updatePromptNodeEval = useBoardStore((s) => s.updatePromptNodeEval);
    const setBatchProgress = useUIStore((s) => s.setBatchProgress);

    const [showConfirm, setShowConfirm] = useState(false);
    const [isGenerating, setIsGenerating] = useState(false);
    const [result, setResult] = useState<PromptResult | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [copied, setCopied] = useState(false);
    const [isHovered, setIsHovered] = useState(false);
    const [batchCount, setBatchCount] = useState<1 | 3 | 5>(1);
    const [thinkingText, setThinkingText] = useState<string | null>(null);

    // Multishot state
    const [multishotEnabled, setMultishotEnabled] = useState(false);
    const [shotCards, setShotCards] = useState<MultishotShot[]>([
        { id: 's1', duration: 3, description: '' },
        { id: 's2', duration: 3, description: '' },
        { id: 's3', duration: 3, description: '' },
    ]);
    const [activeShotId, setActiveShotId] = useState('s1');
    const [editingDurationId, setEditingDurationId] = useState<string | null>(null);

    const filledCats = new Set(notes.map(n => n.categoryId));
    const missingCount = SHOT_CATEGORIES.length - filledCats.size;
    const hasAnyNotes = notes.length > 0 && notes.some(n => n.text.trim() || n.checkedPrompts.length > 0);

    const handleClick = useCallback(() => {
        if (!apiKey) {
            toggleSettings();
            return;
        }
        if (missingCount > 0) {
            setShowConfirm(true);
        } else {
            doGenerate();
        }
    }, [apiKey, missingCount]);

    const doGenerate = useCallback(async () => {
        setShowConfirm(false);
        setIsGenerating(true);
        setError(null);
        setResult(null);
        setThinkingText(null);

        try {
            // Thinking trace (non-blocking, best effort)
            if (notes.length > 0) {
                try {
                    const trace = await generateThinkingTrace(apiKey, model, notes);
                    setThinkingText(trace);
                } catch { /* ignore trace errors */ }
            }

            const msConfig = multishotEnabled ? { shots: shotCards } : undefined;

            if (batchCount === 1) {
                const res = await generatePrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages, godModeNodes, { multishotConfig: msConfig });
                setResult(res);
                if (currentProjectId) {
                    const displayW = image.displayWidth ?? Math.min(image.width, 350);
                    const nodeId = await addPromptNode(
                        currentProjectId, image.id, res.prompt, res.model, 'i2v',
                        image.x + displayW + 24, image.y + 200,
                    );
                    if (res.evalResult && nodeId) await updatePromptNodeEval(nodeId, res.evalResult);
                }
            } else {
                setBatchProgress({ current: 0, total: batchCount });
                const displayW = image.displayWidth ?? Math.min(image.width, 350);
                const tasks = Array.from({ length: batchCount }, async (_, i) => {
                    const res = await generatePrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages, godModeNodes, { multishotConfig: msConfig });
                    if (currentProjectId) {
                        const nodeId = await addPromptNode(
                            currentProjectId, image.id, res.prompt, res.model, 'i2v',
                            image.x + displayW + 24 + (i * 10), image.y + 200 + (i * 180),
                        );
                        if (res.evalResult && nodeId) await updatePromptNodeEval(nodeId, res.evalResult);
                    }
                    setBatchProgress({ current: i + 1, total: batchCount });
                    return res;
                });
                const results = await Promise.all(tasks);
                setResult(results[0]);
                setBatchProgress(null);
            }
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : 'Generation failed');
            setBatchProgress(null);
        } finally {
            setIsGenerating(false);
        }
    }, [apiKey, model, image, notes, connectedImages, godModeNodes, addPromptNode, updatePromptNodeEval, currentProjectId, batchCount, setBatchProgress, multishotEnabled, shotCards]);

    const handleCopy = useCallback(async () => {
        if (!result) return;
        try {
            await navigator.clipboard.writeText(result.prompt);
            setCopied(true);
            setTimeout(() => setCopied(false), 1500);
        } catch { /* ignore */ }
    }, [result]);

    if (!hasAnyNotes) return null;

    const activeShot = shotCards.find(s => s.id === activeShotId) ?? shotCards[0];
    const activeShotIndex = shotCards.findIndex(s => s.id === activeShotId);

    const addShot = useCallback(() => {
        if (shotCards.length >= 6) return;
        const newId = `s${Date.now()}`;
        setShotCards(prev => [...prev, { id: newId, duration: 3, description: '' }]);
        setActiveShotId(newId);
    }, [shotCards.length]);

    const removeShot = useCallback((id: string) => {
        if (shotCards.length <= 2) return;
        setShotCards(prev => {
            const next = prev.filter(s => s.id !== id);
            if (activeShotId === id) setActiveShotId(next[Math.max(0, prev.findIndex(s => s.id === id) - 1)]?.id ?? next[0].id);
            return next;
        });
    }, [shotCards, activeShotId]);

    const updateShotDescription = useCallback((id: string, description: string) => {
        setShotCards(prev => prev.map(s => s.id === id ? { ...s, description } : s));
    }, []);

    const updateShotDuration = useCallback((id: string, duration: number) => {
        const clamped = Math.max(1, Math.min(10, duration));
        setShotCards(prev => prev.map(s => s.id === id ? { ...s, duration: clamped } : s));
    }, []);

    return (
        <>
            {/* Multishot Toggle */}
            <div style={{ marginTop: 8 }}>
                <button
                    onClick={(e) => { e.stopPropagation(); setMultishotEnabled(v => !v); }}
                    onMouseDown={e => e.stopPropagation()}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '6px 10px',
                        borderRadius: 8,
                        border: multishotEnabled ? '1px solid rgba(249,115,22,0.4)' : '1px solid #1e1e1e',
                        background: multishotEnabled ? 'rgba(249,115,22,0.06)' : '#0a0a0a',
                        cursor: 'pointer',
                        transition: 'all 0.15s ease',
                    }}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7 }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={multishotEnabled ? '#f97316' : '#555'} strokeWidth="2" style={{ transition: 'stroke 0.15s ease' }}>
                            <rect x="2" y="7" width="20" height="10" rx="1" />
                            <path d="M7 7V5M12 7V5M17 7V5M7 17v2M12 17v2M17 17v2" />
                        </svg>
                        <span style={{
                            fontSize: 10,
                            fontFamily: "'JetBrains Mono', monospace",
                            color: multishotEnabled ? '#f97316' : '#555',
                            letterSpacing: '0.06em',
                            textTransform: 'uppercase',
                            fontWeight: multishotEnabled ? 600 : 400,
                            transition: 'color 0.15s ease',
                        }}>
                            Multi-shot
                        </span>
                        {multishotEnabled && (
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'rgba(249,115,22,0.6)',
                                background: 'rgba(249,115,22,0.1)',
                                border: '1px solid rgba(249,115,22,0.2)',
                                borderRadius: 4,
                                padding: '1px 5px',
                            }}>
                                {shotCards.length} shots · {shotCards.reduce((a, s) => a + s.duration, 0)}s total
                            </span>
                        )}
                    </div>
                    {/* Toggle pill */}
                    <div style={{
                        width: 28,
                        height: 15,
                        borderRadius: 8,
                        background: multishotEnabled ? 'rgba(249,115,22,0.3)' : '#1e1e1e',
                        border: multishotEnabled ? '1px solid rgba(249,115,22,0.4)' : '1px solid #2a2a2a',
                        position: 'relative',
                        transition: 'all 0.15s ease',
                        flexShrink: 0,
                    }}>
                        <div style={{
                            position: 'absolute',
                            top: 2,
                            left: multishotEnabled ? 13 : 2,
                            width: 9,
                            height: 9,
                            borderRadius: '50%',
                            background: multishotEnabled ? '#f97316' : '#444',
                            transition: 'left 0.15s ease, background 0.15s ease',
                        }} />
                    </div>
                </button>

                {/* Shot Card Strip */}
                {multishotEnabled && (
                    <div style={{ marginTop: 8 }}>
                        {/* Horizontal scrollable card row */}
                        <div style={{
                            display: 'flex',
                            gap: 6,
                            overflowX: 'auto',
                            paddingBottom: 4,
                            scrollbarWidth: 'none',
                        }}>
                            {shotCards.map((shot, i) => {
                                const isActive = shot.id === activeShotId;
                                return (
                                    <div
                                        key={shot.id}
                                        onClick={(e) => { e.stopPropagation(); setActiveShotId(shot.id); }}
                                        onMouseDown={e => e.stopPropagation()}
                                        style={{
                                            flexShrink: 0,
                                            width: 90,
                                            borderRadius: 8,
                                            border: isActive ? '1.5px solid rgba(249,115,22,0.7)' : '1px solid #1e1e1e',
                                            background: isActive ? '#130800' : '#0a0a0a',
                                            cursor: 'pointer',
                                            transition: 'all 0.15s ease',
                                            position: 'relative',
                                            overflow: 'hidden',
                                            boxShadow: isActive ? '0 0 14px rgba(249,115,22,0.12)' : 'none',
                                        }}
                                    >
                                        {/* Shot number + remove button */}
                                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '6px 7px 2px' }}>
                                            <span style={{
                                                fontSize: 9,
                                                fontFamily: "'JetBrains Mono', monospace",
                                                color: isActive ? '#f97316' : '#444',
                                                letterSpacing: '0.05em',
                                                textTransform: 'uppercase',
                                                fontWeight: 600,
                                                transition: 'color 0.15s ease',
                                            }}>
                                                SHOT {i + 1}
                                            </span>
                                            {shotCards.length > 2 && (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); removeShot(shot.id); }}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'pointer',
                                                        padding: 0,
                                                        color: '#333',
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        fontSize: 10,
                                                        lineHeight: 1,
                                                        transition: 'color 0.12s ease',
                                                    }}
                                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#333'}
                                                >
                                                    ×
                                                </button>
                                            )}
                                        </div>

                                        {/* Description preview */}
                                        <div style={{
                                            padding: '0 7px',
                                            fontSize: 8,
                                            fontFamily: "'Inter', system-ui, sans-serif",
                                            color: shot.description ? (isActive ? 'rgba(249,115,22,0.6)' : '#333') : '#252525',
                                            height: 22,
                                            overflow: 'hidden',
                                            textOverflow: 'ellipsis',
                                            whiteSpace: 'nowrap',
                                            lineHeight: '22px',
                                        }}>
                                            {shot.description || 'No description'}
                                        </div>

                                        {/* Waveform decoration */}
                                        <div style={{ padding: '2px 7px 2px', display: 'flex', justifyContent: 'center' }}>
                                            <ShotCardWave color={isActive ? '#f97316' : '#2a2a2a'} />
                                        </div>

                                        {/* Duration */}
                                        <div style={{ padding: '1px 7px 6px', display: 'flex', alignItems: 'center' }}>
                                            {editingDurationId === shot.id ? (
                                                <input
                                                    type="number"
                                                    min={1}
                                                    max={10}
                                                    defaultValue={shot.duration}
                                                    autoFocus
                                                    onClick={e => e.stopPropagation()}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    onBlur={(e) => {
                                                        updateShotDuration(shot.id, parseInt(e.target.value) || shot.duration);
                                                        setEditingDurationId(null);
                                                    }}
                                                    onKeyDown={(e) => {
                                                        if (e.key === 'Enter') {
                                                            updateShotDuration(shot.id, parseInt(e.currentTarget.value) || shot.duration);
                                                            setEditingDurationId(null);
                                                        }
                                                        e.stopPropagation();
                                                    }}
                                                    style={{
                                                        width: 32,
                                                        background: 'rgba(249,115,22,0.1)',
                                                        border: '1px solid rgba(249,115,22,0.4)',
                                                        borderRadius: 4,
                                                        color: '#f97316',
                                                        fontSize: 10,
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        padding: '1px 4px',
                                                        outline: 'none',
                                                    }}
                                                />
                                            ) : (
                                                <button
                                                    onClick={(e) => { e.stopPropagation(); setEditingDurationId(shot.id); }}
                                                    onMouseDown={e => e.stopPropagation()}
                                                    style={{
                                                        background: 'none',
                                                        border: 'none',
                                                        cursor: 'text',
                                                        padding: 0,
                                                        display: 'flex',
                                                        alignItems: 'center',
                                                        gap: 2,
                                                    }}
                                                >
                                                    <span style={{
                                                        fontSize: 10,
                                                        fontFamily: "'JetBrains Mono', monospace",
                                                        color: isActive ? '#f97316' : '#444',
                                                        fontWeight: 600,
                                                        transition: 'color 0.15s ease',
                                                    }}>
                                                        {shot.duration}s
                                                    </span>
                                                </button>
                                            )}
                                        </div>

                                        {/* Active indicator bar at bottom */}
                                        {isActive && (
                                            <div style={{
                                                position: 'absolute',
                                                bottom: 0,
                                                left: 0,
                                                right: 0,
                                                height: 2,
                                                background: 'linear-gradient(90deg, transparent, #f97316, transparent)',
                                            }} />
                                        )}
                                    </div>
                                );
                            })}

                            {/* Add shot button */}
                            {shotCards.length < 6 && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); addShot(); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{
                                        flexShrink: 0,
                                        width: 42,
                                        borderRadius: 8,
                                        border: '1px dashed #222',
                                        background: 'transparent',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#333',
                                        fontSize: 18,
                                        fontWeight: 300,
                                        transition: 'all 0.15s ease',
                                        lineHeight: 1,
                                    }}
                                    onMouseEnter={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.3)';
                                        (e.currentTarget as HTMLElement).style.color = '#f97316';
                                    }}
                                    onMouseLeave={e => {
                                        (e.currentTarget as HTMLElement).style.borderColor = '#222';
                                        (e.currentTarget as HTMLElement).style.color = '#333';
                                    }}
                                >
                                    +
                                </button>
                            )}
                        </div>

                        {/* Active shot description panel */}
                        <div style={{
                            marginTop: 6,
                            borderRadius: 8,
                            border: '1px solid rgba(249,115,22,0.2)',
                            background: 'rgba(249,115,22,0.03)',
                            overflow: 'hidden',
                        }}>
                            <div style={{
                                padding: '5px 9px',
                                borderBottom: '1px solid rgba(249,115,22,0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                            }}>
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: 'rgba(249,115,22,0.6)',
                                    letterSpacing: '0.05em',
                                    textTransform: 'uppercase',
                                }}>
                                    Shot {activeShotIndex + 1} / {shotCards.length}
                                </span>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                                    <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#444' }}>dur:</span>
                                    <input
                                        type="number"
                                        min={1}
                                        max={10}
                                        value={activeShot.duration}
                                        onClick={e => e.stopPropagation()}
                                        onMouseDown={e => e.stopPropagation()}
                                        onChange={(e) => updateShotDuration(activeShot.id, parseInt(e.target.value) || 1)}
                                        onKeyDown={e => e.stopPropagation()}
                                        style={{
                                            width: 34,
                                            background: 'rgba(249,115,22,0.08)',
                                            border: '1px solid rgba(249,115,22,0.2)',
                                            borderRadius: 4,
                                            color: '#f97316',
                                            fontSize: 10,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            padding: '1px 5px',
                                            outline: 'none',
                                            textAlign: 'center',
                                        }}
                                    />
                                    <span style={{ fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#444' }}>s</span>
                                </div>
                            </div>
                            <textarea
                                value={activeShot.description}
                                onChange={(e) => updateShotDescription(activeShot.id, e.target.value)}
                                onClick={e => e.stopPropagation()}
                                onMouseDown={e => e.stopPropagation()}
                                onKeyDown={e => e.stopPropagation()}
                                placeholder="What happens in this shot? e.g. tight close-up as she turns toward camera, eyes wide..."
                                rows={3}
                                style={{
                                    width: '100%',
                                    boxSizing: 'border-box',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    resize: 'none',
                                    padding: '8px 9px',
                                    fontSize: 11,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    color: '#ccc',
                                    lineHeight: 1.5,
                                }}
                            />
                        </div>
                    </div>
                )}
            </div>

            {/* Process Prompt Button — below image */}
            <div
                style={{
                    marginTop: 8,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                }}
            >
                <button
                    onClick={(e) => { e.stopPropagation(); handleClick(); }}
                    onMouseDown={e => e.stopPropagation()}
                    onMouseEnter={() => setIsHovered(true)}
                    onMouseLeave={() => setIsHovered(false)}
                    disabled={isGenerating}
                    style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: 7,
                        padding: '7px 14px',
                        borderRadius: 8,
                        border: isGenerating
                            ? '1px solid rgba(249,115,22,0.3)'
                            : isHovered
                                ? '1px solid rgba(249,115,22,0.5)'
                                : '1px solid #222',
                        background: isGenerating
                            ? 'rgba(249,115,22,0.06)'
                            : isHovered
                                ? 'rgba(249,115,22,0.08)'
                                : '#111',
                        cursor: isGenerating ? 'wait' : 'pointer',
                        transition: 'all 0.15s ease',
                        boxShadow: isHovered && !isGenerating
                            ? '0 0 16px rgba(249,115,22,0.12)'
                            : 'none',
                    }}
                >
                    {isGenerating ? (
                        <>
                            <div style={{
                                width: 14,
                                height: 14,
                                border: '2px solid rgba(249,115,22,0.2)',
                                borderTopColor: '#f97316',
                                borderRadius: '50%',
                                animation: 'spin 0.7s linear infinite',
                            }} />
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#f97316',
                                letterSpacing: '0.04em',
                            }}>
                                Generating...
                            </span>
                        </>
                    ) : (
                        <>
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke={isHovered ? '#f97316' : '#888'} strokeWidth="2" style={{ transition: 'stroke 0.12s ease' }}>
                                <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span style={{
                                fontSize: 11,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: isHovered ? '#f97316' : '#aaa',
                                fontWeight: 500,
                                letterSpacing: '0.03em',
                                transition: 'color 0.12s ease',
                            }}>
                                Process Prompt
                            </span>
                            {missingCount > 0 && (
                                <span style={{
                                    fontSize: 9,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: '#666',
                                    background: '#1a1a1a',
                                    border: '1px solid #2a2a2a',
                                    borderRadius: 4,
                                    padding: '1px 5px',
                                }}>
                                    {filledCats.size}/{SHOT_CATEGORIES.length}
                                </span>
                            )}
                        </>
                    )}
                </button>
            </div>

            {/* Thinking trace — shown while generating */}
            {isGenerating && thinkingText && (
                <div style={{
                    marginTop: 6, padding: '7px 10px', borderRadius: 8,
                    background: 'rgba(249,115,22,0.05)', border: '1px solid rgba(249,115,22,0.15)',
                    fontSize: 10, fontFamily: "'Inter', system-ui, sans-serif",
                    color: 'rgba(249,115,22,0.7)', lineHeight: 1.5,
                }}>
                    <div style={{ fontSize: 9, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', marginBottom: 3, opacity: 0.6 }}>
                        Planning
                    </div>
                    {thinkingText}
                </div>
            )}

            {/* Confirmation Modal */}
            {showConfirm && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInOverlay 0.2s ease-out forwards',
                    }}
                    onClick={() => setShowConfirm(false)}
                >
                    <style>{`
                        @keyframes fadeInOverlay {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes modalScaleFade {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div
                        style={{
                            width: 380,
                            background: '#111',
                            border: '1px solid #222',
                            borderRadius: 14,
                            boxShadow: '0 16px 60px rgba(0,0,0,0.9)',
                            overflow: 'hidden',
                            animation: 'modalScaleFade 200ms ease-out forwards',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                        <div style={{ padding: '20px 20px 16px' }}>
                            {/* Warning icon */}
                            <div style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: 'rgba(249,115,22,0.1)',
                                border: '1px solid rgba(249,115,22,0.2)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                marginBottom: 14,
                            }}>
                                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2">
                                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                                    <line x1="12" y1="9" x2="12" y2="13" />
                                    <line x1="12" y1="17" x2="12.01" y2="17" />
                                </svg>
                            </div>

                            <h3 style={{
                                fontSize: 15,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                fontWeight: 600,
                                color: '#e5e5e5',
                                marginBottom: 8,
                            }}>
                                Incomplete Shot Notes
                            </h3>

                            <p style={{
                                fontSize: 13,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                color: '#888',
                                lineHeight: 1.5,
                                marginBottom: 16,
                            }}>
                                You have <span style={{ color: '#f97316', fontWeight: 600 }}>{missingCount}</span> of{' '}
                                {SHOT_CATEGORIES.length} categories missing. The generated prompt will only include the notes you've written.
                            </p>

                            {/* Missing categories */}
                            <div style={{
                                display: 'flex',
                                flexWrap: 'wrap',
                                gap: 4,
                                marginBottom: 4,
                            }}>
                                {SHOT_CATEGORIES.filter(c => !filledCats.has(c.id)).map(cat => (
                                    <span
                                        key={cat.id}
                                        style={{
                                            fontSize: 10,
                                            fontFamily: "'JetBrains Mono', monospace",
                                            padding: '2px 6px',
                                            borderRadius: 4,
                                            background: `${cat.color}12`,
                                            border: `1px solid ${cat.border}`,
                                            color: cat.color,
                                            opacity: 0.6,
                                        }}
                                    >
                                        {cat.icon} {cat.label}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* Batch count selector */}
                        <div style={{ padding: '0 20px 12px', display: 'flex', alignItems: 'center', gap: 8 }}>
                            <span style={{ fontSize: 11, color: '#666', fontFamily: "'Inter', system-ui, sans-serif" }}>Variations:</span>
                            <div style={{ display: 'flex', background: '#1a1a1a', borderRadius: 7, border: '1px solid #2a2a2a', overflow: 'hidden' }}>
                                {([1, 3, 5] as const).map(n => (
                                    <button key={n} onClick={() => setBatchCount(n)} style={{
                                        padding: '4px 12px', border: 'none', background: batchCount === n ? 'rgba(249,115,22,0.15)' : 'transparent',
                                        color: batchCount === n ? '#f97316' : '#666', fontSize: 12,
                                        fontFamily: "'Inter', system-ui, sans-serif", fontWeight: batchCount === n ? 600 : 400,
                                        cursor: 'pointer', transition: 'all 0.12s ease',
                                        borderRight: n !== 5 ? '1px solid #2a2a2a' : 'none',
                                    }}>
                                        {n}
                                    </button>
                                ))}
                            </div>
                        </div>

                        <div style={{
                            padding: '12px 20px 16px',
                            borderTop: '1px solid #1e1e1e',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-end',
                            gap: 8,
                        }}>
                            <button
                                onClick={() => setShowConfirm(false)}
                                style={{
                                    padding: '7px 16px',
                                    borderRadius: 8,
                                    border: '1px solid #2a2a2a',
                                    background: 'transparent',
                                    color: '#aaa',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = '#1a1a1a';
                                    (e.currentTarget as HTMLElement).style.color = '#ddd';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                                    (e.currentTarget as HTMLElement).style.color = '#aaa';
                                }}
                            >
                                Go Back
                            </button>
                            <button
                                onClick={doGenerate}
                                style={{
                                    padding: '7px 18px',
                                    borderRadius: 8,
                                    border: '1px solid rgba(249,115,22,0.4)',
                                    background: 'rgba(249,115,22,0.12)',
                                    color: '#f97316',
                                    fontSize: 13,
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                    fontWeight: 600,
                                    cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                    boxShadow: '0 0 12px rgba(249,115,22,0.1)',
                                }}
                                onMouseEnter={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.2)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 20px rgba(249,115,22,0.2)';
                                }}
                                onMouseLeave={e => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.12)';
                                    (e.currentTarget as HTMLElement).style.boxShadow = '0 0 12px rgba(249,115,22,0.1)';
                                }}
                            >
                                Generate Anyway
                            </button>
                        </div>
                    </div>
                </div>,
                document.body
            )}

            {/* Result Card Modal */}
            {(result || error) && createPortal(
                <div
                    style={{
                        position: 'fixed',
                        inset: 0,
                        zIndex: 9999,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        background: 'rgba(0,0,0,0.6)',
                        backdropFilter: 'blur(4px)',
                        animation: 'fadeInOverlay 0.2s ease-out forwards',
                    }}
                    onClick={() => { setResult(null); setError(null); }}
                >
                    <style>{`
                        @keyframes fadeInOverlay {
                            from { opacity: 0; }
                            to { opacity: 1; }
                        }
                        @keyframes modalScaleFade {
                            from { opacity: 0; transform: scale(0.95); }
                            to { opacity: 1; transform: scale(1); }
                        }
                    `}</style>
                    <div
                        style={{
                            width: 420,
                            borderRadius: 10,
                            border: `1px solid ${error ? '#3b1515' : '#1e3a2a'}`,
                            background: error ? '#120808' : '#0a1511',
                            boxShadow: error
                                ? '0 16px 60px rgba(239,68,68,0.2)'
                                : '0 16px 60px rgba(74,222,128,0.15)',
                            overflow: 'hidden',
                            animation: 'modalScaleFade 200ms ease-out forwards',
                        }}
                        onClick={e => e.stopPropagation()}
                    >
                    {/* Header */}
                    <div style={{
                        padding: '8px 12px 6px',
                        borderBottom: `1px solid ${error ? '#2a1010' : '#143d24'}`,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                            {error ? (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="2">
                                    <circle cx="12" cy="12" r="10" /><line x1="15" y1="9" x2="9" y2="15" /><line x1="9" y1="9" x2="15" y2="15" />
                                </svg>
                            ) : (
                                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2">
                                    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" />
                                </svg>
                            )}
                            <span style={{
                                fontSize: 10,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: error ? '#ef4444' : '#4ade80',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                            }}>
                                {error ? 'Error' : 'Generated Prompt'}
                            </span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
                            {result && (
                                <button
                                    onClick={(e) => { e.stopPropagation(); handleCopy(); }}
                                    onMouseDown={e => e.stopPropagation()}
                                    style={{
                                        background: copied ? 'rgba(74,222,128,0.15)' : 'transparent',
                                        border: `1px solid ${copied ? 'rgba(74,222,128,0.3)' : '#2a2a2a'}`,
                                        borderRadius: 5,
                                        color: copied ? '#4ade80' : '#888',
                                        fontSize: 10,
                                        fontFamily: "'JetBrains Mono', monospace",
                                        padding: '2px 8px',
                                        cursor: 'pointer',
                                        transition: 'all 0.12s ease',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: 4,
                                    }}
                                    onMouseEnter={e => {
                                        if (!copied) (e.currentTarget as HTMLElement).style.color = '#e5e5e5';
                                    }}
                                    onMouseLeave={e => {
                                        if (!copied) (e.currentTarget as HTMLElement).style.color = '#888';
                                    }}
                                >
                                    {copied ? '✓ Copied' : 'Copy'}
                                </button>
                            )}
                            <button
                                onClick={(e) => { e.stopPropagation(); setResult(null); setError(null); }}
                                onMouseDown={e => e.stopPropagation()}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#555',
                                    cursor: 'pointer',
                                    padding: 2,
                                    display: 'flex',
                                    transition: 'color 0.12s ease',
                                }}
                                onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#aaa'}
                                onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                            >
                                <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                </svg>
                            </button>
                        </div>
                    </div>

                    {/* Body */}
                    <div
                        style={{
                            padding: '10px 12px 12px',
                            fontSize: 12,
                            fontFamily: "'Inter', system-ui, sans-serif",
                            lineHeight: 1.6,
                            color: error ? '#ef4444' : '#ccc',
                            maxHeight: 200,
                            overflowY: 'auto',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-word',
                            userSelect: 'text',
                            cursor: 'text',
                        }}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {error || result?.prompt}
                    </div>

                    {/* Model info footer */}
                    {result && (
                        <div style={{
                            padding: '4px 12px 8px',
                            borderTop: '1px solid #143d24',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                        }}>
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#3a6a3a',
                            }}>
                                {result.model.split('/').pop()}
                            </span>
                            <span style={{
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: '#3a6a3a',
                            }}>
                                {new Date(result.timestamp).toLocaleTimeString()}
                            </span>
                        </div>
                    )}
                </div>
            </div>,
            document.body
        )}
    </>
);
}
