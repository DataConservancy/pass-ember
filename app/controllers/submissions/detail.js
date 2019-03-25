import Controller from '@ember/controller';
import ENV from 'pass-ember/config/environment';
import { inject as service } from '@ember/service';
// import swal from 'sweetalert2';

export default Controller.extend({
  metadataService: service('metadata-blob'),
  currentUser: service('current-user'),
  store: service('store'),
  tooltips: function () {
    $(() => {
      $('[data-toggle="tooltip"]').tooltip();
    });
  }.on('init'),
  externalSubmission: Ember.computed('externalSubmissionsMetadata', 'model.sub.submitted', function () {
    if (!this.get('model.sub.submitted')) {
      return [];
    }

    let md = this.get('externalSubmissionsMetadata');

    if (md) {
      return md['external-submissions'];
    }

    return [];
  }),
  /**
   * Ugly way to generate data for the template to use.
   * {
   *    'repository-id': {
   *      repo: { }, // repository obj
   *      deposit: {}, // related deposit, if exists
   *      repositoryCopy: {} // related repoCopy if exists
   *    }
   * }
   * This map is then turned into an array for use in the template
   */
  externalRepoMap: {},
  hasVisitedWeblink: Ember.computed('externalRepoMap', function () {
    return Object.values(this.get('externalRepoMap')).every(val => val === true);
  }),
  /**
   * If the submission is submitted, return external-submissions object from metadata.
   * Otherwise generate what it should be from external repositories.
   */
  externalSubmissionsMetadata: Ember.computed('model.sub.submitted', 'model.sub.metadata', function () {
    if (this.get('model.sub.submitted')) {
      const metadata = JSON.parse(this.get('model.sub.metadata'));
      let values = Ember.A();

      // Old style metadata blob :(
      if (Array.isArray(metadata)) {
        values = metadata.filter(x => x.id === 'external-submissions');

        if (values.length == 0) {
          return null;
        }

        return values[0];
      }

      return metadata;
    }

    const repos = this.get('model.repos');
    return this.get('metadataService').getExternalReposBlob(repos);
  }),
  weblinkRepos: Ember.computed('externalSubmissionsMetadata', function () {
    let md = this.get('externalSubmissionsMetadata');

    if (md && md['external-submissions']) {
      let externalRepoList = md['external-submissions'];
      externalRepoList.forEach((repo) => {
        this.get('externalRepoMap')[repo.name] = false;
      });
      return externalRepoList;
    }

    return [];
  }),
  mustVisitWeblink: Ember.computed('weblinkRepos', 'model', function () {
    const weblinkExists = this.get('weblinkRepos').length > 0;
    const isSubmitter = this.get('currentUser.user.id') === this.get('model.sub.submitter.id');
    const isProxySubmission = this.get('model.sub.isProxySubmission');
    const isSubmitted = this.get('model.sub.submitted');
    return weblinkExists && isSubmitter && isProxySubmission && !isSubmitted;
  }),
  disableSubmit: Ember.computed(
    'mustVisitWeblink',
    'hasVisitedWeblink',
    function () {
      const needsToVisitWeblink = this.get('mustVisitWeblink') && !this.get('hasVisitedWeblink');
      return needsToVisitWeblink;
    }
  ),
  repoMap: Ember.computed('model.deposits', 'model.repoCopies', function () {
    let hasStuff = false;
    const repos = this.get('model.repos');
    const deps = this.get('model.deposits');
    const repoCopies = this.get('model.repoCopies');
    if (!repos) {
      return null;
    }
    let map = {};
    repos.forEach((r) => {
      (map[r.get('id')] = {
        repo: r
      });
    });

    if (deps) {
      deps.forEach((deposit) => {
        hasStuff = true;
        const repo = deposit.get('repository');
        if (!map.hasOwnProperty(repo.get('id'))) {
          map[repo.get('id')] = {
            repo,
            deposit
          };
        } else {
          map[repo.get('id')] = Object.assign(map[repo.get('id')], {
            deposit,
            repositoryCopy: deposit.get('repositoryCopy')
          });
        }
      });
    }
    if (repoCopies) {
      hasStuff = true;
      repoCopies.forEach((rc) => {
        const repo = rc.get('repository');
        if (!map.hasOwnProperty(repo.get('id'))) {
          map[repo.get('id')] = {
            repo,
            repositoryCopy: rc
          };
        } else {
          map[repo.get('id')] = Object.assign(map[repo.get('id')], {
            repositoryCopy: rc
          });
        }
      });
    }
    if (hasStuff) {
      let results = [];
      Object.keys(map).forEach(k => results.push(map[k]));
      return results;
    }

    return null;
  }),
  // metadataBlobNoKeys: Ember.computed('model.sub.metadata', function () {
  //   return this.get('metadataService').getDisplayBlob(this.get('model.sub.metadata'));
  // }),
  isSubmitter: Ember.computed('currentUser.user', 'model', function () {
    return (
      this.get('model.sub.submitter.id') === this.get('currentUser.user.id')
    );
  }),
  isPreparer: Ember.computed('currentUser.user', 'model', function () {
    return this.get('model.sub.preparers')
      .map(x => x.get('id'))
      .includes(this.get('currentUser.user.id'));
  }),
  submissionNeedsPreparer: Ember.computed(
    'currentUser.user',
    'model',
    function () {
      return this.get('model.sub.submissionStatus') === 'changes-requested';
    }
  ),
  submissionNeedsSubmitter: Ember.computed(
    'currentUser.user',
    'model',
    function () {
      return (
        this.get('model.sub.submissionStatus') === 'approval-requested' ||
        this.get('model.sub.submissionStatus') === 'approval-requested-newuser'
      );
    }
  ),
  displaySubmitterName: Ember.computed('model.sub', function () {
    if (this.get('model.sub.submitter.displayName')) {
      return this.get('model.sub.submitter.displayName');
    } else if (this.get('model.sub.submitter.firstName')) {
      return `${this.get('model.sub.submitter.firstName')} ${this.get('model.sub.submitter.lastName')}`;
    } else if (this.get('model.sub.submitterName')) {
      return this.get('model.sub.submitterName');
    }
    return '';
  }),
  displaySubmitterEmail: Ember.computed('model.sub', function () {
    if (this.get('model.sub.submitter.email')) {
      return this.get('model.sub.submitter.email');
    } else if (this.get('model.sub.submitterEmail')) {
      return this.get('model.sub.submitterEmailDisplay');
    }
    return '';
  }),
  actions: {
    openWeblinkAlert(repo) {
      swal({
        title: 'Notice!',
        text:
          'You are being sent to an external site. This will open a new tab.',
        showCancelButton: true,
        cancelButtonText: 'Cancel',
        confirmButtonText: 'Open new tab'
      }).then((value) => {
        if (value.dismiss) {
          // Don't redirect
          return;
        }
        // Go to the weblink repo
        this.get('externalRepoMap')[repo.name] = true;
        const allLinksVisited = Object.values(this.get('externalRepoMap')).every(val => val === true);
        if (allLinksVisited) {
          this.set('hasVisitedWeblink', true);
        }
        $('#externalSubmission').modal('hide');

        var win = window.open(repo.url, '_blank');
        win.focus();
      });
    },
    requestMoreChanges() {
      let baseURL = window.location.href.replace(new RegExp(`${ENV.rootURL}.*`), '');

      if (!this.get('message')) {
        swal(
          'Comment field empty',
          'Please add a comment before requesting changes.',
          'warning'
        );
      } else {
        let s = this.get('model.sub');
        let se = this.get('store').createRecord('submissionEvent', {
          submission: this.get('model.sub'),
          performedBy: this.get('currentUser.user'),
          performedDate: new Date(),
          comment: this.get('message'),
          performerRole: 'submitter',
          eventType: 'changes-requested',
          link: `${baseURL}${ENV.rootURL}submissions/${encodeURIComponent(`${s.id}`)}`
        });
        $('.block-user-input').css('display', 'block');
        se.save().then(() => {
          let sub = this.get('model.sub');
          sub.set('submissionStatus', 'changes-requested');
          sub.save().then(() => {
            console.log('Requested more changes from preparer.');
            window.location.reload(true);
          });
        });
      }
    },
    async approveChanges() {
      let baseURL = window.location.href.replace(new RegExp(`${ENV.rootURL}.*`), '');
      // First, check if user has visited all required weblinks.
      if (this.get('disableSubmit')) {
        if (!this.get('hasVisitedWeblink')) {
          $('.fa-exclamation-triangle').css('color', '#f86c6b');
          $('.fa-exclamation-triangle').css('font-size', '2.2em');
          setTimeout(() => {
            $('.fa-exclamation-triangle').css('color', '#b0b0b0');
            $('.fa-exclamation-triangle').css('font-size', '2em');
          }, 4000);
          toastr.warning('Please visit the listed web portal(s) to submit your manuscript directly. Metadata displayed on this page can be used to help in the submission process.');
        }
        return;
      }

      // Validate manuscript files
      let manuscriptFiles = [].concat(this.get('filesTemp'), this.get('model.files') && this.get('model.files').toArray())
        .filter(file => file && file.get('fileRole') === 'manuscript');

      if (manuscriptFiles.length == 0) {
        swal(
          'Manuscript is missing',
          'At least one manuscript file is required.  Please Edit the submission to add one',
          'warning'
        );
        return;
      } else if (manuscriptFiles.length > 1) {
        swal(
          'Incorrect manuscript count',
          `Only one file may be designated as the manuscript.  Instead, found ${manuscriptFiles.length}.  Please edit the file list`,
          'warning'
        );
        return;
      }

      let reposWithAgreementText = this.get('model.repos')
        .filter(repo => (repo.get('integrationType') !== 'web-link') && repo.get('agreementText'))
        .map(repo => ({
          id: repo.get('name'),
          title: `Deposit requirements for ${repo.get('name')}`,
          html: `<textarea rows="16" cols="40" name="embargo" class="alpaca-control form-control disabled" disabled="" autocomplete="off">${repo.get('agreementText')}</textarea>`
        }));

      let reposWithoutAgreementText = this.get('model.repos')
        .filter(repo => repo.get('integrationType') !== 'web-link' && !repo.get('agreementText'))
        .map(repo => ({
          id: repo.get('name')
        }));

      let reposWithWebLink = this.get('model.repos')
        .filter(repo => repo.get('integrationType') === 'web-link')
        .map(repo => ({
          id: repo.get('name')
        }));

      // INFO: this is used to testing more then 1 repo.
      // reposWithAgreementText.push({
      //   id: 'some',
      //   title: `Deposit requirements for `,
      //   html: `<textarea rows="16" cols="40" name="embargo" class="alpaca-control form-control disabled" disabled="" autocomplete="off"></textarea>`
      // });
      const result = await swal.mixin({
        input: 'checkbox',
        inputPlaceholder: 'I agree to the above statement on today\'s date ',
        confirmButtonText: 'Next &rarr;',
        showCancelButton: true,
        progressSteps: reposWithAgreementText.map((repo, index) => index + 1),
      }).queue(reposWithAgreementText);
      if (result.value) {
        let reposThatUserAgreedToDeposit = reposWithAgreementText.filter((repo, index) => {
          // if the user agreed to depost to this repo === 1
          if (result.value[index] === 1) {
            return repo;
          }
        });
        // make sure there are repos to submit to.
        if (this.get('model.sub.repositories.length') > 0) {
          if (reposWithoutAgreementText.length > 0 || reposThatUserAgreedToDeposit.length > 0 || reposWithWebLink.length > 0) {
            let swalMsg = 'Once you click confirm you will no longer be able to edit this submission or add repositories.<br/>';
            if (reposWithoutAgreementText.length > 0 || reposThatUserAgreedToDeposit.length) {
              swalMsg = `${swalMsg}You are about to submit your files to: <pre><code>${JSON.stringify(reposThatUserAgreedToDeposit.map(repo => repo.id)).replace(/[\[\]']/g, '')}${JSON.stringify(reposWithoutAgreementText.map(repo => repo.id)).replace(/[\[\]']/g, '')} </code></pre>`;
            }
            if (reposWithWebLink.length > 0) {
              swalMsg = `${swalMsg}You were prompted to submit to: <code><pre>${JSON.stringify(reposWithWebLink.map(repo => repo.id)).replace(/[\[\]']/g, '')}</code></pre>`;
            }

            swal({
              title: 'Confirm submission',
              html: swalMsg, // eslint-disable-line
              confirmButtonText: 'Confirm',
              showCancelButton: true,
            }).then((result) => {
              if (result.value) {
                const externalSubmissionsMetadata = this.get('externalSubmissionsMetadata');
                // Update repos to reflect repos that user agreed to deposit
                this.set('model.sub.repositories', this.get('model.sub.repositories').filter((repo) => {
                  if (repo.get('integrationType') === 'weblink') {
                    return false;
                  }
                  let temp = reposWithAgreementText.map(x => x.id).includes(repo.get('name'));
                  if (!temp) {
                    return true;
                  } else if (reposThatUserAgreedToDeposit.map(r => r.id).includes(repo.get('name'))) {
                    return true;
                  }
                  return false;
                }));
                // update Metadata blob to refelect changes in repos TODO: ??????????????????????????
                // this.set('model.sub.metadata', JSON.stringify(JSON.parse(this.get('model.sub.metadata')).filter((md) => {
                //   // ------------------------------------------------------------------------------------
                //   // I'm not entirely sure what this massive function does, but this commented block is
                //   // broken after changing the metadata blob structure
                //   //
                //   // let whiteListedMetadataKeys = ['common', 'crossref', 'pmc', 'agent_information'];
                //   // if (whiteListedMetadataKeys.includes(md.id)) {
                //   //   return md;
                //   // }
                //   // ------------------------------------------------------------------------------------
                //   return this.get('model.sub.repositories').map(r => r.get('name')).includes(md.id);
                // })));

                // Add external submissions metadata
                if (externalSubmissionsMetadata) {
                  let md = JSON.parse(this.get('model.sub.metadata'));
                  // md.push(externalSubmissionsMetadata);
                  this.get('metadataService').mergeBlobs(md, externalSubmissionsMetadata);
                  this.set('model.sub.metadata', JSON.stringify(md));
                }

                // Remove external repositories
                this.set(
                  'model.sub.repositories',
                  this.get('model.sub.repositories').filter(repo => (repo.get('integrationType') !== 'web-link'))
                );

                $('.block-user-input').css('display', 'block');
                // save sub and send it
                let s = this.get('model.sub');
                let se = this.get('store').createRecord('submissionEvent', {
                  submission: this.get('model.sub'),
                  performedBy: this.get('currentUser.user'),
                  performedDate: new Date(),
                  comment: this.get('message'),
                  performerRole: 'submitter',
                  eventType: 'submitted',
                  link: `${baseURL}${ENV.rootURL}submissions/${encodeURIComponent(`${s.id}`)}`
                });
                se.save().then(() => {
                  let sub = this.get('model.sub');
                  sub.set('submissionStatus', 'submitted');
                  sub.set('submittedDate', new Date());
                  sub.set('submitted', true);
                  sub.save().then(() => {
                    window.location.reload(true);
                  });
                });
              }
            });
          } else {
            // there were repositories, but the user didn't sign any of the agreements
            let reposUserDidNotAgreeToDeposit = reposWithAgreementText.filter((repo) => {
              if (!reposThatUserAgreedToDeposit.includes(repo)) {
                return true;
              }
            });
            swal({
              title: 'Your submission cannot be submitted.',
              html: `You declined to agree to the deposit agreement(s) for ${JSON.stringify(reposUserDidNotAgreeToDeposit.map(repo => repo.id)).replace(/[\[\]']/g, '')}. Therefore, this submission cannot be submitted. \n You can either (a) cancel the submission or (b) return to the submission to provide required input and try again.`,
              confirmButtonText: 'Cancel submission',
              showCancelButton: true,
              cancelButtonText: 'Go back to edit information'
            }).then((result) => {
              if (result.value) {
                this.send('cancelSubmission');
              }
            });
          }
        } else {
          // no repositories associated with the submission
          swal({
            title: 'Your submission cannot be submitted.',
            html: 'No repositories are associated with this submission. \n You can either (a) cancel the submission or (b) return to the submission and edit it to include a repository.',
            confirmButtonText: 'Cancel submission',
            showCancelButton: true,
            cancelButtonText: 'Go back to edit information'
          }).then((result) => {
            if (result.value) {
              this.send('cancelSubmission');
            }
          });
        }
      }
    },
    cancelSubmission() {
      let baseURL = window.location.href.replace(new RegExp(`${ENV.rootURL}.*`), '');

      if (!this.get('message')) {
        swal(
          'Comment field empty',
          'Please add a comment for your cancellation.',
          'warning'
        );
        return;
      }
      swal({
        title: 'Are you sure?',
        text: 'If you cancel this submission, it will not be able to be resumed.',
        confirmButtonText: 'Yes, cancel this submission',
        confirmButtonColor: '#f86c6b',
        cancelButtonText: 'Never mind',
        showCancelButton: true,
      }).then((result) => {
        if (result.value) {
          let s = this.get('model.sub');
          let se = this.get('store').createRecord('submissionEvent', {
            submission: this.get('model.sub'),
            performedBy: this.get('currentUser.user'),
            performedDate: new Date(),
            comment: this.get('message'),
            performerRole: 'submitter',
            eventType: 'cancelled',
            link: `${baseURL}${ENV.rootURL}submissions/${encodeURIComponent(`${s.id}`)}`
          });
          $('.block-user-input').css('display', 'block');
          se.save().then(() => {
            let sub = this.get('model.sub');
            sub.set('submissionStatus', 'cancelled');
            sub.save().then(() => {
              console.log('Submission cancelled.');
              window.location.reload(true);
            });
          });
        }
      });
    }
  }
});
