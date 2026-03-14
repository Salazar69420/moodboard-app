import { useState, useRef } from 'react';
import { useImageStore } from '../../stores/useImageStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useUIStore } from '../../stores/useUIStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import type { ShotCategoryId, EditCategoryId, CategoryNote, EditNote } from '../../types';
import type { ExportedProject } from '../../utils/export-import';

interface Props {
  onClose: () => void;
}

export function ImportNotesModal({ onClose }: Props) {
  const [parsed, setParsed] = useState<ExportedProject | null>(null);
  const [selectedCats, setSelectedCats] = useState<Set<string>>(new Set());
  const [noteType, setNoteType] = useState<'i2v' | 'edit'>('i2v');
  const [isImporting, setIsImporting] = useState(false);
  const [dragOver, setDragOver] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  const images = useImageStore((s) => s.images);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);
  const showToast = useUIStore((s) => s.showToast);
  const addCategoryNote = useBoardStore((s) => s.addCategoryNote);
  const addEditNote = useBoardStore((s) => s.addEditNote);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);

  const parseFile = (file: File) => {
    setError(null);
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const data = JSON.parse(e.target?.result as string) as ExportedProject;
        if (!data.version || !data.images) throw new Error('Invalid export file format');
        setParsed(data);

        // Detect which note type is available
        const hasI2V = (data.categoryNotes || []).some(n => n.text?.trim());
        const hasEdit = (data.editNotes || []).some(n => n.text?.trim());
        const type = hasEdit && !hasI2V ? 'edit' : 'i2v';
        setNoteType(type);

        // Pre-select all available categories
        const cats = type === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
        const notes = type === 'i2v' ? (data.categoryNotes || []) : (data.editNotes || []);
        const available = new Set(notes.filter(n => n.text?.trim()).map(n => n.categoryId));
        setSelectedCats(new Set(cats.filter(c => available.has(c.id)).map(c => c.id)));
      } catch {
        setError('Could not read file. Make sure it\'s a valid Moodboard export (.json).');
      }
    };
    reader.readAsText(file);
  };

  const handleFile = (f: File | null | undefined) => {
    if (f) parseFile(f);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    handleFile(e.dataTransfer.files[0]);
  };

  const toggleCat = (id: string) => {
    setSelectedCats(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    if (!parsed) return;
    const notes = noteType === 'i2v' ? (parsed.categoryNotes || []) : (parsed.editNotes || []);
    const available = new Set(notes.filter(n => n.text?.trim()).map(n => n.categoryId));
    const cats = noteType === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
    setSelectedCats(new Set(cats.filter(c => available.has(c.id)).map(c => c.id)));
  };

  const handleImport = async () => {
    if (!parsed || selectedCats.size === 0 || !currentProjectId) return;
    setIsImporting(true);

    try {
      // Sort source images and target images by shotOrder
      const sourceImages = [...parsed.images]
        .sort((a, b) => (a.image.shotOrder ?? 999) - (b.image.shotOrder ?? 999));
      const targetImages = [...images]
        .sort((a, b) => (a.shotOrder ?? 999) - (b.shotOrder ?? 999));

      // Build mapping: source imageId → target image
      const mapping = new Map<string, typeof images[0]>();
      sourceImages.forEach((src, i) => {
        const target = targetImages[i];
        if (target) mapping.set(src.image.id, target);
      });

      let imported = 0;

      if (noteType === 'i2v') {
        const srcNotes = (parsed.categoryNotes || []).filter(
          n => selectedCats.has(n.categoryId) && n.text?.trim()
        );

        for (const srcNote of srcNotes) {
          const targetImg = mapping.get(srcNote.imageId);
          if (!targetImg) continue;

          // Check if target already has a note for this category
          const existing = categoryNotes.find(
            n => n.imageId === targetImg.id && n.categoryId === srcNote.categoryId
          );

          if (existing) {
            useBoardStore.getState().updateCategoryNote(existing.id, {
              text: srcNote.text,
              checkedPrompts: srcNote.checkedPrompts || [],
            });
          } else {
            const id = await addCategoryNote(
              currentProjectId,
              targetImg.id,
              srcNote.categoryId as ShotCategoryId,
              targetImg.x + (targetImg.displayWidth || 240) + 20,
              targetImg.y,
            );
            if (id) {
              useBoardStore.getState().updateCategoryNote(id, {
                text: srcNote.text,
                checkedPrompts: srcNote.checkedPrompts || [],
              });
            }
          }
          imported++;
        }
      } else {
        const srcNotes = (parsed.editNotes || []).filter(
          n => selectedCats.has(n.categoryId) && n.text?.trim()
        );

        for (const srcNote of srcNotes) {
          const targetImg = mapping.get(srcNote.imageId);
          if (!targetImg) continue;

          const existing = editNotes.find(
            n => n.imageId === targetImg.id && n.categoryId === srcNote.categoryId
          );

          if (existing) {
            useBoardStore.getState().updateEditNote(existing.id, {
              text: srcNote.text,
              checkedPrompts: srcNote.checkedPrompts || [],
            });
          } else {
            const id = await addEditNote(
              currentProjectId,
              targetImg.id,
              srcNote.categoryId as EditCategoryId,
              targetImg.x + (targetImg.displayWidth || 240) + 20,
              targetImg.y,
            );
            if (id) {
              useBoardStore.getState().updateEditNote(id, {
                text: srcNote.text,
                checkedPrompts: srcNote.checkedPrompts || [],
              });
            }
          }
          imported++;
        }
      }

      showToast(`Imported ${imported} note${imported !== 1 ? 's' : ''} across ${mapping.size} shot${mapping.size !== 1 ? 's' : ''}`);
      onClose();
    } catch (e: any) {
      setError(`Import failed: ${e.message}`);
    } finally {
      setIsImporting(false);
    }
  };

  // Compute category stats from parsed data
  const categories = noteType === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
  const sourceNotes: Array<CategoryNote | EditNote> = parsed
    ? (noteType === 'i2v' ? (parsed.categoryNotes || []) : (parsed.editNotes || []))
    : [];
  const availableCatIds = new Set(sourceNotes.filter(n => n.text?.trim()).map(n => n.categoryId));
  const totalSourceImages = parsed?.images.length || 0;
  const mappedImages = Math.min(totalSourceImages, images.length);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        background: 'rgba(0,0,0,0.7)',
        backdropFilter: 'blur(8px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 9000,
        padding: 20,
      }}
      onClick={(e) => e.target === e.currentTarget && onClose()}
    >
      <div
        style={{
          background: 'rgba(13,14,24,0.95)',
          backdropFilter: 'blur(32px) saturate(180%)',
          border: '1px solid rgba(255,255,255,0.1)',
          borderRadius: 16,
          boxShadow: '0 24px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.07)',
          width: '100%',
          maxWidth: 540,
          maxHeight: '85vh',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          padding: '16px 20px',
          borderBottom: '1px solid rgba(255,255,255,0.07)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}>
          <div>
            <div style={{ fontSize: 15, fontWeight: 600, color: '#e2e4f0', fontFamily: "'Inter', sans-serif" }}>
              Import Note Nodes
            </div>
            <div style={{ fontSize: 11, color: 'rgba(226,228,240,0.35)', marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
              Selectively import individual note categories from an exported project
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: 'transparent', border: 'none', color: '#555',
              cursor: 'pointer', fontSize: 18, padding: '4px 8px', borderRadius: 6,
            }}
          >✕</button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: 20 }}>
          {/* File drop zone */}
          {!parsed && (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileRef.current?.click()}
              style={{
                border: `2px dashed ${dragOver ? 'rgba(249,115,22,0.5)' : 'rgba(255,255,255,0.1)'}`,
                borderRadius: 12,
                padding: '40px 24px',
                textAlign: 'center',
                cursor: 'pointer',
                background: dragOver ? 'rgba(249,115,22,0.04)' : 'rgba(255,255,255,0.02)',
                transition: 'all 0.2s var(--spring-smooth)',
              }}
            >
              <div style={{ fontSize: 32, marginBottom: 12, opacity: 0.5 }}>📂</div>
              <div style={{ fontSize: 13, color: '#888', fontFamily: "'Inter', sans-serif" }}>
                Drop an exported project .json here
              </div>
              <div style={{ fontSize: 11, color: '#444', marginTop: 6, fontFamily: "'Inter', sans-serif" }}>
                or click to browse
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".json"
                style={{ display: 'none' }}
                onChange={(e) => handleFile(e.target.files?.[0])}
              />
            </div>
          )}

          {error && (
            <div style={{
              padding: '10px 14px',
              background: 'rgba(248,113,113,0.08)',
              border: '1px solid rgba(248,113,113,0.2)',
              borderRadius: 8,
              color: '#f87171',
              fontSize: 12,
              marginTop: parsed ? 0 : 12,
              fontFamily: "'Inter', sans-serif",
            }}>
              {error}
            </div>
          )}

          {parsed && (
            <>
              {/* Source summary */}
              <div style={{
                padding: '12px 14px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.07)',
                borderRadius: 10,
                marginBottom: 16,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ fontSize: 13, color: '#e2e4f0', fontWeight: 600, fontFamily: "'Inter', sans-serif" }}>
                      {parsed.project?.name || 'Unnamed Project'}
                    </div>
                    <div style={{ fontSize: 11, color: '#555', marginTop: 2, fontFamily: "'Inter', sans-serif" }}>
                      {totalSourceImages} shot{totalSourceImages !== 1 ? 's' : ''} in source ·{' '}
                      {images.length} shot{images.length !== 1 ? 's' : ''} in current project
                    </div>
                  </div>
                  <button
                    onClick={() => { setParsed(null); setError(null); }}
                    style={{
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.08)',
                      borderRadius: 6,
                      padding: '4px 10px',
                      color: '#666',
                      fontSize: 10,
                      cursor: 'pointer',
                      fontFamily: "'Inter', sans-serif",
                    }}
                  >
                    Change file
                  </button>
                </div>

                {mappedImages < totalSourceImages && (
                  <div style={{
                    marginTop: 8, padding: '6px 10px',
                    background: 'rgba(251,191,36,0.06)',
                    border: '1px solid rgba(251,191,36,0.15)',
                    borderRadius: 6,
                    fontSize: 11, color: '#fbbf24',
                    fontFamily: "'Inter', sans-serif",
                  }}>
                    ⚠ Source has {totalSourceImages} shots, current project has {images.length}. Notes will be mapped by shot order — only {mappedImages} will be imported.
                  </div>
                )}
              </div>

              {/* Note type toggle */}
              <div style={{ display: 'flex', gap: 6, marginBottom: 14 }}>
                {(['i2v', 'edit'] as const).map(type => {
                  const count = type === 'i2v'
                    ? new Set((parsed.categoryNotes || []).filter(n => n.text?.trim()).map(n => n.categoryId)).size
                    : new Set((parsed.editNotes || []).filter(n => n.text?.trim()).map(n => n.categoryId)).size;
                  return (
                    <button
                      key={type}
                      onClick={() => {
                        setNoteType(type);
                        const cats = type === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
                        const notes = type === 'i2v' ? (parsed.categoryNotes || []) : (parsed.editNotes || []);
                        const avail = new Set(notes.filter(n => n.text?.trim()).map(n => n.categoryId));
                        setSelectedCats(new Set(cats.filter(c => avail.has(c.id)).map(c => c.id)));
                      }}
                      style={{
                        flex: 1,
                        padding: '7px 12px',
                        borderRadius: 8,
                        fontSize: 11,
                        fontFamily: "'JetBrains Mono', monospace",
                        fontWeight: 600,
                        cursor: count === 0 ? 'not-allowed' : 'pointer',
                        background: noteType === type ? 'rgba(249,115,22,0.12)' : 'rgba(255,255,255,0.03)',
                        border: `1px solid ${noteType === type ? 'rgba(249,115,22,0.3)' : 'rgba(255,255,255,0.07)'}`,
                        color: noteType === type ? '#f97316' : count === 0 ? '#333' : '#666',
                        opacity: count === 0 ? 0.5 : 1,
                      }}
                      disabled={count === 0}
                    >
                      {type.toUpperCase()} — {count} categories
                    </button>
                  );
                })}
              </div>

              {/* Category selection */}
              <div style={{ marginBottom: 8, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ fontSize: 11, color: 'rgba(226,228,240,0.35)', fontFamily: "'Inter', sans-serif", textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Select categories to import
                </div>
                <button
                  onClick={selectAll}
                  style={{
                    background: 'none', border: 'none', color: '#f97316',
                    fontSize: 10, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                  }}
                >
                  Select all available
                </button>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                {categories.map(cat => {
                  const isAvailable = availableCatIds.has(cat.id);
                  const isSelected = selectedCats.has(cat.id);
                  const noteCount = sourceNotes.filter(n => n.categoryId === cat.id && n.text?.trim()).length;

                  return (
                    <button
                      key={cat.id}
                      onClick={() => isAvailable && toggleCat(cat.id)}
                      disabled={!isAvailable}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 10,
                        padding: '9px 12px',
                        borderRadius: 8,
                        background: isSelected
                          ? `${cat.bg}cc`
                          : isAvailable
                          ? 'rgba(255,255,255,0.02)'
                          : 'transparent',
                        border: `1px solid ${isSelected ? cat.border : isAvailable ? 'rgba(255,255,255,0.06)' : 'transparent'}`,
                        cursor: isAvailable ? 'pointer' : 'not-allowed',
                        opacity: isAvailable ? 1 : 0.3,
                        textAlign: 'left',
                        transition: 'all 0.15s var(--spring-smooth)',
                      }}
                    >
                      {/* Checkbox */}
                      <div style={{
                        width: 16, height: 16,
                        borderRadius: 4,
                        border: `1.5px solid ${isSelected ? cat.color : 'rgba(255,255,255,0.15)'}`,
                        background: isSelected ? cat.color : 'transparent',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        flexShrink: 0,
                        transition: 'all 0.15s ease',
                      }}>
                        {isSelected && (
                          <svg width="9" height="9" viewBox="0 0 12 12" fill="none">
                            <path d="M2 6l3 3 5-5" stroke="#000" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                          </svg>
                        )}
                      </div>

                      <span style={{ fontSize: 13 }}>{cat.icon}</span>
                      <span style={{
                        fontSize: 12,
                        fontFamily: "'Inter', sans-serif",
                        color: isSelected ? cat.color : isAvailable ? '#aaa' : '#444',
                        fontWeight: isSelected ? 600 : 400,
                        flex: 1,
                      }}>
                        {cat.label}
                      </span>
                      {isAvailable && (
                        <span style={{
                          fontSize: 9,
                          fontFamily: "'JetBrains Mono', monospace",
                          color: '#444',
                          background: 'rgba(255,255,255,0.04)',
                          border: '1px solid rgba(255,255,255,0.06)',
                          borderRadius: 4,
                          padding: '2px 5px',
                        }}>
                          {noteCount} note{noteCount !== 1 ? 's' : ''}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {parsed && (
          <div style={{
            padding: '14px 20px',
            borderTop: '1px solid rgba(255,255,255,0.07)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: 10,
          }}>
            <div style={{ fontSize: 11, color: '#444', fontFamily: "'Inter', sans-serif" }}>
              {selectedCats.size} categor{selectedCats.size !== 1 ? 'ies' : 'y'} selected · mapped to {mappedImages} shot{mappedImages !== 1 ? 's' : ''}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              <button
                onClick={onClose}
                style={{
                  padding: '8px 16px', borderRadius: 8, fontSize: 12,
                  background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                  color: '#666', cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={isImporting || selectedCats.size === 0 || mappedImages === 0}
                style={{
                  padding: '8px 20px', borderRadius: 8, fontSize: 12, fontWeight: 600,
                  background: selectedCats.size > 0 && mappedImages > 0 ? 'rgba(249,115,22,0.15)' : 'rgba(255,255,255,0.03)',
                  border: `1px solid ${selectedCats.size > 0 && mappedImages > 0 ? 'rgba(249,115,22,0.35)' : 'rgba(255,255,255,0.06)'}`,
                  color: selectedCats.size > 0 && mappedImages > 0 ? '#f97316' : '#333',
                  cursor: selectedCats.size > 0 && mappedImages > 0 ? 'pointer' : 'not-allowed',
                  fontFamily: "'Inter', sans-serif",
                  display: 'flex', alignItems: 'center', gap: 6,
                }}
              >
                {isImporting ? (
                  <>
                    <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                    Importing…
                  </>
                ) : (
                  `Import ${selectedCats.size > 0 ? selectedCats.size : ''} Categor${selectedCats.size !== 1 ? 'ies' : 'y'}`
                )}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
