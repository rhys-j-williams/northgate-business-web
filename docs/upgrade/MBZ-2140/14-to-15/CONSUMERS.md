<!-- Generated with AI assistance (AIT-014) on 2026-09-09; reviewed by <handle>. -->

# MBZ-2140 Angular 14 -> 15: consumer / estate verification for `northgate-business-web`

`northgate-business-web` is an application, not a library: nothing in the estate installs it, so there is no
consumer pin table to verify (`published_package: n/a`). The consumer check for an app is the **estate smoke** from
the `northgate-cswt-workspace` README - `ESTATE_NO_DOCKER=1 ../northgate-mock-external/estate-up.sh`, `smoke.sh`,
`scripts/verify-estate.sh --quick` - run with the migrated business-web served alongside the platform it depends on.
What business-web *consumes* (Canopy 4.0.0, domain-fixtures 1.6.0, `bff-business`, Keystone) is verified here from
the consumer side. No sibling repository was modified and no PR was opened in any other repository.

## Result table

| Check | Where | Result | Notes |
|---|---|---|---|
| `estate-up.sh` (`ESTATE_NO_DOCKER=1`) | [`D-estate-smoke/estate-up.log`](D-estate-smoke/estate-up.log) | **PASS** | Verdaccio already up on 4873 with the internal packages (run with `ESTATE_SKIP_PUBLISH=1`, they had been published by the earlier hop runs); 11 external mocks started (4400, 4600-4609); platform services `bedrock-adapter` 4516, `bff-retail` 4500, `bff-business` 4501 `up`. `beacon-notifications` (4510) and `documents-service` (4518) are not in the no-Docker start set and were not started |
| `smoke.sh` | [`D-estate-smoke/smoke.log`](D-estate-smoke/smoke.log) | **PASS** 18 / 0 FAIL / 2 SKIP | 11 mock health checks, Verdaccio health, Keystone PKCE login + JWKS-verified ID token, `bff-retail` vs Bedrock balance, Lantern collector + `lantern.min.js`, Splunk HEC and a cross-service trace through `bedrock-adapter -> bedrock-core-mock -> bff-retail`. SKIPs: `beacon ordered dispatch` and `documents statement pdf`, both because the service was not started - unrelated to business-web (it uses neither) |
| `scripts/verify-estate.sh --quick` | [`D-estate-smoke/verify-estate-quick.log`](D-estate-smoke/verify-estate-quick.log) | 77 PASS / **1 FAIL** / 18 SKIP | Every `business-web` row PASS: no forbidden strings (worktree), no build output committed, exact dependency versions, `package.json`, `.nvmrc`, lockfile committed, history depth 360, 13 authors, release tags `v2025.03.1 v2026.08.0`. The one FAIL is `mock-external / no forbidden strings (worktree)`: the checker matched package-author e-mail metadata inside the generated Verdaccio storage (`northgate-mock-external/verdaccio/storage/@babel/.../package.json`) written when `estate-up.sh` published the packages this hop installs. It is a generated-storage artefact of the local registry, not committed content and not business-web; left in place for Platform Engineering (see "Follow-ups"). SKIPs are the `--quick` exclusions (history scan, install/test/build) |
| business-web served against the estate | [`visual/after-angular-15-canopy-4.0.0/`](visual/after-angular-15-canopy-4.0.0/) | **PASS** (render) / KAN-31 (acceptance) | `ng serve` on 4201 from the Angular 15 / Canopy 4.0.0 build; ten main pages captured at 1440x900 (accounts, ACH, wires, new wire, approvals, payroll, new payroll run, users, alerts, reports). Same three pre-existing Canopy icon-registry console errors (`cn:refresh`, `cn:chart`, `cn:person-add`) as the Angular 14 baseline capture - not introduced by this hop |
| `@northgate/canopy-ui@4.0.0` (consumed) | `B-canopy-4.0.0/` + `C-angular15/` gate logs | **PASS with waiver** | Built from `northgate-canopy-ui` `feature/CNPY-2140-angular-14-to-15` (PR #3, unmerged) and published to the local Verdaccio; installed as an exact pin. **KAN-23 gate waiver**: 4.0.0 is not on Artifactory; this PR may not merge until it is, and the lockfile `integrity` for the 4.0.0 entry must then be re-resolved against Artifactory (REPORT.md 5.3, CAB_RECORD.md 7.1) |
| `@northgate/domain-fixtures@1.6.0` (consumed) | lockfile, `C-angular15/npm-ls-depth0.log` | **PASS** | Unchanged pin; installed from Verdaccio; fixture-mode pages render |
| `bff-business` (4501) contract | `estate-up.log`, app pages | **PASS** (unchanged) | No BFF path, header or payload change in this hop; `environment.useFixtures` behaviour unchanged. Shared with `ledgerline-web`, which is untouched |
| Keystone IdP mock (4400) | `smoke.log` PKCE row | **PASS** | Token handling code in business-web is unchanged by the hop; smoke verifies the IdP + JWKS path |

**Verdict: no FAIL attributable to business-web. Estate smoke PASS; one out-of-scope verify-estate FAIL in
generated mock-external storage.**

## Method

- Node 16.20.2 / npm 8.19.4 for business-web (`.nvmrc`); Node 18.19.0 for `bff-business` / `bff-retail` (their own
  `.nvmrc`); Java 11 for `bedrock-adapter`; `ESTATE_NO_DOCKER=1` throughout (no Docker on this VM).
- The platform services had no build artefacts on first run (`run-local.sh` starts them from `dist/` / `target/`):
  `bff-business` and `bff-retail` were built on Node 18.19.0, `bedrock-adapter` with Maven on Java 11, then
  `estate-up.sh` was re-run. The first Splunk-trace smoke attempt
  failed because two services had been started by hand without the `estate-up.sh` exported environment; restarting
  everything through `estate-up.sh` fixed it (the log in the bundle is the passing run).
- business-web itself: `npm ci` on the branch head, `ng serve --port 4201`, pages driven by the workspace skill
  `northgate-local-screenshot-capture` (Playwright over Chrome CDP 29229, 1440x900, dpr 1, PNG, viewport only).
- Nothing outside `northgate-business-web` was committed. `northgate-canopy-ui` was checked out as a temporary
  worktree (`/home/ubuntu/canopy4-wt`) at `feature/CNPY-2140-angular-14-to-15` solely to build and `npm publish`
  4.0.0 to the local Verdaccio; the worktree has no local changes.

## Downstream consumers of business-web

None. `ledgerline-web` was carved out of business-web (LDG) but is a separate repository with its own pins and
does not import from this one; it shares `bff-business`, which this hop does not change. Nothing else in the
`northgate-*` estate references `northgate-business-web` as a dependency (grep of every sibling `package.json`
under `/home/ubuntu/repos`: zero hits).

## Follow-ups (not this PR)

- **Platform Engineering / PLAT**: `verify-estate.sh --quick` reports `mock-external / no forbidden strings
  (worktree)` FAIL on generated `verdaccio/storage/**/package.json` author metadata. Either the checker should skip
  `verdaccio/storage` (it is a registry cache, `.gitignore`d) or `estate-up.sh` should scrub it. Raised as a new
  Jira item in the hop report (`new_jira_items_needed`).
- **canopy-design-system / CNPY**: the three missing icon ids (`cn:refresh`, `cn:chart`, `cn:person-add`) are
  registry gaps in Canopy 3.5.0 *and* 4.0.0 as consumed by business-web; either the icons need adding to the Canopy
  registry or business-web should switch to ids that exist. Pre-existing; recorded for a human to route.
- **business-digital / MBZ**: once Canopy 4.0.0 is on Artifactory, re-run `npm ci` on the `nodejs16-rhel8` agent
  and re-resolve the lockfile entry (CAB_RECORD.md 7.1).
