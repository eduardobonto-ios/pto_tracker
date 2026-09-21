// Shared CORS handling for the Edge Functions the browser calls directly.
//
// Without this the browser's preflight OPTIONS request reaches a handler that
// expects a JSON body, throws, and returns 500 with no Access-Control-* headers
// — so the real request is never sent and the failure is invisible to curl,
// which doesn't preflight. Every browser-invoked function needs both halves:
// an OPTIONS short-circuit and these headers on every response it returns.
//
// Allow-Origin is '*' because these functions require a valid Supabase JWT in
// an Authorization header. A browser will not attach that header to a
// cross-origin request on another site's behalf, so a wildcard origin does not
// expose anything an unauthenticated caller could not already request directly.
// It also keeps localhost development working without a second deploy target.

export const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
} as const;

export const JSON_HEADERS = { ...CORS_HEADERS, 'Content-Type': 'application/json' };

/** Answer a preflight. Returns null for any other method, so callers continue. */
export function handlePreflight(req: Request): Response | null {
  return req.method === 'OPTIONS' ? new Response('ok', { headers: CORS_HEADERS }) : null;
}
