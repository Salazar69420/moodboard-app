import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../types';
import type { ShotCategoryId, EditCategoryId, GodModeNode } from '../types';
import { getBlob } from './db-operations';

async function imageToBase64(blobId: string): Promise<{ base64: string; mimeType: string } | null> {
  try {
    const blob = await getBlob(blobId);
    if (!blob) return null;
    return new Promise((resolve) => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const result = reader.result as string;
        const [header, base64] = result.split(',');
        const mime = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';
        resolve({ base64, mimeType: mime });
      };
      reader.onerror = () => resolve(null);
      reader.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}

/**
 * Reverse-engineer a single note category from an image (F4).
 * Returns plain text for that one category only.
 * If existingNotes are provided, they act as the director's ground truth —
 * the AI builds on their intent rather than generating from scratch.
 */
export async function reverseEngineerSingleCategory(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
  categoryId: ShotCategoryId | EditCategoryId,
  godModeNodes: GodModeNode[] = [],
  existingNotes?: Record<string, string>,
): Promise<string> {
  const imgData = await imageToBase64(blobId);
  if (!imgData) throw new Error('Could not load image data');

  const i2vCat = SHOT_CATEGORIES.find(c => c.id === categoryId);
  const editCat = EDIT_CATEGORIES.find(c => c.id === categoryId);
  const cat = i2vCat || editCat;
  const catLabel = cat?.label || categoryId;
  const catPrompts = cat?.prompts || [];

  const questionsText = catPrompts.length > 0
    ? `\nAddress these specific questions:\n${catPrompts.map(p => `- ${p}`).join('\n')}`
    : '';

  // Separate existing notes into: the target field vs all other fields
  const allCategories = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
  const filledNotes = existingNotes
    ? Object.entries(existingNotes).filter(([, v]) => v.trim())
    : [];
  const currentFieldText = existingNotes?.[categoryId]?.trim() || '';
  const otherFilledNotes = filledNotes.filter(([k]) => k !== categoryId);
  const hasDirectorContext = filledNotes.length > 0;

  let systemPrompt: string;

  if (hasDirectorContext) {
    // Director has written context — use it as the primary creative source
    const otherNotesFormatted = otherFilledNotes.length > 0
      ? otherFilledNotes.map(([k, v]) => {
          const label = allCategories.find(c => c.id === k)?.label || k;
          return `  • ${label}: ${v}`;
        }).join('\n')
      : '';

    systemPrompt = `You are the director's creative co-pilot. Your job is to write the "${catLabel}" field for this shot.

THE DIRECTOR'S NOTES ARE YOUR GROUND TRUTH. Their vision, tone, and intent come first. The reference image is a secondary visual aid — use it only to fill in details the director hasn't specified.

${otherNotesFormatted ? `DIRECTOR'S ESTABLISHED VISION FOR THIS SHOT:\n${otherNotesFormatted}\n` : ''}${currentFieldText ? `DIRECTOR HAS STARTED THIS FIELD ("${catLabel}"):\n  "${currentFieldText}"\n→ Expand and complete this. Stay in their voice. Do not replace their words — build from them.\n` : `FILL THIS FIELD: "${catLabel}"\n→ Use the image as visual reference, but keep it fully consistent with the director's vision above.\n`}
${questionsText}

RULES:
1. Honor the director's creative direction — never introduce a conflicting vibe, aesthetic, or style
2. Match their tone exactly: if they wrote casually, be casual; if technical, be technical; if poetic, be poetic
3. Use the image to add specific visual detail (lens, light quality, framing) that the director's notes leave open
4. Write in filmmaker's shorthand: concise, specific, actionable
5. No JSON, no markdown, no headers — plain text only for the "${catLabel}" field`;
  } else {
    // No director context — pure image analysis
    systemPrompt = `You are a professional film/image analyst with deep expertise in cinematography, photography, and visual storytelling.

Your task: analyze the provided image and describe ONLY the "${catLabel}" aspect in precise, technical detail.

RULES:
1. Be specific — use exact technical terminology (focal lengths, lighting techniques, color temperatures, etc.)
2. Be comprehensive — answer every dimension of this category
3. Write in filmmaker's shorthand: concise, professional, actionable
4. No JSON, no markdown, no headers, no explanation — just the description
5. If something is ambiguous, make your best professional inference${questionsText}`;
  }

  const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());
  if (activeGodNodes.length > 0) {
    systemPrompt += '\n\nAdditional context:\n';
    for (const gn of activeGodNodes) {
      systemPrompt += `${gn.title ? `${gn.title}: ` : ''}${gn.text.trim()}\n`;
    }
  }

  const userText = hasDirectorContext
    ? `Using the director's notes as your primary reference and the image as visual context, write the "${catLabel}" field. Stay true to their vision and tone. Plain text only.`
    : `Analyze this ${mimeType?.includes('video') ? 'video frame' : 'image'} and describe ONLY the "${catLabel}" aspect. Be specific and technical. Plain text only.`;

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType || imgData.mimeType};base64,${imgData.base64}` },
        },
        {
          type: 'text',
          text: userText,
        },
      ],
    },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 512 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const content = data.choices?.[0]?.message?.content?.trim() || '';
  if (!content) throw new Error('Empty response from model');
  return content;
}

/**
 * Free-form shot description → notes distribution (F1).
 * Accepts optional reference image (blobId) for vision-augmented analysis.
 * AI must attempt to fill ALL categories using both the image and text.
 * Returns: { notes: Record<categoryId, text>, coveredPrompts: Record<categoryId, string[]> }
 */
export interface DistributeResult {
  notes: Record<string, string>;
  coveredPrompts: Record<string, string[]>;
}

export async function distributeFreeFormToNotes(
  apiKey: string,
  model: string,
  freeFormText: string,
  boardMode: 'i2v' | 'edit',
  blobId?: string | null,
  imageMimeType?: string | null,
): Promise<DistributeResult> {
  const categories = boardMode === 'i2v' ? SHOT_CATEGORIES : EDIT_CATEGORIES;

  const categorySpec = categories.map(c => {
    const questionsList = c.prompts.map(p => `    - ${p}`).join('\n');
    return `"${c.id}": {
    // ${c.label}: ${c.placeholder}
    // Questions to address:\n${questionsList}
  }`;
  }).join(',\n  ');

  const systemPrompt = `You are a professional film/photography assistant analyzing a shot description${blobId ? ' and reference image' : ''}.

Your job: distribute the information into ALL note categories below. Use BOTH the${blobId ? ' reference image AND the' : ''} free-form description.

CRITICAL RULES:
1. You MUST provide a value for EVERY category — do not leave any blank or as ""
2. For categories not mentioned in the description: infer from the ${blobId ? 'reference image' : 'context of the description'}
3. For categories mentioned in the description: use that as primary, supplement with visual observations
4. Be specific and technical — use exact terms, not vague descriptors
5. Each value should be 1–3 sentences of professional filmmaker notes
6. Also return "coveredPrompts": for each category, list which checklist questions you answered
7. Output ONLY valid JSON — no markdown fences, no explanation

Required output format:
{
  "notes": {
    ${categorySpec.replace(/\/\/ .+\n    \/\/ Questions to address:\n(    - .+\n)*/g, '')}
  },
  "coveredPrompts": {
    ${categories.map(c => `"${c.id}": [${c.prompts.map(p => `"${p}"`).join(', ')}]`).join(',\n    ')}
  }
}

For "coveredPrompts", include ONLY the questions you actually answered. Leave the array empty [] if you couldn't address any questions for that category.`;

  const userContentParts: Array<{ type: string; text?: string; image_url?: { url: string } }> = [];

  // Include reference image if provided
  let imgData: { base64: string; mimeType: string } | null = null;
  if (blobId) {
    imgData = await imageToBase64(blobId);
    if (imgData) {
      userContentParts.push({
        type: 'image_url',
        image_url: { url: `data:${imageMimeType || imgData.mimeType};base64,${imgData.base64}` },
      });
    }
  }

  userContentParts.push({
    type: 'text',
    text: `Free-form shot description:\n"${freeFormText}"\n\nAnalyze${imgData ? ' the reference image above AND' : ''} this description. Fill ALL ${categories.length} note categories. Return the complete JSON object.`,
  });

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: imgData ? userContentParts : userContentParts[userContentParts.length - 1].text,
    },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 3072 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const parsed = JSON.parse(content);

    // Handle both new format { notes, coveredPrompts } and legacy format (flat record)
    if (parsed.notes && typeof parsed.notes === 'object') {
      return {
        notes: parsed.notes as Record<string, string>,
        coveredPrompts: (parsed.coveredPrompts as Record<string, string[]>) || {},
      };
    }

    // Legacy flat format fallback
    const notes: Record<string, string> = {};
    const coveredPrompts: Record<string, string[]> = {};
    for (const cat of categories) {
      if (parsed[cat.id] && typeof parsed[cat.id] === 'string') {
        notes[cat.id] = parsed[cat.id];
        coveredPrompts[cat.id] = cat.prompts; // assume all covered if text exists
      }
    }
    return { notes, coveredPrompts };
  } catch {
    throw new Error('Failed to parse AI response as JSON: ' + content.substring(0, 200));
  }
}

/**
 * Generate an AI name for an image (F6).
 */
export async function generateImageName(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
): Promise<string> {
  const imgData = await imageToBase64(blobId);
  if (!imgData) throw new Error('Could not load image data');

  const messages = [
    {
      role: 'system',
      content: 'You are a film director naming shots for a storyboard. Name this image in exactly 2–3 words. Use title case. Be cinematic and evocative — capture the emotion or essence, not just the literal content. Examples: "Dawn Chase", "Neon Alley", "Final Goodbye", "Quiet Collapse", "Golden Hour Pursuit". Return ONLY the 2–3 words. Nothing else.',
    },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType || imgData.mimeType};base64,${imgData.base64}` },
        },
        { type: 'text', text: 'Name this shot in 2–3 words.' },
      ],
    },
  ];

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({ model, messages, temperature: 0.8, max_tokens: 32 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  const name = data.choices?.[0]?.message?.content?.trim() || '';
  if (!name) throw new Error('Empty response');
  return name.replace(/^["']+|["']+$/g, '').replace(/\.$/g, '').trim();
}

/**
 * Generate session recap (F5).
 */
export async function generateSessionRecap(
  apiKey: string,
  model: string,
  metadata: {
    totalImages: number;
    imagesWithNoNotes: number;
    imagesWithNotesNoPrompt: number;
    imagesWithOutdatedPrompts: number;
    imageNames: string[];
    lastUpdated: number;
  },
): Promise<string> {
  const systemPrompt = `You are a film director's assistant — warm, precise, and creatively attuned. Given project metadata, write exactly ONE paragraph (max 3 sentences) briefing the director on where they left off. Be specific, use shot names if available, and end with what needs attention next. No markdown, no formatting, no preamble.`;

  const userMessage = `Project snapshot:
- ${metadata.totalImages} total shots
- ${metadata.imagesWithNoNotes} shots have no notes yet
- ${metadata.imagesWithNotesNoPrompt} shots have notes but no generated prompt
- ${metadata.imagesWithOutdatedPrompts} shots have prompts that are outdated
- Shot names: ${metadata.imageNames.length > 0 ? metadata.imageNames.slice(0, 8).join(', ') : 'mostly unnamed'}
- Last worked on: ${new Date(metadata.lastUpdated).toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;

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
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: 0.7,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}
