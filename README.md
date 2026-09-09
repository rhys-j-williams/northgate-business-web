# Northgate Business (business-web)

Angular 15.2.10 | Node 16.20.2 / npm 8.19.4 | Canopy 4.0.0 | port 4201 | owner **@northgate/business-digital**

Small business banking: accounts, payroll, ACH origination with NACHA upload, domestic wires with
maker-checker, the approvals queue, users and entitlements, reports with CSV, and the four alerts
the regulator cares about. Around fifty components. It works. It has worked since 2019. Nobody has
had budget to touch the tooling between the Angular 12 to 14 step in 2022 (MBZ-1790) and the Angular
14 to 15 hop in 2026 (MBZ-2140: Node 16, RxJS 7, angular-eslint, Canopy 4.0.0, Material MDC; see
`docs/upgrade/MBZ-2140/` and ADR 0005). What is still wrong is listed under "Known state" below. Read
that section before quoting an estimate for anything.

CMDB APP-10443. Data classification: internal (customer data is masked before it reaches the
browser; the BFF does the masking, see DATA_CLASSIFICATION.md).

## Running it

```
nvm use                  # 16.20.2 / npm 8.19.4, enforced by engine-strict (MBZ-1877)
npm ci
npm start                # ng serve on 4201, proxies /api -> bff-business 4501 and /idp -> Keystone mock 4400
```

`@northgate/*` packages come from the estate Verdaccio on 4873 (`mock-external/estate-up.sh`). If
`npm ci` fails on `@northgate/canopy-ui@4.0.0` the registry is not up or 4.0.0 has not been published to
it: until it is on Artifactory (KAN-23) build it from the northgate-canopy-ui branch
`feature/CNPY-2140-angular-14-to-15` and `npm publish` `dist/canopy-ui` to the local Verdaccio.

`environment.useFixtures` is `true` in `environment.ts`. That is deliberate: the BFF is not running
on most laptops and the fixture layer (`core/services/fixture-data.service.ts`, built on
`@northgate/domain-fixtures`) is the same data the smoke stage uses. Flip it to `false` to go through
`bff-business`; `BffGatewayService` probes `/health` once and drops back to fixtures if 4501 is not
answering, so you will not see an empty queue either way. Only accounts, the approvals queue and the
organisation users list are actually served by the BFF today (MBZ-0801); payroll, ACH, wires,
reports and alerts have their BFF paths pencilled in and are fixture-only until PLAT-1352 lands the
remaining controllers.

Sign in with anything the Keystone mock on 4400 accepts. Operator handles and roles come from the
seeded organisation in `@northgate/domain-fixtures` (seed `northgate-business`); the users screen lists
them, and the fixture layer picks the first admin as "you".

## Scripts

| Script | What | Notes |
|---|---|---|
| `npm start` | `ng serve --port 4201` | JIT, no AOT in development (`aot: false`, MBZ-1345, see below) |
| `npm run build` | production build | Webpack browser builder, budgets in `angular.json` |
| `npm test` | Karma, ChromeHeadlessCI, coverage | 32 specs. Coverage around 22 percent; the gate in Jenkins is 20 |
| `npm run lint` | `ng lint` (angular-eslint 15) | 0 errors / 90 warnings; the warnings are the pre-existing warning-severity rules. `npm run tslint` is gone (MBZ-2140, ADR 0005 supersedes ADR 0003) |
| `npm run lint:fix` | `ng lint --fix` | |

There is no e2e target. Protractor was removed in MBZ-1790 and nothing replaced it. QA runs the
business regression pack by hand against UAT on the Wednesday of each train.

## Layout

```
src/app/
  core/          auth (OIDC code flow against Keystone), interceptors, guards, fixture layer, BFF gateway
  store/         NgRx. approvals/ and entitlements/ are hand rolled reducers, not @ngrx/entity (ADR 0002)
  shared/        pipes (mask-account, money), status badge, money cell, confirm dialog wrapper
  layout/        shell, nav, auth callback, signed-out, idle warning
  features/
    accounts/    overview, detail, transactions with filter, statements, CSV export
    payroll/     runs, run detail, employee picker, the three-step new run wizard (MatStepper, direct)
    ach/         batches, NACHA upload + validation report, templates and template editor
    wires/       beneficiaries, new domestic wire, wire detail with approval trail
    approvals/   queue, filters, detail, decision dialog
    users/       users, invite, entitlements editor, permission matrix, limits, dual approval
    reports/     catalogue, parameters, preview (MatTable/MatSort/MatPaginator, direct), history
    alerts/      the regulatory four plus balance thresholds
  legacy/        nacha-parser.service.ts, nacha-format.constants.ts, the 2019 statements, positive-pay and audit-log screens
```

`legacy/` is the 2019 codebase that never got moved. Some of it is still routed (`/legacy/statements`
is what the accountant persona uses), some of it is dead and kept because the parser constants live
next to it. Do not tidy it in a feature PR; MBZ-2019 is the ticket and it is not small.

## Known state

Things that are wrong and known to be wrong, so nobody re-discovers them in a review.

- **Canopy 4.0.0 is not on Artifactory yet.** Pinned exactly (`docs/adr/0005-angular-14-to-15-toolchain.md`
  updates ADR 0004). The estate wave publishes it from the Stage 1 Verdaccio only (KAN-23 gate waiver);
  the lockfile's `integrity` for that entry was recorded against a locally built tarball and must be
  re-resolved when 4.0.0 lands on Artifactory, otherwise `npm ci` on the agent fails `EINTEGRITY`.
- **Angular Material is used directly** in the payroll wizard, reports preview, entitlements editor,
  alerts, wire detail and the approval decision dialog. Since MBZ-2140 those are the MDC components,
  styled through `.mat-mdc-*` / `--mdc-*` public tokens only; the MDC look of those screens has been
  screenshotted (`docs/upgrade/MBZ-2140/14-to-15/visual/`) and awaits a human accept/tune decision
  (KAN-31). Eleven `::ng-deep` rules remain (six into Canopy `.cn-*` class names, five into MDC public
  classes); the `cn-filter-chips .mat-chip-list-wrapper` rule in `styles.scss` targets Canopy's legacy
  chip component and stays until KAN-28 decides the component's future.
- **Canopy icons `cn:refresh`, `cn:chart`, `cn:person-add` are missing from the registry** and log
  `Error retrieving icon` console errors when the main pages load. Pre-existing on Canopy 3.5.0 and
  still present on 4.0.0; not a business-web regression.
- **`max-len` is 220** (raised from 140 in MBZ-1893 rather than re-wrapping the reducers). Carried
  into `.eslintrc.json` unchanged. TSLint's `deprecation` rule has no ESLint equivalent yet and is
  not enforced (`docs/upgrade/MBZ-2140/14-to-15/A3-angular-eslint14/rule-conversion-notes.md`).
- **Node 16.20.2** (end of life upstream; the estate's interim step, Node 18 is a separate hop) with
  `engine-strict=true` (MBZ-1877). npm 8 enforces transitive `engines`, so `package.json` carries an
  `overrides` pin of `node-releases` to 2.0.44 - that is the only permitted use of `overrides` here
  and it is not an audit override. `.npmrc` is a GIS-reviewed file (CODEOWNERS); the Node 16 change
  is under GIS review as KAN-29 / MBZ-2231 / TOOL-1301.
- **`aot: false` in development.** Set in MBZ-1345 (2020) because the JIT rebuild was faster on the
  old laptops. Templates therefore only get fully checked on a production build; run `npm run build`
  before pushing anything touching a template.
- **Jenkins agent `nodejs16-rhel8`** as of MBZ-2140 (was `nodejs14-rhel7`). Belongs to Platform
  Engineering; the label change is part of the KAN-29 / MBZ-2231 / TOOL-1301 review. Build takes
  twenty minutes; that is normal.
- **`src/app/legacy/nacha-format.constants.ts` is CRLF.** Exempted in `.gitattributes`. Do not
  reformat it; every attempt has produced a 400-line diff.
- **Lockfile is v2** from npm 8. If you see a lockfile diff you did not intend, you are on the wrong
  Node (`nvm use`).
- **`npm audit` is red on `develop` and always has been** (`.npmrc` has `audit=false`; run
  `npm audit --audit`). 60 distinct advisory ids in the full tree, 17 in `--production`; three of the
  full-tree ids are new with the Angular 15 CLI and sit under the GIS decision KAN-32 / KAN-37. No
  overrides are used to change these numbers. Baseline and per-step id sets are under
  `docs/upgrade/MBZ-2140/14-to-15/`.
- Positive pay (`featureFlags.positivePay`) is half built and off. MBZ-2210.

## Tests

Karma + Jasmine, headless Chrome. `CHROME_BIN` is preset on the agent; locally export it if Chrome
is not on the path. Coverage excludes the fixture layer and `legacy/testing/`.

What is actually tested: the NACHA parser (`legacy/nacha-parser.service.spec.ts`, exactly two
specs, both of them worth reading) and the approvals reducer and selectors
(`store/approvals/approvals.reducer.spec.ts`). Everything else is a compile smoke test. If you are
about to change either of those two, run the specs first; they were written as characterisation
tests after MBZ-1622 and encode behaviour the business depends on (self-approval, duplicate
approver, expiry at the boundary).

## Release

Fortnightly train with the rest of CSWT. `Jenkinsfile` here calls `northgateNodePipeline` from the
shared library; the deployable chart is `platform-tooling/helm/business-web`, the one in `helm/`
is the kind/laptop chart. Environment values are rendered into `assets/env.json` at deploy time;
`environment.prod.ts` deliberately has no hostnames in it (MBZ-1411).

Runbook: `docs/runbooks/business-web.md`. ADRs: `docs/adr/`.
