# Security integration, test build 20261021-security-test2

Selected changes from Claude's security archive were applied to the current
client catalogue branch rather than replacing the repository with the archive.

- Supabase 2.117.3 and jsPDF 2.5.2 are served locally, with upstream licenses.
  This removes CDN dependencies; it is not a jsPDF version upgrade.
- Security headers and matching local vendor cache rules are in vercel.json.
- Legacy report export filenames and embedded share text are sanitized.
- Public manager HTML runs in an opaque sandbox with scripts, printing and
  downloads, without editor storage access, popups or top navigation.
- Back, link and share actions run in the trusted parent document. Old published
  manager documents retain print/plan controls inside the sandbox.
- Both image and structured public reports reject non-HTTP(S) route URLs.
- The current calculator catalogue, film palette and width pricing are retained.

`tests/public-report-security.test.cjs` covers generated manager reports on
390/1440px viewports, storage/parent access denial, print and parent controls,
unsafe routes in both report formats, and real vendored SDK initialization under
the configured CSP. It is included in `scripts/check-before-deploy.sh`.

Real Google login and the native iPhone share/print dialogs require device
verification; the offline browser test does not assert those flows.
The previously observed golden-master mismatch (10760 vs 10646) is not approved
by updating the expected snapshot in this change.
