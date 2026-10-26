import React, { useState, useMemo } from 'react';
import { createStableId } from '../ids';
import {
  Compass,
  TrendingUp,
  Shield,
  Layers,
  Sparkles,
  Zap,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Plus,
  Trash2,
  Sliders,
  RefreshCw,
  CheckCircle2,
  AlertTriangle,
  Info,
  Maximize2,
  Navigation,
  Crosshair,
  Award,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';
import {
  DatabaseState,
  SpaceFactor,
  SpaceDimension,
  SpaceQuadrant,
} from '../types';
import { toFa } from '../scoring';

interface SpaceMatrixSectionProps {
  db: DatabaseState;
  selectedOrgId: number;
  onUpdateDb: (newDb: DatabaseState) => void;
  showToast: (text: string, type?: 'success' | 'error') => void;
  currentOrgObjectives?: Array<{ id: number; title: string }>;
}

export const SpaceMatrixSection: React.FC<SpaceMatrixSectionProps> = ({
  db,
  selectedOrgId,
  onUpdateDb,
  showToast,
  currentOrgObjectives = [],
}) => {
  // Scenario override state for What-If
  const [simulationMode, setSimulationMode] = useState(false);
  const [simulatedOverrides, setSimulatedOverrides] = useState<Record<number, number>>({});
  const [activeDimensionTab, setActiveDimensionTab] = useState<SpaceDimension | 'all'>('all');

  // Add Factor Modal
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newDim, setNewDim] = useState<SpaceDimension>('FS');
  const [newName, setNewName] = useState('');
  const [newScore, setNewScore] = useState<number>(4.0);
  const [newBenchmark, setNewBenchmark] = useState('');
  const [newRationale, setNewRationale] = useState('');

  // Get raw factors for this org
  const rawOrgFactors = useMemo(() => {
    return (db.spaceFactors || []).filter((f) => f.org_id === selectedOrgId);
  }, [db.spaceFactors, selectedOrgId]);

  // Factors with simulation overrides
  const orgFactors = useMemo(() => {
    return rawOrgFactors.map((f) => {
      if (simulationMode && simulatedOverrides[f.id] !== undefined) {
        return { ...f, score: simulatedOverrides[f.id] };
      }
      return f;
    });
  }, [rawOrgFactors, simulationMode, simulatedOverrides]);

  // Dimension Calculations
  const calculations = useMemo(() => {
    const fsFactors = orgFactors.filter((f) => f.dimension === 'FS');
    const caFactors = orgFactors.filter((f) => f.dimension === 'CA');
    const isFactors = orgFactors.filter((f) => f.dimension === 'IS');
    const esFactors = orgFactors.filter((f) => f.dimension === 'ES');

    const avgFS =
      fsFactors.length > 0
        ? fsFactors.reduce((acc, f) => acc + f.score, 0) / fsFactors.length
        : 4.0;
    const avgCA =
      caFactors.length > 0
        ? caFactors.reduce((acc, f) => acc + f.score, 0) / caFactors.length
        : -2.0;
    const avgIS =
      isFactors.length > 0
        ? isFactors.reduce((acc, f) => acc + f.score, 0) / isFactors.length
        : 4.0;
    const avgES =
      esFactors.length > 0
        ? esFactors.reduce((acc, f) => acc + f.score, 0) / esFactors.length
        : -4.0;

    // SPACE Vector Coordinates:
    // X = CA (negative) + IS (positive)
    // Y = FS (positive) + ES (negative)
    const xCoord = avgCA + avgIS;
    const yCoord = avgFS + avgES;

    // Vector magnitude and angle in degrees
    const magnitude = Math.sqrt(xCoord * xCoord + yCoord * yCoord);
    let angleRad = Math.atan2(yCoord, xCoord);
    let angleDeg = (angleRad * 180) / Math.PI;
    if (angleDeg < 0) angleDeg += 360;

    // Determine Quadrant & Strategic Posture
    let quadrant: SpaceQuadrant = 'Aggressive';
    let postureTitle = 'تهاجمی (Aggressive)';
    let postureColor = 'emerald';
    let postureDescription =
      'هلدینگ از وضعیت مالی عالی برخوردار بوده و در صنعتی با جذابیت بالا دارای مزیت رقابتی است. استراتژی‌های پیشنهادی: توسعه بازار، نفوذ در بازار، توسعه محصول، ادغام عمودی به بالا و پایین.';

    if (xCoord >= 0 && yCoord >= 0) {
      quadrant = 'Aggressive';
      postureTitle = 'تهاجمی (Aggressive)';
      postureColor = 'emerald';
      postureDescription =
        'موقعیت مطلوب و قدرتمند: ترکیب توان مالی بالا و جذابیت چشمگیر صنعت. اولویت: گسترش ظرفیت تولید، تصاحب سهم بازار رقبا، ادغام عمودی و سرمایه‌گذاری جسورانه در طرح‌های توسعه‌ای.';
    } else if (xCoord < 0 && yCoord >= 0) {
      quadrant = 'Conservative';
      postureTitle = 'محافظه‌کارانه (Conservative)';
      postureColor = 'sky';
      postureDescription =
        'ثبات مالی با مزیت رقابتی محدود در صنعت کم‌رشد: اولویت با حفظ سرمایه، تنوع همگون، کاهش هزینه‌های سربار، بهبود کیفیت محصولات و ورود محتاطانه به بازارهای تکمیلی است.';
    } else if (xCoord < 0 && yCoord < 0) {
      quadrant = 'Defensive';
      postureTitle = 'تدافعی (Defensive)';
      postureColor = 'rose';
      postureDescription =
        'موقعیت بحرانی و آسیب‌پذیر: ضعف مالی در محیطی ناپایدار و بی‌ثبات. اولویت با بقا، کاهش شدید هزینه‌ها (Retrenchment)، توقف خطوط غیراقتصادی، واگذاری دارایی‌های مازاد و مهار بحران نقدینگی است.';
    } else {
      quadrant = 'Competitive';
      postureTitle = 'رقابتی (Competitive)';
      postureColor = 'amber';
      postureDescription =
        'مزیت رقابتی قوی در صنعتی جذاب اما با چالش‌های نقدینگی و بی‌ثباتی محیطی: اولویت با رهبری هزینه، تمایز محصول، اتحادهای استراتژیک و افزایش بهره‌وری جریان وجوه نقد است.';
    }

    return {
      avgFS,
      avgCA,
      avgIS,
      avgES,
      xCoord,
      yCoord,
      magnitude,
      angleDeg,
      quadrant,
      postureTitle,
      postureColor,
      postureDescription,
      fsFactors,
      caFactors,
      isFactors,
      esFactors,
    };
  }, [orgFactors]);

  // Live Slider Change
  const handleScoreChange = (factorId: number, val: number) => {
    if (simulationMode) {
      setSimulatedOverrides((prev) => ({
        ...prev,
        [factorId]: val,
      }));
      return;
    }

    const updated = (db.spaceFactors || []).map((f) => {
      if (f.id === factorId) {
        return { ...f, score: val };
      }
      return f;
    });
    onUpdateDb({ ...db, spaceFactors: updated });
  };

  // Add Factor
  const handleAddFactor = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newName.trim()) {
      showToast('لطفاً عنوان عامل را وارد کنید.', 'error');
      return;
    }

    let boundedScore = newScore;
    if (newDim === 'FS' || newDim === 'IS') {
      boundedScore = Math.max(1, Math.min(6, boundedScore));
    } else {
      boundedScore = Math.min(-1, Math.max(-6, boundedScore));
    }

    const newFactor: SpaceFactor = {
      id: createStableId((db.spaceFactors || []).map((item) => item.id)),
      org_id: selectedOrgId,
      dimension: newDim,
      name: newName.trim(),
      score: boundedScore,
      benchmark: newBenchmark.trim(),
      rationale: newRationale.trim(),
    };

    const updated = [...(db.spaceFactors || []), newFactor];
    onUpdateDb({ ...db, spaceFactors: updated });
    setIsAddModalOpen(false);
    setNewName('');
    setNewBenchmark('');
    setNewRationale('');
    showToast('عامل جدید با موفقیت به ماتریس SPACE افزوده شد.', 'success');
  };

  // Delete Factor
  const handleDeleteFactor = (id: number) => {
    const updated = (db.spaceFactors || []).filter((f) => f.id !== id);
    onUpdateDb({ ...db, spaceFactors: updated });
    showToast('عامل از ماتریس SPACE حذف گردید.', 'success');
  };

  // Preset Scenario Handlers for What-If
  const applyPresetScenario = (scenarioKey: 'boom' | 'winter_shock' | 'competition' | 'reset') => {
    if (scenarioKey === 'reset') {
      setSimulationMode(false);
      setSimulatedOverrides({});
      showToast('سناریوها به حالت پایه بازگردانی شدند.', 'success');
      return;
    }

    setSimulationMode(true);
    const overrides: Record<number, number> = {};

    if (scenarioKey === 'boom') {
      // Boom scenario: IS and FS surge
      orgFactors.forEach((f) => {
        if (f.dimension === 'FS') overrides[f.id] = Math.min(6, f.score + 0.8);
        if (f.dimension === 'IS') overrides[f.id] = Math.min(6, f.score + 0.9);
        if (f.dimension === 'ES') overrides[f.id] = Math.min(-1, f.score + 1.2);
      });
      showToast('سناریوی "رونق تقاضا و سودآوری الفین" اعمال شد.', 'success');
    } else if (scenarioKey === 'winter_shock') {
      // Winter gas cut & FX crisis: ES drops to -5.8, FS drops
      orgFactors.forEach((f) => {
        if (f.dimension === 'ES') overrides[f.id] = Math.max(-6, f.score - 1.5);
        if (f.dimension === 'FS') overrides[f.id] = Math.max(1, f.score - 1.2);
      });
      showToast('سناریوی "شوک قطعی زمستانه گاز و بحران ارزی" اعمال شد.', 'success');
    } else if (scenarioKey === 'competition') {
      // Mega competitor arrives: CA drops sharply, IS slightly drops
      orgFactors.forEach((f) => {
        if (f.dimension === 'CA') overrides[f.id] = Math.max(-6, f.score - 2.0);
        if (f.dimension === 'IS') overrides[f.id] = Math.max(1, f.score - 0.7);
      });
      showToast('سناریوی "ورود رقبای عظیم منطقه‌ای و فشار قیمتی" اعمال شد.', 'success');
    }

    setSimulatedOverrides(overrides);
  };

  // Canvas Vector Drawing Helpers (Coordinate scale: -6 to +6 mapped to 0 to 400 SVG box)
  const svgSize = 360;
  const center = svgSize / 2;
  const scale = (svgSize / 2) / 6; // pixels per unit

  // Note: in SVG, y increases downwards, so vector tip (xCoord, yCoord) maps to:
  // svgX = center + (xCoord * scale)
  // svgY = center - (yCoord * scale)
  const tipX = center + calculations.xCoord * scale;
  const tipY = center - calculations.yCoord * scale;

  return (
    <div className="space-y-6">
      {/* Top Banner & Control Hub */}
      <div className="bg-gradient-to-r from-slate-900 via-teal-950 to-slate-900 text-white rounded-2xl p-6 border border-teal-800/40 shadow-lg relative overflow-hidden">
        <div className="absolute top-0 left-0 w-96 h-96 bg-teal-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="relative z-10 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-teal-500/20 border border-teal-400/30 rounded-full text-teal-200 text-xs font-semibold">
              <Compass className="w-3.5 h-3.5 text-teal-400" />
              <span>ماتریس ارزیابی موقعیت و اقدام استراتژیک (SPACE Matrix)</span>
            </div>
            <h2 className="text-xl sm:text-2xl font-black tracking-tight text-white flex items-center gap-2">
              تحلیل بردار موقعیت استراتژیک هلدینگ
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              تحلیل برداری همزمان دو بعد درونی (<span className="text-emerald-400">توان مالی FS</span> و{' '}
              <span className="text-amber-400">مزیت رقابتی CA</span>) و دو بعد بیرونی (
              <span className="text-sky-400">جذابیت صنعت IS</span> و{' '}
              <span className="text-rose-400">پایداری محیطی ES</span>) جهت استخراج بردار جهت‌گیری کلان هلدینگ.
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
              <span>{simulationMode ? 'خروج از شبیه‌ساز What-If' : 'شبیه‌ساز شوک‌های کلان (What-If)'}</span>
            </button>

            <button
              onClick={() => setIsAddModalOpen(true)}
              className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-teal-600 hover:bg-teal-500 rounded-xl transition-colors shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>افزودن عامل استراتژیک</span>
            </button>
          </div>
        </div>

        {/* Preset Scenarios Buttons */}
        <div className="mt-4 pt-3 border-t border-white/10 flex flex-wrap items-center gap-2 text-xs">
          <span className="text-slate-300 text-[11px] font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            شبیه‌سازی سناریوهای سریع:
          </span>
          <button
            onClick={() => applyPresetScenario('boom')}
            className="px-2.5 py-1 rounded-lg bg-emerald-500/20 text-emerald-200 hover:bg-emerald-500/30 border border-emerald-400/30 text-[11px] font-semibold transition-all"
          >
            جهش جهانی تقاضا و سودآوری الفین
          </button>
          <button
            onClick={() => applyPresetScenario('winter_shock')}
            className="px-2.5 py-1 rounded-lg bg-rose-500/20 text-rose-200 hover:bg-rose-500/30 border border-rose-400/30 text-[11px] font-semibold transition-all"
          >
            افت فشار خوراک و شوک ارزی
          </button>
          <button
            onClick={() => applyPresetScenario('competition')}
            className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 hover:bg-amber-500/30 border border-amber-400/30 text-[11px] font-semibold transition-all"
          >
            ورود رقبای عظیم منطقه‌ای با دامپینگ
          </button>
          {simulationMode && (
            <button
              onClick={() => applyPresetScenario('reset')}
              className="px-2.5 py-1 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 text-[11px] font-semibold transition-all flex items-center gap-1"
            >
              <RefreshCw className="w-3 h-3" />
              بازنشانی به داده‌های واقعی
            </button>
          )}
        </div>
      </div>

      {/* 4 Dimension Summary Scorecards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {/* FS */}
        <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-emerald-900">توان مالی (FS)</span>
            <span className="text-[10px] bg-emerald-100 text-emerald-800 px-1.5 py-0.2 rounded font-mono font-bold">
              ۱+ الی ۶+
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-emerald-600 font-mono">
              +{toFa(calculations.avgFS.toFixed(2))}
            </span>
            <span className="text-[10px] text-slate-500">{toFa(calculations.fsFactors.length)} عامل</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">حاشیه سود، نسبت بدهی و نقدینگی آزاد</p>
        </div>

        {/* CA */}
        <div className="bg-white p-4 rounded-2xl border border-amber-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-amber-900">مزیت رقابتی (CA)</span>
            <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.2 rounded font-mono font-bold">
              ۶- الی ۱-
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-amber-600 font-mono">
              {toFa(calculations.avgCA.toFixed(2))}
            </span>
            <span className="text-[10px] text-slate-500">{toFa(calculations.caFactors.length)} عامل</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">سهم بازار، کیفیت گرید و وفاداری مشتری</p>
        </div>

        {/* IS */}
        <div className="bg-white p-4 rounded-2xl border border-sky-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-sky-900">جذابیت صنعت (IS)</span>
            <span className="text-[10px] bg-sky-100 text-sky-800 px-1.5 py-0.2 rounded font-mono font-bold">
              ۱+ الی ۶+
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-sky-600 font-mono">
              +{toFa(calculations.avgIS.toFixed(2))}
            </span>
            <span className="text-[10px] text-slate-500">{toFa(calculations.isFactors.length)} عامل</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">رشد تقاضای پلیمر، موانع ورود و ثبات سود</p>
        </div>

        {/* ES */}
        <div className="bg-white p-4 rounded-2xl border border-rose-200 shadow-2xs">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-rose-900">پایداری محیطی (ES)</span>
            <span className="text-[10px] bg-rose-100 text-rose-800 px-1.5 py-0.2 rounded font-mono font-bold">
              ۶- الی ۱-
            </span>
          </div>
          <div className="flex items-baseline justify-between mt-2">
            <span className="text-2xl font-black text-rose-600 font-mono">
              {toFa(calculations.avgES.toFixed(2))}
            </span>
            <span className="text-[10px] text-slate-500">{toFa(calculations.esFactors.length)} عامل</span>
          </div>
          <p className="text-[10px] text-slate-400 mt-1">نوسانات ارز، قطعی گاز و مالیات کربن ESG</p>
        </div>
      </div>

      {/* Main 2D Cartesian Vector Canvas & Posture Decision Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* SVG Cartesian Coordinate Plane */}
        <div className="lg:col-span-7 bg-white p-5 rounded-2xl border border-slate-200 shadow-2xs space-y-3 flex flex-col items-center">
          <div className="w-full flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Crosshair className="w-4 h-4 text-teal-600" />
              <h3 className="text-xs sm:text-sm font-bold text-slate-900">
                صفحه دکارتی ۲ بعدی و بردار برآیند استراتژیک
              </h3>
            </div>
            <div className="flex items-center gap-2 font-mono text-xs">
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                X = {toFa(calculations.xCoord.toFixed(2))}
              </span>
              <span className="bg-slate-100 px-2 py-0.5 rounded text-slate-700 font-bold">
                Y = {toFa(calculations.yCoord.toFixed(2))}
              </span>
            </div>
          </div>

          {/* SVG Canvas */}
          <div className="relative w-full max-w-[380px] aspect-square flex items-center justify-center p-2 select-none">
            <svg
              viewBox={`0 0 ${svgSize} ${svgSize}`}
              className="w-full h-full overflow-visible drop-shadow-xs"
            >
              {/* Defs for gradients & arrowhead markers */}
              <defs>
                <marker
                  id="space-arrow"
                  viewBox="0 0 10 10"
                  refX="6"
                  refY="5"
                  markerWidth="6"
                  markerHeight="6"
                  orient="auto-start-reverse"
                >
                  <path d="M 0 1 L 10 5 L 0 9 z" fill="#0d9488" />
                </marker>
                <radialGradient id="quad-agg" cx="70%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0.04" />
                </radialGradient>
                <radialGradient id="quad-cons" cx="30%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#0ea5e9" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#0ea5e9" stopOpacity="0.04" />
                </radialGradient>
                <radialGradient id="quad-def" cx="30%" cy="70%" r="70%">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.04" />
                </radialGradient>
                <radialGradient id="quad-comp" cx="70%" cy="70%" r="70%">
                  <stop offset="0%" stopColor="#f59e0b" stopOpacity="0.18" />
                  <stop offset="100%" stopColor="#f59e0b" stopOpacity="0.04" />
                </radialGradient>
              </defs>

              {/* 4 Quadrants Background Rectangles */}
              {/* Q2: Conservative (Top-Left: X < 0, Y > 0) */}
              <rect
                x="0"
                y="0"
                width={center}
                height={center}
                fill="url(#quad-cons)"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              {/* Q1: Aggressive (Top-Right: X > 0, Y > 0) */}
              <rect
                x={center}
                y="0"
                width={center}
                height={center}
                fill="url(#quad-agg)"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              {/* Q3: Defensive (Bottom-Left: X < 0, Y < 0) */}
              <rect
                x="0"
                y={center}
                width={center}
                height={center}
                fill="url(#quad-def)"
                stroke="#e2e8f0"
                strokeWidth="1"
              />
              {/* Q4: Competitive (Bottom-Right: X > 0, Y < 0) */}
              <rect
                x={center}
                y={center}
                width={center}
                height={center}
                fill="url(#quad-comp)"
                stroke="#e2e8f0"
                strokeWidth="1"
              />

              {/* Grid Tick Circles */}
              {[1, 2, 3, 4, 5].map((r) => (
                <circle
                  key={r}
                  cx={center}
                  cy={center}
                  r={r * scale}
                  fill="none"
                  stroke="#cbd5e1"
                  strokeWidth="0.7"
                  strokeDasharray="2 2"
                />
              ))}

              {/* Coordinate Axes */}
              <line
                x1="0"
                y1={center}
                x2={svgSize}
                y2={center}
                stroke="#475569"
                strokeWidth="1.5"
              />
              <line
                x1={center}
                y1="0"
                x2={center}
                y2={svgSize}
                stroke="#475569"
                strokeWidth="1.5"
              />

              {/* Axis Labels */}
              {/* Top: FS (+6) */}
              <text
                x={center}
                y="16"
                textAnchor="middle"
                className="text-[10px] font-bold fill-emerald-800"
              >
                توان مالی FS (+6)
              </text>
              {/* Bottom: ES (-6) */}
              <text
                x={center}
                y={svgSize - 8}
                textAnchor="middle"
                className="text-[10px] font-bold fill-rose-800"
              >
                پایداری محیطی ES (-6)
              </text>
              {/* Right: IS (+6) */}
              <text
                x={svgSize - 10}
                y={center - 8}
                textAnchor="end"
                className="text-[10px] font-bold fill-sky-800"
              >
                جذابیت صنعت IS (+6)
              </text>
              {/* Left: CA (-6) */}
              <text
                x="10"
                y={center - 8}
                textAnchor="start"
                className="text-[10px] font-bold fill-amber-800"
              >
                مزیت رقابتی CA (-6)
              </text>

              {/* Quadrant Watermark Names */}
              <text
                x={center + 50}
                y={center - 50}
                textAnchor="middle"
                className="text-xs font-black fill-emerald-700/60"
              >
                تهاجمی (Aggressive)
              </text>
              <text
                x={center - 50}
                y={center - 50}
                textAnchor="middle"
                className="text-xs font-black fill-sky-700/60"
              >
                محافظه‌کارانه (Conservative)
              </text>
              <text
                x={center - 50}
                y={center + 50}
                textAnchor="middle"
                className="text-xs font-black fill-rose-700/60"
              >
                تدافعی (Defensive)
              </text>
              <text
                x={center + 50}
                y={center + 50}
                textAnchor="middle"
                className="text-xs font-black fill-amber-700/60"
              >
                رقابتی (Competitive)
              </text>

              {/* The Dynamic SPACE Vector */}
              <line
                x1={center}
                y1={center}
                x2={tipX}
                y2={tipY}
                stroke="#0f766e"
                strokeWidth="3.5"
                strokeLinecap="round"
                markerEnd="url(#space-arrow)"
              />

              {/* Center Origin Dot */}
              <circle cx={center} cy={center} r="4" fill="#0f172a" />

              {/* Tip Target Glow Dot */}
              <circle
                cx={tipX}
                cy={tipY}
                r="7"
                fill="#0d9488"
                fillOpacity="0.4"
                className="animate-ping"
              />
              <circle cx={tipX} cy={tipY} r="4" fill="#0f766e" />
            </svg>
          </div>

          {/* Coordinates Summary Footer */}
          <div className="w-full flex items-center justify-around bg-slate-50 p-2.5 rounded-xl border border-slate-200 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">طول بردار (Magnitude R):</span>
              <span className="font-mono font-bold text-slate-900">
                {toFa(calculations.magnitude.toFixed(2))} واحد
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 block">زاویه بردار (θ):</span>
              <span className="font-mono font-bold text-slate-900">
                {toFa(calculations.angleDeg.toFixed(0))} درجه
              </span>
            </div>
            <div className="h-6 w-px bg-slate-200" />
            <div>
              <span className="text-[10px] text-slate-500 block">موقعیت استراتژیک:</span>
              <span className="font-bold text-teal-800">{calculations.postureTitle}</span>
            </div>
          </div>
        </div>

        {/* Posture Analysis & Strategic Pathways */}
        <div className="lg:col-span-5 space-y-4 flex flex-col justify-between">
          <div
            className={`p-5 rounded-2xl border shadow-2xs space-y-3.5 ${
              calculations.quadrant === 'Aggressive'
                ? 'bg-emerald-50/50 border-emerald-200'
                : calculations.quadrant === 'Conservative'
                ? 'bg-sky-50/50 border-sky-200'
                : calculations.quadrant === 'Defensive'
                ? 'bg-rose-50/50 border-rose-200'
                : 'bg-amber-50/50 border-amber-200'
            }`}
          >
            <div className="flex items-center gap-2.5">
              <div
                className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-white shadow-xs ${
                  calculations.quadrant === 'Aggressive'
                    ? 'bg-emerald-600'
                    : calculations.quadrant === 'Conservative'
                    ? 'bg-sky-600'
                    : calculations.quadrant === 'Defensive'
                    ? 'bg-rose-600'
                    : 'bg-amber-600'
                }`}
              >
                <Compass className="w-5 h-5" />
              </div>
              <div>
                <span className="text-[11px] font-semibold text-slate-500">جهت‌گیری استراتژیک حاکم</span>
                <h4 className="text-base font-black text-slate-900">
                  {calculations.postureTitle}
                </h4>
              </div>
            </div>

            <p className="text-xs text-slate-700 leading-relaxed">
              {calculations.postureDescription}
            </p>

            {/* Strategic Pathways Blueprint */}
            <div className="pt-2 border-t border-slate-200/80 space-y-2">
              <span className="text-xs font-bold text-slate-900 block flex items-center gap-1.5">
                <Target className="w-3.5 h-3.5 text-teal-600" />
                مسیرهای اقدام اولویت‌دار در کارت امتیازی (BSC):
              </span>

              <ul className="text-xs text-slate-600 space-y-1.5 list-disc pr-4">
                {calculations.quadrant === 'Aggressive' && (
                  <>
                    <li>توسعه بازار و تسخیر سهم صادراتی در کشورهای CIS و آفریقا</li>
                    <li>تکمیل خطوط ادغام عمودی پیش‌رو و پس‌رو (Forward/Backward Integration)</li>
                    <li>سرمایه‌گذاری حداکثری در واحدهای PDH/PP و گریدهای مهندسی</li>
                    <li>افزایش ظرفیت مخازن اختصاصی بنادر جهت صادرات بدون توقف</li>
                  </>
                )}

                {calculations.quadrant === 'Conservative' && (
                  <>
                    <li>حفظ انضباط نقدینگی و پرهیز از استقراض سنگین خارجی</li>
                    <li>تنوع همگون (Concentric Diversification) با ریسک پایین</li>
                    <li>بهینه‌سازی مصرف انرژی و یوتیلیتی در مجتمع‌های موجود</li>
                    <li>تمرکز بر بازارهای صادراتی سنتی و مشتریان وفادار</li>
                  </>
                )}

                {calculations.quadrant === 'Defensive' && (
                  <>
                    <li>مهار فوری هزینه‌ها و انقباض ساختاری (Retrenchment)</li>
                    <li>تعطیلی یا بازسازی اضطراری خطوط تولید دارای حاشیه سود منفی</li>
                    <li>مذاکره برای استمهال بدهی‌ها و تجدید ساختار مالی هلدینگ</li>
                    <li>واگذاری دارایی‌های مازاد و تمرکز صرف بر هسته سخت سودآور</li>
                  </>
                )}

                {calculations.quadrant === 'Competitive' && (
                  <>
                    <li>رهبری هزینه با استفاده از صرفه مقیاس و بهینه‌سازی کاتالیست</li>
                    <li>تشکیل کنسرسیوم‌ها و اتحادهای استراتژیک با شرکت‌های همجوار</li>
                    <li>تنوع‌بخشی به مبادی تأمین خوراک جهت کاهش ریسک قطعی گاز</li>
                    <li>معرفی مدل‌های فروش پیش‌پرداخت ارزی جهت تقویت نقدینگی جاری</li>
                  </>
                )}
              </ul>
            </div>
          </div>

          {/* Quick Mathematical Formulas Info */}
          <div className="bg-white p-4 rounded-2xl border border-slate-200 text-xs space-y-2 shadow-2xs">
            <span className="font-bold text-slate-800 flex items-center gap-1.5 text-xs">
              <Info className="w-3.5 h-3.5 text-indigo-500" />
              فرمول ریاضی محاسبات مختصات بردار SPACE:
            </span>
            <div className="space-y-1 font-mono text-[11px] text-slate-600 bg-slate-50 p-2.5 rounded-lg border border-slate-100">
              <div>X = میانگین مزیت رقابتی (CA) + میانگین جذابیت صنعت (IS)</div>
              <div className="text-teal-700 font-bold">
                X = ({calculations.avgCA.toFixed(2)}) + ({calculations.avgIS.toFixed(2)}) ={' '}
                {calculations.xCoord.toFixed(2)}
              </div>
              <div className="pt-1">Y = میانگین توان مالی (FS) + میانگین ثبات محیطی (ES)</div>
              <div className="text-teal-700 font-bold">
                Y = ({calculations.avgFS.toFixed(2)}) + ({calculations.avgES.toFixed(2)}) ={' '}
                {calculations.yCoord.toFixed(2)}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Interactive Factor Scrubbers by Dimension */}
      <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-2xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-100 pb-3">
          <div>
            <h3 className="text-xs sm:text-sm font-bold text-slate-900 flex items-center gap-2">
              <Sliders className="w-4 h-4 text-teal-600" />
              لغزنده‌های تنظیم و وزن‌دهی عوامل چهارگانه (Real-time Scrubbers)
            </h3>
            <p className="text-[11px] text-slate-500 mt-0.5">
              با جابجایی اسلایدرها، بردار موقعیت استراتژیک به صورت آنی تغییر مسیر داده و فرضیات را تحلیل می‌کند.
            </p>
          </div>

          {/* Dimension Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl text-xs font-semibold">
            <button
              onClick={() => setActiveDimensionTab('all')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeDimensionTab === 'all' ? 'bg-white text-slate-900 shadow-2xs' : 'text-slate-600'
              }`}
            >
              همه ({toFa(orgFactors.length)})
            </button>
            <button
              onClick={() => setActiveDimensionTab('FS')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeDimensionTab === 'FS' ? 'bg-emerald-600 text-white shadow-2xs' : 'text-emerald-800'
              }`}
            >
              توان مالی (FS)
            </button>
            <button
              onClick={() => setActiveDimensionTab('CA')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeDimensionTab === 'CA' ? 'bg-amber-600 text-white shadow-2xs' : 'text-amber-800'
              }`}
            >
              مزیت رقابتی (CA)
            </button>
            <button
              onClick={() => setActiveDimensionTab('IS')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeDimensionTab === 'IS' ? 'bg-sky-600 text-white shadow-2xs' : 'text-sky-800'
              }`}
            >
              جذابیت صنعت (IS)
            </button>
            <button
              onClick={() => setActiveDimensionTab('ES')}
              className={`px-2.5 py-1 rounded-lg transition-all ${
                activeDimensionTab === 'ES' ? 'bg-rose-600 text-white shadow-2xs' : 'text-rose-800'
              }`}
            >
              پایداری محیطی (ES)
            </button>
          </div>
        </div>

        {/* Factors Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {orgFactors
            .filter((f) => activeDimensionTab === 'all' || f.dimension === activeDimensionTab)
            .map((factor) => {
              const isPositive = factor.dimension === 'FS' || factor.dimension === 'IS';
              const minVal = isPositive ? 1 : -6;
              const maxVal = isPositive ? 6 : -1;
              const isOverridden = simulationMode && simulatedOverrides[factor.id] !== undefined;

              const getDimBadge = (dim: SpaceDimension) => {
                switch (dim) {
                  case 'FS':
                    return { label: 'توان مالی (FS)', bg: 'bg-emerald-100 text-emerald-800' };
                  case 'CA':
                    return { label: 'مزیت رقابتی (CA)', bg: 'bg-amber-100 text-amber-800' };
                  case 'IS':
                    return { label: 'جذابیت صنعت (IS)', bg: 'bg-sky-100 text-sky-800' };
                  case 'ES':
                    return { label: 'پایداری محیطی (ES)', bg: 'bg-rose-100 text-rose-800' };
                }
              };

              const badge = getDimBadge(factor.dimension);

              return (
                <div
                  key={factor.id}
                  className={`p-3.5 rounded-xl border ${
                    isOverridden ? 'border-amber-400 bg-amber-50/20' : 'border-slate-200 bg-white'
                  } shadow-3xs space-y-2.5 transition-all`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${badge.bg}`}>
                          {badge.label}
                        </span>
                        <span className="font-bold text-xs text-slate-900">{factor.name}</span>
                        {isOverridden && (
                          <span className="text-[9px] bg-amber-200 text-amber-900 px-1 rounded font-bold">
                            شبیه‌سازی
                          </span>
                        )}
                      </div>
                      {factor.benchmark && (
                        <p className="text-[10px] text-slate-500">
                          <strong>شاخص مبنا: </strong>
                          {factor.benchmark}
                        </p>
                      )}
                    </div>

                    <button
                      onClick={() => handleDeleteFactor(factor.id)}
                      className="text-slate-300 hover:text-rose-600 p-1 rounded transition-colors"
                      title="حذف"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Scrubber Range Input */}
                  <div className="flex items-center gap-3 pt-1">
                    <span className="font-mono text-[10px] text-slate-400">
                      {isPositive ? '+۱' : '-۶'}
                    </span>
                    <input
                      type="range"
                      min={minVal}
                      max={maxVal}
                      step={0.1}
                      value={factor.score}
                      onChange={(e) => handleScoreChange(factor.id, parseFloat(e.target.value))}
                      className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                    />
                    <span className="font-mono text-[10px] text-slate-400">
                      {isPositive ? '+۶' : '-۱'}
                    </span>

                    {/* Numeric Value Tag */}
                    <span
                      className={`font-mono text-xs font-black px-2 py-0.5 rounded shrink-0 min-w-[50px] text-center ${
                        factor.dimension === 'FS'
                          ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                          : factor.dimension === 'CA'
                          ? 'bg-amber-50 text-amber-800 border border-amber-200'
                          : factor.dimension === 'IS'
                          ? 'bg-sky-50 text-sky-800 border border-sky-200'
                          : 'bg-rose-50 text-rose-800 border border-rose-200'
                      }`}
                    >
                      {factor.score > 0 ? `+${toFa(factor.score.toFixed(1))}` : toFa(factor.score.toFixed(1))}
                    </span>
                  </div>

                  {factor.rationale && (
                    <p className="text-[10px] text-slate-500 leading-relaxed bg-slate-50 p-2 rounded-lg">
                      {factor.rationale}
                    </p>
                  )}
                </div>
              );
            })}
        </div>
      </div>

      {/* Add Factor Modal */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-slate-200 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Compass className="w-4 h-4 text-teal-600" />
                ثبت عامل استراتژیک جدید در ماتریس SPACE
              </h3>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAddFactor} className="space-y-3.5">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  بعد استراتژیک:
                </label>
                <select
                  value={newDim}
                  onChange={(e) => {
                    const dim = e.target.value as SpaceDimension;
                    setNewDim(dim);
                    if (dim === 'FS' || dim === 'IS') setNewScore(4.0);
                    else setNewScore(-3.0);
                  }}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                >
                  <option value="FS">توان مالی (FS: مقیاس ۱+ تا ۶+)</option>
                  <option value="CA">مزیت رقابتی (CA: مقیاس ۶- تا ۱-)</option>
                  <option value="IS">جذابیت صنعت (IS: مقیاس ۱+ تا ۶+)</option>
                  <option value="ES">پایداری محیطی (ES: مقیاس ۶- تا ۱-)</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  عنوان عامل استراتژیک:
                </label>
                <input
                  type="text"
                  required
                  placeholder="مثال: نرخ بازده سرمایه در گردش یا دسترسی به لایسنس..."
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none focus:ring-2 focus:ring-teal-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  امتیاز ({newDim === 'FS' || newDim === 'IS' ? '+۱ تا +۶' : '-۶ تا -۱'}):
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min={newDim === 'FS' || newDim === 'IS' ? 1 : -6}
                    max={newDim === 'FS' || newDim === 'IS' ? 6 : -1}
                    step={0.1}
                    value={newScore}
                    onChange={(e) => setNewScore(parseFloat(e.target.value))}
                    className="w-full accent-teal-600 h-1.5 bg-slate-200 rounded-lg cursor-pointer"
                  />
                  <span className="font-mono text-xs font-black px-2.5 py-1 bg-slate-100 rounded text-slate-800">
                    {newScore > 0 ? `+${newScore.toFixed(1)}` : newScore.toFixed(1)}
                  </span>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  شاخص مبنا یا بنچمارک صنعت (اختیاری):
                </label>
                <input
                  type="text"
                  placeholder="مثال: میانگین حاشیه سود صنعت ۲۸٪ | هلدینگ ۳۸٪"
                  value={newBenchmark}
                  onChange={(e) => setNewBenchmark(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  توجیه و تحلیل استراتژیک:
                </label>
                <textarea
                  rows={2}
                  placeholder="توضیح اثر این عامل بر بردار موقعیت..."
                  value={newRationale}
                  onChange={(e) => setNewRationale(e.target.value)}
                  className="w-full text-xs p-2 rounded-lg border border-slate-300 focus:outline-none"
                />
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
                  className="px-4 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg shadow-xs"
                >
                  ثبت عامل
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
