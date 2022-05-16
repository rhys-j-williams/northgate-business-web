# ADR 0003: Keep TSLint through the Angular 12 to 14 step

Date: 2022-05-16. Status: accepted, to be superseded by whoever does the Angular 16 work. Ticket: MBZ-1790.

## Context

Angular 12 removed the `@angular-devkit/build-angular:tslint` builder. TSLint itself has been
deprecated since 2019. The recommended path was `angular-eslint` with `ng lint` regenerated.

We had 31 codelyzer rules and 6 bank-specific rule settings in `tslint.json` (the `no-floating-promises`,
`ban` and the template rules that GIS-STD-014 asks for), a `tslint:disable` comment inventory of
about 60, and a two-person team in the middle of the 12 to 14 upgrade.

## Decision

Remove the `lint` architect target from `angular.json` by hand and run TSLint from a package script:

```
"tslint": "tslint -c tslint.json -p tsconfig.json 'src/**/*.ts'"
```

The Jenkins shared library is told `lintCommand: 'npm run tslint'`. `npm run lint` aliases it because
the library's default is `npm run lint` and we got bitten once when someone removed the alias.

Nothing ESLint-shaped is added. Half a migration would be worse than none.

## Consequences

- Lint keeps working on Angular 14 with zero rule changes. The `max-line-length` limit was raised
  from 140 to 220 in MBZ-1893 rather than re-wrapping after the formatting sweep; that is a rule
  change, and it is noted here so nobody thinks it was always 220.
- `ng lint` prints "Cannot find lint target" in this repo. Expected.
- TSLint 6 and codelyzer 6 pin TypeScript to 4.x behaviour. This will not survive the TypeScript
  that Angular 16 wants. The ESLint migration is therefore part of MBZ-2231, not a separate ticket.
- The `template-use-track-by-function` and `use-component-view-encapsulation` rules are set to
  warning, which is why the lint output is long and green.
