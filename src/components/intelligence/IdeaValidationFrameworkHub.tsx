import React from 'react';
import {
  ArrowRight,
  Brain,
  Palette,
  Sparkles,
  Compass,
  Lock,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
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
  const { state, navigate } = useBrainWise();
  const isPaidPro =
    state.isExampleWorkspace ||
    state.subscription?.plan === 'Professional' ||
    state.subscription?.plan === 'Business Enterprise' ||
    state.subscription?.plan === 'Growth Pro' ||
    state.subscription?.plan === 'Venture Team' ||
    (state.subscription?.creditsRemaining ?? 0) > 150;

  // Derive full frameworks with intelligent fallbacks
  const swot = deriveSwotAnalysis(report);
  const forces = derivePorterForces(report);
  const pestle = derivePestleAnalysis(report);

  const renderGatedFramework = (
    title: string,
    description: string,
    children: React.ReactNode
  ) => {
    if (isPaidPro) return children;

    return (
      <div className="relative rounded-[20px] overflow-hidden border border-[#E6E6E2] bg-[#FAF9F8]">
        <div className="filter blur-sm opacity-35 select-none pointer-events-none p-4">
          {children}
        </div>
        <div className="absolute inset-0 flex items-center justify-center p-4 bg-[#FFFFFF]/85 backdrop-blur-xs">
          <div className="max-w-md w-full text-center p-6 sm:p-7 rounded-[20px] bg-white border-2 border-[#FF7417] shadow-[0_16px_40px_rgba(255,116,23,0.18)] space-y-3.5">
            <div className="w-11 h-11 rounded-full bg-[#FFF0E5] text-[#FF7417] mx-auto flex items-center justify-center shadow-2xs">
              <Lock className="w-5 h-5 text-[#FF7417]" />
            </div>
            <div className="space-y-1">
              <span className="px-2.5 py-0.5 rounded-full bg-[#FFF0E5] text-[#C44D00] text-[10px] font-mono font-bold uppercase tracking-wider">
                50% Free Preview · Pro Section
              </span>
              <h4 className="font-heading font-bold text-base text-[#171717]">
                Unlock {title}
              </h4>
              <p className="text-xs text-[#5C5C58] leading-relaxed">
                {description} Upgrade to Starter or Professional to unlock this framework, complete rival complaint teardowns, and executive slide exports.
              </p>
            </div>
            <button
              type="button"
              onClick={() => navigate('settings')}
              className="w-full py-2.5 px-4 rounded-full bg-[#FF7417] hover:bg-[#E55F08] text-white text-xs font-bold transition-all shadow-md cursor-pointer flex items-center justify-center gap-1.5"
            >
              <span>Upgrade to Starter / Pro to Unlock 100%</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-8">
      {/* 1. Validation Verdict Scorecard (Hero Decision & Score) - 100% Free Visible */}
      <div id="section-verdict" className="scroll-mt-24">
        <ValidationVerdictScorecard
          report={report}
          onCommitToBrain={onCommitToBrain}
          isCommitted={isCommitted}
          isDormantBrain={isDormantBrain}
        />
      </div>

      {/* 2. Go Signals vs. Stop Signals (Bull vs. Bear Matrix) - 100% Free Visible */}
      <div id="section-gostop" className="scroll-mt-24">
        <GoStopSignalsSection report={report} />
      </div>

      {/* 3. Interactive TAM / SAM / SOM Concentric Ring Visualizer - 100% Free Visible */}
      <div id="section-tamsamsom" className="scroll-mt-24">
        <InteractiveTamVisualizer report={report} dynamicBands={dynamicBands} />
      </div>

      {/* 4. Interactive SWOT Analysis Grid with AI Tactical Action Plays (Gated Pro) */}
      <div id="section-swot" className="scroll-mt-24">
        {renderGatedFramework(
          'SWOT Tactical Action Matrix',
          'Expose internal leverage vs external vulnerabilities with AI tactical plays.',
          <InteractiveSwotMatrix swot={swot} />
        )}
      </div>

      {/* 5. Interactive Porter's Five Forces Pressure Map (Gated Pro) */}
      <div id="section-porter" className="scroll-mt-24">
        {renderGatedFramework(
          "Porter's Five Forces Pressure Map",
          'Analyze buyer power, supplier concentration, and threat of substitutes.',
          <InteractivePorterForcesRadar forces={forces} />
        )}
      </div>

      {/* 6. Interactive PESTLE Macro-Environment Scan (Gated Pro) */}
      <div id="section-pestle" className="scroll-mt-24">
        {renderGatedFramework(
          'PESTLE Macro-Environment Scan',
          'Inspect political, economic, regulatory, and technological tailwinds.',
          <InteractivePestleRadar pestle={pestle} />
        )}
      </div>

      {/* 7. Kill Switches & Fatal Roadblock Stress Tests (Gated Pro) */}
      {report.criticalAssumptions && report.criticalAssumptions.length > 0 && (
        <div id="section-killswitches" className="scroll-mt-24">
          {renderGatedFramework(
            'Critical Assumptions & Kill Switches',
            'Fatal roadblock stress tests and pre-launch dealbreaker triggers.',
            <KillSwitchesSection assumptions={report.criticalAssumptions} />
          )}
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
