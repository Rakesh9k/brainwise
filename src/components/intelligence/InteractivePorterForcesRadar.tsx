import React, { useState } from 'react';
import { motion } from 'motion/react';
import { Shield, CheckCircle2 } from 'lucide-react';
import type { PorterForcesReport, PorterForceItem } from '../../types/brainwise';
import { typeClass } from '../../theme/typography';

interface InteractivePorterForcesRadarProps {
  forces: PorterForcesReport;
}

export const InteractivePorterForcesRadar: React.FC<InteractivePorterForcesRadarProps> = ({ forces }) => {
  const [selectedForceKey, setSelectedForceKey] = useState<
    'competitiveRivalry' | 'threatOfNewEntrants' | 'threatOfSubstitutes' | 'supplierPower' | 'buyerPower'
  >('competitiveRivalry');

  const forceItems: {
    key: 'competitiveRivalry' | 'threatOfNewEntrants' | 'threatOfSubstitutes' | 'supplierPower' | 'buyerPower';
    label: string;
    item: PorterForceItem;
    angleDeg: number; // For pentagon radar
  }[] = [
    { key: 'competitiveRivalry', label: 'Competitive Rivalry', item: forces.competitiveRivalry, angleDeg: -90 },
    { key: 'threatOfNewEntrants', label: 'New Entrants', item: forces.threatOfNewEntrants, angleDeg: -18 },
    { key: 'buyerPower', label: 'Buyer Power', item: forces.buyerPower, angleDeg: 54 },
    { key: 'supplierPower', label: 'Supplier Power', item: forces.supplierPower, angleDeg: 126 },
    { key: 'threatOfSubstitutes', label: 'Substitutes', item: forces.threatOfSubstitutes, angleDeg: 198 },
  ];

  const activeForce = forceItems.find((f) => f.key === selectedForceKey)?.item || forces.competitiveRivalry;

  // Radar geometry
  const size = 260;
  const center = size / 2;
  const radius = 95;

  const getCoordinates = (angleDeg: number, score: number, maxScore: number = 5) => {
    const angleRad = (angleDeg * Math.PI) / 180;
    const r = (score / maxScore) * radius;
    return {
      x: center + r * Math.cos(angleRad),
      y: center + r * Math.sin(angleRad),
    };
  };

  // Polygon path for current data
  const dataPoints = forceItems.map((f) => getCoordinates(f.angleDeg, f.item.score));
  const polygonPointsStr = dataPoints.map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`).join(' ');

  // Guide concentric pentagons (levels 2, 4, 5)
  const guideLevels = [1, 2, 3, 4, 5];

  const getTone = (intensity: 'Low' | 'Medium' | 'High') => {
    switch (intensity) {
      case 'Low':
        return { text: 'text-[#1E6543]', bg: 'bg-[#ECF7F1]', border: 'border-[#CDE5D7]' };
      case 'Medium':
        return { text: 'text-[#C44D00]', bg: 'bg-[#FFF3EB]', border: 'border-[#FED7AA]' };
      case 'High':
        return { text: 'text-[#B91C1C]', bg: 'bg-[#FEF2F2]', border: 'border-[#FECACA]' };
    }
  };

  return (
    <div className="rounded-[16px] border border-[#E6E6E2] bg-[#FFFFFF] p-5 sm:p-7 shadow-[0_2px_8px_rgba(0,0,0,0.03)] space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-[#E6E6E2]">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold tracking-wider uppercase bg-[#171717] text-white">
              INDUSTRY DEFENSE
            </span>
            <span className="text-xs text-[#686864] font-medium">Interactive Radar</span>
          </div>
          <h3 className={`${typeClass.h3} font-bold text-[#171717] mt-1`}>
            Porter's Five Forces Pressure Map
          </h3>
          <p className="text-xs text-[#686864]">
            Evaluates pricing leverage, substitution risk, and supplier dependency. Tap any force vertex to inspect defense.
          </p>
        </div>

        {/* Overall Threat Score Capsule */}
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-[10px] bg-[#F9F9F8] border border-[#E6E6E2] shrink-0">
          <Shield className="w-4 h-4 text-[#FF7417]" />
          <div className="text-xs font-semibold text-[#171717]">
            Industry Threat Score: <span className="font-mono-num font-bold">{forces.overallThreatScore}/100</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
        {/* Radar SVG Polygon Stage */}
        <div className="lg:col-span-6 flex flex-col items-center justify-center p-2">
          <div className="relative">
            <svg width={size} height={size} className="overflow-visible">
              {/* Background Concentric Pentagon Guides */}
              {guideLevels.map((lvl) => {
                const guidePts = forceItems
                  .map((f) => getCoordinates(f.angleDeg, lvl))
                  .map((p) => `${p.x.toFixed(1)},${p.y.toFixed(1)}`)
                  .join(' ');
                return (
                  <polygon
                    key={lvl}
                    points={guidePts}
                    fill={lvl === 5 ? '#FAF9F8' : 'none'}
                    stroke="#E6E6E2"
                    strokeWidth={lvl === 5 ? 1.5 : 1}
                    strokeDasharray={lvl < 5 ? '2,2' : undefined}
                  />
                );
              })}

              {/* Axis lines from center to outer points */}
              {forceItems.map((f) => {
                const outer = getCoordinates(f.angleDeg, 5);
                return (
                  <line
                    key={f.key}
                    x1={center}
                    y1={center}
                    x2={outer.x}
                    y2={outer.y}
                    stroke="#E6E6E2"
                    strokeWidth={1}
                  />
                );
              })}

              {/* Shaded Data Polygon */}
              <motion.polygon
                points={polygonPointsStr}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.5, ease: 'easeOut' }}
                fill="rgba(255, 116, 23, 0.22)"
                stroke="#FF7417"
                strokeWidth={2.5}
                strokeLinejoin="round"
              />

              {/* Interactive Node Markers */}
              {forceItems.map((f, idx) => {
                const pt = dataPoints[idx];
                const isSelected = selectedForceKey === f.key;
                const nodeColor = f.item.score >= 4 ? '#B91C1C' : f.item.score === 3 ? '#C44D00' : '#1E6543';

                return (
                  <g
                    key={f.key}
                    onClick={() => setSelectedForceKey(f.key)}
                    className="cursor-pointer"
                  >
                    <circle
                      cx={pt.x}
                      cy={pt.y}
                      r={isSelected ? 7 : 5}
                      fill={nodeColor}
                      stroke="#FFFFFF"
                      strokeWidth={2}
                      className="transition-all hover:scale-125"
                    />
                  </g>
                );
              })}
            </svg>
          </div>

          {/* Quick Pillar selector buttons */}
          <div className="flex flex-wrap justify-center gap-1.5 mt-4">
            {forceItems.map((f) => {
              const isSelected = selectedForceKey === f.key;
              const tone = getTone(f.item.intensity);
              return (
                <button
                  key={f.key}
                  type="button"
                  onClick={() => setSelectedForceKey(f.key)}
                  className={`px-2.5 py-1 rounded-[7px] text-[11px] font-semibold border transition-all cursor-pointer ${
                    isSelected
                      ? `${tone.bg} ${tone.text} ${tone.border} shadow-xs font-bold`
                      : 'bg-white text-[#686864] border-[#E6E6E2] hover:bg-[#F9F9F8]'
                  }`}
                >
                  {f.label} ({f.item.intensity})
                </button>
              );
            })}
          </div>
        </div>

        {/* Selected Force Detail & AI Defensive Playbook */}
        <div className="lg:col-span-6 space-y-4">
          <div className="p-4 rounded-[12px] bg-[#FAF9F8] border border-[#E6E6E2] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-[#171717]">
                {activeForce.name}
              </span>
              <span
                className={`text-xs font-mono-num font-bold px-2 py-0.5 rounded-full border ${
                  getTone(activeForce.intensity).bg
                } ${getTone(activeForce.intensity).text} ${getTone(activeForce.intensity).border}`}
              >
                {activeForce.intensity} Threat ({activeForce.score}/5)
              </span>
            </div>

            <p className="text-xs text-[#52524E] leading-relaxed">
              {activeForce.summary}
            </p>

            {/* AI Strategic Defense Box */}
            <div className="p-3 rounded-[9px] bg-white border border-[#E6E6E2] space-y-1">
              <div className="flex items-center gap-1.5 text-[10px] font-bold uppercase tracking-wider text-[#FF7417]">
                <Shield className="w-3.5 h-3.5 text-[#FF7417]" />
                <span>Strategic Defense Play</span>
              </div>
              <p className="text-xs text-[#171717] font-medium leading-relaxed">
                {activeForce.strategicDefense}
              </p>
            </div>
          </div>

          {/* Bottom Line Summary Capsule */}
          <div className="p-3.5 rounded-[10px] bg-[#F4F4F2] border border-[#E0E0DC] text-xs text-[#40403E] flex items-start gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#1E6543] shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-[#171717]">Industry Structure Verdict: </span>
              {forces.bottomLine}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
