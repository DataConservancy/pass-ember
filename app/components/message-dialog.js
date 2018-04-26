import Component from '@ember/component';

export default Component.extend({
  show: false,
  to: '',
  subject: '',
  message: '',

  actions: {
    toggleModal() {
      this.toggleProperty('show');
    },

    cancel() {
      this.set('show', false);
    },

    send() {
      this.set('show', false);
    },
  },
});
