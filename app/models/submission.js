import DS from 'ember-data';

export default DS.Model.extend({
  aggregatedDepositStatus: DS.attr('string', { defaultValue: 'not-started' }),
  userSubmittedDate: DS.attr('date'),
  source: DS.attr('string', { defaultValue: 'pass' }),
  metadata: DS.attr('string', { defaultValue: '{}' }), // Stringified JSON
  // pubmedId: DS.attr('string'),
  submitted: DS.attr('boolean', { defaultValue: false }),
  files: DS.attr(),

  user: DS.belongsTo('user'),
  publication: DS.belongsTo('publication'),
  repositories: DS.hasMany('repository', { async: true }), // not on this model on API
  deposits: DS.hasMany('deposit', { async: true }),
  /**
   * List of grants related to the item being submitted. The grant PI determines who can perform
   * the submission and in the case that there are mutliple associated grants, they all should
   * have the same PI. If a grant has a different PI, it should be a separate submission.
   */
  grants: DS.hasMany('grant', { async: true }),
});
