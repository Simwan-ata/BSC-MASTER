import React, { useState, useMemo } from 'react';
import { createStableId } from '../ids';
import {
  Swords,
  Users,
  Truck,
  ShieldAlert,
  RefreshCw,
  Sliders,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Search,
  ArrowUpRight,
  ArrowRight,
  ArrowDownRight,
  Target,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  Info,
  TrendingUp,
  Award,
  Layers,
  Compass,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import {
  DatabaseState,
  PorterForceItem,
  PorterForceType,
  PorterTrend,
  SwotItem,
} from '../types';
import { toFa } from '../scoring';

interface PorterFiveForcesSectionProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

interface ForceConfig {
  key: PorterForceType;
  title: string;
  shortTitle: string;
  icon: React.ElementType;
  color: string;
  bgLight: string;
  borderColor: string;
  description: string;
}

const FORCES_CONFIG: Record<PorterForceType, ForceConfig> = {
  rivalry: {
    key: 'rivalry',
    title: 'شدت رقابت میان رقبای فعلی',
    shortTitle: 'رقبای فعلی',
    icon: Swords,
    color: '#ef4444',
    bgLight: 'bg-red-500/10',
    borderColor: 'border-red-500/30',
    description: 'شدت جنگ قیمت، تبلیغات، ظرفیت‌های تولیدی و نبرد سهم بازار میان بازیگران صنعتی و پتروشیمی موجود.',
  },
  buyers: {
    key: 'buyers',
    title: 'قدرت چانه‌زنی خریداران',
    shortTitle: 'خریداران',
    icon: Users,
    color: '#3b82f6',
    bgLight: 'bg-blue-500/10',
    borderColor: 'border-blue-500/30',
    description: 'تمرکز خریداران، حجم خرید، هزینه تعویض تأمین‌کننده و حساسیت قیمت در بازارهای داخلی و صادراتی.',
  },
  suppliers: {
    key: 'suppliers',
    title: 'قدرت چانه‌زنی تأمین‌کنندگان',
    shortTitle: 'تأمین‌کنندگان',
    icon: Truck,
    color: '#f59e0b',
    bgLight: 'bg-amber-500/10',
    borderColor: 'border-amber-500/30',
    description: 'انحصار خوراک (گاز و میعانات)، قیمت‌گذاری دولتی، کمیابی کاتالیست‌ها و پایداری شبکه توزیع برق و انرژی.',
  },
  new_entrants: {
    key: 'new_entrants',
    title: 'تهدید ورود رقبای تازه‌وارد',
    shortTitle: 'تازه‌واردها',
    icon: ShieldAlert,
    color: '#10b981',
    bgLight: 'bg-emerald-500/10',
    borderColor: 'border-emerald-500/30',
    description: 'موانع ورود ناشی از سرمایه‌گذاری سنگین (CAPEX)، دسترسی به لایسنس‌های فناوری و پایانه‌های صادراتی.',
  },
  substitutes: {
    key: 'substitutes',
    title: 'تهدید محصولات و خدمات جایگزین',
    shortTitle: 'کالاهای جایگزین',
    icon: RefreshCw,
    color: '#8b5cf6',
    bgLight: 'bg-purple-500/10',
    borderColor: 'border-purple-500/30',
    description: 'توسعه پلیمرهای زیست‌تخریب‌پذیر، سوخت‌های سبز، مواد بازیافتی و فناوری‌های جایگزین هیدروکربوری.',
  },
};

export const PorterFiveForcesSection: React.FC<PorterFiveForcesSectionProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
}) => {
  // Filter state
  const [activeForceFilter, setActiveForceFilter] = useState<'all' | PorterForceType>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [trendFilter, setTrendFilter] = useState<'all' | PorterTrend>('all');

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PorterForceItem | null>(null);

  // Form state
  const [formForce, setFormForce] = useState<PorterForceType>('rivalry');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formIntensity, setFormIntensity] = useState<number>(3);
  const [formTrend, setFormTrend] = useState<PorterTrend>('stable');
  const [formStrategicResponse, setFormStrategicResponse] = useState('');
  const [formLinkedObjectiveId, setFormLinkedObjectiveId] = useState<number | undefined>();

  // Objectives for the current organization
  const currentOrgObjectives = useMemo(() => {
    return db.objectives.filter((o) => o.org_id === selectedOrgId || o.org_id === 1);
  }, [db.objectives, selectedOrgId]);

  // Current items
  const porterItems = useMemo(() => {
    return (db.porterItems || []).filter(
      (item) => item.org_id === selectedOrgId || item.org_id === 1
    );
  }, [db.porterItems, selectedOrgId]);

  // Calculations per force
  const forceStats = useMemo(() => {
    const stats: Record<
      PorterForceType,
      { count: number; avgIntensity: number; increasingCount: number }
    > = {
      rivalry: { count: 0, avgIntensity: 0, increasingCount: 0 },
      buyers: { count: 0, avgIntensity: 0, increasingCount: 0 },
      suppliers: { count: 0, avgIntensity: 0, increasingCount: 0 },
      new_entrants: { count: 0, avgIntensity: 0, increasingCount: 0 },
      substitutes: { count: 0, avgIntensity: 0, increasingCount: 0 },
    };

    (Object.keys(FORCES_CONFIG) as PorterForceType[]).forEach((f) => {
      const items = porterItems.filter((i) => i.force === f);
      const sum = items.reduce((acc, curr) => acc + curr.intensity, 0);
      stats[f] = {
        count: items.length,
        avgIntensity: items.length > 0 ? Number((sum / items.length).toFixed(1)) : 3,
        increasingCount: items.filter((i) => i.trend === 'increasing').length,
      };
    });

    return stats;
  }, [porterItems]);

  // Overall industry attractiveness calculation
  const overallMetrics = useMemo(() => {
    const forceKeys = Object.keys(FORCES_CONFIG) as PorterForceType[];
    const avgScores = forceKeys.map((k) => forceStats[k].avgIntensity);
    const overallAvgIntensity =
      avgScores.reduce((acc, val) => acc + val, 0) / (forceKeys.length || 1);

    // Attractiveness score is inverse to force intensity: 1 (lowest intensity) = 100%, 5 (highest intensity) = 0%
    const attractivenessPercent = Math.max(
      0,
      Math.min(100, Math.round(((5 - overallAvgIntensity) / 4) * 100))
    );

    // Find highest and lowest force
    let maxForce = forceKeys[0];
    let minForce = forceKeys[0];
    forceKeys.forEach((f) => {
      if (forceStats[f].avgIntensity > forceStats[maxForce].avgIntensity) maxForce = f;
      if (forceStats[f].avgIntensity < forceStats[minForce].avgIntensity) minForce = f;
    });

    return {
      avgIntensity: Number(overallAvgIntensity.toFixed(1)),
      attractivenessPercent,
      maxForce,
      minForce,
      totalCount: porterItems.length,
    };
  }, [forceStats, porterItems.length]);

  // Radar chart data
  const radarData = useMemo(() => {
    return (Object.keys(FORCES_CONFIG) as PorterForceType[]).map((f) => ({
      subject: FORCES_CONFIG[f].shortTitle,
      intensity: forceStats[f].avgIntensity,
      benchmark: 3.0,
      fullMark: 5,
    }));
  }, [forceStats]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return porterItems.filter((item) => {
      if (activeForceFilter !== 'all' && item.force !== activeForceFilter) return false;
      if (trendFilter !== 'all' && item.trend !== trendFilter) return false;
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase();
        const matchTitle = item.title.toLowerCase().includes(term);
        const matchDesc = item.description.toLowerCase().includes(term);
        const matchResp = item.strategicResponse.toLowerCase().includes(term);
        if (!matchTitle && !matchDesc && !matchResp) return false;
      }
      return true;
    });
  }, [porterItems, activeForceFilter, trendFilter, searchTerm]);

  // Open modal for new item
  const handleOpenAdd = (defaultForce?: PorterForceType) => {
    setEditingItem(null);
    setFormForce(defaultForce || 'rivalry');
    setFormTitle('');
    setFormDescription('');
    setFormIntensity(3);
    setFormTrend('stable');
    setFormStrategicResponse('');
    setFormLinkedObjectiveId(currentOrgObjectives[0]?.id);
    setIsModalOpen(true);
  };

  // Open modal for editing
  const handleOpenEdit = (item: PorterForceItem) => {
    setEditingItem(item);
    setFormForce(item.force);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormIntensity(item.intensity);
    setFormTrend(item.trend);
    setFormStrategicResponse(item.strategicResponse);
    setFormLinkedObjectiveId(item.linkedObjectiveId);
    setIsModalOpen(true);
  };

  // Save item (add or update)
  const handleSave = () => {
    if (!formTitle.trim()) {
      showToast('لطفاً عنوان عامل را وارد کنید.', 'error');
      return;
    }

    const currentList = db.porterItems || [];
    let updatedList: PorterForceItem[];

    if (editingItem) {
      updatedList = currentList.map((i) =>
        i.id === editingItem.id
          ? {
              ...i,
              force: formForce,
              title: formTitle.trim(),
              description: formDescription.trim(),
              intensity: formIntensity,
              trend: formTrend,
              strategicResponse: formStrategicResponse.trim(),
              linkedObjectiveId: formLinkedObjectiveId,
            }
          : i
      );
      showToast('عامل پنج نیروی پورتر با موفقیت ویرایش شد.', 'success');
    } else {
      const newId =
        createStableId(currentList.map((i) => i.id));
      const newItem: PorterForceItem = {
        id: newId,
        org_id: selectedOrgId,
        force: formForce,
        title: formTitle.trim(),
        description: formDescription.trim(),
        intensity: formIntensity,
        trend: formTrend,
        strategicResponse: formStrategicResponse.trim(),
        linkedObjectiveId: formLinkedObjectiveId,
      };
      updatedList = [newItem, ...currentList];
      showToast('عامل جدید با موفقیت به مدل پورتر اضافه شد.', 'success');
    }

    onUpdateDb({
      ...db,
      porterItems: updatedList,
    });
    setIsModalOpen(false);
  };

  // Delete item
  const handleDelete = (id: number) => {
    const updated = (db.porterItems || []).filter((i) => i.id !== id);
    onUpdateDb({
      ...db,
      porterItems: updated,
    });
    showToast('عامل با موفقیت حذف شد.', 'success');
  };

  // Clone to SWOT as threat or opportunity
  const handleCloneToSwot = (item: PorterForceItem) => {
    const swotType = item.intensity >= 3 ? 'threat' : 'opportunity';
    const importance = item.intensity >= 4 ? 'high' : item.intensity === 3 ? 'medium' : 'low';
    const currentSwot = db.swotItems || [];
    const newId = createStableId(currentSwot.map((s) => s.id));

    const newSwotItem: SwotItem = {
      id: newId,
      org_id: selectedOrgId,
      type: swotType,
      title: `[پورتر - ${FORCES_CONFIG[item.force].shortTitle}] ${item.title}`,
      description: `${item.description}\nراهبرد رقابتی: ${item.strategicResponse}`,
      importance,
      score: item.intensity * 2, // scale 1-5 to 2-10
    };

    onUpdateDb({
      ...db,
      swotItems: [newSwotItem, ...currentSwot],
    });

    showToast(
      `عامل با موفقیت به ماتریس SWOT به عنوان «${
        swotType === 'threat' ? 'تهدید' : 'فرصت'
      }» افزوده شد.`,
      'success'
    );
  };

  const getIntensityBadge = (val: number) => {
    if (val >= 4) {
      return {
        bg: 'bg-red-500/15 text-red-400 border-red-500/30',
        label: `شدید (${toFa(val)} از ۵)`,
      };
    }
    if (val >= 3) {
      return {
        bg: 'bg-amber-500/15 text-amber-400 border-amber-500/30',
        label: `متوسط (${toFa(val)} از ۵)`,
      };
    }
    return {
      bg: 'bg-emerald-500/15 text-emerald-400 border-emerald-500/30',
      label: `کم / ضعیف (${toFa(val)} از ۵)`,
    };
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Executive Overview */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/5 rounded-full blur-3xl -z-10 pointer-events-none" />
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-indigo-500/20 text-indigo-400 border border-indigo-500/30 shadow-inner">
                <Swords className="w-6 h-6" />
              </div>
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  مدل پنج نیروی رقابتی مایکل پورتر (Porter's Five Forces)
                </h2>
                <p className="text-xs text-slate-400 mt-0.5">
                  تحلیل ساختار صنعت پتروشیمی و پلیمری، ارزیابی شدت رقابت و سنجش جذابیت استراتژیک بازار
                </p>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
            <button
              onClick={() => handleOpenAdd()}
              className="flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 transition-all duration-200 cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>ثبت عامل رقابتی جدید</span>
            </button>
          </div>
        </div>

        {/* Executive KPI Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6 pt-6 border-t border-slate-800/80">
          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Compass className="w-3.5 h-3.5 text-indigo-400" />
              شاخص جذابیت ساختاری صنعت
            </span>
            <div className="flex items-baseline gap-2">
              <span
                className={`text-2xl font-extrabold ${
                  overallMetrics.attractivenessPercent >= 60
                    ? 'text-emerald-400'
                    : overallMetrics.attractivenessPercent >= 40
                    ? 'text-amber-400'
                    : 'text-red-400'
                }`}
              >
                {toFa(overallMetrics.attractivenessPercent)}٪
              </span>
              <span className="text-[10px] text-slate-400">
                {overallMetrics.attractivenessPercent >= 60
                  ? 'جذابیت بالا'
                  : overallMetrics.attractivenessPercent >= 40
                  ? 'جذابیت متوسط'
                  : 'پرفشار و سخت'}
              </span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden mt-2">
              <div
                className={`h-full rounded-full ${
                  overallMetrics.attractivenessPercent >= 60
                    ? 'bg-emerald-500'
                    : overallMetrics.attractivenessPercent >= 40
                    ? 'bg-amber-500'
                    : 'bg-red-500'
                }`}
                style={{ width: `${overallMetrics.attractivenessPercent}%` }}
              />
            </div>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-amber-400" />
              میانگین فشار رقابتی کل ۵ نیرو
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-extrabold text-white">
                {toFa(overallMetrics.avgIntensity)}
              </span>
              <span className="text-xs text-slate-400">از ۵</span>
            </div>
            <p className="text-[10px] text-slate-400">
              {overallMetrics.avgIntensity >= 3.8
                ? 'فشار رقابتی بسیار بالا بر سودآوری'
                : overallMetrics.avgIntensity >= 2.8
                ? 'فشار رقابتی در حد معمول صنعت'
                : 'فضای رقابتی مساعد و دارای بازدهی'}
            </p>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
              شدیدترین نیروی بازدارنده
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-red-300 truncate">
                {FORCES_CONFIG[overallMetrics.maxForce].title}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-red-400">
              میانگین: {toFa(forceStats[overallMetrics.maxForce].avgIntensity)} از ۵
            </span>
          </div>

          <div className="p-4 rounded-xl bg-slate-950/60 border border-slate-800/80 space-y-1">
            <span className="text-[11px] font-medium text-slate-400 flex items-center gap-1.5">
              <Award className="w-3.5 h-3.5 text-emerald-400" />
              مساعدترین نیرو (کمترین فشار)
            </span>
            <div className="flex items-baseline gap-2">
              <span className="text-sm font-bold text-emerald-300 truncate">
                {FORCES_CONFIG[overallMetrics.minForce].title}
              </span>
            </div>
            <span className="text-[11px] font-semibold text-emerald-400">
              میانگین: {toFa(forceStats[overallMetrics.minForce].avgIntensity)} از ۵
            </span>
          </div>
        </div>
      </div>

      {/* 2. Visualizations Grid: Radar Chart + 5 Forces Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Radar Chart Card (5 cols) */}
        <div className="lg:col-span-5 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Compass className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  نمودار راداری شدت نیروهای ۵‌گانه
                </h3>
              </div>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 font-medium">
                مبنا: ۱ تا ۵
              </span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              شکل چندضلعی سطح فشار رقابتی هلدینگ را نشان می‌دهد؛ مساحت کمتر نشان‌دهنده جذابیت بالاتر صنعت است.
            </p>
          </div>

          <div className="h-64 my-2 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="75%" data={radarData}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis
                  dataKey="subject"
                  tick={{ fill: '#cbd5e1', fontSize: 11, fontFamily: 'Vazirmatn, sans-serif' }}
                />
                <PolarRadiusAxis
                  angle={90}
                  domain={[0, 5]}
                  tick={{ fill: '#64748b', fontSize: 9 }}
                  axisLine={false}
                />
                <Tooltip
                  content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      const data = payload[0].payload;
                      return (
                        <div className="bg-slate-950 p-2.5 border border-slate-700 rounded-lg shadow-xl text-xs text-right space-y-1 font-sans">
                          <p className="font-bold text-white">{data.subject}</p>
                          <p className="text-indigo-400">
                            شدت میانگین: {toFa(data.intensity)} از ۵
                          </p>
                        </div>
                      );
                    }
                    return null;
                  }}
                />
                <Radar
                  name="شدت نیرو"
                  dataKey="intensity"
                  stroke="#6366f1"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>

          <div className="pt-3 border-t border-slate-800 text-[11px] text-slate-400 flex items-center justify-between">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-indigo-500" />
              <span>شدت ارزیابی شده هلدینگ</span>
            </div>
            <span>تعداد کل فاکتورها: {toFa(porterItems.length)}</span>
          </div>
        </div>

        {/* 5 Forces Progress & Strategic Posture (7 cols) */}
        <div className="lg:col-span-7 p-5 rounded-2xl bg-slate-900 border border-slate-800 shadow-lg flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Layers className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">
                  مقایسه تطبیقی وضعیت نیروها و استراتژی‌های عمومی پورتر
                </h3>
              </div>
              <span className="text-[10px] text-slate-400">
                بر اساس نظریه پورتر (Generic Strategies)
              </span>
            </div>

            {/* 5 Forces Intensity Horizontal Bars */}
            <div className="mt-4 space-y-3">
              {(Object.keys(FORCES_CONFIG) as PorterForceType[]).map((f) => {
                const config = FORCES_CONFIG[f];
                const stats = forceStats[f];
                const percent = (stats.avgIntensity / 5) * 100;
                const isHighest = f === overallMetrics.maxForce;

                return (
                  <div
                    key={f}
                    onClick={() => setActiveForceFilter(f === activeForceFilter ? 'all' : f)}
                    className={`p-2.5 rounded-xl border transition-all cursor-pointer ${
                      activeForceFilter === f
                        ? 'bg-slate-800/90 border-indigo-500/60 ring-1 ring-indigo-500/40'
                        : 'bg-slate-950/40 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between text-xs mb-1.5">
                      <div className="flex items-center gap-2">
                        <config.icon className="w-3.5 h-3.5" style={{ color: config.color }} />
                        <span className="font-semibold text-slate-200">{config.title}</span>
                        {isHighest && (
                          <span className="text-[9px] px-1.5 py-0.2 rounded bg-red-500/20 text-red-400 border border-red-500/30">
                            بیشترین فشار
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <span className="text-[11px] text-slate-400">
                          {toFa(stats.count)} عامل
                        </span>
                        <span className="font-bold text-white">
                          {toFa(stats.avgIntensity)} <span className="text-slate-400 font-normal">/ ۵</span>
                        </span>
                      </div>
                    </div>

                    <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="h-full rounded-full transition-all duration-500"
                        style={{
                          width: `${percent}%`,
                          backgroundColor: config.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Generic Porter Strategy Matrix Box */}
          <div className="mt-4 p-3.5 rounded-xl bg-indigo-950/20 border border-indigo-500/30 flex items-start gap-3">
            <Sparkles className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <h4 className="text-xs font-bold text-indigo-300">
                توصیه راهبردی پورتر برای ساختار فعلی هلدینگ: «رهبری هزینه متمرکز بر گریدهای مهندسی»
              </h4>
              <p className="text-[11px] text-slate-300 leading-relaxed">
                با توجه به قدرت بالای چانه‌زنی تأمین‌کننده خوراک و فشار رقبای منطقه‌ای، راهبرد بهینه هلدینگ، ترکیب کاهش بهای تمام‌شده از طریق راندمان مصرف انرژی و تمرکز بر تولید گریدهای پلیمری تخصصی با هزینه تعویض بالا برای خریداران است.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* 3. Filter Bar & Search */}
      <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Force Filter Tabs */}
        <div className="flex flex-wrap items-center gap-1.5 w-full md:w-auto">
          <button
            onClick={() => setActiveForceFilter('all')}
            className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
              activeForceFilter === 'all'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800'
            }`}
          >
            همه نیروها ({toFa(porterItems.length)})
          </button>
          {(Object.keys(FORCES_CONFIG) as PorterForceType[]).map((f) => {
            const config = FORCES_CONFIG[f];
            const count = forceStats[f].count;
            return (
              <button
                key={f}
                onClick={() => setActiveForceFilter(f)}
                className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg transition-all cursor-pointer ${
                  activeForceFilter === f
                    ? 'bg-slate-800 text-white border border-slate-700 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                }`}
              >
                <config.icon className="w-3 h-3" style={{ color: config.color }} />
                <span>{config.shortTitle}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-slate-800 text-slate-300">
                  {toFa(count)}
                </span>
              </button>
            );
          })}
        </div>

        {/* Right Search & Trend Filter */}
        <div className="flex items-center gap-2.5 w-full md:w-auto">
          <div className="relative flex-1 md:w-56">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="جستجو در عوامل پورتر..."
              className="w-full pl-3 pr-8 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 placeholder-slate-500 focus:outline-none focus:border-indigo-500"
            />
          </div>

          <select
            value={trendFilter}
            onChange={(e) => setTrendFilter(e.target.value as 'all' | PorterTrend)}
            className="px-2.5 py-1.5 text-xs bg-slate-950 border border-slate-800 rounded-lg text-slate-200 focus:outline-none focus:border-indigo-500 cursor-pointer"
          >
            <option value="all">همه روندها</option>
            <option value="increasing">روند افزایشی ↗</option>
            <option value="stable">روند باثبات →</option>
            <option value="decreasing">روند کاهشی ↘</option>
          </select>
        </div>
      </div>

      {/* 4. Factors Cards Grid */}
      {filteredItems.length === 0 ? (
        <div className="p-12 text-center rounded-2xl bg-slate-900/50 border border-dashed border-slate-800">
          <Info className="w-10 h-10 text-slate-500 mx-auto mb-3" />
          <h4 className="text-sm font-semibold text-slate-300">هیچ عاملی در این فیلتر یافت نشد</h4>
          <p className="text-xs text-slate-500 mt-1">
            می‌توانید فیلترها را بازنشانی کنید یا عامل رقابتی جدیدی برای هلدینگ ثبت نمایید.
          </p>
          <button
            onClick={() => handleOpenAdd(activeForceFilter === 'all' ? 'rivalry' : activeForceFilter)}
            className="mt-4 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-lg inline-flex items-center gap-1.5 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            افزودن عامل به این نیرو
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredItems.map((item) => {
            const config = FORCES_CONFIG[item.force];
            const badge = getIntensityBadge(item.intensity);
            const linkedObj = db.objectives.find((o) => o.id === item.linkedObjectiveId);

            return (
              <div
                key={item.id}
                className="group p-4 rounded-xl bg-slate-900 border border-slate-800 hover:border-slate-700 shadow-md hover:shadow-lg transition-all duration-200 flex flex-col justify-between"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-start justify-between gap-2 mb-2.5">
                    <div className="flex items-center gap-2">
                      <div
                        className="p-1.5 rounded-lg shrink-0"
                        style={{ backgroundColor: `${config.color}20` }}
                      >
                        <config.icon className="w-4 h-4" style={{ color: config.color }} />
                      </div>
                      <span className="text-[11px] font-semibold text-slate-300">
                        {config.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-1">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full border font-medium ${badge.bg}`}
                      >
                        {badge.label}
                      </span>
                      {item.trend === 'increasing' ? (
                        <span className="p-1 rounded bg-red-500/10 text-red-400" title="روند افزایشی">
                          <ArrowUpRight className="w-3 h-3" />
                        </span>
                      ) : item.trend === 'decreasing' ? (
                        <span className="p-1 rounded bg-emerald-500/10 text-emerald-400" title="روند کاهشی">
                          <ArrowDownRight className="w-3 h-3" />
                        </span>
                      ) : (
                        <span className="p-1 rounded bg-slate-800 text-slate-400" title="روند باثبات">
                          <ArrowRight className="w-3 h-3" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <h4 className="text-xs font-bold text-white leading-snug mb-1.5">
                    {item.title}
                  </h4>
                  <p className="text-[11px] text-slate-400 leading-relaxed line-clamp-3 mb-3">
                    {item.description}
                  </p>

                  {/* Strategic Response */}
                  {item.strategicResponse && (
                    <div className="p-2.5 rounded-lg bg-slate-950/60 border border-slate-800/80 mb-3 space-y-1">
                      <span className="text-[10px] font-semibold text-indigo-400 flex items-center gap-1">
                        <Sparkles className="w-3 h-3" />
                        راهبرد رقابتی پیشنهادی:
                      </span>
                      <p className="text-[11px] text-slate-300 leading-relaxed">
                        {item.strategicResponse}
                      </p>
                    </div>
                  )}
                </div>

                {/* Footer: Linked BSC Objective + Actions */}
                <div className="pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2 mt-2">
                  <div className="flex-1 min-w-0">
                    {linkedObj ? (
                      <span
                        className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-md inline-flex items-center gap-1 max-w-full truncate"
                        title={`هدف BSC: ${linkedObj.title}`}
                      >
                        <Target className="w-2.5 h-2.5 shrink-0" />
                        <span className="truncate">{linkedObj.title}</span>
                      </span>
                    ) : (
                      <span className="text-[10px] text-slate-500">بدون پیوند به هدف BSC</span>
                    )}
                  </div>

                  <div className="flex items-center gap-1 opacity-90 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => handleCloneToSwot(item)}
                      title="ارسال مستقیم به ماتریس SWOT"
                      className="p-1 text-slate-400 hover:text-amber-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    >
                      <Layers className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleOpenEdit(item)}
                      title="ویرایش عامل"
                      className="p-1 text-slate-400 hover:text-indigo-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    >
                      <Edit3 className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleDelete(item.id)}
                      title="حذف عامل"
                      className="p-1 text-slate-400 hover:text-red-400 hover:bg-slate-800 rounded transition-colors cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 5. Add / Edit Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Swords className="w-5 h-5 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">
                  {editingItem ? 'ویرایش عامل پنج نیروی پورتر' : 'ثبت عامل رقابتی جدید پورتر'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-white text-xs cursor-pointer"
              >
                ✕
              </button>
            </div>

            <div className="space-y-3.5 text-right">
              {/* Force Selector */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  نیروی رقابتی مربوطه:
                </label>
                <select
                  value={formForce}
                  onChange={(e) => setFormForce(e.target.value as PorterForceType)}
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  {(Object.keys(FORCES_CONFIG) as PorterForceType[]).map((f) => (
                    <option key={f} value={f}>
                      {FORCES_CONFIG[f].title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Title */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  عنوان عامل رقابتی:
                </label>
                <input
                  type="text"
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: تمرکز خریداران عمده و تقاضای تخفیف‌های صادراتی..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  شرح و تحلیل اثرگذاری بر هلدینگ:
                </label>
                <textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  rows={3}
                  placeholder="توضیح جزئیات وضعیت رقابتی، شرایط بازار و میزان آسیب‌پذیری..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Intensity & Trend Grid */}
              <div className="grid grid-cols-2 gap-3">
                {/* Intensity Slider */}
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-slate-300">
                      شدت نیرو (۱ تا ۵):
                    </label>
                    <span className="text-xs font-bold text-indigo-400">
                      {toFa(formIntensity)} از ۵
                    </span>
                  </div>
                  <input
                    type="range"
                    min={1}
                    max={5}
                    step={1}
                    value={formIntensity}
                    onChange={(e) => setFormIntensity(Number(e.target.value))}
                    className="w-full accent-indigo-500 cursor-pointer"
                  />
                  <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                    <span>۱ (بسیار کم)</span>
                    <span>۳ (متوسط)</span>
                    <span>۵ (بسیار شدید)</span>
                  </div>
                </div>

                {/* Trend */}
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    جهت و روند نیرو:
                  </label>
                  <select
                    value={formTrend}
                    onChange={(e) => setFormTrend(e.target.value as PorterTrend)}
                    className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                  >
                    <option value="increasing">روند افزایشی ↗ (تشدید فشار)</option>
                    <option value="stable">روند باثبات →</option>
                    <option value="decreasing">روند کاهشی ↘ (کاهش فشار)</option>
                  </select>
                </div>
              </div>

              {/* Strategic Response */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  راهبرد و اقدام رقابتی متقابل:
                </label>
                <textarea
                  value={formStrategicResponse}
                  onChange={(e) => setFormStrategicResponse(e.target.value)}
                  rows={2}
                  placeholder="اقدامات متقابل هلدینگ برای مهار این نیرو یا بهره‌گیری از فرصت..."
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                />
              </div>

              {/* Linked Objective */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  پیوند به هدف استراتژیک در کارت امتیازی متوازن (BSC):
                </label>
                <select
                  value={formLinkedObjectiveId || ''}
                  onChange={(e) =>
                    setFormLinkedObjectiveId(
                      e.target.value ? Number(e.target.value) : undefined
                    )
                  }
                  className="w-full px-3 py-2 text-xs bg-slate-950 border border-slate-800 rounded-xl text-white focus:outline-none focus:border-indigo-500"
                >
                  <option value="">-- بدون پیوند به هدف خاص --</option>
                  {currentOrgObjectives.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.title}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Modal Buttons */}
            <div className="pt-3 border-t border-slate-800 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-400 hover:text-white rounded-xl transition-colors cursor-pointer"
              >
                انصراف
              </button>
              <button
                type="button"
                onClick={handleSave}
                className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-500 active:bg-indigo-700 rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                {editingItem ? 'ذخیره تغییرات' : 'ثبت در مدل پورتر'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
