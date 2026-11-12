-- Stage 2 of legacy report privatization. Run ONLY after gateway E2E verification,
-- production client rollout and the 57 raw direct-URL compatibility decision.
do $$
begin
  if not exists(select 1 from storage.buckets where id='roomator-reports') then
    raise exception 'roomator-reports bucket not found';
  end if;
  update storage.buckets set public=false where id='roomator-reports';
end $$;
