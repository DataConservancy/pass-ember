import { moduleFor, test } from 'ember-qunit';

moduleFor('route:submissions/new', 'Unit | Route | submissions/new', {
  // Specify the other units that are required for this test.
  needs: ['service:currentUser']
});

test('it exists', function (assert) {
  let route = this.subject();
  assert.ok(route);
});
