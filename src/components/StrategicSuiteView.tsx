import React, { useState, useMemo } from 'react';
import {
  Compass,
  TrendingUp,
  AlertTriangle,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  HelpCircle,
  CheckCircle2,
  Flame,
  Radio,
  Clock,
  Eye,
  FileText,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Activity,
  DollarSign,
  PieChart as PieIcon,
  Crosshair,
  BarChart2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  Info,
  Globe,
  Swords,
  Gem,
} from 'lucide-react';
import { PestelAnalysisSection } from './PestelAnalysisSection';
import { PorterFiveForcesSection } from './PorterFiveForcesSection';
import { VrioAnalysisSection } from './VrioAnalysisSection';
import { SpaceMatrixSection } from './SpaceMatrixSection';
import {
  DatabaseState,
  SwotItem,
  SwotStrategy,
  SwotType,
  BcgItem,
  BcgQuadrant,
  MegaTrend,
  WeakSignal,
  WildCard,
  HorizonInitiative,
  StrategicScenario,
  CriticalUncertainty,
  RiskItem,
  RiskCategory,
  RiskResponse,
} from '../types';
import { toFa } from '../scoring';

interface StrategicSuiteViewProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
}

export type SuiteTab =
  | 'swot'
  | 'pestel'
  | 'porter'
  | 'vrio'
  | 'space'
  | 'bcg'
  | 'foresight'
  | 'scenarios'
  | 'risks';

export const StrategicSuiteView: React.FC<StrategicSuiteViewProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
}) => {
  const [activeTab, setActiveTab] = useState<SuiteTab>('swot');

  // Selected organization
  const currentOrg = db.orgs.find((o) => o.id === selectedOrgId);
  const currentOrgObjectives = useMemo(
    () => db.objectives.filter((o) => o.org_id === selectedOrgId),
    [db.objectives, selectedOrgId]
  );

  // -------------------------------------------------------------
  // 1. SWOT STATE & HANDLERS
  // -------------------------------------------------------------
  const [swotTypeFilter, setSwotTypeFilter] = useState<'all' | SwotType>('all');
  const [isAddSwotModalOpen, setIsAddSwotModalOpen] = useState(false);
  const [newSwotType, setNewSwotType] = useState<SwotType>('strength');
  const [newSwotTitle, setNewSwotTitle] = useState('');
  const [newSwotDesc, setNewSwotDesc] = useState('');
  const [newSwotImportance, setNewSwotImportance] = useState<'high' | 'medium' | 'low'>('high');
  const [newSwotScore, setNewSwotScore] = useState<number>(8.5);

  const [isAddStrategyModalOpen, setIsAddStrategyModalOpen] = useState(false);
  const [newStrategyType, setNewStrategyType] = useState<'SO' | 'WO' | 'ST' | 'WT'>('SO');
  const [newStrategyTitle, setNewStrategyTitle] = useState('');
  const [newStrategyDesc, setNewStrategyDesc] = useState('');
  const [newStrategyObjId, setNewStrategyObjId] = useState<number | undefined>(
    currentOrgObjectives[0]?.id
  );

  const orgSwotItems = useMemo(() => {
    return (db.swotItems || []).filter((item) => item.org_id === selectedOrgId || item.org_id === 1);
  }, [db.swotItems, selectedOrgId]);

  const orgSwotStrategies = useMemo(() => {
    return (db.swotStrategies || []).filter(
      (st) => st.org_id === selectedOrgId || st.org_id === 1
    );
  }, [db.swotStrategies, selectedOrgId]);

  const strengths = orgSwotItems.filter((i) => i.type === 'strength');
  const weaknesses = orgSwotItems.filter((i) => i.type === 'weakness');
  const opportunities = orgSwotItems.filter((i) => i.type === 'opportunity');
  const threats = orgSwotItems.filter((i) => i.type === 'threat');

  const handleAddSwotItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSwotTitle.trim()) return;

    const newId = Math.max(...(db.swotItems || []).map((x) => x.id), 0) + 1;
    const newItem: SwotItem = {
      id: newId,
      org_id: selectedOrgId,
      type: newSwotType,
      title: newSwotTitle.trim(),
      description: newSwotDesc.trim() || undefined,
      importance: newSwotImportance,
      score: newSwotScore,
    };

    onUpdateDb({
      ...db,
      swotItems: [...(db.swotItems || []), newItem],
    });
    setNewSwotTitle('');
    setNewSwotDesc('');
    setIsAddSwotModalOpen(false);
    showToast('عامل جدید SWOT ثبت شد.');
  };

  const handleDeleteSwotItem = (id: number) => {
    onUpdateDb({
      ...db,
      swotItems: (db.swotItems || []).filter((item) => item.id !== id),
    });
    showToast('عامل SWOT حذف شد.');
  };

  const handleAddStrategy = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newStrategyTitle.trim()) return;

    const newId = Math.max(...(db.swotStrategies || []).map((x) => x.id), 0) + 1;
    const newSt: SwotStrategy = {
      id: newId,
      org_id: selectedOrgId,
      type: newStrategyType,
      title: newStrategyTitle.trim(),
      description: newStrategyDesc.trim(),
      related_swot_ids: [],
      linked_objective_id: newStrategyObjId,
    };

    onUpdateDb({
      ...db,
      swotStrategies: [...(db.swotStrategies || []), newSt],
    });
    setNewStrategyTitle('');
    setNewStrategyDesc('');
    setIsAddStrategyModalOpen(false);
    showToast('راهبرد متقاطع ماتریس SWOT ثبت شد.');
  };

  const handleDeleteStrategy = (id: number) => {
    onUpdateDb({
      ...db,
      swotStrategies: (db.swotStrategies || []).filter((s) => s.id !== id),
    });
    showToast('راهبرد حذف شد.');
  };

  // -------------------------------------------------------------
  // 2. BCG MATRIX STATE & HANDLERS
  // -------------------------------------------------------------
  const [selectedBcgQuadrant, setSelectedBcgQuadrant] = useState<BcgQuadrant | 'all'>('all');
  const [isAddBcgModalOpen, setIsAddBcgModalOpen] = useState(false);
  const [newBcgName, setNewBcgName] = useState('');
  const [newBcgGrowth, setNewBcgGrowth] = useState<number>(12);
  const [newBcgShare, setNewBcgShare] = useState<number>(1.5);
  const [newBcgRevenue, setNewBcgRevenue] = useState<number>(500);
  const [newBcgMargin, setNewBcgMargin] = useState<number>(20);
  const [newBcgRec, setNewBcgRec] = useState('');

  const orgBcgItems = useMemo(() => {
    return (db.bcgItems || []).filter(
      (item) => item.org_id === selectedOrgId || item.org_id === 1
    );
  }, [db.bcgItems, selectedOrgId]);

  const filteredBcgItems = useMemo(() => {
    if (selectedBcgQuadrant === 'all') return orgBcgItems;
    return orgBcgItems.filter((i) => i.quadrant === selectedBcgQuadrant);
  }, [orgBcgItems, selectedBcgQuadrant]);

  // Determine quadrant helper based on growth (threshold 10%) & share (threshold 1.0x)
  const calcBcgQuadrant = (growth: number, share: number): BcgQuadrant => {
    if (growth >= 10 && share >= 1.0) return 'star';
    if (growth < 10 && share >= 1.0) return 'cash_cow';
    if (growth >= 10 && share < 1.0) return 'question_mark';
    return 'dog';
  };

  const handleAddBcgItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBcgName.trim()) return;

    const quadrant = calcBcgQuadrant(newBcgGrowth, newBcgShare);
    const newId = Math.max(...(db.bcgItems || []).map((x) => x.id), 0) + 1;
    const newItem: BcgItem = {
      id: newId,
      org_id: selectedOrgId,
      name: newBcgName.trim(),
      market_growth_rate: newBcgGrowth,
      relative_market_share: newBcgShare,
      revenue: newBcgRevenue,
      revenue_currency: 'میلیارد ریال',
      profit_margin: newBcgMargin,
      quadrant,
      recommendation:
        newBcgRec.trim() ||
        (quadrant === 'star'
          ? 'سرمایه‌گذاری راهبردی جهت تثبیت رهبری بازار'
          : quadrant === 'cash_cow'
          ? 'دوشیدن جریان نقد و صیانت از سهم بازار'
          : quadrant === 'question_mark'
          ? 'سرمایه‌گذاری گزینشی یا بازبینی کسب‌وکار'
          : 'تجدیدساختار، واگذاری یا مهار هزینه‌ها'),
    };

    onUpdateDb({
      ...db,
      bcgItems: [...(db.bcgItems || []), newItem],
    });
    setNewBcgName('');
    setNewBcgRec('');
    setIsAddBcgModalOpen(false);
    showToast('واحد کسب‌وکار جدید در ماتریس بوستون ثبت شد.');
  };

  const handleDeleteBcgItem = (id: number) => {
    onUpdateDb({
      ...db,
      bcgItems: (db.bcgItems || []).filter((item) => item.id !== id),
    });
    showToast('واحد کسب‌وکار حذف شد.');
  };

  // -------------------------------------------------------------
  // 3. FORESIGHT & HORIZONS STATE
  // -------------------------------------------------------------
  const [foresightSubTab, setForesightSubTab] = useState<'trends' | 'signals' | 'wildcards' | 'horizons'>('trends');

  // -------------------------------------------------------------
  // 4. SCENARIOS STATE & HANDLERS
  // -------------------------------------------------------------
  const [selectedScenarioId, setSelectedScenarioId] = useState<number>(() => {
    return db.scenarios?.[0]?.id || 1;
  });

  const activeScenario = useMemo(() => {
    return db.scenarios?.find((s) => s.id === selectedScenarioId) || db.scenarios?.[0];
  }, [db.scenarios, selectedScenarioId]);

  // -------------------------------------------------------------
  // 5. RISK MANAGEMENT (ERM) STATE & HANDLERS
  // -------------------------------------------------------------
  const [riskCategoryFilter, setRiskCategoryFilter] = useState<'all' | RiskCategory>('all');
  const [riskSearch, setRiskSearch] = useState('');
  const [isAddRiskModalOpen, setIsAddRiskModalOpen] = useState(false);
  const [newRiskCode, setNewRiskCode] = useState('');
  const [newRiskTitle, setNewRiskTitle] = useState('');
  const [newRiskCat, setNewRiskCat] = useState<RiskCategory>('strategic');
  const [newRiskProb, setNewRiskProb] = useState<number>(3);
  const [newRiskImpact, setNewRiskImpact] = useState<number>(4);
  const [newRiskOwner, setNewRiskOwner] = useState('');
  const [newRiskStrategy, setNewRiskStrategy] = useState<RiskResponse>('mitigate');
  const [newRiskMitigation, setNewRiskMitigation] = useState('');
  const [newRiskKriTitle, setNewRiskKriTitle] = useState('');
  const [newRiskKriVal, setNewRiskKriVal] = useState('');
  const [newRiskObjId, setNewRiskObjId] = useState<number | undefined>(
    currentOrgObjectives[0]?.id
  );

  const orgRisks = useMemo(() => {
    return (db.risks || []).filter(
      (r) => r.org_id === selectedOrgId || r.org_id === 1
    );
  }, [db.risks, selectedOrgId]);

  const filteredRisks = useMemo(() => {
    return orgRisks.filter((r) => {
      if (riskCategoryFilter !== 'all' && r.category !== riskCategoryFilter) {
        return false;
      }
      if (riskSearch.trim()) {
        const q = riskSearch.trim().toLowerCase();
        return (
          r.title.toLowerCase().includes(q) ||
          r.owner.toLowerCase().includes(q) ||
          r.code.toLowerCase().includes(q)
        );
      }
      return true;
    });
  }, [orgRisks, riskCategoryFilter, riskSearch]);

  const handleAddRisk = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newRiskTitle.trim()) return;

    const newId = Math.max(...(db.risks || []).map((x) => x.id), 0) + 1;
    const score = newRiskProb * newRiskImpact;
    const defaultCode = `RSK-${newRiskCat.slice(0, 3).toUpperCase()}-${String(newId).padStart(2, '0')}`;

    const newRisk: RiskItem = {
      id: newId,
      org_id: selectedOrgId,
      code: newRiskCode.trim() || defaultCode,
      title: newRiskTitle.trim(),
      category: newRiskCat,
      probability: newRiskProb,
      impact: newRiskImpact,
      score,
      owner: newRiskOwner.trim() || 'مدیر واحد ذی‌ربط',
      status: 'active',
      response_strategy: newRiskStrategy,
      mitigation_plan: newRiskMitigation.trim() || 'طرح پایش و کنترل دوره‌ای شاخص‌های ریسک.',
      kri_title: newRiskKriTitle.trim() || undefined,
      kri_value: newRiskKriVal.trim() || undefined,
      linked_objective_id: newRiskObjId,
    };

    onUpdateDb({
      ...db,
      risks: [...(db.risks || []), newRisk],
    });
    setNewRiskTitle('');
    setNewRiskCode('');
    setNewRiskOwner('');
    setNewRiskMitigation('');
    setNewRiskKriTitle('');
    setNewRiskKriVal('');
    setIsAddRiskModalOpen(false);
    showToast('ریسک جدید در سامانه مدیریت ریسک ثبت شد.');
  };

  const handleDeleteRisk = (id: number) => {
    onUpdateDb({
      ...db,
      risks: (db.risks || []).filter((r) => r.id !== id),
    });
    showToast('ریسک حذف شد.');
  };

  // Helper for risk severity level and color
  const getRiskSeverityInfo = (score: number) => {
    if (score >= 20) {
      return {
        label: 'بحرانی (Extreme)',
        bg: 'bg-rose-600 text-white',
        border: 'border-rose-700',
        badge: 'bg-rose-100 text-rose-800 border-rose-300',
      };
    }
    if (score >= 15) {
      return {
        label: 'بالا (High)',
        bg: 'bg-orange-500 text-white',
        border: 'border-orange-600',
        badge: 'bg-orange-100 text-orange-800 border-orange-300',
      };
    }
    if (score >= 8) {
      return {
        label: 'متوسط (Medium)',
        bg: 'bg-amber-400 text-amber-950',
        border: 'border-amber-500',
        badge: 'bg-amber-100 text-amber-900 border-amber-300',
      };
    }
    return {
      label: 'پایین (Low)',
      bg: 'bg-emerald-500 text-white',
      border: 'border-emerald-600',
      badge: 'bg-emerald-100 text-emerald-900 border-emerald-300',
    };
  };

  return (
    <div className="space-y-6 pb-12">
      {/* ------------------------------------------------------------- */}
      {/* MODULE HEADER & STRATEGIC SUITE NAVIGATION */}
      {/* ------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-indigo-600 via-indigo-700 to-teal-700 text-white flex items-center justify-center shadow-md shadow-indigo-100">
              <Compass className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900 tracking-tight">
                  سوئیت ابزارهای استراتژیک، آینده‌پژوهی و مدیریت ریسک
                </h2>
                <span className="px-2.5 py-0.5 rounded-full text-[11px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                  نسخه سازمانی
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                مجموعه یکپارچه تحلیل راهبردی برای {currentOrg?.name || 'سازمان'}، متصل به نقشه استراتژی و کارت متوازن
              </p>
            </div>
          </div>
        </div>

        {/* 7 Tab Navigation Bar */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 pt-2 border-t border-slate-100">
          <button
            onClick={() => setActiveTab('swot')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'swot'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Layers className="w-4 h-4 shrink-0" />
            <span>تحلیل SWOT</span>
          </button>

          <button
            onClick={() => setActiveTab('pestel')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'pestel'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Globe className="w-4 h-4 shrink-0" />
            <span>تحلیل کلان PESTEL</span>
          </button>

          <button
            onClick={() => setActiveTab('porter')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'porter'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Swords className="w-4 h-4 shrink-0" />
            <span>۵ نیروی پورتر</span>
          </button>

          <button
            onClick={() => setActiveTab('vrio')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'vrio'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Gem className="w-4 h-4 shrink-0" />
            <span>شایستگی‌های VRIO</span>
          </button>

          <button
            onClick={() => setActiveTab('space')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'space'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Compass className="w-4 h-4 shrink-0" />
            <span>ماتریس SPACE</span>
          </button>

          <button
            onClick={() => setActiveTab('bcg')}
            className={`flex items-center justify-center gap-2 py-2.5 px-2 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'bcg'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <BarChart2 className="w-4 h-4 shrink-0" />
            <span>ماتریس BCG</span>
          </button>

          <button
            onClick={() => setActiveTab('foresight')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'foresight'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Sparkles className="w-4 h-4 shrink-0" />
            <span>آینده‌پژوهی و افق‌ها</span>
          </button>

          <button
            onClick={() => setActiveTab('scenarios')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'scenarios'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Crosshair className="w-4 h-4 shrink-0" />
            <span>سناریوپردازی استراتژیک</span>
          </button>

          <button
            onClick={() => setActiveTab('risks')}
            className={`flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-xs font-semibold transition-all ${
              activeTab === 'risks'
                ? 'bg-indigo-700 text-white shadow-sm ring-2 ring-indigo-700/20'
                : 'bg-slate-50 text-slate-700 hover:bg-slate-100 border border-slate-200/80'
            }`}
          >
            <Shield className="w-4 h-4 shrink-0" />
            <span>مدیریت ریسک سازمانی (ERM)</span>
          </button>
        </div>
      </div>

      {/* ============================================================= */}
      {/* 1. SWOT ANALYSIS & CROSS STRATEGY MATRIX */}
      {/* ============================================================= */}
      {activeTab === 'swot' && (
        <div className="space-y-6">
          {/* Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-600" />
                ماتریس جامع SWOT و فرمولاسیون استراتژی‌های متقاطع
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تطبیق عوامل درونی (قوت‌ها و ضعف‌ها) با عوامل بیرونی (فرصت‌ها و تهدیدها) جهت خلق مزیت پایدار
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddSwotModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت عامل جدید SWOT</span>
              </button>

              <button
                onClick={() => setIsAddStrategyModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-lg transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>افزودن راهبرد متقاطع</span>
              </button>
            </div>
          </div>

          {/* 4 Quadrants Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* STRENGTHS (نقاط قوت) */}
            <div className="bg-emerald-50/40 border border-emerald-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-emerald-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-600 text-white flex items-center justify-center font-bold text-xs">
                    S
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-emerald-950">
                      نقاط قوت درونی (Strengths)
                    </h4>
                    <span className="text-[10px] text-emerald-700">عوامل اقتدار، دارایی‌ها و شایستگی‌های محوری</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                  {toFa(strengths.length)} مورد
                </span>
              </div>

              <div className="space-y-2.5">
                {strengths.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-emerald-100 shadow-3xs flex items-start justify-between gap-3 group hover:border-emerald-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                        {item.importance === 'high' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-emerald-100 text-emerald-800 rounded font-semibold">
                            حیاتی
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSwotItem(item.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* WEAKNESSES (نقاط ضعف) */}
            <div className="bg-rose-50/40 border border-rose-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-rose-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-rose-600 text-white flex items-center justify-center font-bold text-xs">
                    W
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-rose-950">
                      نقاط ضعف درونی (Weaknesses)
                    </h4>
                    <span className="text-[10px] text-rose-700">محدودیت‌های ساختاری، فرسودگی و گلوگاه‌ها</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                  {toFa(weaknesses.length)} مورد
                </span>
              </div>

              <div className="space-y-2.5">
                {weaknesses.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-rose-100 shadow-3xs flex items-start justify-between gap-3 group hover:border-rose-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                        {item.importance === 'high' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-rose-100 text-rose-800 rounded font-semibold">
                            اولویت بالا
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSwotItem(item.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* OPPORTUNITIES (فرصت‌ها) */}
            <div className="bg-sky-50/40 border border-sky-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-sky-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-sky-600 text-white flex items-center justify-center font-bold text-xs">
                    O
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-sky-950">
                      فرصت‌های بیرونی (Opportunities)
                    </h4>
                    <span className="text-[10px] text-sky-700">روندهای مساعد بازار، فناوری‌های نوین و توافقات منطقه‌ای</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-sky-800 bg-sky-100 px-2 py-0.5 rounded-full">
                  {toFa(opportunities.length)} مورد
                </span>
              </div>

              <div className="space-y-2.5">
                {opportunities.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-sky-100 shadow-3xs flex items-start justify-between gap-3 group hover:border-sky-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                        {item.importance === 'high' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-sky-100 text-sky-800 rounded font-semibold">
                            فرصت کلیدی
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSwotItem(item.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* THREATS (تهدیدها) */}
            <div className="bg-amber-50/40 border border-amber-200/90 rounded-2xl p-5 shadow-2xs space-y-3">
              <div className="flex items-center justify-between border-b border-amber-200/60 pb-3">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-amber-600 text-white flex items-center justify-center font-bold text-xs">
                    T
                  </div>
                  <div>
                    <h4 className="font-bold text-xs sm:text-sm text-amber-950">
                      تهدیدهای بیرونی (Threats)
                    </h4>
                    <span className="text-[10px] text-amber-700">ناترازی انرژی، رقبا، تحریم و ریسک‌های مقرراتی</span>
                  </div>
                </div>
                <span className="font-mono text-xs font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                  {toFa(threats.length)} مورد
                </span>
              </div>

              <div className="space-y-2.5">
                {threats.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-white rounded-xl border border-amber-100 shadow-3xs flex items-start justify-between gap-3 group hover:border-amber-300 transition-all"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-xs text-slate-900">{item.title}</span>
                        {item.importance === 'high' && (
                          <span className="text-[9px] px-1.5 py-0.2 bg-amber-100 text-amber-900 rounded font-semibold">
                            هشدار جدی
                          </span>
                        )}
                      </div>
                      {item.description && (
                        <p className="text-[11px] text-slate-500 leading-relaxed">{item.description}</p>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteSwotItem(item.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors opacity-0 group-hover:opacity-100"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* CROSS-STRATEGY MATRIX (SO, WO, ST, WT) */}
          <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Target className="w-4 h-4 text-indigo-700" />
                <h4 className="text-sm font-bold text-slate-900">
                  ماتریس راهبردهای متقاطع (TOWS / Cross Matrix) متصل به کارت امتیازی
                </h4>
              </div>
              <span className="text-xs text-slate-500">
                {toFa(orgSwotStrategies.length)} راهبرد فعال
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* SO Strategies */}
              <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-emerald-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-emerald-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                      SO
                    </span>
                    راهبردهای تهاجمی (قوت - فرصت)
                  </span>
                  <span className="text-[10px] text-emerald-700">بهره‌برداری حداکثری از فرصت‌ها با اتکا به قوت‌ها</span>
                </div>

                <div className="space-y-2">
                  {orgSwotStrategies
                    .filter((s) => s.type === 'SO')
                    .map((st) => {
                      const linkedObj = db.objectives.find((o) => o.id === st.linked_objective_id);
                      return (
                        <div
                          key={st.id}
                          className="bg-white p-3 rounded-lg border border-emerald-100 text-xs shadow-3xs space-y-1.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{st.title}</span>
                            <button
                              onClick={() => handleDeleteStrategy(st.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{st.description}</p>
                          {linkedObj && (
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-800">
                              <Target className="w-3 h-3 text-teal-600" />
                              <span>هدف متصل در BSC: {linkedObj.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* WO Strategies */}
              <div className="p-4 rounded-xl border border-sky-200 bg-sky-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-sky-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                      WO
                    </span>
                    راهبردهای انطباقی و بازنگری (ضعف - فرصت)
                  </span>
                  <span className="text-[10px] text-sky-700">جبران و پوشش ضعف‌ها با فرصت‌های نوظهور</span>
                </div>

                <div className="space-y-2">
                  {orgSwotStrategies
                    .filter((s) => s.type === 'WO')
                    .map((st) => {
                      const linkedObj = db.objectives.find((o) => o.id === st.linked_objective_id);
                      return (
                        <div
                          key={st.id}
                          className="bg-white p-3 rounded-lg border border-sky-100 text-xs shadow-3xs space-y-1.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{st.title}</span>
                            <button
                              onClick={() => handleDeleteStrategy(st.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{st.description}</p>
                          {linkedObj && (
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-800">
                              <Target className="w-3 h-3 text-teal-600" />
                              <span>هدف متصل در BSC: {linkedObj.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* ST Strategies */}
              <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-amber-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                      ST
                    </span>
                    راهبردهای رقابتی و تنوع (قوت - تهدید)
                  </span>
                  <span className="text-[10px] text-amber-700">استفاده از قدرت درونی برای خنثی‌سازی تهدیدها</span>
                </div>

                <div className="space-y-2">
                  {orgSwotStrategies
                    .filter((s) => s.type === 'ST')
                    .map((st) => {
                      const linkedObj = db.objectives.find((o) => o.id === st.linked_objective_id);
                      return (
                        <div
                          key={st.id}
                          className="bg-white p-3 rounded-lg border border-amber-100 text-xs shadow-3xs space-y-1.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{st.title}</span>
                            <button
                              onClick={() => handleDeleteStrategy(st.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{st.description}</p>
                          {linkedObj && (
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-800">
                              <Target className="w-3 h-3 text-teal-600" />
                              <span>هدف متصل در BSC: {linkedObj.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>

              {/* WT Strategies */}
              <div className="p-4 rounded-xl border border-rose-200 bg-rose-50/30 space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-rose-950 flex items-center gap-1.5">
                    <span className="w-6 h-6 rounded bg-rose-600 text-white inline-flex items-center justify-center text-[11px] font-bold">
                      WT
                    </span>
                    راهبردهای تدافعی و بقا (ضعف - تهدید)
                  </span>
                  <span className="text-[10px] text-rose-700">کاهش آسیب‌پذیری و انقباض در نقاط پرخطر</span>
                </div>

                <div className="space-y-2">
                  {orgSwotStrategies
                    .filter((s) => s.type === 'WT')
                    .map((st) => {
                      const linkedObj = db.objectives.find((o) => o.id === st.linked_objective_id);
                      return (
                        <div
                          key={st.id}
                          className="bg-white p-3 rounded-lg border border-rose-100 text-xs shadow-3xs space-y-1.5 group"
                        >
                          <div className="flex items-start justify-between gap-2">
                            <span className="font-bold text-slate-900">{st.title}</span>
                            <button
                              onClick={() => handleDeleteStrategy(st.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors opacity-0 group-hover:opacity-100"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                          <p className="text-[11px] text-slate-600 leading-relaxed">{st.description}</p>
                          {linkedObj && (
                            <div className="pt-1 flex items-center gap-1.5 text-[10px] text-teal-800">
                              <Target className="w-3 h-3 text-teal-600" />
                              <span>هدف متصل در BSC: {linkedObj.title}</span>
                            </div>
                          )}
                        </div>
                      );
                    })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 2. PESTEL MACRO-ENVIRONMENTAL ANALYSIS */}
      {/* ============================================================= */}
      {activeTab === 'pestel' && (
        <PestelAnalysisSection
          db={db}
          selectedOrgId={selectedOrgId}
          onUpdateDb={onUpdateDb}
          showToast={showToast}
          currentOrgObjectives={currentOrgObjectives}
        />
      )}

      {/* ============================================================= */}
      {/* 3. PORTER'S FIVE FORCES COMPETITIVE ANALYSIS */}
      {/* ============================================================= */}
      {activeTab === 'porter' && (
        <PorterFiveForcesSection
          db={db}
          selectedOrgId={selectedOrgId}
          onUpdateDb={onUpdateDb}
          showToast={showToast}
        />
      )}

      {/* ============================================================= */}
      {/* 4. VRIO RESOURCE-BASED COMPETENCY MATRIX */}
      {/* ============================================================= */}
      {activeTab === 'vrio' && (
        <VrioAnalysisSection
          db={db}
          selectedOrgId={selectedOrgId}
          onUpdateDb={onUpdateDb}
          showToast={showToast}
          currentOrgObjectives={currentOrgObjectives}
        />
      )}

      {/* ============================================================= */}
      {/* 5. SPACE MATRIX STRATEGIC POSTURE & VECTOR ANALYSIS */}
      {/* ============================================================= */}
      {activeTab === 'space' && (
        <SpaceMatrixSection
          db={db}
          selectedOrgId={selectedOrgId}
          onUpdateDb={onUpdateDb}
          showToast={showToast}
          currentOrgObjectives={currentOrgObjectives}
        />
      )}

      {/* ============================================================= */}
      {/* 6. BOSTON CONSULTING GROUP (BCG) MATRIX */}
      {/* ============================================================= */}
      {activeTab === 'bcg' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <BarChart2 className="w-4 h-4 text-indigo-600" />
                ماتریس مشاوران بوستون (BCG Growth-Share Matrix)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تحلیل پورتفوی کسب‌وکارها، خطوط تولید و شرکت‌های تابعه بر مبنای «نرخ رشد بازار» و «سهم نسبی بازار»
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddBcgModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت خط محصول / کسب‌وکار جدید</span>
              </button>
            </div>
          </div>

          {/* Visual 2x2 Interactive BCG Matrix Board */}
          <div className="bg-slate-900 text-white rounded-2xl p-6 shadow-md relative overflow-hidden">
            <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none" />

            {/* Axes explanation labels */}
            <div className="flex items-center justify-between text-xs text-slate-400 pb-4 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400" />
                <span>محور عمودی (Y): نرخ رشد بازار (مرز تفکیک: ۱۰٪)</span>
              </div>
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-sky-400" />
                <span>محور افقی (X): سهم بازار نسبی نسبت به رقیب اصلی (مرز تفکیک: ۱.۰x)</span>
              </div>
            </div>

            {/* 4 Quadrants Visual Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-5">
              {/* Top-Right: STARS (ستاره‌ها) */}
              <div className="bg-slate-800/80 border border-amber-500/40 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">⭐</span>
                    <div>
                      <h4 className="text-xs font-bold text-amber-300">
                        ستاره‌ها (Stars)
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        رشد بازار بالا (&gt;۱۰٪) · سهم بازار بالا (&gt;۱.۰x)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold">
                    راهبرد: سرمایه‌گذاری سنگین
                  </span>
                </div>

                <div className="space-y-2">
                  {orgBcgItems
                    .filter((item) => item.quadrant === 'star')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-emerald-400 font-mono text-[11px] font-bold">
                            {toFa(item.revenue)} {item.revenue_currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                          <span>رشد بازار: {toFa(item.market_growth_rate)}%</span>
                          <span>·</span>
                          <span>سهم نسبی: {toFa(item.relative_market_share)}x</span>
                          {item.profit_margin && (
                            <>
                              <span>·</span>
                              <span>حاشیه سود: {toFa(item.profit_margin)}%</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Top-Left: QUESTION MARKS (علامت سؤال‌ها) */}
              <div className="bg-slate-800/80 border border-purple-500/40 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">❓</span>
                    <div>
                      <h4 className="text-xs font-bold text-purple-300">
                        علامت سؤال‌ها (Question Marks / Wildcats)
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        رشد بازار بالا (&gt;۱۰٪) · سهم بازار پایین (&lt;۱.۰x)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-purple-500/20 text-purple-300 px-2 py-0.5 rounded font-mono font-bold">
                    راهبرد: سرمایه‌گذاری گزینشی یا خروج
                  </span>
                </div>

                <div className="space-y-2">
                  {orgBcgItems
                    .filter((item) => item.quadrant === 'question_mark')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-purple-300 font-mono text-[11px] font-bold">
                            {toFa(item.revenue)} {item.revenue_currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                          <span>رشد بازار: {toFa(item.market_growth_rate)}%</span>
                          <span>·</span>
                          <span>سهم نسبی: {toFa(item.relative_market_share)}x</span>
                          {item.profit_margin && (
                            <>
                              <span>·</span>
                              <span>حاشیه سود: {toFa(item.profit_margin)}%</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Bottom-Right: CASH COWS (گاوهای شیرده) */}
              <div className="bg-slate-800/80 border border-emerald-500/40 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐄</span>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-300">
                        گاوهای شیرده (Cash Cows)
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        رشد بازار پایین (&lt;۱۰٪) · سهم بازار بالا (&gt;۱.۰x)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                    راهبرد: برداشت حداکثری نقدینگی
                  </span>
                </div>

                <div className="space-y-2">
                  {orgBcgItems
                    .filter((item) => item.quadrant === 'cash_cow')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-emerald-400 font-mono text-[11px] font-bold">
                            {toFa(item.revenue)} {item.revenue_currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                          <span>رشد بازار: {toFa(item.market_growth_rate)}%</span>
                          <span>·</span>
                          <span>سهم نسبی: {toFa(item.relative_market_share)}x</span>
                          {item.profit_margin && (
                            <>
                              <span>·</span>
                              <span>حاشیه سود: {toFa(item.profit_margin)}%</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>

              {/* Bottom-Left: DOGS (سگ‌ها) */}
              <div className="bg-slate-800/80 border border-rose-500/40 rounded-xl p-4 space-y-3 relative">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">🐕</span>
                    <div>
                      <h4 className="text-xs font-bold text-rose-300">
                        سگ‌ها (Dogs)
                      </h4>
                      <span className="text-[10px] text-slate-400">
                        رشد بازار پایین (&lt;۱۰٪) · سهم بازار پایین (&lt;۱.۰x)
                      </span>
                    </div>
                  </div>
                  <span className="text-[10px] bg-rose-500/20 text-rose-300 px-2 py-0.5 rounded font-mono font-bold">
                    راهبرد: بازآفرینی یا واگذاری
                  </span>
                </div>

                <div className="space-y-2">
                  {orgBcgItems
                    .filter((item) => item.quadrant === 'dog')
                    .map((item) => (
                      <div
                        key={item.id}
                        className="bg-slate-900/90 border border-slate-700/80 p-3 rounded-lg text-xs space-y-1.5"
                      >
                        <div className="flex items-start justify-between">
                          <span className="font-bold text-white">{item.name}</span>
                          <span className="text-rose-400 font-mono text-[11px] font-bold">
                            {toFa(item.revenue)} {item.revenue_currency}
                          </span>
                        </div>
                        <div className="flex items-center gap-3 text-[11px] text-slate-300 font-mono">
                          <span>رشد بازار: {toFa(item.market_growth_rate)}%</span>
                          <span>·</span>
                          <span>سهم نسبی: {toFa(item.relative_market_share)}x</span>
                          {item.profit_margin && (
                            <>
                              <span>·</span>
                              <span>حاشیه سود: {toFa(item.profit_margin)}%</span>
                            </>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 leading-relaxed pt-1">
                          {item.recommendation}
                        </p>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          </div>

          {/* Summary Table of BCG Items */}
          <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                <PieIcon className="w-4 h-4 text-indigo-700" />
                جدول تحلیلی پرتفوی تجاری و جهت‌گیری استراتژیک سرمایه‌گذاری
              </h4>
              <span className="text-xs text-slate-500">
                مجموع: {toFa(orgBcgItems.length)} خط کسب‌وکار
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold">عنوان کسب‌وکار / محصول</th>
                    <th className="py-2.5 px-3 font-semibold text-center">ربع ماتریس</th>
                    <th className="py-2.5 px-3 font-semibold text-center">رشد بازار</th>
                    <th className="py-2.5 px-3 font-semibold text-center">سهم نسبی</th>
                    <th className="py-2.5 px-3 font-semibold text-center">درآمد سالانه</th>
                    <th className="py-2.5 px-3 font-semibold text-center">حاشیه سود</th>
                    <th className="py-2.5 px-3 font-semibold">توصیه استراتژیک</th>
                    <th className="py-2.5 px-2 text-center w-12">عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {orgBcgItems.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="py-3 px-3 font-semibold text-slate-900">{item.name}</td>
                      <td className="py-3 px-3 text-center">
                        {item.quadrant === 'star' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-100 text-amber-900 font-bold">
                            ⭐ ستاره
                          </span>
                        )}
                        {item.quadrant === 'cash_cow' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-emerald-100 text-emerald-900 font-bold">
                            🐄 گاو شیرده
                          </span>
                        )}
                        {item.quadrant === 'question_mark' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-purple-100 text-purple-900 font-bold">
                            ❓ علامت سؤال
                          </span>
                        )}
                        {item.quadrant === 'dog' && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-100 text-rose-900 font-bold">
                            🐕 سگ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {toFa(item.market_growth_rate)}%
                      </td>
                      <td className="py-3 px-3 text-center font-mono font-bold text-slate-800">
                        {toFa(item.relative_market_share)}x
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-900 font-bold">
                        {toFa(item.revenue)} {item.revenue_currency}
                      </td>
                      <td className="py-3 px-3 text-center font-mono text-slate-700">
                        {item.profit_margin ? `${toFa(item.profit_margin)}%` : '—'}
                      </td>
                      <td className="py-3 px-3 text-[11px] text-slate-600 max-w-[260px]">
                        {item.recommendation}
                      </td>
                      <td className="py-3 px-2 text-center">
                        <button
                          onClick={() => handleDeleteBcgItem(item.id)}
                          className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                          title="حذف"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* 3. FORESIGHT & FUTURE STUDIES (آینده‌پژوهی و افق‌های سه‌گانه) */}
      {/* ============================================================= */}
      {activeTab === 'foresight' && (
        <div className="space-y-6">
          {/* Header Action Bar with subtabs */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-indigo-600" />
                دیده‌بانی آینده، سیگنال‌های ضعیف و افق‌های سه‌گانه نوآوری
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                رصد کلان‌روندهای دگرگون‌ساز، شگفتی‌سازها و چارچوب افق‌های مک‌کینزی (Three Horizons)
              </p>
            </div>

            {/* Subtabs */}
            <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg text-xs">
              <button
                onClick={() => setForesightSubTab('trends')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  foresightSubTab === 'trends'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                کلان‌روندها (Mega-Trends)
              </button>
              <button
                onClick={() => setForesightSubTab('signals')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  foresightSubTab === 'signals'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                سیگنال‌های ضعیف (Weak Signals)
              </button>
              <button
                onClick={() => setForesightSubTab('wildcards')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  foresightSubTab === 'wildcards'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                رویدادهای شگفت‌ساز (Wild Cards)
              </button>
              <button
                onClick={() => setForesightSubTab('horizons')}
                className={`px-3 py-1.5 rounded-md font-semibold transition-colors ${
                  foresightSubTab === 'horizons'
                    ? 'bg-white text-indigo-900 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                مدل افق‌های ۳گانه (H1-H2-H3)
              </button>
            </div>
          </div>

          {/* Subtab 1: Mega-Trends */}
          {foresightSubTab === 'trends' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(db.megaTrends || []).map((trend) => (
                <div
                  key={trend.id}
                  className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 hover:border-indigo-300 transition-all"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-700">
                        <TrendingUp className="w-4 h-4" />
                      </span>
                      <div>
                        <h4 className="font-bold text-xs sm:text-sm text-slate-900">{trend.title}</h4>
                        <span className="text-[10px] text-slate-500 font-mono">
                          افق زمانی پایش: {trend.timeframe}
                        </span>
                      </div>
                    </div>

                    <span
                      className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono ${
                        trend.impact_level === 'critical'
                          ? 'bg-rose-100 text-rose-800'
                          : 'bg-amber-100 text-amber-800'
                      }`}
                    >
                      اثر {trend.impact_level === 'critical' ? 'حیاتی' : 'بالا'}
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{trend.description}</p>

                  <div className="p-3 bg-indigo-50/50 rounded-xl border border-indigo-100 text-xs space-y-1">
                    <span className="font-bold text-indigo-950 flex items-center gap-1.5 text-[11px]">
                      <Zap className="w-3.5 h-3.5 text-indigo-600" />
                      پیامدهای مستقیم بر استراتژی هلدینگ:
                    </span>
                    <p className="text-[11px] text-indigo-900 leading-relaxed">
                      {trend.implications}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtab 2: Weak Signals */}
          {foresightSubTab === 'signals' && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-50/60 border border-amber-200 rounded-xl flex items-start gap-3 text-xs text-amber-950">
                <Info className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <p className="leading-relaxed">
                  سیگنال‌های ضعیف (Weak Signals) نشانه‌ها و لرزش‌های اولیه‌ای هستند که احتمال وقوع تحولات بزرگ یا گسست‌های صنعتی در ۵ تا ۱۰ سال آینده را خبر می‌دهند.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(db.weakSignals || []).map((sig) => (
                  <div
                    key={sig.id}
                    className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-slate-100 text-slate-700">
                          {sig.maturity === 'emerging'
                            ? 'نوظهور (Emerging)'
                            : sig.maturity === 'accelerating'
                            ? 'شتاب‌گیرنده'
                            : 'در حال بلوغ'}
                        </span>
                        <Radio className="w-4 h-4 text-indigo-600 animate-pulse" />
                      </div>
                      <h4 className="font-bold text-xs text-slate-900 leading-snug">{sig.title}</h4>
                      <span className="text-[10px] text-slate-400 block font-mono">
                        منبع دیده‌بانی: {sig.source}
                      </span>
                      <p className="text-[11px] text-slate-600 leading-relaxed pt-1">
                        {sig.potential_disruption}
                      </p>
                    </div>

                    <div className="pt-3 border-t border-slate-100 text-[11px]">
                      <span className="font-bold text-teal-900 block mb-0.5">اقدام پیش‌دستانه:</span>
                      <p className="text-slate-600">{sig.action_needed}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtab 3: Wild Cards */}
          {foresightSubTab === 'wildcards' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {(db.wildCards || []).map((card) => (
                <div
                  key={card.id}
                  className="bg-white border border-rose-200 rounded-2xl p-5 shadow-xs space-y-3 relative overflow-hidden"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="w-8 h-8 rounded-lg bg-rose-100 text-rose-700 flex items-center justify-center font-bold">
                        <Flame className="w-4 h-4" />
                      </span>
                      <h4 className="font-bold text-xs sm:text-sm text-slate-900">{card.title}</h4>
                    </div>
                    <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-rose-50 text-rose-800 border border-rose-200">
                      احتمال: کم · اثر: دگرگون‌ساز
                    </span>
                  </div>

                  <p className="text-xs text-slate-600 leading-relaxed">{card.description}</p>

                  <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs space-y-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5 text-[11px]">
                      <Shield className="w-3.5 h-3.5 text-indigo-700" />
                      برنامه تاب‌آوری و واکنش سریع:
                    </span>
                    <p className="text-[11px] text-slate-600 leading-relaxed">
                      {card.preparedness}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Subtab 4: Three Horizons Model */}
          {foresightSubTab === 'horizons' && (
            <div className="space-y-6">
              {/* Allocation bar */}
              <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-3">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-900 flex items-center gap-2">
                    <PieIcon className="w-4 h-4 text-indigo-600" />
                    تخصیص متوازن منابع در الگوی ۷۰-۲۰-۱۰ مکنزی
                  </h4>
                  <span className="text-xs text-slate-500 font-mono">
                    افق ۱: ۷۰٪ · افق ۲: ۲۰٪ · افق ۳: ۱۰٪
                  </span>
                </div>

                <div className="w-full h-4 rounded-full bg-slate-100 flex overflow-hidden">
                  <div
                    style={{ width: '70%' }}
                    className="bg-emerald-600 text-white text-[10px] flex items-center justify-center font-mono font-bold"
                    title="افق ۱: ۷۰ درصد منابع"
                  >
                    ۷۰٪ (H1)
                  </div>
                  <div
                    style={{ width: '20%' }}
                    className="bg-indigo-600 text-white text-[10px] flex items-center justify-center font-mono font-bold"
                    title="افق ۲: ۲۰ درصد منابع"
                  >
                    ۲۰٪ (H2)
                  </div>
                  <div
                    style={{ width: '10%' }}
                    className="bg-purple-600 text-white text-[10px] flex items-center justify-center font-mono font-bold"
                    title="افق ۳: ۱۰ درصد منابع"
                  >
                    ۱۰٪ (H3)
                  </div>
                </div>
              </div>

              {/* 3 Horizon Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
                {(db.horizonInitiatives || []).map((h) => (
                  <div
                    key={h.id}
                    className={`border rounded-2xl p-5 shadow-xs space-y-3 bg-white ${
                      h.horizon === 'H1'
                        ? 'border-emerald-200'
                        : h.horizon === 'H2'
                        ? 'border-indigo-200'
                        : 'border-purple-200'
                    }`}
                  >
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span
                        className={`w-7 h-7 rounded-lg text-white flex items-center justify-center font-bold text-xs ${
                          h.horizon === 'H1'
                            ? 'bg-emerald-600'
                            : h.horizon === 'H2'
                            ? 'bg-indigo-600'
                            : 'bg-purple-600'
                        }`}
                      >
                        {h.horizon}
                      </span>
                      <span className="font-mono text-xs font-bold text-slate-600">
                        افق {h.timeline}
                      </span>
                    </div>

                    <h4 className="font-bold text-xs sm:text-sm text-slate-900">{h.title}</h4>
                    <p className="text-xs text-slate-600 leading-relaxed">{h.description}</p>
                    <div className="pt-2 flex items-center justify-between text-xs text-slate-500 font-mono">
                      <span>سهم بودجه و توجه:</span>
                      <span className="font-bold text-slate-900">{toFa(h.budget_share)}%</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 4. SCENARIO PLANNING (سناریوپردازی استراتژیک) */}
      {/* ============================================================= */}
      {activeTab === 'scenarios' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Crosshair className="w-4 h-4 text-indigo-600" />
                سناریوپردازی بر پایه ماتریس عدم‌قطعیت‌های بحرانی (Critical Uncertainties)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                طراحی سناریوهای باورپذیر ۴گانه جهت آزمون تاب‌آوری اهداف استراتژیک کارت متوازن
              </p>
            </div>
          </div>

          {/* Critical Uncertainties 2 Axes Explanations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {(db.uncertainties || []).map((unc) => (
              <div
                key={unc.axis}
                className="bg-white border border-slate-200 rounded-xl p-4 shadow-2xs space-y-2"
              >
                <div className="flex items-center gap-2">
                  <span className="w-6 h-6 rounded bg-indigo-100 text-indigo-800 font-bold text-xs flex items-center justify-center font-mono">
                    {unc.axis}
                  </span>
                  <span className="font-bold text-xs text-slate-900">
                    محور عدم‌قطعیت کلیدی: {unc.title}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] pt-1">
                  <span className="text-rose-700 bg-rose-50 px-2 py-0.5 rounded font-medium">
                    قطب منفی: {unc.negative_pole}
                  </span>
                  <span className="text-slate-300 font-mono">⟷</span>
                  <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded font-medium">
                    قطب مثبت: {unc.positive_pole}
                  </span>
                </div>
              </div>
            ))}
          </div>

          {/* 4 Scenarios Selector Pills */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {(db.scenarios || []).map((sc) => {
              const isSelected = selectedScenarioId === sc.id;
              return (
                <button
                  key={sc.id}
                  onClick={() => setSelectedScenarioId(sc.id)}
                  className={`p-4 rounded-2xl text-right transition-all border flex flex-col justify-between ${
                    isSelected
                      ? 'bg-indigo-900 text-white border-indigo-700 shadow-md ring-2 ring-indigo-500/20'
                      : 'bg-white hover:bg-slate-50 text-slate-800 border-slate-200'
                  }`}
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded font-mono ${
                          isSelected
                            ? 'bg-indigo-800 text-white'
                            : 'bg-slate-100 text-slate-700'
                        }`}
                      >
                        {sc.code}
                      </span>
                      <span
                        className={`text-[11px] font-mono font-bold ${
                          isSelected ? 'text-indigo-200' : 'text-slate-500'
                        }`}
                      >
                        احتمال: {toFa(sc.probability)}%
                      </span>
                    </div>
                    <div className="font-bold text-xs sm:text-sm line-clamp-2">{sc.title}</div>
                  </div>
                  <span
                    className={`text-[10px] mt-2 block ${
                      isSelected ? 'text-indigo-300' : 'text-slate-400'
                    }`}
                  >
                    {sc.quadrant_label}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Active Scenario Detailed Breakdown */}
          {activeScenario && (
            <div className="bg-white border border-slate-200 rounded-2xl p-6 shadow-xs space-y-5">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-slate-100">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="w-8 h-8 rounded-lg bg-indigo-700 text-white flex items-center justify-center font-bold text-xs font-mono">
                      {activeScenario.code}
                    </span>
                    <h3 className="text-base font-bold text-slate-900">
                      روایت سناریو: {activeScenario.title}
                    </h3>
                  </div>
                  <span className="text-xs text-slate-500 block">
                    موقعیت: {activeScenario.quadrant_label}
                  </span>
                </div>

                <div className="flex items-center gap-3">
                  <div className="text-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] text-slate-500 block">ضریب احتمال</span>
                    <span className="font-mono font-bold text-indigo-900 text-sm">
                      {toFa(activeScenario.probability)}%
                    </span>
                  </div>
                  <div className="text-center bg-rose-50 border border-rose-200 px-3 py-1.5 rounded-lg">
                    <span className="text-[10px] text-rose-700 block">شدت اثر</span>
                    <span className="font-bold text-rose-950 text-xs">خیلی زیاد</span>
                  </div>
                </div>
              </div>

              {/* Narrative Text */}
              <div className="p-4 rounded-xl bg-slate-50 border border-slate-200 text-xs leading-relaxed text-slate-700">
                <span className="font-bold text-slate-900 block mb-1">
                  شرح رویدادها و چشم‌انداز محیطی:
                </span>
                {activeScenario.narrative}
              </div>

              {/* Early Warnings & Contingent Actions */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {/* Early Warnings */}
                <div className="p-4 rounded-xl border border-amber-200 bg-amber-50/30 space-y-3">
                  <h4 className="text-xs font-bold text-amber-950 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                    سیستم پیش‌هشدار و علائم هشدار زودهنگام (Early Warnings):
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {activeScenario.early_warnings.map((w, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0 mt-1.5" />
                        <span className="leading-relaxed">{w}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                {/* Contingency Actions */}
                <div className="p-4 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-3">
                  <h4 className="text-xs font-bold text-emerald-950 flex items-center gap-2">
                    <Shield className="w-4 h-4 text-emerald-600" />
                    اقدامات آماده‌باش و راهبرد اقتضایی (Contingency Actions):
                  </h4>
                  <ul className="space-y-2 text-xs text-slate-700">
                    {activeScenario.contingency_actions.map((act, idx) => (
                      <li key={idx} className="flex items-start gap-2">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0 mt-0.5" />
                        <span className="leading-relaxed">{act}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Strategic Posture Callout */}
              <div className="p-4 rounded-xl bg-indigo-50 border border-indigo-200 text-xs flex items-start gap-3">
                <Target className="w-5 h-5 text-indigo-700 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-indigo-950 block">جهت‌گیری استراتژیک در این سناریو:</span>
                  <p className="text-indigo-900 mt-0.5 leading-relaxed">
                    {activeScenario.strategic_posture}
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ============================================================= */}
      {/* 5. ENTERPRISE RISK MANAGEMENT (ERM - مدیریت ریسک سازمانی) */}
      {/* ============================================================= */}
      {activeTab === 'risks' && (
        <div className="space-y-6">
          {/* Header Action Bar */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-xl border border-slate-200 shadow-2xs">
            <div>
              <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-indigo-600" />
                سامانه مدیریت ریسک‌های سازمانی (Enterprise Risk Register)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ماتریس حرارتی ۵×۵ ارزیابی ریسک، رصد شاخص‌های کلیدی ریسک (KRI) و راهکارهای مهار
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsAddRiskModalOpen(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg transition-colors shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>ثبت ریسک جدید</span>
              </button>
            </div>
          </div>

          {/* 5x5 Heatmap Matrix & Statistics */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* 5x5 Visual Risk Matrix */}
            <div className="lg:col-span-2 bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Activity className="w-4 h-4 text-indigo-600" />
                  ماتریس ارزیابی ۵×۵: احتمال (Probability) در شدت اثر (Impact)
                </h4>
                <span className="text-[11px] text-slate-500 font-mono">
                  {toFa(orgRisks.length)} ریسک ارزیابی‌شده
                </span>
              </div>

              {/* 5x5 Grid Table */}
              <div className="overflow-x-auto">
                <div className="min-w-[420px]">
                  {/* Grid layout */}
                  <div className="space-y-1.5">
                    {[5, 4, 3, 2, 1].map((prob) => (
                      <div key={prob} className="flex items-center gap-1.5">
                        <span className="w-12 text-[10px] font-mono text-slate-500 text-left shrink-0">
                          احتمال {toFa(prob)}
                        </span>
                        <div className="grid grid-cols-5 gap-1.5 flex-1">
                          {[1, 2, 3, 4, 5].map((imp) => {
                            const score = prob * imp;
                            const cellRisks = orgRisks.filter(
                              (r) => r.probability === prob && r.impact === imp
                            );
                            const severity = getRiskSeverityInfo(score);

                            return (
                              <div
                                key={imp}
                                className={`h-12 rounded-lg flex flex-col items-center justify-center p-1 font-mono transition-transform hover:scale-105 cursor-pointer relative ${severity.bg}`}
                                title={`احتمال ${prob} × اثر ${imp} = امتیاز ${score} (${severity.label}) | تعداد: ${cellRisks.length} ریسک`}
                              >
                                <span className="text-[11px] font-bold leading-none">{toFa(score)}</span>
                                {cellRisks.length > 0 && (
                                  <span className="text-[10px] font-bold bg-white text-slate-900 px-1.5 py-0.2 rounded-full mt-1 leading-none shadow-xs">
                                    {toFa(cellRisks.length)}
                                  </span>
                                )}
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}

                    {/* Bottom X-axis label */}
                    <div className="flex items-center gap-1.5 pt-1">
                      <span className="w-12" />
                      <div className="grid grid-cols-5 gap-1.5 flex-1 text-center text-[10px] text-slate-500 font-mono">
                        <span>اثر ۱</span>
                        <span>اثر ۲</span>
                        <span>اثر ۳</span>
                        <span>اثر ۴</span>
                        <span>اثر ۵</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Matrix Legend */}
              <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-slate-100 text-[11px]">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-emerald-500 inline-block" />
                  <span className="text-slate-600">پایین (۱-۷)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-amber-400 inline-block" />
                  <span className="text-slate-600">متوسط (۸-۱۴)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-orange-500 inline-block" />
                  <span className="text-slate-600">بالا (۱۵-۱۹)</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded bg-rose-600 inline-block" />
                  <span className="text-slate-600">بحرانی (۲۰-۲۵)</span>
                </div>
              </div>
            </div>

            {/* Quick Stats on Risks */}
            <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
              <h4 className="text-xs font-bold text-slate-900">وضعیت توزیع و پروفایل ریسک</h4>

              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-600" />
                    <div>
                      <div className="font-bold text-xs text-rose-950">ریسک‌های بحرانی (Extreme)</div>
                      <span className="text-[10px] text-rose-700">اقدام فوری هیئت مدیره</span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-rose-950">
                    {toFa(orgRisks.filter((r) => r.score >= 20).length)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-orange-50 border border-orange-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-orange-600" />
                    <div>
                      <div className="font-bold text-xs text-orange-950">ریسک‌های با شدت بالا (High)</div>
                      <span className="text-[10px] text-orange-700">پایش هفتگی مدیران ارشد</span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-orange-950">
                    {toFa(orgRisks.filter((r) => r.score >= 15 && r.score < 20).length)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <HelpCircle className="w-4 h-4 text-amber-600" />
                    <div>
                      <div className="font-bold text-xs text-amber-950">ریسک‌های متوسط (Medium)</div>
                      <span className="text-[10px] text-amber-700">کنترل دوره‌ای در فرایندها</span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-amber-950">
                    {toFa(orgRisks.filter((r) => r.score >= 8 && r.score < 15).length)}
                  </span>
                </div>

                <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                    <div>
                      <div className="font-bold text-xs text-emerald-950">ریسک‌های کنترل‌شده (Low)</div>
                      <span className="text-[10px] text-emerald-700">در محدوده اشتهای ریسک سازمان</span>
                    </div>
                  </div>
                  <span className="font-mono text-base font-bold text-emerald-950">
                    {toFa(orgRisks.filter((r) => r.score < 8).length)}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Risk Register Table with Filters */}
          <div className="bg-white border border-slate-200 rounded-2xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <FileText className="w-4 h-4 text-indigo-600" />
                <h4 className="text-xs font-bold text-slate-900">
                  فهرست و شناسنامه ریسک‌ها (Risk Register)
                </h4>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2">
                <div className="relative">
                  <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="جستجوی ریسک..."
                    value={riskSearch}
                    onChange={(e) => setRiskSearch(e.target.value)}
                    className="text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white w-36 sm:w-44 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>

                <select
                  value={riskCategoryFilter}
                  onChange={(e) => setRiskCategoryFilter(e.target.value as any)}
                  className="text-xs py-1.5 px-2 rounded-lg border border-slate-200 bg-slate-50 text-slate-700 focus:outline-none"
                >
                  <option value="all">همه دسته‌بندی‌ها</option>
                  <option value="strategic">استراتژیک</option>
                  <option value="financial">مالی</option>
                  <option value="operational">عملیاتی</option>
                  <option value="compliance">قانونی و تطبیق</option>
                  <option value="technology">فناوری و سایبری</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto">
              <table className="w-full text-right text-xs">
                <thead>
                  <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px]">
                    <th className="py-2.5 px-3 font-semibold w-24">کد ریسک</th>
                    <th className="py-2.5 px-3 font-semibold">عنوان ریسک</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-16">دسته‌بندی</th>
                    <th className="py-2.5 px-2 font-semibold text-center w-28">احتمال × اثر</th>
                    <th className="py-2.5 px-3 font-semibold text-center w-24">سطح شدت</th>
                    <th className="py-2.5 px-3 font-semibold">استراتژی و برنامه کاهش</th>
                    <th className="py-2.5 px-3 font-semibold">شاخص کلیدی ریسک (KRI)</th>
                    <th className="py-2.5 px-2 text-center w-10">حذف</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {filteredRisks.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                        ریسکی مطابق با فیلتر انتخابی یافت نشد.
                      </td>
                    </tr>
                  ) : (
                    filteredRisks.map((risk) => {
                      const sev = getRiskSeverityInfo(risk.score);
                      const linkedObj = db.objectives.find((o) => o.id === risk.linked_objective_id);

                      return (
                        <tr key={risk.id} className="hover:bg-slate-50/80 transition-colors">
                          <td className="py-3 px-3 font-mono font-bold text-slate-800">
                            {risk.code}
                          </td>

                          <td className="py-3 px-3">
                            <div className="font-semibold text-slate-900">{risk.title}</div>
                            <div className="text-[10px] text-slate-400 mt-0.5">
                              متولی: {risk.owner}
                              {linkedObj && ` · متصل به: ${linkedObj.title}`}
                            </div>
                          </td>

                          <td className="py-3 px-2 text-center text-[11px]">
                            {risk.category === 'strategic' && 'استراتژیک'}
                            {risk.category === 'financial' && 'مالی'}
                            {risk.category === 'operational' && 'عملیاتی'}
                            {risk.category === 'compliance' && 'تطبیق/قانونی'}
                            {risk.category === 'technology' && 'فناوری'}
                          </td>

                          <td className="py-3 px-2 text-center font-mono">
                            <span className="font-bold text-slate-900">{toFa(risk.probability)}</span>
                            <span className="text-slate-400 mx-1">×</span>
                            <span className="font-bold text-slate-900">{toFa(risk.impact)}</span>
                            <span className="text-slate-400 mx-1">=</span>
                            <span className="font-bold text-indigo-950 text-xs">{toFa(risk.score)}</span>
                          </td>

                          <td className="py-3 px-3 text-center">
                            <span
                              className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-bold ${sev.badge}`}
                            >
                              {sev.label}
                            </span>
                          </td>

                          <td className="py-3 px-3 text-[11px] text-slate-600 max-w-[240px]">
                            <span className="font-semibold text-slate-800 block text-[10px]">
                              {risk.response_strategy === 'mitigate'
                                ? 'کاهش / تخفیف (Mitigate)'
                                : risk.response_strategy === 'avoid'
                                ? 'اجتناب (Avoid)'
                                : risk.response_strategy === 'transfer'
                                ? 'انتقال / بیمه (Transfer)'
                                : 'پذیرش (Accept)'}
                            </span>
                            {risk.mitigation_plan}
                          </td>

                          <td className="py-3 px-3 text-[11px] font-mono text-slate-700">
                            {risk.kri_title ? (
                              <div>
                                <span className="font-medium text-slate-900 block font-sans">
                                  {risk.kri_title}
                                </span>
                                <span className="text-teal-700 font-bold">{risk.kri_value}</span>
                              </div>
                            ) : (
                              '—'
                            )}
                          </td>

                          <td className="py-3 px-2 text-center">
                            <button
                              onClick={() => handleDeleteRisk(risk.id)}
                              className="text-slate-300 hover:text-rose-600 transition-colors p-1"
                              title="حذف ریسک"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD SWOT ITEM */}
      {/* ============================================================= */}
      {isAddSwotModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">ثبت عامل جدید SWOT</h3>

            <form onSubmit={handleAddSwotItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع عامل:</label>
                <select
                  value={newSwotType}
                  onChange={(e) => setNewSwotType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="strength">نقطه قوت درونی (Strength)</option>
                  <option value="weakness">نقطه ضعف درونی (Weakness)</option>
                  <option value="opportunity">فرصت بیرونی (Opportunity)</option>
                  <option value="threat">تهدید بیرونی (Threat)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان عامل:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: دسترسی پایدار به خوراک اقتصادی"
                  value={newSwotTitle}
                  onChange={(e) => setNewSwotTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">شرح تکمیلی و شواهد:</label>
                <textarea
                  rows={2}
                  placeholder="توضیحات و دلایل اهمیت..."
                  value={newSwotDesc}
                  onChange={(e) => setNewSwotDesc(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">اهمیت استراتژیک:</label>
                  <select
                    value={newSwotImportance}
                    onChange={(e) => setNewSwotImportance(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="high">بسیار بالا / حیاتی</option>
                    <option value="medium">متوسط</option>
                    <option value="low">پایین</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    امتیاز شدت (۱-۱۰): {toFa(newSwotScore)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="10"
                    step="0.5"
                    value={newSwotScore}
                    onChange={(e) => setNewSwotScore(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddSwotModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  ثبت عامل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD SWOT STRATEGY */}
      {/* ============================================================= */}
      {isAddStrategyModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">ثبت راهبرد متقاطع ماتریس SWOT</h3>

            <form onSubmit={handleAddStrategy} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">نوع راهبرد متقاطع:</label>
                <select
                  value={newStrategyType}
                  onChange={(e) => setNewStrategyType(e.target.value as any)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                >
                  <option value="SO">راهبرد تهاجمی SO (قوت - فرصت)</option>
                  <option value="WO">راهبرد انطباقی WO (ضعف - فرصت)</option>
                  <option value="ST">راهبرد رقابتی ST (قوت - تهدید)</option>
                  <option value="WT">راهبرد تدافعی WT (ضعف - تهدید)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان راهبرد:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نفوذ به بازارهای نوظهور آسیایی"
                  value={newStrategyTitle}
                  onChange={(e) => setNewStrategyTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">شرح تفصیلی راهبرد:</label>
                <textarea
                  rows={2}
                  required
                  placeholder="برنامه عملیاتی و چگونگی پیوند قوت‌ها/ضعف‌ها به فرصت‌ها/تهدیدها..."
                  value={newStrategyDesc}
                  onChange={(e) => setNewStrategyDesc(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  اتصال به هدف استراتژیک کارت امتیازی (BSC Objective):
                </label>
                <select
                  value={newStrategyObjId || ''}
                  onChange={(e) => setNewStrategyObjId(Number(e.target.value))}
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
                  onClick={() => setIsAddStrategyModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  ثبت راهبرد
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD BCG ITEM */}
      {/* ============================================================= */}
      {isAddBcgModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-md shadow-xl border border-slate-200 space-y-4">
            <h3 className="text-base font-bold text-slate-900">
              ثبت خط محصول / کسب‌وکار در ماتریس بوستون
            </h3>

            <form onSubmit={handleAddBcgItem} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  نام خط محصول یا واحد کسب‌وکار:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: کامپاندهای مهندسی خودرویی"
                  value={newBcgName}
                  onChange={(e) => setNewBcgName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    نرخ رشد بازار (%): {toFa(newBcgGrowth)}%
                  </label>
                  <input
                    type="range"
                    min="-5"
                    max="35"
                    step="0.5"
                    value={newBcgGrowth}
                    onChange={(e) => setNewBcgGrowth(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {newBcgGrowth >= 10 ? 'رشد بالا (>۱۰٪)' : 'رشد پایین (<۱۰٪)'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    سهم بازار نسبی: {toFa(newBcgShare)}x
                  </label>
                  <input
                    type="range"
                    min="0.1"
                    max="4.0"
                    step="0.1"
                    value={newBcgShare}
                    onChange={(e) => setNewBcgShare(parseFloat(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-400 block mt-0.5">
                    {newBcgShare >= 1.0 ? 'سهم بالا (>۱.۰x)' : 'سهم پایین (<۱.۰x)'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    درآمد سالانه (میلیارد ریال):
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={newBcgRevenue}
                    onChange={(e) => setNewBcgRevenue(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    حاشیه سود ناخالص (%):
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="100"
                    value={newBcgMargin}
                    onChange={(e) => setNewBcgMargin(Number(e.target.value))}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  توصیه و جهت‌گیری استراتژیک (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="پیش‌فرض بر اساس ربع ماتریس بوستون محاسبه خواهد شد"
                  value={newBcgRec}
                  onChange={(e) => setNewBcgRec(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsAddBcgModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  ثبت در ماتریس بوستون
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ============================================================= */}
      {/* MODAL: ADD RISK */}
      {/* ============================================================= */}
      {isAddRiskModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-2xl p-6 w-full max-w-lg shadow-xl border border-slate-200 space-y-4 max-h-[90vh] overflow-y-auto">
            <h3 className="text-base font-bold text-slate-900">
              ثبت ریسک جدید در سامانه مدیریت ریسک سازمانی (ERM)
            </h3>

            <form onSubmit={handleAddRisk} className="space-y-3.5">
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">کد ریسک:</label>
                  <input
                    type="text"
                    placeholder="مثال: RSK-STR-08"
                    value={newRiskCode}
                    onChange={(e) => setNewRiskCode(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 font-mono focus:outline-none focus:ring-1 focus:ring-indigo-600"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-semibold text-slate-700 mb-1">دسته‌بندی ریسک:</label>
                  <select
                    value={newRiskCat}
                    onChange={(e) => setNewRiskCat(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="strategic">استراتژیک (Strategic)</option>
                    <option value="financial">مالی و نقدینگی (Financial)</option>
                    <option value="operational">عملیاتی و تولید (Operational)</option>
                    <option value="compliance">قانونی و تطبیق (Compliance)</option>
                    <option value="technology">فناوری اطلاعات و سایبری (Technology)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">عنوان رویداد ریسک:</label>
                <input
                  type="text"
                  required
                  placeholder="مثال: افت فشار خوراک گاز دریافتی در زمستان"
                  value={newRiskTitle}
                  onChange={(e) => setNewRiskTitle(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-1 focus:ring-indigo-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    احتمال وقوع (۱ تا ۵): {toFa(newRiskProb)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={newRiskProb}
                    onChange={(e) => setNewRiskProb(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    {newRiskProb === 5 ? 'خیلی زیاد (قطعی)' : newRiskProb >= 4 ? 'زیاد' : newRiskProb === 3 ? 'متوسط' : 'کم'}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    شدت اثر / پیامد (۱ تا ۵): {toFa(newRiskImpact)}
                  </label>
                  <input
                    type="range"
                    min="1"
                    max="5"
                    step="1"
                    value={newRiskImpact}
                    onChange={(e) => setNewRiskImpact(parseInt(e.target.value))}
                    className="w-full accent-indigo-600"
                  />
                  <span className="text-[10px] text-slate-500 font-mono">
                    {newRiskImpact === 5 ? 'فاجعه‌بار / بحرانی' : newRiskImpact >= 4 ? 'شدید' : newRiskImpact === 3 ? 'متوسط' : 'خفیف'}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">متولی ریسک:</label>
                  <input
                    type="text"
                    placeholder="مثال: مدیر فنی و اورهال"
                    value={newRiskOwner}
                    onChange={(e) => setNewRiskOwner(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">استراتژی پاسخ به ریسک:</label>
                  <select
                    value={newRiskStrategy}
                    onChange={(e) => setNewRiskStrategy(e.target.value as any)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  >
                    <option value="mitigate">کاهش و تخفیف اثر (Mitigate)</option>
                    <option value="avoid">اجتناب کامل (Avoid)</option>
                    <option value="transfer">انتقال / بیمه (Transfer)</option>
                    <option value="accept">پذیرش فعال (Accept)</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  برنامه اقدام کنترلی و کاهش ریسک:
                </label>
                <textarea
                  rows={2}
                  placeholder="اقدامات پیشگیرانه و واکنش اضطراری..."
                  value={newRiskMitigation}
                  onChange={(e) => setNewRiskMitigation(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    عنوان شاخص کلیدی ریسک (KRI):
                  </label>
                  <input
                    type="text"
                    placeholder="مثال: نرخ افت فشار گاز دریافتی"
                    value={newRiskKriTitle}
                    onChange={(e) => setNewRiskKriTitle(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">مقدار KRI:</label>
                  <input
                    type="text"
                    placeholder="مثال: ۱۵٪ افت"
                    value={newRiskKriVal}
                    onChange={(e) => setNewRiskKriVal(e.target.value)}
                    className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  پیوند به هدف استراتژیک کارت متوازن:
                </label>
                <select
                  value={newRiskObjId || ''}
                  onChange={(e) => setNewRiskObjId(Number(e.target.value))}
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
                  onClick={() => setIsAddRiskModalOpen(false)}
                  className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
                >
                  انصراف
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-indigo-700 hover:bg-indigo-800 rounded-lg shadow-xs"
                >
                  ثبت ریسک
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
