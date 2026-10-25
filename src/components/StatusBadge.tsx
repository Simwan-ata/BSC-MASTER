import React from 'react';
import { CheckCircle2, AlertTriangle, AlertCircle, HelpCircle } from 'lucide-react';
import { StatusType } from '../types';
import { toFa } from '../scoring';

interface StatusBadgeProps {
  status: StatusType;
  score?: number | null;
  size?: 'sm' | 'md' | 'lg';
  showLabel?: boolean;
}

export const StatusBadge: React.FC<StatusBadgeProps> = ({
  status,
  score,
  size = 'md',
  showLabel = true,
}) => {
  const getVisuals = () => {
    switch (status) {
      case 'green':
        return {
          icon: <CheckCircle2 className="w-3.5 h-3.5 shrink-0 text-emerald-600 stroke-[2.2]" />,
          bg: 'bg-emerald-50/80 text-emerald-900 border-emerald-200/90 shadow-3xs',
          dot: 'bg-emerald-500 shadow-sm shadow-emerald-400/50',
          label: 'مطلوب',
        };
      case 'yellow':
        return {
          icon: <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-600 stroke-[2.2]" />,
          bg: 'bg-amber-50/80 text-amber-900 border-amber-200/90 shadow-3xs',
          dot: 'bg-amber-500 shadow-sm shadow-amber-400/50',
          label: 'هشدار',
        };
      case 'red':
        return {
          icon: <AlertCircle className="w-3.5 h-3.5 shrink-0 text-rose-600 stroke-[2.2]" />,
          bg: 'bg-rose-50/80 text-rose-900 border-rose-200/90 shadow-3xs',
          dot: 'bg-rose-500 shadow-sm shadow-rose-400/50',
          label: 'بحرانی',
        };
      default:
        return {
          icon: <HelpCircle className="w-3.5 h-3.5 shrink-0 text-slate-400 stroke-[1.8]" />,
          bg: 'bg-slate-50 text-slate-600 border-slate-200 shadow-3xs',
          dot: 'bg-slate-300',
          label: 'فاقد داده',
        };
    }
  };

  const v = getVisuals();
  const sizeClasses =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-3 py-1.5 text-sm font-bold'
      : 'px-2.5 py-1 text-xs font-semibold';

  return (
    <div
      className={`inline-flex items-center gap-1.5 rounded-lg border ${v.bg} ${sizeClasses} whitespace-nowrap shrink-0 transition-all`}
      title={`وضعیت: ${v.label} ${score !== undefined && score !== null ? `(امتیاز: ${toFa(score)})` : ''}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${v.dot}`} />
      {score !== undefined && score !== null && (
        <span className="font-mono tabular-nums font-bold">
          {toFa(score)}
        </span>
      )}
      {showLabel && <span className="opacity-95 font-medium">{v.label}</span>}
    </div>
  );
};
