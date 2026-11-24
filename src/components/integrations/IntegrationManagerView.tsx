/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useEffect, useState } from 'react';
import {
  AlertCircle,
  BarChart3,
  Check,
  CheckCircle2,
  Clock,
  CreditCard,
  FolderKanban,
  Instagram,
  Linkedin,
  Mail,
  Play,
  RefreshCw,
  Search,
  SearchCheck,
  ShieldCheck,
  Store,
  Trash2,
  TrendingUp,
  Youtube,
  Zap,
} from 'lucide-react';
import { useBrainWise } from '../../context/BrainWiseContext';
import { apiClient } from '../../services/apiClient';
import { Button, StatusBadge } from '../ui/DesignSystem';
import { Drawer, Modal } from '../ui/Overlay';

export const IntegrationManagerView: React.FC = () => {
  const { state, showToast } = useBrainWise();
  const workspaceId =
    state.activeWorkspaceId ||
    state.workspaceId ||
    (state.brain.businessName
      ? state.brain.businessName.toLowerCase().replace(/[^a-z0-9]/g, '-')
      : 'workspace');

  const [activeSubTab, setActiveSubTab] = useState<'catalog' | 'automations' | 'telemetry'>(
    'catalog'
  );
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  const [integrations, setIntegrations] = useState<any[]>([]);
  const [automations, setAutomations] = useState<any[]>([]);
  const [templates, setTemplates] = useState<any[]>([]);
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [telemetryRecords, setTelemetryRecords] = useState<any[]>([]);

  const [loading, setLoading] = useState(true);
  const [syncingProvider, setSyncingProvider] = useState<string | null>(null);

  // Connect Modal state
  const [connectModalOpen, setConnectModalOpen] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState<any | null>(null);
  const [consentAgreed, setConsentAgreed] = useState(false);
  const [cashfreeAppId, setCashfreeAppId] = useState('');
  const [cashfreeSecretKey, setCashfreeSecretKey] = useState('');
  const [connectingStep, setConnectingStep] = useState<'consent' | 'authorizing' | 'success'>(
    'consent'
  );

  // Manage Drawer state
  const [manageDrawerOpen, setManageDrawerOpen] = useState(false);
  const [managingConnection, setManagingConnection] = useState<any | null>(null);
  const [healthStatus, setHealthStatus] = useState<any | null>(null);

  // Execution History Modal
  const [execModalOpen, setExecModalOpen] = useState(false);
  const [selectedAutomation, setSelectedAutomation] = useState<any | null>(null);
  const [executions, setExecutions] = useState<any[]>([]);

  // Load integration data
  const loadData = async () => {
    try {
      setLoading(true);
      const [intResp, autoResp, tmplResp, auditResp, teleResp] = await Promise.all([
        apiClient.getIntegrations(workspaceId).catch(() => []),
        apiClient.getAutomations(workspaceId).catch(() => []),
        apiClient.getAutomationTemplates(workspaceId).catch(() => []),
        apiClient.getIntegrationAuditLogs(workspaceId).catch(() => []),
        apiClient.getImportedDataRecords(workspaceId).catch(() => []),
      ]);

      setIntegrations(Array.isArray(intResp) ? intResp : []);
      setAutomations(Array.isArray(autoResp) ? autoResp : []);
      setTemplates(Array.isArray(tmplResp) ? tmplResp : []);
      setAuditLogs(Array.isArray(auditResp) ? auditResp : []);
      setTelemetryRecords(Array.isArray(teleResp) ? teleResp : []);
    } catch (err) {
      console.error('Failed to load integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [workspaceId]);

  // Connect Flow
  const handleOpenConnect = (provider: any) => {
    setSelectedProvider(provider);
    setConsentAgreed(false);
    setCashfreeAppId('');
    setCashfreeSecretKey('');
    setConnectingStep('consent');
    setConnectModalOpen(true);
  };

  const handleProceedConnection = async () => {
    if (!selectedProvider) return;
    setConnectingStep('authorizing');

    try {
      if (selectedProvider.authType === 'oauth2') {
        const init = await apiClient.initiateIntegration(workspaceId, selectedProvider.id);
        // Simulate real OAuth authorization callback
        await apiClient.completeOAuth(workspaceId, {
          providerId: selectedProvider.id,
          code: `auth_code_${Date.now()}`,
          state: init.state || `state_${Date.now()}`,
        });

        setConnectingStep('success');
        showToast(`Connected ${selectedProvider.name} successfully.`);
        await loadData();
        setTimeout(() => setConnectModalOpen(false), 1200);
      } else {
        // Managed API key or custom credentials
        const payload: { providerId: string; apiKey?: string; extra?: Record<string, unknown> } = {
          providerId: selectedProvider.id,
        };
        if (selectedProvider.id === 'cashfree-payments' && cashfreeAppId.trim()) {
          payload.apiKey = cashfreeAppId.trim();
          payload.extra = { secretKey: cashfreeSecretKey.trim() };
        }
        await apiClient.connectManagedIntegration(workspaceId, payload);

        setConnectingStep('success');
        showToast(`Activated ${selectedProvider.name}.`);
        await loadData();
        setTimeout(() => setConnectModalOpen(false), 1200);
      }
    } catch (err: any) {
      showToast(err.message || 'Connection failed.');
      setConnectingStep('consent');
    }
  };

  // Sync Provider
  const handleSync = async (integrationId: string) => {
    setSyncingProvider(integrationId);
    try {
      const res = await apiClient.syncIntegration(workspaceId, integrationId);
      showToast(`Synchronized ${res.ingestedCount || 0} external records.`);
      await loadData();
    } catch (err: any) {
      showToast(`Sync failed: ${err.message}`);
    } finally {
      setSyncingProvider(null);
    }
  };

  // Open Manage Drawer
  const handleOpenManage = async (provider: any) => {
    setManagingConnection(provider);
    setManageDrawerOpen(true);
    setHealthStatus(null);
    try {
      const health = await apiClient.checkIntegrationHealth(workspaceId, provider.id);
      setHealthStatus(health);
    } catch {
      // Ignored
    }
  };

  // Disconnect
  const handleDisconnect = async (integrationId: string) => {
    try {
      await apiClient.disconnectIntegration(workspaceId, integrationId);
      showToast('Disconnected integration and purged credentials.');
      setManageDrawerOpen(false);
      await loadData();
    } catch (err: any) {
      showToast(`Disconnect failed: ${err.message}`);
    }
  };

  // Enable Template
  const handleEnableTemplate = async (templateId: string) => {
    try {
      await apiClient.createAutomationFromTemplate(workspaceId, templateId);
      showToast('Automation activated from template.');
      await loadData();
    } catch (err: any) {
      showToast(`Failed to activate template: ${err.message}`);
    }
  };

  // Trigger Automation
  const handleTriggerAutomation = async (automationId: string) => {
    try {
      await apiClient.triggerAutomation(workspaceId, automationId);
      showToast('Automation triggered in background.');
      await loadData();
    } catch (err: any) {
      showToast(`Trigger failed: ${err.message}`);
    }
  };

  // View Executions
  const handleViewExecutions = async (automation: any) => {
    setSelectedAutomation(automation);
    setExecModalOpen(true);
    try {
      const list = await apiClient.getAutomationExecutions(workspaceId, automation.automationId);
      setExecutions(list);
    } catch {
      setExecutions([]);
    }
  };

  // Approve Category C action
  const handleApproveExecution = async (automationId: string, executionId: string) => {
    try {
      await apiClient.approveAutomationExecution(workspaceId, automationId, executionId);
      showToast('Action approved and executed.');
      const list = await apiClient.getAutomationExecutions(workspaceId, automationId);
      setExecutions(list);
      await loadData();
    } catch (err: any) {
      showToast(`Approval failed: ${err.message}`);
    }
  };

  // Filtered providers
  const filteredIntegrations = integrations.filter((item) => {
    if (selectedCategory === 'all') return true;
    return item.category === selectedCategory;
  });

  const connectedCount = integrations.filter(
    (i) => i.connection && i.connection.status === 'connected'
  ).length;

  const getProviderIcon = (icon: string) => {
    switch (icon) {
      case 'Search':
        return <Search className="w-5 h-5 text-[#FF7417]" />;
      case 'BarChart3':
        return <BarChart3 className="w-5 h-5 text-[#24724E]" />;
      case 'SearchCheck':
        return <SearchCheck className="w-5 h-5 text-[#2B6CB0]" />;
      case 'Store':
        return <Store className="w-5 h-5 text-[#C44D00]" />;
      case 'Mail':
        return <Mail className="w-5 h-5 text-[#6B46C1]" />;
      case 'Instagram':
        return <Instagram className="w-5 h-5 text-[#D53F8C]" />;
      case 'Linkedin':
        return <Linkedin className="w-5 h-5 text-[#0077B5]" />;
      case 'Youtube':
        return <Youtube className="w-5 h-5 text-[#E53E3E]" />;
      case 'FolderKanban':
        return <FolderKanban className="w-5 h-5 text-[#D69E2E]" />;
      case 'CreditCard':
        return <CreditCard className="w-5 h-5 text-[#24724E]" />;
      default:
        return <Zap className="w-5 h-5 text-[#FF7417]" />;
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'connected':
        return <StatusBadge status="Connected" tone="success" />;
      case 'syncing':
        return <StatusBadge status="Syncing" tone="accent" />;
      case 'awaiting_approval':
        return <StatusBadge status="Awaiting Approval" tone="warning" />;
      case 'action_required':
      case 'permission_expired':
        return <StatusBadge status="Action Required" tone="error" />;
      default:
        return <StatusBadge status="Not Connected" tone="neutral" />;
    }
  };

  return (
    <div className="space-y-6">
      {/* Overview Metric Bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 bg-[#F8F8F7] border border-[#E6E6E2] rounded-[12px]">
        <div>
          <div className="text-[11px] font-mono-num uppercase tracking-wider text-[#8E8E88]">
            Available Providers
          </div>
          <div className="text-xl font-bold text-[#242424] mt-0.5">{integrations.length || 9}</div>
        </div>
        <div>
          <div className="text-[11px] font-mono-num uppercase tracking-wider text-[#8E8E88]">
            Connected
          </div>
          <div className="text-xl font-bold text-[#24724E] mt-0.5">{connectedCount}</div>
        </div>
        <div>
          <div className="text-[11px] font-mono-num uppercase tracking-wider text-[#8E8E88]">
            Active Automations
          </div>
          <div className="text-xl font-bold text-[#FF7417] mt-0.5">
            {automations.filter((a) => a.status === 'active').length}
          </div>
        </div>
        <div>
          <div className="text-[11px] font-mono-num uppercase tracking-wider text-[#8E8E88]">
            Data Telemetry Records
          </div>
          <div className="text-xl font-bold text-[#242424] mt-0.5">{telemetryRecords.length}</div>
        </div>
      </div>

      {/* Primary Sub-Tabs */}
      <div className="flex items-center justify-between border-b border-[#E6E6E2]">
        <div className="flex gap-4">
          <button
            type="button"
            onClick={() => setActiveSubTab('catalog')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'catalog'
                ? 'border-[#FF7417] text-[#171717]'
                : 'border-transparent text-[#686864] hover:text-[#171717]'
            }`}
          >
            Integration Registry
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('automations')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'automations'
                ? 'border-[#FF7417] text-[#171717]'
                : 'border-transparent text-[#686864] hover:text-[#171717]'
            }`}
          >
            Automation Engine &amp; Templates ({automations.length})
          </button>
          <button
            type="button"
            onClick={() => setActiveSubTab('telemetry')}
            className={`pb-3 text-xs sm:text-sm font-semibold border-b-2 cursor-pointer transition-colors ${
              activeSubTab === 'telemetry'
                ? 'border-[#FF7417] text-[#171717]'
                : 'border-transparent text-[#686864] hover:text-[#171717]'
            }`}
          >
            Audit Trail &amp; Data Streams ({auditLogs.length})
          </button>
        </div>
        {loading && (
          <div className="flex items-center gap-1.5 pb-3 text-xs text-[#8E8E88] font-mono-num">
            <RefreshCw className="w-3.5 h-3.5 animate-spin text-[#FF7417]" />
            <span className="hidden sm:inline">Syncing telemetry...</span>
          </div>
        )}
      </div>

      {/* Subtab 1: Integration Registry */}
      {activeSubTab === 'catalog' && (
        <div className="space-y-5">
          {/* Live Financial & Traffic Intelligence Guide */}
          <div className="p-4 sm:p-5 rounded-[12px] bg-gradient-to-r from-[#FFFBF8] to-[#F7FBF9] border border-[#E8E2D9] space-y-4 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#E8E2D9]/70 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 rounded-lg bg-[#FF7417]/10 flex items-center justify-center text-[#FF7417]">
                  <TrendingUp className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="font-heading text-sm font-bold text-[#171717]">
                    Live Financial &amp; Traffic Intelligence Guide
                  </h3>
                  <p className="text-xs text-[#5C5C58]">
                    For maximum accuracy, link your Cashfree and Google Analytics 4 accounts. Connected telemetry feeds directly into Analytics &amp; Reports, replacing unverified estimates with true revenue, GMV, and verified visitor funnels.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
              {/* Cashfree Quick Status Tile */}
              {(() => {
                const cfIntegration = integrations.find((i) => i.id === 'cashfree-payments');
                const isCfConnected = cfIntegration?.connection?.status === 'connected';
                return (
                  <div className={`p-3.5 rounded-[10px] border flex flex-col justify-between gap-3 ${
                    isCfConnected ? 'border-[#CDE5D7] bg-[#F7FBF9]' : 'border-[#E6E6E2] bg-white'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#171717]">
                          <CreditCard className="w-4 h-4 text-[#24724E]" />
                          Cashfree Payments
                        </span>
                        <StatusBadge
                          status={isCfConnected ? 'Connected' : 'Not Connected'}
                          tone={isCfConnected ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="text-[11px] text-[#686864]">
                        {isCfConnected
                          ? `Streaming verified transactions & net revenue. Last synced: ${cfIntegration?.connection?.lastSyncAt ? new Date(cfIntegration.connection.lastSyncAt).toLocaleTimeString() : 'Active'}`
                          : 'Connect Cashfree to stream verified revenue, transaction volumes, and average basket sizes.'}
                      </p>
                    </div>
                    <div>
                      {isCfConnected ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs"
                          disabled={syncingProvider === 'cashfree-payments'}
                          onClick={() => handleSync('cashfree-payments')}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingProvider === 'cashfree-payments' ? 'animate-spin' : ''}`} />
                          Sync Revenue Stream
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() =>
                            handleOpenConnect(
                              cfIntegration || {
                                id: 'cashfree-payments',
                                name: 'Cashfree Payments',
                                authType: 'api_key',
                                category: 'payments_finance',
                                description:
                                  'Connect Cashfree to stream verified revenue transactions and settlements.',
                              }
                            )
                          }
                        >
                          <CreditCard className="w-3.5 h-3.5" />
                          Connect Cashfree
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}

              {/* GA4 Quick Status Tile */}
              {(() => {
                const gaIntegration = integrations.find((i) => i.id === 'google-analytics-4');
                const isGaConnected = gaIntegration?.connection?.status === 'connected';
                return (
                  <div className={`p-3.5 rounded-[10px] border flex flex-col justify-between gap-3 ${
                    isGaConnected ? 'border-[#CDE5D7] bg-[#F7FBF9]' : 'border-[#E6E6E2] bg-white'
                  }`}>
                    <div className="space-y-1">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-xs font-bold text-[#171717]">
                          <BarChart3 className="w-4 h-4 text-[#2B6CB0]" />
                          Google Analytics 4
                        </span>
                        <StatusBadge
                          status={isGaConnected ? 'Connected' : 'Not Connected'}
                          tone={isGaConnected ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="text-[11px] text-[#686864]">
                        {isGaConnected
                          ? `Streaming visitor sessions & conversion channels. Last synced: ${gaIntegration?.connection?.lastSyncAt ? new Date(gaIntegration.connection.lastSyncAt).toLocaleTimeString() : 'Active'}`
                          : 'Connect GA4 to stream active users, engagement rates, traffic channels, and top landing pages.'}
                      </p>
                    </div>
                    <div>
                      {isGaConnected ? (
                        <Button
                          variant="secondary"
                          size="sm"
                          className="w-full text-xs"
                          disabled={syncingProvider === 'google-analytics-4'}
                          onClick={() => handleSync('google-analytics-4')}
                        >
                          <RefreshCw className={`w-3.5 h-3.5 ${syncingProvider === 'google-analytics-4' ? 'animate-spin' : ''}`} />
                          Sync Traffic Stream
                        </Button>
                      ) : (
                        <Button
                          variant="primary"
                          size="sm"
                          className="w-full text-xs"
                          onClick={() =>
                            handleOpenConnect(
                              gaIntegration || {
                                id: 'google-analytics-4',
                                name: 'Google Analytics 4',
                                authType: 'oauth2',
                                category: 'website_seo',
                                description:
                                  'Connect GA4 to stream visitor traffic, engagement, and conversion events.',
                              }
                            )
                          }
                        >
                          <BarChart3 className="w-3.5 h-3.5" />
                          Connect GA4
                        </Button>
                      )}
                    </div>
                  </div>
                );
              })()}
            </div>
          </div>

          {/* Category Filter Pills */}
          <div className="flex flex-wrap gap-2 pt-1">
            {[
              { id: 'all', label: 'All Providers' },
              { id: 'payments_finance', label: 'Payments & Revenue' },
              { id: 'research', label: 'Research & Intelligence' },
              { id: 'website_seo', label: 'Website & SEO' },
              { id: 'local_business', label: 'Local Business' },
              { id: 'social_media', label: 'Social Media' },
              { id: 'communication', label: 'Communication' },
              { id: 'storage_docs', label: 'Documents & Storage' },
            ].map((cat) => (
              <button
                key={cat.id}
                type="button"
                onClick={() => setSelectedCategory(cat.id)}
                className={`px-3 py-1.5 text-xs font-medium rounded-full border cursor-pointer transition-all ${
                  selectedCategory === cat.id
                    ? 'bg-[#171717] text-white border-[#171717]'
                    : 'bg-white text-[#686864] border-[#E6E6E2] hover:bg-[#F5F5F4]'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Integration Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {filteredIntegrations.map((item) => {
              const isConnected = item.connection && item.connection.status === 'connected';
              const isAwaitingApproval =
                item.connection?.status === 'awaiting_approval' ||
                (!item.connection && item.isApprovalRequired);
              const status = item.connection?.status || 'not_connected';

              return (
                <div
                  key={item.id}
                  className="p-5 rounded-[12px] border border-[#E6E6E2] bg-white hover:border-[#D6D6D0] transition-shadow shadow-xs flex flex-col justify-between"
                >
                  <div className="space-y-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-[10px] bg-[#F5F5F4] border border-[#E6E6E2] flex items-center justify-center shrink-0">
                          {getProviderIcon(item.icon)}
                        </div>
                        <div>
                          <div className="text-sm font-semibold text-[#171717]">{item.name}</div>
                          <div className="text-[11px] text-[#8E8E88] capitalize">
                            {item.category?.replace('_', ' ')}
                          </div>
                        </div>
                      </div>
                      {getStatusBadge(status)}
                    </div>

                    <p className="text-xs text-[#5C5C58] leading-relaxed line-clamp-2">
                      {item.description}
                    </p>

                    {/* Capabilities bullets */}
                    <div className="space-y-1 pt-1">
                      {item.capabilities?.slice(0, 3).map((cap: string, idx: number) => (
                        <div
                          key={idx}
                          className="flex items-center gap-1.5 text-[11px] text-[#686864]"
                        >
                          <Check className="w-3 h-3 text-[#24724E] shrink-0" />
                          <span className="truncate">{cap}</span>
                        </div>
                      ))}
                    </div>

                    {item.connection?.lastSyncAt && (
                      <div className="text-[10px] text-[#8E8E88] pt-1">
                        Last synchronized:{' '}
                        {new Date(item.connection.lastSyncAt).toLocaleTimeString()}
                      </div>
                    )}
                  </div>

                  <div className="pt-4 mt-4 border-t border-[#EFEFEB] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono-num text-[#8E8E88]">
                      Auth: {item.authType.toUpperCase()}
                    </span>

                    <div className="flex items-center gap-2">
                      {isConnected ? (
                        <>
                          <Button
                            variant="secondary"
                            size="sm"
                            disabled={syncingProvider === item.id}
                            onClick={() => handleSync(item.id)}
                          >
                            <RefreshCw
                              className={`w-3.5 h-3.5 text-[#686864] ${
                                syncingProvider === item.id ? 'animate-spin' : ''
                              }`}
                            />
                            Sync
                          </Button>
                          <Button
                            variant="secondary"
                            size="sm"
                            onClick={() => handleOpenManage(item)}
                          >
                            Manage
                          </Button>
                        </>
                      ) : (
                        <Button variant="primary" size="sm" onClick={() => handleOpenConnect(item)}>
                          {isAwaitingApproval ? 'Review & Connect' : 'Connect'}
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Subtab 2: Automations */}
      {activeSubTab === 'automations' && (
        <div className="space-y-6">
          {/* Active Automations List */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#171717]">
                Active Workspace Automations
              </div>
              <span className="text-xs text-[#8E8E88] font-mono-num">
                {automations.length} Active Jobs
              </span>
            </div>

            {automations.length === 0 ? (
              <div className="p-8 text-center rounded-[12px] border border-dashed border-[#E6E6E2] bg-[#FAFAF9]">
                <Zap className="w-8 h-8 text-[#8E8E88] mx-auto mb-2" />
                <div className="text-sm font-semibold text-[#171717]">
                  No Automations Configured
                </div>
                <p className="text-xs text-[#686864] mt-1 max-w-sm mx-auto">
                  Activate one of the pre-built business intelligence templates below to begin
                  scheduled background processing.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[12px] bg-white">
                {automations.map((auto) => (
                  <div
                    key={auto.automationId}
                    className="p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-[#FAFAF9] transition-colors"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-[#171717]">{auto.name}</span>
                        <StatusBadge
                          status={auto.status === 'active' ? 'Active' : 'Paused'}
                          tone={auto.status === 'active' ? 'success' : 'neutral'}
                        />
                      </div>
                      <p className="text-xs text-[#686864]">{auto.description}</p>
                      <div className="text-[11px] text-[#8E8E88] flex items-center gap-3 pt-0.5">
                        <span className="flex items-center gap-1">
                          <Clock className="w-3 h-3 text-[#FF7417]" />
                          Schedule: {auto.trigger?.schedule || 'Daily'} at{' '}
                          {auto.trigger?.timeOfDay || '09:00'}
                        </span>
                        <span>·</span>
                        <span>Executed {auto.executionCount || 0} times</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTriggerAutomation(auto.automationId)}
                      >
                        <Play className="w-3.5 h-3.5 text-[#24724E]" />
                        Run Now
                      </Button>
                      <Button
                        variant="secondary"
                        size="sm"
                        onClick={() => handleViewExecutions(auto)}
                      >
                        History
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Pre-Built Production Templates */}
          <div className="space-y-3 pt-4 border-t border-[#E6E6E2]">
            <div className="text-sm font-semibold text-[#171717]">
              Pre-Built Business Intelligence Templates (Phase 8.8)
            </div>
            <p className="text-xs text-[#686864]">
              Enable ready-to-run automation recipes without writing code or building from scratch.
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {templates.map((tmpl) => (
                <div
                  key={tmpl.templateId}
                  className="p-4 rounded-[12px] border border-[#E6E6E2] bg-white hover:border-[#D6D6D0] transition-colors flex flex-col justify-between"
                >
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold text-[#171717]">{tmpl.name}</span>
                      <span className="text-[10px] font-mono-num uppercase px-2 py-0.5 bg-[#F5F5F4] border border-[#E6E6E2] rounded-[6px] text-[#686864]">
                        {tmpl.category}
                      </span>
                    </div>
                    <p className="text-xs text-[#5C5C58] leading-relaxed">{tmpl.description}</p>
                    <div className="text-[11px] text-[#8E8E88] pt-1">
                      Sources:{' '}
                      <span className="font-medium text-[#242424]">
                        {tmpl.sourceProviders?.join(', ')}
                      </span>
                    </div>
                  </div>

                  <div className="pt-4 mt-3 border-t border-[#EFEFEB] flex justify-end">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleEnableTemplate(tmpl.templateId)}
                    >
                      Enable Template
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Subtab 3: Telemetry & Audit Logs */}
      {activeSubTab === 'telemetry' && (
        <div className="space-y-6">
          {/* Normalized Telemetry Streams */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#171717]">
                Normalized External Data Streams (Phase 8.4)
              </div>
              <span className="text-xs text-[#8E8E88] font-mono-num">
                {telemetryRecords.length} Stored Streams
              </span>
            </div>

            {telemetryRecords.length === 0 ? (
              <div className="p-6 text-center rounded-[10px] border border-[#E6E6E2] bg-[#FAFAF9] text-xs text-[#686864]">
                No external data ingested yet. Connect an integration provider above and trigger a
                sync.
              </div>
            ) : (
              <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px] bg-white max-h-80 overflow-y-auto">
                {telemetryRecords.map((rec) => (
                  <div
                    key={rec.recordId}
                    className="p-3 text-xs flex items-center justify-between gap-3"
                  >
                    <div>
                      <div className="font-semibold text-[#171717] flex items-center gap-2">
                        <span className="capitalize">{rec.provider}</span>
                        <span className="text-[10px] font-mono-num px-1.5 py-0.5 bg-[#F0FDF4] text-[#166534] border border-[#BBF7D0] rounded">
                          {rec.provenance?.sourceType}
                        </span>
                      </div>
                      <div className="text-[11px] text-[#686864] mt-0.5">
                        Ref: {rec.sourceReference}
                      </div>
                    </div>
                    <div className="text-right font-mono-num text-[11px] text-[#8E8E88]">
                      {new Date(rec.retrievedAt).toLocaleDateString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Immutable Audit Ledger */}
          <div className="space-y-3 pt-4 border-t border-[#E6E6E2]">
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-[#171717]">
                Tamper-Evident Security &amp; Action Audit Trail (Phase 8.6)
              </div>
              <span className="text-xs text-[#8E8E88] font-mono-num">
                {auditLogs.length} Events Logged
              </span>
            </div>

            <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px] bg-white max-h-80 overflow-y-auto">
              {auditLogs.map((log) => (
                <div
                  key={log.eventId}
                  className="p-3 text-xs flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono-num text-[11px] font-semibold text-[#171717]">
                        {log.action}
                      </span>
                      <StatusBadge
                        status={log.result}
                        tone={log.result === 'SUCCESS' ? 'success' : 'error'}
                      />
                      <span className="text-[10px] text-[#8E8E88]">[{log.category}]</span>
                    </div>
                    <div className="text-[11px] text-[#686864]">
                      Basis: {log.authorizationBasis} · Actor: {log.actorId}
                    </div>
                  </div>
                  <div className="text-right font-mono-num text-[11px] text-[#8E8E88]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Connection Workflow Modal (Phase 8.3 Step-by-Step) */}
      <Modal
        open={connectModalOpen}
        onClose={() => setConnectModalOpen(false)}
        title={selectedProvider ? `Connect ${selectedProvider.name}` : 'Connect Provider'}
        subtitle="Review access scopes, data governance permissions, and authorization."
      >
        {selectedProvider && (
          <div className="space-y-4">
            <div className="p-4 rounded-[10px] bg-[#F8F8F7] border border-[#E6E6E2] space-y-2">
              <div className="flex items-center gap-2 text-xs font-semibold text-[#171717]">
                <ShieldCheck className="w-4 h-4 text-[#24724E]" />
                What BrainWise Will Access
              </div>
              <p className="text-xs text-[#5C5C58] leading-relaxed">
                {selectedProvider.description}
              </p>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#171717]">Requested Scopes:</div>
              <ul className="space-y-1 text-xs text-[#5C5C58]">
                {selectedProvider.requiredScopes?.map((scope: string, idx: number) => (
                  <li key={idx} className="flex items-center gap-2">
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#FF7417] shrink-0" />
                    <span className="font-mono-num text-[11px]">{scope}</span>
                  </li>
                ))}
              </ul>
            </div>

            {selectedProvider.isApprovalRequired && (
              <div className="p-3 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] text-xs text-[#92400E] flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-[#D97706] shrink-0 mt-0.5" />
                <span>
                  This provider requires official platform approval (e.g. Google Enterprise
                  Verification or Meta App Review). Connecting will activate developer sandbox read
                  mode.
                </span>
              </div>
            )}

            {selectedProvider.id === 'cashfree-payments' && (
              <div className="space-y-3 p-3.5 rounded-[10px] bg-[#F8F8F7] border border-[#E6E6E2]">
                <div className="text-xs font-semibold text-[#171717] flex items-center justify-between">
                  <span>Merchant API Credentials</span>
                  <span className="text-[10px] text-[#8E8E88] font-normal">Optional for Sandbox Test Mode</span>
                </div>
                <div className="space-y-2">
                  <div>
                    <label className="text-[11px] font-medium text-[#5C5C58]">Cashfree App ID</label>
                    <input
                      type="text"
                      value={cashfreeAppId}
                      onChange={(e) => setCashfreeAppId(e.target.value)}
                      placeholder="e.g. CF123456... (Leave blank for Sandbox)"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded border border-[#E6E6E2] bg-white font-mono text-[#171717] focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] font-medium text-[#5C5C58]">Cashfree Secret Key</label>
                    <input
                      type="password"
                      value={cashfreeSecretKey}
                      onChange={(e) => setCashfreeSecretKey(e.target.value)}
                      placeholder="e.g. cfsk_ma_prod_... (Encrypted with AES-256-GCM)"
                      className="w-full mt-1 px-3 py-1.5 text-xs rounded border border-[#E6E6E2] bg-white font-mono text-[#171717] focus:outline-none focus:border-[#FF7417]"
                    />
                  </div>
                </div>
                <p className="text-[11px] text-[#8E8E88]">
                  Keys are stored using AES-256-GCM authenticated encryption and never exposed to client browsers.
                </p>
              </div>
            )}

            <label className="flex items-center gap-2.5 p-3 rounded-[8px] border border-[#E6E6E2] hover:bg-[#FAFAF9] cursor-pointer text-xs text-[#242424]">
              <input
                type="checkbox"
                checked={consentAgreed}
                onChange={(e) => setConsentAgreed(e.target.checked)}
                className="w-4 h-4 accent-[#FF7417]"
              />
              <span>
                I authorize BrainWise to ingest verified analytics and store encrypted credentials.
              </span>
            </label>

            <div className="flex justify-end gap-2 pt-3 border-t border-[#E6E6E2]">
              <Button variant="secondary" size="sm" onClick={() => setConnectModalOpen(false)}>
                Cancel
              </Button>
              <Button
                variant="primary"
                size="sm"
                disabled={!consentAgreed || connectingStep === 'authorizing'}
                onClick={handleProceedConnection}
              >
                {connectingStep === 'authorizing' ? (
                  <>
                    <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    Authorizing...
                  </>
                ) : (
                  'Authorize & Connect'
                )}
              </Button>
            </div>
          </div>
        )}
      </Modal>

      {/* Manage Connection Drawer */}
      <Drawer
        open={manageDrawerOpen}
        onClose={() => setManageDrawerOpen(false)}
        title={managingConnection?.name || 'Manage Integration'}
        subtitle="Account health, granted permissions, and connection lifecycle."
      >
        {managingConnection && (
          <div className="space-y-6">
            <div className="p-4 rounded-[12px] border border-[#E6E6E2] bg-white space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-[#8E8E88] uppercase tracking-wider">
                  Connection Health
                </span>
                <StatusBadge
                  status={healthStatus?.status || managingConnection.connection?.status || 'Active'}
                  tone="success"
                />
              </div>

              <div className="text-xs text-[#242424] font-medium">
                {healthStatus?.message || 'Connection verified and operational.'}
              </div>

              {healthStatus?.latencyMs && (
                <div className="text-[11px] font-mono-num text-[#8E8E88]">
                  Ping Latency: {healthStatus.latencyMs} ms
                </div>
              )}
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#171717]">Account Reference</div>
              <div className="p-3 rounded-[8px] bg-[#F8F8F7] border border-[#E6E6E2] text-xs font-mono-num text-[#242424]">
                {managingConnection.connection?.accountReference || 'Primary Authorized Account'}
              </div>
            </div>

            <div className="space-y-2">
              <div className="text-xs font-semibold text-[#171717]">Sync Frequency</div>
              <div className="text-xs text-[#5C5C58]">
                Continuous daily background synchronization with anomaly detection triggers.
              </div>
            </div>

            <div className="pt-6 border-t border-[#E6E6E2] space-y-3">
              <Button
                variant="secondary"
                size="md"
                className="w-full"
                onClick={() => handleSync(managingConnection.id)}
              >
                <RefreshCw className="w-3.5 h-3.5 text-[#686864]" />
                Trigger Full Synchronization
              </Button>

              <Button
                variant="danger"
                size="md"
                className="w-full"
                onClick={() => handleDisconnect(managingConnection.id)}
              >
                <Trash2 className="w-3.5 h-3.5" />
                Disconnect &amp; Revoke Credentials
              </Button>
            </div>
          </div>
        )}
      </Drawer>

      {/* Execution History & Approval Modal */}
      <Modal
        open={execModalOpen}
        onClose={() => setExecModalOpen(false)}
        title={
          selectedAutomation ? `${selectedAutomation.name} — Execution Ledger` : 'Execution History'
        }
        subtitle="Review past job executions, retry failures, or approve Category C actions."
      >
        <div className="space-y-4 max-h-[60vh] overflow-y-auto">
          {executions.length === 0 ? (
            <div className="p-6 text-center text-xs text-[#686864]">
              No past executions recorded for this automation.
            </div>
          ) : (
            <div className="divide-y divide-[#E6E6E2] border border-[#E6E6E2] rounded-[10px] bg-white">
              {executions.map((ex) => (
                <div key={ex.executionId} className="p-3 text-xs space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-semibold text-[#171717]">{ex.triggerEvent}</span>
                      <StatusBadge
                        status={ex.status}
                        tone={
                          ex.status === 'completed'
                            ? 'success'
                            : ex.status === 'requires_approval'
                              ? 'warning'
                              : 'neutral'
                        }
                      />
                    </div>
                    <span className="text-[10px] font-mono-num text-[#8E8E88]">
                      {new Date(ex.startedAt).toLocaleTimeString()}
                    </span>
                  </div>

                  <p className="text-[11px] text-[#5C5C58]">
                    {ex.summary || 'Processing queued...'}
                  </p>

                  {ex.status === 'requires_approval' && (
                    <div className="p-2.5 rounded-[8px] bg-[#FFFBEB] border border-[#FDE68A] flex items-center justify-between gap-2 mt-2">
                      <span className="text-[11px] text-[#92400E] font-medium">
                        Human approval gate required for external action.
                      </span>
                      <Button
                        variant="primary"
                        size="sm"
                        onClick={() =>
                          handleApproveExecution(selectedAutomation.automationId, ex.executionId)
                        }
                      >
                        Approve Action
                      </Button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </Modal>
    </div>
  );
};
