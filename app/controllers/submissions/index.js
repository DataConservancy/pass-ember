import Controller from '@ember/controller';
import Bootstrap4Theme from 'ember-models-table/themes/bootstrap4';
import { computed } from '@ember/object';

export default Controller.extend({
  currentUser: Ember.inject.service('current-user'),
  // Bound to message dialog.
  messageShow: false,
  messageTo: '',
  messageSubject: '',
  messageText: '',

  actions: {
    authorclick(submission) {
      this.set('messageShow', true);
      this.set('messageTo', submission.get('user.displayName'));
      this.set('messageSubject', 'OAP Compliance');
      this.set('messageText', `Concerning submission ${submission.get('title')}, the status is ${submission.get('aggregatedDepositStatus')}.\nPlease check your PASS dashboard.`);
    },
  },

  // Columns displayed depend on the user role
  columns: computed('currentUser', {
    get() {
      if (this.get('currentUser.user.roles').includes('admin')) {
        return this.get('adminColumns');
      } else if (this.get('currentUser.user.roles').includes('submitter')) {
        return this.get('piColumns');
      }
      return [];
    },
  }),

  piColumns: [{
    propertyName: 'publicationTitle',
    title: 'Article',
    component: 'submissions-article-cell'
  },
  {
    title: 'Award Number (Funder)',
    propertyName: 'grantInfo',
    component: 'submissions-award-cell',
    disableSorting: true
  },
  {
    propertyName: 'repositoryNames',
    title: 'Repositories',
    component: 'submissions-repo-cell',
    disableSorting: true
  },
  {
    propertyName: 'submittedDate',
    title: 'Last Update Date',
    component: 'date-cell'
  },
  {
    propertyName: 'submittedDate',
    title: 'Submitted Date',
    component: 'date-cell'
  },
  {
    propertyName: 'aggregatedDepositStatus',
    title: 'Status',
    filterWithSelect: true,
    predefinedFilterOptions: ['In Progress', 'Complete'],
  },
  {
    propertyName: 'repoCopies',
    title: 'OAP Repo Id',
    component: 'submissions-repoid-cell',
    disableSorting: true
  },
  ],

  adminColumns: [{
    propertyName: 'publication',
    title: 'Article',
    component: 'submissions-article-cell'
  },
  {
    title: 'Award Number (Funder)',
    component: 'submissions-award-cell'
  },
  {
    propertyName: 'repositories',
    title: 'Repo',
    component: 'submissions-repo-cell'
  },
  {
    propertyName: 'submittedDate',
    title: 'Last Update Date',
    component: 'date-cell'
  },
  {
    propertyName: 'submittedDate',
    title: 'Submitted Date',
    component: 'date-cell'
  },
  {
    propertyName: 'aggregatedDepositStatus',
    title: 'Status',
    filterWithSelect: true,
    predefinedFilterOptions: ['In Progress', 'Complete'],
  },
  {
    // propertyName: 'repoCopies',
    title: 'OAP Repo Id',
    component: 'submissions-repoid-cell'
  },
  ],

  themeInstance: Bootstrap4Theme.create(),
});
