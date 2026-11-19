import React, { useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  CheckCircle2,
  Edit3,
  FileText,
  Plus,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  Upload,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import { calculateBrainCompleteness } from '../../utils/logic';
import type { BusinessBrainData, FactProvenanceItem } from '../../types/brainwise';
import {
  Button,
  Field,
  FluidProgress,
  FluidTransition,
  Input,
  IntelligenceOrb,
  IntelligenceSurface,
  InteractiveNode,
  NeuralNetworkAnimation,
  PageHeader,
  SectionHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
  Timeline,
} from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Overlay';
import { GuidedActionEmptyCard, JourneyNextStep } from '../../components/ui/DepartmentCards';

const BRAIN_TAB_LABELS: Record<
  'overview' | 'products' | 'audience' | 'strategy' | 'documents' | 'history',
  string
> = {
  overview: 'Overview',
  products: 'Products & Services',
  audience: 'Customer Personas',
  strategy: 'Strategy & Decisions',
  documents: 'Supporting Documents',
  history: 'Activity & History',
};

function FactProvenanceBadge({
  fieldKey,
  provenance,
  onConfirm,
}: {
  fieldKey: string;
  provenance?: Record<string, FactProvenanceItem>;
  onConfirm: (key: string) => void;
}) {
  const item = provenance?.[fieldKey];
  if (!item) return null;

  if (item.source === 'USER_CONFIRMED') {
    return (
      <span
        title={`Confirmed by ${item.lastConfirmedBy || 'Founder'}`}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]"
      >
        <ShieldCheck className="w-2.5 h-2.5 text-[#24724E]" />
        Confirmed
      </span>
    );
  }

  if (item.source === 'AI_INFERRED') {
    return (
      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFF4E5] text-[#A85E16] border border-[#FBE0C2]">
        <Sparkles className="w-2.5 h-2.5 text-[#FF7417]" />
        AI Inferred
        <button
          type="button"
          onClick={() => onConfirm(fieldKey)}
          className="text-[10px] font-bold text-[#C44D00] hover:underline cursor-pointer ml-1"
          title="Elevate this inferred fact to User Confirmed ground truth"
        >
          Confirm
        </button>
      </span>
    );
  }

  if (item.source === 'DERIVED_FROM_DOC') {
    return (
      <span
        title={item.notes || 'Extracted from uploaded document'}
        className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#F1F1EF] text-[#5C5C58] border border-[#E6E6E2]"
      >
        <FileText className="w-2.5 h-2.5 text-[#5C5C58]" />
        From Doc
        <button
          type="button"
          onClick={() => onConfirm(fieldKey)}
          className="text-[10px] font-bold text-[#C44D00] hover:underline cursor-pointer ml-1"
          title="Confirm this document extraction"
        >
          Confirm
        </button>
      </span>
    );
  }

  return null;
}

export const BusinessBrainPage: React.FC = () => {
  const {
    state,
    updateBrain,
    confirmFact,
    addExclusionRule,
    removeExclusionRule,
    navigate,
    departmentResetNonce,
  } = useBrainWise();
  const [newExclusionText, setNewExclusionText] = useState('');
  const [activeTab, setActiveTab] = useState<
    'overview' | 'products' | 'audience' | 'strategy' | 'documents' | 'history'
  >('overview');
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setActiveTab('overview');
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    activeTab !== 'overview' ? [{ label: BRAIN_TAB_LABELS[activeTab] }] : [],
    [activeTab]
  );

  // Edit profile form
  const [formName, setFormName] = useState(state.brain.businessName);
  const [formTagline, setFormTagline] = useState(state.brain.tagline);
  const [formIndustry, setFormIndustry] = useState(state.brain.industry);
  const [formStage, setFormStage] = useState<BusinessBrainData['stage']>(state.brain.stage);
  const [formLocation, setFormLocation] = useState(state.brain.location);
  const [formWebsite, setFormWebsite] = useState(state.brain.website);
  const [formSummary, setFormSummary] = useState(state.brain.overviewSummary);
  const [formPositioning, setFormPositioning] = useState(state.brain.brandPositioning);
  const [formRevenueModel, setFormRevenueModel] = useState(state.brain.revenueModel);

  // Add product form
  const [prodName, setProdName] = useState('');
  const [prodCat, setProdCat] = useState('Subscription');
  const [prodPrice, setProdPrice] = useState('');
  const [prodDesc, setProdDesc] = useState('');

  // Add goal form
  const [newGoalText, setNewGoalText] = useState('');

  // Upload doc form
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<
    'PDF' | 'Deck' | 'Research' | 'Brand Brief' | 'Spreadsheet'
  >('PDF');

  // Add persona form
  const [personaName, setPersonaName] = useState('');
  const [personaSegment, setPersonaSegment] = useState('Primary Buyer');
  const [personaPain, setPersonaPain] = useState('');
  const [personaTrigger, setPersonaTrigger] = useState('');
  const [personaWtp, setPersonaWtp] = useState('$35–$65 / mo');

  // Add decision form
  const [decTitle, setDecTitle] = useState('');
  const [decRationale, setDecRationale] = useState('');

  const completeness = calculateBrainCompleteness(state.brain);

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrain({
      businessName: formName.trim() || state.brain.businessName,
      tagline: formTagline.trim(),
      industry: formIndustry.trim() || state.brain.industry,
      stage: formStage,
      location: formLocation.trim(),
      website: formWebsite.trim(),
      overviewSummary: formSummary.trim(),
      brandPositioning: formPositioning.trim(),
      revenueModel: formRevenueModel.trim(),
    });
    setEditModalOpen(false);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    updateBrain({
      products: [
        ...state.brain.products,
        {
          id: `prod-${Date.now()}`,
          name: prodName.trim(),
          category: prodCat,
          priceRange: prodPrice || 'Custom pricing',
          description: prodDesc || 'Added directly to Business Brain catalog.',
          marginEstimate: 'TBD',
        },
      ],
    });
    setProdName('');
    setProdPrice('');
    setProdDesc('');
    setProductModalOpen(false);
  };

  const handleAddDoc = (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;
    updateBrain({
      documents: [
        {
          id: `doc-${Date.now()}`,
          name: docTitle.trim(),
          type: docType,
          size: '1.2 MB',
          uploadedAt: new Date().toISOString().slice(0, 10),
          usedByAI: true,
        },
        ...state.brain.documents,
      ],
    });
    setDocTitle('');
    setDocModalOpen(false);
  };

  const handleAddGoal = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newGoalText.trim()) return;
    updateBrain({
      primaryGoals: [...state.brain.primaryGoals, newGoalText.trim()],
    });
    setNewGoalText('');
    setGoalModalOpen(false);
  };

  const handleAddPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaName.trim()) return;
    updateBrain({
      personas: [
        {
          id: `per-${Date.now()}`,
          name: personaName.trim(),
          segment: personaSegment.trim() || 'Core Segment',
          ageOrFirmographics: 'Active category buyer',
          painPoints: personaPain.trim()
            ? personaPain
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ['Fragmented alternatives with unclear value proposition'],
          buyingTriggers: personaTrigger.trim()
            ? personaTrigger
                .split(',')
                .map((s) => s.trim())
                .filter(Boolean)
            : ['Transparent proof and fast initial trial'],
          willingnessToPay: personaWtp.trim() || 'Standard market rate',
        },
        ...state.brain.personas,
      ],
    });
    setPersonaName('');
    setPersonaPain('');
    setPersonaTrigger('');
    setPersonaModalOpen(false);
  };

  const handleAddDecision = (e: React.FormEvent) => {
    e.preventDefault();
    if (!decTitle.trim()) return;
    const today = new Date().toISOString().slice(0, 10);
    updateBrain({
      decisions: [
        {
          id: `dec-${Date.now()}`,
          title: decTitle.trim(),
          rationale: decRationale.trim() || 'Recorded directly in Business Brain.',
          department: 'Business Brain',
          decidedAt: today,
          status: 'active',
        },
        ...state.brain.decisions,
      ],
      history: [
        {
          id: `hist-${Date.now()}`,
          date: today,
          event: `Committed strategic decision: "${decTitle.trim()}"`,
          department: 'Business Brain',
        },
        ...state.brain.history,
      ],
    });
    setDecTitle('');
    setDecRationale('');
    setDecisionModalOpen(false);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <span>Last updated {state.brain.lastUpdated} · Synced across workspace departments</span>
        }
        mutedPrefix="Business"
        title="Brain"
        subtitle="The central knowledge engine powering Idea Intelligence, Competitive Analysis, Brand Studio, and Growth Planner."
        actions={
          <Button
            variant="primary"
            size="sm"
            onClick={() => {
              setFormName(state.brain.businessName);
              setFormTagline(state.brain.tagline);
              setFormIndustry(state.brain.industry);
              setFormStage(state.brain.stage);
              setFormLocation(state.brain.location);
              setFormWebsite(state.brain.website);
              setFormSummary(state.brain.overviewSummary);
              setFormPositioning(state.brain.brandPositioning);
              setFormRevenueModel(state.brain.revenueModel);
              setEditModalOpen(true);
            }}
          >
            <Edit3 className="w-4 h-4" />
            Edit Business Context
          </Button>
        }
      />

      {/* Interactive Knowledge Constellation & Context Completeness */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        <IntelligenceSurface
          variant="dark"
          className="lg:col-span-7 p-5 sm:p-6 flex flex-col justify-between gap-4 overflow-hidden"
        >
          <div className="flex items-center justify-between gap-2">
            <div>
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#FF9A45]">
                <IntelligenceOrb size="xs" state="active" />
                <span>Live Knowledge Graph · {state.brain.businessName}</span>
              </div>
              <p className="text-xs text-[#A8A8A2] mt-0.5">
                Click any node to inspect or refine that module across connected departments
              </p>
            </div>
            <span className="font-mono-num text-[11px] text-[#858585] hidden sm:inline">
              {completeness.completedSections}/{completeness.totalSections} NODES
            </span>
          </div>

          <div className="relative h-48 rounded-[12px] border border-[#252525] bg-[#141414] overflow-hidden">
            <NeuralNetworkAnimation mode="calm" dark height={192} />
            <InteractiveNode
              x={50}
              y={48}
              label="Core Brain"
              sublabel={`${completeness.percentage}%`}
              accent
              dark
              onClick={() => setActiveTab('overview')}
            />
            <InteractiveNode
              x={19}
              y={26}
              label="Offerings"
              sublabel={`${state.brain.products.length}`}
              active={activeTab === 'products'}
              dark
              onClick={() => setActiveTab('products')}
            />
            <InteractiveNode
              x={81}
              y={26}
              label="Personas"
              sublabel={`${state.brain.personas.length}`}
              active={activeTab === 'audience'}
              dark
              onClick={() => setActiveTab('audience')}
            />
            <InteractiveNode
              x={21}
              y={76}
              label="Models"
              active={activeTab === 'strategy'}
              dark
              onClick={() => setActiveTab('strategy')}
            />
            <InteractiveNode
              x={79}
              y={76}
              label="Docs & Research"
              sublabel={`${state.brain.documents.length + state.reports.length}`}
              active={activeTab === 'documents'}
              dark
              onClick={() => setActiveTab('documents')}
            />
          </div>
        </IntelligenceSurface>

        <div className="lg:col-span-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 flex flex-col justify-between gap-4 bw-surface-raised">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <h2 className="font-heading text-base font-semibold text-[#252525]">
                Knowledge Completeness
              </h2>
              <StatusBadge
                status={completeness.percentage === 100 ? 'Fully Synced' : 'Action Suggested'}
                tone={completeness.percentage === 100 ? 'success' : 'warning'}
              />
            </div>
            <FluidProgress
              value={completeness.percentage}
              label={`${completeness.completedSections} of ${completeness.totalSections} modules active`}
              activeShimmer={completeness.percentage < 100}
            />
          </div>

          <div className="pt-3 border-t border-[#E6E6E2]">
            {completeness.missingItems.length === 0 ? (
              <div className="flex items-start gap-2.5">
                <CheckCircle2 className="w-5 h-5 text-[#24724E] shrink-0 mt-0.5" />
                <div>
                  <div className="text-sm font-semibold text-[#252525]">
                    No missing context detected
                  </div>
                  <p className="text-xs text-[#5C5C58] mt-1">
                    All 5 operating departments read verified, synchronized business context.
                  </p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-xs font-semibold text-[#A85E16]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>{completeness.missingItems.length} Missing Information Items</span>
                </div>
                {completeness.missingItems.slice(0, 2).map((m) => (
                  <div key={m.section} className="text-xs text-[#5C5C58]">
                    <strong className="text-[#252525]">{m.section}:</strong> {m.prompt}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as typeof activeTab)}
        tabs={[
          { id: 'overview', label: 'Overview & Profile' },
          { id: 'products', label: 'Products & Services', count: state.brain.products.length },
          { id: 'audience', label: 'Audience & Personas', count: state.brain.personas.length },
          { id: 'strategy', label: 'Positioning & Models' },
          {
            id: 'documents',
            label: 'Documents & Research',
            count: state.brain.documents.length + state.reports.length,
          },
          { id: 'history', label: 'Decisions & History' },
        ]}
      />

      <FluidTransition key={activeTab} direction="fade">
        {/* Tab 1: Business Overview & Profile */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised">
              <SectionHeader
                title="Business Profile"
                description="Core identity used across reports & creatives"
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Business Name</span>
                    <FactProvenanceBadge
                      fieldKey="businessName"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">
                    {state.brain.businessName}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Industry</span>
                    <FactProvenanceBadge
                      fieldKey="industry"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">{state.brain.industry}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Business Stage</span>
                    <FactProvenanceBadge
                      fieldKey="stage"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">{state.brain.stage}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Location</span>
                    <FactProvenanceBadge
                      fieldKey="location"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">{state.brain.location}</div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Website</span>
                    <FactProvenanceBadge
                      fieldKey="website"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-medium text-[#C44D00] mt-0.5 truncate">
                    {state.brain.website || 'Not yet published'}
                  </div>
                </div>
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Tagline</span>
                    <FactProvenanceBadge
                      fieldKey="tagline"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-medium text-[#242424] mt-0.5">{state.brain.tagline}</div>
                </div>
              </div>
              <div className="pt-4 border-t border-[#E6E6E2]">
                <div className="text-xs text-[#686864]">Executive Overview</div>
                <p className="text-sm text-[#242424] leading-relaxed mt-1">
                  {state.brain.overviewSummary}
                </p>
              </div>
            </div>

            <div className="lg:col-span-5 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-4 bw-surface-raised">
              <SectionHeader
                title="Business Goals"
                action={
                  <button
                    type="button"
                    onClick={() => setGoalModalOpen(true)}
                    className="inline-flex items-center gap-1 text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add goal
                  </button>
                }
              />
              {state.brain.primaryGoals.length === 0 ? (
                <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-dashed border-[#D0D0C8] text-xs text-[#686864]">
                  No strategic goals added yet. Add your primary objective to align Growth Planner
                  &amp; Recommendations.
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {state.brain.primaryGoals.map((g, i) => (
                    <li
                      key={i}
                      className="p-3 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] text-xs font-medium text-[#242424] flex items-start gap-2"
                    >
                      <span className="font-mono-num text-[#C44D00]">0{i + 1}.</span>
                      <span>{g}</span>
                    </li>
                  ))}
                </ul>
              )}
              <div className="pt-3 border-t border-[#E6E6E2]">
                <div className="text-xs font-semibold text-[#242424]">Information Used by AI</div>
                <p className="text-xs text-[#686864] mt-1 leading-relaxed">
                  Departments currently read {state.brain.products.length} products,{' '}
                  {state.brain.personas.length} personas, {state.brain.documents.length} uploaded
                  documents, and {state.reports.filter((r) => r.savedToBrain).length} saved research
                  dossier(s).
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Products & Services */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <SectionHeader
              title="Products & Services"
              description="Offerings referenced in pricing analysis, Brand Studio collateral, and sales tasks"
              action={
                <Button variant="primary" size="sm" onClick={() => setProductModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Product / Service
                </Button>
              }
            />
            {state.brain.products.length === 0 ? (
              <GuidedActionEmptyCard
                stepLabel="Product Catalog"
                title="No offerings documented yet"
                description="Add your core product, tier, or service package so Idea Intelligence and Brand Studio reflect real pricing."
                actionLabel="Add First Offering"
                onAction={() => setProductModalOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {state.brain.products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 flex flex-col justify-between bw-surface-raised"
                  >
                    <div>
                      <div className="text-xs text-[#C44D00] font-medium">{p.category}</div>
                      <h3 className="font-heading text-base font-bold text-[#242424] mt-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-[#686864] mt-2 leading-relaxed">{p.description}</p>
                    </div>
                    <div className="mt-4 pt-3 border-t border-[#E6E6E2] flex items-center justify-between text-xs">
                      <span className="font-mono-num font-semibold text-[#242424]">
                        {p.priceRange}
                      </span>
                      <span className="text-[#686864]">{p.marginEstimate}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Target Audience & Customer Personas */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised">
              <div className="text-xs font-medium text-[#686864]">Target Audience Definition</div>
              <p className="text-sm text-[#242424] mt-1 leading-relaxed">
                {state.brain.targetAudience}
              </p>
            </div>

            <SectionHeader
              title="Customer Personas"
              description="Ideal buyer profiles guiding messaging and experiments"
              action={
                <Button variant="primary" size="sm" onClick={() => setPersonaModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Persona
                </Button>
              }
            />
            {state.brain.personas.length === 0 ? (
              <GuidedActionEmptyCard
                stepLabel="Audience Context"
                title="No customer personas mapped yet"
                description="Define your first target buyer persona so Idea Intelligence and Brand Studio tailor messaging automatically."
                actionLabel="Add First Persona"
                onAction={() => setPersonaModalOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {state.brain.personas.map((per) => (
                  <div
                    key={per.id}
                    className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-heading text-base font-bold text-[#242424]">
                          {per.name}
                        </h3>
                        <div className="text-xs text-[#686864] mt-0.5">
                          {per.segment} · {per.ageOrFirmographics}
                        </div>
                      </div>
                      <span className="text-xs font-mono-num font-semibold text-[#C44D00] shrink-0">
                        {per.willingnessToPay}
                      </span>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E6E6E2]">
                      <div>
                        <div className="text-xs font-semibold text-[#242424] mb-1.5">
                          Pain Points
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#686864]">
                          {per.painPoints.map((pt, i) => (
                            <li key={i}>• {pt}</li>
                          ))}
                        </ul>
                      </div>
                      <div>
                        <div className="text-xs font-semibold text-[#242424] mb-1.5">
                          Buying Triggers
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#686864]">
                          {per.buyingTriggers.map((bt, i) => (
                            <li key={i}>• {bt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tab 4: Brand Positioning, Business Model & Revenue Model */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              {[
                {
                  key: 'brandPositioning',
                  title: 'Brand Positioning',
                  body: state.brain.brandPositioning,
                },
                {
                  key: 'valueProposition',
                  title: 'Value Proposition',
                  body: state.brain.valueProposition,
                },
                { key: 'businessModel', title: 'Business Model', body: state.brain.businessModel },
                { key: 'revenueModel', title: 'Revenue Model', body: state.brain.revenueModel },
              ].map((block) => (
                <div
                  key={block.title}
                  className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised"
                >
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-medium text-[#C44D00]">{block.title}</span>
                    <FactProvenanceBadge
                      fieldKey={block.key}
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <p className="mt-2 text-sm text-[#242424] leading-relaxed">{block.body}</p>
                </div>
              ))}
            </div>

            {/* Strategic Memory & Truth Engine Safeguards */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              {/* Left: Anti-Fatigue Memory */}
              <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                <div className="flex items-start justify-between">
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#242424] flex items-center gap-1.5">
                      <Sparkles className="w-4 h-4 text-[#FF7417]" />
                      Anti-Fatigue Memory & Angle Saturation
                    </h3>
                    <p className="text-xs text-[#686864] mt-0.5">
                      Monitors marketing theme frequency across departments to eliminate repetitive
                      copy.
                    </p>
                  </div>
                </div>

                {state.brain.strategicMemory?.fatiguedThemes &&
                  state.brain.strategicMemory.fatiguedThemes.length > 0 && (
                    <div className="p-3 rounded-[8px] bg-[#FFF4E5] border border-[#FBE0C2] space-y-1.5">
                      <div className="text-[11px] font-bold text-[#A85E16] uppercase tracking-wider flex items-center gap-1">
                        <AlertTriangle className="w-3 h-3" />
                        Saturated Themes (Prompts Avoid These)
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        {state.brain.strategicMemory.fatiguedThemes.map((theme) => (
                          <span
                            key={theme}
                            className="px-2 py-0.5 rounded text-xs font-semibold bg-[#FFFFFF] text-[#A85E16] border border-[#FBE0C2]"
                          >
                            {theme}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                <div>
                  <div className="text-xs font-semibold text-[#242424] mb-2">
                    Tracked Strategic Angles
                  </div>
                  {!state.brain.strategicMemory?.usedAngles ||
                  state.brain.strategicMemory.usedAngles.length === 0 ? (
                    <div className="text-xs text-[#686864] p-3 rounded-[8px] bg-[#F5F5F4] border border-dashed border-[#E6E6E2]">
                      No angles recorded yet. Generated Brand Studio creatives and campaigns log
                      automatically.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {state.brain.strategicMemory.usedAngles.map((ang) => (
                        <div
                          key={ang.id}
                          className="p-2.5 rounded-[8px] border border-[#E6E6E2] bg-[#FAFAF9] flex items-center justify-between text-xs"
                        >
                          <div className="min-w-0 pr-2">
                            <div className="font-medium text-[#242424] truncate">"{ang.angle}"</div>
                            <div className="text-[10px] text-[#686864] mt-0.5">
                              {ang.theme} · {ang.usedIn} · Used {ang.frequency} time
                              {ang.frequency > 1 ? 's' : ''}
                            </div>
                          </div>
                          <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-mono-num font-semibold bg-[#E6E6E2] text-[#242424]">
                            {ang.frequency}x
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Right: Deterministic Truth Check Exclusions */}
              <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#242424] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#24724E]" />
                    Truth Engine & Prohibited Claim Safeguards
                  </h3>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Strict boundaries for AI outputs. Breaching any of these claims triggers
                    automatic remediation or credit protection.
                  </p>
                </div>

                <div className="space-y-2">
                  {!state.brain.strategicMemory?.explicitExclusions ||
                  state.brain.strategicMemory.explicitExclusions.length === 0 ? (
                    <div className="text-xs text-[#686864] p-3 rounded-[8px] bg-[#F5F5F4] border border-dashed border-[#E6E6E2]">
                      No prohibited claim rules configured. Add rules below to enforce brand truth.
                    </div>
                  ) : (
                    state.brain.strategicMemory.explicitExclusions.map((rule) => (
                      <div
                        key={rule}
                        className="p-2.5 rounded-[8px] border border-[#E6E6E2] bg-[#FAFAF9] flex items-center justify-between gap-2 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <ShieldAlert className="w-3.5 h-3.5 text-[#C44D00] shrink-0" />
                          <span className="text-[#242424] truncate">{rule}</span>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeExclusionRule(rule)}
                          className="text-[#858585] hover:text-[#BC3E3E] p-1 cursor-pointer transition-colors"
                          title="Remove rule"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>

                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    if (newExclusionText.trim()) {
                      addExclusionRule(newExclusionText);
                      setNewExclusionText('');
                    }
                  }}
                  className="flex items-center gap-2 pt-2 border-t border-[#E6E6E2]"
                >
                  <input
                    type="text"
                    value={newExclusionText}
                    onChange={(e) => setNewExclusionText(e.target.value)}
                    placeholder="e.g. Never claim 100% organic without cert"
                    className="flex-1 px-3 py-1.5 rounded-[6px] border border-[#E6E6E2] text-xs text-[#242424] placeholder:text-[#858585] focus:outline-none focus:border-[#FF7417]"
                  />
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    disabled={!newExclusionText.trim()}
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Add Rule
                  </Button>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Tab 5: Business Documents & Research Repository */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-6 space-y-4">
              <SectionHeader
                title="Business Documents"
                description="Source files indexed for AI synthesis"
                action={
                  <Button variant="primary" size="sm" onClick={() => setDocModalOpen(true)}>
                    <Upload className="w-3.5 h-3.5" />
                    Upload Document
                  </Button>
                }
              />
              {state.brain.documents.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Documents"
                  title="No documents uploaded yet"
                  description="Attach research notes, pitch decks, or product briefs to enrich Business Brain context."
                  actionLabel="Upload First Document"
                  onAction={() => setDocModalOpen(true)}
                />
              ) : (
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] divide-y divide-[#E6E6E2] bw-surface-raised">
                  {state.brain.documents.map((d) => (
                    <div key={d.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="flex items-center gap-3 min-w-0">
                        <FileText className="w-4 h-4 text-[#FF7417] shrink-0" />
                        <div className="min-w-0">
                          <div className="text-sm font-medium text-[#242424] truncate">
                            {d.name}
                          </div>
                          <div className="text-xs text-[#686864]">
                            {d.type} · {d.size} · Uploaded {d.uploadedAt}
                          </div>
                        </div>
                      </div>
                      <StatusBadge status={d.usedByAI ? 'Indexed' : 'Paused'} tone="success" />
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-6 space-y-4">
              <SectionHeader
                title="Research Repository"
                description="Saved dossiers from Idea Intelligence"
              />
              {state.reports.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Research Repository"
                  title="No dossiers saved yet"
                  description="Run a validation workflow in Idea Intelligence to populate your research repository."
                  actionLabel="Open Idea Intelligence"
                  onAction={() => navigate('idea-intelligence')}
                />
              ) : (
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] divide-y divide-[#E6E6E2] bw-surface-raised">
                  {state.reports.map((r) => (
                    <div key={r.id} className="p-4 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-semibold text-[#242424] truncate">
                          {r.title}
                        </div>
                        <div className="text-xs text-[#686864] mt-0.5">
                          {r.industry} · {r.createdAt} · {r.overallConfidence} confidence
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => navigate('idea-intelligence', { reportId: r.id })}
                        className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] shrink-0 cursor-pointer"
                      >
                        Open Report →
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Tab 6: Strategic Decisions & Business History */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <SectionHeader
                title="Strategic Decisions"
                description="Committed positioning and commercial choices"
                action={
                  <Button variant="primary" size="sm" onClick={() => setDecisionModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    Log Decision
                  </Button>
                }
              />
              {state.brain.decisions.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Strategic Log"
                  title="No strategic decisions recorded yet"
                  description="Log pricing, positioning, or channel decisions so downstream AI workflows respect committed choices."
                  actionLabel="Record First Decision"
                  onAction={() => setDecisionModalOpen(true)}
                />
              ) : (
                <div className="space-y-3">
                  {state.brain.decisions.map((dec) => (
                    <div
                      key={dec.id}
                      className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised"
                    >
                      <div className="flex items-center justify-between gap-2 text-xs text-[#686864]">
                        <span className="font-medium text-[#C44D00]">{dec.department}</span>
                        <span className="font-mono-num">{dec.decidedAt}</span>
                      </div>
                      <h3 className="font-heading text-base font-bold text-[#242424] mt-1">
                        {dec.title}
                      </h3>
                      <p className="text-xs text-[#686864] mt-1.5 leading-relaxed">
                        {dec.rationale}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SectionHeader
                title="Business History"
                description="Chronological intelligence log"
              />
              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised">
                <Timeline
                  items={state.brain.history.map((h, i) => ({
                    id: h.id,
                    date: h.date,
                    title: h.event,
                    subtitle: h.department,
                    active: i === 0,
                  }))}
                />
              </div>
            </div>
          </div>
        )}
      </FluidTransition>

      {/* Modals */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Business Brain Context"
        subtitle="Changes immediately propagate to Idea Intelligence, Brand Studio, and Growth Planner."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Business Name" htmlFor="bb-edit-name">
              <Input
                id="bb-edit-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </Field>
            <Field label="Tagline" htmlFor="bb-edit-tagline">
              <Input
                id="bb-edit-tagline"
                type="text"
                value={formTagline}
                onChange={(e) => setFormTagline(e.target.value)}
              />
            </Field>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Industry" htmlFor="bb-edit-industry">
              <Input
                id="bb-edit-industry"
                type="text"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
              />
            </Field>
            <Field label="Stage" htmlFor="bb-edit-stage">
              <Select
                id="bb-edit-stage"
                value={formStage}
                onChange={(e) => setFormStage(e.target.value as BusinessBrainData['stage'])}
              >
                <option value="Idea Stage">Idea Stage</option>
                <option value="Pre-Launch">Pre-Launch</option>
                <option value="Early Traction">Early Traction</option>
                <option value="Growing Business">Growing Business</option>
                <option value="Established">Established</option>
              </Select>
            </Field>
            <Field label="Location" htmlFor="bb-edit-location">
              <Input
                id="bb-edit-location"
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Website URL" htmlFor="bb-edit-website">
            <Input
              id="bb-edit-website"
              type="text"
              value={formWebsite}
              onChange={(e) => setFormWebsite(e.target.value)}
              placeholder="https://"
            />
          </Field>
          <Field label="Overview Summary" htmlFor="bb-edit-summary">
            <Textarea
              id="bb-edit-summary"
              rows={3}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
            />
          </Field>
          <Field label="Brand Positioning" htmlFor="bb-edit-positioning">
            <Textarea
              id="bb-edit-positioning"
              rows={2}
              value={formPositioning}
              onChange={(e) => setFormPositioning(e.target.value)}
            />
          </Field>
          <Field label="Revenue Model" htmlFor="bb-edit-revenue">
            <Input
              id="bb-edit-revenue"
              type="text"
              value={formRevenueModel}
              onChange={(e) => setFormRevenueModel(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="secondary" size="sm" onClick={() => setEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Changes
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Add Product or Service"
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <Field label="Product / Service Name" htmlFor="bb-prod-name">
            <Input
              id="bb-prod-name"
              type="text"
              required
              value={prodName}
              onChange={(e) => setProdName(e.target.value)}
              placeholder="e.g. Pour-Over Starter Kit"
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category" htmlFor="bb-prod-cat">
              <Input
                id="bb-prod-cat"
                type="text"
                value={prodCat}
                onChange={(e) => setProdCat(e.target.value)}
              />
            </Field>
            <Field label="Price Range" htmlFor="bb-prod-price">
              <Input
                id="bb-prod-price"
                type="text"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="$24 – $32"
              />
            </Field>
          </div>
          <Field label="Description" htmlFor="bb-prod-desc">
            <Textarea
              id="bb-prod-desc"
              rows={3}
              value={prodDesc}
              onChange={(e) => setProdDesc(e.target.value)}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setProductModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Add Offering
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Upload Business Document"
      >
        <form onSubmit={handleAddDoc} className="space-y-4">
          <Field label="Document Filename" htmlFor="bb-doc-name">
            <Input
              id="bb-doc-name"
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Investor_Deck_Nov2026.pdf"
            />
          </Field>
          <Field label="Document Type" htmlFor="bb-doc-type">
            <Select
              id="bb-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value as typeof docType)}
            >
              <option value="PDF">PDF</option>
              <option value="Deck">Deck</option>
              <option value="Research">Research</option>
              <option value="Brand Brief">Brand Brief</option>
              <option value="Spreadsheet">Spreadsheet</option>
            </Select>
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Attach to Brain
            </Button>
          </div>
        </form>
      </Modal>

      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Add Business Goal">
        <form onSubmit={handleAddGoal} className="space-y-4">
          <Field label="Objective Statement" htmlFor="bb-goal-text">
            <Input
              id="bb-goal-text"
              type="text"
              required
              value={newGoalText}
              onChange={(e) => setNewGoalText(e.target.value)}
              placeholder="e.g. Launch holiday corporate gifting campaign before Dec 5"
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setGoalModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Goal
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        title="Add Customer Persona"
      >
        <form onSubmit={handleAddPersona} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Persona Name" htmlFor="bb-per-name">
              <Input
                id="bb-per-name"
                type="text"
                required
                value={personaName}
                onChange={(e) => setPersonaName(e.target.value)}
                placeholder="e.g. Boutique Studio Founder"
              />
            </Field>
            <Field label="Segment" htmlFor="bb-per-seg">
              <Input
                id="bb-per-seg"
                type="text"
                value={personaSegment}
                onChange={(e) => setPersonaSegment(e.target.value)}
              />
            </Field>
          </div>
          <Field label="Key Pain Points (comma-separated)" htmlFor="bb-per-pain">
            <Input
              id="bb-per-pain"
              type="text"
              value={personaPain}
              onChange={(e) => setPersonaPain(e.target.value)}
              placeholder="e.g. Unpredictable lead times, inconsistent quality"
            />
          </Field>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Buying Triggers" htmlFor="bb-per-trig">
              <Input
                id="bb-per-trig"
                type="text"
                value={personaTrigger}
                onChange={(e) => setPersonaTrigger(e.target.value)}
                placeholder="e.g. Fast trial pack"
              />
            </Field>
            <Field label="Willingness to Pay" htmlFor="bb-per-wtp">
              <Input
                id="bb-per-wtp"
                type="text"
                value={personaWtp}
                onChange={(e) => setPersonaWtp(e.target.value)}
              />
            </Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setPersonaModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Persona
            </Button>
          </div>
        </form>
      </Modal>

      <Modal
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title="Log Strategic Decision"
      >
        <form onSubmit={handleAddDecision} className="space-y-4">
          <Field label="Decision Headline" htmlFor="bb-dec-title">
            <Input
              id="bb-dec-title"
              type="text"
              required
              value={decTitle}
              onChange={(e) => setDecTitle(e.target.value)}
              placeholder="e.g. Prioritize 14-day discovery trial over discounting"
            />
          </Field>
          <Field label="Strategic Rationale" htmlFor="bb-dec-rat">
            <Textarea
              id="bb-dec-rat"
              rows={3}
              value={decRationale}
              onChange={(e) => setDecRationale(e.target.value)}
              placeholder="Why this direction beats competing alternatives..."
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDecisionModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Record Decision
            </Button>
          </div>
        </form>
      </Modal>

      <JourneyNextStep currentRoute="business-brain" />
    </div>
  );
};
