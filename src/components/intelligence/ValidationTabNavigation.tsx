import React from 'react';
import {
  FileText,
  BarChart3,
  Globe,
  DollarSign,
  Compass,
  Building,
  Target,
} from 'lucide-react';

export type ValidationTabKey =
  | 'summary'
  | 'scores'
  | 'market'
  | 'financials'
  | 'roadmap'
  | 'investor'
  | 'journey';

interface ValidationTabNavigationProps {
  activeTab: ValidationTabKey;
  onSelectTab: (tab: ValidationTabKey) => void;
}

interface TabDef {
  key: ValidationTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNum: string;
  targetAnchor: string;
}

export const VALIDATION_TABS: TabDef[] = [
  { key: 'summary', label: 'Summary', icon: FileText, stepNum: '01', targetAnchor: 'section-00' },
  { key: 'scores', label: 'Scores', icon: BarChart3, stepNum: '02', targetAnchor: 'section-04' },
  { key: 'market', label: 'Market', icon: Globe, stepNum: '03', targetAnchor: 'section-02' },
  { key: 'financials', label: 'Financials', icon: DollarSign, stepNum: '04', targetAnchor: 'section-08' },
  { key: 'roadmap', label: 'Roadmap', icon: Compass, stepNum: '05', targetAnchor: 'section-13' },
  { key: 'investor', label: 'Investor', icon: Building, stepNum: '06', targetAnchor: 'section-15' },
  { key: 'journey', label: 'Journey', icon: Target, stepNum: '07', targetAnchor: 'section-journey' },
];

export const ValidationTabNavigation: React.FC<ValidationTabNavigationProps> = ({
  activeTab,
  onSelectTab,
}) => {
  const currentIdx = VALIDATION_TABS.findIndex((t) => t.key === activeTab);
  const activeStepNum = currentIdx >= 0 ? VALIDATION_TABS[currentIdx].stepNum : '01';

  return (
    <div className="w-full bg-[#111111] text-white rounded-[14px] p-2 flex flex-wrap items-center justify-between gap-3 shadow-md border border-[#262626] no-print">
      {/* Horizontal Tabs */}
      <div className="flex flex-wrap items-center gap-1.5 overflow-x-auto py-0.5">
        {VALIDATION_TABS.map((tab) => {
          const isActive = tab.key === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                onSelectTab(tab.key);
                const el = document.getElementById(tab.targetAnchor);
                if (el) {
                  el.scrollIntoView({ behavior: 'smooth', block: 'start' });
                }
              }}
              className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer transition-all ${
                isActive
                  ? 'bg-[#2A2A2A] text-white shadow-xs border border-[#404040]'
                  : 'text-[#A0A09C] hover:text-white hover:bg-[#1C1C1C]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF7417]' : 'text-[#80807C]'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Step Counter indicator */}
      <div className="flex items-center gap-2 pr-2 text-xs font-mono font-semibold text-[#80807C]">
        <span className="text-white">{activeStepNum}</span>
        <span>/</span>
        <span>07</span>
      </div>
    </div>
  );
};
