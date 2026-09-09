<!-- Generated with AI assistance (AIT-014) on 2026-09-09; reviewed by <handle>. -->
# ADR 0005: Angular 14 -> 15 toolchain: Node 16, RxJS 7, angular-eslint, Canopy 4.0.0, one major at a time

Date: 2026-09-09. Status: proposed (accepted when PR `feature/MBZ-2140-angular-14-to-15` merges). Tickets:
MBZ-2140 (estate mirror KAN-23), MBZ-2231 (Node), MBZ-2044 (RxJS), MBZ-2210 (Canopy pin), MBZ-1790 (lint history).
Supersedes ADR 0003 (keep TSLint). Updates ADR 0004 (Canopy pin): the pin moves from 3.5.0 to 4.0.0 and the
override inventory that 0004 was waiting for is done.

## Context

Northgate Business was the oldest toolchain in the CSWT estate: Angular 14.2.12, Node 14.21.3 on the
`nodejs14-rhel7` agent (end of life, TOOL-1301), RxJS 6.6.7, TSLint 6 + codelyzer (deprecated since 2019, kept by
ADR 0003 "to be superseded by whoever does the Angular 16 work"), `@northgate/canopy-ui` 3.5.0 pinned two minors
behind the estate (ADR 0004, "under protest"), and an unused `@angular/flex-layout` beta. Each of these blocked the
next: Canopy 3.7 needs RxJS 7; Canopy 4 needs Angular 15; Angular 15 needs Node 14.20+/16.13+ and TypeScript 4.8+,
which TSLint/codelyzer do not follow; the Node 14 agent is being retired.

The estate Angular 14 -> 15 wave (KAN-23) prescribes the versions (Node 16.20.2, RxJS 7.5.x, Canopy 4.0.0, Angular
15.2) and the rule that nothing moves more than one major at a time, so that each intermediate state is
installable, green and revertible on its own. `northgate-platform-tooling/governance/FRAMEWORK_SUPPORT_STANDARD.md`
and `DEPENDENCY_POLICY.md` require exact pins, no consumer newer than the libraries it pins, and an ADR for any
toolchain change.

## Decision

Land the whole toolchain move as **one branch, six ordered steps, each its own commit with its own green gates**,
in this order and no further:

1. **Node 14.21.3 -> 16.20.2, npm 6 -> 8.19.4, lockfile v2**, agent `nodejs14-rhel7` -> `nodejs16-rhel8`, image
   `node:16.20.2-bullseye-slim`. `engine-strict=true` stays; because npm 8 enforces transitive `engines`, a
   `package.json` `overrides` entry pins `node-releases` to 2.0.44 (the last release without `engines.node >= 18`).
   That override is an engines override and is the *only* permitted use of `overrides` in this repository; it must
   never be used to alter `npm audit` results. **Not Node 18.** Node 16 is itself end of life; it is the estate's
   agreed interim step and the next hop is a separate ticket.
2. **RxJS 6.6.7 -> 7.5.7.** `toPromise()` -> `lastValueFrom()` everywhere (49 sites; `lastValueFrom` because every
   call awaited the final HTTP emission and `toPromise()` resolved with the last value). `rxjs/operators` imports
   stay. `legacy-peer-deps=true` is removed from `.npmrc` once the tree resolves without it. **Not RxJS 8.**
3. **TSLint + codelyzer -> angular-eslint** (14 while on Angular 14, moved to 15 by `ng update` in step 6).
   `ng lint` is back as the architect target; `npm run lint` is the lint command for the Jenkins library and the
   `npm run tslint` script is gone. Conversion is by the official `convert-tslint-to-eslint` schematic plus a
   hand-written mapping for every rule it could not translate (`ban` -> `no-restricted-properties` /
   `no-restricted-syntax` / `no-eval`; `import-blacklist` -> `no-restricted-imports`; `typedef` -> explicit
   `@typescript-eslint` rules). Severities are carried over unchanged (`max-len` 220 from MBZ-1893 stays 220; the
   GIS-STD-014 rules `no-floating-promises`, `use-track-by-function`, `use-component-view-encapsulation` stay at
   their existing warning severity). **No rule is silently dropped**: the one rule with no ESLint equivalent
   (TSLint `deprecation`) is recorded in `docs/upgrade/MBZ-2140/14-to-15/A3-angular-eslint14/rule-conversion-notes.md`
   as a gap for a later `eslint-plugin-deprecation` decision. The four `tslint:disable` comments became the same
   four `eslint-disable` comments.
4. **Canopy 3.5.0 -> 3.7.2** on Angular 14 (the intermediate hop ADR 0004 asked for). With RxJS 7 in place the
   3.6/3.7 changes needed no source edits in this repository.
5. **Canopy 3.7.2 -> 4.0.0** (exact pin), and immediately
6. **Angular 14.2.12 -> 15.2.10 / CLI 15.2.11, Material + CDK 15.2.9 with the MDC migration, NgRx 15.4.0,
   ngx-mask 15.2.3, TypeScript 4.9.5, zone.js 0.12.0, angular-eslint 15.2.1, `@angular/flex-layout` removed.**
   Steps 5 and 6 are consecutive commits because Canopy 4 peers on Angular 15. **Not Angular 16.**

Cross-cutting rules that this ADR makes binding for the repository:

- **Canopy is a black box.** `styles.scss` uses `@use '@northgate/canopy-ui/themes'` + `@include canopy.theme()`
  and the public `--cn-*` tokens and `.cn-*` BEM classes only; the compact density comes from the Canopy config,
  not from local overrides; the `dense` / `-2` density is not used (KAN-34). The `::ng-deep` inventory that ADR 0004
  was waiting for is done: 14 rules on `develop` -> 11 on the branch, six into Canopy public `.cn-*` class names,
  five into Material MDC public classes / `--mdc-*` tokens. Reaching into Canopy *internals* (anything not in its public
  API, ADR-0004 of canopy-ui; Ledgerline LDG-3104 is the cautionary tale) is prohibited; the remaining six Canopy
  class-name sites are to move to tokens as a follow-up, not to grow.
- **Material is used through its MDC public surface.** Every pre-MDC `.mat-*` internal selector was removed or
  replaced by the MDC public class (`.mat-mdc-*`) or the component token (`--mdc-*`), or by the equivalent
  component input (`subscriptSizing="dynamic"`, `matListItemTitle` / `matListItemLine` / `matListItemMeta`).
  The single exception is `cn-filter-chips .mat-chip-list-wrapper`, which targets Canopy's *legacy* chip component
  and is kept verbatim until KAN-28 decides the component's future.
- **What does not change:** the hand-rolled reducers (ADR 0002 stands), the frozen `src/app/legacy/**` module
  (only the mechanical `toPromise` rewrite touched it), the Jenkins coverage threshold (20), `CODEOWNERS`, the
  feature flags, BFF contracts and routes. The MDC restyling of the business UI is *recorded* (before/after
  screenshots in `docs/upgrade/MBZ-2140/14-to-15/visual/`) and *not tuned* here; acceptance is a human decision
  (KAN-31).
- **Audit findings are never hidden.** No `overrides`, `npm audit fix --force`, `.npmrc` audit settings or
  allow-lists to change `npm audit` output. New ids are compared against the baseline set per step; the three
  dev-only ids the Angular 15 CLI brings are recorded and referred to the existing GIS decision (KAN-32/KAN-37).

## Consequences

- Angular 14, Node 14, RxJS 6, TSLint/codelyzer and Canopy 3.x are gone from this repository. The next hops
  (Angular 16 / Canopy 5, Node 18, eslint 9 flat config) are each one major and each their own ticket and ADR.
- The `nodejs14-rhel7` agent is no longer referenced here; the repository can be dropped from the TOOL-1301
  exception list once this merges. Until KAN-29 clears the label and the GIS review of `.npmrc`, `Jenkinsfile`,
  `Dockerfile` (GIS-STD-014 files), the branch cannot merge.
- `@northgate/canopy-ui@4.0.0` is, at the time of writing, on the Stage 1 VM's Verdaccio only. Under the KAN-23
  gate waiver the branch may be reviewed but not merged until 4.0.0 is on Artifactory; the lockfile's `integrity`
  for that entry must then be re-resolved (one follow-up commit).
- The ADR 0004 statement that "the release pipeline's dependency gate asserts the exact string
  `"@northgate/canopy-ui": "3.5.0"` (TOOL-1290)" could not be located in the checked-out
  `northgate-platform-tooling` shared library. If such an assertion exists anywhere in the release job it must be
  retired with this change; Platform Engineering is asked to confirm (new Jira item).
- ADR 0003's "half a migration would be worse than none" concern is met: there is no TSLint left, and the lint
  gate is `ng lint` with the full converted rule set (0 errors, 90 warnings; TSLint had 0 / 88).
- The Canopy pin is now current (N, not N-2), which restores design-system team support for this repository.
  Keeping it current means taking every Canopy minor within a train of its release, which is the standing
  expectation ADR 0004 documented and this repository now meets.
- Bundle: initial 1.92 MB -> 2.19 MB raw (MDC styles), within the 3 MB warning budget. Branch coverage as
  reported by Istanbul dropped (fewer instrumented helper branches under ES2022); the gate metric (lines) is
  unchanged at 22.13% against a threshold of 20.
- Every commit on the branch is AI-assisted (Devin, AIT-014). The artefact commits carry the
  `AI-Assisted:` trailer; the earlier migration commits carry only `Co-Authored-By` and are declared in the PR and
  `CAB_RECORD.md` 9 as unlabelled AI-assisted content under AI_ASSISTED_CODE_POLICY P2.

## Evidence

`docs/upgrade/MBZ-2140/14-to-15/REPORT.md` (step narrative and gates), `CAB_RECORD.md`, `CONSUMERS.md` (estate
smoke), `deprecations.log` (every changed pattern), `docs/upgrade/MBZ-2140/COMPATIBILITY_MATRIX.md` (one column per
intermediate state), per-step logs under `00-baseline-14/`, `A1-node16/`, `A2-rxjs7/`, `A3-angular-eslint14/`,
`A4-canopy-3.7.2/`, `B-canopy-4.0.0/`, `C-angular15/`, `D-estate-smoke/`, screenshots under `visual/`.
