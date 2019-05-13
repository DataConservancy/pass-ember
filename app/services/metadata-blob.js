import Service from '@ember/service';
import _ from 'lodash';

/**
 * Service for manipulating a submission metadata blob.
 */
export default Service.extend({

  /**
   * Merge data from metadata blob2 into metadata blob1 and output the result as a new
   * object (this operation will not mutate either input objects). Broken out here in
   * case special logic needs to be assigned.
   *
   * Impl note: each blob now has a default value set of an empty object because
   * Object.assign will die if any arguments is undefined
   *
   * @param {object} blob1 arbitrary JSON object representing metadata for a submission
   * @param {object} blob2 arbitrary JSON object representing metadata for a submission
   */
  mergeBlobs(blob1 = {}, blob2 = {}) {
    let blob = Object.assign(blob1, blob2);
    Object.keys(blob).filter(key => !blob[key]).forEach(key => delete blob[key]);
    return blob;
  },

  /**
   * Get a metadata blob containing information about repository agreements. The resulting
   * object can be merged into the larger metadata blob with #mergeBlobs.
   *
   * @param {object} repositories list of Repository model objects
   * @returns {
   *    'agreements': [
   *      {
   *        Repository.name: Repository.agreementText
   *      }
   *    ]
   * }
   */
  getAgreementsBlob(repositories) {
    const result = [];

    repositories.filter(repo => repo.get('agreementText')).forEach(repo => result.push({
      [repo.get('name')]: repo.get('agreementText')
    }));

    return {
      agreements: result
    };
  },

  /**
   * Transform a given metadata object into another object with keys/values suitable for dislplay
   * to a user in the UI.
   *
   * @param {object} metadataBlob arbitrary JSON object representing the metadata for a submission
   */
  getDisplayBlob(metadataBlob) {
    let metadataBlobNoKeys = [];
    JSON.parse(metadataBlob).forEach((ele) => {
      for (var key in ele.data) {
        if (ele.data.hasOwnProperty(key)) {
          let strippedData;
          strippedData = ele.data[key];

          if (key === 'authors') {
            if (Array.isArray(strippedData) && strippedData.length > 0) {
              if (metadataBlobNoKeys['author(s)']) {
                metadataBlobNoKeys['author(s)'] = _.uniqBy(metadataBlobNoKeys['author(s)'], 'author');
              } else {
                metadataBlobNoKeys['author(s)'] = strippedData;
              }
            }
          } else if (key === 'container-title') {
            metadataBlobNoKeys['journal-title'] = strippedData;
          } else {
            metadataBlobNoKeys[key] = strippedData;
          }
        }
      }
    });
    // capitalize all keys in metadata blob and remove the old lowercased one
    for (var key in metadataBlobNoKeys) {
      if (metadataBlobNoKeys.hasOwnProperty(key)) {
        // three use cases for upper case
        if (key === 'nlmta' || key === 'doi' || key === 'ISSN') {
          metadataBlobNoKeys[_.upperCase(key)] = metadataBlobNoKeys[key];
        } else {
          metadataBlobNoKeys[_.capitalize(key)] = metadataBlobNoKeys[key];
        }
        if (key !== 'ISSN') {
          delete metadataBlobNoKeys[key];
        }
      }
    }
    return metadataBlobNoKeys;
  }
});

