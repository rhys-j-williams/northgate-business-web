<!-- Generated with AI assistance (AIT-014) on 2026-09-09; reviewed by <handle>. -->
# MBZ-2140 compatibility matrix: Northgate Business Angular 14 -> 15 with ordered prerequisites

Repository: `northgate-business-web` (application, nothing publishes from it). One column per intermediate state on
branch `feature/MBZ-2140-angular-14-to-15`; each column is an installed, green-gated commit (`14-to-15/<step>/`
holds `ng-version.log`, `npm-ls-depth0.log` and the gates for it). Framework ranges from
https://angular.dev/reference/versions (rows "14.2.x || 14.3.x" and "15.2.x"); everything else from each package's
`peerDependencies` / `engines` at the pinned version in `package-lock.json`. A step only needs to read its own
column and the one to its left. Pins are exact (`save-exact=true`). **No column moves more than one major of any
tool** (playbook rule 1): Angular 16, Node 18, RxJS 8 and Canopy 5 do not appear.

## Framework and toolchain

| item | 00 baseline (`develop`) | A1 Node 16 | A2 RxJS 7 | A3 angular-eslint 14 | A4 Canopy 3.7.2 | B+C Canopy 4.0.0 + Angular 15 (branch head) | official / peer range at head | in range |
|---|---|---|---|---|---|---|---|---|
| Node (`.nvmrc`, `engines`, agent, Dockerfile) | 14.21.3 / `nodejs14-rhel7` / `node:14.21.3-bullseye-slim` | **16.20.2** / `nodejs16-rhel8` / `node:16.20.2-bullseye-slim` | 16.20.2 | 16.20.2 | 16.20.2 | 16.20.2 | `@angular/core@15.2.10`, `@angular/cli@15.2.11`, `@angular-devkit/build-angular@15.2.11` engines `^14.20.0 \|\| ^16.13.0 \|\| >=18.10.0`; Angular 15 official: 14.20 / 16.13 / 18.10 | yes |
| npm / lockfile | 6.14.18 / v1 | **8.19.4 / v2** | 8.19.4 | 8.19.4 | 8.19.4 | 8.19.4 | `@angular/cli` engines npm `^6.11.0 \|\| ^7.5.6 \|\| >=8.0.0` | yes |
| `@angular/*` runtime (animations, common, compiler, compiler-cli, core, forms, platform-browser, platform-browser-dynamic, router) | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | **15.2.10** | 15.x, all at one exact version (15.2.10 is the last 15.2 runtime release) | yes |
| `@angular/cli`, `@angular-devkit/build-angular` | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | 14.2.12 | **15.2.11** | 15.x; `build-angular` peers `@angular/compiler-cli ^15.0.0`, `typescript >=4.8.2 <5.0`, `karma ^6.3.0` | yes |
| `@angular/material`, `@angular/cdk`, `@angular/material-moment-adapter` | 14.2.7 | 14.2.7 | 14.2.7 | 14.2.7 | 14.2.7 | **15.2.9** (MDC components) | `material@15.2.9` peers `@angular/{core,common,forms,animations,platform-browser} ^15.0.0 \|\| ^16.0.0`, `cdk 15.2.9` exact, `rxjs ^6.5.3 \|\| ^7.4.0` | yes |
| `@northgate/canopy-ui` | 3.5.0 (ADR 0004 pin) | 3.5.0 | 3.5.0 | 3.5.0 | **3.7.2** | **4.0.0** | 4.0.0 peers `@angular/{animations,cdk,common,core,forms,material,material-moment-adapter,router} ^15.0.0`, `ngx-mask ^15.0.0`, `moment ^2.29.0`, `rxjs ^7.5.0`. 3.5.0 / 3.7.2 peer `rxjs ^7.5.0` was **unmet** on baseline and A1 (npm 6 `UNMET PEER DEPENDENCY rxjs@6.6.7`), met from A2 | yes (unmet peer until A2 recorded) |
| `rxjs` | 6.6.7 | 6.6.7 | **7.5.7** | 7.5.7 | 7.5.7 | 7.5.7 | `@angular/core@15` `^6.5.3 \|\| ^7.4.0`; Canopy `^7.5.0`; `@ngrx/store@15` `^6.5.3 \|\| ^7.5.0`. 7.5.x is the estate line (retail-web, canopy-ui) | yes |
| `typescript` | 4.7.4 | 4.7.4 | 4.7.4 | 4.7.4 | 4.7.4 | **4.9.5** | `@angular/compiler-cli@15.2.10` peer `>=4.8.2 <5.0`; official 15.2: 4.8 / 4.9 | yes |
| `zone.js` | 0.11.8 | 0.11.8 | 0.11.8 | 0.11.8 | 0.11.8 | **0.12.0** | `@angular/core@15.2.10` peer `~0.11.4 \|\| ~0.12.0 \|\| ~0.13.0`; playbook says 0.12.x | yes |
| `tslib` | 2.4.1 | 2.4.1 | 2.4.1 | 2.4.1 | 2.4.1 | 2.4.1 | Angular 15 `^2.3.0` | yes |
| `tsconfig` `target` / `module` | es2017 / es2020 | same | same | same | same | **ES2022** / es2020 (+ `useDefineForClassFields: false`, both written by the `ng update` migration; `lib` unchanged) | Angular 15 default `ES2022` | yes |

## Angular ecosystem dependencies

| item | 00 baseline | A1 | A2 | A3 | A4 | B+C head | peer range at head | in range |
|---|---|---|---|---|---|---|---|---|
| `@ngrx/store`, `@ngrx/effects`, `@ngrx/store-devtools` (installed but the app state is hand-rolled, ADR 0002) | 14.3.3 | 14.3.3 | 14.3.3 | 14.3.3 | 14.3.3 | **15.4.0** | `@angular/core ^15.0.0`, `rxjs ^6.5.3 \|\| ^7.5.0` (15.4.0 is the last 15.x) | yes |
| `ngx-mask` | 14.3.3 | 14.3.3 | 14.3.3 | 14.3.3 | 14.3.3 | **15.2.3** | peers `@angular/{common,core,forms} >=14.0.0`; Canopy 4.0.0 requires `^15.0.0` (15.2.3 is the last 15.x) | yes |
| `@angular/flex-layout` | 14.0.0-beta.41 (zero usages) | same | same | same | same | **removed** | its `@angular/* ^14` peer blocked the Material 15 resolve; with zero `fx*` / `FlexLayoutModule` usages it was removed rather than bumped (the library is deprecated upstream) | n/a |
| `moment` | 2.29.4 | 2.29.4 | 2.29.4 | 2.29.4 | 2.29.4 | 2.29.4 | Canopy `^2.29.0`; `material-moment-adapter@15` `^2.18.1` | yes |
| `lodash` / `@types/lodash` | 4.17.21 / 4.14.191 | same | same | same | same | same | no Angular coupling | yes |
| `@northgate/domain-fixtures` | 1.6.0 | 1.6.0 | 1.6.0 | 1.6.0 | 1.6.0 | 1.6.0 | framework-agnostic fixtures (CommonJS; build warning is pre-existing) | yes |

## Lint

| item | 00 baseline | A1 | A2 | A3 | A4 | B+C head | peer range at head | in range |
|---|---|---|---|---|---|---|---|---|
| `tslint` / `codelyzer` | 6.1.3 / 6.0.2 (ADR 0003) | same | same | **removed** | - | - | TSLint deprecated 2019; codelyzer has no Angular 15 release | n/a |
| `@angular-eslint/builder`, `eslint-plugin`, `eslint-plugin-template`, `schematics`, `template-parser` | - | - | - | **14.4.0** | 14.4.0 | **15.2.1** | `schematics@15.2.1` peer `@angular/cli >= 15.0.0 < 16.0.0` (14.4.0's `>= 14.0.0 < 15.0.0` blocked the CLI 15 resolve, so the bump is part of the C `ng update`); others peer `eslint ^7.20.0 \|\| ^8.0.0`, `typescript *` | yes |
| `eslint` | - | - | - | 8.57.1 | 8.57.1 | 8.57.1 | last eslint 8 (9.x needs flat config, unsupported by angular-eslint 15) | yes |
| `@typescript-eslint/eslint-plugin`, `parser` | - | - | - | 5.43.0 | 5.43.0 | 5.43.0 | the `@typescript-eslint/utils` version angular-eslint 14/15 depend on; TS 4.9 supported | yes |
| `eslint-plugin-import` / `-jsdoc` / `-prefer-arrow` | - | - | - | 2.31.0 / 39.9.1 / 1.2.3 | same | same | added by the TSLint->ESLint converter for the `import-blacklist`, `jsdoc`, `only-arrow-functions` rule families; exact pins (`A3-angular-eslint14/rule-conversion-notes.md`) | yes |
| lint command (`package.json`, `Jenkinsfile lintCommand`) | `npm run tslint` | same | same | **`npm run lint` = `ng lint`** | same | same | | |

## Test toolchain (unchanged across the hop)

| item | all columns | note |
|---|---|---|
| `karma` | 6.4.1 | `build-angular@15` peer `^6.3.0` |
| `karma-jasmine` / `jasmine-core` / `@types/jasmine` | 5.1.0 / 4.3.0 / 4.0.3 | matching 4.x line |
| `karma-chrome-launcher` / `karma-coverage` / `karma-jasmine-html-reporter` | 3.1.1 / 2.2.0 / 2.0.0 | |
| `@types/node` | 16.18.11 | matches Node 16 |
| Chrome for Karma | 109 (`CHROME_BIN` override, rhel7) -> 120 (rhel8 library default) from A1 | Angular 15 CLI supports both |
| `src/test.ts` | `require.context` spec discovery | `require.context` block **removed** in C by the `ng update` migration (CLI 15 discovers specs itself); file and `angular.json` `test.main` stay |
| coverage threshold (Jenkinsfile) | lines 20 | unchanged; measured 22.13% on every column |

## npm configuration

| item | 00 baseline | A1 | A2 .. head | note |
|---|---|---|---|---|
| `.npmrc` `@northgate:registry` | `http://localhost:4873` | same | same | Verdaccio locally, Artifactory on the VLAN |
| `.npmrc` `engine-strict` / `save-exact` / `fund` / `audit` | true / true / false / false | same | same | MBZ-1877 |
| `.npmrc` `legacy-peer-deps` | true (MBZ-2044) | true | **removed** (tree resolves without it once RxJS 7 satisfies the Canopy peer) | |
| `package.json` `overrides` | none | **`node-releases: 2.0.44`** | same | engines-only: transitive `node-releases >=2.0.54` declares `engines.node >=18`, which npm 8 + `engine-strict` rejects; no advisory involved |
| `node-releases` (direct devDependency) | 2.0.6 | 2.0.44 | 2.0.44 | must equal the override (npm EOVERRIDE otherwise) |

## Availability of the pinned internal packages

| package | registry | status |
|---|---|---|
| `@northgate/canopy-ui@3.7.2` | Artifactory + estate Verdaccio (`estate-up.sh` publishes the `develop` tag) | available |
| `@northgate/canopy-ui@4.0.0` | **local Verdaccio only** (built from `northgate-canopy-ui` `feature/CNPY-2140-angular-14-to-15`, PR #3 unmerged) | **KAN-23 gate waiver - not on Artifactory; merge blocked until it is; lockfile integrity re-resolve required then** |
| `@northgate/domain-fixtures@1.6.0` | Artifactory + Verdaccio | available |

## Not in this matrix (next hops, separate tickets)

Angular 16 (needs Node 16.14+/18.10+, TS 4.9.3+/5.0, zone.js 0.13; Canopy 5 line), Node 18 (`nodejs18-rhel8`),
RxJS 7.8 (drop-in minor, not needed), eslint 9 (flat config), NgRx adoption for the hand-rolled state (ADR 0002).
