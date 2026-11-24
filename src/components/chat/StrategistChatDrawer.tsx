import React, { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Cpu,
  Globe,
  Loader2,
  RotateCcw,
  Send,
  Sparkles,
  ThumbsDown,
  ThumbsUp,
  X,
  Zap,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { apiClient } from '../../services/apiClient';
import { BW_EASE } from '../motion/LiquidMotion';
import { typeClass } from '../../theme/typography';
import {
  AgentStatusBadge,
  AgentReasoningDrawer,
  AgentToolExecutionCard,
  AgentActionApprovalCard,
  SlidingSegmentedControl,
} from '../animation';

export type ModelTier = 'fast' | 'search_grounded' | 'deep_reasoning';

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  content: string;
  timestamp: number;
  modelUsed?: string;
  citations?: Array<{
    title?: string;
    url?: string;
    sourceType?: string;
    factStatus?: string;
    isOutdated?: boolean;
    calculationMethod?: string;
    snippet?: string;
  }>;
  factStatusBreakdown?: Record<string, number>;
  conflictingInformation?: string[];
  missingInformation?: string[];
  suggestedFollowUps?: string[];
  toolCalls?: any[];
  feedback?: { rating: 'positive' | 'negative' };
  truthVerified?: boolean;
}

const TIER_CONFIG: Record<
  ModelTier,
  { label: string; modelName: string; credits: number; icon: React.FC<{ className?: string }> }
> = {
  fast: {
    label: 'Fast Briefing',
    modelName: 'Gemini 2.5 Flash',
    credits: 2,
    icon: Zap,
  },
  search_grounded: {
    label: 'Live Search',
    modelName: 'Flash + Google Search',
    credits: 5,
    icon: Globe,
  },
  deep_reasoning: {
    label: 'Deep Strategy',
    modelName: 'Gemini 2.5 Pro',
    credits: 8,
    icon: Cpu,
  },
};

export const StrategistChatDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
}> = ({ open, onClose }) => {
  const { state, sendChatToStrategist, showToast } = useBrainWise();
  const [modelTier, setModelTier] = useState<ModelTier>('fast');
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [isSending, setIsSending] = useState(false);
  const [threadId] = useState<string>(() => `thread-${Date.now()}`);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const reduced = useReducedMotion();

  const businessName =
    state.brain?.businessName ||
    (state.user?.firstName ? `${state.user.firstName}'s Venture` : 'Your Business');
  const industry = state.brain?.industry || 'Commerce';

  // Seed initial greeting on mount
  useEffect(() => {
    if (messages.length === 0) {
      setMessages([
        {
          id: 'msg-welcome',
          role: 'model',
          content: `Hello! I'm your **BrainWise AI Executive Strategist**, permanently grounded in **${businessName}**'s persistent Business Brain (${industry}). How can I assist your operational decisions today?`,
          timestamp: Date.now(),
          truthVerified: true,
        },
      ]);
    }
  }, [businessName, industry, messages.length]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (open) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, open]);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      const timer = window.setTimeout(() => {
        inputRef.current?.focus();
      }, 150);
      return () => window.clearTimeout(timer);
    }
  }, [open]);

  // Escape key closes drawer
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  const handleSend = async (customPrompt?: string) => {
    const textToSend = (customPrompt ?? input).trim();
    if (!textToSend || isSending) return;

    const userMsg: ChatMessage = {
      id: `msg-${Date.now()}-u`,
      role: 'user',
      content: textToSend,
      timestamp: Date.now(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!customPrompt) setInput('');
    setIsSending(true);

    // Format previous turns for multi-turn history
    const history = messages
      .filter((m) => m.id !== 'msg-welcome')
      .map((m) => ({
        role: m.role,
        parts: m.content,
      }));

    try {
      let reply = '';
      let modelUsed = TIER_CONFIG[modelTier].modelName;
      let citations: any[] = [];
      let factStatusBreakdown: any = undefined;
      let conflictingInformation: string[] | undefined = undefined;
      let missingInformation: string[] | undefined = undefined;
      let suggestedFollowUps: string[] | undefined = undefined;
      let toolCalls: any[] | undefined = undefined;

      if (state.activeWorkspaceId) {
        try {
          const askRes = await apiClient.askBusinessQuery(state.activeWorkspaceId, {
            query: textToSend,
            conversationId: threadId,
            modelTier,
          });
          reply = askRes.message.content;
          modelUsed = askRes.message.modelUsed || modelUsed;
          citations = askRes.message.citations || [];
          factStatusBreakdown = askRes.message.factStatusBreakdown;
          conflictingInformation = askRes.message.conflictingInformation;
          missingInformation = askRes.message.missingInformation;
          suggestedFollowUps = askRes.message.suggestedFollowUps;
          toolCalls = askRes.message.toolCalls;
        } catch {
          // Fallback to sendChatToStrategist
          const response = await sendChatToStrategist(textToSend, {
            threadId,
            modelTier,
            history,
          });
          reply = response.reply;
          modelUsed = response.modelUsed || modelUsed;
          citations = response.citations || [];
        }
      } else {
        const response = await sendChatToStrategist(textToSend, {
          threadId,
          modelTier,
          history,
        });
        reply = response.reply;
        modelUsed = response.modelUsed || modelUsed;
        citations = response.citations || [];
      }

      const modelMsg: ChatMessage = {
        id: `msg-${Date.now()}-m`,
        role: 'model',
        content: reply,
        timestamp: Date.now(),
        modelUsed,
        citations,
        factStatusBreakdown,
        conflictingInformation,
        missingInformation,
        suggestedFollowUps,
        toolCalls,
        truthVerified: true,
      };

      setMessages((prev) => [...prev, modelMsg]);
    } catch (err) {
      const errorMsg: ChatMessage = {
        id: `msg-${Date.now()}-err`,
        role: 'model',
        content: `Error: ${err instanceof Error ? err.message : 'Unable to complete strategy response.'}`,
        timestamp: Date.now(),
        truthVerified: false,
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsSending(false);
    }
  };

  const [copiedMsgId, setCopiedMsgId] = useState<string | null>(null);

  const handleCopy = (msgId: string, content: string) => {
    void navigator.clipboard.writeText(content);
    setCopiedMsgId(msgId);
    showToast('Answer copied to clipboard.');
    setTimeout(() => setCopiedMsgId(null), 2000);
  };

  const handleFeedback = async (msgId: string, rating: 'positive' | 'negative') => {
    setMessages((prev) => prev.map((m) => (m.id === msgId ? { ...m, feedback: { rating } } : m)));
    showToast(
      rating === 'positive'
        ? 'Thank you for your feedback!'
        : 'Feedback recorded for model improvement.'
    );
    if (state.activeWorkspaceId) {
      try {
        await apiClient.submitAskBusinessFeedback(state.activeWorkspaceId, threadId, msgId, {
          rating,
        });
      } catch {
        // non-blocking
      }
    }
  };

  const handleConfirmTool = async (tool: any) => {
    if (!state.activeWorkspaceId) return;
    try {
      await apiClient.executeAskBusinessTool(state.activeWorkspaceId, threadId, {
        toolId: tool.toolId,
        toolName: tool.toolName,
        parameters: tool.parameters,
        confirmed: true,
      });
      showToast(`Action "${tool.toolName}" confirmed and executed!`);
      setMessages((prev) =>
        prev.map((m) =>
          m.toolCalls
            ? {
                ...m,
                toolCalls: m.toolCalls.map((t) =>
                  t.toolId === tool.toolId ? { ...t, status: 'EXECUTED' } : t
                ),
              }
            : m
        )
      );
    } catch (err: any) {
      showToast(`Failed to execute tool: ${err.message || 'Error'}`);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      void handleSend();
    }
  };

  const handleResetThread = () => {
    setMessages([
      {
        id: `msg-welcome-${Date.now()}`,
        role: 'model',
        content: `New session started. Grounded in **${businessName}** (${industry}). What strategic challenge are we solving?`,
        timestamp: Date.now(),
        truthVerified: true,
      },
    ]);
    showToast('Strategist conversation reset.');
  };

  const quickPrompts = [
    `Evaluate competitive positioning against our tracked rivals`,
    `Suggest 3 high-impact marketing experiments for this quarter`,
    `Identify market opportunities using live industry search`,
  ];

  const renderContentFormatted = (text: string) => {
    const lines = text.split('\n');
    return lines.map((line, idx) => {
      // Bold rendering simple replacement
      const formattedLine = line.split(/(\*\*.*?\*\*)/g).map((part, pIdx) => {
        if (part.startsWith('**') && part.endsWith('**')) {
          return (
            <strong key={pIdx} className="font-semibold text-[#171717]">
              {part.slice(2, -2)}
            </strong>
          );
        }
        return part;
      });

      if (line.trim().startsWith('- ') || line.trim().startsWith('* ')) {
        return (
          <li key={idx} className="ml-4 list-disc text-sm text-[#252525] leading-relaxed my-0.5">
            {formattedLine}
          </li>
        );
      }

      if (line.trim() === '') {
        return <div key={idx} className="h-2" />;
      }

      return (
        <p key={idx} className="text-sm text-[#252525] leading-relaxed my-1">
          {formattedLine}
        </p>
      );
    });
  };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={reduced ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={reduced ? undefined : { opacity: 0 }}
          transition={{ duration: 0.18, ease: BW_EASE }}
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
          className="fixed inset-0 z-50 flex justify-end p-0 sm:p-3 bw-dialog-backdrop"
          role="dialog"
          aria-modal="true"
          aria-label="Executive AI Strategist Chat"
        >
          <motion.div
            initial={reduced ? false : { x: 460, opacity: 0.6 }}
            animate={{ x: 0, opacity: 1 }}
            exit={reduced ? undefined : { x: 460, opacity: 0.6 }}
            transition={{ duration: 0.24, ease: BW_EASE }}
            className="w-full max-w-lg h-full bw-dialog-ceramic bw-surface-elevated sm:rounded-[24px] overflow-hidden flex flex-col shadow-2xl"
          >
            {/* Header */}
            <div className="flex items-start justify-between gap-4 px-6 py-4 border-b border-[#EFEFEB] bg-[#FFFFFF]/80 backdrop-blur-md shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-[10px] bg-[#171717] text-white flex items-center justify-center shadow-sm">
                  <Bot className="w-5 h-5 text-[#FF7417]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h3 className={`${typeClass.h4} text-[#171717]`}>Executive AI Strategist</h3>
                    <AgentStatusBadge state={isSending ? 'thinking' : 'truth_verified'} size="sm" />
                  </div>
                  <p className="text-xs text-[#686864] flex items-center gap-1.5 mt-0.5">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#16A34A]" />
                    Grounded in <strong className="text-[#252525]">{businessName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={handleResetThread}
                  aria-label="Reset conversation"
                  title="Reset conversation"
                  className="p-2 rounded-full text-[#686864] hover:text-[#171717] hover:bg-[#F5F5F4] transition-colors cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={onClose}
                  aria-label="Close strategist chat"
                  className="p-2 rounded-full text-[#686864] hover:text-[#171717] hover:bg-[#F5F5F4] transition-colors cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* Model Tier Selector */}
            <div className="px-6 py-2.5 bg-[#FAFAF9] border-b border-[#EFEFEB] flex items-center justify-between gap-2 shrink-0">
              <span className="text-[11px] font-semibold text-[#686864] uppercase tracking-wider">
                Reasoning Mode:
              </span>
              <SlidingSegmentedControl
                options={(Object.keys(TIER_CONFIG) as ModelTier[]).map((tierKey) => {
                  const conf = TIER_CONFIG[tierKey];
                  return {
                    id: tierKey,
                    label: conf.label,
                    badge: `${conf.credits}c`,
                    icon: conf.icon,
                  };
                })}
                activeId={modelTier}
                onChange={(id) => setModelTier(id as ModelTier)}
                size="sm"
                layoutId="strategist-model-tier-pill"
              />
            </div>

            {/* Message Thread */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {messages.map((msg) => {
                const isUser = msg.role === 'user';
                return (
                  <div
                    key={msg.id}
                    className={`flex flex-col ${isUser ? 'items-end' : 'items-start'}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-[16px] px-4 py-3 text-sm ${
                        isUser
                          ? 'bg-[#171717] text-white shadow-sm'
                          : 'bg-[#FFFFFF] border border-[#E6E6E2] text-[#252525] shadow-xs'
                      }`}
                    >
                      {isUser ? (
                        <p className="whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                      ) : (
                        <div>
                          {msg.factStatusBreakdown && (
                            <div className="flex flex-wrap gap-1 mb-2">
                              {msg.factStatusBreakdown.VERIFIED_FACT > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                  {msg.factStatusBreakdown.VERIFIED_FACT} Verified Fact
                                </span>
                              )}
                              {msg.factStatusBreakdown.CALCULATED_VALUE > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200">
                                  {msg.factStatusBreakdown.CALCULATED_VALUE} Calculated
                                </span>
                              )}
                              {msg.factStatusBreakdown.HISTORICAL_INFO > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-50 text-purple-700 border border-purple-200">
                                  {msg.factStatusBreakdown.HISTORICAL_INFO} Historical
                                </span>
                              )}
                              {msg.factStatusBreakdown.AI_INFERRED > 0 && (
                                <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                                  {msg.factStatusBreakdown.AI_INFERRED} AI Inferred
                                </span>
                              )}
                            </div>
                          )}

                          {renderContentFormatted(msg.content)}

                          {/* Grounding Citations */}
                          {msg.citations && msg.citations.length > 0 && (
                            <div className="mt-3 pt-2.5 border-t border-[#EFEFEB]">
                              <p className="text-[11px] font-semibold text-[#5C5C58] flex items-center gap-1 mb-1.5">
                                <Globe className="w-3 h-3 text-[#2563EB]" />
                                Grounded Evidence & Sources:
                              </p>
                              <div className="flex flex-wrap gap-1.5">
                                {msg.citations.map((cite: any, cIdx) => (
                                  <span
                                    key={cIdx}
                                    className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                                      cite.isOutdated
                                        ? 'bg-[#FFFBEB] text-[#B45309] border-[#FDE68A]'
                                        : 'bg-[#F0F5FF] text-[#1D4ED8] border-[#BFDBFE]'
                                    }`}
                                    title={cite.snippet || cite.title}
                                  >
                                    {cite.isOutdated && (
                                      <Clock className="w-2.5 h-2.5 text-[#B45309]" />
                                    )}
                                    <span className="max-w-[200px] truncate">
                                      {cite.title || cite.url}
                                    </span>
                                    {cite.factStatus && (
                                      <span className="text-[9px] opacity-75 font-mono">
                                        [{cite.factStatus}]
                                      </span>
                                    )}
                                  </span>
                                ))}
                              </div>
                            </div>
                          )}

                          {/* Consequential Tool Actions & Tool Traces */}
                          {msg.toolCalls && msg.toolCalls.length > 0 && (
                            <div className="mt-3 space-y-2">
                              {msg.toolCalls.map((tool: any, tIdx: number) => {
                                if (tool.requiresApproval && tool.status !== 'EXECUTED') {
                                  return (
                                    <AgentActionApprovalCard
                                      key={tIdx}
                                      actionName={tool.toolName || 'Executive Action'}
                                      reason={tool.approvalReason || 'Requires confirmation'}
                                      creditsCost={tool.creditsCost}
                                      details={tool.parameters}
                                      onApprove={() => void handleConfirmTool(tool)}
                                      onReject={() => {
                                        tool.status = 'REJECTED';
                                        showToast('Action declined.');
                                      }}
                                    />
                                  );
                                }
                                return (
                                  <AgentToolExecutionCard
                                    key={tIdx}
                                    toolName={tool.toolName || 'Tool Call'}
                                    category={
                                      tool.toolName?.includes('search')
                                        ? 'search'
                                        : tool.toolName?.includes('truth')
                                          ? 'truth'
                                          : 'general'
                                    }
                                    status={
                                      tool.status === 'EXECUTED'
                                        ? 'success'
                                        : tool.status === 'FAILED'
                                          ? 'failed'
                                          : 'executing'
                                    }
                                    args={tool.parameters}
                                    result={tool.result}
                                    durationMs={tool.durationMs}
                                  />
                                );
                              })}
                            </div>
                          )}

                          {/* Provenance & Action Footer */}
                          <div className="mt-2.5 pt-2 border-t border-[#F5F5F4] flex items-center justify-between text-[10px] text-[#858585]">
                            <div className="flex items-center gap-2">
                              <span className="flex items-center gap-1 text-[#16A34A] font-medium">
                                <CheckCircle2 className="w-3 h-3" />
                                Truth Checked
                              </span>
                              {msg.modelUsed && (
                                <span className="font-mono text-[#858585]">{msg.modelUsed}</span>
                              )}
                            </div>
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => handleCopy(msg.id, msg.content)}
                                className="p-1 rounded hover:bg-[#F5F5F4] text-[#686864] hover:text-[#171717] cursor-pointer"
                                title="Copy answer"
                              >
                                {copiedMsgId === msg.id ? (
                                  <Check className="w-3 h-3 text-[#16A34A]" />
                                ) : (
                                  <Copy className="w-3 h-3" />
                                )}
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleFeedback(msg.id, 'positive')}
                                className={`p-1 rounded hover:bg-[#F5F5F4] cursor-pointer ${msg.feedback?.rating === 'positive' ? 'text-[#16A34A]' : 'text-[#686864] hover:text-[#171717]'}`}
                                title="Helpful"
                              >
                                <ThumbsUp className="w-3 h-3" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void handleFeedback(msg.id, 'negative')}
                                className={`p-1 rounded hover:bg-[#F5F5F4] cursor-pointer ${msg.feedback?.rating === 'negative' ? 'text-[#DC2626]' : 'text-[#686864] hover:text-[#171717]'}`}
                                title="Not helpful"
                              >
                                <ThumbsDown className="w-3 h-3" />
                              </button>
                            </div>
                          </div>

                          {/* Contextual Follow-Up Suggestions */}
                          {msg.suggestedFollowUps && msg.suggestedFollowUps.length > 0 && (
                            <div className="mt-2.5 pt-2 border-t border-[#F5F5F4] flex flex-wrap gap-1.5">
                              {msg.suggestedFollowUps.map((sug, sIdx) => (
                                <button
                                  key={sIdx}
                                  type="button"
                                  disabled={isSending}
                                  onClick={() => void handleSend(sug)}
                                  className="text-[11px] px-2.5 py-1 rounded-full bg-[#FAFAF9] hover:bg-[#F5F5F4] border border-[#E6E6E2] text-[#5C5C58] hover:text-[#171717] transition-all cursor-pointer text-left"
                                >
                                  💬 {sug}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}

              {isSending && (
                <div className="flex flex-col items-start w-full max-w-[85%]">
                  <div className="rounded-[16px] p-4 bg-[#FFFFFF] border border-[#E6E6E2] shadow-xs w-full space-y-3">
                    <AgentStatusBadge
                      state="thinking"
                      label={`Synthesizing brief with ${TIER_CONFIG[modelTier].modelName}…`}
                      size="sm"
                    />
                    <AgentReasoningDrawer
                      isStreaming={true}
                      modelTierName={TIER_CONFIG[modelTier].modelName}
                      reasoningText={`Grounded in ${businessName} (${industry}).\nDecomposing strategic query and verifying against persistent Business Brain.\nRunning deterministic Truth Check & Anti-Fatigue guardrails.`}
                      defaultExpanded={modelTier === 'deep_reasoning'}
                    />
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* Quick Prompts Suggestions */}
            {messages.length <= 2 && (
              <div className="px-6 py-2 bg-[#FAFAF9] border-t border-[#EFEFEB] shrink-0">
                <p className="text-[11px] font-semibold text-[#686864] mb-1.5">
                  Suggested Strategic Queries:
                </p>
                <div className="flex flex-col gap-1.5">
                  {quickPrompts.map((qp, idx) => (
                    <button
                      key={idx}
                      type="button"
                      disabled={isSending}
                      onClick={() => void handleSend(qp)}
                      className="text-left text-xs text-[#252525] hover:text-[#C44D00] bg-[#FFFFFF] hover:bg-[#FFF6EF] border border-[#E6E6E2] hover:border-[#FFD0B3] rounded-lg px-3 py-1.5 flex items-center justify-between gap-2 transition-all cursor-pointer"
                    >
                      <span className="truncate">{qp}</span>
                      <ArrowRight className="w-3 h-3 shrink-0 text-[#858585]" />
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Input Bar */}
            <div className="p-4 bg-[#FFFFFF] border-t border-[#EFEFEB] shrink-0">
              <div className="relative flex items-end gap-2 bg-[#FAFAF9] border border-[#E6E6E2] rounded-[14px] p-2 focus-within:border-[#C44D00] focus-within:bg-[#FFFFFF] transition-all">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder={`Ask Strategist about ${businessName}… (Enter to send, Shift+Enter for new line)`}
                  rows={2}
                  disabled={isSending}
                  className="w-full text-sm bg-transparent resize-none outline-none text-[#171717] placeholder-[#858585] py-1 px-1.5 leading-relaxed"
                />
                <button
                  type="button"
                  disabled={!input.trim() || isSending}
                  onClick={() => void handleSend()}
                  aria-label="Send message"
                  className="w-9 h-9 rounded-[10px] bg-[#171717] hover:bg-[#2A2A2A] disabled:opacity-40 disabled:cursor-not-allowed text-white flex items-center justify-center shrink-0 transition-colors cursor-pointer"
                >
                  {isSending ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4 text-[#FF7417]" />
                  )}
                </button>
              </div>

              {/* Guardrail Directive Banner */}
              <div className="mt-2 flex items-center justify-between text-[11px] text-[#858585]">
                <span className="flex items-center gap-1">
                  <Sparkles className="w-3 h-3 text-[#FF7417]" />
                  Deterministic Truth Engine & Grounded Fact Checking
                </span>
                <span className="text-[10px] text-[#A3A3A0]">Zero AI video collateral</span>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
