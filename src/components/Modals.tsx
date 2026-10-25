import React, { useState } from 'react';
import {
  X,
  Plus,
  Layers,
  Target,
  BarChart,
  Building2,
  Calendar,
  Network,
  GitFork,
  Download,
  Upload,
  RotateCcw,
  AlertTriangle,
} from 'lucide-react';
import {
  DatabaseState,
  MethodType,
  Objective,
  OrgUnit,
  Period,
  Perspective,
} from '../types';

interface ModalWrapperProps {
  title: string;
  isOpen: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

const ModalWrapper: React.FC<ModalWrapperProps> = ({
  title,
  isOpen,
  onClose,
  children,
}) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs">
      <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-lg shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="px-5 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="text-sm font-bold text-slate-900">{title}</h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        <div className="p-5 max-h-[80vh] overflow-y-auto">{children}</div>
      </div>
    </div>
  );
};

// 1. Add Objective Modal
export const AddObjectiveModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgs: OrgUnit[];
  perspectives: Perspective[];
  defaultOrgId: number;
  defaultPerspectiveId?: number;
  onAdd: (data: {
    org_id: number;
    perspective_id: number;
    title: string;
    weight: number;
    description?: string;
  }) => void;
}> = ({
  isOpen,
  onClose,
  orgs,
  perspectives,
  defaultOrgId,
  defaultPerspectiveId,
  onAdd,
}) => {
  const [orgId, setOrgId] = useState(defaultOrgId);
  const [perspId, setPerspId] = useState(defaultPerspectiveId || perspectives[0]?.id || 1);
  const [title, setTitle] = useState('');
  const [weight, setWeight] = useState('1.0');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    setOrgId(defaultOrgId);
    if (defaultPerspectiveId) setPerspId(defaultPerspectiveId);
  }, [defaultOrgId, defaultPerspectiveId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    onAdd({
      org_id: Number(orgId),
      perspective_id: Number(perspId),
      title: title.trim(),
      weight: parseFloat(weight) || 1.0,
      description: description.trim() || undefined,
    });
    setTitle('');
    setDescription('');
    onClose();
  };

  return (
    <ModalWrapper title="افزودن هدف استراتژیک جدید" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            واحد سازمانی
          </label>
          <select
            value={orgId}
            onChange={(e) => setOrgId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            منظر کارت امتیازی (Perspective)
          </label>
          <select
            value={perspId}
            onChange={(e) => setPerspId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {perspectives.map((p) => (
              <option key={p.id} value={p.id}>
                منظر {p.name}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            عنوان هدف استراتژیک <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: توسعه سهم بازار در کشورهای منطقه"
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            وزن اهمیت استراتژیک (ضریب ۱.۰ پیش‌فرض)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            توضیحات تکمیلی و خروجی‌های مورد انتظار
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="شرح مختصری از دامنه و نحوه تحقق هدف..."
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ثبت هدف استراتژیک
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 2. Add Indicator Modal
export const AddIndicatorModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  objectives: Objective[];
  defaultObjectiveId?: number;
  onAdd: (data: {
    objective_id: number;
    title: string;
    unit: string;
    weight: number;
    higher_is_better: boolean;
    method: MethodType;
    cap: number;
    yellow_limit: number | null;
    green_limit: number | null;
  }) => void;
}> = ({ isOpen, onClose, objectives, defaultObjectiveId, onAdd }) => {
  const [objectiveId, setObjectiveId] = useState(
    defaultObjectiveId || objectives[0]?.id || 1
  );
  const [title, setTitle] = useState('');
  const [unit, setUnit] = useState('%');
  const [weight, setWeight] = useState('1.0');
  const [higherIsBetter, setHigherIsBetter] = useState(true);
  const [method, setMethod] = useState<MethodType>('achievement');
  const [cap, setCap] = useState('1.2');
  const [yellowLimit, setYellowLimit] = useState('');
  const [greenLimit, setGreenLimit] = useState('');

  React.useEffect(() => {
    if (defaultObjectiveId) setObjectiveId(defaultObjectiveId);
  }, [defaultObjectiveId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    onAdd({
      objective_id: Number(objectiveId),
      title: title.trim(),
      unit: unit.trim(),
      weight: parseFloat(weight) || 1.0,
      higher_is_better: higherIsBetter,
      method,
      cap: parseFloat(cap) || 1.2,
      yellow_limit: method === 'threshold' && yellowLimit !== '' ? parseFloat(yellowLimit) : null,
      green_limit: method === 'threshold' && greenLimit !== '' ? parseFloat(greenLimit) : null,
    });

    setTitle('');
    onClose();
  };

  return (
    <ModalWrapper title="افزودن شاخص عملکردی کلیدی (KPI)" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف استراتژیک متناظر
          </label>
          <select
            value={objectiveId}
            onChange={(e) => setObjectiveId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            عنوان شاخص عملکردی <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: نرخ بازده حقوق صاحبان سهام (ROE)"
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">واحد سنجش</label>
            <input
              type="text"
              value={unit}
              onChange={(e) => setUnit(e.target.value)}
              placeholder="درصد، ساعت، ریال، امتیاز..."
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">وزن شاخص</label>
            <input
              type="number"
              step="0.1"
              min="0.1"
              value={weight}
              onChange={(e) => setWeight(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
            />
          </div>
        </div>

        {/* جهت شاخص */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">جهت مطلوب شاخص</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setHigherIsBetter(true)}
              className={`p-2 text-center rounded-lg border font-medium transition-colors ${
                higherIsBetter
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              افزایشی (بیشتر بهتر)
            </button>
            <button
              type="button"
              onClick={() => setHigherIsBetter(false)}
              className={`p-2 text-center rounded-lg border font-medium transition-colors ${
                !higherIsBetter
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              کاهشی (کمتر بهتر - ضایعات، توقف)
            </button>
          </div>
        </div>

        {/* روش محاسبه */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1">روش ارزیابی امتیاز</label>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => setMethod('achievement')}
              className={`p-2 text-center rounded-lg border font-medium transition-colors ${
                method === 'achievement'
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              درصد تحقق هدف (Achievement)
            </button>
            <button
              type="button"
              onClick={() => setMethod('threshold')}
              className={`p-2 text-center rounded-lg border font-medium transition-colors ${
                method === 'threshold'
                  ? 'border-teal-600 bg-teal-50 text-teal-800'
                  : 'border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
            >
              حدود آستانه زرد/سبز (Threshold)
            </button>
          </div>
        </div>

        {method === 'achievement' ? (
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              سقف نسبت تحقق (Cap)
            </label>
            <input
              type="number"
              step="0.05"
              min="1.0"
              max="2.0"
              value={cap}
              onChange={(e) => setCap(e.target.value)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600 font-mono"
            />
            <span className="text-[11px] text-slate-400 mt-1 block">
              پیش‌فرض ۱.۲ (حداکثر سقف امتیاز ۱۲۰٪)
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3 bg-slate-50 p-3 rounded-lg border border-slate-200">
            <div>
              <label className="block font-semibold text-amber-800 mb-1">
                حد آستانه زرد (هشدار)
              </label>
              <input
                type="number"
                step="any"
                required
                value={yellowLimit}
                onChange={(e) => setYellowLimit(e.target.value)}
                placeholder="مثلاً ۷۰"
                className="w-full p-2 border border-slate-200 rounded bg-white font-mono"
              />
            </div>
            <div>
              <label className="block font-semibold text-emerald-800 mb-1">
                حد آستانه سبز (مطلوب)
              </label>
              <input
                type="number"
                step="any"
                required
                value={greenLimit}
                onChange={(e) => setGreenLimit(e.target.value)}
                placeholder="مثلاً ۸۵"
                className="w-full p-2 border border-slate-200 rounded bg-white font-mono"
              />
            </div>
          </div>
        )}

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ثبت شاخص KPI
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 3. Add Organization Modal
export const AddOrgModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  orgs: OrgUnit[];
  onAdd: (data: { name: string; parent_id: number | null }) => void;
}> = ({ isOpen, onClose, orgs, onAdd }) => {
  const [name, setName] = useState('');
  const [parentId, setParentId] = useState<string>('root');

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    onAdd({
      name: name.trim(),
      parent_id: parentId === 'root' ? null : Number(parentId),
    });
    setName('');
    onClose();
  };

  return (
    <ModalWrapper title="تعریف واحد یا شرکت جدید" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            عنوان شرکت یا واحد سازمانی <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="مثال: شرکت خدمات مهندسی و بازرسی فنی"
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">واحد بالادستی (والد)</label>
          <select
            value={parentId}
            onChange={(e) => setParentId(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            <option value="root">-- بدون والد (هلدینگ اصلی / سطح اول) --</option>
            {orgs.map((o) => (
              <option key={o.id} value={o.id}>
                {o.name}
              </option>
            ))}
          </select>
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors shadow-sm"
          >
            ایجاد واحد
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 4. Add Cause Link Modal
export const AddCauseModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  objectives: Objective[];
  onAdd: (fromId: number, toId: number) => void;
}> = ({ isOpen, onClose, objectives, onAdd }) => {
  const [fromId, setFromId] = useState<number>(objectives[0]?.id || 0);
  const [toId, setToId] = useState<number>(objectives[1]?.id || 0);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!fromId || !toId || fromId === toId) return;
    onAdd(fromId, toId);
    onClose();
  };

  return (
    <ModalWrapper title="افزودن پیوند علت‌ومعلولی نقشه استراتژی" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف مبدأ (محرک / پیش‌نیاز)
          </label>
          <select
            value={fromId}
            onChange={(e) => setFromId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          >
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف مقصد (نتیجه / اثرپذیر)
          </label>
          <select
            value={toId}
            onChange={(e) => setToId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          >
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <p className="text-[11px] text-slate-500 bg-slate-50 p-2.5 rounded border border-slate-200">
          در نقشه استراتژی استاندارد، جهت پیکان معمولاً از منظرهای زیرین (رشد و
          یادگیری یا فرایندها) به سمت منظرهای بالادست (مشتری و مالی) است.
        </p>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg"
          >
            ایجاد پیوند علت‌ومعلولی
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 5. Add Cascade Link Modal
export const AddCascadeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  allObjectives: Objective[];
  orgs: OrgUnit[];
  onAdd: (childId: number, parentId: number, weight: number) => void;
}> = ({ isOpen, onClose, allObjectives, orgs, onAdd }) => {
  const [childId, setChildId] = useState<number>(allObjectives[0]?.id || 0);
  const [parentId, setParentId] = useState<number>(allObjectives[1]?.id || 0);
  const [weight, setWeight] = useState('1.0');

  const orgMap = new Map(orgs.map((o) => [o.id, o.name]));

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!childId || !parentId || childId === parentId) return;
    onAdd(childId, parentId, parseFloat(weight) || 1.0);
    onClose();
  };

  return (
    <ModalWrapper title="افزودن پیوند هم‌راستایی و تسری (Cascade)" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف زیرمجموعه (فرزند)
          </label>
          <select
            value={childId}
            onChange={(e) => setChildId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          >
            {allObjectives.map((o) => (
              <option key={o.id} value={o.id}>
                [{orgMap.get(o.org_id)}] {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف بالادستی هلدینگ (والد)
          </label>
          <select
            value={parentId}
            onChange={(e) => setParentId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          >
            {allObjectives.map((o) => (
              <option key={o.id} value={o.id}>
                [{orgMap.get(o.org_id)}] {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            ضریب سهم مشارکت در تراز هلدینگ (وزن)
          </label>
          <input
            type="number"
            step="0.1"
            min="0.1"
            value={weight}
            onChange={(e) => setWeight(e.target.value)}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white font-mono"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg"
          >
            ثبت هم‌راستایی
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

// 6. Backup & Restore Modal
export const BackupModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  onExport: () => void;
  onImport: (file: File) => void;
  onReset: () => void;
}> = ({ isOpen, onClose, onExport, onImport, onReset }) => {
  const [confirmReset, setConfirmReset] = useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImport(file);
      onClose();
    }
  };

  return (
    <ModalWrapper title="مدیریت پشتیبان و داده‌های کارت متوازن" isOpen={isOpen} onClose={onClose}>
      <div className="space-y-4 text-xs">
        {/* Export */}
        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Download className="w-4 h-4 text-teal-700" />
            دریافت نسخه پشتیبان (JSON Export)
          </h4>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            کل اطلاعات سازمان‌ها، شاخص‌ها، اوزان، داده‌های ادوار و روابط علت‌ومعلولی
            به صورت یک فایل JSON استاندارد ذخیره می‌شود.
          </p>
          <button
            onClick={onExport}
            className="w-full py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Download className="w-3.5 h-3.5" />
            <span>دانلود فایل پشتیبان (Export)</span>
          </button>
        </div>

        {/* Import */}
        <div className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-2">
          <h4 className="font-bold text-slate-900 flex items-center gap-1.5">
            <Upload className="w-4 h-4 text-blue-700" />
            بازیابی اطلاعات از فایل (JSON Import)
          </h4>
          <p className="text-slate-500 text-[11px] leading-relaxed">
            بارگذاری فایل JSON برای جایگزینی یا به‌روزرسانی اطلاعات پایگاه داده.
          </p>
          <input
            type="file"
            accept=".json"
            ref={fileInputRef}
            onChange={handleFileChange}
            className="hidden"
          />
          <button
            onClick={() => fileInputRef.current?.click()}
            className="w-full py-2 bg-white hover:bg-blue-50 text-blue-700 border border-blue-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>انتخاب فایل و بارگذاری</span>
          </button>
        </div>

        {/* Reset to Default */}
        <div className="p-4 border border-rose-100 rounded-xl bg-rose-50/30 space-y-2">
          <h4 className="font-bold text-rose-900 flex items-center gap-1.5">
            <RotateCcw className="w-4 h-4 text-rose-600" />
            بازنشانی به داده‌های نمونه پیش‌فرض (Reset)
          </h4>
          <p className="text-rose-700 text-[11px] leading-relaxed">
            بازگردانی داده‌های نمونه اولیه شامل هلدینگ، شرکت پتروشیمی نمونه،
            شاخص‌های تولیدی و روابط استراتژیک.
          </p>
          {confirmReset ? (
            <div className="flex items-center gap-2 pt-1">
              <button
                onClick={() => {
                  onReset();
                  setConfirmReset(false);
                  onClose();
                }}
                className="flex-1 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded font-medium"
              >
                بله، اطمینان دارم و بازنشانی کن
              </button>
              <button
                onClick={() => setConfirmReset(false)}
                className="px-3 py-1.5 bg-slate-100 text-slate-700 rounded"
              >
                انصراف
              </button>
            </div>
          ) : (
            <button
              onClick={() => setConfirmReset(true)}
              className="w-full py-2 bg-white hover:bg-rose-50 text-rose-700 border border-rose-200 font-medium rounded-lg transition-colors flex items-center justify-center gap-2"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span>بازنشانی به تنظیمات کارخانه</span>
            </button>
          )}
        </div>
      </div>
    </ModalWrapper>
  );
};

// 7. Add Strategic Initiative Modal (Cascade Suite)
export const AddInitiativeModal: React.FC<{
  isOpen: boolean;
  onClose: () => void;
  objectives: Objective[];
  defaultObjectiveId?: number;
  onAdd: (data: {
    objective_id: number;
    title: string;
    owner: string;
    due_date: string;
    budget?: string;
    progress: number;
    status: 'on_track' | 'behind' | 'at_risk' | 'completed';
    description?: string;
  }) => void;
}> = ({ isOpen, onClose, objectives, defaultObjectiveId, onAdd }) => {
  const [objectiveId, setObjectiveId] = useState<number>(
    defaultObjectiveId || objectives[0]?.id || 1
  );
  const [title, setTitle] = useState('');
  const [owner, setOwner] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [budget, setBudget] = useState('');
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState<'on_track' | 'behind' | 'at_risk' | 'completed'>('on_track');
  const [description, setDescription] = useState('');

  React.useEffect(() => {
    if (defaultObjectiveId) setObjectiveId(defaultObjectiveId);
  }, [defaultObjectiveId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !owner.trim()) return;

    onAdd({
      objective_id: Number(objectiveId),
      title: title.trim(),
      owner: owner.trim(),
      due_date: dueDate.trim() || '۱۴۰۵/۰۶/۳۱',
      budget: budget.trim() || undefined,
      progress: Number(progress),
      status,
      description: description.trim() || undefined,
    });

    setTitle('');
    setOwner('');
    setDueDate('');
    setBudget('');
    setProgress(0);
    setDescription('');
    onClose();
  };

  return (
    <ModalWrapper title="تعریف پروژه / اقدام استراتژیک جدید (Initiative)" isOpen={isOpen} onClose={onClose}>
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            هدف استراتژیک متناظر <span className="text-rose-500">*</span>
          </label>
          <select
            value={objectiveId}
            onChange={(e) => setObjectiveId(Number(e.target.value))}
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          >
            {objectives.map((o) => (
              <option key={o.id} value={o.id}>
                {o.title}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            عنوان پروژه یا اقدام عملیاتی <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="مثال: پیاده‌سازی سیستم ردیابی بلادرنگ محموله‌ها"
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white focus:outline-none focus:ring-1 focus:ring-teal-600"
          />
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              مسئول / مالک پروژه <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={owner}
              onChange={(e) => setOwner(e.target.value)}
              placeholder="مثال: مهندس کاظمی (مدیر فنی)"
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">تاریخ سررسید</label>
            <input
              type="text"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              placeholder="مثال: ۱۴۰۵/۰۸/۳۰"
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white font-mono"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">بودجه پیش‌بینی‌شده</label>
            <input
              type="text"
              value={budget}
              onChange={(e) => setBudget(e.target.value)}
              placeholder="مثال: ۵۰ میلیارد ریال"
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">وضعیت اولیه پروژه</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as any)}
              className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
            >
              <option value="on_track">در مسیر تحقق (On Track)</option>
              <option value="behind">دارای تاخیر (Behind)</option>
              <option value="at_risk">در معرض ریسک (At Risk)</option>
              <option value="completed">تکمیل‌شده (Completed)</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">
            درصد پیشرفت اولیه: <span className="font-mono">{progress}%</span>
          </label>
          <input
            type="range"
            min="0"
            max="100"
            value={progress}
            onChange={(e) => setProgress(Number(e.target.value))}
            className="w-full accent-teal-700"
          />
        </div>

        <div>
          <label className="block font-semibold text-slate-700 mb-1">توضیحات و دامنه اقدام</label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="اهداف کمی، خروجی‌های ملموس و فازبندی پروژه..."
            className="w-full p-2 border border-slate-200 rounded-lg bg-slate-50 focus:bg-white"
          />
        </div>

        <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg"
          >
            انصراف
          </button>
          <button
            type="submit"
            className="px-4 py-2 bg-teal-700 hover:bg-teal-800 text-white font-medium rounded-lg shadow-sm"
          >
            ثبت پروژه استراتژیک
          </button>
        </div>
      </form>
    </ModalWrapper>
  );
};

