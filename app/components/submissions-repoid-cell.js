import Component from '@glimmer/component';
import { tracked } from '@glimmer/tracking';
import { get, set } from '@ember/object';
import { inject as service } from '@ember/service';
import { A } from '@ember/array';

export default class SubmissionsRepoidCell extends Component {
  @service store;

  @tracked repoCopies = null;

  jscholarshipCheckString = '/handle/';

  constructor() {
    super(...arguments);

    const publicationId = get(this, 'args.record.publication.id');
    if (!publicationId) {
      set(this, 'repoCopies', A());
      return;
    }
    this.store.query('repositoryCopy', {
      query: {
        term: { publication: publicationId }
      },
      from: 0,
      size: 100
    }).then(rc => this.set('repoCopies', rc));
  }

  setToolTip() {
    if (document.querySelector('#manuscriptIdTooltip').length == 0) {
      (document.querySelector('.table-header:nth-child(6)')).append('<span id="manuscriptIdTooltip" tooltip-position="bottom" tooltip="ID are assigned to manuscript by target repositories."><i class="fas fa-info-circle d-inline"></i></span>');
    }
  }

  /**
   * Formatted:
   *  [
   *    {
   *      url: '',
   *      ids: [
   *        {
   *          title: 'href-worthy-id',
   *          display: 'somewhat-more-human-readable'
   *        }
   *      ]
   *    }
   *  ]
   */
  get displayIds() {
    const rc = this.repoCopies;
    if (!rc) {
      return [];
    }

    return rc.filter(repoCopy => !!repoCopy.externalIds).map((repoCopy) => {
      const check = this.jscholarshipCheckString;

      // If an ID has the 'check' string, only display the sub-string after the 'check' string
      let ids = repoCopy.externalIds.map((id) => { // eslint-disable-line
        return {
          title: id,
          display: id.includes(check) ? id.slice(id.indexOf(check) + check.length) : id
        };
      });
      return {
        url: repoCopy.accessUrl,
        ids
      };
      // Note the 'ids' notation in the above object gets translated to: ids: ids
    });
  }
}
