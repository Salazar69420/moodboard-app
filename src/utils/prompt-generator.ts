import type { CategoryNote, ShotCategoryId, GodModeNode, EvalResult } from '../types';
import { SHOT_CATEGORIES } from '../types';
import { getBlob } from './db-operations';
import { evaluateOutput, buildRetryContext } from './eval-engine';
import { serializeBoardContext } from './board-context';
import { buildPreferenceBlock } from './preference-manager';
import type { PreferenceProfile } from '../types';

const SYSTEM_PROMPT = `You are a precision prompt-writing assistant for AI filmmakers using I2V (image-to-video) generation tools.

Your job: take the filmmaker's raw shot notes and reference image(s), then compose them into a single, authoritative, cinematically-written English prompt.

STRICT RULES:
1. ONLY use information from the notes and what is literally visible in the reference image(s). Never invent, assume, or add details beyond what is provided.
   - The first image is the PRIMARY reference. Additional images are supplementary references (character sheets, style references, etc.) — synthesize accordingly.
   - If notes contain @mentions (e.g. @character_sheet), pull specific visual details from the matching supplementary image.
2. Preserve the filmmaker's exact creative intent. You are a writing tool, not a creative director.
3. Fix grammar, spelling, and phrasing to read naturally and professionally.
4. Write in this canonical order: subject → action → environment → camera movement → lighting → color → texture/look → lens → mood → audio. Weave into flowing prose — no headers, no bullets.
5. Skip empty categories entirely. Do not pad or invent context.
6. Tone: concise, technical, cinematic — like a DP's shot description.
7. Output the prompt directly. No preamble, no "Here is your prompt", no markdown.
8. One to three dense, flowing paragraphs. No lists. No section headers.
9. If a reference image shows details that clarify notes, incorporate them — but never add details the filmmaker didn't note.
10. The "time" category (scene duration) should appear as a natural closing beat: e.g. "The shot runs approximately 4 seconds."`;

function buildUserMessage(notes: CategoryNote[]): string {
  const grouped = new Map<ShotCategoryId, CategoryNote[]>();
  for (const note of notes) {
    const existing = grouped.get(note.categoryId) || [];
    existing.push(note);
    grouped.set(note.categoryId, existing);
  }

  const sections: string[] = [];

  for (const cat of SHOT_CATEGORIES) {
    const catNotes = grouped.get(cat.id);
    if (!catNotes || catNotes.length === 0) continue;

    const texts = catNotes.map(n => n.text.trim()).filter(t => t.length > 0);

    // Include checked prompts that aren't already covered in the text
    const extraPrompts = catNotes.flatMap(n =>
      n.checkedPrompts.filter(p => !texts.some(t => t.toLowerCase().includes(p.toLowerCase().split('?')[0].toLowerCase())))
    );

    if (texts.length === 0 && extraPrompts.length === 0) continue;

    if (cat.id === 'time') {
      if (texts.length > 0) sections.push(`[Scene Duration]\n${texts[0]} seconds`);
    } else {
      let section = `[${cat.label}]\n`;
      if (texts.length > 0) section += texts.join('\n');
      if (extraPrompts.length > 0) section += `\nAdditional elements: ${extraPrompts.join(', ')}`;
      sections.push(section);
    }
  }

  return `My shot notes for this frame. Compose them into a professional I2V prompt:\n\n${sections.join('\n\n')}`;
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

export interface PromptResult {
  prompt: string;
  model: string;
  timestamp: number;
  evalResult?: EvalResult;
}

export interface GeneratePromptOptions {
  enableSelfEval?: boolean;
  enableBoardContext?: boolean;
  enablePreferences?: boolean;
  projectId?: string;
  preferenceProfile?: PreferenceProfile;
  /** If set, this is a retry — inject prior eval critique */
  retryContext?: string;
}

export async function generateThinkingTrace(
  apiKey: string,
  model: string,
  notes: CategoryNote[],
  signal?: AbortSignal,
): Promise<string> {
  const noteSummary = notes
    .filter(n => n.text.trim())
    .map(n => `${n.categoryId}: ${n.text.trim().slice(0, 60)}`)
    .join(', ');

  if (!noteSummary) return '';

  try {
    const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': window.location.origin,
        'X-Title': 'Moodboard App',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'user',
            content: `You are about to generate a cinematic I2V prompt. Given these shot notes:\n${noteSummary}\n\nIn 1-2 sentences, state the 2-3 most important visual elements you will focus on. Be brief and direct.`,
          },
        ],
        temperature: 0,
        max_tokens: 100,
      }),
      signal,
    });
    if (!response.ok) return '';
    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || '';
  } catch {
    return '';
  }
}

export async function generatePrompt(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
  notes: CategoryNote[],
  connectedImages: import('../types').BoardImage[] = [],
  godModeNodes: GodModeNode[] = [],
  options: GeneratePromptOptions = {},
): Promise<PromptResult> {
  let userMessage = buildUserMessage(notes);

  const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());
  if (activeGodNodes.length > 0) {
    userMessage += '\n\n[GOD MODE — Apply These Rules to Every Prompt]\n';
    for (const gn of activeGodNodes) {
      userMessage += `• ${gn.title ? `${gn.title}: ` : ''}${gn.text.trim()}\n`;
    }
  }

  // Preference injection
  if (options.enablePreferences && options.preferenceProfile) {
    const prefBlock = buildPreferenceBlock(options.preferenceProfile);
    if (prefBlock) userMessage += `\n\n${prefBlock}`;
  }

  // Retry context injection
  if (options.retryContext) {
    userMessage = buildRetryContext(userMessage, { status: 'fail', score: 0, critique: '', suggestion: options.retryContext, timestamp: 0 });
  }

  const primaryImageBase64 = await imageToBase64(blobId);

  const connectedBase64s = await Promise.all(
    connectedImages.map(async (img) => {
      const b64 = await imageToBase64(img.blobId);
      return b64 ? { b64, mime: img.mimeType, label: img.label } : null;
    })
  );
  const validConnected = connectedBase64s.filter(c => c !== null) as { b64: string; mime: string; label?: string }[];

  // Board context injection into system prompt
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

  // Self-evaluation
  let evalResult: EvalResult | undefined;
  if (options.enableSelfEval && primaryImageBase64) {
    try {
      const brief = buildUserMessage(notes);
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
