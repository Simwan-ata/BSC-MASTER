import React, { useState, useMemo } from 'react';
import {
  Gem,
  Award,
  Sparkles,
  ShieldCheck,
  Zap,
  Lock,
  Scale,
  AlertOctagon,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Search,
  CheckCircle2,
  XCircle,
  HelpCircle,
  TrendingUp,
  Target,
  ArrowRight,
  Send,
  Eye,
  Sliders,
  RefreshCw,
  Layers,
  ChevronDown,
  ChevronUp,
  Info,
} from 'lucide-react';
import {
  PieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';
import {
  DatabaseState,
  VrioItem,
  VrioResourceCategory,
  VrioImplication,
  SwotItem,
} from '../types';
import { toFa } from '../scoring';

interface VrioAnalysisSectionProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  currentOrgObjectives?: Array<{ id: number; title: string }>;
}

export const VrioAnalysisSection: React.FC<VrioAnalysisSectionProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
  currentOrgObjectives = [],
}) => {
  const [categoryFilter, setCategoryFilter] = useState<'all' | VrioResourceCategory>('all');
  const [implicationFilter, setImplicationFilter] = useState<'all' | VrioImplication>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedOverrides, setSimulatedOverrides] = useState<Record<number, Partial<VrioItem>>>({});

  // Add Modal State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newResourceName, setNewResourceName] = useState('');
  const [newCategory, setNewCategory] = useState<VrioResourceCategory>('intellectual');
  const [newDescription, setNewDescription] = useState('');
  const [newValuable, setNewValuable] = useState(true);
  const [newRare, setNewRare] = useState(true);
  const [newInimitable, setNewInimitable] = useState(true);
  const [newOrganized, setNewOrganized] = useState(false);
  const [newDynamicScore, setNewDynamicScore] = useState<number>(7.5);
  const [newMoat, setNewMoat] = useState<'none' | 'narrow' | 'wide'>('narrow');
  const [newActionPlan, setNewActionPlan] = useState('');
  const [newLinkedObjId, setNewLinkedObjId] = useState<number | undefined>(
    currentOrgObjectives[0]?.id
  );

  // Edit item state
  const [editingId, setEditingId] = useState<number | null>(null);

  // Get raw items for this org
  const rawOrgItems = useMemo(() => {
    return (db.vrioItems || []).filter((item) => item.org_id === selectedOrgId);
  }, [db.vrioItems, selectedOrgId]);

  // Merge with simulated overrides if in simulation mode
  const orgItems = useMemo(() => {
    return rawOrgItems.map((item) => {
      if (simulationMode && simulatedOverrides[item.id]) {
        return { ...item, ...simulatedOverrides[item.id] };
      }
      return item;
    });
  }, [rawOrgItems, simulationMode, simulatedOverrides]);

  // Barney VRIO Decision Evaluation
  const evaluateVrio = (
    v: boolean,
    r: boolean,
    i: boolean,
    o: boolean
  ): {
    implication: VrioImplication;
    title: string;
    subtitle: string;
    badgeBg: string;
    badgeText: string;
    borderColor: string;
    icon: React.ElementType;
    performanceImpact: string;
  } => {
    if (!v) {
      return {
        implication: 'disadvantage',
        title: 'ضعف و ناتوانی رقابتی',
        subtitle: 'فاقد ارزش استراتژیک (هزینه‌ساز یا منسوخ)',
        badgeBg: 'bg-rose-50',
        badgeText: 'text-rose-700 border-rose-200',
        borderColor: 'border-rose-400',
        icon: XCircle,
        performanceImpact: 'عملکرد مالی زیر میانگین صنعت',
      };
    }
    if (!r) {
      return {
        implication: 'parity',
        title: 'برابری رقابتی (استاندارد صنعت)',
        subtitle: 'باارزش اما در دسترس رقبا',
        badgeBg: 'bg-slate-100',
        badgeText: 'text-slate-700 border-slate-300',
        borderColor: 'border-slate-400',
        icon: Scale,
        performanceImpact: 'عملکرد در حد میانگین بازار',
      };
    }
    if (!i) {
      return {
        implication: 'temporary_advantage',
        title: 'مزیت رقابتی موقت و گذرا',
        subtitle: 'باارزش و کمیاب، اما قابل تقلید آسان',
        badgeBg: 'bg-amber-50',
        badgeText: 'text-amber-700 border-amber-200',
        borderColor: 'border-amber-400',
        icon: Zap,
        performanceImpact: 'سودآوری بالاتر از میانگین در کوتاه‌مدت',
      };
    }
    if (!o) {
      return {
        implication: 'unused_advantage',
        title: 'مزیت بلااستفاده / خفته',
        subtitle: 'باارزش، کمیاب و غیرقابل تقلید، اما بدون ساختار مناسب',
        badgeBg: 'bg-indigo-50',
        badgeText: 'text-indigo-700 border-indigo-200',
        borderColor: 'border-indigo-400',
        icon: Lock,
        performanceImpact: 'پتانسیل بالا اما عدم بهره‌برداری کامل',
      };
    }
    return {
      implication: 'sustained_advantage',
      title: 'مزیت رقابتی پایدار (شایستگی طلایی)',
      subtitle: 'ترکیب کامل V+R+I+O با بهره‌برداری نهادینه',
      badgeBg: 'bg-emerald-50',
      badgeText: 'text-emerald-700 border-emerald-200',
      borderColor: 'border-emerald-500',
      icon: Award,
      performanceImpact: 'سودآوری و بازدهی مستمر و فراتر از رقبا',
    };
  };

  // Distribution & Statistics
  const stats = useMemo(() => {
    let sustained = 0;
    let temporary = 0;
    let unused = 0;
    let parity = 0;
    let disadvantage = 0;
    let totalScore = 0;

    orgItems.forEach((item) => {
      const res = evaluateVrio(
        item.is_valuable,
        item.is_rare,
        item.is_inimitable,
        item.is_organized
      );
      if (res.implication === 'sustained_advantage') sustained++;
      else if (res.implication === 'temporary_advantage') temporary++;
      else if (res.implication === 'unused_advantage') unused++;
      else if (res.implication === 'parity') parity++;
      else if (res.implication === 'disadvantage') disadvantage++;

      totalScore += item.dynamic_capability_score || 7.0;
    });

    const avgDynamicCap = orgItems.length > 0 ? (totalScore / orgItems.length).toFixed(1) : '۰';

    const pieData = [
      { name: 'مزیت پایدار', value: sustained, color: '#10b981' },
      { name: 'مزیت موقت', value: temporary, color: '#f59e0b' },
      { name: 'مزیت بلااستفاده', value: unused, color: '#6366f1' },
      { name: 'برابری رقابتی', value: parity, color: '#64748b' },
      { name: 'ضعف رقابتی', value: disadvantage, color: '#ef4444' },
    ].filter((d) => d.value > 0);

    return {
      total: orgItems.length,
      sustained,
      temporary,
      unused,
      parity,
      disadvantage,
      avgDynamicCap,
      pieData,
    };
  }, [orgItems]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    return orgItems.filter((item) => {
      const matchesSearch =
        item.resource_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;
      const evalRes = evaluateVrio(
        item.is_valuable,
        item.is_rare,
        item.is_inimitable,
        item.is_organized
      );
      const matchesImplication =
        implicationFilter === 'all' || evalRes.implication === implicationFilter;
      return matchesSearch && matchesCategory && matchesImplication;
    });
  }, [orgItems, searchTerm, categoryFilter, implicationFilter]);

  // Live Toggle Handler
  const handleToggle = (
    itemId: number,
    field: 'is_valuable' | 'is_rare' | 'is_inimitable' | 'is_organized'
  ) => {
    if (simulationMode) {
      const currentVal =
        simulatedOverrides[itemId]?.[field] ??
        rawOrgItems.find((i) => i.id === itemId)?.[field] ??
        false;
      setSimulatedOverrides((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          [field]: !currentVal,
        },
      }));
      return;
    }

    const updated = (db.vrioItems || []).map((item) => {
      if (item.id === itemId) {
        return { ...item, [field]: !item[field] };
      }
      return item;
    });

    onUpdateDb({ ...db, vrioItems: updated });
    showToast('وضعیت معیار VRIO با موفقیت به‌روزرسانی شد.', 'success');
  };

  // Dynamic Score Slider Handler
  const handleScoreChange = (itemId: number, newScore: number) => {
    if (simulationMode) {
      setSimulatedOverrides((prev) => ({
        ...prev,
        [itemId]: {
          ...prev[itemId],
          dynamic_capability_score: newScore,
        },
      }));
      return;
    }

    const updated = (db.vrioItems || []).map((item) => {
      if (item.id === itemId) {
        return { ...item, dynamic_capability_score: newScore };
      }
      return item;
    });
    onUpdateDb({ ...db, vrioItems: updated });
  };

  // Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newResourceName.trim()) {
      showToast('لطفاً عنوان منبع یا شایستگی را وارد کنید.', 'error');
      return;
    }

    const newItem: VrioItem = {
      id: Date.now(),
      org_id: selectedOrgId,
      resource_name: newResourceName.trim(),
      category: newCategory,
      description: newDescription.trim(),
      is_valuable: newValuable,
      is_rare: newRare,
      is_inimitable: newInimitable,
      is_organized: newOrganized,
      dynamic_capability_score: newDynamicScore,
      economic_moat: newMoat,
      action_plan: newActionPlan.trim(),
      linkedObjectiveId: newLinkedObjId,
    };

    const updatedList = [...(db.vrioItems || []), newItem];
    onUpdateDb({ ...db, vrioItems: updatedList });
    setIsAddModalOpen(false);
    resetForm();
    showToast('شایستگی و منبع سازمانی جدید با موفقیت افزوده شد.', 'success');
  };

  const resetForm = () => {
    setNewResourceName('');
    setNewCategory('intellectual');
    setNewDescription('');
    setNewValuable(true);
    setNewRare(true);
    setNewInimitable(true);
    setNewOrganized(false);
    setNewDynamicScore(7.5);
    setNewMoat('narrow');
    setNewActionPlan('');
  };

  // Delete Item
  const handleDeleteItem = (id: number) => {
    const updated = (db.vrioItems || []).filter((i) => i.id !== id);
    onUpdateDb({ ...db, vrioItems: updated });
    showToast('منبع سازمانی از ماتریس VRIO حذف گردید.', 'success');
  };

  // Export to SWOT Strength
  const handleExportToSwot = (item: VrioItem) => {
    const newSwot: SwotItem = {
      id: Date.now(),
      org_id: selectedOrgId,
      type: 'strength',
      title: `قوت مبتنی بر شایستگی VRIO: ${item.resource_name}`,
      description: `${item.description} (قابلیت پویا: ${toFa(
        item.dynamic_capability_score || 8
      )}/۱۰)`,
      importance: 'high',
      score: (item.dynamic_capability_score || 8) * 1.0,
      linked_objective_id: item.linkedObjectiveId,
    };

    const updatedSwot = [...(db.swotItems || []), newSwot];
    onUpdateDb({ ...db, swotItems: updatedSwot });
    showToast(`شایستگی "${item.resource_name}" به نقاط قوت ماتریس SWOT افزوده شد.`, 'success');
  };

  const getCategoryLabel = (cat: VrioResourceCategory) => {
    switch (cat) {
      case 'physical':
        return 'فیزیکی و تجهیزاتی';
      case 'intellectual':
        return 'دانش فنی و پتنت';
      case 'human':
        return 'سرمایه انسانی و مهارت';
      case 'financial':
        return 'مالی و منابع سرمایه‌ای';
      case 'organizational':
        return 'سازمانی و ساختاری';
      case 'technological':
        return 'فناوری و سامانه‌های هوشمند';
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white rounded-2xl p-6 border border-indigo-800/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-indigo-500/20 border border-indigo-400/30 rounded-full text-indigo-200 text-xs font-semibold">
              <Gem className="w-3.5 h-3.5 text-indigo-400" />
              <span>چارچوب دیدگاه مبتنی بر منابع (Resource-Based View - RBV)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              ماتریس تحلیل شایستگی‌های محوری VRIO
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              ارزیابی ساختاریافته دارایی‌ها بر پایه ۴ بعد{' '}
              <strong className="text-emerald-400">ارزش (Value)</strong>،{' '}
              <strong className="text-amber-400">کمیابی (Rarity)</strong>،{' '}
              <strong className="text-purple-400">دشواری تقلید (Inimitability)</strong> و{' '}
              <strong className="text-teal-400">سازماندهی (Organization)</strong> جهت تفکیک مزایای رقابتی پایدار هلدینگ.
            </p>
          </div>

          {/* Action Toolbar */}
          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => {
                setSimulationMode(!simulationMode);
                if (simulationMode) setSimulatedOverrides({});
              }}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-bold transition-all ${
                simulationMode
                  ? 'bg-amber-500 text-slate-950 ring-2 ring-amber-300 shadow-md'
                  : 'bg-white/10 hover:bg-white/15 text-white border border-white/15'
              }`}
            >
              <Sliders className="w-4 h-4" />
              <span>{simulationMode ? 'خروج از شبیه‌ساز What-If' : 'شبیه‌ساز تهاجم رقیب (What-If)'}</span>
            </button>

            {simulationMode && (
              <button
                onClick={() => setSimulatedOverrides({})}
                className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-400/30"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>ریست شبیه‌سازی</span>
              </button>
            )}

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن شایستگی / دارایی</span>
            </button>
          </div>
        </div>

        {/* What-If Active Alert */}
        {simulationMode && (
          <div className="mt-4 p-3 bg-amber-500/15 border border-amber-400/40 rounded-xl flex items-center justify-between text-xs text-amber-200">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-amber-400 shrink-0" />
              <span>
                <strong>حالت شبیه‌سازی فعال است:</strong> تغییرات سوئیچ‌ها و امتیازها موقتی بوده و پایگاه داده اصلی تغییر نمی‌کند. سناریوهای تضعیف یا ارتقای دارایی‌ها را آزمایش کنید.
              </span>
            </div>
            <span className="font-mono text-[11px] bg-amber-400/20 px-2 py-0.5 rounded text-amber-300 font-bold">
              {toFa(Object.keys(simulatedOverrides).length)} تغییر شبیه‌سازی‌شده
            </span>
          </div>
        )}
      </div>

      {/* KPI Cards & Barney Decision Pipeline */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="bg-white p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-500 block">شایستگی‌های ثبت‌شده</span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-900">{toFa(stats.total)}</span>
            <span className="text-[10px] text-slate-400">دارایی کلیدی</span>
          </div>
        </div>

        <div className="bg-emerald-50/60 p-3.5 rounded-2xl border border-emerald-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-emerald-800 block flex items-center gap-1">
            <Award className="w-3.5 h-3.5 text-emerald-600" />
            مزیت پایدار (VRIO)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-emerald-700">{toFa(stats.sustained)}</span>
            <span className="text-[10px] text-emerald-600 font-bold">شایستگی طلایی</span>
          </div>
        </div>

        <div className="bg-amber-50/60 p-3.5 rounded-2xl border border-amber-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-amber-800 block flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-600" />
            مزیت موقت (VRI-)
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-amber-700">{toFa(stats.temporary)}</span>
            <span className="text-[10px] text-amber-600">در معرض تقلید</span>
          </div>
        </div>

        <div className="bg-indigo-50/60 p-3.5 rounded-2xl border border-indigo-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-indigo-800 block flex items-center gap-1">
            <Lock className="w-3.5 h-3.5 text-indigo-600" />
            مزیت خفته / بلااستفاده
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-indigo-700">{toFa(stats.unused)}</span>
            <span className="text-[10px] text-indigo-600">نیازمند سازماندهی</span>
          </div>
        </div>

        <div className="bg-slate-50 p-3.5 rounded-2xl border border-slate-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-slate-700 block flex items-center gap-1">
            <Scale className="w-3.5 h-3.5 text-slate-500" />
            برابری رقابتی
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-slate-700">{toFa(stats.parity)}</span>
            <span className="text-[10px] text-slate-500">استاندارد صنعت</span>
          </div>
        </div>

        <div className="bg-rose-50/60 p-3.5 rounded-2xl border border-rose-200 shadow-2xs">
          <span className="text-[11px] font-semibold text-rose-800 block flex items-center gap-1">
            <AlertOctagon className="w-3.5 h-3.5 text-rose-600" />
            ضعف رقابتی
          </span>
          <div className="flex items-baseline justify-between mt-1">
            <span className="text-xl font-black text-rose-700">{toFa(stats.disadvantage)}</span>
            <span className="text-[10px] text-rose-600">گلوگاه هزینه‌ساز</span>
          </div>
        </div>
      </div>

      {/* Decision Tree Infographic & Distribution Visualizer */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Barney Decision Tree Visualizer */}
        <div className="lg:col-span-2 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                منطق درخت تصمیم‌گیری جی. بارنی (Jay Barney Decision Flow)
              </h3>
            </div>
            <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full font-mono">
              V → R → I → O
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-2.5 text-center text-xs">
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="w-6 h-6 rounded-full bg-emerald-600 text-white flex items-center justify-center mx-auto font-black text-xs">
                V
              </div>
              <span className="font-bold text-slate-800 block text-[11px]">ارزش‌آفرینی (Value)</span>
              <p className="text-[10px] text-slate-500">آیا به مهار تهدید یا بهره‌گیری از فرصت کمک می‌کند؟</p>
              <div className="pt-1 text-[9px] text-rose-600 font-semibold">خیر ⬅ ضعف رقابتی</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="w-6 h-6 rounded-full bg-amber-500 text-white flex items-center justify-center mx-auto font-black text-xs">
                R
              </div>
              <span className="font-bold text-slate-800 block text-[11px]">کمیابی (Rarity)</span>
              <p className="text-[10px] text-slate-500">آیا این دارایی تنها در کنترل تعداد اندکی رقیب است؟</p>
              <div className="pt-1 text-[9px] text-slate-600 font-semibold">خیر ⬅ برابری رقابتی</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="w-6 h-6 rounded-full bg-purple-600 text-white flex items-center justify-center mx-auto font-black text-xs">
                I
              </div>
              <span className="font-bold text-slate-800 block text-[11px]">دشواری تقلید (Inimitability)</span>
              <p className="text-[10px] text-slate-500">آیا بازتولید آن برای رقبا هزینه‌بر یا زمان‌بر است؟</p>
              <div className="pt-1 text-[9px] text-amber-600 font-semibold">خیر ⬅ مزیت موقت</div>
            </div>

            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-1">
              <div className="w-6 h-6 rounded-full bg-teal-600 text-white flex items-center justify-center mx-auto font-black text-xs">
                O
              </div>
              <span className="font-bold text-slate-800 block text-[11px]">سازماندهی (Organization)</span>
              <p className="text-[10px] text-slate-500">آیا ساختار، سیستم‌ها و انگیزش‌ها برای آن مهیاست؟</p>
              <div className="pt-1 text-[9px] text-emerald-600 font-semibold">بله ⬅ مزیت پایدار</div>
            </div>
          </div>
        </div>

        {/* Advantage Distribution Pie */}
        <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs flex flex-col justify-between">
          <div className="flex items-center justify-between border-b border-slate-100 pb-2">
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-indigo-600" />
              توزیع وضعیت مزیت رقابتی
            </h3>
            <span className="text-[10px] text-slate-500">
              میانگین قابلیت پویا: <strong>{toFa(stats.avgDynamicCap)}</strong>/۱۰
            </span>
          </div>

          <div className="h-44 w-full flex items-center justify-center">
            {stats.pieData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={stats.pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={42}
                    outerRadius={68}
                    paddingAngle={4}
                    dataKey="value"
                  >
                    {stats.pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <RechartsTooltip
                    formatter={(val: any) => [`${toFa(val)} منبع`, 'تعداد']}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <span className="text-xs text-slate-400">داده‌ای یافت نشد</span>
            )}
          </div>

          <div className="flex flex-wrap items-center justify-center gap-2 pt-2 border-t border-slate-100 text-[10px]">
            {stats.pieData.map((d) => (
              <div key={d.name} className="flex items-center gap-1">
                <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: d.color }} />
                <span className="text-slate-600">{d.name}</span>
                <span className="font-bold text-slate-900 font-mono">({toFa(d.value)})</span>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          <div className="relative flex-1 sm:w-60">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="جستجو در نام منبع یا شایستگی..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          </div>

          {/* Category Dropdown */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value as any)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
          >
            <option value="all">همه دسته‌بندی‌ها</option>
            <option value="intellectual">دانش فنی و پتنت</option>
            <option value="physical">فیزیکی و تجهیزاتی</option>
            <option value="human">سرمایه انسانی</option>
            <option value="organizational">سازمانی و ساختاری</option>
            <option value="technological">فناوری و سیستم‌ها</option>
            <option value="financial">منابع مالی</option>
          </select>

          {/* Status Dropdown */}
          <select
            value={implicationFilter}
            onChange={(e) => setImplicationFilter(e.target.value as any)}
            className="text-xs p-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:outline-none"
          >
            <option value="all">همه وضعیت‌های رقابتی</option>
            <option value="sustained_advantage">مزیت پایدار (طلایی)</option>
            <option value="temporary_advantage">مزیت موقت</option>
            <option value="unused_advantage">مزیت خفته / بلااستفاده</option>
            <option value="parity">برابری رقابتی</option>
            <option value="disadvantage">ضعف رقابتی</option>
          </select>
        </div>

        <div className="text-[11px] text-slate-500 self-end sm:self-center">
          نمایش <strong>{toFa(filteredItems.length)}</strong> از {toFa(orgItems.length)} منبع
        </div>
      </div>

      {/* Interactive Competency Matrix List */}
      <div className="space-y-4">
        {filteredItems.map((item) => {
          const evalRes = evaluateVrio(
            item.is_valuable,
            item.is_rare,
            item.is_inimitable,
            item.is_organized
          );
          const EvalIcon = evalRes.icon;
          const isOverridden = simulationMode && simulatedOverrides[item.id];
          const linkedObj = currentOrgObjectives.find((o) => o.id === item.linkedObjectiveId);

          return (
            <div
              key={item.id}
              className={`bg-white rounded-2xl border ${
                isOverridden ? 'border-amber-400 ring-2 ring-amber-300/40' : 'border-slate-200'
              } p-5 shadow-2xs transition-all hover:shadow-md space-y-4`}
            >
              {/* Row Header */}
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3 border-b border-slate-100 pb-3">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-bold text-sm text-slate-900">{item.resource_name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-md bg-slate-100 text-slate-600 font-semibold">
                      {getCategoryLabel(item.category)}
                    </span>
                    {item.economic_moat && (
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                          item.economic_moat === 'wide'
                            ? 'bg-purple-100 text-purple-800'
                            : item.economic_moat === 'narrow'
                            ? 'bg-blue-100 text-blue-800'
                            : 'bg-slate-100 text-slate-500'
                        }`}
                      >
                        خندق اقتصادی: {item.economic_moat === 'wide' ? 'عریض (Wide)' : item.economic_moat === 'narrow' ? 'محدود' : 'فاقد خندق'}
                      </span>
                    )}
                    {isOverridden && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-800 font-bold">
                        شبیه‌سازی‌شده
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600 leading-relaxed max-w-3xl">
                    {item.description}
                  </p>
                </div>

                {/* Classification Badge Result */}
                <div
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border ${evalRes.badgeBg} ${evalRes.badgeText} shrink-0 self-start`}
                >
                  <EvalIcon className="w-4 h-4" />
                  <div className="text-right">
                    <span className="block text-xs font-black">{evalRes.title}</span>
                    <span className="text-[10px] opacity-80">{evalRes.performanceImpact}</span>
                  </div>
                </div>
              </div>

              {/* Interactive V-R-I-O Switched Bar */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-3 bg-slate-50/70 p-3.5 rounded-xl border border-slate-200/80">
                {/* 1. Value Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, 'is_valuable')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs font-semibold ${
                    item.is_valuable
                      ? 'bg-emerald-50 border-emerald-300 text-emerald-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                        item.is_valuable ? 'bg-emerald-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      V
                    </span>
                    <span>ارزش‌آفرینی (Value)</span>
                  </div>
                  {item.is_valuable ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                {/* 2. Rare Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, 'is_rare')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs font-semibold ${
                    item.is_rare
                      ? 'bg-amber-50 border-amber-300 text-amber-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                        item.is_rare ? 'bg-amber-500 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      R
                    </span>
                    <span>کمیابی (Rarity)</span>
                  </div>
                  {item.is_rare ? (
                    <CheckCircle2 className="w-4 h-4 text-amber-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                {/* 3. Inimitable Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, 'is_inimitable')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs font-semibold ${
                    item.is_inimitable
                      ? 'bg-purple-50 border-purple-300 text-purple-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                        item.is_inimitable ? 'bg-purple-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      I
                    </span>
                    <span>دشواری تقلید (Inimitability)</span>
                  </div>
                  {item.is_inimitable ? (
                    <CheckCircle2 className="w-4 h-4 text-purple-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                </button>

                {/* 4. Organized Toggle */}
                <button
                  type="button"
                  onClick={() => handleToggle(item.id, 'is_organized')}
                  className={`flex items-center justify-between p-2.5 rounded-lg border transition-all text-xs font-semibold ${
                    item.is_organized
                      ? 'bg-teal-50 border-teal-300 text-teal-900 shadow-2xs'
                      : 'bg-white border-slate-200 text-slate-400 hover:border-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span
                      className={`w-5 h-5 rounded-full flex items-center justify-center font-black text-[11px] ${
                        item.is_organized ? 'bg-teal-600 text-white' : 'bg-slate-200 text-slate-500'
                      }`}
                    >
                      O
                    </span>
                    <span>سازماندهی (Organization)</span>
                  </div>
                  {item.is_organized ? (
                    <CheckCircle2 className="w-4 h-4 text-teal-600" />
                  ) : (
                    <XCircle className="w-4 h-4 text-slate-300" />
                  )}
                </button>
              </div>

              {/* Dynamic Capability Scrubber & Action Plan */}
              <div className="flex flex-col md:flex-row items-center justify-between gap-4 pt-1">
                {/* Dynamic capability scrubber */}
                <div className="flex items-center gap-3 w-full md:w-auto">
                  <span className="text-[11px] text-slate-600 whitespace-nowrap">
                    امتیاز قابلیت پویا (Dynamic Capability):
                  </span>
                  <div className="flex items-center gap-2 flex-1 md:w-44">
                    <input
                      type="range"
                      min={1}
                      max={10}
                      step={0.5}
                      value={item.dynamic_capability_score || 7}
                      onChange={(e) => handleScoreChange(item.id, parseFloat(e.target.value))}
                      className="w-full accent-indigo-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {toFa(item.dynamic_capability_score || 7)}
                    </span>
                  </div>
                </div>

                {/* Linked Objective or Action Plan */}
                <div className="flex flex-wrap items-center gap-3 text-xs w-full md:w-auto justify-end">
                  {linkedObj && (
                    <div className="flex items-center gap-1.5 text-teal-800 bg-teal-50 px-2.5 py-1 rounded-lg border border-teal-200/60 text-[11px]">
                      <Target className="w-3.5 h-3.5 text-teal-600" />
                      <span>هدف متصل در BSC: {linkedObj.title}</span>
                    </div>
                  )}

                  {/* Send to SWOT Button */}
                  {(evalRes.implication === 'sustained_advantage' ||
                    evalRes.implication === 'temporary_advantage') && (
                    <button
                      type="button"
                      onClick={() => handleExportToSwot(item)}
                      className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] font-semibold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-lg transition-colors"
                      title="انتقال به نقاط قوت SWOT"
                    >
                      <Send className="w-3 h-3 text-emerald-600" />
                      <span>افزودن به قوت‌های SWOT</span>
                    </button>
                  )}

                  {/* Delete Item */}
                  <button
                    type="button"
                    onClick={() => handleDeleteItem(item.id)}
                    className="text-slate-400 hover:text-rose-600 p-1.5 rounded-lg transition-colors"
                    title="حذف این شایستگی"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Action Plan Text if available */}
              {item.action_plan && (
                <div className="p-2.5 bg-slate-50/80 rounded-xl border border-slate-200 text-xs text-slate-700 flex items-start gap-2">
                  <Info className="w-4 h-4 text-indigo-500 shrink-0 mt-0.5" />
                  <div>
                    <strong className="text-slate-900">برنامه اقدام صیانت و ارتقاء: </strong>
                    <span>{item.action_plan}</span>
                  </div>
                </div>
              )}
            </div>
          );
        })}

        {filteredItems.length === 0 && (
          <div className="text-center py-12 bg-white rounded-2xl border border-dashed border-slate-300">
            <Gem className="w-8 h-8 text-slate-300 mx-auto mb-2" />
            <p className="text-xs text-slate-500 font-semibold">
              هیچ شایستگی یا منبعی با این فیلترها یافت نشد.
            </p>
          </div>
        )}
      </div>

      {/* Add Competency Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Gem className="w-4 h-4 text-indigo-600" />
                ثبت شایستگی / دارایی سازمانی جدید
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان منبع یا شایستگی:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: لایسنس انحصاری کاتالیست پلیمری..."
                  value={newResourceName}
                  onChange={(e) => setNewResourceName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    دسته‌بندی دارایی:
                  </label>
                  <select
                    value={newCategory}
                    onChange={(e) => setNewCategory(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="intellectual">دانش فنی و پتنت</option>
                    <option value="physical">فیزیکی و تجهیزاتی</option>
                    <option value="human">سرمایه انسانی</option>
                    <option value="organizational">سازمانی و ساختاری</option>
                    <option value="technological">فناوری و سیستم‌ها</option>
                    <option value="financial">منابع مالی</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    خندق اقتصادی (Economic Moat):
                  </label>
                  <select
                    value={newMoat}
                    onChange={(e) => setNewMoat(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="wide">عریض (Wide Moat)</option>
                    <option value="narrow">محدود (Narrow Moat)</option>
                    <option value="none">فاقد خندق (None)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  شرح و دامنه ارزش‌آفرینی:
                </label>
                <textarea
                  rows={2}
                  placeholder="شرح اثرگذاری دارایی در کاهش هزینه، انحصار بازار یا کیفیت..."
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              {/* VRIO Switches in Modal */}
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                <span className="text-xs font-bold text-slate-800 block">
                  ارزیابی ابعاد چهارگانه VRIO:
                </span>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newValuable}
                      onChange={(e) => setNewValuable(e.target.checked)}
                      className="rounded accent-emerald-600"
                    />
                    <span>ارزش‌آفرین (Valuable)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newRare}
                      onChange={(e) => setNewRare(e.target.checked)}
                      className="rounded accent-amber-500"
                    />
                    <span>کمیاب (Rare)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newInimitable}
                      onChange={(e) => setNewInimitable(e.target.checked)}
                      className="rounded accent-purple-600"
                    />
                    <span>دشواری تقلید (Inimitable)</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={newOrganized}
                      onChange={(e) => setNewOrganized(e.target.checked)}
                      className="rounded accent-teal-600"
                    />
                    <span>سازماندهی‌شده (Organized)</span>
                  </label>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  برنامه اقدام برای ارتقاء یا صیانت:
                </label>
                <input
                  type="text"
                  placeholder="مثال: بازنگری ساختار انگیزشی، ثبت پتنت بین‌المللی..."
                  value={newActionPlan}
                  onChange={(e) => setNewActionPlan(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  پیوند به هدف استراتژیک در BSC:
                </label>
                <select
                  value={newLinkedObjId || ''}
                  onChange={(e) => setNewLinkedObjId(Number(e.target.value))}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                >
                  {currentOrgObjectives.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.title}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  ثبت شایستگی
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
