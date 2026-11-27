import React, { useState } from 'react';
import { motion } from 'motion/react';
import {
  BarChart3,
  Brain,
  Compass,
  FolderKanban,
  LayoutDashboard,
  Lightbulb,
  Palette,
  Radar,
  Search,
  Settings,
  Swords,
  X,
  Sparkles,
  ArrowRight,
} from 'lucide-react';
import type { AppRoute } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface AllToolsDirectoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (route: AppRoute) => void;
  currentRoute: AppRoute;
}

interface ToolDefinition {
  id: AppRoute;
  label: string;
  category: 'Core' | 'Intelligence' | 'Brand & Creative' | 'Execution' | 'Performance';
  description: string;
  icon: React.ReactNode;
  stageBadge: string;
}

const ALL_TOOLS: ToolDefinition[] = [
  {
    id: 'dashboard',
    label: 'Home Dashboard',
    category: 'Core',
    description: 'Executive briefing, 3 daily strategic recommendations, and high-level momentum.',
    icon: <LayoutDashboard className="w-5 h-5 text-[#FF7417]" />,
    stageBadge: 'All Stages',
  },
  {
    id: 'business-brain',
    label: 'Business Brain',
    category: 'Core',
    description: 'Ground-truth company memory, verified pricing, verified audience facts, and positioning.',
    icon: <Brain className="w-5 h-5 text-[#4338CA]" />,
    stageBadge: 'All Stages',
  },
  {
    id: 'idea-intelligence',
    label: 'Idea Validation Hub',
    category: 'Intelligence',
    description: 'TAM/SAM/SOM concentric sizing, interactive SWOT, Porter 5 forces radar, and PESTLE scan.',
    icon: <Lightbulb className="w-5 h-5 text-[#EAB308]" />,
    stageBadge: 'Stage 1: Idea',
  },
  {
    id: 'competitive-intelligence',
    label: 'Competitive Intelligence',
    category: 'Intelligence',
    description: 'Competitor pricing teardowns, feature parity matrix, vulnerability gaps, and positioning maps.',
    icon: <Swords className="w-5 h-5 text-[#DC2626]" />,
    stageBadge: 'Stage 1 & 3',
  },
  {
    id: 'market-watch',
    label: 'Market Watch Radar',
    category: 'Intelligence',
    description: 'Automated market surveillance, industry shift signals, pricing shifts, and threat alerts.',
    icon: <Radar className="w-5 h-5 text-[#059669]" />,
    stageBadge: 'Stage 3: Growth',
  },
  {
    id: 'brand-studio',
    label: 'AI Brand Studio',
    category: 'Brand & Creative',
    description: 'Logo concept generator, typography scale, 10-tier color tokens, and static social carousels.',
    icon: <Palette className="w-5 h-5 text-[#EC4899]" />,
    stageBadge: 'Stage 2 & 3',
  },
  {
    id: 'asset-library',
    label: 'Asset Library & Collateral',
    category: 'Brand & Creative',
    description: 'Vector packaging dielines, business cards, letterheads, flyers, posters, and signed exports.',
    icon: <FolderKanban className="w-5 h-5 text-[#D97706]" />,
    stageBadge: 'Stage 2 & 3',
  },
  {
    id: 'growth-director',
    label: 'Growth Planner & Tasks',
    category: 'Execution',
    description: '30/60/90-Day growth roadmaps, weekly focus sprints, and growth hypothesis experiment tracker.',
    icon: <Compass className="w-5 h-5 text-[#2563EB]" />,
    stageBadge: 'Stage 2 & 3',
  },
  {
    id: 'business-performance',
    label: 'Analytics & Reports',
    category: 'Performance',
    description: 'Execution pulse metrics, conversion telemetry, CAC sensitivity heatmaps, and executive decks.',
    icon: <BarChart3 className="w-5 h-5 text-[#0891B2]" />,
    stageBadge: 'Stage 3: Growth',
  },
  {
    id: 'settings',
    label: 'Settings & Workspace',
    category: 'Performance',
    description: 'Workspace member roles, Cashfree billing, credit ledger, and platform configurations.',
    icon: <Settings className="w-5 h-5 text-[#64748B]" />,
    stageBadge: 'All Stages',
  },
];

export const AllToolsDirectoryModal: React.FC<AllToolsDirectoryModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  currentRoute,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');

  if (!isOpen) return null;

  const categories = ['All', 'Core', 'Intelligence', 'Brand & Creative', 'Execution', 'Performance'];

  const filteredTools = ALL_TOOLS.filter((tool) => {
    const matchesSearch =
      tool.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tool.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'All' || tool.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 sm:p-6 overflow-y-auto">
      {/* Backdrop */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-[#171717]/60 backdrop-blur-sm"
      />

      {/* Modal Dialog */}
      <motion.div
        initial={{ opacity: 0, scale: 0.96, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.96, y: 10 }}
        transition={{ duration: 0.2 }}
        className="relative w-full max-w-4xl bg-white rounded-[20px] shadow-2xl border border-[#E6E6E2] overflow-hidden flex flex-col max-h-[85vh] z-10"
      >
        {/* Header with Search */}
        <div className="p-5 sm:p-6 border-b border-[#E6E6E2] bg-[#FAF9F8] space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#171717] text-white">
                  ALL DEPARTMENTS
                </span>
                <span className="text-xs text-[#686864] font-medium">Full System Directory (14 Departments)</span>
              </div>
              <h2 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
                All BrainWise Tools &amp; Features
              </h2>
            </div>
            <button
              type="button"
              onClick={onClose}
              className="p-2 rounded-full hover:bg-[#EFEFEB] text-[#686864] hover:text-[#171717] transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search Bar & Category Filter Pills */}
          <div className="flex flex-col sm:flex-row gap-3 items-center">
            <div className="relative flex-1 w-full">
              <Search className="w-4 h-4 text-[#8A8A85] absolute left-3.5 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search any tool, report, or feature (e.g. SWOT, Logo, Competitors, Pricing)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
                className="w-full pl-10 pr-4 py-2 bg-white rounded-[10px] border border-[#DCDCD8] text-xs text-[#171717] focus:outline-none focus:border-[#FF7417] focus:ring-1 focus:ring-[#FF7417] transition-all"
              />
            </div>

            <div className="flex items-center gap-1 overflow-x-auto scrollbar-none w-full sm:w-auto pb-1 sm:pb-0">
              {categories.map((cat) => (
                <button
                  key={cat}
                  type="button"
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1.5 rounded-[8px] text-xs font-semibold whitespace-nowrap transition-all cursor-pointer ${
                    selectedCategory === cat
                      ? 'bg-[#171717] text-white shadow-xs'
                      : 'bg-white text-[#686864] border border-[#E6E6E2] hover:bg-[#F5F5F4]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Tools Grid */}
        <div className="p-5 sm:p-6 overflow-y-auto space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {filteredTools.map((tool) => {
              const isCurrent = currentRoute === tool.id;
              return (
                <div
                  key={tool.id}
                  onClick={() => {
                    onNavigate(tool.id);
                    onClose();
                  }}
                  className={`p-4 rounded-[14px] border transition-all cursor-pointer flex items-start gap-3.5 hover:shadow-md ${
                    isCurrent
                      ? 'border-[#FF7417] bg-[#FFF8F3] shadow-xs'
                      : 'border-[#E6E6E2] bg-white hover:border-[#CCCCCC]'
                  }`}
                >
                  <div className="p-2.5 rounded-[10px] bg-[#FAF9F8] border border-[#E6E6E2] shrink-0">
                    {tool.icon}
                  </div>

                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-sm font-bold text-[#171717] truncate">
                        {tool.label}
                      </h4>
                      <span className="text-[10px] font-mono-num font-semibold px-2 py-0.5 rounded-full bg-[#F5F5F4] text-[#686864] shrink-0 border border-[#E6E6E2]">
                        {tool.stageBadge}
                      </span>
                    </div>
                    <p className="text-xs text-[#686864] line-clamp-2 leading-relaxed">
                      {tool.description}
                    </p>
                  </div>

                  <ArrowRight className="w-4 h-4 text-[#8A8A85] shrink-0 self-center group-hover:text-[#FF7417]" />
                </div>
              );
            })}
          </div>

          {filteredTools.length === 0 && (
            <div className="text-center py-12 text-[#8A8A85] text-xs">
              No tools matching &quot;{searchQuery}&quot; found.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-[#E6E6E2] bg-[#FAF9F8] flex items-center justify-between text-xs text-[#686864]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF7417]" />
            <span>BrainWise Stage-Driven Architecture: Zero features hidden, zero features lost.</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-[8px] bg-[#171717] text-white font-semibold cursor-pointer hover:bg-[#333333] transition-colors"
          >
            Close
          </button>
        </div>
      </motion.div>
    </div>
  );
};
