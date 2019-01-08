// Karma configuration file, see link for more information
// https://karma-runner.github.io/1.0/config/configuration-file.html
//
// MBZ-1506: ChromeHeadlessCI launcher added because the nodejs14-rhel7 agents run the build as an
// unprivileged user without a usable sandbox. CHROME_BIN comes from the agent image; developers on
// laptops export it themselves (README, "Running the tests").

process.env.CHROME_BIN = process.env.CHROME_BIN || '/home/ubuntu/.local/bin/google-chrome';

module.exports = function (config) {
  config.set({
    basePath: '',
    frameworks: ['jasmine', '@angular-devkit/build-angular'],
    plugins: [
      require('karma-jasmine'),
      require('karma-chrome-launcher'),
      require('karma-jasmine-html-reporter'),
      require('karma-coverage'),
      require('@angular-devkit/build-angular/plugins/karma')
    ],
    client: {
      jasmine: {
        // random: false because the entitlements reducer specs share a fixture seed and the
        // order used to matter. It should not any more. MBZ-1733.
        random: false
      },
      clearContext: false // leave Jasmine Spec Runner output visible in browser
    },
    jasmineHtmlReporter: {
      suppressAll: true // removes the duplicated traces
    },
    coverageReporter: {
      dir: require('path').join(__dirname, './coverage/meridian-business'),
      subdir: '.',
      reporters: [
        { type: 'html' },
        { type: 'lcovonly' },
        { type: 'json-summary' },
        { type: 'text-summary' }
      ],
      // Sonar gate is in Jenkinsfile, not here. Numbers below are informational and have been
      // red since the 2021.06 train.
      check: {
        global: {
          statements: 15,
          lines: 15
        }
      }
    },
    reporters: ['progress', 'kjhtml'],
    port: 9876,
    colors: true,
    logLevel: config.LOG_INFO,
    autoWatch: true,
    browsers: ['Chrome'],
    customLaunchers: {
      ChromeHeadlessCI: {
        base: 'ChromeHeadless',
        flags: ['--no-sandbox', '--disable-gpu', '--disable-dev-shm-usage']
      }
    },
    browserNoActivityTimeout: 60000,
    captureTimeout: 120000,
    singleRun: false,
    restartOnFileChange: true
  });
};
