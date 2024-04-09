# ADR 0004: Pin @meridian/canopy-ui at 3.5.0

Date: 2024-04-09. Status: accepted, under protest. Tickets: MBZ-2140, CNPY-1710.

## Context

Canopy 3.6.0 (CNPY-1710) renamed the data table internals (`cn-data-table__table` became
`cn-table__grid`, the row height token moved to `--cn-table-row-height`) and changed the dialog
container padding. Meridian Business overrides those from the outside: `styles.scss` and roughly
twenty component stylesheets use `::ng-deep` or `ViewEncapsulation.None` to reach into Canopy and,
where we use Material directly, into `.mat-*` classes. The overrides were written in 2019-2021 when
Canopy had no density mode and the business users complained about row height on the transactions
screen (MBZ-880). They have never been removed because they still work.

On 3.6.0 the transactions table renders at the default height, the approvals queue loses its status
column colouring, and the payroll wizard's stepper header wraps. None of it is broken; all of it
looks wrong, and the accountant persona notices.

## Decision

Pin exactly `3.5.0`. Do not take 3.6 or 3.7 until the override inventory (MBZ-2140) is worked
through and the density mode that Canopy 3.7 offers is adopted instead.

## Consequences

- Every other Canopy consumer is on 3.7.x. Canopy's team supports N-1; we are N-2 as of CNPY-1902
  and the design system team has said so in writing.
- Upgrading is a two-hop: 3.5 to 3.6 (token rename, table internals) then 3.6 to 3.7 (density mode
  replaces most of our overrides, and the dialog API changes). Doing it in one jump was tried on a
  branch in June 2024 and abandoned.
- The Angular 16+ Canopy line (4.x) requires 3.7 first. So this pin is in the way of MBZ-2231 too.
- `verify-traps` style checks in the estate look for the exact string `"@meridian/canopy-ui": "3.5.0"`.
  Changing the pin without doing the work will make things pass and look worse.
