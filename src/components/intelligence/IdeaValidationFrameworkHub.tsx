import React from 'react';
import {
  ArrowRight,
  Brain,
  Palette,
  Sparkles,
  Compass,
} from 'lucide-react';
import type { ResearchReport } from '../../types/brainwise';
import {
  deriveSwotAnalysis,
  derivePorterForces,
  derivePestleAnalysis,
} from '../../utils/logic';
import { ValidationVerdictScorecard } from './ValidationVerdictScorecard';
import { GoStopSignalsSection } from './GoStopSignalsSection';
import { InteractiveTamVisualizer } from './InteractiveTamVisualizer';
import { InteractiveSwotMatrix } from './InteractiveSwotMatrix';
import { InteractivePorterForcesRadar } from './InteractivePorterForcesRadar';
import { InteractivePestleRadar } from './InteractivePestleRadar';
import { KillSwitchesSection } from './KillSwitchesSection';
import { TactilePillButton } from '../animation';

interface IdeaValidationFrameworkHubProps {
  report: ResearchReport;
  onCommitToBrain: () => void;
  isCommitted: boolean;
  isDormantBrain?: boolean;
  onNavigateBrandStudio: () => void;
  onNavigateGrowthDirector: () => void;
  dynamicBands?: {
    tamBand: string;
    samBand: string;
    somBand: string;
    somMidpointMillion: number;
  };
}

export const IdeaValidationFrameworkHub: React.FC<IdeaValidationFrameworkHubProps> = ({
  report,
  onCommitToBrain,
  isCommitted,
  isDormantBrain = false,
  onNavigateBrandStudio,
  onNavigateGrowthDirector,
  dynamicBands,
}) => {
  // Derive full frameworks with intelligent fallbacks
  const swot = deriveSwotAnalysis(report);
  const forces = derivePorterForces(report);
  const pestle = derivePestleAnalysis(report);

  return (
    <div className="space-y-8">
      {/* 1. Validation Verdict Scorecard (Hero Decision & Score) */}
      <div id="section-verdict" className="scroll-mt-24">
        <ValidationVerdictScorecard
          report={report}
          onCommitToBrain={onCommitToBrain}
          isCommitted={isCommitted}
          isDormantBrain={isDormantBrain}
        />
      </div>

      {/* 2. Go Signals vs. Stop Signals (Bull vs. Bear Matrix) */}
      <div id="section-gostop" className="scroll-mt-24">
        <GoStopSignalsSection report={report} />
      </div>

      {/* 3. Interactive TAM / SAM / SOM Concentric Ring Visualizer */}
      <div id="section-tamsamsom" className="scroll-mt-24">
        <InteractiveTamVisualizer report={report} dynamicBands={dynamicBands} />
      </div>

      {/* 4. Interactive SWOT Analysis Grid with AI Tactical Action Plays */}
      <div id="section-swot" className="scroll-mt-24">
        <InteractiveSwotMatrix swot={swot} />
      </div>

      {/* 5. Interactive Porter's Five Forces Pressure Map */}
      <div id="section-porter" className="scroll-mt-24">
        <InteractivePorterForcesRadar forces={forces} />
      </div>

      {/* 6. Interactive PESTLE Macro-Environment Scan */}
      <div id="section-pestle" className="scroll-mt-24">
        <InteractivePestleRadar pestle={pestle} />
      </div>

      {/* 7. Kill Switches & Fatal Roadblock Stress Tests */}
      {report.criticalAssumptions && report.criticalAssumptions.length > 0 && (
        <div id="section-killswitches" className="scroll-mt-24">
          <KillSwitchesSection assumptions={report.criticalAssumptions} />
        </div>
      )}

      {/* 8. The "1-Click Launch Action Footer" */}
      <div className="rounded-[16px] border border-[#171717] bg-[#171717] text-white p-6 sm:p-8 shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-6">
        <div className="space-y-1.5 max-w-xl">
          <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-[#FF7417]">
            <Sparkles className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>Validation Verified</span>
          </div>
          <h3 className="text-xl font-bold tracking-tight text-white">
            Ready to turn this validation into your company?
          </h3>
          <p className="text-xs text-[#A0A09C] leading-relaxed">
            Lock this ground truth into your Business Brain. We will seed your Brand Studio with matching colors and generate your Day 1–30 growth roadmap.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <TactilePillButton
            variant={isCommitted ? 'secondary' : 'primary'}
            onClick={onCommitToBrain}
            ariaLabel="Save verified facts to Business Brain"
            className="flex items-center gap-2 px-4 py-2 text-xs font-bold"
          >
            <Brain className="w-4 h-4" />
            <span>{isCommitted ? 'Saved to Business Brain ✓' : 'Save to Business Brain'}</span>
          </TactilePillButton>

          <button
            type="button"
            onClick={onNavigateBrandStudio}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#2A2A2A] text-white hover:bg-[#333333] border border-[#444444] text-xs font-bold transition-colors cursor-pointer"
          >
            <Palette className="w-3.5 h-3.5 text-[#FF7417]" />
            <span>Open Brand Studio</span>
          </button>

          <button
            type="button"
            onClick={onNavigateGrowthDirector}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-[#FF7417] text-white hover:bg-[#E05300] text-xs font-bold transition-colors cursor-pointer shadow-md"
          >
            <Compass className="w-3.5 h-3.5" />
            <span>Generate 30-Day Launch Plan</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
