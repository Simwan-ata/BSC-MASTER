import { INITIAL_DATABASE } from './initialData';
import { DatabaseState } from './types';

const STORAGE_KEY = 'bsc_master_db_v1';

export function loadDatabase(): DatabaseState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    const parsed = JSON.parse(raw);
    // basic sanity checks and auto-migration
    if (!parsed.orgs || !parsed.perspectives || !parsed.objectives) {
      saveDatabase(INITIAL_DATABASE);
      return INITIAL_DATABASE;
    }
    // Auto-migrate new Cascade Strategy and Strategic Suite properties if missing
    parsed.initiatives = Array.isArray(parsed.initiatives)
      ? parsed.initiatives
      : INITIAL_DATABASE.initiatives;
    parsed.focusAreas = Array.isArray(parsed.focusAreas)
      ? parsed.focusAreas
      : INITIAL_DATABASE.focusAreas;
    parsed.visions = Array.isArray(parsed.visions)
      ? parsed.visions
      : INITIAL_DATABASE.visions;
    parsed.swotItems = Array.isArray(parsed.swotItems)
      ? parsed.swotItems
      : INITIAL_DATABASE.swotItems;
    parsed.swotStrategies = Array.isArray(parsed.swotStrategies)
      ? parsed.swotStrategies
      : INITIAL_DATABASE.swotStrategies;
    parsed.bcgItems = Array.isArray(parsed.bcgItems)
      ? parsed.bcgItems
      : INITIAL_DATABASE.bcgItems;
    parsed.megaTrends = Array.isArray(parsed.megaTrends)
      ? parsed.megaTrends
      : INITIAL_DATABASE.megaTrends;
    parsed.weakSignals = Array.isArray(parsed.weakSignals)
      ? parsed.weakSignals
      : INITIAL_DATABASE.weakSignals;
    parsed.wildCards = Array.isArray(parsed.wildCards)
      ? parsed.wildCards
      : INITIAL_DATABASE.wildCards;
    parsed.horizonInitiatives = Array.isArray(parsed.horizonInitiatives)
      ? parsed.horizonInitiatives
      : INITIAL_DATABASE.horizonInitiatives;
    parsed.uncertainties = Array.isArray(parsed.uncertainties)
      ? parsed.uncertainties
      : INITIAL_DATABASE.uncertainties;
    parsed.scenarios = Array.isArray(parsed.scenarios)
      ? parsed.scenarios
      : INITIAL_DATABASE.scenarios;
    parsed.risks = Array.isArray(parsed.risks)
      ? parsed.risks
      : INITIAL_DATABASE.risks;
    parsed.pestelItems = Array.isArray(parsed.pestelItems)
      ? parsed.pestelItems
      : INITIAL_DATABASE.pestelItems;
    parsed.porterItems = Array.isArray(parsed.porterItems)
      ? parsed.porterItems
      : INITIAL_DATABASE.porterItems;
    parsed.vrioItems = Array.isArray(parsed.vrioItems)
      ? parsed.vrioItems
      : INITIAL_DATABASE.vrioItems;
    parsed.spaceFactors = Array.isArray(parsed.spaceFactors)
      ? parsed.spaceFactors
      : INITIAL_DATABASE.spaceFactors;
    return parsed;
  } catch (e) {
    console.error('Error loading database from localStorage', e);
    return INITIAL_DATABASE;
  }
}

export function saveDatabase(data: DatabaseState): void {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (e) {
    console.error('Error saving database to localStorage', e);
  }
}

export function resetDatabase(): DatabaseState {
  saveDatabase(INITIAL_DATABASE);
  return INITIAL_DATABASE;
}

export function exportDatabaseJson(data: DatabaseState): void {
  const jsonStr = JSON.stringify(data, null, 2);
  const blob = new Blob([jsonStr], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `bsc_master_backup_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}

export function importDatabaseJson(
  file: File,
  onSuccess: (data: DatabaseState) => void,
  onError: (err: string) => void
): void {
  const reader = new FileReader();
  reader.onload = (e) => {
    try {
      const parsed = JSON.parse(e.target?.result as string);
      if (!parsed.orgs || !parsed.perspectives || !parsed.objectives) {
        throw new Error('ساختار فایل بارگذاری‌شده استاندارد کارت امتیازی نیست');
      }
      saveDatabase(parsed);
      onSuccess(parsed);
    } catch (err: any) {
      onError(err.message || 'خطا در خواندن فایل JSON');
    }
  };
  reader.readAsText(file);
}
