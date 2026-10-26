import { INITIAL_DATABASE } from './initialData';
import { DatabaseState } from './types';

const STORAGE_KEY = 'bsc_master_db_v1';
const RECOVERY_KEY = 'bsc_master_recovery_v1';

const CORE_ARRAYS = ['orgs', 'perspectives', 'periods', 'objectives', 'indicators', 'measurements'] as const;
const LEGACY_ARRAYS = ['cascades', 'causes', 'initiatives', 'focusAreas', 'visions'] as const;
const STRATEGY_ARRAYS = [
  'swotItems', 'swotStrategies', 'bcgItems', 'megaTrends', 'weakSignals',
  'wildCards', 'horizonInitiatives', 'uncertainties', 'scenarios', 'risks',
  'pestelItems', 'porterItems', 'vrioItems', 'spaceFactors',
] as const;
const ID_ARRAYS = [
  'orgs', 'perspectives', 'periods', 'objectives', 'indicators', 'measurements',
  'cascades', 'causes', 'initiatives', 'focusAreas', 'swotItems', 'swotStrategies',
  'bcgItems', 'megaTrends', 'weakSignals', 'wildCards', 'horizonInitiatives',
  'scenarios', 'risks', 'pestelItems', 'porterItems', 'vrioItems', 'spaceFactors',
] as const;

type RecordValue = Record<string, any>;
function isRecord(value: unknown): value is RecordValue {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function finite(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}
function hasUniqueNumericIds(items: unknown[]): boolean {
  const ids = items.map((item) => isRecord(item) ? item.id : undefined);
  return ids.every(finite) && new Set(ids).size === ids.length;
}

/**
 * Backward-compatible normalization: only core scorecard collections are mandatory.
 * Newer modules absent from an older backup are initialized empty, never seeded with
 * unrelated demo records from INITIAL_DATABASE.
 */
function normalizeDatabase(value: unknown): unknown {
  if (!isRecord(value) || !CORE_ARRAYS.every((key) => Array.isArray(value[key]))) return value;
  const normalized: RecordValue = { ...value };
  for (const key of LEGACY_ARRAYS) {
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  }
  for (const key of STRATEGY_ARRAYS) {
    if (!Array.isArray(normalized[key])) normalized[key] = [];
  }

  // Repair stale optional links in older saved databases without deleting records.
  const objectiveIds = new Set(normalized.objectives.filter(isRecord).map((objective: RecordValue) => objective.id));
  const optionalObjectiveLinks = [
    ['swotItems', 'linked_objective_id'],
    ['swotStrategies', 'linked_objective_id'],
    ['risks', 'linked_objective_id'],
    ['pestelItems', 'linkedObjectiveId'],
    ['porterItems', 'linkedObjectiveId'],
    ['vrioItems', 'linkedObjectiveId'],
  ] as const;
  for (const [collection, field] of optionalObjectiveLinks) {
    normalized[collection] = normalized[collection].map((item: unknown) => {
      if (!isRecord(item) || item[field] === undefined || objectiveIds.has(item[field])) return item;
      return { ...item, [field]: undefined };
    });
  }
  const swotIds = new Set(normalized.swotItems.filter(isRecord).map((item: RecordValue) => item.id));
  normalized.swotStrategies = normalized.swotStrategies.map((strategy: unknown) => {
    if (!isRecord(strategy) || !Array.isArray(strategy.related_swot_ids)) return strategy;
    return { ...strategy, related_swot_ids: strategy.related_swot_ids.filter((id: unknown) => swotIds.has(id)) };
  });
  return normalized;
}

/** Validate the core schema, uniqueness, numeric domains, and foreign-key integrity. */
function validateDatabase(value: unknown): value is DatabaseState {
  if (!isRecord(value) || !CORE_ARRAYS.every((key) => Array.isArray(value[key]))) return false;
  if (![...LEGACY_ARRAYS, ...STRATEGY_ARRAYS].every((key) => Array.isArray(value[key]))) return false;
  const db = value as unknown as DatabaseState;

  if (!db.orgs.every((x) =>
    isRecord(x) && finite(x.id) && typeof x.name === 'string' &&
    (x.parent_id === null || x.parent_id === undefined || finite(x.parent_id))
  )) return false;
  if (!db.perspectives.every((x) => isRecord(x) && finite(x.id) && finite(x.order) && typeof x.name === 'string')) return false;
  if (!db.periods.every((x) => isRecord(x) && finite(x.id) && typeof x.name === 'string')) return false;
  if (!db.objectives.every((x) =>
    isRecord(x) && finite(x.id) && finite(x.org_id) && finite(x.perspective_id) &&
    finite(x.weight) && x.weight > 0 && typeof x.title === 'string'
  )) return false;
  if (!db.indicators.every((x) => {
    if (!isRecord(x) || !finite(x.id) || !finite(x.objective_id) || !finite(x.weight) || x.weight <= 0 ||
        typeof x.title !== 'string' || typeof x.higher_is_better !== 'boolean' ||
        (x.method !== 'achievement' && x.method !== 'threshold') ||
        (x.cap !== undefined && (!finite(x.cap) || x.cap <= 0)) ||
        (x.yellow_limit !== null && x.yellow_limit !== undefined && !finite(x.yellow_limit)) ||
        (x.green_limit !== null && x.green_limit !== undefined && !finite(x.green_limit))) return false;
    if (x.method === 'threshold') {
      if (!finite(x.yellow_limit) || !finite(x.green_limit)) return false;
      if (x.higher_is_better ? x.green_limit <= x.yellow_limit : x.green_limit >= x.yellow_limit) return false;
    }
    return true;
  })) return false;
  if (!db.measurements.every((x) =>
    isRecord(x) && finite(x.id) && finite(x.indicator_id) && finite(x.period_id) &&
    (x.target === null || finite(x.target)) && (x.actual === null || finite(x.actual))
  )) return false;

  for (const key of ID_ARRAYS) {
    const items = (db as any)[key];
    if (!Array.isArray(items) || !hasUniqueNumericIds(items)) return false;
  }

  const orgIds = new Set(db.orgs.map((x) => x.id));
  const perspectiveIds = new Set(db.perspectives.map((x) => x.id));
  const periodIds = new Set(db.periods.map((x) => x.id));
  const objectiveIds = new Set(db.objectives.map((x) => x.id));
  const indicatorIds = new Set(db.indicators.map((x) => x.id));

  if (db.orgs.some((x) => x.parent_id !== null && x.parent_id !== undefined && !orgIds.has(x.parent_id))) return false;
  // Organization hierarchy must be acyclic.
  const orgParents = new Map(db.orgs.map((org) => [org.id, org.parent_id ?? null]));
  for (const org of db.orgs) {
    const visited = new Set<number>([org.id]);
    let parentId = orgParents.get(org.id) ?? null;
    while (parentId !== null) {
      if (visited.has(parentId)) return false;
      visited.add(parentId);
      parentId = orgParents.get(parentId) ?? null;
    }
  }
  if (db.objectives.some((x) => !orgIds.has(x.org_id) || !perspectiveIds.has(x.perspective_id))) return false;
  if (db.indicators.some((x) => !objectiveIds.has(x.objective_id))) return false;
  if (db.measurements.some((x) => !indicatorIds.has(x.indicator_id) || !periodIds.has(x.period_id))) return false;

  // One measurement per KPI and period avoids ambiguous .find()-based scoring.
  const measurementKeys = db.measurements.map((x) => `${x.indicator_id}:${x.period_id}`);
  if (new Set(measurementKeys).size !== measurementKeys.length) return false;

  if (db.cascades.some((x) =>
    !isRecord(x) || !objectiveIds.has(x.parent_id) || !objectiveIds.has(x.child_id) ||
    x.parent_id === x.child_id || !finite(x.weight) || x.weight <= 0
  )) return false;
  // Alignment links must not contain cycles; cycles make parent-child interpretation ambiguous.
  const cascadeParents = new Map<number, number[]>();
  for (const link of db.cascades) {
    const parents = cascadeParents.get(link.child_id) ?? [];
    parents.push(link.parent_id);
    cascadeParents.set(link.child_id, parents);
  }
  const visiting = new Set<number>();
  const visitedCascadeNodes = new Set<number>();
  const hasCascadeCycle = (nodeId: number): boolean => {
    if (visiting.has(nodeId)) return true;
    if (visitedCascadeNodes.has(nodeId)) return false;
    visiting.add(nodeId);
    for (const parentId of cascadeParents.get(nodeId) ?? []) {
      if (hasCascadeCycle(parentId)) return true;
    }
    visiting.delete(nodeId);
    visitedCascadeNodes.add(nodeId);
    return false;
  };
  if (db.objectives.some((objective) => hasCascadeCycle(objective.id))) return false;
  if (db.causes.some((x) => !isRecord(x) || !objectiveIds.has(x.from_id) || !objectiveIds.has(x.to_id) || x.from_id === x.to_id)) return false;
  if (db.initiatives.some((x) => !isRecord(x) || !objectiveIds.has(x.objective_id) || typeof x.title !== 'string')) return false;
  if (db.focusAreas.some((x) => !isRecord(x) || !orgIds.has(x.org_id) || typeof x.title !== 'string')) return false;
  if (db.initiatives.some((x) =>
    !isRecord(x) || !objectiveIds.has(x.objective_id) || typeof x.title !== 'string' ||
    typeof x.owner !== 'string' || typeof x.due_date !== 'string' ||
    !finite(x.progress) || x.progress < 0 || x.progress > 100 ||
    !['on_track', 'behind', 'at_risk', 'completed'].includes(x.status) ||
    (x.planned_progress !== undefined && (!finite(x.planned_progress) || x.planned_progress < 0 || x.planned_progress > 100)) ||
    (x.budget_allocated !== undefined && (!finite(x.budget_allocated) || x.budget_allocated < 0)) ||
    (x.budget_spent !== undefined && (!finite(x.budget_spent) || x.budget_spent < 0)) ||
    (x.milestones !== undefined && (!Array.isArray(x.milestones) || x.milestones.some((m: unknown) =>
      !isRecord(m) || !finite(m.id) || typeof m.title !== 'string' ||
      typeof m.due_date !== 'string' || typeof m.completed !== 'boolean'
    )))
  )) return false;
  if (db.focusAreas.some((x) => !isRecord(x) || !orgIds.has(x.org_id) || typeof x.title !== 'string' || typeof x.color !== 'string')) return false;
  if (db.visions.some((x) =>
    !isRecord(x) || !orgIds.has(x.org_id) || typeof x.vision !== 'string' ||
    typeof x.mission !== 'string' || !Array.isArray(x.core_values) ||
    x.core_values.some((value: unknown) => typeof value !== 'string')
  )) return false;

  if (db.swotItems?.some((x) =>
    typeof x.title !== 'string' ||
    !['strength', 'weakness', 'opportunity', 'threat'].includes(x.type) ||
    !['high', 'medium', 'low'].includes(x.importance) ||
    (x.score !== undefined && (!finite(x.score) || x.score < 1 || x.score > 10))
  )) return false;
  if (db.swotStrategies?.some((x) =>
    typeof x.title !== 'string' || typeof x.description !== 'string' ||
    !['SO', 'WO', 'ST', 'WT'].includes(x.type)
  )) return false;
  if (db.bcgItems?.some((x) =>
    typeof x.name !== 'string' || !finite(x.market_growth_rate) ||
    !finite(x.relative_market_share) || !finite(x.revenue) ||
    typeof x.revenue_currency !== 'string' ||
    !['star', 'cash_cow', 'question_mark', 'dog'].includes(x.quadrant) ||
    typeof x.recommendation !== 'string'
  )) return false;
  if (db.megaTrends?.some((x) =>
    typeof x.title !== 'string' || typeof x.timeframe !== 'string' ||
    !['technology', 'economy', 'geopolitics', 'environment', 'society'].includes(x.category) ||
    !['critical', 'high', 'medium'].includes(x.impact_level)
  )) return false;
  if (db.weakSignals?.some((x) =>
    typeof x.title !== 'string' || typeof x.source !== 'string' ||
    !['emerging', 'accelerating', 'maturing'].includes(x.maturity)
  )) return false;
  if (db.wildCards?.some((x) =>
    typeof x.title !== 'string' || !['very_low', 'low'].includes(x.probability) ||
    !['catastrophic', 'transformational'].includes(x.impact)
  )) return false;
  if (db.horizonInitiatives?.some((x) =>
    typeof x.title !== 'string' || !['H1', 'H2', 'H3'].includes(x.horizon) ||
    !finite(x.budget_share) || typeof x.timeline !== 'string'
  )) return false;
  if (db.uncertainties?.some((x) =>
    !['X', 'Y'].includes(x.axis) || typeof x.title !== 'string' ||
    typeof x.negative_pole !== 'string' || typeof x.positive_pole !== 'string'
  )) return false;
  if (db.scenarios?.some((x) =>
    typeof x.title !== 'string' || !['S1', 'S2', 'S3', 'S4'].includes(x.code) ||
    !finite(x.probability) || !Array.isArray(x.early_warnings) ||
    !Array.isArray(x.contingency_actions)
  )) return false;
  if (db.risks?.some((x) =>
    typeof x.code !== 'string' || typeof x.title !== 'string' ||
    !finite(x.probability) || x.probability < 1 || x.probability > 5 ||
    !finite(x.impact) || x.impact < 1 || x.impact > 5 ||
    !finite(x.score) || typeof x.owner !== 'string' ||
    !['active', 'mitigated', 'monitored', 'closed'].includes(x.status) ||
    !['mitigate', 'avoid', 'transfer', 'accept'].includes(x.response_strategy)
  )) return false;
  if (db.pestelItems?.some((x) =>
    typeof x.title !== 'string' ||
    !['political', 'economic', 'social', 'technological', 'environmental', 'legal'].includes(x.dimension) ||
    !['opportunity', 'threat', 'neutral'].includes(x.impactType) ||
    !finite(x.impactScore) || !finite(x.probabilityScore)
  )) return false;
  if (db.porterItems?.some((x) =>
    typeof x.title !== 'string' ||
    !['rivalry', 'buyers', 'suppliers', 'new_entrants', 'substitutes'].includes(x.force) ||
    !finite(x.intensity) || x.intensity < 1 || x.intensity > 5
  )) return false;
  if (db.vrioItems?.some((x) =>
    typeof x.resource_name !== 'string' ||
    typeof x.is_valuable !== 'boolean' || typeof x.is_rare !== 'boolean' ||
    typeof x.is_inimitable !== 'boolean' || typeof x.is_organized !== 'boolean'
  )) return false;
  if (db.spaceFactors?.some((x) =>
    !['FS', 'CA', 'IS', 'ES'].includes(x.dimension) || typeof x.name !== 'string' ||
    !finite(x.score) ||
    ((x.dimension === 'FS' || x.dimension === 'IS') && (x.score < 1 || x.score > 6)) ||
    ((x.dimension === 'CA' || x.dimension === 'ES') && (x.score < -6 || x.score > -1))
  )) return false;

  const orgScopedArrays = [
    'swotItems', 'swotStrategies', 'bcgItems', 'risks', 'pestelItems',
    'porterItems', 'vrioItems', 'spaceFactors',
  ] as const;
  for (const key of orgScopedArrays) {
    if ((db as any)[key].some((item: unknown) => !isRecord(item) || !orgIds.has(item.org_id))) return false;
  }
  const swotIds = new Set((db.swotItems ?? []).map((x) => x.id));
  if (db.swotItems?.some((x) => x.linked_objective_id !== undefined && !objectiveIds.has(x.linked_objective_id))) return false;
  if (db.swotStrategies?.some((x) =>
    (x.linked_objective_id !== undefined && !objectiveIds.has(x.linked_objective_id)) ||
    !Array.isArray(x.related_swot_ids) || x.related_swot_ids.some((id) => !swotIds.has(id))
  )) return false;
  if (db.risks?.some((x) => x.linked_objective_id !== undefined && !objectiveIds.has(x.linked_objective_id))) return false;
  if (db.pestelItems?.some((x) => x.linkedObjectiveId !== undefined && !objectiveIds.has(x.linkedObjectiveId))) return false;
  if (db.porterItems?.some((x) => x.linkedObjectiveId !== undefined && !objectiveIds.has(x.linkedObjectiveId))) return false;
  if (db.vrioItems?.some((x) => x.linkedObjectiveId !== undefined && !objectiveIds.has(x.linkedObjectiveId))) return false;
  return true;
}

/** Public validation entry point used by regression tests and import flows. */
export function validateDatabasePayload(value: unknown): value is DatabaseState {
  return validateDatabase(normalizeDatabase(value));
}

function preserveRecoveryCopy(raw: string): void {
  try {
    localStorage.setItem(RECOVERY_KEY, raw);
  } catch (error) {
    console.error('Unable to preserve BSC-MASTER recovery copy', error);
  }
}

export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }

    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch (error) {
      preserveRecoveryCopy(raw);
      console.error('Stored BSC-MASTER data is invalid JSON; a recovery copy was preserved.', error);
      return INITIAL_DATABASE;
    }

    const normalized = normalizeDatabase(parsed);
    if (!validateDatabase(normalized)) {
      preserveRecoveryCopy(raw);
      console.error('Stored BSC-MASTER data failed validation; a recovery copy was preserved.');
      return INITIAL_DATABASE;
    }

    const migrated = normalized as DatabaseState;
    saveDatabase(migrated);
    return migrated;
  } catch (error) {
    console.error('Unable to load BSC-MASTER data from localStorage', error);
    return INITIAL_DATABASE;
  }
}

export function saveDatabase(data: DatabaseState): boolean {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Unable to save BSC-MASTER data. Check browser storage or export a backup.', error);
    return false;
  }
}

export function resetDatabase(): DatabaseState | null {
  return saveDatabase(INITIAL_DATABASE) ? INITIAL_DATABASE : null;
}

export function exportDatabaseJson(data: DatabaseState): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `bsc_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
  anchor.click();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export function importDatabaseJson(
  file: File,
  onSuccess: (data: DatabaseState) => void,
  onError: (err: string) => void
): void {
  const reader = new FileReader();
  reader.onerror = () => onError('خواندن فایل پشتیبان ناموفق بود');
  reader.onload = (event) => {
    try {
      const raw = event.target?.result;
      if (typeof raw !== 'string') throw new Error('محتوای فایل قابل خواندن نیست');
      const parsed: unknown = JSON.parse(raw);
      const normalized = normalizeDatabase(parsed);
      if (!validateDatabase(normalized)) {
        throw new Error('ساختار یا روابط داده‌های فایل پشتیبان معتبر نیست؛ داده فعلی تغییر نکرد.');
      }
      const migrated = normalized as DatabaseState;
      // Import is committed only after full validation and successful persistence.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      onSuccess(migrated);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'خطا در خواندن فایل JSON');
    }
  };
  reader.readAsText(file);
}
