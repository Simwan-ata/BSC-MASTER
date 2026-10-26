import assert from 'node:assert/strict';
import test from 'node:test';
import { INITIAL_DATABASE } from './initialData';
import { buildStrategicTraceabilitySummary } from './traceability';

test('traceability reports objective-to-KPI and objective-to-initiative coverage', () => {
  const db = structuredClone(INITIAL_DATABASE);
  const summary = buildStrategicTraceabilitySummary(db, 1);
  assert.equal(summary.objectiveCount, db.objectives.filter((item) => item.org_id === 1).length);
  assert.ok(summary.objectivesWithIndicators <= summary.objectiveCount);
  assert.ok(summary.objectivesWithInitiatives <= summary.objectiveCount);
});

test('analysis linkage coverage is scoped to the selected organization', () => {
  const db = structuredClone(INITIAL_DATABASE);
  db.swotItems = [
    { id: 990101, org_id: 1, type: 'strength', title: 'Linked', importance: 'high', linked_objective_id: 1 },
    { id: 990102, org_id: 1, type: 'threat', title: 'Unlinked', importance: 'medium' },
    { id: 990103, org_id: 2, type: 'opportunity', title: 'Other org', importance: 'high', linked_objective_id: 10 },
  ];
  db.swotStrategies = [];
  const summary = buildStrategicTraceabilitySummary(db, 1);
  const swot = summary.analysisRows.find((row) => row.key === 'swot');
  assert.deepEqual(swot && { total: swot.total, linked: swot.linked }, { total: 2, linked: 1 });
});
