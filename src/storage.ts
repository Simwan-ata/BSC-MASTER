import { INITIAL_DATABASE } from './initialData';
import { DatabaseState } from './types';

const STORAGE_KEY = 'bsc_master_db_v1';
const RECOVERY_KEY = 'bsc_master_recovery_v1';

const REQUIRED_ARRAYS = [
  'orgs', 'perspectives', 'periods', 'objectives', 'indicators',
  'measurements', 'cascades', 'causes', 'initiatives', 'focusAreas', 'visions',
] as const;
const ID_ARRAYS = [
  'orgs', 'perspectives', 'periods', 'objectives', 'indicators',
  'measurements', 'cascades', 'causes', 'initiatives', 'focusAreas',
] as const;
const OPTIONAL_ARRAYS = [
  'swotItems', 'swotStrategies', 'bcgItems', 'megaTrends', 'weakSignals',
  'wildCards', 'horizonInitiatives', 'uncertainties', 'scenarios', 'risks',
  'pestelItems', 'porterItems', 'vrioItems', 'spaceFactors',
] as const;

function isRecord(value: unknown): value is Record<string, any> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
function hasUniqueNumericIds(items: unknown[]): boolean {
  const ids = items.map((item) => isRecord(item) ? item.id : undefined);
  return ids.every((id) => typeof id === 'number' && Number.isFinite(id)) && new Set(ids).size === ids.length;
}

/** Validate the core schema and its key relationships before loading or importing. */
function validateDatabase(value: unknown): value is DatabaseState {
  if (!isRecord(value) || !REQUIRED_ARRAYS.every((key) => Array.isArray(value[key]))) return false;
  const db = value as unknown as DatabaseState;

  if (!db.orgs.every((x) => isRecord(x) && Number.isFinite(x.id) && typeof x.name === 'string')) return false;
  if (!db.perspectives.every((x) => isRecord(x) && Number.isFinite(x.id) && Number.isFinite(x.order))) return false;
  if (!db.periods.every((x) => isRecord(x) && Number.isFinite(x.id) && typeof x.name === 'string')) return false;
  if (!db.objectives.every((x) =>
    isRecord(x) && Number.isFinite(x.id) && Number.isFinite(x.org_id) &&
    Number.isFinite(x.perspective_id) && Number.isFinite(x.weight) && typeof x.title === 'string'
  )) return false;
  if (!db.indicators.every((x) =>
    isRecord(x) && Number.isFinite(x.id) && Number.isFinite(x.objective_id) &&
    Number.isFinite(x.weight) && typeof x.title === 'string' &&
    (x.method === 'achievement' || x.method === 'threshold') && typeof x.higher_is_better === 'boolean'
  )) return false;
  if (!db.measurements.every((x) =>
    isRecord(x) && Number.isFinite(x.id) && Number.isFinite(x.indicator_id) &&
    Number.isFinite(x.period_id) &&
    (x.target === null || (typeof x.target === 'number' && Number.isFinite(x.target))) &&
    (x.actual === null || (typeof x.actual === 'number' && Number.isFinite(x.actual)))
  )) return false;

  for (const key of ID_ARRAYS) {
    if (!hasUniqueNumericIds(db[key] as unknown[])) return false;
  }
  const orgIds = new Set(db.orgs.map((x) => x.id));
  const perspectiveIds = new Set(db.perspectives.map((x) => x.id));
  const periodIds = new Set(db.periods.map((x) => x.id));
  const objectiveIds = new Set(db.objectives.map((x) => x.id));
  const indicatorIds = new Set(db.indicators.map((x) => x.id));

  if (db.objectives.some((x) => !orgIds.has(x.org_id) || !perspectiveIds.has(x.perspective_id))) return false;
  if (db.indicators.some((x) => !objectiveIds.has(x.objective_id))) return false;
  if (db.measurements.some((x) => !indicatorIds.has(x.indicator_id) || !periodIds.has(x.period_id))) return false;
  if (db.cascades.some((x) =>
    !isRecord(x) || !objectiveIds.has(x.parent_id) || !objectiveIds.has(x.child_id) ||
    x.parent_id === x.child_id || !Number.isFinite(x.weight) || x.weight < 0
  )) return false;
  if (db.visions.some((x) => !isRecord(x) || !orgIds.has(x.org_id))) return false;
  return true;
}

function migrateDatabase(value: DatabaseState): DatabaseState {
  const migrated = { ...value } as DatabaseState;
  for (const key of OPTIONAL_ARRAYS) {
    const current = (migrated as any)[key];
    (migrated as any)[key] = Array.isArray(current) ? current : (INITIAL_DATABASE as any)[key] ?? [];
  }
  return migrated;
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

    if (!validateDatabase(parsed)) {
      preserveRecoveryCopy(raw);
      console.error('Stored BSC-MASTER data failed validation; a recovery copy was preserved.');
      return INITIAL_DATABASE;
    }

    const migrated = migrateDatabase(parsed);
    saveDatabase(migrated);
    return migrated;
  } catch (error) {
    console.error('Unable to load BSC-MASTER data from localStorage', error);
    return INITIAL_DATABASE;
  }
}

export function saveDatabase(data: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error('Unable to save BSC-MASTER data. Check browser storage or export a backup.', error);
  }
}

export function resetDatabase(): DatabaseState {
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
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
      if (!validateDatabase(parsed)) {
        throw new Error('ساختار یا روابط داده‌های فایل پشتیبان معتبر نیست؛ داده فعلی تغییر نکرد.');
      }
      const migrated = migrateDatabase(parsed);
      // Import is committed only after the full validation passes.
      localStorage.setItem(STORAGE_KEY, JSON.stringify(migrated));
      onSuccess(migrated);
    } catch (error) {
      onError(error instanceof Error ? error.message : 'خطا در خواندن فایل JSON');
    }
  };
  reader.readAsText(file);
}
