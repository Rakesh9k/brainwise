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
  | 'signals'
  | 'tamsamsom'
  | 'swot'
  | 'porter'
  | 'pestle'
  | 'scores'
  | 'market'
  | 'financials'
  | 'roadmap'
  | 'investor'
  | 'journey';

interface ValidationTabNavigationProps {
  activeTab: ValidationTabKey;
  onSelectTab: (tab: ValidationTabKey) => void;
  viewMode?: 'frameworks' | 'dossier';
  onToggleViewMode?: (mode: 'frameworks' | 'dossier') => void;
}

interface TabDef {
  key: ValidationTabKey;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  stepNum: string;
  targetAnchor: string;
  fallbackAnchor?: string;
}

export const FRAMEWORK_TABS: TabDef[] = [
  { key: 'summary', label: 'Decision', icon: FileText, stepNum: '01', targetAnchor: 'section-verdict', fallbackAnchor: 'section-00' },
  { key: 'signals', label: 'Go/Stop', icon: BarChart3, stepNum: '02', targetAnchor: 'section-gostop', fallbackAnchor: 'section-GS' },
  { key: 'tamsamsom', label: 'TAM/SAM', icon: Globe, stepNum: '03', targetAnchor: 'section-tamsamsom', fallbackAnchor: 'section-03' },
  { key: 'swot', label: 'SWOT', icon: Target, stepNum: '04', targetAnchor: 'section-swot' },
  { key: 'porter', label: 'Porter 5', icon: Building, stepNum: '05', targetAnchor: 'section-porter' },
  { key: 'pestle', label: 'PESTLE', icon: Compass, stepNum: '06', targetAnchor: 'section-pestle' },
];

export const VALIDATION_TABS: TabDef[] = [
  { key: 'summary', label: 'Summary', icon: FileText, stepNum: '01', targetAnchor: 'section-00', fallbackAnchor: 'section-verdict' },
  { key: 'scores', label: 'Scores', icon: BarChart3, stepNum: '02', targetAnchor: 'section-04', fallbackAnchor: 'section-gostop' },
  { key: 'market', label: 'Market', icon: Globe, stepNum: '03', targetAnchor: 'section-02', fallbackAnchor: 'section-tamsamsom' },
  { key: 'financials', label: 'Financials', icon: DollarSign, stepNum: '04', targetAnchor: 'section-08' },
  { key: 'roadmap', label: 'Roadmap', icon: Compass, stepNum: '05', targetAnchor: 'section-13' },
  { key: 'investor', label: 'Investor', icon: Building, stepNum: '06', targetAnchor: 'section-15' },
  { key: 'journey', label: 'Journey', icon: Target, stepNum: '07', targetAnchor: 'section-journey' },
];

export const ValidationTabNavigation: React.FC<ValidationTabNavigationProps> = ({
  activeTab,
  onSelectTab,
  viewMode = 'frameworks',
  onToggleViewMode,
}) => {
  const tabs = viewMode === 'frameworks' ? FRAMEWORK_TABS : VALIDATION_TABS;
  const currentIdx = tabs.findIndex((t) => t.key === activeTab);
  const activeStepNum = currentIdx >= 0 ? tabs[currentIdx].stepNum : '01';
  const totalSteps = tabs.length.toString().padStart(2, '0');

  return (
    <div className="w-full bg-[#111111]/95 backdrop-blur-md text-white rounded-[14px] p-1.5 sm:p-2 flex items-center justify-between gap-2 shadow-lg border border-[#262626] no-print sticky top-[72px] z-25 overflow-hidden">
      {/* Horizontal Tabs */}
      <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 flex-nowrap min-w-0">
        {tabs.map((tab) => {
          const isActive = tab.key === activeTab;
          const Icon = tab.icon;

          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => {
                onSelectTab(tab.key);
                const el = document.getElementById(tab.targetAnchor) ||
                  (tab.fallbackAnchor ? document.getElementById(tab.fallbackAnchor) : null);
                if (el) {
                  const yOffset = -140; // clear sticky banner + tab bar
                  const y = el.getBoundingClientRect().top + window.scrollY + yOffset;
                  window.scrollTo({ top: y, behavior: 'smooth' });
                }
              }}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-[9px] text-xs font-semibold cursor-pointer shrink-0 transition-all ${
                isActive
                  ? 'bg-[#2A2A2A] text-white shadow-xs border border-[#404040]'
                  : 'text-[#A0A09C] hover:text-white hover:bg-[#1C1C1C]'
              }`}
            >
              <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-[#FF7417]' : 'text-[#80807C]'}`} />
              <span className="whitespace-nowrap">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Mode Toggle & Step Counter */}
      <div className="flex items-center gap-2 pr-1.5 shrink-0">
        {onToggleViewMode && (
          <div className="hidden sm:flex items-center p-0.5 rounded-[8px] bg-[#1F1F1F] border border-[#333333] text-[11px] font-semibold">
            <button
              type="button"
              onClick={() => onToggleViewMode('frameworks')}
              className={`px-2 py-0.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'frameworks' ? 'bg-[#FF7417] text-white' : 'text-[#888884] hover:text-white'
              }`}
            >
              Frameworks
            </button>
            <button
              type="button"
              onClick={() => onToggleViewMode('dossier')}
              className={`px-2 py-0.5 rounded-[6px] transition-all cursor-pointer ${
                viewMode === 'dossier' ? 'bg-[#333333] text-white' : 'text-[#888884] hover:text-white'
              }`}
            >
              15-Section
            </button>
          </div>
        )}

        <div className="flex items-center gap-1.5 text-xs font-mono font-semibold text-[#80807C]">
          <span className="text-white">{activeStepNum}</span>
          <span>/</span>
          <span>{totalSteps}</span>
        </div>
      </div>
    </div>
  );
};
