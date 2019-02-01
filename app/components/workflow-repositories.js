import Component from '@ember/component';
import { inject as service, } from '@ember/service';

export default Component.extend({
  addedRepositories: [],
  router: service(),
  store: service(),
  workflow: service(),
  pmcPublisherDeposit: Ember.computed('workflow.pmcPublisherDeposit', function () {
    return this.get('workflow').getPmcPublisherDeposit();
  }),
  isFirstTime: true,
  willRender() {
    this._super(...arguments);
    this.set('addedRepositories', []);
    if (!(this.get('addedRepositories').findBy('name', 'JScholarship'))) {
      let jScholarships = this.get('model.repositories').filter(repo => repo.get('name') === 'JScholarship');
      this.get('addedRepositories').pushObject(jScholarships[0]);
    }
  },
  getFunderNamesForRepo(repo) {
    const funders = this.get('model.newSubmission.grants').map(grant => grant.get('primaryFunder'));
    const fundersWithRepos = funders.filter(funder => funder.get('policy.repositories'));
    const fundersWithOurRepo = fundersWithRepos.filter(funder => funder.get('policy') &&
      funder.get('policy.repositories') && funder.get('policy.repositories').includes(repo));
    if (fundersWithRepos && fundersWithOurRepo.length > 0) {
      return fundersWithOurRepo.map(funder => funder.get('name'))
        .filter((item, index, arr) => arr.indexOf(item) == index).join(', ');
    }
    return '';
  },
  usesPmcRepository(policyRepos) {
    return policyRepos ? (policyRepos.filter(repo => repo.get('repositoryKey') === 'pmc').length > 0) : false;
  },
  requiredRepositories: Ember.computed('model.repositories', function () {
    const grants = this.get('model.newSubmission.grants');
    let repos = Ember.A();
    grants.forEach((grant) => {
      const funder = grant.get('primaryFunder');
      if (!funder.content || !funder.get('policy')) {
        return;
      }

      // Grant has funder and that funder has a policy. Get the repositories tied to the policy
      const grantRepos = funder.get('policy.repositories');
      if (!grantRepos || grantRepos.length == 0) {
        return;
      }

      let repoIsAlreadyInSubmission = grantRepos.any(grantRepo => this.get('model.newSubmission.repositories').includes(grantRepo));

      // it's either not a PMC deposit or if it is one, the publisher won't deposit it so it must be included
      if (!this.get('pmcPublisherDeposit') || !this.usesPmcRepository(grantRepos)) {
        grantRepos.forEach((repo) => {
          repos.addObject({
            repo,
            funders: this.getFunderNamesForRepo(repo)
          });
          repos = repos.uniqBy('repo');
        });
      } else if (repoIsAlreadyInSubmission) {
        // Remove it from the submission so that it can be re-added :)
        this.get('model.newSubmission.repositories').removeObjects(grantRepos.map(g => g.repo));
      }
    });
    // STEP 2
    repos.forEach((repo) => {
      this.send('addRepo', repo.repo);
    });

    // STEP 3
    return repos;
  }),
  optionalRepositories: Ember.computed('requiredRepositories', function () {
    let repos = this.get('model.repositories').filter(repo => repo.get('name') === 'JScholarship');
    if (repos.length > 1) {
      repos = [repos[0]];
    }
    let result = [];
    repos.forEach(r => result.push({ repo: r, funders: 'Johns Hopkins University' }));
    return result;
  }),
  actions: {
    next() {
      this.send('saveAll');
      if (this.get('model.newSubmission.repositories.length') == 0) {
        swal(
          'You\'re done!',
          'If you don\'t plan on submitting to any repositories, you can stop at this time.',
          { buttons: { cancel: true, confirm: true } },
        ).then((value) => {
          if (value.dismiss) return;
          this.get('router').transitionTo('dashboard');
        });
      } else {
        // Remove any schemas not associated with the repositories attached to the submission or not on the whitelist.
        // Whitelisted schemas are not associated with repositories but still required by deposit services.
        let metadata;
        if (this.get('model.newSubmission.metadata')) {
          metadata = JSON.parse(this.get('model.newSubmission.metadata'));
        } else {
          metadata = [];
        }
        let schemaWhitelist = ['common', 'crossref', 'agent_information', 'pmc'];
        let schemaIds = this.get('model.newSubmission.repositories').map(x => JSON.parse(x.get('formSchema')).id);
        metadata = metadata.filter(md => schemaIds.includes(md.id) || schemaWhitelist.includes(md.id));
        this.set('model.newSubmission.metadata', JSON.stringify(metadata));
        this.sendAction('next');
      }
    },

    back() { this.sendAction('back'); },
    addRepo(repository) { this.get('addedRepositories').push(repository); },

    removeRepo(targetRepository) {
      const addedRepos = this.get('addedRepositories');
      addedRepos.forEach((repository, index) => {
        if (targetRepository.get('id') === repository.get('id')) addedRepos.splice(index, 1);
      });
    },
    saveAll() {
      // remove all repos from submission
      let tempRepos = this.get('model.newSubmission.repositories');
      this.get('model.newSubmission.repositories').forEach((repo) => {
        tempRepos.removeObject(repo);
      });
      this.set('model.newSubmission.repositories', tempRepos);
      // add back the ones the user selected
      this.get('addedRepositories').forEach((repositoryToAdd) => {
        if (!((this.get('model.newSubmission.repositories').includes(repositoryToAdd)))) {
          this.get('model.newSubmission.repositories').addObject(repositoryToAdd);
        }
      });
    },
    toggleRepository(repository) {
      if (event.target.checked) this.send('addRepo', repository);
      else this.send('removeRepo', repository);
    },
  },
});
