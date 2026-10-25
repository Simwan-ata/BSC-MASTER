import {
  DatabaseState,
  Indicator,
  ScorecardResult,
  ScoredIndicator,
  ScoredObjective,
  ScoredPerspective,
  StatusType,
} from './types';

/**
 * تعیین وضعیت بر اساس امتیاز (مقیاس ۰ تا ۱۲۰)
 * امتیاز بالای ۹۰: سبز (مطلوب)
 * امتیاز بین ۷۰ تا ۸۹: زرد (هشدار)
 * امتیاز زیر ۷۰: قرمز (بحرانی)
 */
export function statusOf(score: number | null): StatusType {
  if (score === null || isNaN(score)) return null;
  if (score >= 90) return 'green';
  if (score >= 70) return 'yellow';
  return 'red';
}

export const STATUS_LABELS: Record<'green' | 'yellow' | 'red', string> = {
  green: 'مطلوب (سبز)',
  yellow: 'هشدار (زرد)',
  red: 'بحرانی (قرمز)',
};

/**
 * تبدیل اعداد انگلیسی به اعداد فارسی با فرمت‌بندی استاندارد
 */
export function toFa(num: number | string | null | undefined, digits = 1): string {
  if (num === null || num === undefined) return '—';
  const parsed = typeof num === 'string' ? parseFloat(num) : num;
  if (isNaN(parsed)) return '—';
  const formatted = Number(parsed).toLocaleString('fa-IR', {
    maximumFractionDigits: digits,
    minimumFractionDigits: 0,
  });
  return formatted;
}

export function toFaInt(num: number | null | undefined): string {
  if (num === null || num === undefined || isNaN(num)) return '—';
  return Number(Math.round(num)).toLocaleString('fa-IR');
}

/**
 * محاسبه امتیاز یک شاخص تکی:
 * روش تحقق (achievement): نسبت عملکرد واقعی به هدف با در نظر گرفتن جهت شاخص و سقف
 * روش آستانه (threshold): مقایسه با حد زرد و سبز
 */
export function scoreIndicator(
  indicator: Indicator,
  target: number | null,
  actual: number | null
): [number | null, StatusType] {
  if (actual === null || actual === undefined) {
    return [null, null];
  }

  // روش آستانه (Threshold)
  if (indicator.method === 'threshold') {
    const y = indicator.yellow_limit;
    const g = indicator.green_limit;
    if (y === null || g === null || y === undefined || g === undefined) {
      return [null, null];
    }

    let st: 'green' | 'yellow' | 'red';
    if (indicator.higher_is_better) {
      st = actual >= g ? 'green' : actual >= y ? 'yellow' : 'red';
    } else {
      st = actual <= g ? 'green' : actual <= y ? 'yellow' : 'red';
    }

    const scoreMap = { green: 100.0, yellow: 70.0, red: 30.0 };
    return [scoreMap[st], st];
  }

  // روش درصد تحقق (Achievement)
  if (target === null || target === undefined || target === 0) {
    return [null, null];
  }

  let ratio: number;
  if (indicator.higher_is_better) {
    ratio = actual / target;
  } else {
    ratio = actual > 0 ? target / actual : indicator.cap;
  }

  const cap = indicator.cap || 1.2;
  const score = Math.max(0.0, Math.min(ratio, cap)) * 100;
  const rounded = Math.round(score * 10) / 10;
  return [rounded, statusOf(rounded)];
}

/**
 * میانگین وزنی آیتم‌ها با در نظر گرفتن وزن مثبت و امتیازهای موجود
 */
export function wavg(pairs: [number | null, number][]): number | null {
  const valid = pairs.filter(
    (p): p is [number, number] => p[0] !== null && !isNaN(p[0]) && p[1] > 0
  );
  const totalWeight = valid.reduce((sum, item) => sum + item[1], 0);
  if (totalWeight === 0) return null;
  const weightedSum = valid.reduce((sum, item) => sum + item[0] * item[1], 0);
  return Math.round((weightedSum / totalWeight) * 10) / 10;
}

/**
 * محاسبه امتیاز هدف بر اساس شاخص‌های آن در یک دوره
 */
export function calculateObjectiveOwnScore(
  objectiveId: number,
  db: DatabaseState,
  periodId: number
): number | null {
  const inds = db.indicators.filter((i) => i.objective_id === objectiveId);
  const pairs: [number | null, number][] = inds.map((i) => {
    const meas = db.measurements.find(
      (m) => m.indicator_id === i.id && m.period_id === periodId
    );
    const [sc] = scoreIndicator(
      i,
      meas?.target ?? null,
      meas?.actual ?? null
    );
    return [sc, i.weight];
  });
  return wavg(pairs);
}

/**
 * ساخت خروجی کامل کارت امتیازی برای یک سازمان و یک دوره معین
 */
export function buildScorecard(
  db: DatabaseState,
  orgId: number,
  periodId: number
): ScorecardResult {
  const orgMap = new Map(db.orgs.map((o) => [o.id, o.name]));
  const sortedPerspectives = [...db.perspectives].sort(
    (a, b) => a.order - b.order
  );
  const orgObjectives = db.objectives.filter((o) => o.org_id === orgId);

  const perspectivesResult: ScoredPerspective[] = sortedPerspectives.map(
    (persp) => {
      const pObjectives = orgObjectives.filter(
        (o) => o.perspective_id === persp.id
      );

      const scoredObjectives: ScoredObjective[] = pObjectives.map((obj) => {
        // شاخص‌های هدف
        const objIndicators = db.indicators.filter(
          (i) => i.objective_id === obj.id
        );
        const scoredInds: ScoredIndicator[] = objIndicators.map((ind) => {
          const meas = db.measurements.find(
            (m) => m.indicator_id === ind.id && m.period_id === periodId
          );
          const target = meas?.target ?? null;
          const actual = meas?.actual ?? null;
          const [score, status] = scoreIndicator(ind, target, actual);
          return {
            ...ind,
            target,
            actual,
            score,
            status,
          };
        });

        // امتیاز مستقیم هدف
        const ownScore = wavg(
          scoredInds.map((i) => [i.score, i.weight])
        );

        // اهداف فرزند مرتبط در هلدینگ (Cascade)
        const cascadeLinks = db.cascades.filter((c) => c.parent_id === obj.id);
        const children = cascadeLinks.map((link) => {
          const childObj = db.objectives.find((o) => o.id === link.child_id);
          const childScore = childObj
            ? calculateObjectiveOwnScore(childObj.id, db, periodId)
            : null;
          return {
            objective_id: link.child_id,
            org_id: childObj?.org_id ?? 0,
            org_name: orgMap.get(childObj?.org_id ?? 0) ?? 'نامشخص',
            title: childObj?.title ?? 'هدف نامشخص',
            weight: link.weight,
            score: childScore,
          };
        });

        const alignedScore =
          children.length > 0
            ? wavg(children.map((k) => [k.score, k.weight]))
            : null;

        return {
          ...obj,
          indicators: scoredInds,
          score: ownScore,
          status: statusOf(ownScore),
          children,
          aligned_score: alignedScore,
          aligned_status: statusOf(alignedScore),
        };
      });

      const perspScore = wavg(
        scoredObjectives.map((o) => [o.score, o.weight])
      );

      return {
        perspective: persp,
        objectives: scoredObjectives,
        score: perspScore,
        status: statusOf(perspScore),
      };
    }
  );

  const totalScore = wavg(
    perspectivesResult.map((p) => [p.score, 1.0])
  );

  return {
    org_id: orgId,
    period_id: periodId,
    perspectives: perspectivesResult,
    score: totalScore,
    status: statusOf(totalScore),
  };
}
