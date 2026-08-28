import { defineMiddleware } from "astro:middleware";

/**
 * Access gate: every incoming request is allowed only after an external
 * authorization service confirms it. The wiki POSTs
 * `{ type: "HasAccessToWiki", ip: <client ip> }` to the handler and expects a
 * `true`/`false` answer; on `false` the client gets a 403.
 *
 * Environment:
 *   ACCESS_CHECK_URL         handler URL (default https://example.com/handler)
 *   ACCESS_CHECK_DISABLED=1  turn the gate off entirely
 *   ACCESS_CHECK_FAIL_CLOSED=1  deny access when the handler is unreachable
 *                               (default: fail-open so the wiki survives
 *                               handler outages)
 *
 * Verdicts are cached per client IP for a short time so the handler is not
 * hit on every asset/API call.
 *
 * Note: static files (official page JSONs, styles, images) are served by the
 * node adapter before this middleware runs; the gate covers every SSR-rendered
 * page and API endpoint, which is what the browser needs to display the site.
 */

const CHECK_URL = process.env.ACCESS_CHECK_URL ?? "https://example.com/handler";
const DISABLED = process.env.ACCESS_CHECK_DISABLED === "1";
const FAIL_CLOSED = process.env.ACCESS_CHECK_FAIL_CLOSED === "1";
const CACHE_TTL_MS = 60_000;
const HANDLER_TIMEOUT_MS = 3_000;

const verdictCache = new Map<string, { allowed: boolean; expires: number }>();

function clientIp(context: { request: Request; clientAddress?: string }): string {
  const forwarded = context.request.headers.get("x-forwarded-for");
  if (forwarded) return forwarded.split(",")[0].trim();

  try {
    return context.clientAddress ?? "unknown";
  } catch {
    return "unknown";
  }
}

async function askHandler(ip: string): Promise<boolean> {
  const res = await fetch(CHECK_URL, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ type: "HasAccessToWiki", ip }),
    signal: AbortSignal.timeout(HANDLER_TIMEOUT_MS),
  });

  if (!res.ok) throw new Error(`access handler responded ${res.status}`);

  const text = (await res.text()).trim().toLowerCase();
  return text === "true";
}

async function hasAccess(ip: string): Promise<boolean> {
  const cached = verdictCache.get(ip);
  if (cached && cached.expires > Date.now()) return cached.allowed;

  let allowed: boolean;
  try {
    allowed = await askHandler(ip);
  } catch (e: any) {
    console.warn(`access check failed (${e?.message ?? e}); ${FAIL_CLOSED ? "denying" : "allowing"} ${ip}`);
    allowed = !FAIL_CLOSED;
  }

  // Cap the cache so a scan of spoofed addresses cannot grow it forever
  if (verdictCache.size > 10_000) verdictCache.clear();
  verdictCache.set(ip, { allowed, expires: Date.now() + CACHE_TTL_MS });

  return allowed;
}

const FORBIDDEN_HTML = `<!doctype html>
<html><head><meta charset="utf-8"><title>403 Forbidden</title></head>
<body style="font-family: sans-serif; text-align: center; padding-top: 4rem; background: #222; color: #ddd">
<h1>403 Forbidden</h1>
<p>You do not have access to this wiki.</p>
</body></html>`;

export const onRequest = defineMiddleware(async (context, next) => {
  if (DISABLED) return next();

  if (await hasAccess(clientIp(context))) return next();

  return new Response(FORBIDDEN_HTML, {
    status: 403,
    headers: { "content-type": "text/html; charset=utf-8", connection: "close" },
  });
});
