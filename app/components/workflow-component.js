import Component from '@ember/component';
import ENV from '../config/environment';

export default Component.extend({
  errorHandler: Ember.inject.service('error-handler'),
  init() {
    this._super(...arguments);
    let url = 'Make sure you set your ENV.userService.url value in ~config/environment.js or your .env file';
    if (ENV.userService.url) {
      url = ENV.userService.url;
    }
    Ember.$.get(url, (data) => {
      if (!(data.username)) {
        this.get('errorHandler').handleError(new Error('shib302'));
      }
    }).fail(function () {
      this.get('errorHandler').handleError(new Error('shib302'));
    });
  }
});
