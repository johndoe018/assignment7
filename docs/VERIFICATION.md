# Verification record

Prepared on 15 October 2026 in the selected cloud environment.

## Passed

| Check | Evidence |
| --- | --- |
| Math and prompt suite | `npm test`: 13 passed, 0 failed, 0 skipped |
| Desktop/mobile interaction suite | 12 production-browser cases passed; the added 2 AI-transport UI cases passed in a targeted run |
| Property checks | 2,000 generated equations checked across all three levels; 200 AI candidate sets checked |
| Mathematical consistency | Core substitution, equality with variables on both sides, shared cost, and cost ordering before/after break-even |
| Input handling | Invalid numbers, out-of-domain equations, incomplete/incorrect answers, partial advanced feedback |
| Accessibility | Automated WCAG A/AA scans at all three levels on desktop and mobile; contrast issues found initially were corrected |
| Layout | No horizontal overflow at 320, 390, 720, 820, 1024, or 1440 CSS pixels |
| Production build | `npm run build`: successful, includes worker and WebAssembly asset |
| Report | PDF is exactly one A4 page, opens successfully, and is served with HTTP 200 by the production site |
| Runtime | No page errors during the ordinary production-page check |
| Dependencies | `npm audit --omit=dev --audit-level=high`: 0 vulnerabilities reported |

The two transport-fixture tests use a clearly marked synthetic Worker response
to verify hint rendering, AI-selected practice-set updates, and stale-response
clearing. They **do not validate the language model**. The separate download
failure tests deliberately block Hugging Face and verify that errors are visible
while mathematical practice remains functional.

## External blockers and unverified checks

- A real browser AI attempt was executed without a mocked response. It failed
  while requesting `huggingface.co` with `net::ERR_TUNNEL_CONNECTION_FAILED`.
  The worker reported `Failed to fetch`. A separate HTTPS request returned
  `Tunnel connection failed: 403 Forbidden`. Successful model loading, hint
  selection, and AI practice-set selection remain **unverified** in this machine.
- A read-only GitHub API request using the existing platform authentication
  returned `Forbidden`. Native Git authentication did work: the implementation
  was pushed to `main` and its remote SHA matched the local commit. The public
  GitHub repository page returned HTTP 200 and explicitly identified the
  repository as public. The Actions page confirmed that the deployment workflow
  started. That [deployment attempt](https://github.com/johndoe018/assignment7/actions/runs/38741041672)
  subsequently failed at `actions/configure-pages`: GitHub reported that a Pages
  site was not found and that Pages must be enabled with GitHub Actions as its
  source. This requires the repository settings change described in DEPLOYMENT.md.
- Direct access to `johndoe018.github.io` also returned a proxy 403. A working
  public-site functional check has not been completed from this machine.
- Required domain additions have been persisted in the environment draft.
  Saving the draft does not apply runtime network access or publish the website.

The source and deployable site can be reviewed independently of those external
prerequisites. See `DEPLOYMENT.md` for the exact publication steps. Once model
access changes, rerun `scripts/check-live-ai.mjs`; do not treat a UI fixture or a
working static page as proof of real AI inference.
