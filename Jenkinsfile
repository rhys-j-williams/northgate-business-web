#!/usr/bin/env groovy
// Northgate Business (business-web). Owner @northgate/business-digital.
//
// nodejs16-rhel8 since MBZ-2140 / MBZ-2231 (Node 14 agent retirement, KAN-29). The label, the
// engines pin in package.json, .nvmrc and the npm 8 lockfile move together; engine-strict in .npmrc
// means a mismatch fails npm ci on the first line, so do not change one without the others.
// See platform-tooling/jenkins-shared-library/README.md, "Build agents".
@Library('northgate-pipeline@v3') _

northgateNodePipeline(
    agentLabel:        'nodejs16-rhel8',
    nodeVersion:       '16.20.2',
    appName:           'business-web',
    helmChart:         'platform-tooling/helm/business-web',
    dockerfile:        'platform-tooling/docker/angular/Dockerfile',
    coverageThreshold: 20,
    lintCommand:       'npm run lint',
    testCommand:       'npm test',
    buildCommand:      'npm run build',
    coverageSummary:   'coverage/northgate-business/coverage-summary.json',
    // CHROME_BIN comes from the nodejs16-rhel8 agent image (Chrome 120) via the shared library
    // default; no per-repo override as on the retired rhel7 image.
    env: [
        NG_CLI_ANALYTICS: 'false'
    ],
    timeoutMinutes: 45,
    // TSLint exits 2 on warnings if any rule is set to "warning" severity and --force is absent.
    // The shared library treats non-zero lint as a failure so the package script must stay clean.
    sonarProjectKey:   'northgate-business-web',
    checkmarxPreset:   'northgate-angular-legacy'
)
