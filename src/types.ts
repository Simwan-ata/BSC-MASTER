export type MethodType = 'achievement' | 'threshold';
export type StatusType = 'green' | 'yellow' | 'red' | null;

export interface OrgUnit {
  id: number;
  name: string;
  parent_id: number | null;
  code?: string;
  type?: 'holding' | 'subsidiary' | 'department';
}

export interface Perspective {
  id: number;
  name: string;
  order: number;
  /** Optional strategic importance weight; omitted means equal weighting (1). */
  weight?: number;
  description?: string;
  color?: string;
}

export interface Period {
  id: number;
  name: string;
  is_active?: boolean;
}

export interface Objective {
  id: number;
  org_id: number;
  perspective_id: number;
  title: string;
  weight: number;
  description?: string;
}

export interface Indicator {
  id: number;
  objective_id: number;
  title: string;
  unit: string;
  weight: number;
  higher_is_better: boolean;
  method: MethodType;
  cap: number;
  yellow_limit: number | null;
  green_limit: number | null;
  description?: string;
}

export interface Measurement {
  id: number;
  indicator_id: number;
  period_id: number;
  target: number | null;
  actual: number | null;
}

export interface Cascade {
  id: number;
  child_id: number;
  parent_id: number;
  weight: number;
}

export interface Cause {
  id: number;
  from_id: number;
  to_id: number;
}

export type InitiativeStatus = 'on_track' | 'behind' | 'at_risk' | 'completed';

export interface InitiativeMilestone {
  id: number;
  title: string;
  due_date: string;
  completed: boolean;
}

export interface EvmPeriodSnapshot {
  /** Reporting period in sortable YYYY-MM format (Gregorian or local calendar as used by the organization). */
  period_key: string;
  planned_progress: number; // 0-100; used to calculate PV from BAC
  actual_progress: number; // 0-100; used to calculate EV from BAC
  actual_cost: number; // actual cost for this period, cumulative to period end, in billion Rials
  recorded_at?: string;
}

export interface StrategicInitiative {
  id: number;
  objective_id: number;
  title: string;
  owner: string;
  start_date?: string;
  due_date: string;
  budget?: string;
  budget_allocated?: number; // میلیارد ریال
  budget_spent?: number; // میلیارد ریال
  progress: number; // 0 - 100 actual progress
  planned_progress?: number; // 0 - 100 planned progress
  evm_periods?: EvmPeriodSnapshot[]; // time-phased, cumulative EVM observations
  status: InitiativeStatus;
  priority?: 'critical' | 'high' | 'medium';
  milestones?: InitiativeMilestone[];
  description?: string;
}

export interface FocusArea {
  id: number;
  org_id: number;
  title: string;
  color: string;
  description?: string;
}

export interface OrgVision {
  org_id: number;
  vision: string;
  mission: string;
  core_values: string[];
}

export type SwotType = 'strength' | 'weakness' | 'opportunity' | 'threat';
export interface SwotItem {
  id: number;
  org_id: number;
  type: SwotType;
  title: string;
  description?: string;
  importance: 'high' | 'medium' | 'low';
  score?: number; // 1 - 10
  linked_objective_id?: number;
}

export interface SwotStrategy {
  id: number;
  org_id: number;
  type: 'SO' | 'WO' | 'ST' | 'WT';
  title: string;
  description: string;
  related_swot_ids: number[];
  linked_objective_id?: number;
}

export type BcgQuadrant = 'star' | 'cash_cow' | 'question_mark' | 'dog';
export interface BcgItem {
  id: number;
  org_id: number;
  name: string; // Business unit, product line or subsidiary
  market_growth_rate: number; // e.g. 15% (Y-axis)
  relative_market_share: number; // e.g. 1.8x (X-axis)
  revenue: number; // for bubble size (in billion Rials or currency units)
  revenue_currency: string;
  profit_margin?: number;
  quadrant: BcgQuadrant;
  recommendation: string;
}

export type TrendCategory = 'technology' | 'economy' | 'geopolitics' | 'environment' | 'society';
export type HorizonType = 'H1' | 'H2' | 'H3';

export interface MegaTrend {
  id: number;
  category: TrendCategory;
  title: string;
  impact_level: 'critical' | 'high' | 'medium';
  timeframe: string;
  description: string;
  implications: string;
}

export interface WeakSignal {
  id: number;
  title: string;
  source: string;
  maturity: 'emerging' | 'accelerating' | 'maturing';
  potential_disruption: string;
  action_needed: string;
}

export interface WildCard {
  id: number;
  title: string;
  probability: 'very_low' | 'low';
  impact: 'catastrophic' | 'transformational';
  description: string;
  preparedness: string;
}

export interface HorizonInitiative {
  id: number;
  horizon: HorizonType;
  title: string;
  description: string;
  budget_share: number; // percentage
  timeline: string;
}

export interface CriticalUncertainty {
  axis: 'X' | 'Y';
  title: string;
  negative_pole: string;
  positive_pole: string;
}

export interface StrategicScenario {
  id: number;
  code: 'S1' | 'S2' | 'S3' | 'S4';
  title: string;
  quadrant_label: string;
  narrative: string;
  probability: number;
  impact_severity: 'very_high' | 'high' | 'medium';
  early_warnings: string[];
  strategic_posture: string;
  contingency_actions: string[];
}

export type RiskCategory = 'strategic' | 'financial' | 'operational' | 'compliance' | 'technology';
export type RiskResponse = 'mitigate' | 'avoid' | 'transfer' | 'accept';

export interface RiskItem {
  id: number;
  org_id: number;
  code: string;
  title: string;
  category: RiskCategory;
  probability: number; // 1 to 5
  impact: number; // 1 to 5
  score: number; // probability * impact (1 to 25)
  owner: string;
  status: 'active' | 'mitigated' | 'monitored' | 'closed';
  response_strategy: RiskResponse;
  mitigation_plan: string;
  kri_title?: string;
  kri_value?: string;
  linked_objective_id?: number;
}

export type PestelDimension =
  | 'political'
  | 'economic'
  | 'social'
  | 'technological'
  | 'environmental'
  | 'legal';

export type PestelImpactType = 'opportunity' | 'threat' | 'neutral';
export type PestelTimeHorizon = 'short' | 'medium' | 'long';
export type PestelTrend = 'increasing' | 'stable' | 'decreasing';

export interface PestelItem {
  id: number;
  org_id: number;
  dimension: PestelDimension;
  title: string;
  description: string;
  impactType: PestelImpactType;
  impactScore: number; // 1 to 10
  probabilityScore: number; // 1 to 10
  timeHorizon: PestelTimeHorizon;
  trend: PestelTrend;
  strategicImplication: string;
  linkedObjectiveId?: number;
}

export type PorterForceType =
  | 'rivalry'
  | 'buyers'
  | 'suppliers'
  | 'new_entrants'
  | 'substitutes';

export type PorterTrend = 'increasing' | 'stable' | 'decreasing';

export interface PorterForceItem {
  id: number;
  org_id: number;
  force: PorterForceType;
  title: string;
  description: string;
  intensity: number; // 1 to 5 (1 = Very Low, 5 = Very High)
  trend: PorterTrend;
  strategicResponse: string;
  linkedObjectiveId?: number;
}

// ==========================================
// VRIO Framework Types (Resource-Based View)
// ==========================================
export type VrioResourceCategory =
  | 'physical'
  | 'financial'
  | 'human'
  | 'intellectual'
  | 'organizational'
  | 'technological';

export type VrioImplication =
  | 'disadvantage'
  | 'parity'
  | 'temporary_advantage'
  | 'unused_advantage'
  | 'sustained_advantage';

export interface VrioItem {
  id: number;
  org_id: number;
  resource_name: string;
  category: VrioResourceCategory;
  description: string;
  is_valuable: boolean; // V: ارزش‌آفرینی و کاهش هزینه
  is_rare: boolean; // R: کمیابی و انحصار نسبی
  is_inimitable: boolean; // I: دشواری تقلید و هزینه بالای کپی‌برداری
  is_organized: boolean; // O: ساختار و فرایند سازمانی برای بهره‌برداری
  dynamic_capability_score?: number; // 1 to 10 (قابلیت پویای انطباق و تحول)
  economic_moat?: 'none' | 'narrow' | 'wide'; // خندق اقتصادی و حفاظ رقابتی
  action_plan?: string;
  linkedObjectiveId?: number;
}

// ==========================================
// SPACE Matrix Types (Strategic Position & ACtion Evaluation)
// ==========================================
export type SpaceDimension = 'FS' | 'CA' | 'IS' | 'ES';
// FS: Financial Strength (+1 to +6)
// CA: Competitive Advantage (-6 to -1)
// IS: Industry Strength (+1 to +6)
// ES: Environmental Stability (-6 to -1)

export type SpaceQuadrant = 'Aggressive' | 'Conservative' | 'Defensive' | 'Competitive';

export interface SpaceFactor {
  id: number;
  org_id: number;
  dimension: SpaceDimension;
  name: string;
  score: number; // +1 to +6 for FS/IS, -6 to -1 for CA/ES
  benchmark?: string;
  rationale?: string;
}

export interface DatabaseState {
  orgs: OrgUnit[];
  perspectives: Perspective[];
  periods: Period[];
  objectives: Objective[];
  indicators: Indicator[];
  measurements: Measurement[];
  cascades: Cascade[];
  causes: Cause[];
  initiatives: StrategicInitiative[];
  focusAreas: FocusArea[];
  visions: OrgVision[];
  swotItems?: SwotItem[];
  swotStrategies?: SwotStrategy[];
  bcgItems?: BcgItem[];
  megaTrends?: MegaTrend[];
  weakSignals?: WeakSignal[];
  wildCards?: WildCard[];
  horizonInitiatives?: HorizonInitiative[];
  scenarios?: StrategicScenario[];
  uncertainties?: CriticalUncertainty[];
  risks?: RiskItem[];
  pestelItems?: PestelItem[];
  porterItems?: PorterForceItem[];
  vrioItems?: VrioItem[];
  spaceFactors?: SpaceFactor[];
}

export interface ScoredIndicator extends Indicator {
  target: number | null;
  actual: number | null;
  score: number | null;
  status: StatusType;
}

export interface CascadedChild {
  objective_id: number;
  org_id: number;
  org_name: string;
  title: string;
  weight: number;
  score: number | null;
}

export interface ScoredObjective extends Objective {
  indicators: ScoredIndicator[];
  score: number | null;
  status: StatusType;
  coverage: number | null;
  children: CascadedChild[];
  aligned_score: number | null;
  aligned_status: StatusType;
}

export interface ScoredPerspective {
  perspective: Perspective;
  objectives: ScoredObjective[];
  score: number | null;
  status: StatusType;
  coverage: number | null;
}

export interface ScorecardResult {
  org_id: number;
  period_id: number;
  perspectives: ScoredPerspective[];
  score: number | null;
  status: StatusType;
  coverage: number | null;
}
