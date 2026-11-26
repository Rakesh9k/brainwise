import React, { useState } from 'react';
import { motion } from 'motion/react';
import { DollarSign, Sliders, Users } from 'lucide-react';
import type { ResearchReport } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface InteractiveTamVisualizerProps {
  report: ResearchReport;
  dynamicBands?: {
    tamBand: string;
    samBand: string;
    somBand: string;
    somMidpointMillion: number;
  };
}

export const InteractiveTamVisualizer: React.FC<InteractiveTamVisualizerProps> = ({
  report,
  dynamicBands,
}) => {
  const [selectedRing, setSelectedRing] = useState<'tam' | 'sam' | 'som'>('som');
  const [marketSharePercent, setMarketSharePercent] = useState<number>(1.5);

  const tamLabel = dynamicBands?.tamBand || report.tamSamSom.tamLabel || '$2.4B';
  const samLabel = dynamicBands?.samBand || report.tamSamSom.samLabel || '$120M';
  const baseSomMid = dynamicBands?.somMidpointMillion || 1.8;

  // Dynamically compute projected SOM revenue and target customers based on slider
  const dynamicSomMillion = Math.max(0.2, (baseSomMid * (marketSharePercent / 1.5))).toFixed(2);
  const estimatedTicketAnnual = 350; // average annual spend
  const targetCustomerCount = Math.round((parseFloat(dynamicSomMillion) * 1_000_000) / estimatedTicketAnnual).toLocaleString();

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#FF7417] text-white">
              MARKET SIZING
            </span>
            <span className="text-xs text-[#686864] font-medium">Interactive Visualizer</span>
          </div>
          <h3 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
            TAM, SAM &amp; SOM Market Opportunity
          </h3>
          <p className="text-xs text-[#686864]">
            Concentric opportunity rings with editable market-share assumptions. Click any ring to inspect.
          </p>
        </div>

        {/* Quick Ring Selector Pills */}
        <div className="flex items-center gap-1.5 p-1 bg-[#F5F5F4] rounded-[10px] border border-[#E6E6E2] shrink-0">
          {(['tam', 'sam', 'som'] as const).map((ring) => (
            <button
              key={ring}
              type="button"
              onClick={() => setSelectedRing(ring)}
              className={`px-3 py-1 text-xs font-semibold rounded-[7px] uppercase transition-all cursor-pointer ${
                selectedRing === ring
                  ? 'bg-[#171717] text-white shadow-xs'
                  : 'text-[#686864] hover:text-[#171717]'
              }`}
            >
              {ring}
            </button>
          ))}
        </div>
      </div>

      {/* Main Interactive Stage: Graphic Concentric Rings + Detail Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* SVG Animated Concentric Solar Rings */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-4">
          <div className="relative w-[280px] h-[280px] sm:w-[320px] sm:h-[320px] flex items-center justify-center">
            {/* TAM Outer Ring */}
            <motion.div
              animate={{
                scale: selectedRing === 'tam' ? 1.04 : 1,
                borderColor: selectedRing === 'tam' ? '#FF7417' : '#E6E6E2',
              }}
              transition={{ duration: 0.3 }}
              onClick={() => setSelectedRing('tam')}
              className="absolute inset-0 rounded-full border-2 border-dashed bg-[#FBFBFA]/70 cursor-pointer flex items-start justify-center pt-2 transition-shadow hover:shadow-md"
            >
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#8A8A85] uppercase">
                TAM: {tamLabel}
              </span>
            </motion.div>

            {/* SAM Middle Ring */}
            <motion.div
              animate={{
                scale: selectedRing === 'sam' ? 1.05 : 1,
                borderColor: selectedRing === 'sam' ? '#FF7417' : '#D4D4D0',
                backgroundColor: selectedRing === 'sam' ? '#FFF5EE' : '#F4F4F2',
              }}
              transition={{ duration: 0.3 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRing('sam');
              }}
              className="absolute w-[200px] h-[200px] sm:w-[220px] sm:h-[220px] rounded-full border-2 cursor-pointer flex items-start justify-center pt-2 shadow-xs transition-shadow hover:shadow-md"
            >
              <span className="text-[11px] font-mono font-bold tracking-wider text-[#686864] uppercase">
                SAM: {samLabel}
              </span>
            </motion.div>

            {/* SOM Core Center Ring */}
            <motion.div
              animate={{
                scale: selectedRing === 'som' ? 1.08 : 1,
                boxShadow: selectedRing === 'som' ? '0 10px 25px -5px rgba(255, 116, 23, 0.35)' : '0 4px 12px rgba(0,0,0,0.06)',
              }}
              transition={{ duration: 0.3 }}
              onClick={(e) => {
                e.stopPropagation();
                setSelectedRing('som');
              }}
              className="relative w-[120px] h-[120px] sm:w-[130px] sm:h-[130px] rounded-full bg-gradient-to-br from-[#FF7417] to-[#E05300] text-white cursor-pointer flex flex-col items-center justify-center p-2 text-center select-none"
            >
              <div className="text-[10px] font-bold tracking-wider uppercase opacity-90">
                SOM TARGET
              </div>
              <div className="text-base sm:text-lg font-black font-mono-num tracking-tight mt-0.5">
                ${dynamicSomMillion}M
              </div>
              <div className="text-[9px] opacity-80 mt-0.5 font-medium">Year 2–3 Slice</div>
            </motion.div>
          </div>

          <div className="flex items-center gap-4 text-xs text-[#8A8A85] mt-3">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full border border-dashed border-[#8A8A85]" /> Total Market
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#E6E6E2]" /> Addressable Niche
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF7417]" /> Your Wedge
            </span>
          </div>
        </div>

        {/* Selected Tier Breakdown & Interactive Sensitivity Controls */}
        <div className="lg:col-span-6 space-y-4">
          {/* Active Ring Detail Card */}
          <div className="p-4 rounded-[12px] bg-[#F9F9F8] border border-[#E6E6E2] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#FF7417]">
                {selectedRing === 'tam' && 'Total Addressable Market (TAM)'}
                {selectedRing === 'sam' && 'Serviceable Available Market (SAM)'}
                {selectedRing === 'som' && 'Serviceable Obtainable Market (SOM)'}
              </span>
              <span className="text-sm font-mono-num font-bold text-[#171717]">
                {selectedRing === 'tam' && tamLabel}
                {selectedRing === 'sam' && samLabel}
                {selectedRing === 'som' && `$${dynamicSomMillion}M`}
              </span>
            </div>
            <p className="text-xs text-[#40403E] leading-relaxed">
              {selectedRing === 'tam' && (report.tamSamSom.tamBasis || 'The global/macro expenditure on this product category without geographic or segmentation filters.')}
              {selectedRing === 'sam' && (report.tamSamSom.samBasis || 'The realistic addressable subset of customers in your active target geography and demographic segment.')}
              {selectedRing === 'som' && (report.tamSamSom.somBasis || 'The focused 2–3 year realistic market slice your initial business operations and distribution can capture.')}
            </p>
          </div>

          {/* Interactive Market Share Simulator */}
          <div className="p-4 rounded-[12px] border border-[#FFD8BF] bg-[#FFF8F3] space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sliders className="w-3.5 h-3.5 text-[#FF7417]" />
                <span className="text-xs font-bold text-[#171717]">
                  Market Share Simulator
                </span>
              </div>
              <span className="font-mono-num text-xs font-bold px-2 py-0.5 rounded-md bg-[#FF7417] text-white">
                {marketSharePercent.toFixed(1)}% of SAM
              </span>
            </div>

            <input
              type="range"
              min={0.2}
              max={5.0}
              step={0.1}
              value={marketSharePercent}
              onChange={(e) => setMarketSharePercent(parseFloat(e.target.value))}
              aria-label="Market share percentage slider"
              className="w-full accent-[#FF7417] cursor-pointer"
            />

            {/* Derived Outputs */}
            <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#FFE4D1] text-xs">
              <div className="flex items-center gap-2">
                <DollarSign className="w-4 h-4 text-[#FF7417] shrink-0" />
                <div>
                  <div className="text-[10px] text-[#686864] uppercase font-semibold">Annual Revenue</div>
                  <div className="font-mono-num font-bold text-[#171717]">${dynamicSomMillion} Million</div>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <Users className="w-4 h-4 text-[#FF7417] shrink-0" />
                <div>
                  <div className="text-[10px] text-[#686864] uppercase font-semibold">Active Customers</div>
                  <div className="font-mono-num font-bold text-[#171717]">~{targetCustomerCount} subscribers</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
