# ADR 0002: Hand rolled NgRx reducers, no entity adapter

Date: 2019-08-27. Status: accepted, and a bit embarrassing. Ticket: MBZ-412.

## Context

Entitlements and, later, the approvals queue needed shared client state: several screens read the
same collection, edits are optimistic, and a server push can land while a save is in flight.
NgRx 8 was already in the workspace for the auth slice. `@ngrx/entity` existed and retail-web was
adopting it at the time.

## Decision

Write the reducers by hand. Plain arrays, `_.findIndex`, explicit `drafts` and `savingIds` maps,
selectors composed with `createSelector`. No `EntityAdapter`, no `createEntityAdapter`.

The reasons at the time, recorded honestly: the team was two people, one of whom had not used NgRx
before; the entitlements collection is small (tens, not thousands); the entity adapter's sorted
collection semantics did not match how the permission matrix wanted to render; and retail-web's
early `@ngrx/entity` code was not something we wanted to copy.

## Consequences

- The reducers are longer than they would be with the adapter, and the approvals one has a
  `sortByRequestedAt` helper that is doing what `sortComparer` would do.
- Nobody on business-digital has had to learn the adapter. This has been fine.
- When retail-web and business-web share code (which they do not, but the architecture review keeps
  asking), the two stores look different enough that a shared feature store is a rewrite on one side.
- The approvals reducer is one of the two properly tested things in this codebase; the tests were
  cheaper to write against plain state than against adapter state. MBZ-1622.

Revisit if the collections get large or if the entitlement model grows the per-account matrix that
product keeps mentioning (MBZ-1966).
