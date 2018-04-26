import DS from 'ember-data';

export default DS.Model.extend({
  /** (REQUIRED) */
  displayName: DS.attr('string'),
  /** (REQUIRED) */
  email: DS.attr('string'),
  orcid: DS.attr('string'),
  // ---- Uncomment as needed in UI----
  firstName: DS.attr('string'),
  middleName: DS.attr('string'),
  lastName: DS.attr('string'),
  institutionalId: DS.attr('string'),
  affiliation: DS.attr('string')
});
