import React, { useState } from 'react';
import {
  GitFork,
  Target,
  Sparkles,
  ChevronDown,
  ChevronLeft,
  Building2,
  Briefcase,
  Layers,
  Clock,
  Calendar,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  Check,
  Compass,
  ArrowRight,
  TrendingUp,
  FolderKanban,
  Coins,
  Search,
  Filter,
} from 'lucide-react';
import {
  DatabaseState,
  InitiativeStatus,
  Objective,
  OrgUnit,
  StrategicInitiative,
  StatusType,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { calculateObjectiveOwnScore, statusOf, toFa } from '../scoring';

interface CascadeViewProps {
  db: DatabaseState;
  selectedOrgId: number;
  selectedPeriodId: number;
  onOpenAddCascade: () => void;
  onDeleteCascade: (cascadeId: number) => void;
  onOpenAddInitiative: (defaultObjectiveId?: number) => void;
  onDeleteInitiative: (id: number) => void;
  onUpdateInitiativeProgress: (id: number, progress: number, status?: InitiativeStatus) => void;
}

export const InitiativeStatusBadge: React.FC<{ status: InitiativeStatus; size?: 'sm' | 'md' }> = ({
  status,
  size = 'md',
}) => {
  const getVisual = () => {
    switch (status) {
      case 'on_track':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />,
          bg: 'bg-emerald-50 text-emerald-800 border-emerald-200',
          label: 'در مسیر تحقق (On Track)',
        };
      case 'behind':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />,
          bg: 'bg-amber-50 text-amber-800 border-amber-200',
          label: 'دارای تاخیر (Behind)',
        };
      case 'at_risk':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 text-rose-600" />,
          bg: 'bg-rose-50 text-rose-800 border-rose-200',
          label: 'در معرض ریسک (At Risk)',
        };
      case 'completed':
        return {
          icon: <Check className="w-3.5 h-3.5 text-blue-600" />,
          bg: 'bg-blue-50 text-blue-800 border-blue-200',
          label: 'تکمیل‌شده (Completed)',
        };
    }
  };

  const v = getVisual();
  const padding = size === 'sm' ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded border font-medium whitespace-nowrap shrink-0 ${v.bg} ${padding}`}
    >
      {v.icon}
      <span>{v.label}</span>
    </span>
  );
};

export const CascadeView: React.FC<CascadeViewProps> = ({
  db,
  selectedOrgId,
  selectedPeriodId,
  onOpenAddCascade,
  onDeleteCascade,
  onOpenAddInitiative,
  onDeleteInitiative,
  onUpdateInitiativeProgress,
}) => {
  const [subTab, setSubTab] = useState<'tree' | 'initiatives' | 'matrix' | 'vision'>('tree');
  const [initiativeFilter, setInitiativeFilter] = useState<string>('all');
  const [searchInitiative, setSearchInitiative] = useState('');
  const [expandedObjectives, setExpandedObjectives] = useState<Record<number, boolean>>({});

  const currentOrg = db.orgs.find((o) => o.id === selectedOrgId);
  const orgMap = new Map(db.orgs.map((o) => [o.id, o.name]));
  const period = db.periods.find((p) => p.id === selectedPeriodId);
  const currentVision = db.visions?.find((v) => v.org_id === selectedOrgId);

  // Objectives of current org
  const orgObjectives = db.objectives.filter((o) => o.org_id === selectedOrgId);

  // Toggle objective expand in Tree
  const toggleObjective = (id: number) => {
    setExpandedObjectives((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Initiatives summary
  const allOrgInitiatives = (db.initiatives || []).filter((init) => {
    const parentObj = db.objectives.find((o) => o.id === init.objective_id);
    return parentObj && parentObj.org_id === selectedOrgId;
  });

  const onTrackCount = allOrgInitiatives.filter((i) => i.status === 'on_track').length;
  const behindCount = allOrgInitiatives.filter((i) => i.status === 'behind').length;
  const atRiskCount = allOrgInitiatives.filter((i) => i.status === 'at_risk').length;
  const completedCount = allOrgInitiatives.filter((i) => i.status === 'completed').length;
  const avgProgress = allOrgInitiatives.length
    ? Math.round(
        allOrgInitiatives.reduce((acc, i) => acc + i.progress, 0) / allOrgInitiatives.length
      )
    : 0;

  // Filtered initiatives for board
  const filteredInitiatives = allOrgInitiatives.filter((init) => {
    if (initiativeFilter !== 'all' && init.status !== initiativeFilter) return false;
    if (searchInitiative.trim()) {
      const q = searchInitiative.toLowerCase();
      const matchTitle = init.title.toLowerCase().includes(q);
      const matchOwner = init.owner.toLowerCase().includes(q);
      if (!matchTitle && !matchOwner) return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>سیستم تسری و اجرای استراتژی (Cascade Strategy Execution)</span>
            <span aria-hidden="true">·</span>
            <span>{currentOrg?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-teal-700" />
            سامانه تسری و هم‌راستایی استراتژیک (Cascade Platform)
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            پیاده‌سازی متدولوژی جهانی Cascade Strategy: هرم پیوسته از چشم‌انداز (Vision) تا
            اهداف کلان (Objectives)، شاخص‌ها (KPIs)، پروژه‌های اجرایی (Initiatives) و تراز
            زیرمجموعه‌ها.
          </p>
        </div>

        {/* Quick Health Stats */}
        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200/80 rounded-xl p-3 shrink-0">
          <div className="text-right">
            <div className="text-[11px] font-semibold text-slate-500">میانگین پیشرفت اقدامات</div>
            <div className="text-sm font-bold font-mono tabular-nums text-teal-900 mt-0.5">
              {toFa(avgProgress)}% تحقق پروژه‌ها
            </div>
          </div>
          <div className="w-10 h-10 rounded-full bg-teal-100 flex items-center justify-center text-teal-800 font-bold font-mono text-xs">
            {toFa(allOrgInitiatives.length)}
          </div>
        </div>
      </div>

      {/* Sub-Tabs Navigation (Like Cascade.app Views) */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-xl border border-slate-200/60 max-w-fit">
        <button
          onClick={() => setSubTab('tree')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            subTab === 'tree'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>درخت تسری استراتژی (Cascade Tree)</span>
        </button>

        <button
          onClick={() => setSubTab('initiatives')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            subTab === 'initiatives'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <FolderKanban className="w-3.5 h-3.5" />
          <span>برد اقدامات و پروژه‌ها (Initiatives)</span>
        </button>

        <button
          onClick={() => setSubTab('matrix')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            subTab === 'matrix'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Building2 className="w-3.5 h-3.5" />
          <span>تراز هلدینگ و زیرمجموعه‌ها (Roll-Up)</span>
        </button>

        <button
          onClick={() => setSubTab('vision')}
          className={`flex items-center gap-2 px-3.5 py-1.5 text-xs font-medium rounded-lg transition-all ${
            subTab === 'vision'
              ? 'bg-white text-teal-900 shadow-sm border border-slate-200/60 font-semibold'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/50'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>چشم‌انداز و ارکان جهت‌ساز (Vision)</span>
        </button>
      </div>

      {/* 1. CASCADE STRATEGY TREE (SIGNATURE FEATURE) */}
      {subTab === 'tree' && (
        <div className="space-y-4">
          {/* Vision Top Card in Tree */}
          {currentVision && (
            <div className="bg-gradient-to-r from-teal-900 to-slate-900 text-white rounded-xl p-5 shadow-sm border border-teal-800">
              <div className="flex items-center gap-2 text-teal-300 text-xs font-semibold mb-1">
                <Compass className="w-4 h-4" />
                <span>افق و چشم‌انداز استراتژیک سازمان (Strategic Vision)</span>
              </div>
              <h3 className="text-base font-bold text-white mt-1 leading-snug">
                «{currentVision.vision}»
              </h3>
              <p className="text-xs text-teal-100/80 mt-1 max-w-3xl leading-relaxed">
                مأموریت: {currentVision.mission}
              </p>
            </div>
          )}

          {/* Perspective & Objective Tree Nodes */}
          <div className="space-y-4">
            {db.perspectives.map((persp) => {
              const pObjectives = orgObjectives.filter((o) => o.perspective_id === persp.id);
              if (pObjectives.length === 0) return null;

              return (
                <div
                  key={persp.id}
                  className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
                >
                  {/* Perspective Bar */}
                  <div className="bg-slate-50/90 px-4 py-3 border-b border-slate-200 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-3 h-3 rounded-full bg-teal-600" />
                      <span className="font-bold text-slate-900 text-xs sm:text-sm">
                        منظر / محور استراتژیک: {persp.name}
                      </span>
                      <span className="text-slate-400 text-xs">·</span>
                      <span className="text-slate-500 text-xs">
                        {toFa(pObjectives.length)} هدف تسری‌یافته
                      </span>
                    </div>
                  </div>

                  {/* Objectives in this Perspective */}
                  <div className="p-4 space-y-3">
                    {pObjectives.map((obj) => {
                      const isExpanded = expandedObjectives[obj.id] ?? true;
                      const ownScore = calculateObjectiveOwnScore(obj.id, db, selectedPeriodId);
                      const objIndicators = db.indicators.filter((i) => i.objective_id === obj.id);
                      const objInitiatives = (db.initiatives || []).filter(
                        (init) => init.objective_id === obj.id
                      );
                      const cascadedChildren = db.cascades.filter((c) => c.parent_id === obj.id);

                      return (
                        <div
                          key={obj.id}
                          className="border border-slate-200 rounded-xl bg-slate-50/40 overflow-hidden"
                        >
                          {/* Objective Row Header */}
                          <div
                            onClick={() => toggleObjective(obj.id)}
                            className="p-3.5 bg-white hover:bg-slate-50/80 cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors border-b border-slate-100"
                          >
                            <div className="flex items-start gap-2.5">
                              <button
                                type="button"
                                className="mt-0.5 text-slate-400 hover:text-slate-700"
                                aria-label="گسترش یا بستن هدف"
                              >
                                {isExpanded ? (
                                  <ChevronDown className="w-4 h-4 text-teal-700" />
                                ) : (
                                  <ChevronLeft className="w-4 h-4 text-slate-400" />
                                )}
                              </button>
                              <div>
                                <div className="flex items-center gap-2">
                                  <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                                    {obj.title}
                                  </h4>
                                  <span className="text-[11px] text-slate-500">
                                    (وزن: {toFa(obj.weight)})
                                  </span>
                                </div>
                                <div className="flex items-center gap-3 text-[11px] text-slate-500 mt-1">
                                  <span>{toFa(objIndicators.length)} شاخص KPI</span>
                                  <span aria-hidden="true">·</span>
                                  <span>{toFa(objInitiatives.length)} پروژه اجرایی</span>
                                  {cascadedChildren.length > 0 && (
                                    <>
                                      <span aria-hidden="true">·</span>
                                      <span className="text-teal-700 font-medium">
                                        {toFa(cascadedChildren.length)} زیرمجموعه متصل
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            </div>

                            <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                              <StatusBadge
                                status={statusOf(ownScore)}
                                score={ownScore}
                                size="sm"
                              />
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  onOpenAddInitiative(obj.id);
                                }}
                                className="flex items-center gap-1 text-[11px] font-medium text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200/80 px-2.5 py-1 rounded-md transition-colors mr-1"
                              >
                                <Plus className="w-3 h-3" />
                                <span>پروژه جدید</span>
                              </button>
                            </div>
                          </div>

                          {/* Expanded Tree Branches: KPIs & Initiatives */}
                          {isExpanded && (
                            <div className="p-4 space-y-4">
                              {/* 1. Branch: Indicators (KPIs) */}
                              {objIndicators.length > 0 && (
                                <div className="space-y-1.5">
                                  <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                    <Target className="w-3.5 h-3.5 text-teal-700" />
                                    <span>شاخص‌های کلیدی عملکرد (KPIs):</span>
                                  </div>
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pr-3">
                                    {objIndicators.map((ind) => {
                                      const meas = db.measurements.find(
                                        (m) =>
                                          m.indicator_id === ind.id &&
                                          m.period_id === selectedPeriodId
                                      );
                                      return (
                                        <div
                                          key={ind.id}
                                          className="p-2.5 bg-white border border-slate-200/70 rounded-lg flex items-center justify-between text-xs"
                                        >
                                          <div className="truncate pr-1">
                                            <div className="font-medium text-slate-800 truncate">
                                              {ind.title}
                                            </div>
                                            <div className="text-[10px] text-slate-500 mt-0.5">
                                              هدف: {toFa(meas?.target)} · واقعی: {toFa(meas?.actual)}{' '}
                                              {ind.unit}
                                            </div>
                                          </div>
                                          <span className="text-[11px] font-mono tabular-nums text-slate-700 font-semibold shrink-0">
                                            {ind.unit ? `${toFa(meas?.actual)} ${ind.unit}` : toFa(meas?.actual)}
                                          </span>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}

                              {/* 2. Branch: Strategic Initiatives / Projects */}
                              <div className="space-y-1.5">
                                <div className="text-[11px] font-semibold text-slate-600 flex items-center gap-1">
                                  <FolderKanban className="w-3.5 h-3.5 text-blue-700" />
                                  <span>ابتکارات و پروژه‌های عملیاتی (Initiatives):</span>
                                </div>
                                {objInitiatives.length === 0 ? (
                                  <div className="p-3 bg-white border border-dashed border-slate-200 rounded-lg text-center text-slate-400 text-xs pr-3">
                                    هنوز پروژه عملیاتی برای این هدف ثبت نشده است. با دکمه «پروژه جدید»
                                    اقدام استراتژیک اضافه کنید.
                                  </div>
                                ) : (
                                  <div className="space-y-2 pr-3">
                                    {objInitiatives.map((init) => (
                                      <div
                                        key={init.id}
                                        className="p-3 bg-white border border-slate-200 rounded-lg text-xs space-y-2 hover:border-slate-300 transition-colors"
                                      >
                                        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                          <div>
                                            <div className="font-semibold text-slate-900">
                                              {init.title}
                                            </div>
                                            <div className="text-[11px] text-slate-500 flex items-center gap-3 mt-0.5">
                                              <span className="flex items-center gap-1">
                                                <User className="w-3 h-3 text-slate-400" />
                                                <span>مالک: {init.owner}</span>
                                              </span>
                                              <span aria-hidden="true">·</span>
                                              <span className="flex items-center gap-1">
                                                <Calendar className="w-3 h-3 text-slate-400" />
                                                <span>سررسید: {init.due_date}</span>
                                              </span>
                                              {init.budget && (
                                                <>
                                                  <span aria-hidden="true">·</span>
                                                  <span className="flex items-center gap-1">
                                                    <Coins className="w-3 h-3 text-slate-400" />
                                                    <span>بودجه: {init.budget}</span>
                                                  </span>
                                                </>
                                              )}
                                            </div>
                                          </div>

                                          <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
                                            <InitiativeStatusBadge status={init.status} size="sm" />
                                            <button
                                              onClick={() => onDeleteInitiative(init.id)}
                                              className="p-1 text-slate-400 hover:text-rose-600 rounded"
                                              title="حذف پروژه"
                                            >
                                              <Trash2 className="w-3.5 h-3.5" />
                                            </button>
                                          </div>
                                        </div>

                                        {/* Progress slider bar */}
                                        <div className="flex items-center gap-3 pt-1">
                                          <div className="flex-1 bg-slate-100 h-2 rounded-full overflow-hidden">
                                            <div
                                              className={`h-full transition-all ${
                                                init.status === 'completed'
                                                  ? 'bg-blue-600'
                                                  : init.status === 'on_track'
                                                  ? 'bg-emerald-500'
                                                  : init.status === 'behind'
                                                  ? 'bg-amber-400'
                                                  : 'bg-rose-500'
                                              }`}
                                              style={{ width: `${init.progress}%` }}
                                            />
                                          </div>
                                          <div className="flex items-center gap-1 shrink-0 font-mono text-[11px] font-bold text-slate-700">
                                            <span>{toFa(init.progress)}%</span>
                                            <input
                                              type="range"
                                              min="0"
                                              max="100"
                                              value={init.progress}
                                              onChange={(e) =>
                                                onUpdateInitiativeProgress(
                                                  init.id,
                                                  Number(e.target.value)
                                                )
                                              }
                                              className="w-20 accent-teal-700 cursor-pointer"
                                              title="تنظیم درصد پیشرفت پروژه"
                                            />
                                          </div>
                                        </div>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 2. INITIATIVES & PROJECTS BOARD */}
      {subTab === 'initiatives' && (
        <div className="space-y-4">
          {/* Summary Metric Strip */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] text-slate-500">در مسیر تحقق (On Track)</div>
              <div className="text-xl font-bold font-mono text-emerald-700 mt-1">
                {toFa(onTrackCount)}{' '}
                <span className="text-xs font-normal text-slate-500">پروژه</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] text-slate-500">دارای تاخیر (Behind)</div>
              <div className="text-xl font-bold font-mono text-amber-700 mt-1">
                {toFa(behindCount)}{' '}
                <span className="text-xs font-normal text-slate-500">پروژه</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] text-slate-500">در معرض ریسک (At Risk)</div>
              <div className="text-xl font-bold font-mono text-rose-700 mt-1">
                {toFa(atRiskCount)}{' '}
                <span className="text-xs font-normal text-slate-500">پروژه</span>
              </div>
            </div>

            <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
              <div className="text-[11px] text-slate-500">تکمیل‌شده (Completed)</div>
              <div className="text-xl font-bold font-mono text-blue-700 mt-1">
                {toFa(completedCount)}{' '}
                <span className="text-xs font-normal text-slate-500">پروژه</span>
              </div>
            </div>
          </div>

          {/* Filter Bar & Action */}
          <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2">
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="جستجو در پروژه‌ها یا مجری..."
                  value={searchInitiative}
                  onChange={(e) => setSearchInitiative(e.target.value)}
                  className="text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white w-48 sm:w-60 focus:outline-none focus:ring-1 focus:ring-teal-600"
                />
              </div>

              {/* Status Filter Buttons */}
              <div className="flex items-center gap-1">
                {(['all', 'on_track', 'behind', 'at_risk', 'completed'] as const).map((st) => (
                  <button
                    key={st}
                    onClick={() => setInitiativeFilter(st)}
                    className={`px-2.5 py-1 text-xs rounded-md font-medium transition-colors ${
                      initiativeFilter === st
                        ? 'bg-slate-900 text-white'
                        : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                    }`}
                  >
                    {st === 'all'
                      ? 'همه'
                      : st === 'on_track'
                      ? 'در مسیر'
                      : st === 'behind'
                      ? 'تاخیر'
                      : st === 'at_risk'
                      ? 'ریسک'
                      : 'تکمیل'}
                  </button>
                ))}
              </div>
            </div>

            <button
              onClick={() => onOpenAddInitiative()}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm self-start sm:self-auto shrink-0"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>پروژه استراتژیک جدید</span>
            </button>
          </div>

          {/* Initiatives Table */}
          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="py-3 px-4 font-semibold">عنوان پروژه / اقدام استراتژیک</th>
                    <th className="py-3 px-4 font-semibold">هدف مرتبط</th>
                    <th className="py-3 px-4 font-semibold">مسئول / مالک</th>
                    <th className="py-3 px-4 font-semibold">سررسید</th>
                    <th className="py-3 px-4 font-semibold">بودجه</th>
                    <th className="py-3 px-4 font-semibold text-center">وضعیت</th>
                    <th className="py-3 px-4 font-semibold text-center w-36">درصد پیشرفت</th>
                    <th className="py-3 px-4 font-semibold text-left w-12">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredInitiatives.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        پروژه‌ای با این فیلتر یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredInitiatives.map((init) => {
                      const parentObj = db.objectives.find((o) => o.id === init.objective_id);
                      return (
                        <tr key={init.id} className="hover:bg-slate-50/70 transition-colors">
                          <td className="py-3 px-4 font-semibold text-slate-900">
                            {init.title}
                          </td>
                          <td className="py-3 px-4 text-slate-600 max-w-[200px] truncate">
                            {parentObj?.title || '—'}
                          </td>
                          <td className="py-3 px-4 text-slate-700">{init.owner}</td>
                          <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                            {init.due_date}
                          </td>
                          <td className="py-3 px-4 text-slate-600 font-mono tabular-nums">
                            {init.budget || '—'}
                          </td>
                          <td className="py-3 px-4 text-center">
                            <InitiativeStatusBadge status={init.status} size="sm" />
                          </td>
                          <td className="py-3 px-4 text-center">
                            <div className="flex items-center gap-2 justify-center">
                              <span className="font-mono tabular-nums font-bold text-slate-700 w-8 text-right">
                                {toFa(init.progress)}%
                              </span>
                              <input
                                type="range"
                                min="0"
                                max="100"
                                value={init.progress}
                                onChange={(e) =>
                                  onUpdateInitiativeProgress(init.id, Number(e.target.value))
                                }
                                className="w-16 accent-teal-700 cursor-pointer"
                              />
                            </div>
                          </td>
                          <td className="py-3 px-4 text-left">
                            <button
                              onClick={() => onDeleteInitiative(init.id)}
                              className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                              title="حذف پروژه"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 3. ROLL-UP MATRIX (SUBSIDIARY TO HOLDING ALIGNMENT) */}
      {subTab === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-teal-50/60 border border-teal-200/80 rounded-xl p-4 flex items-start justify-between gap-3 text-xs text-teal-900">
            <div>
              <strong>ماتریس تسری و هم‌راستایی اهداف (Goal Cascading & Roll-Up):</strong> اهداف
              شرکت‌های تابعه با ضرایب مشارکت به اهداف بالادستی هلدینگ متصل می‌شوند تا خروجی نهایی
              هلدینگ بر اساس عملکرد واقعی زیرمجموعه‌ها رول‌آپ گردد.
            </div>
            <button
              onClick={onOpenAddCascade}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm shrink-0 whitespace-nowrap"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>اتصال هدف جدید (Cascade)</span>
            </button>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-600 text-[11px]">
                    <th className="py-3 px-4">هدف بالادست (هلدینگ)</th>
                    <th className="py-3 px-4">شرکت و هدف تابعه (زیرمجموعه)</th>
                    <th className="py-3 px-4 text-center">وزن مشارکت</th>
                    <th className="py-3 px-4 text-center">امتیاز عملکرد زیرمجموعه</th>
                    <th className="py-3 px-4 text-left w-12">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {db.cascades.map((link) => {
                    const parentObj = db.objectives.find((o) => o.id === link.parent_id);
                    const childObj = db.objectives.find((o) => o.id === link.child_id);
                    const childOrg = childObj ? db.orgs.find((o) => o.id === childObj.org_id) : null;
                    const childScore = childObj
                      ? calculateObjectiveOwnScore(childObj.id, db, selectedPeriodId)
                      : null;

                    return (
                      <tr key={link.id} className="hover:bg-slate-50/70 transition-colors">
                        <td className="py-3 px-4 font-semibold text-slate-900">
                          {parentObj?.title || 'هدف نامشخص'}
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          <span className="font-semibold text-teal-800">
                            [{childOrg?.name || 'زیرمجموعه'}]:
                          </span>{' '}
                          {childObj?.title || 'هدف نامشخص'}
                        </td>
                        <td className="py-3 px-4 text-center font-mono tabular-nums font-semibold text-slate-800">
                          {toFa(link.weight)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <StatusBadge status={statusOf(childScore)} score={childScore} size="sm" />
                        </td>
                        <td className="py-3 px-4 text-left">
                          <button
                            onClick={() => onDeleteCascade(link.id)}
                            className="p-1 text-slate-400 hover:text-rose-600 rounded transition-colors"
                            title="حذف پیوند"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* 4. VISION & FOCUS AREAS */}
      {subTab === 'vision' && (
        <div className="space-y-6">
          {currentVision ? (
            <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-6">
              {/* Vision */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-teal-800 flex items-center gap-1.5 uppercase tracking-wider">
                  <Compass className="w-4 h-4 text-teal-700" />
                  بیانیه چشم‌انداز استراتژیک (Strategic Vision)
                </span>
                <p className="text-lg font-bold text-slate-900 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  «{currentVision.vision}»
                </p>
              </div>

              {/* Mission */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider">
                  <Target className="w-4 h-4 text-slate-600" />
                  بیانیه مأموریت و فلسفه وجودی (Mission Statement)
                </span>
                <p className="text-xs text-slate-600 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-200/80">
                  {currentVision.mission}
                </p>
              </div>

              {/* Core Values */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  ارزش‌های بنیادین سازمانی (Core Values)
                </span>
                <div className="flex flex-wrap gap-2 pt-1">
                  {currentVision.core_values.map((val, idx) => (
                    <span
                      key={idx}
                      className="px-3 py-1.5 rounded-lg bg-teal-50 border border-teal-200 text-teal-900 text-xs font-semibold"
                    >
                      {val}
                    </span>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl p-8 text-center text-slate-400 text-xs">
              بیانیه چشم‌انداز برای این واحد ثبت نشده است.
            </div>
          )}

          {/* Focus Areas */}
          <div className="bg-white border border-slate-200 rounded-xl p-6 shadow-xs space-y-4">
            <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Layers className="w-4 h-4 text-teal-700" />
              حوزه‌های تمرکز و ستون‌های استراتژیک (Strategic Focus Areas)
            </h3>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {(db.focusAreas || []).map((area) => (
                <div
                  key={area.id}
                  className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5"
                >
                  <div className="font-bold text-slate-900 text-xs">{area.title}</div>
                  <p className="text-[11px] text-slate-500 leading-relaxed">{area.description}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
