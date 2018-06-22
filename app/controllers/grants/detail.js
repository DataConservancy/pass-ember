import Controller from '@ember/controller';
import { inject as service } from '@ember/service';
import Bootstrap4Theme from 'ember-models-table/themes/bootstrap4';
import { computed } from '@ember/object';

export default Controller.extend({
  currentUser: Ember.inject.service('current-user'),

  // Columns displayed depend on the user role
  columns: computed('currentUser', {
    get() {
      return [{
      propertyName: 'publicationTitle',
      className: 'title-column',
      title: 'Article',
      component: 'submissions-article-cell'
    },
    {
      title: 'Award Number (Funder)',
      propertyName: 'grantInfo',
      className: 'awardnum-funder-column',
      component: 'submissions-award-cell',
      disableSorting: true
    },
    {
      propertyName: 'repositoryNames',
      title: 'Repositories',
      component: 'submissions-repo-cell',
      className: 'repositories-column',
      disableSorting: true
    },
    {
      propertyName: 'submittedDate',
      title: 'Submitted Date',
      className: 'date-column',
      component: 'date-cell'
    },
    {
      propertyName: 'aggregatedDepositStatus',
      title: 'Status',
      component: 'submission-status-cell',
      repoCopiesMap: this.get('model.repoCopiesMap'),
      depositsMap: this.get('model.depositsMap')
    },
    {
      propertyName: 'repoCopies',
      className: 'msid-column',
      title: 'Manuscript IDs',
      component: 'submissions-repoid-cell',
      disableSorting: true
    },
    {
      title: 'Actions',
      className: 'actions-column',
      component: 'submission-action-cell'
    }]
  }}),

  themeInstance: Bootstrap4Theme.create(),
});
