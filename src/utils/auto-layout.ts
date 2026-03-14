import type { BoardImage, CategoryNote, EditNote, PromptNode } from '../types';

/**
 * Auto-layout: Arranges images and their attached notes in a clean grid.
 * Non-destructive: only changes viewport positions (x, y).
 * Returns new positions for images and notes.
 */

interface LayoutResult {
  images: { id: string; x: number; y: number }[];
  categoryNotes: { id: string; x: number; y: number }[];
  editNotes: { id: string; x: number; y: number }[];
  promptNodes: { id: string; x: number; y: number }[];
}

const CARD_GAP_X = 80;
const CARD_GAP_Y = 80;
const NOTE_OFFSET_X = 60;
const NOTE_SPACING_Y = 180;
const PROMPT_OFFSET_Y = 30;
const MAX_COLS = 4;

export function computeAutoLayout(
  images: BoardImage[],
  categoryNotes: CategoryNote[],
  editNotes: EditNote[],
  promptNodes: PromptNode[],
  boardMode: 'i2v' | 'edit',
): LayoutResult {
  const sorted = [...images].sort((a, b) => (a.shotOrder ?? 0) - (b.shotOrder ?? 0));
  const result: LayoutResult = { images: [], categoryNotes: [], editNotes: [], promptNodes: [] };

  const cols = Math.min(sorted.length, MAX_COLS);
  const rows = Math.ceil(sorted.length / cols);

  // Calculate max card dimensions per column for alignment
  const maxWidths: number[] = Array(cols).fill(0);
  const maxHeights: number[] = Array(rows).fill(0);

  sorted.forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);
    const displayW = img.displayWidth || Math.min(img.width, 350);
    const displayH = img.displayHeight || (img.height > 0 ? (displayW / img.width) * img.height : displayW * 0.75);
    maxWidths[col] = Math.max(maxWidths[col], displayW);
    maxHeights[row] = Math.max(maxHeights[row], displayH);
  });

  // Calculate positions
  let startX = 200;
  let startY = 200;

  sorted.forEach((img, idx) => {
    const col = idx % cols;
    const row = Math.floor(idx / cols);

    let x = startX;
    for (let c = 0; c < col; c++) {
      x += maxWidths[c] + CARD_GAP_X + 400; // extra space for notes
    }

    let y = startY;
    for (let r = 0; r < row; r++) {
      y += maxHeights[r] + CARD_GAP_Y;
    }

    const displayW = img.displayWidth || Math.min(img.width, 350);

    result.images.push({ id: img.id, x, y });

    // Position notes to the right of each image
    const imgNotes = boardMode === 'i2v'
      ? categoryNotes.filter(n => n.imageId === img.id)
      : editNotes.filter(n => n.imageId === img.id);

    imgNotes.forEach((note, noteIdx) => {
      const noteX = x + displayW + NOTE_OFFSET_X;
      const noteY = y + noteIdx * NOTE_SPACING_Y;
      if (boardMode === 'i2v') {
        result.categoryNotes.push({ id: note.id, x: noteX, y: noteY });
      } else {
        result.editNotes.push({ id: note.id, x: noteX, y: noteY });
      }
    });

    // Position prompt nodes below notes
    const imgPrompts = promptNodes.filter(p => p.imageId === img.id);
    imgPrompts.forEach((prompt, pIdx) => {
      const promptX = x + displayW + NOTE_OFFSET_X;
      const promptY = y + imgNotes.length * NOTE_SPACING_Y + PROMPT_OFFSET_Y + pIdx * 180;
      result.promptNodes.push({ id: prompt.id, x: promptX, y: promptY });
    });
  });

  return result;
}
