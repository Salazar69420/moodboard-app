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
          content: `You are a creative assistant analyzing a reference image for a film director's shot planner.
Describe what you see in 3-4 concise sentences. Focus on what matters for recreating this shot:
- Subject (who/what, position, expression, wardrobe)
- Composition (framing, angle, depth)
- Lighting (direction, quality, color)
- Mood (atmosphere, palette, energy)
Use specific visual language. This description helps ask the director smart questions about their vision.`,
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

  const systemPrompt = `You are a friendly, sharp creative collaborator helping a film director plan the "${params.nodeLabel}" aspect of their shot. You're like a trusted AD who keeps things moving and gets the director's intent on the first try.

YOUR STYLE:
- Warm, quick, fun. Like a creative jam session, not an interrogation.
- ONE question only. Keep it to 1 sentence. Be specific to what you see in the image.
- Give 2-3 options pulled from the actual image when it helps — "the cold blue tones or something warmer?" not generic film school options.
- Accept ANY answer — even one-word or vague answers. If they say "yeah that" or "keep it as is", that's a valid answer. Move on.
- Reference the image directly: "I see the snow falling…", "With the character standing center frame…"

ABSOLUTE RULES:
- ${params.emptyFields.length === 0 ? 'ALL fields are filled. Respond with exactly: COMPLETE' : `Ask about the NEXT empty field: "${params.emptyFields[0]}". Do NOT ask about any other field.`}
- NEVER ask about a field that isn't in the EMPTY list below.
- NEVER repeat or rephrase a question you already asked.
- When no empty fields remain → respond with exactly: COMPLETE
- ${params.lastAnswerWasConfused ? 'Last answer was confused — rephrase super simply, no film jargon at all.' : ''}

IMAGE: ${params.imageDescription}
${params.crossNodeContext !== 'No other nodes filled yet.' ? `ALREADY DECIDED:\n${params.crossNodeContext}` : ''}
EMPTY FIELDS: ${params.emptyFields.join(', ') || 'NONE — say COMPLETE'}

${conversationFormatted ? `CONVERSATION:\n${conversationFormatted}` : ''}`;

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
          content: `Extract field values from this director interview. Be AGGRESSIVE — if the director gave any kind of answer (even vague, one-word, or "keep it as is"), extract it.

FIELDS: ${allFields.join(', ')}
STILL EMPTY: ${emptyFields.join(', ')}

EXTRACTION RULES:
- "yeah that", "keep it", "as is", "like the reference" → extract using what the AI described in its question as the value
- "I want X" → extract X directly
- One-word answers ("centered", "static", "warm") → that's the value
- Indirect answers ("it's anime", "like a Wes Anderson film") → extract as-is, set wasInferred: true
- ALWAYS try to extract something. Only return [] if the director literally said nothing useful.

Return JSON array only:
[{ "fieldId": "field-name-kebab", "fieldLabel": "Field Name", "value": "short cinematic description for shot notes", "sourceWords": "director's words", "wasInferred": false }]

"value" should be polished for shot notes — concise, specific, professional.
"sourceWords" should be the director's actual words.
Return ONLY valid JSON. No markdown, no explanation.`,
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
