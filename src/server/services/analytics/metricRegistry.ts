/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BusinessModelType,
  MetricCategory,
  MetricDefinition,
} from './metricTypes';

export class MetricRegistry {
  private static instance: MetricRegistry;
  private readonly definitions: Map<string, MetricDefinition> = new Map();

  private constructor() {
    this.registerAllCanonicalMetrics();
  }

  public static getInstance(): MetricRegistry {
    if (!MetricRegistry.instance) {
      MetricRegistry.instance = new MetricRegistry();
    }
    return MetricRegistry.instance;
  }

  public get(metricId: string): MetricDefinition | undefined {
    return this.definitions.get(metricId);
  }

  public getAll(): MetricDefinition[] {
    return Array.from(this.definitions.values());
  }

  public getByCategory(category: MetricCategory): MetricDefinition[] {
    return this.getAll().filter((m) => m.category === category);
  }

  public getForBusinessModel(model: BusinessModelType): MetricDefinition[] {
    return this.getAll().filter(
      (m) =>
        m.applicableBusinessModels.includes('GENERAL') ||
        m.applicableBusinessModels.includes(model)
    );
  }

  private register(def: MetricDefinition): void {
    if (this.definitions.has(def.metricId)) {
      throw new Error(`Duplicate metric registered: ${def.metricId}`);
    }
    this.definitions.set(def.metricId, def);
  }

  private registerAllCanonicalMetrics(): void {
    // ==========================================
    // 1. FINANCIAL METRICS
    // ==========================================
    this.register({
      metricId: 'REV_GROSS',
      canonicalName: 'Gross Revenue',
      description: 'Total unadjusted monetary transaction volume booked before discounts, taxes, or refunds.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES', 'AGENCY', 'RETAIL', 'STARTUP'],
      unit: 'CURRENCY',
      formula: 'Sum(Transaction Gross Amounts)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['PAYMENT_GATEWAY', 'STRIPE', 'SHOPIFY', 'BANK_FEED', 'INVOICE_LEDGER'],
      inclusionCriteria: ['Completed or settled transactions', 'Pending non-failed captures within period'],
      exclusionCriteria: ['Voided authorizations', 'Failed payments', 'Test sandbox charges'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'REV_NET',
      canonicalName: 'Net Revenue',
      description: 'Gross revenue minus discounts, promotional credits, refunds, and chargebacks.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES', 'AGENCY', 'RETAIL', 'STARTUP'],
      unit: 'CURRENCY',
      formula: 'Gross Revenue - (Refunds + Discounts + Chargebacks)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['PAYMENT_GATEWAY', 'STRIPE', 'SHOPIFY', 'INVOICE_LEDGER'],
      inclusionCriteria: ['Settled revenue and reconciled refund/discount debits'],
      exclusionCriteria: ['Sales tax / GST payable', 'Pending unsettled refund authorizations'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'GROSS_PROFIT',
      canonicalName: 'Gross Profit',
      description: 'Net revenue minus Cost of Goods Sold (COGS) and direct delivery expenses.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES', 'AGENCY', 'RETAIL', 'STARTUP'],
      unit: 'CURRENCY',
      formula: 'Net Revenue - COGS',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['INVOICE_LEDGER', 'ACCOUNTING_FEED', 'ERP'],
      inclusionCriteria: ['Direct labor', 'Hosting/infra costs', 'Raw materials', 'Merchant processing fees'],
      exclusionCriteria: ['Sales and marketing payroll', 'General overhead'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'CONTRIBUTION_MARGIN',
      canonicalName: 'Contribution Margin',
      description: 'Percentage of revenue remaining after covering all variable costs.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'RETAIL', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '((Net Revenue - Variable Costs) / Net Revenue) * 100',
      numerator: 'Net Revenue - Variable Costs',
      denominator: 'Net Revenue',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['FINANCIAL_LEDGER'],
      inclusionCriteria: ['Variable shipping', 'Payment gateway fees', 'Direct product packaging'],
      exclusionCriteria: ['Fixed administrative salaries', 'Office rent'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'OPEX',
      canonicalName: 'Operating Expenses',
      description: 'Total fixed and operational expenditures required to operate the business.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'STARTUP', 'AGENCY', 'PROFESSIONAL_SERVICES'],
      unit: 'CURRENCY',
      formula: 'Sum(Payroll + Rent + Software SaaS + Administrative + Legal Overhead)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['BANK_FEED', 'ACCOUNTING_LEDGER'],
      inclusionCriteria: ['Operational overhead incurred within period'],
      exclusionCriteria: ['Capital expenditures (CapEx)', 'Direct COGS'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 72,
    });

    this.register({
      metricId: 'CASH_FLOW',
      canonicalName: 'Net Operating Cash Flow',
      description: 'Actual physical cash received minus actual physical cash disbursed during the period.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP', 'AGENCY'],
      unit: 'CURRENCY',
      formula: 'Cash Inflows - Cash Outflows',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['BANK_FEED', 'BANK_RECONCILIATION'],
      inclusionCriteria: ['Reconciled bank statements'],
      exclusionCriteria: ['Accrued uncollected invoices', 'Unpaid vendor bills'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'BURN_RATE',
      canonicalName: 'Net Monthly Burn Rate',
      description: 'Net cash outflow per month when expenses exceed cash inflows.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['STARTUP', 'SAAS'],
      unit: 'CURRENCY',
      formula: 'Total Cash Outflows - Total Cash Inflows (when Outflows > Inflows)',
      aggregationMethodology: 'LATEST',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['BANK_FEED', 'ACCOUNTING_LEDGER'],
      inclusionCriteria: ['Negative operating cash delta'],
      exclusionCriteria: ['One-off equity financing infusions'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'RUNWAY',
      canonicalName: 'Cash Runway (Months)',
      description: 'Number of operating months remaining before cash balance reaches zero at current burn rate.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['STARTUP', 'SAAS'],
      unit: 'MONTHS',
      formula: 'Total Liquid Cash Reserves / Net Monthly Burn Rate',
      numerator: 'Total Liquid Cash Reserves',
      denominator: 'Net Monthly Burn Rate',
      aggregationMethodology: 'LATEST',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['BANK_FEED', 'FINANCIAL_RECONCILIATION'],
      inclusionCriteria: ['Liquid accessible cash balances'],
      exclusionCriteria: ['Restricted escrow accounts', 'Accounts receivable past 90 days'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'PROFITABILITY_NET',
      canonicalName: 'Net Profit Margin',
      description: 'Net income after all expenses, taxes, and debt divided by net revenue.',
      category: 'FINANCIAL',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES', 'AGENCY', 'RETAIL', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '(Net Income / Net Revenue) * 100',
      numerator: 'Net Income',
      denominator: 'Net Revenue',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['ACCOUNTING_LEDGER'],
      inclusionCriteria: ['All income and expenditure reconciled'],
      exclusionCriteria: ['Unrealized investment gains/losses'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 72,
    });

    // ==========================================
    // 2. GROWTH METRICS
    // ==========================================
    this.register({
      metricId: 'GROWTH_RATE_REV',
      canonicalName: 'Revenue Growth Rate (MoM)',
      description: 'Month-over-month percentage change in Net Revenue.',
      category: 'GROWTH',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '((Net Revenue Current - Net Revenue Prior) / Net Revenue Prior) * 100',
      numerator: 'Net Revenue Current - Net Revenue Prior',
      denominator: 'Net Revenue Prior',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['REVENUE_LEDGER'],
      inclusionCriteria: ['Full calendar or normalized 30-day reporting periods'],
      exclusionCriteria: ['Partial or unclosed current month periods'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'GROWTH_RATE_CUST',
      canonicalName: 'Customer Growth Rate (MoM)',
      description: 'Month-over-month percentage change in active paying customer count.',
      category: 'GROWTH',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '((Active Customers Current - Active Customers Prior) / Active Customers Prior) * 100',
      numerator: 'Active Customers Current - Active Customers Prior',
      denominator: 'Active Customers Prior',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['CUSTOMER_LEDGER', 'STRIPE', 'SHOPIFY'],
      inclusionCriteria: ['Paying verified customer accounts'],
      exclusionCriteria: ['Free trials without billing method', 'Churned accounts'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'GOAL_COMPLETION_RATE',
      canonicalName: 'Strategic Goal Completion Rate',
      description: 'Percentage of active workspace strategic goals reaching target threshold.',
      category: 'GROWTH',
      applicableBusinessModels: ['GENERAL', 'STARTUP', 'SAAS', 'AGENCY'],
      unit: 'PERCENTAGE',
      formula: '(Completed Goals / Total Active Goals) * 100',
      numerator: 'Completed Goals',
      denominator: 'Total Active Goals',
      aggregationMethodology: 'AVERAGE',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['GROWTH_PLANNER', 'GOALS_REPOSITORY'],
      inclusionCriteria: ['Goals created and tracked in BrainWise'],
      exclusionCriteria: ['Archived or soft-deleted goals'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, maxPossible: 100 },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    this.register({
      metricId: 'GROWTH_VELOCITY',
      canonicalName: 'Weekly Execution Velocity',
      description: 'Number of completed action sprint tasks and validated experiments per week.',
      category: 'GROWTH',
      applicableBusinessModels: ['GENERAL', 'STARTUP', 'SAAS', 'AGENCY'],
      unit: 'COUNT',
      formula: 'Sum(Completed Tasks + Concluded Experiments within 7 Days)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['TASK_REPOSITORY', 'EXPERIMENT_REPOSITORY'],
      inclusionCriteria: ['Status == completed within window'],
      exclusionCriteria: ['Skipped or cancelled tasks'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0 },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    // ==========================================
    // 3. MARKETING METRICS
    // ==========================================
    this.register({
      metricId: 'MKT_REACH',
      canonicalName: 'Total Qualified Reach',
      description: 'Number of unique individuals who viewed marketing collateral or campaigns.',
      category: 'MARKETING',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'RETAIL'],
      unit: 'COUNT',
      formula: 'Sum(De-duplicated Unique Audience Impressions across Verified Channels)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['GA4', 'META_ADS', 'GOOGLE_ADS', 'LINKEDIN'],
      inclusionCriteria: ['Observed platform unique view events'],
      exclusionCriteria: ['Bot and web-crawler traffic', 'Internal employee testing traffic'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0 },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'MKT_CTR',
      canonicalName: 'Click-Through Rate (CTR)',
      description: 'Percentage of impressions that resulted in a verified click to storefront or landing page.',
      category: 'MARKETING',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '(Total Clicks / Total Impressions) * 100',
      numerator: 'Total Clicks',
      denominator: 'Total Impressions',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['AD_PLATFORM_API', 'GA4'],
      inclusionCriteria: ['Direct user click events'],
      exclusionCriteria: ['Invalid or bot clicks detected by provider'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'MKT_CVR',
      canonicalName: 'Conversion Rate (CVR)',
      description: 'Percentage of landing page visitors or leads that completed a target conversion event.',
      category: 'MARKETING',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP'],
      unit: 'PERCENTAGE',
      formula: '(Total Conversions / Total Unique Visitors) * 100',
      numerator: 'Total Conversions',
      denominator: 'Total Unique Visitors',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['GA4', 'SHOPIFY', 'STRIPE', 'CONVERSION_PIXEL'],
      inclusionCriteria: ['Verified purchase or signed contract conversions'],
      exclusionCriteria: ['Duplicate form re-submissions within 10 minutes'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'MKT_CAC',
      canonicalName: 'Customer Acquisition Cost (CAC)',
      description: 'Total fully loaded acquisition expenditure divided by new acquired paying customers.',
      category: 'MARKETING',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'STARTUP', 'AGENCY'],
      unit: 'CURRENCY',
      formula: 'Total Marketing and Sales Spend / Total New Acquired Customers',
      numerator: 'Total Marketing and Sales Spend',
      denominator: 'Total New Acquired Customers',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['AD_PLATFORM_SPEND', 'PAYROLL_SALES', 'CUSTOMER_LEDGER'],
      inclusionCriteria: ['Paid media ad spend', 'Agency fees', 'Direct acquisition discounts'],
      exclusionCriteria: ['Brand maintenance PR spend unrelated to lead gen'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'MKT_ROAS',
      canonicalName: 'Return on Ad Spend (ROAS)',
      description: 'Attributed gross revenue generated per unit of paid advertising spend.',
      category: 'MARKETING',
      applicableBusinessModels: ['GENERAL', 'ECOMMERCE', 'D2C_FMCG', 'SAAS', 'RETAIL'],
      unit: 'RATIO',
      formula: 'Attributed Revenue / Total Ad Spend',
      numerator: 'Attributed Revenue',
      denominator: 'Total Ad Spend',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['AD_PLATFORM_API', 'STOREFRONT_TRANSACTIONS'],
      inclusionCriteria: ['Direct and assisted attributed order values'],
      exclusionCriteria: ['Unattributed organic revenue'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    // ==========================================
    // 4. CUSTOMER METRICS
    // ==========================================
    this.register({
      metricId: 'CUST_RETENTION_RATE',
      canonicalName: 'Cohort Retention Rate',
      description: 'Percentage of customers from a cohort who remain active paying subscribers or repeat buyers.',
      category: 'CUSTOMER',
      applicableBusinessModels: ['SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON'],
      unit: 'PERCENTAGE',
      formula: '(Active Cohort Customers at End of Period / Initial Cohort Size) * 100',
      numerator: 'Active Cohort Customers at End of Period',
      denominator: 'Initial Cohort Size',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'COHORT_LIFETIME',
      sourceRequirements: ['CUSTOMER_LEDGER', 'SUBSCRIPTION_ENGINE'],
      inclusionCriteria: ['Original cohort accounts'],
      exclusionCriteria: ['Accounts merged due to duplicate email identity'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'CUST_CHURN_RATE',
      canonicalName: 'Customer Churn Rate',
      description: 'Percentage of customers who cancel or lapse during the reporting window.',
      category: 'CUSTOMER',
      applicableBusinessModels: ['SAAS', 'GENERAL', 'SALON'],
      unit: 'PERCENTAGE',
      formula: '(Lost Customers during Period / Customers at Start of Period) * 100',
      numerator: 'Lost Customers during Period',
      denominator: 'Customers at Start of Period',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['SUBSCRIPTION_ENGINE', 'CUSTOMER_DATABASE'],
      inclusionCriteria: ['Explicit cancellations', 'Involuntary churn after payment retry exhaustion'],
      exclusionCriteria: ['Temporary billing pauses within policy window'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'CUST_LTV',
      canonicalName: 'Customer Lifetime Value (LTV)',
      description: 'Estimated net profit attributed to the entire future relationship with a customer.',
      category: 'CUSTOMER',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'RESTAURANT', 'SALON', 'AGENCY'],
      unit: 'CURRENCY',
      formula: '(Average Revenue Per User * Gross Margin %) / Customer Churn Rate',
      aggregationMethodology: 'LATEST',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['ARPU_CALCULATOR', 'FINANCIAL_LEDGER', 'CHURN_CALCULATOR'],
      inclusionCriteria: ['Verified customer average revenues and empirical churn rates'],
      exclusionCriteria: ['One-off wholesale non-repeating transactions'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'CUST_ARPU',
      canonicalName: 'Average Revenue Per User (ARPU)',
      description: 'Total revenue generated during period divided by active customer count.',
      category: 'CUSTOMER',
      applicableBusinessModels: ['GENERAL', 'SAAS', 'ECOMMERCE', 'D2C_FMCG', 'STARTUP'],
      unit: 'CURRENCY',
      formula: 'Total Revenue / Total Active Users',
      numerator: 'Total Revenue',
      denominator: 'Total Active Users',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['REVENUE_LEDGER', 'USER_DIRECTORY'],
      inclusionCriteria: ['Active paying users in period'],
      exclusionCriteria: ['Complimentary admin accounts'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    // ==========================================
    // 5. OPERATIONAL METRICS
    // ==========================================
    this.register({
      metricId: 'OPS_TASK_COMPLETION',
      canonicalName: 'Sprint Task Completion Rate',
      description: 'Percentage of planned sprint tasks completed on time.',
      category: 'OPERATIONAL',
      applicableBusinessModels: ['GENERAL', 'STARTUP', 'SAAS', 'AGENCY'],
      unit: 'PERCENTAGE',
      formula: '(Completed Tasks / Total Scheduled Tasks) * 100',
      numerator: 'Completed Tasks',
      denominator: 'Total Scheduled Tasks',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['TASK_REPOSITORY'],
      inclusionCriteria: ['Tasks scheduled in current sprint'],
      exclusionCriteria: ['Tasks moved out of sprint before start'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    // ==========================================
    // 6. BUSINESS-MODEL SPECIFIC METRICS
    // ==========================================
    // SaaS Pack
    this.register({
      metricId: 'SAAS_MRR',
      canonicalName: 'Monthly Recurring Revenue (MRR)',
      description: 'Normalized monthly subscription value of all active contracted customers.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['SAAS'],
      unit: 'CURRENCY',
      formula: 'Sum(Normalized Monthly Plan Value of Active Subscriptions)',
      aggregationMethodology: 'SUM',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['STRIPE', 'RECURRING_BILLING_ENGINE'],
      inclusionCriteria: ['Active paid subscriptions', 'Annual plans normalized to 1/12th'],
      exclusionCriteria: ['One-time setup fees', 'Failed payment suspensions past grace period'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    this.register({
      metricId: 'SAAS_ARR',
      canonicalName: 'Annual Recurring Revenue (ARR)',
      description: 'Annualized recurring revenue run-rate (MRR * 12).',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['SAAS'],
      unit: 'CURRENCY',
      formula: 'MRR * 12',
      aggregationMethodology: 'LATEST',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['STRIPE', 'RECURRING_BILLING_ENGINE'],
      inclusionCriteria: ['Active contracted recurring subscriptions'],
      exclusionCriteria: ['Ad-hoc variable usage charges'],
      missingDataBehavior: 'FLAG_INCOMPLETE',
      validationRules: { minPossible: 0, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    this.register({
      metricId: 'SAAS_NRR',
      canonicalName: 'Net Revenue Retention (NRR)',
      description: 'Percentage of recurring revenue retained from existing customers including expansion and churn.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['SAAS'],
      unit: 'PERCENTAGE',
      formula: '((Starting MRR + Expansion MRR - Contraction MRR - Churned MRR) / Starting MRR) * 100',
      numerator: 'Starting MRR + Expansion MRR - Contraction MRR - Churned MRR',
      denominator: 'Starting MRR',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'ANNUAL',
      sourceRequirements: ['BILLING_WATERFALL_LEDGER'],
      inclusionCriteria: ['Same cohort existing customer accounts over 12 months'],
      exclusionCriteria: ['New customer acquisition revenue'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    this.register({
      metricId: 'SAAS_LTV_CAC_RATIO',
      canonicalName: 'SaaS LTV to CAC Ratio',
      description: 'Relationship between customer lifetime value and acquisition cost (Benchmark: 3.0+).',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['SAAS'],
      unit: 'RATIO',
      formula: 'Customer LTV / CAC',
      numerator: 'Customer LTV',
      denominator: 'CAC',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['LTV_ENGINE', 'CAC_ENGINE'],
      inclusionCriteria: ['Reconciled SaaS unit economic inputs'],
      exclusionCriteria: ['Modeled scenarios without real customer cohort history'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 48,
    });

    // Ecommerce Pack
    this.register({
      metricId: 'ECOM_AOV',
      canonicalName: 'Average Order Value (AOV)',
      description: 'Average total currency spent per completed storefront order.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['ECOMMERCE', 'D2C_FMCG', 'RETAIL'],
      unit: 'CURRENCY',
      formula: 'Total Net Sales / Total Completed Orders',
      numerator: 'Total Net Sales',
      denominator: 'Total Completed Orders',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['SHOPIFY', 'WOOCOMMERCE', 'STOREFRONT_DB'],
      inclusionCriteria: ['Fulfilled orders'],
      exclusionCriteria: ['Orders cancelled prior to shipping'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, requiresPositiveDenominator: true, currencyMandatory: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 12,
    });

    this.register({
      metricId: 'ECOM_REPEAT_ORDER_RATE',
      canonicalName: 'Ecommerce Repeat Purchase Rate',
      description: 'Percentage of customers who have made 2 or more purchases within 90 days.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['ECOMMERCE', 'D2C_FMCG', 'RETAIL'],
      unit: 'PERCENTAGE',
      formula: '(Customers with >=2 Purchases / Total Unique Customers) * 100',
      numerator: 'Customers with >=2 Purchases',
      denominator: 'Total Unique Customers',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'MONTHLY',
      sourceRequirements: ['ORDER_HISTORY_LEDGER'],
      inclusionCriteria: ['Identified customer records with historical orders'],
      exclusionCriteria: ['Anonymous guest checkouts without matching email/phone identity'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    // Restaurant & Salon / Services Pack
    this.register({
      metricId: 'SRV_UTILIZATION_RATE',
      canonicalName: 'Capacity & Chair Utilization Rate',
      description: 'Percentage of available booking appointment slots or table hours actively occupied.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES'],
      unit: 'PERCENTAGE',
      formula: '(Booked & Fulfilled Hours / Total Available Operating Hours) * 100',
      numerator: 'Booked & Fulfilled Hours',
      denominator: 'Total Available Operating Hours',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['BOOKING_ENGINE', 'POS_SYSTEM'],
      inclusionCriteria: ['Completed appointments/table seatings'],
      exclusionCriteria: ['No-shows and late cancellations'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });

    this.register({
      metricId: 'SRV_CANCELLATION_RATE',
      canonicalName: 'Appointment Cancellation & No-Show Rate',
      description: 'Percentage of scheduled appointments that were cancelled or abandoned without fulfillment.',
      category: 'BUSINESS_MODEL_SPECIFIC',
      applicableBusinessModels: ['RESTAURANT', 'SALON', 'PROFESSIONAL_SERVICES'],
      unit: 'PERCENTAGE',
      formula: '(Cancelled + No-Show Appointments / Total Scheduled Appointments) * 100',
      numerator: 'Cancelled + No-Show Appointments',
      denominator: 'Total Scheduled Appointments',
      aggregationMethodology: 'RATIO',
      timeWindowRequirements: 'WEEKLY',
      sourceRequirements: ['BOOKING_ENGINE'],
      inclusionCriteria: ['All scheduled appointments within window'],
      exclusionCriteria: ['Rescheduled appointments kept on calendar'],
      missingDataBehavior: 'PRESERVE_NULL',
      validationRules: { minPossible: 0, maxPossible: 100, requiresPositiveDenominator: true },
      formulaVersion: '1.0.0',
      freshnessMaxHours: 24,
    });
  }
}

export const metricRegistry = MetricRegistry.getInstance();
