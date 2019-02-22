import { module, test } from 'qunit';
import { setupTest } from 'ember-qunit';

module('Unit | Controller | submissions/new/metadata', (hooks) => {
  setupTest(hooks);

  // Replace this with your real tests.
  test('it exists', function (assert) {
    let controller = this.owner.lookup('controller:submissions/new/metadata');
    assert.ok(controller);
  });

  test('loadPrevious triggers transition', function (assert) {
    let controller = this.owner.lookup('controller:submissions/new/metadata');
    let loadTabAccessed = false;
    controller.transitionToRoute = function (route) {
      loadTabAccessed = true;
      assert.equal('submissions.new.repositories', route);
    };
    controller.send('loadPrevious');
    assert.equal(loadTabAccessed, true);
  });

  test('loadNext triggers transition', function (assert) {
    let controller = this.owner.lookup('controller:submissions/new/metadata');
    let loadTabAccessed = false;
    controller.transitionToRoute = function (route) {
      loadTabAccessed = true;
      assert.equal('submissions.new.files', route);
    };
    controller.send('loadNext');
    assert.equal(loadTabAccessed, true);
  });
});
