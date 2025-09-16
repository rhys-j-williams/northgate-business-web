# Runbook: business-web (Meridian Business)

Owner @meridian/business-digital. Rota: business-digital, Chennai hours (10:00-21:00 IST), with
payments-platform Jersey City for the US afternoon. Not a 24x7 channel; overnight pages go to the
CSWT duty manager only for Sev 1.

Static Angular bundle served by nginx on 8080 behind the route `business.meridian.internal`. There is
no server side state in this application. If it is "down" it is one of: the CDN/route, the BFF
(`bff-business`, 4501, its own runbook), Keystone, or a bad deployment.

## First five minutes

1. Open the route in a browser. If the shell renders and the accounts list spins forever, it is the
   BFF or entitlements-service, not us. Go to `platform-services/bff-business/docs/runbooks/`.
2. If the page is blank with a console error mentioning `cn-` or `mat-`, it is a deployment that
   shipped with a Canopy or Material mismatch. Roll back: `oc rollout undo deploy/business-web -n cswt-prod`.
3. If sign-in loops back to `/auth/callback` repeatedly, Keystone changed something. MBZ-1502 has the
   history of this; check the `redirectUri` in the rendered `assets/env.json` matches what Keystone
   has registered for `meridian-business-web`.
4. `oc rollout history deploy/business-web -n cswt-prod`. If the last rollout is in the incident
   window, roll back first and think later.

## Things that look like incidents and are not

- **"Approvals queue is empty but I have a wire pending."** The queue filters to the operator's
  entitlement scope. Check they have `business:approvals:review` on that organisation. If they do,
  MBZ-1411 (entitlement cache keyed by operator only) can hold a stale decision for 60 seconds.
- **"Session timed out after ten minutes."** It did. `idleTimeoutMinutes` is 10 with a warning at 8.
  This is the number Compliance asked for in 2019 (MBZ-77). Do not change it for a complaint.
- **"NACHA file rejected, bank told us it was fine."** Our parser validates the batch and file
  control totals and the entry hash. The bank's does not check the hash. The file is wrong; the
  validation report says which line. If the report itself is wrong, that is the parser, and there
  are two tests you should read before touching it.
- **"Payroll wizard would not let me pick Friday."** Friday is a Federal Reserve holiday that week or
  the ACH cutoff has passed. `BusinessDateService` has the holiday table; it is updated by hand each
  November (MBZ-1140, recurring).

## Deploy and rollback

Fortnightly train. `Jenkinsfile` on the `nodejs14-rhel7` agent; twenty minutes is normal, forty is
not. Chart `platform-tooling/helm/business-web`. Rollback is `oc rollout undo`; there is no data
migration for a static bundle, so rollback is always safe.

If the pipeline fails at `npm ci` with an engines error, someone has changed `.nvmrc` or `.npmrc`
without changing the agent label. Revert; do not fix forward on a train day.

## Logs and telemetry

Browser telemetry goes to Splunk HEC (`telemetry.endpoint`) when `TELEMETRY_ENABLED` is true in
the env config. `index=cswt sourcetype=business-web`. Correlation id is `X-Correlation-Id`, minted
by `CorrelationInterceptor` and echoed by the BFF; search by it first.

## Contacts

`#business-digital`. Escalate through PagerDuty service `cswt-business-web`, not DMs.
