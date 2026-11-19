import React, { useState } from 'react';
import { Check } from 'lucide-react';
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
  const { state, addCompetitor } = useBrainWise();
  const [name, setName] = useState('');
  const [website, setWebsite] = useState('');
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

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={title}
      subtitle="Unified competitor profile and live Market Watch tracking configuration."
    >
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
    </Modal>
  );
};
