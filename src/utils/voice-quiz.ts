import { SHOT_CATEGORIES, EDIT_CATEGORIES } from '../types';

// ─── Category field definitions ──────────────────────────────────────────────

export const CATEGORY_FIELDS: Record<string, string[]> = {
  // ── Shot node categories ──────────────────────────────────────────────────
  camera: [
    'Shot Type',          // ECU, CU, MCU, MS, LS, ELS, OTS, POV…
    'Camera Movement',    // static, dolly, pan, tilt, tracking, crane, handheld, aerial…
    'Angle',              // eye-level, high angle, low angle, bird's eye, worm's eye, dutch
    'Framing',            // rule of thirds, centered, negative space, foreground elements
    'Camera Height',      // ground, waist, eye, elevated, overhead
    'Stability',          // locked off, handheld, gimbal, drone, shoulder rig
    'Shot Duration',      // quick cut, extended hold, slow reveal, breathing room
    'Follow Style',       // leads subject, lags, pushes in, pulls back, orbits
  ],
  subject: [
    'Who / What',         // person, object, animal, group, concept
    'Position in Frame',  // left, center, right, extreme foreground, background
    'Scale in Frame',     // dominant, small, microscopic, environmental
    'Body Language',      // tense, relaxed, aggressive, vulnerable, open
    'Expression',         // neutral, joy, grief, fear, stoic, intense
    'Subject Awareness',  // aware of camera, unaware, direct address
    'Wardrobe / Texture', // colors, formality, condition, cultural cues
    'Number of Subjects', // solo, duo, group, crowd
    'Physical Interaction', // touching, separate, confronting, embracing
    'Subject Relationship', // power dynamic, intimacy, stranger, familiar
  ],
  action: [
    'What Happens',       // core action described briefly
    'Speed / Pacing',     // slow motion, real time, time-lapse, overcranked
    'Key Dramatic Beat',  // the single most important moment in the shot
    'Entry / Exit',       // how subject enters and leaves frame
    'Physicality',        // subtle, explosive, mechanical, organic, choreographed
    'Motivation',         // why the action is happening (emotional driver)
    'Reaction',           // secondary subject's response to the action
    'Transition Type',    // cut, match cut, wipe, dissolve, smash cut
  ],
  environment: [
    'Location Type',      // interior, exterior, studio, nature, urban, surreal
    'Time of Day',        // dawn, morning, noon, golden hour, blue hour, night
    'Weather / Season',   // clear, overcast, rain, snow, fog, heat haze
    'Era / Period',       // contemporary, historical decade, futuristic, timeless
    'Architecture / Set', // style, condition, scale, materials
    'Foreground Elements', // what sits between camera and subject
    'Background Depth',   // flat wall, shallow depth, deep vista, infinity
    'Space Scale',        // claustrophobic, intimate, expansive, epic
  ],
  lighting: [
    'Key Light Direction', // front, side, 3/4, back, top, under
    'Light Quality',       // hard (sharp shadows), soft (wrapped), diffused, bare bulb
    'Color Temperature',   // warm tungsten, neutral daylight, cold blue, mixed
    'Shadow Depth',        // deep noir shadows, mid fill, flat even, no shadow
    'Practical Lights',    // lamps, screens, neon, fire, candles, windows
    'Fill Ratio',          // high contrast 8:1, cinematic 4:1, flat 1:1
    'Backlight / Rim',     // strong separation, subtle halo, none, kino glow
    'Motivated Source',    // where the light believably comes from in the world
    'Atmosphere',          // haze, fog machine, smoke, dust particles, clean
    'Special Effects',     // strobes, lightning, practical fire, LED interactive
  ],
  texture: [
    'Film Stock / Look',   // 35mm, 16mm, super8, digital clean, analog warmth
    'Grain Level',         // none, subtle, medium, heavy, extreme
    'Color Grade Style',   // bleach bypass, teal-orange, desaturated, vibrant, monochrome
    'Saturation',          // fully desaturated, muted, natural, punchy, hyper-real
    'Contrast Style',      // flat, low, balanced, high, crushed blacks
    'Lens Aberration',     // clean, subtle halation, heavy CA, vignette, anamorphic streak
    'VFX / Overlay',       // clean plate, grain overlay, scan lines, light leaks, none
    'Print Effect',        // telecine, cross process, day for night, push process
  ],
  audio: [
    'Diegetic Sound',      // ambient on-set sound — traffic, wind, crowd, silence
    'Score / Music',       // orchestral, electronic, sparse, atonal, diegetic source
    'Dialogue Treatment',  // natural, ADR clean, muffled, echo, voiceover
    'Sound Design',        // hyper-real foley, minimalist, designed texture, abstract
    'Ambience',            // room tone, nature, city, void-like silence
    'Mix Perspective',     // intimate close mic, distant, submerged, god-like
    'Silence / Pause',     // used for tension, breath, grief, impact
  ],
  mood: [
    'Emotional Tone',      // joyful, melancholic, tense, serene, ominous, euphoric
    'Tension Level',       // relaxed, simmering, building, peak, release
    'Genre Feel',          // noir, horror, drama, action, romance, thriller, sci-fi
    'Cinematic Reference', // director / film style the shot is inspired by
    'Pacing Feel',         // languid, urgent, contemplative, frenetic, rhythmic
    'Viewer Relationship', // voyeur, participant, god, intimate, distanced
    'Subtext',             // what the shot means beneath the surface
  ],
  color: [
    'Primary Palette',     // dominant color family across the whole shot
    'Dominant Hues',       // specific hero colors — teal, amber, crimson…
    'Accent Colors',       // pop colors used to draw focus
    'Contrast Level',      // low contrast muted, balanced, high contrast punchy
    'Color Grade Style',   // filmic, clean digital, vintage, monochromatic, split-tone
    'Skin Tone Treatment', // warm, cool, desaturated, left natural, theatrical
    'Environment Color',   // background / set color tone
    'Symbolic Color',      // any color used with intentional story meaning
  ],
  lens: [
    'Focal Length',        // ultra wide 12mm, wide 24mm, normal 50mm, portrait 85mm, tele 135mm+
    'Aperture / Bokeh',    // deep focus f/11, cinematic f/2.8, full bokeh f/1.2
    'Distortion Type',     // barrel, pincushion, anamorphic oval, rectilinear clean
    'Filter / Glass',      // diffusion, pro-mist, polarizer, IR, vintage coating
    'Anamorphic Look',     // horizontal flares, oval bokeh, cinemascope bars, none
    'Depth of Field',      // deep focus, shallow, mid, rack focus point
    'Chromatic Aberration', // none, subtle fringing, heavy vintage, intentional
    'Flare Style',         // lens flare direction, color, intensity, none
  ],

  // ── Edit node categories ──────────────────────────────────────────────────
  'edit-subject': [
    'Age / Build',         // young/old, lean/heavy, athletic, frail
    'Facial Features',     // sharp, soft, symmetrical, weathered, distinctive
    'Hair Style',          // length, color, texture, styled vs natural
    'Clothing / Wardrobe', // style, color, condition, cultural significance
    'Skin / Complexion',   // tone, texture, scars, makeup, natural
    'Body Type',           // proportions, posture default, visual weight
    'Accessories',         // jewelry, glasses, hat, bag, weapon, tool
    'Distinguishing Mark', // tattoo, scar, birthmark, prosthetic, unique feature
  ],
  'edit-action': [
    'Current Activity',    // what the subject is actively doing
    'Body Posture',        // upright, slouched, aggressive, open, guarded
    'Gaze Direction',      // direct to camera, off-frame left/right, downward, upward
    'Props / Objects',     // items held or interacted with
    'Hand Position',       // relaxed, fists, clasped, reaching, hidden
    'Movement Quality',    // fluid, mechanical, hesitant, explosive, still
    'Micro Expressions',   // subtle emotional tells in face/body
    'Physical State',      // rested, exhausted, injured, heightened, calm
  ],
  'edit-environment': [
    'Location / Setting',  // specific place type and context
    'Time of Day',         // light quality hint — dawn, midday, dusk, night
    'Background Detail',   // busy, sparse, symbolic, blurred, in focus
    'Atmospheric Quality', // hazy, crisp, moody, dreamlike, hyper-real
    'Ground / Surface',    // what the subject stands/sits on
    'Horizon Line',        // where and whether the horizon sits in frame
    'Environmental Story', // what the environment tells us about the subject
  ],
  'edit-art-style': [
    'Realism Level',       // photorealistic, stylized, painterly, abstract, graphic
    'Art Medium / Style',  // oil painting, watercolor, pencil sketch, digital, collage
    'Historical Era',      // Renaissance, Baroque, Art Nouveau, mid-century modern, contemporary
    'Color Grade',         // how color is treated artistically
    'Texture Style',       // smooth, textured, rough, layered, clean
    'Cultural Aesthetic',  // Japanese woodblock, European classical, African, Latin, etc.
    'Influence / Reference', // specific artist, art movement, or film visual style
  ],
  'edit-lighting': [
    'Key Light Direction', // where the primary light source hits
    'Light Quality',       // hard, soft, diffused, directional, ambient
    'Color Temperature',   // warm, neutral, cool, mixed, dramatic split
    'Shadow Treatment',    // deep shadows, mid-fill, flat even, side rim
    'Specular / Highlights', // blown out, controlled, metallic, skin sheen
    'Ambient Fill',        // strong environment bounce, low fill, none
    'Atmospheric Glow',    // haze, mist, aura, god rays, none
  ],
  'edit-camera': [
    'Framing / Composition', // how the subject is placed in the image
    'Camera Angle',         // straight on, high, low, dutch, extreme
    'Lens Focal Feel',      // wide environment, normal portrait, compressed tele
    'Depth of Field',       // what is sharp vs blurred in the image
    'Bokeh Quality',        // creamy, swirly, busy, hexagonal, oval anamorphic
    'Camera Tilt / Dutch',  // level, slight cant, strong dutch angle
    'Distance from Subject', // extreme close, close, medium, wide, establishing
  ],
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
- CRITICAL: Directors often answer MULTIPLE fields in one response. Extract EVERY field you can find evidence for across ALL empty fields — not just the field the AI asked about.
- "yeah that", "keep it", "as is", "like the reference" → extract using what the AI described in its question as the value
- "I want X" → extract X directly
- One-word answers ("centered", "static", "warm") → that's the value
- Indirect answers ("it's anime", "like a Wes Anderson film") → extract as-is, set wasInferred: true
- If the director says "wide shot", extract Shot Type. If they also say "centered", extract Framing. If they say "doesn't move" or "still", extract Camera Movement as "static / locked off". Grab everything.
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
