/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type BillingCycle = 'monthly' | 'annual';

export type Currency = 'INR' | 'USD';

export type SubscriptionStatus =
  | 'incomplete'
  | 'pending_payment'
  | 'active'
  | 'past_due'
  | 'grace_period'
  | 'paused'
  | 'cancellation_scheduled'
  | 'cancelled'
  | 'expired';

export type PaymentStatus =
  | 'created'
  | 'pending'
  | 'processing'
  | 'successful'
  | 'failed'
  | 'cancelled'
  | 'expired'
  | 'refunded'
  | 'partially_refunded';

export type CreditPoolType =
  'welcome' | 'subscription' | 'purchased' | 'promotional' | 'adjustment';

export type CreditTransactionType =
  | 'WELCOME_GRANT'
  | 'SUBSCRIPTION_GRANT'
  | 'PURCHASED_GRANT'
  | 'PROMOTIONAL_GRANT'
  | 'ADJUSTMENT_GRANT'
  | 'CREDIT_RESERVATION'
  | 'CREDIT_SETTLEMENT'
  | 'CREDIT_RELEASE'
  | 'CREDIT_REFUND'
  | 'CREDIT_EXPIRATION';

export interface PlanPricing {
  monthly: number;
  annualMonthly: number; // Monthly equivalent when billed annually
  annualTotal: number;
  currency: Currency;
  savingsPct: number;
}

export interface PlanFeatureLimits {
  workspacesMax: number;
  teamSeatsMax: number;
  monthlyCredits: number;
  competitorsMax: number;
  brandAssetsMonthlyMax: number;
  activeAutomationsMax: number;
  ideaDossiersMonthlyMax: number | 'unlimited';
  integrationsMax: number | 'all';
  scheduledReports: boolean;
  priorityAiModels: boolean;
  exportPdfWhiteLabel: boolean;
}

export interface CommercialPlanDefinition {
  planId: string;
  name: string;
  tagline: string;
  description: string;
  isPopular?: boolean;
  displayOrder: number;
  pricing: Record<Currency, PlanPricing>;
  limits: PlanFeatureLimits;
  featuresList: string[];
  departmentAccess: string[];
  isActive: boolean;
}

export interface CreditPackDefinition {
  packId: string;
  name: string;
  tagline: string;
  creditQuantity: number;
  price: number;
  currency: Currency;
  isPopular?: boolean;
  displayOrder: number;
  isActive: boolean;
}

export interface MultiPoolCreditAccount {
  [key: string]: unknown;
  workspaceId: string;
  availableBalance: number;
  reservedCredits: number;
  pools: {
    welcome: number;
    subscription: number;
    purchased: number;
    promotional: number;
  };
  subscriptionRenewalDate?: string;
  promotionalExpiresAt?: string;
  lifetimeGranted: number;
  lifetimeConsumed: number;
  lastUpdated: string;
}

export interface EnhancedCreditLedgerEntry {
  [key: string]: unknown;
  txId: string;
  workspaceId: string;
  userId?: string;
  type: CreditTransactionType;
  pool: CreditPoolType;
  amount: number; // positive for credits added, negative for deducted
  balanceBefore: number;
  balanceAfter: number;
  featureId?: string;
  operationId?: string;
  reservationId?: string;
  idempotencyKey?: string;
  paymentId?: string;
  subscriptionId?: string;
  notes?: string;
  createdAt: string;
}

export interface SubscriptionRecord {
  [key: string]: unknown;
  subscriptionId: string;
  workspaceId: string;
  planId: string;
  planName: string;
  status: SubscriptionStatus;
  billingCycle: BillingCycle;
  currency: Currency;
  unitAmount: number;
  currentPeriodStart: string;
  currentPeriodEnd: string;
  cancelAtPeriodEnd: boolean;
  cancelledAt?: string;
  paymentMethod?: string;
  providerSubscriptionId?: string;
  providerCustomerId?: string;
  nextBillingDate?: string;
  gracePeriodEndsAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface PaymentRecord {
  [key: string]: unknown;
  paymentId: string;
  orderId: string;
  workspaceId: string;
  userId?: string;
  amount: number;
  currency: Currency;
  baseAmount: number;
  taxAmount: number; // 18% GST
  taxRate: number; // 0.18
  status: PaymentStatus;
  type: 'subscription' | 'credit_pack';
  itemReferenceId: string; // planId or packId
  providerReference?: string;
  providerPaymentId?: string;
  providerName: 'cashfree' | 'mitra' | 'razorpay' | 'manual';
  paymentMethod?: string;
  customerEmail: string;
  customerPhone?: string;
  customerGstin?: string;
  receiptUrl?: string;
  createdAt: string;
  completedAt?: string;
}

export interface TaxLineItem {
  type: 'CGST' | 'SGST' | 'IGST';
  rate: number;
  amount: number;
}

export interface InvoiceRecord {
  [key: string]: unknown;
  invoiceId: string;
  invoiceNumber: string; // e.g. "INV-2026-0001"
  workspaceId: string;
  paymentId: string;
  customerName: string;
  customerEmail: string;
  customerBillingAddress?: string;
  customerGstin?: string;
  sellerDetails: {
    name: string;
    address: string;
    gstin: string;
    pan: string;
  };
  lineItems: Array<{
    description: string;
    quantity: number;
    unitPrice: number;
    amount: number;
  }>;
  subtotal: number;
  taxes: TaxLineItem[];
  totalAmount: number;
  currency: Currency;
  paidAt: string;
  downloadUrl?: string;
  status: 'paid' | 'refunded' | 'void';
}

export interface RefundRecord {
  [key: string]: unknown;
  refundId: string;
  paymentId: string;
  workspaceId: string;
  amount: number;
  currency: Currency;
  reason: string;
  status: 'pending' | 'successful' | 'failed';
  providerRefundId?: string;
  creditsReversed?: number;
  approvedBy?: string;
  createdAt: string;
  completedAt?: string;
}

export interface EntitlementCheckResult {
  allowed: boolean;
  reason?: string;
  currentUsage?: number;
  limit?: number | 'unlimited';
  upgradeRequired?: boolean;
  recommendedPlan?: string;
}

export interface WebhookEventRecord {
  [key: string]: unknown;
  webhookId: string;
  provider: string;
  eventType: string;
  eventId: string;
  processed: boolean;
  processedAt?: string;
  error?: string;
  receivedAt: string;
}

export interface IBillingProvider {
  readonly id: string;
  readonly name: string;

  createCheckoutSession(params: {
    orderId: string;
    orderAmount: number;
    orderCurrency: Currency;
    customerEmail: string;
    customerPhone?: string;
    customerName: string;
    returnUrl: string;
    metadata?: Record<string, unknown>;
  }): Promise<{
    paymentSessionId: string;
    checkoutUrl: string;
    orderId: string;
  }>;

  verifyPayment(orderId: string): Promise<{
    isPaid: boolean;
    paymentStatus: PaymentStatus;
    providerReference: string;
    paymentMethod: string;
    amountPaid: number;
  }>;

  verifyWebhookSignature(payload: string, signature: string, timestamp?: string): boolean;

  processRefund(params: {
    orderId: string;
    refundAmount: number;
    refundReason: string;
    refundId: string;
  }): Promise<{
    success: boolean;
    providerRefundId: string;
    status: string;
  }>;
}
