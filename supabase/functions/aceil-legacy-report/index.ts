// Compatibility gateway for 20-hex A·CEIL reports originally stored in a PUBLIC
// Supabase bucket. This function continues to work after the bucket turns private.
// The full token is a bearer capability; never log it or use it in an error string.
// verify_jwt=false is required for public share links; validation is server-side.
const approvedOrigins = new Set([
  "https://a-ceil.pp.ua",
  "https://a-ceil-pro-editor-v3-93-login-1to1.vercel.app",
]);

function headers(req: Request): Headers {
  const values = new Headers({
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "private, no-store, max-age=0",
    "Pragma": "no-cache",
    "X-Content-Type-Options": "nosniff",
    "Referrer-Policy": "no-referrer",
  });
  const origin = req.headers.get("origin");
  if (origin && approvedOrigins.has(origin)) {
    values.set("Access-Control-Allow-Origin", origin);
    values.set("Vary", "Origin");
    values.set("Access-Control-Allow-Methods", "GET, OPTIONS");
    values.set("Access-Control-Allow-Headers", "content-type");
  }
  return values;
}

function reply(req: Request, status: number, data: unknown): Response {
  return new Response(JSON.stringify(data), { status, headers: headers(req) });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    const origin = req.headers.get("origin");
    if (origin && !approvedOrigins.has(origin)) return reply(req, 403, { status: "forbidden" });
    return new Response(null, { status: 204, headers: headers(req) });
  }
  if (req.method !== "GET") return reply(req, 405, { status: "method_not_allowed" });

  const url = new URL(req.url);
  if (url.searchParams.has("health")) {
    return reply(req, 200, { ok: true, configured: Boolean(
      Deno.env.get("SUPABASE_URL") && Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
    ) });
  }
  const token = (url.searchParams.get("token") || "").toLowerCase();
  if (!/^[a-f0-9]{20}$/.test(token)) return reply(req, 404, { status: "not_found" });

  const projectUrl = Deno.env.get("SUPABASE_URL") || "";
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";
  if (!/^https:\/\/[a-z0-9.-]+\.supabase\.co$/.test(projectUrl) || !serviceKey) {
    return reply(req, 503, { status: "unavailable" });
  }

  try {
    // Fixed bucket and path — never accept a path supplied by the visitor.
    // Reading from /authenticated works regardless of public bucket settings.
    const fetchUrl = projectUrl + "/storage/v1/object/authenticated/roomator-reports/r/" + token + ".json";
    const result = await fetch(fetchUrl, {
      method: "GET",
      headers: { apikey: serviceKey, Authorization: "Bearer " + serviceKey },
      signal: AbortSignal.timeout(9000),
      cache: "no-store",
    });
    if (result.status === 404 || result.status === 400) return reply(req, 404, { status: "not_found" });
    if (!result.ok) return reply(req, 503, { status: "unavailable" });

    const body = await result.text();
    if (body.length > 10_485_760) return reply(req, 413, { status: "oversized" });
    let payload: unknown;
    try { payload = JSON.parse(body); }
    catch { return reply(req, 404, { status: "not_found" }); }
    if (!payload || typeof payload !== "object" || Array.isArray(payload)) {
      return reply(req, 404, { status: "not_found" });
    }
    const report = payload as Record<string, unknown>;
    if (report.revoked === true) return reply(req, 410, { status: "revoked" });
    if (report.expiresAt != null) {
      const expiresAt = new Date(String(report.expiresAt)).getTime();
      if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) {
        return reply(req, 410, { status: "expired" });
      }
    }
    return reply(req, 200, report);
  } catch {
    // Never reveal the storage path, service key or error object to callers.
    return reply(req, 503, { status: "unavailable" });
  }
});
