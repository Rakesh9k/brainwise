import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, ChevronDown, Send } from 'lucide-react';
import {
  filterJournalArticles,
  synthesizePlaybookPrompt,
  type JournalArticle,
} from '../../utils/logic';
import { generateAiPlaybookAngle } from '../../utils/aiClient';
import { ResilientMedia } from '../motion/MotionPrimitives';
import { LiquidSkeletonReveal } from '../motion/LiquidMotion';
import { PlaybookSynthesisSkeleton } from '../ui/LiquidSkeletons';
import { typeClass } from '../../theme/typography';

const JOURNAL_ARTICLES: JournalArticle[] = [
  {
    id: 'j-market-sizing',
    category: 'Market Validation',
    title: 'Replacing Single-Point Forecasts With Honest TAM/SAM/SOM Range Bands',
    excerpt:
      'Why early founders make better capital decisions when sizing assumptions stay interactive and verifiable instead of static slide claims.',
    readTime: '5 min read',
    publishedAt: 'Nov 2026',
    image: '/src/assets/images/journal_market_validation_1794898436790.jpg',
    takeaways: [
      'Separate primary category benchmarks from modelled conversion assumptions.',
      'Stress-test CAC payback sensitivity before committing to inventory or retail leases.',
      'Convert top research uncertainties into 14-day pre-launch validation drops.',
    ],
    defaultPrompt: 'Specialty tea subscription in Tier-1 metros',
  },
  {
    id: 'j-positioning',
    category: 'Positioning',
    title: 'Turning 3-Star Competitor Reviews Into Defensible White-Space Wedges',
    excerpt:
      'A practical teardown method for extracting unmet customer frustrations from established category incumbents and locking them into your messaging.',
    readTime: '4 min read',
    publishedAt: 'Nov 2026',
    image: '/src/assets/images/journal_growth_studio_1794898437096.jpg',
    takeaways: [
      'Cluster recurring 3-star complaints around freshness, delivery friction, or jargon.',
      'Verify rival price ladders to spot uncrowded mid-premium value pockets.',
      'Anchor one concrete operational promise rather than vague quality adjectives.',
    ],
    defaultPrompt: 'Competing against legacy D2C coffee roasters',
  },
  {
    id: 'j-brand-craft',
    category: 'Brand Systems',
    title: 'Binding Visual Identity Directly to Competitive Differentiation',
    excerpt:
      'Why cohesive packaging, editorial typography, and surface contrast outperform generic logo templates when launching a challenger brand.',
    readTime: '6 min read',
    publishedAt: 'Oct 2026',
    image: '/src/assets/images/journal_brand_craft_1794898437857.jpg',
    takeaways: [
      'Translate positioning tension directly into packaging hierarchy and hero copy.',
      'Lock 60-30-10 color contrast rules once across packaging, web, and carousels.',
      'Keep social templates tied to approved proof statements from Business Brain.',
    ],
    defaultPrompt: 'Minimalist warm brand system for artisan goods',
  },
  {
    id: 'j-growth-cadence',
    category: 'Growth Execution',
    title: 'The 30-Day Founder Operating Rhythm: Experiments Over Busywork',
    excerpt:
      'How small teams maintain consistent pipeline growth by linking daily 25-minute execution blocks directly to Market Watch triggers.',
    readTime: '4 min read',
    publishedAt: 'Oct 2026',
    takeaways: [
      'Cap active daily priorities at 3 high-leverage tasks tied to measurable goals.',
      'Define explicit stop/scale thresholds before running any paid or outbound test.',
      'Treat competitor price or SKU shifts as immediate triggers for rapid counter-tests.',
    ],
    defaultPrompt: 'B2B creative studio sample kit outreach cadence',
  },
];

const JOURNAL_CATEGORIES = [
  'All',
  'Market Validation',
  'Positioning',
  'Brand Systems',
  'Growth Execution',
] as const;

export const JournalSection: React.FC<{
  onLaunchWorkspace: () => void;
}> = ({ onLaunchWorkspace }) => {
  const reduced = useReducedMotion();
  const [activeCategory, setActiveCategory] = useState<string>('All');
  const [expandedId, setExpandedId] = useState<string>(JOURNAL_ARTICLES[0].id);
  const [promptInputs, setPromptInputs] = useState<Record<string, string>>({});
  const [synthesizedOutputs, setSynthesizedOutputs] = useState<
    Record<string, { text: string; source: 'ai' | 'local' }>
  >({});
  const [loadingMap, setLoadingMap] = useState<Record<string, boolean>>({});
  const [errorMap, setErrorMap] = useState<Record<string, string>>({});

  const visibleArticles = filterJournalArticles(JOURNAL_ARTICLES, activeCategory);

  const handleSynthesize = async (article: JournalArticle, e: React.FormEvent) => {
    e.preventDefault();
    const query = promptInputs[article.id] ?? '';
    setLoadingMap((prev) => ({ ...prev, [article.id]: true }));
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[article.id];
      return next;
    });

    try {
      const { angle } = await generateAiPlaybookAngle(article, query);
      setSynthesizedOutputs((prev) => ({
        ...prev,
        [article.id]: { text: angle, source: 'ai' },
      }));
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Unable to synthesize playbook angle.';
      setErrorMap((prev) => ({ ...prev, [article.id]: msg }));
    } finally {
      setLoadingMap((prev) => ({ ...prev, [article.id]: false }));
    }
  };

  const handleLocalPreview = (article: JournalArticle) => {
    const query = promptInputs[article.id] ?? '';
    const answer = synthesizePlaybookPrompt(article, query);
    setErrorMap((prev) => {
      const next = { ...prev };
      delete next[article.id];
      return next;
    });
    setSynthesizedOutputs((prev) => ({
      ...prev,
      [article.id]: { text: answer, source: 'local' },
    }));
  };

  return (
    <section id="journal" className="py-20 sm:py-24 bg-[#FFFFFF] border-b border-[#E6E6E2]">
      <div className="max-w-[1240px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col lg:flex-row lg:items-end justify-between gap-6">
          <div className="max-w-lg">
            <p className={`${typeClass.overline} text-[#C44D00]`}>
              Strategy Journal &amp; Playbooks
            </p>
            <h2 className={`mt-2 ${typeClass.h2} text-[#171717] text-balance`}>
              Field notes from research, positioning, and growth execution.
            </h2>
          </div>

          {/* Interactive Tag Filter Controls */}
          <div
            role="group"
            aria-label="Filter journal playbooks by topic"
            className="flex flex-nowrap overflow-x-auto max-w-full shrink-0 items-center gap-1 p-1 bg-[#F5F5F4] border border-[#E6E6E2] rounded-[10px]"
          >
            {JOURNAL_CATEGORIES.map((category) => {
              const selected = activeCategory === category;
              return (
                <button
                  key={category}
                  type="button"
                  onClick={() => {
                    setActiveCategory(category);
                    const nextFiltered = filterJournalArticles(JOURNAL_ARTICLES, category);
                    if (nextFiltered.length > 0 && !nextFiltered.some((a) => a.id === expandedId)) {
                      setExpandedId(nextFiltered[0].id);
                    }
                  }}
                  className={`px-3 py-1.5 text-xs font-medium rounded-[7px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                    selected
                      ? 'bg-[#FFFFFF] text-[#242424] shadow-xs border border-[#E6E6E2]'
                      : 'text-[#686864] hover:text-[#242424]'
                  }`}
                >
                  {category}
                </button>
              );
            })}
          </div>
        </div>

        {/* Journal Grid */}
        <div className="mt-10 grid grid-cols-1 md:grid-cols-2 gap-6">
          {visibleArticles.map((article) => {
            const isExpanded = expandedId === article.id;
            const synthesis = synthesizedOutputs[article.id];
            const isLoading = Boolean(loadingMap[article.id]);
            const synthError = errorMap[article.id];

            return (
              <motion.article
                key={article.id}
                layout={!reduced}
                transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                className={`bw-trace-card rounded-[14px] border bg-[#FFFFFF] bw-surface-raised overflow-hidden flex flex-col justify-between transition-colors ${
                  isExpanded ? 'border-[#242424]/30 md:col-span-2' : 'border-[#E6E6E2]'
                }`}
              >
                <div
                  className={isExpanded && article.image ? 'grid grid-cols-1 lg:grid-cols-12' : ''}
                >
                  {article.image && (
                    <div
                      className={`overflow-hidden bg-[#F5F5F4] ${
                        isExpanded ? 'lg:col-span-5 min-h-[240px]' : 'aspect-4/3'
                      }`}
                    >
                      <ResilientMedia
                        src={article.image}
                        alt={article.title}
                        fallbackLabel={article.category}
                        className="w-full h-full object-cover transition-transform duration-500 hover:scale-[1.03]"
                      />
                    </div>
                  )}

                  <div
                    className={`p-6 flex flex-col justify-between ${
                      isExpanded && article.image ? 'lg:col-span-7' : ''
                    }`}
                  >
                    <div>
                      {/* Zero-pill clean unboxed metadata */}
                      <div className="flex flex-wrap items-center gap-2 text-xs text-[#686864]">
                        <span className="font-medium text-[#C44D00]">{article.category}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.readTime}</span>
                        <span aria-hidden="true">·</span>
                        <span>{article.publishedAt}</span>
                      </div>

                      <h3 className={`mt-2.5 ${typeClass.h3} text-[#171717]`}>{article.title}</h3>
                      <p className={`mt-2 ${typeClass.bodySm} text-[#5C5C58]`}>{article.excerpt}</p>
                    </div>

                    <div className="mt-5 flex items-center justify-between gap-4 pt-4 border-t border-[#E6E6E2]">
                      <button
                        type="button"
                        aria-expanded={isExpanded}
                        onClick={() => setExpandedId(isExpanded ? '' : article.id)}
                        className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#242424] hover:text-[#C44D00] transition-colors cursor-pointer"
                      >
                        <span>{isExpanded ? 'Collapse Playbook' : 'Read Playbook & Prompt'}</span>
                        <ChevronDown
                          className={`w-3.5 h-3.5 transition-transform duration-200 ${
                            isExpanded ? 'rotate-180' : ''
                          }`}
                        />
                      </button>

                      <button
                        type="button"
                        onClick={onLaunchWorkspace}
                        className="text-xs font-medium text-[#686864] hover:text-[#242424] transition-colors whitespace-nowrap cursor-pointer"
                      >
                        Apply in Workspace →
                      </button>
                    </div>

                    {/* Smooth Expandable Playbook + Interactive Mini Prompt */}
                    <AnimatePresence initial={false}>
                      {isExpanded && (
                        <motion.div
                          initial={reduced ? false : { opacity: 0, height: 0 }}
                          animate={{ opacity: 1, height: 'auto' }}
                          exit={reduced ? undefined : { opacity: 0, height: 0 }}
                          transition={{ duration: 0.24, ease: [0.16, 1, 0.3, 1] }}
                          className="overflow-hidden"
                        >
                          <div className="pt-5 mt-5 border-t border-[#E6E6E2] space-y-4">
                            <div>
                              <div className="text-xs font-semibold text-[#242424] mb-2">
                                Key Tactical Takeaways
                              </div>
                              <ul className="space-y-1.5 text-xs text-[#686864]">
                                {article.takeaways.map((point) => (
                                  <li key={point} className="flex items-start gap-2">
                                    <span className="text-[#FF7417] font-bold" aria-hidden="true">
                                      —
                                    </span>
                                    <span>{point}</span>
                                  </li>
                                ))}
                              </ul>
                            </div>

                            {/* Interactive Mini-Prompt inside Playbook */}
                            <form
                              onSubmit={(e) => handleSynthesize(article, e)}
                              className="p-3.5 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] space-y-2.5"
                            >
                              <label
                                htmlFor={`journal-prompt-${article.id}`}
                                className="block text-xs font-semibold text-[#242424]"
                              >
                                Test this framework against your business concept
                              </label>
                              <div className="flex flex-col sm:flex-row gap-2">
                                <input
                                  id={`journal-prompt-${article.id}`}
                                  type="text"
                                  value={promptInputs[article.id] ?? ''}
                                  onChange={(e) =>
                                    setPromptInputs((prev) => ({
                                      ...prev,
                                      [article.id]: e.target.value,
                                    }))
                                  }
                                  placeholder={article.defaultPrompt}
                                  className="flex-1 h-9 px-3 text-xs bg-white border border-[#E6E6E2] rounded-[8px] text-[#242424] placeholder:text-[#8E8E88] focus:outline-none focus:border-[#FF7417]"
                                />
                                <button
                                  type="submit"
                                  disabled={isLoading}
                                  className="h-9 px-3.5 rounded-[8px] bg-[#171717] hover:bg-[#242424] disabled:opacity-60 text-white text-xs font-medium inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer transition-colors"
                                >
                                  {isLoading ? (
                                    <span
                                      aria-hidden="true"
                                      className="w-2 h-2 rounded-full bg-[#FF8A36] animate-pulse"
                                    />
                                  ) : (
                                    <Send className="w-3 h-3 text-[#FF8A36]" />
                                  )}
                                  <span>{isLoading ? 'Synthesizing...' : 'Synthesize Angle'}</span>
                                </button>
                              </div>

                              {synthError && (
                                <div className="p-3 rounded-[8px] bg-[#FDF0F0] border border-[#F5CECE] text-xs text-[#BC3E3E] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                                  <span>{synthError}</span>
                                  <button
                                    type="button"
                                    onClick={() => handleLocalPreview(article)}
                                    className="font-semibold text-[#252525] hover:text-[#C44D00] whitespace-nowrap shrink-0 cursor-pointer"
                                  >
                                    Preview Local Framework →
                                  </button>
                                </div>
                              )}

                              {(isLoading || synthesis) && (
                                <LiquidSkeletonReveal
                                  loading={isLoading}
                                  contentKey={`${article.id}-${synthesis?.source ?? 'idle'}-${synthesis?.text.slice(0, 16) ?? ''}`}
                                  statusLabel="Synthesizing tailored playbook angle"
                                  skeleton={<PlaybookSynthesisSkeleton />}
                                >
                                  {synthesis && (
                                    <div className="p-3.5 rounded-[12px] bg-white border border-[#ECECE8] text-xs text-[#252524] leading-relaxed flex flex-col sm:flex-row sm:items-center justify-between gap-3 bw-surface-raised">
                                      <div className="space-y-1">
                                        <span className="block text-[10px] font-semibold uppercase tracking-wider text-[#C44D00]">
                                          {synthesis.source === 'ai'
                                            ? 'Live AI Synthesis'
                                            : 'Local Framework Preview'}
                                        </span>
                                        <span>{synthesis.text}</span>
                                      </div>
                                      <button
                                        type="button"
                                        onClick={onLaunchWorkspace}
                                        className="inline-flex items-center gap-1 text-xs font-semibold text-[#C44D00] hover:text-[#A33E00] whitespace-nowrap shrink-0 cursor-pointer"
                                      >
                                        <span>Run Full Dossier</span>
                                        <ArrowRight className="w-3.5 h-3.5" />
                                      </button>
                                    </div>
                                  )}
                                </LiquidSkeletonReveal>
                              )}
                            </form>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                </div>
              </motion.article>
            );
          })}
        </div>
      </div>
    </section>
  );
};
