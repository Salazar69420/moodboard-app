import { useMemo } from 'react';
import type { BoardImage } from '../../types';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useImageStore } from '../../stores/useImageStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';

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
        if (newId) {
            showToast('Image duplicated');
        }
    };

    // Quick add buttons based on mode
    const quickCats = boardMode === 'i2v'
        ? SHOT_CATEGORIES.filter(c => ['subject', 'action', 'camera'].includes(c.id))
        : EDIT_CATEGORIES.filter(c => ['edit-subject', 'edit-action', 'edit-camera'].includes(c.id));

    return (
        <div
            className="floating-toolbar"
            style={{
                position: 'absolute',
                top: displayH + 10,
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 30,
            }}
            onPointerDown={(e) => e.stopPropagation()}
        >
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
            <ToolbarBtn
                onClick={handleConnect}
                title="Start a connection from this image"
                icon={<span>🔗</span>}
                label="Connect"
            />
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
    );
}

function ToolbarBtn({
    onClick,
    title,
    icon,
    label,
    disabled,
}: {
    onClick: () => void;
    title: string;
    icon: React.ReactNode;
    label: string;
    disabled?: boolean;
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
                background: 'transparent',
                border: 'none',
                color: disabled ? 'rgba(255,255,255,0.2)' : 'rgba(255,255,255,0.65)',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.12s ease',
                whiteSpace: 'nowrap',
            }}
            onMouseEnter={(e) => {
                if (!disabled) {
                    (e.currentTarget as HTMLElement).style.background = 'rgba(249,115,22,0.1)';
                    (e.currentTarget as HTMLElement).style.color = '#f97316';
                }
            }}
            onMouseLeave={(e) => {
                if (!disabled) {
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
