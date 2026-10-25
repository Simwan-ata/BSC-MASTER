import React, { useState } from 'react';
import {
  Building2,
  ChevronLeft,
  ChevronDown,
  Plus,
  Search,
  Briefcase,
  Layers,
  Sparkles,
  ShieldCheck,
  Factory,
  Ship,
  TrendingUp,
} from 'lucide-react';
import { OrgUnit, StatusType } from '../types';
import { StatusBadge } from './StatusBadge';
import { toFa } from '../scoring';

interface SidebarProps {
  orgs: OrgUnit[];
  selectedOrgId: number;
  onSelectOrg: (id: number) => void;
  onOpenNewOrg: () => void;
  orgScores: Record<number, { score: number | null; status: StatusType }>;
}

export const Sidebar: React.FC<SidebarProps> = ({
  orgs,
  selectedOrgId,
  onSelectOrg,
  onOpenNewOrg,
  orgScores,
}) => {
  const [searchTerm, setSearchTerm] = useState('');

  const filteredOrgs = orgs.filter((o) =>
    o.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getOrgIcon = (org: OrgUnit, depth: number) => {
    if (org.type === 'holding' || depth === 0) {
      return Building2;
    }
    if (org.code?.includes('PETRO') || org.name.includes('تولیدی')) {
      return Factory;
    }
    if (org.code?.includes('LOGIST') || org.name.includes('بازرگانی')) {
      return Ship;
    }
    return Briefcase;
  };

  const renderOrgItem = (org: OrgUnit, depth = 0) => {
    const isSelected = selectedOrgId === org.id;
    const scoreData = orgScores[org.id] || { score: null, status: null };
    const children = orgs.filter((o) => o.parent_id === org.id);
    const OrgIcon = getOrgIcon(org, depth);

    return (
      <div key={org.id} className="w-full">
        <button
          onClick={() => onSelectOrg(org.id)}
          className={`w-full group text-right flex items-center justify-between px-3 py-2.5 rounded-xl text-xs transition-all ${
            isSelected
              ? 'bg-gradient-to-l from-teal-900 to-slate-900 text-white font-bold shadow-sm ring-1 ring-teal-500/30'
              : 'text-slate-700 hover:bg-slate-100/90 hover:text-slate-950'
          }`}
          style={{ paddingRight: `${12 + depth * 14}px` }}
        >
          <div className="flex items-center gap-2.5 min-w-0 pr-0.5">
            <div
              className={`w-6 h-6 rounded-lg flex items-center justify-center shrink-0 transition-colors ${
                isSelected
                  ? 'bg-teal-500/20 text-teal-300 ring-1 ring-teal-400/30'
                  : 'bg-slate-100 text-slate-500 group-hover:bg-slate-200 group-hover:text-slate-700'
              }`}
            >
              <OrgIcon className="w-3.5 h-3.5" />
            </div>

            <div className="truncate text-right">
              <span className="block truncate leading-tight font-medium">{org.name}</span>
              {org.code && (
                <span
                  className={`text-[9px] font-mono tracking-tight block mt-0.5 ${
                    isSelected ? 'text-teal-300/80' : 'text-slate-400'
                  }`}
                >
                  {org.code}
                </span>
              )}
            </div>
          </div>

          <div className="shrink-0 mr-1.5 flex items-center gap-1.5">
            <StatusBadge
              status={scoreData.status}
              score={scoreData.score}
              size="sm"
              showLabel={false}
            />
            {isSelected && <ChevronLeft className="w-3.5 h-3.5 text-teal-400 animate-pulse" />}
          </div>
        </button>

        {children.length > 0 && (
          <div className="mt-1 mr-4 border-r-2 border-slate-200/80 pr-1 space-y-1">
            {children.map((child) => renderOrgItem(child, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  const topLevelOrgs = filteredOrgs.filter((o) => o.parent_id === null);

  return (
    <aside className="w-76 shrink-0 bg-white border-l border-slate-200 flex flex-col h-[calc(100vh-61px)] sticky top-[61px] overflow-hidden no-print">
      {/* Search box & Section header */}
      <div className="p-3.5 border-b border-slate-100 space-y-2.5 bg-slate-50/50">
        <div className="flex items-center justify-between">
          <span className="text-xs font-black text-slate-900 tracking-tight flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-teal-100 text-teal-800 flex items-center justify-center">
              <Building2 className="w-3.5 h-3.5" />
            </div>
            ساختار سازمانی و هلدینگ
          </span>

          <button
            onClick={onOpenNewOrg}
            className="flex items-center gap-1 text-[11px] font-bold text-teal-800 hover:text-teal-900 bg-teal-50 hover:bg-teal-100/90 border border-teal-200/80 px-2.5 py-1 rounded-lg transition-all shadow-3xs"
            title="افزودن واحد سازمانی یا شرکت تابعه جدید"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>واحد جدید</span>
          </button>
        </div>

        <div className="relative">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute right-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="جستجوی واحد یا شرکت..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full text-xs pr-8 pl-3 py-1.5 rounded-xl border border-slate-200 bg-white focus:outline-none focus:ring-2 focus:ring-teal-600/30 transition-all placeholder:text-slate-400"
          />
        </div>
      </div>

      {/* Tree list */}
      <div className="flex-1 overflow-y-auto p-3 space-y-1">
        {topLevelOrgs.length > 0 ? (
          topLevelOrgs.map((org) => renderOrgItem(org, 0))
        ) : (
          <div className="p-6 text-center text-xs text-slate-400 space-y-1">
            <Building2 className="w-6 h-6 mx-auto text-slate-300 mb-1" />
            <span>واحدی با این نام یافت نشد.</span>
          </div>
        )}
      </div>

      {/* Enterprise Status Footer */}
      <div className="p-3 bg-slate-50 border-t border-slate-200/80 text-[11px] space-y-1.5">
        <div className="flex items-center justify-between text-slate-700">
          <span className="font-bold flex items-center gap-1.5 text-xs text-slate-900">
            <ShieldCheck className="w-3.5 h-3.5 text-teal-600" />
            هم‌راستایی ساختار کارت امتیازی
          </span>
          <span className="text-[10px] bg-teal-100 text-teal-800 font-mono font-bold px-1.5 py-0.2 rounded">
            فعال
          </span>
        </div>
        <p className="text-slate-500 leading-relaxed text-[10px]">
          توازن ۴ منظر کاپلان-نورتون با قابلیت تسری آبشاری (Cascading) به شرکت‌های فرعی و واحدهای عملیاتی.
        </p>
      </div>
    </aside>
  );
};
