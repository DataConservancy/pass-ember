import DS from 'ember-data';

export default DS.Model.extend({
  /** Award number from a funder (REQUIRED) */
  awardNumber: DS.attr('string'),
  awardStatus: DS.attr('string'),
  externalId: DS.attr('string'),
  projectName: DS.attr('string'),
  awardDate: DS.attr('date'),
  startDate: DS.attr('date'),
  /** Date the grant ended */
  endDate: DS.attr('date'),

  pi: DS.belongsTo('user'),
  coPis: DS.hasMany('user', { async: true }),
  primaryFunder: DS.belongsTo('funder'),
  directFunder: DS.belongsTo('funder'),
  submissions: DS.hasMany('submission', { async: true }),
});
