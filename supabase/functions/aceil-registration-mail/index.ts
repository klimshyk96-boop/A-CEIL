// A·CEIL server-side registration notifications.
// Called by Supabase Database Webhook on INSERT to public.aceil_registration_mail_jobs.
// Webhook: HTTP POST, selected Edge Function, secret "apikey" header.
// Client JWT verification must be disabled ONLY for this service-key-authenticated function.
import { withSupabase } from "npm:@supabase/server@1";
import nodemailer from "npm:nodemailer@9.1.1";

type Job = { job_id: string; user_id: string; kind: "approved" | "rejected" };
const json = (body: unknown, status = 200) =>
  Response.json(body, { status, headers: { "Cache-Control": "no-store" } });

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (c) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[c] || c);
}
function message(kind: Job["kind"], name: string) {
  const firstName = (name || "").trim().slice(0, 100);
  const greeting = firstName ? `Вітаємо, ${firstName}!` : "Вітаємо!";
  if (kind === "approved") return {
    subject: "A·CEIL — ваш акаунт активовано",
    text: `${greeting}\n\nВаш обліковий запис A·CEIL — PRO MEASURE & DESIGN успішно активовано.\n\nУвійдіть: https://a-ceil.pp.ua/\n\nЗ повагою, команда A·CEIL.`,
    html: `<!doctype html><html lang="uk"><body style="margin:0;padding:32px 12px;background:#f3f6fb;font-family:Arial,sans-serif;color:#152238"><main style="max-width:560px;margin:auto;padding:32px;border-radius:18px;background:white;border:1px solid #dce5f1"><h1 style="margin:0 0 18px;color:#1d4ed8">A·CEIL</h1><h2>${escapeHtml(greeting)}</h2><p style="line-height:1.6">Ваш обліковий запис <b>A·CEIL — PRO MEASURE & DESIGN</b> успішно активовано.</p><p style="line-height:1.6">Тепер ви можете працювати з проєктами та синхронізувати їх між пристроями.</p><p style="margin:30px 0"><a href="https://a-ceil.pp.ua/" style="background:#2563eb;border-radius:11px;padding:14px 22px;color:white;text-decoration:none;font-weight:bold">Перейти до A·CEIL</a></p><p style="font-size:13px;color:#64748b">З повагою, команда A·CEIL</p></main></body></html>`
  };
  return {
    subject: "A·CEIL — відповідь щодо вашої реєстрації",
    text: `${greeting}\n\nНа жаль, вашу заявку на доступ до A·CEIL зараз не схвалено.\n\nЯкщо вважаєте, що сталася помилка, зв'яжіться з адміністратором A·CEIL.\n\nЗ повагою, команда A·CEIL.`,
    html: `<!doctype html><html lang="uk"><body style="margin:0;padding:32px 12px;background:#f3f6fb;font-family:Arial,sans-serif;color:#152238"><main style="max-width:560px;margin:auto;padding:32px;border-radius:18px;background:white;border:1px solid #dce5f1"><h1 style="margin:0 0 18px;color:#1d4ed8">A·CEIL</h1><h2>${escapeHtml(greeting)}</h2><p style="line-height:1.6">На жаль, вашу заявку на доступ до A·CEIL зараз не схвалено.</p><p style="line-height:1.6">Якщо вважаєте, що сталася помилка, зв'яжіться з адміністратором A·CEIL.</p><p style="font-size:13px;color:#64748b">З повагою, команда A·CEIL</p></main></body></html>`
  };
}

export default {
  fetch: withSupabase({ auth: "secret" }, async (req, ctx) => {
    if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);
    let payload: { type?: string; schema?: string; table?: string; record?: { id?: string } };
    try { payload = await req.json(); }
    catch { return json({ error: "Invalid JSON" }, 400); }
    // Secret-key-protected diagnostic: report presence/format ONLY, never secret values.
    // Does not contact SMTP and never creates or changes a mail job.
    if (payload.type === "HEALTH") {
      const email = Deno.env.get("ACEIL_GMAIL_ADDRESS")?.trim() || "";
      const appPassword = Deno.env.get("ACEIL_GMAIL_APP_PASSWORD")?.replace(/\s+/g, "") || "";
      return json({
        ok: true,
        smtp: {
          email_present: Boolean(email),
          email_valid: /^[^\s@]+@gmail\.com$/i.test(email),
          app_password_present: Boolean(appPassword),
          app_password_is_16_chars: appPassword.length === 16
        }
      });
    }
    if (payload.type !== "INSERT" || payload.schema !== "public" ||
        payload.table !== "aceil_registration_mail_jobs") {
      return json({ error: "Invalid event" }, 400);
    }
    const id = String(payload.record?.id || "");
    if (!/^[a-f0-9]{8}-[a-f0-9]{4}-[1-8][a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/i.test(id)) {
      return json({ error: "Invalid job id" }, 400);
    }
    // Never trust record.user_id, record.kind, or record.email from the request.
    const result = await ctx.supabaseAdmin.rpc("aceil_mail_claim", { p_job_id: id });
    if (result.error) {
      console.error("A·CEIL mail claim failed", result.error.message);
      return json({ error: "Job claim error" }, 500);
    }
    const job = (Array.isArray(result.data) ? result.data[0] : null) as Job | undefined;
    if (!job) return json({ ok: true, skipped: true }); // duplicate, already sent, or obsolete
    let providerId: string | null = null;
    try {
      const userResp = await ctx.supabaseAdmin.auth.admin.getUserById(job.user_id);
      if (userResp.error) throw userResp.error;
      const user = userResp.data?.user;
      const to = user?.email || "";
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(to)) throw new Error("User email not available");
      const name = String(user?.user_metadata?.name || user?.user_metadata?.full_name || "");
      const contents = message(job.kind, name);

      // Free A·CEIL mail uses its own Gmail account over TLS (SMTP port 465).
      // No app password is ever sent to the browser or committed to the repo.
      // Keep Resend as a future optional provider. Gmail wins when configured.
      const gmailAddress = Deno.env.get("ACEIL_GMAIL_ADDRESS")?.trim() || "";
      const gmailAppPassword = Deno.env.get("ACEIL_GMAIL_APP_PASSWORD")?.replace(/\s+/g, "") || "";
      if (gmailAddress || gmailAppPassword) {
        if (!/^[^\s@]+@gmail\.com$/i.test(gmailAddress) || !gmailAppPassword) {
          throw new Error("A·CEIL Gmail SMTP is only partially configured");
        }
        const transport = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: { user: gmailAddress, pass: gmailAppPassword },
          connectionTimeout: 15000,
          greetingTimeout: 12000,
          socketTimeout: 20000,
          disableFileAccess: true,
          disableUrlAccess: true
        });
        try {
          const result = await transport.sendMail({
            from: { name: "A·CEIL", address: gmailAddress },
            to,
            subject: contents.subject,
            text: contents.text,
            html: contents.html,
            disableFileAccess: true,
            disableUrlAccess: true
          });
          if (!Array.isArray(result.accepted) || !result.accepted.length) {
            throw new Error("Gmail SMTP did not accept the recipient");
          }
          providerId = String(result.messageId || `aceil-gmail-${id}`);
        } finally {
          transport.close();
        }
      } else {
        const from = Deno.env.get("ACEIL_MAIL_FROM");
        const apiKey = Deno.env.get("RESEND_API_KEY");
        if (!from || !apiKey) {
          throw new Error("Configure A·CEIL Gmail secrets or Resend sender/API key");
        }
        const sent = await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${apiKey}`,
            "Content-Type": "application/json",
            "Idempotency-Key": `aceil-registration-${id}`
          },
          body: JSON.stringify({ from, to: [to], ...contents })
        });
        const response = await sent.json().catch(() => ({}));
        if (!sent.ok || !response.id) {
          throw new Error(`Resend status ${sent.status}: ${JSON.stringify(response).slice(0, 220)}`);
        }
        providerId = String(response.id);
      }
      const finished = await ctx.supabaseAdmin.rpc("aceil_mail_finish", {
        p_job_id: id, p_sent: true, p_provider_id: providerId, p_error: null
      });
      if (finished.error || finished.data !== true) throw new Error("Unable to mark mail as sent");
      return json({ ok: true });
    } catch (error) {
      const detail = error instanceof Error ? error.message : "Unknown send error";
      console.error("A·CEIL mail failed", { id, detail });
      if (!providerId) {
        const failed = await ctx.supabaseAdmin.rpc("aceil_mail_finish", {
          p_job_id: id, p_sent: false, p_provider_id: null, p_error: detail.slice(0, 500)
        });
        if (failed.error) console.error("A·CEIL mail status update failed", failed.error.message);
      }
      // If provider accepted the mail, don't automatically retry, to avoid duplicates.
      return json({ error: "Mail processing failed" }, 502);
    }
  })
};
