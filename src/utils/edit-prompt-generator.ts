import type { EditNote, EditCategoryId, GodModeNode, EvalResult, PreferenceProfile } from '../types';
import { EDIT_CATEGORIES } from '../types';
import { getBlob } from './db-operations';
import { evaluateOutput } from './eval-engine';
import { serializeBoardContext } from './board-context';
import { buildPreferenceBlock } from './preference-manager';

const SYSTEM_PROMPT = `You are a precision prompt-writing assistant for AI image generators (Flux, Midjourney, DALL-E, Stable Diffusion, etc.).

Your job: take the artist's raw notes — organized by the 6-Part Prompt Formula (Subject → Action → Environment → Art Style → Lighting → Camera) — and compose them into a single, flowing, richly-detailed English prompt for image generation.

STRICT RULES:
1. ONLY use information from the notes and what is literally visible in the reference image(s). Never invent, assume, or add details beyond what is provided.
   - The first image is the PRIMARY reference. Additional images are supplementary (character sheets, style references, mood boards, etc.).
   - If notes contain @mentions (e.g. @character_sheet, @style_ref), those refer to supplementary images. Extract specific visual details from those images when referenced.
2. Preserve the artist's exact creative intent. You are a writing tool, not a creative director.
3. Fix grammar, spelling, and phrasing to read naturally and fluently.
4. Follow the 6-Part order: Subject → Action → Environment → Art Style → Lighting → Camera. Weave into flowing, descriptive prose — no headers, no bullets, no numbered lists.
5. Skip empty categories entirely.
6. Write with the specificity of a professional photographer's brief: exact colors, materials, distances, textures, numbers.
7. Output the prompt directly — no preamble, no "Here is your prompt", no markdown.
8. One or two dense, descriptive paragraphs. Rich, concrete, visually complete.
9. If the reference image shows relevant details that clarify the notes, incorporate them naturally — but never add details the artist didn't note.
10. The final prompt should be technically precise and production-ready — like a Nano Banana 2 style prompt: specific, layered, immersive.`;

function buildUserMessage(notes: EditNote[], connectedImages: import('../types').BoardImage[] = []): string {
  const grouped = new Map<EditCategoryId, EditNote[]>();
  for (const note of notes) {
    const existing = grouped.get(note.categoryId) || [];
    existing.push(note);
    grouped.set(note.categoryId, existing);
  }

  const sections: string[] = [];

  for (const cat of EDIT_CATEGORIES) {
    const catNotes = grouped.get(cat.id);
    if (!catNotes || catNotes.length === 0) continue;

    const texts = catNotes.map(n => n.text.trim()).filter(t => t.length > 0);

    const extraPrompts = catNotes.flatMap(n =>
      n.checkedPrompts.filter(p => !texts.some(t => t.toLowerCase().includes(p.toLowerCase().split('?')[0].toLowerCase())))
    );

    if (texts.length === 0 && extraPrompts.length === 0) continue;

    let section = `[${cat.label}]\n`;
    if (texts.length > 0) section += texts.join('\n');
    if (extraPrompts.length > 0) section += `\nAdditional aspects: ${extraPrompts.join(', ')}`;
    sections.push(section);
  }

  let message = `My image prompt notes using the 6-Part Formula. Compose them into a single, flowing image generation prompt:\n\n${sections.join('\n\n')}`;

  if (connectedImages.length > 0) {
    const refs = connectedImages.map(img => {
      const name = img.label || img.filename.replace(/\.[^.]+$/, '');
      return `@${name.replace(/[^a-zA-Z0-9_-]/g, '_').replace(/_+/g, '_').replace(/^_|_$/g, '')}`;
    });
    message += `\n\nAvailable supplementary @references (provided as additional images): ${refs.join(', ')}`;
    message += `\nWhen notes mention these @references, extract and incorporate specific visual details from those images.`;
  }

  return message;
}

async function imageToBase64(blobId: string): Promise<string | null> {
  try {
    const blob = await getBlob(blobId);
    if (!blob) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        resolve(result.split(',')[1]);
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

export interface EditPromptResult {
  prompt: string;
  model: string;
  timestamp: number;
  evalResult?: EvalResult;
}

export interface GenerateEditPromptOptions {
  enableSelfEval?: boolean;
  enableBoardContext?: boolean;
  enablePreferences?: boolean;
  projectId?: string;
  preferenceProfile?: PreferenceProfile;
  retryContext?: string;
}

export async function generateEditPrompt(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
  notes: EditNote[],
  connectedImages: import('../types').BoardImage[] = [],
  godModeNodes: GodModeNode[] = [],
  options: GenerateEditPromptOptions = {},
): Promise<EditPromptResult> {
  let userMessage = buildUserMessage(notes, connectedImages);

  const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());
  if (activeGodNodes.length > 0) {
    userMessage += '\n\n[GOD MODE — Apply These Rules to Every Prompt]\n';
    for (const gn of activeGodNodes) {
      userMessage += `• ${gn.title ? `${gn.title}: ` : ''}${gn.text.trim()}\n`;
    }
  }

  if (options.enablePreferences && options.preferenceProfile) {
    const prefBlock = buildPreferenceBlock(options.preferenceProfile);
    if (prefBlock) userMessage += `\n\n${prefBlock}`;
  }

  const primaryImageBase64 = await imageToBase64(blobId);

  const connectedBase64s = await Promise.all(
    connectedImages.map(async (img) => {
      const b64 = await imageToBase64(img.blobId);
      return b64 ? { b64, mime: img.mimeType, label: img.label } : null;
    })
  );
  const validConnected = connectedBase64s.filter(c => c !== null) as { b64: string; mime: string; label?: string }[];

  let systemPrompt = SYSTEM_PROMPT;
  if (options.enableBoardContext && options.projectId) {
    const boardCtx = serializeBoardContext(options.projectId);
    if (boardCtx) systemPrompt += `\n\n${boardCtx}`;
  }

  const messages: Array<{
    role: string;
    content: string | Array<{ type: string; text?: string; image_url?: { url: string } }>;
  }> = [
    { role: 'system', content: systemPrompt },
  ];

  if (primaryImageBase64) {
    const contentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
      {
        type: 'image_url',
        image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${primaryImageBase64}` },
      },
    ];

    for (const conn of validConnected) {
      if (conn.label) {
        contentParts.push({
          type: 'text',
          text: `Supplementary reference (@${conn.label.replace(/\s+/g, '_')}):`,
        });
      }
      contentParts.push({
        type: 'image_url',
        image_url: { url: `data:${conn.mime || 'image/jpeg'};base64,${conn.b64}` },
      });
    }

    contentParts.push({ type: 'text', text: userMessage });

    messages.push({ role: 'user', content: contentParts });
  } else {
    messages.push({ role: 'user', content: userMessage });
  }

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 1024 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const prompt = data.choices?.[0]?.message?.content?.trim() || '';

  if (!prompt) throw new Error('Empty response from model');

  let evalResult: EvalResult | undefined;
  if (options.enableSelfEval && primaryImageBase64) {
    try {
      const brief = buildUserMessage(notes, connectedImages);
      evalResult = await evaluateOutput({
        imageBase64: primaryImageBase64,
        mimeType,
        generatedText: prompt,
        originalBrief: brief,
        apiKey,
        model,
      });
    } catch {
      // Eval failure is non-blocking
    }
  }

  return { prompt, model, timestamp: Date.now(), evalResult };
}
