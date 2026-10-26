import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DATABASE } from './initialData';
import { validateDatabasePayload } from './storage';

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
  assert.equal(validateDatabasePayload(legacy), true);
  // Validation accepts the normalized copy; the original object remains untouched.
  assert.equal('swotItems' in legacy, false);
});

test('diagnostic: identify which optional module makes seed data invalid', () => {
  const keys = [
    'cascades','causes','initiatives','focusAreas','visions','swotItems','swotStrategies',
    'bcgItems','megaTrends','weakSignals','wildCards','horizonInitiatives','uncertainties',
    'scenarios','risks','pestelItems','porterItems','vrioItems','spaceFactors',
  ];
  console.log('seed valid:', validateDatabasePayload(INITIAL_DATABASE));
  for (const key of keys) {
    const candidate = structuredClone(INITIAL_DATABASE) as unknown as Record<string, unknown>;
    candidate[key] = [];
    console.log('empty module', key, validateDatabasePayload(candidate));
  }
});
