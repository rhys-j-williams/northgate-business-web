#!/usr/bin/env groovy
// Meridian Business (business-web). Owner @meridian/business-digital.
//
// Yes, nodejs14-rhel7. See platform-tooling/jenkins-shared-library/README.md, the paragraph that
// starts "The nodejs14-rhel7 situation". MBZ-2231 is the upgrade ticket; it has been re-parented
// three times. Do not change the label to nodejs16-rhel8 to "see if it works" - it does not,
// engine-strict in .npmrc fails npm ci on the first line, and the last person who tried it
// (2024-02) broke the release/2024.03 train build for a day.
@Library('meridian-pipeline@v3') _

meridianNodePipeline(
    agentLabel:        'nodejs14-rhel7',
    nodeVersion:       '14.21.3',
    appName:           'business-web',
    helmChart:         'platform-tooling/helm/business-web',
    dockerfile:        'platform-tooling/docker/angular/Dockerfile',
    coverageThreshold: 20,
    lintCommand:       'npm run tslint',
    testCommand:       'npm test',
    buildCommand:      'npm run build',
    coverageSummary:   'coverage/meridian-business/coverage-summary.json',
    // Karma on the rhel7 image needs the bundled Chrome 109; the library's default points at 120.
    env: [
        CHROME_BIN: '/opt/google/chrome-109/chrome',
        NG_CLI_ANALYTICS: 'false'
    ],
    // Twenty minutes is normal on this agent. Do not lower.
    timeoutMinutes: 45,
    // TSLint exits 2 on warnings if any rule is set to "warning" severity and --force is absent.
    // The shared library treats non-zero lint as a failure so the package script must stay clean.
    sonarProjectKey:   'meridian-business-web',
    checkmarxPreset:   'meridian-angular-legacy'
)
