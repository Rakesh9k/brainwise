import React, { useState } from 'react';
import { DollarSign, Flame, Sparkles, Users } from 'lucide-react';
import { typeClass } from '../../theme/typography';
import { SlidingSegmentedControl } from '../animation';

type WaitingToolTab = 'tam' | 'cac' | 'runway';

export const InteractiveWaitingSuite: React.FC = () => {
  const [activeTab, setActiveTab] = useState<WaitingToolTab>('tam');

  // Tool 1: TAM / SAM / SOM Sizer
  const [population, setPopulation] = useState(500000); // 500k potential customers
  const [penetrationPct, setPenetrationPct] = useState(1.5); // 1.5%
  const [arpuAnnual, setArpuAnnual] = useState(360); // $360/yr ($30/mo)

  const calculatedTam = (population * arpuAnnual) / 1000000; // in Millions
  const calculatedSam = calculatedTam * 0.25; // 25% addressable
  const calculatedSom = (population * (penetrationPct / 100) * arpuAnnual) / 1000000;

  // Tool 2: CAC Payback & Unit Economics
  const [cacValue, setCacValue] = useState(45); // $45 CAC
  const [arpuMonthly, setArpuMonthly] = useState(25); // $25/mo
  const [churnPct, setChurnPct] = useState(5); // 5% monthly churn

  const paybackMonths = arpuMonthly > 0 ? (cacValue / arpuMonthly).toFixed(1) : '0';
  const customerLifespanMonths = churnPct > 0 ? 100 / churnPct : 20;
  const estimatedLtv = arpuMonthly * customerLifespanMonths;
  const ltvCacRatio = cacValue > 0 ? (estimatedLtv / cacValue).toFixed(1) : '0';

  // Tool 3: Runway & Burn
  const [cashBank, setCashBank] = useState(60000); // $60,000
  const [monthlyBurn, setMonthlyBurn] = useState(4500); // $4,500/mo net burn
  const runwayMonths = monthlyBurn > 0 ? Math.floor(cashBank / monthlyBurn) : 99;

  return (
    <div className="rounded-[16px] border border-[#2E2E2E] bg-[#141414] text-white p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#252525]">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[#FF7417]" />
            <span className="text-[11px] font-bold text-[#FF7417] uppercase tracking-wider">
              EXPLORE WHILE YOU WAIT
            </span>
          </div>
          <h3 className={`${typeClass.h4} font-bold text-white`}>
            Interactive Micro-Strategy Calculators
          </h3>
          <p className={`${typeClass.bodySm} text-[#A8A8A2]`}>
            Test your revenue assumptions and unit economics while the AI synthesizes your dossier.
          </p>
        </div>

        {/* Tab Pills */}
        <SlidingSegmentedControl
          options={[
            { id: 'tam', label: 'TAM Sizer', icon: Users },
            { id: 'cac', label: 'CAC & LTV', icon: DollarSign },
            { id: 'runway', label: 'Runway', icon: Flame },
          ]}
          activeId={activeTab}
          onChange={(id) => setActiveTab(id as WaitingToolTab)}
          variant="dark"
          size="sm"
          layoutId="waiting-calculator-tab"
          className="self-start sm:self-auto"
        />
      </div>

      {/* Calculator Body */}
      {activeTab === 'tam' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Target Audience Universe (Accounts / Buyers)</span>
                <strong className="text-white font-mono-num">{population.toLocaleString()}</strong>
              </div>
              <input
                type="range"
                min={10000}
                max={5000000}
                step={25000}
                value={population}
                onChange={(e) => setPopulation(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Target Market Penetration (SOM %)</span>
                <strong className="text-white font-mono-num">{penetrationPct.toFixed(1)}%</strong>
              </div>
              <input
                type="range"
                min={0.1}
                max={10.0}
                step={0.1}
                value={penetrationPct}
                onChange={(e) => setPenetrationPct(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Annual Spend / ARPU per Account ($)</span>
                <strong className="text-white font-mono-num">${arpuAnnual}/yr</strong>
              </div>
              <input
                type="range"
                min={60}
                max={2400}
                step={30}
                value={arpuAnnual}
                onChange={(e) => setArpuAnnual(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>
          </div>

          {/* Sizing Outputs */}
          <div className="md:col-span-5 bg-[#1C1C1C] rounded-[12px] border border-[#2E2E2E] p-4 flex flex-col justify-between space-y-3">
            <span className="text-[11px] font-bold text-[#A8A8A2] uppercase tracking-wider block">
              ESTIMATED MARKET SIZING
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A8A8A2]">TAM (100% Category):</span>
                <strong className="text-white font-mono-num text-sm">
                  ${calculatedTam.toFixed(1)}M
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A8A8A2]">SAM (25% Segment):</span>
                <strong className="text-[#FF9A45] font-mono-num text-sm">
                  ${calculatedSam.toFixed(1)}M
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[#2E2E2E]">
                <span className="text-white font-semibold">Year 1 SOM Target:</span>
                <strong className="text-[#4FA87B] font-mono-num text-base font-bold">
                  ${(calculatedSom * 1000).toFixed(0)}k/yr
                </strong>
              </div>
            </div>
            <p className="text-[10px] text-[#70706B] leading-tight">
              Top-down heuristic modeled from category penetration and annual pricing assumption.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'cac' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Customer Acquisition Cost (CAC)</span>
                <strong className="text-white font-mono-num">${cacValue}</strong>
              </div>
              <input
                type="range"
                min={5}
                max={300}
                step={5}
                value={cacValue}
                onChange={(e) => setCacValue(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Monthly ARPU ($)</span>
                <strong className="text-white font-mono-num">${arpuMonthly}/mo</strong>
              </div>
              <input
                type="range"
                min={5}
                max={200}
                step={5}
                value={arpuMonthly}
                onChange={(e) => setArpuMonthly(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Monthly Churn (%)</span>
                <strong className="text-white font-mono-num">{churnPct}%</strong>
              </div>
              <input
                type="range"
                min={1}
                max={20}
                step={0.5}
                value={churnPct}
                onChange={(e) => setChurnPct(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>
          </div>

          {/* Unit Economics Outputs */}
          <div className="md:col-span-5 bg-[#1C1C1C] rounded-[12px] border border-[#2E2E2E] p-4 flex flex-col justify-between space-y-3">
            <span className="text-[11px] font-bold text-[#A8A8A2] uppercase tracking-wider block">
              UNIT ECONOMICS HEALTH
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A8A8A2]">CAC Payback Period:</span>
                <strong className="text-white font-mono-num text-sm">{paybackMonths} months</strong>
              </div>
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A8A8A2]">Customer Lifetime Value (LTV):</span>
                <strong className="text-[#FF9A45] font-mono-num text-sm">
                  ${estimatedLtv.toFixed(0)}
                </strong>
              </div>
              <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[#2E2E2E]">
                <span className="text-white font-semibold">LTV : CAC Ratio:</span>
                <strong
                  className={`font-mono-num text-base font-bold ${
                    Number(ltvCacRatio) >= 3 ? 'text-[#4FA87B]' : 'text-[#FF9A45]'
                  }`}
                >
                  {ltvCacRatio}x {Number(ltvCacRatio) >= 3 ? '✓ (Healthy)' : '⚠️ (Watch Churn)'}
                </strong>
              </div>
            </div>
            <p className="text-[10px] text-[#70706B] leading-tight">
              A healthy venture aims for &lt; 12-month CAC payback and &gt; 3.0x LTV:CAC.
            </p>
          </div>
        </div>
      )}

      {activeTab === 'runway' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          {/* Controls */}
          <div className="md:col-span-7 space-y-4">
            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Current Cash Reserve in Bank ($)</span>
                <strong className="text-white font-mono-num">${cashBank.toLocaleString()}</strong>
              </div>
              <input
                type="range"
                min={5000}
                max={500000}
                step={5000}
                value={cashBank}
                onChange={(e) => setCashBank(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>

            <div>
              <div className="flex justify-between text-xs text-[#A8A8A2] mb-1.5">
                <span>Monthly Net Burn ($/mo)</span>
                <strong className="text-white font-mono-num">
                  ${monthlyBurn.toLocaleString()}/mo
                </strong>
              </div>
              <input
                type="range"
                min={1000}
                max={50000}
                step={500}
                value={monthlyBurn}
                onChange={(e) => setMonthlyBurn(Number(e.target.value))}
                className="w-full accent-[#FF7417] cursor-pointer"
              />
            </div>
          </div>

          {/* Runway Outputs */}
          <div className="md:col-span-5 bg-[#1C1C1C] rounded-[12px] border border-[#2E2E2E] p-4 flex flex-col justify-between space-y-3">
            <span className="text-[11px] font-bold text-[#A8A8A2] uppercase tracking-wider block">
              RUNWAY FORECAST
            </span>
            <div className="space-y-2">
              <div className="flex justify-between items-center text-xs">
                <span className="text-[#A8A8A2]">Zero-Cash Projection:</span>
                <strong
                  className={`font-mono-num text-lg font-bold ${
                    runwayMonths >= 12
                      ? 'text-[#4FA87B]'
                      : runwayMonths >= 6
                        ? 'text-[#FF9A45]'
                        : 'text-[#BC3E3E]'
                  }`}
                >
                  {runwayMonths} Months
                </strong>
              </div>
              <div className="text-xs text-[#A8A8A2]">
                Monthly Runway Buffer: ${monthlyBurn.toLocaleString()}
              </div>
            </div>
            <p className="text-[10px] text-[#70706B] leading-tight">
              Plan pre-order landing tests to extend runway with non-dilutive customer cash.
            </p>
          </div>
        </div>
      )}
    </div>
  );
};
