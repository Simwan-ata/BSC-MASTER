import assert from 'node:assert/strict';
import test from 'node:test';
import { createStableId } from './ids';

test('stable ID allocation avoids existing IDs and produces safe positive integers', () => {
  const existing = [1, 2, 3, 999999999];
  const first = createStableId(existing);
  const second = createStableId([...existing, first]);
  assert.ok(Number.isSafeInteger(first) && first > 0);
  assert.ok(Number.isSafeInteger(second) && second > 0);
  assert.equal(existing.includes(first), false);
  assert.notEqual(second, first);
});
