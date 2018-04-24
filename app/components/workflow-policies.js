import Component from '@ember/component';

export default Component.extend({
  activePolicies: Ember.computed('model.newSubmission', function () {
    // policies can come from repositories  // UPDATE: not anymore!
    // const repos = [];
    const policies = [];
    // this.get('model.newSubmission.repositories').forEach((repository) => {
    //   repos.addObject(repository);
    // });
    // policies can come from funders
    this.get('model.newSubmission.grants').forEach((grant) => {
      // repos.addObject(grant.get('primaryFunder.repository'));
      if (grant.get('primaryFunder.policy.content')) {
        policies.addObject(grant.get('primaryFunder.policy'));
      }
    });
    // repos.forEach((repository) => {
    //   policies.addObject(repository.get('policy'));
    // });
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
