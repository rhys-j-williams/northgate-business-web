<!-- Generated with AI assistance (AIT-014) on 2026-09-09; reviewed by <handle>. -->
# MBZ-2140 hop report: northgate-business-web Angular 14 -> 15

| | |
|---|---|
| Repository | `rhys-j-williams/northgate-business-web` (Northgate Business, CMDB APP-10443) |
| Branch | `feature/MBZ-2140-angular-14-to-15` -> `develop` |
| Hop | Angular 14.2.12 -> **15.2.10** (CLI 14.2.12 -> 15.2.11), one major, no chaining to 16 |
| Prerequisites landed on the same branch, in order | Node 14.21.3 -> **16.20.2** (MBZ-2231) - RxJS 6.6.7 -> **7.5.7** (MBZ-2044) - TSLint 6.1.3 + codelyzer -> **angular-eslint 14.4.0** then 15.2.1 - Canopy 3.5.0 -> **3.7.2** -> **4.0.0** (MBZ-2210) - Material 14.2.7 -> **15.2.9 (MDC)**, TypeScript 4.7.4 -> **4.9.5**, zone.js 0.11.8 -> **0.12.0** |
| Wave position | Stage 3 (application) of the estate Angular 14 -> 15 wave, after Canopy 4.0.0 (Stage 1, CNPY-2140 PR #3). Angular 15 -> 16 is **not** started here. |
| Jira | MBZ-2140 (story), MBZ-2231 / TOOL-1301 (Node agent), MBZ-2044 (RxJS), MBZ-2210 (Canopy pin); estate mirror epic **KAN-23**; blocked on **KAN-29** (Node 14 retirement + GIS `.npmrc`/CODEOWNERS review); decisions respected, not made: KAN-27, KAN-28, KAN-31, KAN-32/KAN-37, KAN-33, KAN-34 |
| ADR | [`docs/adr/0005-angular-14-to-15-toolchain.md`](../../../adr/0005-angular-14-to-15-toolchain.md) (supersedes 0003, updates 0004) |
| Matrix | [`docs/upgrade/MBZ-2140/COMPATIBILITY_MATRIX.md`](../COMPATIBILITY_MATRIX.md) |
| CAB | [`CAB_RECORD.md`](CAB_RECORD.md) (draft; cannot be submitted before KAN-29 and the Canopy 4.0.0 Artifactory publish) |
| Consumers | [`CONSUMERS.md`](CONSUMERS.md) (application: estate smoke) |
| Deprecations | [`deprecations.log`](deprecations.log) |
| Visual | [`visual/README.md`](visual/README.md) (before/after screenshots for KAN-31) |

Every log cited below is in this directory. `00-baseline-14/` is the Angular 14.2.12 state of `origin/develop`
before any change; `A1-node16/`, `A2-rxjs7/`, `A3-angular-eslint14/`, `A4-canopy-3.7.2/` and `C-angular15/`
hold the same gate set after each step (B's gates are C's gates, see 3.5); `D-estate-smoke/` is the end-of-hop
estate run. Each step folder has a `gate-summary.txt` with the exit code of every gate command.

**Result: PASS_WITH_BLOCKERS.** Every gate that was green on the baseline is green at the end (build, 32/32 specs,
lines coverage 22.13% against the Jenkins threshold 20, lint 0 errors, forbidden strings, ng/node/npm versions).
`npm audit` shows exactly the three expected dev-only ids and nothing else new. The PR cannot merge until
KAN-29 (Node agent / GIS review) is closed and Canopy 4.0.0 is on Artifactory (KAN-23 gate waiver). Visual
acceptance of the MDC defaults is a human decision (KAN-31) with evidence in `visual/`.

## 1. Toolchain

| item | baseline (develop) | after A1 | after A2 | after A3 | after A4 | after B+C (branch head) |
|---|---|---|---|---|---|---|
| Node / npm | 14.21.3 / 6.14.18 | **16.20.2 / 8.19.4** | = | = | = | = |
| Jenkins agent | `nodejs14-rhel7` | **`nodejs16-rhel8`** | = | = | = | = |
| `@angular/*` | 14.2.12 | = | = | = | = | **15.2.10** |
| `@angular/cli`, `build-angular` | 14.2.12 | = | = | = | = | **15.2.11** |
| `@angular/material`, `cdk`, `material-moment-adapter` | 14.2.7 (legacy components) | = | = | = | = | **15.2.9 (MDC)** |
| `@angular/flex-layout` | 14.0.0-beta.41 (unused) | = | = | = | = | **removed** |
| `@northgate/canopy-ui` | 3.5.0 | = | = | = | **3.7.2** | **4.0.0** (local Verdaccio only) |
| `@northgate/domain-fixtures` | 1.6.0 | = | = | = | = | = |
| RxJS | 6.6.7 | = | **7.5.7** | = | = | = |
| `@ngrx/store`, `effects`, `store-devtools` | 14.3.3 | = | = | = | = | **15.4.0** |
| `ngx-mask` | 14.3.3 | = | = | = | = | **15.2.3** |
| TypeScript | 4.7.4 | = | = | = | = | **4.9.5** |
| zone.js | 0.11.8 | = | = | = | = | **0.12.0** |
| Lint | TSLint 6.1.3 + codelyzer 6.0.2 | = | = | **angular-eslint 14.4.0**, eslint 8.57.1, @typescript-eslint 5.43.0 | = | **angular-eslint 15.2.1** (eslint / ts-eslint unchanged) |
| `tsconfig` target | es2020 | = | = | = | = | **ES2022**, `useDefineForClassFields: false` |
| `.npmrc` | engine-strict, save-exact, **legacy-peer-deps**, audit=false, fund=false | comments only | **legacy-peer-deps removed** | = | = | = |
| lockfile | v1 (npm 6) | **v2 (npm 8)** | = | = | = | = |
| `package.json` `overrides` | none | **`node-releases: 2.0.44`** (engines, see 3.1) | = | = | = | = |

## 2. Commits (all on `feature/MBZ-2140-angular-14-to-15`, base `origin/develop`)

| step | commit | message | source files changed (excluding `docs/upgrade`) |
|---|---|---|---|
| 00 | `f0fb52d`, `81feab0` | MBZ-2140 Record Angular 14 baseline evidence / baseline screenshots | none |
| A1 | `6d574ef` | MBZ-2231 Move Northgate Business to Node 16.20.2 and the nodejs16-rhel8 agent | `.nvmrc`, `.npmrc`, `Dockerfile`, `Jenkinsfile`, `package.json`, `package-lock.json` |
| A2 | `4e8f9e0` | MBZ-2140 Upgrade RxJS 6.6.7 to 7.5.7, replace toPromise with lastValueFrom, drop legacy-peer-deps | `.npmrc`, `package.json`, lockfile, 21 `.ts` (49 `toPromise()` sites) |
| A3 | `d00f527` | MBZ-2140 Replace TSLint and codelyzer with angular-eslint 14 | `.eslintrc.json` (+), `tslint.json` (-), `angular.json`, `Jenkinsfile`, `package.json`, lockfile, 7 `.ts` (return types only) |
| A4 | `4cec227` | MBZ-2210 Pin @northgate/canopy-ui 3.7.2 | `package.json`, lockfile |
| B | `4aa0baa` | MBZ-2210 Pin @northgate/canopy-ui 4.0.0 with Angular 15 / Material 15 peers | `package.json`, lockfile (flex-layout removed) |
| C | `77d3553` | MBZ-2140 Upgrade Angular 14 -> 15 with Material MDC migration | `angular.json`, `tsconfig.json`, `src/test.ts`, `src/styles.scss`, 16 component `.scss`, 2 component `.html` |
| D | `bc36b86` | MBZ-2140 Record Angular 15 / Canopy 4 screenshots and estate smoke evidence | none |
| docs | (this commit and later) | MBZ-2140 Add hop artefacts, ADR 0005, README known state | `docs/**`, `README.md` |

There is no `CHANGELOG.md` in this repository (never has been; release notes are the CAB record and the train's Jira
version), so the playbook's "update CHANGELOG" item is satisfied by `CAB_RECORD.md` 2 and the README "Known state"
section; none was created.

Commit messages follow `KEY-1234 Imperative summary` (hook-enforced). `CODEOWNERS` is **not** changed; nothing
in the hop required an edit to it (section 5.4). The three GIS-owned paths that did change (`Dockerfile`,
`Jenkinsfile`, `.npmrc`) are listed in `CAB_RECORD.md` 5 for `@northgate/gis-appsec`.

## 3. Steps

### 3.0 Baseline (`00-baseline-14/`)

Node 14.21.3 / npm 6.14.18, `npm ci` from the estate Verdaccio with Canopy 3.5.0. `lockfile-verdaccio-integrity.log`:
the committed v1 lockfile's `integrity` for `@northgate/canopy-ui@3.5.0` and `@northgate/domain-fixtures@1.6.0` was
the hash of a tarball built elsewhere and does not match the tarballs this environment's Verdaccio published from
source (a rebuilt tarball has a different hash), so the baseline install dropped those two integrity fields in the
working copy (not committed) to get `npm ci` through - see 5.3 for the consequence on the branch lockfile. Build green (initial 1.92 MB / 388.69 kB
transfer, `build.log`), 32/32 specs, lines 22.13% (`coverage-summary.txt`), `npm run tslint` 0 errors / 88 warnings
(`lint.log`), `npm audit` 63 distinct ids full / 17 production (`npm-audit-ids.txt`, `npm-audit-production-ids.txt`),
`ng version`, `npm ls --depth=0`. `flex-layout-inventory.log`: `@angular/flex-layout` is a direct dependency with
**zero** `fx*` directives or `FlexLayoutModule` imports in `src/`. `lantern-grep.log`: no `@northgate/lantern-sdk`
dependency, import or reference - the Lantern hop is not applicable to this repository. `README-known-state.md`: the
README "Known state" section copied verbatim before it was edited.

### 3.1 A1 Node 14.21.3 -> 16.20.2 (`A1-node16/`, commit `6d574ef`) - BLOCKED ON KAN-29

- `.nvmrc` 16.20.2; `engines` `node 16.20.2 / npm 8.19.4`; `.npmrc` keeps `engine-strict=true` (MBZ-1877) and
  `save-exact=true`, comment text updated; `Jenkinsfile` `agentLabel: 'nodejs16-rhel8'` (the supported Node 16
  label per `platform-tooling/jenkins-shared-library/README.md` "Build agents"), `nodeVersion: '16.20.2'`, the rhel7
  `CHROME_BIN` override removed (rhel8 image ships Chrome 120 = library default); `Dockerfile` base
  `node:16.20.2-bullseye-slim`.
- Lockfile: npm 8 in-place upgrade of the committed v1 lockfile to v2 (`npm-install-lockfile.log`). A fresh
  resolve was **rejected by engine-strict**: transitive `node-releases@2.0.54/55` declares `engines.node >= 18`,
  which npm 8 enforces on transitive packages (npm 6 did not). Rather than weaken `engine-strict`, `package.json`
  gained `"overrides": { "node-releases": "2.0.44" }` (the last release with no `engines` field) and the existing
  direct devDependency `node-releases` moved 2.0.6 -> 2.0.44 (npm refuses an override that conflicts with a direct
  pin, EOVERRIDE). **This is an engines override, not an audit override**: `node-releases` has no advisory at any
  version, and the audit id sets before and after A1 are identical (section 4). It is disclosed here because
  `package.json` `overrides` is exactly the mechanism the playbook forbids for hiding findings, and because it is
  part of the `.npmrc`-adjacent change set GIS reviews under KAN-29.
- Gates all green, audit ids unchanged (`gate-summary.txt`, `npm-audit-new-vs-baseline.txt`: 0 new).
- **Blocked**: the `nodejs16-rhel8` label and the GIS-reviewed `.npmrc` change are the KAN-29 / MBZ-2231 /
  TOOL-1301 items. The work is on the branch; the PR must not merge until KAN-29 is closed.

### 3.2 A2 RxJS 6.6.7 -> 7.5.7 (`A2-rxjs7/`, commit `4e8f9e0`)

- 49 `toPromise()` call sites in 21 files -> `lastValueFrom(...)` (per-line list `toPromise-migration.log`;
  rationale for `lastValueFrom` over `firstValueFrom` in `deprecations.log` A2). Two of the files are in the
  frozen legacy module (one call each, mechanical rewrite only, still unlinted) - recorded, not hidden.
- No `rxjs-compat`, no `rxjs/Rx` or `rxjs/internal` imports existed; `rxjs/operators` imports stay valid in 7.5.
  No `Subscription`/`subscribe(next, error, complete)` pattern needed changing.
- `legacy-peer-deps=true` **removed** from `.npmrc`: `npm install` without it resolves with no ERESOLVE
  (`legacy-peer-deps-check.log`).
- Gates green, 32/32, 0 new audit ids. Initial bundle 1.91 MB (rxjs 7 is smaller).

### 3.3 A3 TSLint + codelyzer -> angular-eslint 14 (`A3-angular-eslint14/`, commit `d00f527`)

- `ng add @angular-eslint/schematics@14.4.0` (`ng-add.log`), `ng g @angular-eslint/schematics:convert-tslint-to-eslint
  --project northgate-business --remove-tslint-if-no-more-tslint-targets` (`convert-tslint-to-eslint.log`), `tslint.json`
  deleted, `codelyzer`/`tslint` removed from `package.json`, scripts `lint` = `ng lint`, `Jenkinsfile`
  `lintCommand: 'npm run lint'`.
- **No rule silently disabled.** `rule-conversion-notes.md` lists every TSLint rule the converter could not translate
  (`ban` - re-implemented with `no-restricted-properties` / `no-restricted-syntax` / `no-eval`, GIS-STD-014 messages
  verbatim), every rule it dropped without an equivalent (`import-blacklist`, `typedef`, `no-console` - hand-mapped),
  and every ng-cli-compat rule that was stricter than the old `tslint.json` and was re-scoped to the TSLint behaviour
  (`member-ordering`, `naming-convention`, `prefer-arrow`, `max-len`). One known gap: TSLint `deprecation` (warning)
  has no ESLint equivalent without `eslint-plugin-deprecation`, which is not in the approved dependency set - listed
  for the reviewer as a gap, not disabled.
- Result: `npm run lint` 0 errors / 90 warnings (baseline TSLint 0 / 88); every warning rule was already
  warning-severity. Seven `.ts` files gained explicit return types (annotations only). Pins exact: `eslint 8.57.1`,
  `@typescript-eslint/* 5.43.0`, `eslint-plugin-import 2.31.0`, `eslint-plugin-jsdoc 39.9.1`,
  `eslint-plugin-prefer-arrow 1.2.3` (reasons in the notes; the converter's `latest` was rejected by `save-exact`
  and `engine-strict`).
- Gates green, 32/32, 0 new audit ids (one id fewer: codelyzer's tree gone).

### 3.4 A4 Canopy 3.5.0 -> 3.7.2 (`A4-canopy-3.7.2/`, commit `4cec227`)

- Pin only. Canopy 3.7.2 is the current `develop` tag published by `mock-external/estate-up.sh`. The 3.6 token
  rename and table-internals change that ADR 0004 feared did not break anything: business-web already ran
  `CnCoreModule.forRoot({ density: 'compact' })` and used `--cn-*` tokens; its `::ng-deep` rules into Canopy target
  BEM class names that 3.6/3.7 kept. None of the Canopy CHANGELOG 3.6.x/3.7.x entries (token rename, table
  internals, density mode, dialog API) required a source change: build, tests and lint are green with the pin alone.
- Gates green, 32/32, 0 new audit ids. Initial bundle 1.98 MB (+70 kB: Canopy 3.7 density CSS).

### 3.5 B Canopy 3.7.2 -> 4.0.0 (`B-canopy-4.0.0/`, commit `4aa0baa`) and C Angular 14 -> 15 (`C-angular15/`, commit `77d3553`)

B and C are consecutive commits because Canopy 4.0.0 declares Angular 15.2 / Material 15.2 peers: the pin cannot
compile against Angular 14 sources, so B moves the dependency tree and C moves the source; the gate set is recorded
once, after C. Nothing between the two commits was pushed as "green".

**B**

- Canopy 4.0.0 was built from `northgate-canopy-ui` `feature/CNPY-2140-angular-14-to-15` (PR #3, not merged) in a
  temporary worktree and published to the local Verdaccio on 4873 (`npm-install-canopy4-material15.log`). It is
  **not on Artifactory** - KAN-23 gate waiver, stated in the PR body. Canopy source was not modified.
- `@angular/flex-layout` removed (zero usages, 3.0; it also blocked the Material 15 resolve,
  `C-angular15/ng-update-material-ngrx.log`).
- Canopy schematic `canopy-4-theme-mixin`: "no Canopy typography overrides found, nothing to do"
  (`ng-update-canopy-migrate.log`). Business-web never overrode Canopy typography levels, so the KAN-33 rename-table
  risk does not touch this repository today; if a later Canopy 4.x changes the table, there is nothing here to
  re-run.
- Theme entry stays `@use '@northgate/canopy-ui/themes'` + `@include canopy.theme()`; the 4.0.0 `styles` entry
  forwards `../lib/*` paths that are not in the published package.

**C**

- `NG_DISABLE_VERSION_CHECK=1 ng update @angular/core@15 @angular/cli@15 @angular-eslint/schematics@15`
  (`ng-update-core-cli.log`; the version check wanted to fetch a CLI that needs Node 22). Migrations: `src/test.ts`
  loses the `require.context` block; `tsconfig.json` target `ES2022` + `useDefineForClassFields: false`; angular-eslint
  15.2.1. No `relativeLinkResolution`, no `RouterLinkWithHref`, no browserslist, no SSR changes needed.
- `ng update @angular/material@15` (`ng-update-material-migrate.log`, 20 files to `legacy-*`), then
  `ng g @angular/material:mdc-migration --components all` (`ng-generate-mdc-migration.log`, 20 `.ts` + 18 `.scss`).
  `@ngrx/*` 15.4.0 and `ngx-mask` 15.2.3 by `ng update` in the same run; TypeScript 4.9.5; zone.js 0.12.0.
- **Local `.mat-*` overrides.** Every migrator TODO was resolved by hand and none remains (`grep TODO(mdc-migration)
  src/` empty; `grep material/legacy src/` empty). Pre-MDC internal selectors were removed or replaced by MDC public
  classes and `--mdc-*` tokens, Canopy public classes, or template attributes - the full before/after list is in
  `deprecations.log` C. The `mat-nav-list` `dense` attribute was removed (KAN-34: no dense / -2 density anywhere;
  compact density stays the Canopy `density: 'compact'` config). The single deliberately kept legacy selector is
  `cn-filter-chips .mat-chip-list-wrapper`, because Canopy 4.0.0 still ships `cn-filter-chips` on the legacy chip
  list (KAN-28). `cn-amount-slider` (KAN-27) is not used by business-web (`grep cn-amount-slider src/` empty).
- Gates (`gate-summary.txt`): build 0 (initial 2.19 MB / 404.13 kB transfer, no budget warning; the only build
  warning is the pre-existing CommonJS notice for `@northgate/domain-fixtures`), test 0 (32/32), lint 0 (0 errors /
  90 warnings, same set as A3), forbidden strings 0, `ng version` 15.2.11, node 16.20.2 / npm 8.19.4.
- **Coverage note.** Lines 22.13% (435/1965) - identical to baseline and the Jenkins metric. Statements 21.86%,
  functions 8.71%. **Branches 12.91% vs 37.82% on baseline**: the denominator moved from 1655 to 983 because the
  `ES2022` target stops TypeScript from down-levelling class fields, optional chaining and async/await into
  instrumented helper branches; no spec was removed or changed (`test.log` lists the same 32). The Jenkins
  `coverageThreshold` is lines-based and unchanged at 20 (`Jenkinsfile`).

### 3.6 D Visual evidence and estate smoke (`visual/`, `D-estate-smoke/`, commit `bc36b86`)

- Ten main pages captured before (develop, Angular 14 / Canopy 3.5.0) and after (branch head) with the workspace
  skill `northgate-local-screenshot-capture` (1440x900, dpr 1, PNG, `fullPage: false`), fixture mode. `approval-detail`
  skipped in both (fixture list renders buttons, not links). `visual/README.md` lists the seven MDC-default
  differences a human must accept or tune under KAN-31 and what is unchanged (compact density, tables' row height,
  legacy filter chips). The three console errors (`cn:refresh`, `cn:chart`, `cn:person-add` missing from the Canopy
  icon registry) are identical before and after - pre-existing, a Canopy item, not fixed here.
- Estate smoke: section 8 and `CONSUMERS.md`.

## 4. Gate results

| gate | baseline | A1 | A2 | A3 | A4 | B+C | note |
|---|---|---|---|---|---|---|---|
| `npm ci` / install from Verdaccio | PASS | PASS | PASS | PASS | PASS | PASS | Canopy 4.0.0 from the local Verdaccio only |
| `npm run build` (production) | PASS 1.92 MB | PASS 1.92 MB | PASS 1.91 MB | PASS 1.91 MB | PASS 1.98 MB | **PASS 2.19 MB** | initial total; transfer 388.69 -> 404.13 kB; budgets unchanged, no warning |
| `npm test` (Karma ChromeHeadlessCI) | 32/32 | 32/32 | 32/32 | 32/32 | 32/32 | **32/32** | |
| coverage lines (Jenkins gate 20) | 22.13% | 22.13% | 22.13% | 22.13% | 22.13% | **22.13%** | threshold unchanged; branches metric see 3.5 |
| lint | tslint 0 err / 88 warn | same | same | eslint 0 / 90 | eslint 0 / 90 | **eslint 0 / 90** | no rule silently disabled (3.3) |
| `npm audit` (full, `--audit`) | exit 1, 63 ids | exit 1, 63 | exit 1, 63 | exit 1, 62 | exit 1, 62 | **exit 1, 60 ids** | non-zero on every step incl. baseline (`.npmrc audit=false` overridden) |
| `npm audit --production` | exit 1, 17 ids | 17 | 17 | 17 | 17 | **17, 0 new** | production id set identical to baseline throughout |
| new ids vs baseline (full) | - | 0 | 0 | 0 | 0 | **3** (expected, dev-only) | `GHSA-52v5-jr5w-gjxr`, `GHSA-73wf-gq98-2v4g`, `GHSA-c83g-rgw3-j3cx`; KAN-32/KAN-37; no override added |
| `ng version` | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | **15.2.11 / core 15.2.10** | |
| `node -v` / `npm -v` | 14.21.3 / 6.14.18 | **16.20.2 / 8.19.4** | = | = | = | = | |
| forbidden strings (GIS-1180) | PASS | PASS | PASS | PASS | PASS | **PASS** | worktree scan of this repository |
| `npm ls --depth=0` / key packages | logged | logged | logged | logged | logged | logged | `npm-ls-depth0.log`, `npm-ls-key.log` |
| visual before/after | captured | | | | | **captured** | `visual/`, human decision KAN-31 |
| estate smoke `smoke.sh` | | | | | | **18 PASS / 0 FAIL / 2 SKIP** | `D-estate-smoke/smoke.log`; skips are beacon + documents-service (not started) |
| `scripts/verify-estate.sh --quick` | | | | | | **77 PASS / 1 FAIL / 18 SKIP** | the one FAIL is `mock-external` generated Verdaccio storage (package-author e-mail metadata under `verdaccio/storage/@babel/...`), not this repository; every business-web row PASS (`verify-estate-quick.log`) |

Red gates, honestly: `npm audit` exits non-zero on every step including the untouched baseline (the tree carries
63 pre-existing advisories, `CAB_RECORD.md` 6); the branch adds three dev-only ids that are already under GIS
decision KAN-32/KAN-37; `verify-estate.sh --quick` fails on a sibling repository's generated registry storage.
Nothing else is red.

## 5. Governance findings

### 5.1 Audit ids new against the baseline (full tree only, production unchanged)

| id | package | path | severity | why it appears now | disposition |
|---|---|---|---|---|---|
| GHSA-52v5-jr5w-gjxr | `sigstore` (via `@angular/cli` -> `pacote`) | dev | high | Angular CLI 15's publish/verify chain | KAN-32 / KAN-37 - GIS decision, carried; not fixable without CLI 16+ |
| GHSA-73wf-gq98-2v4g | `browserslist` (nested under `@angular-devkit/build-angular`) | dev | high | build-angular 15 pins its own browserslist | KAN-32 / KAN-37; build-time only |
| GHSA-c83g-rgw3-j3cx | `browserslist` (same nesting) | dev | high | same | KAN-32 / KAN-37 |

No `overrides` entry, `npm audit fix --force`, or `.npmrc` audit-level change was made to alter these results. The
only `overrides` entry (`node-releases`, 3.1) predates C and changes no advisory. Expected set matches the Stage
context exactly; **no other new id** -> no new audit Jira item.

### 5.2 Carried findings

Sixty pre-existing ids remain in the full tree (all dev: `@angular-devkit/*`, `karma`, `webpack-dev-server`, `less`,
`lodash`, `esbuild`, `image-size`, `tmp`, ...), 17 in production. Listed with disposition in `CAB_RECORD.md` 6.

### 5.3 Dependency policy

All pins exact (`save-exact=true`; `verify-estate --quick` "exact dependency versions" PASS). Every package comes
from the estate registry; Canopy 4.0.0 from the Stage 1 branch build on the local Verdaccio under the KAN-23 waiver.
No dependency from outside the internal registry mirror.

**Lockfile integrity caveat (merge blocker, part of the KAN-23 waiver).** The branch `package-lock.json` records
`resolved: http://localhost:4873/...` (as `develop` already did) and the `integrity` hashes of the tarballs *this*
environment published for `@northgate/canopy-ui@4.0.0` and `@northgate/domain-fixtures@1.6.0`. The 4.0.0 tarball
that Stage 1 eventually publishes to Artifactory will almost certainly not be byte-identical, so `npm ci` on the
Jenkins agent is expected to fail with `EINTEGRITY` on that entry until the lockfile is re-resolved against
Artifactory (`npm install @northgate/canopy-ui@4.0.0 --package-lock-only`, one follow-up commit on this branch;
`domain-fixtures` may need the same). That commit is listed in `CAB_RECORD.md` 7 and cannot be made from this
environment.

### 5.4 CODEOWNERS and GIS-owned files

`CODEOWNERS` unchanged; no edit was required for the build. Changed GIS-owned paths: `Jenkinsfile` (agent label,
node version, lint command, `CHROME_BIN` removal), `Dockerfile` (base image), `.npmrc` (comments; `legacy-peer-deps`
removed). `checkmarx.yml` and `SECURITY.md` unchanged. These are the KAN-29 review items for `@northgate/gis-appsec`.

### 5.5 AI-assisted content (AI_ASSISTED_CODE_POLICY 4.1)

All commits on the branch are AI-assisted (Devin, register AIT-014). Commits `f0fb52d` .. `bc36b86` carry a
`Co-Authored-By: Devin AI` trailer but **not** the `AI-Assisted: AIT-014` / `AI-Assisted-Scope:` trailers the policy
requires; per policy P2 they must be treated as unlabelled AI-assisted content (section 6 of the policy) - they are
not amended (history is pushed). Commits from the artefact commit onwards carry the trailers, and the PR body has the
**AI-assisted content** section. Raised as a new Jira item for the reviewer (`CAB_RECORD.md` 9).

## 6. Bundle and package delta

| | baseline | branch head |
|---|---|---|
| initial total (raw / transfer) | 1.92 MB / 388.69 kB | 2.19 MB / 404.13 kB |
| `angular.json` budgets | initial `maximumWarning 3mb` / `maximumError 6mb`, `anyComponentStyle 8kb / 16kb` | unchanged; no budget warning emitted (`C-angular15/build.log`) |
| direct dependencies | 23 | 22 (`@angular/flex-layout` out, nothing in) |
| direct devDependencies | 16 (incl. `tslint`, `codelyzer`) | 25 (`@angular-eslint/*` x5, `eslint`, `@typescript-eslint/*` x2, 3 eslint plugins in; `tslint`, `codelyzer` out) |
| lockfile | v1 | v2 |

The +270 kB raw / +15 kB transfer is Material MDC (each MDC component ships its own styles) plus Canopy 4's MDC
theme. 2.19 MB is 0.81 MB under the 3 MB initial warning budget; the budget lines are not touched.

## 7. Behaviour and public surface

- No route, service contract, BFF path or feature flag changed. `environment.useFixtures` still `true`.
- Hand-rolled NgRx state (ADR 0002): untouched apart from three selector-factory return-type annotations (A3).
- Legacy module (`src/app/legacy/**`): two one-line `toPromise` -> `lastValueFrom` rewrites (A2); still CRLF file
  untouched; still excluded from lint.
- Visual: MDC defaults as listed in `visual/README.md`; no business-side visual tuning applied (KAN-31).
- `mat-nav-list[dense]` removed (KAN-34).

## 8. Consumers

Application, no downstream package. `CONSUMERS.md` records the estate smoke: `ESTATE_NO_DOCKER=1
../northgate-mock-external/estate-up.sh` (mocks, Verdaccio publish, `bedrock-adapter`, `bff-retail`, `bff-business`
up), `smoke.sh` 18/0/2, `scripts/verify-estate.sh --quick` 77/1/18 with the single FAIL outside this repository,
and the Angular 15 dev server on 4201 serving the ten captured routes against `bff-business` 4501 (fixture mode).
The smoke suite has no business-web-specific step (it exercises Keystone, `bff-retail`, Lantern, Splunk); that gap is
noted in `CONSUMERS.md`.

## 9. Rollback

Branch not merged; rollback is "do not merge". After a merge: `git revert` the docs commit, `77d3553`, `4aa0baa`,
`4cec227`, `d00f527`, `4e8f9e0`, `6d574ef` in that order (each step is self-contained; reverting C+B together is
mandatory, the others may stop at any earlier state), `nvm use` to the restored `.nvmrc`, `npm ci`. The Node 14
agent must still exist for a rollback to A0 - which is exactly why KAN-29 gates the merge. Pipeline impact and the
Artifactory dependency in `CAB_RECORD.md` 8.

## 10. Next / follow-ups (not done here)

1. KAN-29 closure (Node 14 agent retirement, GIS review of `.npmrc`, `Jenkinsfile`, `Dockerfile`, the
   `node-releases` engines override) - merge blocker.
2. Canopy 4.0.0 on Artifactory (Stage 1, KAN-23 waiver) - merge blocker.
3. KAN-31 human decision on the seven MDC visual differences; if tuning is wanted, the candidate one-liners are in
   `visual/README.md` (e.g. `MAT_SLIDE_TOGGLE_DEFAULT_OPTIONS { hideIcon: true }`).
4. KAN-28: replace `cn-filter-chips .mat-chip-list-wrapper` when Canopy moves filter chips to MDC.
5. Missing Canopy icons `cn:refresh`, `cn:chart`, `cn:person-add` (pre-existing) - CNPY item.
6. TSLint `deprecation` rule gap (3.3) - decide on `eslint-plugin-deprecation` in DEPENDENCY_POLICY.
7. `mock-external` generated Verdaccio storage fails `verify-estate.sh` forbidden-strings - mock-external item.
8. AI-Assisted trailer gap on the pre-artefact commits (5.5).
9. Remaining six `::ng-deep` rules into Canopy class names -> Canopy tokens (ADR 0004 spirit).
10. ADR 0004 says the release pipeline's dependency gate asserts the literal `"@northgate/canopy-ui": "3.5.0"`
    (TOOL-1290). No such assertion exists in the checked-out `northgate-platform-tooling` shared library (TOOL-1290
    there is the ITSM CAB-reference check). Platform Engineering to confirm nothing else asserts 3.5.0 before this
    merges - new item.
11. Lockfile `integrity` re-resolution for `@northgate/canopy-ui@4.0.0` (and `@northgate/domain-fixtures@1.6.0`)
    against Artifactory once published (5.3) - one follow-up commit on this branch, merge blocker under 2.
12. Angular 15 -> 16 is a separate hop (needs Node 16 -> 18, TypeScript 5, zone.js 0.13, Canopy 5) - not started.
