// Everything in process against @northgate/domain-fixtures, no BFF, no IdP. Used by the Jenkins
// smoke stage and by anyone demoing from a train. `npm run start:mock-external`.
export const environment = {
  production: false,
  name: 'mock-external',
  apiBase: 'http://localhost:4501',
  idp: {
    issuer: 'http://localhost:4400',
    clientId: 'northgate-business-web',
    redirectUri: 'http://localhost:4201/auth/callback',
    scopes: 'openid profile email offline_access accounts.read payments.write entitlements.read'
  },
  useFixtures: true,
  fixtureSeed: 'northgate-business',
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
    enabled: false,
    endpoint: 'http://localhost:4606/services/collector/event'
  }
};
