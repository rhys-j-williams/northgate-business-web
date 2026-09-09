# A3 - TSLint 6.1.3 + codelyzer 6.0.2 -> angular-eslint 14.4.0: rule conversion notes

Commands (logs alongside): `ng add @angular-eslint/schematics@14.4.0`, then
`ng g @angular-eslint/schematics:convert-tslint-to-eslint --project northgate-business --remove-tslint-if-no-more-tslint-targets`.
The converter needed `tslint`, `codelyzer` and `tslint-to-eslint-config@2.4.0` present in `node_modules`
(installed `--no-save`, removed again by the final `npm install`; none of the three is in `package.json`
or `package-lock.json` afterwards). `ng add` had already written a bare `.eslintrc.json`, which made the
converter skip the rule translation, so the schematic was run a second time against the original
`tslint.json` with the bare file removed - the result is the committed `.eslintrc.json`.

## Rules the converter could not translate (reported by the schematic)

| TSLint rule | Decision | Where |
|---|---|---|
| `ban` (console.log, *.bypassSecurityTrustHtml, *.bypassSecurityTrustScript, localStorage.setItem, eval - GIS-STD-014) | Re-implemented, messages verbatim: `no-restricted-properties` (console.log, localStorage.setItem), `no-restricted-syntax` (MemberExpression selectors for the two sanitiser bypasses), `no-eval` | `.eslintrc.json` |

## Rules the converter silently dropped (no ESLint equivalent emitted) - hand-mapped

| TSLint rule | ESLint | Note |
|---|---|---|
| `import-blacklist` (rxjs/Rx, rxjs/internal/operators, lodash-es) | `no-restricted-imports` with the same three paths | same severity (error) |
| `typedef: call-signature` | `@typescript-eslint/explicit-function-return-type` (allowExpressions, allowTypedFunctionExpressions, allowHigherOrderFunctions, allowDirectConstAssertionInArrowFunctions) | ESLint also checks arrow functions assigned to `const`, which TSLint did not: 6 return types added (3 closures `: boolean`/`ApprovalRequest['status']`, 3 NgRx selector factories typed `MemoizedSelector<object, T>`). Type annotations only, no behaviour change. |
| `no-console` (debug, info, time, timeEnd, trace banned) | `no-console` with an explicit `allow` list that permits everything except those five | ng-cli-compat's default allow list was close but not identical |
| `deprecation` (warning) | **not converted** - needs `eslint-plugin-deprecation`, which is not in the estate's approved dependency set. Deprecation warnings are still surfaced by the TypeScript language service in the IDE. Listed for the reviewer; not a silent disable, it is a gap. |  |
| `no-redundant-jsdoc`, `unified-signatures`, `no-switch-case-fall-through`, `no-non-null-assertion`, `no-unused-expression`, `prefer-const`, `no-duplicate-imports`, `curly`, `eofline`, `quotemark`, `semicolon`, `whitespace`, `import-spacing`, `typedef-whitespace`, `space-before-function-paren`, `align`, `arrow-return-shorthand` | covered by `plugin:@angular-eslint/ng-cli-compat` + `ng-cli-compat--formatting-add-on` (`@typescript-eslint/no-non-null-assertion`, `@typescript-eslint/no-unused-expressions`, `prefer-const`, `no-duplicate-imports`, `curly`, `eol-last`, `quotes`, `semi`, `space-before-function-paren`, `no-fallthrough`, `jsdoc/*`, `@typescript-eslint/unified-signatures`) | ESLint's `no-fallthrough` is the `no-switch-case-fall-through` equivalent; the ng-cli-compat preset is what the schematic selects for a TSLint-derived config |

## ng-cli-compat rules that were stricter than the previous tslint.json and were re-scoped to the TSLint behaviour (not disabled)

| ESLint rule | TSLint origin | Change |
|---|---|---|
| `@typescript-eslint/member-ordering` | `member-ordering` order `static-field, instance-field, static-method, instance-method` | configured with exactly that `default` order (ng-cli-compat's default also ranks constructors and accessibility, which the repo never enforced: 36 false errors) |
| `@typescript-eslint/naming-convention` | `variable-name` (ban-keywords, check-format, allow-pascal-case, allow-leading-underscore) | scoped to `variableLike` with camelCase / PascalCase / UPPER_CASE and leading underscore allowed. ng-cli-compat's default also checks object-literal properties (HTTP header names such as `X-Correlation-Id`, OIDC discovery fields such as `token_endpoint`) and enum members - 83 false errors against wire formats we do not own |
| `prefer-arrow/prefer-arrow-functions` | `tslint:recommended` `only-arrow-functions: allow-declarations, allow-named-functions` | `allowStandaloneDeclarations: true` (15 named function declarations, e.g. `bff-gateway.service.ts`, `nacha-fixtures.ts`) |
| `max-len` | `max-line-length` 220 with ignore-pattern | converter output kept; the `ignorePattern` had to be escaped (`^import |^export \\{(.*?)\\}`) because ESLint compiles it with the `u` flag and rejected the unescaped `{` |

## Scope

`linterOptions.exclude` (`src/app/legacy/**`, `src/polyfills.ts`, `src/test.ts`) carried over as `ignorePatterns`.
The legacy module was never linted (ADR 0003 "frozen") and is still not; MBZ-2140 does not change legacy behaviour.
`e2e/tsconfig.json` (written by the converter) removed from `parserOptions.project` - there is no e2e project.

## Result

`npm run lint` (= `ng lint`): 0 errors, 90 warnings. Baseline TSLint: 0 errors, 88 warnings. Every warning
rule was already warning-severity in `tslint.json` (`no-floating-promises`, `template-use-track-by-function`,
`use-component-view-encapsulation`, `no-any`, `prefer-for-of`, `no-shadowed-variable`,
`template-click-events-have-key-events`).

## Pins

`eslint 8.57.1` (last 8.x), `@typescript-eslint/* 5.43.0` (schematic default), `eslint-plugin-import 2.31.0`
(2.29.x crashes `import/no-deprecated` under ESLint 8.57: "Missing required argument: node"),
`eslint-plugin-jsdoc 39.9.1` (ng-cli-compat references `jsdoc/newline-after-description`, removed in
eslint-plugin-jsdoc 44; 43.x has already dropped it too), `eslint-plugin-prefer-arrow 1.2.3`. The converter
wrote `latest` for the three plugins; `latest` eslint-plugin-jsdoc (64.x) needs Node 22 and failed
`engine-strict`, so all three are exact-pinned per DEPENDENCY_POLICY.
