import { useRef, useState, useCallback, useEffect } from 'react';
import type { GodModeNode, GodModeRule } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useUIStore } from '../../stores/useUIStore';

function nanoid6() {
    return Math.random().toString(36).slice(2, 8);
}

function parseRulesFromText(text: string): GodModeRule[] {
    return text.split('\n')
        .map(line => line.trim())
        .filter(line => line.length > 0)
        .map(line => ({ id: nanoid6(), text: line, enabled: true }));
}

function syncTextFromRules(rules: GodModeRule[]): string {
    return rules.filter(r => r.enabled).map(r => r.text.trim()).filter(Boolean).join('\n');
}

const DRAG_THRESHOLD = 4;
const IS_TOUCH = typeof window !== 'undefined' && navigator.maxTouchPoints > 0;

const GOD_COLOR = '#fbbf24'; // amber-400
const GOD_GLOW = 'rgba(251,191,36,';

interface Props {
    node: GodModeNode;
    zoomScale?: number;
}

export function GodModeNodeComponent({ node, zoomScale = 1 }: Props) {
    const updateGodModeNode = useBoardStore((s) => s.updateGodModeNode);
    const removeGodModeNode = useBoardStore((s) => s.removeGodModeNode);
    const connectingFromId = useBoardStore((s) => s.connectingFromId);
    const finishConnection = useBoardStore((s) => s.finishConnection);
    const images = useImageStore((s) => s.images);
    const currentProjectId = useProjectStore((s) => s.currentProjectId);
    const activeTool = useUIStore((s) => s.activeTool);

    // Connected images
    const connectedImages = images.filter(img => node.connectedImageIds.includes(img.id));

    const [isHovered, setIsHovered] = useState(false);
    const [hoverHandle, setHoverHandle] = useState(false);
    const [isMinimized, setIsMinimized] = useState(node.isMinimized);
    const [animatingMinimize, setAnimatingMinimize] = useState(false);
    const [mounted, setMounted] = useState(false);
    const [isEditingTitle, setIsEditingTitle] = useState(false);
    const [localTitle, setLocalTitle] = useState(node.title);
    const titleRef = useRef<HTMLInputElement>(null);

    // Rules list state (migrates from text if no rules stored)
    const [rules, setRules] = useState<GodModeRule[]>(() => {
        if (node.rules && node.rules.length > 0) return node.rules;
        if (node.text.trim()) return parseRulesFromText(node.text);
        return [];
    });

    // Sync rules with store whenever they change
    const saveRules = useCallback((newRules: GodModeRule[]) => {
        setRules(newRules);
        const syncedText = syncTextFromRules(newRules);
        updateGodModeNode(node.id, { rules: newRules, text: syncedText });
    }, [node.id, updateGodModeNode]);

    useEffect(() => {
        const id = requestAnimationFrame(() => setMounted(true));
        return () => cancelAnimationFrame(id);
    }, []);

    // Sync rules if node.rules changes externally (e.g. collaboration)
    useEffect(() => {
        if (node.rules && node.rules.length > 0) {
            setRules(node.rules);
        }
    }, [node.rules]);

    useEffect(() => {
        if (!isEditingTitle) setLocalTitle(node.title);
    }, [node.title, isEditingTitle]);

    useEffect(() => {
        if (isEditingTitle && titleRef.current) {
            titleRef.current.focus();
            titleRef.current.select();
        }
    }, [isEditingTitle]);

    const dragRef = useRef<{
        startX: number; startY: number;
        startNodeX: number; startNodeY: number;
        hasMoved: boolean; pointerId: number;
    } | null>(null);

    const handlePointerDown = useCallback((e: React.PointerEvent) => {
        if ((e.target as HTMLElement).tagName === 'TEXTAREA') return;
        if ((e.target as HTMLElement).tagName === 'INPUT') return;
        if ((e.target as HTMLElement).tagName === 'BUTTON') return;
        if ((e.target as HTMLElement).closest('[data-no-drag]')) return;
        if (e.button !== 0) return;
        e.stopPropagation();
        e.preventDefault();

        dragRef.current = {
            startX: e.clientX, startY: e.clientY,
            startNodeX: node.x, startNodeY: node.y,
            hasMoved: false, pointerId: e.pointerId,
        };

        const handlePointerMove = (mv: PointerEvent) => {
            const drag = dragRef.current;
            if (!drag || mv.pointerId !== drag.pointerId) return;
            const dx = mv.clientX - drag.startX;
            const dy = mv.clientY - drag.startY;
            if (!drag.hasMoved && Math.abs(dx) < DRAG_THRESHOLD && Math.abs(dy) < DRAG_THRESHOLD) return;
            drag.hasMoved = true;
            updateGodModeNode(node.id, {
                x: drag.startNodeX + dx / zoomScale,
                y: drag.startNodeY + dy / zoomScale,
            });
        };

        const handlePointerUp = (up: PointerEvent) => {
            if (!dragRef.current || up.pointerId !== dragRef.current.pointerId) return;
            dragRef.current = null;
            window.removeEventListener('pointermove', handlePointerMove);
            window.removeEventListener('pointerup', handlePointerUp);
        };

        window.addEventListener('pointermove', handlePointerMove);
        window.addEventListener('pointerup', handlePointerUp);
    }, [node.id, node.x, node.y, zoomScale, updateGodModeNode]);

    const handleToggleMinimize = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        setAnimatingMinimize(true);
        const newState = !isMinimized;
        setIsMinimized(newState);
        updateGodModeNode(node.id, { isMinimized: newState });
        setTimeout(() => setAnimatingMinimize(false), 400);
    }, [isMinimized, node.id, updateGodModeNode]);

    const handleToggleEnabled = useCallback((e: React.MouseEvent) => {
        e.stopPropagation();
        updateGodModeNode(node.id, { isEnabled: !node.isEnabled });
    }, [node.id, node.isEnabled, updateGodModeNode]);

    const addRule = useCallback(() => {
        const newRule: GodModeRule = { id: nanoid6(), text: '', enabled: true };
        const newRules = [...rules, newRule];
        saveRules(newRules);
        // Focus the new rule input after render
        setTimeout(() => {
            const inputs = document.querySelectorAll(`[data-god-rule="${node.id}"]`);
            const last = inputs[inputs.length - 1] as HTMLInputElement | null;
            last?.focus();
        }, 50);
    }, [rules, saveRules, node.id]);

    const updateRule = useCallback((ruleId: string, text: string) => {
        saveRules(rules.map(r => r.id === ruleId ? { ...r, text } : r));
    }, [rules, saveRules]);

    const toggleRule = useCallback((ruleId: string) => {
        saveRules(rules.map(r => r.id === ruleId ? { ...r, enabled: !r.enabled } : r));
    }, [rules, saveRules]);

    const deleteRule = useCallback((ruleId: string) => {
        saveRules(rules.filter(r => r.id !== ruleId));
    }, [rules, saveRules]);

    const activeColor = node.isEnabled ? GOD_COLOR : '#666';
    const activeGlow = node.isEnabled ? GOD_GLOW : 'rgba(100,100,100,';

    return (
        <div
            className="absolute select-none"
            style={{
                left: node.x,
                top: node.y,
                width: isMinimized ? 'auto' : node.width,
                zIndex: isHovered ? 50 : isMinimized ? 10 : 30,
                opacity: mounted ? 1 : 0,
                transform: mounted ? 'scale(1) translateZ(0)' : 'scale(0.88) translateZ(0)',
                transition: 'opacity 350ms cubic-bezier(0.22, 1, 0.36, 1), transform 400ms cubic-bezier(0.22, 1, 0.36, 1)',
                touchAction: 'none',
            }}
            onPointerDown={handlePointerDown}
            onPointerEnter={() => setIsHovered(true)}
            onPointerLeave={() => { setIsHovered(false); setHoverHandle(false); }}
            onWheel={(e) => e.stopPropagation()}
        >
            {/* Left connection handle */}
            {(activeTool === 'connect' || connectingFromId) && (
                <div
                    style={{
                        position: 'absolute',
                        left: -8, top: '50%',
                        transform: 'translateY(-50%)',
                        width: 16, height: 16,
                        borderRadius: '50%',
                        background: hoverHandle ? GOD_COLOR : `${GOD_GLOW}0.3)`,
                        border: `2px solid ${hoverHandle ? GOD_COLOR : `${GOD_GLOW}0.6)`}`,
                        cursor: 'pointer',
                        zIndex: 70,
                        boxShadow: hoverHandle ? `0 0 12px ${GOD_COLOR}` : `0 0 6px ${GOD_GLOW}0.4)`,
                        transition: 'all 0.15s ease',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                    onPointerEnter={() => setHoverHandle(true)}
                    onPointerLeave={() => setHoverHandle(false)}
                    onPointerDown={(e) => {
                        e.stopPropagation();
                        e.preventDefault();
                        if (connectingFromId && currentProjectId) {
                            finishConnection(currentProjectId, node.id);
                        }
                    }}
                >
                    <div style={{
                        width: 6, height: 6, borderRadius: '50%',
                        background: hoverHandle ? '#fff' : GOD_COLOR,
                        transition: 'all 0.15s ease',
                    }} />
                </div>
            )}
            {/* Ambient glow behind card */}
            {node.isEnabled && (
                <div style={{
                    position: 'absolute',
                    inset: -8,
                    borderRadius: 22,
                    background: `radial-gradient(ellipse at 50% 0%, ${GOD_GLOW}0.12) 0%, transparent 70%)`,
                    pointerEvents: 'none',
                    transition: 'opacity 0.3s ease',
                    opacity: isHovered ? 1 : 0.6,
                }} />
            )}

            <div
                style={{
                    position: 'relative',
                    borderRadius: isMinimized ? 10 : 16,
                    border: `1px solid ${node.isEnabled
                        ? isHovered ? `${activeGlow}0.5)` : `${activeGlow}0.28)`
                        : 'rgba(255,255,255,0.1)'}`,
                    background: 'rgba(7, 8, 14, 0.93)',
                    backdropFilter: 'blur(28px) saturate(200%)',
                    WebkitBackdropFilter: 'blur(28px) saturate(200%)',
                    boxShadow: node.isEnabled
                        ? isHovered
                            ? `0 0 0 1px ${activeGlow}0.2), 0 0 40px ${activeGlow}0.18), 0 12px 50px rgba(0,0,0,0.75), inset 0 1px 0 rgba(255,255,255,0.09)`
                            : `0 0 0 1px ${activeGlow}0.12), 0 0 24px ${activeGlow}0.12), 0 8px 40px rgba(0,0,0,0.7), inset 0 1px 0 rgba(255,255,255,0.06)`
                        : `0 4px 24px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.04)`,
                    overflow: 'hidden',
                    transition: 'border-color 0.25s ease, box-shadow 0.25s ease, border-radius 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                }}
            >
                {/* Top accent line */}
                {node.isEnabled && (
                    <div style={{
                        position: 'absolute',
                        top: 0, left: 0, right: 0,
                        height: 1,
                        background: `linear-gradient(90deg, transparent 0%, ${activeColor} 50%, transparent 100%)`,
                        opacity: 0.6,
                        transition: 'opacity 0.3s ease',
                        pointerEvents: 'none',
                    }} />
                )}

                {/* ── Header ── */}
                <div
                    style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: isMinimized ? '7px 11px' : '9px 11px 8px',
                        background: node.isEnabled
                            ? `linear-gradient(135deg, ${activeGlow}0.12) 0%, ${activeGlow}0.05) 100%)`
                            : 'rgba(255,255,255,0.02)',
                        borderBottom: isMinimized ? 'none' : `1px solid ${node.isEnabled ? `${activeGlow}0.15)` : 'rgba(255,255,255,0.05)'}`,
                        cursor: 'move',
                        gap: 7,
                        transition: 'background 0.25s ease, padding 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                        touchAction: 'none',
                    }}
                    onPointerDown={handlePointerDown}
                >
                    {/* Crown icon + title */}
                    <div style={{ display: 'flex', alignItems: 'center', gap: 7, minWidth: 0, flex: 1 }}>
                        {/* God Mode icon */}
                        <div style={{
                            width: 18, height: 18, flexShrink: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                        }}>
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none">
                                <path d="M2 17 L5 9 L9 13 L12 6 L15 13 L19 9 L22 17 Z"
                                    fill={node.isEnabled ? activeColor : '#444'}
                                    opacity={node.isEnabled ? 1 : 0.5}
                                    style={{ filter: node.isEnabled ? `drop-shadow(0 0 4px ${activeColor}80)` : 'none', transition: 'all 0.25s ease' }}
                                />
                                <rect x="2" y="18" width="20" height="2" rx="1" fill={node.isEnabled ? activeColor : '#444'} opacity={node.isEnabled ? 0.8 : 0.4} />
                            </svg>
                        </div>

                        {/* Editable title */}
                        {isEditingTitle ? (
                            <input
                                ref={titleRef}
                                value={localTitle}
                                onChange={e => setLocalTitle(e.target.value)}
                                onBlur={() => {
                                    setIsEditingTitle(false);
                                    const t = localTitle.trim() || 'God Mode';
                                    setLocalTitle(t);
                                    updateGodModeNode(node.id, { title: t });
                                }}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' || e.key === 'Escape') {
                                        e.preventDefault();
                                        (e.target as HTMLInputElement).blur();
                                    }
                                }}
                                onPointerDown={e => e.stopPropagation()}
                                onClick={e => e.stopPropagation()}
                                style={{
                                    flex: 1, minWidth: 0,
                                    background: 'rgba(255,255,255,0.06)',
                                    border: `1px solid ${activeColor}50`,
                                    borderRadius: 5,
                                    padding: '1px 6px',
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    color: activeColor,
                                    outline: 'none',
                                    letterSpacing: '0.06em',
                                    textTransform: 'uppercase',
                                }}
                            />
                        ) : (
                            <span
                                onDoubleClick={(e) => { e.stopPropagation(); setIsEditingTitle(true); }}
                                style={{
                                    fontSize: 10,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    fontWeight: 700,
                                    color: node.isEnabled ? activeColor : '#555',
                                    letterSpacing: '0.08em',
                                    textTransform: 'uppercase',
                                    whiteSpace: 'nowrap',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    cursor: 'move',
                                    transition: 'color 0.25s ease',
                                    minWidth: 0,
                                    flex: 1,
                                    textShadow: node.isEnabled ? `0 0 12px ${activeColor}60` : 'none',
                                }}
                                title="Double-click to rename"
                            >
                                {node.title}
                            </span>
                        )}
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: 5, flexShrink: 0 }}>
                        {/* Enable/Disable toggle */}
                        <button
                            data-no-drag="true"
                            onClick={handleToggleEnabled}
                            title={node.isEnabled ? 'Disable God Mode' : 'Enable God Mode'}
                            style={{
                                position: 'relative',
                                width: 30, height: 16,
                                borderRadius: 8,
                                background: node.isEnabled ? `${activeGlow}0.3)` : 'rgba(255,255,255,0.06)',
                                border: `1px solid ${node.isEnabled ? `${activeGlow}0.5)` : 'rgba(255,255,255,0.1)'}`,
                                cursor: 'pointer',
                                transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                                flexShrink: 0,
                                touchAction: 'manipulation',
                                boxShadow: node.isEnabled ? `0 0 8px ${activeGlow}0.4)` : 'none',
                            }}
                        >
                            <div style={{
                                position: 'absolute',
                                top: 2,
                                left: node.isEnabled ? 15 : 2,
                                width: 10, height: 10,
                                borderRadius: '50%',
                                background: node.isEnabled ? activeColor : '#555',
                                transition: 'all 0.25s cubic-bezier(0.22, 1, 0.36, 1)',
                                boxShadow: node.isEnabled ? `0 0 6px ${activeColor}` : 'none',
                            }} />
                        </button>

                        {/* Minimize toggle */}
                        <button
                            style={{
                                opacity: IS_TOUCH || isHovered || isMinimized ? 1 : 0,
                                background: 'transparent', border: 'none',
                                color: node.isEnabled ? activeColor : '#555',
                                cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex', alignItems: 'center',
                                transition: 'opacity 0.15s ease, transform 0.4s cubic-bezier(0.22, 1, 0.36, 1)',
                                transform: isMinimized ? 'rotate(180deg)' : 'rotate(0deg)',
                                touchAction: 'manipulation',
                            }}
                            onClick={handleToggleMinimize}
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <polyline points="6 9 12 15 18 9" />
                            </svg>
                        </button>

                        {/* Delete */}
                        <button
                            style={{
                                opacity: IS_TOUCH || isHovered ? 1 : 0,
                                background: 'transparent', border: 'none',
                                color: '#555', cursor: 'pointer',
                                padding: IS_TOUCH ? '6px' : '3px',
                                display: 'flex', alignItems: 'center',
                                transition: 'opacity 0.15s ease, color 0.15s ease',
                                touchAction: 'manipulation',
                            }}
                            onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                            onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#555'}
                            onClick={(e) => { e.stopPropagation(); removeGodModeNode(node.id); }}
                            title="Remove god mode node"
                        >
                            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                </div>

                {/* ── Collapsible body ── */}
                <div
                    style={{
                        maxHeight: isMinimized ? 0 : 500,
                        opacity: isMinimized ? 0 : 1,
                        overflow: 'hidden',
                        transition: animatingMinimize
                            ? 'max-height 400ms cubic-bezier(0.22, 1, 0.36, 1), opacity 280ms ease'
                            : 'none',
                    }}
                >
                    {/* Status bar */}
                    <div style={{
                        padding: '5px 12px 4px',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                            <div style={{
                                width: 5, height: 5, borderRadius: '50%',
                                background: node.isEnabled ? activeColor : '#444',
                                boxShadow: node.isEnabled ? `0 0 6px ${activeColor}` : 'none',
                                transition: 'all 0.25s ease',
                                flexShrink: 0,
                            }} />
                            <span style={{
                                fontSize: 8,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: node.isEnabled ? `${activeGlow}0.55)` : 'rgba(255,255,255,0.18)',
                                letterSpacing: '0.06em',
                                textTransform: 'uppercase',
                                transition: 'color 0.25s ease',
                            }}>
                                {node.isEnabled ? 'Active' : 'Disabled'}
                            </span>
                            <span style={{
                                fontSize: 8,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: 'rgba(255,255,255,0.2)',
                            }}>
                                · {rules.filter(r => r.enabled).length}/{rules.length} rules active
                            </span>
                        </div>
                    </div>

                    {/* Rules list */}
                    <div
                        data-no-drag="true"
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                        style={{
                            padding: '4px 10px 6px',
                            display: 'flex',
                            flexDirection: 'column',
                            gap: 3,
                            maxHeight: 240,
                            overflowY: 'auto',
                        }}
                    >
                        {rules.length === 0 && (
                            <div style={{
                                padding: '12px 0',
                                textAlign: 'center',
                                fontSize: 10,
                                fontFamily: "'Inter', system-ui, sans-serif",
                                color: 'rgba(255,255,255,0.2)',
                            }}>
                                No rules yet — click + to add one
                            </div>
                        )}
                        {rules.map((rule, idx) => (
                            <div
                                key={rule.id}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: 6,
                                    padding: '3px 4px',
                                    borderRadius: 6,
                                    background: rule.enabled ? `${activeGlow}0.05)` : 'rgba(255,255,255,0.02)',
                                    border: `1px solid ${rule.enabled ? `${activeGlow}0.12)` : 'rgba(255,255,255,0.04)'}`,
                                    transition: 'background 0.15s ease, border-color 0.15s ease',
                                }}
                            >
                                {/* Rule number */}
                                <span style={{
                                    fontSize: 8,
                                    fontFamily: "'JetBrains Mono', monospace",
                                    color: rule.enabled ? `${activeGlow}0.4)` : '#333',
                                    minWidth: 14,
                                    textAlign: 'right',
                                    flexShrink: 0,
                                    transition: 'color 0.15s ease',
                                }}>
                                    {String(idx + 1).padStart(2, '0')}
                                </span>

                                {/* Rule text input */}
                                <input
                                    data-god-rule={node.id}
                                    type="text"
                                    value={rule.text}
                                    onChange={e => updateRule(rule.id, e.target.value)}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter') {
                                            e.preventDefault();
                                            addRule();
                                        }
                                        if (e.key === 'Backspace' && rule.text === '') {
                                            e.preventDefault();
                                            deleteRule(rule.id);
                                            // Focus previous input
                                            setTimeout(() => {
                                                const inputs = document.querySelectorAll(`[data-god-rule="${node.id}"]`);
                                                const prev = inputs[Math.max(0, idx - 1)] as HTMLInputElement | null;
                                                prev?.focus();
                                            }, 50);
                                        }
                                    }}
                                    placeholder={`Rule ${idx + 1}…`}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        fontSize: 11,
                                        fontFamily: "'Inter', system-ui, sans-serif",
                                        color: rule.enabled ? 'rgba(255,255,255,0.75)' : 'rgba(255,255,255,0.3)',
                                        caretColor: activeColor,
                                        letterSpacing: '0.01em',
                                        textDecoration: !rule.enabled ? 'line-through' : 'none',
                                        transition: 'color 0.15s ease',
                                        minWidth: 0,
                                    }}
                                />

                                {/* Individual rule toggle */}
                                <button
                                    onClick={() => toggleRule(rule.id)}
                                    title={rule.enabled ? 'Disable rule' : 'Enable rule'}
                                    style={{
                                        width: 22,
                                        height: 13,
                                        borderRadius: 6.5,
                                        background: rule.enabled ? `${activeGlow}0.3)` : 'rgba(255,255,255,0.06)',
                                        border: `1px solid ${rule.enabled ? `${activeGlow}0.4)` : 'rgba(255,255,255,0.1)'}`,
                                        cursor: 'pointer',
                                        position: 'relative',
                                        flexShrink: 0,
                                        transition: 'all 0.2s ease',
                                    }}
                                >
                                    <div style={{
                                        position: 'absolute',
                                        top: 1.5,
                                        left: rule.enabled ? 10 : 1.5,
                                        width: 8,
                                        height: 8,
                                        borderRadius: '50%',
                                        background: rule.enabled ? activeColor : '#555',
                                        transition: 'all 0.2s cubic-bezier(0.22, 1, 0.36, 1)',
                                    }} />
                                </button>

                                {/* Delete rule */}
                                <button
                                    onClick={() => deleteRule(rule.id)}
                                    title="Delete rule"
                                    style={{
                                        background: 'transparent',
                                        border: 'none',
                                        color: '#444',
                                        cursor: 'pointer',
                                        padding: 1,
                                        display: 'flex',
                                        alignItems: 'center',
                                        flexShrink: 0,
                                        transition: 'color 0.12s ease',
                                    }}
                                    onMouseEnter={e => (e.currentTarget as HTMLElement).style.color = '#ef4444'}
                                    onMouseLeave={e => (e.currentTarget as HTMLElement).style.color = '#444'}
                                >
                                    <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                        <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                                    </svg>
                                </button>
                            </div>
                        ))}
                    </div>

                    {/* Add rule + connected refs footer */}
                    <div style={{
                        padding: '5px 10px 8px',
                        borderTop: '1px solid rgba(255,255,255,0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        gap: 8,
                    }}
                        onPointerDown={e => e.stopPropagation()}
                        onMouseDown={e => e.stopPropagation()}
                    >
                        {/* Add rule button */}
                        <button
                            onClick={addRule}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: 4,
                                background: `${activeGlow}0.08)`,
                                border: `1px solid ${activeGlow}0.2)`,
                                borderRadius: 5,
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontSize: 9,
                                fontFamily: "'JetBrains Mono', monospace",
                                color: node.isEnabled ? activeColor : '#666',
                                letterSpacing: '0.04em',
                                transition: 'all 0.12s ease',
                            }}
                            onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = `${activeGlow}0.14)`; }}
                            onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = `${activeGlow}0.08)`; }}
                        >
                            <svg width="8" height="8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
                            </svg>
                            Add Rule
                        </button>

                        {/* Connected refs chips */}
                        {connectedImages.length > 0 && (
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 3, alignItems: 'center' }}>
                                <span style={{ fontSize: 8, fontFamily: "'JetBrains Mono', monospace", color: '#333', flexShrink: 0 }}>refs</span>
                                {connectedImages.map(img => {
                                    const name = img.label || img.filename.replace(/\.[^.]+$/, '');
                                    const slug = name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '');
                                    const hasLabel = !!img.label;
                                    return (
                                        <span key={img.id} style={{
                                            fontSize: 8, fontFamily: "'JetBrains Mono', monospace",
                                            color: hasLabel ? `${activeGlow}0.7)` : '#444',
                                            background: hasLabel ? `${activeGlow}0.06)` : 'transparent',
                                            border: `1px solid ${hasLabel ? `${activeGlow}0.2)` : 'rgba(255,255,255,0.05)'}`,
                                            borderRadius: 3, padding: '0 4px',
                                        }}>@{slug}</span>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                </div>

                {/* Resize handle */}
                {!isMinimized && (
                    <div
                        style={{
                            position: 'absolute', bottom: 0, right: 0,
                            width: IS_TOUCH ? 24 : 18, height: IS_TOUCH ? 24 : 18,
                            cursor: 'se-resize',
                            display: 'flex', alignItems: 'flex-end', justifyContent: 'flex-end',
                            padding: '4px',
                            opacity: IS_TOUCH ? 0.4 : (isHovered ? 0.7 : 0),
                            transition: 'opacity 0.2s ease',
                            touchAction: 'none',
                        }}
                        onPointerDown={(e) => {
                            e.stopPropagation();
                            e.preventDefault();
                            const startX = e.clientX;
                            const startW = node.width;
                            const pointerId = e.pointerId;
                            const onMove = (mv: PointerEvent) => {
                                if (mv.pointerId !== pointerId) return;
                                const dx = mv.clientX - startX;
                                updateGodModeNode(node.id, { width: Math.max(220, startW + dx / zoomScale) });
                            };
                            const onUp = (up: PointerEvent) => {
                                if (up.pointerId !== pointerId) return;
                                window.removeEventListener('pointermove', onMove);
                                window.removeEventListener('pointerup', onUp);
                            };
                            window.addEventListener('pointermove', onMove);
                            window.addEventListener('pointerup', onUp);
                        }}
                    >
                        <svg width="9" height="9" viewBox="0 0 10 10" fill="none">
                            <path d="M2 8 L8 2M5 8 L8 5M8 8 L8 8" stroke={activeColor} strokeWidth="1.5" strokeLinecap="round" opacity="0.5" />
                        </svg>
                    </div>
                )}
            </div>
        </div>
    );
}
