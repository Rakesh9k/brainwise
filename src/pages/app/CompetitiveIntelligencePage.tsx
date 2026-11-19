import React, { useEffect, useRef, useState } from 'react';
import {
  CheckCircle2,
  Copy,
  Palette,
  Plus,
  Radar,
  ShieldAlert,
  Sparkles,
  Target,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  filterReviewComplaints,
  findNearestCompetitors,
  type ComplaintClusterTopic,
} from '../../utils/logic';
import type { CompetitorProfileData } from '../../types/brainwise';
import { DataTable } from '../../components/ui/DataTable';
import {
  IntelligenceOrb,
  IntelligenceSurface,
  PageHeader,
  PriorityBadge,
  SearchInput,
  SectionHeader,
  StatusBadge,
  Tabs,
  TopoGridOverlay,
} from '../../components/ui/DesignSystem';
import { AddCompetitorModal } from '../../components/ui/CompetitorModal';
import {
  BrainLineagePopover,
  BusinessBrainContextBanner,
  CompetitorCard,
  GuidedActionEmptyCard,
  JourneyNextStep,
} from '../../components/ui/DepartmentCards';
import { MarketWatchPage } from './MarketWatchPage';
import { typeClass } from '../../theme/typography';

const PROFILE_SUBTAB_LABELS: Record<
  'overview' | 'products' | 'pricing' | 'positioning' | 'website' | 'marketing' | 'reviews' | 'swot' | 'changes',
  string
> = {
  overview: 'Overview',
  products: 'Products',
  pricing: 'Pricing',
  positioning: 'Positioning',
  website: 'Website & UX',
  marketing: 'Marketing',
  reviews: 'Customer Reviews',
  swot: 'SWOT',
  changes: 'Recent Changes',
};

const PROFILE_SECTION_GROUPS: Array<{
  group: string;
  items: Array<{ id: keyof typeof PROFILE_SUBTAB_LABELS; label: string }>;
}> = [
  {
    group: 'Offer & Economics',
    items: [
      { id: 'overview', label: 'Overview' },
      { id: 'products', label: 'Products' },
      { id: 'pricing', label: 'Pricing' },
    ],
  },
  {
    group: 'Brand & Funnel',
    items: [
      { id: 'positioning', label: 'Positioning' },
      { id: 'website', label: 'Website & UX' },
      { id: 'marketing', label: 'Marketing' },
    ],
  },
  {
    group: 'Signals & Edge',
    items: [
      { id: 'reviews', label: 'Customer Reviews' },
      { id: 'swot', label: 'SWOT' },
      { id: 'changes', label: 'Recent Changes' },
    ],
  },
];

export type CompetitiveTabId = 'overview' | 'profile' | 'comparison' | 'gaps' | 'strategy' | 'watch';

export const CompetitiveIntelligencePage: React.FC<{ initialTab?: CompetitiveTabId }> = ({
  initialTab = 'overview',
}) => {
  const {
    state,
    navigate,
    toggleCompetitorMonitoring,
    saveCompetitiveStrategyToBrain,
    updateOwnPosition,
    addExperiment,
    addTask,
    showToast,
    departmentResetNonce,
    pendingCompetitorProfile,
    consumeCompetitorProfile,
  } = useBrainWise();

  const [sectionTab, setSectionTab] = useState<CompetitiveTabId>(initialTab);
  const [profileSubTab, setProfileSubTab] = useState<
    'overview' | 'products' | 'pricing' | 'positioning' | 'website' | 'marketing' | 'reviews' | 'swot' | 'changes'
  >('overview');
  const [selectedId, setSelectedId] = useState(state.selectedCompetitorId || state.competitors[0]?.id);
  const [search, setSearch] = useState('');
  const [addOpen, setAddOpen] = useState(false);
  const [complaintTopic, setComplaintTopic] = useState<ComplaintClusterTopic>('All');
  const [isDraggingMarker, setIsDraggingMarker] = useState(false);
  const mapRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    setSectionTab(initialTab);
  }, [initialTab]);

  useEffect(() => {
    if (pendingCompetitorProfile && state.selectedCompetitorId) {
      setSelectedId(state.selectedCompetitorId);
      setSectionTab('profile');
      setProfileSubTab('overview');
      consumeCompetitorProfile();
    }
  }, [pendingCompetitorProfile, state.selectedCompetitorId, consumeCompetitorProfile]);

  const activeComp =
    state.competitors.find((c) => c.id === selectedId) ?? state.competitors[0];
  const ownPos = state.ownPositionScore ?? { x: 58, y: 80 };
  const proximity = findNearestCompetitors(ownPos.x, ownPos.y, state.competitors);
  const complaintRows = filterReviewComplaints(state.competitors, complaintTopic);

  const applyMapPosition = (clientX: number, clientY: number) => {
    const el = mapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const xPct = ((clientX - rect.left) / rect.width) * 100;
    const yPct = ((rect.bottom - clientY) / rect.height) * 100;
    updateOwnPosition(xPct, yPct);
  };

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setSectionTab('overview');
      setProfileSubTab('overview');
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    sectionTab === 'profile'
      ? [
          { label: 'Competitor Profile', onClick: () => setSectionTab('overview') },
          {
            label: activeComp?.name || 'Competitor',
            onClick: profileSubTab !== 'overview' ? () => setProfileSubTab('overview') : undefined,
          },
          ...(profileSubTab !== 'overview' ? [{ label: PROFILE_SUBTAB_LABELS[profileSubTab] }] : []),
        ]
      : sectionTab === 'comparison'
      ? [{ label: 'Comparison & Map' }]
      : sectionTab === 'gaps'
      ? [{ label: 'Strategic Gap Analysis' }]
      : sectionTab === 'strategy'
      ? [{ label: 'Competitive Strategy' }]
      : sectionTab === 'watch'
      ? [{ label: 'Market Watch' }]
      : [],
    [sectionTab, profileSubTab, activeComp?.id, activeComp?.name]
  );

  const filteredCompetitors = state.competitors.filter((c) => {
    const q = search.toLowerCase();
    return (
      !q ||
      c.name.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.positioning.toLowerCase().includes(q)
    );
  });

  const unreadAlertsCount = state.marketEvents.filter(
    (ev) => !ev.isRead && !(state.archivedEventIds ?? []).includes(ev.id)
  ).length;

  return (
    <div className="space-y-6">
      <BusinessBrainContextBanner
        departmentLabel="Competitive Intelligence"
        contextKey="competitiveIntelligence"
      />

      <PageHeader
        mutedPrefix="Competitive"
        title="Intelligence"
        subtitle="Discover competitors, monitor live market changes, map positioning white space, and build your differentiation moat."
        actions={
          <>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs sm:text-sm font-medium bg-[#FFFFFF] hover:bg-[#F5F5F4] border border-[#E6E6E2] rounded-[10px] shadow-[0_1px_2px_rgba(23,23,23,0.03)] cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              Add Competitor
            </button>
            <button
              type="button"
              onClick={() => navigate('brand-studio')}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs sm:text-sm font-semibold text-white bg-[#FF7417] hover:bg-[#E55F08] rounded-[10px] shadow-[0_1px_2px_rgba(255,116,23,0.28)] cursor-pointer"
            >
              <Palette className="w-4 h-4" />
              Build Positioning into Brand
            </button>
          </>
        }
      />

      <Tabs
        activeTab={sectionTab}
        onChange={(id) => {
          if (id === 'watch') {
            navigate('market-watch');
          } else {
            setSectionTab(id as CompetitiveTabId);
          }
        }}
        tabs={[
          { id: 'overview', label: 'Discovery & Tracked', count: state.competitors.length },
          { id: 'profile', label: 'Competitor Profile' },
          { id: 'comparison', label: 'Comparison & Map' },
          { id: 'gaps', label: 'Strategic Gaps', count: state.gapAnalysis.length },
          { id: 'strategy', label: 'Competitive Strategy' },
          { id: 'watch', label: 'Market Watch →', count: unreadAlertsCount || undefined },
        ]}
      />

      {/* A & B: Discovery & Home */}
      {sectionTab === 'overview' && (
        <div className="space-y-6">
          {state.competitors.length < 2 && (
            <GuidedActionEmptyCard
              stepLabel="Step 02 · Competitive Landscape"
              title={
                state.competitors.length === 0
                  ? 'Add competitors to unlock your white-space positioning map'
                  : 'Add at least one more rival for multi-axis benchmarking'
              }
              description="Profile 2+ direct or adjacent alternatives to populate the 2×2 positioning matrix, complaint clusters, and strategic gap analysis."
              actionLabel="Add Competitor"
              onAction={() => setAddOpen(true)}
            />
          )}

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <SearchInput
              value={search}
              onChange={setSearch}
              placeholder="Filter competitors by name, category, or positioning..."
              className="sm:w-80"
            />
            <span className="text-xs text-[#686864]">
              Industry overview: {state.brain.industry} ({state.competitors.length} profiled)
            </span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[16px] bg-[#FFF0E5]/50 border border-[#FFD3B3]">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-[#FF7417] text-white flex items-center justify-center shrink-0">
                <Radar className="w-4 h-4" />
              </div>
              <div>
                <div className="text-xs sm:text-sm font-semibold text-[#171717]">Continuous Market Surveillance Active</div>
                <div className="text-xs text-[#5C5C58]">
                  {state.competitors.filter((c) => c.monitoringEnabled).length} of {state.competitors.length} competitors monitored · {unreadAlertsCount} unread signal alerts
                </div>
              </div>
            </div>
            <button
              type="button"
              onClick={() => navigate('market-watch')}
              className="px-3.5 py-1.5 text-xs font-medium text-[#C44D00] hover:text-[#FFFFFF] bg-white hover:bg-[#FF7417] border border-[#FFD3B3] hover:border-[#FF7417] rounded-full transition-all focus-ring cursor-pointer inline-flex items-center gap-1.5 self-start sm:self-auto shrink-0 shadow-xs"
            >
              Open Market Watch Feed →
            </button>
          </div>

          <DataTable
            data={filteredCompetitors}
            keyExtractor={(c) => c.id}
            onRowClick={(c) => {
              setSelectedId(c.id);
              setSectionTab('profile');
            }}
            columns={[
              {
                key: 'name',
                header: 'Competitor',
                sortValue: (c) => c.name,
                render: (c) => (
                  <div>
                    <div className="font-semibold text-[#242424]">{c.name}</div>
                    <div className="text-xs text-[#686864]">{c.website.replace('https://', '')}</div>
                  </div>
                ),
              },
              {
                key: 'category',
                header: 'Category',
                sortValue: (c) => c.category,
                render: (c) => <span className="text-xs text-[#242424]">{c.category}</span>,
              },
              {
                key: 'positioning',
                header: 'Positioning',
                render: (c) => <span className="text-xs text-[#686864] line-clamp-2 max-w-xs">{c.positioning}</span>,
              },
              {
                key: 'price',
                header: 'Price Range',
                sortValue: (c) => c.priceRange,
                render: (c) => <span className="font-mono-num text-xs">{c.priceRange}</span>,
              },
              {
                key: 'status',
                header: 'Status',
                render: (c) => (
                  <StatusBadge
                    status={c.researchStatus}
                    tone={c.researchStatus === 'Complete' ? 'success' : 'warning'}
                  />
                ),
              },
              {
                key: 'date',
                header: 'Last Researched',
                align: 'right',
                sortValue: (c) => c.lastResearched,
                render: (c) => <span className="font-mono-num text-xs text-[#686864]">{c.lastResearched}</span>,
              },
            ]}
          />
        </div>
      )}

      {/* C: Competitor Profile Empty State */}
      {sectionTab === 'profile' && !activeComp && (
        <GuidedActionEmptyCard
          stepLabel="Competitor Dossiers"
          title="No competitors tracked yet"
          description="Add your first direct or category competitor to unlock their full 9-section dossier, pricing ladder, and Market Watch tracking."
          actionLabel="Add First Competitor"
          onAction={() => setAddOpen(true)}
        />
      )}

      {/* C: Competitor Profile (9 Tabs) */}
      {sectionTab === 'profile' && activeComp && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          <div className="lg:col-span-4 space-y-3">
            <SectionHeader title="Tracked Competitors" />
            <div className="space-y-2.5">
              {state.competitors.map((c) => (
                <CompetitorCard
                  key={c.id}
                  competitor={c}
                  selected={c.id === activeComp.id}
                  onSelect={(id: string) => setSelectedId(id)}
                />
              ))}
            </div>
          </div>

          <div className="lg:col-span-8 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 space-y-5 bw-surface-raised">
            <div className="flex flex-wrap items-start justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
              <div>
                <div className="text-xs text-[#686864]">
                  {activeComp.category} · {activeComp.geography} · Discovered via {activeComp.discoveryMethod}
                </div>
                <h2 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
                  {activeComp.name}
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    void navigator.clipboard?.writeText(activeComp.website)?.catch(() => {});
                    showToast(`Copied domain reference: ${activeComp.website}`);
                  }}
                  className="text-xs text-[#C44D00] hover:text-[#A33E00] mt-0.5 inline-flex items-center gap-1 cursor-pointer"
                >
                  <span>{activeComp.website}</span>
                  <Copy className="w-3 h-3" />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <PriorityBadge priority={activeComp.threatLevel} />
                <button
                  type="button"
                  onClick={() => {
                    toggleCompetitorMonitoring(activeComp.id);
                    showToast(
                      activeComp.monitoringEnabled
                        ? `Paused Market Watch for ${activeComp.name}`
                        : `Enabled Market Watch for ${activeComp.name}`
                    );
                  }}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-[8px] border cursor-pointer transition-colors ${
                    activeComp.monitoringEnabled
                      ? 'bg-[#FFF0E5] text-[#C44D00] border-[#FFD3B3]'
                      : 'bg-[#F5F5F4] text-[#242424] border-[#E6E6E2]'
                  }`}
                >
                  <Radar className="w-3.5 h-3.5" />
                  {activeComp.monitoringEnabled ? 'Monitoring Active' : 'Monitor Competitor'}
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
              <nav
                aria-label="Competitor dossier sections"
                data-frosted-nav="competitor-dossier"
                className="md:col-span-4 space-y-4 rounded-[14px] border border-[#E6E6E2]/75 bw-frosted-nav p-3"
              >
                {PROFILE_SECTION_GROUPS.map((grp) => (
                  <div key={grp.group} className="space-y-1">
                    <div className="text-[10px] font-semibold uppercase tracking-wider text-[#8E8E88] px-2">
                      {grp.group}
                    </div>
                    <div className="space-y-0.5">
                      {grp.items.map((item) => {
                        const active = profileSubTab === item.id;
                        return (
                          <button
                            key={item.id}
                            type="button"
                            onClick={() => setProfileSubTab(item.id)}
                            className={`w-full text-left px-2.5 py-1.5 rounded-[8px] text-xs font-medium transition-colors cursor-pointer ${
                              active
                                ? 'bg-[#FFF0E5] text-[#C44D00] font-semibold'
                                : 'text-[#686864] hover:text-[#242424] hover:bg-[#F5F5F4]'
                            }`}
                          >
                            {item.label}
                          </button>
                        );
                      })}
                    </div>
                  </div>
                ))}
              </nav>

              <div className="md:col-span-8 text-sm text-[#242424] leading-relaxed">
              {profileSubTab === 'overview' && (
                <div className="space-y-4">
                  <p>{activeComp.overview}</p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] text-xs">
                      <div className="text-[#686864]">Estimated Share Band</div>
                      <div className="font-semibold mt-0.5">{activeComp.marketShareBand}</div>
                    </div>
                    <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] text-xs">
                      <div className="text-[#686864]">Retail Price Range</div>
                      <div className="font-mono-num font-semibold mt-0.5">{activeComp.priceRange}</div>
                    </div>
                  </div>
                </div>
              )}

              {profileSubTab === 'products' && (
                <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px]">
                  {activeComp.productsAndServices.map((p) => (
                    <div key={p.name} className="p-3.5 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-semibold text-sm">{p.name}</div>
                        <div className="text-xs text-[#686864]">{p.notes}</div>
                      </div>
                      <span className="font-mono-num text-xs font-semibold">{p.price}</span>
                    </div>
                  ))}
                </div>
              )}

              {profileSubTab === 'pricing' && (
                <div className="space-y-3">
                  <p>{activeComp.pricingModel.summary}</p>
                  <div className="grid grid-cols-3 gap-3 text-xs">
                    <div className="p-3 rounded-[10px] bg-[#F5F5F4]">
                      <div className="text-[#686864]">Entry Price</div>
                      <div className="font-mono-num font-semibold mt-1">{activeComp.pricingModel.entryPrice}</div>
                    </div>
                    <div className="p-3 rounded-[10px] bg-[#F5F5F4]">
                      <div className="text-[#686864]">Flagship Price</div>
                      <div className="font-mono-num font-semibold mt-1">{activeComp.pricingModel.flagshipPrice}</div>
                    </div>
                    <div className="p-3 rounded-[10px] bg-[#F5F5F4]">
                      <div className="text-[#686864]">Discounts</div>
                      <div className="font-medium mt-1">{activeComp.pricingModel.discounts}</div>
                    </div>
                  </div>
                </div>
              )}

              {profileSubTab === 'positioning' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                    <div className="text-[#686864]">Archetype</div>
                    <div className="font-semibold text-sm mt-0.5">{activeComp.brandPositioningDetail.archetype}</div>
                  </div>
                  <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                    <div className="text-[#686864]">Core Tagline</div>
                    <div className="font-semibold text-sm mt-0.5">{activeComp.brandPositioningDetail.tagline}</div>
                  </div>
                  <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                    <div className="text-[#686864]">Target Buyer</div>
                    <div className="mt-0.5">{activeComp.brandPositioningDetail.targetBuyer}</div>
                  </div>
                  <div className="p-4 rounded-[10px] bg-[#F5F5F4]">
                    <div className="text-[#686864]">Visual Tone</div>
                    <div className="mt-0.5">{activeComp.brandPositioningDetail.visualTone}</div>
                  </div>
                </div>
              )}

              {profileSubTab === 'website' && (
                <div className="space-y-3 text-xs">
                  <div className="flex flex-wrap gap-4 p-3.5 rounded-[10px] bg-[#F5F5F4]">
                    <div><span className="text-[#686864]">Clarity:</span> <strong>{activeComp.websiteAnalysis.clarityScore}</strong></div>
                    <div><span className="text-[#686864]">Primary CTA:</span> <strong>{activeComp.websiteAnalysis.primaryCTA}</strong></div>
                  </div>
                  <p className="text-sm">{activeComp.websiteAnalysis.speedNote}</p>
                  <div>
                    <div className="font-semibold mb-1.5">Observed Conversion Gaps</div>
                    <ul className="space-y-1 text-[#686864]">
                      {activeComp.websiteAnalysis.conversionGaps.map((g) => (
                        <li key={g}>• {g}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              )}

              {profileSubTab === 'marketing' && (
                <div className="space-y-3 text-xs">
                  <div><span className="text-[#686864]">Primary Channels:</span> <strong>{activeComp.marketingStrategy.channels.join(', ')}</strong></div>
                  <div><span className="text-[#686864]">Content Cadence:</span> <strong>{activeComp.marketingStrategy.contentCadence}</strong></div>
                  <div><span className="text-[#686864]">Paid Signals:</span> <strong>{activeComp.marketingStrategy.paidSignals}</strong></div>
                </div>
              )}

              {profileSubTab === 'reviews' && (
                <div className="space-y-4 text-xs">
                  <div className="p-3.5 rounded-[10px] bg-[#F5F5F4] flex items-center gap-4">
                    <span className="text-lg font-bold font-mono-num">{activeComp.customerReviews.averageRating}</span>
                    <span className="text-[#686864]">{activeComp.customerReviews.reviewCount}</span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <div className="font-semibold text-[#24724E] mb-1.5">Praised For</div>
                      <ul className="space-y-1 text-[#686864]">
                        {activeComp.customerReviews.praisedFor.map((p) => <li key={p}>• {p}</li>)}
                      </ul>
                    </div>
                    <div>
                      <div className="font-semibold text-[#BC3E3E] mb-1.5">Common Complaints</div>
                      <ul className="space-y-1 text-[#686864]">
                        {activeComp.customerReviews.complaints.map((c) => <li key={c}>• {c}</li>)}
                      </ul>
                    </div>
                  </div>
                </div>
              )}

              {profileSubTab === 'swot' && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-[10px] border border-[#E6E6E2]">
                    <div className="font-semibold text-[#24724E] mb-2">Strengths</div>
                    <ul className="space-y-1.5 text-[#242424]">
                      {activeComp.strengths.map((s) => <li key={s}>• {s}</li>)}
                    </ul>
                  </div>
                  <div className="p-4 rounded-[10px] border border-[#E6E6E2]">
                    <div className="font-semibold text-[#C44D00] mb-2">Exploitable Weaknesses</div>
                    <ul className="space-y-1.5 text-[#242424]">
                      {activeComp.weaknesses.map((w) => <li key={w}>• {w}</li>)}
                    </ul>
                  </div>
                </div>
              )}

              {profileSubTab === 'changes' && (
                <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px]">
                  {activeComp.historicalChanges.map((hc, i) => (
                    <div key={i} className="p-3.5 text-xs">
                      <div className="flex items-center justify-between text-[#686864]">
                        <span className="font-mono-num">{hc.date}</span>
                        <span>{hc.source}</span>
                      </div>
                      <div className="text-sm text-[#242424] mt-1">{hc.change}</div>
                    </div>
                  ))}
                </div>
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* D: Competitor Comparison & Positioning Map */}
      {sectionTab === 'comparison' && (
        <div className="space-y-6">
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <SectionHeader
                title="Interactive Positioning Map"
                description="Click or drag your orange Target badge (or use arrow keys) to test white-space clearance"
              />
              <button
                type="button"
                onClick={() => {
                  updateOwnPosition(58, 80);
                  showToast('Reset target position to recommended white-space coordinates.');
                }}
                className="px-3 py-1.5 text-xs font-medium bg-[#F5F5F4] hover:bg-[#ECECE9] border border-[#E6E6E2] rounded-[8px] cursor-pointer"
              >
                Reset Target (58, 80)
              </button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
              <div
                ref={mapRef}
                role="application"
                aria-label="2x2 Competitive positioning canvas"
                onPointerDown={(e) => {
                  if ((e.target as HTMLElement).dataset.competitorPin === 'true') return;
                  setIsDraggingMarker(true);
                  applyMapPosition(e.clientX, e.clientY);
                }}
                onPointerMove={(e) => {
                  if (!isDraggingMarker) return;
                  applyMapPosition(e.clientX, e.clientY);
                }}
                onPointerUp={() => setIsDraggingMarker(false)}
                onPointerLeave={() => setIsDraggingMarker(false)}
                className="lg:col-span-8 relative h-80 bg-[#FAFAF9] rounded-[12px] border border-[#E6E6E2] bw-surface-inset overflow-hidden p-4 select-none cursor-crosshair touch-none"
              >
                <TopoGridOverlay tone="light" fade="none" intensity="crisp" />
                {/* Top-right white space subtle orange wash */}
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-0 right-0 w-1/2 h-1/2"
                  style={{
                    background:
                      'radial-gradient(circle at 80% 20%, rgba(255, 116, 23, 0.09) 0%, rgba(255, 154, 69, 0.03) 50%, transparent 80%)',
                  }}
                />
                {/* Axes */}
                <div className="absolute inset-x-6 top-1/2 border-t border-dashed border-[#D6D6D0] pointer-events-none" />
                <div className="absolute inset-y-6 left-1/2 border-l border-dashed border-[#D6D6D0] pointer-events-none" />
                <span className="absolute top-2.5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#5C5C58] pointer-events-none bg-[#FAFAF9]/90 px-1.5 rounded">
                  High Digital &amp; Craft Specialization
                </span>
                <span className="absolute bottom-2.5 left-1/2 -translate-x-1/2 text-[10px] font-medium text-[#5C5C58] pointer-events-none bg-[#FAFAF9]/90 px-1.5 rounded">
                  Traditional / Hospitality-Led
                </span>
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#5C5C58] pointer-events-none bg-[#FAFAF9]/90 px-1 rounded">
                  Mass Pricing
                </span>
                <span className="absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-medium text-[#5C5C58] pointer-events-none bg-[#FAFAF9]/90 px-1 rounded">
                  Premium Tier
                </span>

                {/* Competitors */}
                {state.competitors.map((c) => (
                  <button
                    key={c.id}
                    type="button"
                    data-competitor-pin="true"
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedId(c.id);
                      setSectionTab('profile');
                    }}
                    style={{ left: `${c.xValueScore}%`, bottom: `${c.yDiffScore}%` }}
                    className="z-10 hover:z-30 absolute -translate-x-1/2 translate-y-1/2 px-2 py-0.5 rounded-[7px] bg-[#FFFFFF] border border-[#D6D6D0] text-[10px] font-medium text-[#252525] shadow-[0_1px_2px_rgba(23,23,23,0.06)] hover:border-[#FF7417] hover:-translate-y-[calc(50%+1px)] transition-all cursor-pointer whitespace-nowrap"
                  >
                    {c.name}
                  </button>
                ))}

                {/* Interactive Target Marker */}
                <button
                  type="button"
                  aria-label={`${state.brain.businessName} Target position at X ${ownPos.x}, Y ${ownPos.y}. Use arrow keys to reposition.`}
                  onKeyDown={(e) => {
                    const step = 4;
                    if (e.key === 'ArrowLeft') {
                      e.preventDefault();
                      updateOwnPosition(ownPos.x - step, ownPos.y);
                    } else if (e.key === 'ArrowRight') {
                      e.preventDefault();
                      updateOwnPosition(ownPos.x + step, ownPos.y);
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      updateOwnPosition(ownPos.x, ownPos.y + step);
                    } else if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      updateOwnPosition(ownPos.x, ownPos.y - step);
                    }
                  }}
                  style={{ left: `${ownPos.x}%`, bottom: `${ownPos.y}%` }}
                  className="z-20 absolute -translate-x-1/2 translate-y-1/2 px-2.5 py-1 rounded-[8px] bg-[#FF7417] text-white text-[11px] font-semibold shadow-[0_0_16px_rgba(255,116,23,0.45)] whitespace-nowrap cursor-grab active:cursor-grabbing ring-2 ring-white transition-transform hover:scale-105"
                >
                  {state.brain.businessName} (Target)
                </button>
              </div>

              <div className="lg:col-span-4 rounded-[12px] bg-[#FAFAF9] border border-[#E6E6E2] p-4 flex flex-col justify-between gap-4">
                <div className="space-y-3">
                  <div className="text-[11px] font-semibold uppercase tracking-wider text-[#C44D00]">
                    Live Proximity Readout
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E6E2]">
                      <div className="text-[#5C5C58]">Coordinates</div>
                      <div className="font-mono-num font-bold text-[#252525] mt-0.5 tabular-nums">
                        X:{ownPos.x} · Y:{ownPos.y}
                      </div>
                    </div>
                    <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E6E2]">
                      <div className="text-[#5C5C58]">White-Space</div>
                      <div className="font-mono-num font-bold text-[#24724E] mt-0.5 tabular-nums">
                        {proximity.whiteSpaceClearance} pts
                      </div>
                    </div>
                  </div>
                  <div className="p-2.5 rounded-[8px] bg-white border border-[#E6E6E2] text-xs">
                    <div className="text-[#686864]">Active Quadrant</div>
                    <div className="font-semibold text-[#242424] mt-0.5">{proximity.ownQuadrant}</div>
                  </div>
                </div>

                <div className="space-y-2">
                  <div className="text-[11px] font-semibold text-[#242424]">Nearest Rivals</div>
                  {proximity.nearest.slice(0, 3).map((item) => (
                    <div
                      key={item.competitor.id}
                      className="flex items-center justify-between text-xs bg-white px-3 py-2 rounded-[8px] border border-[#E6E6E2]"
                    >
                      <span className="truncate font-medium text-[#242424]">{item.competitor.name}</span>
                      <span className="font-mono-num text-[#686864] shrink-0">{item.distance}u</span>
                    </div>
                  ))}
                  {proximity.nearest.length === 0 && (
                    <div className="text-xs text-[#686864]">Add competitors to measure proximity.</div>
                  )}
                </div>
              </div>
            </div>
          </div>

          <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] overflow-x-auto bw-surface-raised">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-[#F5F5F4] border-b border-[#E6E6E2]">
                  <th className="p-3.5 font-semibold text-[#686864]">Dimension</th>
                  <th className="p-3.5 font-semibold text-[#C44D00]">{state.brain.businessName}</th>
                  {state.competitors.slice(0, 3).map((c) => (
                    <th key={c.id} className="p-3.5 font-semibold text-[#242424]">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-[#E6E6E2]">
                <tr>
                  <td className="p-3.5 font-medium text-[#686864]">Pricing</td>
                  <td className="p-3.5 font-semibold">$15 Flight / $18 mo</td>
                  {state.competitors.slice(0, 3).map((c) => <td key={c.id} className="p-3.5 font-mono-num">{c.priceRange}</td>)}
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#686864]">Core Offering</td>
                  <td className="p-3.5">48h Tuesday Roast Subscription</td>
                  {state.competitors.slice(0, 3).map((c) => <td key={c.id} className="p-3.5">{c.category}</td>)}
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#686864]">Digital Experience</td>
                  <td className="p-3.5">Grind-calibrated QR + 1-click pause</td>
                  {state.competitors.slice(0, 3).map((c) => <td key={c.id} className="p-3.5">{c.websiteAnalysis.clarityScore}</td>)}
                </tr>
                <tr>
                  <td className="p-3.5 font-medium text-[#686864]">Differentiation</td>
                  <td className="p-3.5">Warm architectural clarity + 48h stamp</td>
                  {state.competitors.slice(0, 3).map((c) => <td key={c.id} className="p-3.5">{c.brandPositioningDetail.archetype}</td>)}
                </tr>
              </tbody>
            </table>
          </div>

          {/* Filterable 3-Star Review Complaint Matrix */}
          <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-4 bw-surface-raised">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <SectionHeader
                title="3-Star Review Complaint Matrix"
                description="Filter verified customer friction clusters across tracked competitors to sharpen your wedge"
              />
              <div className="flex flex-wrap items-center gap-1.5">
                {(['All', 'Freshness', 'Pricing', 'Onboarding', 'Delivery'] as const).map((topic) => (
                  <button
                    key={topic}
                    type="button"
                    onClick={() => setComplaintTopic(topic)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-[8px] border cursor-pointer transition-colors ${
                      complaintTopic === topic
                        ? 'bg-[#171717] text-white border-[#171717]'
                        : 'bg-[#F5F5F4] text-[#242424] border-[#E6E6E2] hover:border-[#D0D0C8]'
                    }`}
                  >
                    {topic}
                  </button>
                ))}
              </div>
            </div>

            {complaintRows.length === 0 ? (
              <div className="p-4 rounded-[10px] bg-[#F5F5F4] text-xs text-[#686864]">
                No logged complaints match "{complaintTopic}". Try switching to All clusters.
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                {complaintRows.map((row, idx) => (
                  <div
                    key={`${row.competitorId}-${idx}`}
                    className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] flex flex-col justify-between gap-2"
                  >
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-semibold text-[#242424]">{row.competitorName}</span>
                      <span className="font-medium text-[#C44D00]">{row.topic}</span>
                    </div>
                    <p className="text-xs text-[#242424] leading-relaxed">“{row.complaint}”</p>
                    <div className="text-[11px] font-mono-num text-[#686864]">
                      Avg rating: {row.averageRating}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* E: Strategic Gap Analysis */}
      {sectionTab === 'gaps' && (
        <div className="space-y-5">
          <SectionHeader
            title="Strategic Gap Analysis"
            description="Six high-leverage openings uncovered across pricing, underserved buyers, and digital workflows"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {state.gapAnalysis.map((gap) => (
              <div key={gap.id} className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-[#C44D00]">{gap.dimension}</span>
                  <PriorityBadge priority={gap.impact} />
                </div>
                <h3 className="font-heading text-base font-bold text-[#242424]">{gap.title}</h3>
                <div className="text-xs text-[#686864] leading-relaxed">
                  <strong className="text-[#242424]">Market Observation:</strong> {gap.observation}
                </div>
                <div className="p-3 rounded-[8px] bg-[#F5F5F4] text-xs text-[#242424] leading-relaxed">
                  <strong className="text-[#24724E]">Our Opportunity:</strong> {gap.opportunity}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* F: Competitive Strategy */}
      {sectionTab === 'strategy' && (
        <div className="space-y-6">
          <IntelligenceSurface variant="dark" className="p-6 sm:p-8 space-y-6">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-xs font-medium text-[#FF8A36] inline-flex items-center gap-2">
                    <IntelligenceOrb size="xs" state="active" />
                    <span>Competitive Strategy Blueprint</span>
                  </span>
                  <BrainLineagePopover
                    sourceDepartment="Business Brain & Gap Analysis"
                    insight={`Synthesized from ${state.competitors.length} tracked rivals, pricing ladders, and customer personas in your Business Brain.`}
                    targetRoute="business-brain"
                    editLabel="Adjust positioning context"
                    darkSurface
                  />
                </div>
                <h2 className={`${typeClass.h3} font-bold mt-1.5 text-white`}>
                  Where {state.brain.businessName} Wins
                </h2>
              </div>
              <StatusBadge
                status={state.competitiveStrategy.savedToBrain ? 'Synced to Business Brain' : 'Draft Strategy'}
                tone="success"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {[
                { label: 'Where should we compete?', text: state.competitiveStrategy.whereToCompete, icon: <Target className="w-4 h-4 text-[#FF8A36]" /> },
                { label: 'Where should we differentiate?', text: state.competitiveStrategy.whereToDifferentiate, icon: <Sparkles className="w-4 h-4 text-[#FF8A36]" /> },
                { label: 'What should we avoid?', text: state.competitiveStrategy.whatToAvoid, icon: <ShieldAlert className="w-4 h-4 text-[#FF8A36]" /> },
                { label: 'Which customer segment should we target?', text: state.competitiveStrategy.targetSegment, icon: <CheckCircle2 className="w-4 h-4 text-[#FF8A36]" /> },
              ].map((item) => (
                <div key={item.label} className="p-4 rounded-[12px] bg-[#242424] border border-[#323232]">
                  <div className="flex items-center gap-2 text-xs font-semibold text-[#FF8A36]">
                    {item.icon}
                    <span>{item.label}</span>
                  </div>
                  <p className="mt-2 text-sm text-[#ECECE9] leading-relaxed">{item.text}</p>
                </div>
              ))}
            </div>

            <div className="p-4 rounded-[12px] bg-[#242424] border border-[#FF7417]/40">
              <div className="text-xs font-semibold text-[#FF8A36]">Defensible Moat</div>
              <p className="mt-1 text-sm text-white leading-relaxed">{state.competitiveStrategy.potentialMoat}</p>
            </div>

            <div className="flex flex-wrap items-center gap-2.5 pt-2">
              <button
                type="button"
                onClick={saveCompetitiveStrategyToBrain}
                className="px-4 py-2 text-xs font-semibold bg-[#FF7417] hover:bg-[#E55F08] text-white rounded-[8px] shadow-[0_1px_2px_rgba(255,116,23,0.3)] cursor-pointer"
              >
                Save Strategy to Brain
              </button>
              <button
                type="button"
                onClick={() => {
                  addTask({
                    title: 'Deploy Competitive Differentiation Positioning',
                    description: state.competitiveStrategy.whereToDifferentiate,
                    whyItMatters: 'Locks in identified gap against Roastery House & The Coffee Co.',
                    expectedOutcome: 'Consistent positioning across landing page & packaging.',
                    priority: 'high',
                    estimatedMinutes: 30,
                    dueDate: '2026-11-21',
                    department: 'Competitive Intelligence',
                    status: 'pending',
                  });
                  navigate('growth-director');
                }}
                className="px-4 py-2 text-xs font-medium bg-white hover:bg-[#F5F5F4] text-[#242424] rounded-[8px] cursor-pointer"
              >
                Add to Growth Roadmap
              </button>
              <button
                type="button"
                onClick={() => {
                  addExperiment({
                    title: 'Positioning Hook A/B Test: 48h Roast Stamp',
                    hypothesis: state.competitiveStrategy.whereToDifferentiate,
                    objective: 'Verify click-through lift vs generic specialty coffee copy.',
                    targetAudience: state.competitiveStrategy.targetSegment,
                    action: 'Run headline split test on Discovery Flight landing page.',
                    successMetric: '>= 25% CTR improvement',
                    budget: '$100',
                    startDate: '2026-11-18',
                    endDate: '2026-12-02',
                    status: 'Planned',
                    results: 'Queued from Competitive Strategy.',
                    learnings: 'Pending.',
                  });
                  navigate('tasks-experiments');
                }}
                className="px-4 py-2 text-xs font-medium border border-[#3C3C3C] text-white hover:bg-[#242424] rounded-[8px] cursor-pointer"
              >
                Create Experiment
              </button>
              <button
                type="button"
                onClick={() => navigate('brand-studio')}
                className="px-4 py-2 text-xs font-medium border border-[#FF7417] text-[#FF8A36] hover:bg-[#FF7417]/15 rounded-[8px] cursor-pointer"
              >
                Build into Brand Studio →
              </button>
            </div>
          </IntelligenceSurface>
        </div>
      )}

      {/* G: Live Market Watch & Signals */}
      {sectionTab === 'watch' && <MarketWatchPage embedded />}

      <AddCompetitorModal
        open={addOpen}
        onClose={() => setAddOpen(false)}
        title="Add Competitor & Enable Watchlist"
      />

      <JourneyNextStep currentRoute={sectionTab === 'watch' ? 'market-watch' : 'competitive-intelligence'} />
    </div>
  );
};
