import Service from '@ember/service';
import ENV from 'pass-ember/config/environment';

/**
 * This service contains functions for interacting with Crossref and manipulating Crossref
 * data. For example, #createPublication has knowledge of the data mapping between Crossref
 * data and Publication fields.
 *
 * Sample DOI data as JSON: https://gist.github.com/jabrah/c268c6b027bd2646595e266f872c883c
 */
export default Service.extend({
  store: Ember.inject.service('store'),
  ajax: Ember.inject.service(),

  journalServiceUrl: ENV.journalService.url,

  /**
  * resolveDOI - Lookup information about a DOI. Return that information along
  * with a publication. The publication will have a journal set. The doiInfo
  * is normalized and has nlmta data added.
  *
  * @param  {string} doi
  * @returns {object}    Object with doiInfo and publication
  */
  async resolveDOI(doi) {
    let url = `${this.get('whoamiUrl')}?doi=${encodeURIComponent(doi)}`;

    return this.get('ajax').request(url, 'GET', {
      headers: {
        Accept: 'application/json; charset=utf-8',
        withCredentials: 'include'
      }
    }).then(async (response) => {
      let journal = await this.get('store').findRecord('journal', response['journal-id']);

      let doiInfo = this._processRawDoi(response.crossref.message);
      let nlmtaDump = await this.get('nlmtaService').getNlmtaFromIssn(doiInfo);

      if (nlmtaDump) {
        doiInfo.nlmta = nlmtaDump.nlmta;
        doiInfo['issn-map'] = nlmtaDump.map;
      }

      doiInfo['journal-title'] = doiInfo['container-title'];

      let publication = this.get('store').createRecord('publication', {
        doi,
        journal,
        title: doiInfo.title,
        submittedDate: doiInfo.deposited,
        creationDate: doiInfo.created,
        issue: doiInfo.issue,
        volume: doiInfo.volume,
        abstract: doiInfo.abstract,
      });

      return {
        publication,
        doiInfo
      };
    });
  },

  isValidDOI(doi) {
    // ref: https://www.crossref.org/blog/dois-and-matching-regular-expressions/
    const newDOIRegExp = /^(https?:\/\/(dx\.)?doi\.org\/)?10.\d{4,9}\/[-._;()/:A-Z0-9]+$/i;
    const ancientDOIRegExp = /^(https?:\/\/(dx\.)?doi\.org\/)?10.1002\/[^\s]+$/i;
    if (doi == null || !doi) {
      return false;
    } else if (newDOIRegExp.test(doi) === true || ancientDOIRegExp.test(doi) === true) {
      return true;
    }
    return false;
  },

  formatDOI(doi) {
    doi = doi.trim();
    doi = doi.replace(/doi:/gi, '');
    doi = doi.replace(/https?:\/\/(dx\.)?doi\.org\//gi, '');
    return doi;
  },

  /**
   * Translate data from the DOI to a metadata blob that can be attached to a submission.
   *
   * @param {object} doiInfo data retreived from the DOI
   * @param {array} validFields OPTIONAL array of accepted property names on final metadata object
   * @returns {object} metadata blob seeded with DOI data
   */
  doiToMetadata(doiInfo, validFields) {
    const doiCopy = Object.assign({}, doiInfo);
    // Massage ISSN data
    let issns = [];
    if (doiCopy['issn-map']) {
      Object.keys(doiCopy['issn-map']).forEach(issn => issns.push({
        issn,
        pubType: doiCopy['issn-map'][issn]['pub-type'][0]
      }));
    }

    // Massage 'authors' information
    // Add expected properties and copy the field from 'author' to 'authors'
    if (Array.isArray(doiCopy.author)) {
      doiCopy.authors = [];
      doiCopy.author.forEach((author) => {
        let a = {
          author: `${author.given} ${author.family}`,
          orcid: author.ORCID
        };
        doiCopy.authors.push(Object.assign(a, author));
      });
    }

    doiCopy.issns = issns;

    // Misc manual translation
    doiCopy['journal-NLMTA-ID'] = doiCopy.nlmta;
    doiCopy['journal-title-short'] = doiCopy['container-title-short'];
    doiCopy.doi = doiCopy.DOI;

    // Remove "invalid" properties if given a list of valid fields
    if (validFields && Array.isArray(validFields) && validFields.length > 0) {
      Object.keys(doiCopy).filter(key => !validFields.includes(key))
        .forEach(key => delete doiCopy[key]);
    }

    return doiCopy;
    // Manual mapping of DOI data to fields expected by our metadata forms
    // return {
    //   abstract: doiInfo.abstract,
    //   authors: doiInfo.authors,
    //   issns,
    //   'journal-NLMTA-ID': doiInfo.nlmta,
    //   doi: doiInfo.DOI,
    //   publisher: doiInfo.publisher,
    //   'journal-title-short': doiInfo['container-title-short'],
    //   'journal-title': doiInfo['journal-title'],
    //   title: doiInfo.title,
    //   issue: doiInfo.issue,
    //   volume: doiInfo.volume
    // };
  },

  getJournalTitle(doiInfo) {
    return this._maybeArrayToString('journal-title', doiInfo);
  },

  getTitle(doiInfo) {
    return this._maybeArrayToString('title', doiInfo);
  },

  /**
   * Crossref seems to like having properties set to arrays of strings, even if you expect a
   * simple string, like for 'title' or 'journal name'. Here, if you know that a certain
   * Crossref property is an array of strings, just stringify the array ...
   *
   * @param {string} prop desired property name
   * @param {object} doiInfo data from Crossref
   * @returns {string} get a stringified value from a possible array of strings
   */
  _maybeArrayToString(prop, doiInfo) {
    const val = doiInfo[prop];

    if (Array.isArray(val)) {
      return val.join(' ');
    } else if (typeof val === 'string') {
      return val.trim();
    }

    return undefined;
  },

  /**
   * Process the DOI data object by 'transforming' select arrays to string values.
   *
   * @param {object} data DOI data from Crossref in message key
   * @returns {object} return the processed DOI data
   */
  _processRawDoi(data) {
    const toProcess = ['container-title', 'short-container-title', 'title', 'original-title', 'short-title'];

    toProcess.filter(key => data.hasOwnProperty(key))
      .forEach((key) => {
        data[key] = this._maybeArrayToString(key, data);
      });

    data['journal-title'] = data['container-title'];

    return data;
  },

  /**
   * Create a new Publication object based on Crossref data OR data entered by
   * the user. This is intended to be called after getting the associated journal
   * so it can be immediately associated with the publication object before it is
   * persisted. However, this association can always be persisted later.
   *
   * @param {object} xrefData JSON blob retrieved from Crossref
   *                          or a JSON blob with user-entered data
   * @param {Journal} journal the Journal object to associate with the new Publication
   * @returns {Promise} Publication object, persisted
   */
  createPublication(data, journal) {
    let publication = this.get('store').createRecord('publication');

    publication.set('doi', data.DOI);
    publication.set('title', Array.isArray(data.title) ? data.title.join(', ') : data.title);
    // publication.set('submittedDate', data.deposited['date-time']);
    // publication.set('createdDate', data.created['date-time']);
    publication.set('issue', data.issue);
    publication.set('volume', data.volume);
    publication.set('abstract', data.abstract);

    publication.set('journal', journal);

    return publication.save().then(pub => pub);
  }
});
