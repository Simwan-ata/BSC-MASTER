import type { StrategicInitiative } from './types';

export interface EvmHistoryPoint {
  month: string;
  planned: number;
  earned: number;
  cost: number;
  projectsReported: number;
  projectsInScope: number;
}

export interface LatestEvmMetrics {
  period: string | null;
  bac: number;
  pv: number;
  ev: number;
  ac: number;
  projectsWithHistory: number;
  projectsInScope: number;
  spi: number | null;
  cpi: number | null;
  eac: number | null;
}

/** Aggregate time-phased cumulative observations. Values remain in the database's budget currency. */
export function aggregateEvmHistory(initiatives: StrategicInitiative[]): EvmHistoryPoint[] {
  const points = new Map<string, EvmHistoryPoint>();
  initiatives.forEach((initiative) => {
    const bac = initiative.budget_allocated ?? 0;
    (initiative.evm_periods ?? []).forEach((snapshot) => {
      const point = points.get(snapshot.period_key) ?? {
        month: snapshot.period_key,
        planned: 0,
        earned: 0,
        cost: 0,
        projectsReported: 0,
        projectsInScope: initiatives.length,
      };
      point.planned += bac * snapshot.planned_progress / 100;
      point.earned += bac * snapshot.actual_progress / 100;
      point.cost += snapshot.actual_cost;
      point.projectsReported += 1;
      points.set(snapshot.period_key, point);
    });
  });
  return [...points.values()].sort((a, b) => a.month.localeCompare(b.month));
}

/** Use a common latest reporting period so portfolio indices do not mix different as-of dates. */
export function calculateLatestEvmMetrics(initiatives: StrategicInitiative[]): LatestEvmMetrics {
  const periods = initiatives.flatMap((initiative) => initiative.evm_periods ?? [])
    .map((snapshot) => snapshot.period_key)
    .sort((a, b) => a.localeCompare(b));
  const period = periods.length ? periods[periods.length - 1] : null;
  const rows = initiatives.flatMap((initiative) => {
    const snapshot = (initiative.evm_periods ?? []).find((item) => item.period_key === period);
    if (!snapshot) return [];
    const bac = initiative.budget_allocated ?? 0;
    return [{
      bac,
      pv: bac * snapshot.planned_progress / 100,
      ev: bac * snapshot.actual_progress / 100,
      ac: snapshot.actual_cost,
    }];
  });
  const totals = rows.reduce((sum, row) => ({
    bac: sum.bac + row.bac,
    pv: sum.pv + row.pv,
    ev: sum.ev + row.ev,
    ac: sum.ac + row.ac,
  }), { bac: 0, pv: 0, ev: 0, ac: 0 });
  const spi = totals.pv > 0 ? totals.ev / totals.pv : null;
  const cpi = totals.ac > 0 ? totals.ev / totals.ac : null;
  return {
    period,
    ...totals,
    projectsWithHistory: rows.length,
    projectsInScope: initiatives.length,
    spi,
    cpi,
    eac: totals.ev > 0 && cpi !== null ? totals.bac / cpi : null,
  };
}
