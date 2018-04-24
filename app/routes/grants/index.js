import Route from '@ember/routing/route';
import AuthenticatedRouteMixin from 'ember-simple-auth/mixins/authenticated-route-mixin';

const { service } = Ember.inject;

export default Route.extend(AuthenticatedRouteMixin, {

  model() {
    return this.get('store').findAll('grant');
  },
});
