// One Deno process hosting all three Edge Functions, for Azure Container Apps.
//
// Supabase gives every function its own isolate and routes by the first path
// segment under /functions/v1/. There is no such router off-platform, so this
// provides one.
//
// The function sources are imported UNCHANGED. Each calls `Deno.serve(handler)`
// at module scope, so `Deno.serve` is swapped for a collector while they load
// and restored afterwards. That keeps supabase/functions/* byte-identical and
// still deployable to Supabase, which matters while both stacks run in
// parallel — the alternative, editing each file to export its handler, would
// fork them.
//
// Auth: Supabase verified the caller's JWT before invoking a function unless it
// was deployed with --no-verify-jwt. Kong does not do that, so it is done here,
// preserving the original posture exactly:
//   read-org-calendar, sync-pto-calendar  -> JWT required
//   pto-calendar-feed                     -> open; Outlook cannot send a header,
//                                            its token in the path is the secret
import { CORS_HEADERS } from '../../supabase/functions/_shared/cors.ts';

type Handler = (req: Request) => Response | Promise<Response>;

const handlers = new Map<string, Handler>();
let loading = '';

const realServe = Deno.serve;
// deno-lint-ignore no-explicit-any
(Deno as any).serve = (a: any, b?: any) => {
  const h = typeof a === 'function' ? a : (b ?? a?.handler);
  handlers.set(loading, h as Handler);
  // Satisfy the Deno.HttpServer shape; nothing awaits it.
  return { finished: Promise.resolve(), shutdown: () => Promise.resolve(), ref() {}, unref() {} };
};

for (const name of ['read-org-calendar', 'sync-pto-calendar', 'pto-calendar-feed']) {
  loading = name;
  await import(`../../supabase/functions/${name}/index.ts`);
}
// deno-lint-ignore no-explicit-any
(Deno as any).serve = realServe;

const OPEN = new Set(['pto-calendar-feed']);
const encoder = new TextEncoder();

function b64urlToBytes(s: string): Uint8Array {
  const pad = s.replace(/-/g, '+').replace(/_/g, '/');
  return Uint8Array.from(atob(pad + '='.repeat((4 - (pad.length % 4)) % 4)), (c) => c.charCodeAt(0));
}

/** HS256 verification against the same secret PostgREST uses. */
async function jwtValid(token: string, secret: string): Promise<boolean> {
  const parts = token.split('.');
  if (parts.length !== 3) return false;
  try {
    const key = await crypto.subtle.importKey(
      'raw', encoder.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['verify'],
    );
    const ok = await crypto.subtle.verify(
      'HMAC', key, b64urlToBytes(parts[2]), encoder.encode(`${parts[0]}.${parts[1]}`),
    );
    if (!ok) return false;
    const claims = JSON.parse(new TextDecoder().decode(b64urlToBytes(parts[1])));
    return typeof claims.exp !== 'number' || claims.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

const JWT_SECRET = Deno.env.get('JWT_SECRET') ?? '';

realServe({ port: 8080 }, async (req) => {
  const url = new URL(req.url);
  if (url.pathname === '/health') return new Response('ok');

  // Kong strips /functions/v1, so the first segment is the function name. The
  // remainder is left intact — pto-calendar-feed reads its token from the path.
  const segments = url.pathname.split('/').filter(Boolean);
  const name = segments[0] ?? '';
  const handler = handlers.get(name);
  if (!handler) return new Response('Not Found', { status: 404 });

  if (!OPEN.has(name)) {
    if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS_HEADERS });
    const auth = req.headers.get('authorization') ?? '';
    const token = auth.toLowerCase().startsWith('bearer ') ? auth.slice(7).trim() : '';
    if (!JWT_SECRET || !(await jwtValid(token, JWT_SECRET))) {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), {
        status: 401,
        headers: { ...CORS_HEADERS, 'Content-Type': 'application/json' },
      });
    }
  }
  return await handler(req);
});
