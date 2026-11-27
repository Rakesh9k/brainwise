import React, { useState } from 'react';
import { Check, Lock } from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import type { CompetitorProfileData } from '../../types/brainwise';
import { Button, Field, Input, Select } from './DesignSystem';
import { Modal } from './Overlay';

export const MONITORING_CATEGORIES = [
  'Website changes',
  'Pricing changes',
  'Product launches',
  'Offers and promotions',
  'Public social media activity',
  'Customer reviews',
  'Search visibility',
  'Industry news',
  'Market trends',
  'Business expansion announcements',
];

export const AddCompetitorModal: React.FC<{
  open: boolean;
  onClose: () => void;
  title?: string;
}> = ({ open, onClose, title = 'Add Competitor & Enable Watchlist' }) => {
  const { state, addCompetitor, navigate } = useBrainWise();
  const isEnterprise =
    state.subscription?.plan === 'Business Enterprise' ||
    state.subscription?.plan === 'Venture Team';
  const isPro =
    state.isExampleWorkspace ||
    isEnterprise ||
    state.subscription?.plan === 'Professional' ||
    state.subscription?.plan === 'Growth Pro';
  const maxCompetitors = isEnterprise ? 100 : isPro ? 20 : 5;
  const isLimitReached = (state.competitors?.length ?? 0) >= maxCompetitors;
  const [entryMode, setEntryMode] = useState<'single' | 'batch'>('single');
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
  const [batchUrls, setBatchUrls] = useState('');
  const [category, setCategory] = useState(state.brain.industry || 'Direct Peer');
  const [geography, setGeography] = useState(state.brain.location || 'Regional');
  const [discoveryMethod, setDiscoveryMethod] =
    useState<CompetitorProfileData['discoveryMethod']>('Manual Entry');
  const [frequency, setFrequency] =
    useState<CompetitorProfileData['monitoringFrequency']>('Weekly');
  const [monitoringEnabled, setMonitoringEnabled] = useState(true);
  const [monitoredCategories, setMonitoredCategories] = useState<string[]>([
    'Pricing changes',
    'Product launches',
    'Website changes',
  ]);

  const toggleCat = (cat: string) => {
    setMonitoredCategories((prev) =>
      prev.includes(cat) ? prev.filter((c) => c !== cat) : [...prev, cat]
    );
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const cleanName = name.trim();
    const cleanWeb =
      website.trim() || `https://${cleanName.toLowerCase().replace(/\s+/g, '')}.example.com`;

    addCompetitor({
      name: cleanName,
      website: cleanWeb,
      category: category.trim() || 'Direct Peer',
      geography: geography.trim() || state.brain.location || 'Global',
      discoveryMethod,
      positioning: `Profiled competitor inside ${category.trim() || state.brain.industry}.`,
      priceRange: 'Mid-to-Premium tier',
      researchStatus: 'Complete',
      lastResearched: new Date().toISOString().slice(0, 10),
      threatLevel: 'medium',
      marketShareBand: 'Emerging peer',
      xValueScore: 55,
      yDiffScore: 58,
      overview: `${cleanName} competes in ${category.trim() || state.brain.industry} across ${geography.trim() || state.brain.location}.`,
      productsAndServices: [
        {
          name: 'Core Flagship Offer',
          price: 'See pricing model',
          notes: 'Initial baseline entry',
        },
      ],
      pricingModel: {
        summary: 'Standard direct pricing structure.',
        entryPrice: 'Entry tier',
        flagshipPrice: 'Core tier',
        discounts: 'Recurring plan discount',
      },
      brandPositioningDetail: {
        archetype: 'Category Challenger',
        tagline: 'Category benchmark.',
        targetBuyer: state.brain.targetAudience || 'Core segment buyers',
        visualTone: 'Contemporary category storefront',
      },
      websiteAnalysis: {
        clarityScore: '7.0 / 10',
        primaryCTA: 'Get Started',
        speedNote: 'Standard storefront baseline.',
        conversionGaps: ['Limited first-time buyer onboarding clarity'],
      },
      marketingStrategy: {
        channels: ['Instagram', 'Search'],
        contentCadence: '3 posts/week',
        paidSignals: 'Moderate retargeting',
      },
      customerReviews: {
        averageRating: '4.4 / 5',
        reviewCount: 'Tracked baseline',
        praisedFor: ['Core product consistency'],
        complaints: ['Onboarding & delivery clarity'],
      },
      strengths: ['Established storefront footprint'],
      weaknesses: ['Generic starter offer framing'],
      historicalChanges: [
        {
          date: new Date().toISOString().slice(0, 10),
          change: 'Added to Competitive Intelligence & Market Watch baseline',
          source: discoveryMethod,
        },
      ],
      monitoringEnabled,
      monitoringFrequency: frequency,
      monitoredCategories: monitoredCategories.length
        ? monitoredCategories
        : ['Pricing changes', 'Website changes'],
    });

    setName('');
    setWebsite('');
    onClose();
  };

  const handleBatchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const lines = batchUrls
      .split('\n')
      .map((l) => l.trim())
      .filter((l) => l.length > 0)
      .slice(0, 5);

    if (lines.length === 0) return;

    lines.forEach((url) => {
      const clean = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0];
      const parsedName = clean
        .split('.')[0]
        .split(/[-_]/)
        .map((p) => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join(' ');
      const cleanWeb = url.startsWith('http') ? url : `https://${url}`;

      addCompetitor({
        name: parsedName,
        website: cleanWeb,
        category: category.trim() || 'Direct Peer',
        geography: geography.trim() || state.brain.location || 'Global',
        discoveryMethod: 'Manual Entry',
        positioning: `Profiled competitor inside ${category.trim() || state.brain.industry}.`,
        priceRange: 'Mid-to-Premium tier',
        researchStatus: 'Complete',
        lastResearched: new Date().toISOString().slice(0, 10),
        threatLevel: 'medium',
        marketShareBand: 'Category peer',
        xValueScore: 50,
        yDiffScore: 50,
        overview: `${parsedName} competes in ${category.trim() || state.brain.industry}.`,
        productsAndServices: [{ name: 'Core Offer', price: 'Standard', notes: 'Batch ingested' }],
        pricingModel: { summary: 'Standard pricing structure.', entryPrice: 'Tier 1', flagshipPrice: 'Tier 2', discounts: 'None' },
        brandPositioningDetail: { archetype: 'Challenger', tagline: 'Peer benchmark.', targetBuyer: state.brain.targetAudience || 'Buyers', visualTone: 'Commercial' },
        websiteAnalysis: { clarityScore: '7.0 / 10', primaryCTA: 'Visit Site', speedNote: 'Standard', conversionGaps: [] },
        marketingStrategy: { channels: ['Web', 'Search'], contentCadence: 'Weekly', paidSignals: 'Moderate' },
        customerReviews: { averageRating: '4.2 / 5', reviewCount: 'Tracked', praisedFor: ['Product quality'], complaints: ['Delivery speed'] },
        strengths: ['Established category brand'],
        weaknesses: ['Generic digital footprint'],
        historicalChanges: [{ date: new Date().toISOString().slice(0, 10), change: 'Added via batch ingestion', source: 'Batch URL Import' }],
        monitoringEnabled,
        monitoringFrequency: frequency,
        monitoredCategories: ['Pricing changes', 'Website changes', 'Product launches'],
      });
    });

    setBatchUrls('');
    onClose();
  };

  if (isLimitReached) {
    return (
      <Modal open={open} onClose={onClose} title="Competitor Watchlist Limit Reached">
        <div className="text-center py-6 px-2 space-y-4">
          <div className="w-12 h-12 rounded-full bg-[#FFF0E5] text-[#FF7417] mx-auto flex items-center justify-center">
            <Lock className="w-6 h-6 text-[#FF7417]" />
          </div>
          <div className="space-y-1.5">
            <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#C44D00] text-[10px] font-mono font-bold uppercase tracking-wider">
              Starter Plan Limit ({maxCompetitors} Competitors)
            </span>
            <h3 className="font-heading font-bold text-lg text-[#171717]">
              Track up to 20 competitors with Professional
            </h3>
            <p className="text-xs text-[#5C5C58] max-w-sm mx-auto leading-relaxed">
              You are currently monitoring {state.competitors.length} competitors. Upgrade to Professional
              to track up to 20 competitors, unlock automated 48-hour price change alerts, and export
              white-label positioning decks.
            </p>
          </div>
          <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
            <Button
              variant="primary"
              size="md"
              onClick={() => {
                onClose();
                navigate('settings', { settingsTab: 'subscription-billing' });
              }}
            >
              Upgrade to Professional (₹5,599 / mo) →
            </Button>
            <Button variant="secondary" size="md" onClick={onClose}>
              Maybe Later
            </Button>
          </div>
        </div>
      </Modal>
    );
  }

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle={`Unified competitor profile and live Market Watch tracking (${state.competitors.length} of ${maxCompetitors} tracked on current plan).`}
    >
      <div className="flex items-center gap-1.5 p-1 rounded-[8px] bg-[#F5F5F4] mb-4">
        <button
          type="button"
          onClick={() => setEntryMode('single')}
          className={`flex-1 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
            entryMode === 'single'
              ? 'bg-white text-[#171717] shadow-2xs'
              : 'text-[#686864] hover:text-[#171717]'
          }`}
        >
          Single Competitor
        </button>
        <button
          type="button"
          onClick={() => setEntryMode('batch')}
          className={`flex-1 py-1 rounded-[6px] text-xs font-semibold transition-all cursor-pointer ${
            entryMode === 'batch'
              ? 'bg-white text-[#171717] shadow-2xs'
              : 'text-[#686864] hover:text-[#171717]'
          }`}
        >
          Batch Ingest URLs (Up to 5)
        </button>
      </div>

      {entryMode === 'batch' ? (
        <form onSubmit={handleBatchSubmit} className="space-y-4">
          <Field label="Competitor URLs (One per line)" htmlFor="batch-comp-urls">
            <textarea
              id="batch-comp-urls"
              rows={4}
              required
              value={batchUrls}
              onChange={(e) => setBatchUrls(e.target.value)}
              placeholder="https://competitor1.com&#10;https://competitor2.com&#10;https://competitor3.com"
              className="w-full p-3 text-xs rounded-[8px] border border-[#E6E6E2] bg-[#FFFFFF] font-mono focus:outline-none focus:border-[#FF7417]"
            />
          </Field>
          <p className="text-[11px] text-[#686864]">
            BrainWise automatically parses domains, normalizes brand names, sets up initial SWOT baselines, and enrolls each rival into your weekly Market Watch feed.
          </p>
          <div className="pt-2 flex justify-end gap-2">
            <Button variant="secondary" size="sm" type="button" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" size="sm" type="submit">
              Ingest Batch Rivals
            </Button>
          </div>
        </form>
      ) : (
      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Competitor Name" htmlFor="shared-comp-name">
          <Input
            id="shared-comp-name"
            type="text"
            required
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Araku Craft Roasters"
          />
        </Field>

        <Field label="Website URL" htmlFor="shared-comp-web">
          <Input
            id="shared-comp-web"
            type="text"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
            placeholder="https://"
          />
        </Field>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Industry Category" htmlFor="shared-comp-cat">
            <Input
              id="shared-comp-cat"
              type="text"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
            />
          </Field>
          <Field label="Geography" htmlFor="shared-comp-geo">
            <Input
              id="shared-comp-geo"
              type="text"
              value={geography}
              onChange={(e) => setGeography(e.target.value)}
            />
          </Field>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <Field label="Discovery Method" htmlFor="shared-comp-method">
            <Select
              id="shared-comp-method"
              value={discoveryMethod}
              onChange={(e) =>
                setDiscoveryMethod(e.target.value as CompetitorProfileData['discoveryMethod'])
              }
            >
              <option value="Manual Entry">Manual Entry</option>
              <option value="AI Market Scan">AI Market Scan</option>
              <option value="Idea Research">Idea Research</option>
            </Select>
          </Field>

          <Field label="Monitoring Frequency" htmlFor="shared-comp-freq">
            <Select
              id="shared-comp-freq"
              value={frequency}
              onChange={(e) =>
                setFrequency(e.target.value as CompetitorProfileData['monitoringFrequency'])
              }
            >
              <option value="Daily">Daily</option>
              <option value="Weekly">Weekly</option>
              <option value="Bi-weekly">Bi-weekly</option>
            </Select>
          </Field>
        </div>

        <label className="flex items-center justify-between p-3 rounded-[10px] border border-[#E6E6E2] bg-[#F5F5F4] text-xs cursor-pointer">
          <span className="font-medium text-[#242424]">Enable automatic Market Watch alerts</span>
          <input
            type="checkbox"
            checked={monitoringEnabled}
            onChange={(e) => setMonitoringEnabled(e.target.checked)}
            className="w-4 h-4 accent-[#FF7417]"
          />
        </label>

        {monitoringEnabled && (
          <div>
            <div className="text-xs font-medium text-[#242424] mb-2">Tracked Signal Categories</div>
            <div className="flex flex-wrap gap-1.5">
              {MONITORING_CATEGORIES.map((cat) => {
                const active = monitoredCategories.includes(cat);
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => toggleCat(cat)}
                    className={`px-2.5 py-1 text-[11px] rounded-[8px] border inline-flex items-center gap-1 cursor-pointer transition-colors ${
                      active
                        ? 'bg-[#FFF0E5] border-[#FF7417] text-[#C44D00]'
                        : 'bg-[#F5F5F4] border-[#E6E6E2] text-[#686864] hover:text-[#242424]'
                    }`}
                  >
                    {active && <Check className="w-3 h-3" />}
                    {cat}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2 border-t border-[#E6E6E2]">
          <Button variant="secondary" size="sm" onClick={onClose}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" size="sm">
            Save Competitor
          </Button>
        </div>
      </form>
      )}
    </Modal>
  );
};
