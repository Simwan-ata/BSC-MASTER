import React, { useState, useMemo, useEffect } from 'react';
import { createStableId } from '../ids';
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
  EvmPeriodSnapshot,
} from '../types';
import { toFa } from '../scoring';
import { aggregateEvmHistory, calculateLatestEvmMetrics } from '../evm';

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
  const [evmTargetId, setEvmTargetId] = useState<number>(0);
  const [evmPeriodKey, setEvmPeriodKey] = useState<string>('1405-07');
  const [evmPlannedProgress, setEvmPlannedProgress] = useState<number>(50);
  const [evmActualProgress, setEvmActualProgress] = useState<number>(45);
  const [evmActualCost, setEvmActualCost] = useState<number>(20);
  const [simExtraBudget, setSimExtraBudget] = useState<number>(20); // additional funding scenario only

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
        spi: null,
        cpi: null,
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

    // EVM indices use only recorded snapshots from the same reporting period.
    const evmMetrics = calculateLatestEvmMetrics(initiatives);
    const spi = evmMetrics.spi === null ? null : Number(evmMetrics.spi.toFixed(2));
    const cpi = evmMetrics.cpi === null ? null : Number(evmMetrics.cpi.toFixed(2));

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

  // Real time-phased EVM data: aggregate cumulative observations by reporting period.
  const evmHistory = useMemo(() => aggregateEvmHistory(initiatives), [initiatives]);

  const latestEvm = useMemo(() => calculateLatestEvmMetrics(initiatives), [initiatives]);

  useEffect(() => {
    if (!initiatives.some((initiative) => initiative.id === evmTargetId)) {
      setEvmTargetId(initiatives[0]?.id ?? 0);
    }
  }, [initiatives, evmTargetId]);

  const handleAddEvmSnapshot = () => {
    const target = initiatives.find((initiative) => initiative.id === evmTargetId);
    if (!target) {
      showToast('ابتدا یک پروژه در سازمان جاری انتخاب کنید.', 'error');
      return;
    }
    if (!/^\\d{4}-(0[1-9]|1[0-2])$/.test(evmPeriodKey)) {
      showToast('دوره را با قالب YYYY-MM وارد کنید.', 'error');
      return;
    }
    if (![evmPlannedProgress, evmActualProgress, evmActualCost].every(Number.isFinite) ||
        evmPlannedProgress < 0 || evmPlannedProgress > 100 ||
        evmActualProgress < 0 || evmActualProgress > 100 || evmActualCost < 0) {
      showToast('درصدهای برنامه‌ای/واقعی باید بین ۰ تا ۱۰۰ و هزینه واقعی نامنفی باشد.', 'error');
      return;
    }
    const nextSnapshot: EvmPeriodSnapshot = {
      period_key: evmPeriodKey,
      planned_progress: evmPlannedProgress,
      actual_progress: evmActualProgress,
      actual_cost: evmActualCost,
      recorded_at: new Date().toISOString(),
    };
    const updated = (db.initiatives ?? []).map((initiative) => {
      if (initiative.id !== target.id) return initiative;
      const history = [...(initiative.evm_periods ?? [])];
      const index = history.findIndex((snapshot) => snapshot.period_key === evmPeriodKey);
      if (index >= 0) history[index] = nextSnapshot;
      else history.push(nextSnapshot);
      history.sort((a, b) => a.period_key.localeCompare(b.period_key));
      return { ...initiative, evm_periods: history };
    });
    onUpdateDb({ ...db, initiatives: updated });
    showToast('داده دوره‌ای EVM ثبت شد.', 'success');
  };

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
    const newId = createStableId(currentList.map((i) => i.id));

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
                  (portfolioStats.spi !== null && portfolioStats.spi >= 1.0)
                    ? 'text-emerald-400'
                    : (portfolioStats.spi !== null && portfolioStats.spi >= 0.85)
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {portfolioStats.spi === null ? '—' : toFa(portfolioStats.spi, 2)}
              </span>
              <span className="text-[10px] text-slate-400">
                {portfolioStats.spi === null ? 'داده دوره‌ای ثبت نشده' : (portfolioStats.spi >= 1.0 ? 'جلوتر از برنامه' : 'دارای تأخیر زمانی')}
              </span>
            </div>
            <p className="text-[10px] text-slate-400 truncate">
              {(portfolioStats.spi !== null && portfolioStats.spi >= 1.0)
                ? 'نرخ تحقق زمان‌بندی مطلوب'
                : `انحراف زمانی: ${portfolioStats.spi === null ? '—' : toFa(Math.round((1 - portfolioStats.spi) * 100))}٪ تاخیر`}
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
                  (portfolioStats.cpi !== null && portfolioStats.cpi >= 1.0)
                    ? 'text-emerald-400'
                    : 'text-amber-400'
                }`}
              >
                {portfolioStats.cpi === null ? '—' : toFa(portfolioStats.cpi, 2)}
              </span>
              <span className="text-[10px] text-slate-400">
                {portfolioStats.cpi === null ? 'داده دوره‌ای ثبت نشده' : (portfolioStats.cpi >= 1.0 ? 'صرفه‌جویی بودجه' : 'انحراف بودجه')}
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

      {/* 4. VIEW 2: DATA-BACKED EARNED VALUE MANAGEMENT */}
      {viewMode === 'scurve' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
            <div className="flex items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white">ثبت تاریخچه واقعی EVM</h3>
                <p className="text-[11px] text-slate-400 mt-1">برای هر پروژه و هر دوره، درصد برنامه‌ای، درصد تحقق واقعی و هزینه تجمعی تا پایان دوره را ثبت کنید. PV و EV از BAC محاسبه می‌شوند. هزینه واقعی باید تجمعی باشد.</p>
              </div>
              <span className="text-[10px] px-2 py-1 rounded-lg bg-teal-500/10 text-teal-300 border border-teal-500/20">داده واقعی ثبت‌شده</span>
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-3">
              <label className="text-xs text-slate-300 lg:col-span-2">پروژه
                <select value={evmTargetId} onChange={(e) => setEvmTargetId(Number(e.target.value))} className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white">
                  {initiatives.map((initiative) => <option key={initiative.id} value={initiative.id}>{initiative.title}</option>)}
                </select>
              </label>
              <label className="text-xs text-slate-300">دوره (YYYY-MM)
                <input value={evmPeriodKey} onChange={(e) => setEvmPeriodKey(e.target.value)} placeholder="1405-07" className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
              </label>
              <label className="text-xs text-slate-300">پیشرفت برنامه‌ای (%)
                <input type="number" min="0" max="100" value={evmPlannedProgress} onChange={(e) => setEvmPlannedProgress(Number(e.target.value))} className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
              </label>
              <label className="text-xs text-slate-300">پیشرفت واقعی (%)
                <input type="number" min="0" max="100" value={evmActualProgress} onChange={(e) => setEvmActualProgress(Number(e.target.value))} className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
              </label>
              <label className="text-xs text-slate-300">هزینه تجمعی (م.ر)
                <input type="number" min="0" step="0.1" value={evmActualCost} onChange={(e) => setEvmActualCost(Number(e.target.value))} className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
              </label>
            </div>
            <button disabled={!initiatives.length} onClick={handleAddEvmSnapshot} className="px-4 py-2 rounded-lg bg-teal-600 hover:bg-teal-500 disabled:opacity-40 text-white text-xs font-semibold">ثبت / به‌روزرسانی دوره</button>
          </div>

          <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
            {[
              { label: 'BAC بودجه مصوب', value: latestEvm.bac, suffix: 'م.ر' },
              { label: 'PV ارزش برنامه‌ای', value: latestEvm.pv, suffix: 'م.ر' },
              { label: 'EV ارزش کسب‌شده', value: latestEvm.ev, suffix: 'م.ر' },
              { label: 'AC هزینه واقعی', value: latestEvm.ac, suffix: 'م.ر' },
              { label: 'EAC برآورد هزینه نهایی', value: latestEvm.eac, suffix: 'م.ر' },
            ].map((metric) => (
              <div key={metric.label} className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <p className="text-[10px] text-slate-400">{metric.label}</p>
                <p className="mt-1 text-lg font-bold text-white">{metric.value === null ? '—' : toFa(Math.round(metric.value * 100) / 100)} <span className="text-[10px] text-slate-400">{metric.suffix}</span></p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-8 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg">
              <div className="flex items-center justify-between gap-3 pb-3 border-b border-slate-800">
                <h3 className="text-sm font-bold text-white">منحنی تجمعی PV / EV / AC</h3>
                <span className="text-[10px] text-slate-400">دوره آخر: {latestEvm.period ?? '—'} · پوشش {toFa(latestEvm.projectsWithHistory)} از {toFa(latestEvm.projectsInScope)} پروژه</span>
              </div>
              {evmHistory.length === 0 ? (
                <div className="py-16 text-center text-sm text-slate-400">هنوز تاریخچه EVM ثبت نشده است. برای جلوگیری از نمایش اعداد ساختگی، نمودار پس از ثبت اولین دوره رسم می‌شود.</div>
              ) : (
                <div className="h-72 mt-4">
                  <ResponsiveContainer width="100%" height="100%">
                    <ComposedChart data={evmHistory} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.6} />
                      <XAxis dataKey="month" stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <YAxis stroke="#94a3b8" tick={{ fill: '#94a3b8', fontSize: 10 }} />
                      <Tooltip formatter={(value) => value == null ? '—' : toFa(Number(value), 2) + ' م.ر'} />
                      <Legend wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }} />
                      <Line type="monotone" name="PV ارزش برنامه‌ای" dataKey="planned" stroke="#64748b" strokeWidth={2} dot={{ r: 3 }} />
                      <Area type="monotone" name="EV ارزش کسب‌شده" dataKey="earned" stroke="#14b8a6" strokeWidth={3} fill="#14b8a6" fillOpacity={0.15} />
                      <Line type="monotone" name="AC هزینه واقعی" dataKey="cost" stroke="#f59e0b" strokeWidth={2} dot={{ r: 2 }} />
                    </ComposedChart>
                  </ResponsiveContainer>
                </div>
              )}
              <p className="pt-3 border-t border-slate-800 text-[11px] text-slate-400">واحد ارزش‌ها و هزینه‌ها: میلیارد ریال. برای مقایسه معتبر، درصدهای پیشرفت و AC باید برای یک دوره گزارش یکسان و به‌صورت تجمعی ثبت شوند.</p>
            </div>

            <div className="lg:col-span-4 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg space-y-4">
              <h3 className="text-sm font-bold text-white border-b border-slate-800 pb-3">تحلیل عملکرد و سناریوی بودجه</h3>
              {latestEvm.spi === null || latestEvm.cpi === null ? (
                <p className="text-xs text-slate-400">برای محاسبه SPI و CPI باید PV و AC مثبت و تاریخچه دوره‌ای معتبر ثبت شده باشد.</p>
              ) : (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><p className="text-[10px] text-slate-400">SPI = EV / PV</p><p className="text-xl font-bold text-white">{toFa(latestEvm.spi, 2)}</p></div>
                  <div className="p-3 rounded-xl bg-slate-950 border border-slate-800"><p className="text-[10px] text-slate-400">CPI = EV / AC</p><p className="text-xl font-bold text-white">{toFa(latestEvm.cpi, 2)}</p></div>
                </div>
              )}
              <label className="block text-xs text-slate-300">بودجه اضافی فرضی (میلیارد ریال)
                <input type="number" min="0" step="1" value={simExtraBudget} onChange={(e) => setSimExtraBudget(Math.max(0, Number(e.target.value) || 0))} className="mt-1 w-full p-2 rounded-lg bg-slate-950 border border-slate-700 text-white" />
              </label>
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-xs">
                <p className="text-slate-400">بودجه در دسترس پس از تزریق</p>
                <p className="mt-1 text-lg font-bold text-white">{toFa(latestEvm.bac + simExtraBudget, 2)} م.ر</p>
                <p className="mt-2 text-[11px] text-slate-400">این سناریو صرفاً ظرفیت بودجه را تغییر می‌دهد؛ به‌طور خودکار SPI/CPI یا تاریخ پایان را بهتر فرض نمی‌کند. پیش‌بینی زمان و هزینه به مدل برنامه زمان‌بندی، منابع و داده‌های معتبر نیاز دارد.</p>
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