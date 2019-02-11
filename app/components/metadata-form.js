// import Component from '@ember/component';
import Ember from 'ember';
import _ from 'lodash';

export default Ember.Component.extend({
  didRender() {
    this._super(...arguments);
    const that = this;
    const originalForm = this.get('schema');
    const newForm = JSON.parse(JSON.stringify(originalForm));
    if (!originalForm.options) {
      newForm.options = {};
    }
    // Populate form with data if there is any to populate with.
    if (!(this.get('submission.metadata'))) {
      this.set('submission.metadata', '[]');
    }
    let metadata = JSON.parse(this.get('submission.metadata'));
    if (newForm.id) {
      let shouldFuzzyMatch = true;


      if (newForm.id === 'JScholarship') {
        shouldFuzzyMatch = true;
        let commonMetadata = metadata.filter(md => md.id === 'common')[0];
        if (commonMetadata) {
          // if there is no data with common Metadata data set up structure
          if (!newForm.data) {
            newForm.data = {};
            newForm.data.authors = [];
          }
          // if commonMetadata Metadata authors array is grater then 0 set to JScholarship authors
          if (commonMetadata.data.authors.length > 0) {
            newForm.data.authors = commonMetadata.data.authors;
          }
        }
      } else if (newForm.id === 'common') {
        shouldFuzzyMatch = true;
        let JScholarshipMetadata = metadata.filter(md => md.id === 'JScholarship')[0];
        if (JScholarshipMetadata) {
          // if there is no data with JScholarship Metadata data set up structure
          if (!newForm.data) {
            newForm.data = {};
            newForm.data.authors = [];
          }
          // if JScholarship Metadata authors array is grater then 0 set to common authors
          if (JScholarshipMetadata.data.authors && JScholarshipMetadata.data.authors.length > 0) {
            newForm.data.authors = JScholarshipMetadata.data.authors;
          }
        }
      }

      // Check if metadata exists already
      metadata.forEach((data) => {
        if (data.id == newForm.id) {
          shouldFuzzyMatch = false;
          newForm.data = _.merge(newForm.data, data.data);
        }
      });


      const doiInfo = this.get('doiInfo');
      if (shouldFuzzyMatch && Object.keys(doiInfo).length > 0) {
        const prePopulateData = {};
        //  Try to match the doiInfo to the form schema data to populate
        Promise.resolve(originalForm.schema).then((schema) => {
          try {
            // Fuzzy Match here
            const f = fuzzySet(Object.keys(schema.properties));
            for (const doiEntry in doiInfo) {
              // Validate and check any doi data to make sure its close to the right field
              if (f.get(doiEntry) !== null) {
                try {
                  doiInfo[doiEntry] = doiInfo[doiEntry].replace(/(<([^>]+)>)/ig, '');
                } catch (e) {} // eslint-disable-line no-empty
                console.log(doiEntry);
                if (doiEntry == 'author') {
                  doiInfo[doiEntry].forEach((author, index) => {
                    const name = `${doiInfo[doiEntry][index].given} ${doiInfo[doiEntry][index].family}`;
                    const orcid = doiInfo[doiEntry][index].ORCID;

                    if (!prePopulateData[f.get(doiEntry)[0][1]]) {
                      prePopulateData[f.get(doiEntry)[0][1]] = [];
                    }
                    prePopulateData[f.get(doiEntry)[0][1]].push({ author: name, orcid });
                  });
                } else if (doiInfo[doiEntry].length > 0) {
                  // Predicts data with .61 accuracy
                  if (f.get(doiEntry)[0][0] > 0.61) {
                    // set the found record to the metadata
                    // due to short title you have to call this
                    if (doiEntry === 'title') {
                      prePopulateData.title = doiInfo.title;
                    } else if (!(doiEntry === 'container-title-short') && !(doiEntry === 'title') && !(doiEntry === 'subtitle')) {
                      prePopulateData[f.get(doiEntry)[0][1]] = doiInfo[doiEntry];
                    }
                  }
                }
              }
            }
            if (this.get('schema').id === 'JScholarship') {
              prePopulateData.embargo = this.get('schema').schema.properties.embargo.default;
            }

            // set any data to the forms
            newForm.data = prePopulateData;
            metadata[newForm.id] = ({
              id: newForm.id,
              data: prePopulateData,
            });
            this.set('submission.metadata', JSON.stringify(metadata));
          } catch (e) { console.log(e); }
        });
      }
    }

    // Validate common page
    let isValidated = true;
    if (newForm.options.fields['Embargo-end-date']) {
      newForm.options.fields['Embargo-end-date'].validator = function (callback) {
        var value = this.getValue();
        var underEmbargo = this.getParent().childrenByPropertyId['under-embargo'].getValue();
        if (underEmbargo && !value) {
          toastr.warning('The embargo end date must not be left blank');
          isValidated = false;
          callback({
            status: false,
            message: 'This field is required'
          });
          return;
        }
        $('input[name=Embargo-end-date]').css('border-color', '#c2cfd6');
        $('.alpaca-form-button-Next').css('opacity', '1');
        isValidated = true;
        callback({
          status: true
        });
      };
    }

    if (newForm.options.fields['under-embargo']) {
      newForm.options.fields['under-embargo'].validator = function (callback) {
        var underEmbargo = this.getParent().childrenByPropertyId['under-embargo'].getValue();
        var EmbargoEndDate = this.getParent().childrenByPropertyId['Embargo-end-date'].getValue();

        if (underEmbargo && !EmbargoEndDate) {
          isValidated = false;
          $('input[name=Embargo-end-date]').css('border-color', '#f86c6b');
          $('.alpaca-form-button-Next').css('opacity', '0.65');
          return;
        }
        $('input[name=Embargo-end-date]').css('border-color', '#c2cfd6');
        $('.alpaca-form-button-Next').css('opacity', '1');
        isValidated = true;
      };
    }
    // form ctrls
    newForm.options.form = {
      buttons: {
        Next: {
          label: 'Next',
          styles: 'pull-right btn btn-primary next',
          click() {
            if (isValidated) {
              const value = this.getValue();
              // concat auther + family together
              // value.author = `${value.author} ${value.family}`;
              // delete value.family;
              const formId = newForm.id;
              // Check for authors fields that are blank and remove them
              if (formId === 'common' || formId === 'JScholarship') {
                let trimmedAuthors = value.authors.filter(author => author.author);
                value.authors = trimmedAuthors;
              }

              metadata.push({
                id: formId,
                data: value,
              });
              // remove any duplicates
              let uniqIds = {},
                source = metadata;
              // eslint-disable-next-line no-return-assign
              let filtered = source.reverse().filter(obj => !uniqIds[obj.id] && (uniqIds[obj.id] = true));

              that.set('submission.metadata', JSON.stringify(filtered));
              that.nextForm();
            }
          },
        },
        Back: {
          title: 'Back',
          styles: 'pull-left btn btn-outline-primary',
          click() {
            if (isValidated) {
              const value = this.getValue();
              // concat auther + family together
              // value.author = `${value.author} ${value.family}`;
              // delete value.family;
              const formId = newForm.id;
              // Check for authors fields that are blank and remove them
              if (formId === 'common' || formId === 'JScholarship') {
                let trimmedAuthors = value.authors.filter(author => author.author);
                value.authors = trimmedAuthors;
              }

              metadata.push({
                id: formId,
                data: value,
              });
              // remove any duplicates
              let uniqIds = {},
                source = metadata;
              // eslint-disable-next-line no-return-assign
              let filtered = source.reverse().filter(obj => !uniqIds[obj.id] && (uniqIds[obj.id] = true));

              that.set('submission.metadata', JSON.stringify(filtered));
              that.previousForm();
            }
          },
        },
      },
    };

    // set readonly fields
    for (const doiEntry in this.get('doiInfo')) {
      // Validate and check any doi data to make sure its close to the right field
      try {
        this.get('doiInfo')[doiEntry] = this.get('doiInfo')[doiEntry].replace(/(<([^>]+)>)/ig, '');
        if (doiEntry == 'author') {
          newForm.schema.properties.authors.readonly = true;
          newForm.options.fields.authors.hidden = false;
        } else if (this.get('doiInfo')[doiEntry].length > 0) {
          if (!(doiEntry === 'container-title-short')) {
            newForm.schema.properties[doiEntry].readonly = true;
            newForm.options.fields[doiEntry].hidden = false;
          }
        }
        // if NO DOI is present show authors
        if (!this.get('doiInfo').DOI) {
          newForm.schema.properties.authors.readonly = false;
          newForm.options.fields.authors.hidden = false;
        }
      } catch (e) {} // eslint-disable-line no-empty
      if (newForm.id === 'JScholarship') {
        // if (this.get('doiInfo').author.length > 0) {
        let common = metadata.filter(md => md.id === 'common')[0];
        if (common.data.authors.length > 0) {
          newForm.schema.properties.authors.readonly = true;
          newForm.options.fields.authors.hidden = false;
        }
        // }
      }
    }
    let currentUser = this.get('currentUser.user');
    let hasAgreementText = false;

    try {
      this.get('submission.repositories').filter(repo => repo.get('name') === newForm.id)[0].get('agreementText');
      hasAgreementText = true;
    } catch (e) {} // eslint-disable-line
    if (hasAgreementText) {
      // if the current user is not the preparer
      if (!this.get('submission.preparers').map(x => x.id).includes(currentUser.get('id'))) {
        // add agreement to schema
        newForm.options.fields.embargo = {
          type: 'textarea',
          label: 'Deposit Agreement',
          disabled: true,
          rows: '16',
          hidden: false,
        };
        newForm.options.fields['agreement-to-deposit'] = {
          type: 'checkbox',
          rightLabel: 'I agree to the above statement on today\'s date',
          fieldClass: 'col-12 text-right p-0',
          hidden: false,
        };

        newForm.schema.properties.embargo = {
          type: 'string',
          default: this.get('submission.repositories').filter(repo => repo.get('name') === newForm.id)[0].get('agreementText'),
        };
        newForm.schema.properties['agreement-to-deposit'] = {
          type: 'string'
        };
      }
    }
    $(document).ready(() => {
      $('#schemaForm').empty();
      $('#schemaForm').alpaca(newForm);
    });
  }
});
