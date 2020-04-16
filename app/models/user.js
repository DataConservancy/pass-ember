import { computed } from '@ember/object';
import DS from 'ember-data';

export default DS.Model.extend({
  /**
   * (Required)
   */
  username: DS.attr('string'),
  firstName: DS.attr('string'),
  middleName: DS.attr('string'),
  lastName: DS.attr('string'),
  displayName: DS.attr('string'),
  email: DS.attr('string'),

  affiliation: DS.attr('set'),
  locatorIds: DS.attr('set'),
  orcidId: DS.attr('string'),
  /** Possible values: admin, submitter */
  roles: DS.attr('set'),

  isSubmitter: computed('roles.[]', function () {
    return this.roles ? this.roles.includes('submitter') : false;
  }),
  isAdmin: computed('roles.[]', function () {
    return this.roles ? this.roles.includes('admin') : false;
  })
});
