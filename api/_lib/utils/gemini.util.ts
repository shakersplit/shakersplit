/**
 * Shared Gemini Flash REST client. We call the REST API directly (not the
 * @google/generative-ai SDK) because the SDK rejects the newer AQ.Ab* short-lived keys
 * that AI Studio now issues — only the legacy AIzaSy* format is recognized.
 *
 * The REST endpoint accepts both formats and is what the AI Studio quickstart shows.
 *
 * Cost / scale at our level (free tier, 1M tokens/day):
 *   Each parse uses ~450 tokens (8 prompt + 17 output + 425 internal "thoughts" with the
 *   Flash model). 80 users × 3 parses/day = ~110k tokens/day = 11% of free quota.
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
 * Call Gemini with a structured-output schema and return the parsed JSON.
 * Returns a discriminated union so callers can pattern-match on success/failure
 * without try/catch.
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

  const body = {
    systemInstruction: { parts: [{ text: opts.systemPrompt }] },
    contents: [{ role: 'user', parts: [{ text: trimmed }] }],
    generationConfig: {
      responseMimeType: 'application/json',
      responseSchema: opts.responseSchema,
      temperature: opts.temperature ?? 0.2,
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

  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    return { ok: false, status: 502, code: 'BAD_UPSTREAM', message: 'AI returned malformed JSON.' };
  }

  const data = opts.postProcess ? opts.postProcess(parsed) : (parsed as T);
  return { ok: true, data };
}

/**
 * Convenience: send the result of parseWithGemini straight to a Vercel response with our
 * standard success/error shapes. Use this when the handler wraps a single call.
 */
export function respondParseResult<T>(res: VercelResponse, result: ParseResult<T>) {
  if (!result.ok) return error(res, result.status, result.code, result.message);
  return res.status(200).json({ success: true, data: result.data });
}
