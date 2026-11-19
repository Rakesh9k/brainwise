import React, { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { ArrowRight, Check, Minus, Moon, Plus, Sun } from 'lucide-react';
import { BrandLogoMark, IntelligenceOrb } from '../ui/DesignSystem';
import { TiltDeviceFrame } from '../motion/MotionPrimitives';
import { estimateMarketSizing } from '../../utils/logic';

export type ShowcaseStepId = '01' | '02' | '03' | '04';

const DEVICE_TABS: { id: ShowcaseStepId; label: string; dept: string }[] = [
  { id: '01', label: '01. Validate', dept: 'Idea Intelligence' },
  { id: '02', label: '02. Position', dept: 'Competitive Intel' },
  { id: '03', label: '03. Brand', dept: 'Brand Studio' },
  { id: '04', label: '04. Execute', dept: 'Growth Planner' },
];

const COMPETITOR_DOTS = [
  {
    id: 'roastery',
    name: 'Roastery House',
    x: 34,
    y: 38,
    note: 'Café-first loyalty · Weak D2C urgency',
  },
  {
    id: 'coffeeco',
    name: 'The Coffee Co.',
    x: 56,
    y: 42,
    note: 'Wide catalog · Stale marketplace stock',
  },
  {
    id: 'monolith',
    name: 'Monolith Labs',
    x: 78,
    y: 26,
    note: 'Ultra-niche purist · High jargon barrier',
  },
  {
    id: 'solstice',
    name: 'Solstice Craft',
    x: 80,
    y: 78,
    note: '48h roast dispatch + warm precision',
    active: true,
  },
];

export const InteractiveDeviceMockup: React.FC<{
  activeStep: ShowcaseStepId;
  onSelectStep: (step: ShowcaseStepId) => void;
  onOpenLiveDemo: () => void;
}> = ({ activeStep, onSelectStep, onOpenLiveDemo }) => {
  const reduced = useReducedMotion();

  // Interactive preview controls
  const [samPct, setSamPct] = useState(12);
  const [selectedRival, setSelectedRival] = useState(COMPETITOR_DOTS[3]);
  const [brandDarkSurface, setBrandDarkSurface] = useState(true);
  const [previewTasks, setPreviewTasks] = useState([
    { id: 't1', label: 'Publish 48h Roast Freshness Carousel', mins: '25m', done: true },
    { id: 't2', label: 'Ship Tasting Kits to 5 Hyderabad Studios', mins: '45m', done: false },
    { id: 't3', label: 'Counter Roastery House +9% bag hike banner', mins: '15m', done: false },
  ]);

  const sizing = estimateMarketSizing(2.6, samPct, 1.0);
  const completedCount = previewTasks.filter((t) => t.done).length;

  const togglePreviewTask = (id: string) => {
    setPreviewTasks((prev) => prev.map((t) => (t.id === id ? { ...t, done: !t.done } : t)));
  };

  return (
    <TiltDeviceFrame className="relative">
      <div className="relative mx-auto xl:mb-8">
        {/* Main Floating Tablet / Workspace Hardware Frame */}
        <div className="rounded-[18px] border border-[#E6E6E2] bg-[#FFFFFF] shadow-[0_28px_70px_rgba(23,23,23,0.08)] overflow-hidden">
          {/* Device Top Chrome */}
          <div className="px-4 sm:px-5 py-3 bg-[#F5F5F4] border-b border-[#E6E6E2] flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs text-[#686864]">
              <span className="font-semibold text-[#242424]">Solstice Craft Coffee</span>
              <span aria-hidden="true">/</span>
              <span>{DEVICE_TABS.find((t) => t.id === activeStep)?.dept}</span>
            </div>

            {/* Interactive Tab Switcher */}
            <div
              role="tablist"
              aria-label="Interactive product preview departments"
              className="inline-flex flex-wrap items-center gap-1 p-1 bg-[#E6E6E2]/75 rounded-[9px]"
            >
              {DEVICE_TABS.map((tab) => {
                const isActive = activeStep === tab.id;
                return (
                  <button
                    key={tab.id}
                    type="button"
                    role="tab"
                    aria-selected={isActive}
                    onClick={() => onSelectStep(tab.id)}
                    className={`relative px-2.5 py-1 text-xs font-medium rounded-[6px] transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      isActive ? 'text-[#242424]' : 'text-[#686864] hover:text-[#242424]'
                    }`}
                  >
                    {isActive && (
                      <motion.span
                        layoutId="landing-device-tab-bg"
                        transition={{ duration: reduced ? 0.01 : 0.2, ease: [0.16, 1, 0.3, 1] }}
                        className="absolute inset-0 bg-white rounded-[6px] shadow-xs"
                      />
                    )}
                    <span className="relative z-10">{tab.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Device Interior Split */}
          <div className="grid grid-cols-1 md:grid-cols-[164px_1fr] min-h-[380px]">
            {/* Mini Deep Charcoal Shell Rail */}
            <div className="bg-[#171717] text-[#B8B8A2] p-3.5 hidden md:flex flex-col justify-between">
              <div className="space-y-1 text-xs">
                <div className="flex items-center gap-2 text-white font-semibold pb-3 mb-2 border-b border-[#2C2C2C]">
                  <BrandLogoMark size={20} dark />
                  <span>BrainWise</span>
                </div>
                {DEVICE_TABS.map((item) => {
                  const active = activeStep === item.id;
                  return (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => onSelectStep(item.id)}
                      className={`w-full text-left px-2.5 py-2 rounded-[8px] transition-colors whitespace-nowrap cursor-pointer ${
                        active
                          ? 'bg-[#242424] text-white border border-[#FF7417]/50'
                          : 'text-[#8E8E88] hover:text-white hover:bg-[#242424]/70'
                      }`}
                    >
                      {item.dept}
                    </button>
                  );
                })}
              </div>

              <button
                type="button"
                onClick={onOpenLiveDemo}
                className="w-full text-left px-3 py-2.5 rounded-[9px] bg-[#242424] hover:bg-[#2E2E2E] border border-[#323232] text-[11px] text-[#E5E5E0] transition-colors flex items-center justify-between gap-2 cursor-pointer"
              >
                <span>Open live workspace</span>
                <ArrowRight className="w-3.5 h-3.5 text-[#FF8A36] shrink-0" />
              </button>
            </div>

            {/* Dynamic Live Preview Canvas */}
            <div className="p-5 sm:p-6 bg-[#F5F5F4] flex flex-col justify-between">
              <AnimatePresence mode="wait">
                {activeStep === '01' && (
                  <motion.div
                    key="step-01"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#C44D00]">
                          01 · Idea Intelligence Dossier
                        </div>
                        <h3 className="font-heading text-lg font-bold text-[#242424]">
                          Roast-on-Demand Micro-Lot Subscription
                        </h3>
                      </div>
                      <span className="text-xs font-medium text-[#24724E]">
                        Strong Fit · High Confidence
                      </span>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                      <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E6E2]">
                        <div className="text-[11px] text-[#686864]">TAM Band</div>
                        <div className="text-base font-bold font-mono-num mt-0.5 text-[#242424]">
                          {sizing.tamBand}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E6E2]">
                        <div className="text-[11px] text-[#686864]">SAM ({samPct}% Specialty)</div>
                        <div className="text-base font-bold font-mono-num mt-0.5 text-[#242424]">
                          {sizing.samBand}
                        </div>
                      </div>
                      <div className="p-3.5 rounded-[10px] bg-[#171717] border border-[#2C2C2C] text-white">
                        <div className="text-[11px] text-[#A8A8A2]">3-Yr SOM Target</div>
                        <div className="text-base font-bold font-mono-num text-[#FF8A36] mt-0.5">
                          {sizing.somBand}
                        </div>
                      </div>
                    </div>

                    {/* Live Assumption Adjuster */}
                    <div className="p-3.5 rounded-[10px] bg-white border border-[#E6E6E2] flex flex-wrap items-center justify-between gap-3">
                      <div className="text-xs text-[#686864]">
                        Test Specialty Metro Share Assumption:{' '}
                        <strong className="font-mono-num text-[#242424]">{samPct}%</strong>
                      </div>
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => setSamPct((v) => Math.max(4, v - 2))}
                          aria-label="Decrease market share assumption"
                          className="w-7 h-7 rounded-[7px] border border-[#E6E6E2] bg-[#F5F5F4] hover:bg-[#ECECE9] flex items-center justify-center cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5 text-[#242424]" />
                        </button>
                        <button
                          type="button"
                          onClick={() => setSamPct((v) => Math.min(28, v + 2))}
                          aria-label="Increase market share assumption"
                          className="w-7 h-7 rounded-[7px] border border-[#E6E6E2] bg-[#F5F5F4] hover:bg-[#ECECE9] flex items-center justify-center cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5 text-[#242424]" />
                        </button>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeStep === '02' && (
                  <motion.div
                    key="step-02"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#C44D00]">
                          02 · Competitive Positioning Map
                        </div>
                        <h3 className="font-heading text-lg font-bold text-[#242424]">
                          White-Space Quadrant Selection
                        </h3>
                      </div>
                      <span className="text-xs text-[#686864]">Click any rival node</span>
                    </div>

                    <div className="relative h-48 rounded-[12px] bg-white border border-[#E6E6E2] overflow-hidden p-3">
                      {/* Axis Hairlines */}
                      <div className="absolute inset-x-4 top-1/2 border-t border-dashed border-[#E6E6E2]" />
                      <div className="absolute inset-y-4 left-1/2 border-l border-dashed border-[#E6E6E2]" />
                      <span className="absolute top-2 left-1/2 -translate-x-1/2 text-[10px] text-[#8E8E88]">
                        High Digital Focus
                      </span>
                      <span className="absolute bottom-2 left-1/2 -translate-x-1/2 text-[10px] text-[#8E8E88]">
                        High Differentiation &amp; Freshness
                      </span>

                      {COMPETITOR_DOTS.map((dot) => {
                        const isSelected = selectedRival.id === dot.id;
                        return (
                          <button
                            key={dot.id}
                            type="button"
                            onClick={() => setSelectedRival(dot)}
                            style={{ left: `${dot.x}%`, top: `${dot.y}%` }}
                            className={`absolute -translate-x-1/2 -translate-y-1/2 px-2 py-1 rounded-[7px] text-[11px] font-medium transition-transform cursor-pointer ${
                              dot.active
                                ? 'bg-[#FF7417] text-white shadow-sm'
                                : isSelected
                                  ? 'bg-[#171717] text-white'
                                  : 'bg-[#F5F5F4] text-[#242424] border border-[#E6E6E2] hover:border-[#FF7417]'
                            }`}
                          >
                            {dot.name}
                          </button>
                        );
                      })}
                    </div>

                    <div className="p-3 rounded-[10px] bg-white border border-[#E6E6E2] text-xs flex items-center justify-between gap-3">
                      <span className="font-semibold text-[#242424]">{selectedRival.name}</span>
                      <span className="text-[#686864]">{selectedRival.note}</span>
                    </div>
                  </motion.div>
                )}

                {activeStep === '03' && (
                  <motion.div
                    key="step-03"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#C44D00]">
                          03 · Brand &amp; Collateral Studio
                        </div>
                        <h3 className="font-heading text-lg font-bold text-[#242424]">
                          Approved Identity Specimen
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() => setBrandDarkSurface((d) => !d)}
                        className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-[8px] border border-[#E6E6E2] bg-white text-[#242424] hover:bg-[#ECECE9] cursor-pointer"
                      >
                        {brandDarkSurface ? (
                          <>
                            <Sun className="w-3.5 h-3.5 text-[#FF7417]" />
                            Light Card
                          </>
                        ) : (
                          <>
                            <Moon className="w-3.5 h-3.5 text-[#242424]" />
                            Obsidian Card
                          </>
                        )}
                      </button>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                      <div
                        className={`rounded-[12px] p-5 border flex flex-col justify-between min-h-[168px] transition-colors ${
                          brandDarkSurface
                            ? 'bg-[#171717] text-white border-[#2C2C2C]'
                            : 'bg-white text-[#242424] border-[#E6E6E2]'
                        }`}
                      >
                        <div className="text-[11px] font-mono-num text-[#8E8E88]">
                          PACKAGING SLEEVE · 250G
                        </div>
                        <div>
                          <div className="font-heading text-xl font-bold">
                            Solstice Craft Coffee
                          </div>
                          <div
                            className={`text-xs mt-1 ${
                              brandDarkSurface ? 'text-[#FF8A36]' : 'text-[#C44D00]'
                            }`}
                          >
                            Roasted Tuesday. Brewed by Thursday.
                          </div>
                        </div>
                      </div>

                      <div className="rounded-[12px] bg-white border border-[#E6E6E2] p-4 space-y-3">
                        <div className="text-xs font-semibold text-[#242424]">
                          Locked Surface Tokens
                        </div>
                        <div className="grid grid-cols-4 gap-2">
                          {['#242424', '#F5F5F4', '#FF7417', '#E6E6E2'].map((hex) => (
                            <div key={hex} className="text-center space-y-1">
                              <div
                                className="w-7 h-7 mx-auto rounded-[7px] border border-[#E6E6E2]"
                                style={{ backgroundColor: hex }}
                              />
                              <div className="text-[9px] font-mono-num text-[#686864]">{hex}</div>
                            </div>
                          ))}
                        </div>
                        <div className="text-[11px] text-[#686864]">
                          Display: Manrope · Body: Plus Jakarta Sans
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}

                {activeStep === '04' && (
                  <motion.div
                    key="step-04"
                    initial={reduced ? false : { opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={reduced ? undefined : { opacity: 0, y: -6 }}
                    transition={{ duration: 0.22, ease: [0.16, 1, 0.3, 1] }}
                    className="space-y-4"
                  >
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <div>
                        <div className="text-xs font-semibold text-[#C44D00]">
                          04 · Growth Planner Execution
                        </div>
                        <h3 className="font-heading text-lg font-bold text-[#242424]">
                          Today’s Prioritized Actions
                        </h3>
                      </div>
                      <span className="text-xs font-mono-num text-[#686864]">
                        {completedCount}/{previewTasks.length} Done
                      </span>
                    </div>

                    <div className="space-y-2">
                      {previewTasks.map((task) => (
                        <button
                          key={task.id}
                          type="button"
                          onClick={() => togglePreviewTask(task.id)}
                          className="w-full p-3 rounded-[10px] bg-white border border-[#E6E6E2] hover:border-[#FF7417]/60 flex items-center justify-between gap-3 text-left transition-colors cursor-pointer"
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <span
                              className={`w-5 h-5 rounded-[6px] border flex items-center justify-center shrink-0 transition-colors ${
                                task.done
                                  ? 'bg-[#FF7417] border-[#FF7417] text-white'
                                  : 'border-[#CFCFC8] bg-white'
                              }`}
                            >
                              {task.done && <Check className="w-3 h-3" />}
                            </span>
                            <span
                              className={`text-xs font-medium truncate ${
                                task.done ? 'line-through text-[#8E8E88]' : 'text-[#242424]'
                              }`}
                            >
                              {task.label}
                            </span>
                          </div>
                          <span className="text-[11px] font-mono-num text-[#686864] shrink-0">
                            {task.mins}
                          </span>
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Persistent Mobile/Small Shortcut */}
              <div className="pt-4 mt-5 border-t border-[#E6E6E2] xl:pr-64 flex items-center justify-between gap-3 text-xs">
                <span className="text-[#686864]">
                  Synced to <strong className="text-[#242424]">Solstice Craft Coffee</strong>{' '}
                  Business Brain
                </span>
                <button
                  type="button"
                  onClick={onOpenLiveDemo}
                  className="md:hidden font-semibold text-[#C44D00] hover:text-[#A33E00] whitespace-nowrap cursor-pointer"
                >
                  Open Live Demo →
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Floating Companion Phone Frame (Desktop XL+, tucked below footer strip with zero canvas overlap) */}
        <motion.div
          aria-hidden="true"
          initial={reduced ? false : { opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45, delay: 0.15, ease: [0.16, 1, 0.3, 1] }}
          className="hidden xl:block relative z-20 ml-auto -mt-10 mr-4 w-56 rounded-[22px] border border-[#2C2C2C] bg-[#171717] text-white p-4 shadow-[0_24px_50px_rgba(23,23,23,0.24)]"
        >
          <div className="flex items-center justify-between text-[10px] font-mono-num text-[#A8A8A2] pb-2.5 border-b border-[#2C2C2C]">
            <span className="inline-flex items-center gap-1.5">
              <IntelligenceOrb size="xs" state="active" />
              <span>MOBILE BRIEF</span>
            </span>
            <span className="text-[#FF8A36]">{activeStep}</span>
          </div>
          <div className="mt-3 space-y-2">
            {activeStep === '01' && (
              <>
                <div className="text-xs font-semibold">3-Yr Capture Target</div>
                <div className="font-heading text-lg font-bold text-[#FF8A36] tabular-nums">
                  {sizing.somBand}
                </div>
                <p className="text-[11px] text-[#B8B8A2] leading-snug">
                  Discovery flight lowers payback to 1.4 cycles.
                </p>
              </>
            )}
            {activeStep === '02' && (
              <>
                <div className="text-xs font-semibold">White-Space Signal</div>
                <div className="font-heading text-base font-bold text-white">
                  {selectedRival.name}
                </div>
                <p className="text-[11px] text-[#B8B8A2] leading-snug">{selectedRival.note}</p>
              </>
            )}
            {activeStep === '03' && (
              <>
                <div className="text-xs font-semibold">Social Creative Ready</div>
                <div className="font-heading text-base font-bold text-[#FF8A36]">
                  48h Roast Carousel
                </div>
                <p className="text-[11px] text-[#B8B8A2] leading-snug">
                  On-brand contrast verified for 4:5 mobile feed.
                </p>
              </>
            )}
            {activeStep === '04' && (
              <>
                <div className="text-xs font-semibold">Daily Execution</div>
                <div className="font-heading text-lg font-bold text-[#FF8A36] tabular-nums">
                  {completedCount} of {previewTasks.length} Done
                </div>
                <p className="text-[11px] text-[#B8B8A2] leading-snug">
                  Market Watch alerts auto-queued into sprint.
                </p>
              </>
            )}
          </div>
        </motion.div>
      </div>
    </TiltDeviceFrame>
  );
};
