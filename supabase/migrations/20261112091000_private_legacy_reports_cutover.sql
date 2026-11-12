-- A·CEIL historical reports: complete phase-2 private Storage cutover.
-- Prior checks: 39 capability reports route through verified POST Edge gateway,
-- 57 historical root report_*.json/html have no API-managed revocation token.
-- Direct historical Storage URLs are intentionally closed for privacy.
-- Every object stays in Storage; no object is deleted or renamed.
DO $$
DECLARE
  v_public boolean;
  v_total integer;
  v_capabilities integer;
  v_root integer;
BEGIN
  SELECT public INTO v_public FROM storage.buckets WHERE id='roomator-reports';
  IF NOT FOUND THEN RAISE EXCEPTION 'Missing roomator-reports bucket'; END IF;
  SELECT count(*),
         count(*) FILTER (WHERE name ~ '^r/[a-f0-9]{20}\.json$'),
         count(*) FILTER (WHERE name LIKE 'report_%')
    INTO v_total, v_capabilities, v_root
    FROM storage.objects WHERE bucket_id='roomator-reports';
  IF v_total<>96 OR v_capabilities<>39 OR v_root<>57 THEN
    RAISE EXCEPTION 'Unexpected historical storage inventory, objects %, tokens %, legacy roots %',
      v_total,v_capabilities,v_root;
  END IF;
  IF v_public THEN
    UPDATE storage.buckets SET public=false WHERE id='roomator-reports';
  END IF;
END;
$$;
