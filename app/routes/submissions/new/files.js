
import { action } from '@ember/object';
import { inject as service } from '@ember/service';
import CheckSessionRoute from '../../check-session-route';


export default class FilesRoute extends CheckSessionRoute {
  @service('workflow')
  workflow;

  @action
  didTransition() {
    this.workflow.setCurrentStep(6);
  }
}
