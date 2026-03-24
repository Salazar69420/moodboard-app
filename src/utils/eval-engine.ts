import type { EvalResult } from '../types';

const EVAL_SYSTEM_PROMPT = `You are a precise visual quality evaluator for AI-generated creative prompts and image analysis.

Given an image, the generated text output (prompt or analysis), and the original context, evaluate the output quality.

Respond ONLY with valid JSON in this exact format:
{
  "status": "pass" or "fail",
  "score": <integer 0-100>,
  "critique": "<one sentence explaining the main issue, or empty string if pass>",
  "suggestion": "<one sentence improvement direction for a retry, or empty string if pass>"
}

Evaluation criteria:
- Does the output accurately describe/reflect what is actually visible in the image?
- Is the language precise, professional, and cinematically appropriate?
- Are the details specific and actionable (not vague or generic)?
- Is it consistent with the brief/notes provided?
- Is it free from hallucinated elements not present in the image?

Score 75+ = pass. Score below 75 = fail.
Do not include any text outside the JSON object.`;

export interface EvalInput {
  imageBase64: string;
  mimeType: string;
  generatedText: string;
  originalBrief: string;
  apiKey: string;
  model: string;
}

export async function evaluateOutput(input: EvalInput): Promise<EvalResult> {
  const { imageBase64, mimeType, generatedText, originalBrief, apiKey, model } = input;

  const userContent: Array<{ type: string; text?: string; image_url?: { url: string } }> = [
    {
      type: 'image_url',
      image_url: { url: `data:${mimeType || 'image/jpeg'};base64,${imageBase64}` },
    },
    {
      type: 'text',
      text: `Original brief / notes:\n${originalBrief}\n\n---\n\nGenerated output to evaluate:\n${generatedText}`,
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
    body: JSON.stringify({
      model,
      messages: [
        { role: 'system', content: EVAL_SYSTEM_PROMPT },
        { role: 'user', content: userContent },
      ],
      temperature: 0.1,
      max_tokens: 256,
    }),
  });

  if (!response.ok) {
    // If eval fails, return a neutral pass so generation still succeeds
    return { status: 'pass', score: 70, critique: '', suggestion: '', timestamp: Date.now() };
  }

  const data = await response.json();
  const raw = data.choices?.[0]?.message?.content?.trim() || '';

  try {
    // Extract JSON even if surrounded by markdown code fences
    const jsonMatch = raw.match(/\{[\s\S]*\}/);
    if (!jsonMatch) throw new Error('No JSON found');
    const parsed = JSON.parse(jsonMatch[0]);
    return {
      status: parsed.status === 'fail' ? 'fail' : 'pass',
      score: Math.max(0, Math.min(100, parseInt(parsed.score) || 70)),
      critique: parsed.critique || '',
      suggestion: parsed.suggestion || '',
      timestamp: Date.now(),
    };
  } catch {
    return { status: 'pass', score: 70, critique: '', suggestion: '', timestamp: Date.now() };
  }
}

/**
 * Build a retry prompt by prepending eval critique to the original brief.
 */
export function buildRetryContext(originalBrief: string, evalResult: EvalResult): string {
  if (!evalResult.critique && !evalResult.suggestion) return originalBrief;
  const corrections: string[] = [];
  if (evalResult.critique) corrections.push(`Previous attempt issue: ${evalResult.critique}`);
  if (evalResult.suggestion) corrections.push(`Improvement direction: ${evalResult.suggestion}`);
  return `${originalBrief}\n\n[Retry Guidance]\n${corrections.join('\n')}`;
}
