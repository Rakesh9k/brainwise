import React, { useState } from 'react';
import { CheckCircle2, CreditCard, Lock, ShieldCheck, X, Zap } from 'lucide-react';
import { typeClass } from '../../theme/typography';

interface CreditUnlockModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  itemTitle?: string;
  creditCost?: number;
  currentBalance?: number;
  onConfirmUnlock: (cost: number) => Promise<boolean> | boolean;
  onPurchasePack?: (packId: string) => void;
}

export const CreditUnlockModal: React.FC<CreditUnlockModalProps> = ({
  open,
  onClose,
  title = 'Unlock Full Competitor Teardown',
  itemTitle = 'Competitor Battlecard',
  creditCost = 25,
  currentBalance = 800,
  onConfirmUnlock,
  onPurchasePack,
}) => {
  const [selectedPack, setSelectedPack] = useState<'starter' | 'builder' | 'founder'>('builder');
  const [isUnlocking, setIsUnlocking] = useState(false);

  if (!open) return null;

  const hasSufficientCredits = currentBalance >= creditCost;

  const handleUnlockClick = async () => {
    setIsUnlocking(true);
    try {
      await onConfirmUnlock(creditCost);
      onClose();
    } finally {
      setIsUnlocking(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#171717]/60 backdrop-blur-xs"
      role="dialog"
      aria-modal="true"
    >
      <div className="relative w-full max-w-lg rounded-[20px] bg-[#FFFFFF] border border-[#E6E6E2] shadow-2xl p-6 sm:p-7 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute right-4 top-4 p-1.5 rounded-full text-[#858585] hover:bg-[#F5F5F4] hover:text-[#171717] transition-colors cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Header */}
        <div className="space-y-1.5 pr-8">
          <div className="flex items-center gap-2">
            <span className="p-1 rounded-[6px] bg-[#FFF3EB] text-[#FF7417]">
              <Lock className="w-4 h-4" />
            </span>
            <span className="text-[11px] font-bold text-[#FF7417] uppercase tracking-wider">
              DEEP INTELLIGENCE UNLOCK
            </span>
          </div>
          <h3 className={`${typeClass.h3} font-bold text-[#171717]`}>{title}</h3>
          <p className={`${typeClass.bodySm} text-[#686864]`}>
            The proprietary teardown for <strong>{itemTitle}</strong> opens instantly. The credits
            you use also cover every next step across all 14 BrainWise departments, and never
            expire.
          </p>
        </div>

        {/* Benefits List */}
        <div className="rounded-[12px] bg-[#FAFAF9] border border-[#E6E6E2] p-3.5 space-y-2 text-xs">
          <span className="text-[10px] font-bold text-[#858585] uppercase tracking-wider block">
            UNLOCKED IN THIS REPORT
          </span>
          <div className="flex items-center gap-2 text-[#242424]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6543] shrink-0" />
            <span>Real customer review complaints &amp; switching triggers</span>
          </div>
          <div className="flex items-center gap-2 text-[#242424]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6543] shrink-0" />
            <span>Complete price ladders, margin tiers &amp; discount structures</span>
          </div>
          <div className="flex items-center gap-2 text-[#242424]">
            <CheckCircle2 className="w-3.5 h-3.5 text-[#1E6543] shrink-0" />
            <span>Battlecard opportunity wedge &amp; white-space positioning angles</span>
          </div>
        </div>

        {/* Current Balance Bar */}
        <div className="flex items-center justify-between p-3 rounded-[10px] bg-[#F5F5F4] text-xs">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#FF7417]" />
            <span className="text-[#686864]">
              Required: <strong className="text-[#171717]">{creditCost} credits</strong>
            </span>
          </div>
          <div>
            <span className="text-[#686864]">Your balance: </span>
            <strong
              className={`font-mono-num font-semibold ${hasSufficientCredits ? 'text-[#1E6543]' : 'text-[#BC3E3E]'}`}
            >
              {currentBalance} credits
            </strong>
          </div>
        </div>

        {/* If sufficient credits, show Instant Unlock CTA */}
        {hasSufficientCredits ? (
          <div className="space-y-3 pt-2">
            <button
              type="button"
              onClick={handleUnlockClick}
              disabled={isUnlocking}
              className="w-full py-3 px-4 rounded-[12px] bg-[#171717] hover:bg-[#252525] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-sm cursor-pointer transition-colors"
            >
              <Zap className="w-4 h-4 text-[#FF7417]" />
              <span>
                {isUnlocking ? 'Unlocking…' : `Unlock Deep Teardown (${creditCost} Credits)`}
              </span>
            </button>
            <p className="text-center text-[11px] text-[#858585]">
              Atomic deduction via Two-Phase Credit Protocol (ADR-006).
            </p>
          </div>
        ) : (
          /* Credit Pack Options (Micro-purchase) */
          <div className="space-y-3 pt-1">
            <span className="text-xs font-semibold text-[#171717] block">
              Choose a Credit Pack to unlock and continue:
            </span>

            {/* Pack 1: Starter */}
            <div
              onClick={() => setSelectedPack('starter')}
              className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-colors ${
                selectedPack === 'starter'
                  ? 'border-[#FF7417] bg-[#FFFBF7]'
                  : 'border-[#E6E6E2] hover:border-[#D0D0CA]'
              }`}
            >
              <div>
                <div className="text-xs font-bold text-[#171717]">Starter Pack</div>
                <div className="text-[11px] text-[#686864]">
                  150 credits · 6 deep rival teardowns
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#171717]">$19</div>
                <div className="text-[10px] text-[#858585]">one-time</div>
              </div>
            </div>

            {/* Pack 2: Builder */}
            <div
              onClick={() => setSelectedPack('builder')}
              className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-colors relative ${
                selectedPack === 'builder'
                  ? 'border-[#FF7417] bg-[#FFFBF7]'
                  : 'border-[#E6E6E2] hover:border-[#D0D0CA]'
              }`}
            >
              <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#FF7417] text-white text-[9px] font-bold uppercase tracking-wider">
                Most Popular
              </span>
              <div>
                <div className="text-xs font-bold text-[#171717]">Builder Pack</div>
                <div className="text-[11px] text-[#686864]">1,400 credits · All 14 departments</div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#171717]">$49</div>
                <div className="text-[10px] text-[#858585]">one-time</div>
              </div>
            </div>

            {/* Pack 3: Founder */}
            <div
              onClick={() => setSelectedPack('founder')}
              className={`p-3 rounded-[12px] border cursor-pointer flex items-center justify-between transition-colors relative ${
                selectedPack === 'founder'
                  ? 'border-[#FF7417] bg-[#FFFBF7]'
                  : 'border-[#E6E6E2] hover:border-[#D0D0CA]'
              }`}
            >
              <span className="absolute -top-2.5 right-4 px-2 py-0.5 rounded-full bg-[#1E6543] text-white text-[9px] font-bold uppercase tracking-wider">
                Save 15%
              </span>
              <div>
                <div className="text-xs font-bold text-[#171717]">Founder Pro Pack</div>
                <div className="text-[11px] text-[#686864]">
                  4,500 credits · Complete venture growth
                </div>
              </div>
              <div className="text-right">
                <div className="text-sm font-bold text-[#171717]">$84.15</div>
                <div className="text-[10px] line-through text-[#858585]">$99</div>
              </div>
            </div>

            <button
              type="button"
              onClick={() => {
                if (onPurchasePack) onPurchasePack(selectedPack);
                handleUnlockClick();
              }}
              className="w-full mt-2 py-3 px-4 rounded-[12px] bg-[#FF7417] hover:bg-[#E55F08] text-white text-sm font-semibold flex items-center justify-center gap-2 shadow-[0_2px_4px_rgba(255,116,23,0.25)] cursor-pointer transition-colors"
            >
              <CreditCard className="w-4 h-4" />
              <span>Get Credits &amp; Unlock Teardown</span>
            </button>
          </div>
        )}

        {/* Free Developer / Admin bypass */}
        <div className="pt-2 border-t border-[#E6E6E2] flex items-center justify-between text-[11px] text-[#858585]">
          <span className="flex items-center gap-1">
            <ShieldCheck className="w-3.5 h-3.5 text-[#1E6543]" />
            <span>Stripe-secured · Credits never expire</span>
          </span>
          <button
            type="button"
            onClick={handleUnlockClick}
            className="text-[#686864] hover:text-[#171717] underline cursor-pointer"
          >
            Preview Unlock (Demo)
          </button>
        </div>
      </div>
    </div>
  );
};
