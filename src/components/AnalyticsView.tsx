import React, { useState, useMemo, useEffect } from 'react';
import {
  BarChart3,
  TrendingUp,
  TrendingDown,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  HelpCircle,
  Calendar,
  Layers,
  Sparkles,
  LineChart as LineChartIcon,
  Target,
  ArrowUpRight,
  ArrowDownRight,
  Activity,
  Compass,
  Grid,
  Filter,
  Search,
  Scale,
  Crosshair,
  Maximize2,
  Check,
  Sliders,
  RotateCcw,
  Zap,
  CheckCheck,
  FileText,
  Diff,
  Copy,
  Split,
  Eye,
  ShieldAlert,
  Info,
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ReferenceLine,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  BarChart,
  Bar,
  Cell,
} from 'recharts';
import { DatabaseState, ScorecardResult, StatusType, Indicator } from '../types';
import { buildScorecard, scoreIndicator, statusOf, toFa, toFaInt, wavg } from '../scoring';
import { StatusBadge } from './StatusBadge';

interface AnalyticsViewProps {
  db: DatabaseState;
  selectedOrgId: number;
  selectedPeriodId: number;
  onApplyWeights?: (
    objectiveWeights: Record<number, number>,
    indicatorWeights: Record<number, number>
  ) => void;
}

export const AnalyticsView: React.FC<AnalyticsViewProps> = ({
  db,
  selectedOrgId,
  selectedPeriodId,
  onApplyWeights,
}) => {
  const currentOrg = db.orgs.find((o) => o.id === selectedOrgId);
  const currentScorecard = buildScorecard(db, selectedOrgId, selectedPeriodId);

  // Previous period scorecard for comparative analysis
  const currentPeriodIndex = db.periods.findIndex((p) => p.id === selectedPeriodId);
  const prevPeriod =
    currentPeriodIndex > 0 ? db.periods[currentPeriodIndex - 1] : null;
  const prevScorecard = prevPeriod
    ? buildScorecard(db, selectedOrgId, prevPeriod.id)
    : null;

  // Collect all indicators in current scorecard with their objective & perspective details
  const allOrgIndicators = useMemo(() => {
    return currentScorecard.perspectives.flatMap((p) =>
      p.objectives.flatMap((o) =>
        o.indicators.map((ind) => ({
          ...ind,
          objectiveTitle: o.title,
          perspectiveName: p.perspective.name,
          perspectiveId: p.perspective.id,
        }))
      )
    );
  }, [currentScorecard]);

  // Selected indicator for Line Trend Analysis
  const [selectedIndId, setSelectedIndId] = useState<number>(() => {
    return allOrgIndicators[0]?.id || 1;
  });

  const [trendMode, setTrendMode] = useState<'kpi' | 'perspectives'>('kpi');
  const [radarCompareMode, setRadarCompareMode] = useState<'benchmark' | 'prevPeriod'>('benchmark');

  // Performance Gap state
  const [gapViewLayout, setGapViewLayout] = useState<'combined' | 'chartOnly' | 'gapOnly'>('combined');
  const [copiedGapReport, setCopiedGapReport] = useState(false);

  // Heatmap state
  const [heatmapPerspectiveFilter, setHeatmapPerspectiveFilter] = useState<number | 'all'>('all');
  const [heatmapSearch, setHeatmapSearch] = useState('');

  // -------------------------------------------------------------
  // SENSITIVITY ANALYSIS (WHAT-IF SIMULATION) STATE & LOGIC
  // -------------------------------------------------------------
  const [selectedSensPerspId, setSelectedSensPerspId] = useState<number>(1);
  const [simObjWeights, setSimObjWeights] = useState<Record<number, number>>({});
  const [simIndWeights, setSimIndWeights] = useState<Record<number, number>>({});
  const [isSavedConfirmation, setIsSavedConfirmation] = useState(false);

  // Sync baseline weights when org or db changes
  useEffect(() => {
    const initialObjWeights: Record<number, number> = {};
    for (const obj of db.objectives) {
      initialObjWeights[obj.id] = obj.weight;
    }
    const initialIndWeights: Record<number, number> = {};
    for (const ind of db.indicators) {
      initialIndWeights[ind.id] = ind.weight;
    }
    setSimObjWeights(initialObjWeights);
    setSimIndWeights(initialIndWeights);
  }, [db.objectives, db.indicators, selectedOrgId]);

  // Reset simulation to baseline weights
  const handleResetWeights = () => {
    const initialObjWeights: Record<number, number> = {};
    for (const obj of db.objectives) {
      initialObjWeights[obj.id] = obj.weight;
    }
    const initialIndWeights: Record<number, number> = {};
    for (const ind of db.indicators) {
      initialIndWeights[ind.id] = ind.weight;
    }
    setSimObjWeights(initialObjWeights);
    setSimIndWeights(initialIndWeights);
  };

  // Has simulation diverged from baseline?
  const isSimulationModified = useMemo(() => {
    for (const obj of db.objectives) {
      if (simObjWeights[obj.id] !== undefined && simObjWeights[obj.id] !== obj.weight) {
        return true;
      }
    }
    for (const ind of db.indicators) {
      if (simIndWeights[ind.id] !== undefined && simIndWeights[ind.id] !== ind.weight) {
        return true;
      }
    }
    return false;
  }, [simObjWeights, simIndWeights, db.objectives, db.indicators]);

  // Calculate simulated scores across all perspectives
  const sensitivitySimulation = useMemo(() => {
    // 1. Objectives of current organization
    const orgObjs = db.objectives.filter((o) => o.org_id === selectedOrgId);

    // Map each objective to its simulated score
    const objSimScores: Record<number, number | null> = {};
    const objBaseScores: Record<number, number | null> = {};

    for (const obj of orgObjs) {
      const inds = db.indicators.filter((i) => i.objective_id === obj.id);

      // Baseline objective score
      const basePairs: [number | null, number][] = inds.map((ind) => {
        const meas = db.measurements.find(
          (m) => m.indicator_id === ind.id && m.period_id === selectedPeriodId
        );
        const [sc] = scoreIndicator(ind, meas?.target ?? null, meas?.actual ?? null);
        return [sc, ind.weight];
      });
      objBaseScores[obj.id] = wavg(basePairs);

      // Simulated objective score
      const simPairs: [number | null, number][] = inds.map((ind) => {
        const meas = db.measurements.find(
          (m) => m.indicator_id === ind.id && m.period_id === selectedPeriodId
        );
        const [sc] = scoreIndicator(ind, meas?.target ?? null, meas?.actual ?? null);
        const weight = simIndWeights[ind.id] ?? ind.weight;
        return [sc, weight];
      });
      objSimScores[obj.id] = wavg(simPairs);
    }

    // 2. Perspective simulated scores
    const perspectivesComparison = db.perspectives.map((persp) => {
      const pObjs = orgObjs.filter((o) => o.perspective_id === persp.id);

      // Baseline perspective score
      const basePairs: [number | null, number][] = pObjs.map((o) => [
        objBaseScores[o.id] ?? null,
        o.weight,
      ]);
      const baseScore = wavg(basePairs);

      // Simulated perspective score
      const simPairs: [number | null, number][] = pObjs.map((o) => [
        objSimScores[o.id] ?? null,
        simObjWeights[o.id] ?? o.weight,
      ]);
      const simScore = wavg(simPairs);

      const delta =
        baseScore !== null && simScore !== null
          ? Math.round((simScore - baseScore) * 10) / 10
          : 0;

      return {
        id: persp.id,
        name: persp.name,
        baseScore,
        simScore,
        delta,
        objectives: pObjs.map((o) => ({
          ...o,
          baseScore: objBaseScores[o.id],
          simScore: objSimScores[o.id],
          indicators: db.indicators
            .filter((i) => i.objective_id === o.id)
            .map((ind) => {
              const meas = db.measurements.find(
                (m) => m.indicator_id === ind.id && m.period_id === selectedPeriodId
              );
              const [sc, st] = scoreIndicator(ind, meas?.target ?? null, meas?.actual ?? null);
              return {
                ...ind,
                score: sc,
                status: st,
                actual: meas?.actual ?? null,
                target: meas?.target ?? null,
                baseWeight: ind.weight,
                simWeight: simIndWeights[ind.id] ?? ind.weight,
              };
            }),
        })),
      };
    });

    // 3. Total BSC score comparison
    const baseTotalPairs: [number | null, number][] = perspectivesComparison.map((p) => [
      p.baseScore,
      1.0,
    ]);
    const simTotalPairs: [number | null, number][] = perspectivesComparison.map((p) => [
      p.simScore,
      1.0,
    ]);

    const baseTotal = wavg(baseTotalPairs);
    const simTotal = wavg(simTotalPairs);
    const totalDelta =
      baseTotal !== null && simTotal !== null
        ? Math.round((simTotal - baseTotal) * 10) / 10
        : 0;

    // Selected perspective simulation details
    const activePerspSim =
      perspectivesComparison.find((p) => p.id === selectedSensPerspId) ||
      perspectivesComparison[0];

    return {
      perspectivesComparison,
      baseTotal,
      simTotal,
      totalDelta,
      activePerspSim,
    };
  }, [
    db.objectives,
    db.indicators,
    db.measurements,
    db.perspectives,
    selectedOrgId,
    selectedPeriodId,
    simObjWeights,
    simIndWeights,
    selectedSensPerspId,
  ]);

  // Handle saving simulated weights to database
  const handleCommitWeights = () => {
    if (onApplyWeights) {
      onApplyWeights(simObjWeights, simIndWeights);
      setIsSavedConfirmation(true);
      setTimeout(() => setIsSavedConfirmation(false), 2500);
    }
  };

  // Active indicator for line chart
  const activeIndicator = useMemo(() => {
    return allOrgIndicators.find((i) => i.id === selectedIndId) || allOrgIndicators[0];
  }, [allOrgIndicators, selectedIndId]);

  // Prepare line chart data for selected indicator
  const kpiTrendData = useMemo(() => {
    if (!activeIndicator) return [];

    return db.periods.map((period) => {
      const meas = db.measurements.find(
        (m) => m.indicator_id === activeIndicator.id && m.period_id === period.id
      );
      const target = meas?.target ?? null;
      const actual = meas?.actual ?? null;
      const [score, status] = scoreIndicator(activeIndicator, target, actual);

      const variance =
        target !== null && actual !== null && target !== 0
          ? Math.round(((actual - target) / target) * 100 * 10) / 10
          : null;

      return {
        periodName: period.name,
        periodId: period.id,
        target: target !== null ? target : undefined,
        actual: actual !== null ? actual : undefined,
        score: score !== null ? score : undefined,
        status,
        variance,
      };
    });
  }, [db.periods, db.measurements, activeIndicator]);

  // PERFORMANCE GAP ANALYSIS (تحلیل گپ‌های عملکردی چنددوره‌ای)
  const gapAnalysis = useMemo(() => {
    if (!activeIndicator) return null;

    const higherIsBetter = activeIndicator.higher_is_better !== false;

    const periodsData = db.periods.map((period) => {
      const meas = db.measurements.find(
        (m) => m.indicator_id === activeIndicator.id && m.period_id === period.id
      );
      const target = meas?.target ?? null;
      const actual = meas?.actual ?? null;
      const [score, status] = scoreIndicator(activeIndicator, target, actual);

      // A zero target has no valid denominator for percentage gap analysis.
      // Treat it as unavailable rather than reporting an artificial 100% realization.
      if (target === null || target === 0 || actual === null) {
        return {
          periodId: period.id,
          periodName: period.name,
          target: null,
          actual: null,
          score: null,
          status: null,
          rawDelta: null,
          gapValue: null,
          gapPct: null,
          realizationPct: null,
          isDeficit: false,
          deficitAmount: 0,
          severity: 'nodata' as const,
          severityLabel: 'فاقد داده',
          severityColor: 'text-slate-400',
          severityBadgeBg: 'bg-slate-100 text-slate-600 border-slate-200',
        };
      }

      const rawDelta = Math.round((actual - target) * 10) / 10;
      let realizationPct: number;
      let gapValue: number;
      let gapPct: number;
      let isDeficit: boolean;
      let deficitAmount: number;

      if (higherIsBetter) {
        realizationPct = target !== 0 ? Math.round((actual / target) * 100 * 10) / 10 : 100;
        gapValue = rawDelta;
        gapPct = target !== 0 ? Math.round(((actual - target) / target) * 100 * 10) / 10 : 0;
        isDeficit = actual < target;
        deficitAmount = isDeficit ? Math.round((target - actual) * 10) / 10 : 0;
      } else {
        // Lower is better (e.g. costs, incidents)
        realizationPct = actual > 0 ? Math.round((target / actual) * 100 * 10) / 10 : 120;
        gapValue = Math.round((target - actual) * 10) / 10;
        gapPct = target !== 0 ? Math.round(((target - actual) / target) * 100 * 10) / 10 : 0;
        isDeficit = actual > target;
        deficitAmount = isDeficit ? Math.round((actual - target) * 10) / 10 : 0;
      }

      let severity: 'critical' | 'warning' | 'met' | 'exceeded';
      let severityLabel: string;
      let severityColor: string;
      let severityBadgeBg: string;

      if (isDeficit) {
        if ((score !== null && score < 70) || realizationPct < 80) {
          severity = 'critical';
          severityLabel = 'کسری بحرانی';
          severityColor = 'text-rose-700';
          severityBadgeBg = 'bg-rose-50 text-rose-700 border-rose-200';
        } else {
          severity = 'warning';
          severityLabel = 'هشدار کسری';
          severityColor = 'text-amber-700';
          severityBadgeBg = 'bg-amber-50 text-amber-700 border-amber-200';
        }
      } else {
        if ((score !== null && score > 105) || realizationPct > 105) {
          severity = 'exceeded';
          severityLabel = 'فراتر از هدف';
          severityColor = 'text-emerald-700';
          severityBadgeBg = 'bg-emerald-50 text-emerald-700 border-emerald-200';
        } else {
          severity = 'met';
          severityLabel = 'منطبق بر هدف';
          severityColor = 'text-teal-700';
          severityBadgeBg = 'bg-teal-50 text-teal-700 border-teal-200';
        }
      }

      return {
        periodId: period.id,
        periodName: period.name,
        target,
        actual,
        score,
        status,
        rawDelta,
        gapValue,
        gapPct,
        realizationPct,
        isDeficit,
        deficitAmount,
        severity,
        severityLabel,
        severityColor,
        severityBadgeBg,
      };
    });

    const validPeriods = periodsData.filter((p) => p.target !== null && p.actual !== null);
    const deficitPeriods = validPeriods.filter((p) => p.isDeficit);
    const metPeriods = validPeriods.filter((p) => !p.isDeficit);

    const avgRealization =
      validPeriods.length > 0
        ? Math.round(
            (validPeriods.reduce((sum, p) => sum + (p.realizationPct || 0), 0) /
              validPeriods.length) *
              10
          ) / 10
        : null;

    const avgGapPct =
      validPeriods.length > 0
        ? Math.round(
            (validPeriods.reduce((sum, p) => sum + (p.gapPct || 0), 0) / validPeriods.length) * 10
          ) / 10
        : null;

    const latestPeriod = validPeriods.length > 0 ? validPeriods[validPeriods.length - 1] : null;
    const prevPeriod = validPeriods.length > 1 ? validPeriods[validPeriods.length - 2] : null;

    // Worst period (highest deficit)
    const worstPeriod =
      deficitPeriods.length > 0
        ? [...deficitPeriods].sort((a, b) => b.deficitAmount - a.deficitAmount)[0]
        : null;

    // Best period (highest favorable gap)
    const bestPeriod =
      validPeriods.length > 0
        ? [...validPeriods].sort((a, b) => (b.gapValue || 0) - (a.gapValue || 0))[0]
        : null;

    // Trajectory Determination
    let trajectoryType:
      | 'widening'
      | 'narrowing'
      | 'chronic'
      | 'breakthrough'
      | 'slipping'
      | 'stable'
      | 'insufficient' = 'insufficient';
    let trajectoryTitle = 'داده ناکافی برای ارزیابی روند';
    let trajectoryDesc = 'حداقل ۲ دوره ارزیابی با ثبت مقادیر واقعی و هدف برای تحلیل روند نیاز است.';
    let trajectoryBadgeColor = 'bg-slate-100 text-slate-700 border-slate-200';
    let trajectoryIconName: 'widening' | 'narrowing' | 'chronic' | 'breakthrough' | 'slipping' | 'stable' = 'stable';

    if (validPeriods.length >= 2 && latestPeriod && prevPeriod) {
      if (latestPeriod.isDeficit && prevPeriod.isDeficit) {
        if (latestPeriod.deficitAmount > prevPeriod.deficitAmount * 1.05) {
          trajectoryType = 'widening';
          trajectoryTitle = 'شکاف در حال تعمیق (بحرانی)';
          trajectoryDesc =
            'انحراف منفی عملکرد نسبت به دوره قبل افزایش یافته و فاصله تا هدف بیشتر شده است.';
          trajectoryBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
          trajectoryIconName = 'widening';
        } else if (latestPeriod.deficitAmount < prevPeriod.deficitAmount * 0.95) {
          trajectoryType = 'narrowing';
          trajectoryTitle = 'شکاف در حال ترمیم (بهبود)';
          trajectoryDesc =
            'کسری عملکرد با روندی ترمیمی نسبت به دوره قبل کاهش یافته و شاخص به سمت هدف همگرا می‌شود.';
          trajectoryBadgeColor = 'bg-emerald-100 text-emerald-800 border-emerald-300';
          trajectoryIconName = 'narrowing';
        } else {
          trajectoryType = 'chronic';
          trajectoryTitle = 'شکاف کسری مزمن و پایدار';
          trajectoryDesc =
            'انحراف منفی به شکل مستمر و با نوسان اندک در بازه هشدار یا بحرانی تداوم داشته است.';
          trajectoryBadgeColor = 'bg-amber-100 text-amber-800 border-amber-300';
          trajectoryIconName = 'chronic';
        }
      } else if (prevPeriod.isDeficit && !latestPeriod.isDeficit) {
        trajectoryType = 'breakthrough';
        trajectoryTitle = 'ترمیم کامل و عبور از خط هدف';
        trajectoryDesc =
          'شاخص پس از دوره‌های انحراف گذشته، موفق به بستن کامل گپ عملکردی و تحقق هدف شده است.';
        trajectoryBadgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
        trajectoryIconName = 'breakthrough';
      } else if (!prevPeriod.isDeficit && latestPeriod.isDeficit) {
        trajectoryType = 'slipping';
        trajectoryTitle = 'افت عملکرد و ظهور شکاف جدید';
        trajectoryDesc =
          'شاخص پس از وضعیت مطلوب دوره قبل، در دوره اخیر دچار کاهش عملکرد و ظهور انحراف منفی شده است.';
        trajectoryBadgeColor = 'bg-rose-100 text-rose-800 border-rose-300';
        trajectoryIconName = 'slipping';
      } else {
        trajectoryType = 'stable';
        trajectoryTitle = 'پایدار و منطبق بر هدف';
        trajectoryDesc =
          'عملکرد شاخص در ادوار متوالی در محدوده هدف یا فراتر از آن تثبیت شده است.';
        trajectoryBadgeColor = 'bg-teal-100 text-teal-800 border-teal-300';
        trajectoryIconName = 'stable';
      }
    }

    // Compose Automated Narrative Report
    let statusSummary = '';
    let trendNarrative = '';
    const strategicAdvice: string[] = [];

    if (latestPeriod) {
      const isDef = latestPeriod.isDeficit;
      const unit = activeIndicator.unit ? ` ${activeIndicator.unit}` : '';
      const actStr = `${toFa(latestPeriod.actual)}${unit}`;
      const tgtStr = `${toFa(latestPeriod.target)}${unit}`;
      const diffVal = Math.abs(latestPeriod.gapValue || 0);
      const diffStr = `${toFa(diffVal)}${unit}`;
      const pctStr = `${toFa(Math.abs(latestPeriod.gapPct || 0))}٪`;
      const realStr = `${toFa(latestPeriod.realizationPct)}٪`;

      if (isDef) {
        statusSummary = `در دوره ارزیابی اخیر (${latestPeriod.periodName})، مقدار عملکرد واقعی شاخص معادل ${actStr} در مقایسه با هدف مصوب ${tgtStr} محقق گردیده است. این امر نشان‌دهنده یک گپ عملکردی منفی به اندازه ${diffStr} (${pctStr} انحراف نامطلوب نسبت به هدف) با نرخ تحقق ${realStr} می‌باشد.`;
      } else {
        statusSummary = `در دوره ارزیابی اخیر (${latestPeriod.periodName})، مقدار محقق‌شده ${actStr} در برابر هدف ${tgtStr} به ثبت رسیده است. شاخص موفق به پوشش کامل هدف شده و با نرخ تحقق ${realStr}، مازاد مطلوبی به میزان ${diffStr} (+${pctStr}) را رقم زده است.`;
      }
    } else {
      statusSummary = 'اطلاعات سنجش کافی برای دوره جاری ثبت نشده است.';
    }

    // Historical Dynamics Text
    if (validPeriods.length >= 2 && latestPeriod && prevPeriod) {
      const prevDef = prevPeriod.isDeficit;
      const curDef = latestPeriod.isDeficit;
      const pName = prevPeriod.periodName;
      const cName = latestPeriod.periodName;

      if (curDef && prevDef) {
        const deltaChange = Math.round(
          Math.abs(latestPeriod.deficitAmount - prevPeriod.deficitAmount) * 10
        ) / 10;
        if (latestPeriod.deficitAmount > prevPeriod.deficitAmount) {
          trendNarrative = `بررسی سری زمانی حاکی از تعمیق شکاف عملکردی است؛ به طوری که کسری عملکرد از ${toFa(prevPeriod.deficitAmount)} در دوره ${pName} با رشد منفی به ${toFa(latestPeriod.deficitAmount)} در دوره ${cName} رسیده است (افزایش شکاف به میزان ${toFa(deltaChange)} واحد). این موضوع نشان می‌دهد که گلوگاه‌های فرایندی یا محدودیت‌های منابع تشدید شده و نیازمند مداخله اصلاحی عاجل است.`;
        } else {
          trendNarrative = `بررسی سری زمانی نمایانگر یک روند ترمیمی امیدبخش است. اگرچه شاخص همچنان زیر هدف قرار دارد، اما اندازه کسری از ${toFa(prevPeriod.deficitAmount)} در دوره ${pName} به ${toFa(latestPeriod.deficitAmount)} در دوره ${cName} کاهش یافته است (کاهش شکاف به میزان ${toFa(deltaChange)} واحد). این امر دلالت بر اثربخشی گام‌های اصلاحی و همگرایی تدریجی با هدف‌گذاری دارد.`;
        }
      } else if (!prevDef && curDef) {
        trendNarrative = `شاخص که در دوره گذشته (${pName}) منطبق بر هدف عمل می‌کرد، در دوره ${cName} دچار افت عملکرد معنادار شده و برای نخستین بار وارد منطقه کسری شده است. بررسی علل مقطعی یا نوسانات سیستمی این دوره در اولویت است.`;
      } else if (prevDef && !curDef) {
        trendNarrative = `شاخص با جهشی موفقیت‌آمیز، گپ عملکردی دوره قبل (${pName}) را به طور کامل پوشش داده و در دوره ${cName} از سطح هدف عبور کرده است. این دستاورد نشان‌دهنده اثربخشی کامل مداخلات مدیریتی و اقدامات پیشین است.`;
      } else {
        trendNarrative = `عملکرد در طول دوره‌های متوالی ثبات بالایی داشته و همواره در محدوده هدف یا بالاتر از آن پایش شده است (${toFa(avgRealization)}٪ میانگین تحقق چند دوره‌ای). این نشانگر بلوغ فرایندی و هماهنگی دقیق بین منابع و اهداف است.`;
      }
    } else if (validPeriods.length === 1) {
      trendNarrative = 'به دلیل تک‌دوره‌ای بودن داده‌های ثبت‌شده، استنتاج روند تاریخی امکان‌پذیر نیست و رفتار شاخص در ادوار آتی باید رصد گردد.';
    }

    // Strategic Action Recommendations
    if (!latestPeriod || latestPeriod.severity === 'critical') {
      strategicAdvice.push(
        'تشکیل جلسه فوری عارضه‌یابی و بازبینی فرایندی (RCA) با حضور متولیان مستقیم این شاخص جهت شناسایی گلوگاه‌های ریشه‌ای.'
      );
      strategicAdvice.push(
        'ارزیابی و بازتخصیص منابع، ظرفیت‌ها و اعتبارات عملیاتی پشتیبان برای جلوگیری از تعمیق شکاف در دوره‌های بعد.'
      );
      strategicAdvice.push(
        'بررسی واقع‌بینانه بودن فرض‌های بنیادین هدف‌گذاری در زمان تدوین برنامه استراتژیک و امکان تعدیل منطقی هدف در صورت اثبات تغییر شرایط محیطی.'
      );
    } else if (latestPeriod.severity === 'warning') {
      strategicAdvice.push(
        'اجرای اقدامات پیشگیرانه سریع (Quick Wins) به منظور برطرف کردن انحراف جزئی پیش از تبدیل به کسری ساختاری.'
      );
      strategicAdvice.push(
        'افزایش بسامد پایش عملکرد شاخص از بازه فصلی به ماهانه جهت پایش واکنش به اقدامات اصلاحی.'
      );
      strategicAdvice.push(
        'تحلیل حساسیت ورودی‌ها و شاخص‌های پیشرو (Leading Indicators) مرتبط با این هدف استراتژیک.'
      );
    } else {
      strategicAdvice.push(
        'مستندسازی و ثبت الگوهای بهینه (Best Practices) فرایندی که منجر به تحقق پایدار و مازاد هدف شده است.'
      );
      strategicAdvice.push(
        'بررسی امکان انتقال این تجارب موفق به سایر شاخص‌ها و اهداف هم‌راستا در همان منظر کارت متوازن.'
      );
      strategicAdvice.push(
        'بررسی امکان ارتقای هوشمندانه اهداف در دوره‌های آتی با تکیه بر ظرفیت‌های ایجادشده بدون تحمیل تنش عملیاتی.'
      );
    }

    return {
      periods: periodsData,
      validPeriods,
      validCount: validPeriods.length,
      deficitCount: deficitPeriods.length,
      metCount: metPeriods.length,
      latestPeriod,
      prevPeriod,
      avgRealization,
      avgGapPct,
      worstPeriod,
      bestPeriod,
      trajectory: {
        type: trajectoryType,
        title: trajectoryTitle,
        description: trajectoryDesc,
        badgeColor: trajectoryBadgeColor,
        iconName: trajectoryIconName,
      },
      narrative: {
        statusSummary,
        trendNarrative,
        strategicAdvice,
      },
    };
  }, [activeIndicator, db.periods, db.measurements]);

  // Prepare line chart data for overall 4 Perspectives
  const perspectivesTrendData = useMemo(() => {
    return db.periods.map((period) => {
      const sc = buildScorecard(db, selectedOrgId, period.id);
      const row: Record<string, any> = {
        periodName: period.name,
        periodId: period.id,
        totalScore: sc.score,
      };
      for (const p of sc.perspectives) {
        row[`p_${p.perspective.id}`] = p.score;
      }
      return row;
    });
  }, [db, selectedOrgId]);

  // RADAR CHART DATA: 4 Perspectives of BSC
  const radarData = useMemo(() => {
    return currentScorecard.perspectives.map((p) => {
      const currentScore = p.score ?? 0;
      const prevP = prevScorecard?.perspectives.find((x) => x.perspective.id === p.perspective.id);
      const prevScore = prevP?.score ?? 0;

      return {
        perspective: `منظر ${p.perspective.name}`,
        rawName: p.perspective.name,
        score: currentScore,
        benchmark: 100, // مبنای ۱۰۰٪ استاندارد تحقق
        prevScore: prevScore,
        fullMark: 120,
      };
    });
  }, [currentScorecard, prevScorecard]);

  // Balance index calculation (توازن بین ۴ منظر)
  const balanceAnalysis = useMemo(() => {
    const scores = currentScorecard.perspectives
      .map((p) => p.score)
      .filter((s): s is number => s !== null && !isNaN(s));

    if (scores.length < 2) {
      return { status: 'نامشخص', delta: 0, description: 'داده‌های کافی برای ارزیابی توازن ثبت نشده است.' };
    }

    const max = Math.max(...scores);
    const min = Math.min(...scores);
    const diff = Math.round((max - min) * 10) / 10;

    if (diff <= 15) {
      return {
        status: 'توازن استراتژیک عالی',
        color: 'text-emerald-700 bg-emerald-50 border-emerald-200',
        delta: diff,
        description:
          'هم‌نوایی متوازن بین عملکرد کوتاه‌مدت مالی، مشتری، فرایندها و سرمایه‌گذاری بلندمدت رشد و یادگیری.',
      };
    } else if (diff <= 30) {
      return {
        status: 'توازن نسبی',
        color: 'text-amber-800 bg-amber-50 border-amber-200',
        delta: diff,
        description:
          'شکاف متوسط بین برخی منظرها وجود دارد؛ تقویت زیرساخت‌های کم‌امتیاز برای جلوگیری از عدم‌تعادل توصیه می‌شود.',
      };
    } else {
      return {
        status: 'ناهمگونی و عدم‌توازن',
        color: 'text-rose-800 bg-rose-50 border-rose-200',
        delta: diff,
        description:
          'فاصله معنادار بین منظرهای پیشتاز و پس‌رو (شکاف بیش از ۳۰ امتیاز). این موضوع پایداری استراتژی را به چالش می‌کشد.',
      };
    }
  }, [currentScorecard]);

  // HEATMAP DATA: Matrix of all indicators across all periods
  const heatmapRows = useMemo(() => {
    let list = allOrgIndicators;

    if (heatmapPerspectiveFilter !== 'all') {
      list = list.filter((i) => i.perspectiveId === heatmapPerspectiveFilter);
    }

    if (heatmapSearch.trim()) {
      const q = heatmapSearch.toLowerCase();
      list = list.filter(
        (i) => i.title.toLowerCase().includes(q) || i.objectiveTitle.toLowerCase().includes(q)
      );
    }

    return list.map((ind) => {
      const periodsData = db.periods.map((period) => {
        const meas = db.measurements.find(
          (m) => m.indicator_id === ind.id && m.period_id === period.id
        );
        const target = meas?.target ?? null;
        const actual = meas?.actual ?? null;
        const [score, status] = scoreIndicator(ind, target, actual);
        return {
          periodId: period.id,
          periodName: period.name,
          target,
          actual,
          score,
          status,
        };
      });

      // Calculate trajectory (روند صعودی یا نزولی بین آخرین دو دوره)
      const lastTwo = periodsData.slice(-2);
      let trendIcon: 'up' | 'down' | 'flat' | null = null;
      if (lastTwo.length === 2 && lastTwo[0].score !== null && lastTwo[1].score !== null) {
        if (lastTwo[1].score > lastTwo[0].score) trendIcon = 'up';
        else if (lastTwo[1].score < lastTwo[0].score) trendIcon = 'down';
        else trendIcon = 'flat';
      }

      return {
        indicator: ind,
        periodsData,
        trendIcon,
      };
    });
  }, [allOrgIndicators, db.periods, db.measurements, heatmapPerspectiveFilter, heatmapSearch]);

  // Helper function to colorize heatmap cells
  const getHeatmapColor = (score: number | null) => {
    if (score === null || score === undefined || isNaN(score)) {
      return 'bg-slate-100 text-slate-400 border-slate-200';
    }
    if (score >= 95) {
      return 'bg-emerald-600 text-white font-bold shadow-xs';
    }
    if (score >= 90) {
      return 'bg-emerald-500 text-white font-semibold';
    }
    if (score >= 80) {
      return 'bg-emerald-100 text-emerald-950 font-medium border border-emerald-300/80';
    }
    if (score >= 70) {
      return 'bg-amber-100 text-amber-950 font-medium border border-amber-300/80';
    }
    if (score >= 50) {
      return 'bg-rose-100 text-rose-950 font-medium border border-rose-300/80';
    }
    return 'bg-rose-600 text-white font-bold shadow-xs';
  };

  // Indicators statistics for distribution
  const allScoredIndicators = currentScorecard.perspectives.flatMap((p) =>
    p.objectives.flatMap((o) => o.indicators)
  );

  const greenCount = allScoredIndicators.filter((i) => i.status === 'green').length;
  const yellowCount = allScoredIndicators.filter((i) => i.status === 'yellow').length;
  const redCount = allScoredIndicators.filter((i) => i.status === 'red').length;
  const noDataCount = allScoredIndicators.filter((i) => i.status === null).length;
  const totalCount = allScoredIndicators.length;

  const greenPct = totalCount ? Math.round((greenCount / totalCount) * 100) : 0;
  const yellowPct = totalCount ? Math.round((yellowCount / totalCount) * 100) : 0;
  const redPct = totalCount ? Math.round((redCount / totalCount) * 100) : 0;

  // Top performers and At-risk
  const validIndicators = allScoredIndicators.filter((i) => i.score !== null);
  const topPerformers = [...validIndicators]
    .sort((a, b) => (b.score || 0) - (a.score || 0))
    .slice(0, 4);
  const atRisk = [...validIndicators]
    .sort((a, b) => (a.score || 0) - (b.score || 0))
    .slice(0, 4);

  // Latest measurement data for active indicator
  const latestMeas = kpiTrendData[kpiTrendData.length - 1];
  const prevMeas = kpiTrendData.length > 1 ? kpiTrendData[kpiTrendData.length - 2] : null;
  const actualGrowth =
    latestMeas?.actual !== undefined &&
    prevMeas?.actual !== undefined &&
    prevMeas.actual !== 0
      ? Math.round(
          ((latestMeas.actual - prevMeas.actual) / Math.abs(prevMeas.actual)) * 100 * 10
        ) / 10
      : null;

  // Trajectory icon renderer
  const renderTrajectoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'widening':
        return <TrendingDown className="w-4 h-4 text-rose-600" />;
      case 'narrowing':
        return <TrendingUp className="w-4 h-4 text-emerald-600" />;
      case 'breakthrough':
        return <Sparkles className="w-4 h-4 text-teal-600" />;
      case 'slipping':
        return <AlertTriangle className="w-4 h-4 text-rose-600" />;
      case 'chronic':
        return <AlertCircle className="w-4 h-4 text-amber-600" />;
      case 'stable':
      default:
        return <CheckCircle2 className="w-4 h-4 text-teal-600" />;
    }
  };

  const handleCopyNarrative = (text: string) => {
    if (navigator?.clipboard?.writeText) {
      navigator.clipboard.writeText(text).then(() => {
        setCopiedGapReport(true);
        setTimeout(() => setCopiedGapReport(false), 2200);
      }).catch(() => {});
    }
  };

  // Custom Tooltips
  const CustomKpiTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const periodGap = gapAnalysis?.periods.find((p) => p.periodName === label);
      return (
        <div className="bg-slate-900 text-white text-xs p-3.5 rounded-xl shadow-xl border border-slate-700 space-y-2 font-sans min-w-[210px] text-right">
          <div className="flex items-center justify-between border-b border-slate-700 pb-1.5 text-slate-200">
            <span className="font-bold">دوره {label}</span>
            {periodGap && periodGap.severity !== 'nodata' && (
              <span
                className={`text-[10px] px-2 py-0.5 rounded font-medium ${
                  periodGap.isDeficit
                    ? 'bg-rose-900/60 text-rose-300 border border-rose-700'
                    : 'bg-emerald-900/60 text-emerald-300 border border-emerald-700'
                }`}
              >
                {periodGap.severityLabel}
              </span>
            )}
          </div>
          <div className="space-y-1">
            {payload.map((entry: any, index: number) => (
              <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
                <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                  <span
                    className="w-2 h-2 rounded-full inline-block"
                    style={{ backgroundColor: entry.color }}
                  />
                  {entry.name === 'actual'
                    ? 'عملکرد واقعی'
                    : entry.name === 'target'
                    ? 'هدف‌گذاری'
                    : entry.name}:
                </span>
                <span className="font-mono tabular-nums font-semibold">
                  {toFa(entry.value)} {entry.dataKey === 'score' ? '٪' : activeIndicator?.unit}
                </span>
              </div>
            ))}
          </div>
          {periodGap && periodGap.target !== null && periodGap.actual !== null && (
            <div className="pt-1.5 border-t border-slate-800 text-[10px] space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">گپ عملکردی (Gap):</span>
                <span
                  className={`font-mono font-bold ${
                    periodGap.isDeficit ? 'text-rose-400' : 'text-emerald-400'
                  }`}
                >
                  {periodGap.isDeficit ? '-' : '+'}
                  {toFa(Math.abs(periodGap.gapValue || 0))} {activeIndicator?.unit} ({toFa(Math.abs(periodGap.gapPct || 0))}٪)
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">نرخ تحقق هدف:</span>
                <span className="font-mono text-slate-200 font-semibold">
                  {toFa(periodGap.realizationPct)}٪
                </span>
              </div>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomRadarTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 font-sans min-w-[180px] text-right">
          <div className="font-bold border-b border-slate-700 pb-1 text-teal-300">
            {data.perspective}
          </div>
          <div className="flex items-center justify-between text-[11px]">
            <span className="text-teal-400">امتیاز عملکرد فعلی:</span>
            <span className="font-mono font-bold">{toFa(data.score)}</span>
          </div>
          {radarCompareMode === 'benchmark' ? (
            <div className="flex items-center justify-between text-[11px] text-indigo-300">
              <span>خط مبنای هدف (Benchmark):</span>
              <span className="font-mono">{toFa(data.benchmark)}</span>
            </div>
          ) : (
            <div className="flex items-center justify-between text-[11px] text-slate-300">
              <span>دوره قبل ({prevPeriod?.name}):</span>
              <span className="font-mono">{toFa(data.prevScore)}</span>
            </div>
          )}
        </div>
      );
    }
    return null;
  };

  const CustomBarSensitivityTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-slate-900 text-white text-xs p-3 rounded-xl shadow-xl border border-slate-700 space-y-1.5 font-sans min-w-[180px] text-right">
          <div className="font-bold border-b border-slate-700 pb-1 text-slate-200">
            منظر {label}
          </div>
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-3 text-[11px]">
              <span className="flex items-center gap-1.5" style={{ color: entry.color }}>
                <span
                  className="w-2 h-2 rounded-full inline-block"
                  style={{ backgroundColor: entry.color }}
                />
                {entry.name}:
              </span>
              <span className="font-mono tabular-nums font-semibold">
                {toFa(entry.value)}
              </span>
            </div>
          ))}
        </div>
      );
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <span>تحلیل هوشمند عملکرد و شبیه‌سازی</span>
            <span aria-hidden="true">·</span>
            <span>{currentOrg?.name}</span>
          </div>
          <h2 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <BarChart3 className="w-5 h-5 text-teal-700" />
            داشبورد تحلیلی، تحلیل حساسیت، نمودار راداری و هیت‌مپ
          </h2>
          <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
            مجموعه کامل ابزارهای پیشرفته تحلیل استراتژیک شامل شبیه‌سازی حساسیت وزن‌ها (Sensitivity
            Analysis)، توازن راداری ۴ منظر، تحلیل خطی روند و هیت‌مپ جامع شاخص‌ها.
          </p>
        </div>

        <div className="flex items-center gap-3 bg-slate-50 border border-slate-200 rounded-xl p-3 shrink-0">
          <div className="text-right">
            <span className="text-[11px] text-slate-500 block">امتیاز کل دوره فعلی:</span>
            <StatusBadge
              status={currentScorecard.status}
              score={currentScorecard.score}
              size="md"
            />
          </div>
        </div>
      </div>

      {/* CHARTS ROW: RADAR CHART (LEFT) & LINE TREND (RIGHT) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* 1. RADAR CHART (4 PERSPECTIVES STRATEGIC BALANCE) */}
        <div className="lg:col-span-12 xl:col-span-4 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <Compass className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900">
                    نمودار راداری توازن استراتژیک (Radar Chart)
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    عملکرد ۴ منظر کارت متوازن ({currentOrg?.name})
                  </p>
                </div>
              </div>

              {/* Compare toggle */}
              <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-[10px]">
                <button
                  onClick={() => setRadarCompareMode('benchmark')}
                  className={`px-2 py-1 rounded font-medium transition-colors ${
                    radarCompareMode === 'benchmark'
                      ? 'bg-white text-teal-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  با مبنای ۱۰۰
                </button>
                {prevPeriod && (
                  <button
                    onClick={() => setRadarCompareMode('prevPeriod')}
                    className={`px-2 py-1 rounded font-medium transition-colors ${
                      radarCompareMode === 'prevPeriod'
                        ? 'bg-white text-teal-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    با دوره قبل
                  </button>
                )}
              </div>
            </div>

            {/* Radar Chart Visual */}
            <div className="w-full h-64 pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart outerRadius="75%" data={radarData}>
                  <PolarGrid stroke="#e2e8f0" />
                  <PolarAngleAxis
                    dataKey="perspective"
                    tick={{ fill: '#334155', fontSize: 11, fontWeight: 500 }}
                  />
                  <PolarRadiusAxis
                    angle={90}
                    domain={[0, 120]}
                    stroke="#94a3b8"
                    tick={{ fontSize: 10 }}
                    tickFormatter={(val) => toFa(val, 0)}
                  />
                  <Tooltip content={<CustomRadarTooltip />} />
                  <Legend
                    wrapperStyle={{ paddingTop: '8px', fontSize: '11px' }}
                    formatter={(val) => {
                      if (val === 'score') return 'عملکرد محقق‌شده';
                      if (val === 'benchmark') return 'خط مبنای هدف (۱۰۰)';
                      if (val === 'prevScore') return `دوره گذشته (${prevPeriod?.name})`;
                      return val;
                    }}
                  />

                  {radarCompareMode === 'benchmark' ? (
                    <Radar
                      name="benchmark"
                      dataKey="benchmark"
                      stroke="#818cf8"
                      fill="#c7d2fe"
                      fillOpacity={0.25}
                      strokeDasharray="4 4"
                    />
                  ) : (
                    <Radar
                      name="prevScore"
                      dataKey="prevScore"
                      stroke="#94a3b8"
                      fill="#cbd5e1"
                      fillOpacity={0.25}
                      strokeDasharray="3 3"
                    />
                  )}

                  <Radar
                    name="score"
                    dataKey="score"
                    stroke="#0d9488"
                    fill="#0d9488"
                    fillOpacity={0.5}
                    strokeWidth={2}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Balance Analysis Commentary Box */}
          <div className={`p-3 rounded-xl border text-xs space-y-1 ${balanceAnalysis.color}`}>
            <div className="flex items-center justify-between font-bold">
              <span className="flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5" />
                <span>ارزیابی توازن استراتژیک: {balanceAnalysis.status}</span>
              </span>
              <span className="font-mono tabular-nums text-[11px]">
                اختلاف ماکزیمم و مینیمم: {toFa(balanceAnalysis.delta)} امتیاز
              </span>
            </div>
            <p className="text-[11px] leading-relaxed opacity-90">
              {balanceAnalysis.description}
            </p>
          </div>
        </div>

        {/* 2. RECHARTS LINE TREND & PERFORMANCE GAP ANALYSIS */}
        <div className="lg:col-span-12 xl:col-span-8 bg-white border border-slate-200 rounded-xl p-5 shadow-xs flex flex-col justify-between space-y-4">
          <div>
            {/* Header: Title, Subtitle, Mode Switcher, and View Switcher */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
                  <LineChartIcon className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
                    <span>تحلیل روند زمانی و شناسایی گپ‌های عملکردی</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full font-medium bg-teal-50 text-teal-700 border border-teal-200">
                      Performance Gap Diagnostic
                    </span>
                  </h3>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    مقایسه هدف و عملکرد واقعی در ادوار مختلف، تشخیص جهت‌گیری شکاف و گزارش تفسیری عارضه‌یابی
                  </p>
                </div>
              </div>

              {/* Mode Switcher */}
              <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
                {trendMode === 'kpi' && (
                  <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
                    <button
                      onClick={() => setGapViewLayout('combined')}
                      title="نمای ترکیبی نمودار روند و گزارش گپ‌های عملکردی"
                      className={`px-2.5 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all ${
                        gapViewLayout === 'combined'
                          ? 'bg-white text-teal-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <Split className="w-3 h-3" />
                      <span>ترکیبی (کنار هم)</span>
                    </button>
                    <button
                      onClick={() => setGapViewLayout('chartOnly')}
                      title="نمایش تمام‌عرض نمودار خطی روند"
                      className={`px-2.5 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all ${
                        gapViewLayout === 'chartOnly'
                          ? 'bg-white text-teal-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <LineChartIcon className="w-3 h-3" />
                      <span>فقط نمودار</span>
                    </button>
                    <button
                      onClick={() => setGapViewLayout('gapOnly')}
                      title="گزارش تفصیلی گپ‌های عملکردی و ماتریس مقایسه‌ای"
                      className={`px-2.5 py-1 rounded-md font-medium text-[11px] flex items-center gap-1 transition-all ${
                        gapViewLayout === 'gapOnly'
                          ? 'bg-white text-teal-900 shadow-xs font-semibold'
                          : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      <FileText className="w-3 h-3" />
                      <span>گزارش جامع گپ</span>
                    </button>
                  </div>
                )}

                <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
                  <button
                    onClick={() => setTrendMode('kpi')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      trendMode === 'kpi'
                        ? 'bg-white text-teal-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    شاخص منتخب
                  </button>
                  <button
                    onClick={() => setTrendMode('perspectives')}
                    className={`px-3 py-1 rounded-md font-medium transition-all ${
                      trendMode === 'perspectives'
                        ? 'bg-white text-teal-900 shadow-xs font-semibold'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    روند کل منظرها
                  </button>
                </div>
              </div>
            </div>

            {trendMode === 'kpi' ? (
              <>
                {/* Indicator Selection and Highlights Bar */}
                <div className="mt-3 flex flex-col md:flex-row md:items-center justify-between gap-3 bg-slate-50 p-2.5 rounded-xl border border-slate-200/80">
                  <div className="flex-1 min-w-[220px]">
                    <select
                      value={selectedIndId}
                      onChange={(e) => setSelectedIndId(Number(e.target.value))}
                      aria-label="انتخاب شاخص عملکردی"
                      className="w-full text-xs font-medium bg-white border border-slate-200 rounded-lg px-2.5 py-1.5 text-slate-800 focus:outline-none focus:ring-1 focus:ring-teal-600"
                    >
                      {allOrgIndicators.map((ind) => (
                        <option key={ind.id} value={ind.id}>
                          [{ind.perspectiveName}] {ind.title} ({ind.unit || 'بدون واحد'})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {/* Trajectory Badge */}
                    {gapAnalysis && (
                      <div
                        className={`flex items-center gap-1.5 px-2.5 py-1 rounded-lg border text-[11px] font-semibold ${gapAnalysis.trajectory.badgeColor}`}
                        title={gapAnalysis.trajectory.description}
                      >
                        {renderTrajectoryIcon(gapAnalysis.trajectory.iconName)}
                        <span>{gapAnalysis.trajectory.title}</span>
                      </div>
                    )}

                    {/* Latest Period Gap Badge */}
                    {gapAnalysis?.latestPeriod && (
                      <div
                        className={`flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-mono ${
                          gapAnalysis.latestPeriod.isDeficit
                            ? 'bg-rose-50 text-rose-800 border-rose-200 font-bold'
                            : 'bg-emerald-50 text-emerald-800 border-emerald-200 font-bold'
                        }`}
                      >
                        <span className="text-[10px] font-sans font-normal opacity-75">
                          {gapAnalysis.latestPeriod.isDeficit ? 'کسری دوره:' : 'مازاد دوره:'}
                        </span>
                        <span>
                          {gapAnalysis.latestPeriod.isDeficit ? '-' : '+'}
                          {toFa(Math.abs(gapAnalysis.latestPeriod.gapValue || 0))} {activeIndicator?.unit}
                        </span>
                        <span className="text-[10px] opacity-80">
                          ({toFa(Math.abs(gapAnalysis.latestPeriod.gapPct || 0))}٪)
                        </span>
                      </div>
                    )}

                    <div className="bg-white px-2.5 py-1 rounded border border-slate-200 text-[11px]">
                      <span className="text-slate-500">عملکرد واقعی: </span>
                      <span className="font-mono font-bold text-slate-900">
                        {toFa(latestMeas?.actual)} {activeIndicator?.unit}
                      </span>
                    </div>

                    <StatusBadge
                      status={latestMeas?.status || null}
                      score={latestMeas?.score}
                      size="sm"
                    />
                  </div>
                </div>

                {/* 1. COMBINED VIEW: RECHARTS LINE CHART ON ONE SIDE, PERFORMANCE GAP PANEL ON THE OTHER */}
                {gapViewLayout === 'combined' && (
                  <div className="grid grid-cols-1 2xl:grid-cols-12 gap-5 pt-3 items-start">
                    {/* Recharts Line Trend Chart Column */}
                    <div className="2xl:col-span-6 flex flex-col justify-between space-y-3">
                      <div>
                        <div className="flex items-center justify-between text-xs text-slate-600 mb-1 font-medium">
                          <span className="flex items-center gap-1.5">
                            <Activity className="w-3.5 h-3.5 text-teal-700" />
                            <span>نمودار روند مقایسه‌ای هدف در برابر عملکرد (Recharts)</span>
                          </span>
                          <span className="text-[11px] text-slate-400">
                            {toFa(db.periods.length)} دوره ارزیابی
                          </span>
                        </div>

                        <div className="w-full h-64 bg-slate-50/40 rounded-xl p-2 border border-slate-100">
                          <ResponsiveContainer width="100%" height="100%">
                            <LineChart
                              data={kpiTrendData}
                              margin={{ top: 12, right: 15, left: -5, bottom: 5 }}
                            >
                              <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                              <XAxis
                                dataKey="periodName"
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1' }}
                              />
                              <YAxis
                                stroke="#64748b"
                                fontSize={11}
                                tickLine={false}
                                axisLine={{ stroke: '#cbd5e1' }}
                                tickFormatter={(val) => toFa(val, 0)}
                              />
                              <Tooltip content={<CustomKpiTooltip />} />
                              <Legend
                                wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }}
                                formatter={(val) => {
                                  if (val === 'actual') return 'عملکرد محقق‌شده (Actual)';
                                  if (val === 'target') return 'هدف‌گذاری (Target)';
                                  return val;
                                }}
                              />

                              {activeIndicator?.method === 'achievement' && (
                                <Line
                                  type="monotone"
                                  dataKey="target"
                                  name="target"
                                  stroke="#6366f1"
                                  strokeDasharray="4 4"
                                  strokeWidth={2}
                                  dot={{ r: 4 }}
                                />
                              )}

                              <Line
                                type="monotone"
                                dataKey="actual"
                                name="actual"
                                stroke="#0d9488"
                                strokeWidth={2.5}
                                dot={{ r: 4.5, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                                activeDot={{ r: 6 }}
                              />

                              {activeIndicator?.method === 'threshold' && (
                                <>
                                  {activeIndicator.green_limit !== null && (
                                    <ReferenceLine
                                      y={activeIndicator.green_limit}
                                      stroke="#10b981"
                                      strokeDasharray="3 3"
                                    />
                                  )}
                                  {activeIndicator.yellow_limit !== null && (
                                    <ReferenceLine
                                      y={activeIndicator.yellow_limit}
                                      stroke="#f59e0b"
                                      strokeDasharray="3 3"
                                    />
                                  )}
                                </>
                              )}
                            </LineChart>
                          </ResponsiveContainer>
                        </div>
                      </div>

                      {/* Mini Metric Indicators under the chart */}
                      <div className="grid grid-cols-3 gap-2 pt-1">
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-right">
                          <span className="text-[10px] text-slate-500 block">میانگین تحقق هدف</span>
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {toFa(gapAnalysis?.avgRealization)}٪
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-right">
                          <span className="text-[10px] text-slate-500 block">ادوار کسری / کل</span>
                          <span className="text-xs font-bold font-mono text-slate-800">
                            {toFa(gapAnalysis?.deficitCount)} از {toFa(gapAnalysis?.validCount)}
                          </span>
                        </div>
                        <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-2 text-right">
                          <span className="text-[10px] text-slate-500 block">بیشترین کسری ثبت‌شده</span>
                          <span className="text-xs font-bold font-mono text-rose-700">
                            {gapAnalysis?.worstPeriod
                              ? `${toFa(gapAnalysis.worstPeriod.deficitAmount)} ${activeIndicator?.unit || ''}`
                              : 'فاقد کسری'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Performance Gap Visual & Textual Diagnostic Column */}
                    <div className="2xl:col-span-6 bg-slate-50/70 border border-slate-200/90 rounded-xl p-4 flex flex-col justify-between space-y-3.5">
                      {/* Diagnostic Panel Header */}
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
                        <div className="flex items-center gap-1.5">
                          <div className="w-6 h-6 rounded-md bg-teal-100/70 border border-teal-200 flex items-center justify-center text-teal-800">
                            <Diff className="w-3.5 h-3.5" />
                          </div>
                          <div>
                            <h4 className="text-xs font-bold text-slate-900">
                              گزارش تحلیلی گپ‌های عملکردی (Performance Gap Report)
                            </h4>
                            <span className="text-[10px] text-slate-500 block">
                              بررسی انحراف، روند ترمیم یا تعمیق و عارضه‌یابی
                            </span>
                          </div>
                        </div>

                        {/* Copy Report Action */}
                        <button
                          onClick={() => {
                            if (gapAnalysis) {
                              const text = `گزارش عارضه‌یابی گپ عملکردی شاخص «${activeIndicator?.title}»:\n` +
                                `وضعیت دوره جاری: ${gapAnalysis.narrative.statusSummary}\n` +
                                `دینامیک روند: ${gapAnalysis.narrative.trendNarrative}\n` +
                                `توصیه‌های اقدام اصلاحی:\n` +
                                gapAnalysis.narrative.strategicAdvice.map((a, i) => `${i + 1}. ${a}`).join('\n');
                              handleCopyNarrative(text);
                            }
                          }}
                          className="flex items-center gap-1 px-2 py-1 text-[10px] font-medium text-slate-600 hover:text-slate-900 bg-white border border-slate-200 hover:bg-slate-50 rounded-lg transition-colors shadow-2xs"
                          title="کپی متن گزارش تحلیلی برای گزارشات مدیریتی"
                        >
                          {copiedGapReport ? (
                            <>
                              <CheckCheck className="w-3 h-3 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3 h-3" />
                              <span>کپی گزارش</span>
                            </>
                          )}
                        </button>
                      </div>

                      {/* Visual Gap Comparison Bars across periods */}
                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-semibold text-slate-700">
                          <span>تحلیل بصری انحراف در ادوار مختلف</span>
                          <span className="text-[10px] font-normal text-slate-500">
                            مقایسه هدف (خط مرجع) با عملکرد واقعی
                          </span>
                        </div>

                        <div className="space-y-2 bg-white p-3 rounded-lg border border-slate-200/80 shadow-2xs">
                          {gapAnalysis?.periods.map((p) => {
                            if (p.target === null || p.actual === null) {
                              return (
                                <div
                                  key={p.periodId}
                                  className="flex items-center justify-between text-[11px] text-slate-400 py-1 border-b border-slate-100 last:border-0"
                                >
                                  <span>{p.periodName}</span>
                                  <span className="text-[10px]">داده ثبت نشده است</span>
                                </div>
                              );
                            }

                            const maxVal = Math.max(p.target || 0, p.actual || 0) * 1.15 || 100;
                            const targetPct = Math.min(100, Math.max(10, ((p.target || 0) / maxVal) * 100));
                            const actualPct = Math.min(100, Math.max(0, ((p.actual || 0) / maxVal) * 100));

                            return (
                              <div
                                key={p.periodId}
                                className="space-y-1 py-1 border-b border-slate-100 last:border-0"
                              >
                                <div className="flex items-center justify-between text-[11px]">
                                  <span className="font-medium text-slate-800">{p.periodName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-[10px] text-slate-500">
                                      هدف: <strong className="text-slate-700 font-mono">{toFa(p.target)}</strong>
                                    </span>
                                    <span className="text-[10px] text-slate-500">
                                      واقعی: <strong className="text-slate-900 font-mono">{toFa(p.actual)}</strong>
                                    </span>
                                    <span
                                      className={`text-[10px] font-mono font-bold px-1.5 py-0.5 rounded ${
                                        p.isDeficit
                                          ? 'bg-rose-100 text-rose-800'
                                          : 'bg-emerald-100 text-emerald-800'
                                      }`}
                                    >
                                      {p.isDeficit ? '-' : '+'}
                                      {toFa(Math.abs(p.gapValue || 0))} ({toFa(Math.abs(p.gapPct || 0))}٪)
                                    </span>
                                  </div>
                                </div>

                                {/* Dual progress visual track */}
                                <div className="relative h-2.5 bg-slate-100 rounded-full overflow-hidden">
                                  {/* Target line indicator */}
                                  <div
                                    className="absolute top-0 bottom-0 w-0.5 bg-indigo-500 z-10"
                                    style={{ right: `${targetPct}%` }}
                                    title={`هدف: ${toFa(p.target)}`}
                                  />
                                  {/* Actual fill */}
                                  <div
                                    className={`h-full rounded-full transition-all duration-300 ${
                                      p.severity === 'critical'
                                        ? 'bg-rose-500'
                                        : p.severity === 'warning'
                                        ? 'bg-amber-500'
                                        : p.severity === 'exceeded'
                                        ? 'bg-emerald-500'
                                        : 'bg-teal-500'
                                    }`}
                                    style={{ width: `${actualPct}%` }}
                                    title={`تحقق: ${toFa(p.realizationPct)}٪`}
                                  />
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>

                      {/* Automated Narrative Diagnostic Card */}
                      <div className="bg-white rounded-lg p-3 border border-slate-200/90 shadow-2xs space-y-2">
                        <div className="flex items-center justify-between text-[11px] font-bold text-slate-800">
                          <span className="flex items-center gap-1.5">
                            <FileText className="w-3.5 h-3.5 text-teal-700" />
                            <span>تفسیر هوشمند عملکرد و توصیه استراتژیک</span>
                          </span>
                          <span className="text-[10px] font-normal text-slate-400">تحلیل عارضه‌یابی</span>
                        </div>

                        <p className="text-[11px] text-slate-700 leading-relaxed bg-slate-50/70 p-2 rounded border border-slate-100">
                          {gapAnalysis?.narrative.statusSummary}
                        </p>

                        <p className="text-[11px] text-slate-600 leading-relaxed bg-slate-50/70 p-2 rounded border border-slate-100">
                          {gapAnalysis?.narrative.trendNarrative}
                        </p>

                        {/* Action items */}
                        {gapAnalysis?.narrative.strategicAdvice && gapAnalysis.narrative.strategicAdvice.length > 0 && (
                          <div className="pt-1 border-t border-slate-100">
                            <span className="text-[10px] font-bold text-slate-700 block mb-1">
                              اقدامات اصلاحی اولویت‌دار:
                            </span>
                            <ul className="space-y-1 text-[10px] text-slate-600">
                              {gapAnalysis.narrative.strategicAdvice.map((advice, idx) => (
                                <li key={idx} className="flex items-start gap-1.5">
                                  <span className="w-1.5 h-1.5 rounded-full bg-teal-600 mt-1 shrink-0" />
                                  <span>{advice}</span>
                                </li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 2. FULL-WIDTH DEDICATED GAP REPORT & MATRIX VIEW */}
                {gapViewLayout === 'gapOnly' && (
                  <div className="pt-3 space-y-4">
                    {/* 4 Metric cards */}
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                        <span className="text-[11px] text-slate-500 block">آخرین گپ عملکردی</span>
                        <div className="flex items-baseline gap-1 mt-1">
                          <span
                            className={`text-base font-bold font-mono ${
                              gapAnalysis?.latestPeriod?.isDeficit ? 'text-rose-700' : 'text-emerald-700'
                            }`}
                          >
                            {gapAnalysis?.latestPeriod?.isDeficit ? '-' : '+'}
                            {toFa(Math.abs(gapAnalysis?.latestPeriod?.gapValue || 0))} {activeIndicator?.unit}
                          </span>
                          <span className="text-[10px] text-slate-500 font-mono">
                            ({toFa(Math.abs(gapAnalysis?.latestPeriod?.gapPct || 0))}٪)
                          </span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                        <span className="text-[11px] text-slate-500 block">جهت‌گیری روند گپ</span>
                        <div className="flex items-center gap-1.5 mt-1 font-bold text-xs text-slate-800">
                          {renderTrajectoryIcon(gapAnalysis?.trajectory.iconName || 'stable')}
                          <span>{gapAnalysis?.trajectory.title}</span>
                        </div>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                        <span className="text-[11px] text-slate-500 block">میانگین تحقق چنددوره‌ای</span>
                        <span className="text-base font-bold font-mono text-slate-800 mt-1 block">
                          {toFa(gapAnalysis?.avgRealization)}٪
                        </span>
                      </div>

                      <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-right">
                        <span className="text-[11px] text-slate-500 block">تعداد دوره‌های کسری</span>
                        <span className="text-base font-bold font-mono text-slate-800 mt-1 block">
                          {toFa(gapAnalysis?.deficitCount)} از {toFa(gapAnalysis?.validCount)} دوره
                        </span>
                      </div>
                    </div>

                    {/* Detailed Gap Table Matrix */}
                    <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-2xs">
                      <div className="p-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
                        <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                          <Grid className="w-3.5 h-3.5 text-teal-700" />
                          <span>ماتریس مقایسه‌ای هدف، عملکرد و گپ‌های دوره‌ای</span>
                        </span>
                        <span className="text-[10px] text-slate-500">
                          جهت شاخص: {activeIndicator?.higher_is_better !== false ? 'هرچه بیشتر، بهتر' : 'هرچه کمتر، بهتر'}
                        </span>
                      </div>

                      <div className="overflow-x-auto">
                        <table className="w-full text-right text-xs">
                          <thead className="bg-slate-50/80 text-slate-600 border-b border-slate-200 text-[11px]">
                            <tr>
                              <th className="py-2.5 px-3 font-semibold">دوره ارزیابی</th>
                              <th className="py-2.5 px-3 font-semibold">هدف مصوب</th>
                              <th className="py-2.5 px-3 font-semibold">عملکرد واقعی</th>
                              <th className="py-2.5 px-3 font-semibold">انحراف عددی (Gap)</th>
                              <th className="py-2.5 px-3 font-semibold">درصد انحراف</th>
                              <th className="py-2.5 px-3 font-semibold">درصد تحقق</th>
                              <th className="py-2.5 px-3 font-semibold">وضعیت گپ</th>
                              <th className="py-2.5 px-3 font-semibold">نوار بصری تحقق</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-100 font-sans">
                            {gapAnalysis?.periods.map((p) => {
                              const maxVal = Math.max(p.target || 0, p.actual || 0) * 1.15 || 100;
                              const actualPct = Math.min(100, Math.max(0, ((p.actual || 0) / maxVal) * 100));
                              return (
                                <tr key={p.periodId} className="hover:bg-slate-50/60 transition-colors">
                                  <td className="py-2.5 px-3 font-medium text-slate-900">{p.periodName}</td>
                                  <td className="py-2.5 px-3 font-mono text-slate-700">
                                    {toFa(p.target)} {activeIndicator?.unit}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono font-bold text-slate-900">
                                    {toFa(p.actual)} {activeIndicator?.unit}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">
                                    {p.gapValue !== null ? (
                                      <span
                                        className={`font-bold ${
                                          p.isDeficit ? 'text-rose-700' : 'text-emerald-700'
                                        }`}
                                      >
                                        {p.isDeficit ? '-' : '+'}
                                        {toFa(Math.abs(p.gapValue))} {activeIndicator?.unit}
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono">
                                    {p.gapPct !== null ? (
                                      <span
                                        className={p.isDeficit ? 'text-rose-700 font-bold' : 'text-emerald-700 font-bold'}
                                      >
                                        {p.isDeficit ? '-' : '+'}
                                        {toFa(Math.abs(p.gapPct))}٪
                                      </span>
                                    ) : (
                                      '—'
                                    )}
                                  </td>
                                  <td className="py-2.5 px-3 font-mono text-slate-800">
                                    {toFa(p.realizationPct)}٪
                                  </td>
                                  <td className="py-2.5 px-3">
                                    <span
                                      className={`px-2 py-0.5 rounded text-[10px] font-medium border ${p.severityBadgeBg}`}
                                    >
                                      {p.severityLabel}
                                    </span>
                                  </td>
                                  <td className="py-2.5 px-3 min-w-[120px]">
                                    <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full ${
                                          p.severity === 'critical'
                                            ? 'bg-rose-500'
                                            : p.severity === 'warning'
                                            ? 'bg-amber-500'
                                            : p.severity === 'exceeded'
                                            ? 'bg-emerald-500'
                                            : 'bg-teal-500'
                                        }`}
                                        style={{ width: `${actualPct}%` }}
                                      />
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Full Executive Narrative Report */}
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-3">
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
                        <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                          <FileText className="w-4 h-4 text-teal-700" />
                          <span>گزارش تشخیصی و عارضه‌یابی تفصیلی گپ‌های عملکردی</span>
                        </span>
                        <button
                          onClick={() => {
                            if (gapAnalysis) {
                              const text = `گزارش جامع عارضه‌یابی گپ عملکردی شاخص «${activeIndicator?.title}»:\n` +
                                `خلاصه وضعیت جاری: ${gapAnalysis.narrative.statusSummary}\n` +
                                `تحلیل روند تاریخی: ${gapAnalysis.narrative.trendNarrative}\n` +
                                `توصیه‌های استراتژیک:\n` +
                                gapAnalysis.narrative.strategicAdvice.map((a, i) => `${i + 1}. ${a}`).join('\n');
                              handleCopyNarrative(text);
                            }
                          }}
                          className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-slate-700 bg-white border border-slate-200 hover:bg-slate-100 rounded-lg transition-colors"
                        >
                          {copiedGapReport ? (
                            <>
                              <CheckCheck className="w-3.5 h-3.5 text-emerald-600" />
                              <span className="text-emerald-700 font-semibold">کپی شد</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>کپی متن گزارش</span>
                            </>
                          )}
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-800 block text-[11px]">
                            وضعیت دوره جاری و انحراف:
                          </span>
                          <p className="text-slate-600 leading-relaxed text-[11px]">
                            {gapAnalysis?.narrative.statusSummary}
                          </p>
                        </div>
                        <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-1.5">
                          <span className="font-bold text-slate-800 block text-[11px]">
                            تحلیل دینامیک سری زمانی:
                          </span>
                          <p className="text-slate-600 leading-relaxed text-[11px]">
                            {gapAnalysis?.narrative.trendNarrative}
                          </p>
                        </div>
                      </div>

                      <div className="bg-white p-3 rounded-lg border border-slate-200 space-y-2 text-xs">
                        <span className="font-bold text-slate-800 block text-[11px]">
                          توصیه‌ها و مداخلات استراتژیک مدیریتی:
                        </span>
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                          {gapAnalysis?.narrative.strategicAdvice.map((advice, idx) => (
                            <div
                              key={idx}
                              className="bg-slate-50 p-2.5 rounded-lg border border-slate-200/80 text-[11px] text-slate-700 flex items-start gap-2"
                            >
                              <span className="w-4 h-4 rounded-full bg-teal-100 text-teal-800 font-bold text-[10px] flex items-center justify-center shrink-0 mt-0.5">
                                {toFa(idx + 1)}
                              </span>
                              <span className="leading-relaxed">{advice}</span>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. FULL CHART VIEW */}
                {gapViewLayout === 'chartOnly' && (
                  <div className="pt-2">
                    <div className="w-full h-80">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart
                          data={kpiTrendData}
                          margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                          <XAxis
                            dataKey="periodName"
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                          />
                          <YAxis
                            stroke="#64748b"
                            fontSize={11}
                            tickLine={false}
                            axisLine={{ stroke: '#cbd5e1' }}
                            tickFormatter={(val) => toFa(val, 0)}
                          />
                          <Tooltip content={<CustomKpiTooltip />} />
                          <Legend
                            wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }}
                            formatter={(val) => {
                              if (val === 'actual') return 'عملکرد محقق‌شده (Actual)';
                              if (val === 'target') return 'هدف‌گذاری (Target)';
                              return val;
                            }}
                          />

                          {activeIndicator?.method === 'achievement' && (
                            <Line
                              type="monotone"
                              dataKey="target"
                              name="target"
                              stroke="#6366f1"
                              strokeDasharray="4 4"
                              strokeWidth={2}
                              dot={{ r: 4 }}
                            />
                          )}

                          <Line
                            type="monotone"
                            dataKey="actual"
                            name="actual"
                            stroke="#0d9488"
                            strokeWidth={2.5}
                            dot={{ r: 4.5, fill: '#0d9488', stroke: '#fff', strokeWidth: 2 }}
                            activeDot={{ r: 6 }}
                          />

                          {activeIndicator?.method === 'threshold' && (
                            <>
                              {activeIndicator.green_limit !== null && (
                                <ReferenceLine
                                  y={activeIndicator.green_limit}
                                  stroke="#10b981"
                                  strokeDasharray="3 3"
                                />
                              )}
                              {activeIndicator.yellow_limit !== null && (
                                <ReferenceLine
                                  y={activeIndicator.yellow_limit}
                                  stroke="#f59e0b"
                                  strokeDasharray="3 3"
                                />
                              )}
                            </>
                          )}
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="w-full h-72 pt-3">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={perspectivesTrendData}
                    margin={{ top: 15, right: 20, left: 0, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" vertical={false} />
                    <XAxis
                      dataKey="periodName"
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                    />
                    <YAxis
                      domain={[0, 120]}
                      stroke="#64748b"
                      fontSize={11}
                      tickLine={false}
                      axisLine={{ stroke: '#cbd5e1' }}
                      tickFormatter={(val) => toFa(val, 0)}
                    />
                    <Tooltip />
                    <Legend
                      wrapperStyle={{ paddingTop: '5px', fontSize: '11px' }}
                      formatter={(val) => {
                        if (val === 'totalScore') return 'امتیاز کل';
                        if (val === 'p_1') return 'مالی';
                        if (val === 'p_2') return 'مشتری';
                        if (val === 'p_3') return 'فرایندها';
                        if (val === 'p_4') return 'رشد و یادگیری';
                        return val;
                      }}
                    />
                    <Line type="monotone" dataKey="p_1" name="p_1" stroke="#059669" strokeWidth={2} dot={{ r: 3.5 }} />
                    <Line type="monotone" dataKey="p_2" name="p_2" stroke="#2563eb" strokeWidth={2} dot={{ r: 3.5 }} />
                    <Line type="monotone" dataKey="p_3" name="p_3" stroke="#d97706" strokeWidth={2} dot={{ r: 3.5 }} />
                    <Line type="monotone" dataKey="p_4" name="p_4" stroke="#7c3aed" strokeWidth={2} dot={{ r: 3.5 }} />
                    <Line type="monotone" dataKey="totalScore" name="totalScore" stroke="#0f172a" strokeWidth={2.5} dot={{ r: 4 }} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 3. SENSITIVITY ANALYSIS TOOL (تحلیل حساسیت و شبیه‌سازی وزن اهداف و شاخص‌ها) */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-5">
        {/* Section Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 border border-indigo-200 flex items-center justify-center text-indigo-700">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-sm font-bold text-slate-900">
                  ابزار تحلیل حساسیت و شبیه‌سازی اوزان (Sensitivity Analysis & What-If)
                </h3>
                {isSimulationModified && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-100 text-amber-800 animate-pulse">
                    حالت شبیه‌سازی فعال
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-500 mt-0.5">
                تغییر زنده وزن هر هدف یا شاخص و مشاهده تأثیر آنی عددی و بصری بر امتیاز نهایی منظر
              </p>
            </div>
          </div>

          {/* Action buttons: Reset & Apply */}
          <div className="flex items-center gap-2 self-start sm:self-auto">
            {isSimulationModified && (
              <button
                onClick={handleResetWeights}
                className="flex items-center gap-1 px-2.5 py-1.5 text-xs text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 rounded-lg transition-colors"
                title="بازنشانی اوزان به مقادیر اولیه پایگاه داده"
              >
                <RotateCcw className="w-3.5 h-3.5" />
                <span>بازنشانی اوزان</span>
              </button>
            )}

            {onApplyWeights && isSimulationModified && (
              <button
                onClick={handleCommitWeights}
                disabled={isSavedConfirmation}
                className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-teal-700 hover:bg-teal-800 rounded-lg transition-colors shadow-sm"
              >
                {isSavedConfirmation ? (
                  <>
                    <CheckCheck className="w-3.5 h-3.5" />
                    <span>اوزان ذخیره شدند</span>
                  </>
                ) : (
                  <>
                    <Check className="w-3.5 h-3.5" />
                    <span>اعمال و ذخیره اوزان</span>
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Perspective Selector Pills */}
        <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50 p-3 rounded-xl border border-slate-200/80">
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-bold text-slate-700 ml-1">
              انتخاب منظر مورد آزمایش:
            </span>
            <div className="flex flex-wrap gap-1">
              {db.perspectives.map((p) => {
                const isSelected = selectedSensPerspId === p.id;
                const pSim = sensitivitySimulation.perspectivesComparison.find(
                  (x) => x.id === p.id
                );
                return (
                  <button
                    key={p.id}
                    onClick={() => setSelectedSensPerspId(p.id)}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs rounded-lg transition-all ${
                      isSelected
                        ? 'bg-indigo-700 text-white font-bold shadow-xs'
                        : 'bg-white text-slate-700 hover:bg-slate-200/70 border border-slate-200'
                    }`}
                  >
                    <span>منظر {p.name}</span>
                    <span
                      className={`font-mono tabular-nums text-[11px] px-1.5 py-0.2 rounded ${
                        isSelected ? 'bg-indigo-800 text-white' : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      {toFa(pSim?.simScore)}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Perspective Impact Callout */}
          <div className="flex items-center gap-4 bg-white px-3.5 py-2 rounded-lg border border-slate-200 text-xs shadow-xs">
            <div>
              <span className="text-[10px] text-slate-500 block">
                امتیاز مبنای منظر:
              </span>
              <span className="font-mono font-bold text-slate-700">
                {toFa(sensitivitySimulation.activePerspSim?.baseScore)}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <span className="text-[10px] text-indigo-700 font-semibold block">
                امتیاز شبیه‌سازی:
              </span>
              <span className="font-mono font-bold text-indigo-900 text-sm">
                {toFa(sensitivitySimulation.activePerspSim?.simScore)}
              </span>
            </div>

            <div className="h-6 w-px bg-slate-200" />

            <div>
              <span className="text-[10px] text-slate-500 block">تأثیر (Delta):</span>
              <span
                className={`font-mono font-bold flex items-center gap-0.5 text-xs ${
                  sensitivitySimulation.activePerspSim?.delta > 0
                    ? 'text-emerald-700'
                    : sensitivitySimulation.activePerspSim?.delta < 0
                    ? 'text-rose-700'
                    : 'text-slate-600'
                }`}
              >
                {sensitivitySimulation.activePerspSim?.delta > 0 ? (
                  <ArrowUpRight className="w-3.5 h-3.5" />
                ) : sensitivitySimulation.activePerspSim?.delta < 0 ? (
                  <ArrowDownRight className="w-3.5 h-3.5" />
                ) : null}
                {sensitivitySimulation.activePerspSim?.delta > 0 ? '+' : ''}
                {toFa(sensitivitySimulation.activePerspSim?.delta)} امتیاز
              </span>
            </div>
          </div>
        </div>

        {/* Visual Bar Chart: Baseline vs Simulated Scores across all 4 Perspectives */}
        <div className="bg-slate-50/60 p-4 rounded-xl border border-slate-200/70">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-indigo-600" />
              مقایسه بصری امتیاز مبنا و شبیه‌سازی شده در تمام منظرهای کارت متوازن
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              تأثیر بر امتیاز کل کارت متوازن: {sensitivitySimulation.totalDelta > 0 ? '+' : ''}
              {toFa(sensitivitySimulation.totalDelta)} امتیاز
            </span>
          </div>

          <div className="w-full h-48">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={sensitivitySimulation.perspectivesComparison}
                margin={{ top: 10, right: 20, left: 0, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis
                  dataKey="name"
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                />
                <YAxis
                  domain={[0, 120]}
                  stroke="#64748b"
                  fontSize={11}
                  tickLine={false}
                  axisLine={{ stroke: '#cbd5e1' }}
                  tickFormatter={(val) => toFa(val, 0)}
                />
                <Tooltip content={<CustomBarSensitivityTooltip />} />
                <Legend
                  wrapperStyle={{ fontSize: '11px', paddingTop: '4px' }}
                  formatter={(val) => {
                    if (val === 'baseScore') return 'امتیاز مبنا (Baseline Score)';
                    if (val === 'simScore') return 'امتیاز شبیه‌سازی‌شده (Simulated Score)';
                    return val;
                  }}
                />
                <Bar
                  dataKey="baseScore"
                  name="baseScore"
                  fill="#94a3b8"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
                <Bar
                  dataKey="simScore"
                  name="simScore"
                  fill="#4f46e5"
                  radius={[4, 4, 0, 0]}
                  barSize={20}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Objectives & Indicators Sensitivity Sliders for Active Perspective */}
        <div className="space-y-4 pt-1">
          <div className="text-xs font-bold text-slate-900 flex items-center justify-between">
            <span>
              اهداف و شاخص‌های منظر «{sensitivitySimulation.activePerspSim?.name}» جهت تنظیم اوزان:
            </span>
            <span className="text-[11px] text-slate-500 font-normal">
              اسلایدرها را جابجا کنید تا تغییرات را به صورت آنی در بالا مشاهده فرمایید
            </span>
          </div>

          {sensitivitySimulation.activePerspSim?.objectives.length === 0 ? (
            <div className="py-6 text-center text-slate-400 text-xs bg-slate-50 rounded-xl">
              هدفی در این منظر برای این سازمان ثبت نشده است.
            </div>
          ) : (
            <div className="space-y-4">
              {sensitivitySimulation.activePerspSim?.objectives.map((obj) => {
                const currentObjWeight = simObjWeights[obj.id] ?? obj.weight;
                return (
                  <div
                    key={obj.id}
                    className="border border-slate-200 rounded-xl p-4 bg-white shadow-2xs space-y-3"
                  >
                    {/* Objective Weight Row */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
                      <div>
                        <div className="flex items-center gap-2">
                          <Target className="w-4 h-4 text-indigo-700 shrink-0" />
                          <h4 className="font-bold text-slate-900 text-xs sm:text-sm">
                            {obj.title}
                          </h4>
                        </div>
                        <div className="text-[11px] text-slate-500 mt-0.5">
                          امتیاز هدف: مبنا{' '}
                          <span className="font-mono font-semibold text-slate-700">
                            {toFa(obj.baseScore)}
                          </span>{' '}
                          ← شبیه‌سازی{' '}
                          <span className="font-mono font-semibold text-indigo-800">
                            {toFa(obj.simScore)}
                          </span>
                        </div>
                      </div>

                      {/* Objective Weight Slider */}
                      <div className="flex items-center gap-2.5 bg-slate-50 px-3 py-1.5 rounded-lg border border-slate-200">
                        <span className="text-[11px] font-semibold text-slate-700 whitespace-nowrap">
                          وزن هدف:
                        </span>
                        <input
                          type="range"
                          min="0.1"
                          max="5.0"
                          step="0.1"
                          value={currentObjWeight}
                          onChange={(e) =>
                            setSimObjWeights((prev) => ({
                              ...prev,
                              [obj.id]: parseFloat(e.target.value),
                            }))
                          }
                          className="w-24 sm:w-32 accent-indigo-600 cursor-pointer"
                        />
                        <span className="font-mono font-bold tabular-nums text-xs text-indigo-900 w-10 text-center">
                          {toFa(currentObjWeight)}
                        </span>
                      </div>
                    </div>

                    {/* Indicators Weights under this Objective */}
                    <div className="space-y-2 pr-2 sm:pr-4">
                      <div className="text-[11px] font-semibold text-slate-600">
                        شاخص‌های متناظر (KPIs) و وزن‌دهی حساسیت:
                      </div>

                      {obj.indicators.map((ind) => {
                        const currentIndWeight = simIndWeights[ind.id] ?? ind.weight;
                        const isHighPerformer = ind.score !== null && ind.score >= 90;
                        const isUnderPerformer = ind.score !== null && ind.score < 70;

                        return (
                          <div
                            key={ind.id}
                            className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-2.5 rounded-lg bg-slate-50/70 border border-slate-200/60 hover:bg-slate-50 text-xs"
                          >
                            <div className="flex items-center gap-2 min-w-0">
                              <span className="truncate font-medium text-slate-800">
                                {ind.title}
                              </span>
                              <span className="text-[10px] text-slate-500 font-mono">
                                ({ind.unit || 'بدون واحد'})
                              </span>

                              {/* Sensitivity leverage pill */}
                              {isHighPerformer && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-emerald-100 text-emerald-800 font-medium">
                                  اهرم رشد مثبت
                                </span>
                              )}
                              {isUnderPerformer && (
                                <span className="px-1.5 py-0.2 rounded text-[10px] bg-rose-100 text-rose-800 font-medium">
                                  گلوگاه / ریسک
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0 self-end sm:self-auto">
                              <div className="flex items-center gap-1.5">
                                <span className="text-[10px] text-slate-500">امتیاز:</span>
                                <span className="font-mono font-bold tabular-nums text-slate-900">
                                  {toFa(ind.score)}
                                </span>
                              </div>

                              <div className="flex items-center gap-2 bg-white px-2 py-1 rounded border border-slate-200">
                                <span className="text-[10px] text-slate-500">وزن:</span>
                                <input
                                  type="range"
                                  min="0.1"
                                  max="5.0"
                                  step="0.1"
                                  value={currentIndWeight}
                                  onChange={(e) =>
                                    setSimIndWeights((prev) => ({
                                      ...prev,
                                      [ind.id]: parseFloat(e.target.value),
                                    }))
                                  }
                                  className="w-20 sm:w-28 accent-indigo-600 cursor-pointer"
                                />
                                <span className="font-mono font-bold tabular-nums text-xs text-indigo-900 w-8 text-center">
                                  {toFa(currentIndWeight)}
                                </span>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ----------------------------------------------------------------- */}
      {/* 4. KPI PERFORMANCE HEATMAP (هیت‌مپ ماتریسی عملکرد شاخص‌ها) */}
      {/* ----------------------------------------------------------------- */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-slate-100">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-teal-50 border border-teal-200 flex items-center justify-center text-teal-700">
              <Grid className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                هیت‌مپ عملکردی شاخص‌ها (KPI Performance Heatmap)
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                ماتریس مقایسه‌ای وضعیت تحقق کلیه شاخص‌ها در تمام ادوار فصلی با گرادیان حرارتی
              </p>
            </div>
          </div>

          {/* Perspective Filter Tabs & Search */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="جستجوی شاخص..."
                value={heatmapSearch}
                onChange={(e) => setHeatmapSearch(e.target.value)}
                className="text-xs pr-8 pl-3 py-1.5 rounded-lg border border-slate-200 bg-slate-50 focus:bg-white w-40 sm:w-48 focus:outline-none focus:ring-1 focus:ring-teal-600"
              />
            </div>

            <div className="flex items-center gap-1 p-0.5 bg-slate-100 rounded-lg text-xs">
              <button
                onClick={() => setHeatmapPerspectiveFilter('all')}
                className={`px-2.5 py-1 rounded-md font-medium transition-colors ${
                  heatmapPerspectiveFilter === 'all'
                    ? 'bg-white text-teal-900 shadow-xs font-semibold'
                    : 'text-slate-600 hover:text-slate-900'
                }`}
              >
                همه منظرها
              </button>
              {db.perspectives.map((p) => (
                <button
                  key={p.id}
                  onClick={() => setHeatmapPerspectiveFilter(p.id)}
                  className={`px-2 py-1 rounded-md font-medium transition-colors ${
                    heatmapPerspectiveFilter === p.id
                      ? 'bg-white text-teal-900 shadow-xs font-semibold'
                      : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Heatmap Matrix Table */}
        <div className="overflow-x-auto border border-slate-200/80 rounded-xl">
          <table className="w-full text-right text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-700 text-[11px]">
                <th className="py-3 px-4 font-semibold text-right">عنوان شاخص کلیدی عملکرد</th>
                <th className="py-3 px-3 font-semibold text-right">منظر و هدف استراتژیک</th>
                <th className="py-3 px-3 font-semibold text-center w-20">واحد</th>
                {db.periods.map((p) => (
                  <th
                    key={p.id}
                    className={`py-3 px-3 font-semibold text-center w-28 ${
                      p.id === selectedPeriodId ? 'bg-teal-50/70 text-teal-900 font-bold' : ''
                    }`}
                  >
                    دوره {p.name}
                    {p.id === selectedPeriodId && (
                      <span className="block text-[9px] text-teal-600 font-normal">
                        (دوره فعلی)
                      </span>
                    )}
                  </th>
                ))}
                <th className="py-3 px-3 font-semibold text-center w-20">روند</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {heatmapRows.length === 0 ? (
                <tr>
                  <td
                    colSpan={4 + db.periods.length}
                    className="py-8 text-center text-slate-400 text-xs"
                  >
                    شاخصی مطابق با فیلتر انتخابی یافت نشد.
                  </td>
                </tr>
              ) : (
                heatmapRows.map(({ indicator, periodsData, trendIcon }) => (
                  <tr key={indicator.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-2.5 px-4 font-semibold text-slate-900">
                      {indicator.title}
                    </td>

                    <td className="py-2.5 px-3 text-slate-600 text-[11px] max-w-[220px] truncate">
                      <span className="font-medium text-teal-800">
                        [{indicator.perspectiveName}]
                      </span>{' '}
                      <span title={indicator.objectiveTitle}>{indicator.objectiveTitle}</span>
                    </td>

                    <td className="py-2.5 px-3 text-center text-slate-500 font-mono text-[11px]">
                      {indicator.unit || '—'}
                    </td>

                    {periodsData.map((cell) => {
                      const colorClass = getHeatmapColor(cell.score);
                      const isCurrentPeriod = cell.periodId === selectedPeriodId;

                      return (
                        <td
                          key={cell.periodId}
                          className={`py-2 px-2 text-center ${
                            isCurrentPeriod ? 'bg-teal-50/30' : ''
                          }`}
                        >
                          <div
                            className={`py-1.5 px-2 rounded-lg text-xs font-mono tabular-nums transition-transform hover:scale-105 cursor-default ${colorClass}`}
                            title={`دوره ${cell.periodName} | واقعی: ${toFa(cell.actual)} ${indicator.unit} | هدف: ${toFa(cell.target)} ${indicator.unit} | امتیاز: ${toFa(cell.score)}`}
                          >
                            <span className="block leading-none">
                              {toFa(cell.score)}
                            </span>
                            {cell.actual !== null && cell.actual !== undefined && (
                              <span className="block text-[9px] opacity-80 mt-0.5 leading-none">
                                {toFa(cell.actual)}
                              </span>
                            )}
                          </div>
                        </td>
                      );
                    })}

                    <td className="py-2.5 px-3 text-center">
                      {trendIcon === 'up' && (
                        <span
                          className="inline-flex items-center text-emerald-600"
                          title="روند صعودی نسبت به دوره گذشته"
                        >
                          <ArrowUpRight className="w-4 h-4" />
                        </span>
                      )}
                      {trendIcon === 'down' && (
                        <span
                          className="inline-flex items-center text-rose-600"
                          title="روند نزولی نسبت به دوره گذشته"
                        >
                          <ArrowDownRight className="w-4 h-4" />
                        </span>
                      )}
                      {trendIcon === 'flat' && (
                        <span
                          className="inline-flex items-center text-slate-400 font-mono"
                          title="بدون تغییر"
                        >
                          —
                        </span>
                      )}
                      {trendIcon === null && (
                        <span className="text-slate-300 font-mono text-xs">—</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Heatmap Color Scale Legend */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-2 text-xs text-slate-600 border-t border-slate-100">
          <div className="flex items-center gap-2">
            <span className="font-semibold text-slate-700 text-[11px]">
              راهنمای طیف رنگی هیت‌مپ:
            </span>
            <div className="flex items-center gap-1.5 text-[11px]">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-600 text-white font-mono">
                ≥ ۹۵ ممتاز
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-500 text-white font-mono">
                ۹۰-۹۴ مطلوب
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-emerald-100 text-emerald-900 border border-emerald-300 font-mono">
                ۸۰-۸۹ قابل‌قبول
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-amber-100 text-amber-900 border border-amber-300 font-mono">
                ۷۰-۷۹ هشدار
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-100 text-rose-900 border border-rose-300 font-mono">
                ۵۰-۶۹ ریسک
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-rose-600 text-white font-mono">
                &lt; ۵۰ بحرانی
              </span>
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-slate-100 text-slate-400 border border-slate-200">
                فاقد داده
              </span>
            </div>
          </div>

          <span className="text-[11px] text-slate-400">
            با نگه داشتن ماوس روی هر خانه، جزئیات مقدار واقعی و هدف نمایش داده می‌شود.
          </span>
        </div>
      </div>

      {/* 5. KPI HEALTH STATUS DISTRIBUTION & METRICS */}
      <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-teal-700" />
            توزیع سلامت شاخص‌های عملکردی کلیدی (KPI Distribution)
          </h3>
          <span className="text-xs text-slate-500">
            مجموع شاخص‌ها: {toFa(totalCount)} شاخص
          </span>
        </div>

        {/* Progress Bar */}
        <div className="w-full h-3 rounded-full bg-slate-100 flex overflow-hidden">
          <div
            style={{ width: `${greenPct}%` }}
            className="bg-emerald-500 transition-all"
            title={`سبز: ${toFa(greenCount)} شاخص (${toFa(greenPct)}%)`}
          />
          <div
            style={{ width: `${yellowPct}%` }}
            className="bg-amber-400 transition-all"
            title={`زرد: ${toFa(yellowCount)} شاخص (${toFa(yellowPct)}%)`}
          />
          <div
            style={{ width: `${redPct}%` }}
            className="bg-rose-500 transition-all"
            title={`قرمز: ${toFa(redCount)} شاخص (${toFa(redPct)}%)`}
          />
        </div>

        {/* Legend stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2">
          <div className="bg-emerald-50/60 border border-emerald-100 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-emerald-800">
              <span className="flex items-center gap-1 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                مطلوب (سبز)
              </span>
              <span className="font-mono tabular-nums font-bold">
                {toFa(greenPct)}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-emerald-950 mt-1">
              {toFa(greenCount)}{' '}
              <span className="text-xs font-normal text-emerald-700">شاخص</span>
            </div>
          </div>

          <div className="bg-amber-50/60 border border-amber-100 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-amber-800">
              <span className="flex items-center gap-1 font-semibold">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-600" />
                هشدار (زرد)
              </span>
              <span className="font-mono tabular-nums font-bold">
                {toFa(yellowPct)}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-amber-950 mt-1">
              {toFa(yellowCount)}{' '}
              <span className="text-xs font-normal text-amber-700">شاخص</span>
            </div>
          </div>

          <div className="bg-rose-50/60 border border-rose-100 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-rose-800">
              <span className="flex items-center gap-1 font-semibold">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                بحرانی (قرمز)
              </span>
              <span className="font-mono tabular-nums font-bold">
                {toFa(redPct)}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-rose-950 mt-1">
              {toFa(redCount)}{' '}
              <span className="text-xs font-normal text-rose-700">شاخص</span>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200/80 rounded-lg p-3">
            <div className="flex items-center justify-between text-xs text-slate-600">
              <span className="flex items-center gap-1 font-semibold">
                <HelpCircle className="w-3.5 h-3.5 text-slate-400" />
                فاقد داده ثبت‌شده
              </span>
              <span className="font-mono tabular-nums font-bold">
                {toFa(totalCount ? Math.round((noDataCount / totalCount) * 100) : 0)}%
              </span>
            </div>
            <div className="text-lg font-bold font-mono tabular-nums text-slate-800 mt-1">
              {toFa(noDataCount)}{' '}
              <span className="text-xs font-normal text-slate-500">شاخص</span>
            </div>
          </div>
        </div>
      </div>

      {/* 6. TOP PERFORMERS & AT RISK SECTION */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Top Performers */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              برترین شاخص‌های عملکردی (Top Performers)
            </h4>
            <span className="text-[11px] text-slate-500">بالاترین درصد تحقق</span>
          </div>

          <div className="space-y-2">
            {topPerformers.map((ind) => (
              <div
                key={ind.id}
                className="p-2.5 rounded-lg border border-slate-100 bg-slate-50/50 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">{ind.title}</div>
                  <div className="text-[11px] text-slate-500">
                    واقعی: {toFa(ind.actual)} {ind.unit} · وزن: {toFa(ind.weight)}
                  </div>
                </div>
                <StatusBadge status={ind.status} score={ind.score} size="sm" />
              </div>
            ))}
          </div>
        </div>

        {/* At Risk */}
        <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4 text-rose-600" />
              شاخص‌های نیازمند توجه و بهبود (At Risk)
            </h4>
            <span className="text-[11px] text-slate-500">پایین‌ترین امتیاز</span>
          </div>

          <div className="space-y-2">
            {atRisk.map((ind) => (
              <div
                key={ind.id}
                className="p-2.5 rounded-lg border border-rose-100 bg-rose-50/30 flex items-center justify-between text-xs"
              >
                <div>
                  <div className="font-semibold text-slate-800">{ind.title}</div>
                  <div className="text-[11px] text-slate-500">
                    هدف: {toFa(ind.target)} · واقعی: {toFa(ind.actual)} {ind.unit}
                  </div>
                </div>
                <StatusBadge status={ind.status} score={ind.score} size="sm" />
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
