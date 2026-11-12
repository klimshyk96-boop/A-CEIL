-- Emergency rollback ONLY; re-opens direct read access to all legacy reports.
update storage.buckets set public=true where id='roomator-reports';
