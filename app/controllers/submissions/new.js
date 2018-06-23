import Controller from '@ember/controller';
import ENV from 'pass-ember/config/environment';

export default Controller.extend({
  currentUser: Ember.inject.service('current-user'),
  queryParams: ['grant', 'submission'],
  tempFiles: Ember.A(),
  didNotAgree: false, // JHU included as a repository but removed before review because deposit agreement wasn't accepted
  actions: {
    submit() {
      if (this.get('didNotAgree')) {
        let jhuRepo = that.get('model.newSubmission.repositories').filter(repo => repo.get('name') === 'JScholarship');
        if (jhuRepo.length > 0) {
          jhuRepo = jhuRepo[0];
          that.get('model.newSubmission.repositories').removeObject(jhuRepo);
        }
      }
      const sub = this.get('model.newSubmission');

      // remove all weblink-only repositories so they don't get deposited
      // sub.get('repositories').forEach((repo) => {
      //   // add each repo to the metadata
      // });
      sub.set('repositories', sub.get('repositories').filter((repo) => { // eslint-disable-line
        // TODO the specific URL checks should be removed after Repository data is updated to
        // include 'integrationType' property
        return repo.get('integrationType') !== 'web-link' &&
          repo.get('url') !== 'https://eric.ed.gov/' &&
          repo.get('url') !== 'https://dec.usaid.gov/';
      }));

      const pub = this.get('model.publication');
      sub.set('aggregatedDepositStatus', 'not-started');
      sub.set('submittedDate', new Date());
      sub.set('submitted', false);
      sub.set('user', this.get('currentUser.user.id'));
      sub.set('source', 'pass');
      pub.save().then((p) => {
        sub.set('publication', p.get('id'));
        let ctr = 0;
        let len = this.get('filesTemp').length;
        sub.set('removeNIHDeposit', false);
        sub.save().then((s) => {
          this.get('filesTemp').forEach((file) => {
            let contentType = file.get('_file.type') ? file.get('_file.type') : 'application/octet-stream';
            var reader = new FileReader();
            reader.readAsArrayBuffer(file.get('_file'));
            reader.onload = (evt) => {
              let data = evt.target.result;
              let xhr = new XMLHttpRequest();
              xhr.open('POST', `${s.get('id')}`, true);
              xhr.setRequestHeader('Content-Disposition', `attachment; filename="${file.get('name')}"`);
              xhr.setRequestHeader('Content-Type', contentType);
              if (ENV.environment === 'travis' || ENV.environment === 'development') {
                xhr.withCredentials = true;
                if (ENV.environment === 'development') {
                  xhr.setRequestHeader('Authorization', 'Basic YWRtaW46bW9v'); // TODO: should not be hardcoded
                }
              }
              xhr.onload = (results) => {
                file.set('submission', s.get('id'));
                file.set('uri', results.target.response);
                file.save().then((f) => {
                  if (f) {
                    ctr += 1;
                    console.log(ctr);
                    if (ctr >= len) {
                      s.set('submitted', true);
                      s.save().then(() => {
                        this.transitionToRoute('thanks', { queryParams: { submission: s.get('id') } });
                      });
                    }
                  } else {
                    toastr.error('It looks like one or more of your files failed to upload. Please try again or contact support.');
                  }
                }).catch((e) => {
                  toastr.error(e);
                });
              };
              xhr.send(data);
            };
            reader.onerror = function (evt) {
              toastr.error('Error reading file');
            };
          });
        });
      });
    },
  },
});
