<!-- Generated with AI assistance (AIT-014) on 2026-09-09; reviewed by <handle>. -->
<!-- Draft from northgate-platform-tooling/governance/CAB_TEMPLATE.md (template 4.2, RM-STD-003). Not yet submitted:
     the change is BLOCKED on KAN-29 (Node 14 agent retirement / GIS review) and on Canopy 4.0.0 reaching
     Artifactory (KAN-23 gate waiver). Fill the TBC fields and the train when both are cleared. -->
# Change Advisory Board submission — CSWT

## 1. Record

| field | value |
|---|---|
| CHG number | CHG_______ (assigned by ITSM on save; not an emergency change) |
| Change type | Normal |
| Release train | Earliest **2026.10.2** (code freeze Fri 2026-10-02, CAB Tue 2026-10-06, deploy Thu 2026-10-08). 2026.09.2 froze on 2026-09-04 and 2026.09.4 is the Q3 freeze skip. The train is provisional: the PR cannot merge before KAN-29 closes and Canopy 4.0.0 is on Artifactory, so if either slips past 2026-10-02 this moves to 2026.10.4. |
| Requested implementation window | Thu 2026-10-08 20:00 to 23:00 ET (provisional, see above) |
| Requesting team | `business-digital` (Northgate Business squad, CSWT) |
| Change owner (accountable) | TBC (business-digital, M2 or above) |
| Implementer | TBC (business-digital release engineer running `northgate-business` pipeline / `Jenkinsfile.release`) |
| Business sponsor | TBC (Northgate Business product owner) |
| Application(s) and CMDB app-id(s) | Northgate Business web (`northgate-business-web`) **APP-10443**. No BFF, chart-values or platform-service change. |
| Environment(s) | prod-east, prod-west (rolling, default) |
| Jira release version | MBZ-2140 (with MBZ-2231, MBZ-2044, MBZ-2210 landing on the same branch); estate mirror epic KAN-23 |
| Evidence bundle | `docs/upgrade/MBZ-2140/14-to-15/` on branch `feature/MBZ-2140-angular-14-to-15` (Artifactory `generic-cswt-release-evidence` URL to be added by `Jenkinsfile.release`) |

## 2. Summary of change

Framework and toolchain upgrade of a customer-facing application, no functional change. Northgate Business
(`northgate-business-web`, APP-10443) moves from Angular 14.2.12 to Angular 15.2.10 with its prerequisites landed
in order on the same branch: Node 14.21.3 -> 16.20.2 (MBZ-2231, off the end-of-life `nodejs14-rhel7` agent onto
`nodejs16-rhel8`), RxJS 6.6.7 -> 7.5.7 (MBZ-2044), TSLint/codelyzer -> angular-eslint (supersedes ADR 0003),
`@northgate/canopy-ui` 3.5.0 -> 3.7.2 -> 4.0.0 (MBZ-2210, ends the two-minors-behind pin of ADR 0004) and Angular
Material 14 -> 15 with the MDC component migration. The reason now is the estate Angular 14 -> 15 wave (KAN-23):
Canopy 4.0.0 requires Angular 15, Angular 14 and Node 14 are both out of support under FRAMEWORK_SUPPORT_STANDARD,
and the Node 14 build agent is being retired (TOOL-1301). Routes, BFF contracts, feature flags, the hand-rolled NgRx
state and the frozen legacy module do not change; the visible change is the Material Design Components restyling of
the Material widgets business-web uses directly (tables, form fields, dialogs, toggles, checkboxes, buttons), which
is evidenced with before/after screenshots and awaits a human acceptance decision (KAN-31). Exactly one major per
tool; Angular 16, Node 18 and RxJS 8 are not part of this change.

## 3. Scope

### In scope

| component | from | to | change |
|---|---|---|---|
| `northgate-business-web` source, `develop` | Angular 14.2.12 / CLI 14.2.12 | Angular 15.2.10 / CLI 15.2.11 | `ng update` + Material 15 MDC migration, 20 TS / 18 SCSS / 2 HTML files, `tsconfig` target ES2022 |
| Node toolchain (`.nvmrc`, `engines`, `Dockerfile`, `Jenkinsfile`) | 14.21.3 / npm 6.14.18 / `nodejs14-rhel7` / `node:14.21.3-bullseye-slim` | 16.20.2 / npm 8.19.4 / `nodejs16-rhel8` / `node:16.20.2-bullseye-slim` | **BLOCKED on KAN-29** |
| `package-lock.json` | v1 | v2 (npm 8) | regenerated per step; see 7 for the Artifactory re-resolve |
| RxJS | 6.6.7 | 7.5.7 | 49 `toPromise()` -> `lastValueFrom()` sites |
| Lint | TSLint 6.1.3 + codelyzer 6.0.2 | angular-eslint 15.2.1 / eslint 8.57.1 | `tslint.json` deleted, `.eslintrc.json` added, `npm run lint` = `ng lint` |
| `@northgate/canopy-ui` | 3.5.0 | 4.0.0 (via 3.7.2) | pin; Canopy 4.0.0 is on the Stage 1 Verdaccio only (KAN-23 waiver) |
| `@angular/material`, `cdk`, `material-moment-adapter` | 14.2.7 | 15.2.9 | MDC components; local `.mat-*` overrides replaced by MDC tokens / Canopy public classes |
| `@angular/flex-layout` | 14.0.0-beta.41 | removed | zero usages |
| `@ngrx/*`, `ngx-mask`, TypeScript, zone.js | 14.3.3 / 14.3.3 / 4.7.4 / 0.11.8 | 15.4.0 / 15.2.3 / 4.9.5 / 0.12.0 | peer-driven |
| `.npmrc` | `legacy-peer-deps=true` present | removed; `engine-strict`, `save-exact`, `audit=false`, `fund=false` unchanged | GIS-owned file (CODEOWNERS) |
| `package.json` `overrides` | none | `node-releases: 2.0.44` | engines-only override so `engine-strict` can stay; not an audit override (REPORT.md 3.1) |
| Docs | ADR 0003/0004 | ADR 0005 added, 0003 superseded, 0004 updated; README "Known state"; `docs/upgrade/MBZ-2140/` | |

### Out of scope / explicitly not changing

- No Angular 16/17/18, no Node 18, no RxJS 8, no Canopy 5 (one major per tool, playbook rule 1).
- `bff-business`, Keystone, helm chart values, nginx config, WAF, IdP configuration, feature flags
  (`positivePay` stays off), routes, BFF paths, `environment.useFixtures`.
- Hand-rolled NgRx state (ADR 0002) and `src/app/legacy/**` behaviour (only two mechanical `toPromise` rewrites,
  REPORT.md 3.2). `nacha-format.constants.ts` CRLF untouched.
- Jenkins `coverageThreshold` (stays 20). `CODEOWNERS`, `checkmarx.yml`, `SECURITY.md`.
- Canopy source (`northgate-canopy-ui`): not modified; its own PR #3 is Stage 1.
- Any visual tuning of the MDC defaults (KAN-31), the Canopy `dense`/-2 density (KAN-34, not used), the
  `cn-filter-chips` legacy implementation (KAN-28, kept as shipped), the Canopy typography rename table (KAN-33,
  no overrides here to rename).
- Audit findings: no `overrides`, `npm audit fix --force` or `.npmrc` audit setting added to change results.

## 4. Risk assessment

| | |
|---|---|
| Risk rating | **Medium** (customer facing; the application initiates payments - ACH, wires, payroll - although this change does not touch payment logic) |
| Customer impact during implementation | None expected (rolling deploy of a static SPA behind nginx; no schema, no session invalidation) |
| Customer impact if it goes wrong | Visual/layout regression in the business UI or a runtime error in a Material widget; worst case a page that does not render until rollback (minutes, section 8). No data-integrity exposure: all writes go through `bff-business`, unchanged. |
| Regulatory or data classification considerations | Internal (masked customer data, `DATA_CLASSIFICATION.md`). No PII flow changes. GIS-STD-014 files changed: `Jenkinsfile`, `Dockerfile`, `.npmrc` -> GIS review under KAN-29. GIS-1180 forbidden-strings check PASS on the worktree. |
| Dependencies on other changes | (a) KAN-29 / MBZ-2231 / TOOL-1301: `nodejs16-rhel8` agent available to this job and GIS sign-off on `.npmrc`/`Jenkinsfile`/`Dockerfile`; (b) KAN-23: `@northgate/canopy-ui@4.0.0` published to Artifactory `npm-northgate` (Stage 1, CNPY-2140 PR #3 merged and released) followed by the lockfile re-resolve commit (section 7 step 1); (c) KAN-32/KAN-37 GIS decision covering the three dev-only audit ids (section 6). |
| Blast radius | None downstream: business-web is an application, nothing consumes it. Shares `bff-business` with ledgerline-web but does not change it. |

Specific failure mode worried about: **Material MDC restyling changing layout on the transactions/approvals/payroll
tables and forms** (the "accountant persona notices" problem from ADR 0004). Mitigation: every pre-MDC `.mat-*`
override was individually replaced with the MDC public equivalent or removed, compact density is preserved through
the Canopy config, and ten main pages were screenshotted before and after at 1440x900 for a human to accept or
tune (`visual/README.md`, seven differences listed with the one-line fix for each). Second failure mode: **`npm ci`
`EINTEGRITY` on the agent** because the lockfile carries the local Verdaccio tarball hash for Canopy 4.0.0 -
mitigated by making the Artifactory re-resolve an explicit pre-merge step (7.1) rather than discovering it in the
release job.

## 5. Dependency and platform changes

| dependency | from | to | reason | DEPENDENCY_POLICY.md exception ref (if any) |
|---|---|---|---|---|
| Node (`.nvmrc`, `engines`, agent, Dockerfile base) | 14.21.3 / `nodejs14-rhel7` | 16.20.2 / `nodejs16-rhel8` | Node 14 EOL 2023-04-30; agent retirement TOOL-1301 | none; **KAN-29 GIS review of `.npmrc`/`Jenkinsfile`/`Dockerfile` pending** |
| npm / lockfile | 6.14.18 / v1 | 8.19.4 / v2 | ships with Node 16.20.2 | none |
| `@angular/*` (core, common, compiler, compiler-cli, forms, router, platform-browser(-dynamic), animations) | 14.2.12 | 15.2.10 | Angular 14 LTS ended 2023-11-18; Canopy 4 peer | none |
| `@angular/cli`, `@angular-devkit/build-angular` | 14.2.12 | 15.2.11 | with core | none |
| `@angular/material`, `cdk`, `material-moment-adapter` | 14.2.7 | 15.2.9 | with core; MDC | none |
| `@northgate/canopy-ui` | 3.5.0 | 4.0.0 (3.7.2 intermediate commit) | estate design system, Angular 15 line | **KAN-23 gate waiver**: 4.0.0 is on the Stage 1 Verdaccio only, not on Artifactory; no Stage 2/3 PR may merge until it is |
| `@angular/flex-layout` | 14.0.0-beta.41 | removed | unused; blocked Material 15 resolve | none |
| `rxjs` | 6.6.7 | 7.5.7 | Canopy peer `^7`; 6.x unsupported | none |
| `@ngrx/store`, `effects`, `store-devtools` | 14.3.3 | 15.4.0 | Angular 15 peer | none |
| `ngx-mask` | 14.3.3 | 15.2.3 | Angular 15 peer | none |
| `typescript` | 4.7.4 | 4.9.5 | Angular 15.2 range `>=4.8.2 <5.0` | none |
| `zone.js` | 0.11.8 | 0.12.0 | Angular 15 peer `~0.11.4 \|\| ~0.12.0` | none |
| `tslint`, `codelyzer` | 6.1.3 / 6.0.2 | removed | deprecated upstream 2019; ADR 0005 | none |
| `@angular-eslint/*` | - | 15.2.1 | replaces TSLint | none |
| `eslint`, `@typescript-eslint/eslint-plugin`+`parser`, `eslint-plugin-import`, `-jsdoc`, `-prefer-arrow` | - | 8.57.1, 5.43.0, 2.31.0, 39.9.1, 1.2.3 | angular-eslint toolchain; exact pins (reasons in `A3-angular-eslint14/rule-conversion-notes.md`) | none |
| `node-releases` (devDependency + `overrides`) | 2.0.6 | 2.0.44 | npm 8 enforces transitive `engines`; 2.0.54+ demands Node 18 | none (no advisory involved); disclosed for KAN-29 |

- Xray report for the new versions: to be produced by the pipeline on the `nodejs16-rhel8` agent (cannot run here).
  Local `npm audit` full/production logs per step are in the bundle (`*/npm-audit.log`, `*/npm-audit-production.log`).
- Lifecycle status of everything in the "to" column: Node 16.20.2 - **end of life 2023-09-11** (vendor), the estate's
  agreed interim step (`nodejs16-rhel8` is the supported label in `jenkins-shared-library/README.md`; Node 18 is the
  next hop, not this one); Angular 15.2 - LTS **ended 2024-05-18**, the next supported step towards the
  FRAMEWORK_SUPPORT_STANDARD target (one major at a time); Material 15.2 same as Angular; RxJS 7.5 - active 7.x
  line (7.8 is current, 7.5 matches the estate); TypeScript 4.9 - superseded by 5.x, in Angular 15's range;
  zone.js 0.12 - Angular 15 line; Canopy 4.0.0 - current Canopy line (Stage 1); angular-eslint 15 - matches
  Angular 15; eslint 8.57.1 - last 8.x (9.x needs flat config, not in angular-eslint 15).
- Confirm no version moves outside the estate version map without an ADR: **ADR 0005**
  (`docs/adr/0005-angular-14-to-15-toolchain.md`) records the toolchain decision and supersedes ADR 0003 / updates
  ADR 0004. Every version is the one the estate wave prescribes (Node 16.20.2, RxJS 7.5.x, Canopy 4.0.0, Angular 15.2).

## 6. Testing and evidence

| evidence | location | result |
|---|---|---|
| Unit tests and coverage (threshold from the Jenkins job: lines 20) | `C-angular15/test.log`, `C-angular15/coverage-summary.txt`; per step in `A1..A4/` | 32/32 specs, lines **22.13%** on every step (baseline 22.13%). Branch % moved 37.82 -> 12.91 because ES2022 output has fewer instrumented helper branches (denominator 1655 -> 983); not the gate metric; REPORT.md 3.5 |
| Production build | `*/build.log` | PASS on every step; initial 1.92 MB -> 2.19 MB (budget warn 3 MB), no budget warning |
| Lint | `00-baseline-14/lint.log` (TSLint), `A3..C/lint.log` (ESLint) | 0 errors throughout; 88 -> 90 warnings, all pre-existing warning-severity rules; no rule silently disabled (`A3-angular-eslint14/rule-conversion-notes.md`) |
| Sonar quality gate | pipeline (not runnable here) | pending Jenkins run on `nodejs16-rhel8` |
| Checkmarx scan (no High or Critical open) | pipeline (`checkmarx.yml` unchanged) | pending Jenkins run |
| Xray dependency scan (no High or Critical open) | pipeline | pending; local `npm audit` below |
| `npm audit` full / `--production` vs baseline id sets | `*/npm-audit-ids.txt`, `*/npm-audit-production-ids.txt`, `*/npm-audit-new-vs-baseline.txt` | production: **0 new ids** on every step (17 = 17). Full: 0 new through A4; **3 new dev-only ids after C** (table below), expected and covered by KAN-32/KAN-37. `npm audit` exits 1 on every step *including the untouched baseline* |
| uat regression suite | pipeline / uat | pending |
| Manual UAT sign off | - | TBC (name, date) |
| Visual before/after (KAN-31) | `visual/before-angular-14-canopy-3.5.0/`, `visual/after-angular-15-canopy-4.0.0/`, `visual/README.md` | 10 pages each, 1440x900; 7 MDC-default differences listed for the human decision; 3 pre-existing missing-icon console errors identical before and after |
| Estate smoke (`CONSUMERS.md`) | `D-estate-smoke/estate-up.log`, `smoke.log`, `verify-estate-quick.log` | `smoke.sh` 18 PASS / 0 FAIL / 2 SKIP (beacon, documents-service not started); `verify-estate.sh --quick` 77 PASS / 1 FAIL / 18 SKIP - the FAIL is `mock-external` generated Verdaccio storage metadata, every business-web row PASS |
| Forbidden strings (GIS-1180) | `*/forbidden-strings.log` | PASS on every step |
| Performance test (Medium) | - | not applicable: static bundle, +15 kB transfer; no server-side change. CAB may waive or request a Lighthouse run in uat |
| Accessibility check (customer facing UI) | - | not run here; MDC components ship the Material a11y behaviour; request the standard axe pass in uat (recommended given the widget restyle) |
| Security review (GIS-STD-014 material changed: `Jenkinsfile`, `Dockerfile`, `.npmrc`) | KAN-29 | **pending - blocking** |

Open scanner findings carried into prod, with the GIS risk acceptance reference for each:

| finding id | severity | GIS acceptance | expiry |
|---|---|---|---|
| GHSA-52v5-jr5w-gjxr (`sigstore` via `@angular/cli@15` -> `pacote`, dev only) | high | KAN-32 / KAN-37 (estate-wide, Angular 15 CLI) | per KAN-37 |
| GHSA-73wf-gq98-2v4g (`browserslist` nested under `@angular-devkit/build-angular@15`, dev only) | high | KAN-32 / KAN-37 | per KAN-37 |
| GHSA-c83g-rgw3-j3cx (`browserslist`, same) | high | KAN-32 / KAN-37 | per KAN-37 |
| 17 production-tree ids present on `develop` today (`00-baseline-14/npm-audit-production-ids.txt`; the set is identical after this change) | severities per id in the file (`high`/`moderate`/`low` column) | carried from the current release; existing GIS acceptance for `northgate-business` 2026.x | as existing |
| 46 further dev-only ids present on `develop` today (`00-baseline-14/npm-audit-ids.txt` minus the production set); 6 of them disappear with codelyzer/tslint and the Angular 14 CLI, 40 remain, plus the 3 new above = 60 unique ids in `C-angular15/npm-audit-ids.txt` | mixed | carried | as existing |

No finding was suppressed, overridden or re-scoped to change these numbers.

## 7. Implementation plan

Pre-merge (on the branch, before the train's code freeze):

1. **Stage 1 publishes `@northgate/canopy-ui@4.0.0` to Artifactory `npm-northgate`** (CNPY-2140 PR #3 merged and
   released, KAN-23). Then, on this branch, re-resolve the two `@northgate/*` lockfile entries against Artifactory
   (`npm install @northgate/canopy-ui@4.0.0 --package-lock-only`, verify the `integrity` fields change and nothing
   else does; commit `MBZ-2210 Re-resolve Canopy 4.0.0 from Artifactory`). Without this `npm ci` on the agent fails
   `EINTEGRITY` (REPORT.md 5.3). ~15 min.
2. **KAN-29 closed**: `nodejs16-rhel8` label available to the `northgate-business` job; GIS sign-off on
   `.npmrc`, `Jenkinsfile`, `Dockerfile` and the `node-releases` override recorded on the PR.
3. Jenkins PR build green on `nodejs16-rhel8` (Sonar, Checkmarx, Xray, coverage 20). Attach reports to this record
   (section 6).
4. KAN-31 decision recorded (accept MDC defaults as-is, or a follow-up MBZ item for the tunings listed in
   `visual/README.md`). Merge the PR to `develop`; it rides the next train's `release/2026.MM` cut.

Implementation window (Thu, rolling):

5. Implementer: `Jenkinsfile.release` for `northgate-business` with the train tag; image built from the
   `node:16.20.2` stage of the shared Dockerfile; helm upgrade prod-east (~10 min), verify `/health`, sign-in,
   accounts page, approvals queue, payroll wizard first step, one report preview (the pages in `visual/`); then
   prod-west (~10 min), same verification.
6. Post-deploy: Splunk error-rate dashboard for `northgate-business` for 30 min; nginx 5xx and JS error counts
   compared with the previous hour.

Estimated duration: 45 minutes. Bridge: TBC. Communications: business-digital release engineer notifies the
service desk at window start and end (standard notice, no customer comms - no expected impact).

## 8. Rollback plan

| | |
|---|---|
| Rollback trigger | Any page in the smoke list failing to render, JS error rate > 2x previous hour, or a business-digital / product call within the window or hypercare on the MDC visuals. |
| Rollback steps | `helm rollback northgate-business <previous revision>` in prod-east then prod-west (static SPA image; no schema, no session or token format change - Keystone tokens are unaffected). On-call runbook `docs/runbooks/business-web.md`. |
| Rollback duration | ~5 minutes per region. |
| Point of no return | None within the window. Source rollback is `git revert` of the branch commits in reverse order (REPORT.md 9); reverting to the Node 14 toolchain additionally needs the `nodejs14-rhel7` agent to still exist, which is why KAN-29 must be sequenced so the old label survives until this change has soaked one train. |
| Rollback tested in uat on | TBC (helm rollback is the standard tested path for this chart) |

## 9. AI-assisted changes

| | |
|---|---|
| AI-assisted content present | Yes - all code, configuration and documentation changes on the branch |
| Tool(s) and approved-tool register entry | Devin (Cognition), register entry AIT-014 (TECH-POL-031) |
| Commits or PRs carrying the `AI-Assisted:` trailer | The artefact commits (from `MBZ-2140 Add hop artefacts...` onwards) carry `AI-Assisted: AIT-014` / `AI-Assisted-Scope: all`. **Gap:** the nine earlier commits (`f0fb52d` .. `bc36b86`, i.e. baseline, A1, A2, A3, A4, B, C, evidence) carry only a `Co-Authored-By: Devin AI` trailer, not the policy trailer; they were pushed before the omission was noticed and are not amended. Under AI_ASSISTED_CODE_POLICY P2 they are to be reviewed as unlabelled AI-assisted content (policy section 6). The PR description carries the required **AI-assisted content** section covering the whole branch. Raised as a new Jira item. |
| Human reviewer(s) of the AI-assisted content (not the prompter) | TBC (`@northgate/business-digital` reviewer + `@northgate/cswt-architecture` for `docs/adr/` + `@northgate/gis-appsec` for `Jenkinsfile`, `Dockerfile`, `.npmrc`) |
| Review evidence | PR review with `northgate-platform-tooling/docs/templates/PR_REVIEW_AI.md` checklist completed (to be linked) |
| Scanner results for AI-assisted files specifically | same as section 6 once the pipeline has run (whole repository scanned; no delta expected) |

## 10. Post implementation

- Hypercare owner and duration: business-digital on-call, 48 hours after deploy; product owner spot-check of the
  transactions, approvals and payroll screens on day 1 (the KAN-31 pages).
- Success criteria: `northgate-business` serving on both regions, error rate at or below the previous week's
  baseline, no P1/P2 raised on layout; Jenkins job green on `nodejs16-rhel8`; `nodejs14-rhel7` label no longer
  referenced by this repository.
- Monitoring: Splunk `northgate-business` error dashboard; nginx access/5xx; Lantern is not used by this app.
- PIR required: No (Medium, no incident) unless rollback is triggered.

## 11. Approvals

| role | name | date |
|---|---|---|
| Change owner | TBC | |
| Technical approver (not on the requesting team) | TBC (`@northgate/cswt-architecture`) | |
| GIS AppSec (GIS-STD-014 files, KAN-29) | TBC (`@northgate/gis-appsec`) | |
| Release manager | TBC | |
