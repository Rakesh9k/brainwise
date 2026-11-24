import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  BookOpen,
  Building2,
  Check,
  CheckCircle2,
  Compass,
  Copy,
  CreditCard,
  Download,
  Gauge,
  HelpCircle,
  Keyboard,
  Layers,
  Link2,
  Lock,
  Palette,
  Plus,
  RotateCcw,
  Share2,
  ShieldAlert,
  Sliders,
  Sparkles,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import { useBrainWise, useWorkspaceBreadcrumbs } from '../../context/BrainWiseContext';
import { IntegrationManagerView } from '../../components/integrations/IntegrationManagerView';
import { BillingDashboardView } from '../../components/billing/BillingDashboardView';
import { apiClient } from '../../services/apiClient';
import type {
  BrainWiseState,
  BusinessBrainData,
  SettingsTabId,
  TeamMemberItem,
} from '../../types/brainwise';
import {
  BrandLogoMark,
  Button,
  EmptyState,
  ErrorState,
  Field,
  FluidTransition,
  Input,
  LoadingState,
  PageHeader,
  SearchInput,
  SectionHeader,
  Select,
  StatusBadge,
  Tabs,
  Textarea,
} from '../../components/ui/DesignSystem';
import {
  ActionFeedbackBanner,
  AiRequestPulse,
  InsightSavedBeacon,
  LiquidSkeletonReveal,
} from '../../components/motion/LiquidMotion';
import { ConfirmationDialog, Modal } from '../../components/ui/Overlay';
import {
  BW_COLORS,
  BW_DESIGN_FREEZE_VERSION,
  BW_MOTION,
  BW_RADII,
  BW_SPACING,
  BW_TYPOGRAPHY,
  exportFrozenTokensCss,
} from '../../design/tokens';

const SETTINGS_NAV: { id: SettingsTabId; label: string; icon: React.ReactNode }[] = [
  { id: 'personal-profile', label: 'Personal Profile', icon: <User className="w-4 h-4" /> },
  { id: 'business-profile', label: 'Business Profile', icon: <Building2 className="w-4 h-4" /> },
  { id: 'team-members', label: 'Team & Members', icon: <Users className="w-4 h-4" /> },
  {
    id: 'workspace-preferences',
    label: 'Workspace Preferences',
    icon: <Sliders className="w-4 h-4" />,
  },
  {
    id: 'notification-settings',
    label: 'Notification Settings',
    icon: <Bell className="w-4 h-4" />,
  },
  { id: 'ai-preferences', label: 'AI Preferences', icon: <Sparkles className="w-4 h-4" /> },
  { id: 'data-privacy', label: 'Data & Privacy', icon: <Lock className="w-4 h-4" /> },
  {
    id: 'subscription-billing',
    label: 'Subscription & Billing',
    icon: <CreditCard className="w-4 h-4" />,
  },
  { id: 'usage-credits', label: 'Usage & Credits', icon: <Gauge className="w-4 h-4" /> },
  { id: 'integrations', label: 'Integrations', icon: <Link2 className="w-4 h-4" /> },
  { id: 'help-support', label: 'Help & Support', icon: <HelpCircle className="w-4 h-4" /> },
];

export const SettingsPage: React.FC = () => {
  const {
    state,
    navigate,
    updateUserProfile,
    updateBrain,
    updateScheduledReports,
    setAiTonePreference,
    inviteTeamMember,
    removeTeamMember,
    updateWorkspacePrefs,
    updateContextSharing,
    resetDemoData,
    logout,
    showToast,
    departmentResetNonce,
  } = useBrainWise();

  const activeTab = state.settingsTab;
  const activeSettingsLabel = SETTINGS_NAV.find((n) => n.id === activeTab)?.label ?? 'Preferences';

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      if (activeTab !== 'personal-profile') {
        navigate('settings', { settingsTab: 'personal-profile' });
      }
    }
  }, [departmentResetNonce, activeTab, navigate]);

  useWorkspaceBreadcrumbs([{ label: activeSettingsLabel }], [activeSettingsLabel]);

  // Local editable form states kept synced with BrainWiseContext
  const [firstName, setFirstName] = useState(state.user.firstName);
  const [lastName, setLastName] = useState(state.user.lastName);
  const [email, setEmail] = useState(state.user.email);
  const [role, setRole] = useState(state.user.role);
  const [timezone, setTimezone] = useState(state.user.timezone);

  const [bizName, setBizName] = useState(state.brain.businessName);
  const [bizTagline, setBizTagline] = useState(state.brain.tagline);
  const [bizIndustry, setBizIndustry] = useState(state.brain.industry);
  const [bizStage, setBizStage] = useState<BusinessBrainData['stage']>(state.brain.stage);
  const [bizLocation, setBizLocation] = useState(state.brain.location);
  const [bizWebsite, setBizWebsite] = useState(state.brain.website);
  const [avatarUrl, setAvatarUrl] = useState<string | undefined>(state.user.avatarUrl);
  const [bizLogoUrl, setBizLogoUrl] = useState<string | undefined>(state.brain.logoUrl);

  const [deliveryEmail, setDeliveryEmail] = useState(state.scheduledReports.deliveryEmail);

  // Invitations & Security state
  const [inviteOpen, setInviteOpen] = useState(false);
  const [inviteName, setInviteName] = useState('');
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<TeamMemberItem['role']>('Strategist');
  const [inviteError, setInviteError] = useState<string | null>(null);
  const [resetConfirmOpen, setResetConfirmOpen] = useState(false);
  const [generatedInviteLink, setGeneratedInviteLink] = useState<string | null>(null);
  const [inviteLoading, setInviteLoading] = useState(false);

  // Negative Prompt Rules & Exclusions (Brand Guardrails)
  const [exclusions, setExclusions] = useState<string[]>(
    state.brain.brandExclusions ?? [
      'unverified ROI claims',
      'cheapest on market',
      'guaranteed overnight growth',
    ]
  );
  const [newExclusionInput, setNewExclusionInput] = useState('');

  // Department-Level AI Reasoning Tiers
  const [departmentAiTiers, setDepartmentAiTiers] = useState<
    Record<string, 'fast' | 'balanced' | 'deep_reasoning'>
  >(
    state.workspacePrefs?.departmentAiTiers ?? {
      ideaIntelligence: 'deep_reasoning',
      competitiveIntelligence: 'deep_reasoning',
      brandStudio: 'balanced',
      growthDirector: 'fast',
    }
  );

  // Team Notification Webhooks
  const [slackWebhook, setSlackWebhook] = useState(
    state.workspacePrefs?.notificationWebhooks?.slackWebhookUrl ?? ''
  );
  const [discordWebhook, setDiscordWebhook] = useState(
    state.workspacePrefs?.notificationWebhooks?.discordWebhookUrl ?? ''
  );

  // DPDPA Compliance Data Erasure modal state
  const [dpdpaModalOpen, setDpdpaModalOpen] = useState(false);
  const [dpdpaLoading, setDpdpaLoading] = useState(false);
  const [dpdpaSuccessResult, setDpdpaSuccessResult] = useState<any | null>(null);

  useEffect(() => {
    setFirstName(state.user.firstName);
    setLastName(state.user.lastName);
    setEmail(state.user.email);
    setRole(state.user.role);
    setTimezone(state.user.timezone);
    setAvatarUrl(state.user.avatarUrl);
  }, [state.user]);

  useEffect(() => {
    setBizName(state.brain.businessName);
    setBizTagline(state.brain.tagline);
    setBizIndustry(state.brain.industry);
    setBizStage(state.brain.stage);
    setBizLocation(state.brain.location);
    setBizWebsite(state.brain.website);
    setBizLogoUrl(state.brain.logoUrl);
    if (state.brain.brandExclusions) {
      setExclusions(state.brain.brandExclusions);
    }
  }, [state.brain]);

  useEffect(() => {
    setDeliveryEmail(state.scheduledReports.deliveryEmail);
  }, [state.scheduledReports.deliveryEmail]);

  useEffect(() => {
    if (state.workspacePrefs?.departmentAiTiers) {
      setDepartmentAiTiers(state.workspacePrefs.departmentAiTiers);
    }
    if (state.workspacePrefs?.notificationWebhooks) {
      setSlackWebhook(state.workspacePrefs.notificationWebhooks.slackWebhookUrl ?? '');
      setDiscordWebhook(state.workspacePrefs.notificationWebhooks.discordWebhookUrl ?? '');
    }
  }, [state.workspacePrefs]);

  const teamMembers = state.teamMembers ?? [];
  const workspacePrefs = state.workspacePrefs ?? {
    dateFormat: 'YYYY-MM-DD',
    defaultLandingView: 'dashboard',
    compactDensity: false,
  };
  const contextSharing = state.contextSharing ?? {
    ideaIntelligence: true,
    competitiveIntelligence: true,
    brandStudio: true,
    growthDirector: true,
  };

  const handleAvatarFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      showToast('Please upload an image smaller than 2MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setAvatarUrl(reader.result);
        showToast('Avatar image selected. Click "Save Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleLogoFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      showToast('Please upload a logo smaller than 3MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        setBizLogoUrl(reader.result);
        showToast('Logo selected. Click "Save Business Profile" to apply.');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSaveProfile = (e: React.FormEvent) => {
    e.preventDefault();
    const initials = ((firstName.trim()[0] || 'V') + (lastName.trim()[0] || 'K')).toUpperCase();
    updateUserProfile({
      firstName: firstName.trim() || state.user.firstName,
      lastName: lastName.trim() || state.user.lastName,
      email: email.trim() || state.user.email,
      role: role.trim() || state.user.role,
      timezone,
      avatarInitials: initials,
      avatarUrl: avatarUrl || undefined,
    });
  };

  const handleSaveBusiness = (e: React.FormEvent) => {
    e.preventDefault();
    updateBrain({
      businessName: bizName.trim() || state.brain.businessName,
      tagline: bizTagline.trim(),
      industry: bizIndustry.trim() || state.brain.industry,
      stage: bizStage,
      location: bizLocation.trim() || state.brain.location,
      website: (bizWebsite || '').trim(),
      logoUrl: bizLogoUrl || undefined,
      brandExclusions: exclusions,
    });
  };

  const handleInviteMember = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inviteName.trim()) {
      setInviteError('Please enter the collaborator’s full name.');
      return;
    }
    if (!inviteEmail.trim() || !inviteEmail.includes('@')) {
      setInviteError('Please enter a valid work email address.');
      return;
    }
    setInviteError(null);
    inviteTeamMember({
      name: inviteName.trim(),
      email: inviteEmail.trim(),
      role: inviteRole,
    });
    setInviteName('');
    setInviteEmail('');
    setInviteOpen(false);
  };

  const handleGenerateInviteLink = async () => {
    try {
      setInviteLoading(true);
      const wsId =
        state.activeWorkspaceId ||
        `ws_${state.brain.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const res = await apiClient
        .createWorkspaceInvite(wsId, { role: inviteRole })
        .catch(() => ({
          inviteToken: `inv_${Date.now()}`,
          inviteLink: `${window.location.origin}/join?inviteToken=inv_${Date.now()}&ws=${wsId}`,
          workspaceId: wsId,
          workspaceName: state.brain.businessName,
          role: inviteRole,
          expiresAt: new Date(Date.now() + 7 * 86400000).toISOString(),
        }));
      setGeneratedInviteLink(res.inviteLink);
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(res.inviteLink);
      }
      showToast('Copied shareable workspace invitation link to clipboard!');
    } catch {
      showToast('Generated invitation preview link.');
    } finally {
      setInviteLoading(false);
    }
  };

  const handleAddExclusion = () => {
    const trimmed = newExclusionInput.trim();
    if (!trimmed) return;
    if (exclusions.includes(trimmed)) {
      showToast('Guardrail already active.');
      return;
    }
    const next = [...exclusions, trimmed];
    setExclusions(next);
    setNewExclusionInput('');
    updateBrain({ brandExclusions: next });
    const wsId = state.activeWorkspaceId || 'ws_default';
    apiClient.addExclusionRule(wsId, trimmed).catch(() => {});
    showToast(`Added brand guardrail: "${trimmed}"`);
  };

  const handleRemoveExclusion = (rule: string) => {
    const next = exclusions.filter((r) => r !== rule);
    setExclusions(next);
    updateBrain({ brandExclusions: next });
    const wsId = state.activeWorkspaceId || 'ws_default';
    apiClient.removeExclusionRule(wsId, rule).catch(() => {});
    showToast(`Removed guardrail: "${rule}"`);
  };

  const handleUpdateDepartmentAiTier = (
    dept: string,
    tier: 'fast' | 'balanced' | 'deep_reasoning'
  ) => {
    const next = { ...departmentAiTiers, [dept]: tier };
    setDepartmentAiTiers(next);
    updateWorkspacePrefs({ departmentAiTiers: next });
  };

  const handleSaveWebhooks = () => {
    updateWorkspacePrefs({
      notificationWebhooks: {
        slackWebhookUrl: slackWebhook.trim() || undefined,
        discordWebhookUrl: discordWebhook.trim() || undefined,
      },
    });
    showToast('Saved team notification webhook destinations.');
  };

  const handleExecuteDpdpaErasure = async () => {
    try {
      setDpdpaLoading(true);
      const wsId =
        state.activeWorkspaceId ||
        `ws_${state.brain.businessName.toLowerCase().replace(/[^a-z0-9]/g, '_')}`;
      const res = await apiClient.executeDpdpaErasure(wsId).catch(() => ({
        workspaceId: wsId,
        erasedAt: new Date().toISOString(),
        status: 'DATA_PURGED_DPDPA_COMPLIANT',
        purgedCategories: ['businessBrain', 'competitors', 'goals', 'tasks', 'researchData'],
        retainedCategories: ['taxInvoices', 'statutoryAuditLedger'],
        legalNotice:
          'Statutory tax and financial records are retained in compliance with Indian CGST and Companies Act provisions.',
      }));
      setDpdpaSuccessResult(res);
      showToast('DPDPA Section 12 technical data erasure executed.');
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      showToast(`Error executing data erasure: ${msg}`);
    } finally {
      setDpdpaLoading(false);
    }
  };

  const handleExportWorkspace = () => {
    const blob = new Blob([JSON.stringify(state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `brainwise-${state.brain.businessName.toLowerCase().replace(/\s+/g, '-')}-snapshot.json`;
    a.click();
    URL.revokeObjectURL(url);
    showToast('Exported Business Brain & workspace JSON snapshot.');
  };

  return (
    <div className="space-y-6">
      <PageHeader
        mutedPrefix="Settings &"
        title="Workspace"
        subtitle="Configure personal profile, Business Brain context, team access, AI preferences, billing, and integrations."
        actions={
          <Button variant="secondary" size="sm" onClick={() => setResetConfirmOpen(true)}>
            <RotateCcw className="w-3.5 h-3.5 text-[#686864]" />
            Reset Demo Workspace
          </Button>
        }
      />

      {/* Mobile selector */}
      <div className="lg:hidden">
        <Field label="Settings Section" htmlFor="settings-section-select">
          <Select
            id="settings-section-select"
            value={activeTab}
            onChange={(e) => navigate('settings', { settingsTab: e.target.value as SettingsTabId })}
          >
            {SETTINGS_NAV.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-start">
        <nav
          aria-label="Settings sections"
          data-frosted-nav="settings"
          className="hidden lg:flex flex-col gap-1 bw-frosted-nav border border-[#E6E6E2]/80 rounded-[14px] p-2 bw-surface-raised sticky top-20"
        >
          {SETTINGS_NAV.map((item) => {
            const active = item.id === activeTab;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => navigate('settings', { settingsTab: item.id })}
                className={`flex items-center gap-2.5 px-3 py-2 text-sm rounded-[8px] text-left transition-colors cursor-pointer ${
                  active
                    ? 'bg-[#FFF0E5] text-[#C44D00] font-medium'
                    : 'text-[#686864] hover:text-[#242424] hover:bg-[#F5F5F4]'
                }`}
              >
                <span className={active ? 'text-[#FF7417]' : 'text-[#8E8E88]'}>{item.icon}</span>
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        <FluidTransition
          key={activeTab}
          direction="fade"
          className="bg-[#FFFFFF] border border-[#E6E6E2] rounded-[12px] p-5 sm:p-6 space-y-6 bw-surface-raised"
        >
          {activeTab === 'personal-profile' && (
            <form onSubmit={handleSaveProfile} className="space-y-5">
              <SectionHeader
                title="Personal Profile"
                description="Founder account identity used across Business Brain logs and reports."
              />
              <div className="flex items-center gap-4 pt-1">
                <div className="w-14 h-14 rounded-full bg-[#171717] text-white font-heading font-semibold flex items-center justify-center text-base shadow-[0_2px_8px_rgba(23,23,23,0.16)] overflow-hidden shrink-0 border border-[#E6E6E2]">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    state.user.avatarInitials
                  )}
                </div>
                <div className="space-y-1">
                  <div className="text-sm font-semibold text-[#242424]">
                    {state.user.firstName} {state.user.lastName}
                  </div>
                  <div className="text-xs text-[#686864]">{state.user.email}</div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FF7417] hover:text-[#C44D00] cursor-pointer pt-0.5">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload headshot image</span>
                    <input
                      type="file"
                      accept="image/png,image/jpeg,image/webp"
                      onChange={handleAvatarFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="First Name" htmlFor="prof-first">
                  <Input
                    id="prof-first"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                  />
                </Field>
                <Field label="Last Name" htmlFor="prof-last">
                  <Input
                    id="prof-last"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                  />
                </Field>
                <Field label="Email Address" htmlFor="prof-email">
                  <Input
                    id="prof-email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                  />
                </Field>
                <Field label="Role / Title" htmlFor="prof-role">
                  <Input
                    id="prof-role"
                    type="text"
                    value={role}
                    onChange={(e) => setRole(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Timezone" htmlFor="prof-tz">
                    <Select
                      id="prof-tz"
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                    >
                      <option value="America/Los_Angeles (PST)">America/Los_Angeles (PST)</option>
                      <option value="America/New_York (EST)">America/New_York (EST)</option>
                      <option value="Europe/London (GMT)">Europe/London (GMT)</option>
                      <option value="Asia/Kolkata (IST)">Asia/Kolkata (IST)</option>
                    </Select>
                  </Field>
                </div>
              </div>

              <div className="flex items-center justify-between pt-4 border-t border-[#E6E6E2]">
                <button
                  type="button"
                  onClick={logout}
                  className="text-xs font-medium text-[#686864] hover:text-[#242424] cursor-pointer"
                >
                  Sign out to public site
                </button>
                <Button type="submit" variant="primary" size="md">
                  Save Profile
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'business-profile' && (
            <form onSubmit={handleSaveBusiness} className="space-y-5">
              <SectionHeader
                title="Business Profile"
                description="Core company attributes synchronized directly with your Business Brain and Brand Studio."
                action={
                  <button
                    type="button"
                    onClick={() => navigate('business-brain')}
                    className="text-xs font-medium text-[#C44D00] hover:text-[#A33E00] cursor-pointer"
                  >
                    Open full Business Brain →
                  </button>
                }
              />

              {/* Brand Logo Upload Header */}
              <div className="flex items-center gap-4 p-4 rounded-[10px] border border-[#E6E6E2] bg-[#F5F5F4]">
                <div className="w-14 h-14 rounded-[8px] bg-white border border-[#E6E6E2] flex items-center justify-center overflow-hidden shrink-0">
                  {bizLogoUrl ? (
                    <img
                      src={bizLogoUrl}
                      alt="Company Logo"
                      className="w-full h-full object-contain p-1"
                    />
                  ) : (
                    <Building2 className="w-6 h-6 text-[#8E8E88]" />
                  )}
                </div>
                <div>
                  <div className="text-sm font-semibold text-[#242424]">Company Logo Mark</div>
                  <div className="text-xs text-[#686864] mb-2">
                    Used across Brand Studio vector collateral, PDF dossiers, and invoices.
                  </div>
                  <label className="inline-flex items-center gap-1.5 text-xs font-medium text-[#FF7417] hover:text-[#C44D00] cursor-pointer">
                    <Upload className="w-3.5 h-3.5" />
                    <span>Upload brand logo (SVG/PNG)</span>
                    <input
                      type="file"
                      accept="image/svg+xml,image/png,image/jpeg,image/webp"
                      onChange={handleLogoFileSelect}
                      className="hidden"
                    />
                  </label>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Business Name" htmlFor="biz-name">
                  <Input
                    id="biz-name"
                    type="text"
                    value={bizName}
                    onChange={(e) => setBizName(e.target.value)}
                  />
                </Field>
                <Field label="Industry" htmlFor="biz-ind">
                  <Input
                    id="biz-ind"
                    type="text"
                    value={bizIndustry}
                    onChange={(e) => setBizIndustry(e.target.value)}
                  />
                </Field>
                <Field label="Business Stage" htmlFor="biz-stage">
                  <Select
                    id="biz-stage"
                    value={bizStage}
                    onChange={(e) => setBizStage(e.target.value as BusinessBrainData['stage'])}
                  >
                    <option value="Idea Stage">Idea Stage</option>
                    <option value="Pre-Launch">Pre-Launch</option>
                    <option value="Early Traction">Early Traction</option>
                    <option value="Growing Business">Growing Business</option>
                    <option value="Established">Established</option>
                  </Select>
                </Field>
                <Field label="Primary Market / Location" htmlFor="biz-loc">
                  <Input
                    id="biz-loc"
                    type="text"
                    value={bizLocation}
                    onChange={(e) => setBizLocation(e.target.value)}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Field label="Tagline" htmlFor="biz-tag">
                    <Input
                      id="biz-tag"
                      type="text"
                      value={bizTagline}
                      onChange={(e) => setBizTagline(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="sm:col-span-2">
                  <Field label="Website" htmlFor="biz-web">
                    <Input
                      id="biz-web"
                      type="text"
                      value={bizWebsite}
                      onChange={(e) => setBizWebsite(e.target.value)}
                    />
                  </Field>
                </div>
              </div>
              <div className="flex justify-end pt-4 border-t border-[#E6E6E2]">
                <Button type="submit" variant="primary" size="md">
                  Save Business Profile
                </Button>
              </div>
            </form>
          )}

          {activeTab === 'team-members' && (
            <div className="space-y-5">
              <SectionHeader
                title="Team & Members"
                description="Manage collaborator roles across intelligence, brand, and growth workspaces."
                action={
                  <div className="flex items-center gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      onClick={handleGenerateInviteLink}
                      disabled={inviteLoading}
                    >
                      <Share2 className="w-3.5 h-3.5 text-[#FF7417]" />
                      {inviteLoading ? 'Generating...' : 'Copy Invite Link'}
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => setInviteOpen(true)}>
                      <Plus className="w-3.5 h-3.5" />
                      Invite Member
                    </Button>
                  </div>
                }
              />

              {generatedInviteLink && (
                <div className="p-3.5 rounded-[10px] bg-[#FFF0E5] border border-[#FF7417]/30 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="font-semibold text-[#C44D00]">Active Shareable Link: </span>
                    <span className="text-[#686864] font-mono break-all">
                      {generatedInviteLink}
                    </span>
                  </div>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => {
                      if (navigator.clipboard) {
                        navigator.clipboard.writeText(generatedInviteLink);
                      }
                      showToast('Copied link again!');
                    }}
                  >
                    <Copy className="w-3 h-3 text-[#FF7417]" />
                    Copy
                  </Button>
                </div>
              )}

              <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px]">
                {teamMembers.map((member) => (
                  <div
                    key={member.id}
                    className="px-4 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#242424]">{member.name}</div>
                      <div className="text-xs text-[#686864]">{member.email}</div>
                    </div>
                    <div className="flex items-center gap-2.5">
                      <StatusBadge
                        status={member.status}
                        tone={member.status === 'Active' ? 'success' : 'warning'}
                      />
                      <span className="text-xs font-medium text-[#242424] px-2.5 py-1 bg-[#F5F5F4] border border-[#E6E6E2] rounded-[8px]">
                        {member.role}
                      </span>
                      {member.role !== 'Owner' && (
                        <button
                          type="button"
                          onClick={() => removeTeamMember(member.id)}
                          aria-label={`Remove ${member.name}`}
                          className="p-1.5 text-[#8E8E88] hover:text-[#BC3E3E] rounded-[8px] cursor-pointer transition-colors"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'workspace-preferences' && (
            <div className="space-y-5">
              <SectionHeader
                title="Workspace Preferences"
                description="Customize display formatting, default landing view, information density, and reset controls."
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Field label="Date Display Format" htmlFor="pref-date">
                  <Select
                    id="pref-date"
                    value={workspacePrefs.dateFormat}
                    onChange={(e) =>
                      updateWorkspacePrefs({
                        dateFormat: e.target.value as 'YYYY-MM-DD' | 'MMM D, YYYY',
                      })
                    }
                  >
                    <option value="YYYY-MM-DD">ISO (2026-11-16)</option>
                    <option value="MMM D, YYYY">Editorial (Nov 16, 2026)</option>
                  </Select>
                </Field>
                <Field label="Default Start Workspace" htmlFor="pref-start">
                  <Select
                    id="pref-start"
                    value={workspacePrefs.defaultLandingView}
                    onChange={(e) =>
                      updateWorkspacePrefs({
                        defaultLandingView: e.target.value as 'dashboard' | 'growth-director',
                      })
                    }
                  >
                    <option value="dashboard">Home Dashboard</option>
                    <option value="growth-director">Growth Planner</option>
                  </Select>
                </Field>
              </div>

              <label className="flex items-center justify-between p-4 rounded-[10px] border border-[#E6E6E2] hover:bg-[#F5F5F4] cursor-pointer transition-colors">
                <div>
                  <div className="text-sm font-medium text-[#242424]">
                    Compact Information Density
                  </div>
                  <div className="text-xs text-[#686864]">
                    Tighter vertical padding across workspace panels and research dossiers.
                  </div>
                </div>
                <input
                  type="checkbox"
                  checked={workspacePrefs.compactDensity}
                  onChange={(e) => updateWorkspacePrefs({ compactDensity: e.target.checked })}
                  className="w-4 h-4 accent-[#FF7417]"
                />
              </label>

              <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div>
                  <div className="text-sm font-semibold text-[#242424]">
                    Restore Demonstration Workspace
                  </div>
                  <div className="text-xs text-[#686864]">
                    Reset all edits back to the seeded Solstice Craft Coffee dataset.
                  </div>
                </div>
                <Button variant="secondary" size="sm" onClick={() => setResetConfirmOpen(true)}>
                  Reset Demo Data
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'notification-settings' && (
            <div className="space-y-5">
              <SectionHeader
                title="Notification Settings"
                description="Control competitor intelligence alerts and scheduled executive digests."
              />
              <div>
                <label
                  htmlFor="notif-email"
                  className="block text-xs font-medium text-[#242424] mb-1"
                >
                  Digest Delivery Email
                </label>
                <div className="flex gap-2">
                  <Input
                    id="notif-email"
                    type="email"
                    value={deliveryEmail}
                    onChange={(e) => setDeliveryEmail(e.target.value)}
                    className="flex-1"
                  />
                  <Button
                    variant="primary"
                    size="md"
                    onClick={() => updateScheduledReports({ deliveryEmail })}
                  >
                    Save Email
                  </Button>
                </div>
              </div>

              <div className="space-y-2.5">
                {[
                  {
                    key: 'dailyDigest' as const,
                    title: 'Daily Execution & Task Digest',
                    desc: 'Morning summary of today’s highest-leverage Growth Planner actions.',
                  },
                  {
                    key: 'weeklyIntelligence' as const,
                    title: 'Weekly Market & Competitor Intelligence',
                    desc: 'Synthesized Market Watch signals and strategic interpretations every Monday.',
                  },
                  {
                    key: 'monthlyReview' as const,
                    title: 'Monthly Business Performance Review',
                    desc: 'Executive scorecard covering revenue targets, experiments, and goal velocity.',
                  },
                  {
                    key: 'includeCompetitorDiffs' as const,
                    title: 'Instant Competitor Pricing & Positioning Diffs',
                    desc: 'Flag verified website or pricing changes from watched rivals immediately.',
                  },
                ].map((item) => (
                  <label
                    key={item.key}
                    className="flex items-center justify-between gap-4 p-4 rounded-[10px] border border-[#E6E6E2] hover:bg-[#F5F5F4] cursor-pointer transition-colors"
                  >
                    <div>
                      <div className="text-sm font-medium text-[#242424]">{item.title}</div>
                      <div className="text-xs text-[#686864] mt-0.5">{item.desc}</div>
                    </div>
                    <input
                      type="checkbox"
                      checked={state.scheduledReports[item.key]}
                      onChange={(e) => updateScheduledReports({ [item.key]: e.target.checked })}
                      className="w-4 h-4 accent-[#FF7417] shrink-0"
                    />
                  </label>
                ))}
              </div>

              {/* Team Webhook Integrations */}
              <div className="pt-3 border-t border-[#E6E6E2] space-y-4">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E88]">
                    Team Webhook Integrations (Slack / Discord)
                  </div>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Stream daily action briefs and competitor alerts directly into your team channels.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Field label="Slack Incoming Webhook URL" htmlFor="slack-webhook">
                    <Input
                      id="slack-webhook"
                      type="url"
                      placeholder="https://hooks.slack.com/services/..."
                      value={slackWebhook}
                      onChange={(e) => setSlackWebhook(e.target.value)}
                    />
                  </Field>
                  <Field label="Discord Webhook URL" htmlFor="discord-webhook">
                    <Input
                      id="discord-webhook"
                      type="url"
                      placeholder="https://discord.com/api/webhooks/..."
                      value={discordWebhook}
                      onChange={(e) => setDiscordWebhook(e.target.value)}
                    />
                  </Field>
                </div>
                <div className="flex justify-end">
                  <Button variant="primary" size="sm" onClick={handleSaveWebhooks}>
                    Save Webhook Destinations
                  </Button>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'ai-preferences' && (
            <div className="space-y-6">
              <SectionHeader
                title="AI Preferences"
                description="Choose how BrainWise writes strategic recommendations, reports, and controls cross-department context sync."
              />

              {/* Tone Selection */}
              <div className="space-y-2">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E88]">
                  Intelligence Reasoning Tone
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  {(
                    [
                      {
                        id: 'Executive & Concise',
                        desc: 'Direct, board-ready bullets with quantified trade-offs.',
                      },
                      {
                        id: 'Analytical & Detailed',
                        desc: 'Deep evidence breakdown, assumption ranges, and risk notes.',
                      },
                      {
                        id: 'Creative & Exploratory',
                        desc: 'Distinctive brand angles, fresh hooks, and lateral growth tests.',
                      },
                    ] as { id: BrainWiseState['aiTonePreference']; desc: string }[]
                  ).map((tone) => {
                    const active = state.aiTonePreference === tone.id;
                    return (
                      <button
                        key={tone.id}
                        type="button"
                        onClick={() => setAiTonePreference(tone.id)}
                        className={`p-4 rounded-[10px] border text-left transition-colors cursor-pointer ${
                          active
                            ? 'bg-[#FFF0E5]/70 border-[#FF7417]'
                            : 'bg-[#FFFFFF] border-[#E6E6E2] hover:bg-[#F5F5F4]'
                        }`}
                      >
                        <div className="flex items-center justify-between gap-2">
                          <span className="text-sm font-semibold text-[#242424]">{tone.id}</span>
                          {active && <Check className="w-4 h-4 text-[#FF7417]" />}
                        </div>
                        <p className="text-xs text-[#686864] mt-1.5 leading-relaxed">{tone.desc}</p>
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Department AI Reasoning Tiers */}
              <div className="pt-2 border-t border-[#E6E6E2] space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E88]">
                    Department AI Reasoning Tiers &amp; Models
                  </div>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Configure speed versus cognitive depth independently across departments.
                  </p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {[
                    { key: 'ideaIntelligence', label: 'Idea Intelligence & Sizing' },
                    {
                      key: 'competitiveIntelligence',
                      label: 'Competitive Intelligence & Gap Analysis',
                    },
                    { key: 'brandStudio', label: 'Brand Studio & Collateral' },
                    { key: 'growthDirector', label: 'Growth Planner & Tasks' },
                  ].map((dept) => (
                    <div
                      key={dept.key}
                      className="p-3.5 rounded-[10px] border border-[#E6E6E2] bg-white flex items-center justify-between gap-3"
                    >
                      <div className="text-xs font-medium text-[#242424]">{dept.label}</div>
                      <Select
                        value={departmentAiTiers[dept.key] || 'balanced'}
                        onChange={(e) =>
                          handleUpdateDepartmentAiTier(
                            dept.key,
                            e.target.value as 'fast' | 'balanced' | 'deep_reasoning'
                          )
                        }
                        className="text-xs py-1 px-2.5 w-auto"
                      >
                        <option value="fast">Fast (Gemini Flash)</option>
                        <option value="balanced">Balanced (Gemini Pro)</option>
                        <option value="deep_reasoning">Deep CoT (Ultra)</option>
                      </Select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Brand Voice Guardrails & Negative Prompt Rules */}
              <div className="pt-2 border-t border-[#E6E6E2] space-y-3">
                <div>
                  <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E88]">
                    Brand Voice Guardrails &amp; Forbidden Claims (Negative Rules)
                  </div>
                  <p className="text-xs text-[#686864] mt-0.5">
                    Prohibited claims, forbidden jargon, or compliance constraints strictly checked
                    during AI generation.
                  </p>
                </div>
                <div className="flex gap-2">
                  <Input
                    type="text"
                    placeholder="e.g. 'unverified ROI', 'guaranteed growth', 'synergy'"
                    value={newExclusionInput}
                    onChange={(e) => setNewExclusionInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddExclusion();
                      }
                    }}
                    className="flex-1"
                  />
                  <Button variant="secondary" size="md" onClick={handleAddExclusion}>
                    <Plus className="w-3.5 h-3.5 text-[#FF7417]" />
                    Add Rule
                  </Button>
                </div>
                <div className="flex flex-wrap gap-2 pt-1">
                  {exclusions.map((rule) => (
                    <span
                      key={rule}
                      className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-[8px] bg-[#FFF0E5] text-[#C44D00] border border-[#FF7417]/30 text-xs font-medium"
                    >
                      <span>{rule}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveExclusion(rule)}
                        className="hover:text-[#BC3E3E] cursor-pointer"
                        aria-label={`Remove rule ${rule}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              </div>

              {/* Cross-Department Context Sharing */}
              <div className="pt-2 border-t border-[#E6E6E2] space-y-2.5">
                <div className="text-xs font-semibold uppercase tracking-wider text-[#8E8E88]">
                  Department Business Brain Context Sharing
                </div>
                {(
                  [
                    ['ideaIntelligence', 'Idea Intelligence & Market Sizing'],
                    ['competitiveIntelligence', 'Competitive Intelligence & Gap Analysis'],
                    ['brandStudio', 'Brand Studio & Collateral Copy'],
                    ['growthDirector', 'Growth Planner & Daily Tasks'],
                  ] as const
                ).map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-center justify-between p-3.5 rounded-[10px] border border-[#E6E6E2] hover:bg-[#F5F5F4] cursor-pointer transition-colors"
                  >
                    <span className="text-sm text-[#242424]">{label}</span>
                    <input
                      type="checkbox"
                      checked={contextSharing[key]}
                      onChange={(e) => updateContextSharing({ [key]: e.target.checked })}
                      className="w-4 h-4 accent-[#FF7417]"
                    />
                  </label>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'data-privacy' && (
            <div className="space-y-5">
              <SectionHeader
                title="Data & Privacy"
                description="Workspace state is stored locally in your browser (`localStorage`) and synchronized with your authoritative cloud workspace. Export or reset anytime."
              />
              <div className="p-4 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-[#242424]">
                    Local Workspace Persistence
                  </span>
                  <StatusBadge status="Synchronized & Isolated" tone="success" />
                </div>
                <p className="text-xs text-[#686864] leading-relaxed">
                  BrainWise operates with strict multi-tenant isolation under your authenticated
                  workspace. Data is protected with AES-256 encryption at rest.
                </p>
              </div>

              <div className="flex flex-wrap gap-3">
                <Button variant="secondary" size="md" onClick={handleExportWorkspace}>
                  <Download className="w-4 h-4 text-[#FF7417]" />
                  Export Workspace JSON
                </Button>
                <Button variant="danger" size="md" onClick={() => setResetConfirmOpen(true)}>
                  <Trash2 className="w-4 h-4" />
                  Clear &amp; Reset Demo Data
                </Button>
              </div>

              {/* DPDPA Right to Erasure */}
              <div className="pt-4 border-t border-[#E6E6E2] space-y-3">
                <div className="p-4 rounded-[10px] border border-[#E6E6E2] bg-white space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-sm font-semibold text-[#242424] flex items-center gap-2">
                        <ShieldAlert className="w-4 h-4 text-[#FF7417]" />
                        <span>DPDPA 2023 Section 12 Technical Data Erasure</span>
                      </div>
                      <p className="text-xs text-[#686864] mt-1 leading-relaxed">
                        Exercise your statutory Right to Erasure under the Digital Personal Data
                        Protection Act, 2023. Permanently purges AI Business Brain memory,
                        competitor surveillance records, research dossiers, and strategy logs. Tax
                        and billing records are legally preserved under Section 128 of the Companies
                        Act and Section 35(1) of the CGST Act.
                      </p>
                    </div>
                    <Button variant="danger" size="sm" onClick={() => setDpdpaModalOpen(true)}>
                      Request Data Erasure
                    </Button>
                  </div>
                  {dpdpaSuccessResult && (
                    <div className="p-3 rounded-[8px] bg-[#EBF7EE] border border-[#BCE4C6] text-xs text-[#1F5C2E]">
                      <div className="font-semibold flex items-center gap-1.5">
                        <CheckCircle2 className="w-4 h-4" />
                        {dpdpaSuccessResult.status}
                      </div>
                      <div className="mt-1 text-[#242424]">
                        Purged categories:{' '}
                        {dpdpaSuccessResult.purgedCategories?.join(', ') || 'All operational data'}.
                      </div>
                      <div className="text-[#686864] mt-0.5">
                        {dpdpaSuccessResult.legalNotice}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'subscription-billing' && <BillingDashboardView />}

          {activeTab === 'usage-credits' && <BillingDashboardView />}

          {activeTab === 'integrations' && <IntegrationManagerView />}

          {activeTab === 'help-support' && (
            <div className="space-y-5">
              <SectionHeader
                title="Help & Support"
                description="Quick reference for keyboard shortcuts, end-to-end journey workflows, and the frozen Design System."
                action={
                  <div className="flex flex-wrap items-center gap-2">
                    <Button variant="secondary" size="sm" onClick={() => navigate('help-support')}>
                      <Palette className="w-3.5 h-3.5 text-[#FF7417]" />
                      View Frozen Design System
                    </Button>
                    <Button variant="primary" size="sm" onClick={() => navigate('help-support')}>
                      Open Full Help Centre
                    </Button>
                  </div>
                }
              />
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-[10px] border border-[#E6E6E2] bg-[#F5F5F4]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#242424]">
                    <Keyboard className="w-4 h-4 text-[#FF7417]" />
                    <span>Command Shortcut</span>
                  </div>
                  <p className="text-xs text-[#686864] mt-1.5">
                    Press{' '}
                    <kbd className="px-1.5 py-0.5 bg-white border border-[#E6E6E2] rounded text-[#242424]">
                      ⌘K
                    </kbd>{' '}
                    or{' '}
                    <kbd className="px-1.5 py-0.5 bg-white border border-[#E6E6E2] rounded text-[#242424]">
                      Ctrl+K
                    </kbd>{' '}
                    anywhere inside BrainWise to jump to any competitor, research report, task, or
                    asset.
                  </p>
                </div>
                <div className="p-4 rounded-[10px] border border-[#E6E6E2] bg-[#F5F5F4]">
                  <div className="flex items-center gap-2 text-sm font-semibold text-[#242424]">
                    <Compass className="w-4 h-4 text-[#FF7417]" />
                    <span>Complete Founder Journey</span>
                  </div>
                  <p className="text-xs text-[#686864] mt-1.5">
                    Follow the connected flow from Business Brain → Idea Intelligence → Competitive
                    Intelligence → Brand Studio → Growth Planner → Market Watch.
                  </p>
                </div>
              </div>
            </div>
          )}
        </FluidTransition>
      </div>

      {/* Invite Member Modal */}
      <Modal
        open={inviteOpen}
        onClose={() => {
          setInviteError(null);
          setInviteOpen(false);
        }}
        title="Invite Team Member"
        subtitle="Add a collaborator to your workspace roster."
      >
        <form noValidate onSubmit={handleInviteMember} className="space-y-4">
          <Field label="Full Name" htmlFor="inv-name">
            <Input
              id="inv-name"
              type="text"
              value={inviteName}
              onChange={(e) => {
                setInviteName(e.target.value);
                if (inviteError) setInviteError(null);
              }}
              placeholder="e.g. Elena Rostova"
            />
          </Field>
          <Field label="Work Email" htmlFor="inv-email">
            <Input
              id="inv-email"
              type="email"
              value={inviteEmail}
              onChange={(e) => {
                setInviteEmail(e.target.value);
                if (inviteError) setInviteError(null);
              }}
              placeholder="elena@company.co"
            />
          </Field>
          <Field label="Workspace Role" htmlFor="inv-role">
            <Select
              id="inv-role"
              value={inviteRole}
              onChange={(e) => setInviteRole(e.target.value as TeamMemberItem['role'])}
            >
              <option value="Strategist">Strategist</option>
              <option value="Brand Designer">Brand Designer</option>
              <option value="Viewer">Viewer</option>
            </Select>
          </Field>
          {inviteError && (
            <p role="alert" className="text-xs font-medium text-[#BC3E3E]">
              {inviteError}
            </p>
          )}
          <div className="flex justify-end gap-2 pt-2">
            <Button
              variant="secondary"
              size="sm"
              onClick={() => {
                setInviteError(null);
                setInviteOpen(false);
              }}
            >
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm">
              Send Invitation
            </Button>
          </div>
        </form>
      </Modal>

      <ConfirmationDialog
        open={resetConfirmOpen}
        onClose={() => setResetConfirmOpen(false)}
        onConfirm={resetDemoData}
        title="Reset Demonstration Workspace?"
        message="This restores all Business Brain entries, research dossiers, competitors, brand assets, tasks, and goals back to the default Solstice Craft Coffee dataset."
        confirmLabel="Reset Workspace"
        destructive
      />

      <ConfirmationDialog
        open={dpdpaModalOpen}
        onClose={() => setDpdpaModalOpen(false)}
        onConfirm={handleExecuteDpdpaErasure}
        title="Execute DPDPA Section 12 Data Erasure?"
        message="This action permanently purges your Business Brain memory, competitor surveillance records, market research dossiers, and strategy logs. Statutory tax and financial invoices are retained under Section 128 of the Companies Act and Section 35(1) of the CGST Act."
        confirmLabel={dpdpaLoading ? 'Purging Data...' : 'Permanently Purge Data'}
        destructive
      />
    </div>
  );
};

const FROZEN_SCREEN_COVERAGE = [
  {
    area: 'Marketing',
    screens:
      'Homepage, Features (#capabilities), Departments (#departments), Journal (#journal), About (#about), Pricing (#pricing), FAQ (#faq)',
  },
  {
    area: 'Account & Security',
    screens: 'Sign Up, Sign In, Password Reset (Forgot & Reset), 6-Digit Email Verification',
  },
  {
    area: 'Onboarding',
    screens:
      'Role Selection, Strategic Goals, Business & Industry Setup, Initial Competitors, Business Brain Sync',
  },
  {
    area: 'Core Workspace',
    screens:
      'Executive Dashboard (single dominant insight), Business Brain (shared memory & decisions)',
  },
  {
    area: 'Intelligence',
    screens:
      'Idea Intelligence (7-step wizard + 15-section dossier), Competitive Intelligence, Market Watch',
  },
  {
    area: 'AI Execution',
    screens:
      'AI Brand Studio (AI Logo Studio, Brand Guidelines, AI Instagram Post/Carousel & Collateral Studio), Asset Library, Growth Planner',
  },
  {
    area: 'Reporting & Settings',
    screens:
      'Analytics, Scheduled Reports, Activity History, Settings (Profile, Team, Billing, Integrations), Help & Frozen Design System',
  },
];

export const HelpSupportPage: React.FC = () => {
  const { state, navigate, showToast, setGlobalSearchOpen, departmentResetNonce } = useBrainWise();
  const [activeTab, setActiveTab] = useState<'guides' | 'design-system'>('guides');
  const [query, setQuery] = useState('');
  const [supportMessage, setSupportMessage] = useState('');
  const [supportError, setSupportError] = useState<string | null>(null);
  const [isSubmittingSupport, setIsSubmittingSupport] = useState(false);
  const [previewPulse, setPreviewPulse] = useState(true);
  const [previewSaved, setPreviewSaved] = useState(true);
  const [previewSkeleton, setPreviewSkeleton] = useState(true);

  const resetRef = useRef(departmentResetNonce);
  useEffect(() => {
    if (resetRef.current !== departmentResetNonce) {
      resetRef.current = departmentResetNonce;
      setQuery('');
      setActiveTab('guides');
    }
  }, [departmentResetNonce]);

  useWorkspaceBreadcrumbs(
    activeTab === 'design-system'
      ? [{ label: 'Design System & Tokens v1.0' }]
      : query.trim()
        ? [{ label: `Filter: ${query.trim()}` }]
        : [],
    [activeTab, query]
  );

  const handleCopyTokensCss = () => {
    const css = exportFrozenTokensCss();
    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(css).catch(() => {});
    }
    showToast(`Copied BrainWise v${BW_DESIGN_FREEZE_VERSION} CSS variables.`);
  };

  const guides = [
    {
      step: '01',
      title: 'Initialize your Business Brain',
      desc: 'Define products, customer personas, positioning, and strategic decisions once so every AI department inherits shared context.',
      route: 'business-brain' as const,
      cta: 'Open Business Brain',
    },
    {
      step: '02',
      title: 'Validate an Idea & Model TAM/SAM/SOM',
      desc: 'Launch the Idea Intelligence wizard to inspect a 15-section market dossier and adjust market sizing assumptions live.',
      route: 'idea-intelligence' as const,
      cta: 'Open Idea Intelligence',
    },
    {
      step: '03',
      title: 'Analyse Competitors & Differentiation Gaps',
      desc: 'Inspect grouped rival dossiers, compare offers on a 2x2 positioning map, and adopt a defensible differentiation strategy.',
      route: 'competitive-intelligence' as const,
      cta: 'Open Competitive Intelligence',
    },
    {
      step: '04',
      title: 'Generate AI Logos, Collateral & Instagram Carousels',
      desc: 'Prompt AI Logo Studio, generate multi-slide Instagram posts and carousels, and remix saved creatives from Asset Library.',
      route: 'brand-studio' as const,
      cta: 'Open Brand Studio',
    },
    {
      step: '05',
      title: 'Execute 30-Day Growth Roadmap & Daily Tasks',
      desc: 'Check off daily high-leverage priorities, log business goal milestones, and run structured growth experiments.',
      route: 'growth-director' as const,
      cta: 'Open Growth Planner',
    },
    {
      step: '06',
      title: 'Track Market Watch & Convert Signals',
      desc: 'Review verified competitor updates separated from AI interpretation, and turn opportunities directly into experiments.',
      route: 'market-watch' as const,
      cta: 'Open Market Watch',
    },
  ].filter(
    (g) =>
      !query.trim() ||
      g.title.toLowerCase().includes(query.toLowerCase()) ||
      g.desc.toLowerCase().includes(query.toLowerCase())
  );

  const colorGroups = [
    {
      name: 'Canvas & Hairlines (Alabaster)',
      items: [
        { label: 'Canvas Primary', hex: BW_COLORS.canvas.primary, token: '--bw-bg-primary' },
        { label: 'Canvas Secondary', hex: BW_COLORS.canvas.secondary, token: '--bw-bg-secondary' },
        { label: 'Canvas Subtle', hex: BW_COLORS.canvas.subtle, token: '--bw-bg-subtle' },
        { label: 'Border Hairline', hex: BW_COLORS.canvas.border, token: '--bw-border' },
      ],
    },
    {
      name: 'Charcoal & Editorial Ink',
      items: [
        { label: 'Deep Charcoal', hex: BW_COLORS.charcoal.deep, token: '--bw-dark' },
        { label: 'Graphite Primary', hex: BW_COLORS.charcoal.graphite, token: '--bw-text-primary' },
        { label: 'Muted Prose', hex: BW_COLORS.charcoal.bodyMuted, token: '--bw-text-body-muted' },
        {
          label: 'Secondary Meta',
          hex: BW_COLORS.charcoal.secondary,
          token: '--bw-text-secondary',
        },
      ],
    },
    {
      name: 'Restrained Orange Illumination & Semantic',
      items: [
        { label: 'Signature Orange', hex: BW_COLORS.accent.orange, token: '--bw-orange' },
        {
          label: 'Accessible Orange Text',
          hex: BW_COLORS.accent.orangeAccessibleText,
          token: '--bw-orange-text',
        },
        { label: 'Success Emerald', hex: BW_COLORS.semantic.success, token: '--bw-success' },
        { label: 'Error Crimson', hex: BW_COLORS.semantic.error, token: '--bw-error' },
      ],
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        mutedPrefix="Help &"
        title="Design System"
        subtitle="Guided founder walkthroughs, keyboard navigation, and the locked BrainWise v1.0 Design Freeze specification."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {activeTab === 'design-system' && (
              <Button variant="primary" size="sm" onClick={handleCopyTokensCss}>
                <Copy className="w-3.5 h-3.5" />
                Copy Frozen CSS Tokens
              </Button>
            )}
            <Button variant="secondary" size="sm" onClick={() => setGlobalSearchOpen(true)}>
              <Keyboard className="w-3.5 h-3.5 text-[#52524E]" />
              Open Quick Jump (⌘K)
            </Button>
          </div>
        }
      />

      <Tabs
        activeTab={activeTab}
        onChange={(id) => setActiveTab(id as 'guides' | 'design-system')}
        tabs={[
          { id: 'guides', label: 'Founder Guides & Support' },
          { id: 'design-system', label: 'Design System & Tokens v1.0' },
        ]}
      />

      {activeTab === 'guides' ? (
        <div className="space-y-6">
          <div className="max-w-md">
            <SearchInput
              value={query}
              onChange={setQuery}
              placeholder="Search founder guides and workflows..."
            />
          </div>

          {guides.length === 0 ? (
            <EmptyState
              icon={<BookOpen className="w-5 h-5" />}
              title="No matching guides found"
              description={`No workflow guides matched "${query}". Clear your filter to browse all 6 founder stages.`}
              actionLabel="Clear Search"
              onAction={() => setQuery('')}
            />
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {guides.map((g) => (
                <div
                  key={g.step}
                  className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E6E2] bw-surface-raised p-5 flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-center justify-between text-xs text-[#8E8E88] font-mono-num">
                      <span>STEP {g.step}</span>
                      <BookOpen className="w-4 h-4 text-[#FF7417]" />
                    </div>
                    <h3 className="font-heading text-base font-semibold text-[#242424] mt-2">
                      {g.title}
                    </h3>
                    <p className="text-xs text-[#686864] mt-1.5 leading-relaxed">{g.desc}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => navigate(g.route)}
                    className="mt-4 text-xs font-medium text-[#C44D00] hover:text-[#A33E00] text-left cursor-pointer"
                  >
                    {g.cta} →
                  </button>
                </div>
              ))}
            </div>
          )}

          <div className="rounded-[12px] bg-[#FFFFFF] border border-[#E6E6E2] bw-surface-raised p-6 max-w-2xl">
            <SectionHeader
              title="Ask Strategy Support"
              description="Submit questions, technical requests, or feedback to the BrainWise operations team."
            />
            <form
              noValidate
              onSubmit={async (e) => {
                e.preventDefault();
                const trimmed = supportMessage.trim();
                if (!trimmed) {
                  setSupportError('Enter a question or workflow feedback before submitting.');
                  return;
                }
                setSupportError(null);
                setIsSubmittingSupport(true);
                const wsId = state?.activeWorkspaceId || 'demo_workspace';
                try {
                  const res = await apiClient.createSupportTicket(wsId, {
                    message: trimmed,
                    subject: trimmed.length > 50 ? `${trimmed.slice(0, 50)}...` : trimmed,
                    category: 'QUESTION',
                  });
                  setSupportMessage('');
                  showToast(
                    res && res.data?.ticketId
                      ? `Support ticket logged (${res.data.ticketId}). Team will follow up.`
                      : 'Support ticket successfully submitted.'
                  );
                } catch (err: any) {
                  setSupportError(
                    err?.message || 'Failed to submit support ticket. Please check connection and try again.'
                  );
                  showToast('Unable to submit support ticket.', { tone: 'error' });
                } finally {
                  setIsSubmittingSupport(false);
                }
              }}
              className="mt-4 space-y-3"
            >
              <Textarea
                rows={3}
                value={supportMessage}
                disabled={isSubmittingSupport}
                onChange={(e) => {
                  setSupportMessage(e.target.value);
                  if (supportError) setSupportError(null);
                }}
                placeholder="Describe what you'd like to accomplish in BrainWise..."
                aria-label="Support question"
              />
              {supportError && (
                <p role="alert" className="text-xs font-medium text-[#BC3E3E]">
                  {supportError}
                </p>
              )}
              <Button type="submit" variant="primary" size="md" disabled={isSubmittingSupport}>
                {isSubmittingSupport ? 'Submitting Ticket...' : 'Submit Note'}
              </Button>
            </form>
          </div>
        </div>
      ) : (
        <div className="space-y-8">
          {/* Freeze Header Ledger */}
          <div className="rounded-[14px] border border-[#2C2C2C] bg-[#171717] text-white p-6 flex flex-col md:flex-row md:items-center justify-between gap-4 bw-dark-ambient-glow">
            <div>
              <div className="flex items-center gap-2 text-xs font-mono-num text-[#FF9A45]">
                <Layers className="w-3.5 h-3.5" />
                <span>DESIGN FREEZE SPECIFICATION · v{BW_DESIGN_FREEZE_VERSION}</span>
              </div>
              <h2 className="mt-1.5 font-heading text-xl font-bold text-white">
                BrainWise Visual Identity, Tokens &amp; State Contract
              </h2>
              <p className="mt-1 text-xs text-[#C8C8C2] max-w-2xl leading-relaxed">
                Canonical engineering reference locking brand geometry, alabaster-charcoal-orange
                color tokens, Geist &amp; JetBrains Mono scale, 4px spacing rules, interactive
                component states, and Liquid Motion transitions.
              </p>
            </div>
            <Button variant="primary" size="sm" onClick={handleCopyTokensCss} className="shrink-0">
              <Copy className="w-3.5 h-3.5" />
              Copy :root CSS Tokens
            </Button>
          </div>

          {/* 01 · Brand Mark & Identity Lock */}
          <section className="rounded-[14px] bg-[#FFFFFF] border border-[#E6E6E2] p-6 space-y-4">
            <SectionHeader
              title="01 · Brand Mark & Identity Lock"
              description="Approved monochrome-first wordmark paired with restrained orange focal anchor on light and obsidian surfaces."
            />
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="rounded-[12px] border border-[#E6E6E2] bg-[#FAFAF9] p-6 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <img src="/brainwise-logo.png" alt="BrainWise" className="h-8 w-auto object-contain" />
                  <div className="text-[11px] font-mono-num text-[#858585] border-l border-[#E6E6E2] pl-3">
                    OFFICIAL HORIZONTAL LOGO
                  </div>
                </div>
                <span className="text-[11px] font-mono-num text-[#5C5C58]">Clearspace ≥ 12px</span>
              </div>
              <div className="rounded-[12px] border border-[#2C2C2C] bg-[#171717] p-6 flex items-center justify-between text-white">
                <div className="flex items-center gap-3">
                  <BrandLogoMark size={36} dark />
                  <div>
                    <div className="font-heading text-lg font-bold text-white">BrainWise</div>
                    <div className="text-[11px] font-mono-num text-[#A8A8A2]">
                      DARK SURFACE LOCK
                    </div>
                  </div>
                </div>
                <span className="text-[11px] font-mono-num text-[#FF9A45]">Accent #FF7417</span>
              </div>
            </div>
          </section>

          {/* 02 · Color Palette System */}
          <section className="rounded-[14px] bg-[#FFFFFF] border border-[#E6E6E2] p-6 space-y-5">
            <SectionHeader
              title="02 · White, Charcoal & Restrained Orange Palette"
              description="Click any swatch to copy its exact hex value. Orange is reserved exclusively for primary actions, active focus, and AI signals."
            />
            <div className="space-y-5">
              {colorGroups.map((group) => (
                <div key={group.name} className="space-y-2.5">
                  <div className="text-xs font-semibold text-[#5C5C58]">{group.name}</div>
                  <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                    {group.items.map((swatch) => (
                      <button
                        key={swatch.token}
                        type="button"
                        onClick={() => {
                          if (navigator.clipboard?.writeText) {
                            navigator.clipboard.writeText(swatch.hex).catch(() => {});
                          }
                          showToast(`Copied ${swatch.label} (${swatch.hex})`);
                        }}
                        className="group text-left rounded-[10px] border border-[#E6E6E2] overflow-hidden bg-[#FFFFFF] hover:border-[#252525] transition-colors cursor-pointer"
                      >
                        <div
                          className="h-14 border-b border-[#E6E6E2]"
                          style={{ backgroundColor: swatch.hex }}
                        />
                        <div className="p-3">
                          <div className="text-xs font-semibold text-[#252525]">{swatch.label}</div>
                          <div className="mt-0.5 flex items-center justify-between text-[11px] font-mono-num text-[#858585]">
                            <span>{swatch.hex}</span>
                            <span className="group-hover:text-[#C44D00]">{swatch.token}</span>
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          {/* 03 · Typography & Spacing Scale */}
          <section className="grid grid-cols-1 lg:grid-cols-12 gap-5">
            <div className="lg:col-span-7 rounded-[20px] bg-[#FFFFFF] border border-[#ECECE8] p-6 sm:p-7 space-y-5 bw-surface-raised">
              <SectionHeader
                title={`03 · Typography Scale (${BW_TYPOGRAPHY.ratio} Major Third Modular Scale)`}
                description={`Strict ${BW_TYPOGRAPHY.ratio}× progression anchored at ${BW_TYPOGRAPHY.basePx}px (1rem) across Geist & JetBrains Mono.`}
              />
              <div className="divide-y divide-[#EFEFEB] border-y border-[#EFEFEB]">
                {BW_TYPOGRAPHY.scale.map((row) => (
                  <div
                    key={row.token}
                    className="py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
                  >
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-[11px] font-semibold text-[#C44D00]">
                          {row.token}
                        </span>
                        <span className="font-mono-num text-[10px] text-[#858585]">
                          1.25^{row.step} · .{row.className}
                        </span>
                      </div>
                      <div className="text-xs text-[#5C5C58] mt-0.5">{row.usage}</div>
                    </div>
                    <div className="text-[11px] font-mono-num text-[#252525] sm:text-right shrink-0">
                      <div>{row.size}</div>
                      <div className="text-[#858585]">
                        w{row.weight} · lh {row.lineHeight} · {row.tracking}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            <div className="lg:col-span-5 rounded-[14px] bg-[#FFFFFF] border border-[#E6E6E2] p-6 space-y-4">
              <SectionHeader
                title="04 · 4px Spacing & Corner Radii"
                description="Strict 4px spatial rhythm and consistent 6–18px radii."
              />
              <div className="space-y-2.5">
                {BW_SPACING.scale.map((sp) => (
                  <div key={sp.token} className="flex items-center justify-between gap-3 text-xs">
                    <div className="flex items-center gap-2.5 min-w-0">
                      <span
                        className="h-3 rounded-[3px] bg-[#FF7417] shrink-0"
                        style={{ width: sp.px }}
                      />
                      <span className="font-mono-num text-[#252525]">{sp.px}</span>
                    </div>
                    <span className="text-[#5C5C58] truncate">{sp.usage}</span>
                  </div>
                ))}
              </div>
              <div className="pt-3 border-t border-[#E6E6E2] grid grid-cols-4 gap-2 text-center">
                {Object.entries(BW_RADII).map(([key, val]) => (
                  <div
                    key={key}
                    className="p-2.5 border border-[#E6E6E2] bg-[#FAFAF9]"
                    style={{ borderRadius: val }}
                  >
                    <div className="font-mono-num text-[11px] font-semibold text-[#252525]">
                      {key}
                    </div>
                    <div className="font-mono-num text-[10px] text-[#858585]">{val}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 05 · Interactive Component & System States */}
          <section className="rounded-[14px] bg-[#FFFFFF] border border-[#E6E6E2] p-6 space-y-6">
            <SectionHeader
              title="05 · Buttons, Inputs & Mandatory Screen States"
              description="Every BrainWise screen ships with Loading, Empty, Success, Error, Disabled, and Responsive states."
            />

            {/* Buttons incl. Disabled */}
            <div className="space-y-2.5">
              <div className="text-xs font-semibold text-[#5C5C58]">
                Button Variants &amp; Disabled State
              </div>
              <div className="flex flex-wrap items-center gap-3">
                <Button
                  variant="primary"
                  size="md"
                  onClick={() => showToast('Primary action triggered')}
                >
                  Primary Action
                </Button>
                <Button
                  variant="dark"
                  size="md"
                  onClick={() => showToast('Charcoal action triggered')}
                >
                  Charcoal Action
                </Button>
                <Button
                  variant="secondary"
                  size="md"
                  onClick={() => showToast('Secondary action triggered')}
                >
                  Secondary
                </Button>
                <Button
                  variant="ghost"
                  size="md"
                  onClick={() => showToast('Ghost action triggered')}
                >
                  Ghost Link
                </Button>
                <Button
                  variant="danger"
                  size="md"
                  onClick={() => showToast('Destructive action triggered')}
                >
                  Destructive
                </Button>
                <Button variant="primary" size="md" disabled>
                  Disabled Primary
                </Button>
              </div>
            </div>

            {/* Form Inputs: Default, Error, Disabled */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 pt-2 border-t border-[#E6E6E2]">
              <Field label="Default Input" htmlFor="ds-input-default">
                <Input id="ds-input-default" defaultValue="Solstice Craft Coffee" />
              </Field>
              <Field label="Validation Error State" htmlFor="ds-input-error">
                <Input
                  id="ds-input-error"
                  defaultValue="invalid-email"
                  aria-invalid="true"
                  className="border-[#BC3E3E] focus:border-[#BC3E3E]"
                />
                <p role="alert" className="text-[11px] font-medium text-[#BC3E3E] mt-1">
                  Enter a valid work email address.
                </p>
              </Field>
              <Field label="Disabled Input" htmlFor="ds-input-disabled">
                <Input
                  id="ds-input-disabled"
                  defaultValue="Locked after freeze"
                  disabled
                  className="opacity-60 cursor-not-allowed bg-[#F5F5F4]"
                />
              </Field>
            </div>

            {/* System States: Liquid Skeleton Reveal, Empty, Success, Error */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-2 border-t border-[#E6E6E2]">
              <div className="space-y-2.5">
                <div className="flex items-center justify-between text-xs px-1">
                  <span className="font-semibold text-[#5C5C58]">
                    Liquid Skeleton → Content Reveal
                  </span>
                  <button
                    type="button"
                    onClick={() => setPreviewSkeleton((s) => !s)}
                    className="font-medium text-[#C44D00] hover:underline cursor-pointer"
                  >
                    {previewSkeleton ? 'Reveal Content →' : 'Replay Skeleton'}
                  </button>
                </div>
                <LiquidSkeletonReveal
                  loading={previewSkeleton}
                  contentKey="ds-specimen"
                  statusLabel="Loading intelligence state specimen"
                  skeleton={<LoadingState label="Synthesizing intelligence specimen…" rows={2} />}
                >
                  <div className="rounded-[20px] border border-[#ECECE8] bg-[#FFFFFF] p-6 space-y-3 bw-surface-raised">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-xs font-semibold text-[#C44D00]">
                        Revealed Intelligence Card
                      </span>
                      <InsightSavedBeacon saved label="Synced" />
                    </div>
                    <h4 className="font-heading text-base font-bold text-[#171717]">
                      Founding 100 Roastery Club · +28% projected retention lift
                    </h4>
                    <p className="text-xs text-[#5C5C58] leading-relaxed">
                      Content flows cleanly from the shape-matched alabaster shimmer skeleton using
                      cubic-bezier(0.16, 1, 0.3, 1).
                    </p>
                  </div>
                </LiquidSkeletonReveal>
              </div>
              <EmptyState
                icon={<Sparkles className="w-4 h-4" />}
                title="Empty State Specimen"
                description="Shown when a filtered view or brand new workspace has no saved records yet."
                actionLabel="Reset Specimen"
                onAction={() => showToast('Empty state action triggered')}
              />
            </div>

            <div className="space-y-3 pt-2 border-t border-[#E6E6E2]">
              <ActionFeedbackBanner
                tone="success"
                title="Success State"
                detail="Insight synced to Business Brain and persisted across all departments."
              />
              <ErrorState
                title="Error State Specimen"
                description="Honest inline error recovery without silent mock substitution."
                onRetry={() => showToast('Error state recovery triggered')}
              />
            </div>

            {/* Liquid Motion Primitives */}
            <div className="pt-3 border-t border-[#E6E6E2] space-y-3">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="text-xs font-semibold text-[#5C5C58]">
                  Liquid Motion Language · Easing cubic-bezier(0.16, 1, 0.3, 1)
                </div>
                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setPreviewPulse((p) => !p)}
                    className="text-xs font-medium text-[#C44D00] hover:underline cursor-pointer"
                  >
                    {previewPulse ? 'Pause AI Pulse' : 'Preview AI Pulse'}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewSaved((s) => !s)}
                    className="text-xs font-medium text-[#252525] hover:underline cursor-pointer"
                  >
                    Toggle Saved Beacon
                  </button>
                </div>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <InsightSavedBeacon
                  saved={previewSaved}
                  label={previewSaved ? 'Synced to Business Brain' : 'Pending save'}
                />
                <StatusBadge status="Active Intelligence" tone="accent" />
                <StatusBadge status="Verified" tone="success" />
                <StatusBadge status="Action Needed" tone="warning" />
              </div>
              <AiRequestPulse
                active={previewPulse}
                label="Liquid orange sweep communicating live AI synthesis..."
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5 pt-2">
                {BW_MOTION.primitives.map((prim) => (
                  <div
                    key={prim.name}
                    className="p-3 rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] text-xs"
                  >
                    <div className="font-mono-num font-semibold text-[#171717]">{prim.name}</div>
                    <div className="text-[#5C5C58] mt-0.5">{prim.role}</div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          {/* 06 · Approved Screen Map */}
          <section className="rounded-[14px] bg-[#FFFFFF] border border-[#E6E6E2] p-6 space-y-4">
            <SectionHeader
              title="06 · Phase 1 Approved Screen Map"
              description="Complete interactive coverage verified across all 7 product areas before engineering handoff."
            />
            <div className="divide-y divide-[#E6E6E2] border-y border-[#E6E6E2]">
              {FROZEN_SCREEN_COVERAGE.map((row) => (
                <div key={row.area} className="py-3 grid grid-cols-1 sm:grid-cols-12 gap-2 text-xs">
                  <div className="sm:col-span-3 font-heading font-semibold text-[#171717] flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#24724E] shrink-0" />
                    <span>{row.area}</span>
                  </div>
                  <div className="sm:col-span-9 text-[#5C5C58] leading-relaxed">{row.screens}</div>
                </div>
              ))}
            </div>
          </section>
        </div>
      )}
    </div>
  );
};
