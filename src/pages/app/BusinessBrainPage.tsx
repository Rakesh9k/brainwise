import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  Edit3,
  FileText,
  Globe,
  History,
  Info,
  Plus,
  RefreshCw,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  Trash2,
  TrendingUp,
  Upload,
  X,
  GitCompare,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import { calculateBrainCompleteness } from '../../utils/logic';
import { calculateBusinessIntelligenceScore } from '../../utils/intelligenceScore';
import type {
  BusinessIntelligenceScore,
  IntelligenceDimensionKey,
  IntelligenceScoreHistoryEntry,
  IntelligenceImprovementRecommendation,
} from '../../types/intelligenceScore';
import type {
  BusinessBrainData,
  FactProvenanceItem,
  ProductServiceItem,
  CustomerPersona,
  VerificationQueueItem,
  BrandProfileData,
  BusinessResourcesAndConstraints,
  MultiDocDiscrepancyItem,
  DepartmentRegroundingAlert,
} from '../../types/brainwise';
import { apiClient } from '../../services/apiClient';
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

type BrainTab =
  | 'overview'
  | 'products'
  | 'audience'
  | 'brand'
  | 'strategy'
  | 'documents'
  | 'verification'
  | 'history';

const BRAIN_TAB_LABELS: Record<BrainTab, string> = {
  overview: 'Overview & Identity',
  products: 'Products & Services',
  audience: 'Customer Intelligence',
  brand: 'Brand Intelligence',
  strategy: 'Strategy & Constraints',
  documents: 'Documents & Extractions',
  verification: 'Verification Queue',
  history: 'Decisions & History',
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
    showToast,
    departmentResetNonce,
  } = useBrainWise();

  const [activeTab, setActiveTab] = useState<BrainTab>('overview');

  // Modals
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [productModalOpen, setProductModalOpen] = useState(false);
  const [importModalOpen, setImportModalOpen] = useState(false);
  const [personaModalOpen, setPersonaModalOpen] = useState(false);
  const [brandModalOpen, setBrandModalOpen] = useState(false);
  const [constraintsModalOpen, setConstraintsModalOpen] = useState(false);
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [urlModalOpen, setUrlModalOpen] = useState(false);
  const [goalModalOpen, setGoalModalOpen] = useState(false);
  const [decisionModalOpen, setDecisionModalOpen] = useState(false);
  const [verifyEditModalOpen, setVerifyEditModalOpen] = useState(false);

  // Cross-Department Cascade Alerts State
  const [regroundingAlerts, setRegroundingAlerts] = useState<DepartmentRegroundingAlert[]>([
    {
      taskId: 'task_draft_ad_copy_q4',
      department: 'COPYWRITING',
      objective: 'Draft Social Ad Copy for Q4 Campaign',
      requestedAction: 'GENERATE_AD_COPY',
      regroundingRequired: true,
      regroundingReason:
        'Core Business Brain pricing or positioning was updated. Active draft requires re-grounding before publication.',
      regroundingFields: ['products', 'brandPositioning'],
      flaggedAt: new Date().toISOString(),
    },
    {
      taskId: 'task_ad_poster_banner',
      department: 'ADVERTISING',
      objective: 'Generate SVG Poster with pricing banner',
      requestedAction: 'GENERATE_SVG_BANNER',
      regroundingRequired: true,
      regroundingReason:
        'Core Business Brain pricing was updated. Active poster requires re-grounding before distribution.',
      regroundingFields: ['products'],
      flaggedAt: new Date().toISOString(),
    },
  ]);

  // Multi-Doc Discrepancy Matrix State
  const [discrepancyMatrix, setDiscrepancyMatrix] = useState<MultiDocDiscrepancyItem[]>([
    {
      discrepancyId: 'disc_pricing_specialty_beans',
      fieldKey: 'product:Solstice Signature Coffee Beans',
      domain: 'pricing',
      currentBrainValue: '$18 – $26 / month',
      severity: 'CRITICAL',
      recommendedSource: 'Pitch_Deck_v2_2026.pdf',
      recommendedValue: '$22 – $28 / month',
      recommendationRationale:
        'Recommended from Pitch_Deck_v2_2026.pdf based on highest extraction confidence (94%) and recency (Nov 2026).',
      status: 'UNRESOLVED',
      sources: [
        {
          sourceDocument: 'Pitch_Deck_v2_2026.pdf',
          value: '$22 – $28 / month',
          confidence: 0.94,
          extractedAt: '2026-11-20T10:00:00Z',
        },
        {
          sourceDocument: 'Legacy_Wholesale_Catalog.pdf',
          value: '$15 – $20 / month',
          confidence: 0.76,
          extractedAt: '2026-08-15T14:30:00Z',
        },
      ],
    },
    {
      discrepancyId: 'disc_positioning_usp',
      fieldKey: 'brandPositioning',
      domain: 'positioning',
      currentBrainValue: 'Subscription-first craft coffee roastery for remote knowledge workers',
      severity: 'HIGH',
      recommendedSource: 'Founder_Strategy_Deck.pdf',
      recommendedValue:
        'Direct farm-to-cup single-origin craft roast subscription with 48h dispatch',
      recommendationRationale:
        'Founder_Strategy_Deck.pdf has 91% confidence and explicit founder alignment.',
      status: 'UNRESOLVED',
      sources: [
        {
          sourceDocument: 'Founder_Strategy_Deck.pdf',
          value: 'Direct farm-to-cup single-origin craft roast subscription with 48h dispatch',
          confidence: 0.91,
          extractedAt: '2026-11-18T09:15:00Z',
        },
        {
          sourceDocument: 'Website_Landing_Scrape',
          value: 'Artisan micro-batch coffee roasters offering weekly bean delivery',
          confidence: 0.82,
          extractedAt: '2026-11-10T12:00:00Z',
        },
      ],
    },
  ]);

  const handleAcknowledgeAllRegrounding = () => {
    setRegroundingAlerts([]);
  };

  const handleResolveDiscrepancy = (
    discrepancyId: string,
    _acceptedSource: string,
    acceptedValue: unknown
  ) => {
    setDiscrepancyMatrix((prev) =>
      prev.map((item) =>
        item.discrepancyId === discrepancyId
          ? {
              ...item,
              status: 'RESOLVED_ACCEPTED_DOC',
              resolvedValue: acceptedValue,
              resolvedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  const handleKeepBrainDiscrepancy = (discrepancyId: string) => {
    setDiscrepancyMatrix((prev) =>
      prev.map((item) =>
        item.discrepancyId === discrepancyId
          ? {
              ...item,
              status: 'RESOLVED_KEPT_BRAIN',
              resolvedValue: item.currentBrainValue,
              resolvedAt: new Date().toISOString(),
            }
          : item
      )
    );
  };

  // Exclusion rule form
  const [newExclusionText, setNewExclusionText] = useState('');

  // Department reset
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

  // Edit Business Identity Form
  const [formName, setFormName] = useState(state.brain.businessName);
  const [formLegalName, setFormLegalName] = useState(state.brain.legalName || '');
  const [formDisplayName, setFormDisplayName] = useState(state.brain.displayName || '');
  const [formTagline, setFormTagline] = useState(state.brain.tagline);
  const [formIndustry, setFormIndustry] = useState(state.brain.industry);
  const [formSubIndustry, setFormSubIndustry] = useState(state.brain.subIndustry || '');
  const [formStage, setFormStage] = useState<BusinessBrainData['stage']>(state.brain.stage);
  const [formSize, setFormSize] = useState<BusinessBrainData['businessSize']>(
    state.brain.businessSize || 'Solo Founder'
  );
  const [formOperationType, setFormOperationType] = useState<BusinessBrainData['operationType']>(
    state.brain.operationType || 'hybrid'
  );
  const [formLocation, setFormLocation] = useState(state.brain.location);
  const [formServiceAreas, setFormServiceAreas] = useState(
    (state.brain.serviceAreas || []).join(', ')
  );
  const [formWebsite, setFormWebsite] = useState(state.brain.website);
  const [formHours, setFormHours] = useState(state.brain.operatingHours || '');
  const [formSummary, setFormSummary] = useState(state.brain.overviewSummary);
  const [formStrengths, setFormStrengths] = useState((state.brain.strengths || []).join('\n'));
  const [formWeaknesses, setFormWeaknesses] = useState((state.brain.weaknesses || []).join('\n'));

  // Add Product / Service Form
  const [prodName, setProdName] = useState('');
  const [prodSku, setProdSku] = useState('');
  const [prodCat, setProdCat] = useState('Products');
  const [prodSubCat, setProdSubCat] = useState('');
  const [prodPrice, setProdPrice] = useState('');
  const [prodCost, setProdCost] = useState('');
  const [prodMargin, setProdMargin] = useState('');
  const [prodDesc, setProdDesc] = useState('');
  const [prodTarget, setProdTarget] = useState('');
  const [prodDiff, setProdDiff] = useState('');
  const [prodAvailability, setProdAvailability] = useState<
    'in_stock' | 'out_of_stock' | 'preorder' | 'discontinued'
  >('in_stock');
  const [prodPricingStructure, setProdPricingStructure] = useState<
    'one-time' | 'recurring' | 'tiered' | 'usage-based'
  >('one-time');

  // Catalogue Import Form
  const [importText, setImportText] = useState('');
  const [importOverwrite, setImportOverwrite] = useState(false);
  const [importMessage, setImportMessage] = useState<string | null>(null);

  // Add Customer Persona Form
  const [personaName, setPersonaName] = useState('');
  const [personaSegment, setPersonaSegment] = useState('Primary Buyer');
  const [personaNeeds, setPersonaNeeds] = useState('');
  const [personaPain, setPersonaPain] = useState('');
  const [personaMotivations, setPersonaMotivations] = useState('');
  const [personaTriggers, setPersonaTriggers] = useState('');
  const [personaObjections, setPersonaObjections] = useState('');
  const [personaChannels, setPersonaChannels] = useState('');
  const [personaPreferences, setPersonaPreferences] = useState('');
  const [personaFeedback, setPersonaFeedback] = useState('');
  const [personaWtp, setPersonaWtp] = useState('$50–$100 / mo');

  // Brand Intelligence Form
  const brandProf = state.brain.brandProfile || {};
  const [brandLogo, setBrandLogo] = useState(brandProf.logoUrls?.primary || '');
  const [brandColorPrimary, setBrandColorPrimary] = useState(
    brandProf.colorPalette?.primary || '#FF7417'
  );
  const [brandColorSecondary, setBrandColorSecondary] = useState(
    brandProf.colorPalette?.secondary || '#C44D00'
  );
  const [brandColorAccent, setBrandColorAccent] = useState(
    brandProf.colorPalette?.accent || '#FF9A45'
  );
  const [brandFontHeading, setBrandFontHeading] = useState(
    brandProf.typography?.headingFont || 'Cabinet Grotesk'
  );
  const [brandFontBody, setBrandFontBody] = useState(
    brandProf.typography?.bodyFont || 'Plus Jakarta Sans'
  );
  const [brandVoice, setBrandVoice] = useState(
    (brandProf.brandVoice || ['Authoritative', 'Approachable', 'Strategic']).join(', ')
  );
  const [brandTone, setBrandTone] = useState(
    (brandProf.brandTone || ['Executive', 'Precise']).join(', ')
  );
  const [brandVisual, setBrandVisual] = useState(
    brandProf.visualGuidelines || 'Clean editorial typography with warm tactile orange highlights'
  );
  const [brandLanguage, setBrandLanguage] = useState(brandProf.preferredLanguage || 'English (US)');
  const [brandWordsUse, setBrandWordsUse] = useState(
    (brandProf.wordsToUse || ['Engineered', 'Deterministic', 'Autonomous']).join(', ')
  );
  const [brandWordsAvoid, setBrandWordsAvoid] = useState(
    (brandProf.wordsToAvoid || ['Synergy', 'Disruptive', 'Viral']).join(', ')
  );
  const [brandApprovedClaims, setBrandApprovedClaims] = useState(
    (
      brandProf.approvedClaims || [
        'Zero video generation overhead',
        '100% deterministic copy grounding',
      ]
    ).join('\n')
  );
  const [brandRestrictedClaims, setBrandRestrictedClaims] = useState(
    (brandProf.restrictedClaims || ['Never claim proprietary patent without certificate']).join(
      '\n'
    )
  );
  const [brandUsp, setBrandUsp] = useState(
    brandProf.uniqueSellingProposition || state.brain.valueProposition
  );

  // Resources & Constraints Form
  const resConstraints = state.brain.resourcesAndConstraints || {};
  const [budgetMonthly, setBudgetMonthly] = useState(
    resConstraints.marketingBudget?.monthly?.toString() || '3500'
  );
  const [budgetAnnual, setBudgetAnnual] = useState(
    resConstraints.marketingBudget?.annual?.toString() || '42000'
  );
  const [budgetCurrency, setBudgetCurrency] = useState(
    resConstraints.marketingBudget?.currency || 'USD'
  );
  const [teamCapabilities, setTeamCapabilities] = useState(
    (resConstraints.teamCapabilities || ['Copywriting', 'Design', 'Direct Marketing']).join(', ')
  );
  const [operatingCapacity, setOperatingCapacity] = useState(
    resConstraints.operatingCapacity || 'Up to 50 concurrent client engagements'
  );
  const [geoLimits, setGeoLimits] = useState(
    (resConstraints.geographicLimitations || ['North America', 'Western Europe']).join(', ')
  );
  const [timeLimits, setTimeLimits] = useState(
    (resConstraints.timeConstraints || ['Q4 holiday deadline: Dec 15']).join(', ')
  );
  const [finLimits, setFinLimits] = useState(
    (resConstraints.financialConstraints || ['Fixed ad spend allocation: max $500/day']).join(', ')
  );
  const [opRestrictions, setOpRestrictions] = useState(
    (
      resConstraints.operationalRestrictions || ['No custom manufacturing beyond current suppliers']
    ).join(', ')
  );

  // Document Upload Form
  const [docTitle, setDocTitle] = useState('');
  const [docType, setDocType] = useState<
    'PDF' | 'CSV' | 'Spreadsheet' | 'Brand Brief' | 'Research' | 'Deck'
  >('PDF');
  const [docContentText, setDocContentText] = useState('');
  const [isExtractingDoc, setIsExtractingDoc] = useState(false);

  // URL Extraction Form
  const [urlInput, setUrlInput] = useState('');
  const [isExtractingUrl, setIsExtractingUrl] = useState(false);

  // Add Goal Form
  const [goalTitle, setGoalTitle] = useState('');

  // Add Decision Form
  const [decTitle, setDecTitle] = useState('');
  const [decRationale, setDecRationale] = useState('');

  // Verification Item Edit Form
  const [selectedVerifyItem, setSelectedVerifyItem] = useState<VerificationQueueItem | null>(null);
  const [verifyEditText, setVerifyEditText] = useState('');

  // Local Verification Queue
  const [verificationQueue, setVerificationQueue] = useState<VerificationQueueItem[]>(
    state.brain.verificationQueue || [
      {
        itemId: 'vq-1',
        domain: 'products',
        fieldKey: 'Single Origin Cold Brew Kegs',
        proposedValue: {
          name: 'Single Origin Cold Brew Kegs',
          price: 120,
          category: 'Beverages',
          currency: 'USD',
          description: 'Nitro cold brew blend kegs for wholesale cafe partners.',
        },
        confidence: 0.94,
        sourceDocument: 'Wholesale_Catalog_2026.pdf',
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      },
      {
        itemId: 'vq-2',
        domain: 'audience',
        fieldKey: 'Boutique Coffee Roasters & Cafes',
        proposedValue: {
          name: 'Boutique Coffee Roasters & Specialty Cafes',
          segment: 'Commercial Wholesale Buyer',
          painPoints: ['Inconsistent roast profiles', 'High MOQ from industrial suppliers'],
          buyingTriggers: ['Flexible bi-weekly deliveries', 'Sample roaster flights'],
        },
        confidence: 0.88,
        sourceDocument: 'PitchDeck_V3.pdf',
        status: 'pending',
        createdAt: new Date().toISOString().slice(0, 10),
      },
    ]
  );

  const completeness = calculateBrainCompleteness(state.brain);

  // Business Intelligence Score State
  const [scoreBreakdownModalOpen, setScoreBreakdownModalOpen] = useState(false);
  const [scoreHistoryModalOpen, setScoreHistoryModalOpen] = useState(false);
  const [scoreModalTab, setScoreModalTab] = useState<'dimensions' | 'recommendations'>(
    'dimensions'
  );
  const [expandedDimension, setExpandedDimension] = useState<IntelligenceDimensionKey | null>(null);
  const [isRecalculatingScore, setIsRecalculatingScore] = useState(false);
  const [serverScore, setServerScore] = useState<BusinessIntelligenceScore | null>(null);
  const [scoreHistoryList, setScoreHistoryList] = useState<IntelligenceScoreHistoryEntry[]>([]);

  // Local fallback / reactive intelligence score calculation
  const localScore = useMemo(() => {
    return calculateBusinessIntelligenceScore({
      workspaceId: state.activeWorkspaceId || 'local',
      profile: state.brain,
      products: state.brain.products,
      personas: state.brain.personas,
      documents: state.brain.documents,
      provenance: state.brain.provenance,
      strategicMemory: state.brain.strategicMemory,
      resourcesAndConstraints: state.brain.resourcesAndConstraints,
      goals: state.brain.primaryGoals,
      competitors: state.competitors,
    });
  }, [state.brain, state.competitors, state.activeWorkspaceId]);

  const intelligenceScore = serverScore || localScore;

  // Sync with authoritative backend intelligence score
  useEffect(() => {
    if (state.activeWorkspaceId) {
      apiClient
        .getIntelligenceScore(state.activeWorkspaceId)
        .then((res) => {
          if (res) setServerScore(res);
        })
        .catch(() => {});
      apiClient
        .getIntelligenceScoreHistory(state.activeWorkspaceId)
        .then((hist) => {
          if (Array.isArray(hist)) setScoreHistoryList(hist);
        })
        .catch(() => {});
    }
  }, [state.activeWorkspaceId, state.brain]);

  const handleRecalculateScore = async () => {
    setIsRecalculatingScore(true);
    try {
      if (state.activeWorkspaceId) {
        const fresh = await apiClient.recalculateIntelligenceScore(
          state.activeWorkspaceId,
          undefined,
          'MANUAL_RECALCULATION'
        );
        setServerScore(fresh);
        const hist = await apiClient.getIntelligenceScoreHistory(state.activeWorkspaceId);
        if (Array.isArray(hist)) setScoreHistoryList(hist);
      } else {
        setServerScore(localScore);
      }
    } finally {
      setIsRecalculatingScore(false);
    }
  };

  const handleExecuteRecommendation = (rec: IntelligenceImprovementRecommendation) => {
    setScoreBreakdownModalOpen(false);
    if (rec.targetRoute && rec.targetRoute !== 'business-brain') {
      navigate(rec.targetRoute as any);
      return;
    }
    if (rec.targetTab) {
      setActiveTab(rec.targetTab as BrainTab);
      if (rec.targetTab === 'products' && rec.actionType === 'input') {
        setProductModalOpen(true);
      } else if (rec.targetTab === 'audience' && rec.actionType === 'input') {
        setPersonaModalOpen(true);
      } else if (rec.targetTab === 'brand') {
        setBrandModalOpen(true);
      } else if (rec.targetTab === 'strategy' && rec.actionType === 'input') {
        setGoalModalOpen(true);
      } else if (rec.targetTab === 'overview' && rec.actionType === 'input') {
        setEditModalOpen(true);
      }
    }
  };

  // Handlers
  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrain({
      businessName: formName.trim() || state.brain.businessName,
      legalName: formLegalName.trim(),
      displayName: formDisplayName.trim(),
      tagline: formTagline.trim(),
      industry: formIndustry.trim() || state.brain.industry,
      subIndustry: formSubIndustry.trim(),
      stage: formStage,
      businessSize: formSize,
      operationType: formOperationType,
      location: formLocation.trim(),
      serviceAreas: formServiceAreas
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      website: (formWebsite || '').trim(),
      operatingHours: formHours.trim(),
      overviewSummary: formSummary.trim(),
      strengths: formStrengths
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      weaknesses: formWeaknesses
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
    });
    setEditModalOpen(false);
  };

  const handleAddProduct = (e: React.FormEvent) => {
    e.preventDefault();
    if (!prodName.trim()) return;
    const newProd: ProductServiceItem = {
      id: `prod-${Date.now()}`,
      name: prodName.trim(),
      sku: prodSku.trim() || undefined,
      category: prodCat.trim() || 'Products',
      subcategory: prodSubCat.trim() || undefined,
      priceRange: prodPrice ? `$${prodPrice}` : 'Custom pricing',
      price: Number(prodPrice) || 0,
      cost: Number(prodCost) || 0,
      margin: Number(prodMargin) || undefined,
      marginEstimate: prodMargin ? `${prodMargin}%` : 'TBD',
      description: prodDesc || 'Added directly to Business Brain catalog.',
      targetCustomer: prodTarget.trim() || undefined,
      differentiators: prodDiff ? [prodDiff.trim()] : undefined,
      availability: prodAvailability,
      pricingStructure: prodPricingStructure,
      source: 'USER_CONFIRMED',
    };
    updateBrain({
      products: [...state.brain.products, newProd],
    });
    setProdName('');
    setProdSku('');
    setProdPrice('');
    setProdCost('');
    setProdMargin('');
    setProdDesc('');
    setProdTarget('');
    setProdDiff('');
    setProductModalOpen(false);
  };

  const handleImportCatalogue = (e: React.FormEvent) => {
    e.preventDefault();
    if (!importText.trim()) return;

    try {
      const lines = importText
        .split('\n')
        .map((l) => l.trim())
        .filter(Boolean);
      const parsedItems: ProductServiceItem[] = [];

      // Check if CSV
      if (lines[0].includes(',')) {
        const headers = lines[0]
          .toLowerCase()
          .split(',')
          .map((h) => h.trim());
        const nameIdx = headers.findIndex((h) => h.includes('name') || h.includes('item'));
        const priceIdx = headers.findIndex((h) => h.includes('price') || h.includes('rate'));
        const catIdx = headers.findIndex((h) => h.includes('cat') || h.includes('dept'));
        const skuIdx = headers.findIndex((h) => h.includes('sku') || h.includes('code'));
        const descIdx = headers.findIndex((h) => h.includes('desc'));

        for (let i = 1; i < lines.length; i++) {
          const cols = lines[i].split(',').map((c) => c.trim().replace(/^["']|["']$/g, ''));
          const name = cols[nameIdx !== -1 ? nameIdx : 0];
          if (name) {
            const priceVal = cols[priceIdx !== -1 ? priceIdx : 1] || '0';
            parsedItems.push({
              id: `prod-import-${Date.now()}-${i}`,
              name,
              sku: cols[skuIdx] || undefined,
              category: cols[catIdx !== -1 ? catIdx : 2] || 'Imported Offerings',
              priceRange: `$${priceVal}`,
              price: parseFloat(priceVal.replace(/[^0-9.]/g, '')) || 0,
              description: cols[descIdx !== -1 ? descIdx : 3] || 'Imported via catalogue file.',
              marginEstimate: 'Standard',
              availability: 'in_stock',
              pricingStructure: 'one-time',
              source: 'USER_CONFIRMED',
            });
          }
        }
      } else {
        // Plain list fallback
        lines.forEach((line, idx) => {
          parsedItems.push({
            id: `prod-import-${Date.now()}-${idx}`,
            name: line,
            category: 'Imported Offerings',
            priceRange: 'Variable',
            description: 'Imported from line entry.',
            marginEstimate: 'TBD',
            availability: 'in_stock',
            pricingStructure: 'one-time',
            source: 'USER_CONFIRMED',
          });
        });
      }

      // Duplicate detection against existing products
      const existingNames = new Set(state.brain.products.map((p) => p.name.toLowerCase()));
      const duplicates = parsedItems.filter((p) => existingNames.has(p.name.toLowerCase()));

      let finalProducts = [...state.brain.products];
      if (importOverwrite) {
        // Update existing matching items
        const importedMap = new Map(parsedItems.map((p) => [p.name.toLowerCase(), p]));
        finalProducts = finalProducts.map((p) => importedMap.get(p.name.toLowerCase()) || p);
        const newOnly = parsedItems.filter((p) => !existingNames.has(p.name.toLowerCase()));
        finalProducts = [...finalProducts, ...newOnly];
      } else {
        // Exclude duplicate items from re-creation
        const newOnly = parsedItems.filter((p) => !existingNames.has(p.name.toLowerCase()));
        finalProducts = [...finalProducts, ...newOnly];
      }

      updateBrain({ products: finalProducts });
      setImportMessage(
        `Import complete: ${parsedItems.length} items parsed. ${duplicates.length} duplicate(s) detected (${importOverwrite ? 'updated' : 'skipped'}).`
      );
      setTimeout(() => {
        setImportText('');
        setImportMessage(null);
        setImportModalOpen(false);
      }, 1500);
    } catch {
      setImportMessage('Failed to parse catalogue. Please ensure valid CSV or list format.');
    }
  };

  const handleAddPersona = (e: React.FormEvent) => {
    e.preventDefault();
    if (!personaName.trim()) return;
    const newPersona: CustomerPersona = {
      id: `per-${Date.now()}`,
      name: personaName.trim(),
      segment: personaSegment.trim() || 'Core Segment',
      ageOrFirmographics: 'Active category buyer',
      needs: personaNeeds
        ? personaNeeds
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      painPoints: personaPain
        ? personaPain
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['High fragmentation and opaque market pricing'],
      buyingMotivations: personaMotivations
        ? personaMotivations
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      buyingTriggers: personaTriggers
        ? personaTriggers
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : ['Transparent proof and fast initial trial'],
      customerObjections: personaObjections
        ? personaObjections
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      preferredChannels: personaChannels
        ? personaChannels
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      customerPreferences: personaPreferences
        ? personaPreferences
            .split(',')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      feedbackQuotes: personaFeedback
        ? personaFeedback
            .split('\n')
            .map((s) => s.trim())
            .filter(Boolean)
        : undefined,
      willingnessToPay: personaWtp.trim() || 'Standard market rate',
      source: 'USER_CONFIRMED',
    };
    updateBrain({
      personas: [newPersona, ...state.brain.personas],
    });
    setPersonaName('');
    setPersonaNeeds('');
    setPersonaPain('');
    setPersonaMotivations('');
    setPersonaTriggers('');
    setPersonaObjections('');
    setPersonaChannels('');
    setPersonaPreferences('');
    setPersonaFeedback('');
    setPersonaModalOpen(false);
  };

  const handleSaveBrand = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedBrand: BrandProfileData = {
      logoUrls: {
        primary: brandLogo.trim() || undefined,
      },
      colorPalette: {
        primary: brandColorPrimary.trim(),
        secondary: brandColorSecondary.trim(),
        accent: brandColorAccent.trim(),
      },
      typography: {
        headingFont: brandFontHeading.trim(),
        bodyFont: brandFontBody.trim(),
      },
      brandVoice: brandVoice
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      brandTone: brandTone
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      visualGuidelines: brandVisual.trim(),
      preferredLanguage: brandLanguage.trim(),
      wordsToUse: brandWordsUse
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      wordsToAvoid: brandWordsAvoid
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      approvedClaims: brandApprovedClaims
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      restrictedClaims: brandRestrictedClaims
        .split('\n')
        .map((s) => s.trim())
        .filter(Boolean),
      uniqueSellingProposition: brandUsp.trim(),
    };

    updateBrain({
      brandProfile: updatedBrand,
      valueProposition: brandUsp.trim() || state.brain.valueProposition,
    });
    setBrandModalOpen(false);
  };

  const handleSaveConstraints = (e: React.FormEvent) => {
    e.preventDefault();
    const updatedConstraints: BusinessResourcesAndConstraints = {
      marketingBudget: {
        monthly: parseFloat(budgetMonthly) || 0,
        annual: parseFloat(budgetAnnual) || 0,
        currency: budgetCurrency,
      },
      teamCapabilities: teamCapabilities
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      operatingCapacity: operatingCapacity.trim(),
      geographicLimitations: geoLimits
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      timeConstraints: timeLimits
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      financialConstraints: finLimits
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
      operationalRestrictions: opRestrictions
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    };

    updateBrain({
      resourcesAndConstraints: updatedConstraints,
    });
    setConstraintsModalOpen(false);
  };

  const handleUploadDoc = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!docTitle.trim()) return;

    setIsExtractingDoc(true);
    const newDocId = `doc-${Date.now()}`;
    const today = new Date().toISOString().slice(0, 10);

    // Add document to list
    updateBrain({
      documents: [
        {
          id: newDocId,
          name: docTitle.trim(),
          type: docType,
          size: `${(Math.random() * 2 + 0.4).toFixed(1)} MB`,
          uploadedAt: today,
          usedByAI: true,
          confidenceScore: 0.92,
        },
        ...state.brain.documents,
      ],
    });

    // If workspace is active, call backend extraction
    if (state.activeWorkspaceId) {
      try {
        const res = await apiClient.extractDocument(state.activeWorkspaceId, {
          documentName: docTitle.trim(),
          documentContent: docContentText.trim() || `Extracted facts from ${docTitle.trim()}`,
          documentType: docType,
        });
        if (res?.data?.verificationItems && res.data.verificationItems.length > 0) {
          setVerificationQueue((prev) => [...res.data.verificationItems, ...prev]);
        }
      } catch {
        // gracefully handled
      }
    }

    setIsExtractingDoc(false);
    setDocTitle('');
    setDocContentText('');
    setDocModalOpen(false);
  };

  const handleExtractUrl = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!urlInput.trim()) return;

    setIsExtractingUrl(true);
    const today = new Date().toISOString().slice(0, 10);

    if (state.activeWorkspaceId) {
      try {
        const res = await apiClient.extractUrl(state.activeWorkspaceId, urlInput.trim());
        if (res?.data?.verificationItems) {
          setVerificationQueue((prev) => [...res.data.verificationItems, ...prev]);
        }
        updateBrain({
          documents: [
            {
              id: `doc-url-${Date.now()}`,
              name: `Web Scrape: ${new URL(urlInput.trim()).hostname}`,
              type: 'Research',
              size: '0.4 MB',
              uploadedAt: today,
              usedByAI: true,
              confidenceScore: res?.data?.confidence || 0.89,
            },
            ...state.brain.documents,
          ],
        });
      } catch {
        // Fallback simulated web ingestion
        updateBrain({
          documents: [
            {
              id: `doc-url-${Date.now()}`,
              name: `Web Scrape: ${urlInput.trim()}`,
              type: 'Research',
              size: '0.3 MB',
              uploadedAt: today,
              usedByAI: true,
              confidenceScore: 0.85,
            },
            ...state.brain.documents,
          ],
        });
      }
    }

    setIsExtractingUrl(false);
    setUrlInput('');
    setUrlModalOpen(false);
  };

  const handleApproveVerificationItem = (item: VerificationQueueItem) => {
    // Commit verified fact to brain
    if (item.domain === 'products' && item.proposedValue) {
      const prod = item.proposedValue as Partial<ProductServiceItem>;
      if (prod.name) {
        updateBrain({
          products: [
            ...state.brain.products,
            {
              id: `prod-${Date.now()}`,
              name: prod.name,
              category: prod.category || 'Products',
              priceRange: prod.price ? `$${prod.price}` : 'Custom pricing',
              description: prod.description || 'Verified from document extraction queue.',
              marginEstimate: 'Standard',
              source: 'USER_CONFIRMED',
            },
          ],
        });
      }
    } else if (item.domain === 'audience' && item.proposedValue) {
      const per = item.proposedValue as Partial<CustomerPersona>;
      if (per.name) {
        updateBrain({
          personas: [
            {
              id: `per-${Date.now()}`,
              name: per.name,
              segment: per.segment || 'Primary Buyer',
              ageOrFirmographics: 'Verified customer profile',
              painPoints: per.painPoints || ['Category friction'],
              buyingTriggers: per.buyingTriggers || ['Verified benefit'],
              willingnessToPay: per.willingnessToPay || 'Standard',
              source: 'USER_CONFIRMED',
            },
            ...state.brain.personas,
          ],
        });
      }
    }

    setVerificationQueue((prev) => prev.filter((i) => i.itemId !== item.itemId));
  };

  const handleApproveAllVerificationItems = () => {
    const count = verificationQueue.length;
    verificationQueue.forEach((item) => handleApproveVerificationItem(item));
    showToast(`Approved and verified all ${count} staged facts.`);
  };

  const handleRejectVerificationItem = (itemId: string) => {
    setVerificationQueue((prev) => prev.filter((i) => i.itemId !== itemId));
  };

  const handleEditVerifyItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedVerifyItem) return;

    try {
      const parsed = JSON.parse(verifyEditText);
      handleApproveVerificationItem({
        ...selectedVerifyItem,
        proposedValue: parsed,
      });
    } catch {
      // String format
      handleApproveVerificationItem({
        ...selectedVerifyItem,
        proposedValue: verifyEditText,
      });
    }

    setVerifyEditModalOpen(false);
    setSelectedVerifyItem(null);
  };

  return (
    <div className="space-y-6">
      <PageHeader
        meta={
          <span>Last updated {state.brain.lastUpdated} · Synced across workspace departments</span>
        }
        mutedPrefix="Business"
        title="Brain"
        subtitle="The authoritative knowledge foundation powering Idea Intelligence, Competitive Analysis, Brand Studio, and Growth Planner."
        actions={
          <div className="flex items-center gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(true)}>
              <Upload className="w-3.5 h-3.5" />
              Upload Document
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                setFormName(state.brain.businessName);
                setFormLegalName(state.brain.legalName || '');
                setFormDisplayName(state.brain.displayName || '');
                setFormTagline(state.brain.tagline);
                setFormIndustry(state.brain.industry);
                setFormSubIndustry(state.brain.subIndustry || '');
                setFormStage(state.brain.stage);
                setFormSize(state.brain.businessSize || 'Solo Founder');
                setFormOperationType(state.brain.operationType || 'hybrid');
                setFormLocation(state.brain.location);
                setFormServiceAreas((state.brain.serviceAreas || []).join(', '));
                setFormWebsite(state.brain.website);
                setFormHours(state.brain.operatingHours || '');
                setFormSummary(state.brain.overviewSummary);
                setFormStrengths((state.brain.strengths || []).join('\n'));
                setFormWeaknesses((state.brain.weaknesses || []).join('\n'));
                setEditModalOpen(true);
              }}
            >
              <Edit3 className="w-4 h-4" />
              Edit Business Context
            </Button>
          </div>
        }
      />

      {/* Idea Sandbox Mode Banner (Business Brain is Dormant until validation) */}
      {state.brain.activationState === 'DORMANT_SANDBOX' && (
        <div className="rounded-[14px] border border-[#FED7AA] bg-[#FFFBF7] p-4 sm:p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-2xs">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-full bg-[#FFF0E5] border border-[#FED7AA] flex items-center justify-center shrink-0 text-[#C44D00]">
              <Sparkles className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-bold tracking-wider uppercase px-2 py-0.5 rounded-full bg-[#FF7417] text-white">
                  Dormant Mode · Idea Sandbox
                </span>
                <span className="text-xs font-semibold text-[#171717]">
                  Business Brain Activates Upon Idea Validation
                </span>
              </div>
              <p className="text-xs text-[#686864] max-w-2xl leading-relaxed">
                You are currently in exploratory idea mode. Your Business Brain will hatch and
                automatically populate with market-tested products, pricing tiers, and target
                audience once you validate a concept in Idea Intelligence.
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2 shrink-0">
            <Button variant="primary" size="sm" onClick={() => navigate('idea-intelligence')}>
              <Sparkles className="w-3.5 h-3.5" />
              Validate Idea in Idea Intelligence →
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                updateBrain({ activationState: 'ACTIVE_ESTABLISHED' });
                showToast('Switched to Active Existing Business mode.');
              }}
            >
              I have an existing business
            </Button>
          </div>
        </div>
      )}

      {/* Interactive Knowledge Constellation & Completeness Panel */}
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
                Click any node to inspect or refine that domain across connected departments
              </p>
            </div>
            <span className="font-mono-num text-[11px] text-[#858585] hidden sm:inline">
              {completeness.completedSections}/{completeness.totalSections} DOMAINS ACTIVE
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
              x={18}
              y={24}
              label="Offerings"
              sublabel={`${state.brain.products.length}`}
              active={activeTab === 'products'}
              dark
              onClick={() => setActiveTab('products')}
            />
            <InteractiveNode
              x={82}
              y={24}
              label="Audience"
              sublabel={`${state.brain.personas.length}`}
              active={activeTab === 'audience'}
              dark
              onClick={() => setActiveTab('audience')}
            />
            <InteractiveNode
              x={20}
              y={76}
              label="Brand & Truth"
              active={activeTab === 'brand'}
              dark
              onClick={() => setActiveTab('brand')}
            />
            <InteractiveNode
              x={50}
              y={80}
              label="Constraints"
              active={activeTab === 'strategy'}
              dark
              onClick={() => setActiveTab('strategy')}
            />
            <InteractiveNode
              x={80}
              y={76}
              label="Docs & Queue"
              sublabel={`${state.brain.documents.length + verificationQueue.length}`}
              active={activeTab === 'documents' || activeTab === 'verification'}
              dark
              onClick={() => setActiveTab('documents')}
            />
          </div>
        </IntelligenceSurface>

        <div className="lg:col-span-5 rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 flex flex-col justify-between gap-4 bw-surface-raised">
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-1.5">
                <h2 className="font-heading text-base font-semibold text-[#252525]">
                  Business Intelligence Score
                </h2>
                <span
                  title="Deterministic evaluation of business knowledge quality, completeness, verification coverage, and freshness across 8 dimensions."
                  className="cursor-help text-[#858585] hover:text-[#252525]"
                >
                  <Info className="w-3.5 h-3.5" />
                </span>
              </div>
              <StatusBadge
                status={intelligenceScore.readinessLabel}
                tone={
                  intelligenceScore.readinessLabel === 'Fully Grounded' ||
                  intelligenceScore.readinessLabel === 'Strategic Ready'
                    ? 'success'
                    : intelligenceScore.readinessLabel === 'Partially Synced'
                      ? 'accent'
                      : intelligenceScore.readinessLabel === 'Baseline Grounding'
                        ? 'warning'
                        : 'error'
                }
              />
            </div>

            <div className="flex items-baseline justify-between pt-1">
              <div className="flex items-baseline gap-2">
                <span className="font-heading text-3xl sm:text-4xl font-bold text-[#252525]">
                  {intelligenceScore.overallScore}
                </span>
                <span className="text-xs font-semibold text-[#858585]">
                  / 100 · Grade {intelligenceScore.grade}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                {intelligenceScore.scoreDelta ? (
                  <span
                    className={`inline-flex items-center gap-0.5 px-2 py-0.5 rounded text-xs font-semibold ${
                      intelligenceScore.scoreDelta.delta >= 0
                        ? 'bg-[#EAF5EF] text-[#24724E]'
                        : 'bg-[#FBEAE9] text-[#B83232]'
                    }`}
                  >
                    <TrendingUp className="w-3 h-3" />
                    {intelligenceScore.scoreDelta.delta >= 0
                      ? `+${intelligenceScore.scoreDelta.delta}`
                      : intelligenceScore.scoreDelta.delta}{' '}
                    pts
                  </span>
                ) : (
                  <span className="text-[11px] font-mono-num text-[#858585]">
                    v{intelligenceScore.version}
                  </span>
                )}
              </div>
            </div>

            <FluidProgress
              value={intelligenceScore.overallScore}
              label={`${intelligenceScore.overallVerificationCoverage}% facts verified · ${intelligenceScore.overallFreshnessScore}% data freshness`}
              activeShimmer={intelligenceScore.overallScore < 85}
            />

            <div className="grid grid-cols-3 gap-2 pt-1 text-center">
              <div className="rounded-lg border border-[#E6E6E2] bg-[#FAF9F5] p-2">
                <div className="text-[10px] text-[#858585] uppercase tracking-wide">Verified</div>
                <div className="font-mono-num text-xs font-bold text-[#24724E]">
                  {intelligenceScore.overallVerificationCoverage}%
                </div>
              </div>
              <div className="rounded-lg border border-[#E6E6E2] bg-[#FAF9F5] p-2">
                <div className="text-[10px] text-[#858585] uppercase tracking-wide">Freshness</div>
                <div className="font-mono-num text-xs font-bold text-[#252525]">
                  {intelligenceScore.overallFreshnessScore}%
                </div>
              </div>
              <div className="rounded-lg border border-[#E6E6E2] bg-[#FAF9F5] p-2">
                <div className="text-[10px] text-[#858585] uppercase tracking-wide">
                  Critical Gaps
                </div>
                <div
                  className={`font-mono-num text-xs font-bold ${
                    intelligenceScore.criticalMissingCount > 0 ? 'text-[#C44D00]' : 'text-[#24724E]'
                  }`}
                >
                  {intelligenceScore.criticalMissingCount}
                </div>
              </div>
            </div>
          </div>

          <div className="pt-3 border-t border-[#E6E6E2] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setScoreBreakdownModalOpen(true)}
              >
                <BarChart3 className="w-3.5 h-3.5" />8 Dimensions
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setScoreHistoryModalOpen(true)}>
                <History className="w-3.5 h-3.5" />
                History
              </Button>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleRecalculateScore}
              disabled={isRecalculatingScore}
              title="Force deterministic recalculation from persisted Business Brain records"
            >
              <RefreshCw
                className={`w-3.5 h-3.5 ${
                  isRecalculatingScore ? 'animate-spin text-[#FF7417]' : ''
                }`}
              />
              Recalculate
            </Button>
          </div>
        </div>
      </div>

      {/* Automated Cross-Department Cascade Alerts */}
      {regroundingAlerts.length > 0 && (
        <div className="rounded-[12px] border border-[#FBE0C2] bg-[#FFF8EE] p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 bw-surface-raised">
          <div className="flex items-start sm:items-center gap-3 min-w-0">
            <div className="w-8 h-8 rounded-full bg-[#FFE8CC] flex items-center justify-center shrink-0 text-[#C44D00]">
              <ShieldAlert className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-sm font-bold text-[#A83800]">
                  Cross-Department Cascade Alert
                </span>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFE8CC] text-[#8F2B00]">
                  {regroundingAlerts.length} active drafts require re-grounding
                </span>
              </div>
              <p className="text-xs text-[#686864] mt-0.5">
                Recent changes in core Business Brain facts (pricing / brand positioning) rendered
                active drafts in{' '}
                <strong className="text-[#242424]">
                  {Array.from(new Set(regroundingAlerts.map((a) => a.department))).join(', ')}
                </strong>{' '}
                out of alignment. Re-ground drafts before publishing to prevent hallucinations or
                brand drift.
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleAcknowledgeAllRegrounding}
              className="text-xs border-[#FBE0C2] hover:bg-[#FFE8CC]"
            >
              Re-ground All Drafts
            </Button>
          </div>
        </div>
      )}

      {/* Primary Department Navigation Tabs */}
      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as BrainTab)}
        tabs={[
          { id: 'overview', label: 'Overview & Identity' },
          { id: 'products', label: 'Products & Services', count: state.brain.products.length },
          { id: 'audience', label: 'Customer Intelligence', count: state.brain.personas.length },
          { id: 'brand', label: 'Brand Intelligence' },
          { id: 'strategy', label: 'Strategy & Constraints' },
          {
            id: 'documents',
            label: 'Documents & Extractions',
            count: state.brain.documents.length + state.reports.length,
          },
          {
            id: 'verification',
            label: 'Verification Queue',
            count: verificationQueue.length,
          },
          { id: 'history', label: 'Decisions & History' },
        ]}
      />

      <FluidTransition key={activeTab} direction="fade">
        {/* =========================================================================
            TAB 1: OVERVIEW & BUSINESS IDENTITY
        ========================================================================= */}
        {activeTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-5 bw-surface-raised">
              <div className="flex items-center justify-between">
                <SectionHeader
                  title="Business Identity & Profile"
                  description="Authoritative identity parameters powering marketing copy, pitch materials, and legal boundaries"
                />
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setEditModalOpen(true)}
                  className="text-[#C44D00]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Brand Name</span>
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
                    <span className="text-xs text-[#686864]">Legal Entity Name</span>
                    <FactProvenanceBadge
                      fieldKey="legalName"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">
                    {state.brain.legalName || state.brain.businessName}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Industry &amp; Sub-Industry</span>
                    <FactProvenanceBadge
                      fieldKey="industry"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">
                    {state.brain.industry}
                    {state.brain.subIndustry ? ` · ${state.brain.subIndustry}` : ''}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">Stage &amp; Scale</span>
                    <FactProvenanceBadge
                      fieldKey="stage"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">
                    {state.brain.stage} · {state.brain.businessSize || 'Solo / Boutique'}
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-[#686864]">HQ Location &amp; Operation</span>
                    <FactProvenanceBadge
                      fieldKey="location"
                      provenance={state.brain.provenance}
                      onConfirm={confirmFact}
                    />
                  </div>
                  <div className="font-semibold text-[#242424] mt-0.5">
                    {state.brain.location} ({state.brain.operationType || 'hybrid'})
                  </div>
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
                  <div className="font-medium text-[#C44D00] mt-0.5 truncate flex items-center gap-1">
                    <Globe className="w-3.5 h-3.5 shrink-0" />
                    <span>{state.brain.website || 'Not yet published'}</span>
                  </div>
                </div>

                <div className="sm:col-span-2">
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
                <div className="text-xs text-[#686864]">Executive Overview Summary</div>
                <p className="text-sm text-[#242424] leading-relaxed mt-1">
                  {state.brain.overviewSummary}
                </p>
              </div>

              {/* Strengths & Weaknesses */}
              <div className="pt-4 border-t border-[#E6E6E2] grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <div className="text-xs font-semibold text-[#24724E] mb-1.5 flex items-center gap-1">
                    <Check className="w-3 h-3" /> Core Strengths
                  </div>
                  {!state.brain.strengths || state.brain.strengths.length === 0 ? (
                    <div className="text-xs text-[#858585] italic">No strengths logged yet.</div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {state.brain.strengths.map((str, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]"
                        >
                          {str}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div>
                  <div className="text-xs font-semibold text-[#A85E16] mb-1.5 flex items-center gap-1">
                    <AlertTriangle className="w-3 h-3" /> Operational Vulnerabilities
                  </div>
                  {!state.brain.weaknesses || state.brain.weaknesses.length === 0 ? (
                    <div className="text-xs text-[#858585] italic">
                      No vulnerabilities logged yet.
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5">
                      {state.brain.weaknesses.map((w, idx) => (
                        <span
                          key={idx}
                          className="px-2 py-0.5 rounded text-[11px] bg-[#FFF4E5] text-[#A85E16] border border-[#FBE0C2]"
                        >
                          {w}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* Right: Business Goals & AI Context */}
            <div className="lg:col-span-5 space-y-5">
              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-4 bw-surface-raised">
                <SectionHeader
                  title="Strategic Business Goals"
                  action={
                    <button
                      type="button"
                      onClick={() => setGoalModalOpen(true)}
                      className="inline-flex items-center gap-1 text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add Goal
                    </button>
                  }
                />
                {state.brain.primaryGoals.length === 0 ? (
                  <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-dashed border-[#D0D0C8] text-xs text-[#686864]">
                    No strategic goals added yet. Add your primary revenue, acquisition, or launch
                    target.
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
                  <div className="text-xs font-semibold text-[#242424]">
                    Ground Truth AI Readout
                  </div>
                  <p className="text-xs text-[#686864] mt-1 leading-relaxed">
                    Departments synchronize across {state.brain.products.length} products,{' '}
                    {state.brain.personas.length} personas, {state.brain.documents.length} verified
                    documents, and {verificationQueue.length} pending verification item(s).
                  </p>
                </div>
              </div>

              {/* Missing Information Prompt Banner */}
              {completeness.missingItems.length > 0 && (
                <div className="rounded-[12px] border border-[#FBE0C2] bg-[#FFF8F0] p-5 space-y-3 bw-surface-raised">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#FBE0C2]/80 pb-2.5">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded bg-[#FFE8CC] flex items-center justify-center text-[#FF7417]">
                        <Sparkles className="w-3.5 h-3.5" />
                      </div>
                      <h4 className="font-heading text-xs font-bold text-[#C44D00]">
                        AI Accuracy Calibration: Keep the Business Brain Updated
                      </h4>
                    </div>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                      completeness.percentage >= 80
                        ? 'bg-[#EAF5EF] text-[#24724E]'
                        : completeness.percentage >= 60
                          ? 'bg-[#FFF4E5] text-[#C44D00]'
                          : 'bg-[#FBEAE9] text-[#B83232]'
                    }`}>
                      {completeness.percentage >= 80
                        ? 'High AI Accuracy'
                        : completeness.percentage >= 60
                          ? 'Moderate Accuracy · Incomplete Catalog'
                          : 'Baseline Accuracy · Missing Ground Truth'}
                    </span>
                  </div>
                  <p className="text-xs text-[#5C5C58] leading-relaxed">
                    <strong>Core Principle:</strong> The AI's accuracy is directly proportional to the completeness of your Business Brain profile and product catalog. When catalog items or customer personas are missing, downstream marketing copy and financial plans default to cautious approximations. Complete the items below for 100% verified ground truth:
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1">
                    {completeness.missingItems.map((item, idx) => {
                      const targetTab: BrainTab =
                        item.section === 'Products & Services'
                          ? 'products'
                          : item.section === 'Customer Personas'
                            ? 'audience'
                            : item.section === 'Brand Identity'
                              ? 'brand'
                              : item.section === 'Strategy & Goals'
                                ? 'strategy'
                                : 'overview';
                      return (
                        <div
                          key={idx}
                          className="flex items-center justify-between gap-2 p-2.5 rounded-[8px] bg-white border border-[#FBE0C2] text-xs"
                        >
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="w-1.5 h-1.5 rounded-full bg-[#FF7417] shrink-0" />
                            <span className="font-medium text-[#252525] truncate">
                              {item.section}: {item.prompt}
                            </span>
                          </div>
                          <button
                            type="button"
                            onClick={() => setActiveTab(targetTab)}
                            className="text-[11px] font-bold text-[#FF7417] hover:underline cursor-pointer shrink-0"
                          >
                            Update &rarr;
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 2: PRODUCTS & SERVICES
        ========================================================================= */}
        {activeTab === 'products' && (
          <div className="space-y-4">
            <SectionHeader
              title="Products & Services Catalogue"
              description="Authoritative offerings referenced in pricing models, copy generation, and Brand Studio collateral"
              action={
                <div className="flex items-center gap-2">
                  <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(true)}>
                    <Upload className="w-3.5 h-3.5" />
                    Import Catalogue (CSV)
                  </Button>
                  <Button variant="primary" size="sm" onClick={() => setProductModalOpen(true)}>
                    <Plus className="w-3.5 h-3.5" />
                    Add Offering
                  </Button>
                </div>
              }
            />

            {state.brain.products.length === 0 ? (
              <GuidedActionEmptyCard
                stepLabel="Product Catalog"
                title="No offerings documented yet"
                description="Add your core product, tier, menu dish, or service package so Idea Intelligence and Brand Studio reflect real pricing."
                actionLabel="Add First Offering"
                onAction={() => setProductModalOpen(true)}
              />
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                {state.brain.products.map((p) => (
                  <div
                    key={p.id}
                    className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 flex flex-col justify-between space-y-4 bw-surface-raised"
                  >
                    <div>
                      <div className="flex items-center justify-between text-xs text-[#C44D00] font-medium">
                        <span>
                          {p.category}
                          {p.subcategory ? ` · ${p.subcategory}` : ''}
                        </span>
                        {p.sku && (
                          <span className="text-[10px] font-mono-num text-[#858585]">
                            SKU: {p.sku}
                          </span>
                        )}
                      </div>
                      <h3 className="font-heading text-base font-bold text-[#242424] mt-1">
                        {p.name}
                      </h3>
                      <p className="text-xs text-[#686864] mt-2 leading-relaxed">{p.description}</p>

                      {p.targetCustomer && (
                        <div className="mt-3 text-[11px] text-[#5C5C58]">
                          <strong>Target Customer:</strong> {p.targetCustomer}
                        </div>
                      )}

                      {p.features && p.features.length > 0 && (
                        <div className="mt-2.5 flex flex-wrap gap-1">
                          {p.features.map((feat, i) => (
                            <span
                              key={i}
                              className="px-1.5 py-0.5 rounded text-[10px] bg-[#F5F5F4] text-[#5C5C58] border border-[#E6E6E2]"
                            >
                              {feat}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-[#E6E6E2] flex items-center justify-between text-xs">
                      <div>
                        <div className="font-mono-num font-bold text-[#242424] text-sm">
                          {p.priceRange || (p.price ? `$${p.price}` : 'Custom pricing')}
                        </div>
                        {p.cost !== undefined && p.cost > 0 && (
                          <div className="text-[10px] text-[#858585]">
                            Cost: ${p.cost} · Margin: {p.marginEstimate || `${p.margin}%`}
                          </div>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded text-[10px] font-medium bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]">
                        {p.availability || 'In Stock'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 3: CUSTOMER INTELLIGENCE (AUDIENCE)
        ========================================================================= */}
        {activeTab === 'audience' && (
          <div className="space-y-6">
            <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 bw-surface-raised">
              <div className="flex items-center justify-between">
                <div className="text-xs font-semibold text-[#686864]">Target Audience Boundary</div>
                <FactProvenanceBadge
                  fieldKey="targetAudience"
                  provenance={state.brain.provenance}
                  onConfirm={confirmFact}
                />
              </div>
              <p className="text-sm text-[#242424] mt-1.5 leading-relaxed">
                {state.brain.targetAudience}
              </p>
            </div>

            <SectionHeader
              title="Customer Intelligence & Personas"
              description="Ideal buyer segments, purchase motivations, objections, and verified preferences guiding campaigns"
              action={
                <Button variant="primary" size="sm" onClick={() => setPersonaModalOpen(true)}>
                  <Plus className="w-3.5 h-3.5" />
                  Add Persona
                </Button>
              }
            />

            {state.brain.personas.length === 0 ? (
              <GuidedActionEmptyCard
                stepLabel="Audience Intelligence"
                title="No customer personas mapped yet"
                description="Define your first target buyer profile with real pain points, buying triggers, and preferred channels."
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
                        <div className="flex items-center gap-2">
                          <h3 className="font-heading text-base font-bold text-[#242424]">
                            {per.name}
                          </h3>
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]">
                            {per.source === 'USER_CONFIRMED' ? 'Confirmed Fact' : 'AI Inferred'}
                          </span>
                        </div>
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
                          Buying Triggers & Motivations
                        </div>
                        <ul className="space-y-1.5 text-xs text-[#686864]">
                          {per.buyingTriggers.map((bt, i) => (
                            <li key={i}>• {bt}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    {per.preferredChannels && per.preferredChannels.length > 0 && (
                      <div className="pt-2 border-t border-[#E6E6E2] text-xs">
                        <span className="text-[#858585]">Preferred Channels: </span>
                        <span className="text-[#252525] font-medium">
                          {per.preferredChannels.join(', ')}
                        </span>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 4: BRAND INTELLIGENCE
        ========================================================================= */}
        {activeTab === 'brand' && (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <SectionHeader
                title="Brand Intelligence & Visual Guidelines"
                description="Visual identities, color palettes, approved keywords, and prohibited claims enforced by Truth Check"
              />
              <Button variant="primary" size="sm" onClick={() => setBrandModalOpen(true)}>
                <Edit3 className="w-3.5 h-3.5" />
                Edit Brand Intelligence
              </Button>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Visual System & Colors */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                  <h3 className="font-heading text-sm font-bold text-[#242424]">
                    Brand Color Palette & Swatches
                  </h3>
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3">
                    {[
                      { role: 'Primary', hex: brandColorPrimary },
                      { role: 'Secondary', hex: brandColorSecondary },
                      { role: 'Accent', hex: brandColorAccent },
                      { role: 'Neutral', hex: '#252525' },
                      { role: 'Background', hex: '#FFFFFF' },
                    ].map((col) => (
                      <div
                        key={col.role}
                        className="flex flex-col items-center gap-1.5 text-center"
                      >
                        <div
                          className="w-12 h-12 rounded-full border border-[#D0D0C8] shadow-sm"
                          style={{ backgroundColor: col.hex }}
                        />
                        <span className="text-[11px] font-semibold text-[#252525]">{col.role}</span>
                        <span className="font-mono-num text-[10px] text-[#858585]">{col.hex}</span>
                      </div>
                    ))}
                  </div>

                  <div className="pt-3 border-t border-[#E6E6E2] grid grid-cols-2 gap-4 text-xs">
                    <div>
                      <span className="text-[#858585]">Heading Font: </span>
                      <strong className="text-[#252525]">{brandFontHeading}</strong>
                    </div>
                    <div>
                      <span className="text-[#858585]">Body Font: </span>
                      <strong className="text-[#252525]">{brandFontBody}</strong>
                    </div>
                  </div>
                </div>

                {/* Voice & Tone */}
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised">
                  <h3 className="font-heading text-sm font-bold text-[#242424]">
                    Brand Voice & Tone
                  </h3>
                  <div className="flex flex-wrap gap-1.5">
                    {brandVoice.split(',').map((v, i) => (
                      <span
                        key={i}
                        className="px-2.5 py-1 rounded-md text-xs font-semibold bg-[#FFF4E5] text-[#A85E16] border border-[#FBE0C2]"
                      >
                        {v.trim()}
                      </span>
                    ))}
                  </div>
                  <p className="text-xs text-[#5C5C58] leading-relaxed pt-1">
                    Tone: {brandTone} · Preferred Language: {brandLanguage}
                  </p>
                  <div className="pt-2 border-t border-[#E6E6E2] text-xs text-[#5C5C58]">
                    <strong>Visual Direction:</strong> {brandVisual}
                  </div>
                </div>
              </div>

              {/* Right Column: Words & Guardrails */}
              <div className="lg:col-span-6 space-y-5">
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                  <h3 className="font-heading text-sm font-bold text-[#242424]">
                    Brand Language Guardrails
                  </h3>

                  <div>
                    <div className="text-xs font-semibold text-[#24724E] mb-1.5">Words to Use</div>
                    <div className="flex flex-wrap gap-1.5">
                      {brandWordsUse.split(',').map((w, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-xs bg-[#EAF5EF] text-[#24724E] border border-[#CDE5D7]"
                        >
                          + {w.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div>
                    <div className="text-xs font-semibold text-[#BC3E3E] mb-1.5">
                      Words to Avoid
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {brandWordsAvoid.split(',').map((w, i) => (
                        <span
                          key={i}
                          className="px-2 py-0.5 rounded text-xs bg-[#FDF2F2] text-[#BC3E3E] border border-[#F8D7D7]"
                        >
                          ✕ {w.trim()}
                        </span>
                      ))}
                    </div>
                  </div>

                  <div className="pt-3 border-t border-[#E6E6E2]">
                    <div className="text-xs font-semibold text-[#242424] mb-1">
                      Unique Selling Proposition (USP)
                    </div>
                    <p className="text-xs text-[#5C5C58] leading-relaxed">
                      {brandUsp || state.brain.valueProposition}
                    </p>
                  </div>
                </div>

                {/* Approved & Restricted Claims */}
                <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-3 bw-surface-raised">
                  <h3 className="font-heading text-sm font-bold text-[#242424]">
                    Verified Claims & Restricted Claims
                  </h3>
                  <div className="space-y-2 text-xs">
                    <div>
                      <div className="font-semibold text-[#24724E] flex items-center gap-1 mb-1">
                        <CheckCircle2 className="w-3.5 h-3.5" /> Approved Claims
                      </div>
                      <ul className="space-y-1 text-[#5C5C58]">
                        {brandApprovedClaims.split('\n').map((claim, idx) => (
                          <li key={idx}>• {claim}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="pt-2 border-t border-[#E6E6E2]">
                      <div className="font-semibold text-[#A85E16] flex items-center gap-1 mb-1">
                        <AlertTriangle className="w-3.5 h-3.5" /> Restricted Claims (Blocked by
                        Truth Engine)
                      </div>
                      <ul className="space-y-1 text-[#5C5C58]">
                        {brandRestrictedClaims.split('\n').map((claim, idx) => (
                          <li key={idx}>• {claim}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* =========================================================================
            TAB 5: STRATEGY & CONSTRAINTS
        ========================================================================= */}
        {activeTab === 'strategy' && (
          <div className="space-y-6">
            {/* Core Strategy Blocks */}
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

            {/* Resources & Operational Constraints */}
            <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-6 space-y-4 bw-surface-raised">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#242424]">
                    Resources, Budgets &amp; Operational Constraints
                  </h3>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Defines strict real-world boundaries for recommendations. AI never invents
                    missing financial figures.
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setConstraintsModalOpen(true)}>
                  <Edit3 className="w-3.5 h-3.5" />
                  Edit Constraints
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                <div className="p-3 rounded-lg bg-[#F5F5F4] border border-[#E6E6E2]">
                  <span className="text-[#858585] block">Monthly Marketing Budget</span>
                  <span className="text-base font-bold font-mono-num text-[#242424] mt-0.5 block">
                    ${parseFloat(budgetMonthly).toLocaleString()} {budgetCurrency}
                  </span>
                  <span className="text-[10px] text-[#858585]">
                    Annual allocation: ${parseFloat(budgetAnnual).toLocaleString()}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F5F4] border border-[#E6E6E2]">
                  <span className="text-[#858585] block">Internal Team Capabilities</span>
                  <span className="text-xs font-medium text-[#242424] mt-1 block">
                    {teamCapabilities}
                  </span>
                </div>

                <div className="p-3 rounded-lg bg-[#F5F5F4] border border-[#E6E6E2]">
                  <span className="text-[#858585] block">Operating Capacity</span>
                  <span className="text-xs font-medium text-[#242424] mt-1 block">
                    {operatingCapacity}
                  </span>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-3 border-t border-[#E6E6E2] text-xs">
                <div>
                  <span className="text-[#858585] font-semibold block mb-1">
                    Geographic & Time Limits
                  </span>
                  <p className="text-[#5C5C58]">Regions: {geoLimits}</p>
                  <p className="text-[#5C5C58]">Deadlines: {timeLimits}</p>
                </div>
                <div>
                  <span className="text-[#858585] font-semibold block mb-1">
                    Financial &amp; Operational Boundaries
                  </span>
                  <p className="text-[#5C5C58]">Financial: {finLimits}</p>
                  <p className="text-[#5C5C58]">Operational: {opRestrictions}</p>
                </div>
              </div>
            </div>

            {/* Anti-Fatigue Memory & Truth Engine Prohibited Claims */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 pt-2">
              <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#242424] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-[#FF7417]" />
                    Anti-Fatigue Memory &amp; Angle Saturation
                  </h3>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Tracks marketing angle frequency to eliminate repetitive copywriting angles.
                  </p>
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
                      No angles recorded yet. Generated Brand Studio copy logs automatically.
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

              <div className="lg:col-span-6 rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 space-y-4 bw-surface-raised">
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#242424] flex items-center gap-1.5">
                    <ShieldCheck className="w-4 h-4 text-[#24724E]" />
                    Truth Engine Prohibited Claim Safeguards
                  </h3>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Strict deterministic rules. Breaching any claim triggers automatic remediation
                    or credit protection.
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

        {/* =========================================================================
            TAB 6: DOCUMENTS & EXTRACTIONS
        ========================================================================= */}
        {activeTab === 'documents' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <SectionHeader
                title="Business Documents & Extractions"
                description="Uploaded PDF price sheets, pitch decks, and web pages indexed for AI knowledge synthesis"
                action={
                  <div className="flex items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => setUrlModalOpen(true)}>
                      <Globe className="w-3.5 h-3.5" />
                      Extract URL
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setDocModalOpen(true)}>
                      <Upload className="w-3.5 h-3.5" />
                      Upload File
                    </Button>
                  </div>
                }
              />

              {state.brain.documents.length === 0 ? (
                <GuidedActionEmptyCard
                  stepLabel="Document Repository"
                  title="No documents uploaded yet"
                  description="Upload service catalogues, restaurant menus, pitch decks, or CSV price sheets to extract ground truth facts."
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
                            {d.confidenceScore &&
                              ` · Confidence: ${Math.round(d.confidenceScore * 100)}%`}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <StatusBadge status={d.usedByAI ? 'Indexed' : 'Paused'} tone="success" />
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="lg:col-span-5 space-y-4">
              <SectionHeader
                title="Research Repository"
                description="Saved market validation dossiers from Idea Intelligence"
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

        {/* =========================================================================
            TAB 7: VERIFICATION QUEUE
        ========================================================================= */}
        {activeTab === 'verification' && (
          <div className="space-y-6">
            <SectionHeader
              title="Knowledge Verification Queue"
              description="Review AI-extracted knowledge before elevating facts to authoritative USER_CONFIRMED ground truth"
            />

            {/* Staged Facts & Downstream Campaign Accuracy Banner */}
            <div className="p-4 sm:p-5 rounded-[12px] bg-gradient-to-r from-[#FFFBF8] to-[#F7FBF9] border border-[#E8E2D9] space-y-3 bw-surface-raised">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-start gap-3">
                  <div className="w-8 h-8 rounded-lg bg-[#FF7417]/10 flex items-center justify-center text-[#FF7417] shrink-0 mt-0.5">
                    <ShieldCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-heading text-sm font-bold text-[#171717]">
                      Review Staged Facts for Maximum Campaign Accuracy
                    </h3>
                    <p className="text-xs text-[#5C5C58] mt-0.5 max-w-2xl leading-relaxed">
                      Always review and confirm extracted facts in the verification queue before launching downstream campaigns. Unverified items remain staged as <code className="text-[#A85E16] font-mono font-semibold">AI_INFERRED</code>. Confirming them upgrades them to <code className="text-[#24724E] font-mono font-semibold">USER_CONFIRMED</code>, ensuring downstream copy generation and pricing models use authentic ground truth.
                    </p>
                  </div>
                </div>
                {verificationQueue.length > 0 && (
                  <Button
                    variant="primary"
                    size="sm"
                    className="shrink-0 text-xs"
                    onClick={handleApproveAllVerificationItems}
                  >
                    <Check className="w-3.5 h-3.5" />
                    Approve All ({verificationQueue.length})
                  </Button>
                )}
              </div>
            </div>

            {/* Multi-Doc Discrepancy Matrix Component */}
            <div className="rounded-[14px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-6 space-y-5 bw-surface-raised">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#E6E6E2] pb-4">
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <div className="w-7 h-7 rounded-lg bg-[#FFF4E5] flex items-center justify-center text-[#FF7417]">
                      <GitCompare className="w-4 h-4" />
                    </div>
                    <h3 className="font-heading text-base font-bold text-[#242424]">
                      Multi-Doc Discrepancy Matrix
                    </h3>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF4E5] text-[#C44D00]">
                      {discrepancyMatrix.filter((d) => d.status === 'UNRESOLVED').length}{' '}
                      conflicting facts
                    </span>
                  </div>
                  <p className="text-xs text-[#686864]">
                    Cross-document comparison detects conflicting claims across uploaded pitch
                    decks, legacy catalogs, and Business Brain ground truth. 1-click resolve to
                    enforce founder primacy.
                  </p>
                </div>
              </div>

              {discrepancyMatrix.length === 0 ? (
                <div className="text-center py-6 text-xs text-[#686864]">
                  No cross-document discrepancies detected. All sources are in agreement.
                </div>
              ) : (
                <div className="space-y-4">
                  {discrepancyMatrix.map((item) => {
                    const isResolved = item.status !== 'UNRESOLVED';
                    return (
                      <div
                        key={item.discrepancyId}
                        className={`rounded-[12px] border transition-all p-4 space-y-3.5 ${
                          isResolved
                            ? 'border-[#D1E7DD] bg-[#F7FBF9]'
                            : item.severity === 'CRITICAL'
                              ? 'border-[#FBE0C2] bg-[#FFFBF5]'
                              : 'border-[#E6E6E2] bg-[#FFFFFF]'
                        }`}
                      >
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${
                                item.severity === 'CRITICAL'
                                  ? 'bg-[#FFE8CC] text-[#C44D00]'
                                  : 'bg-[#EDEFE9] text-[#5C5C58]'
                              }`}
                            >
                              {item.domain} · {item.severity}
                            </span>
                            <span className="font-heading text-xs font-bold text-[#242424]">
                              {item.fieldKey}
                            </span>
                          </div>
                          {isResolved ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium bg-[#E8F5E9] text-[#24724E]">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Resolved: {String(item.resolvedValue)} (USER_CONFIRMED)
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-medium text-[#C44D00] bg-[#FFF4E5] px-2 py-0.5 rounded">
                              <Sparkles className="w-3 h-3 text-[#FF7417]" />
                              {item.recommendationRationale}
                            </span>
                          )}
                        </div>

                        {/* Side-by-Side Comparison Columns */}
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 pt-1">
                          {/* Current Brain Baseline */}
                          <div className="rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] p-3 space-y-2 flex flex-col justify-between">
                            <div>
                              <div className="text-[11px] font-bold text-[#686864] uppercase tracking-wider flex items-center justify-between">
                                <span>Current Business Brain</span>
                                <span className="text-[10px] text-[#858585]">Baseline</span>
                              </div>
                              <div className="text-xs font-medium text-[#242424] mt-1.5 font-mono break-words">
                                {item.currentBrainValue !== undefined
                                  ? String(item.currentBrainValue)
                                  : 'Not configured'}
                              </div>
                            </div>
                            {!isResolved && (
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleKeepBrainDiscrepancy(item.discrepancyId)}
                                className="w-full text-xs"
                              >
                                Keep Brain Value
                              </Button>
                            )}
                          </div>

                          {/* Source Documents */}
                          {item.sources.map((src, idx) => {
                            const isRecommended = src.sourceDocument === item.recommendedSource;
                            return (
                              <div
                                key={idx}
                                className={`rounded-[10px] border p-3 space-y-2 flex flex-col justify-between ${
                                  isRecommended && !isResolved
                                    ? 'border-[#FFB26B] bg-[#FFF8EE]'
                                    : 'border-[#E6E6E2] bg-[#FFFFFF]'
                                }`}
                              >
                                <div>
                                  <div className="text-[11px] font-bold text-[#686864] truncate flex items-center justify-between">
                                    <span className="truncate">{src.sourceDocument}</span>
                                    <span className="text-[10px] font-mono text-[#FF7417] shrink-0">
                                      {Math.round(src.confidence * 100)}% conf
                                    </span>
                                  </div>
                                  <div className="text-xs font-semibold text-[#242424] mt-1.5 font-mono break-words">
                                    {String(src.value)}
                                  </div>
                                </div>
                                {!isResolved && (
                                  <Button
                                    variant={isRecommended ? 'primary' : 'secondary'}
                                    size="sm"
                                    onClick={() =>
                                      handleResolveDiscrepancy(
                                        item.discrepancyId,
                                        src.sourceDocument,
                                        src.value
                                      )
                                    }
                                    className="w-full text-xs"
                                  >
                                    Accept {src.sourceDocument.split('.')[0]?.slice(0, 16)}
                                  </Button>
                                )}
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

            {verificationQueue.length === 0 ? (
              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-8 text-center space-y-3 bw-surface-raised">
                <CheckCircle2 className="w-8 h-8 text-[#24724E] mx-auto" />
                <h3 className="font-heading text-base font-bold text-[#242424]">
                  Verification Queue Clear
                </h3>
                <p className="text-xs text-[#686864] max-w-md mx-auto">
                  All extracted facts and product offerings have been verified. Your Business Brain
                  serves as the single source of truth across all 14 departments.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {verificationQueue.map((item) => (
                  <div
                    key={item.itemId}
                    className="rounded-[12px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 bw-surface-raised"
                  >
                    <div className="space-y-1.5 flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-[#FFF4E5] text-[#A85E16] border border-[#FBE0C2]">
                          {item.domain}
                        </span>
                        <span className="text-xs text-[#858585]">
                          From: {item.sourceDocument} · Confidence:{' '}
                          {Math.round(item.confidence * 100)}%
                        </span>
                      </div>
                      <h4 className="font-heading text-sm font-bold text-[#242424]">
                        {item.fieldKey}
                      </h4>
                      <div className="text-xs text-[#5C5C58] bg-[#FAFAF9] p-2.5 rounded-md border border-[#E6E6E2] font-mono">
                        {typeof item.proposedValue === 'object'
                          ? JSON.stringify(item.proposedValue, null, 2)
                          : String(item.proposedValue)}
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0 self-end md:self-center">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => {
                          setSelectedVerifyItem(item);
                          setVerifyEditText(
                            typeof item.proposedValue === 'object'
                              ? JSON.stringify(item.proposedValue, null, 2)
                              : String(item.proposedValue)
                          );
                          setVerifyEditModalOpen(true);
                        }}
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        Edit
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleRejectVerificationItem(item.itemId)}
                        className="text-[#BC3E3E]"
                      >
                        <X className="w-3.5 h-3.5" />
                        Reject
                      </Button>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() => handleApproveVerificationItem(item)}
                      >
                        <Check className="w-3.5 h-3.5" />
                        Approve Fact
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* =========================================================================
            TAB 8: DECISIONS & HISTORY
        ========================================================================= */}
        {activeTab === 'history' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
            <div className="lg:col-span-7 space-y-4">
              <SectionHeader
                title="Strategic Decisions Log"
                description="Committed commercial choices, pricing agreements, and channel decisions"
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
                title="Business Brain Chronology"
                description="Audit trail of verified fact additions and profile revisions"
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

      {/* =========================================================================
          MODALS
      ========================================================================= */}

      {/* Edit Business Profile Modal */}
      <Modal
        open={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        title="Edit Business Identity & Profile"
        subtitle="Authoritative identity parameters permanently synced across all departments."
      >
        <form onSubmit={handleSaveProfile} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Brand / Display Name" htmlFor="bb-edit-name">
              <Input
                id="bb-edit-name"
                type="text"
                required
                value={formName}
                onChange={(e) => setFormName(e.target.value)}
              />
            </Field>
            <Field label="Legal Entity Name" htmlFor="bb-edit-legal">
              <Input
                id="bb-edit-legal"
                type="text"
                value={formLegalName}
                onChange={(e) => setFormLegalName(e.target.value)}
                placeholder="e.g. Solstice Foods Private Limited"
              />
            </Field>
          </div>

          <Field label="Tagline" htmlFor="bb-edit-tagline">
            <Input
              id="bb-edit-tagline"
              type="text"
              value={formTagline}
              onChange={(e) => setFormTagline(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Industry" htmlFor="bb-edit-industry">
              <Input
                id="bb-edit-industry"
                type="text"
                value={formIndustry}
                onChange={(e) => setFormIndustry(e.target.value)}
              />
            </Field>
            <Field label="Sub-Industry" htmlFor="bb-edit-subindustry">
              <Input
                id="bb-edit-subindustry"
                type="text"
                value={formSubIndustry}
                onChange={(e) => setFormSubIndustry(e.target.value)}
                placeholder="e.g. Specialty Coffee & Kegging"
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
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Business Size" htmlFor="bb-edit-size">
              <Select
                id="bb-edit-size"
                value={formSize}
                onChange={(e) => setFormSize(e.target.value as BusinessBrainData['businessSize'])}
              >
                <option value="Solo Founder">Solo Founder</option>
                <option value="2-10 Employees">2-10 Employees</option>
                <option value="11-50 Employees">11-50 Employees</option>
                <option value="51-200 Employees">51-200 Employees</option>
                <option value="200+ Employees">200+ Employees</option>
              </Select>
            </Field>
            <Field label="Operation Type" htmlFor="bb-edit-op">
              <Select
                id="bb-edit-op"
                value={formOperationType}
                onChange={(e) =>
                  setFormOperationType(e.target.value as BusinessBrainData['operationType'])
                }
              >
                <option value="physical">Physical (Brick & Mortar)</option>
                <option value="online">Online / Digital</option>
                <option value="hybrid">Hybrid (Storefront + Web)</option>
              </Select>
            </Field>
            <Field label="Headquarters Location" htmlFor="bb-edit-location">
              <Input
                id="bb-edit-location"
                type="text"
                value={formLocation}
                onChange={(e) => setFormLocation(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Website URL" htmlFor="bb-edit-website">
              <Input
                id="bb-edit-website"
                type="text"
                value={formWebsite}
                onChange={(e) => setFormWebsite(e.target.value)}
                placeholder="https://"
              />
            </Field>
            <Field label="Operating Hours" htmlFor="bb-edit-hours">
              <Input
                id="bb-edit-hours"
                type="text"
                value={formHours}
                onChange={(e) => setFormHours(e.target.value)}
                placeholder="e.g. Mon-Fri 8am-6pm IST"
              />
            </Field>
          </div>

          <Field label="Executive Overview Summary" htmlFor="bb-edit-summary">
            <Textarea
              id="bb-edit-summary"
              rows={3}
              value={formSummary}
              onChange={(e) => setFormSummary(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Core Strengths (one per line)" htmlFor="bb-edit-strengths">
              <Textarea
                id="bb-edit-strengths"
                rows={2}
                value={formStrengths}
                onChange={(e) => setFormStrengths(e.target.value)}
              />
            </Field>
            <Field label="Weaknesses / Limitations (one per line)" htmlFor="bb-edit-weaknesses">
              <Textarea
                id="bb-edit-weaknesses"
                rows={2}
                value={formWeaknesses}
                onChange={(e) => setFormWeaknesses(e.target.value)}
              />
            </Field>
          </div>

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

      {/* Add Product / Service Modal */}
      <Modal
        open={productModalOpen}
        onClose={() => setProductModalOpen(false)}
        title="Add Product or Service Offering"
        subtitle="Catalog offerings serve as authoritative pricing references for creative generation."
      >
        <form onSubmit={handleAddProduct} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Offering Name" htmlFor="bb-prod-name">
              <Input
                id="bb-prod-name"
                type="text"
                required
                value={prodName}
                onChange={(e) => setProdName(e.target.value)}
                placeholder="e.g. Nitrogen Keg Cold Brew"
              />
            </Field>
            <Field label="SKU / External Code" htmlFor="bb-prod-sku">
              <Input
                id="bb-prod-sku"
                type="text"
                value={prodSku}
                onChange={(e) => setProdSku(e.target.value)}
                placeholder="e.g. COLD-BREW-KEG-01"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Category" htmlFor="bb-prod-cat">
              <Input
                id="bb-prod-cat"
                type="text"
                value={prodCat}
                onChange={(e) => setProdCat(e.target.value)}
              />
            </Field>
            <Field label="Subcategory" htmlFor="bb-prod-subcat">
              <Input
                id="bb-prod-subcat"
                type="text"
                value={prodSubCat}
                onChange={(e) => setProdSubCat(e.target.value)}
                placeholder="e.g. Wholesale Beverages"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <Field label="Retail Price ($)" htmlFor="bb-prod-price">
              <Input
                id="bb-prod-price"
                type="number"
                step="0.01"
                value={prodPrice}
                onChange={(e) => setProdPrice(e.target.value)}
                placeholder="120.00"
              />
            </Field>
            <Field label="Cost Basis ($)" htmlFor="bb-prod-cost">
              <Input
                id="bb-prod-cost"
                type="number"
                step="0.01"
                value={prodCost}
                onChange={(e) => setProdCost(e.target.value)}
                placeholder="45.00"
              />
            </Field>
            <Field label="Gross Margin (%)" htmlFor="bb-prod-margin">
              <Input
                id="bb-prod-margin"
                type="number"
                value={prodMargin}
                onChange={(e) => setProdMargin(e.target.value)}
                placeholder="62.5"
              />
            </Field>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Availability" htmlFor="bb-prod-avail">
              <Select
                id="bb-prod-avail"
                value={prodAvailability}
                onChange={(e) => setProdAvailability(e.target.value as typeof prodAvailability)}
              >
                <option value="in_stock">In Stock</option>
                <option value="preorder">Pre-Order</option>
                <option value="out_of_stock">Out of Stock</option>
                <option value="discontinued">Discontinued</option>
              </Select>
            </Field>
            <Field label="Pricing Structure" htmlFor="bb-prod-struct">
              <Select
                id="bb-prod-struct"
                value={prodPricingStructure}
                onChange={(e) =>
                  setProdPricingStructure(e.target.value as typeof prodPricingStructure)
                }
              >
                <option value="one-time">One-Time Purchase</option>
                <option value="recurring">Recurring Subscription</option>
                <option value="tiered">Tiered Volume</option>
                <option value="usage-based">Usage-Based</option>
              </Select>
            </Field>
          </div>

          <Field label="Target Customer" htmlFor="bb-prod-target">
            <Input
              id="bb-prod-target"
              type="text"
              value={prodTarget}
              onChange={(e) => setProdTarget(e.target.value)}
              placeholder="e.g. Specialty coffee bars and corporate cafes"
            />
          </Field>

          <Field label="Key Differentiator" htmlFor="bb-prod-diff">
            <Input
              id="bb-prod-diff"
              type="text"
              value={prodDiff}
              onChange={(e) => setProdDiff(e.target.value)}
              placeholder="e.g. 72-hour cold steep with 0 preservative shelf stability"
            />
          </Field>

          <Field label="Description" htmlFor="bb-prod-desc">
            <Textarea
              id="bb-prod-desc"
              rows={2}
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

      {/* Import Catalogue Modal */}
      <Modal
        open={importModalOpen}
        onClose={() => setImportModalOpen(false)}
        title="Import Product & Service Catalogue"
        subtitle="Paste CSV rows or item lists. Duplicate detection prevents redundant entries."
      >
        <form onSubmit={handleImportCatalogue} className="space-y-4">
          <Field
            label="CSV Data (Header row supported: name, category, price, sku, description)"
            htmlFor="bb-import-csv"
          >
            <Textarea
              id="bb-import-csv"
              rows={6}
              required
              value={importText}
              onChange={(e) => setImportText(e.target.value)}
              placeholder={`name, category, price, sku, description\nSignature Cold Brew Keg, Beverages, 120, CB-01, Single origin keg\nEspresso Roast Beans, Whole Bean, 18, EB-01, 250g bag`}
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="bb-import-overwrite"
              checked={importOverwrite}
              onChange={(e) => setImportOverwrite(e.target.checked)}
              className="rounded border-[#D0D0C8] text-[#FF7417] focus:ring-[#FF7417]"
            />
            <label htmlFor="bb-import-overwrite" className="text-xs text-[#252525] cursor-pointer">
              Update existing items if Name matches (instead of skipping duplicates)
            </label>
          </div>

          {importMessage && (
            <div className="p-3 rounded-md bg-[#FFF4E5] border border-[#FBE0C2] text-xs text-[#A85E16]">
              {importMessage}
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setImportModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Process Import
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Customer Persona Modal */}
      <Modal
        open={personaModalOpen}
        onClose={() => setPersonaModalOpen(false)}
        title="Add Customer Persona"
        subtitle="Buyer profiles grounding copy, channel strategy, and value proposition messaging."
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
                placeholder="e.g. Specialty Cafe Operator"
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

          <Field label="Core Customer Needs (comma-separated)" htmlFor="bb-per-needs">
            <Input
              id="bb-per-needs"
              type="text"
              value={personaNeeds}
              onChange={(e) => setPersonaNeeds(e.target.value)}
              placeholder="e.g. Dependable weekly delivery, consistent flavor profile"
            />
          </Field>

          <Field label="Pain Points (comma-separated)" htmlFor="bb-per-pain">
            <Input
              id="bb-per-pain"
              type="text"
              value={personaPain}
              onChange={(e) => setPersonaPain(e.target.value)}
              placeholder="e.g. Unpredictable roaster lead times, high minimum order quantities"
            />
          </Field>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Field label="Buying Triggers" htmlFor="bb-per-trig">
              <Input
                id="bb-per-trig"
                type="text"
                value={personaTriggers}
                onChange={(e) => setPersonaTriggers(e.target.value)}
                placeholder="e.g. Free sample flight, seasonal holiday surge"
              />
            </Field>
            <Field label="Willingness to Pay" htmlFor="bb-per-wtp">
              <Input
                id="bb-per-wtp"
                type="text"
                value={personaWtp}
                onChange={(e) => setPersonaWtp(e.target.value)}
                placeholder="e.g. $120–$250 / delivery"
              />
            </Field>
          </div>

          <Field label="Customer Objections (comma-separated)" htmlFor="bb-per-obj">
            <Input
              id="bb-per-obj"
              type="text"
              value={personaObjections}
              onChange={(e) => setPersonaObjections(e.target.value)}
              placeholder="e.g. Switching keg lines is inconvenient"
            />
          </Field>

          <Field label="Preferred Marketing Channels" htmlFor="bb-per-chan">
            <Input
              id="bb-per-chan"
              type="text"
              value={personaChannels}
              onChange={(e) => setPersonaChannels(e.target.value)}
              placeholder="e.g. Instagram, Specialty Trade Shows, Email Newsletter"
            />
          </Field>

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

      {/* Edit Brand Intelligence Modal */}
      <Modal
        open={brandModalOpen}
        onClose={() => setBrandModalOpen(false)}
        title="Edit Brand Intelligence & Visual Direction"
        subtitle="Brand voice, color palettes, and claim boundaries enforced by Truth Engine."
      >
        <form onSubmit={handleSaveBrand} className="space-y-4">
          <Field label="Primary Logo Asset URL" htmlFor="bb-brand-logo">
            <Input
              id="bb-brand-logo"
              type="text"
              value={brandLogo}
              onChange={(e) => setBrandLogo(e.target.value)}
              placeholder="https://..."
            />
          </Field>

          <div className="grid grid-cols-3 gap-3">
            <Field label="Primary Color" htmlFor="bb-brand-col1">
              <Input
                id="bb-brand-col1"
                type="text"
                value={brandColorPrimary}
                onChange={(e) => setBrandColorPrimary(e.target.value)}
              />
            </Field>
            <Field label="Secondary Color" htmlFor="bb-brand-col2">
              <Input
                id="bb-brand-col2"
                type="text"
                value={brandColorSecondary}
                onChange={(e) => setBrandColorSecondary(e.target.value)}
              />
            </Field>
            <Field label="Accent Color" htmlFor="bb-brand-col3">
              <Input
                id="bb-brand-col3"
                type="text"
                value={brandColorAccent}
                onChange={(e) => setBrandColorAccent(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Heading Font" htmlFor="bb-brand-font1">
              <Input
                id="bb-brand-font1"
                type="text"
                value={brandFontHeading}
                onChange={(e) => setBrandFontHeading(e.target.value)}
              />
            </Field>
            <Field label="Body Font" htmlFor="bb-brand-font2">
              <Input
                id="bb-brand-font2"
                type="text"
                value={brandFontBody}
                onChange={(e) => setBrandFontBody(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Brand Voice (comma-separated)" htmlFor="bb-brand-voice">
              <Input
                id="bb-brand-voice"
                type="text"
                value={brandVoice}
                onChange={(e) => setBrandVoice(e.target.value)}
              />
            </Field>
            <Field label="Brand Tone" htmlFor="bb-brand-tone">
              <Input
                id="bb-brand-tone"
                type="text"
                value={brandTone}
                onChange={(e) => setBrandTone(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Visual Direction & Style" htmlFor="bb-brand-vis">
              <Input
                id="bb-brand-vis"
                type="text"
                value={brandVisual}
                onChange={(e) => setBrandVisual(e.target.value)}
              />
            </Field>
            <Field label="Preferred Language" htmlFor="bb-brand-lang">
              <Input
                id="bb-brand-lang"
                type="text"
                value={brandLanguage}
                onChange={(e) => setBrandLanguage(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Words to Use (comma-separated)" htmlFor="bb-brand-wuse">
              <Input
                id="bb-brand-wuse"
                type="text"
                value={brandWordsUse}
                onChange={(e) => setBrandWordsUse(e.target.value)}
              />
            </Field>
            <Field label="Words to Avoid (comma-separated)" htmlFor="bb-brand-wavoid">
              <Input
                id="bb-brand-wavoid"
                type="text"
                value={brandWordsAvoid}
                onChange={(e) => setBrandWordsAvoid(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Approved Claims (one per line)" htmlFor="bb-brand-appclaims">
              <Textarea
                id="bb-brand-appclaims"
                rows={2}
                value={brandApprovedClaims}
                onChange={(e) => setBrandApprovedClaims(e.target.value)}
              />
            </Field>
            <Field label="Restricted Claims (one per line)" htmlFor="bb-brand-restclaims">
              <Textarea
                id="bb-brand-restclaims"
                rows={2}
                value={brandRestrictedClaims}
                onChange={(e) => setBrandRestrictedClaims(e.target.value)}
              />
            </Field>
          </div>

          <Field label="Unique Selling Proposition (USP)" htmlFor="bb-brand-usp">
            <Textarea
              id="bb-brand-usp"
              rows={2}
              value={brandUsp}
              onChange={(e) => setBrandUsp(e.target.value)}
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setBrandModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Brand Intelligence
            </Button>
          </div>
        </form>
      </Modal>

      {/* Edit Resources & Constraints Modal */}
      <Modal
        open={constraintsModalOpen}
        onClose={() => setConstraintsModalOpen(false)}
        title="Edit Resources, Budgets & Operational Constraints"
        subtitle="AI recommendations strictly ground inside these bounds. Financial limits are never hallucinated."
      >
        <form onSubmit={handleSaveConstraints} className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <Field label="Monthly Budget" htmlFor="bb-con-m">
              $
              <Input
                id="bb-con-m"
                type="number"
                value={budgetMonthly}
                onChange={(e) => setBudgetMonthly(e.target.value)}
              />
            </Field>
            <Field label="Annual Budget" htmlFor="bb-con-a">
              $
              <Input
                id="bb-con-a"
                type="number"
                value={budgetAnnual}
                onChange={(e) => setBudgetAnnual(e.target.value)}
              />
            </Field>
            <Field label="Currency" htmlFor="bb-con-c">
              <Select
                id="bb-con-c"
                value={budgetCurrency}
                onChange={(e) => setBudgetCurrency(e.target.value)}
              >
                <option value="USD">USD ($)</option>
                <option value="INR">INR (₹)</option>
                <option value="EUR">EUR (€)</option>
                <option value="GBP">GBP (£)</option>
              </Select>
            </Field>
          </div>

          <Field label="Internal Team Capabilities (comma-separated)" htmlFor="bb-con-team">
            <Input
              id="bb-con-team"
              type="text"
              value={teamCapabilities}
              onChange={(e) => setTeamCapabilities(e.target.value)}
            />
          </Field>

          <Field label="Operating Capacity / Maximum Throughput" htmlFor="bb-con-cap">
            <Input
              id="bb-con-cap"
              type="text"
              value={operatingCapacity}
              onChange={(e) => setOperatingCapacity(e.target.value)}
            />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Geographic Restrictions" htmlFor="bb-con-geo">
              <Input
                id="bb-con-geo"
                type="text"
                value={geoLimits}
                onChange={(e) => setGeoLimits(e.target.value)}
              />
            </Field>
            <Field label="Time Constraints / Deadlines" htmlFor="bb-con-time">
              <Input
                id="bb-con-time"
                type="text"
                value={timeLimits}
                onChange={(e) => setTimeLimits(e.target.value)}
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Financial Constraints" htmlFor="bb-con-fin">
              <Input
                id="bb-con-fin"
                type="text"
                value={finLimits}
                onChange={(e) => setFinLimits(e.target.value)}
              />
            </Field>
            <Field label="Operational Restrictions" htmlFor="bb-con-op">
              <Input
                id="bb-con-op"
                type="text"
                value={opRestrictions}
                onChange={(e) => setOpRestrictions(e.target.value)}
              />
            </Field>
          </div>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setConstraintsModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save Constraints
            </Button>
          </div>
        </form>
      </Modal>

      {/* Upload Document Modal */}
      <Modal
        open={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title="Upload Business Document for Knowledge Extraction"
        subtitle="PDF price lists, restaurant menus, salon services, and decks are indexed into the Business Brain."
      >
        <form onSubmit={handleUploadDoc} className="space-y-4">
          <Field label="Document Title" htmlFor="bb-doc-name">
            <Input
              id="bb-doc-name"
              type="text"
              required
              value={docTitle}
              onChange={(e) => setDocTitle(e.target.value)}
              placeholder="e.g. Wholesale_Catalog_2026.pdf"
            />
          </Field>

          <Field label="Document Category" htmlFor="bb-doc-type">
            <Select
              id="bb-doc-type"
              value={docType}
              onChange={(e) => setDocType(e.target.value as typeof docType)}
            >
              <option value="PDF">PDF (Price List, Menu, Brochure)</option>
              <option value="CSV">CSV (Product / Service Table)</option>
              <option value="Spreadsheet">Spreadsheet (Inventory & Rates)</option>
              <option value="Brand Brief">Brand Brief / Guidelines</option>
              <option value="Research">Research Notes</option>
              <option value="Deck">Pitch Deck</option>
            </Select>
          </Field>

          <Field
            label="Document Text Content / Extracted Preview (Paste contents or raw text)"
            htmlFor="bb-doc-text"
          >
            <Textarea
              id="bb-doc-text"
              rows={5}
              value={docContentText}
              onChange={(e) => setDocContentText(e.target.value)}
              placeholder="Paste document text or table rows here..."
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setDocModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isExtractingDoc}>
              {isExtractingDoc ? 'Ingesting Document...' : 'Index & Extract Knowledge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Extract URL Modal */}
      <Modal
        open={urlModalOpen}
        onClose={() => setUrlModalOpen(false)}
        title="Extract Knowledge from Website URL"
        subtitle="Scrapes and structures offerings, operating hours, and location facts with SSRF protection."
      >
        <form onSubmit={handleExtractUrl} className="space-y-4">
          <Field label="Public Website URL" htmlFor="bb-url-target">
            <Input
              id="bb-url-target"
              type="url"
              required
              value={urlInput}
              onChange={(e) => setUrlInput(e.target.value)}
              placeholder="https://example.com"
            />
          </Field>

          <p className="text-xs text-[#858585]">
            SSRF Protection Gate ensures only public domain HTTPS addresses are indexed. Local IP
            ranges and internal cloud metadata are rejected.
          </p>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setUrlModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={isExtractingUrl}>
              {isExtractingUrl ? 'Extracting Website...' : 'Extract Knowledge'}
            </Button>
          </div>
        </form>
      </Modal>

      {/* Add Goal Modal */}
      <Modal open={goalModalOpen} onClose={() => setGoalModalOpen(false)} title="Add Business Goal">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            if (goalTitle.trim()) {
              updateBrain({
                primaryGoals: [...(state.brain.primaryGoals || []), goalTitle.trim()],
              });
              setGoalTitle('');
              setGoalModalOpen(false);
            }
          }}
          className="space-y-4"
        >
          <Field label="Objective Statement" htmlFor="bb-goal-text">
            <Input
              id="bb-goal-text"
              type="text"
              required
              value={goalTitle}
              onChange={(e) => setGoalTitle(e.target.value)}
              placeholder="e.g. Expand cold brew wholesale delivery to 25 local cafes before Q3"
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

      {/* Log Decision Modal */}
      <Modal
        open={decisionModalOpen}
        onClose={() => setDecisionModalOpen(false)}
        title="Log Strategic Decision"
        subtitle="Recorded choices become boundaries for downstream AI generation."
      >
        <form
          onSubmit={(e) => {
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
          }}
          className="space-y-4"
        >
          <Field label="Decision Headline" htmlFor="bb-dec-title">
            <Input
              id="bb-dec-title"
              type="text"
              required
              value={decTitle}
              onChange={(e) => setDecTitle(e.target.value)}
              placeholder="e.g. Set minimum wholesale delivery to two kegs per order"
            />
          </Field>
          <Field label="Strategic Rationale" htmlFor="bb-dec-rat">
            <Textarea
              id="bb-dec-rat"
              rows={3}
              value={decRationale}
              onChange={(e) => setDecRationale(e.target.value)}
              placeholder="Why this direction beats alternatives..."
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

      {/* Edit Verification Queue Item Modal */}
      <Modal
        open={verifyEditModalOpen}
        onClose={() => setVerifyEditModalOpen(false)}
        title="Edit Extracted Fact Before Approval"
        subtitle="Modify proposed values to reflect exact ground truth."
      >
        <form onSubmit={handleEditVerifyItem} className="space-y-4">
          <Field label="Field / Entity Key" htmlFor="bb-vedit-key">
            <Input
              id="bb-vedit-key"
              type="text"
              disabled
              value={selectedVerifyItem?.fieldKey || ''}
            />
          </Field>

          <Field label="Extracted Value (Edit before committing)" htmlFor="bb-vedit-val">
            <Textarea
              id="bb-vedit-val"
              rows={5}
              required
              value={verifyEditText}
              onChange={(e) => setVerifyEditText(e.target.value)}
              className="font-mono text-xs"
            />
          </Field>

          <div className="flex justify-end gap-2">
            <Button variant="secondary" size="sm" onClick={() => setVerifyEditModalOpen(false)}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Save &amp; Confirm Fact
            </Button>
          </div>
        </form>
      </Modal>

      {/* Business Intelligence Score Breakdown Modal */}
      <Modal
        open={scoreBreakdownModalOpen}
        onClose={() => setScoreBreakdownModalOpen(false)}
        title="Business Intelligence Scorecard"
        subtitle={`Deterministic knowledge assessment for ${state.brain.businessName} (Version ${intelligenceScore.version})`}
      >
        <div className="space-y-5 max-h-[75vh] overflow-y-auto pr-1">
          {/* Header Assessment Summary */}
          <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FAF9F5] p-4 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2">
                <span className="font-heading text-3xl font-bold text-[#252525]">
                  {intelligenceScore.overallScore}
                </span>
                <span className="text-xs font-semibold text-[#858585]">
                  / 100 · Grade {intelligenceScore.grade}
                </span>
              </div>
              <StatusBadge
                status={intelligenceScore.readinessLabel}
                tone={
                  intelligenceScore.readinessLabel === 'Fully Grounded' ||
                  intelligenceScore.readinessLabel === 'Strategic Ready'
                    ? 'success'
                    : intelligenceScore.readinessLabel === 'Partially Synced'
                      ? 'accent'
                      : intelligenceScore.readinessLabel === 'Baseline Grounding'
                        ? 'warning'
                        : 'error'
                }
              />
            </div>
            <p className="text-xs text-[#5C5C58] leading-relaxed">
              {intelligenceScore.summaryNarrative}
            </p>
            <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-[#E6E6E2] text-[11px] text-[#5C5C58]">
              <span>
                <strong>Verification Coverage:</strong>{' '}
                {intelligenceScore.overallVerificationCoverage}%
              </span>
              <span>•</span>
              <span>
                <strong>Data Freshness:</strong> {intelligenceScore.overallFreshnessScore}%
              </span>
              <span>•</span>
              <span>
                <strong>Critical Gaps:</strong> {intelligenceScore.criticalMissingCount}
              </span>
              <span>•</span>
              <span>
                <strong>Data Quality Issues:</strong> {intelligenceScore.dataQualityIssuesCount}
              </span>
            </div>
          </div>

          {/* Sub Navigation */}
          <div className="flex border-b border-[#E6E6E2] gap-4">
            <button
              type="button"
              onClick={() => setScoreModalTab('dimensions')}
              className={`pb-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                scoreModalTab === 'dimensions'
                  ? 'border-[#FF7417] text-[#252525]'
                  : 'border-transparent text-[#858585] hover:text-[#252525]'
              }`}
            >
              8 Intelligence Dimensions
            </button>
            <button
              type="button"
              onClick={() => setScoreModalTab('recommendations')}
              className={`pb-2 text-xs font-semibold border-b-2 cursor-pointer transition-colors ${
                scoreModalTab === 'recommendations'
                  ? 'border-[#FF7417] text-[#252525]'
                  : 'border-transparent text-[#858585] hover:text-[#252525]'
              }`}
            >
              Improvement Opportunities ({intelligenceScore.topRecommendations.length})
            </button>
          </div>

          {scoreModalTab === 'dimensions' ? (
            <div className="space-y-3">
              {(Object.keys(intelligenceScore.dimensions) as IntelligenceDimensionKey[]).map(
                (dimKey) => {
                  const dim = intelligenceScore.dimensions[dimKey];
                  const isExpanded = expandedDimension === dimKey;
                  return (
                    <div
                      key={dimKey}
                      className="rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] p-3.5 space-y-2.5 transition-all"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-[#252525]">{dim.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#F1F1EF] text-[#5C5C58] font-mono-num font-medium">
                            Weight: {dim.weight}%
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono-num text-xs font-bold text-[#252525]">
                            {dim.score} / 100
                          </span>
                          <span className="text-[10px] text-[#858585]">
                            ({dim.weightedScore} pts)
                          </span>
                          <button
                            type="button"
                            onClick={() => setExpandedDimension(isExpanded ? null : dimKey)}
                            className="text-xs font-semibold text-[#FF7417] hover:underline cursor-pointer ml-1"
                          >
                            {isExpanded ? 'Hide Details' : 'Inspect'}
                          </button>
                        </div>
                      </div>

                      <FluidProgress
                        value={dim.score}
                        label={`Completeness: ${dim.completeness}% · Verified: ${dim.verificationCoverage}% · Freshness: ${dim.freshness}%`}
                      />

                      {isExpanded && (
                        <div className="mt-3 pt-3 border-t border-[#E6E6E2] space-y-3 text-xs">
                          {/* Metrics Bar */}
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-center text-[11px]">
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#E6E6E2]">
                              <div className="text-[#858585] text-[10px]">Completeness</div>
                              <div className="font-bold text-[#252525] font-mono-num">
                                {dim.completeness}%
                              </div>
                            </div>
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#E6E6E2]">
                              <div className="text-[#858585] text-[10px]">Verification</div>
                              <div className="font-bold text-[#24724E] font-mono-num">
                                {dim.verificationCoverage}%
                              </div>
                            </div>
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#E6E6E2]">
                              <div className="text-[#858585] text-[10px]">Freshness</div>
                              <div className="font-bold text-[#252525] font-mono-num">
                                {dim.freshness}%
                              </div>
                            </div>
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#E6E6E2]">
                              <div className="text-[#858585] text-[10px]">Evidence</div>
                              <div className="font-bold text-[#A85E16] font-mono-num">
                                {dim.evidenceAvailability}%
                              </div>
                            </div>
                          </div>

                          {/* Missing Info */}
                          {dim.missingCriticalInformation.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-[#252525]">
                                Missing Information:
                              </span>
                              <div className="space-y-1 mt-1">
                                {dim.missingCriticalInformation.map((m, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-start gap-1.5 text-[11px] text-[#5C5C58]"
                                  >
                                    <span
                                      className={`px-1 rounded text-[9px] font-bold uppercase shrink-0 mt-0.5 ${
                                        m.severity === 'critical'
                                          ? 'bg-[#FBEAE9] text-[#B83232]'
                                          : m.severity === 'high'
                                            ? 'bg-[#FFF4E5] text-[#A85E16]'
                                            : 'bg-[#F1F1EF] text-[#5C5C58]'
                                      }`}
                                    >
                                      {m.severity}
                                    </span>
                                    <span>{m.description}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Data Quality Issues */}
                          {dim.dataQualityIssues.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-[#252525]">
                                Data Quality Issues:
                              </span>
                              <div className="space-y-1 mt-1">
                                {dim.dataQualityIssues.map((q, idx) => (
                                  <div
                                    key={idx}
                                    className="p-2 rounded bg-[#FFF4E5] border border-[#FBE0C2] text-[11px] text-[#A85E16] space-y-0.5"
                                  >
                                    <div className="font-semibold">{q.issue}</div>
                                    <div className="text-[#5C5C58]">Action: {q.recommendation}</div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Accuracy Indicators */}
                          {dim.accuracyIndicators.length > 0 && (
                            <div className="space-y-1">
                              <span className="font-semibold text-[#252525]">Accuracy Checks:</span>
                              <div className="space-y-1 mt-1">
                                {dim.accuracyIndicators.map((acc, idx) => (
                                  <div
                                    key={idx}
                                    className="flex items-center justify-between gap-2 text-[11px] p-1.5 rounded bg-[#FAF9F5] border border-[#E6E6E2]"
                                  >
                                    <span className="text-[#252525] font-medium">
                                      {acc.metric}:
                                    </span>
                                    <span className="text-[#5C5C58] truncate">{acc.details}</span>
                                    <span
                                      className={`px-1.5 py-0.2 rounded text-[10px] font-semibold uppercase shrink-0 ${
                                        acc.status === 'pass'
                                          ? 'bg-[#EAF5EF] text-[#24724E]'
                                          : acc.status === 'warning'
                                            ? 'bg-[#FFF4E5] text-[#A85E16]'
                                            : 'bg-[#FBEAE9] text-[#B83232]'
                                      }`}
                                    >
                                      {acc.status}
                                    </span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Stale Warnings */}
                          {dim.staleWarnings.length > 0 && (
                            <div className="p-2 rounded bg-[#FAF9F5] border border-[#E6E6E2] text-[11px] text-[#5C5C58] flex items-center gap-1.5">
                              <Clock className="w-3.5 h-3.5 text-[#A85E16] shrink-0" />
                              <span>{dim.staleWarnings.join(' · ')}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                }
              )}
            </div>
          ) : (
            <div className="space-y-2.5">
              {intelligenceScore.topRecommendations.length === 0 ? (
                <div className="p-4 text-center text-xs text-[#24724E] bg-[#EAF5EF] rounded-lg">
                  <CheckCircle2 className="w-6 h-6 mx-auto mb-1 text-[#24724E]" />
                  No high-priority improvement opportunities detected. Business Brain is fully
                  grounded.
                </div>
              ) : (
                intelligenceScore.topRecommendations.map((rec) => (
                  <div
                    key={rec.id}
                    className="p-3 rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 hover:border-[#FF7417] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            rec.priority === 'critical'
                              ? 'bg-[#FBEAE9] text-[#B83232]'
                              : rec.priority === 'high'
                                ? 'bg-[#FFF4E5] text-[#A85E16]'
                                : 'bg-[#EAF5EF] text-[#24724E]'
                          }`}
                        >
                          {rec.priority}
                        </span>
                        <span className="text-xs font-bold text-[#252525]">{rec.title}</span>
                        <span className="text-[10px] font-mono-num font-semibold text-[#24724E] bg-[#EAF5EF] px-1.5 py-0.2 rounded">
                          +{rec.estimatedScoreImpact} pts
                        </span>
                      </div>
                      <p className="text-xs text-[#5C5C58]">{rec.description}</p>
                    </div>
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={() => handleExecuteRecommendation(rec)}
                      className="shrink-0"
                    >
                      Fix Now →
                    </Button>
                  </div>
                ))
              )}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[#E6E6E2]">
            <Button variant="primary" size="sm" onClick={() => setScoreBreakdownModalOpen(false)}>
              Close
            </Button>
          </div>
        </div>
      </Modal>

      {/* Business Intelligence Score History Modal */}
      <Modal
        open={scoreHistoryModalOpen}
        onClose={() => setScoreHistoryModalOpen(false)}
        title="Business Intelligence Score History"
        subtitle={`Progression of audited score calculations for ${state.brain.businessName}`}
      >
        <div className="space-y-4 max-h-[70vh] overflow-y-auto pr-1">
          {scoreHistoryList.length === 0 ? (
            <div className="text-center py-6 text-xs text-[#5C5C58]">
              <History className="w-8 h-8 text-[#858585] mx-auto mb-2 opacity-50" />
              <div>Current calculation is Version {intelligenceScore.version}.</div>
              <p className="text-[11px] text-[#858585] mt-1">
                Subsequent profile updates and fact confirmations will record version entries here.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {scoreHistoryList.map((entry) => (
                <div
                  key={entry.scoreId || entry.version}
                  className="rounded-[10px] border border-[#E6E6E2] bg-[#FFFFFF] p-3.5 space-y-2 hover:border-[#D1D1CD] transition-colors"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#252525] font-mono-num">
                        Version {entry.version}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.2 rounded bg-[#F1F1EF] text-[#5C5C58]">
                        {entry.triggerEvent}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-heading text-sm font-bold text-[#252525]">
                        {entry.overallScore} / 100
                      </span>
                      {entry.deltaFromPrevious !== undefined && (
                        <span
                          className={`text-[10px] font-bold px-1.5 py-0.2 rounded ${
                            entry.deltaFromPrevious >= 0
                              ? 'bg-[#EAF5EF] text-[#24724E]'
                              : 'bg-[#FBEAE9] text-[#B83232]'
                          }`}
                        >
                          {entry.deltaFromPrevious >= 0
                            ? `+${entry.deltaFromPrevious}`
                            : entry.deltaFromPrevious}{' '}
                          pts
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-[11px] text-[#858585]">
                    Calculated: {new Date(entry.calculatedAt).toLocaleString()}
                  </div>

                  <div className="flex flex-wrap gap-1.5 pt-1 text-[10px] text-[#5C5C58]">
                    {entry.dimensionScores &&
                      Object.entries(entry.dimensionScores).map(([k, s]) => (
                        <span
                          key={k}
                          className="px-1.5 py-0.5 rounded bg-[#FAF9F5] border border-[#E6E6E2]"
                        >
                          {k}: {s}
                        </span>
                      ))}
                  </div>
                </div>
              ))}
            </div>
          )}

          <div className="flex justify-end pt-3 border-t border-[#E6E6E2]">
            <Button variant="secondary" size="sm" onClick={() => setScoreHistoryModalOpen(false)}>
              Done
            </Button>
          </div>
        </div>
      </Modal>

      <JourneyNextStep currentRoute="business-brain" />
    </div>
  );
};
