# Meridian Business (business-web)

Angular 14.2.12 | Node 14.21.3 / npm 6.14.18 | Canopy 3.5.0 | port 4201 | owner **@meridian/business-digital**

Small business banking: accounts, payroll, ACH origination with NACHA upload, domestic wires with
maker-checker, the approvals queue, users and entitlements, reports with CSV, and the four alerts
the regulator cares about. Around fifty components. It works. It has worked since 2019. Nobody has
had budget to touch the tooling since the Angular 12 to 14 step in 2022 (MBZ-1790), and it shows in
the places listed under "Known state" below. Read that section before quoting an estimate for
anything.

CMDB APP-10443. Data classification: internal (customer data is masked before it reaches the
browser; the BFF does the masking, see DATA_CLASSIFICATION.md).

## Running it

```
nvm use                  # 14.21.3, enforced by engine-strict (MBZ-1877)
npm ci
npm start                # ng serve on 4201, proxies /api -> bff-business 4501 and /idp -> Keystone mock 4400
```

`@meridian/*` packages come from the estate Verdaccio on 4873 (`mock-external/estate-up.sh`). If
`npm ci` fails on `@meridian/canopy-ui@3.5.0` the registry is not up or you have not published the
3.5.0 tag; `canopy-ui/scripts/publish-local-versions.sh` does all three versions.

`environment.useFixtures` is `true` in `environment.ts`. That is deliberate: the BFF is not running
on most laptops and the fixture layer (`core/services/fixture-data.service.ts`, built on
`@meridian/domain-fixtures`) is the same data the smoke stage uses. Flip it to `false` to go through
`bff-business`; `BffGatewayService` probes `/health` once and drops back to fixtures if 4501 is not
answering, so you will not see an empty queue either way. Only accounts, the approvals queue and the
organisation users list are actually served by the BFF today (MBZ-0801); payroll, ACH, wires,
reports and alerts have their BFF paths pencilled in and are fixture-only until PLAT-1352 lands the
remaining controllers.

Sign in with anything the Keystone mock on 4400 accepts. Operator handles and roles come from the
seeded organisation in `@meridian/domain-fixtures` (seed `meridian-business`); the users screen lists
them, and the fixture layer picks the first admin as "you".

## Scripts

| Script | What | Notes |
|---|---|---|
| `npm start` | `ng serve --port 4201` | JIT, no AOT in development (`aot: false`, MBZ-1345, see below) |
| `npm run build` | production build | Webpack browser builder, budgets in `angular.json` |
| `npm test` | Karma, ChromeHeadlessCI, coverage | 32 specs. Coverage around 22 percent; the gate in Jenkins is 20 |
| `npm run tslint` | TSLint 6 + codelyzer 6 | This is lint. There is no `ng lint` target and no ESLint. MBZ-1790 removed the builder; ADR 0003 |
| `npm run lint` | alias for `tslint` | Exists because the shared pipeline calls `npm run lint` by default |

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

- **Canopy is two minors behind.** 3.5.0, pinned exactly. 3.6 changed the data table internals and
  our `::ng-deep` overrides in `styles.scss` and about twenty components break on it (MBZ-2140).
  3.7 is where everyone else is. Getting there is a two-hop because the 3.6 tokens rename lands in
  between. See `docs/adr/0004-canopy-pin.md`.
- **Angular Material is used directly** in the payroll wizard, reports preview, entitlements editor,
  alerts, wire detail and the approval decision dialog, with `.mat-*` overrides in `styles.scss`.
  Those predate Canopy having the equivalent components. Nobody has gone back.
- **RxJS 6.6.7** and `toPromise()` in most services. Canopy 3.x declares an rxjs 7 peer; npm 6 only
  warns. `legacy-peer-deps` is in `.npmrc` for the day someone runs npm 7. MBZ-2044 is parked.
- **TSLint.** Deprecated upstream since 2019. Still works. `max-line-length` was raised to 220 in
  MBZ-1893 rather than re-wrapping the reducers. ADR 0003.
- **Node 14** with `engine-strict=true`. The strict flag exists because of MBZ-1877. It also means
  Angular 16 is not installable without touching `.npmrc` first, which is a GIS-reviewed file
  (CODEOWNERS).
- **`aot: false` in development.** Set in MBZ-1345 (2020) because the JIT rebuild was faster on the
  old laptops. Templates therefore only get fully checked on a production build; run `npm run build`
  before pushing anything touching a template.
- **Jenkins agent `nodejs14-rhel7`.** Out of support. Belongs to Platform Engineering. MBZ-2231 /
  TOOL-1301. Build takes twenty minutes; that is normal.
- **`src/app/legacy/nacha-format.constants.ts` is CRLF.** Exempted in `.gitattributes`. Do not
  reformat it; every attempt has produced a 400-line diff.
- **Lockfile is v1** from npm 6. npm 7+ rewrites it to v2 on install; if you see a lockfile diff you
  did not intend, you are on the wrong Node.
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

Fortnightly train with the rest of CSWT. `Jenkinsfile` here calls `meridianNodePipeline` from the
shared library; the deployable chart is `platform-tooling/helm/business-web`, the one in `helm/`
is the kind/laptop chart. Environment values are rendered into `assets/env.json` at deploy time;
`environment.prod.ts` deliberately has no hostnames in it (MBZ-1411).

Runbook: `docs/runbooks/business-web.md`. ADRs: `docs/adr/`.
