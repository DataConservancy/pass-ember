import Controller from '@ember/controller';
import { computed } from '@ember/object';

export default Controller.extend({
  currentUser: Ember.inject.service('current-user')
});
