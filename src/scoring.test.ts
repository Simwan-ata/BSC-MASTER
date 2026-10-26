import assert from 'node:assert/strict';
import test from 'node:test';
import { buildScorecard, scoreIndicator, statusOf, wavg } from './scoring';
import type { DatabaseState, Indicator } from './types';

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

test('scorecard reports incomplete perspective coverage instead of implying full data', () => {
  const db: DatabaseState = {
    orgs: [{ id: 1, name: 'Holding', parent_id: null }],
    perspectives: [
      { id: 1, name: 'Financial', order: 1 },
      { id: 2, name: 'Customer', order: 2 },
    ],
    periods: [{ id: 1, name: 'Q1' }],
    objectives: [
      { id: 1, org_id: 1, perspective_id: 1, title: 'Revenue', weight: 1 },
      { id: 2, org_id: 1, perspective_id: 2, title: 'Customer', weight: 1 },
    ],
    indicators: [{
      id: 1, objective_id: 1, title: 'Revenue target', unit: '%', weight: 1,
      higher_is_better: true, method: 'achievement', cap: 1.2,
      yellow_limit: null, green_limit: null,
    }],
    measurements: [{ id: 1, indicator_id: 1, period_id: 1, target: 100, actual: 90 }],
    cascades: [],
    causes: [],
    initiatives: [],
    focusAreas: [],
    visions: [],
  };

  const scorecard = buildScorecard(db, 1, 1);
  assert.equal(scorecard.score, 90);
  assert.equal(scorecard.coverage, 50);
  assert.equal(scorecard.perspectives[0].coverage, 100);
  assert.equal(scorecard.perspectives[1].coverage, 0);
});
