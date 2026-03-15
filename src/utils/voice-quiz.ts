import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../types';

// ─── Category field definitions ──────────────────────────────────────────────

export const CATEGORY_FIELDS: Record<string, string[]> = {
  camera: ['Shot Type', 'Camera Movement', 'Angle', 'Framing', 'Height', 'Stability'],
  subject: ['Who/What', 'Position', 'Body Language', 'Scale', 'Expression', 'Awareness'],
  action: ['What Happens', 'Speed', 'Key Beat', 'Transition'],
  environment: ['Location', 'Time of Day', 'Weather', 'Era'],
  lighting: ['Key Light', 'Quality', 'Color Temp', 'Shadow', 'Practicals'],
  texture: ['Film Look', 'Grain', 'Color Grade', 'VFX'],
  audio: ['Diegetic', 'Score', 'Dialogue', 'Silence'],
  mood: ['Emotional Tone', 'Tension', 'Genre', 'Reference'],
  color: ['Palette', 'Dominant Hues', 'Contrast', 'Grade'],
  lens: ['Focal Length', 'Aperture', 'Distortion', 'Filter'],
  'edit-subject': ['Age/Build', 'Face', 'Hair', 'Clothing'],
  'edit-action': ['What Doing', 'Body Posture', 'Gaze', 'Props'],
  'edit-environment': ['Location', 'Time', 'Background', 'Atmosphere'],
  'edit-art-style': ['Realism', 'Medium', 'Era', 'Grade'],
  'edit-lighting': ['Key Direction', 'Quality', 'Color Temp', 'Shadow'],
  'edit-camera': ['Framing', 'Angle', 'Lens Feel', 'DOF'],
};

export function getCategoryFields(categoryId: string): string[] {
  return CATEGORY_FIELDS[categoryId] || [];
}

export function getCategoryLabel(categoryId: string): string {
  const allCats = [...SHOT_CATEGORIES, ...EDIT_CATEGORIES];
  return allCats.find(c => c.id === categoryId)?.label || categoryId;
}

// ─── Types ───────────────────────────────────────────────────────────────────

export interface QuizMessage {
  role: 'ai' | 'director';
  text: string;
  isLive?: boolean;
}

export interface FilledField {
  fieldId: string;
  fieldLabel: string;
  value: string;
  sourceWords: string;
  wasInferred: boolean;
  wasRejected?: boolean;
}

// ─── API Functions ───────────────────────────────────────────────────────────

export async function analyzeImageForContext(
  openRouterKey: string,
  base64: string,
  mimeType: string,
): Promise<string> {
  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        {
          role: 'system',
          content: 'You are analyzing an image for a film director\'s shot planning tool. Describe what you see in precise visual terms: composition, subjects, lighting, environment, color, atmosphere. Be specific. Use filmmaker language. This description will be used to ask the director targeted questions about their vision for this shot. 3-5 sentences maximum.',
        },
        {
          role: 'user',
          content: [
            { type: 'image_url', image_url: { url: `data:${mimeType};base64,${base64}` } },
            { type: 'text', text: 'Analyze this image for shot planning.' },
          ],
        },
      ],
      temperature: 0.3,
      max_tokens: 300,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Image analysis failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export async function generateNextQuestion(
  openRouterKey: string,
  params: {
    nodeLabel: string;
    imageDescription: string;
    crossNodeContext: string;
    emptyFields: string[];
    messages: QuizMessage[];
    lastAnswerWasConfused: boolean;
  },
): Promise<string> {
  const conversationFormatted = params.messages
    .map(m => `${m.role === 'ai' ? 'AI' : 'DIRECTOR'}: ${m.text}`)
    .join('\n');

  const systemPrompt = `You are a film director's interview assistant for "${params.nodeLabel}".
Extract the director's vision — one short question at a time.

RULES:
1. Ask ONE short question (1–2 sentences max). No preamble, no filler.
2. Offer 2–3 concrete choices when helpful, but keep them brief.
3. NEVER repeat a field you already asked about — read the conversation carefully.
4. If the director already answered a field (even indirectly), mark it resolved and move on.
5. When ALL empty fields are resolved → respond with exactly: COMPLETE
6. Never assume or fill a field without a confirmed director answer.
7. ${params.lastAnswerWasConfused ? 'The director didn\'t understand — rephrase in plain everyday language, no jargon.' : 'Be direct and conversational.'}

IMAGE CONTEXT: ${params.imageDescription}
OTHER NODES: ${params.crossNodeContext}
FIELDS STILL EMPTY: ${params.emptyFields.join(', ')}

${conversationFormatted ? `CONVERSATION:\n${conversationFormatted}` : 'Start with the most visually obvious field.'}`;

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: 'Ask the next question.' },
      ],
      temperature: 0.3,
      max_tokens: 150,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Question generation failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.choices?.[0]?.message?.content?.trim() || '';
}

export async function extractResolvedFields(
  openRouterKey: string,
  messages: QuizMessage[],
  emptyFields: string[],
  allFields: string[],
): Promise<FilledField[]> {
  const conversationFormatted = messages
    .map(m => `${m.role === 'ai' ? 'AI' : 'DIRECTOR'}: ${m.text}`)
    .join('\n');

  const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openRouterKey}`,
      'Content-Type': 'application/json',
      'HTTP-Referer': window.location.origin,
      'X-Title': 'Moodboard App',
    },
    body: JSON.stringify({
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        {
          role: 'system',
          content: `Given this conversation between an AI interviewer and a film director, extract any clearly resolved field values.

ALL POSSIBLE FIELDS: ${allFields.join(', ')}
STILL EMPTY: ${emptyFields.join(', ')}

For each resolved field, return JSON array:
[{ "fieldId": "...", "fieldLabel": "...", "value": "concise cinematic language", "sourceWords": "director's exact words", "wasInferred": false }]

Only include fields the director clearly addressed. wasInferred=true if you had to read between the lines. Return ONLY valid JSON array. If nothing resolved yet, return [].`,
        },
        { role: 'user', content: conversationFormatted },
      ],
      temperature: 0.1,
      max_tokens: 500,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '[]';
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    return JSON.parse(content);
  } catch {
    return [];
  }
}

export async function transcribeAudio(
  openAiKey: string,
  audioBlob: Blob,
): Promise<string> {
  const formData = new FormData();
  formData.append('file', audioBlob, 'recording.webm');
  formData.append('model', 'whisper-1');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
    },
    body: formData,
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`Transcription failed (${response.status}): ${err}`);
  }

  const data = await response.json();
  return data.text || '';
}

export async function speakText(
  openAiKey: string,
  text: string,
): Promise<string> {
  const response = await fetch('https://api.openai.com/v1/audio/speech', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${openAiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      model: 'tts-1',
      input: text,
      voice: 'onyx',
      speed: 0.95,
    }),
  });

  if (!response.ok) {
    const err = await response.text();
    throw new Error(`TTS failed (${response.status}): ${err}`);
  }

  const blob = await response.blob();
  return URL.createObjectURL(blob);
}
