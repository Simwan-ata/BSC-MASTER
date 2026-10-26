import React, { useState, useMemo } from 'react';
import { createStableId } from '../ids';
import {
  Globe,
  Building2,
  TrendingUp,
  Users,
  Cpu,
  Leaf,
  Scale,
  Plus,
  Trash2,
  Edit3,
  Filter,
  Search,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  AlertTriangle,
  CheckCircle2,
  Target,
  Sparkles,
  BarChart2,
  SlidersHorizontal,
  ChevronDown,
  Info,
  ShieldAlert,
} from 'lucide-react';
import {
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
  Legend,
} from 'recharts';
import {
  DatabaseState,
  Objective,
  PestelDimension,
  PestelItem,
  PestelImpactType,
  PestelTimeHorizon,
  PestelTrend,
  SwotItem,
} from '../types';
import { toFa } from '../scoring';

interface PestelAnalysisSectionProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  currentOrgObjectives: Objective[];
}

export const DIMENSION_CONFIG: Record<
  PestelDimension,
  {
    key: PestelDimension;
    title: string;
    english: string;
    description: string;
    icon: React.FC<{ className?: string }>;
    accentColor: string;
    bgBadge: string;
    textBadge: string;
    border: string;
    fillHex: string;
  }
> = {
  political: {
    key: 'political',
    title: 'سیاسی',
    english: 'Political',
    description: 'سیاست‌های دولت، تحریم‌ها، پیمان‌های منطقه‌ای و روابط تجاری بین‌الملل',
    icon: Building2,
    accentColor: 'indigo',
    bgBadge: 'bg-indigo-50 text-indigo-800 border-indigo-200',
    textBadge: 'text-indigo-700',
    border: 'border-indigo-200',
    fillHex: '#6366f1',
  },
  economic: {
    key: 'economic',
    title: 'اقتصادی',
    english: 'Economic',
    description: 'نوسانات نرخ ارز، تورم، نرخ تسهیلات بانکی، رونق/رکود بازار و هزینه‌های عملیاتی',
    icon: TrendingUp,
    accentColor: 'emerald',
    bgBadge: 'bg-emerald-50 text-emerald-800 border-emerald-200',
    textBadge: 'text-emerald-700',
    border: 'border-emerald-200',
    fillHex: '#10b981',
  },
  social: {
    key: 'social',
    title: 'اجتماعی و فرهنگی',
    english: 'Social',
    description: 'ترکیب جمعیتی، الگوی مصرف و سبک زندگی، نرخ مهاجرت نیروی متخصص و فرهنگ کار',
    icon: Users,
    accentColor: 'sky',
    bgBadge: 'bg-sky-50 text-sky-800 border-sky-200',
    textBadge: 'text-sky-700',
    border: 'border-sky-200',
    fillHex: '#0284c7',
  },
  technological: {
    key: 'technological',
    title: 'فناورانه و تکنولوژیک',
    english: 'Technological',
    description: 'هوش مصنوعی، دوقلوی دیجیتال، اتوماسیون فرآیندی و نوآوری در کاتالیست‌ها و مواد نو',
    icon: Cpu,
    accentColor: 'purple',
    bgBadge: 'bg-purple-50 text-purple-800 border-purple-200',
    textBadge: 'text-purple-700',
    border: 'border-purple-200',
    fillHex: '#9333ea',
  },
  environmental: {
    key: 'environmental',
    title: 'زیست‌محیطی و اقلیمی',
    english: 'Environmental',
    description: 'ناترازی گاز و آب، مالیات کربن مرزی (CBAM)، استانداردهای ESG و اقتصاد چرخشی',
    icon: Leaf,
    accentColor: 'teal',
    bgBadge: 'bg-teal-50 text-teal-800 border-teal-200',
    textBadge: 'text-teal-700',
    border: 'border-teal-200',
    fillHex: '#0d9488',
  },
  legal: {
    key: 'legal',
    title: 'حقوقی و قانونی',
    english: 'Legal',
    description: 'قوانین رفع تعهد ارزی، عوارض صادراتی، الزامات ایمنی و مشوق‌های مالیاتی دانش‌بنیان',
    icon: Scale,
    accentColor: 'amber',
    bgBadge: 'bg-amber-50 text-amber-800 border-amber-200',
    textBadge: 'text-amber-700',
    border: 'border-amber-200',
    fillHex: '#d97706',
  },
};

export const PestelAnalysisSection: React.FC<PestelAnalysisSectionProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
  currentOrgObjectives,
}) => {
  // Filters & Views
  const [selectedDimension, setSelectedDimension] = useState<'all' | PestelDimension>('all');
  const [impactFilter, setImpactFilter] = useState<'all' | PestelImpactType>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [activeViewMode, setActiveViewMode] = useState<'cards' | 'matrix'>('cards');
  const [sortBy, setSortBy] = useState<'score' | 'impact' | 'probability' | 'recent'>('score');

  // Modal State
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<PestelItem | null>(null);

  // Form Fields
  const [formDimension, setFormDimension] = useState<PestelDimension>('political');
  const [formTitle, setFormTitle] = useState('');
  const [formDescription, setFormDescription] = useState('');
  const [formImpactType, setFormImpactType] = useState<PestelImpactType>('threat');
  const [formImpactScore, setFormImpactScore] = useState<number>(8);
  const [formProbabilityScore, setFormProbabilityScore] = useState<number>(7);
  const [formTimeHorizon, setFormTimeHorizon] = useState<PestelTimeHorizon>('medium');
  const [formTrend, setFormTrend] = useState<PestelTrend>('increasing');
  const [formStrategicImplication, setFormStrategicImplication] = useState('');
  const [formLinkedObjectiveId, setFormLinkedObjectiveId] = useState<number | undefined>(
    currentOrgObjectives[0]?.id
  );

  // Filtered org items
  const orgPestelItems = useMemo(() => {
    return (db.pestelItems || []).filter(
      (item) => item.org_id === selectedOrgId || item.org_id === 1
    );
  }, [db.pestelItems, selectedOrgId]);

  // Derived Statistics
  const stats = useMemo(() => {
    const total = orgPestelItems.length;
    const opportunities = orgPestelItems.filter((i) => i.impactType === 'opportunity');
    const threats = orgPestelItems.filter((i) => i.impactType === 'threat');
    const neutrals = orgPestelItems.filter((i) => i.impactType === 'neutral');

    const avgImpact = total > 0 ? orgPestelItems.reduce((acc, i) => acc + i.impactScore, 0) / total : 0;
    const avgProb = total > 0 ? orgPestelItems.reduce((acc, i) => acc + i.probabilityScore, 0) / total : 0;

    // Highest impact dimension
    const dimensionAverages = (Object.keys(DIMENSION_CONFIG) as PestelDimension[]).map((dim) => {
      const items = orgPestelItems.filter((i) => i.dimension === dim);
      const avg = items.length > 0 ? items.reduce((s, it) => s + it.impactScore, 0) / items.length : 0;
      return { dim, avg, count: items.length };
    });

    const topDimension = [...dimensionAverages].sort((a, b) => b.avg - a.avg)[0];

    return {
      total,
      opportunitiesCount: opportunities.length,
      threatsCount: threats.length,
      neutralsCount: neutrals.length,
      avgImpact: Math.round(avgImpact * 10) / 10,
      avgProb: Math.round(avgProb * 10) / 10,
      topDimension: topDimension ? DIMENSION_CONFIG[topDimension.dim]?.title : '-',
      criticalThreatsCount: threats.filter((t) => t.impactScore >= 8 && t.probabilityScore >= 7).length,
    };
  }, [orgPestelItems]);

  // Radar Data for 6 Dimensions
  const radarData = useMemo(() => {
    return (Object.keys(DIMENSION_CONFIG) as PestelDimension[]).map((dim) => {
      const items = orgPestelItems.filter((i) => i.dimension === dim);
      const avgImpact = items.length > 0 ? items.reduce((s, it) => s + it.impactScore, 0) / items.length : 0;
      const avgProb = items.length > 0 ? items.reduce((s, it) => s + it.probabilityScore, 0) / items.length : 0;
      return {
        dimension: DIMENSION_CONFIG[dim].title,
        'شدت تأثیر': Number(avgImpact.toFixed(1)),
        'احتمال / پایداری': Number(avgProb.toFixed(1)),
        count: items.length,
      };
    });
  }, [orgPestelItems]);

  // Dimension Comparison Bar Data (Opportunities vs Threats)
  const barData = useMemo(() => {
    return (Object.keys(DIMENSION_CONFIG) as PestelDimension[]).map((dim) => {
      const items = orgPestelItems.filter((i) => i.dimension === dim);
      const opps = items.filter((i) => i.impactType === 'opportunity').length;
      const thr = items.filter((i) => i.impactType === 'threat').length;
      return {
        dimension: DIMENSION_CONFIG[dim].title.split(' ')[0], // short name
        'فرصت‌ها': opps,
        'تهدیدها': thr,
      };
    });
  }, [orgPestelItems]);

  // Filtered & Sorted factors list
  const filteredItems = useMemo(() => {
    return orgPestelItems
      .filter((item) => {
        if (selectedDimension !== 'all' && item.dimension !== selectedDimension) return false;
        if (impactFilter !== 'all' && item.impactType !== impactFilter) return false;
        if (searchQuery.trim()) {
          const query = searchQuery.toLowerCase();
          const matchTitle = item.title.toLowerCase().includes(query);
          const matchDesc = item.description?.toLowerCase().includes(query);
          const matchImp = item.strategicImplication?.toLowerCase().includes(query);
          if (!matchTitle && !matchDesc && !matchImp) return false;
        }
        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'score') {
          return b.impactScore * b.probabilityScore - a.impactScore * a.probabilityScore;
        }
        if (sortBy === 'impact') {
          return b.impactScore - a.impactScore;
        }
        if (sortBy === 'probability') {
          return b.probabilityScore - a.probabilityScore;
        }
        return b.id - a.id;
      });
  }, [orgPestelItems, selectedDimension, impactFilter, searchQuery, sortBy]);

  // Matrix Quadrants
  const matrixQuadrants = useMemo(() => {
    const q1_critical: PestelItem[] = []; // Impact >= 7 && Prob >= 7
    const q2_strategicAlert: PestelItem[] = []; // Impact >= 7 && Prob < 7
    const q3_monitoring: PestelItem[] = []; // Impact < 7 && Prob >= 7
    const q4_low: PestelItem[] = []; // Impact < 7 && Prob < 7

    filteredItems.forEach((item) => {
      if (item.impactScore >= 7 && item.probabilityScore >= 7) {
        q1_critical.push(item);
      } else if (item.impactScore >= 7 && item.probabilityScore < 7) {
        q2_strategicAlert.push(item);
      } else if (item.impactScore < 7 && item.probabilityScore >= 7) {
        q3_monitoring.push(item);
      } else {
        q4_low.push(item);
      }
    });

    return {
      q1_critical,
      q2_strategicAlert,
      q3_monitoring,
      q4_low,
    };
  }, [filteredItems]);

  // Open Modal for Add
  const handleOpenAddModal = () => {
    setEditingItem(null);
    setFormDimension(selectedDimension !== 'all' ? selectedDimension : 'political');
    setFormTitle('');
    setFormDescription('');
    setFormImpactType('threat');
    setFormImpactScore(8);
    setFormProbabilityScore(7);
    setFormTimeHorizon('medium');
    setFormTrend('increasing');
    setFormStrategicImplication('');
    setFormLinkedObjectiveId(currentOrgObjectives[0]?.id);
    setIsModalOpen(true);
  };

  // Open Modal for Edit
  const handleOpenEditModal = (item: PestelItem) => {
    setEditingItem(item);
    setFormDimension(item.dimension);
    setFormTitle(item.title);
    setFormDescription(item.description);
    setFormImpactType(item.impactType);
    setFormImpactScore(item.impactScore);
    setFormProbabilityScore(item.probabilityScore);
    setFormTimeHorizon(item.timeHorizon);
    setFormTrend(item.trend);
    setFormStrategicImplication(item.strategicImplication || '');
    setFormLinkedObjectiveId(item.linkedObjectiveId);
    setIsModalOpen(true);
  };

  // Submit Add or Edit
  const handleSubmitForm = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formTitle.trim()) {
      showToast('لطفاً عنوان عامل کلان را وارد نمایید', 'error');
      return;
    }

    const currentItems = db.pestelItems || [];

    if (editingItem) {
      // Edit
      const updated = currentItems.map((item) =>
        item.id === editingItem.id
          ? {
              ...item,
              dimension: formDimension,
              title: formTitle.trim(),
              description: formDescription.trim(),
              impactType: formImpactType,
              impactScore: Number(formImpactScore),
              probabilityScore: Number(formProbabilityScore),
              timeHorizon: formTimeHorizon,
              trend: formTrend,
              strategicImplication: formStrategicImplication.trim(),
              linkedObjectiveId: formLinkedObjectiveId ? Number(formLinkedObjectiveId) : undefined,
            }
          : item
      );
      onUpdateDb({ ...db, pestelItems: updated });
      showToast('عامل کلان محیطی با موفقیت به‌روزرسانی شد');
    } else {
      // Add
      const newId = createStableId(currentItems.map((x) => x.id));
      const newItem: PestelItem = {
        id: newId,
        org_id: selectedOrgId,
        dimension: formDimension,
        title: formTitle.trim(),
        description: formDescription.trim(),
        impactType: formImpactType,
        impactScore: Number(formImpactScore),
        probabilityScore: Number(formProbabilityScore),
        timeHorizon: formTimeHorizon,
        trend: formTrend,
        strategicImplication: formStrategicImplication.trim(),
        linkedObjectiveId: formLinkedObjectiveId ? Number(formLinkedObjectiveId) : undefined,
      };
      onUpdateDb({ ...db, pestelItems: [...currentItems, newItem] });
      showToast('عامل جدید محیطی PESTEL ثبت گردید');
    }

    setIsModalOpen(false);
  };

  // Delete
  const handleDeleteItem = (id: number) => {
    const updated = (db.pestelItems || []).filter((item) => item.id !== id);
    onUpdateDb({ ...db, pestelItems: updated });
    showToast('عامل محیطی حذف گردید');
  };

  // Quick Promotion to SWOT
  const handlePromoteToSwot = (item: PestelItem) => {
    if (item.impactType === 'neutral') {
      showToast('تنها عوامل با نوع فرصت یا تهدید به ماتریس SWOT منتقل می‌شوند', 'error');
      return;
    }

    const swotType = item.impactType === 'opportunity' ? 'opportunity' : 'threat';
    const currentSwot = db.swotItems || [];

    // Check if duplicate title exists
    const exists = currentSwot.some(
      (s) => s.org_id === selectedOrgId && s.title.toLowerCase() === item.title.toLowerCase()
    );

    if (exists) {
      showToast('این عامل قبلاً در ماتریس SWOT این سازمان ثبت شده است', 'error');
      return;
    }

    const newSwotId = createStableId(currentSwot.map((x) => x.id));
    const newSwotItem: SwotItem = {
      id: newSwotId,
      org_id: selectedOrgId,
      type: swotType,
      title: item.title,
      description: `[برگرفته از تحلیل PESTEL - بعد ${DIMENSION_CONFIG[item.dimension].title}]: ${item.description}`,
      importance: item.impactScore >= 8 ? 'high' : item.impactScore >= 6 ? 'medium' : 'low',
      score: item.impactScore,
    };

    onUpdateDb({
      ...db,
      swotItems: [...currentSwot, newSwotItem],
    });

    showToast(`عامل "${item.title}" با موفقیت به بخش ${swotType === 'opportunity' ? 'فرصت‌های' : 'تهدیدهای'} SWOT پیوند یافت`);
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner & Action Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-5 rounded-2xl border border-slate-200/90 shadow-2xs">
        <div className="flex items-start gap-3.5">
          <div className="w-10 h-10 rounded-xl bg-indigo-50 border border-indigo-200/70 text-indigo-700 flex items-center justify-center shrink-0 shadow-2xs">
            <Globe className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h3 className="text-base font-bold text-slate-900">
                پایش و ارزیابی عوامل کلان محیطی (PESTEL Analysis)
              </h3>
              <span className="text-[10px] font-mono font-semibold bg-indigo-100 text-indigo-800 px-2 py-0.5 rounded-full">
                {toFa(orgPestelItems.length)} عامل
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1 max-w-2xl leading-relaxed">
              تحلیل نظام‌مند ۶ نیروی کلان پیرامونی (سیاسی، اقتصادی، اجتماعی، تکنولوژیک، محیطی و قانونی) جهت کشف پیش‌دستانه فرصت‌ها، مهار تهدیدهای نوظهور و اتصال به اهداف کارت متوازن.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={handleOpenAddModal}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-all shadow-xs hover:shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>ثبت عامل کلان جدید</span>
          </button>
        </div>
      </div>

      {/* 2. Top Metric Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Metric 1 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-slate-500">
            <span className="text-xs font-medium">کل عوامل پایش‌شده</span>
            <Globe className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-slate-900">{toFa(stats.total)}</span>
            <span className="text-[11px] text-slate-500">عامل کلیدی</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>میانگین شدت اثر:</span>
            <span className="font-mono font-bold text-indigo-700">{toFa(stats.avgImpact)} از ۱۰</span>
          </div>
        </div>

        {/* Metric 2 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-emerald-600">
            <span className="text-xs font-medium">فرصت‌های استراتژیک کلان</span>
            <ArrowUpRight className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-emerald-700">
              {toFa(stats.opportunitiesCount)}
            </span>
            <span className="text-[11px] text-emerald-600">پیشران رشد</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>سهم از کل عوامل:</span>
            <span className="font-mono font-bold text-emerald-700">
              {stats.total > 0 ? toFa(Math.round((stats.opportunitiesCount / stats.total) * 100)) : '۰'}٪
            </span>
          </div>
        </div>

        {/* Metric 3 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-rose-600">
            <span className="text-xs font-medium">تهدیدها و ریسک‌های پیرامونی</span>
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-2xl font-bold font-mono text-rose-700">
              {toFa(stats.threatsCount)}
            </span>
            <span className="text-[11px] text-rose-600">تهدید شناسایی‌شده</span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>تهدیدهای بحرانی (اثر ≥ ۸):</span>
            <span className="font-mono font-bold text-rose-700">
              {toFa(stats.criticalThreatsCount)} مورد
            </span>
          </div>
        </div>

        {/* Metric 4 */}
        <div className="bg-white p-4 rounded-xl border border-slate-200/80 shadow-2xs space-y-1">
          <div className="flex items-center justify-between text-amber-600">
            <span className="text-xs font-medium">بُعد با بالاترین شدت فشار</span>
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div className="flex items-baseline gap-2">
            <span className="text-lg font-bold text-amber-900 truncate">
              {stats.topDimension}
            </span>
          </div>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-100 flex items-center justify-between">
            <span>میانگین احتمال/پایداری:</span>
            <span className="font-mono font-bold text-amber-800">{toFa(stats.avgProb)} از ۱۰</span>
          </div>
        </div>
      </div>

      {/* 3. Visualizations Row: Radar Chart + Dimension Breakdown Bar */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* Radar Chart: 6 Dimensions Impact */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <Globe className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  نمودار راداری شدت تأثیر و پایداری در ابعاد ۶گانه PESTEL
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                مقیاس ۱ تا ۱۰
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              مقایسه میانگین شدت تأثیر استراتژیک (خط سرمه‌ای) در برابر احتمال وقوع یا پایداری روند (خط سبز) در هر یک از اضلاع محیطی
            </p>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} outerRadius="75%">
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis
                  dataKey="dimension"
                  tick={{ fill: '#334155', fontSize: 11, fontFamily: 'inherit' }}
                />
                <PolarRadiusAxis angle={30} domain={[0, 10]} stroke="#cbd5e1" fontSize={10} />
                <Radar
                  name="شدت تأثیر"
                  dataKey="شدت تأثیر"
                  stroke="#4f46e5"
                  fill="#6366f1"
                  fillOpacity={0.4}
                />
                <Radar
                  name="احتمال / پایداری"
                  dataKey="احتمال / پایداری"
                  stroke="#059669"
                  fill="#10b981"
                  fillOpacity={0.25}
                />
                <Tooltip
                  formatter={(val: any) => [`${toFa(val)} از ۱۰`, '']}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '11px',
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-700 text-xs px-1">{value}</span>}
                />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Bar Chart: Opportunities vs Threats distribution */}
        <div className="lg:col-span-6 bg-white p-5 rounded-2xl border border-slate-200/80 shadow-2xs flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 mb-2">
              <div className="flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-emerald-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  توزیع فرصت‌ها در برابر تهدیدها در هر بعد محیطی
                </h4>
              </div>
              <span className="text-[10px] text-slate-500 bg-slate-100 px-2 py-0.5 rounded">
                تعداد فاکتورها
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mb-2">
              شناسایی ابعادی که سرشار از فرصت‌های توسعه بازار هستند در برابر ابعادی که منشأ تهدیدهای حیاتی می‌باشند
            </p>
          </div>

          <div className="h-64 w-full" dir="ltr">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <XAxis
                  dataKey="dimension"
                  tick={{ fill: '#475569', fontSize: 11, fontFamily: 'inherit' }}
                />
                <YAxis
                  allowDecimals={false}
                  tick={{ fill: '#64748b', fontSize: 10 }}
                />
                <Tooltip
                  formatter={(val: any, name: any) => [`${toFa(val)} مورد`, name]}
                  contentStyle={{
                    backgroundColor: '#1e293b',
                    borderColor: '#334155',
                    color: '#f8fafc',
                    borderRadius: '8px',
                    fontSize: '11px',
                    direction: 'rtl',
                    textAlign: 'right',
                  }}
                />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '10px' }}
                  formatter={(value) => <span className="text-slate-700 text-xs px-1">{value}</span>}
                />
                <Bar dataKey="فرصت‌ها" fill="#10b981" radius={[4, 4, 0, 0]} />
                <Bar dataKey="تهدیدها" fill="#f43f5e" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* 4. Filter Toolbar & View Toggle */}
      <div className="bg-white p-4 rounded-xl border border-slate-200/90 shadow-2xs space-y-3">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3">
          {/* Dimension Tabs */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 lg:pb-0 scrollbar-none">
            <button
              onClick={() => setSelectedDimension('all')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedDimension === 'all'
                  ? 'bg-slate-900 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              همه ابعاد ({toFa(orgPestelItems.length)})
            </button>
            {(Object.keys(DIMENSION_CONFIG) as PestelDimension[]).map((dimKey) => {
              const cfg = DIMENSION_CONFIG[dimKey];
              const count = orgPestelItems.filter((i) => i.dimension === dimKey).length;
              const Icon = cfg.icon;
              return (
                <button
                  key={dimKey}
                  onClick={() => setSelectedDimension(dimKey)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                    selectedDimension === dimKey
                      ? 'bg-indigo-700 text-white shadow-2xs'
                      : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{cfg.title}</span>
                  <span className="font-mono text-[10px] opacity-75">({toFa(count)})</span>
                </button>
              );
            })}
          </div>

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg self-start lg:self-auto shrink-0">
            <button
              onClick={() => setActiveViewMode('cards')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeViewMode === 'cards'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              کارت‌های تفصیلی
            </button>
            <button
              onClick={() => setActiveViewMode('matrix')}
              className={`px-3 py-1 rounded text-xs font-semibold transition-all ${
                activeViewMode === 'matrix'
                  ? 'bg-white text-indigo-700 shadow-2xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              ماتریس تأثیر - احتمال
            </button>
          </div>
        </div>

        {/* Secondary Filter Line */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2 border-t border-slate-100 text-xs">
          <div className="flex items-center gap-2 flex-1 max-w-md">
            <div className="relative w-full">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-2.5" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="جستجو در عنوان، شرح یا پیامد استراتژیک..."
                className="w-full pr-8 pl-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-indigo-500 focus:bg-white"
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            {/* Impact Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">نوع اثر:</span>
              <select
                value={impactFilter}
                onChange={(e) => setImpactFilter(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="all">همه اثرات</option>
                <option value="opportunity">فقط فرصت‌ها</option>
                <option value="threat">فقط تهدیدها</option>
                <option value="neutral">خنثی / هشدار</option>
              </select>
            </div>

            {/* Sort Filter */}
            <div className="flex items-center gap-1">
              <span className="text-slate-500 text-[11px]">مرتب‌سازی:</span>
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
                className="text-xs bg-slate-50 border border-slate-200 rounded-lg px-2 py-1 focus:outline-none"
              >
                <option value="score">امتیاز ترکیبی (اثر × احتمال)</option>
                <option value="impact">بالاترین شدت اثر</option>
                <option value="probability">بالاترین احتمال / پایداری</option>
                <option value="recent">جدیدترین</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* 5. VIEW A: CARDS GRID */}
      {activeViewMode === 'cards' && (
        <div className="space-y-4">
          {filteredItems.length === 0 ? (
            <div className="bg-white rounded-2xl p-12 text-center border border-slate-200 space-y-3">
              <Globe className="w-10 h-10 text-slate-300 mx-auto" />
              <h4 className="text-sm font-bold text-slate-700">هیچ عامل محیطی منطبق با فیلتر یافت نشد</h4>
              <p className="text-xs text-slate-500">
                می‌توانید فیلترها را بازنشانی نمایید یا با کلیک بر روی دکمه «ثبت عامل کلان جدید» عامل مورد نظر را بیفزایید.
              </p>
              <button
                onClick={handleOpenAddModal}
                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-indigo-700 bg-indigo-50 border border-indigo-200 rounded-lg hover:bg-indigo-100 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                ثبت عامل محیطی جدید
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredItems.map((item) => {
                const cfg = DIMENSION_CONFIG[item.dimension];
                const Icon = cfg.icon;
                const compositeScore = item.impactScore * item.probabilityScore;
                const linkedObj = db.objectives.find((o) => o.id === item.linkedObjectiveId);

                return (
                  <div
                    key={item.id}
                    className="bg-white rounded-2xl border border-slate-200/90 hover:border-slate-300 p-4 shadow-2xs hover:shadow-xs transition-all flex flex-col justify-between space-y-3 group"
                  >
                    {/* Header */}
                    <div className="space-y-2">
                      <div className="flex items-center justify-between gap-2">
                        {/* Dimension Badge */}
                        <div
                          className={`flex items-center gap-1.5 px-2 py-0.5 rounded-md text-[10px] font-bold border ${cfg.bgBadge}`}
                        >
                          <Icon className="w-3 h-3" />
                          <span>{cfg.title}</span>
                        </div>

                        {/* Impact Type Badge */}
                        <div className="flex items-center gap-1">
                          {item.impactType === 'opportunity' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <ArrowUpRight className="w-3 h-3" />
                              فرصت
                            </span>
                          )}
                          {item.impactType === 'threat' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                              <ArrowDownRight className="w-3 h-3" />
                              تهدید
                            </span>
                          )}
                          {item.impactType === 'neutral' && (
                            <span className="flex items-center gap-0.5 text-[10px] font-semibold text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                              <Minus className="w-3 h-3" />
                              خنثی / هشدار
                            </span>
                          )}

                          {/* Horizon */}
                          <span className="text-[9px] font-semibold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
                            {item.timeHorizon === 'short'
                              ? 'کوتاه‌مدت'
                              : item.timeHorizon === 'medium'
                              ? 'میان‌مدت'
                              : 'بلندمدت'}
                          </span>
                        </div>
                      </div>

                      {/* Title */}
                      <h4 className="font-bold text-xs text-slate-900 leading-snug pt-0.5">
                        {item.title}
                      </h4>

                      {/* Description */}
                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed line-clamp-3">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* Scores Progress & Trend */}
                    <div className="space-y-2 pt-2 border-t border-slate-100">
                      {/* Impact Score Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>شدت تأثیر استراتژیک:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {toFa(item.impactScore)} از ۱۰
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className={`h-full rounded-full ${
                              item.impactType === 'opportunity'
                                ? 'bg-emerald-500'
                                : item.impactType === 'threat'
                                ? 'bg-rose-500'
                                : 'bg-slate-400'
                            }`}
                            style={{ width: `${(item.impactScore / 10) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Probability Score Bar */}
                      <div>
                        <div className="flex items-center justify-between text-[10px] text-slate-500 mb-0.5">
                          <span>احتمال وقوع / پایداری:</span>
                          <span className="font-mono font-bold text-slate-800">
                            {toFa(item.probabilityScore)} از ۱۰
                          </span>
                        </div>
                        <div className="w-full h-1.5 bg-slate-100 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-indigo-500 rounded-full"
                            style={{ width: `${(item.probabilityScore / 10) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Bottom Metrics Pill */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        <div className="flex items-center gap-1 text-slate-600">
                          <span>روند:</span>
                          {item.trend === 'increasing' && (
                            <span className="flex items-center text-rose-700 font-semibold gap-0.5">
                              <ArrowUpRight className="w-3 h-3" /> صعودی
                            </span>
                          )}
                          {item.trend === 'stable' && (
                            <span className="flex items-center text-slate-600 font-semibold gap-0.5">
                              <Minus className="w-3 h-3" /> پایدار
                            </span>
                          )}
                          {item.trend === 'decreasing' && (
                            <span className="flex items-center text-emerald-700 font-semibold gap-0.5">
                              <ArrowDownRight className="w-3 h-3" /> نزولی
                            </span>
                          )}
                        </div>

                        <div className="font-mono font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded">
                          امتیاز: {toFa(compositeScore)}
                        </div>
                      </div>

                      {/* Strategic Implication Note */}
                      {item.strategicImplication && (
                        <div className="p-2 rounded-lg bg-indigo-50/50 border border-indigo-100/70 text-[10px] text-indigo-950 space-y-0.5">
                          <span className="font-bold text-indigo-900 block flex items-center gap-1">
                            <Sparkles className="w-2.5 h-2.5 text-indigo-600" />
                            پیامد راهبردی و اقدام هلدینگ:
                          </span>
                          <p className="leading-relaxed text-indigo-900/90">
                            {item.strategicImplication}
                          </p>
                        </div>
                      )}

                      {/* Linked Objective */}
                      {linkedObj && (
                        <div className="flex items-center gap-1 text-[10px] text-slate-500 truncate pt-0.5">
                          <Target className="w-3 h-3 text-indigo-600 shrink-0" />
                          <span className="text-slate-400">هدف مرتبط:</span>
                          <span className="font-semibold text-slate-700 truncate">
                            {linkedObj.title}
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Footer Actions */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100">
                      {/* Promote to SWOT button */}
                      {item.impactType !== 'neutral' ? (
                        <button
                          onClick={() => handlePromoteToSwot(item)}
                          className="text-[10px] font-semibold text-indigo-700 hover:text-indigo-900 hover:bg-indigo-50 px-2 py-1 rounded transition-colors"
                          title="انتقال خودکار به ماتریس SWOT"
                        >
                          + پیوند به SWOT
                        </button>
                      ) : (
                        <span />
                      )}

                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => handleOpenEditModal(item)}
                          className="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded transition-colors"
                          title="ویرایش و امتیازدهی"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => handleDeleteItem(item.id)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                          title="حذف عامل"
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
        </div>
      )}

      {/* 6. VIEW B: IMPACT - PROBABILITY MATRIX */}
      {activeViewMode === 'matrix' && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 text-xs text-slate-600 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Info className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>
                ماتریس ۲ بعدی «شدت تأثیر × احتمال وقوع» عوامل کلان را در ۴ منطقه استراتژیک طبقه‌بندی می‌کند تا اولویت‌بندی اقدامات هلدینگ مشخص گردد.
              </span>
            </div>
            <span className="font-mono text-slate-500 font-bold">
              {toFa(filteredItems.length)} عامل در ماتریس
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Q1: Critical (High Impact, High Probability) */}
            <div className="bg-rose-50/60 border-2 border-rose-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    ۱
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-rose-950">
                      منطقه بحرانی و تحول‌آفرین (اثر بالا / احتمال بالا)
                    </h4>
                    <span className="text-[10px] text-rose-700">اقدام فوری، تدوین پاسخ راهبردی و پایش مداوم</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                  {toFa(matrixQuadrants.q1_critical.length)}
                </span>
              </div>

              <div className="space-y-2">
                {matrixQuadrants.q1_critical.length === 0 ? (
                  <p className="text-xs text-rose-500/80 italic py-4 text-center">عامل بحرانی در این ربع وجود ندارد</p>
                ) : (
                  matrixQuadrants.q1_critical.map((item) => {
                    const cfg = DIMENSION_CONFIG[item.dimension];
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-rose-200/80 shadow-3xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${cfg.bgBadge}`}>
                              {cfg.title}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          </div>
                          {item.strategicImplication && (
                            <p className="text-[10px] text-slate-600 line-clamp-1">{item.strategicImplication}</p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <span className="font-mono font-bold text-[10px] text-rose-700 bg-rose-50 px-1.5 py-0.5 rounded">
                            {toFa(item.impactScore)} / {toFa(item.probabilityScore)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Q2: Strategic Alert (High Impact, Low Probability) */}
            <div className="bg-amber-50/60 border-2 border-amber-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    ۲
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-amber-950">
                      منطقه هشدار استراتژیک (اثر بالا / احتمال پایین)
                    </h4>
                    <span className="text-[10px] text-amber-700">شگفتی‌سازها، برنامه‌های اقتضایی و سیگنال‌های ضعیف</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {toFa(matrixQuadrants.q2_strategicAlert.length)}
                </span>
              </div>

              <div className="space-y-2">
                {matrixQuadrants.q2_strategicAlert.length === 0 ? (
                  <p className="text-xs text-amber-500/80 italic py-4 text-center">عامل شگفتی‌ساز در این ربع وجود ندارد</p>
                ) : (
                  matrixQuadrants.q2_strategicAlert.map((item) => {
                    const cfg = DIMENSION_CONFIG[item.dimension];
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-amber-200/80 shadow-3xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${cfg.bgBadge}`}>
                              {cfg.title}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          </div>
                          {item.strategicImplication && (
                            <p className="text-[10px] text-slate-600 line-clamp-1">{item.strategicImplication}</p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <span className="font-mono font-bold text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded">
                            {toFa(item.impactScore)} / {toFa(item.probabilityScore)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Q3: Operational Management (Low Impact, High Probability) */}
            <div className="bg-sky-50/60 border-2 border-sky-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-sky-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    ۳
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-sky-950">
                      منطقه مراقبت و مدیریت عملیاتی (اثر متوسط / احتمال بالا)
                    </h4>
                    <span className="text-[10px] text-sky-700">فرآیندهای جاری، بهینه‌سازی روزمره و کاهش هزینه‌ها</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                  {toFa(matrixQuadrants.q3_monitoring.length)}
                </span>
              </div>

              <div className="space-y-2">
                {matrixQuadrants.q3_monitoring.length === 0 ? (
                  <p className="text-xs text-sky-500/80 italic py-4 text-center">عامل جاری در این ربع وجود ندارد</p>
                ) : (
                  matrixQuadrants.q3_monitoring.map((item) => {
                    const cfg = DIMENSION_CONFIG[item.dimension];
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-sky-200/80 shadow-3xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${cfg.bgBadge}`}>
                              {cfg.title}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          </div>
                          {item.strategicImplication && (
                            <p className="text-[10px] text-slate-600 line-clamp-1">{item.strategicImplication}</p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <span className="font-mono font-bold text-[10px] text-sky-700 bg-sky-50 px-1.5 py-0.5 rounded">
                            {toFa(item.impactScore)} / {toFa(item.probabilityScore)}
                          </span>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            {/* Q4: Low Priority (Low Impact, Low Probability) */}
            <div className="bg-slate-50 border-2 border-slate-200/90 rounded-2xl p-4 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                <div className="flex items-center gap-2">
                  <div className="w-6 h-6 rounded-lg bg-slate-500 text-white flex items-center justify-center font-bold text-xs">
                    ۴
                  </div>
                  <div>
                    <h4 className="font-bold text-xs text-slate-900">
                      منطقه پایش دوره‌ای (اثر پایین / احتمال پایین)
                    </h4>
                    <span className="text-[10px] text-slate-500">پایش سالانه بدون نیاز به تخصیص منابع فوری</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-slate-700 bg-slate-200 px-2 py-0.5 rounded-full">
                  {toFa(matrixQuadrants.q4_low.length)}
                </span>
              </div>

              <div className="space-y-2">
                {matrixQuadrants.q4_low.length === 0 ? (
                  <p className="text-xs text-slate-400 italic py-4 text-center">عامل در این ربع وجود ندارد</p>
                ) : (
                  matrixQuadrants.q4_low.map((item) => {
                    const cfg = DIMENSION_CONFIG[item.dimension];
                    return (
                      <div
                        key={item.id}
                        className="p-2.5 bg-white rounded-xl border border-slate-200/80 shadow-3xs flex items-start justify-between gap-2"
                      >
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className={`text-[9px] px-1.5 py-0.2 rounded font-bold border ${cfg.bgBadge}`}>
                              {cfg.title}
                            </span>
                            <span className="font-bold text-xs text-slate-900">{item.title}</span>
                          </div>
                          {item.strategicImplication && (
                            <p className="text-[10px] text-slate-600 line-clamp-1">{item.strategicImplication}</p>
                          )}
                        </div>
                        <div className="text-left shrink-0">
                          <span className="font-mono font-bold text-[10px] text-slate-600 bg-slate-100 px-1.5 py-0.5 rounded">
                            {toFa(item.impactScore)} / {toFa(item.probabilityScore)}
                          </span>
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

      {/* 7. ADD / EDIT FACTOR MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-xl w-full p-6 shadow-2xl border border-slate-200 max-h-[90vh] overflow-y-auto space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Globe className="w-5 h-5 text-indigo-700" />
                <h3 className="font-bold text-sm text-slate-900">
                  {editingItem ? 'ویرایش و امتیازدهی عامل محیطی PESTEL' : 'ثبت عامل کلان محیطی جدید'}
                </h3>
              </div>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 text-lg leading-none p-1"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSubmitForm} className="space-y-4 text-xs">
              {/* Dimension Selection */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1.5">
                  بعد کلان محیطی (PESTEL Dimension):
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {(Object.keys(DIMENSION_CONFIG) as PestelDimension[]).map((dimKey) => {
                    const cfg = DIMENSION_CONFIG[dimKey];
                    const Icon = cfg.icon;
                    const isSelected = formDimension === dimKey;
                    return (
                      <button
                        type="button"
                        key={dimKey}
                        onClick={() => setFormDimension(dimKey)}
                        className={`p-2.5 rounded-xl border text-right transition-all flex items-center gap-2 ${
                          isSelected
                            ? 'bg-indigo-50/80 border-indigo-600 text-indigo-950 font-bold ring-1 ring-indigo-600'
                            : 'bg-white border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        <Icon
                          className={`w-4 h-4 shrink-0 ${
                            isSelected ? 'text-indigo-600' : 'text-slate-400'
                          }`}
                        />
                        <div className="truncate">
                          <div className="truncate text-xs">{cfg.title}</div>
                          <div className="text-[10px] text-slate-400 font-normal">{cfg.english}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Title */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  عنوان عامل محیطی: <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formTitle}
                  onChange={(e) => setFormTitle(e.target.value)}
                  placeholder="مثال: ناترازی گاز طبیعی در فصول سرد و افت فشار شبکه انتقال"
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Description */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  شرح و جزئیات روند:
                </label>
                <textarea
                  rows={2}
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="توضیحات تکمیلی پیرامون ماهیت این عامل، دلایل بروز و ابعاد آن در صنعت..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Impact Type & Time Horizon & Trend in Row */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                {/* Impact Type */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">نوع اثر:</label>
                  <select
                    value={formImpactType}
                    onChange={(e) => setFormImpactType(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="threat">تهدید پیرامونی (Threat)</option>
                    <option value="opportunity">فرصت استراتژیک (Opportunity)</option>
                    <option value="neutral">خنثی / هشدار زودهنگام</option>
                  </select>
                </div>

                {/* Time Horizon */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">افق زمانی:</label>
                  <select
                    value={formTimeHorizon}
                    onChange={(e) => setFormTimeHorizon(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="short">کوتاه‌مدت (کمتر از ۱ سال)</option>
                    <option value="medium">میان‌مدت (۱ تا ۳ سال)</option>
                    <option value="long">بلندمدت (بیش از ۳ سال)</option>
                  </select>
                </div>

                {/* Trend */}
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">سمت‌وسوی روند:</label>
                  <select
                    value={formTrend}
                    onChange={(e) => setFormTrend(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="increasing">صعودی و فزاینده</option>
                    <option value="stable">پایدار و باثبات</option>
                    <option value="decreasing">نزولی و کاهنده</option>
                  </select>
                </div>
              </div>

              {/* Sliders for Impact and Probability */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 p-3 bg-slate-50 rounded-xl border border-slate-200">
                {/* Impact Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      شدت تأثیر استراتژیک (Impact):
                    </label>
                    <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded">
                      {toFa(formImpactScore)} از ۱۰
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={formImpactScore}
                    onChange={(e) => setFormImpactScore(Number(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>۱ (بسیار ناچیز)</span>
                    <span>۵ (متوسط)</span>
                    <span>۱۰ (بحرانی / تحول‌آفرین)</span>
                  </div>
                </div>

                {/* Probability Score */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="font-semibold text-slate-700">
                      احتمال وقوع / پایداری (Probability):
                    </label>
                    <span className="font-mono font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                      {toFa(formProbabilityScore)} از ۱۰
                    </span>
                  </div>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="1"
                    value={formProbabilityScore}
                    onChange={(e) => setFormProbabilityScore(Number(e.target.value))}
                    className="w-full accent-emerald-600"
                  />
                  <div className="flex justify-between text-[10px] text-slate-400">
                    <span>۱ (بسیار بعید)</span>
                    <span>۵ (محتمل)</span>
                    <span>۱۰ (قطعی / روند پایدار)</span>
                  </div>
                </div>
              </div>

              {/* Strategic Implication */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  پیامد استراتژیک و اقدام پیشنهادی هلدینگ:
                </label>
                <textarea
                  rows={2}
                  value={formStrategicImplication}
                  onChange={(e) => setFormStrategicImplication(e.target.value)}
                  placeholder="اقدامات پیشگیرانه، تعدیل راهبردها یا پروژه‌هایی که هلدینگ باید در واکنش به این عامل کلان تعریف نماید..."
                  className="w-full text-xs p-2.5 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              {/* Linked BSC Objective */}
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  پیوند به هدف استراتژیک در کارت امتیازی (BSC Objective):
                </label>
                <select
                  value={formLinkedObjectiveId || ''}
                  onChange={(e) => setFormLinkedObjectiveId(Number(e.target.value) || undefined)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                >
                  <option value="">-- بدون پیوند به هدف خاص --</option>
                  {currentOrgObjectives.map((obj) => (
                    <option key={obj.id} value={obj.id}>
                      {obj.title}
                    </option>
                  ))}
                </select>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-xl transition-all shadow-xs"
                >
                  {editingItem ? 'ذخیره تغییرات' : 'ثبت عامل PESTEL'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
