import {
  DatabaseState, Indicator, ScorecardResult, ScoredIndicator, ScoredObjective,
  ScoredPerspective, StatusType,
} from './types';

export function statusOf(score: number | null): StatusType {
  if (score === null || !Number.isFinite(score)) return null;
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

export const STATUS_LABELS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'مطلوب (سبز)', yellow: 'هشدار (زرد)', red: 'بحرانی (قرمز)',
};

export function toFa(num: number | string | null | undefined, digits = 1): string {
  if (num === null || num === undefined) return '—';
  const parsed = typeof num === 'string' && num.trim() !== '' ? Number(num) : num;
  if (typeof parsed !== 'number' || !Number.isFinite(parsed)) return '—';
  return parsed.toLocaleString('fa-IR', { maximumFractionDigits: digits, minimumFractionDigits: 0 });
}

export function toFaInt(num: number | null | undefined): string {
  if (num === null || num === undefined || !Number.isFinite(num)) return '—';
  return Math.round(num).toLocaleString('fa-IR');
}

/** Invalid measurements/configuration return null instead of a misleading score. */
export function scoreIndicator(
  indicator: Indicator, target: number | null, actual: number | null
): [number | null, StatusType] {
  if (actual === null || actual === undefined || !Number.isFinite(actual)) return [null, null];

  if (indicator.method === 'threshold') {
    const y = indicator.yellow_limit;
    const g = indicator.green_limit;
    if (y === null || g === null || !Number.isFinite(y) || !Number.isFinite(g)) return [null, null];
    if (indicator.higher_is_better ? g <= y : g >= y) return [null, null];

    const status: 'green' | 'yellow' | 'red' = indicator.higher_is_better
      ? actual >= g ? 'green' : actual >= y ? 'yellow' : 'red'
      : actual <= g ? 'green' : actual <= y ? 'yellow' : 'red';
    return [{ green: 100, yellow: 70, red: 30 }[status], status];
  }

  if (target === null || target === undefined || !Number.isFinite(target) || target <= 0) return [null, null];
  // Ratio achievement is defined for non-negative measurements and a positive target.
  // Indicators whose legitimate domain includes negative values should use explicit
  // threshold limits until a dedicated domain formula is configured.
  if (actual < 0) return [null, null];
  const cap = Number.isFinite(indicator.cap) && indicator.cap > 0 ? indicator.cap : 1.2;
  // A zero actual value is the best possible result for a lower-is-better indicator.
  const ratio = indicator.higher_is_better ? actual / target : actual === 0 ? cap : target / actual;
  if (!Number.isFinite(ratio) || ratio < 0) return [null, null];
  const rounded = Math.round(Math.max(0, Math.min(ratio, cap)) * 1000) / 10;
  return [rounded, statusOf(rounded)];
}

/** Weighted average of valid scores; invalid, negative, and zero weights are ignored. */
export function wavg(pairs: [number | null, number][]): number | null {
  const valid = pairs.filter((p): p is [number, number] =>
    p[0] !== null && Number.isFinite(p[0]) && Number.isFinite(p[1]) && p[1] > 0
  );
  const totalWeight = valid.reduce((sum, item) => sum + item[1], 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return null;
  const weightedSum = valid.reduce((sum, item) => sum + item[0] * item[1], 0);
  if (!Number.isFinite(weightedSum)) return null;
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/** Percentage of configured positive weight backed by a valid score. */
function coverageOf(pairs: [number | null, number][]): number | null {
  const configured = pairs.filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const totalWeight = configured.reduce((sum, [, weight]) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return null;
  const scoredWeight = configured.reduce(
    (sum, [score, weight]) => sum + (score !== null && Number.isFinite(score) ? weight : 0),
    0,
  );
  return Math.round((scoredWeight / totalWeight) * 1000) / 10;
}

/** Weighted mean of child coverage percentages; missing child coverage counts as zero. */
function weightedCoveragePercent(pairs: [number | null, number][]): number | null {
  const configured = pairs.filter(([, weight]) => Number.isFinite(weight) && weight > 0);
  const totalWeight = configured.reduce((sum, [, weight]) => sum + weight, 0);
  if (!Number.isFinite(totalWeight) || totalWeight <= 0) return null;
  const weightedCoverage = configured.reduce(
    (sum, [coverage, weight]) => sum + (coverage !== null && Number.isFinite(coverage) ? Math.max(0, Math.min(coverage, 100)) : 0) * weight,
    0,
  );
  return Math.round((weightedCoverage / totalWeight) * 10) / 10;
}

export function calculateObjectiveOwnScore(objectiveId: number, db: DatabaseState, periodId: number): number | null {
  const indicators = db.indicators.filter((indicator) => indicator.objective_id === objectiveId);
  const pairs: [number | null, number][] = indicators.map((indicator) => {
    const measurement = db.measurements.find((item) => item.indicator_id === indicator.id && item.period_id === periodId);
    const [score] = scoreIndicator(indicator, measurement?.target ?? null, measurement?.actual ?? null);
    return [score, indicator.weight];
  });
  return wavg(pairs);
}

export function buildScorecard(db: DatabaseState, orgId: number, periodId: number): ScorecardResult {
  const orgMap = new Map(db.orgs.map((org) => [org.id, org.name]));
  const sortedPerspectives = [...db.perspectives].sort((a, b) => a.order - b.order);
  const orgObjectives = db.objectives.filter((objective) => objective.org_id === orgId);

  const perspectivesResult: ScoredPerspective[] = sortedPerspectives.map((perspective) => {
    const perspectiveObjectives = orgObjectives.filter((objective) => objective.perspective_id === perspective.id);
    const scoredObjectives: ScoredObjective[] = perspectiveObjectives.map((objective) => {
      const indicators = db.indicators.filter((indicator) => indicator.objective_id === objective.id);
      const scoredIndicators: ScoredIndicator[] = indicators.map((indicator) => {
        const measurement = db.measurements.find((item) => item.indicator_id === indicator.id && item.period_id === periodId);
        const target = measurement?.target ?? null;
        const actual = measurement?.actual ?? null;
        const [score, status] = scoreIndicator(indicator, target, actual);
        return { ...indicator, target, actual, score, status };
      });
      const indicatorPairs = scoredIndicators.map((indicator) => [indicator.score, indicator.weight] as [number | null, number]);
      const ownScore = wavg(indicatorPairs);
      const objectiveCoverage = coverageOf(indicatorPairs);
      const cascadeLinks = db.cascades.filter((link) => link.parent_id === objective.id);
      const children = cascadeLinks.map((link) => {
        const childObjective = db.objectives.find((item) => item.id === link.child_id);
        const childScore = childObjective ? calculateObjectiveOwnScore(childObjective.id, db, periodId) : null;
        return {
          objective_id: link.child_id,
          org_id: childObjective?.org_id ?? 0,
          org_name: orgMap.get(childObjective?.org_id ?? 0) ?? 'نامشخص',
          title: childObjective?.title ?? 'هدف نامشخص',
          weight: link.weight,
          score: childScore,
        };
      });
      const alignedScore = children.length > 0 ? wavg(children.map((child) => [child.score, child.weight])) : null;
      return {
        ...objective, indicators: scoredIndicators, score: ownScore, status: statusOf(ownScore),
        coverage: objectiveCoverage,
        children, aligned_score: alignedScore, aligned_status: statusOf(alignedScore),
      };
    });
    const objectivePairs = scoredObjectives.map((objective) => [objective.score, objective.weight] as [number | null, number]);
    const perspectiveScore = wavg(objectivePairs);
    return {
      perspective,
      objectives: scoredObjectives,
      score: perspectiveScore,
      status: statusOf(perspectiveScore),
      coverage: weightedCoveragePercent(scoredObjectives.map((objective) => [objective.coverage, objective.weight] as [number | null, number])),
    };
  });

  // Explicit positive perspective weights are honored; omitted weights default to 1
  // for backward compatibility and the documented equal-weight policy.
  const perspectivePairs = perspectivesResult.map((result) => {
    const configured = result.perspective.weight;
    const weight = configured === undefined ? 1 : configured;
    return [result.score, weight] as [number | null, number];
  });
  const totalScore = wavg(perspectivePairs);
  return {
    org_id: orgId,
    period_id: periodId,
    perspectives: perspectivesResult,
    score: totalScore,
    status: statusOf(totalScore),
    coverage: weightedCoveragePercent(perspectivesResult.map((result) => [
      result.coverage,
      result.perspective.weight === undefined ? 1 : result.perspective.weight,
    ] as [number | null, number])),
  };
}
