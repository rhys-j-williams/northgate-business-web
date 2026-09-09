# MBZ-2140 visual evidence (for a human, KAN-31)

Captured with the workspace skill `northgate-local-screenshot-capture` (Playwright over the
running Chrome CDP endpoint, 1440x900, deviceScaleFactor 1, PNG, `fullPage: false`), dev server on
4201 with `environment.useFixtures = true` (seed `northgate-business`). Filenames follow
`docs/SCREENSHOTS.md` in the workspace (`business-web--<page>.png`).

| Folder | State |
| --- | --- |
| `before-angular-14-canopy-3.5.0/` | develop baseline: Angular 14.2.12, Material 14 legacy, Canopy 3.5.0 |
| `after-angular-15-canopy-4.0.0/` | branch head: Angular 15.2.10, Material 15.2.9 MDC, Canopy 4.0.0 |

`capture.log` in each folder lists route, title and `<h1>` per page plus browser console errors.
`approval-detail` is skipped in both (the fixture approvals list renders buttons, not links).

## Console errors

Identical before and after: `cn:refresh`, `cn:chart`, `cn:person-add` are not in the Canopy icon
registry (3.5.0, 3.7.2 or 4.0.0). Pre-existing, not introduced by this hop; not fixed here because
the icon set is Canopy's (would be a CNPY item).

## Differences observed (all MDC defaults, no business styling was changed to cause them)

Decision on whether any of these needs a business-side tweak belongs to the humans on KAN-31; none
was made here.

1. **Topbar organisation chip** (`cn-page-shell`, every page): MDC chip, ~8px wider and a slightly
   different corner radius.
2. **Tables** (payroll, users, approvals, wires, ACH): first/last cell inset is now the 12px from
   `styles.scss` on every column; legacy Material added 24px on the first and last column with a
   higher-specificity rule that MDC no longer has. Column positions shift left by ~12px.
3. **Paginator page-size select**: MDC outlined `mat-select` (44px tall, boxed) instead of the
   legacy underlined field.
4. **Outlined form fields** (users search, payroll employee search, new wire form): placeholder and
   text are vertically centred in the MDC field; the legacy field sat the text lower. Field height
   follows the Canopy compact density.
5. **Slide toggles** (alerts "Optional" cards): MDC switch shows the check icon in the handle when
   on. `MAT_SLIDE_TOGGLE_DEFAULT_OPTIONS { hideIcon: true }` would restore the plain handle; not
   applied because it is a visual decision.
6. **Checkboxes** (new payroll run employee list): MDC checkbox box is 18px with the 18px Canopy
   state layer; row height grows by 1px so the 420px list now shows a scrollbar for 7 rows.
7. **Flat buttons** (`New payroll run`, `Review`): MDC button corner radius (4px) and 36px height;
   legacy buttons were 34px.

## Unchanged by design

- `cn-filter-chips` (approvals filters) renders exactly as before: still the legacy chip list in
  Canopy 4.0.0 (KAN-28), business `cn-filter-chips .mat-chip-list-wrapper` rule kept.
- Compact density (`CnConfig.density: 'compact'`), table row height, sidebar, page header, badges,
  account cards, stepper.
