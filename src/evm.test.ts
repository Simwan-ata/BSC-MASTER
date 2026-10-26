import { describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { aggregateEvmHistory, calculateLatestEvmMetrics } from './evm';
import type { StrategicInitiative } from './types';

const initiatives: StrategicInitiative[] = [
  {
    id: 1, objective_id: 1, title: 'Project A', owner: 'A', due_date: '1405/09/30',
    budget_allocated: 100, progress: 40, status: 'on_track',
    evm_periods: [
      { period_key: '1405-01', planned_progress: 20, actual_progress: 10, actual_cost: 15 },
      { period_key: '1405-02', planned_progress: 50, actual_progress: 40, actual_cost: 45 },
    ],
  },
  {
    id: 2, objective_id: 1, title: 'Project B', owner: 'B', due_date: '1405/09/30',
    budget_allocated: 200, progress: 30, status: 'behind',
    evm_periods: [
      { period_key: '1405-01', planned_progress: 25, actual_progress: 20, actual_cost: 35 },
      { period_key: '1405-02', planned_progress: 40, actual_progress: 30, actual_cost: 55 },
    ],
  },
];

describe('time-phased EVM', () => {
  it('aggregates cumulative PV, EV and AC by reporting period', () => {
    const history = aggregateEvmHistory(initiatives);
    assert.equal(history.length, 2);
    assert.deepEqual(history[1], {
      month: '1405-02', planned: 130, earned: 100, cost: 100,
      projectsReported: 2, projectsInScope: 2,
    });
  });

  it('calculates indices from a common latest period', () => {
    const result = calculateLatestEvmMetrics(initiatives);
    assert.equal(result.period, '1405-02');
    assert.equal(result.bac, 300);
    assert.equal(result.pv, 130);
    assert.equal(result.ev, 100);
    assert.equal(result.ac, 100);
    assert.equal(result.spi, 100 / 130);
    assert.equal(result.cpi, 1);
    assert.equal(result.eac, 300);
  });

  it('does not fabricate indices or EAC when history or denominators are missing', () => {
    const noHistory = calculateLatestEvmMetrics([{
      id: 3, objective_id: 1, title: 'No history', owner: 'C',
      due_date: '1405/09/30', budget_allocated: 80, progress: 0, status: 'on_track',
    }]);
    assert.equal(noHistory.period, null);
    assert.equal(noHistory.spi, null);
    assert.equal(noHistory.cpi, null);
    assert.equal(noHistory.eac, null);
  });

  it('reports scope coverage when projects have no observation in the latest period', () => {
    const partial = calculateLatestEvmMetrics([
      ...initiatives,
      { id: 3, objective_id: 1, title: 'No history', owner: 'C', due_date: '1405/09/30', budget_allocated: 50, progress: 0, status: 'on_track' },
    ]);
    assert.equal(partial.projectsWithHistory, 2);
    assert.equal(partial.projectsInScope, 3);
  });
});
