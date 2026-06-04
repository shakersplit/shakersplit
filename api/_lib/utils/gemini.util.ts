/**
 * Shared Gemini Flash REST client. We call the REST API directly (not the
 * @google/generative-ai SDK) because the SDK rejects the newer AQ.Ab* short-lived keys
 * that AI Studio now issues — only the legacy AIzaSy* format is recognized.
 *
 * The REST endpoint accepts both formats and is what the AI Studio quickstart shows.
 *
 * Cost / scale at our level (free tier, 1M tokens/day):
 *   Each parse uses ~450 tokens. 80 users × 3 parses/day = ~110k tokens/day = 11% of free quota.
 *
 * Reliability:
 *   Gemini's structured-output mode is best-effort, not strict. In testing the model
 *   occasionally returned a completely different schema (e.g. mood/sleep when asked for
 *   alcohol). The opts.validate hook lets each call site verify the response shape, and
 *   if it fails we automatically retry ONCE with a stricter system prompt that re-states
 *   the required keys verbatim. Surfaces a friendly error if both attempts fail.
 */
import type { VercelResponse } from '@vercel/node';
import { error } from './response.util';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models/gemini-flash-latest:generateContent';

export interface GeminiSchema {
  type: string;
  properties?: Record<string, unknown>;
  items?: unknown;
  required?: readonly string[];
  enum?: readonly string[];
  description?: string;
}

export interface ParseOptions<T> {
  /** System instruction — sets the persona / formatting rules. */
  systemPrompt: string;
  /** Strict JSON schema Gemini must conform to in its response. */
  responseSchema: GeminiSchema;
  /** The user-provided plain-English description. */
  description: string;
  /** Sampling temperature. Default 0.2 (low randomness for structured tasks). */
  temperature?: number;
  /** Optional post-processor — runs on the parsed JSON before returning. */
  postProcess?: (raw: unknown) => T;
  /**
   * Optional shape validator — runs BEFORE postProcess. If it returns false the call
   * is retried once with a stricter prompt; if the retry also fails we surface a
   * BAD_UPSTREAM error to the caller.
   */
  validate?: (raw: unknown) => boolean;
}

export type ParseOk<T> = { ok: true; data: T };
export type ParseErr = {
  ok: false;
  status: number;
  code: string;
  message: string;
};
export type ParseResult<T> = ParseOk<T> | ParseErr;

/**
 * Internal: a single round-trip to Gemini. Returns the raw parsed JSON or an error.
 */
async function callGemini(
  apiKey: string,
  systemPrompt: string,
  responseSchema: GeminiSchema,
  description: string,
  temperature: number,
): Promise<{ ok: true; raw: unknown } | { ok: false; status: number; code: string; message: string }> {
  const body = {
    systemInstruction: { parts: [{ text: systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: description }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema,
      temperature,
      maxOutputTokens: 1024,
    },
  };

  let res: Response;
  try {
    res = await fetch(ENDPOINT, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-goog-api-key': apiKey },
      body: JSON.stringify(body),
    });
  } catch (err) {
    console.error('[gemini] fetch failed:', err);
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'Could not reach Gemini.' };
  }

  if (!res.ok) {
    const text = await res.text();
    console.error('[gemini] error', res.status, text.slice(0, 500));
    if (res.status === 429) {
      return { ok: false, status: 429, code: 'RATE_LIMITED', message: 'AI parser is busy. Try again in a few seconds, or fill in manually.' };
    }
    if (res.status === 401 || res.status === 403) {
      return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'AI key was rejected. Tell the developer.' };
    }
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: `Gemini returned ${res.status}.` };
  }

  let envelope: {
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
      finishReason?: string;
    }>;
  };
  try {
    envelope = (await res.json()) as typeof envelope;
  } catch {
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'AI returned non-JSON envelope.' };
  }

  const text = envelope.candidates?.[0]?.content?.parts?.[0]?.text;
  if (!text) {
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'AI returned empty response.' };
  }

  let raw: unknown;
  try {
    raw = JSON.parse(text);
  } catch {
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'AI returned malformed JSON.' };
  }

  return { ok: true, raw };
}

/**
 * Public: structured-output parse with a single automatic retry on schema mismatch.
 */
export async function parseWithGemini<T = unknown>(opts: ParseOptions<T>): Promise<ParseResult<T>> {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return {
      ok: false,
      status: 503,
      code: 'SERVICE_UNAVAILABLE',
      message: 'AI parser is not configured on this server. Set GEMINI_API_KEY in Vercel env to enable.',
    };
  }

  const trimmed = opts.description.trim();
  if (!trimmed) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'description is required' };
  }
  if (trimmed.length > 2000) {
    return { ok: false, status: 400, code: 'VALIDATION_ERROR', message: 'description too long (max 2000 chars)' };
  }

  const temperature = opts.temperature ?? 0.2;
  const requiredKeys = opts.responseSchema.required ?? [];

  // Attempt 1: standard prompt.
  const first = await callGemini(apiKey, opts.systemPrompt, opts.responseSchema, trimmed, temperature);
  if (!first.ok) return first;

  // If the caller didn't supply a validator, accept whatever comes back.
  if (!opts.validate || opts.validate(first.raw)) {
    const data = opts.postProcess ? opts.postProcess(first.raw) : (first.raw as T);
    return { ok: true, data };
  }

  // Retry once with a sterner prompt: explicitly re-list the required keys.
  console.warn('[gemini] schema validation failed on first attempt, retrying with stricter prompt');
  const stricterPrompt =
    opts.systemPrompt +
    `\n\nIMPORTANT: Your response MUST be a JSON object with these exact required keys: ` +
    requiredKeys.map((k) => `"${k}"`).join(', ') +
    `. Do not return fields from any other schema. Re-read the user's description carefully and respond with the correct shape.`;

  const second = await callGemini(apiKey, stricterPrompt, opts.responseSchema, trimmed, temperature);
  if (!second.ok) return second;

  if (opts.validate(second.raw)) {
    const data = opts.postProcess ? opts.postProcess(second.raw) : (second.raw as T);
    return { ok: true, data };
  }

  // Both attempts failed schema validation — fall through to a friendly error.
  return {
    ok: false,
    status: 502,
    code: 'BAD_UPSTREAM',
    message:
      'AI returned an unexpected shape twice in a row. Try rephrasing your description, or fill in the form manually.',
  };
}

/**
 * Convenience: send the result of parseWithGemini straight to a Vercel response with our
 * standard success/error shapes. Use this when the handler wraps a single call.
 */
export function respondParseResult<T>(res: VercelResponse, result: ParseResult<T>) {
  if (!result.ok) return error(res, result.status, result.code, result.message);
  return res.status(200).json({ success: true, data: result.data });
}

/**
 * Generic shape validator builder — used by the per-parser handlers. Verifies all keys
 * in `required` exist and (if a `types` map is given) match the expected primitive type.
 */
export function makeShapeValidator<T extends string>(spec: {
  required: T[];
  types?: Partial<Record<T, 'string' | 'number' | 'boolean' | 'array' | 'object'>>;
}): (raw: unknown) => boolean {
  return (raw: unknown): boolean => {
    if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return false;
    const obj = raw as Record<string, unknown>;
    for (const key of spec.required) {
      if (!(key in obj)) return false;
      if (obj[key] === null || obj[key] === undefined) return false;
      const expected = spec.types?.[key];
      if (!expected) continue;
      const actual = obj[key];
      if (expected === 'array') {
        if (!Array.isArray(actual)) return false;
      } else if (expected === 'object') {
        if (typeof actual !== 'object' || Array.isArray(actual)) return false;
      } else if (typeof actual !== expected) {
        return false;
      }
    }
    return true;
  };
}
