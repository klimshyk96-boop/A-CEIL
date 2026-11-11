-- A·CEIL | owner-approved / rejected registration email outbox.
-- Apply after deploying Edge Function and before enabling the Database Webhook.
-- No email is sent until the webhook + Resend secrets are configured.
BEGIN;

DO $check$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema='public' AND table_name='profiles' AND column_name='approval_status'
  ) THEN
    RAISE EXCEPTION 'A·CEIL migration stopped: profiles.approval_status missing. Audit admin_set_registration_status RPC before adapting trigger.';
  END IF;
END
$check$;

CREATE TABLE IF NOT EXISTS public.aceil_registration_mail_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  kind text NOT NULL CHECK (kind IN ('approved','rejected')),
  source text NOT NULL DEFAULT 'automatic' CHECK (source IN ('automatic','manual')),
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending','processing','sent','failed','canceled')),
  attempts integer NOT NULL DEFAULT 0 CHECK (attempts >= 0),
  provider_id text,
  last_error text,
  created_at timestamptz NOT NULL DEFAULT now(),
  attempted_at timestamptz,
  sent_at timestamptz
);
CREATE UNIQUE INDEX IF NOT EXISTS aceil_regmail_single_auto_event
 ON public.aceil_registration_mail_jobs (user_id,kind) WHERE source='automatic';
CREATE INDEX IF NOT EXISTS aceil_regmail_user_recent
 ON public.aceil_registration_mail_jobs (user_id,created_at DESC);
CREATE UNIQUE INDEX IF NOT EXISTS aceil_regmail_one_manual_inflight
 ON public.aceil_registration_mail_jobs (user_id,kind)
 WHERE source='manual' AND status IN ('pending','processing');

ALTER TABLE public.aceil_registration_mail_jobs ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.aceil_registration_mail_jobs FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON TABLE public.aceil_registration_mail_jobs TO service_role;

-- The status RPC remains the ONLY authority for approval/rejection.
-- This trigger only queues a mail, on a REAL status transition.
CREATE OR REPLACE FUNCTION public.aceil_registration_mail_enqueue()
RETURNS trigger LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $body$
BEGIN
  IF NEW.approval_status IS NOT DISTINCT FROM OLD.approval_status THEN
    RETURN NEW;
  END IF;
  IF NEW.approval_status::text IN ('approved','rejected') THEN
    UPDATE public.aceil_registration_mail_jobs j
       SET status='canceled', last_error='Status changed before delivery'
     WHERE j.user_id=NEW.id AND j.status='pending'
       AND j.kind<>NEW.approval_status::text;
    INSERT INTO public.aceil_registration_mail_jobs(user_id,kind,source)
    VALUES (NEW.id, NEW.approval_status::text, 'automatic')
    ON CONFLICT DO NOTHING;
  END IF;
  RETURN NEW;
END
$body$;

DROP TRIGGER IF EXISTS aceil_registration_mail_on_status_change ON public.profiles;
CREATE TRIGGER aceil_registration_mail_on_status_change
AFTER UPDATE OF approval_status ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.aceil_registration_mail_enqueue();

-- Only the server-side Edge Function (service_role) may claim a job.
-- A transactionally locked claim prevents two webhook deliveries from sending twice.
CREATE OR REPLACE FUNCTION public.aceil_mail_claim(p_job_id uuid)
RETURNS TABLE(job_id uuid, user_id uuid, kind text)
LANGUAGE sql SECURITY DEFINER SET search_path = ''
AS $fn$
  WITH claimed AS (
    SELECT j.id
      FROM public.aceil_registration_mail_jobs j
      JOIN public.profiles p ON p.id=j.user_id
     WHERE j.id=p_job_id
       AND j.status='pending'
       AND j.attempts=0
       AND p.approval_status::text=j.kind
     FOR UPDATE OF j SKIP LOCKED
  )
  UPDATE public.aceil_registration_mail_jobs j
     SET status='processing', attempts=j.attempts+1, attempted_at=now()
    FROM claimed c
   WHERE j.id=c.id
   RETURNING j.id, j.user_id, j.kind;
$fn$;

CREATE OR REPLACE FUNCTION public.aceil_mail_finish(
 p_job_id uuid, p_sent boolean, p_provider_id text DEFAULT NULL, p_error text DEFAULT NULL
)
RETURNS boolean LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE changed integer;
BEGIN
  UPDATE public.aceil_registration_mail_jobs
     SET status=CASE WHEN p_sent THEN 'sent' ELSE 'failed' END,
         provider_id=CASE WHEN p_sent THEN left(p_provider_id,200) ELSE NULL END,
         last_error=CASE WHEN p_sent THEN NULL ELSE left(coalesce(p_error,'Unknown send error'),500) END,
         sent_at=CASE WHEN p_sent THEN now() ELSE NULL END
   WHERE id=p_job_id AND status='processing';
  GET DIAGNOSTICS changed=ROW_COUNT;
  RETURN changed=1;
END
$fn$;

-- Show most recent mail event per user, owner-only.
CREATE OR REPLACE FUNCTION public.aceil_admin_registration_mail_log()
RETURNS TABLE(
 user_id uuid, kind text, status text, created_at timestamptz,
 sent_at timestamptz, source text, last_error text
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id=auth.uid() AND p.app_role='owner' AND p.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied' USING errcode='42501';
  END IF;
  RETURN QUERY
    SELECT DISTINCT ON (j.user_id)
           j.user_id, j.kind, j.status, j.created_at, j.sent_at, j.source, j.last_error
      FROM public.aceil_registration_mail_jobs j
     ORDER BY j.user_id, j.created_at DESC, j.id DESC;
END
$fn$;

-- Explicit manual retry; the database webhook on INSERT sends the new outbox job.
CREATE OR REPLACE FUNCTION public.aceil_admin_resend_registration_mail(p_user_id uuid)
RETURNS uuid
LANGUAGE plpgsql SECURITY DEFINER SET search_path = ''
AS $fn$
DECLARE mail_kind text; job_id uuid;
BEGIN
  IF auth.uid() IS NULL OR NOT EXISTS (
    SELECT 1 FROM public.profiles p
     WHERE p.id=auth.uid() AND p.app_role='owner' AND p.is_active IS TRUE
  ) THEN
    RAISE EXCEPTION 'Access denied' USING errcode='42501';
  END IF;
  SELECT p.approval_status::text INTO mail_kind
    FROM public.profiles p
    JOIN auth.users u ON u.id=p.id
   WHERE p.id=p_user_id AND u.email IS NOT NULL;
  IF mail_kind NOT IN ('approved','rejected') OR mail_kind IS NULL THEN
    RAISE EXCEPTION 'User has no approved or rejected registration status';
  END IF;
  INSERT INTO public.aceil_registration_mail_jobs(user_id,kind,source)
  VALUES(p_user_id,mail_kind,'manual')
  ON CONFLICT DO NOTHING RETURNING id INTO job_id;
  IF job_id IS NULL THEN
    RAISE EXCEPTION 'A notification for this account is already queued';
  END IF;
  RETURN job_id;
END
$fn$;

REVOKE ALL ON FUNCTION public.aceil_registration_mail_enqueue() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aceil_mail_claim(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.aceil_mail_finish(uuid,boolean,text,text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.aceil_mail_claim(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.aceil_mail_finish(uuid,boolean,text,text) TO service_role;
REVOKE ALL ON FUNCTION public.aceil_admin_registration_mail_log() FROM PUBLIC, anon;
REVOKE ALL ON FUNCTION public.aceil_admin_resend_registration_mail(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.aceil_admin_registration_mail_log() TO authenticated;
GRANT EXECUTE ON FUNCTION public.aceil_admin_resend_registration_mail(uuid) TO authenticated;

COMMIT;
