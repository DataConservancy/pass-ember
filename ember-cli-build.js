/* eslint-env node */

'use strict';

const EmberApp = require('ember-cli/lib/broccoli/ember-app');
const stringHash = require('string-hash');

const disableCssModules = [
  '/pass-ember/styles/app.scss'
];

module.exports = function (defaults) {
  let app = new EmberApp(defaults, {
    // Add options here
    'ember-composable-helpers': {
      only: ['queue', 'compute', 'invoke'],
    },
    'ember-cli-babel': {
      includePolyfill: true
    },
    cssModules: {
      generateScopedName(className, modulePath) {
        if (!disableCssModules.includes(modulePath)) {
          let hash = stringHash(modulePath).toString(36).substring(0, 6);
          let scopedName = `_${className}_${hash}`;

          return scopedName;
        }

        return className;
      },
    }
  });

  // Use `app.import` to add additional libraries to the generated
  // output files.
  //
  // If you need to use different assets in different
  // environments, specify an object as the first parameter. That
  // object's keys should be the environment name and the values
  // should be the asset to use in that environment.
  //
  // If the library that you are including contains AMD or ES6
  // modules that you would like to import into your application
  // please specify an object with the list of modules as keys
  // along with the exports of each module as its value.

  return app.toTree();
};
