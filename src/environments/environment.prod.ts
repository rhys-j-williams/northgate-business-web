// Production values are rendered into env.json by the Helm chart at deploy time; this file only
// carries the compile time switches. Do not put hostnames in here (MBZ-1411, we did, it hurt).
export const environment = {
  production: true,
  name: 'prod',
  apiBase: '/api',
  idp: {
    issuer: 'https://keystone.meridian.internal',
    clientId: 'meridian-business-web',
    redirectUri: 'https://business.meridian.example/auth/callback',
    scopes: 'openid profile email offline_access accounts.read payments.write entitlements.read'
  },
  useFixtures: false,
  fixtureSeed: '',
  featureFlags: {
    wiresSameDayCutoff: true,
    payrollScheduling: true,
    reportsCsvExport: true,
    alertsSubset: true,
    positivePay: false
  },
  idleWarnMinutes: 8,
  idleTimeoutMinutes: 10,
  telemetry: {
    enabled: true,
    endpoint: '/telemetry'
  }
};
