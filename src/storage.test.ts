import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DATABASE } from './initialData';
import { deleteObjectiveCascade, normalizeAndValidateDatabasePayload, restorePreviousDatabase, saveDatabase, validateDatabasePayload } from './storage';

test('built-in database satisfies the same validation as imported backups', () => {
  assert.equal(validateDatabasePayload(INITIAL_DATABASE), true);
});

test('database validation rejects orphaned measurements and duplicate KPI-period rows', () => {
  const orphaned = structuredClone(INITIAL_DATABASE);
  orphaned.measurements.push({ id: 999001, indicator_id: 999001, period_id: orphaned.periods[0].id, target: 10, actual: 9 });
  assert.equal(validateDatabasePayload(orphaned), false);
  const duplicated = structuredClone(INITIAL_DATABASE);
  const existing = duplicated.measurements[0];
  duplicated.measurements.push({ ...existing, id: Math.max(...duplicated.measurements.map((item) => item.id)) + 1 });
  assert.equal(validateDatabasePayload(duplicated), false);
});

test('database validation rejects organization and cascade cycles', () => {
  const orgCycle = structuredClone(INITIAL_DATABASE);
  orgCycle.orgs[0].parent_id = orgCycle.orgs[1].id;
  assert.equal(validateDatabasePayload(orgCycle), false);
  const cascadeCycle = structuredClone(INITIAL_DATABASE);
  cascadeCycle.cascades.push({ id: Math.max(...cascadeCycle.cascades.map((item) => item.id)) + 1, child_id: cascadeCycle.cascades[0].parent_id, parent_id: cascadeCycle.cascades[0].child_id, weight: 1 });
  assert.equal(validateDatabasePayload(cascadeCycle), false);
});

test('legacy databases without EVM history remain valid', () => {
  const legacy = structuredClone(INITIAL_DATABASE);
  legacy.initiatives.forEach((initiative) => { delete initiative.evm_periods; });
  assert.ok(normalizeAndValidateDatabasePayload(legacy));
});

test('objective deletion removes dependent records and detaches optional strategy links', () => {
  const db = structuredClone(INITIAL_DATABASE);
  const orgId = db.orgs[0].id;
  const perspectiveId = db.perspectives[0].id;
  const objectiveId = 999900;
  const indicatorId = 999901;
  db.objectives.push({ id: objectiveId, org_id: orgId, perspective_id: perspectiveId, title: 'Cascade deletion test objective', weight: 1 });
  db.indicators.push({ id: indicatorId, objective_id: objectiveId, title: 'Test KPI', unit: '%', weight: 1, higher_is_better: true, method: 'achievement', cap: 1.2, yellow_limit: null, green_limit: null });
  db.measurements.push({ id: 999902, indicator_id: indicatorId, period_id: db.periods[0].id, target: 100, actual: 90 });
  db.causes.push({ id: 999903, from_id: objectiveId, to_id: db.objectives[0].id });
  db.cascades.push({ id: 999904, child_id: objectiveId, parent_id: db.objectives[0].id, weight: 1 });
  db.initiatives.push({ id: 999905, objective_id: objectiveId, title: 'Test initiative', owner: 'QA', due_date: '2026-12-31', progress: 0, status: 'on_track' });
  if (db.swotItems?.[0]) db.swotItems[0].linked_objective_id = objectiveId;
  if (db.swotStrategies?.[0]) db.swotStrategies[0].linked_objective_id = objectiveId;
  if (db.risks?.[0]) db.risks[0].linked_objective_id = objectiveId;
  if (db.pestelItems?.[0]) db.pestelItems[0].linkedObjectiveId = objectiveId;
  if (db.porterItems?.[0]) db.porterItems[0].linkedObjectiveId = objectiveId;
  if (db.vrioItems?.[0]) db.vrioItems[0].linkedObjectiveId = objectiveId;

  const next = deleteObjectiveCascade(db, objectiveId);
  assert.equal(next.objectives.some((item) => item.id === objectiveId), false);
  assert.equal(next.indicators.some((item) => item.objective_id === objectiveId), false);
  assert.equal(next.measurements.some((item) => item.indicator_id === indicatorId), false);
  assert.equal(next.causes.some((item) => item.from_id === objectiveId || item.to_id === objectiveId), false);
  assert.equal(next.cascades.some((item) => item.child_id === objectiveId || item.parent_id === objectiveId), false);
  assert.equal(next.initiatives.some((item) => item.objective_id === objectiveId), false);
  assert.equal(next.swotItems?.some((item) => item.linked_objective_id === objectiveId), false);
  assert.equal(next.swotStrategies?.some((item) => item.linked_objective_id === objectiveId), false);
  assert.equal(next.risks?.some((item) => item.linked_objective_id === objectiveId), false);
  assert.equal(next.pestelItems?.some((item) => item.linkedObjectiveId === objectiveId), false);
  assert.equal(next.porterItems?.some((item) => item.linkedObjectiveId === objectiveId), false);
  assert.equal(next.vrioItems?.some((item) => item.linkedObjectiveId === objectiveId), false);
  assert.equal(validateDatabasePayload(next), true);
});

test('successful saves retain a recoverable previous database snapshot', () => {
  const originalDescriptor = Object.getOwnPropertyDescriptor(globalThis, 'localStorage');
  const values = new Map<string, string>();
  const fakeStorage = {
    get length() { return values.size; },
    clear() { values.clear(); },
    getItem(key: string) { return values.get(key) ?? null; },
    key(index: number) { return [...values.keys()][index] ?? null; },
    removeItem(key: string) { values.delete(key); },
    setItem(key: string, value: string) { values.set(String(key), String(value)); },
  } as Storage;
  Object.defineProperty(globalThis, 'localStorage', { configurable: true, value: fakeStorage });
  try {
    const first = structuredClone(INITIAL_DATABASE);
    const second = structuredClone(INITIAL_DATABASE);
    second.orgs[0].name = 'Changed holding name';
    assert.equal(saveDatabase(first), true);
    assert.equal(saveDatabase(second), true);
    assert.equal(JSON.parse(fakeStorage.getItem('bsc_master_db_v1') || '{}').orgs[0].name, 'Changed holding name');
    const restored = restorePreviousDatabase();
    assert.equal(restored?.orgs[0].name, first.orgs[0].name);
    assert.equal(JSON.parse(fakeStorage.getItem('bsc_master_db_v1') || '{}').orgs[0].name, first.orgs[0].name);
  } finally {
    if (originalDescriptor) Object.defineProperty(globalThis, 'localStorage', originalDescriptor);
    else Reflect.deleteProperty(globalThis, 'localStorage');
  }
});
