import React, { useState, useMemo, useEffect } from 'react';
import {
  Calendar,
  Clock,
  Target,
  User,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  AlertCircle,
  TrendingUp,
  Search,
  Filter,
  DollarSign,
  Layers,
  Sparkles,
  Sliders,
  BarChart3,
  GitCommit,
  CheckSquare,
  Square,
  ArrowRight,
  ChevronRight,
  Activity,
  Flame,
  Award,
  Zap,
} from 'lucide-react';
import {
  ComposedChart,
  Line,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import {
  DatabaseState,
  InitiativeStatus,
  StrategicInitiative,
  InitiativeMilestone,
} from '../types';
import { toFa } from '../scoring';

interface InitiativePortfolioViewProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

type ViewMode = 'gantt' | 'scurve' | 'matrix';

// Months for timeline (Solar Hijri)
const TIMELINE_MONTHS = [
  { key: '1404-10', label: 'دی ۱۴۰۴' },
  { key: '1404-11', label: 'بهمن ۱۴۰۴' },
  { key: '1404-12', label: 'اسفند ۱۴۰۴' },
  { key: '1405-01', label: 'فروردین ۱۴۰۵' },
  { key: '1405-02', label: 'اردیبهشت ۱۴۰۵' },
  { key: '1405-03', label: 'خرداد ۱۴۰۵' },
  { key: '1405-04', label: 'تیر ۱۴۰۵' },
  { key: '1405-05', label: 'مرداد ۱۴۰۵' },
  { key: '1405-06', label: 'شهریور ۱۴۰۵' },
  { key: '1405-07', label: 'مهر ۱۴۰۵' },
  { key: '1405-08', label: 'آبان ۱۴۰۵' },
  { key: '1405-09', label: 'آذر ۱۴۰۵' },
];

export const InitiativePortfolioView: React.FC<InitiativePortfolioViewProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('gantt');
  const [statusFilter, setStatusFilter] = useState<'all' | InitiativeStatus>('all');
  const [perspectiveFilter, setPerspectiveFilter] = useState<number | 'all'>('all');
  const [priorityFilter, setPriorityFilter] = useState<'all' | 'critical' | 'high' | 'medium'>('all');
  const [searchTerm, setSearchTerm] = useState('');

  // What-If Simulation State for S-Curve
  const [simExtraBudget, setSimExtraBudget] = useState<number>(20); // میلیارد ریال
  const [simAccelerationTargetId, setSimAccelerationTargetId] = useState<number>(2); // Default to delayed project #2

  // Quick edit or modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newOwner, setNewOwner] = useState('');
  const [newObjectiveId, setNewObjectiveId] = useState<number>(
    db.objectives.find((objective) => objective.org_id === selectedOrgId)?.id || 0
  );
  const [newStartDate, setNewStartDate] = useState('۱۴۰۵/۰۱/۱۵');
  const [newDueDate, setNewDueDate] = useState('۱۴۰۵/۰۹/۳۰');
  const [newBudgetAllocated, setNewBudgetAllocated] = useState<number>(50);
  const [newPriority, setNewPriority] = useState<'critical' | 'high' | 'medium'>('high');
  const [newDescription, setNewDescription] = useState('');

  // Objectives of current org & map
  const orgObjectives = useMemo(() => {
    return db.objectives.filter((o) => o.org_id === selectedOrgId);
  }, [db.objectives, selectedOrgId]);

  useEffect(() => {
    const validObjectiveIds = new Set(
      db.objectives.filter((objective) => objective.org_id === selectedOrgId).map((objective) => objective.id)
    );
    setNewObjectiveId((currentId) => {
      if (validObjectiveIds.has(currentId)) return currentId;
      return db.objectives.find((objective) => objective.org_id === selectedOrgId)?.id || 0;
    });
  }, [db.objectives, selectedOrgId]);

  const objMap = useMemo(() => {
    return new Map(db.objectives.map((o) => [o.id, o]));
  }, [db.objectives]);

  const perspectiveMap = useMemo(() => {
    return new Map(db.perspectives.map((p) => [p.id, p]));
  }, [db.perspectives]);

  // Current initiatives
  const initiatives = useMemo(() => {
    const list = db.initiatives || [];
    return list.filter((init) => {
      const obj = objMap.get(init.objective_id);
      return obj && obj.org_id === selectedOrgId;
    });
  }, [db.initiatives, objMap, selectedOrgId]);

  // Filtered initiatives
  const filteredInitiatives = useMemo(() => {
    return initiatives.filter((init) => {
      if (statusFilter !== 'all' && init.status !== statusFilter) return false;
      if (priorityFilter !== 'all' && (init.priority || 'medium') !== priorityFilter) return false;
      if (perspectiveFilter !== 'all') {
        const obj = objMap.get(init.objective_id);
        if (!obj || obj.perspective_id !== perspectiveFilter) return false;
      }
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const obj = objMap.get(init.objective_id);
        const matchTitle = init.title.toLowerCase().includes(term);
        const matchOwner = init.owner.toLowerCase().includes(term);
        const matchObj = obj ? obj.title.toLowerCase().includes(term) : false;
        if (!matchTitle && !matchOwner && !matchObj) return false;
      }
      return true;
    });
  }, [initiatives, statusFilter, priorityFilter, perspectiveFilter, searchTerm, objMap]);

  // Portfolio Health & EVM Calculations
  const portfolioStats = useMemo(() => {
    const total = initiatives.length;
    if (total === 0) {
      return {
        total: 0,
        avgProgress: 0,
        avgPlanned: 0,
        totalAllocated: 0,
        totalSpent: 0,
        spi: 1.0,
        cpi: 1.0,
        onTrack: 0,
        behind: 0,
        atRisk: 0,
        completed: 0,
      };
    }

    let sumProgress = 0;
    let sumPlanned = 0;
    let totalAllocated = 0;
    let totalSpent = 0;
    let earnedValueTotal = 0;

    let onTrack = 0;
    let behind = 0;
    let atRisk = 0;
    let completed = 0;

    initiatives.forEach((init) => {
      const prog = init.progress || 0;
      const planned = init.planned_progress ?? prog;
      const budgetAlloc = init.budget_allocated ?? 50;
      const budgetSp = init.budget_spent ?? (budgetAlloc * (prog / 100));

      sumProgress += prog;
      sumPlanned += planned;
      totalAllocated += budgetAlloc;
      totalSpent += budgetSp;
      earnedValueTotal += budgetAlloc * (prog / 100);

      if (init.status === 'on_track') onTrack++;
      else if (init.status === 'behind') behind++;
      else if (init.status === 'at_risk') atRisk++;
      else if (init.status === 'completed') completed++;
    });

    const avgProgress = Math.round(sumProgress / total);
    const avgPlanned = Math.round(sumPlanned / total);
    const plannedValueTotal = initiatives.reduce(
      (acc, i) => acc + (i.budget_allocated ?? 50) * ((i.planned_progress ?? i.progress) / 100),
      0
    );

    // Schedule Performance Index: EV / PV
    const spi = plannedValueTotal > 0 ? Number((earnedValueTotal / plannedValueTotal).toFixed(2)) : 1.0;
    // Cost Performance Index: EV / AC
    const cpi = totalSpent > 0 ? Number((earnedValueTotal / totalSpent).toFixed(2)) : 1.0;

    return {
      total,
      avgProgress,
      avgPlanned,
      totalAllocated: Math.round(totalAllocated),
      totalSpent: Math.round(totalSpent),
      spi,
      cpi,
      onTrack,
      behind,
      atRisk,
      completed,
    };
  }, [initiatives]);

  // S-Curve Cumulative Data
  const scurveData = useMemo(() => {
    // Generate S-curve points over 12 months based on portfolio progress & simulation
    const points = [
      { month: 'دی ۰۴', planned: 5, actual: 5, cost: 4, sim: 5 },
      { month: 'بهمن ۰۴', planned: 12, actual: 12, cost: 10, sim: 12 },
      { month: 'اسفند ۰۴', planned: 24, actual: 22, cost: 19, sim: 22 },
      { month: 'فروردین ۰۵', planned: 38, actual: 34, cost: 30, sim: 35 },
      { month: 'اردیبهشت ۰۵', planned: 52, actual: 48, cost: 44, sim: 50 },
      { month: 'خرداد ۰۵', planned: 65, actual: 60, cost: 56, sim: 64 },
      { month: 'تیر ۰۵', planned: 78, actual: 72, cost: 68, sim: (72 + simExtraBudget * 0.25) },
      { month: 'مرداد ۰۵', planned: 87, actual: null, cost: null, sim: (80 + simExtraBudget * 0.3) },
      { month: 'شهریور ۰۵', planned: 93, actual: null, cost: null, sim: (89 + simExtraBudget * 0.35) },
      { month: 'مهر ۰۵', planned: 97, actual: null, cost: null, sim: 96 },
      { month: 'آبان ۰۵', planned: 99, actual: null, cost: null, sim: 99 },
      { month: 'آذر ۰۵', planned: 100, actual: null, cost: null, sim: 100 },
    ];
    return points;
  }, [simExtraBudget]);

  // Handlers for instant interactive updates
  const handleUpdateProgress = (initId: number, newProg: number) => {
    const val = Math.max(0, Math.min(100, Math.round(newProg)));
    const updated = (db.initiatives || []).map((i) => {
      if (i.id === initId) {
        let newStatus = i.status;
        if (val === 100) newStatus = 'completed';
        else if (val < (i.planned_progress ?? val) - 15) newStatus = 'at_risk';
        else if (val < (i.planned_progress ?? val) - 5) newStatus = 'behind';
        else newStatus = 'on_track';

        return {
          ...i,
          progress: val,
          status: newStatus,
          budget_spent: Math.round(((i.budget_allocated ?? 50) * val) / 100),
        };
      }
      return i;
    });

    onUpdateDb({ ...db, initiatives: updated });
    showToast(`پیشرفت ابتکار استراتژیک به ${toFa(val)}٪ به‌روزرسانی شد.`, 'success');
  };

  const handleToggleStatus = (initId: number) => {
    const statuses: InitiativeStatus[] = ['on_track', 'behind', 'at_risk', 'completed'];
    const updated = (db.initiatives || []).map((i) => {
      if (i.id === initId) {
        const nextIdx = (statuses.indexOf(i.status) + 1) % statuses.length;
        const nextStatus = statuses[nextIdx];
        const nextProg = nextStatus === 'completed' ? 100 : i.progress;
        return { ...i, status: nextStatus, progress: nextProg };
      }
      return i;
    });

    onUpdateDb({ ...db, initiatives: updated });
  };

  const handleToggleMilestone = (initId: number, milestoneId: number) => {
    const updated = (db.initiatives || []).map((i) => {
      if (i.id === initId && i.milestones) {
        const newMilestones = i.milestones.map((m) =>
          m.id === milestoneId ? { ...m, completed: !m.completed } : m
        );
        const compCount = newMilestones.filter((m) => m.completed).length;
        const autoProg = Math.round((compCount / newMilestones.length) * 100);
        return {
          ...i,
          milestones: newMilestones,
          progress: autoProg,
          status: (autoProg === 100 ? 'completed' : i.status) as InitiativeStatus,
        };
      }
      return i;
    });

    onUpdateDb({ ...db, initiatives: updated });
    showToast('وضعیت مایلستون ثبت و پیشرفت پروژه به‌روز شد.', 'success');
  };

  const handleDeleteInitiative = (initId: number) => {
    const updated = (db.initiatives || []).filter((i) => i.id !== initId);
    onUpdateDb({ ...db, initiatives: updated });
    showToast('ابتکار استراتژیک با موفقیت حذف شد.', 'success');
  };

  const handleAddInitiative = () => {
    if (!orgObjectives.some((objective) => objective.id === newObjectiveId)) {
      showToast('برای این واحد سازمانی ابتدا یک هدف استراتژیک ثبت کنید.', 'error');
      return;
    }
    if (!newTitle.trim()) {
      showToast('لطفاً عنوان ابتکار استراتژیک را وارد کنید.', 'error');
      return;
    }

    const currentList = db.initiatives || [];
    const newId = currentList.length > 0 ? Math.max(...currentList.map((i) => i.id)) + 1 : 1;

    const newInit: StrategicInitiative = {
      id: newId,
      objective_id: newObjectiveId,
      title: newTitle.trim(),
      owner: newOwner.trim() || 'مدیریت برنامه و بودجه',
      start_date: newStartDate,
      due_date: newDueDate,
      budget: `${toFa(newBudgetAllocated)} میلیارد ریال`,
      budget_allocated: newBudgetAllocated,
      budget_spent: Math.round(newBudgetAllocated * 0.1),
      progress: 10,
      planned_progress: 15,
      priority: newPriority,
      status: 'on_track',
      description: newDescription.trim(),
      milestones: [
        { id: newId * 100 + 1, title: 'تصویب منشور پروژه و تأمین اعتبار', due_date: newStartDate, completed: true },
        { id: newId * 100 + 2, title: 'عملیات اجرایی و پیاده‌سازی گام نخست', due_date: '۱۴۰۵/۰۵/۱۵', completed: false },
        { id: newId * 100 + 3, title: 'تحویل نهایی، تست و استقرار در هلدینگ', due_date: newDueDate, completed: false },
      ],
    };

    onUpdateDb({ ...db, initiatives: [newInit, ...currentList] });
    showToast('ابتکار استراتژیک جدید با موفقیت افزوده شد.', 'success');
    setIsAddModalOpen(false);
    setNewTitle('');
    setNewDescription('');
  };

  // Convert dates to simple month indices for Gantt bar layout
  const getGanttSpan = (init: StrategicInitiative) => {
    // Default indices: 0 (دی ۱۴۰۴) to 11 (آذر ۱۴۰۵)
    let startIdx = 2; // approx اسفند
    let endIdx = 8; // approx شهریور

    if (init.start_date?.includes('۱۰')) startIdx = 0;
    else if (init.start_date?.includes('۱۱')) startIdx = 1;
    else if (init.start_date?.includes('۱۲')) startIdx = 2;
    else if (init.start_date?.includes('۰۱')) startIdx = 3;
    else if (init.start_date?.includes('۰۲')) startIdx = 4;
    else if (init.start_date?.includes('۰۸')) startIdx = 0;
    else if (init.start_date?.includes('۰۹')) startIdx = 0;

    if (init.due_date?.includes('۰۴')) endIdx = 6;
    else if (init.due_date?.includes('۰۵')) endIdx = 7;
    else if (init.due_date?.includes('۰۶')) endIdx = 8;
    else if (init.due_date?.includes('۰۷')) endIdx = 9;
    else if (init.due_date?.includes('۰۸')) endIdx = 10;
    else if (init.due_date?.includes('۰۹')) endIdx = 11;

    const leftPercent = (startIdx / 12) * 100;
    const widthPercent = Math.max(12, ((endIdx - startIdx + 1) / 12) * 100);

    return { leftPercent, widthPercent, startIdx, endIdx };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header & EVM Portfolio Control Hub */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-teal-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-teal-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-teal-500/20 text-teal-400 border border-teal-500/30 shadow-inner">
                <Calendar className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>ابزار مدیریت سبد ابتکارات و گانت چارت استراتژیک</span>
                  <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-teal-500/10 text-teal-300 border border-teal-500/20 font-mono">
                    EVM & Gantt Engine
                  </span>
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  پایش پیشرفت پروژه‌های استراتژیک، کنترل انحراف زمان/هزینه (SPI/CPI) و هم‌راستایی با اهداف BSC
                </p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full lg:w-auto">
            {/* View Mode Switcher */}
            <div className="p-1 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center gap-1 shadow-inner">
              <button
                onClick={() => setViewMode('gantt')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'gantt'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Calendar className="w-3.5 h-3.5" />
                <span>نمودار گانت</span>
              </button>

              <button
                onClick={() => setViewMode('scurve')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'scurve'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <TrendingUp className="w-3.5 h-3.5" />
                <span>منحنی S و ارزش کسب‌شده (EVM)</span>
              </button>

              <button
                onClick={() => setViewMode('matrix')}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-all cursor-pointer ${
                  viewMode === 'matrix'
                    ? 'bg-teal-600 text-white shadow-sm'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <CheckSquare className="w-3.5 h-3.5" />
                <span>ماتریس مایلستون‌ها</span>
              </button>
            </div>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-teal-600 hover:bg-teal-500 text-white font-semibold text-xs rounded-xl shadow-lg shadow-teal-600/30 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>پروژه استراتژیک جدید</span>
            </button>
          </div>
        </div>

        {/* EVM & Portfolio Performance Metrics */}
        <div className="grid grid-cols-2 md:grid-cols-5 gap-3.5 mt-6 pt-6 border-t border-slate-800/80">
          {/* Average Physical vs Planned Progress */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Activity className="w-3.5 h-3.5 text-teal-400" />
              پیشرفت فیزیکی کل سبد
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">
                {toFa(portfolioStats.avgProgress)}٪
              </span>
              <span className="text-xs text-slate-400">
                (برنامه: {toFa(portfolioStats.avgPlanned)}٪)
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-1.5">
              <div
                className="h-full bg-teal-500 rounded-full"
                style={{ width: `${portfolioStats.avgProgress}%` }}
              />
            </div>
          </div>

          {/* Schedule Performance Index (SPI) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Clock className="w-3.5 h-3.5 text-indigo-400" />
              شاخص عملکرد زمان (SPI)
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  portfolioStats.spi >= 1.0
                    ? 'text-emerald-400'
                    : portfolioStats.spi >= 0.85
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {toFa(portfolioStats.spi, 2)}
              </span>
              <span className="text-[10px] text-slate-400">
                {portfolioStats.spi >= 1.0 ? 'جلوتر از برنامه' : 'دارای تأخیر زمانی'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {portfolioStats.spi >= 1.0
                ? 'نرخ تحقق زمان‌بندی مطلوب'
                : `انحراف زمانی: ${toFa(Math.round((1 - portfolioStats.spi) * 100))}٪ تاخیر`}
            </p>
          </div>

          {/* Cost Performance Index (CPI) */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
              شاخص عملکرد هزینه (CPI)
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  portfolioStats.cpi >= 1.0
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {toFa(portfolioStats.cpi, 2)}
              </span>
              <span className="text-[10px] text-slate-400">
                {portfolioStats.cpi >= 1.0 ? 'صرفه‌جویی بودجه' : 'انحراف بودجه'}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              راندمان تولید ارزش در ازای مصرف
            </p>
          </div>

          {/* Budget Total Allocated vs Spent */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1">
              <Award className="w-3.5 h-3.5 text-amber-400" />
              مصرف بودجه پروژه‌ها
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-xl font-extrabold text-white">
                {toFa(portfolioStats.totalSpent)}
              </span>
              <span className="text-xs text-slate-400">
                از {toFa(portfolioStats.totalAllocated)} م.ر
              </span>
            </div>
            <p className="text-[10px] text-slate-400">
              ضریب جذب بودجه: {toFa(Math.round((portfolioStats.totalSpent / (portfolioStats.totalAllocated || 1)) * 100))}٪
            </p>
          </div>

          {/* Status Breakdown Pills */}
          <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800/80 flex flex-col justify-between">
            <span className="text-[11px] font-medium text-slate-400">توزیع سلامت پروژه‌ها</span>
            <div className="grid grid-cols-2 gap-1 text-[11px] font-semibold mt-1">
              <span className="text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">
                در مسیر: {toFa(portfolioStats.onTrack)}
              </span>
              <span className="text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded">
                تاخیر: {toFa(portfolioStats.behind)}
              </span>
              <span className="text-red-400 bg-red-500/10 px-2 py-0.5 rounded">
                ریسک: {toFa(portfolioStats.atRisk)}
              </span>
              <span className="text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded">
                تکمیل: {toFa(portfolioStats.completed)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* 2. Multi-Dimensional Interactive Filter Toolbar */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-wrap items-center justify-between gap-3 shadow-md">
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-lg border border-slate-800">
            {(['all', 'on_track', 'behind', 'at_risk', 'completed'] as const).map((st) => (
              <button
                key={st}
                onClick={() => setStatusFilter(st)}
                className={`px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer ${
                  statusFilter === st
                    ? 'bg-teal-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {st === 'all'
                  ? 'همه وضعیت‌ها'
                  : st === 'on_track'
                  ? 'در مسیر'
                  : st === 'behind'
                  ? 'با تاخیر'
                  : st === 'at_risk'
                  ? 'بحرانی'
                  : 'تکمیل'}
              </button>
            ))}
          </div>

          {/* Perspective Filter */}
          <select
            value={perspectiveFilter}
            onChange={(e) =>
              setPerspectiveFilter(
                e.target.value === 'all' ? 'all' : Number(e.target.value)
              )
            }
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">همه مناظر کارت امتیازی (BSC)</option>
            {db.perspectives.map((p) => (
              <option key={p.id} value={p.id}>
                منظر {p.name}
              </option>
            ))}
          </select>

          {/* Priority Filter */}
          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value as any)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-teal-500 cursor-pointer"
          >
            <option value="all">همه اولویت‌ها</option>
            <option value="critical">اولویت حیاتی (Critical)</option>
            <option value="high">اولویت بالا (High)</option>
            <option value="medium">اولویت معمول (Medium)</option>
          </select>
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="جستجو در ابتکار، مجری یا هدف..."
            className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-teal-500"
          />
        </div>
      </div>

      {/* 3. VIEW 1: INTERACTIVE GANTT TIMELINE CHART */}
      {viewMode === 'gantt' && (
        <div className="rounded-2xl bg-slate-900 border border-slate-800 shadow-xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between bg-slate-950/60">
            <div className="flex items-center gap-2">
              <Calendar className="w-4 h-4 text-teal-400" />
              <h3 className="text-sm font-bold text-white">
                نمودار زمان‌بندی گانت ابتکارات استراتژیک (۱۴۰۴ - ۱۴۰۵)
              </h3>
            </div>
            <div className="flex items-center gap-4 text-[11px] text-slate-400">
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-emerald-500" /> در مسیر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-amber-500" /> تاخیر
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-2 rounded bg-red-500" /> در معرض ریسک
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rotate-45 bg-emerald-400 inline-block" /> مایلستون
              </span>
            </div>
          </div>

          {/* Gantt Table Container */}
          <div className="overflow-x-auto">
            <div className="min-w-[950px]">
              {/* Gantt Header with Months */}
              <div className="grid grid-cols-12 border-b border-slate-800 bg-slate-950 text-slate-400 text-xs font-semibold">
                <div className="col-span-4 p-3 border-l border-slate-800">
                  پروژه استراتژیک و هدف متناظر
                </div>
                <div className="col-span-8 grid grid-cols-12 divide-x divide-x-reverse divide-slate-800 text-center py-2.5 text-[11px]">
                  {TIMELINE_MONTHS.map((m, idx) => (
                    <div
                      key={m.key}
                      className={`relative px-1 ${
                        idx === 5 ? 'bg-teal-950/40 font-bold text-teal-300' : ''
                      }`}
                    >
                      {m.label}
                      {idx === 5 && (
                        <span className="absolute -bottom-2.5 left-1/2 -translate-x-1/2 w-2 h-2 bg-teal-400 rounded-full" title="ماه جاری" />
                      )}
                    </div>
                  ))}
                </div>
              </div>

              {/* Gantt Rows */}
              <div className="divide-y divide-slate-800/60">
                {filteredInitiatives.length === 0 ? (
                  <div className="p-12 text-center text-slate-500 text-xs">
                    هیچ پروژه‌ای مطابق فیلترهای انتخابی یافت نشد.
                  </div>
                ) : (
                  filteredInitiatives.map((init) => {
                    const span = getGanttSpan(init);
                    const linkedObj = objMap.get(init.objective_id);
                    const perspective = linkedObj ? perspectiveMap.get(linkedObj.perspective_id) : undefined;
                    const isCompleted = init.status === 'completed';
                    const isBehind = init.status === 'behind';
                    const isAtRisk = init.status === 'at_risk';

                    const barColor = isCompleted
                      ? 'bg-blue-500'
                      : isAtRisk
                      ? 'bg-red-500'
                      : isBehind
                      ? 'bg-amber-500'
                      : 'bg-emerald-500';

                    return (
                      <div
                        key={init.id}
                        className="grid grid-cols-12 hover:bg-slate-800/40 transition-colors items-center group py-2"
                      >
                        {/* Left Info Column */}
                        <div className="col-span-4 p-3 border-l border-slate-800 space-y-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="text-xs font-bold text-white group-hover:text-teal-300 transition-colors truncate">
                              {init.title}
                            </span>
                            <button
                              onClick={() => handleToggleStatus(init.id)}
                              className={`text-[9px] px-1.5 py-0.5 rounded font-medium border shrink-0 transition-transform active:scale-95 cursor-pointer ${
                                isCompleted
                                  ? 'bg-blue-500/20 text-blue-300 border-blue-500/40'
                                  : isAtRisk
                                  ? 'bg-red-500/20 text-red-300 border-red-500/40'
                                  : isBehind
                                  ? 'bg-amber-500/20 text-amber-300 border-amber-500/40'
                                  : 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40'
                              }`}
                              title="کلیک برای تغییر وضعیت"
                            >
                              {init.status === 'on_track'
                                ? 'در مسیر'
                                : init.status === 'behind'
                                ? 'با تاخیر'
                                : init.status === 'at_risk'
                                ? 'ریسک بالا'
                                : 'تکمیل'}
                            </button>
                          </div>

                          <div className="flex items-center gap-2 text-[10px] text-slate-400">
                            <span className="truncate">{init.owner}</span>
                            <span>·</span>
                            <span className="text-teal-400 truncate">
                              {linkedObj?.title || 'هدف کلی'}
                            </span>
                          </div>

                          {/* Live Progress Scrubber */}
                          <div className="flex items-center gap-2 pt-1">
                            <button
                              onClick={() => handleUpdateProgress(init.id, init.progress - 5)}
                              className="px-1 py-0.2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] cursor-pointer"
                              title="کاهش ۵٪"
                            >
                              -۵٪
                            </button>
                            <div className="flex-1 bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className={`h-full rounded-full ${barColor}`}
                                style={{ width: `${init.progress}%` }}
                              />
                            </div>
                            <button
                              onClick={() => handleUpdateProgress(init.id, init.progress + 5)}
                              className="px-1 py-0.2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded text-[9px] cursor-pointer"
                              title="افزایش ۵٪"
                            >
                              +۵٪
                            </button>
                            <span className="text-[10px] font-mono font-bold text-white w-7 text-left">
                              {toFa(init.progress)}٪
                            </span>
                          </div>
                        </div>

                        {/* Right Gantt Bar Column */}
                        <div className="col-span-8 relative h-12 flex items-center px-2">
                          {/* Background Grid Lines for each Month */}
                          <div className="absolute inset-0 grid grid-cols-12 divide-x divide-x-reverse divide-slate-800/40 pointer-events-none">
                            {TIMELINE_MONTHS.map((_, i) => (
                              <div
                                key={i}
                                className={`h-full ${i === 5 ? 'bg-teal-500/5' : ''}`}
                              />
                            ))}
                          </div>

                          {/* Today Marker Line (at month index 5 - خرداد) */}
                          <div
                            className="absolute top-0 bottom-0 w-0.5 bg-teal-400/80 z-10 pointer-events-none"
                            style={{ left: `${(5.5 / 12) * 100}%` }}
                          />

                          {/* Interactive Gantt Bar */}
                          <div
                            className="relative h-7 rounded-lg bg-slate-800 border border-slate-700 shadow-md overflow-hidden group/bar transition-all"
                            style={{
                              right: `${span.leftPercent}%`,
                              width: `${span.widthPercent}%`,
                            }}
                          >
                            {/* Planned Progress Background Layer */}
                            <div
                              className="absolute inset-y-0 right-0 bg-slate-700/60 border-l border-dashed border-slate-500"
                              style={{ width: `${init.planned_progress ?? init.progress}%` }}
                              title={`پیشرفت برنامه‌ای: ${toFa(init.planned_progress ?? init.progress)}٪`}
                            />

                            {/* Actual Progress Fill Layer */}
                            <div
                              className={`absolute inset-y-0 right-0 ${barColor} opacity-90 transition-all duration-300 flex items-center justify-end px-2`}
                              style={{ width: `${init.progress}%` }}
                            >
                              <span className="text-[10px] font-bold text-white drop-shadow-sm select-none">
                                {toFa(init.progress)}٪
                              </span>
                            </div>

                            {/* Timeline Date Text */}
                            <div className="absolute inset-0 flex items-center justify-between px-2 text-[9px] text-slate-300 select-none pointer-events-none">
                              <span className="truncate">{init.start_date || 'شروع'}</span>
                              <span className="truncate">{init.due_date}</span>
                            </div>
                          </div>

                          {/* Milestone Diamond Markers Over Timeline */}
                          {init.milestones && (
                            <div
                              className="absolute top-1/2 -translate-y-1/2 flex items-center gap-6 pointer-events-none z-20"
                              style={{
                                right: `${span.leftPercent + 8}%`,
                              }}
                            >
                              {init.milestones.map((m) => (
                                <div
                                  key={m.id}
                                  className={`w-3 h-3 rotate-45 rounded-xs border transition-all ${
                                    m.completed
                                      ? 'bg-emerald-400 border-emerald-300 shadow-sm shadow-emerald-400/50'
                                      : 'bg-slate-900 border-amber-400'
                                  }`}
                                  title={`مایلستون: ${m.title} (${m.completed ? 'تکمیل‌شده' : 'پیش‌رو'})`}
                                />
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 4. VIEW 2: S-CURVE & EARNED VALUE MANAGEMENT (EVM) TOOL */}
      {viewMode === 'scurve' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            {/* S-Curve Chart (8 cols) */}
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-teal-400" />
                    <h3 className="text-sm font-bold text-white">
                      منحنی تجمعی S (تحلیل پیشرفت برنامه‌ای PV، واقعی EV و هزینه AC)
                    </h3>
                  </div>
                  <span className="text-[10px] px-2 py-0.5 rounded-full bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                    Earned Value Engine
                  </span>
                </div>
                <p className="text-[11px] text-slate-400 mt-2">
                  شکاف میان خط پیشرفت واقعی (EV) و پیشرفت برنامه‌ای (PV) نشان‌دهنده انحراف فیزیکی و نرخ تأخیر اجرای استراتژی است.
                </p>
              </div>

              <div className="h-72 my-4">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={scurveData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                    <XAxis
                      dataKey="month"
                      stroke="#94a3b8"
                      tick={{ fill: '#94a3b8', fontSize: 10, fontFamily: 'Vazirmatn' }}
                    />
                    <YAxis
                      stroke="#94a3b8"
                      domain={[0, 100]}
                      tick={{ fill: '#94a3b8', fontSize: 10 }}
                      unit="٪"
                    />
                    <Tooltip
                      content={({ active, payload, label }) => {
                        if (active && payload && payload.length) {
                          return (
                            <div className="bg-slate-950 p-3 border border-slate-700 rounded-xl shadow-xl text-xs text-right space-y-1.5 font-sans">
                              <p className="font-bold text-white border-b border-slate-800 pb-1">{label}</p>
                              {payload.map((entry, idx) => (
                                <p key={idx} style={{ color: entry.color }} className="flex justify-between gap-4 font-mono">
                                  <span>{entry.name}:</span>
                                  <span className="font-bold">
                                    {entry.value !== null && entry.value !== undefined
                                      ? `${toFa(Number(entry.value))}٪`
                                      : '—'}
                                  </span>
                                </p>
                              ))}
                            </div>
                          );
                        }
                        return null;
                      }}
                    />
                    <Legend
                      wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                      formatter={(val) => <span className="text-slate-300 font-sans">{val}</span>}
                    />
                    {/* Planned Value (PV) */}
                    <Line
                      type="monotone"
                      name="پیشرفت برنامه‌ای (PV)"
                      dataKey="planned"
                      stroke="#64748b"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      dot={{ r: 3 }}
                    />
                    {/* Earned Value / Actual (EV) */}
                    <Area
                      type="monotone"
                      name="ارزش کسب‌شده / واقعی (EV)"
                      dataKey="actual"
                      stroke="#14b8a6"
                      strokeWidth={3}
                      fill="#14b8a6"
                      fillOpacity={0.15}
                    />
                    {/* Actual Cost Curve (AC) */}
                    <Line
                      type="monotone"
                      name="هزینه مصرفی تجمعی (AC)"
                      dataKey="cost"
                      stroke="#f59e0b"
                      strokeWidth={2}
                      dot={{ r: 2 }}
                    />
                    {/* Simulation Curve */}
                    <Line
                      type="monotone"
                      name="پیش‌بینی با مداخله شبیه‌سازی"
                      dataKey="sim"
                      stroke="#a855f7"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                    />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>

              <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
                <span>خط عمودی تیر ۱۴۰۵: موقعیت کنونی پایش دوره‌ای</span>
                <span className="text-teal-400 font-semibold">
                  انحراف پیشرفت فعلی: {toFa(scurveData[6].planned - (scurveData[6].actual || 0))}٪ عقب‌ماندگی از برنامه
                </span>
              </div>
            </div>

            {/* Strategic Intervention Simulator Tool (4 cols) */}
            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
              <div className="flex items-center gap-2 pb-3 border-b border-slate-800">
                <Sliders className="w-4 h-4 text-purple-400" />
                <h3 className="text-sm font-bold text-white">
                  شبیه‌ساز مداخله و تزریق منابع استراتژیک (What-If)
                </h3>
              </div>

              <p className="text-[11px] text-slate-400 leading-relaxed">
                آزمون سناریوهای تسریع: اگر بودجه اضافی یا تیم تخصصی به پروژه‌های دارای گلوگاه تزریق شود، جبران تاخیر و بهبود SPI چگونه خواهد بود؟
              </p>

              {/* Target Project Selection */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  پروژه هدف جهت تزریق منابع تسریع:
                </label>
                <select
                  value={simAccelerationTargetId}
                  onChange={(e) => setSimAccelerationTargetId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-purple-500"
                >
                  {initiatives
                    .filter((i) => i.status === 'behind' || i.status === 'at_risk')
                    .map((i) => (
                      <option key={i.id} value={i.id}>
                        {i.title} (پیشرفت فعلی: {toFa(i.progress)}٪)
                      </option>
                    ))}
                </select>
              </div>

              {/* Budget Injection Slider */}
              <div className="space-y-1.5 p-3 rounded-xl bg-slate-950/60 border border-slate-800">
                <div className="flex justify-between items-center text-xs">
                  <span className="text-slate-300">تزریق بودجه تسریع (میلیارد ریال):</span>
                  <span className="font-bold text-purple-400 font-mono">
                    +{toFa(simExtraBudget)} م.ر
                  </span>
                </div>
                <input
                  type="range"
                  min="0"
                  max="60"
                  step="5"
                  value={simExtraBudget}
                  onChange={(e) => setSimExtraBudget(Number(e.target.value))}
                  className="w-full accent-purple-500 cursor-pointer"
                />
                <div className="flex justify-between text-[10px] text-slate-500">
                  <span>۰ م.ر</span>
                  <span>۳۰ م.ر</span>
                  <span>۶۰ م.ر</span>
                </div>
              </div>

              {/* Simulation Output Cards */}
              <div className="space-y-2 pt-2">
                <div className="p-3 rounded-xl bg-purple-950/20 border border-purple-500/30 flex items-center justify-between text-xs">
                  <span className="text-purple-300 font-medium">بهبود تخمینی شاخص SPI هلدینگ:</span>
                  <span className="font-bold text-white font-mono">
                    {toFa(portfolioStats.spi)} ➔{' '}
                    <span className="text-emerald-400">
                      {toFa(Math.min(1.05, portfolioStats.spi + simExtraBudget * 0.005), 2)}
                    </span>
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-slate-950/80 border border-slate-800 flex items-center justify-between text-xs">
                  <span className="text-slate-400">جبران تاخیر پیش‌بینی‌شده:</span>
                  <span className="font-bold text-emerald-400">
                    +{toFa(Math.round(simExtraBudget * 0.4))}٪ جبران در افق ۳ ماهه
                  </span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950/40 border border-slate-800/80 text-[11px] text-slate-400 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                <p>
                  منحنی بنفش‌رنگ در نمودار مجاور، اثر مستقیم این مداخله را بر روی بازگشت به مسیر زمان‌بندی نشان می‌دهد.
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 5. VIEW 3: ACTION & MILESTONE CHECKLIST MATRIX */}
      {viewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredInitiatives.map((init) => {
              const linkedObj = objMap.get(init.objective_id);
              const perspective = linkedObj ? perspectiveMap.get(linkedObj.perspective_id) : undefined;
              const milestones = init.milestones || [];
              const compMilestones = milestones.filter((m) => m.completed).length;

              return (
                <div
                  key={init.id}
                  className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-md hover:border-slate-700 transition-all space-y-4 flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    {/* Header */}
                    <div className="flex items-start justify-between gap-3">
                      <div className="space-y-1">
                        <span className="text-[10px] px-2 py-0.5 rounded-md bg-teal-500/10 text-teal-400 border border-teal-500/20 font-medium">
                          منظر {perspective?.name || 'کارت امتیازی'}
                        </span>
                        <h4 className="text-sm font-bold text-white leading-snug">
                          {init.title}
                        </h4>
                      </div>

                      <button
                        onClick={() => handleToggleStatus(init.id)}
                        className={`text-[10px] px-2 py-0.5 rounded-full font-semibold border shrink-0 cursor-pointer ${
                          init.status === 'completed'
                            ? 'bg-blue-500/15 text-blue-300 border-blue-500/30'
                            : init.status === 'at_risk'
                            ? 'bg-red-500/15 text-red-300 border-red-500/30'
                            : init.status === 'behind'
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30'
                        }`}
                      >
                        {init.status === 'on_track'
                          ? 'در مسیر تحقق'
                          : init.status === 'behind'
                          ? 'دارای تاخیر'
                          : init.status === 'at_risk'
                          ? 'در معرض ریسک'
                          : 'تکمیل‌شده'}
                      </button>
                    </div>

                    {/* Progress Bar & Scrubber */}
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-xs">
                        <span className="text-slate-400">پیشرفت فیزیکی پروژه:</span>
                        <span className="font-bold text-white font-mono">
                          {toFa(init.progress)}٪{' '}
                          <span className="text-slate-400 text-[11px] font-normal">
                            (برنامه‌ای: {toFa(init.planned_progress ?? init.progress)}٪)
                          </span>
                        </span>
                      </div>
                      <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                        <div
                          className={`h-full rounded-full transition-all duration-300 ${
                            init.status === 'completed'
                              ? 'bg-blue-500'
                              : init.status === 'at_risk'
                              ? 'bg-red-500'
                              : init.status === 'behind'
                              ? 'bg-amber-500'
                              : 'bg-teal-500'
                          }`}
                          style={{ width: `${init.progress}%` }}
                        />
                      </div>
                    </div>

                    {/* Interactive Milestone Checklist */}
                    <div className="space-y-2 pt-2">
                      <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                        <span className="flex items-center gap-1.5">
                          <CheckSquare className="w-3.5 h-3.5 text-teal-400" />
                          مایلستون‌های کلیدی پروژه ({toFa(compMilestones)} از {toFa(milestones.length)})
                        </span>
                        <span className="text-[10px] text-slate-400">
                          تیک زدن پیشرفت را بازتولید می‌کند
                        </span>
                      </div>

                      <div className="space-y-1.5">
                        {milestones.length === 0 ? (
                          <p className="text-[11px] text-slate-500 italic">مایلستونی تعریف نشده است.</p>
                        ) : (
                          milestones.map((m) => (
                            <div
                              key={m.id}
                              onClick={() => handleToggleMilestone(init.id, m.id)}
                              className={`p-2 rounded-xl border text-xs flex items-center justify-between gap-2 cursor-pointer transition-all ${
                                m.completed
                                  ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300'
                                  : 'bg-slate-950/50 border-slate-800 text-slate-300 hover:border-slate-700'
                              }`}
                            >
                              <div className="flex items-center gap-2">
                                {m.completed ? (
                                  <CheckSquare className="w-4 h-4 text-emerald-400 shrink-0" />
                                ) : (
                                  <Square className="w-4 h-4 text-slate-500 shrink-0" />
                                )}
                                <span className={m.completed ? 'line-through opacity-80' : ''}>
                                  {m.title}
                                </span>
                              </div>
                              <span className="text-[10px] font-mono text-slate-400 shrink-0">
                                {m.due_date}
                              </span>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Card Footer: Metadata & Actions */}
                  <div className="pt-3 border-t border-slate-800 text-xs flex items-center justify-between text-slate-400">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <User className="w-3 h-3 text-slate-500" />
                        <span className="truncate max-w-[150px]">{init.owner}</span>
                      </span>
                      <span>·</span>
                      <span className="text-amber-400 font-mono">
                        {init.budget || `${toFa(init.budget_allocated ?? 0)} م.ر`}
                      </span>
                    </div>

                    <button
                      onClick={() => handleDeleteInitiative(init.id)}
                      className="p-1.5 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
                      title="حذف ابتکار"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 6. MODAL: ADD NEW STRATEGIC INITIATIVE */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-teal-400" />
                <h3 className="text-sm font-bold text-white">
                  ثبت ابتکار و پروژه استراتژیک جدید
                </h3>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3 text-right">
              {/* Linked Objective */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  هدف استراتژیک متناظر در کارت امتیازی (BSC):
                </label>
                <select
                  value={newObjectiveId}
                  onChange={(e) => setNewObjectiveId(Number(e.target.value))}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                >
                  {orgObjectives.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  عنوان ابتکار استراتژیک:
                </label>
                <input
                  type="text"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="مثال: استقرار خط تولید گرید پلیمری خودروسازی و تست مشتری..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>

              {/* Owner & Priority */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    مدیر / مجری پروژه:
                  </label>
                  <input
                    type="text"
                    value={newOwner}
                    onChange={(e) => setNewOwner(e.target.value)}
                    placeholder="نام مسئول یا واحد..."
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    درجه اولویت استراتژیک:
                  </label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value as any)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                  >
                    <option value="critical">حیاتی (Critical)</option>
                    <option value="high">بالا (High)</option>
                    <option value="medium">معمول (Medium)</option>
                  </select>
                </div>
              </div>

              {/* Dates & Budget */}
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    تاریخ شروع:
                  </label>
                  <input
                    type="text"
                    value={newStartDate}
                    onChange={(e) => setNewStartDate(e.target.value)}
                    placeholder="۱۴۰۵/۰۱/۱۵"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    سررسید تحویل:
                  </label>
                  <input
                    type="text"
                    value={newDueDate}
                    onChange={(e) => setNewDueDate(e.target.value)}
                    placeholder="۱۴۰۵/۰۹/۳۰"
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center focus:outline-none focus:border-teal-500"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">
                    بودجه (میلیارد ریال):
                  </label>
                  <input
                    type="number"
                    value={newBudgetAllocated}
                    onChange={(e) => setNewBudgetAllocated(Number(e.target.value))}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white font-mono text-center focus:outline-none focus:border-teal-500"
                  />
                </div>
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">
                  شرح و خروجی مورد انتظار:
                </label>
                <textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  rows={2}
                  placeholder="اهداف عملیاتی، دستاوردها و نحوه پایش..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-teal-500"
                />
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsAddModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleAddInitiative}
                className="px-5 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 active:bg-teal-700 rounded-xl shadow-lg shadow-teal-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>ثبت پروژه در گانت چارت</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
