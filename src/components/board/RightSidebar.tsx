import { useState, useCallback } from 'react';
import { useUIStore } from '../../stores/useUIStore';
import { useBoardStore } from '../../stores/useBoardStore';
import { useImageStore } from '../../stores/useImageStore';
import { useSettingsStore } from '../../stores/useSettingsStore';
import { useProjectStore } from '../../stores/useProjectStore';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../../types';
import type { ShotCategoryId, EditCategoryId } from '../../types';
import { reverseEngineerSingleCategory, distributeFreeFormToNotes } from '../../utils/ai-features';

export function RightSidebar() {
  const selectedImageIds = useUIStore((s) => s.selectedImageIds);
  const noteDisplayMode = useUIStore((s) => s.noteDisplayMode);
  const setNoteDisplayMode = useUIStore((s) => s.setNoteDisplayMode);
  const showToast = useUIStore((s) => s.showToast);

  const images = useImageStore((s) => s.images);
  const boardMode = useBoardStore((s) => s.boardMode);
  const categoryNotes = useBoardStore((s) => s.categoryNotes);
  const editNotes = useBoardStore((s) => s.editNotes);
  const addCategoryNote = useBoardStore((s) => s.addCategoryNote);
  const addEditNote = useBoardStore((s) => s.addEditNote);
  const currentProjectId = useProjectStore((s) => s.currentProjectId);

  // Local draft state for categories that don't yet have a note in the store
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [freeFormText, setFreeFormText] = useState('');
  const [isFreeFormMode, setIsFreeFormMode] = useState(false);
  const [isDistributing, setIsDistributing] = useState(false);
  const [aiLoadingCat, setAiLoadingCat] = useState<string | null>(null);
  // Track which prompts were addressed by AI (per category)
  const [aiCoveredPrompts, setAiCoveredPrompts] = useState<Record<string, string[]>>({});
  const [closing, setClosing] = useState(false);

  // Derived values needed by hooks — must be before any early return
  const selectedId = selectedImageIds.size === 1 ? Array.from(selectedImageIds)[0] : null;
  const selectedImage = selectedId ? images.find(i => i.id === selectedId) : null;

  // Ensure a note exists for a category, create if needed, return its id
  const ensureNote = useCallback(async (catId: string): Promise<string | null> => {
    if (!selectedImage || !currentProjectId) return null;
    const existingNote = boardMode === 'i2v'
      ? categoryNotes.find(n => n.imageId === selectedId && n.categoryId === catId)
      : editNotes.find(n => n.imageId === selectedId && n.categoryId === catId);
    if (existingNote) return existingNote.id;

    const noteX = selectedImage.x + (selectedImage.displayWidth || 240) + 24;
    const noteY = selectedImage.y;

    if (boardMode === 'i2v') {
      return (await addCategoryNote(currentProjectId, selectedImage.id, catId as ShotCategoryId, noteX, noteY)) || null;
    } else {
      return (await addEditNote(currentProjectId, selectedImage.id, catId as EditCategoryId, noteX, noteY)) || null;
    }
  }, [selectedImage, currentProjectId, boardMode, categoryNotes, editNotes, selectedId, addCategoryNote, addEditNote]);

  const updateNoteText = useCallback((noteId: string, text: string) => {
    if (boardMode === 'i2v') {
      useBoardStore.getState().updateCategoryNote(noteId, { text });
    } else {
      useBoardStore.getState().updateEditNote(noteId, { text });
    }
  }, [boardMode]);

  if (noteDisplayMode !== 'sidebar') return null;

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => {
      setNoteDisplayMode('canvas');
      setClosing(false);
    }, 250);
  };

  const categories = boardMode === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;
  const notes = boardMode === 'i2v'
    ? categoryNotes.filter(n => n.imageId === selectedId)
    : editNotes.filter(n => n.imageId === selectedId);

  // Live onChange: update existing note immediately, or stage as draft
  const handleTextChange = (catId: string, value: string) => {
    const existingNote = notes.find(n => n.categoryId === catId);
    if (existingNote) {
      updateNoteText(existingNote.id, value);
    } else {
      setDrafts(d => ({ ...d, [catId]: value }));
    }
  };

  // onBlur: if we have a draft and no note exists yet, create the note now
  const handleTextBlur = async (catId: string) => {
    const draft = drafts[catId];
    if (!draft?.trim()) return;
    const existingNote = notes.find(n => n.categoryId === catId);
    if (existingNote) return;
    const noteId = await ensureNote(catId);
    if (noteId) {
      updateNoteText(noteId, draft);
      setDrafts(d => { const n = { ...d }; delete n[catId]; return n; });
    }
  };

  // Single category AI fill (F4)
  const handleAiFillCategory = async (categoryId: string) => {
    if (!selectedImage || !currentProjectId) return;
    const { apiKey, model: settingsModel } = useSettingsStore.getState();
    if (!apiKey) { showToast('Set your API key in Settings'); return; }

    setAiLoadingCat(categoryId);
    try {
      const model = settingsModel || 'anthropic/claude-opus-4-6';
      const text = await reverseEngineerSingleCategory(
        apiKey, model,
        selectedImage.blobId, selectedImage.mimeType,
        categoryId as ShotCategoryId | EditCategoryId,
        useBoardStore.getState().godModeNodes,
      );

      const noteId = await ensureNote(categoryId);
      if (noteId) {
        updateNoteText(noteId, text);
        // Mark all prompts for this category as covered by AI
        const cat = categories.find(c => c.id === categoryId);
        if (cat?.prompts.length) {
          setAiCoveredPrompts(prev => ({ ...prev, [categoryId]: cat.prompts }));
        }
      }
      showToast(`✦ AI filled ${categories.find(c => c.id === categoryId)?.label || categoryId}`);
    } catch (e: any) {
      showToast(`AI error: ${e.message?.substring(0, 80)}`);
    } finally {
      setAiLoadingCat(null);
    }
  };

  // Free-form distribution with vision (F1)
  const handleDistribute = async () => {
    if (!freeFormText.trim() || !selectedImage || !currentProjectId) return;
    const { apiKey, model: settingsModel } = useSettingsStore.getState();
    if (!apiKey) { showToast('Set your API key in Settings'); return; }

    setIsDistributing(true);
    try {
      const model = settingsModel || 'anthropic/claude-opus-4-6';
      const result = await distributeFreeFormToNotes(
        apiKey, model,
        freeFormText,
        boardMode,
        selectedImage.blobId,    // vision: include reference image
        selectedImage.mimeType,
      );

      let filledCount = 0;
      for (const [catId, text] of Object.entries(result.notes)) {
        if (!text || typeof text !== 'string' || !text.trim()) continue;
        const noteId = await ensureNote(catId);
        if (noteId) {
          updateNoteText(noteId, text.trim());
          filledCount++;
        }
      }

      setAiCoveredPrompts(result.coveredPrompts || {});
      setFreeFormText('');
      setIsFreeFormMode(false);
      showToast(`✦ Filled ${filledCount} of ${categories.length} categories`);
    } catch (e: any) {
      showToast(`Distribution error: ${e.message?.substring(0, 80)}`);
    } finally {
      setIsDistributing(false);
    }
  };

  const totalFilled = categories.filter(cat => {
    const note = notes.find(n => n.categoryId === cat.id);
    return (note?.text ?? drafts[cat.id] ?? '').trim().length > 0;
  }).length;

  return (
    <div className={`right-sidebar ${closing ? 'closing' : ''}`}>
      {/* Header */}
      <div style={{
        padding: '12px 16px',
        borderBottom: '1px solid var(--glass-border)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        flexShrink: 0,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.4)" strokeWidth="2">
            <path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z" />
            <polyline points="14 2 14 8 20 8" />
          </svg>
          <span style={{
            fontSize: 10, fontFamily: "'Inter', sans-serif",
            color: 'rgba(255,255,255,0.4)', letterSpacing: '0.1em',
            textTransform: 'uppercase', fontWeight: 600,
          }}>
            Shot Notes
          </span>
          {selectedImage && totalFilled > 0 && (
            <span style={{
              fontSize: 9, fontFamily: "'JetBrains Mono', monospace",
              color: 'rgba(45,212,191,0.7)',
              background: 'rgba(45,212,191,0.08)', border: '1px solid rgba(45,212,191,0.15)',
              borderRadius: 4, padding: '1px 5px',
            }}>
              {totalFilled}/{categories.length}
            </span>
          )}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={handleClose}
            title="Switch to canvas notes"
            style={{
              background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
              color: '#555', cursor: 'pointer', fontSize: 9, padding: '3px 8px',
              borderRadius: 6, fontFamily: "'Inter', sans-serif", letterSpacing: '0.04em',
            }}
          >
            Canvas ↗
          </button>
          <button
            onClick={handleClose}
            style={{
              background: 'transparent', border: 'none', color: '#444',
              cursor: 'pointer', fontSize: 16, padding: '2px 6px', lineHeight: 1,
            }}
          >✕</button>
        </div>
      </div>

      {!selectedImage ? (
        <div style={{
          padding: '48px 20px', textAlign: 'center', color: '#333',
          fontSize: 12, lineHeight: 1.7, fontFamily: "'Inter', sans-serif",
        }}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
            stroke="rgba(255,255,255,0.1)" strokeWidth="1.5"
            style={{ margin: '0 auto 10px', display: 'block' }}>
            <rect x="3" y="3" width="18" height="18" rx="3" />
            <path d="M3 9h18M9 21V9" />
          </svg>
          <div style={{ color: '#444' }}>Select an image to edit its notes</div>
          <div style={{ fontSize: 10, color: '#2a2a2a', marginTop: 4 }}>Click any image on the canvas</div>
        </div>
      ) : (
        <div style={{ flex: 1, overflowY: 'auto', padding: '12px 12px 24px' }}>
          {/* Image info */}
          <div style={{
            marginBottom: 12, padding: '10px 12px',
            background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.06)',
            borderRadius: 10, display: 'flex', alignItems: 'center', gap: 10,
          }}>
            <div style={{
              width: 34, height: 34, borderRadius: 6, flexShrink: 0,
              background: selectedImage.accentColor ? `${selectedImage.accentColor}18` : 'rgba(255,255,255,0.05)',
              border: `1px solid ${selectedImage.accentColor ? `${selectedImage.accentColor}30` : 'rgba(255,255,255,0.08)'}`,
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14,
            }}>
              {selectedImage.mediaType === 'video' ? '🎬' : '🖼️'}
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{
                fontSize: 13, fontFamily: "'DM Serif Display', serif", color: '#e2e4f0',
                overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
              }}>
                {selectedImage.label || selectedImage.filename || 'Untitled'}
              </div>
              <div style={{
                fontSize: 9, fontFamily: "'JetBrains Mono', monospace", color: '#444',
                marginTop: 2, display: 'flex', gap: 6, alignItems: 'center',
              }}>
                <span>Shot {selectedImage.shotOrder ?? '–'}</span>
                <span style={{ color: '#2a2a2a' }}>·</span>
                <span style={{ color: boardMode === 'i2v' ? '#60a5fa' : '#22d3ee' }}>
                  {boardMode === 'i2v' ? 'I2V' : 'Edit'}
                </span>
                {totalFilled > 0 && (
                  <>
                    <span style={{ color: '#2a2a2a' }}>·</span>
                    <span style={{ color: '#2dd4bf' }}>{totalFilled}/{categories.length} filled</span>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Free-form → all notes (F1) */}
          <div style={{ marginBottom: 12 }}>
            <button
              onClick={() => setIsFreeFormMode(!isFreeFormMode)}
              style={{
                width: '100%',
                background: isFreeFormMode ? 'rgba(249,115,22,0.08)' : 'rgba(255,255,255,0.02)',
                border: `1px solid ${isFreeFormMode ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.055)'}`,
                borderRadius: 8, padding: '8px 12px',
                color: isFreeFormMode ? '#f97316' : '#555',
                fontSize: 11, cursor: 'pointer', fontFamily: "'Inter', sans-serif",
                textAlign: 'left' as const,
                display: 'flex', alignItems: 'center', gap: 8,
                transition: 'all 0.15s ease',
              }}
            >
              <span style={{ fontSize: 12 }}>✨</span>
              <span style={{ flex: 1 }}>
                {isFreeFormMode ? 'Close free-form mode' : 'Free-form → auto-fill all notes'}
              </span>
              {!isFreeFormMode && (
                <span style={{
                  fontSize: 9, color: '#2dd4bf', fontFamily: "'JetBrains Mono', monospace",
                  background: 'rgba(45,212,191,0.06)', border: '1px solid rgba(45,212,191,0.12)',
                  borderRadius: 4, padding: '1px 5px',
                }}>
                  vision + text
                </span>
              )}
            </button>

            {isFreeFormMode && (
              <div style={{ marginTop: 8 }}>
                <textarea
                  value={freeFormText}
                  onChange={(e) => setFreeFormText(e.target.value)}
                  placeholder={`Describe this shot naturally…\n\nAI will analyze both your description and the reference image to fill all ${categories.length} note categories.\n\ne.g. "slow push into her face as the sun drops, melancholic, handheld 85mm"`}
                  style={{
                    width: '100%', minHeight: 100,
                    background: 'rgba(255,255,255,0.03)',
                    border: '1px solid rgba(255,255,255,0.08)',
                    borderRadius: 8, padding: '8px 10px',
                    color: '#ccc', fontSize: 12, fontFamily: "'Inter', sans-serif",
                    resize: 'vertical' as const, outline: 'none', lineHeight: 1.6,
                    boxSizing: 'border-box' as const,
                  }}
                  onFocus={(e) => (e.target.style.borderColor = 'rgba(249,115,22,0.3)')}
                  onBlur={(e) => (e.target.style.borderColor = 'rgba(255,255,255,0.08)')}
                />
                <div style={{
                  fontSize: 10, color: '#333', fontFamily: "'Inter', sans-serif",
                  marginTop: 4, padding: '0 2px', lineHeight: 1.5,
                }}>
                  ✦ AI analyzes the reference image + your description · fills all {categories.length} categories · marks covered questions ✓
                </div>
                <button
                  onClick={handleDistribute}
                  disabled={isDistributing || !freeFormText.trim()}
                  style={{
                    width: '100%', marginTop: 8,
                    background: freeFormText.trim() && !isDistributing
                      ? 'rgba(249,115,22,0.1)' : 'rgba(255,255,255,0.02)',
                    border: `1px solid ${freeFormText.trim() ? 'rgba(249,115,22,0.25)' : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 8, padding: '9px 12px',
                    color: freeFormText.trim() ? '#f97316' : '#333',
                    fontSize: 12, fontWeight: 600,
                    cursor: freeFormText.trim() && !isDistributing ? 'pointer' : 'not-allowed',
                    fontFamily: "'Inter', sans-serif",
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
                    transition: 'all 0.15s ease',
                  }}
                >
                  {isDistributing ? (
                    <>
                      <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                      Analyzing image + description…
                    </>
                  ) : '✦ Distribute to All Notes'}
                </button>
              </div>
            )}
          </div>

          {/* Note cards */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {categories.map(cat => {
              const note = notes.find(n => n.categoryId === cat.id);
              const isAiLoading = aiLoadingCat === cat.id;
              const currentText = note?.text ?? drafts[cat.id] ?? '';
              const isFilled = currentText.trim().length > 0;

              // Covered prompts: from note's checkedPrompts OR from AI distribution
              const coveredFromAi = aiCoveredPrompts[cat.id] || [];
              const coveredFromNote = note?.checkedPrompts || [];
              const allCoveredSet = new Set([...coveredFromAi, ...coveredFromNote]);

              return (
                <div
                  key={cat.id}
                  style={{
                    background: isFilled ? `${cat.bg}bb` : 'rgba(255,255,255,0.015)',
                    border: `1px solid ${isFilled ? cat.border : 'rgba(255,255,255,0.05)'}`,
                    borderRadius: 10, overflow: 'hidden',
                    transition: 'all 0.2s var(--spring-smooth)',
                  }}
                >
                  {/* Card header */}
                  <div style={{
                    display: 'flex', alignItems: 'center', gap: 7,
                    padding: '7px 10px',
                    borderBottom: `1px solid ${isFilled ? cat.border : 'rgba(255,255,255,0.035)'}`,
                    background: 'rgba(255,255,255,0.02)',
                  }}>
                    <span style={{ fontSize: 11, opacity: isFilled ? 1 : 0.4 }}>{cat.icon}</span>
                    <span style={{
                      fontSize: 10, fontFamily: "'Inter', sans-serif", fontWeight: 600,
                      letterSpacing: '0.08em', textTransform: 'uppercase' as const,
                      color: isFilled ? cat.color : 'rgba(255,255,255,0.18)',
                      flex: 1,
                    }}>
                      {cat.label}
                    </span>

                    {/* Filled dot */}
                    {isFilled && !isAiLoading && (
                      <div style={{
                        width: 5, height: 5, borderRadius: '50%',
                        background: cat.color, boxShadow: `0 0 5px ${cat.color}66`,
                        flexShrink: 0,
                      }} />
                    )}

                    {/* AI fill button */}
                    <button
                      onClick={() => handleAiFillCategory(cat.id)}
                      disabled={!!isAiLoading}
                      title={`AI analyze image → fill "${cat.label}"`}
                      style={{
                        background: 'rgba(249,115,22,0.06)',
                        border: '1px solid rgba(249,115,22,0.14)',
                        borderRadius: 4, padding: '2px 6px',
                        fontSize: 9, color: '#f97316',
                        cursor: isAiLoading ? 'wait' : 'pointer',
                        fontFamily: "'JetBrains Mono', monospace", fontWeight: 600,
                        transition: 'all 0.1s ease', flexShrink: 0,
                      }}
                    >
                      {isAiLoading
                        ? <span style={{ animation: 'spin 1s linear infinite', display: 'inline-block' }}>⟳</span>
                        : '✦ AI'}
                    </button>
                  </div>

                  {/* Textarea */}
                  <div style={{ padding: '6px 10px 6px' }}>
                    <textarea
                      value={currentText}
                      onChange={(e) => handleTextChange(cat.id, e.target.value)}
                      onBlur={() => handleTextBlur(cat.id)}
                      placeholder={
                        isAiLoading
                          ? 'AI analyzing image…'
                          : cat.placeholder || `Add ${cat.label.toLowerCase()} notes…`
                      }
                      style={{
                        width: '100%',
                        minHeight: cat.id === 'time' ? 28 : 44,
                        background: 'transparent', border: 'none',
                        color: isFilled ? '#d0d2e2' : '#444',
                        fontSize: 12, fontFamily: "'Inter', sans-serif",
                        resize: 'vertical' as const, outline: 'none',
                        lineHeight: 1.55, boxSizing: 'border-box' as const,
                        transition: 'color 0.15s ease',
                      }}
                      className={isAiLoading ? 'prompt-developing' : ''}
                    />
                  </div>

                  {/* Checklist — shows when there are prompts */}
                  {cat.prompts.length > 0 && (
                    <div style={{
                      padding: '0 10px 8px',
                      display: 'flex', flexWrap: 'wrap' as const, gap: 4,
                    }}>
                      {cat.prompts.map(prompt => {
                        const isCovered = allCoveredSet.has(prompt);
                        return (
                          <div
                            key={prompt}
                            title={isCovered ? `✓ Addressed` : `Not yet addressed`}
                            style={{
                              display: 'flex', alignItems: 'center', gap: 3,
                              padding: '2px 6px', borderRadius: 4,
                              fontSize: 9, fontFamily: "'Inter', sans-serif",
                              background: isCovered
                                ? `${cat.color}12`
                                : isFilled
                                ? 'rgba(255,255,255,0.03)'
                                : 'transparent',
                              border: `1px solid ${isCovered
                                ? `${cat.color}28`
                                : isFilled
                                ? 'rgba(255,255,255,0.06)'
                                : 'rgba(255,255,255,0.03)'}`,
                              color: isCovered ? cat.color : isFilled ? '#333' : '#222',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            <span style={{ fontSize: 8, opacity: isCovered ? 1 : 0.5 }}>
                              {isCovered ? '✓' : '○'}
                            </span>
                            <span>{prompt.replace(/\?$/, '')}</span>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
