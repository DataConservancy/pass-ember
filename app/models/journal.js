import DS from 'ember-data';

export default DS.Model.extend({
  /**
   * Name of the journal (REQUIRED)
   */
  name: DS.attr('string'),
  nlmta: DS.attr('string'),
  pmcParticipation: DS.attr('string'),
  // issns: ...     Need to support array of strings in fedora-adapter
});
