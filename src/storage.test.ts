import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DATABASE } from './initialData';
import { normalizeAndValidateDatabasePayload, validateDatabasePayload } from './storage';

test('built-in database satisfies the same validation as imported backups', () => {
  assert.equal(validateDatabasePayload(INITIAL_DATABASE), true);
});

test('database validation rejects orphaned measurements and duplicate KPI-period rows', () => {
  const orphaned = structuredClone(INITIAL_DATABASE);
  orphaned.measurements.push({
    id: 999001,
    indicator_id: 999001,
    period_id: orphaned.periods[0].id,
    target: 10,
    actual: 9,
  });
  assert.equal(validateDatabasePayload(orphaned), false);

  const duplicated = structuredClone(INITIAL_DATABASE);
  const existing = duplicated.measurements[0];
  duplicated.measurements.push({
    ...existing,
    id: Math.max(...duplicated.measurements.map((item) => item.id)) + 1,
  });
  assert.equal(validateDatabasePayload(duplicated), false);
});

test('database validation rejects organization and cascade cycles', () => {
  const orgCycle = structuredClone(INITIAL_DATABASE);
  orgCycle.orgs[0].parent_id = orgCycle.orgs[1].id;
  assert.equal(validateDatabasePayload(orgCycle), false);

  const cascadeCycle = structuredClone(INITIAL_DATABASE);
  cascadeCycle.cascades.push({
    id: Math.max(...cascadeCycle.cascades.map((item) => item.id)) + 1,
    child_id: cascadeCycle.cascades[0].parent_id,
    parent_id: cascadeCycle.cascades[0].child_id,
    weight: 1,
  });
  assert.equal(validateDatabasePayload(cascadeCycle), false);
});

test('legacy backups gain empty newer modules without seeded demo records', () => {
  const legacy = structuredClone(INITIAL_DATABASE) as unknown as Record<string, unknown>;
  delete legacy.swotItems;
  delete legacy.risks;
  const normalized = normalizeAndValidateDatabasePayload(legacy);
  assert.ok(normalized);
  assert.equal(Array.isArray(normalized.swotItems), true);
  assert.equal(normalized.swotItems?.length, 0);
  // Migration never mutates the caller's original payload.
  assert.equal('swotItems' in legacy, false);
});



test('strategy-analysis links cannot cross organization boundaries', () => {
  const crossOrgObjective = structuredClone(INITIAL_DATABASE);
  crossOrgObjective.swotStrategies = [];
  crossOrgObjective.swotItems = [{
    id: 990001,
    org_id: 2,
    type: 'strength',
    title: 'Cross-org link should be rejected',
    importance: 'high',
    linked_objective_id: 1, // Objective 1 belongs to organization 1.
  }];
  assert.equal(validateDatabasePayload(crossOrgObjective), false);

  const sameOrgObjective = structuredClone(INITIAL_DATABASE);
  sameOrgObjective.swotStrategies = [];
  sameOrgObjective.swotItems = [{
    id: 990002,
    org_id: 2,
    type: 'strength',
    title: 'Valid organization-local link',
    importance: 'high',
    linked_objective_id: 10, // Objective 10 belongs to organization 2.
  }];
  assert.equal(validateDatabasePayload(sameOrgObjective), true);
});

test('SWOT strategies cannot reference SWOT items owned by another organization', () => {
  const db = structuredClone(INITIAL_DATABASE);
  db.swotItems = [{
    id: 990011,
    org_id: 1,
    type: 'opportunity',
    title: 'Holding opportunity',
    importance: 'high',
  }];
  db.swotStrategies = [{
    id: 990012,
    org_id: 2,
    type: 'SO',
    title: 'Invalid cross-org strategy',
    description: 'Must not combine SWOT records from different organizations.',
    related_swot_ids: [990011],
  }];
  assert.equal(validateDatabasePayload(db), false);
});

test('EVM history validates periods, numeric domains, and one snapshot per initiative-period', () => {
  const valid = structuredClone(INITIAL_DATABASE);
  const initiative = valid.initiatives[0];
  initiative.evm_periods = [
    { period_key: '1405-01', planned_progress: 25, actual_progress: 20, actual_cost: 12 },
    { period_key: '1405-02', planned_progress: 50, actual_progress: 45, actual_cost: 25 },
  ];
  assert.equal(validateDatabasePayload(valid), true);

  const duplicatePeriod = structuredClone(valid);
  duplicatePeriod.initiatives[0].evm_periods?.push({
    period_key: '1405-02', planned_progress: 55, actual_progress: 45, actual_cost: 27,
  });
  assert.equal(validateDatabasePayload(duplicatePeriod), false);

  const invalidMonth = structuredClone(valid);
  invalidMonth.initiatives[0].evm_periods![0].period_key = '1405-13';
  assert.equal(validateDatabasePayload(invalidMonth), false);

  const invalidProgress = structuredClone(valid);
  invalidProgress.initiatives[0].evm_periods![0].actual_progress = 120;
  assert.equal(validateDatabasePayload(invalidProgress), false);

  const malformedSnapshot = structuredClone(valid) as unknown as { initiatives: Array<{ evm_periods?: unknown[] }> };
  malformedSnapshot.initiatives[0].evm_periods![0] = null;
  assert.doesNotThrow(() => validateDatabasePayload(malformedSnapshot));
  assert.equal(validateDatabasePayload(malformedSnapshot), false);
});
