import type { DatabaseState } from './types';

export interface TraceabilityRow {
  key: string;
  label: string;
  total: number;
  linked: number;
}

export interface StrategicTraceabilitySummary {
  objectiveCount: number;
  objectivesWithIndicators: number;
  objectivesWithInitiatives: number;
  analysisRows: TraceabilityRow[];
}

/**
 * Measures whether strategic-analysis records and execution objects are linked
 * to the selected organization's objectives. This is a diagnostic, not a score.
 */
export function buildStrategicTraceabilitySummary(
  db: DatabaseState,
  orgId: number,
): StrategicTraceabilitySummary {
  const objectives = db.objectives.filter((objective) => objective.org_id === orgId);
  const objectiveIds = new Set(objectives.map((objective) => objective.id));
  const indicatorObjectiveIds = new Set(
    db.indicators
      .filter((indicator) => objectiveIds.has(indicator.objective_id))
      .map((indicator) => indicator.objective_id),
  );
  const initiativeObjectiveIds = new Set(
    db.initiatives
      .filter((initiative) => objectiveIds.has(initiative.objective_id))
      .map((initiative) => initiative.objective_id),
  );

  const linkedCount = (
    items: Array<{ org_id: number; linked_objective_id?: number; linkedObjectiveId?: number }> | undefined,
    field: 'linked_objective_id' | 'linkedObjectiveId',
  ) => {
    const scoped = (items ?? []).filter((item) => item.org_id === orgId);
    return {
      total: scoped.length,
      linked: scoped.filter((item) => {
        const objectiveId = field === 'linked_objective_id'
          ? item.linked_objective_id
          : item.linkedObjectiveId;
        return objectiveId !== undefined && objectiveIds.has(objectiveId);
      }).length,
    };
  };

  const swot = linkedCount(db.swotItems, 'linked_objective_id');
  const swotStrategies = linkedCount(db.swotStrategies, 'linked_objective_id');
  const risks = linkedCount(db.risks, 'linked_objective_id');
  const pestel = linkedCount(db.pestelItems, 'linkedObjectiveId');
  const porter = linkedCount(db.porterItems, 'linkedObjectiveId');
  const vrio = linkedCount(db.vrioItems, 'linkedObjectiveId');

  return {
    objectiveCount: objectives.length,
    objectivesWithIndicators: indicatorObjectiveIds.size,
    objectivesWithInitiatives: initiativeObjectiveIds.size,
    analysisRows: [
      { key: 'swot', label: 'تحلیل SWOT', ...swot },
      { key: 'swot-strategies', label: 'راهبردهای حاصل از SWOT', ...swotStrategies },
      { key: 'risks', label: 'ریسک‌ها', ...risks },
      { key: 'pestel', label: 'تحلیل PESTEL', ...pestel },
      { key: 'porter', label: 'پنج نیروی پورتر', ...porter },
      { key: 'vrio', label: 'تحلیل VRIO', ...vrio },
    ],
  };
}
