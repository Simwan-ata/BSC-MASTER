import assert from 'node:assert/strict';
import test from 'node:test';
import { scoreIndicator, statusOf, wavg } from './scoring';
import type { Indicator } from './types';

function indicator(overrides: Partial<Indicator> = {}): Indicator {
  return {
    id: 1,
    objective_id: 1,
    title: 'Test KPI',
    unit: '%',
    weight: 1,
    higher_is_better: true,
    method: 'achievement',
    cap: 1.2,
    yellow_limit: null,
    green_limit: null,
    ...overrides,
  };
}

test('achievement score respects target and cap', () => {
  assert.deepEqual(scoreIndicator(indicator(), 100, 110), [110, 'green']);
  assert.deepEqual(scoreIndicator(indicator(), 100, 200), [120, 'green']);
});

test('lower-is-better treats actual zero as the best attainable score', () => {
  assert.deepEqual(
    scoreIndicator(indicator({ higher_is_better: false }), 20, 0),
    [120, 'green'],
  );
});

test('missing, zero targets and non-finite measurements do not produce scores', () => {
  assert.deepEqual(scoreIndicator(indicator(), null, 20), [null, null]);
  assert.deepEqual(scoreIndicator(indicator(), 0, 20), [null, null]);
  assert.deepEqual(scoreIndicator(indicator(), 100, Number.NaN), [null, null]);
  assert.deepEqual(scoreIndicator(indicator(), 100, Number.POSITIVE_INFINITY), [null, null]);
});

test('threshold mode rejects inverted thresholds for the selected direction', () => {
  assert.deepEqual(
    scoreIndicator(indicator({ method: 'threshold', yellow_limit: 90, green_limit: 80 }), null, 95),
    [null, null],
  );
  assert.deepEqual(
    scoreIndicator(indicator({
      method: 'threshold',
      higher_is_better: false,
      yellow_limit: 20,
      green_limit: 10,
    }), null, 15),
    [70, 'yellow'],
  );
});

test('weighted average ignores missing scores and invalid weights', () => {
  assert.equal(wavg([[null, 5], [80, 3], [100, 1]]), 85);
  assert.equal(wavg([[100, 0], [80, -1], [null, 2]]), null);
  assert.equal(wavg([[Number.NaN, 1], [80, Number.POSITIVE_INFINITY]]), null);
});

test('status bands handle invalid values deterministically', () => {
  assert.equal(statusOf(90), 'green');
  assert.equal(statusOf(70), 'yellow');
  assert.equal(statusOf(69.9), 'red');
  assert.equal(statusOf(Number.NaN), null);
  assert.equal(statusOf(Number.POSITIVE_INFINITY), null);
});
