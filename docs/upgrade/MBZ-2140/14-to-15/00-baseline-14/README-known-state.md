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

