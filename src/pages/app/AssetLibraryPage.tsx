import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Archive,
  ChevronLeft,
  ChevronRight,
  Compass,
  Copy,
  Download,
  Edit3,
  FolderKanban,
  Palette,
  Sparkles,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import {
  buildAssetSvgMarkup,
  buildCarouselSlideSvgMarkup,
  sanitizeAiSvgMarkup,
} from '../../utils/logic';
import type { BrandAsset } from '../../types/brainwise';
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
    renameBrandAsset,
    archiveBrandAsset,
    addTask,
    launchCreativeRemix,
    showToast,
    departmentResetNonce,
  } = useBrainWise();
  const [search, setSearch] = useState('');
  const [folderFilter, setFolderFilter] = useState('all');
  const [sortBy, setSortBy] = useState<'newest' | 'title'>('newest');
  const [previewAsset, setPreviewAsset] = useState<BrandAsset | null>(null);
  const [previewSlideIdx, setPreviewSlideIdx] = useState(0);
  const [renameValue, setRenameValue] = useState('');

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setPreviewAsset(null);
      setFolderFilter('all');
    }
  }, [departmentResetNonce]);

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

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return state.assets
      .filter((a) => {
        if (folderFilter === 'archived') return a.status === 'Archived';
        if (a.status === 'Archived') return false;
        if (folderFilter !== 'all' && a.folder !== folderFilter) return false;
        return (
          !q ||
          a.title.toLowerCase().includes(q) ||
          a.category.toLowerCase().includes(q) ||
          a.headlineText.toLowerCase().includes(q) ||
          (a.aiPrompt?.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) =>
        sortBy === 'title' ? a.title.localeCompare(b.title) : b.createdAt.localeCompare(a.createdAt)
      );
  }, [state.assets, search, folderFilter, sortBy]);

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

  const previewSlide = previewAsset?.slides?.[previewSlideIdx] ?? null;

  return (
    <div className="space-y-6">
      <PageHeader
        mutedPrefix="Asset"
        title="Library"
        subtitle="Inspect, browse multi-slide carousels, copy AI captions, export vector artwork, or remix any asset in Brand Studio."
        actions={
          <Button variant="primary" size="sm" onClick={() => navigate('brand-studio')}>
            <Palette className="w-4 h-4" />
            Create with AI in Brand Studio
          </Button>
        }
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Search assets, prompts, categories..."
            className="w-full sm:w-72"
          />
          <FilterBar
            activeId={folderFilter}
            onChange={setFolderFilter}
            options={[
              { id: 'all', label: 'All Active' },
              { id: 'Identity', label: 'Identity' },
              { id: 'Print & Packaging', label: 'Print & Packaging' },
              { id: 'Social Media', label: 'Social Media' },
              { id: 'archived', label: 'Archived' },
            ]}
          />
        </div>

        <div className="flex items-center gap-2 text-xs">
          <span className="text-[#686864]">Sort:</span>
          <select
            aria-label="Sort assets"
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as typeof sortBy)}
            className="h-9 px-3 border border-[#E6E6E2] rounded-[8px] bg-white text-xs bw-surface-inset focus:outline-none focus:border-[#FF7417]"
          >
            <option value="newest">Newest First</option>
            <option value="title">Alphabetical</option>
          </select>
        </div>
      </div>

      {filtered.length === 0 ? (
        <EmptyState
          icon={<FolderKanban className="w-5 h-5" />}
          title="No assets match this view"
          description="Try clearing your folder filter or generate a new logo, carousel, or packaging asset with AI in Brand Studio."
          actionLabel="Open AI Brand Studio"
          onAction={() => navigate('brand-studio')}
          secondaryActionLabel="Show All Active Assets"
          onSecondaryAction={() => {
            setFolderFilter('all');
            setSearch('');
          }}
        />
      ) : (
        <FluidTransition
          key={`${folderFilter}-${sortBy}`}
          direction="fade"
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5"
        >
          {filtered.map((asset) => (
            <AssetCard
              key={asset.id}
              asset={asset}
              onPreview={(a) => {
                setPreviewAsset(a);
                setPreviewSlideIdx(0);
                setRenameValue(a.title);
              }}
            />
          ))}
        </FluidTransition>
      )}

      <Modal
        open={Boolean(previewAsset)}
        onClose={() => setPreviewAsset(null)}
        title={previewAsset?.title ?? 'Asset Preview'}
        subtitle={previewAsset ? `${previewAsset.category} · ${previewAsset.format}` : undefined}
        maxWidth="max-w-xl"
      >
        {previewAsset && (
          <div className="space-y-5">
            {/* Artboard (Supports Multi-Slide Carousels & Single AI Assets) */}
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
                  className="w-24 h-11 mt-4 [&>svg]:w-full [&>svg]:h-full"
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

              {previewAsset.slides && previewAsset.slides.length > 1 && (
                <div className="mt-5 pt-3 border-t border-current/15 flex items-center justify-between">
                  <button
                    type="button"
                    disabled={previewSlideIdx === 0}
                    onClick={() => setPreviewSlideIdx((i) => Math.max(0, i - 1))}
                    className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-35 cursor-pointer"
                  >
                    <ChevronLeft className="w-3.5 h-3.5" />
                    Prev Slide
                  </button>
                  <div className="flex items-center gap-1.5">
                    {previewAsset.slides.map((s, idx) => (
                      <button
                        key={s.slideNumber}
                        type="button"
                        aria-label={`Jump to slide ${s.slideNumber}`}
                        onClick={() => setPreviewSlideIdx(idx)}
                        className={`h-1.5 rounded-full cursor-pointer ${
                          idx === previewSlideIdx ? 'w-4 bg-[#FF7417]' : 'w-1.5 bg-current/30'
                        }`}
                      />
                    ))}
                  </div>
                  <button
                    type="button"
                    disabled={previewSlideIdx === previewAsset.slides.length - 1}
                    onClick={() =>
                      setPreviewSlideIdx((i) =>
                        Math.min((previewAsset.slides?.length ?? 1) - 1, i + 1)
                      )
                    }
                    className="inline-flex items-center gap-1 text-xs font-medium disabled:opacity-35 cursor-pointer"
                  >
                    Next Slide
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>

            {previewAsset.aiPrompt && (
              <div className="p-3 rounded-[9px] bg-[#FAFAF9] border border-[#E6E6E2] text-xs text-[#5C5C58]">
                <span className="font-semibold text-[#252525]">AI Prompt: </span>
                {previewAsset.aiPrompt}
              </div>
            )}

            {previewAsset.caption && (
              <div className="p-3.5 rounded-[9px] bg-[#FAFAF9] border border-[#E6E6E2] space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-[#252525]">
                    Social Caption &amp; Hashtags
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      const text = `${previewAsset.caption}\n\n${(previewAsset.hashtags ?? []).join(' ')}`;
                      void navigator.clipboard?.writeText(text)?.catch(() => {});
                      showToast('Copied social caption & hashtags.');
                    }}
                    className="inline-flex items-center gap-1 text-[#C44D00] font-medium cursor-pointer"
                  >
                    <Copy className="w-3 h-3" />
                    Copy
                  </button>
                </div>
                <p className="text-xs text-[#5C5C58] whitespace-pre-line">{previewAsset.caption}</p>
                {previewAsset.hashtags && previewAsset.hashtags.length > 0 && (
                  <div className="text-[11px] text-[#C44D00]">
                    {previewAsset.hashtags.join(' ')}
                  </div>
                )}
              </div>
            )}

            <div className="flex flex-wrap items-center justify-between gap-2">
              <StatusBadge
                status={previewAsset.status}
                tone={previewAsset.status === 'Approved' ? 'success' : 'neutral'}
              />
              <span className="text-xs text-[#5C5C58]">
                Folder: {previewAsset.folder}
                {previewAsset.aiModel ? ` · ${previewAsset.aiModel}` : ''}
              </span>
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-[#E6E6E2]">
              <input
                type="text"
                value={renameValue}
                onChange={(e) => setRenameValue(e.target.value)}
                aria-label="Rename asset"
                className="flex-1 h-9 px-3 text-sm border border-[#E6E6E2] rounded-[8px] bw-surface-inset focus:outline-none focus:border-[#FF7417]"
              />
              <Button
                variant="secondary"
                size="sm"
                disabled={!renameValue.trim()}
                onClick={() => {
                  renameBrandAsset(previewAsset.id, renameValue);
                  setPreviewAsset({ ...previewAsset, title: renameValue });
                }}
              >
                <Edit3 className="w-3.5 h-3.5" />
                Rename
              </Button>
            </div>

            <div className="flex flex-wrap items-center justify-between gap-2 pt-2">
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
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => handleRemixWithAi(previewAsset)}
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
                  Remix in AI Studio
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
                  Export SVG
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

      <JourneyNextStep currentRoute="asset-library" />
    </div>
  );
};
