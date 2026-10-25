import React from 'react';
import {
  GitFork,
  Building2,
  Briefcase,
  ArrowRight,
  Plus,
  Trash2,
  Info,
  Scale,
  Sparkles,
} from 'lucide-react';
import {
  Cascade,
  DatabaseState,
  Objective,
  OrgUnit,
  Period,
} from '../types';
import { StatusBadge } from './StatusBadge';
import { calculateObjectiveOwnScore, statusOf, toFa } from '../scoring';

interface AlignmentCascadeViewProps {
  db: DatabaseState;
  selectedPeriodId: number;
  onOpenAddCascade: () => void;
  onDeleteCascade: (cascadeId: number) => void;
}

export const AlignmentCascadeView: React.FC<AlignmentCascadeViewProps> = ({
  db,
  selectedPeriodId,
  onOpenAddCascade,
  onDeleteCascade,
}) => {
  const holdingOrgs = db.orgs.filter((o) => o.parent_id === null);
  const orgMap = new Map(db.orgs.map((o) => [o.id, o.name]));
  const period = db.periods.find((p) => p.id === selectedPeriodId);

  // Group parent objectives that have cascade links or belong to holding
  const parentObjectives = db.objectives.filter((obj) => {
    const org = db.orgs.find((o) => o.id === obj.org_id);
    return org?.parent_id === null; // holding objectives
  });

  return (
    <div className="space-y-6">
      {/* Overview Card */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>مدیریت استراتژیک هلدینگ</span>
            <span aria-hidden="true">·</span>
            <span>دوره: {period?.name || '—'}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <GitFork className="w-5 h-5 text-teal-700" />
            ماتریس هم‌راستایی و تسری سازمانی (Cascade Alignment)
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            تراز اهداف استراتژیک هلدینگ با اهداف عملیاتی شرکت‌های تابعه بر مبنای
            ضرایب سهم مشارکت (Participation Weight). این مدل تضمین می‌کند اهداف
            زیرمجموعه‌ها مستقیماً در خدمت اهداف کلان هلدینگ قرار دارند.
          </p>
        </div>

        <button
          onClick={onOpenAddCascade}
          className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
        >
          <Plus className="w-4 h-4" />
          <span>افزودن پیوند هم‌راستایی</span>
        </button>
      </div>

      {/* Guide Info */}
      <div className="bg-teal-50/50 border border-teal-200/80 rounded-xl p-4 flex items-start gap-3 text-xs text-teal-900">
        <Info className="w-4 h-4 text-teal-700 shrink-0 mt-0.5" />
        <div className="leading-relaxed">
          <strong>نحوه محاسبه امتیاز تراز‌شده:</strong> هر هدف در هلدینگ علاوه بر
          شاخص‌های مستقیم خود، یک «امتیاز هم‌راستایی تراز‌شده» دارد که از میانگین
          وزنی عملکرد اهداف متناظر در شرکت‌های زیرمجموعه حاصل می‌شود.
        </div>
      </div>

      {/* Alignment Cards per Parent Objective */}
      <div className="space-y-4">
        {parentObjectives.map((parentObj) => {
          const parentOrgName = orgMap.get(parentObj.org_id) || 'هلدینگ';
          const parentOwnScore = calculateObjectiveOwnScore(
            parentObj.id,
            db,
            selectedPeriodId
          );

          // Get child objectives cascaded to this parent
          const cascadeLinks = db.cascades.filter(
            (c) => c.parent_id === parentObj.id
          );

          const childData = cascadeLinks.map((link) => {
            const childObj = db.objectives.find((o) => o.id === link.child_id);
            const childOrg = childObj
              ? db.orgs.find((o) => o.id === childObj.org_id)
              : null;
            const childScore = childObj
              ? calculateObjectiveOwnScore(childObj.id, db, selectedPeriodId)
              : null;

            return {
              cascadeId: link.id,
              childObj,
              childOrg,
              weight: link.weight,
              score: childScore,
            };
          });

          // Aligned score
          const validChildWeights = childData.filter(
            (c) => c.score !== null && c.weight > 0
          );
          const totalChildWeight = validChildWeights.reduce(
            (sum, c) => sum + c.weight,
            0
          );
          const alignedScore =
            totalChildWeight > 0
              ? Math.round(
                  (validChildWeights.reduce(
                    (sum, c) => sum + (c.score || 0) * c.weight,
                    0
                  ) /
                    totalChildWeight) *
                    10
                ) / 10
              : null;

          return (
            <div
              key={parentObj.id}
              className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
            >
              {/* Parent Objective Header */}
              <div className="bg-slate-50/80 p-4 border-b border-slate-200 flex flex-col md:flex-row md:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-teal-700 text-white flex items-center justify-center font-bold text-xs shrink-0 mt-0.5">
                    <Building2 className="w-4 h-4" />
                  </div>
                  <div>
                    <div className="text-[11px] text-teal-800 font-semibold">
                      {parentOrgName} (هدف بالادست)
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 mt-0.5">
                      {parentObj.title}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-right">
                    <span className="text-[11px] text-slate-500 block">
                      امتیاز شاخص‌های مستقیم:
                    </span>
                    <StatusBadge
                      status={statusOf(parentOwnScore)}
                      score={parentOwnScore}
                      size="sm"
                    />
                  </div>
                  <div className="h-8 w-px bg-slate-200" />
                  <div className="text-right">
                    <span className="text-[11px] text-teal-800 font-semibold block">
                      امتیاز تراز شرکت‌های تابعه:
                    </span>
                    <StatusBadge
                      status={statusOf(alignedScore)}
                      score={alignedScore}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              {/* Children Cascaded Objectives Table */}
              <div className="p-4">
                {childData.length === 0 ? (
                  <div className="py-6 text-center text-xs text-slate-400">
                    هنوز هدفی از شرکت‌های تابعه به این هدف بالادستی متصل نشده است.
                  </div>
                ) : (
                  <div className="overflow-x-auto border border-slate-200/80 rounded-lg">
                    <table className="w-full text-right text-xs">
                      <thead>
                        <tr className="bg-slate-50/60 border-b border-slate-200/80 text-[11px] font-semibold text-slate-600">
                          <th className="py-2.5 px-3">شرکت / واحد تابعه</th>
                          <th className="py-2.5 px-3">هدف تسری‌یافته متناظر</th>
                          <th className="py-2.5 px-3 text-center">وزن مشارکت در تراز</th>
                          <th className="py-2.5 px-3 text-center">امتیاز عملکرد زیرمجموعه</th>
                          <th className="py-2.5 px-3 text-left w-12">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {childData.map((item) => (
                          <tr
                            key={item.cascadeId}
                            className="hover:bg-slate-50/80 transition-colors"
                          >
                            <td className="py-3 px-3 font-medium text-slate-800">
                              <div className="flex items-center gap-1.5">
                                <Briefcase className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                                <span>{item.childOrg?.name || 'نامشخص'}</span>
                              </div>
                            </td>
                            <td className="py-3 px-3 text-slate-700">
                              {item.childObj?.title || 'هدف نامشخص'}
                            </td>
                            <td className="py-3 px-3 text-center font-mono tabular-nums font-semibold text-slate-700">
                              {toFa(item.weight)}
                            </td>
                            <td className="py-3 px-3 text-center">
                              <StatusBadge
                                status={statusOf(item.score)}
                                score={item.score}
                                size="sm"
                              />
                            </td>
                            <td className="py-3 px-3 text-left">
                              <button
                                onClick={() => onDeleteCascade(item.cascadeId)}
                                className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                                title="حذف این پیوند هم‌راستایی"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
