import type { GodModeNode } from '../types';
import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../types';
import { getBlob } from './db-operations';

// ─── I2V System Prompt ──────────────────────────────────────────────────────

const I2V_SYSTEM_PROMPT = `You are an expert cinematographer and film analyst. Your job is to reverse-engineer the shot notes a director would write for this image or video frame, as if preparing an I2V (image-to-video) generation prompt.

RULES:
1. Analyze the image with the eyes of a DP (Director of Photography). Be specific, technical, and professional.
2. You MUST fill EVERY field. If you cannot observe something directly, make a confident professional inference based on context clues.
3. Use exact technical terminology: focal lengths (e.g. "85mm equivalent"), lighting styles (e.g. "Rembrandt lighting", "split lighting"), color grading references (e.g. "desaturated teal-orange grade"), etc.
4. "time" should be your estimate of how long this shot would run in a film — think about the action and pacing. Provide a number of seconds as a string.
5. Output ONLY valid JSON. No markdown, no explanation, no code fences.

Output exactly this JSON structure (all string values):
{
  "camera": "shot type + framing (e.g. MCU, wide), camera movement (e.g. slow push, handheld), angle (e.g. low angle, eye level), stabilization feel",
  "subject": "who/what is primary subject, physical description, pose, expression, wardrobe/costume details, relationship to camera",
  "action": "exactly what is happening, movement speed/pacing, physical beats, emotional arc of the moment",
  "environment": "location type, interior/exterior, time of day, weather conditions, era/period, specific set details",
  "lighting": "key light source, quality (hard/soft/diffuse), color temperature (warm/cool/mixed), practicals visible, shadow depth, overall exposure feel",
  "texture": "film stock feel or digital look, grain presence, sharpness vs softness, anamorphic traits, color grade reference",
  "audio": "implied ambient sounds, score style or genre, dialogue presence, sound design elements that would accompany this shot",
  "mood": "emotional tone, psychological register, tension level, genre conventions evoked, audience feeling",
  "color": "dominant palette (2–4 colors), contrast level, saturation, color relationships, any color story or symbolism",
  "lens": "estimated focal length, apparent aperture/depth of field, distortion characteristics, any filtration effects",
  "time": "estimated scene duration in seconds (write a number as a string, e.g. '4')"
}`;

// ─── Edit System Prompt ─────────────────────────────────────────────────────

const EDIT_SYSTEM_PROMPT = `You are an expert photographer, art director, and image analyst. Your job is to reverse-engineer the shot notes an artist would write for this image, following the 6-Part Prompt Formula used for AI image generation (Flux, Midjourney, DALL-E, etc.).

RULES:
1. Analyze the image with the precision of a commercial photographer briefing a team. Every detail matters.
2. You MUST fill EVERY field. If you cannot observe something directly, make a confident professional inference.
3. Use specific, concrete language: exact colors (not "blue" but "deep cobalt"), specific materials, precise spatial relationships.
4. Output ONLY valid JSON. No markdown, no explanation, no code fences.

Output exactly this JSON structure (all string values):
{
  "edit-subject": "age range, gender presentation, build, skin tone, hair (color, length, style), facial features, clothing (specific garments, colors, materials, fit), accessories",
  "edit-action": "what the subject is doing, posture, body language, gaze direction, expression, any props being used or interacted with",
  "edit-environment": "specific location type, background elements, surface textures, architectural details, time of day, seasonal cues, atmosphere",
  "edit-art-style": "photorealistic vs stylized, film or digital feel, editorial style (fashion/documentary/fine art), era references, visual inspiration",
  "edit-lighting": "key light direction and quality (hard/soft), color temperature, fill light ratio, shadows, practical light sources visible, overall exposure",
  "edit-camera": "framing/shot size (portrait/half-body/full), camera angle, estimated focal length, depth of field/bokeh, any lens effects"
}`;

// ─── Helpers ────────────────────────────────────────────────────────────────

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

export interface ReverseEngineerResult {
  notes: Record<string, string>;
  model: string;
  timestamp: number;
}

// ─── I2V Reverse Engineer ───────────────────────────────────────────────────

export async function reverseEngineerI2V(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
  godModeNodes: GodModeNode[] = [],
): Promise<ReverseEngineerResult> {
  const imageBase64 = await imageToBase64(blobId);
  if (!imageBase64) throw new Error('Could not load image data');

  let systemPrompt = I2V_SYSTEM_PROMPT;
  const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());
  if (activeGodNodes.length > 0) {
    systemPrompt += '\n\nDirector\'s God Mode context (apply these rules to your analysis):\n';
    for (const gn of activeGodNodes) {
      systemPrompt += `• ${gn.title ? `${gn.title}: ` : ''}${gn.text.trim()}\n`;
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
        },
        {
          type: 'text',
          text: `Reverse-engineer the I2V shot notes for this ${mimeType?.includes('video') ? 'video frame' : 'image'}. Fill every field with specific, technical observations. Output ONLY valid JSON.`,
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
    body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 2048 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const notes = JSON.parse(content);
    // Ensure all expected keys exist
    for (const cat of SHOT_CATEGORIES) {
      if (!(cat.id in notes) || !notes[cat.id]) {
        notes[cat.id] = '';
      }
    }
    return { notes, model, timestamp: Date.now() };
  } catch {
    throw new Error('Failed to parse AI response as JSON. Response: ' + content.substring(0, 300));
  }
}

// ─── Edit Reverse Engineer ──────────────────────────────────────────────────

export async function reverseEngineerEdit(
  apiKey: string,
  model: string,
  blobId: string,
  mimeType: string,
  godModeNodes: GodModeNode[] = [],
): Promise<ReverseEngineerResult> {
  const imageBase64 = await imageToBase64(blobId);
  if (!imageBase64) throw new Error('Could not load image data');

  let systemPrompt = EDIT_SYSTEM_PROMPT;
  const activeGodNodes = godModeNodes.filter(g => g.isEnabled && g.text.trim());
  if (activeGodNodes.length > 0) {
    systemPrompt += '\n\nArtist\'s God Mode context (apply these rules to your analysis):\n';
    for (const gn of activeGodNodes) {
      systemPrompt += `• ${gn.title ? `${gn.title}: ` : ''}${gn.text.trim()}\n`;
    }
  }

  const messages = [
    { role: 'system', content: systemPrompt },
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
        },
        {
          type: 'text',
          text: 'Reverse-engineer the 6-Part Prompt Formula notes for this image. Fill every field with specific, technical observations. Output ONLY valid JSON.',
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
    body: JSON.stringify({ model, messages, temperature: 0.25, max_tokens: 2048 }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`API Error (${response.status}): ${err}`);
  }

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '';
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const notes = JSON.parse(content);
    for (const cat of EDIT_CATEGORIES) {
      if (!(cat.id in notes) || !notes[cat.id]) {
        notes[cat.id] = '';
      }
    }
    return { notes, model, timestamp: Date.now() };
  } catch {
    throw new Error('Failed to parse AI response as JSON. Response: ' + content.substring(0, 300));
  }
}
