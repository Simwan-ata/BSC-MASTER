import React from 'react';
import type { DatabaseState } from '../types';
import { buildStrategicTraceabilitySummary } from '../traceability';

interface Props {
  db: DatabaseState;
  selectedOrgId: number;
}

const percent = (numerator: number, denominator: number) =>
  denominator > 0 ? Math.round((numerator / denominator) * 100) : null;

export const StrategicTraceabilitySummary: React.FC<Props> = ({ db, selectedOrgId }) => {
  const summary = buildStrategicTraceabilitySummary(db, selectedOrgId);
  const objectiveKpiCoverage = percent(summary.objectivesWithIndicators, summary.objectiveCount);
  const objectiveInitiativeCoverage = percent(summary.objectivesWithInitiatives, summary.objectiveCount);
  const hasAnalysis = summary.analysisRows.some((row) => row.total > 0);

  return (
    <section className="mb-5 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" dir="rtl">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-sm font-bold text-slate-900">ردیابی راهبرد تا اجرا</h2>
          <p className="mt-1 text-xs leading-5 text-slate-500">
            پوشش پیوندهای تحلیل راهبردی، اهداف کارت امتیازی، شاخص‌ها و ابتکارهای اجرایی.
          </p>
        </div>
        <span className="rounded-full bg-slate-100 px-3 py-1 text-[10px] font-semibold text-slate-600">
          گزارش تشخیصی؛ نه امتیاز عملکرد
        </span>
      </div>

      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] text-slate-500">اهداف سازمان</div>
          <div className="mt-1 text-lg font-bold text-slate-900">{summary.objectiveCount}</div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] text-slate-500">اهداف دارای شاخص</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {summary.objectivesWithIndicators} / {summary.objectiveCount}
            <span className="mr-2 text-xs font-medium text-slate-500">
              {objectiveKpiCoverage === null ? '—' : `${objectiveKpiCoverage}%`}
            </span>
          </div>
        </div>
        <div className="rounded-xl bg-slate-50 p-3">
          <div className="text-[11px] text-slate-500">اهداف دارای ابتکار اجرایی</div>
          <div className="mt-1 text-lg font-bold text-slate-900">
            {summary.objectivesWithInitiatives} / {summary.objectiveCount}
            <span className="mr-2 text-xs font-medium text-slate-500">
              {objectiveInitiativeCoverage === null ? '—' : `${objectiveInitiativeCoverage}%`}
            </span>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[420px] text-right text-xs">
          <thead>
            <tr className="border-b border-slate-200 text-slate-500">
              <th className="px-2 py-2 font-semibold">منبع تحلیل</th>
              <th className="px-2 py-2 text-center font-semibold">تعداد</th>
              <th className="px-2 py-2 text-center font-semibold">متصل به هدف</th>
              <th className="px-2 py-2 text-center font-semibold">پوشش</th>
            </tr>
          </thead>
          <tbody>
            {summary.analysisRows.map((row) => {
              const coverage = percent(row.linked, row.total);
              return (
                <tr key={row.key} className="border-b border-slate-100 last:border-0">
                  <td className="px-2 py-2.5 text-slate-700">{row.label}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{row.total}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">{row.linked}</td>
                  <td className="px-2 py-2.5 text-center tabular-nums">
                    {coverage === null ? '—' : `${coverage}%`}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      {!hasAnalysis && (
        <p className="mt-3 rounded-lg bg-amber-50 px-3 py-2 text-[11px] leading-5 text-amber-800">
          برای این سازمان هنوز داده تحلیلی ثبت نشده است؛ درصد پوشش در این وضعیت قابل تفسیر نیست.
        </p>
      )}
      <p className="mt-3 text-[10px] leading-5 text-slate-400">
        این گزارش فقط پیوندهای ثبت‌شده را می‌شمارد. وجود پیوند به‌تنهایی صحت منطقی یا اثربخشی راهبرد را اثبات نمی‌کند.
      </p>
    </section>
  );
};
