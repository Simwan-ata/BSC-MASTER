import React, { useState } from 'react';
import {
  Network,
  ArrowUp,
  Plus,
  Trash2,
  Info,
  Layers,
  Sparkles,
  Link as LinkIcon,
  HelpCircle,
} from 'lucide-react';
import { Cause, Objective, Perspective, ScorecardResult } from '../types';
import { StatusBadge } from './StatusBadge';
import { toFa } from '../scoring';

interface StrategyMapViewProps {
  scorecard: ScorecardResult;
  causes: Cause[];
  allObjectives: Objective[];
  orgName: string;
  onOpenAddCause: () => void;
  onDeleteCause: (causeId: number) => void;
}

export const StrategyMapView: React.FC<StrategyMapViewProps> = ({
  scorecard,
  causes,
  allObjectives,
  orgName,
  onOpenAddCause,
  onDeleteCause,
}) => {
  const [selectedObjId, setSelectedObjId] = useState<number | null>(null);

  // Flatten all objectives in current scorecard
  const currentObjectives = scorecard.perspectives.flatMap((p) => p.objectives);
  const getObjectiveTitle = (id: number) =>
    allObjectives.find((o) => o.id === id)?.title || 'هدف ناشناخته';

  // Sort perspectives from top (Financial = 1) to bottom (Learning & Growth = 4)
  const perspectivesReversed = [...scorecard.perspectives].sort(
    (a, b) => a.perspective.order - b.perspective.order
  );

  return (
    <div className="space-y-6">
      {/* Overview & Action Header */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>نقشه استراتژی سازمانی (Strategy Map)</span>
            <span aria-hidden="true">·</span>
            <span>{orgName}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Network className="w-5 h-5 text-teal-700" />
            نقشه روابط علت‌ومعلولی (کاپلان و نورتون)
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            جهت زنجیره ارزش و محرک‌های استراتژیک از لایه پایه (رشد و یادگیری) به سمت
            فرایندهای داخلی، ارتقای ارزش مشتری و نهایتاً دستاوردهای مالی هلدینگ است.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenAddCause}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm whitespace-nowrap"
          >
            <Plus className="w-4 h-4" />
            <span>افزودن رابطه علت‌ومعلولی</span>
          </button>
        </div>
      </div>

      {/* Guide strip */}
      <div className="bg-slate-50 border border-slate-200/80 rounded-xl p-3.5 flex items-center justify-between text-xs text-slate-600">
        <div className="flex items-center gap-2">
          <Info className="w-4 h-4 text-teal-700 shrink-0" />
          <span>
            جهت حرکت زنجیره خلق ارزش: <strong>رشد و یادگیری</strong> ←{' '}
            <strong>فرایندهای داخلی</strong> ← <strong>مشتری</strong> ←{' '}
            <strong>مالی</strong>. برای مشاهده زنجیره روابط، روی هر کارت کلیک کنید.
          </span>
        </div>
        <div className="flex items-center gap-2 text-[11px] text-slate-500">
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-teal-600 inline-block" />
            هدف اثرپذیر
          </span>
          <span className="flex items-center gap-1">
            <span className="w-2.5 h-2.5 rounded-full bg-amber-500 inline-block" />
            هدف پیش‌نیاز/محرک
          </span>
        </div>
      </div>

      {/* 4 Lanes of Strategy Map */}
      <div className="space-y-4 relative">
        {perspectivesReversed.map(({ perspective: p, objectives }, idx) => {
          return (
            <div
              key={p.id}
              className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden"
            >
              <div className="bg-slate-50/90 px-4 py-2.5 border-b border-slate-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded-md bg-teal-700 text-white flex items-center justify-center font-bold text-xs">
                    {toFa(p.order, 0)}
                  </span>
                  <span className="font-bold text-slate-900 text-sm">
                    منظر {p.name}
                  </span>
                  <span className="text-slate-400">·</span>
                  <span className="text-slate-500 text-[11px]">
                    {p.description}
                  </span>
                </div>
                <div className="text-[11px] text-slate-500">
                  {toFa(objectives.length)} هدف
                </div>
              </div>

              {/* Lane Objectives Grid */}
              <div className="p-4">
                {objectives.length === 0 ? (
                  <div className="py-4 text-center text-xs text-slate-400">
                    هدفی در این منظر ثبت نشده است.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {objectives.map((obj) => {
                      const isSelected = selectedObjId === obj.id;
                      // Outgoing causes: obj affects other objectives (obj -> to_id)
                      const outgoing = causes
                        .filter((c) => c.from_id === obj.id)
                        .map((c) => ({
                          causeId: c.id,
                          targetId: c.to_id,
                          targetTitle: getObjectiveTitle(c.to_id),
                        }));

                      // Incoming causes: other objectives affect obj (from_id -> obj)
                      const incoming = causes
                        .filter((c) => c.to_id === obj.id)
                        .map((c) => ({
                          causeId: c.id,
                          sourceId: c.from_id,
                          sourceTitle: getObjectiveTitle(c.from_id),
                        }));

                      const isInfluenced =
                        selectedObjId !== null &&
                        incoming.some((inc) => inc.sourceId === selectedObjId);
                      const isCauseOfSelected =
                        selectedObjId !== null &&
                        outgoing.some((out) => out.targetId === selectedObjId);

                      let borderHighlight = 'border-slate-200';
                      if (isSelected) {
                        borderHighlight = 'ring-2 ring-teal-600 border-teal-600 bg-teal-50/20';
                      } else if (isInfluenced) {
                        borderHighlight = 'border-teal-400 bg-teal-50/40 ring-1 ring-teal-400';
                      } else if (isCauseOfSelected) {
                        borderHighlight = 'border-amber-400 bg-amber-50/40 ring-1 ring-amber-400';
                      }

                      return (
                        <div
                          key={obj.id}
                          onClick={() =>
                            setSelectedObjId(
                              selectedObjId === obj.id ? null : obj.id
                            )
                          }
                          className={`cursor-pointer rounded-xl border p-4 transition-all duration-150 flex flex-col justify-between gap-3 shadow-xs ${borderHighlight} hover:shadow-md`}
                        >
                          <div>
                            <div className="flex items-start justify-between gap-2 mb-2">
                              <h4 className="text-xs font-bold text-slate-900 leading-snug">
                                {obj.title}
                              </h4>
                              <StatusBadge
                                status={obj.status}
                                score={obj.score}
                                size="sm"
                              />
                            </div>

                            {obj.description && (
                              <p className="text-[11px] text-slate-500 line-clamp-2 leading-relaxed">
                                {obj.description}
                              </p>
                            )}
                          </div>

                          {/* Connections summary */}
                          <div className="pt-2 border-t border-slate-100 text-[11px] space-y-1.5">
                            {/* Outgoing impacts */}
                            {outgoing.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-teal-800 flex items-center gap-1">
                                  <ArrowUp className="w-3 h-3 text-teal-600" />
                                  اثر مستقیم بر:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {outgoing.map((out) => (
                                    <span
                                      key={out.causeId}
                                      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-teal-50 text-teal-900 border border-teal-200/60 text-[10px]"
                                    >
                                      <span className="truncate max-w-[160px]">
                                        {out.targetTitle}
                                      </span>
                                      <button
                                        onClick={(e) => {
                                          e.stopPropagation();
                                          onDeleteCause(out.causeId);
                                        }}
                                        className="text-teal-400 hover:text-rose-600"
                                        title="حذف این رابطه"
                                      >
                                        ×
                                      </button>
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Incoming drivers */}
                            {incoming.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[10px] font-semibold text-slate-500">
                                  محرک‌های پشتیبان:
                                </span>
                                <div className="flex flex-wrap gap-1">
                                  {incoming.map((inc) => (
                                    <span
                                      key={inc.causeId}
                                      className="inline-block px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 text-[10px] truncate max-w-[180px]"
                                    >
                                      {inc.sourceTitle}
                                    </span>
                                  ))}
                                </div>
                              </div>
                            )}

                            {outgoing.length === 0 && incoming.length === 0 && (
                              <span className="text-slate-400 text-[10px]">
                                بدون ارتباط ثبت‌شده
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
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
