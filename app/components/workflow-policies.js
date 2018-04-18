import Component from '@ember/component';

export default Component.extend({
  activePolicies: Ember.computed('model.newSubmission', function () {
    // policies can come from repositories
    const repos = [];
    const policies = [];
    this.get('model.newSubmission.repositories').forEach((repository) => {
      repos.addObject(repository);
    });
    // policies can come from funders
    this.get('model.newSubmission.grants').forEach((grant) => {
      repos.addObject(grant.get('funder.repository'));
      if (grant.get('funder.policy.content')) {
        policies.addObject(grant.get('funder.policy'));
      }
    });
    repos.forEach((repository) => {
      policies.addObject(repository.get('policy'));
    });
    return policies;
  }),
  actions: {
    next() {
      this.sendAction('next');
    },
    back() {
      this.sendAction('back');
    },
  },
});
