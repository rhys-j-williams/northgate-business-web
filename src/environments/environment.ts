// Local development. `ng serve` proxies /api to the business BFF on 4501 (proxy.conf.json) and
// /idp to the Keystone mock on 4400. Flip useFixtures when the BFF is not running, which on a
// laptop is most of the time.
export const environment = {
  production: false,
  name: 'local',
  apiBase: '/api',
  idp: {
    issuer: 'http://localhost:4400',
    clientId: 'meridian-business-web',
    redirectUri: 'http://localhost:4201/auth/callback',
    scopes: 'openid profile email offline_access accounts.read payments.write entitlements.read'
  },
  useFixtures: true,
  fixtureSeed: 'meridian-business',
  featureFlags: {
    wiresSameDayCutoff: true,
    payrollScheduling: true,
    reportsCsvExport: true,
    alertsSubset: true,
    // MBZ-2210 half finished. Leave off.
    positivePay: false
  },
  idleWarnMinutes: 8,
  idleTimeoutMinutes: 10,
  telemetry: {
    enabled: false,
    endpoint: 'http://localhost:4606/services/collector/event'
  }
};
