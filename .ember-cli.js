
'use strict';

const { setEdition } = require('@ember/edition-utils');

setEdition('octane');

module.exports = {
  /**
    Ember CLI sends analytics information by default. The data is completely
    anonymous, but there are times when you might want to disable this behavior.

    Setting `disableAnalytics` to true will prevent any data from being sent.
  */
  liveReload: false,
  testPort: 4200,
  yarn: true,
  watcher: 'polling',
  disableAnalytics: false
};
