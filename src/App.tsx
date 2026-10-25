import React, { useState, useMemo, useEffect } from 'react';
import {
  loadDatabase,
  saveDatabase,
  resetDatabase,
  exportDatabaseJson,
  importDatabaseJson,
} from './storage';
import { DatabaseState, StatusType } from './types';
import { buildScorecard } from './scoring';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { ScorecardView } from './components/ScorecardView';
import { StrategyMapView } from './components/StrategyMapView';
import { AlignmentCascadeView } from './components/AlignmentCascadeView';
import { CascadeView } from './components/CascadeView';
import { AnalyticsView } from './components/AnalyticsView';
import { StrategicSuiteView } from './components/StrategicSuiteView';
import { InitiativePortfolioView } from './components/InitiativePortfolioView';
import {
  AddObjectiveModal,
  AddIndicatorModal,
  AddOrgModal,
  AddCauseModal,
  AddCascadeModal,
  AddInitiativeModal,
  BackupModal,
} from './components/Modals';

export default function App() {
  const [db, setDb] = useState<DatabaseState>(() => loadDatabase());
  const [selectedOrgId, setSelectedOrgId] = useState<number>(() => {
    const loaded = loadDatabase();
    return loaded.orgs[1]?.id || loaded.orgs[0]?.id || 1;
  });
  const [selectedPeriodId, setSelectedPeriodId] = useState<number>(() => {
    const loaded = loadDatabase();
    const active = loaded.periods.find((p) => p.is_active);
    return active?.id || loaded.periods[loaded.periods.length - 1]?.id || 1;
  });

  const [activeTab, setActiveTab] = useState<
    'scorecard' | 'map' | 'cascade' | 'initiatives' | 'analytics' | 'strategy_tools'
  >('scorecard');

  // Modals state
  const [isAddObjOpen, setIsAddObjOpen] = useState(false);
  const [addObjPerspectiveId, setAddObjPerspectiveId] = useState<number | undefined>();

  const [isAddIndOpen, setIsAddIndOpen] = useState(false);
  const [addIndObjectiveId, setAddIndObjectiveId] = useState<number | undefined>();

  const [isAddOrgOpen, setIsAddOrgOpen] = useState(false);
  const [isAddCauseOpen, setIsAddCauseOpen] = useState(false);
  const [isAddCascadeOpen, setIsAddCascadeOpen] = useState(false);
  const [isAddInitiativeOpen, setIsAddInitiativeOpen] = useState(false);
  const [addInitiativeObjectiveId, setAddInitiativeObjectiveId] = useState<number | undefined>();
  const [isBackupOpen, setIsBackupOpen] = useState(false);

  // Sync to localStorage whenever db changes
  const updateDb = (newDb: DatabaseState) => {
    setDb(newDb);
    saveDatabase(newDb);
  };

  // Selected Org and Period objects
  const selectedOrg = useMemo(() => {
    return db.orgs.find((o) => o.id === selectedOrgId) || db.orgs[0];
  }, [db.orgs, selectedOrgId]);

  const selectedPeriod = useMemo(() => {
    return (
      db.periods.find((p) => p.id === selectedPeriodId) ||
      db.periods[db.periods.length - 1]
    );
  }, [db.periods, selectedPeriodId]);

  // Current active scorecard result
  const currentScorecard = useMemo(() => {
    if (!selectedOrg || !selectedPeriod) return null;
    return buildScorecard(db, selectedOrg.id, selectedPeriod.id);
  }, [db, selectedOrg, selectedPeriod]);

  // Scores for all orgs in current period for sidebar indicators
  const orgScores = useMemo(() => {
    const map: Record<number, { score: number | null; status: StatusType }> = {};
    if (!selectedPeriod) return map;
    for (const org of db.orgs) {
      const sc = buildScorecard(db, org.id, selectedPeriod.id);
      map[org.id] = { score: sc.score, status: sc.status };
    }
    return map;
  }, [db, selectedPeriod]);

  // Objectives for current org
  const currentOrgObjectives = useMemo(() => {
    return db.objectives.filter((o) => o.org_id === selectedOrgId);
  }, [db.objectives, selectedOrgId]);

  // Handlers for Data Mutations
  const handleUpdateMeasurement = (
    indicatorId: number,
    target: number | null,
    actual: number | null
  ) => {
    const existingIdx = db.measurements.findIndex(
      (m) =>
        m.indicator_id === indicatorId && m.period_id === selectedPeriodId
    );

    let updatedMeasurements = [...db.measurements];
    if (existingIdx >= 0) {
      updatedMeasurements[existingIdx] = {
        ...updatedMeasurements[existingIdx],
        target:
          target !== null ? target : updatedMeasurements[existingIdx].target,
        actual,
      };
    } else {
      const newId =
        Math.max(...db.measurements.map((m) => m.id), 0) + 1;
      updatedMeasurements.push({
        id: newId,
        indicator_id: indicatorId,
        period_id: selectedPeriodId,
        target,
        actual,
      });
    }

    updateDb({
      ...db,
      measurements: updatedMeasurements,
    });
  };

  const handleAddObjective = (data: {
    org_id: number;
    perspective_id: number;
    title: string;
    weight: number;
    description?: string;
  }) => {
    const newId = Math.max(...db.objectives.map((o) => o.id), 0) + 1;
    const newObjective = {
      id: newId,
      ...data,
    };
    updateDb({
      ...db,
      objectives: [...db.objectives, newObjective],
    });
  };

  // Toast and Confirmation state (replacing window.alert and window.confirm for iframe compatibility)
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [confirmDialog, setConfirmDialog] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleDeleteObjective = (objectiveId: number) => {
    setConfirmDialog({
      title: 'حذف هدف استراتژیک',
      message: 'آیا از حذف این هدف استراتژیک اطمینان دارید؟ تمامی شاخص‌ها و پیوندهای وابسته نیز حذف خواهند شد.',
      onConfirm: () => {
        const indicatorIdsToRemove = db.indicators
          .filter((i) => i.objective_id === objectiveId)
          .map((i) => i.id);

        updateDb({
          ...db,
          objectives: db.objectives.filter((o) => o.id !== objectiveId),
          indicators: db.indicators.filter((i) => i.objective_id !== objectiveId),
          measurements: db.measurements.filter(
            (m) => !indicatorIdsToRemove.includes(m.indicator_id)
          ),
          causes: db.causes.filter(
            (c) => c.from_id !== objectiveId && c.to_id !== objectiveId
          ),
          cascades: db.cascades.filter(
            (c) => c.child_id !== objectiveId && c.parent_id !== objectiveId
          ),
        });
        showToast('هدف استراتژیک با موفقیت حذف شد.');
        setConfirmDialog(null);
      },
    });
  };

  const handleAddIndicator = (data: any) => {
    const newId = Math.max(...db.indicators.map((i) => i.id), 0) + 1;
    const newIndicator = {
      id: newId,
      ...data,
    };
    updateDb({
      ...db,
      indicators: [...db.indicators, newIndicator],
    });
    showToast('شاخص جدید با موفقیت اضافه شد.');
  };

  const handleDeleteIndicator = (indicatorId: number) => {
    setConfirmDialog({
      title: 'حذف شاخص عملکردی',
      message: 'آیا از حذف این شاخص اطمینان دارید؟ مقادیر اندازه‌گیری شده این شاخص نیز حذف خواهند شد.',
      onConfirm: () => {
        updateDb({
          ...db,
          indicators: db.indicators.filter((i) => i.id !== indicatorId),
          measurements: db.measurements.filter((m) => m.indicator_id !== indicatorId),
        });
        showToast('شاخص با موفقیت حذف شد.');
        setConfirmDialog(null);
      },
    });
  };

  const handleAddOrg = (data: { name: string; parent_id: number | null }) => {
    const newId = Math.max(...db.orgs.map((o) => o.id), 0) + 1;
    const newOrg = {
      id: newId,
      ...data,
    };
    updateDb({
      ...db,
      orgs: [...db.orgs, newOrg],
    });
    setSelectedOrgId(newId);
    showToast('واحد سازمانی جدید ایجاد شد.');
  };

  const handleAddCause = (fromId: number, toId: number) => {
    const newId = Math.max(...db.causes.map((c) => c.id), 0) + 1;
    updateDb({
      ...db,
      causes: [...db.causes, { id: newId, from_id: fromId, to_id: toId }],
    });
    showToast('رابطه علت‌ومعلولی ایجاد شد.');
  };

  const handleDeleteCause = (causeId: number) => {
    updateDb({
      ...db,
      causes: db.causes.filter((c) => c.id !== causeId),
    });
    showToast('رابطه علت‌ومعلولی حذف شد.');
  };

  const handleAddCascade = (
    childId: number,
    parentId: number,
    weight: number
  ) => {
    const newId = Math.max(...db.cascades.map((c) => c.id), 0) + 1;
    updateDb({
      ...db,
      cascades: [
        ...db.cascades,
        { id: newId, child_id: childId, parent_id: parentId, weight },
      ],
    });
    showToast('پیوند هم‌راستایی ثبت شد.');
  };

  const handleDeleteCascade = (cascadeId: number) => {
    updateDb({
      ...db,
      cascades: db.cascades.filter((c) => c.id !== cascadeId),
    });
    showToast('پیوند هم‌راستایی حذف شد.');
  };

  const handleAddInitiative = (data: any) => {
    const newId = Math.max(...(db.initiatives || []).map((i) => i.id), 0) + 1;
    const newInit = { id: newId, ...data };
    updateDb({
      ...db,
      initiatives: [...(db.initiatives || []), newInit],
    });
    showToast('پروژه استراتژیک جدید ثبت شد.');
  };

  const handleDeleteInitiative = (id: number) => {
    setConfirmDialog({
      title: 'حذف پروژه استراتژیک',
      message: 'آیا از حذف این پروژه / اقدام اطمینان دارید؟',
      onConfirm: () => {
        updateDb({
          ...db,
          initiatives: (db.initiatives || []).filter((i) => i.id !== id),
        });
        showToast('پروژه استراتژیک حذف شد.');
        setConfirmDialog(null);
      },
    });
  };

  const handleUpdateInitiativeProgress = (
    id: number,
    progress: number,
    status?: any
  ) => {
    const updated = (db.initiatives || []).map((init) => {
      if (init.id === id) {
        let newStatus = status || init.status;
        if (!status) {
          if (progress >= 100) newStatus = 'completed';
          else if (progress >= 70) newStatus = 'on_track';
          else if (progress >= 40) newStatus = 'behind';
          else newStatus = 'at_risk';
        }
        return { ...init, progress, status: newStatus };
      }
      return init;
    });
    updateDb({
      ...db,
      initiatives: updated,
    });
  };

  const handleApplyWeights = (
    objectiveWeights: Record<number, number>,
    indicatorWeights: Record<number, number>
  ) => {
    const updatedObjectives = db.objectives.map((obj) => {
      if (objectiveWeights[obj.id] !== undefined) {
        return { ...obj, weight: objectiveWeights[obj.id] };
      }
      return obj;
    });

    const updatedIndicators = db.indicators.map((ind) => {
      if (indicatorWeights[ind.id] !== undefined) {
        return { ...ind, weight: indicatorWeights[ind.id] };
      }
      return ind;
    });

    updateDb({
      ...db,
      objectives: updatedObjectives,
      indicators: updatedIndicators,
    });
    showToast('اوزان جدید با موفقیت در پایگاه داده اعمال شدند.');
  };

  const handleExport = () => {
    exportDatabaseJson(db);
    showToast('فایل پشتیبان دانلود شد.');
  };

  const handleImport = (file: File) => {
    importDatabaseJson(
      file,
      (newDb) => {
        setDb(newDb);
        showToast('اطلاعات با موفقیت بازیابی شد.');
      },
      (err) => {
        showToast('خطا در بارگذاری فایل: ' + err, 'error');
      }
    );
  };

  const handleReset = () => {
    const fresh = resetDatabase();
    setDb(fresh);
    setSelectedOrgId(fresh.orgs[1]?.id || fresh.orgs[0]?.id || 1);
    showToast('پایگاه داده به مقادیر اولیه بازنشانی شد.');
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Top Header */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        periods={db.periods}
        selectedPeriodId={selectedPeriodId}
        onSelectPeriod={setSelectedPeriodId}
        onOpenNewObjective={() => {
          setAddObjPerspectiveId(undefined);
          setIsAddObjOpen(true);
        }}
        onOpenNewIndicator={() => {
          setAddIndObjectiveId(undefined);
          setIsAddIndOpen(true);
        }}
        onOpenBackup={() => setIsBackupOpen(true)}
        onPrint={handlePrint}
      />

      {/* Main Workspace with Sidebar and Content View */}
      <div className="flex-1 flex w-full max-w-7xl mx-auto">
        {/* Sidebar with Company Tree */}
        <Sidebar
          orgs={db.orgs}
          selectedOrgId={selectedOrgId}
          onSelectOrg={setSelectedOrgId}
          onOpenNewOrg={() => setIsAddOrgOpen(true)}
          orgScores={orgScores}
        />

        {/* Content Viewport */}
        <main className="flex-1 p-6 md:p-8 min-w-0 overflow-y-auto">
          {currentScorecard ? (
            <>
              {activeTab === 'scorecard' && (
                <ScorecardView
                  scorecard={currentScorecard}
                  orgName={selectedOrg?.name || ''}
                  periodName={selectedPeriod?.name || ''}
                  onUpdateMeasurement={handleUpdateMeasurement}
                  onOpenAddObjective={(pId) => {
                    setAddObjPerspectiveId(pId);
                    setIsAddObjOpen(true);
                  }}
                  onOpenAddIndicator={(objId) => {
                    setAddIndObjectiveId(objId);
                    setIsAddIndOpen(true);
                  }}
                  onDeleteIndicator={handleDeleteIndicator}
                  onDeleteObjective={handleDeleteObjective}
                />
              )}

              {activeTab === 'map' && (
                <StrategyMapView
                  scorecard={currentScorecard}
                  causes={db.causes}
                  allObjectives={db.objectives}
                  orgName={selectedOrg?.name || ''}
                  onOpenAddCause={() => setIsAddCauseOpen(true)}
                  onDeleteCause={handleDeleteCause}
                />
              )}

              {activeTab === 'cascade' && (
                <CascadeView
                  db={db}
                  selectedOrgId={selectedOrgId}
                  selectedPeriodId={selectedPeriodId}
                  onOpenAddCascade={() => setIsAddCascadeOpen(true)}
                  onDeleteCascade={handleDeleteCascade}
                  onOpenAddInitiative={(defaultObjId) => {
                    setAddInitiativeObjectiveId(defaultObjId);
                    setIsAddInitiativeOpen(true);
                  }}
                  onDeleteInitiative={handleDeleteInitiative}
                  onUpdateInitiativeProgress={handleUpdateInitiativeProgress}
                />
              )}

              {activeTab === 'initiatives' && (
                <InitiativePortfolioView
                  db={db}
                  selectedOrgId={selectedOrgId}
                  onUpdateDb={updateDb}
                  showToast={showToast}
                />
              )}

              {activeTab === 'analytics' && (
                <AnalyticsView
                  db={db}
                  selectedOrgId={selectedOrgId}
                  selectedPeriodId={selectedPeriodId}
                  onApplyWeights={handleApplyWeights}
                />
              )}

              {activeTab === 'strategy_tools' && (
                <StrategicSuiteView
                  db={db}
                  selectedOrgId={selectedOrgId}
                  onUpdateDb={updateDb}
                  showToast={showToast}
                />
              )}
            </>
          ) : (
            <div className="p-12 text-center text-slate-500">
              داده‌ای برای نمایش انتخاب نشده است.
            </div>
          )}
        </main>
      </div>

      {/* Modals */}
      <AddObjectiveModal
        isOpen={isAddObjOpen}
        onClose={() => setIsAddObjOpen(false)}
        orgs={db.orgs}
        perspectives={db.perspectives}
        defaultOrgId={selectedOrgId}
        defaultPerspectiveId={addObjPerspectiveId}
        onAdd={handleAddObjective}
      />

      <AddIndicatorModal
        isOpen={isAddIndOpen}
        onClose={() => setIsAddIndOpen(false)}
        objectives={currentOrgObjectives}
        defaultObjectiveId={addIndObjectiveId}
        onAdd={handleAddIndicator}
      />

      <AddOrgModal
        isOpen={isAddOrgOpen}
        onClose={() => setIsAddOrgOpen(false)}
        orgs={db.orgs}
        onAdd={handleAddOrg}
      />

      <AddCauseModal
        isOpen={isAddCauseOpen}
        onClose={() => setIsAddCauseOpen(false)}
        objectives={currentOrgObjectives}
        onAdd={handleAddCause}
      />

      <AddCascadeModal
        isOpen={isAddCascadeOpen}
        onClose={() => setIsAddCascadeOpen(false)}
        allObjectives={db.objectives}
        orgs={db.orgs}
        onAdd={handleAddCascade}
      />

      <AddInitiativeModal
        isOpen={isAddInitiativeOpen}
        onClose={() => setIsAddInitiativeOpen(false)}
        objectives={currentOrgObjectives}
        defaultObjectiveId={addInitiativeObjectiveId}
        onAdd={handleAddInitiative}
      />

      <BackupModal
        isOpen={isBackupOpen}
        onClose={() => setIsBackupOpen(false)}
        onExport={handleExport}
        onImport={handleImport}
        onReset={handleReset}
      />

      {/* Confirmation Dialog (in-app modal replacing window.confirm) */}
      {confirmDialog && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white border border-slate-200 rounded-xl w-full max-w-md shadow-2xl p-5 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-sm font-bold text-slate-900">{confirmDialog.title}</h3>
            <p className="text-xs text-slate-600 leading-relaxed">{confirmDialog.message}</p>
            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setConfirmDialog(null)}
                className="px-3.5 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={confirmDialog.onConfirm}
                className="px-4 py-1.5 text-xs bg-rose-600 hover:bg-rose-700 text-white font-medium rounded-lg transition-colors shadow-sm"
              >
                تأیید و حذف
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Floating Toast Notification (replacing window.alert) */}
      {toastMessage && (
        <div
          className={`fixed bottom-6 left-6 z-50 px-4 py-2.5 rounded-xl shadow-lg border text-xs font-medium flex items-center gap-2 animate-in slide-in-from-bottom-3 duration-200 ${
            toastMessage.type === 'error'
              ? 'bg-rose-900 text-rose-50 border-rose-800'
              : 'bg-slate-900 text-white border-slate-800'
          }`}
        >
          <span>{toastMessage.text}</span>
        </div>
      )}
    </div>
  );
}
