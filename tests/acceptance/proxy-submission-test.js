import Service from '@ember/service';
import { module, test } from 'qunit';
import { setupApplicationTest } from 'ember-qunit';
import {
  find,
  click,
  visit,
  currentURL,
  fillIn,
  waitFor,
  triggerKeyEvent,
  triggerEvent
} from '@ember/test-helpers';
import setupMirage from 'ember-cli-mirage/test-support/setup-mirage';
import sharedScenario from '../../mirage/scenarios/shared';
import { pluralize } from 'ember-inflector';

module('Acceptance | proxy submission', function (hooks) {
  setupApplicationTest(hooks);
  setupMirage(hooks);

  hooks.beforeEach(function () {
    const mockStaticConfig = Service.extend({
      getStaticConfig: () => Promise.resolve({
        assetsUri: '',
        branding: {
          stylesheet: ''
        }
      }),
      addCss: () => {}
    });

    this.server.get('https://pass.local/downloadservice/lookup', () => ({
      manuscripts: [
        {
          url: 'https://dash.harvard.edu/bitstream/1/12285462/1/Nanometer-Scale%20Thermometry.pdf',
          repositoryLabel: 'Harvard University - Digital Access to Scholarship at Harvard (DASH)',
          type: 'application/pdf',
          source: 'Unpaywall',
          name: 'Nanometer-Scale Thermometry.pdf'
        },
        {
          url: 'http://europepmc.org/articles/pmc4221854?pdf=render',
          repositoryLabel: 'pubmedcentral.nih.gov',
          type: 'application/pdf',
          source: 'Unpaywall',
          name: 'pmc4221854?pdf=render'
        },
        {
          url: 'http://arxiv.org/pdf/1304.1068',
          repositoryLabel: 'arXiv.org',
          type: 'application/pdf',
          source: 'Unpaywall',
          name: '1304.1068'
        }
      ]
    }));

    /**
     * Create the user in the database with both top level attrs and
     * attrs inside _source for the adapter to process elastic response
     */
    let attrs = {
      '@id': 'https://pass.local/fcrepo/rest/users/21/36/86/ff/213686ff-da91-455b-977d-b1bae238d9b6',
      '@type': 'User',
      '@context': 'https://oa-pass.github.io/pass-data-model/src/main/resources/context-3.4.jsonld',
      displayName: 'Staff Hasgrants',
      email: 'staffWithGrants@jhu.edu',
      firstName: 'Staff',
      lastName: 'Hasgrants',
      locatorIds: [
        `johnshopkins.edu:jhed:${Math.ceil(Math.random() * 1000000)}`,
        `johnshopkins.edu:hopkinsid:${Math.ceil(Math.random() * 1000000)}`,
        `johnshopkins.edu:employeeid:${Math.ceil(Math.random() * 1000000)}`,
        `johnshopkins.edu:jhed:${Math.ceil(Math.random() * 1000000)}`
      ],
      roles: ['submitter'],
      username: 'staff1@johnshopkins.edu'
    };

    this.server.create('user', { ...attrs, _source: attrs });

    /**
     * Mock the responses from elastic search
     */
    this.server.post('http://localhost:9200/pass/**', (schema, request) => {
      let models;
      let type = JSON.parse(request.requestBody)
        .query.bool.filter
        .term['@type']
        .toLowerCase();
      type = pluralize(type);

      if (type === 'users') {
        models = schema.users.where({ firstName: 'Staff' }).models.map(model => model.attrs);
      } else {
        models = schema[type].all().models.map(model => model.attrs);
      }

      let elasticReponse = {
        hits: {
          max_score: 1,
          hits: models,
          total: models.length
        }
      };

      return elasticReponse;
    });

    this.owner.register('service:app-static-config', mockStaticConfig);
  });

  test('can walk through a proxy submission workflow and make a submission – with pass account', async function (assert) {
    sharedScenario(this.server);

    await visit('/?userToken=https://pass.local/fcrepo/rest/users/0f/46/19/45/0f461945-d381-460e-9cc1-be4b246faa95');
    assert.equal(currentURL(), '/?userToken=https://pass.local/fcrepo/rest/users/0f/46/19/45/0f461945-d381-460e-9cc1-be4b246faa95');

    await waitFor('[data-test-start-new-submission]');
    await click(find('[data-test-start-new-submission]'));

    await click('[data-test-proxy-radio-button]');
    await fillIn('[data-test-proxy-search-input]', 'Staff');
    await click('[data-test-proxy-user-search-button]');

    await waitFor(document.querySelector('.ember-modal-dialog'));
    await waitFor(document.querySelector('[data-test-found-proxy-user]'));
    await click(document.querySelector('[data-test-found-proxy-user]'));

    await walkThroughSubmissionFlow(assert, true); // eslint-disable-line no-use-before-define

    assert.dom('[data-test-submission-detail-submitter]').includesText('Staff Hasgrants');
    assert.dom('[data-test-submission-detail-submitter]').includesText('(staffWithGrants@jhu.edu)');
    assert.dom('[data-test-submission-detail-preparer]').includesText('Nihu Ser');
    assert.dom('[data-test-submission-detail-preparer]').includesText('(nihuser@jhu.edu)');
  });

  test('can walk through a proxy submission workflow and make a submission – without pass account', async function (assert) {
    sharedScenario(this.server);

    await visit('/?userToken=https://pass.local/fcrepo/rest/users/0f/46/19/45/0f461945-d381-460e-9cc1-be4b246faa95');
    assert.equal(currentURL(), '/?userToken=https://pass.local/fcrepo/rest/users/0f/46/19/45/0f461945-d381-460e-9cc1-be4b246faa95');

    await waitFor('[data-test-start-new-submission]');
    await click(find('[data-test-start-new-submission]'));

    await click('[data-test-proxy-radio-button]');
    await fillIn('[data-test-proxy-submitter-email-input]', 'nopass@account.com');
    await fillIn('[data-test-proxy-submitter-name-input]', 'John Moo');

    await walkThroughSubmissionFlow(assert, false); // eslint-disable-line no-use-before-define

    assert.dom('[data-test-submission-detail-submitter]').includesText('John Moo');
    assert.dom('[data-test-submission-detail-submitter]').includesText('(nopass@account.com)');
    assert.dom('[data-test-submission-detail-preparer]').includesText('Nihu Ser');
    assert.dom('[data-test-submission-detail-preparer]').includesText('(nihuser@jhu.edu)');
  });

  async function walkThroughSubmissionFlow(assert, hasAccount) {
    await waitFor('[data-test-workflow-basics-next]');
    assert.equal(currentURL(), '/submissions/new/basics');
    assert.dom('[data-test-doi-input]').exists();
    await fillIn('[data-test-doi-input]', '10.1039/c7an01256j');

    await waitFor(document.querySelector('.toast-message'));
    assert.dom(document.querySelector('.toast-message')).includesText('We\'ve pre-populated information from the DOI provided!');
    assert.dom('[data-test-article-title-text-area]').hasValue('Quantitative profiling of carbonyl metabolites directly in crude biological extracts using chemoselective tagging and nanoESI-FTMS');
    assert.dom('[data-test-journal-name-input]').hasValue('The Analyst');

    await focus('[data-test-article-title-text-area]');
    await triggerKeyEvent('[data-test-article-title-text-area]', 'keydown', 77 /* m */);
    await triggerKeyEvent('[data-test-article-title-text-area]', 'keydown', 79 /* o */);
    await triggerKeyEvent('[data-test-article-title-text-area]', 'keydown', 79 /* o */);

    await focus('[data-test-journal-name-input]');
    await triggerKeyEvent('[data-test-journal-name-input]', 'keydown', 77 /* m */);
    await triggerKeyEvent('[data-test-journal-name-input]', 'keydown', 79 /* o */);
    await triggerKeyEvent('[data-test-journal-name-input]', 'keydown', 79 /* o */);

    assert.dom('[data-test-article-title-text-area]').hasValue('Quantitative profiling of carbonyl metabolites directly in crude biological extracts using chemoselective tagging and nanoESI-FTMS');
    assert.dom('[data-test-journal-name-input]').hasValue('The Analyst');

    await waitFor('[data-test-workflow-basics-next]');
    await click('[data-test-workflow-basics-next]');

    if (hasAccount) {
      await waitFor('[data-test-grants-selection-table] tbody tr td.projectname-date-column');
      assert.equal(currentURL(), '/submissions/new/grants');
      assert.dom('[data-test-grants-selection-table] tbody tr td.projectname-date-column').includesText('Regulation of Synaptic Plasticity in Visual Cortex');
      await click('[data-test-grants-selection-table] tbody tr td.projectname-date-column');
      await waitFor('[data-test-submission-funding-table] tbody tr td.projectname-date-column');
      assert.dom('[data-test-submission-funding-table] tbody tr td.projectname-date-column').includesText('Regulation of Synaptic Plasticity in Visual Cortex');
    } else {
      await waitFor('[data-test-workflow-grants-next]');
      assert.dom('[data-test-workflow-grants-no-account-message]').includesText('Because the person you are submitting on behalf of is not yet in our system, PASS does not have information about his/her grant(s) and cannot associate this submission with a grant. Please click Next to continue.');
      await click('[data-test-workflow-grants-next]');
    }

    await click('[data-test-workflow-grants-next]');

    await waitFor('[data-test-workflow-policies-next]');
    assert.equal(currentURL(), '/submissions/new/policies');
    await waitFor('input[type=radio]:checked');
    assert.dom('[data-test-workflow-policies-radio-no-direct-deposit:checked');

    await click('[data-test-workflow-policies-next]');

    await waitFor('[data-test-workflow-repositories-next]');
    assert.equal(currentURL(), '/submissions/new/repositories');
    if (hasAccount) {
      assert.dom('[data-test-workflow-repositories-required-list] li').includesText('PubMed Central - NATIONAL INSTITUTE OF HEALTH');
    } else {
      assert.dom('[data-test-workflow-repositories-required-list] li').includesText('PubMed Central');
    }
    assert.dom('[data-test-workflow-repositories-optional-list] li').includesText('JScholarship');
    assert.dom('[data-test-workflow-repositories-optional-list] li input:checked').hasValue('on');

    await click('[data-test-workflow-repositories-next]');

    await waitFor('[data-test-metadata-form] textarea[name=title]');
    assert.equal(currentURL(), '/submissions/new/metadata');
    assert.dom('[data-test-metadata-form] textarea[name=title]').hasValue('Quantitative profiling of carbonyl metabolites directly in crude biological extracts using chemoselective tagging and nanoESI-FTMS');
    assert.dom('[data-test-metadata-form] input[name=journal-title]').hasValue('The Analyst');

    await click('.alpaca-form-button-Next');

    await waitFor('input[type=file]');

    await click('[data-test-workflow-files-next]');

    await waitFor(document.querySelector('#swal2-title'));
    assert.dom(document.querySelector('#swal2-title')).includesText('No manuscript present');
    await click(document.querySelector('.swal2-confirm'));
    assert.dom('#swal2-title').doesNotExist();

    await waitFor('[data-test-workflow-review-submit]');
    assert.equal(currentURL(), '/submissions/new/review');

    await click('[data-test-workflow-review-back]');

    await waitFor('input[type=file]');

    assert.equal(currentURL(), '/submissions/new/files');
    const submissionFile = new Blob(['moo'], { type: 'application/pdf' });
    submissionFile.name = 'my-submission.pdf';
    await triggerEvent(
      'input[type=file]',
      'change',
      { files: [submissionFile] }
    );
    assert.dom('[data-test-added-manuscript-row]').includesText('my-submission.pdf');

    await click('[data-test-workflow-files-next]');

    await waitFor('[data-test-workflow-review-submit]');

    assert.equal(currentURL(), '/submissions/new/review');
    assert.dom('[data-test-workflow-review-title]').includesText('Quantitative profiling of carbonyl metabolites directly in crude biological extracts using chemoselective tagging and nanoESI-FTMS');
    assert.dom('[data-test-workflow-review-doi]').includesText('10.1039/c7an01256j');
    assert.dom('[data-test-workflow-review-file-name]').includesText('my-submission.pdf');
    assert.dom('[data-test-workflow-review-submitter]').includesText('This submission is prepared on behalf of');

    await click('[data-test-workflow-review-submit]');

    await waitFor('[data-test-workflow-thanks-thank-you]');
    assert.dom('[data-test-workflow-thanks-thank-you]').includesText('Thank you!');
    assert.ok(currentURL().includes('/thanks'));

    await click('[data-test-workflow-thanks-link-to-submissions]');
    assert.equal(currentURL(), '/submissions');

    await waitFor('[data-test-submissions-index-submissions-table]');
    await click('table > tbody > tr > td > a');
    assert.ok(currentURL().includes('/submissions/https:'));
    assert.dom('[data-test-submission-detail-status]').includesText('approval requested');
  }
});

