import React, { useState } from 'react';
import { motion, useReducedMotion } from 'motion/react';
import { Check, ShieldAlert, X } from 'lucide-react';
import { BW_EASE } from '../../motion/LiquidMotion';

export interface AgentActionApprovalProps {
  actionName: string;
  reason: string;
  creditsCost?: number;
  details?: Record<string, string | number | boolean>;
  onApprove: () => Promise<void> | void;
  onReject: () => Promise<void> | void;
  className?: string;
}

export const AgentActionApprovalCard: React.FC<AgentActionApprovalProps> = ({
  actionName,
  reason,
  creditsCost,
  details,
  onApprove,
  onReject,
  className = '',
}) => {
  const [status, setStatus] = useState<'pending' | 'approving' | 'approved' | 'rejected'>(
    'pending'
  );
  const reduced = useReducedMotion();

  const handleApprove = async () => {
    setStatus('approving');
    try {
      await onApprove();
      setStatus('approved');
    } catch {
      setStatus('pending');
    }
  };

  const handleReject = async () => {
    try {
      await onReject();
      setStatus('rejected');
    } catch {
      setStatus('pending');
    }
  };

  if (status === 'approved') {
    return (
      <motion.div
        initial={reduced ? undefined : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: BW_EASE }}
        className={`p-3 rounded-[12px] bg-[#F0FDF4] border border-[#BBF7D0] text-[#15803D] flex items-center justify-between text-xs ${className}`}
      >
        <div className="flex items-center gap-2">
          <Check className="w-4 h-4" />
          <span className="font-semibold">Action Approved & Queued for Execution</span>
        </div>
        <span className="font-mono text-[11px] text-[#16A34A]">{actionName}</span>
      </motion.div>
    );
  }

  if (status === 'rejected') {
    return (
      <motion.div
        initial={reduced ? undefined : { opacity: 0, scale: 0.98 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.18, ease: BW_EASE }}
        className={`p-3 rounded-[12px] bg-[#FEF2F2] border border-[#FECACA] text-[#B91C1C] flex items-center justify-between text-xs ${className}`}
      >
        <div className="flex items-center gap-2">
          <X className="w-4 h-4" />
          <span className="font-semibold">Action Declined by Executive</span>
        </div>
        <span className="font-mono text-[11px] text-[#DC2626]">{actionName}</span>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={reduced ? undefined : { opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, ease: BW_EASE }}
      className={`rounded-[14px] border border-[#FFD0B3] bg-[#FFF8F2] p-4 text-xs space-y-3 shadow-xs ${className}`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2.5">
          <div className="w-7 h-7 rounded-[8px] bg-[#FF7417] text-white flex items-center justify-center shrink-0 mt-0.5">
            <ShieldAlert className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-[#171717]">{actionName}</span>
              <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-[#FFE6D4] text-[#C44D00]">
                Requires Confirmation
              </span>
            </div>
            <p className="text-[#5C5C58] mt-0.5 leading-relaxed">{reason}</p>
          </div>
        </div>

        {creditsCost !== undefined && (
          <span className="px-2 py-1 rounded-[6px] bg-[#FFFFFF] border border-[#FFD0B3] font-mono-num font-semibold text-[#FF7417] text-[11px] shrink-0">
            {creditsCost} credits
          </span>
        )}
      </div>

      {details && Object.keys(details).length > 0 && (
        <div className="p-2.5 rounded-[8px] bg-[#FFFFFF] border border-[#FFE4D1] grid grid-cols-2 gap-2 text-[11px]">
          {Object.entries(details).map(([k, v]) => (
            <div key={k} className="truncate">
              <span className="text-[#858585] block text-[10px] uppercase font-semibold">{k}</span>
              <span className="font-mono text-[#252525] font-medium truncate block">
                {String(v)}
              </span>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-end gap-2 pt-1">
        <button
          type="button"
          onClick={handleReject}
          disabled={status === 'approving'}
          className="px-3 py-1.5 rounded-[8px] border border-[#E6E6E2] bg-white text-[#5C5C58] font-medium hover:bg-[#FAFAF9] hover:text-[#171717] transition-colors cursor-pointer disabled:opacity-50"
        >
          Decline
        </button>
        <motion.button
          type="button"
          whileTap={reduced ? undefined : { scale: 0.98 }}
          onClick={handleApprove}
          disabled={status === 'approving'}
          className="px-4 py-1.5 rounded-[8px] bg-[#FF7417] hover:bg-[#E55F08] text-white font-semibold flex items-center gap-1.5 shadow-sm transition-colors cursor-pointer disabled:opacity-50"
        >
          {status === 'approving' ? (
            <>
              <span className="w-3 h-3 rounded-full border-2 border-white border-t-transparent animate-spin" />
              <span>Verifying…</span>
            </>
          ) : (
            <>
              <Check className="w-3.5 h-3.5" />
              <span>Confirm & Execute</span>
            </>
          )}
        </motion.button>
      </div>
    </motion.div>
  );
};
