import { useImageStore } from '../stores/useImageStore';
import { useBoardStore } from '../stores/useBoardStore';

const MAX_CONTEXT_CHARS = 6000; // ~2000 tokens safety cap

/**
 * Serialize the current board state into a compact text block
 * suitable for injection into AI generation calls.
 */
export function serializeBoardContext(projectId: string): string {
  const images = useImageStore.getState().images.filter(i => i.projectId === projectId);
  const { promptNodes, godModeNodes, documentNodes, categoryNotes, editNotes } = useBoardStore.getState();

  const projectPromptNodes = promptNodes.filter(p => p.projectId === projectId);
  const projectGodNodes = godModeNodes.filter(g => g.projectId === projectId && g.isEnabled && g.text.trim());
  const projectDocNodes = documentNodes.filter(d => d.projectId === projectId && d.content.trim());

  const lines: string[] = [];

  lines.push(`[Board Context — ${images.length} image${images.length !== 1 ? 's' : ''} on canvas]`);

  // Images with their associated prompts
  const sortedImages = [...images].sort((a, b) => (a.shotOrder ?? 0) - (b.shotOrder ?? 0));
  for (const img of sortedImages) {
    const label = img.label || img.filename || 'Untitled';
    const prompt = projectPromptNodes.find(p => p.imageId === img.id);

    // Count filled notes
    const notes = [
      ...categoryNotes.filter(n => n.imageId === img.id && n.text.trim()),
      ...editNotes.filter(n => n.imageId === img.id && n.text.trim()),
    ];

    let imgLine = `• "${label}"`;
    if (img.shotOrder !== undefined) imgLine = `[Shot ${img.shotOrder + 1}] ${imgLine}`;
    if (notes.length > 0) imgLine += ` — ${notes.length} note${notes.length !== 1 ? 's' : ''}`;
    if (prompt) {
      const shortPrompt = prompt.text.length > 120
        ? prompt.text.slice(0, 120) + '…'
        : prompt.text;
      imgLine += ` — prompt: "${shortPrompt}"`;
    }
    lines.push(imgLine);
  }

  // Active God Mode nodes
  if (projectGodNodes.length > 0) {
    lines.push('');
    lines.push('[Global Rules]');
    for (const gn of projectGodNodes) {
      const title = gn.title ? `${gn.title}: ` : '';
      const text = gn.text.length > 100 ? gn.text.slice(0, 100) + '…' : gn.text;
      lines.push(`• ${title}${text}`);
    }
  }

  // Document nodes
  if (projectDocNodes.length > 0) {
    lines.push('');
    lines.push('[Project Documents]');
    for (const doc of projectDocNodes) {
      const preview = doc.content.length > 200 ? doc.content.slice(0, 200) + '…' : doc.content;
      lines.push(`• ${doc.title}: ${preview}`);
    }
  }

  const result = lines.join('\n');

  // Safety cap
  if (result.length > MAX_CONTEXT_CHARS) {
    return result.slice(0, MAX_CONTEXT_CHARS) + '\n[Board context truncated]';
  }

  return result;
}
