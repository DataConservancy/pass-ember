import { moduleForModel, test } from 'ember-qunit';

moduleForModel('repo-copy', 'Unit | Model | repo copy', {
  // Specify the other units that are required for this test.
  needs: ['model:publication', 'model:repository']
});

test('it exists', function (assert) {
  let model = this.subject();
  // let store = this.store();
  assert.ok(!!model);
});
