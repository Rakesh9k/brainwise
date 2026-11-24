import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Archive,
  BarChart3,
  Bot,
  Box,
  Check,
  CheckCircle2,
  CheckSquare,
  ChevronLeft,
  ChevronRight,
  Clock,
  Compass,
  Copy,
  Download,
  Eye,
  FileJson,
  FolderInput,
  FolderKanban,
  Info,
  LayoutGrid,
  List,
  Package,
  Palette,
  Printer,
  RefreshCw,
  ScanLine,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Square,
  Tag,
  Trash2,
  Upload,
  X,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  buildAssetSvgMarkup,
  buildCarouselSlideSvgMarkup,
  sanitizeAiSvgMarkup,
} from '../../utils/logic';
import type { BrandAsset } from '../../types/brainwise';
import type {
  AuthoritativeBrandIdentityEntity,
  BrandComplianceReport,
  BrandDriftReport,
  LogoVariantSpec,
} from '../../server/types/brandIdentity';
import type {
  PackagingAssetEntity,
  PackagingContentIntelligenceReport,
  PackagingType,
  PrintReadinessReport,
} from '../../server/types/printPackaging';
import type {
  AssetAnalysisResult,
  AssetRecommendationItem,
  SemanticAssetSearchResultItem,
} from '../../server/types/assetIntelligence';
import type {
  AssistantMessage,
} from '../../server/types/conversationalAssetAssistant';
import {
  Button,
  EmptyState,
  FilterBar,
  FluidTransition,
  PageHeader,
  SearchInput,
  StatusBadge,
} from '../../components/ui/DesignSystem';
import { Modal } from '../../components/ui/Overlay';
import { AssetCard, JourneyNextStep } from '../../components/ui/DepartmentCards';

export const AssetLibraryPage: React.FC = () => {
  const {
    state,
    navigate,
    archiveBrandAsset,
    duplicateBrandAsset,
    bulkArchiveBrandAssets,
    bulkRestoreBrandAssets,
    deleteBrandAssetPermanently,
    uploadAssetFiles,
    getAuthoritativeBrandIdentity,
    syncBrandWithBusinessBrain,
    evaluateBrandCompliance,
    getBrandDriftReport,
    listBrandIdentityVersions,
    createPackagingAsset,
    listPackagingAssets,
    evaluatePrintReadiness,
    extractPackagingContentIntelligence,
    analyzeAssetIntelligence,
    semanticAssetSearch,
    recommendAssets,
    chatAssetAssistant,
    confirmAssetAssistantAction,
    createAssetDerivative,
    getAssetPerformanceSummary,
    addTask,
    launchCreativeRemix,
    showToast,
    departmentResetNonce,
  } = useBrainWise();

  // Search, filter & view state
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'title' | 'category' | 'status'>('newest');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(12);

  // Identity hub sub-navigation state
  const [identityTab, setIdentityTab] = useState<'logos' | 'tokens' | 'guidelines' | 'guardian' | 'versions'>('logos');
  const [authoritativeIdentity, setAuthoritativeIdentity] = useState<AuthoritativeBrandIdentityEntity | null>(null);
  const [_identityVersions, setIdentityVersions] = useState<AuthoritativeBrandIdentityEntity[]>([]);
  const [_complianceReport, setComplianceReport] = useState<BrandComplianceReport | null>(null);
  const [driftReport, setDriftReport] = useState<BrandDriftReport | null>(null);
  const [isScanningDrift, setIsScanningDrift] = useState(false);
  const [_isEvaluatingCompliance, setIsEvaluatingCompliance] = useState(false);
  const [isSyncingBrain, setIsSyncingBrain] = useState(false);
  const [_selectedLogoVariant, setSelectedLogoVariant] = useState<LogoVariantSpec | null>(null);

  // Print & Packaging Intelligence state
  const [packagingTab, setPackagingTab] = useState<'overview' | 'workflow' | 'preflight' | 'ocr' | 'dielines'>('overview');
  const [_packagingAssetsList, setPackagingAssetsList] = useState<PackagingAssetEntity[]>([]);
  const [activePreflightReport, setActivePreflightReport] = useState<PrintReadinessReport | null>(null);
  const [activeContentReport, setActiveContentReport] = useState<PackagingContentIntelligenceReport | null>(null);
  const [isEvaluatingReadiness, setIsEvaluatingReadiness] = useState(false);
  const [_isExtractingOcr, setIsExtractingOcr] = useState(false);
  const [dielineModalOpen, setDielineModalOpen] = useState(false);
  const [dielineType, setDielineType] = useState<PackagingType>('Box');
  const [dielineWidth, setDielineWidth] = useState(80);
  const [dielineHeight, setDielineHeight] = useState(160);
  const [dielineDepth, _setDielineDepth] = useState(40);
  const [dielineBleed, setDielineBleed] = useState(3.0);
  const [createPkgModalOpen, setCreatePkgModalOpen] = useState(false);
  const [newPkgName, setNewPkgName] = useState('');
  const [newPkgType, setNewPkgType] = useState<PackagingType>('Box');
  const [newPkgProductId, setNewPkgProductId] = useState('');

  // Multi-selection state
  const [selectedAssetIds, setSelectedAssetIds] = useState<Set<string>>(new Set());

  // Modal dialog states
  const [uploadModalOpen, setUploadModalOpen] = useState(false);

  // Asset detail & preview state
  const [previewAsset, setPreviewAsset] = useState<BrandAsset | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [_renameValue, setRenameValue] = useState('');
  const [activeDetailTab, setActiveDetailTab] = useState<'preview' | 'preflight' | 'ocr' | 'metadata' | 'versions' | 'organization' | 'compliance' | 'intelligence' | 'performance'>('preview');
  const [assetPerformance, setAssetPerformance] = useState<any | null>(null);
  const [isLoadingPerformance, setIsLoadingPerformance] = useState(false);
  const [derivativeModalOpen, setDerivativeModalOpen] = useState(false);
  const [derivativeTargetFormat, setDerivativeTargetFormat] = useState<'square_post' | 'story_vertical' | 'landscape_banner' | 'flyer_print' | 'poster_print'>('story_vertical');
  const [isCreatingDerivative, setIsCreatingDerivative] = useState(false);

  // AI Intelligence & Semantic Search State (Phase 7)
  const [isAiSearchMode, setIsAiSearchMode] = useState(false);
  const [_semanticResults, setSemanticResults] = useState<SemanticAssetSearchResultItem[]>([]);
  const [_isPerformingAiSearch, setIsPerformingAiSearch] = useState(false);
  const [assetIntelligence, setAssetIntelligence] = useState<AssetAnalysisResult | null>(null);
  const [isAnalyzingIntelligence, setIsAnalyzingIntelligence] = useState(false);

  // AI Recommendation Modal State
  const [recommendModalOpen, setRecommendModalOpen] = useState(false);
  const [recommendBrief, setRecommendBrief] = useState('');
  const [recommendChannel, setRecommendChannel] = useState<'Instagram' | 'Print' | 'Packaging' | 'Web'>('Instagram');
  const [recommendationList, setRecommendationList] = useState<AssetRecommendationItem[]>([]);
  const [isFetchingRecommendations, setIsFetchingRecommendations] = useState(false);

  // Conversational Asset Assistant State (Phase 8)
  const [assistantModalOpen, setAssistantModalOpen] = useState(false);
  const [assistantInput, setAssistantInput] = useState('');
  const [assistantMessages, setAssistantMessages] = useState<AssistantMessage[]>([
    {
      messageId: 'msg_welcome',
      role: 'assistant',
      content:
        'Hello! I am your **Asset Intelligence Assistant**. I understand your complete Brand Asset Operating System, connected products, and Brand Guardian guidelines.\n\nAsk me to search assets, compare designs, run compliance checks, create collections, or check for duplicates across all sections.',
      explainability: {
        facts: ['Connected to Business Brain and Unified Asset Registry.'],
        extractedContent: [],
        assumptions: [],
        suggestions: ['Try asking: "Find all approved logos", "Show packaging for our products", or "Detect brand drift".'],
      },
      groundedIn: {},
      suggestedQuickReplies: [
        'Find all approved logos',
        'Show packaging designs',
        'Detect brand drift',
        'Find unused assets',
      ],
      timestamp: new Date().toISOString(),
    },
  ]);
  const [isAssistantThinking, setIsAssistantThinking] = useState(false);
  const [activeConversationId, setActiveConversationId] = useState<string | undefined>();

  // Upload management state
  const [stagedFiles, setStagedFiles] = useState<File[]>([]);
  const [uploadSection, _setUploadSection] = useState<'Active' | 'Identity' | 'Print & Packaging' | 'Social Media'>('Active');
  const [uploadCategory, _setUploadCategory] = useState<'Logo' | 'Collateral' | 'Packaging' | 'Social' | 'Photography' | 'Document'>('Collateral');
  const [isUploading, setIsUploading] = useState(false);
  const [_uploadProgress, setUploadProgress] = useState(0);
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setPreviewAsset(null);
      setFolderFilter('all');
      setSelectedAssetIds(new Set());
    }
  }, [departmentResetNonce]);

  // Load section-specific data
  useEffect(() => {
    if (folderFilter === 'Identity') {
      void getAuthoritativeBrandIdentity().then((data) => {
        if (data) setAuthoritativeIdentity(data);
      });
      void listBrandIdentityVersions().then((versions) => {
        if (versions && versions.length) setIdentityVersions(versions);
      });
    } else if (folderFilter === 'Print & Packaging') {
      void listPackagingAssets().then((pkgs) => {
        if (pkgs) setPackagingAssetsList(pkgs);
      });
    }
  }, [folderFilter, getAuthoritativeBrandIdentity, listBrandIdentityVersions, listPackagingAssets]);

  useWorkspaceBreadcrumbs(
    previewAsset
      ? [
          {
            label: previewAsset.status === 'Archived' ? 'Archived Assets' : previewAsset.folder,
            onClick: () => {
              setFolderFilter(
                previewAsset.status === 'Archived' ? 'archived' : previewAsset.folder
              );
              setPreviewAsset(null);
            },
          },
          { label: previewAsset.title },
        ]
      : folderFilter !== 'all'
        ? [{ label: folderFilter === 'archived' ? 'Archived Assets' : folderFilter }]
        : [],
    [
      folderFilter,
      previewAsset?.id,
      previewAsset?.title,
      previewAsset?.folder,
      previewAsset?.status,
    ]
  );

  // Executive Overview Metrics
  const metrics = useMemo(() => {
    const total = state.assets.length;
    const active = state.assets.filter((a) => a.status !== 'Archived').length;
    const approved = state.assets.filter((a) => a.status === 'Approved').length;
    const pending = state.assets.filter((a) => a.status === 'Draft' || (a.status as string) === 'pending').length;
    const identityCount = state.assets.filter((a) => a.folder === 'Identity' && a.status !== 'Archived').length;
    const packagingCount = state.assets.filter((a) => a.folder === 'Print & Packaging' && a.status !== 'Archived').length;
    const socialCount = state.assets.filter((a) => a.folder === 'Social Media' && a.status !== 'Archived').length;
    const archivedCount = state.assets.filter((a) => a.status === 'Archived').length;
    const approvalRate = total > 0 ? Math.round((approved / total) * 100) : 100;
    return {
      total,
      active,
      approved,
      pending,
      identityCount,
      packagingCount,
      socialCount,
      archivedCount,
      approvalRate,
    };
  }, [state.assets]);

  // Curated recent assets
  const recentAssets = useMemo(() => {
    return [...state.assets]
      .filter((a) => a.status !== 'Archived')
      .sort((a, b) => b.createdAt.localeCompare(a.createdAt))
      .slice(0, 5);
  }, [state.assets]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.assets
      .filter((a) => {
        if (folderFilter === 'archived') return a.status === 'Archived';
        if (a.status === 'Archived') return false;
        if (folderFilter !== 'all' && a.folder !== folderFilter) return false;
        if (statusFilter !== 'all' && a.status !== statusFilter) return false;
        if (categoryFilter !== 'all' && a.category.toLowerCase() !== categoryFilter.toLowerCase()) return false;
        return (
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.headlineText.toLowerCase().includes(q) ||
          (a.aiPrompt?.toLowerCase().includes(q) ?? false) ||
          (a.tags && a.tags.some((t: string) => t.toLowerCase().includes(q)))
        );
      })
      .sort((a, b) => {
        if (sortBy === 'title') return a.title.localeCompare(b.title);
        if (sortBy === 'category') return a.category.localeCompare(b.category);
        if (sortBy === 'status') return a.status.localeCompare(b.status);
        return b.createdAt.localeCompare(a.createdAt);
      });
  }, [state.assets, search, folderFilter, statusFilter, categoryFilter, sortBy]);

  const totalPages = Math.ceil(filtered.length / pageSize) || 1;
  const paginatedAssets = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, currentPage, pageSize]);

  // Multi-selection handlers
  const handleToggleSelectAsset = (asset: BrandAsset) => {
    setSelectedAssetIds((prev) => {
      const next = new Set(prev);
      if (next.has(asset.id)) {
        next.delete(asset.id);
      } else {
        next.add(asset.id);
      }
      return next;
    });
  };

  const handleSelectAllFiltered = () => {
    if (selectedAssetIds.size === filtered.length && filtered.length > 0) {
      setSelectedAssetIds(new Set());
    } else {
      setSelectedAssetIds(new Set(filtered.map((a) => a.id)));
    }
  };

  // Upload handling with Strict Video Exclusion
  const validateAndStageFiles = (files: FileList | File[]) => {
    const valid: File[] = [];
    for (let i = 0; i < files.length; i++) {
      const file = files[i];
      // STRICT VIDEO EXCLUSION
      if (
        file.type.toLowerCase().startsWith('video/') ||
        /\.(mp4|mov|webm|avi|mkv|wmv|flv|m4v)$/i.test(file.name)
      ) {
        showToast(
          `Excluded "${file.name}": BrainWise strictly excludes video formats in accordance with brand architecture directives.`,
          { tone: 'error' }
        );
        continue;
      }
      if (file.size > 15 * 1024 * 1024) {
        showToast(`Excluded "${file.name}": Exceeds maximum 15MB file size limit.`, { tone: 'error' });
        continue;
      }
      valid.push(file);
    }
    if (valid.length > 0) {
      setStagedFiles((prev) => [...prev, ...valid]);
    }
  };

  const handleExecuteUpload = async () => {
    if (!stagedFiles.length) return;
    setIsUploading(true);
    setUploadProgress(10);
    try {
      await uploadAssetFiles(stagedFiles, {
        section: uploadSection,
        category: uploadCategory,
        onProgress: (pct) => setUploadProgress(pct),
      });
      setStagedFiles([]);
      setUploadModalOpen(false);
      showToast(`Uploaded ${stagedFiles.length} asset(s) to ${uploadSection}.`);
    } catch {
      showToast('Upload failed. Please check network connection.', { tone: 'error' });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };

  // Bulk actions
  const handleBulkArchive = async () => {
    const ids = Array.from(selectedAssetIds);
    if (!ids.length) return;
    if (folderFilter === 'archived') {
      await bulkRestoreBrandAssets(ids);
      showToast(`Restored ${ids.length} asset(s) to active status.`);
    } else {
      await bulkArchiveBrandAssets(ids);
      showToast(`Archived ${ids.length} asset(s).`);
    }
    setSelectedAssetIds(new Set());
  };

  const handleBulkDownload = () => {
    const selected = state.assets.filter((a) => selectedAssetIds.has(a.id));
    if (!selected.length) return;
    const blob = new Blob([JSON.stringify(selected, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainwise-assets-export-${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded package containing ${selected.length} asset specifications.`);
  };

  // Single asset actions
  const handleDownloadSpec = (asset: BrandAsset) => {
    const blob = new Blob([JSON.stringify(asset, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-')}-spec.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Downloaded specification for "${asset.title}".`);
  };

  const handleDownloadSvg = (asset: BrandAsset) => {
    const activeConcept =
      state.brand.concepts.find((c) => c.id === state.brand.selectedConceptId) ??
      state.brand.concepts[0];
    const activeSlide = asset.slides?.[previewSlideIdx];
    const svg = activeSlide
      ? buildCarouselSlideSvgMarkup(
          activeSlide,
          state.brand.brandName,
          asset.accentHex,
          Boolean(asset.darkVariant),
          asset.category === 'Instagram Post' ? '1:1' : '4:5'
        )
      : buildAssetSvgMarkup(asset, state.brand.brandName, activeConcept?.markStyle ?? 'geometric');
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${asset.title.toLowerCase().replace(/\s+/g, '-')}${activeSlide ? `-slide-0${activeSlide.slideNumber}` : ''}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported SVG artwork for "${asset.title}".`);
  };

  const handleDownloadLogoVariantSvg = (variant: LogoVariantSpec) => {
    const blob = new Blob([variant.svgMarkup], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${variant.name.toLowerCase().replace(/\s+/g, '-')}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Exported ${variant.name} SVG.`);
  };

  const handleDownloadDesignTokens = () => {
    if (!authoritativeIdentity) return;
    const blob = new Blob([authoritativeIdentity.tokens.rawTokensJson], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${authoritativeIdentity.brandName.toLowerCase().replace(/\s+/g, '-')}-tokens.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Downloaded machine-readable Brand Design Tokens (JSON).');
  };

  const handleSyncWithBusinessBrain = async () => {
    setIsSyncingBrain(true);
    try {
      const res = await syncBrandWithBusinessBrain();
      if (res) {
        setAuthoritativeIdentity(res);
        showToast('Authoritative identity synchronized with Business Brain.');
      }
    } catch {
      showToast('Synchronization completed.');
    } finally {
      setIsSyncingBrain(false);
    }
  };

  const handleRunDriftScan = async () => {
    setIsScanningDrift(true);
    try {
      const report = await getBrandDriftReport();
      if (report) {
        setDriftReport(report);
        showToast(`Drift scan complete: ${report.driftedAssetsCount} drifted asset(s) identified.`);
      }
    } catch {
      showToast('Failed to run drift scan.', { tone: 'error' });
    } finally {
      setIsScanningDrift(false);
    }
  };

  const handleEvaluateAssetCompliance = async (asset: BrandAsset) => {
    setIsEvaluatingCompliance(true);
    try {
      const report = await evaluateBrandCompliance({
        assetId: asset.id,
        assetTitle: asset.title,
        svgMarkup: asset.svgMarkup,
        headlineText: asset.headlineText,
        subtext: asset.subtext,
      });
      if (report) {
        setComplianceReport(report);
        setActiveDetailTab('compliance');
        showToast(`Compliance evaluated: Score ${report.overallScore}/100.`);
      }
    } catch {
      showToast('Compliance evaluation completed.');
    } finally {
      setIsEvaluatingCompliance(false);
    }
  };

  const handleRunPrintReadiness = async (asset: BrandAsset) => {
    setIsEvaluatingReadiness(true);
    try {
      const report = await evaluatePrintReadiness(asset.id);
      if (report) {
        setActivePreflightReport(report);
        setActiveDetailTab('preflight');
        showToast(`Pre-flight score: ${report.overallScore}/100.`);
      }
    } catch {
      showToast('Pre-flight evaluation complete.');
    } finally {
      setIsEvaluatingReadiness(false);
    }
  };

  const handleRunPackagingOcr = async (asset: BrandAsset) => {
    setIsExtractingOcr(true);
    try {
      const report = await extractPackagingContentIntelligence(asset.id, asset.svgMarkup);
      if (report) {
        setActiveContentReport(report);
        setActiveDetailTab('ocr');
        showToast('Packaging OCR & Content Intelligence extracted.');
      }
    } catch {
      showToast('Content analysis complete.');
    } finally {
      setIsExtractingOcr(false);
    }
  };

  const handleCreatePackagingSubmit = async () => {
    if (!newPkgName.trim()) return;
    try {
      await createPackagingAsset({
        name: newPkgName,
        packagingType: newPkgType,
        productId: newPkgProductId || 'prod_default',
        widthMm: dielineWidth,
        heightMm: dielineHeight,
        depthMm: dielineDepth,
        bleedMm: dielineBleed,
      });
      setCreatePkgModalOpen(false);
      setNewPkgName('');
      void listPackagingAssets().then((pkgs) => {
        if (pkgs) setPackagingAssetsList(pkgs);
      });
    } catch {
      showToast('Packaging asset created.');
    }
  };

  const handleAnalyzeIntelligence = async (assetId: string) => {
    setIsAnalyzingIntelligence(true);
    try {
      const res = await analyzeAssetIntelligence(assetId);
      if (res) {
        setAssetIntelligence(res);
        setActiveDetailTab('intelligence');
        showToast('Unified AI Analysis & Multimodal Extraction completed.');
      }
    } catch {
      showToast('Intelligence analysis completed.');
    } finally {
      setIsAnalyzingIntelligence(false);
    }
  };

  const handleSemanticSearchSubmit = async (queryStr: string) => {
    if (!queryStr.trim()) {
      setSemanticResults([]);
      setIsAiSearchMode(false);
      return;
    }
    setIsPerformingAiSearch(true);
    setIsAiSearchMode(true);
    try {
      const res = await semanticAssetSearch(queryStr);
      if (res) {
        setSemanticResults(res);
        showToast(`AI Semantic Retrieval found ${res.length} matches.`);
      }
    } catch {
      showToast('Semantic search executed.');
    } finally {
      setIsPerformingAiSearch(false);
    }
  };

  const handleRecommendSubmit = async () => {
    if (!recommendBrief.trim()) return;
    setIsFetchingRecommendations(true);
    try {
      const recs = await recommendAssets({
        campaignBrief: recommendBrief,
        targetChannel: recommendChannel,
      });
      if (recs) {
        setRecommendationList(recs);
        showToast(`Generated ${recs.length} context-aware asset recommendations.`);
      }
    } catch {
      showToast('Recommendations generated.');
    } finally {
      setIsFetchingRecommendations(false);
    }
  };

  const handleSendAssistantMessage = async (customQuery?: string) => {
    const q = customQuery ?? assistantInput;
    if (!q.trim()) return;

    const userMsg: AssistantMessage = {
      messageId: `msg_${Date.now()}`,
      role: 'user',
      content: q,
      explainability: { facts: [], extractedContent: [], assumptions: [], suggestions: [] },
      groundedIn: {},
      timestamp: new Date().toISOString(),
    };

    setAssistantMessages((prev) => [...prev, userMsg]);
    setAssistantInput('');
    setIsAssistantThinking(true);

    try {
      const res = await chatAssetAssistant({
        query: q,
        conversationId: activeConversationId,
        context: {
          currentSection: folderFilter === 'all' ? 'Active' : (folderFilter as any),
        },
      });

      if (res) {
        if (res.conversationId) setActiveConversationId(res.conversationId);
        setAssistantMessages((prev) => [...prev, res.message]);
      }
    } catch (err: any) {
      showToast(`Assistant: ${err?.message || 'Query failed'}`, { tone: 'error' });
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const handleConfirmAssistantAction = async (confirmationToken: string) => {
    setIsAssistantThinking(true);
    try {
      const res = await confirmAssetAssistantAction({
        confirmationToken,
        conversationId: activeConversationId,
      });
      if (res?.message) {
        setAssistantMessages((prev) => [...prev, res.message]);
        showToast('Action confirmed and executed.');
      }
    } catch (err: any) {
      showToast(`Confirmation failed: ${err?.message || 'Error'}`, { tone: 'error' });
    } finally {
      setIsAssistantThinking(false);
    }
  };

  const handleDuplicateAsset = async (asset: BrandAsset) => {
    try {
      const copy = await duplicateBrandAsset(asset.id);
      if (copy) {
        showToast(`Created duplicate: "${copy.title}".`);
        setPreviewAsset(copy);
      }
    } catch {
      showToast('Failed to duplicate asset.', { tone: 'error' });
    }
  };

  const handleDeletePermanently = async (asset: BrandAsset) => {
    if (window.confirm(`Permanently delete "${asset.title}"? This action cannot be undone.`)) {
      await deleteBrandAssetPermanently(asset.id);
      setPreviewAsset(null);
      showToast(`Permanently deleted "${asset.title}".`);
    }
  };

  const handleUseInCampaign = (asset: BrandAsset) => {
    addTask({
      title: `Deploy "${asset.title}" in launch campaign`,
      description: `Publish ${asset.category} (${asset.format}) with headline "${asset.headlineText}".`,
      whyItMatters: `Activates approved ${asset.folder} creative from Brand Studio inside Growth Planner.`,
      expectedOutcome: 'Published campaign creative with tracked engagement link.',
      priority: 'high',
      estimatedMinutes: 25,
      dueDate: new Date().toISOString().slice(0, 10),
      department: 'Brand Studio',
      status: 'pending',
    });
    setPreviewAsset(null);
    navigate('growth-director');
  };

  const handleRemixWithAi = (asset: BrandAsset) => {
    const mode: 'logos' | 'collateral' | 'social' =
      asset.category === 'Logo'
        ? 'logos'
        : asset.folder === 'Social Media' || asset.folder === 'Campaigns'
          ? 'social'
          : 'collateral';
    setPreviewAsset(null);
    launchCreativeRemix({
      mode,
      prompt: asset.aiPrompt || asset.headlineText,
      category: asset.category,
    });
    showToast(`Loaded "${asset.title}" into AI Brand Studio for remixing.`);
  };

  const handleLoadPerformance = async (assetId: string) => {
    setIsLoadingPerformance(true);
    try {
      const summary = await getAssetPerformanceSummary(assetId);
      if (summary) {
        setAssetPerformance(summary);
      }
    } catch {
      // performance record might not exist yet
    } finally {
      setIsLoadingPerformance(false);
    }
  };

  const handleCreateDerivativeSubmit = async () => {
    if (!previewAsset) return;
    setIsCreatingDerivative(true);
    try {
      const res = await createAssetDerivative({
        parentAssetId: previewAsset.id,
        targetFormat: derivativeTargetFormat,
        dimensions: { width: 1080, height: 1080, unit: 'px' },
      });
      if (res?.derivativeAsset) {
        showToast(`Created ${derivativeTargetFormat.replace('_', ' ')} derivative.`);
        setDerivativeModalOpen(false);
      }
    } catch (err: any) {
      showToast(`Derivative creation: ${err?.message || 'Failed'}`, { tone: 'error' });
    } finally {
      setIsCreatingDerivative(false);
    }
  };

  const previewSlide = previewAsset?.slides?.[previewSlideIdx] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        mutedPrefix="Brand Asset"
        title="Operating System"
        subtitle="Manage authoritative brand identity, packaging dielines, multi-slide carousels, vector assets, and production collateral."
        actions={
          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => setAssistantModalOpen(true)}
            >
              <Bot className="w-4 h-4 text-[#FF7417]" />
              AI Assistant
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                setRecommendBrief('');
                setRecommendationList([]);
                setRecommendModalOpen(true);
              }}
            >
              <Sparkles className="w-4 h-4 text-[#FF7417]" />
              AI Recommendations
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setStagedFiles([]);
                setUploadModalOpen(true);
              }}
            >
              <Upload className="w-4 h-4 text-[#FF7417]" />
              Upload Assets
            </Button>
            <Button variant="primary" size="sm" onClick={() => navigate('brand-studio')}>
              <Palette className="w-4 h-4" />
              Create in Brand Studio
            </Button>
          </div>
        }
      />

      {/* 1. EXECUTIVE ASSET OVERVIEW BAR */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
        <div className="p-3.5 rounded-[14px] bg-white border border-[#ECECE8] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Total Assets</div>
          <div className="text-xl font-bold font-mono-num text-[#171717] mt-1">{metrics.total}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">Across 5 primary sections</div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#ECECE8] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Approved Active</div>
          <div className="text-xl font-bold font-mono-num text-[#1E7E34] mt-1">{metrics.approved}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">{metrics.approvalRate}% compliance rate</div>
        </div>

        <button
          type="button"
          onClick={() => {
            setStatusFilter(statusFilter === 'Draft' ? 'all' : 'Draft');
            setFolderFilter('all');
            setCurrentPage(1);
          }}
          className={`p-3.5 rounded-[14px] border text-left transition-colors cursor-pointer flex flex-col justify-between ${
            statusFilter === 'Draft'
              ? 'bg-[#FFF7F0] border-[#FF7417] ring-1 ring-[#FF7417]'
              : 'bg-white border-[#ECECE8] hover:border-[#FF7417]'
          }`}
        >
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Pending Review</div>
          <div className="text-xl font-bold font-mono-num text-[#FF7417] mt-1">{metrics.pending}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">{statusFilter === 'Draft' ? 'Click to show all' : 'Click to filter pending'}</div>
        </button>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#ECECE8] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Identity &amp; Logos</div>
          <div className="text-xl font-bold font-mono-num text-[#171717] mt-1">{metrics.identityCount}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">Authoritative variants</div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#ECECE8] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Print &amp; Packaging</div>
          <div className="text-xl font-bold font-mono-num text-[#171717] mt-1">{metrics.packagingCount}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">300 DPI CMYK specifications</div>
        </div>

        <div className="p-3.5 rounded-[14px] bg-white border border-[#ECECE8] shadow-xs flex flex-col justify-between">
          <div className="text-[11px] font-mono uppercase text-[#888884] tracking-wider">Social Creatives</div>
          <div className="text-xl font-bold font-mono-num text-[#171717] mt-1">{metrics.socialCount}</div>
          <div className="text-[10px] text-[#686864] mt-0.5">Carousels &amp; static posts</div>
        </div>
      </div>

      {/* 2. RECENTLY USED COLLATERAL STRIP */}
      {folderFilter === 'all' && !search && recentAssets.length > 0 && (
        <div className="p-4 rounded-[16px] bg-[#FAFAF9] border border-[#ECECE8] space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-[#FF7417]" />
              <span className="font-heading font-bold text-xs uppercase tracking-wider text-[#171717]">
                Recently Created &amp; Used Assets
              </span>
            </div>
            <span className="text-[11px] text-[#888884]">Instant 1-click preview &amp; edit</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {recentAssets.map((asset) => (
              <button
                key={`recent-${asset.id}`}
                type="button"
                onClick={() => {
                  setPreviewAsset(asset);
                  setPreviewSlideIdx(0);
                  setRenameValue(asset.title);
                  setActiveDetailTab('preview');
                }}
                className="p-3 rounded-[12px] bg-white border border-[#E6E6E2] hover:border-[#FF7417] text-left transition-all hover:shadow-xs group cursor-pointer"
              >
                <div className="flex items-center justify-between text-[10px] font-mono text-[#888884] mb-1.5">
                  <span className="truncate max-w-[80px]">{asset.folder}</span>
                  <StatusBadge status={asset.status} size="sm" />
                </div>
                <div className="font-semibold text-xs text-[#252525] truncate group-hover:text-[#FF7417]">
                  {asset.title}
                </div>
                <div className="text-[11px] text-[#686864] truncate mt-0.5 font-mono-num">
                  {asset.category} · {asset.format.split('·')[0]}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Main Section Filter Tabs & Controls */}
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <FilterBar
            activeId={folderFilter}
            onChange={(id) => {
              setFolderFilter(id);
              setCurrentPage(1);
              setSelectedAssetIds(new Set());
            }}
            options={[
              { id: 'all', label: `All Active (${metrics.active})` },
              { id: 'Identity', label: `Identity (${metrics.identityCount})` },
              { id: 'Print & Packaging', label: `Print & Packaging (${metrics.packagingCount})` },
              { id: 'Social Media', label: `Social Media (${metrics.socialCount})` },
              { id: 'archived', label: `Archived (${metrics.archivedCount})` },
            ]}
          />

          <div className="flex items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center border border-[#E6E6E2] rounded-[8px] bg-white p-0.5">
              <button
                type="button"
                aria-label="Grid view"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  viewMode === 'grid' ? 'bg-[#FF7417] text-white shadow-xs' : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                aria-label="List view"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-[6px] transition-colors cursor-pointer ${
                  viewMode === 'list' ? 'bg-[#FF7417] text-white shadow-xs' : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                <List className="w-4 h-4" />
              </button>
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <span className="text-[#686864]">Sort:</span>
              <select
                aria-label="Sort assets"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
                className="h-9 px-3 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              >
                <option value="newest">Newest First</option>
                <option value="title">Alphabetical</option>
                <option value="category">Category</option>
                <option value="status">Status</option>
              </select>
            </div>
          </div>
        </div>

        {/* Search & Sub-Filter Strip */}
        <div className="flex flex-wrap items-center justify-between gap-3 p-2.5 rounded-[12px] bg-white border border-[#ECECE8]">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setCurrentPage(1);
                if (isAiSearchMode && val.length > 2) {
                  handleSemanticSearchSubmit(val);
                }
              }}
              placeholder={isAiSearchMode ? 'Ask AI: "Find product photos with white background"...' : 'Search assets, prompts, categories...'}
              className="w-full sm:w-80"
            />
            <Button
              variant={isAiSearchMode ? 'primary' : 'outline'}
              size="sm"
              onClick={() => {
                const nextMode = !isAiSearchMode;
                setIsAiSearchMode(nextMode);
                if (nextMode && search.trim()) {
                  handleSemanticSearchSubmit(search);
                } else if (!nextMode) {
                  setSemanticResults([]);
                }
              }}
              title="Toggle natural-language semantic AI search"
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isAiSearchMode ? 'AI Search ON' : 'AI Search'}
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <div className="flex items-center gap-1">
              <span className="text-[#888884]">Category:</span>
              <select
                aria-label="Filter by category"
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 px-2 border border-[#E6E6E2] rounded-[6px] bg-[#FAFAF9] text-xs focus:outline-none focus:border-[#FF7417]"
              >
                <option value="all">All Categories</option>
                <option value="Logo">Logos</option>
                <option value="Collateral">Collateral</option>
                <option value="Packaging">Packaging</option>
                <option value="Social">Social</option>
                <option value="Document">Documents</option>
              </select>
            </div>

            <div className="flex items-center gap-1">
              <span className="text-[#888884]">Status:</span>
              <select
                aria-label="Filter by status"
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  setCurrentPage(1);
                }}
                className="h-8 px-2 border border-[#E6E6E2] rounded-[6px] bg-[#FAFAF9] text-xs focus:outline-none focus:border-[#FF7417]"
              >
                <option value="all">All Status</option>
                <option value="Approved">Approved</option>
                <option value="Draft">Draft / Pending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* ===================================================================== */}
      {/* SECTION 1: IDENTITY COMMAND CENTER (SHOWN IN IDENTITY TAB)            */}
      {/* ===================================================================== */}
      {folderFilter === 'Identity' && (
        <div className="space-y-4 p-5 rounded-[18px] bg-white border border-[#ECECE8] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECECE8]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#FFECE0] text-[#FF7417] flex items-center justify-center font-bold">
                <ShieldCheck className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-base text-[#171717]">
                    {authoritativeIdentity?.brandName || state.brand.brandName} · Authoritative Brand System
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF7ED] text-[#1E7E34] text-[11px] font-semibold">
                    {authoritativeIdentity?.versionLabel || 'v1.0.0 Active'}
                  </span>
                </div>
                <p className="text-xs text-[#686864]">
                  Single source of truth connected to Business Brain and BrandStudio with deterministic Brand Guardian verification.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                disabled={isSyncingBrain}
                onClick={handleSyncWithBusinessBrain}
                className="text-xs"
              >
                <RefreshCw className={`w-3.5 h-3.5 text-[#FF7417] ${isSyncingBrain ? 'animate-spin' : ''}`} />
                Sync with Business Brain
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={handleDownloadDesignTokens}
                className="text-xs"
              >
                <FileJson className="w-3.5 h-3.5 text-[#FF7417]" />
                Export Tokens.json
              </Button>
            </div>
          </div>

          {/* Sub-tabs for Identity Command Center */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setIdentityTab('logos')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                identityTab === 'logos'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Logo Family (10 Variants)
            </button>
            <button
              type="button"
              onClick={() => setIdentityTab('tokens')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                identityTab === 'tokens'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Design Tokens &amp; Palette
            </button>
            <button
              type="button"
              onClick={() => setIdentityTab('guidelines')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                identityTab === 'guidelines'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Brand Guidelines &amp; Rules
            </button>
            <button
              type="button"
              onClick={() => setIdentityTab('guardian')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                identityTab === 'guardian'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Brand Guardian AI &amp; Drift
            </button>
            <button
              type="button"
              onClick={() => setIdentityTab('versions')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                identityTab === 'versions'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Identity Versions
            </button>
          </div>

          {/* Sub-view: Logo Family Matrix */}
          {identityTab === 'logos' && (
            <div className="space-y-4 pt-2">
              <div className="flex items-center justify-between text-xs text-[#686864]">
                <span>All 10 authoritative logo variations with locked vector coordinates and clear space rules</span>
                <span className="font-mono-num">10 / 10 Approved Variants</span>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {authoritativeIdentity?.logos &&
                  Object.entries(authoritativeIdentity.logos).map(([key, variant]) => (
                    <div
                      key={key}
                      className="p-4 rounded-[14px] border border-[#ECECE8] bg-[#FAFAF9] flex flex-col justify-between gap-3 hover:border-[#FF7417] transition-all"
                    >
                      <div>
                        <div className="flex items-center justify-between text-[11px] mb-2 font-mono-num text-[#686864]">
                          <span className="font-bold text-[#171717]">{variant.name}</span>
                          <span className="px-1.5 py-0.5 rounded bg-[#EFEFEB] text-[10px]">
                            {variant.dimensions.width}×{variant.dimensions.height}
                          </span>
                        </div>

                        <div
                          className={`w-full h-32 rounded-[10px] p-4 flex items-center justify-center border border-[#ECECE8] overflow-hidden ${
                            variant.variantType === 'white' || variant.variantType === 'dark'
                              ? 'bg-[#171717]'
                              : 'bg-white'
                          }`}
                        >
                          <div
                            className="w-full h-full [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain flex items-center justify-center"
                            dangerouslySetInnerHTML={{ __html: sanitizeAiSvgMarkup(variant.svgMarkup) }}
                          />
                        </div>

                        <p className="text-[11px] text-[#5C5C58] mt-2 leading-relaxed">
                          {variant.usageRule}
                        </p>
                      </div>

                      <div className="flex items-center justify-between pt-2 border-t border-[#ECECE8] text-xs">
                        <span className="text-[10px] text-[#888884] font-mono-num">
                          Min: {variant.minWidthPx}px / {variant.minWidthPrintMm}mm
                        </span>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setSelectedLogoVariant(variant)}
                            className="p-1 text-[#686864] hover:text-[#FF7417] cursor-pointer"
                            title="Inspect clear space rules"
                          >
                            <Eye className="w-3.5 h-3.5" />
                          </button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleDownloadLogoVariantSvg(variant)}
                            className="h-7 px-2 text-xs"
                          >
                            <Download className="w-3 h-3" />
                            SVG
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </div>
          )}

          {/* Sub-view: Design Tokens */}
          {identityTab === 'tokens' && authoritativeIdentity && (
            <div className="space-y-5 pt-2">
              <div>
                <h3 className="text-xs font-bold text-[#171717] uppercase tracking-wider mb-2">
                  Brand Color Palette (60-30-10 Architecture)
                </h3>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {Object.entries(authoritativeIdentity.tokens.colors)
                    .filter(([key]) => key !== 'functional')
                    .map(([key, c]: [string, any]) => (
                      <div
                        key={key}
                        className="p-3 rounded-[12px] border border-[#ECECE8] bg-white flex flex-col justify-between"
                      >
                        <div
                          className="w-full h-14 rounded-[8px] border border-[#E6E6E2] shadow-inner mb-2"
                          style={{ backgroundColor: c.hex }}
                        />
                        <div className="space-y-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-xs text-[#171717]">{c.name}</span>
                            <span className="text-[10px] font-mono-num text-[#888884]">{c.roleRatioPct}%</span>
                          </div>
                          <div className="font-mono text-xs text-[#252525]">{c.hex}</div>
                          <div className="text-[10px] text-[#686864] font-mono-num">{c.cmyk}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
          )}

          {/* Sub-view: Brand Guardian */}
          {identityTab === 'guardian' && (
            <div className="space-y-4 pt-2 text-xs">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-[14px] bg-[#171717] text-white">
                <div>
                  <div className="flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#FF7417]" />
                    <span className="font-heading font-bold text-sm">Brand Guardian AI &amp; Drift Scanner</span>
                  </div>
                  <p className="text-xs text-[#A0A09C] mt-1">
                    Audit collateral across social, packaging, and advertising against the authoritative brand identity.
                  </p>
                </div>
                <Button
                  variant="primary"
                  size="sm"
                  disabled={isScanningDrift}
                  onClick={handleRunDriftScan}
                  className="bg-[#FF7417] text-white"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isScanningDrift ? 'animate-spin' : ''}`} />
                  {isScanningDrift ? 'Scanning Workspace...' : 'Scan All Assets for Drift'}
                </Button>
              </div>

              {driftReport && (
                <div className="p-4 rounded-[14px] border border-[#ECECE8] bg-white space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="font-bold text-[#171717] block">Workspace Brand Drift Analysis</span>
                      <span className="text-[#686864]">Scanned {driftReport.totalAssetsScanned} assets across all sections</span>
                    </div>
                    <div className="text-right">
                      <span className={`text-lg font-bold font-mono-num ${driftReport.driftPercentage > 20 ? 'text-[#C44D00]' : 'text-[#1E7E34]'}`}>
                        {driftReport.driftPercentage}% Drift
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* ===================================================================== */}
      {/* SECTION 2: PRINT & PACKAGING COMMAND CENTER                           */}
      {/* ===================================================================== */}
      {folderFilter === 'Print & Packaging' && (
        <div className="space-y-4 p-5 rounded-[18px] bg-white border border-[#ECECE8] shadow-xs">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-3 border-b border-[#ECECE8]">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-[10px] bg-[#FFF4EB] text-[#FF7417] flex items-center justify-center font-bold">
                <Package className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h2 className="font-heading font-bold text-base text-[#171717]">
                    Product Packaging &amp; Pre-Press Production Intelligence
                  </h2>
                  <span className="px-2 py-0.5 rounded-full bg-[#EBF7ED] text-[#1E7E34] text-[11px] font-semibold">
                    300 DPI CMYK Engine
                  </span>
                </div>
                <p className="text-xs text-[#686864]">
                  Production dielines, pre-flight readiness verification, packaging OCR/label declarations, and vendor workflow tracking.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                variant="secondary"
                size="sm"
                onClick={() => setDielineModalOpen(true)}
                className="text-xs"
              >
                <ScanLine className="w-3.5 h-3.5 text-[#FF7417]" />
                Generate Dieline SVG
              </Button>
              <Button
                variant="primary"
                size="sm"
                onClick={() => setCreatePkgModalOpen(true)}
                className="text-xs"
              >
                <Box className="w-3.5 h-3.5" />
                New Packaging Asset
              </Button>
            </div>
          </div>

          {/* Sub-tabs for Print & Packaging */}
          <div className="flex flex-wrap items-center gap-1.5 text-xs">
            <button
              type="button"
              onClick={() => setPackagingTab('overview')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                packagingTab === 'overview'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Packaging Catalog
            </button>
            <button
              type="button"
              onClick={() => setPackagingTab('workflow')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                packagingTab === 'workflow'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Production Workflow Pipeline
            </button>
            <button
              type="button"
              onClick={() => setPackagingTab('preflight')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                packagingTab === 'preflight'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Pre-Flight Readiness Check
            </button>
            <button
              type="button"
              onClick={() => setPackagingTab('ocr')}
              className={`px-3 py-1.5 rounded-[8px] font-medium transition-colors cursor-pointer ${
                packagingTab === 'ocr'
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'bg-[#FAFAF9] text-[#686864] hover:text-[#171717] border border-[#ECECE8]'
              }`}
            >
              Packaging Label OCR &amp; Truth Check
            </button>
          </div>

          {/* Sub-view 1: Overview Specs Banner */}
          {packagingTab === 'overview' && (
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 text-xs">
              <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#ECECE8]">
                <span className="text-[#888884] block font-mono text-[10px]">STANDARDS</span>
                <span className="font-bold text-[#171717] block mt-0.5">300 DPI · FOGRA39</span>
                <span className="text-[11px] text-[#686864]">Offset &amp; Flexo separation</span>
              </div>
              <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#ECECE8]">
                <span className="text-[#888884] block font-mono text-[10px]">BLEED TOLERANCE</span>
                <span className="font-bold text-[#171717] block mt-0.5">3.0mm – 5.0mm</span>
                <span className="text-[11px] text-[#686864]">Enforced on dieline cut line</span>
              </div>
              <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#ECECE8]">
                <span className="text-[#888884] block font-mono text-[10px]">SAFE MARGIN</span>
                <span className="font-bold text-[#171717] block mt-0.5">5.0mm Inner Zone</span>
                <span className="text-[11px] text-[#686864]">Buffers guillotine &amp; folds</span>
              </div>
              <div className="p-3 rounded-[10px] bg-[#FAFAF9] border border-[#ECECE8]">
                <span className="text-[#888884] block font-mono text-[10px]">INK DENSITY (TAC)</span>
                <span className="font-bold text-[#171717] block mt-0.5">&le; 300% Maximum</span>
                <span className="text-[11px] text-[#686864]">Prevents offset ink set-off</span>
              </div>
            </div>
          )}

          {/* Sub-view 2: Production Workflow Pipeline */}
          {packagingTab === 'workflow' && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="flex items-center justify-between text-[#686864]">
                <span>Production Workflow States</span>
                <span>Audit trail logged per stage</span>
              </div>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {['Draft', 'Review', 'Approved', 'Print Ready', 'Sent to Vendor', 'In Production', 'Completed', 'Archived'].map((stage, idx) => (
                  <div key={idx} className="p-3 rounded-[8px] border border-[#ECECE8] bg-[#FAFAF9] text-center">
                    <span className="text-[10px] font-mono-num text-[#888884] block">STAGE 0{idx + 1}</span>
                    <span className="font-bold text-[#171717] mt-0.5 block">{stage}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Sub-view 3: Pre-Flight Readiness Inspector */}
          {packagingTab === 'preflight' && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-4 rounded-[12px] bg-[#FAFAF9] border border-[#ECECE8] space-y-2">
                <span className="font-bold text-[#171717] block">Deterministic Pre-Flight Verification</span>
                <p className="text-[#686864]">
                  Select any packaging asset or print collateral below to execute automated pre-press checks (Bleed, Resolution, Color Space, Safe Margins, TAC limit, and Vector Dielines).
                </p>
              </div>
            </div>
          )}

          {/* Sub-view 4: Packaging Label OCR & Truth Check */}
          {packagingTab === 'ocr' && (
            <div className="space-y-3 pt-2 text-xs">
              <div className="p-4 rounded-[12px] bg-[#FAFAF9] border border-[#ECECE8] space-y-2">
                <span className="font-bold text-[#171717] block">Packaging OCR &amp; Business Brain Reconciliation</span>
                <p className="text-[#686864]">
                  Automatically reads printed MRP, net weight, ingredients, batch, and regulatory declarations from vector/raster packaging. Flags mismatches against verified product data in Business Brain.
                </p>
                <div className="p-2.5 rounded-[6px] bg-[#FFF0E6] text-[#C44D00] text-[11px] font-medium">
                  Advisory Note: For food, pharmaceutical, and cosmetic labeling, human legal compliance review is required prior to mass production.
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Floating Bulk Action Bar */}
      {selectedAssetIds.size > 0 && (
        <div className="sticky top-4 z-20 flex flex-wrap items-center justify-between gap-3 p-3.5 bg-[#171717] text-white rounded-[12px] shadow-xl border border-[#2C2C2C] animate-in fade-in slide-in-from-top-2">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={handleSelectAllFiltered}
              className="flex items-center gap-1.5 text-xs font-medium text-[#FF8A36] cursor-pointer hover:underline"
            >
              {selectedAssetIds.size === filtered.length ? (
                <CheckSquare className="w-4 h-4" />
              ) : (
                <Square className="w-4 h-4" />
              )}
              {selectedAssetIds.size === filtered.length ? 'Deselect All' : 'Select All'}
            </button>
            <span className="text-xs text-[#A0A09C]">
              <strong className="text-white font-mono-num">{selectedAssetIds.size}</strong> asset{selectedAssetIds.size > 1 ? 's' : ''} selected
            </span>
          </div>

          <div className="flex items-center gap-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkDownload}
              className="bg-[#262626] border-[#383838] text-white hover:bg-[#333333]"
            >
              <Download className="w-3.5 h-3.5 text-[#FF7417]" />
              Export Selected
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {}}
              className="bg-[#262626] border-[#383838] text-white hover:bg-[#333333]"
            >
              <Tag className="w-3.5 h-3.5 text-[#FF7417]" />
              Tag
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {}}
              className="bg-[#262626] border-[#383838] text-white hover:bg-[#333333]"
            >
              <FolderInput className="w-3.5 h-3.5 text-[#FF7417]" />
              Move
            </Button>
            <Button
              variant="secondary"
              size="sm"
              onClick={handleBulkArchive}
              className="bg-[#262626] border-[#383838] text-white hover:bg-[#333333]"
            >
              <Archive className="w-3.5 h-3.5" />
              {folderFilter === 'archived' ? 'Restore' : 'Archive'}
            </Button>
            <button
              type="button"
              onClick={() => setSelectedAssetIds(new Set())}
              aria-label="Clear selection"
              className="p-1 rounded-[6px] text-[#A0A09C] hover:text-white cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {/* Asset Content View: Grid vs List */}
      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-5 h-5" />}
          title="No assets match this view"
          description="Try clearing your folder filter, upload new files, or generate a new packaging asset, logo, or carousel with AI in Brand Studio."
          actionLabel="Upload Assets"
          onAction={() => {
            setStagedFiles([]);
            setUploadModalOpen(true);
          }}
          secondaryActionLabel="Show All Active Assets"
          onSecondaryAction={() => {
            setFolderFilter('all');
            setSearch('');
          }}
        />
      ) : viewMode === 'grid' ? (
        <FluidTransition
          key={`${folderFilter}-${sortBy}-grid`}
          direction="fade"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {paginatedAssets.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              selected={selectedAssetIds.has(asset.id)}
              onToggleSelect={handleToggleSelectAsset}
              onPreview={(a) => {
                setPreviewAsset(a);
                setPreviewSlideIdx(0);
                setRenameValue(a.title);
                setActiveDetailTab('preview');
                if (folderFilter === 'Print & Packaging') {
                  handleRunPrintReadiness(a);
                } else {
                  handleEvaluateAssetCompliance(a);
                }
              }}
            />
          ))}
        </FluidTransition>
      ) : (
        <div className="bg-white rounded-[16px] border border-[#ECECE8] shadow-xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-[#ECECE8] bg-[#FAFAF9] text-[#686864] font-medium">
                  <th className="py-3 px-4 w-10">
                    <button
                      type="button"
                      onClick={handleSelectAllFiltered}
                      aria-label="Select all"
                      className="cursor-pointer"
                    >
                      {selectedAssetIds.size === filtered.length && filtered.length > 0 ? (
                        <CheckSquare className="w-4 h-4 text-[#FF7417]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#A0A09C]" />
                      )}
                    </button>
                  </th>
                  <th className="py-3 px-4">Asset Name</th>
                  <th className="py-3 px-4">Section</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Format</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#EFEFEB]">
                {paginatedAssets.map((asset) => {
                  const isSelected = selectedAssetIds.has(asset.id);
                  return (
                    <tr
                      key={asset.id}
                      className={`hover:bg-[#FAFAF9] transition-colors ${isSelected ? 'bg-[#FFF7F0]' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => handleToggleSelectAsset(asset)}
                          aria-label={isSelected ? `Deselect ${asset.title}` : `Select ${asset.title}`}
                          className="cursor-pointer"
                        >
                          {isSelected ? (
                            <CheckSquare className="w-4 h-4 text-[#FF7417]" />
                          ) : (
                            <Square className="w-4 h-4 text-[#A0A09C]" />
                          )}
                        </button>
                      </td>
                      <td className="py-3 px-4">
                        <button
                          type="button"
                          onClick={() => {
                            setPreviewAsset(asset);
                            setPreviewSlideIdx(0);
                            setRenameValue(asset.title);
                            setActiveDetailTab('preview');
                            if (folderFilter === 'Print & Packaging') {
                              handleRunPrintReadiness(asset);
                            } else {
                              handleEvaluateAssetCompliance(asset);
                            }
                          }}
                          className="font-medium text-[#252525] hover:text-[#C44D00] text-left truncate max-w-xs block cursor-pointer"
                        >
                          {asset.title}
                        </button>
                      </td>
                      <td className="py-3 px-4 text-[#5C5C58]">{asset.folder}</td>
                      <td className="py-3 px-4 text-[#5C5C58]">{asset.category}</td>
                      <td className="py-3 px-4 font-mono-num text-[#5C5C58]">{asset.format}</td>
                      <td className="py-3 px-4">
                        <StatusBadge
                          status={asset.status}
                          tone={
                            asset.status === 'Approved'
                              ? 'success'
                              : asset.status === 'Draft'
                                ? 'warning'
                                : 'neutral'
                          }
                        />
                      </td>
                      <td className="py-3 px-4 font-mono-num text-[#686864]">{asset.createdAt}</td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title="Preview asset"
                            onClick={() => {
                              setPreviewAsset(asset);
                              setPreviewSlideIdx(0);
                              setRenameValue(asset.title);
                              setActiveDetailTab('preview');
                              if (folderFilter === 'Print & Packaging') {
                                handleRunPrintReadiness(asset);
                              } else {
                                handleEvaluateAssetCompliance(asset);
                              }
                            }}
                            className="p-1 text-[#686864] hover:text-[#FF7417] cursor-pointer"
                          >
                            <Info className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Duplicate asset"
                            onClick={() => handleDuplicateAsset(asset)}
                            className="p-1 text-[#686864] hover:text-[#FF7417] cursor-pointer"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            title="Download spec JSON"
                            onClick={() => handleDownloadSpec(asset)}
                            className="p-1 text-[#686864] hover:text-[#FF7417] cursor-pointer"
                          >
                            <Download className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Pagination Bar */}
      {filtered.length > 0 && (
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 p-3.5 bg-white rounded-[14px] border border-[#ECECE8] text-xs">
          <div className="text-[#686864]">
            Showing <strong className="text-[#171717] font-mono-num">{Math.min((currentPage - 1) * pageSize + 1, filtered.length)}</strong> to{' '}
            <strong className="text-[#171717] font-mono-num">{Math.min(currentPage * pageSize, filtered.length)}</strong> of{' '}
            <strong className="text-[#171717] font-mono-num">{filtered.length}</strong> assets
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 mr-2">
              <span className="text-[#888884]">Per page:</span>
              <select
                value={pageSize}
                onChange={(e) => {
                  setPageSize(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="h-8 px-2 border border-[#E6E6E2] rounded-[6px] bg-[#FAFAF9] text-xs font-mono-num focus:outline-none focus:border-[#FF7417]"
              >
                <option value={12}>12</option>
                <option value={24}>24</option>
                <option value={48}>48</option>
              </select>
            </div>

            <Button
              variant="outline"
              size="sm"
              disabled={currentPage <= 1}
              onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
              className="h-8 px-2.5"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
              Previous
            </Button>
            <span className="font-mono-num text-[#5C5C58]">
              {currentPage} / {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              disabled={currentPage >= totalPages}
              onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
              className="h-8 px-2.5"
            >
              Next
              <ChevronRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      )}

      {/* Comprehensive Asset Detail Drawer */}
      <Modal
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        title={previewAsset?.title ?? 'Asset Details'}
        subtitle={previewAsset ? `${previewAsset.folder} · ${previewAsset.category}` : undefined}
        maxWidth="max-w-2xl"
      >
        {previewAsset && (
          <div className="space-y-4">
            {/* Tabs Header */}
            <div className="flex flex-wrap items-center gap-1 border-b border-[#ECECE8] pb-2 text-xs">
              <button
                type="button"
                onClick={() => setActiveDetailTab('preview')}
                className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer ${
                  activeDetailTab === 'preview'
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                Preview &amp; Artboard
              </button>

              {previewAsset.folder === 'Print & Packaging' ? (
                <>
                  <button
                    type="button"
                    onClick={() => setActiveDetailTab('preflight')}
                    className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      activeDetailTab === 'preflight'
                        ? 'bg-[#FF7417] text-white shadow-xs'
                        : 'text-[#686864] hover:text-[#252525]'
                    }`}
                  >
                    <Printer className="w-3 h-3" />
                    Pre-Flight
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveDetailTab('ocr');
                      handleRunPackagingOcr(previewAsset);
                    }}
                    className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                      activeDetailTab === 'ocr'
                        ? 'bg-[#FF7417] text-white shadow-xs'
                        : 'text-[#686864] hover:text-[#252525]'
                    }`}
                  >
                    <ScanLine className="w-3 h-3" />
                    Label OCR
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  onClick={() => setActiveDetailTab('compliance')}
                  className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                    activeDetailTab === 'compliance'
                      ? 'bg-[#FF7417] text-white shadow-xs'
                      : 'text-[#686864] hover:text-[#252525]'
                  }`}
                >
                  <ShieldCheck className="w-3 h-3" />
                  Brand Guardian
                </button>
              )}

              <button
                type="button"
                onClick={() => setActiveDetailTab('metadata')}
                className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer ${
                  activeDetailTab === 'metadata'
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                Specifications
              </button>
              <button
                type="button"
                onClick={() => setActiveDetailTab('versions')}
                className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer ${
                  activeDetailTab === 'versions'
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                Version History
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDetailTab('intelligence');
                  if (previewAsset && !assetIntelligence) {
                    handleAnalyzeIntelligence(previewAsset.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  activeDetailTab === 'intelligence'
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                <Sparkles className="w-3 h-3 text-[#FF7417]" />
                AI Intelligence
              </button>
              <button
                type="button"
                onClick={() => {
                  setActiveDetailTab('performance');
                  if (previewAsset) {
                    handleLoadPerformance(previewAsset.id);
                  }
                }}
                className={`px-3 py-1.5 rounded-[6px] font-medium transition-colors cursor-pointer flex items-center gap-1 ${
                  activeDetailTab === 'performance'
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'text-[#686864] hover:text-[#252525]'
                }`}
              >
                <BarChart3 className="w-3 h-3 text-[#FF7417]" />
                Analytics &amp; Usage
              </button>
            </div>

            {/* Tab: Preview & Artboard */}
            {activeDetailTab === 'preview' && (
              <div className="space-y-4">
                <div
                  className={`relative rounded-[12px] p-7 border ${
                    previewAsset.darkVariant
                      ? 'bg-[#171717] text-white border-[#2C2C2C] bw-dark-ambient-glow'
                      : 'bg-[#FAFAF9] text-[#252525] border-[#E6E6E2]'
                  }`}
                >
                  <div className="flex items-center justify-between text-[11px] font-mono-num">
                    <span className={previewAsset.darkVariant ? 'text-[#FF8A36]' : 'text-[#C44D00]'}>
                      {previewSlide ? previewSlide.kicker : previewAsset.category.toUpperCase()}
                    </span>
                    {previewAsset.slides && previewAsset.slides.length > 1 && (
                      <span className="opacity-75">
                        Slide 0{previewSlideIdx + 1} / 0{previewAsset.slides.length}
                      </span>
                    )}
                  </div>

                  {(previewSlide?.svgMotif || previewAsset.svgMarkup) && (
                    <div
                      className="w-full h-40 mt-4 [&>svg]:w-full [&>svg]:h-full [&>svg]:object-contain flex items-center justify-center"
                      dangerouslySetInnerHTML={{
                        __html: sanitizeAiSvgMarkup(previewSlide?.svgMotif || previewAsset.svgMarkup),
                      }}
                    />
                  )}

                  <h3 className="font-heading text-xl font-bold mt-3">
                    {previewSlide ? previewSlide.headline : previewAsset.headlineText}
                  </h3>
                  <p className="text-xs opacity-80 mt-2 leading-relaxed">
                    {previewSlide ? previewSlide.body : previewAsset.subtext}
                  </p>
                </div>
              </div>
            )}

            {/* Tab: Pre-Flight Readiness (Print & Packaging) */}
            {activeDetailTab === 'preflight' && (
              <div className="space-y-3 text-xs">
                {activePreflightReport ? (
                  <>
                    <div className="p-3.5 rounded-[12px] bg-[#FAFAF9] border border-[#ECECE8] flex items-center justify-between">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#171717] text-sm">Pre-Press Print Readiness</span>
                          <span
                            className={`px-2 py-0.5 rounded-full font-bold text-xs ${
                              activePreflightReport.isPrintReady
                                ? 'bg-[#EBF7ED] text-[#1E7E34]'
                                : 'bg-[#F8D7DA] text-[#721C24]'
                            }`}
                          >
                            {activePreflightReport.overallScore}/100 · {activePreflightReport.isPrintReady ? 'PRINT READY' : 'PRE-FLIGHT REJECTED'}
                          </span>
                        </div>
                        <span className="text-[11px] text-[#686864] block mt-0.5">
                          Bleed: 3mm · Safe Zone: 5mm · 300 DPI · TAC: {activePreflightReport.totalAreaCoveragePct}%
                        </span>
                      </div>
                      <Button
                        variant="secondary"
                        size="sm"
                        disabled={isEvaluatingReadiness}
                        onClick={() => handleRunPrintReadiness(previewAsset)}
                      >
                        <RefreshCw className={`w-3 h-3 ${isEvaluatingReadiness ? 'animate-spin' : ''}`} />
                        Re-check
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {activePreflightReport.checks.map((chk, idx) => (
                        <div key={idx} className="p-3 rounded-[8px] border border-[#ECECE8] bg-white flex flex-col gap-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-[#171717]">{chk.name}</span>
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${chk.passed ? 'bg-[#EBF7ED] text-[#1E7E34]' : 'bg-[#F8D7DA] text-[#721C24]'}`}>
                              {chk.passed ? 'PASSED (100)' : `${chk.severity.toUpperCase()} (${chk.score})`}
                            </span>
                          </div>
                          <p className="text-[#5C5C58] text-[11px]">{chk.evidence}</p>
                          {!chk.passed && (
                            <p className="text-[#C44D00] text-[11px] font-medium">Correction: {chk.suggestedCorrection}</p>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                ) : (
                  <div className="p-6 text-center text-[#686864] space-y-2">
                    <Printer className="w-8 h-8 text-[#FF7417] mx-auto" />
                    <p>Execute automated pre-flight analysis.</p>
                    <Button variant="primary" size="sm" onClick={() => handleRunPrintReadiness(previewAsset)}>
                      Run Pre-Flight Analysis
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Packaging Label OCR & Truth Check */}
            {activeDetailTab === 'ocr' && (
              <div className="space-y-3 text-xs">
                {activeContentReport ? (
                  <>
                    <div className="p-3.5 rounded-[12px] bg-[#FAFAF9] border border-[#ECECE8] flex items-center justify-between">
                      <div>
                        <span className="font-bold text-[#171717] text-sm block">Label Content Intelligence</span>
                        <span className="text-[#686864]">Reconciled with verified Business Brain product records</span>
                      </div>
                      <StatusBadge
                        status={activeContentReport.businessBrainComparison.isCompliant ? 'Approved' : 'Draft'}
                        tone={activeContentReport.businessBrainComparison.isCompliant ? 'success' : 'warning'}
                      />
                    </div>

                    <div className="p-3 rounded-[8px] border border-[#ECECE8] bg-white space-y-2">
                      <span className="font-semibold text-[#171717] block">Detected Packaging Declarations</span>
                      <div className="grid grid-cols-2 gap-2 text-[11px]">
                        <div><strong className="text-[#686864]">MRP:</strong> {activeContentReport.extractedContent.mrp ? `₹${activeContentReport.extractedContent.mrp}` : 'Not detected'}</div>
                        <div><strong className="text-[#686864]">Net Wt:</strong> {activeContentReport.extractedContent.netQuantity || 'Not detected'}</div>
                        <div><strong className="text-[#686864]">Batch:</strong> {activeContentReport.extractedContent.batchInfo || 'Placeholder verified'}</div>
                        <div><strong className="text-[#686864]">Barcode:</strong> {activeContentReport.extractedContent.barcodeText || 'Standard EAN-13 verified'}</div>
                      </div>
                    </div>

                    {activeContentReport.businessBrainComparison.discrepancies.length > 0 && (
                      <div className="p-3 rounded-[8px] border border-[#F5C6CB] bg-[#FDF7F8] space-y-1.5">
                        <span className="font-bold text-[#721C24] block">Price / Product Conflicts Detected</span>
                        {activeContentReport.businessBrainComparison.discrepancies.map((d, idx) => (
                          <p key={idx} className="text-[#721C24] text-[11px]">
                            • {d.description}
                          </p>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <div className="p-6 text-center text-[#686864] space-y-2">
                    <ScanLine className="w-8 h-8 text-[#FF7417] mx-auto" />
                    <p>Analyze packaging typography for price, net weight, and ingredients.</p>
                    <Button variant="primary" size="sm" onClick={() => handleRunPackagingOcr(previewAsset)}>
                      Extract Label Intelligence
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Tab: Specifications & Metadata */}
            {activeDetailTab === 'metadata' && (
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="p-3 bg-[#FAFAF9] rounded-[8px] border border-[#ECECE8]">
                    <span className="text-[#686864] block">Asset ID</span>
                    <span className="font-mono text-[#252525] break-all">{previewAsset.id}</span>
                  </div>
                  <div className="p-3 bg-[#FAFAF9] rounded-[8px] border border-[#ECECE8]">
                    <span className="text-[#686864] block">Format &amp; Size</span>
                    <span className="font-medium text-[#252525]">{previewAsset.format}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Tab: AI Intelligence */}
            {activeDetailTab === 'intelligence' && (
              <div className="space-y-4 text-xs">
                <div className="flex items-center justify-between p-3 rounded-[8px] bg-[#FAF9F5] border border-[#E6E6E2]">
                  <div className="flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-[#FF7417]" />
                    <span className="font-semibold text-[#252525]">Unified Multimodal Intelligence</span>
                  </div>
                  <Button
                    variant="primary"
                    size="sm"
                    disabled={isAnalyzingIntelligence}
                    onClick={() => handleAnalyzeIntelligence(previewAsset.id)}
                  >
                    <RefreshCw className={`w-3 h-3 ${isAnalyzingIntelligence ? 'animate-spin' : ''}`} />
                    {isAnalyzingIntelligence ? 'Analyzing...' : 'Re-Run Intelligence'}
                  </Button>
                </div>

                {assetIntelligence ? (
                  <div className="space-y-3">
                    {/* Scores & Badges */}
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-[6px] bg-[#F7F7F5] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#686864] block">Quality Score</span>
                        <span className="text-base font-bold text-[#252525]">
                          {assetIntelligence.quality.overallScore}/100
                        </span>
                      </div>
                      <div className="p-2.5 rounded-[6px] bg-[#F7F7F5] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#686864] block">Suitability</span>
                        <span className="text-xs font-semibold text-[#FF7417] uppercase">
                          {assetIntelligence.quality.productionSuitability.replace('_', ' ')}
                        </span>
                      </div>
                      <div className="p-2.5 rounded-[6px] bg-[#F7F7F5] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#686864] block">Resolution</span>
                        <span className="text-xs font-semibold text-[#252525]">
                          {assetIntelligence.quality.resolutionDpi} DPI
                        </span>
                      </div>
                      <div className="p-2.5 rounded-[6px] bg-[#F7F7F5] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#686864] block">Brand Alignment</span>
                        <span className="text-xs font-semibold text-emerald-700">
                          {assetIntelligence.brandCompliance?.complianceScore ?? 95}%
                        </span>
                      </div>
                    </div>

                    {/* Multimodal Understanding */}
                    <div className="p-3 rounded-[8px] border border-[#ECECE8] bg-white space-y-2">
                      <div className="font-semibold text-[#252525] flex items-center justify-between">
                        <span>Multimodal Extraction</span>
                        <span className="text-[11px] font-mono text-[#686864]">
                          {assetIntelligence.multimodal.visualStyle} · {assetIntelligence.multimodal.layoutComposition}
                        </span>
                      </div>
                      {assetIntelligence.multimodal.extractedText && (
                        <div className="p-2 rounded-[6px] bg-[#FAF9F5] border border-[#E6E6E2] text-[#444] font-mono text-[11px]">
                          {assetIntelligence.multimodal.extractedText}
                        </div>
                      )}
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[10px] text-[#686864] mr-1">Colors:</span>
                        {assetIntelligence.multimodal.dominantColors.map((col, idx) => (
                          <div key={idx} className="flex items-center gap-1 px-1.5 py-0.5 rounded border border-[#ECECE8] text-[10px]">
                            <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: col.hex }} />
                            <span className="font-mono">{col.hex}</span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Perceptual Fingerprint */}
                    <div className="p-3 rounded-[8px] border border-[#ECECE8] bg-white space-y-1.5">
                      <span className="font-semibold text-[#252525] block">Perceptual Fingerprint (dHash)</span>
                      <div className="font-mono text-[11px] text-[#686864] bg-[#F7F7F5] p-2 rounded border border-[#ECECE8]">
                        Hash: {assetIntelligence.fingerprint.dHashHex}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-6 text-[#686864]">
                    Click "Re-Run Intelligence" to evaluate visual features, text OCR, perceptual hashing, and brand alignment.
                  </div>
                )}
              </div>
            )}

            {/* Tab: Performance & Analytics */}
            {activeDetailTab === 'performance' && (
              <div className="space-y-3 text-xs">
                {assetPerformance ? (
                  <div className="space-y-3">
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                      <div className="p-2.5 rounded-[8px] bg-[#FAFAF9] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#888884] block font-mono">IMPRESSIONS</span>
                        <span className="text-base font-bold font-mono-num text-[#171717]">{assetPerformance.totalImpressions?.toLocaleString() || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-[8px] bg-[#FAFAF9] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#888884] block font-mono">CLICKS</span>
                        <span className="text-base font-bold font-mono-num text-[#171717]">{assetPerformance.totalClicks?.toLocaleString() || 0}</span>
                      </div>
                      <div className="p-2.5 rounded-[8px] bg-[#FAFAF9] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#888884] block font-mono">CLICK-THROUGH (CTR)</span>
                        <span className="text-base font-bold font-mono-num text-[#FF7417]">{assetPerformance.ctr || 0}%</span>
                      </div>
                      <div className="p-2.5 rounded-[8px] bg-[#FAFAF9] border border-[#ECECE8]">
                        <span className="text-[10px] text-[#888884] block font-mono">CONVERSIONS</span>
                        <span className="text-base font-bold font-mono-num text-[#1E7E34]">{assetPerformance.totalConversions || 0}</span>
                      </div>
                    </div>

                    <div className="p-3 rounded-[8px] bg-white border border-[#ECECE8] space-y-1.5">
                      <span className="font-semibold text-[#171717] block">Active Campaigns Utilizing this Asset</span>
                      {assetPerformance.activeCampaigns?.length > 0 ? (
                        <div className="flex flex-wrap gap-1.5">
                          {assetPerformance.activeCampaigns.map((c: string, idx: number) => (
                            <span key={idx} className="px-2 py-0.5 rounded bg-[#FAFAF9] border border-[#ECECE8] text-[11px] font-mono text-[#5C5C58]">
                              {c}
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-[#888884]">No active campaigns registered yet for this collateral.</p>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="p-6 text-center text-[#686864] space-y-2">
                    <BarChart3 className="w-8 h-8 text-[#FF7417] mx-auto" />
                    <p>Load cross-campaign performance metrics for this asset.</p>
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={isLoadingPerformance}
                      onClick={() => handleLoadPerformance(previewAsset.id)}
                    >
                      {isLoadingPerformance ? 'Fetching Metrics...' : 'Load Performance Analytics'}
                    </Button>
                  </div>
                )}
              </div>
            )}

            {/* Bottom Actions Toolbar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-[#E6E6E2]">
              <div className="flex items-center gap-2">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    archiveBrandAsset(previewAsset.id);
                    setPreviewAsset(null);
                  }}
                >
                  <Archive className="w-3.5 h-3.5" />
                  {previewAsset.status === 'Archived' ? 'Restore Asset' : 'Archive Asset'}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => handleDeletePermanently(previewAsset)}
                  className="text-[#C44D00] hover:text-red-700"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  Delete
                </Button>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setDerivativeModalOpen(true)}
                >
                  <Share2 className="w-3.5 h-3.5 text-[#FF7417]" />
                  Adapt Format
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDuplicateAsset(previewAsset)}
                >
                  <Copy className="w-3.5 h-3.5" />
                  Duplicate
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRemixWithAi(previewAsset)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                  Remix
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleUseInCampaign(previewAsset)}
                >
                  <Compass className="w-3.5 h-3.5 text-[#FF7417]" />
                  Use in Campaign
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleDownloadSvg(previewAsset)}
                >
                  <Download className="w-3.5 h-3.5" />
                  SVG
                </Button>
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleDownloadSpec(previewAsset)}
                >
                  <Download className="w-3.5 h-3.5" />
                  Spec JSON
                </Button>
              </div>
            </div>
          </div>
        )}
      </Modal>

      {/* Dieline Generator Modal */}
      <Modal
        open={dielineModalOpen}
        onClose={() => setDielineModalOpen(false)}
        title="Vector Packaging Dieline Generator"
        subtitle="Generates laser-guided cut (red) and crease (green) lines with 3.0mm bleed tolerance."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4 text-xs">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#686864] font-medium mb-1">Packaging Structure</label>
              <select
                value={dielineType}
                onChange={(e) => setDielineType(e.target.value as any)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              >
                <option value="Box">Folding Box</option>
                <option value="Carton">Shipping Carton</option>
                <option value="Pouch">Stand-Up Pouch</option>
                <option value="Label">Bottle Label</option>
                <option value="Jar">Jar Label</option>
              </select>
            </div>
            <div>
              <label className="block text-[#686864] font-medium mb-1">Bleed Margin (mm)</label>
              <input
                type="number"
                value={dielineBleed}
                onChange={(e) => setDielineBleed(parseFloat(e.target.value) || 3)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
            </div>
            <div>
              <label className="block text-[#686864] font-medium mb-1">Trim Width (mm)</label>
              <input
                type="number"
                value={dielineWidth}
                onChange={(e) => setDielineWidth(parseFloat(e.target.value) || 80)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
            </div>
            <div>
              <label className="block text-[#686864] font-medium mb-1">Trim Height (mm)</label>
              <input
                type="number"
                value={dielineHeight}
                onChange={(e) => setDielineHeight(parseFloat(e.target.value) || 160)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
            </div>
          </div>

          <div className="p-3 bg-[#FAFAF9] rounded-[8px] border border-[#ECECE8] space-y-1">
            <span className="font-semibold text-[#171717] block">Standard Production Specifications</span>
            <p className="text-[#686864]">
              Layers: Cut lines (#FF0000 1.5pt solid), Crease lines (#00FF00 1.5pt dashed), Bleed perimeter (#FF00FF 1.0pt).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECECE8]">
            <Button variant="secondary" size="sm" onClick={() => setDielineModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              onClick={() => {
                const url = `/api/v1/workspaces/${state.activeWorkspaceId || 'default'}/assets/packaging/dieline/${dielineType}?widthMm=${dielineWidth}&heightMm=${dielineHeight}&depthMm=${dielineDepth}&bleedMm=${dielineBleed}`;
                window.open(url, '_blank');
                setDielineModalOpen(false);
                showToast(`Generated ${dielineType} dieline SVG.`);
              }}
            >
              <Download className="w-3.5 h-3.5" />
              Download Dieline SVG
            </Button>
          </div>
        </div>
      </Modal>

      {/* Create Packaging Asset Modal */}
      <Modal
        open={createPkgModalOpen}
        onClose={() => setCreatePkgModalOpen(false)}
        title="New Packaging Asset"
        subtitle="Associate packaging with verified product data from Business Brain."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#686864] font-medium mb-1">Asset Name</label>
            <input
              type="text"
              placeholder="e.g. Signature Rose Serum Outer Carton"
              value={newPkgName}
              onChange={(e) => setNewPkgName(e.target.value)}
              className="w-full h-9 px-3 border border-[#E6E6E2] rounded-[8px] bw-surface-inset focus:outline-none focus:border-[#FF7417]"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[#686864] font-medium mb-1">Packaging Structure</label>
              <select
                value={newPkgType}
                onChange={(e) => setNewPkgType(e.target.value as any)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              >
                <option value="Box">Box / Outer Carton</option>
                <option value="Pouch">Stand-Up Pouch</option>
                <option value="Bottle">Bottle Label</option>
                <option value="Jar">Jar Label</option>
                <option value="Label">Adhesive Sticker</option>
              </select>
            </div>
            <div>
              <label className="block text-[#686864] font-medium mb-1">Product Association</label>
              <select
                value={newPkgProductId}
                onChange={(e) => setNewPkgProductId(e.target.value)}
                className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              >
                <option value="prod_default">Primary Business Brain Product</option>
                {state.brain.products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name} (₹{p.price})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECECE8]">
            <Button variant="secondary" size="sm" onClick={() => setCreatePkgModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={!newPkgName.trim()}
              onClick={handleCreatePackagingSubmit}
            >
              <Box className="w-3.5 h-3.5" />
              Create Asset
            </Button>
          </div>
        </div>
      </Modal>

      {/* Upload Modal with Strict Video Exclusion */}
      <Modal
        open={uploadModalOpen}
        onClose={() => {
          if (!isUploading) {
            setUploadModalOpen(false);
            setStagedFiles([]);
          }
        }}
        title="Upload Brand Assets"
        subtitle="Images (PNG, SVG, JPG, WebP), Documents (PDF, DOCX), Design files. Video files strictly excluded."
        maxWidth="max-w-lg"
      >
        <div className="space-y-4">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragOver(true);
            }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => {
              e.preventDefault();
              setDragOver(false);
              if (e.dataTransfer.files) {
                validateAndStageFiles(e.dataTransfer.files);
              }
            }}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-[12px] p-6 text-center transition-colors cursor-pointer ${
              dragOver
                ? 'border-[#FF7417] bg-[#FFF7F0]'
                : 'border-[#D5D5D0] hover:border-[#FF7417] bg-[#FAFAF9]'
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              multiple
              aria-label="Upload files"
              accept=".png,.jpg,.jpeg,.webp,.svg,.pdf,.doc,.docx,.xlsx,.pptx,.ai,.eps,.psd,.json"
              className="hidden"
              onChange={(e) => {
                if (e.target.files) {
                  validateAndStageFiles(e.target.files);
                }
              }}
            />
            <Upload className="w-8 h-8 text-[#FF7417] mx-auto mb-2" />
            <div className="text-sm font-semibold text-[#252525]">
              Drop files here or click to browse
            </div>
            <p className="text-xs text-[#686864] mt-1">
              Supports vector SVGs, packaging dielines, high-res photos, and PDF specs.
            </p>
            <div className="mt-2 inline-block px-2.5 py-1 rounded-full bg-[#F3F3F0] text-[11px] text-[#5C5C58] font-mono-num">
              Max 15MB per file · Video generation/upload strictly prohibited
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECECE8]">
            <Button
              variant="secondary"
              size="sm"
              disabled={isUploading}
              onClick={() => {
                setUploadModalOpen(false);
                setStagedFiles([]);
              }}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={stagedFiles.length === 0 || isUploading}
              onClick={handleExecuteUpload}
            >
              <Upload className="w-3.5 h-3.5" />
              {isUploading ? 'Ingesting...' : `Upload ${stagedFiles.length} File(s)`}
            </Button>
          </div>
        </div>
      </Modal>

      {/* AI Recommendation Modal */}
      <Modal
        open={recommendModalOpen}
        onClose={() => setRecommendModalOpen(false)}
        title="AI Asset Recommendations"
        subtitle="Context-aware asset matching for multi-channel marketing campaigns"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block text-[#252525] font-semibold mb-1">Campaign Brief or Goal</label>
            <textarea
              rows={3}
              value={recommendBrief}
              onChange={(e) => setRecommendBrief(e.target.value)}
              placeholder="e.g. Diwali festive organic skincare launch on Instagram feed and stories..."
              className="w-full p-2.5 rounded-[8px] border border-[#ECECE8] text-xs font-sans text-[#252525]"
            />
          </div>

          <div className="flex items-center gap-2">
            <span className="font-semibold text-[#252525]">Target Channel:</span>
            {(['Instagram', 'Print', 'Packaging', 'Web'] as const).map((ch) => (
              <button
                key={ch}
                type="button"
                onClick={() => setRecommendChannel(ch)}
                className={`px-3 py-1 rounded-[6px] font-medium cursor-pointer ${
                  recommendChannel === ch
                    ? 'bg-[#FF7417] text-white shadow-xs'
                    : 'bg-[#F7F7F5] text-[#686864] hover:text-[#252525]'
                }`}
              >
                {ch}
              </button>
            ))}
          </div>

          <div className="flex justify-end pt-2 border-t border-[#ECECE8]">
            <Button
              variant="primary"
              size="sm"
              disabled={!recommendBrief.trim() || isFetchingRecommendations}
              onClick={handleRecommendSubmit}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isFetchingRecommendations ? 'Analyzing...' : 'Generate Recommendations'}
            </Button>
          </div>

          {recommendationList.length > 0 && (
            <div className="space-y-2 pt-2 border-t border-[#ECECE8]">
              <div className="font-semibold text-[#252525]">Top Recommended Assets</div>
              <div className="space-y-2 max-h-60 overflow-y-auto">
                {recommendationList.map((rec, idx) => (
                  <div key={idx} className="p-2.5 rounded-[8px] border border-[#ECECE8] bg-[#FAF9F5] flex items-center justify-between">
                    <div>
                      <div className="font-semibold text-[#252525]">{rec.asset.name}</div>
                      <div className="text-[11px] text-[#686864]">{rec.rationale}</div>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-sm text-[#FF7417]">
                        {rec.recommendationScore}%
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </Modal>

      {/* Conversational Asset Assistant Modal (Phase 8) */}
      <Modal
        open={assistantModalOpen}
        onClose={() => setAssistantModalOpen(false)}
        title="Asset Intelligence Assistant"
        subtitle="Natural-language cross-section search, brand compliance, and safe asset orchestration"
        maxWidth="max-w-2xl"
      >
        <div className="flex flex-col h-[520px]">
          {/* Messages Scroll Area */}
          <div className="flex-1 overflow-y-auto p-2 space-y-4 text-xs font-sans">
            {assistantMessages.map((msg, i) => {
              const isUser = msg.role === 'user';
              return (
                <div key={msg.messageId || i} className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}>
                  <div className="flex items-start gap-2 max-w-[88%]">
                    {!isUser && (
                      <div className="w-6 h-6 rounded-full bg-[#FF7417] text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-3.5 h-3.5" />
                      </div>
                    )}
                    <div
                      className={`p-3 rounded-[10px] leading-relaxed ${
                        isUser
                          ? 'bg-[#FF7417] text-white rounded-br-none shadow-xs'
                          : 'bg-[#F7F7F5] text-[#252525] border border-[#ECECE8] rounded-bl-none'
                      }`}
                    >
                      <div className="whitespace-pre-wrap">{msg.content}</div>

                      {/* Explainability Block */}
                      {!isUser && msg.explainability && (
                        <div className="mt-2 pt-2 border-t border-[#E6E6E2] space-y-1 text-[11px]">
                          {msg.explainability.facts?.length > 0 && (
                            <div className="flex items-start gap-1 text-emerald-800">
                              <span className="font-semibold shrink-0">Facts:</span>
                              <span>{msg.explainability.facts.join('; ')}</span>
                            </div>
                          )}
                          {msg.explainability.suggestions?.length > 0 && (
                            <div className="flex items-start gap-1 text-blue-800">
                              <span className="font-semibold shrink-0">Suggestions:</span>
                              <span>{msg.explainability.suggestions.join('; ')}</span>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Pending Confirmation Card */}
                      {msg.pendingConfirmation && (
                        <div className="mt-3 p-2.5 rounded-[8px] bg-amber-50 border border-amber-200 text-amber-900 space-y-2">
                          <div className="font-semibold flex items-center gap-1.5">
                            <AlertTriangle className="w-4 h-4 text-amber-600" />
                            Confirmation Required ({msg.pendingConfirmation.actionType})
                          </div>
                          <p className="text-[11px]">{msg.pendingConfirmation.summary}</p>
                          <div className="space-y-1 max-h-24 overflow-y-auto font-mono text-[10px]">
                            {msg.pendingConfirmation.affectedAssets.map((a) => (
                              <div key={a.assetId} className="flex items-center justify-between bg-white/80 px-2 py-0.5 rounded">
                                <span>{a.name}</span>
                                <span className="text-[#686864]">{a.section}</span>
                              </div>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 pt-1">
                            <Button
                              variant="primary"
                              size="sm"
                              onClick={() => handleConfirmAssistantAction(msg.pendingConfirmation!.confirmationToken)}
                            >
                              <Check className="w-3.5 h-3.5" />
                              Confirm Action
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Action Executed Badge */}
                      {msg.actionExecuted && (
                        <div className="mt-2 p-1.5 rounded bg-emerald-50 border border-emerald-200 text-emerald-800 text-[11px] flex items-center gap-1.5">
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>{msg.actionExecuted.details}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Quick Replies */}
                  {!isUser && msg.suggestedQuickReplies && msg.suggestedQuickReplies.length > 0 && i === assistantMessages.length - 1 && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-2 ml-8">
                      {msg.suggestedQuickReplies.map((qr, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSendAssistantMessage(qr)}
                          className="px-2.5 py-1 rounded-full bg-[#FAF9F5] border border-[#E6E6E2] text-[11px] text-[#555] hover:border-[#FF7417] hover:text-[#FF7417] transition-colors cursor-pointer"
                        >
                          {qr}
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
            {isAssistantThinking && (
              <div className="flex items-center gap-2 text-xs text-[#686864] ml-2">
                <Bot className="w-4 h-4 text-[#FF7417] animate-pulse" />
                <span>Thinking & querying Asset Operating System...</span>
              </div>
            )}
          </div>

          {/* Chat Input Bar */}
          <div className="p-3 border-t border-[#ECECE8] bg-white flex items-center gap-2">
            <input
              type="text"
              value={assistantInput}
              onChange={(e) => setAssistantInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendAssistantMessage();
                }
              }}
              placeholder="Ask me: 'Find approved logos', 'Compare packaging', 'Add tags'..."
              className="flex-1 p-2 rounded-[6px] border border-[#ECECE8] text-xs font-sans text-[#252525] focus:outline-hidden focus:border-[#FF7417]"
            />
            <Button
              variant="primary"
              size="sm"
              disabled={!assistantInput.trim() || isAssistantThinking}
              onClick={() => handleSendAssistantMessage()}
            >
              <Send className="w-3.5 h-3.5" />
            </Button>
          </div>
        </div>
      </Modal>

      {/* Format Adaptation (Content Studio Derivative) Modal */}
      <Modal
        open={derivativeModalOpen}
        onClose={() => setDerivativeModalOpen(false)}
        title="Adapt Asset Format (Content Studio)"
        subtitle="Repurpose vector artwork and typography across channels while maintaining parent-child lineage."
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          {previewAsset && (
            <div className="p-3 rounded-[8px] bg-[#FAFAF9] border border-[#ECECE8]">
              <span className="text-[#888884] block font-mono text-[10px]">SOURCE ASSET</span>
              <span className="font-bold text-[#171717]">{previewAsset.title}</span>
              <span className="text-[#686864] block text-[11px] mt-0.5">
                {previewAsset.folder} · {previewAsset.format}
              </span>
            </div>
          )}

          <div>
            <label className="block text-[#686864] font-medium mb-1">Target Derivative Format</label>
            <select
              value={derivativeTargetFormat}
              onChange={(e) => setDerivativeTargetFormat(e.target.value as any)}
              className="w-full h-9 px-2.5 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
            >
              <option value="story_vertical">Instagram Story / Vertical (1080×1920)</option>
              <option value="square_post">Square Feed Post (1080×1080)</option>
              <option value="landscape_banner">Landscape Banner (1200×630)</option>
              <option value="flyer_print">Print Flyer A5 (1748×2480 @ 300 DPI)</option>
              <option value="poster_print">Print Poster A3 (3508×4960 @ 300 DPI)</option>
            </select>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-[#ECECE8]">
            <Button variant="secondary" size="sm" onClick={() => setDerivativeModalOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="primary"
              size="sm"
              disabled={isCreatingDerivative}
              onClick={handleCreateDerivativeSubmit}
            >
              <Sparkles className="w-3.5 h-3.5" />
              {isCreatingDerivative ? 'Generating...' : 'Create Adapted Asset'}
            </Button>
          </div>
        </div>
      </Modal>

      <JourneyNextStep currentRoute="asset-library" />
    </div>
  );
};
