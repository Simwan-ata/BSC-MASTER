import React from 'react';
import {
  Layers,
  Network,
  GitFork,
  BarChart3,
  Printer,
  Download,
  Plus,
  Calendar,
  Compass,
  Sparkles,
  ChevronDown,
  ShieldCheck,
  FileSpreadsheet,
} from 'lucide-react';
import { AppLogo } from './AppLogo';
import { Period } from '../types';

interface HeaderProps {
  activeTab: 'scorecard' | 'map' | 'cascade' | 'initiatives' | 'analytics' | 'strategy_tools';
  setActiveTab: (tab: 'scorecard' | 'map' | 'cascade' | 'initiatives' | 'analytics' | 'strategy_tools') => void;
  periods: Period[];
  selectedPeriodId: number;
  onSelectPeriod: (id: number) => void;
  onOpenNewObjective: () => void;
  onOpenNewIndicator: () => void;
  onOpenBackup: () => void;
  onPrint: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  setActiveTab,
  periods,
  selectedPeriodId,
  onSelectPeriod,
  onOpenNewObjective,
  onOpenNewIndicator,
  onOpenBackup,
  onPrint,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-md border-b border-slate-200/90 shadow-3xs px-4 sm:px-6 py-2.5 no-print">
      <div className="max-w-[1560px] mx-auto flex items-center justify-between gap-4">
        {/* Zone 1: Professional Enterprise Logo & Brand Mark */}
        <div className="flex items-center gap-3 shrink-0">
          <AppLogo size="md" />
        </div>

        {/* Zone 2: Navigation Hub (Clean, High-Fidelity Enterprise Tabs) */}
        <nav className="hidden xl:flex items-center gap-1 p-1 bg-slate-100/90 rounded-xl border border-slate-200/70 shadow-inner">
          {/* 1. Scorecard (BSC) */}
          <button
            onClick={() => setActiveTab('scorecard')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'scorecard'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'scorecard'
                  ? 'bg-teal-50 text-teal-700'
                  : 'text-slate-500 group-hover:text-teal-700'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
            </div>
            <span>کارت امتیازی (BSC)</span>
            {activeTab === 'scorecard' && (
              <span className="w-1.5 h-1.5 rounded-full bg-teal-600 animate-pulse" />
            )}
          </button>

          {/* 2. Cascade Platform */}
          <button
            onClick={() => setActiveTab('cascade')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'cascade'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'cascade'
                  ? 'bg-blue-50 text-blue-700'
                  : 'text-slate-500 group-hover:text-blue-700'
              }`}
            >
              <GitFork className="w-3.5 h-3.5" />
            </div>
            <span>پلتفرم Cascade (هم‌راستایی)</span>
            {activeTab === 'cascade' && (
              <span className="w-1.5 h-1.5 rounded-full bg-blue-600 animate-pulse" />
            )}
          </button>

          {/* 3. Initiatives & Gantt Portfolio */}
          <button
            onClick={() => setActiveTab('initiatives')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'initiatives'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'initiatives'
                  ? 'bg-emerald-50 text-emerald-700'
                  : 'text-slate-500 group-hover:text-emerald-700'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
            </div>
            <span>سبد ابتکارات و گانت چارت</span>
            {activeTab === 'initiatives' && (
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-600 animate-pulse" />
            )}
          </button>

          {/* 4. Strategy Map */}
          <button
            onClick={() => setActiveTab('map')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'map'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'map'
                  ? 'bg-sky-50 text-sky-700'
                  : 'text-slate-500 group-hover:text-sky-700'
              }`}
            >
              <Network className="w-3.5 h-3.5" />
            </div>
            <span>نقشه استراتژی</span>
            {activeTab === 'map' && (
              <span className="w-1.5 h-1.5 rounded-full bg-sky-600 animate-pulse" />
            )}
          </button>

          {/* 5. Analytics Dashboard */}
          <button
            onClick={() => setActiveTab('analytics')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'analytics'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'analytics'
                  ? 'bg-violet-50 text-violet-700'
                  : 'text-slate-500 group-hover:text-violet-700'
              }`}
            >
              <BarChart3 className="w-3.5 h-3.5" />
            </div>
            <span>داشبورد تحلیلی و گپ‌ها</span>
            {activeTab === 'analytics' && (
              <span className="w-1.5 h-1.5 rounded-full bg-violet-600 animate-pulse" />
            )}
          </button>

          {/* 6. Strategic Suite & Analytical Models */}
          <button
            onClick={() => setActiveTab('strategy_tools')}
            className={`group relative flex items-center gap-2 px-3.5 py-1.5 text-xs font-semibold rounded-lg transition-all whitespace-nowrap shrink-0 ${
              activeTab === 'strategy_tools'
                ? 'bg-white text-slate-900 shadow-xs border border-slate-200/80 ring-1 ring-slate-950/5'
                : 'text-slate-600 hover:text-slate-950 hover:bg-slate-200/60'
            }`}
          >
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center transition-colors ${
                activeTab === 'strategy_tools'
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-slate-500 group-hover:text-indigo-700'
              }`}
            >
              <Compass className="w-3.5 h-3.5" />
            </div>
            <span>سوئیت تحلیل استراتژیک هلدینگ</span>
            {activeTab === 'strategy_tools' && (
              <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-pulse" />
            )}
          </button>
        </nav>

        {/* Zone 3: Period Selector & Primary Enterprise Actions */}
        <div className="flex items-center gap-2.5 shrink-0">
          {/* Period Selector with refined styling */}
          <div className="flex items-center gap-2 bg-slate-50 hover:bg-slate-100/80 border border-slate-200/90 rounded-xl px-2.5 py-1.5 transition-colors shadow-3xs">
            <div className="w-5 h-5 rounded-md bg-white border border-slate-200 flex items-center justify-center text-slate-600 shadow-3xs">
              <Calendar className="w-3 h-3 text-teal-600" />
            </div>
            <span className="text-[11px] text-slate-500 font-medium whitespace-nowrap shrink-0 hidden md:inline">
              دوره:
            </span>
            <select
              value={selectedPeriodId}
              onChange={(e) => onSelectPeriod(Number(e.target.value))}
              aria-label="انتخاب دوره ارزیابی عملکرد"
              className="bg-transparent text-xs font-bold text-slate-900 border-none outline-none cursor-pointer pr-0 pl-1 font-mono"
            >
              {periods.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons: New Objective & New Indicator */}
          <div className="hidden sm:flex items-center gap-1.5">
            <button
              onClick={onOpenNewObjective}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-teal-900 bg-teal-50/80 hover:bg-teal-100/90 border border-teal-200 rounded-xl transition-all shadow-3xs hover:shadow-2xs active:scale-95"
              title="افزودن هدف استراتژیک جدید به کارت امتیازی"
            >
              <Plus className="w-3.5 h-3.5 text-teal-700 stroke-[2.5]" />
              <span>هدف جدید</span>
            </button>

            <button
              onClick={onOpenNewIndicator}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-gradient-to-r from-teal-700 via-teal-800 to-emerald-800 hover:from-teal-800 hover:to-emerald-900 rounded-xl transition-all shadow-xs hover:shadow-md ring-1 ring-white/20 active:scale-95"
              title="افزودن شاخص عملکردی جدید"
            >
              <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
              <span>شاخص جدید</span>
            </button>
          </div>

          {/* Utility Tools: Print & Backup */}
          <div className="flex items-center gap-1 border-r border-slate-200/80 pr-2 mr-1">
            <button
              onClick={onPrint}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all shadow-3xs hover:shadow-2xs"
              title="چاپ و استخراج سند PDF رسمی"
              aria-label="چاپ و استخراج سند PDF رسمی"
            >
              <Printer className="w-4 h-4 stroke-[1.8]" />
            </button>

            <button
              onClick={onOpenBackup}
              className="w-8 h-8 rounded-lg flex items-center justify-center text-slate-600 hover:text-slate-950 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all shadow-3xs hover:shadow-2xs"
              title="پشتیبان‌گیری ابری و بازیابی پایگاه داده (JSON)"
              aria-label="پشتیبان‌گیری ابری و بازیابی پایگاه داده"
            >
              <Download className="w-4 h-4 stroke-[1.8]" />
            </button>
          </div>
        </div>
      </div>

      {/* Mobile/Tablet Horizontal Scrollable Navigation */}
      <div className="flex xl:hidden items-center gap-1.5 mt-2.5 pt-2 border-t border-slate-200/80 overflow-x-auto pb-0.5 no-scrollbar">
        <button
          onClick={() => setActiveTab('scorecard')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'scorecard'
              ? 'bg-teal-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Layers className="w-3.5 h-3.5" />
          <span>کارت امتیازی</span>
        </button>

        <button
          onClick={() => setActiveTab('cascade')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'cascade'
              ? 'bg-blue-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <GitFork className="w-3.5 h-3.5" />
          <span>Cascade</span>
        </button>

        <button
          onClick={() => setActiveTab('initiatives')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'initiatives'
              ? 'bg-emerald-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Calendar className="w-3.5 h-3.5" />
          <span>ابتکارات و گانت</span>
        </button>

        <button
          onClick={() => setActiveTab('map')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'map'
              ? 'bg-sky-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Network className="w-3.5 h-3.5" />
          <span>نقشه استراتژی</span>
        </button>

        <button
          onClick={() => setActiveTab('analytics')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'analytics'
              ? 'bg-violet-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <BarChart3 className="w-3.5 h-3.5" />
          <span>تحلیل‌ها</span>
        </button>

        <button
          onClick={() => setActiveTab('strategy_tools')}
          className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg whitespace-nowrap transition-all ${
            activeTab === 'strategy_tools'
              ? 'bg-indigo-700 text-white shadow-xs'
              : 'text-slate-600 bg-slate-100 hover:bg-slate-200/80'
          }`}
        >
          <Compass className="w-3.5 h-3.5" />
          <span>سوئیت استراتژیک</span>
        </button>
      </div>
    </header>
  );
};
