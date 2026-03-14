import { useEffect, useMemo, useRef } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import type { ShotCategoryId, EditCategoryId } from '../../types';
import { reverseEngineerI2V, reverseEngineerEdit } from '../../utils/reverse-engineer';
import { generateImageName } from '../../utils/ai-features';

interface RadialMenuItem {
  label: string;
  icon: string;
  color: string;
  action: () => void;
  disabled?: boolean;
}

const RADIUS = 80;
const START_ANGLE = -150; // degrees
const END_ANGLE = -30;

export function RadialContextMenu() {
  const { contextMenu, hideContextMenu, showToast } = useUIStore();
  const boardMode = useBoardStore((s) => s.boardMode);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const menuRef = useRef<HTMLDivElement>(null);

  // Close when clicking outside
  useEffect(() => {
    if (!contextMenu.visible) return;
    const handleClick = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        hideContextMenu();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };
    setTimeout(() => {
      window.addEventListener('click', handleClick);
      window.addEventListener('keydown', handleEsc);
    }, 100);
    return () => {
      window.removeEventListener('click', handleClick);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [contextMenu.visible, hideContextMenu]);

  const imageId = contextMenu.targetImageId;
  const image = imageId ? useImageStore.getState().images.find(i => i.id === imageId) : null;

  const menuItems: RadialMenuItem[] = useMemo(() => {
    if (!image || !currentProjectId) return [];

    const items: RadialMenuItem[] = [];

    // Focus
    items.push({
      label: 'Focus',
      icon: '🎯',
      color: '#f97316',
      action: () => {
        useUIStore.getState().setFocusedImage(image.id);
        hideContextMenu();
      },
    });

    // Add all notes
    items.push({
      label: 'All Notes',
      icon: '📝',
      color: '#60a5fa',
      action: async () => {
        const cats = boardMode === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
        const existingNotes = boardMode === 'i2v'
          ? useBoardStore.getState().categoryNotes.filter(n => n.imageId === image.id)
          : useBoardStore.getState().editNotes.filter(n => n.imageId === image.id);
        const existingIds = new Set(existingNotes.map(n => n.categoryId));

        let added = 0;
        for (const cat of cats) {
          if (!existingIds.has(cat.id)) {
            if (boardMode === 'i2v') {
              await useBoardStore.getState().addCategoryNote(
                currentProjectId, image.id, cat.id as ShotCategoryId,
                image.x + (image.displayWidth || 350) + 60,
                image.y + added * 180,
              );
            } else {
              await useBoardStore.getState().addEditNote(
                currentProjectId, image.id, cat.id as EditCategoryId,
                image.x + (image.displayWidth || 350) + 60,
                image.y + added * 180,
              );
            }
            added++;
          }
        }
        showToast(`${added} notes added`);
        hideContextMenu();
      },
    });

    // Reverse engineer (AI fill all)
    items.push({
      label: 'AI Analyze',
      icon: '✦',
      color: '#c084fc',
      action: async () => {
        hideContextMenu();
        const { apiKey, model: settingsModel } = useSettingsStore.getState();
        if (!apiKey) { showToast('Set your API key in Settings'); return; }

        showToast('AI analyzing image...');
        try {
          const model = settingsModel || 'anthropic/claude-opus-4-6';
          const godNodes = useBoardStore.getState().godModeNodes;
          const boardState = useBoardStore.getState();

          // Collect existing notes so the AI preserves the director's context
          const existingNotes: Record<string, string> = {};
          const savedNotes = boardMode === 'i2v'
            ? boardState.categoryNotes.filter(n => n.imageId === image.id)
            : boardState.editNotes.filter(n => n.imageId === image.id);
          for (const note of savedNotes) {
            if (note.text.trim()) existingNotes[note.categoryId] = note.text;
          }
          const contextNotes = Object.keys(existingNotes).length > 0 ? existingNotes : undefined;

          if (boardMode === 'i2v') {
            const result = await reverseEngineerI2V(apiKey, model, image.blobId, image.mimeType, godNodes, contextNotes);
            for (const [catId, text] of Object.entries(result.notes)) {
              if (!text) continue;
              const existing = useBoardStore.getState().categoryNotes.find(n => n.imageId === image.id && n.categoryId === catId);
              if (existing) {
                useBoardStore.getState().updateCategoryNote(existing.id, { text });
              } else {
                const id = await useBoardStore.getState().addCategoryNote(
                  currentProjectId, image.id, catId as ShotCategoryId,
                  image.x + (image.displayWidth || 350) + 60, image.y,
                );
                if (id) useBoardStore.getState().updateCategoryNote(id, { text });
              }
            }
          } else {
            const result = await reverseEngineerEdit(apiKey, model, image.blobId, image.mimeType, godNodes, contextNotes);
            for (const [catId, text] of Object.entries(result.notes)) {
              if (!text) continue;
              const existing = useBoardStore.getState().editNotes.find(n => n.imageId === image.id && n.categoryId === catId);
              if (existing) {
                useBoardStore.getState().updateEditNote(existing.id, { text });
              } else {
                const id = await useBoardStore.getState().addEditNote(
                  currentProjectId, image.id, catId as EditCategoryId,
                  image.x + (image.displayWidth || 350) + 60, image.y,
                );
                if (id) useBoardStore.getState().updateEditNote(id, { text });
              }
            }
          }
          showToast('AI analysis complete ✓');
        } catch (e: any) {
          showToast(`AI error: ${e.message?.substring(0, 60)}`);
        }
      },
    });

    // Auto name
    items.push({
      label: 'Auto Name',
      icon: '🏷',
      color: '#2dd4bf',
      action: async () => {
        hideContextMenu();
        const { apiKey, model: settingsModel } = useSettingsStore.getState();
        if (!apiKey) { showToast('Set your API key in Settings'); return; }

        try {
          const model = settingsModel || 'anthropic/claude-opus-4-6';
          const name = await generateImageName(apiKey, model, image.blobId, image.mimeType);
          useImageStore.getState().updateLabel(image.id, name);
          showToast(`Named: "${name}"`);
        } catch (e: any) {
          showToast(`Naming error: ${e.message?.substring(0, 60)}`);
        }
      },
    });

    // Crop
    items.push({
      label: 'Crop',
      icon: '✂',
      color: '#facc15',
      action: () => {
        useUIStore.getState().setCroppingImage(image.id);
        hideContextMenu();
      },
    });

    // Delete
    items.push({
      label: 'Delete',
      icon: '🗑',
      color: '#f87171',
      action: async () => {
        await useBoardStore.getState().removeCategoryNotesForImage(image.id);
        await useBoardStore.getState().removeEditNotesForImage(image.id);
        await useImageStore.getState().removeImage(image.id);
        useProjectStore.getState().decrementImageCount(currentProjectId);
        hideContextMenu();
        showToast('Image deleted');
      },
    });

    return items;
  }, [image, boardMode, currentProjectId, hideContextMenu, showToast]);

  if (!contextMenu.visible || !image) return null;

  const totalItems = menuItems.length;
  const angleSpan = END_ANGLE - START_ANGLE;
  const angleStep = totalItems > 1 ? angleSpan / (totalItems - 1) : 0;

  return (
    <div
      ref={menuRef}
      style={{
        position: 'fixed',
        left: contextMenu.x,
        top: contextMenu.y,
        zIndex: 1000,
        pointerEvents: 'auto',
      }}
      onContextMenu={(e) => e.preventDefault()}
    >
      {/* Center dot */}
      <div style={{
        position: 'absolute',
        width: 10,
        height: 10,
        borderRadius: '50%',
        background: 'rgba(249,115,22,0.5)',
        boxShadow: '0 0 16px rgba(249,115,22,0.4)',
        transform: 'translate(-50%, -50%)',
      }} />

      {/* Radial items */}
      {menuItems.map((item, idx) => {
        const angle = (START_ANGLE + idx * angleStep) * (Math.PI / 180);
        const x = Math.cos(angle) * RADIUS;
        const y = Math.sin(angle) * RADIUS;

        return (
          <div
            key={item.label}
            className="radial-menu-item"
            style={{
              '--radial-pos': `translate(${x}px, ${y}px)`,
              '--stagger-delay': `${idx * 30}ms`,
              left: -20,
              top: -20,
            } as React.CSSProperties}
          >
            <button
              onClick={(e) => { e.stopPropagation(); item.action(); }}
              disabled={item.disabled}
              className="spring-btn"
              title={item.label}
              style={{
                width: 40,
                height: 40,
                borderRadius: '50%',
                background: 'rgba(13,14,24,0.92)',
                backdropFilter: 'blur(20px) saturate(180%)',
                border: `1px solid ${item.color}40`,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: item.disabled ? 'not-allowed' : 'pointer',
                fontSize: 16,
                boxShadow: `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${item.color}20`,
                position: 'relative',
              }}
              onMouseEnter={(e) => {
                (e.currentTarget.style.borderColor = `${item.color}80`);
                (e.currentTarget.style.boxShadow = `0 4px 20px rgba(0,0,0,0.6), 0 0 18px ${item.color}40`);
              }}
              onMouseLeave={(e) => {
                (e.currentTarget.style.borderColor = `${item.color}40`);
                (e.currentTarget.style.boxShadow = `0 4px 16px rgba(0,0,0,0.5), 0 0 12px ${item.color}20`);
              }}
            >
              {item.icon}
            </button>
            {/* Label below */}
            <div style={{
              position: 'absolute',
              top: 44,
              left: '50%',
              transform: 'translateX(-50%)',
              fontSize: 8,
              fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(255,255,255,0.4)',
              whiteSpace: 'nowrap',
              letterSpacing: '0.04em',
              textTransform: 'uppercase',
              pointerEvents: 'none',
            }}>
              {item.label}
            </div>
          </div>
        );
      })}
    </div>
  );
}
