import React, { useState } from 'react';
import {
  TrendingUp,
  Target,
  ArrowDownRight,
  ArrowUpRight,
  Plus,
  HelpCircle,
  GitCommit,
  CheckCircle,
  AlertTriangle,
  Flame,
  Scale,
  Edit2,
  Trash2,
  Check,
  DollarSign,
  Users,
  Cpu,
  GraduationCap,
  Building2,
  ShieldCheck,
  Sparkles,
} from 'lucide-react';
import {
  ScorecardResult,
  ScoredPerspective,
  ScoredObjective,
  ScoredIndicator,
  StatusType,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { toFa } from '../scoring';

interface ScorecardViewProps {
  scorecard: ScorecardResult;
  orgName: string;
  periodName: string;
  onUpdateMeasurement: (
    indicatorId: number,
    target: number | null,
    actual: number | null
  ) => void;
  onOpenAddObjective: (perspectiveId: number) => void;
  onOpenAddIndicator: (objectiveId: number) => void;
  onDeleteIndicator: (indicatorId: number) => void;
  onDeleteObjective: (objectiveId: number) => void;
}

const IndicatorRow: React.FC<{
  indicator: ScoredIndicator;
  onSave: (target: number | null, actual: number | null) => void;
  onDelete: () => void;
}> = ({ indicator, onSave, onDelete }) => {
  const [targetVal, setTargetVal] = useState<string>(
    indicator.target !== null && indicator.target !== undefined
      ? String(indicator.target)
      : ''
  );
  const [actualVal, setActualVal] = useState<string>(
    indicator.actual !== null && indicator.actual !== undefined
      ? String(indicator.actual)
      : ''
  );
  const [isSaved, setIsSaved] = useState(false);

  // Sync state if props change
  React.useEffect(() => {
    setTargetVal(
      indicator.target !== null && indicator.target !== undefined
        ? String(indicator.target)
        : ''
    );
    setActualVal(
      indicator.actual !== null && indicator.actual !== undefined
        ? String(indicator.actual)
        : ''
    );
  }, [indicator.target, indicator.actual]);

  const handleBlurOrEnter = () => {
    const parseNum = (val: string) => {
      const trimmed = val.trim();
      if (trimmed === '') return null;
      const parsed = parseFloat(trimmed);
      return isNaN(parsed) ? null : parsed;
    };

    const newTarget = indicator.method === 'threshold' ? null : parseNum(targetVal);
    const newActual = parseNum(actualVal);

    if (newTarget !== indicator.target || newActual !== indicator.actual) {
      onSave(newTarget, newActual);
      setIsSaved(true);
      setTimeout(() => setIsSaved(false), 1500);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      (e.target as HTMLInputElement).blur();
    }
  };

  return (
    <tr className="hover:bg-slate-50/80 transition-colors border-b border-slate-100 last:border-0 text-xs">
      {/* عنوان شاخص و مشخصات */}
      <td className="py-2.5 px-3">
        <div className="font-medium text-slate-800 flex items-center gap-1.5">
          <span>{indicator.title}</span>
          {isSaved && (
            <span className="text-[10px] text-emerald-600 flex items-center gap-0.5 animate-pulse">
              <Check className="w-3 h-3" /> ذخیره شد
            </span>
          )}
        </div>
        <div className="text-[11px] text-slate-500 flex items-center gap-2 mt-0.5">
          <span>واحد: {indicator.unit || '—'}</span>
          <span aria-hidden="true">·</span>
          <span className="flex items-center gap-1">
            {indicator.higher_is_better ? (
              <>
                <ArrowUpRight className="w-3 h-3 text-teal-600" />
                <span>جهت: افزایشی (بیشتر بهتر)</span>
              </>
            ) : (
              <>
                <ArrowDownRight className="w-3 h-3 text-amber-600" />
                <span>جهت: کاهشی (کمتر بهتر)</span>
              </>
            )}
          </span>
          <span aria-hidden="true">·</span>
          <span>وزن: {toFa(indicator.weight)}</span>
        </div>
      </td>

      {/* روش محاسبه و حدود */}
      <td className="py-2.5 px-3 text-slate-600">
        {indicator.method === 'threshold' ? (
          <div>
            <span className="font-medium text-slate-700">آستانه چندسطحی</span>
            <div className="text-[11px] text-slate-500 font-mono tabular-nums mt-0.5">
              زرد: {toFa(indicator.yellow_limit)} / سبز: {toFa(indicator.green_limit)}
            </div>
          </div>
        ) : (
          <div>
            <span className="font-medium text-slate-700">درصد تحقق</span>
            <div className="text-[11px] text-slate-500 mt-0.5">
              سقف نسبت: <span className="font-mono tabular-nums">{toFa(indicator.cap, 2)}</span>
            </div>
          </div>
        )}
      </td>

      {/* مقدار هدف */}
      <td className="py-2.5 px-3">
        {indicator.method === 'threshold' ? (
          <span className="text-slate-400 font-mono text-xs">—</span>
        ) : (
          <div className="relative inline-block">
            <input
              type="number"
              step="any"
              value={targetVal}
              onChange={(e) => setTargetVal(e.target.value)}
              onBlur={handleBlurOrEnter}
              onKeyDown={handleKeyDown}
              placeholder="مقدار هدف"
              aria-label={`مقدار هدف برای شاخص ${indicator.title}`}
              className="w-24 text-center font-mono tabular-nums text-xs px-2 py-1 rounded border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 transition-colors"
            />
          </div>
        )}
      </td>

      {/* مقدار واقعی */}
      <td className="py-2.5 px-3">
        <div className="relative inline-block">
          <input
            type="number"
            step="any"
            value={actualVal}
            onChange={(e) => setActualVal(e.target.value)}
            onBlur={handleBlurOrEnter}
            onKeyDown={handleKeyDown}
            placeholder="مقدار واقعی"
            aria-label={`مقدار واقعی برای شاخص ${indicator.title}`}
            className="w-24 text-center font-mono tabular-nums text-xs px-2 py-1 rounded border border-slate-200 bg-white hover:border-slate-300 focus:outline-none focus:ring-1 focus:ring-teal-600 focus:border-teal-600 transition-colors"
          />
        </div>
      </td>

      {/* امتیاز و وضعیت شاخص */}
      <td className="py-2.5 px-3">
        <StatusBadge status={indicator.status} score={indicator.score} size="sm" />
      </td>

      {/* اکشن‌ها */}
      <td className="py-2.5 px-3 text-left">
        <button
          onClick={onDelete}
          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
          title="حذف شاخص"
          aria-label={`حذف شاخص ${indicator.title}`}
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </td>
    </tr>
  );
};

const getPerspectiveVisuals = (name: string) => {
  if (name.includes('مالی')) {
    return {
      icon: DollarSign,
      color: 'emerald',
      iconBg: 'bg-emerald-100 text-emerald-800',
      borderAccent: 'border-emerald-200/90',
      barColor: 'bg-emerald-600',
      gradient: 'from-emerald-500/10 to-transparent',
    };
  }
  if (name.includes('مشتری') || name.includes('بازار')) {
    return {
      icon: Users,
      color: 'sky',
      iconBg: 'bg-sky-100 text-sky-800',
      borderAccent: 'border-sky-200/90',
      barColor: 'bg-sky-600',
      gradient: 'from-sky-500/10 to-transparent',
    };
  }
  if (name.includes('فرایند') || name.includes('داخلی')) {
    return {
      icon: Cpu,
      color: 'amber',
      iconBg: 'bg-amber-100 text-amber-800',
      borderAccent: 'border-amber-200/90',
      barColor: 'bg-amber-600',
      gradient: 'from-amber-500/10 to-transparent',
    };
  }
  return {
    icon: GraduationCap,
    color: 'violet',
    iconBg: 'bg-violet-100 text-violet-800',
    borderAccent: 'border-violet-200/90',
    barColor: 'bg-violet-600',
    gradient: 'from-violet-500/10 to-transparent',
  };
};

export const ScorecardView: React.FC<ScorecardViewProps> = ({
  scorecard,
  orgName,
  periodName,
  onUpdateMeasurement,
  onOpenAddObjective,
  onOpenAddIndicator,
  onDeleteIndicator,
  onDeleteObjective,
}) => {
  return (
    <div className="space-y-6">
      {/* Top Banner & Summary Card */}
      <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-teal-950 text-white rounded-2xl p-6 border border-slate-700/60 shadow-lg relative overflow-hidden flex flex-col md:flex-row md:items-center justify-between gap-5">
        <div className="absolute top-0 left-0 w-80 h-80 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 space-y-1.5 max-w-2xl">
          <div className="flex items-center gap-2 text-xs text-teal-300 font-medium">
            <span className="flex items-center gap-1">
              <Building2 className="w-3.5 h-3.5" />
              {orgName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="bg-teal-500/20 text-teal-200 border border-teal-400/30 px-2 py-0.5 rounded-full font-mono text-[11px]">
              دوره: {periodName}
            </span>
            <span aria-hidden="true">·</span>
            <span className="text-slate-300">کارت امتیازی متوازن</span>
          </div>
          <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight">
            کارنامه عملکردی و ارزیابی استراتژیک
          </h2>
          <p className="text-xs text-slate-300 leading-relaxed">
            ارزیابی متوازن ۴ بعد کاپلان و نورتون با محاسبه خودکار انحراف، تحقق اهداف، رتبه‌بندی عملکردی و اتصال مستقیم به پلتفرم تسری سازمانی.
          </p>
        </div>

        {/* Big Consolidated Score Gauge */}
        <div className="relative z-10 flex items-center gap-4 bg-white/10 backdrop-blur-md border border-white/15 rounded-2xl p-4 shrink-0 shadow-md">
          <div className="text-right">
            <div className="text-[11px] font-bold text-teal-200 uppercase tracking-wider">
              امتیاز کل کارت متوازن
            </div>
            <div className="text-[10px] text-slate-300 mt-0.5 font-mono">مقیاس استاندارد: ۰ الی ۱۲۰</div>
          </div>
          <div className="text-left">
            <StatusBadge
              status={scorecard.status}
              score={scorecard.score}
              size="lg"
            />
          </div>
        </div>
      </div>

      {/* Perspective KPI Strips (4 Perspectives Quick Stats) */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {scorecard.perspectives.map(({ perspective: p, score, status, objectives }) => {
          const totalIndicators = objectives.reduce(
            (acc, o) => acc + o.indicators.length,
            0
          );
          const vis = getPerspectiveVisuals(p.name);
          const VisIcon = vis.icon;

          return (
            <div
              key={p.id}
              className={`bg-white border ${vis.borderAccent} rounded-2xl p-4 shadow-2xs relative overflow-hidden flex flex-col justify-between hover:shadow-md transition-all group`}
            >
              <div className="flex items-center justify-between gap-2 mb-3">
                <div className="flex items-center gap-2">
                  <div
                    className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 ${vis.iconBg} shadow-3xs group-hover:scale-105 transition-transform`}
                  >
                    <VisIcon className="w-4 h-4" />
                  </div>
                  <span className="text-xs font-bold text-slate-900">
                    منظر {p.name}
                  </span>
                </div>
                <StatusBadge status={status} score={score} size="sm" />
              </div>

              <div className="text-[11px] text-slate-500 line-clamp-2 min-h-[32px] leading-relaxed">
                {p.description || `اهداف و شاخص‌های کلیدی حوزه ${p.name}`}
              </div>

              <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600 font-medium">
                <span>{toFa(objectives.length)} هدف استراتژیک</span>
                <span aria-hidden="true" className="text-slate-300">·</span>
                <span>{toFa(totalIndicators)} شاخص کلیدی</span>
              </div>
            </div>
          );
        })}
      </div>

      {/* 4 Perspectives Detailed Tables */}
      <div className="space-y-6">
        {scorecard.perspectives.map(({ perspective: p, objectives, score, status }) => {
          const vis = getPerspectiveVisuals(p.name);
          const VisIcon = vis.icon;

          return (
            <div
              key={p.id}
              className="bg-white border border-slate-200/90 rounded-2xl shadow-2xs overflow-hidden"
            >
              {/* Header of Perspective */}
              <div className="bg-slate-50/90 px-5 py-3.5 border-b border-slate-200/80 flex flex-wrap items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className={`w-8 h-8 rounded-xl ${vis.iconBg} flex items-center justify-center shadow-3xs`}>
                    <VisIcon className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="text-sm font-black text-slate-900 flex items-center gap-2">
                      منظر {p.name}
                    </h3>
                    <span className="text-[10px] text-slate-500 hidden sm:inline">
                      میانگین وزنی اهداف استراتژیک این منظر بر اساس تحقق شاخص‌ها
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={status} score={score} size="sm" />
                  <button
                    onClick={() => onOpenAddObjective(p.id)}
                    className="flex items-center gap-1.5 text-xs font-bold text-teal-800 hover:text-teal-900 bg-white hover:bg-teal-50 border border-slate-200 px-3 py-1.5 rounded-xl transition-all shadow-3xs hover:shadow-2xs"
                  >
                    <Plus className="w-3.5 h-3.5 text-teal-600 stroke-[2.5]" />
                    <span>هدف جدید در این منظر</span>
                  </button>
                </div>
              </div>

              {/* List of Objectives */}
              <div className="divide-y divide-slate-100">
                {objectives.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400">
                    هیچ هدف استراتژیکی در منظر «{p.name}» ثبت نشده است. با دکمه «هدف
                    جدید در این منظر» اولین هدف را اضافه کنید.
                  </div>
                ) : (
                objectives.map((obj) => (
                  <div key={obj.id} className="p-5 space-y-3">
                    {/* Objective Title & Score Bar */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                      <div className="flex items-start gap-2.5">
                        <div className="w-6 h-6 rounded bg-slate-100 flex items-center justify-center text-slate-600 font-bold text-xs mt-0.5 shrink-0">
                          <Target className="w-3.5 h-3.5 text-teal-700" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-sm font-bold text-slate-900">
                              {obj.title}
                            </h4>
                            <span className="text-[11px] text-slate-500">
                              (وزن استراتژیک: {toFa(obj.weight)})
                            </span>
                          </div>
                          {obj.description && (
                            <p className="text-xs text-slate-500 mt-0.5">
                              {obj.description}
                            </p>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <span>امتیاز شاخص‌ها:</span>
                          <StatusBadge
                            status={obj.status}
                            score={obj.score}
                            size="sm"
                          />
                        </div>

                        <button
                          onClick={() => onOpenAddIndicator(obj.id)}
                          className="flex items-center gap-1 text-[11px] font-medium text-teal-700 hover:text-teal-800 bg-teal-50 hover:bg-teal-100 px-2.5 py-1 rounded transition-colors mr-2"
                        >
                          <Plus className="w-3 h-3" />
                          <span>شاخص جدید</span>
                        </button>

                        <button
                          onClick={() => onDeleteObjective(obj.id)}
                          className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="حذف این هدف استراتژیک"
                          aria-label={`حذف هدف ${obj.title}`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {/* Indicators Table */}
                    {obj.indicators.length > 0 ? (
                      <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
                        <table className="w-full text-right border-collapse">
                          <thead>
                            <tr className="bg-slate-50/70 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                              <th className="py-2 px-3 text-right">عنوان شاخص و ویژگی‌ها</th>
                              <th className="py-2 px-3 text-right">روش سنجش و حدود</th>
                              <th className="py-2 px-3 text-center">هدف (Target)</th>
                              <th className="py-2 px-3 text-center">واقعی (Actual)</th>
                              <th className="py-2 px-3 text-right">امتیاز و وضعیت</th>
                              <th className="py-2 px-3 text-left w-12">عملیات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {obj.indicators.map((ind) => (
                              <IndicatorRow
                                key={`${ind.id}-${scorecard.period_id}`}
                                indicator={ind}
                                onSave={(target, actual) =>
                                  onUpdateMeasurement(ind.id, target, actual)
                                }
                                onDelete={() => onDeleteIndicator(ind.id)}
                              />
                            ))}
                          </tbody>
                        </table>
                      </div>
                    ) : (
                      <div className="bg-slate-50/60 border border-dashed border-slate-200 rounded-lg p-3 text-center text-xs text-slate-500">
                        هنوز شاخصی برای این هدف ثبت نشده است. بر روی «شاخص جدید» کلیک کنید.
                      </div>
                    )}

                    {/* Cascaded alignment from subsidiaries (تراز شده با زیرمجموعه‌ها) */}
                    {obj.children.length > 0 && (
                      <div className="bg-teal-50/40 border border-teal-100 rounded-lg p-3 text-xs space-y-2 mt-2">
                        <div className="flex items-center justify-between">
                          <span className="font-semibold text-teal-900 flex items-center gap-1.5">
                            <GitCommit className="w-3.5 h-3.5 text-teal-700" />
                            اهداف هم‌راستا از زیرمجموعه‌ها (Cascaded Alignment)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <span className="text-[11px] text-teal-800">
                              امتیاز تجمیعی تراز:
                            </span>
                            <StatusBadge
                              status={obj.aligned_status}
                              score={obj.aligned_score}
                              size="sm"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 pt-1">
                          {obj.children.map((child) => (
                            <div
                              key={child.objective_id}
                              className="bg-white border border-teal-200/60 rounded p-2 flex items-center justify-between text-xs"
                            >
                              <div>
                                <div className="font-medium text-slate-800">
                                  {child.title}
                                </div>
                                <div className="text-[10px] text-slate-500">
                                  {child.org_name} · ضریب وزن: {toFa(child.weight)}
                                </div>
                              </div>
                              <span className="font-mono tabular-nums text-teal-800 font-semibold">
                                {toFa(child.score)}
                              </span>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        );
      })}
      </div>
    </div>
  );
};
