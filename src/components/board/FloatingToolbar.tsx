import { useMemo, useState, useCallback } from 'react';
import type { BoardImage } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import { generatePrompt } from '../../utils/prompt-generator';
import { generateEditPrompt } from '../../utils/edit-prompt-generator';

interface FloatingToolbarProps {
    image: BoardImage;
    displayW: number;
    displayH: number;
}

export function FloatingToolbar({ image, displayW, displayH }: FloatingToolbarProps) {
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const addCategoryNote = useBoardStore((s) => s.addCategoryNote);
    const addEditNote = useBoardStore((s) => s.addEditNote);
    const startConnection = useBoardStore((s) => s.startConnection);
    const boardMode = useBoardStore((s) => s.boardMode);
    const categoryNotes = useBoardStore((s) => s.categoryNotes);
    const editNotes = useBoardStore((s) => s.editNotes);
    const setActiveTool = useUIStore((s) => s.setActiveTool);
    const showToast = useUIStore((s) => s.showToast);
    const duplicateImage = useImageStore((s) => s.duplicateImage);

    const [showPicker, setShowPicker] = useState(false);
    const [showRatePopover, setShowRatePopover] = useState(false);
    const [showVariationsPopover, setShowVariationsPopover] = useState(false);
    const [critiqueInput, setCritiqueInput] = useState('');
    const [isBatchRunning, setIsBatchRunning] = useState(false);

    const apiKey = useSettingsStore((s) => s.apiKey);
    const model = useSettingsStore((s) => s.model);
    const connections = useBoardStore((s) => s.connections);
    const allImages = useImageStore((s) => s.images);
    const godModeNodes = useBoardStore((s) => s.godModeNodes);
    const promptNodes = useBoardStore((s) => s.promptNodes);
    const addPromptNode = useBoardStore((s) => s.addPromptNode);
    const updateImageEvaluation = useBoardStore((s) => s.updateImageEvaluation);
    const setBatchProgress = useUIStore((s) => s.setBatchProgress);

    const existingCats = useMemo(
        () => new Set(categoryNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)),
        [categoryNotes, image.id]
    );
    const existingEditCats = useMemo(
        () => new Set(editNotes.filter(n => n.imageId === image.id).map(n => n.categoryId)),
        [editNotes, image.id]
    );

    const handleAddNote = async (catId: string) => {
        if (!currentProjectId) return;
        const noteCount = categoryNotes.filter(n => n.imageId === image.id).length +
            editNotes.filter(n => n.imageId === image.id).length;
        const offsetY = noteCount * 180;

        if (boardMode === 'i2v') {
            const cat = SHOT_CATEGORIES.find(c => c.id === catId);
            if (cat && !existingCats.has(cat.id)) {
                await addCategoryNote(currentProjectId, image.id, cat.id, image.x + displayW + 60, image.y + offsetY);
                showToast(`${cat.label} note added`);
            }
        } else {
            const cat = EDIT_CATEGORIES.find(c => c.id === catId);
            if (cat && !existingEditCats.has(cat.id)) {
                await addEditNote(currentProjectId, image.id, cat.id, image.x + displayW + 60, image.y + offsetY);
                showToast(`${cat.label} note added`);
            }
        }
    };

    const handleConnect = () => {
        startConnection(image.id);
        setActiveTool('connect');
    };

    const handleDuplicate = async () => {
        const newId = await duplicateImage(image.id);
        if (newId) showToast('Image duplicated');
    };

    const handleRate = useCallback(async (evaluation: 'accepted' | 'rejected') => {
        if (!currentProjectId) return;
        const critique = evaluation === 'rejected' && critiqueInput.trim() ? critiqueInput.trim() : undefined;
        await updateImageEvaluation(image.id, evaluation, critique);
        setCritiqueInput('');
        setShowRatePopover(false);
        showToast(evaluation === 'accepted' ? 'Marked as accepted' : 'Marked as rejected');
    }, [currentProjectId, image.id, critiqueInput, updateImageEvaluation, showToast]);

    const handleBatchGenerate = useCallback(async (count: 3 | 5) => {
        if (!apiKey || !currentProjectId || isBatchRunning) return;
        setShowVariationsPopover(false);
        setIsBatchRunning(true);
        setBatchProgress({ current: 0, total: count });

        try {
            const connectedImageIds = connections
                .filter(c => c.fromId === image.id || c.toId === image.id)
                .map(c => c.fromId === image.id ? c.toId : c.fromId);
            const connectedImages = allImages.filter(img => connectedImageIds.includes(img.id));
            const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());

            const existingNodes = promptNodes.filter(n => n.imageId === image.id && n.promptType === boardMode);
            const baseX = image.x + displayW + 60;
            const baseY = image.y + (existingNodes.length * 180);

            const tasks = Array.from({ length: count }, async (_, i) => {
                let text: string;
                let mdl: string;
                if (boardMode === 'i2v') {
                    const notes = categoryNotes.filter(n => n.imageId === image.id);
                    const result = await generatePrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages, activeGodNodes);
                    text = result.prompt;
                    mdl = result.model;
                } else {
                    const notes = editNotes.filter(n => n.imageId === image.id);
                    const result = await generateEditPrompt(apiKey, model, image.blobId, image.mimeType, notes, connectedImages, activeGodNodes);
                    text = result.prompt;
                    mdl = result.model;
                }
                await addPromptNode(currentProjectId, image.id, text, mdl, boardMode, baseX, baseY + i * 180);
                setBatchProgress({ current: i + 1, total: count });
            });

            await Promise.all(tasks);
            showToast(`${count} variations generated`);
        } catch (err) {
            console.error('Batch generation failed:', err);
            showToast('Batch generation failed');
        } finally {
            setIsBatchRunning(false);
            setBatchProgress(null);
        }
    }, [apiKey, currentProjectId, isBatchRunning, image, boardMode, displayW, connections, allImages, godModeNodes, categoryNotes, editNotes, promptNodes, addPromptNode, model, setBatchProgress, showToast]);

    const quickCats = boardMode === 'i2v'
        ? SHOT_CATEGORIES.filter(c => ['subject', 'action', 'camera'].includes(c.id))
        : EDIT_CATEGORIES.filter(c => ['edit-subject', 'edit-action', 'edit-camera'].includes(c.id));

    const allCats = boardMode === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;

    return (
        <div
            style={{
                position: 'absolute',
                top: displayH + 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 6,
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
            {/* Main toolbar row */}
            <div className="floating-toolbar">
                {quickCats.map(cat => {
                    const has = boardMode === 'i2v' ? existingCats.has(cat.id as any) : existingEditCats.has(cat.id as any);
                    return (
                        <ToolbarBtn
                            key={cat.id}
                            onClick={() => handleAddNote(cat.id)}
                            disabled={has}
                            title={has ? `${cat.label} already added` : `Add ${cat.label} note`}
                            icon={<span style={{ fontSize: 12 }}>{cat.icon}</span>}
                            label={cat.label}
                        />
                    );
                })}

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 2px' }} />

                {/* More categories button */}
                <ToolbarBtn
                    onClick={() => setShowPicker(v => !v)}
                    title={showPicker ? 'Close category picker' : 'Add any note category'}
                    icon={
                        <span style={{
                            fontSize: 13,
                            fontWeight: 600,
                            lineHeight: 1,
                            display: 'inline-block',
                            transform: showPicker ? 'rotate(45deg)' : 'none',
                            transition: 'transform 0.18s ease',
                        }}>+</span>
                    }
                    label="More"
                    active={showPicker}
                />

                <div style={{ width: 1, height: 16, background: 'rgba(255,255,255,0.08)', flexShrink: 0, margin: '0 2px' }} />

                <ToolbarBtn
                    onClick={handleConnect}
                    title="Start a connection from this image"
                    icon={<span>🔗</span>}
                    label="Connect"
                />

                {/* Variations button */}
                <div style={{ position: 'relative' }}>
                    <ToolbarBtn
                        onClick={() => { setShowVariationsPopover(v => !v); setShowRatePopover(false); }}
                        title="Generate multiple prompt variations"
                        icon={<span style={{ fontSize: 12 }}>⚡</span>}
                        label="Variations"
                        active={showVariationsPopover || isBatchRunning}
                        disabled={!apiKey || isBatchRunning}
                    />
                    {showVariationsPopover && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                            marginBottom: 6, background: 'rgba(15,15,18,0.96)', backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 10,
                            padding: '8px 6px', display: 'flex', flexDirection: 'column', gap: 4,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 50, whiteSpace: 'nowrap',
                            animation: 'fadeSlideDown 0.12s ease',
                        }}>
                            <div style={{ fontSize: 9, color: 'rgba(255,255,255,0.3)', textAlign: 'center', fontFamily: "'Inter', system-ui, sans-serif", letterSpacing: '0.07em', textTransform: 'uppercase', marginBottom: 2 }}>
                                Variations
                            </div>
                            {([3, 5] as const).map(n => (
                                <button key={n} onClick={() => handleBatchGenerate(n)} style={{
                                    padding: '5px 14px', borderRadius: 6, border: '1px solid rgba(249,115,22,0.25)',
                                    background: 'rgba(249,115,22,0.07)', color: '#fb923c', fontSize: 11,
                                    fontFamily: "'Inter', system-ui, sans-serif", cursor: 'pointer',
                                    transition: 'all 0.12s ease',
                                }} onMouseEnter={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.18)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.4)';
                                }} onMouseLeave={(e) => {
                                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.07)';
                                    (e.currentTarget as HTMLElement).style.borderColor = 'rgba(249,115,22,0.25)';
                                }}>
                                    {n} variations
                                </button>
                            ))}
                        </div>
                    )}
                </div>

                {/* Rate button */}
                <div style={{ position: 'relative' }}>
                    <ToolbarBtn
                        onClick={() => { setShowRatePopover(v => !v); setShowVariationsPopover(false); }}
                        title="Accept or reject this image"
                        icon={
                            image.evaluation === 'accepted' ? <span style={{ fontSize: 11, color: '#4ade80' }}>👍</span>
                            : image.evaluation === 'rejected' ? <span style={{ fontSize: 11, color: '#f87171' }}>👎</span>
                            : <span style={{ fontSize: 11 }}>👍</span>
                        }
                        label="Rate"
                        active={showRatePopover}
                    />
                    {showRatePopover && (
                        <div style={{
                            position: 'absolute', bottom: '100%', left: '50%', transform: 'translateX(-50%)',
                            marginBottom: 6, background: 'rgba(15,15,18,0.96)', backdropFilter: 'blur(24px)',
                            border: '1px solid rgba(255,255,255,0.1)', borderRadius: 12,
                            padding: '10px 10px 8px', display: 'flex', flexDirection: 'column', gap: 6,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.6)', zIndex: 50, minWidth: 170,
                            animation: 'fadeSlideDown 0.12s ease',
                        }}>
                            <div style={{ display: 'flex', gap: 6 }}>
                                <button onClick={() => handleRate('accepted')} style={{
                                    flex: 1, padding: '6px 0', borderRadius: 7,
                                    border: '1px solid rgba(74,222,128,0.3)', background: image.evaluation === 'accepted' ? 'rgba(74,222,128,0.15)' : 'rgba(74,222,128,0.05)',
                                    color: '#4ade80', fontSize: 13, cursor: 'pointer', transition: 'all 0.12s ease',
                                }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(74,222,128,0.18)'; }}
                                   onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = image.evaluation === 'accepted' ? 'rgba(74,222,128,0.15)' : 'rgba(74,222,128,0.05)'; }}>
                                    👍
                                </button>
                                <button onClick={() => handleRate('rejected')} style={{
                                    flex: 1, padding: '6px 0', borderRadius: 7,
                                    border: '1px solid rgba(248,113,113,0.3)', background: image.evaluation === 'rejected' ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.05)',
                                    color: '#f87171', fontSize: 13, cursor: 'pointer', transition: 'all 0.12s ease',
                                }} onMouseEnter={(e) => { (e.currentTarget as HTMLElement).style.background = 'rgba(248,113,113,0.18)'; }}
                                   onMouseLeave={(e) => { (e.currentTarget as HTMLElement).style.background = image.evaluation === 'rejected' ? 'rgba(248,113,113,0.15)' : 'rgba(248,113,113,0.05)'; }}>
                                    👎
                                </button>
                            </div>
                            <input
                                value={critiqueInput}
                                onChange={(e) => setCritiqueInput(e.target.value)}
                                onKeyDown={(e) => { e.stopPropagation(); if (e.key === 'Enter') handleRate('rejected'); }}
                                placeholder="Note (optional)…"
                                style={{
                                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: 6, padding: '5px 8px', fontSize: 10, color: 'rgba(255,255,255,0.6)',
                                    fontFamily: "'Inter', system-ui, sans-serif", outline: 'none',
                                }}
                            />
                        </div>
                    )}
                </div>

                <ToolbarBtn
                    onClick={handleDuplicate}
                    title="Duplicate image + notes (Cmd+D)"
                    icon={
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <rect x="9" y="9" width="13" height="13" rx="2" />
                            <path d="M5 15H4a2 2 0 01-2-2V4a2 2 0 012-2h9a2 2 0 012 2v1" />
                        </svg>
                    }
                    label="Duplicate"
                />
            </div>

            {/* Expandable category picker panel */}
            {showPicker && (
                <div
                    style={{
                        background: 'rgba(15,15,18,0.92)',
                        backdropFilter: 'blur(24px) saturate(160%)',
                        WebkitBackdropFilter: 'blur(24px) saturate(160%)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: 14,
                        padding: '10px 10px 8px',
                        display: 'grid',
                        gridTemplateColumns: boardMode === 'i2v' ? 'repeat(4, 1fr)' : 'repeat(3, 1fr)',
                        gap: 5,
                        width: boardMode === 'i2v' ? 300 : 230,
                        boxShadow: '0 8px 32px rgba(0,0,0,0.5)',
                        animation: 'fadeSlideDown 0.15s ease',
                    }}
                >
                    <div style={{
                        gridColumn: '1 / -1',
                        fontSize: 10,
                        fontFamily: "'Inter', system-ui, sans-serif",
                        fontWeight: 600,
                        letterSpacing: '0.08em',
                        textTransform: 'uppercase',
                        color: 'rgba(255,255,255,0.3)',
                        marginBottom: 4,
                        paddingLeft: 2,
                    }}>
                        {boardMode === 'i2v' ? 'I2V Shot Notes' : 'Edit Notes'}
                    </div>
                    {allCats.map(cat => {
                        const has = boardMode === 'i2v'
                            ? existingCats.has(cat.id as any)
                            : existingEditCats.has(cat.id as any);
                        return (
                            <button
                                key={cat.id}
                                onClick={() => { if (!has) handleAddNote(cat.id); }}
                                disabled={has}
                                title={has ? `${cat.label} already on canvas` : `Add ${cat.label} note`}
                                style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    alignItems: 'center',
                                    gap: 3,
                                    padding: '7px 4px 6px',
                                    borderRadius: 9,
                                    border: has
                                        ? `1px solid ${cat.color}40`
                                        : '1px solid transparent',
                                    background: has ? `${cat.color}12` : 'rgba(255,255,255,0.03)',
                                    cursor: has ? 'default' : 'pointer',
                                    transition: 'all 0.12s ease',
                                    position: 'relative',
                                    fontFamily: "'Inter', system-ui, sans-serif",
                                }}
                                onMouseEnter={(e) => {
                                    if (!has) {
                                        (e.currentTarget as HTMLElement).style.background = `${cat.color}18`;
                                        (e.currentTarget as HTMLElement).style.border = `1px solid ${cat.color}50`;
                                    }
                                }}
                                onMouseLeave={(e) => {
                                    if (!has) {
                                        (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.03)';
                                        (e.currentTarget as HTMLElement).style.border = '1px solid transparent';
                                    }
                                }}
                            >
                                <span style={{ fontSize: 16, lineHeight: 1 }}>{cat.icon}</span>
                                <span style={{
                                    fontSize: 9.5,
                                    fontWeight: 500,
                                    color: has ? `${cat.color}80` : 'rgba(255,255,255,0.6)',
                                    textAlign: 'center',
                                    lineHeight: 1.2,
                                    maxWidth: 52,
                                }}>
                                    {cat.label}
                                </span>
                                {has && (
                                    <span style={{
                                        position: 'absolute',
                                        top: 3,
                                        right: 4,
                                        fontSize: 8,
                                        color: cat.color,
                                        fontWeight: 700,
                                    }}>✓</span>
                                )}
                            </button>
                        );
                    })}
                </div>
            )}
        </div>
    );
}

function ToolbarBtn({
    onClick,
    title,
    icon,
    label,
    disabled,
    active,
}: {
    onClick: () => void;
    title: string;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
    active?: boolean;
}) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                display: 'flex',
                alignItems: 'center',
                gap: 5,
                padding: '5px 10px',
                borderRadius: 7,
                fontSize: 11,
                fontFamily: "'Inter', system-ui, sans-serif",
                fontWeight: 500,
                background: active ? 'rgba(249,115,22,0.12)' : 'transparent',
                border: 'none',
                color: disabled ? 'rgba(255,255,255,0.2)' : active ? '#f97316' : 'rgba(255,255,255,0.65)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
                if (!disabled && !active) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)';
                    (e.currentTarget as HTMLElement).style.color = '#f97316';
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled && !active) {
                    (e.currentTarget as HTMLElement).style.background = 'transparent';
                    (e.currentTarget as HTMLElement).style.color = 'rgba(255,255,255,0.65)';
                }
            }}
        >
            {icon}
            <span>{label}</span>
        </button>
    );
}
