import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { get } from '@ember/object';
import { inject as service } from '@ember/service';
import { task } from 'ember-concurrency-decorators';

export default class WorkflowBasicsUserSearch extends Component {
  @service store;
  @service currentUser;

  @tracked matchingUsers = [];
  @tracked currentPage = 1;
  @tracked usersPerPage = 30;
  @tracked numberOfMatches = 0;

  get numberOfPages() {
    return Math.ceil(this.numberOfMatches / this.usersPerPage);
  }

  get pageNumbers() {
    let arr = [];
    for (let i = 1; i <= this.numberOfPages; i += 1) {
      arr.push(i);
    }
    return arr;
  }

  get moreThanOnePage() {
    return this.numberOfPages ? (this.numberOfPages > 1) : false;
  }

  get filteredUsers() {
    let users = this.matchingUsers;
    return users.filter(u => u.id !== get(this, 'currentUser.user.id'));
  }

  constructor() {
    super(...arguments);

    if (this.args.searchInput) {
      this.searchForUsers.perform(1);
    }
  }

  @task
  searchForUsers = function* (page) {
    if (page === 0 || page === null || page === undefined || !page) {
      page = 1;
    }
    this.currentPage = page;
    const size = this.usersPerPage;
    let info = {};
    let input = this.args.searchInput;
    let users = yield this.store.query('user', {
      query: {
        bool: {
          filter: {
            exists: { field: 'email' }
          },
          should: {
            multi_match: { query: input, fields: ['firstName', 'middleName', 'lastName', 'email', 'displayName'] }
          },
          minimum_should_match: 1
        }
      },
      from: (page - 1) * size,
      size,
      info
    });

    this.matchingUsers = users;
    if (info.total !== null) this.numberOfMatches = info.total;
  }
}
