import type { FilledField } from './voice-quiz';

/**
 * Extracts only explicitly described fields from a director's free-form monologue.
 * STRICT MODE: Never fills a field the director didn't clearly mention.
 */
export async function extractFromMonologue(
  openRouterKey: string,
  transcript: string,
  fields: { id: string; label: string }[],
  imageDescription: string,
): Promise<FilledField[]> {
  const fieldList = fields.map(f => f.label).join(', ');

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
          content: `You are extracting what a film director described in their free-form monologue about a shot.

IMAGE CONTEXT: ${imageDescription}

AVAILABLE FIELDS: ${fieldList}

STRICT RULES — READ CAREFULLY:
- ONLY fill fields the director EXPLICITLY described in their words.
- If the director did not clearly mention a field, DO NOT include it in the output. Skip it entirely.
- NEVER invent, infer, or guess values for fields that were not mentioned.
- wasInferred MUST always be false. If you cannot find an explicit value directly from the director's words, do not include that field.
- sourceWords MUST be a direct quote from the transcript — the exact words the director said that led to this value.
- value should be polished for professional shot notes: concise, technical, and specific.
- fieldId should be the field label in kebab-case (e.g. "Shot Type" → "shot-type").

Return a JSON array containing ONLY the fields the director explicitly described:
[{ "fieldId": "field-label-kebab", "fieldLabel": "Field Label", "value": "polished cinematic value", "sourceWords": "director's exact words", "wasInferred": false }]

Return ONLY valid JSON. No markdown, no explanation, no preamble. If the director described nothing relevant, return [].`,
        },
        {
          role: 'user',
          content: `Director's monologue:\n"${transcript}"`,
        },
      ],
      temperature: 0.1,
      max_tokens: 600,
    }),
  });

  if (!response.ok) return [];

  const data = await response.json();
  let content = data.choices?.[0]?.message?.content?.trim() || '[]';
  content = content.replace(/^```(?:json)?\s*\n?/i, '').replace(/\n?```\s*$/i, '');

  try {
    const parsed = JSON.parse(content);
    if (!Array.isArray(parsed)) return [];
    return parsed.map((f: FilledField) => ({
      ...f,
      wasInferred: false,
      wasRejected: false,
      isConfirmedByDirector: true, // monologue fields are director-owned by definition
    }));
  } catch {
    return [];
  }
}
