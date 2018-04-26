import Component from '@ember/component';

export default Component.extend({
  session: Ember.inject.service('session'),
  currentUser: Ember.inject.service('current-user'),

  actions: {
    invalidateSession() {
      this.get('session').invalidate();
    },
  },
});
