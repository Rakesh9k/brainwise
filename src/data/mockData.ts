import type { BrainWiseState } from '../types/brainwise';

export const INITIAL_BRAINWISE_STATE: BrainWiseState = {
  isAuthenticated: false,
  currentRoute: 'landing',
  settingsTab: 'personal-profile',
  prototypeNoticeDismissed: false,
  aiTonePreference: 'Executive & Concise',
  customScenarioB: null,
  teamMembers: [
    {
      id: 'tm-1',
      name: 'Vishesh Kakar',
      email: 'vishesh.kakar@gmail.com',
      role: 'Owner',
      status: 'Active',
    },
    {
      id: 'tm-2',
      name: 'Maya Lin',
      email: 'maya@solsticecraft.co',
      role: 'Brand Designer',
      status: 'Active',
    },
    {
      id: 'tm-3',
      name: 'Arjun Patel',
      email: 'arjun@solsticecraft.co',
      role: 'Strategist',
      status: 'Invited',
    },
  ],
  workspacePrefs: {
    dateFormat: 'YYYY-MM-DD',
    defaultLandingView: 'dashboard',
    compactDensity: false,
  },
  contextSharing: {
    ideaIntelligence: true,
    competitiveIntelligence: true,
    brandStudio: true,
    growthDirector: true,
  },
  subscription: {
    plan: 'Growth Pro',
    billingCycle: 'annual',
  },
  integrations: [
    {
      id: 'int-shopify',
      name: 'Shopify',
      category: 'Commerce & Subscriptions',
      description: 'Sync demonstration D2C order velocity and subscription cohorts into Analytics.',
      connected: true,
    },
    {
      id: 'int-stripe',
      name: 'Stripe',
      category: 'Revenue & Billing',
      description: 'Track recurring revenue and MRR expansion milestones.',
      connected: true,
    },
    {
      id: 'int-ga4',
      name: 'Google Analytics 4',
      category: 'Traffic & Funnel',
      description: 'Attribute organic search and landing page conversions.',
      connected: false,
    },
    {
      id: 'int-meta',
      name: 'Meta Ads Manager',
      category: 'Paid Acquisition',
      description: 'Compare ad creative performance against Brand Studio assets.',
      connected: false,
    },
    {
      id: 'int-slack',
      name: 'Slack',
      category: 'Team Alerts',
      description: 'Route high-priority Market Watch competitor alerts to #strategy.',
      connected: false,
    },
  ],
  user: {
    firstName: 'Vishesh',
    lastName: 'Kakar',
    email: 'vishesh.kakar@gmail.com',
    role: 'Founder & Managing Director',
    avatarInitials: 'VK',
    timezone: 'Asia/Kolkata (IST)',
  },
  onboarding: {
    completed: true,
    personaRole: 'Startup founder',
    primaryGoals: [
      'Validate a business idea',
      'Understand competitors',
      'Build a brand',
      'Grow an existing business',
    ],
  },
  brain: {
    businessName: 'Solstice Craft Coffee',
    tagline: 'Single-origin specialty roasts, delivered within 48 hours of roasting.',
    industry: 'Specialty Food & Beverage / D2C Coffee',
    stage: 'Early Traction',
    activationState: 'ACTIVE_ESTABLISHED',
    location: 'Hyderabad & Bengaluru, India',
    website: 'https://solsticecoffee.example.com',
    foundedYear: '2026',
    overviewSummary:
      'Solstice Craft Coffee is a direct-to-consumer specialty coffee roastery and neighbourhood tasting bar concept pairing micro-lot Indian estates (Chikmagalur & Araku) with precision roast-on-demand subscriptions for remote professionals and design-forward urban cafés.',
    targetAudience:
      'Urban knowledge workers (ages 24–40), home pour-over enthusiasts, and boutique offices across Tier-1 Indian metros seeking traceable, freshly roasted coffee without café markups.',
    brandPositioning:
      'Positioned between mass-market instant coffee chains and intimidating ultra-niche purists: warm architectural minimalism, radical roast-date transparency, and guided home brewing rituals.',
    businessModel:
      'Hybrid D2C recurring roast subscription (65% revenue target) anchored by one flagship experiential tasting bar & wholesale B2B office partnerships (35%).',
    revenueModel:
      'Tiered fortnightly/monthly bean subscriptions ($16–$28/mo equivalent), wholesale 1kg café & studio bags, and curated starter brew kits.',
    valueProposition:
      'Roasted every Tuesday and dispatched within 48 hours, with origin provenance cards and grind-calibrated brew recipes tailored to each customer’s equipment.',
    primaryGoals: [
      'Reach 450 active recurring subscribers within 90 days',
      'Establish 12 boutique B2B studio/office coffee accounts',
      'Achieve 38% repeat purchase rate across tasting kit buyers',
    ],
    products: [
      {
        id: 'prod-1',
        name: 'Roast-to-Order Origin Subscription',
        category: 'Recurring Subscription',
        priceRange: '$18 – $26 / month',
        description:
          '250g or 500g single-estate micro-lot coffee roasted every Tuesday, custom ground for V60, AeroPress, Moka Pot, or Espresso.',
        marginEstimate: '58% gross margin',
      },
      {
        id: 'prod-2',
        name: 'The Ritual Discovery Flight (3 × 100g)',
        category: 'Starter Kit',
        priceRange: '$15 one-time',
        description:
          'Low-friction tasting flight featuring light, medium, and natural-process estates with step-by-step brewing cards.',
        marginEstimate: '46% gross margin',
      },
      {
        id: 'prod-3',
        name: 'Studio & Office Barista Program',
        category: 'B2B Wholesale',
        priceRange: '$180 – $420 / month',
        description:
          'Weekly 2kg–5kg fresh bean replenishment plus quarterly calibration workshops for design studios and startups.',
        marginEstimate: '52% gross margin',
      },
    ],
    personas: [
      {
        id: 'per-1',
        name: 'Aarav — Remote Product Designer',
        segment: 'Home Brewers & Tech Professionals',
        ageOrFirmographics: '27–35 yrs · Metro cities · $35k+ household income',
        painPoints: [
          'Supermarket and aggregator beans sit on shelves 3–6 months past roast date',
          'Overwhelmed by snobbish tasting jargon and inconsistent grind advice',
          'Pays $4.50/day at cafés for inconsistent milk-heavy drinks',
        ],
        buyingTriggers: [
          'Visible roast date stamped on front of bag',
          'Simple 3-taster discovery box before committing to a subscription',
          'Clean, tactile packaging worth keeping on a kitchen counter',
        ],
        willingnessToPay: '$18 – $28 / month',
      },
      {
        id: 'per-2',
        name: 'Meera — Operations Lead at 40-Person Studio',
        segment: 'Boutique B2B Workspaces',
        ageOrFirmographics: '25–80 employees · Architecture, SaaS, Creative Agencies',
        painPoints: [
          'Generic office vending coffee lowers studio hospitality feel',
          'Managing ad-hoc grocery reorders wastes admin hours',
        ],
        buyingTriggers: [
          'Automated monthly invoicing and predictable Tuesday delivery',
          'Complimentary staff tasting session during onboarding',
        ],
        willingnessToPay: '$220 – $400 / month',
      },
    ],
    documents: [
      {
        id: 'doc-1',
        name: 'Q4 Chikmagalur Estate Sourcing Notes.pdf',
        type: 'Research',
        size: '1.8 MB',
        uploadedAt: '2026-11-10',
        usedByAI: true,
      },
      {
        id: 'doc-2',
        name: 'Solstice Unit Economics & Roaster Capex.xlsx',
        type: 'Spreadsheet',
        size: '640 KB',
        uploadedAt: '2026-11-12',
        usedByAI: true,
      },
      {
        id: 'doc-3',
        name: 'Customer Discovery Interviews (18 Brewers).pdf',
        type: 'Brand Brief',
        size: '2.4 MB',
        uploadedAt: '2026-11-14',
        usedByAI: true,
      },
    ],
    decisions: [
      {
        id: 'dec-1',
        title: 'Lead D2C acquisition with a $15 3-pack Discovery Flight instead of full 500g bags',
        rationale:
          'Competitive audit showed first-time buyers hesitate on $22 single-bag commitments without tasting. Discovery Flight reduces CAC payback to 1.4 orders.',
        department: 'Competitive Intelligence',
        decidedAt: '2026-11-13',
        status: 'active',
      },
      {
        id: 'dec-2',
        title: 'Adopt warm alabaster & terracotta-orange minimalist packaging system',
        rationale:
          'Separates Solstice from dark heavy kraft bags used by Roastery House and The Coffee Co., increasing shelf and Instagram shareability.',
        department: 'Brand Studio',
        decidedAt: '2026-11-14',
        status: 'active',
      },
    ],
    history: [
      {
        id: 'hist-1',
        date: '2026-11-16',
        event: 'Completed Competitive Gap Analysis across 4 regional specialty brands',
        department: 'Competitive Intelligence',
      },
      {
        id: 'hist-2',
        date: '2026-11-15',
        event: 'Approved primary wordmark and warm neutral color palette in Brand Studio',
        department: 'Brand Studio',
      },
      {
        id: 'hist-3',
        date: '2026-11-12',
        event: 'Validated Specialty Coffee Subscription & Tasting Kit market report',
        department: 'Idea Intelligence',
      },
    ],
    lastUpdated: '2026-11-16',
    provenance: {
      businessName: {
        fieldKey: 'businessName',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      tagline: {
        fieldKey: 'tagline',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      industry: {
        fieldKey: 'industry',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      location: {
        fieldKey: 'location',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      website: {
        fieldKey: 'website',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      valueProposition: {
        fieldKey: 'valueProposition',
        source: 'USER_CONFIRMED',
        confidence: 1.0,
        verifiedAt: '2026-11-16',
        lastConfirmedBy: 'Vishesh Kakar',
      },
      targetAudience: {
        fieldKey: 'targetAudience',
        source: 'DERIVED_FROM_DOC',
        confidence: 0.92,
        verifiedAt: '2026-11-14',
        notes: 'Extracted from Customer Discovery Interviews PDF',
      },
      brandPositioning: {
        fieldKey: 'brandPositioning',
        source: 'AI_INFERRED',
        confidence: 0.88,
        notes: 'Inferred by Competitive Intelligence Gap Analysis',
      },
      revenueModel: {
        fieldKey: 'revenueModel',
        source: 'DERIVED_FROM_DOC',
        confidence: 0.95,
        notes: 'Synthesized from Unit Economics & Roaster Capex spreadsheet',
      },
    },
    strategicMemory: {
      usedAngles: [
        {
          id: 'ang-1',
          angle: 'Micro-lot origin provenance & 48-hour roast freshness',
          theme: 'Freshness & Quality',
          usedIn: 'BrandStudio',
          lastUsedAt: '2026-11-15',
          frequency: 3,
        },
        {
          id: 'ang-2',
          angle: '3-pack tasting kit for home pour-over ritual discovery',
          theme: 'Starter Trial',
          usedIn: 'Campaign',
          lastUsedAt: '2026-11-16',
          frequency: 2,
        },
      ],
      fatiguedThemes: ['Freshness & Quality'],
      explicitExclusions: [
        'Never claim instant coffee comparability',
        'Do not mention deep percentage discounts or clearance sales',
        'Never state 100% organic without official estate certification',
      ],
      lastUpdated: '2026-11-16',
    },
  },
  reports: [
    {
      id: 'rep-1',
      title: 'Specialty Roast-on-Demand Subscription & Micro-Lot Tasting Flight',
      ideaSummary:
        'A transparent, roast-to-order Indian single-origin coffee subscription paired with a low-friction 3×100g tasting flight and boutique B2B studio supply.',
      industry: 'Specialty Coffee & D2C Beverage',
      targetMarket: 'Urban remote professionals & boutique offices',
      geography: 'India (Tier-1 Metros: Hyderabad, Bengaluru, Mumbai, Delhi NCR)',
      depth: 'Deep Market Dossier',
      createdAt: '2026-11-12',
      overallConfidence: 'High',
      viabilitySignal: 'Strong Fit',
      savedToBrain: true,
      validationScorecard: {
        viabilityScore: 82,
        verdictLabel: 'Strong Fit — launch with tasting flight wedge',
        summaryContext:
          'High-margin roast-to-order model addressing urban specialty coffee consumers dissatisfied with stale aggregator inventory.',
        goodNews:
          'Specialty bean consumption in Tier-1 metros is growing +24% YoY with high retention among domestic espresso and pour-over brewers.',
        badNews:
          'Incumbents like Blue Tokai and Roastery House have physical cafés that build strong baseline brand awareness.',
        strategicWedge:
          'Tasting flight discovery box (3x100g) that converts buyers into recurring Tuesday roast-to-order subscriptions.',
        theCatch:
          'Requires disciplined 48-hour roast-to-dispatch logistics; stale roast dates kill repeat subscription retention.',
        willingnessToPay: {
          viable: true,
          estimatedPriceRange: '$12 – $16 / 250g',
          targetBuyer: 'Urban remote professionals & boutique design studios',
          paymentModel: 'Recurring bi-weekly or monthly subscription',
        },
        bottomLine:
          'Solstice avoids the heavy capital expense of opening retail cafes by dominating fresh roast-to-order online subscriptions and boutique B2B studio supply.',
      },
      criticalAssumptions: [
        {
          id: 'solstice-crit-01',
          riskLevel: 'HIGH RISK',
          assumption:
            'Urban home brewers will pay $13–$16 per 250g bag online over Amazon aggregator coffee for a verified roast date within 48 hours.',
          howToTest:
            'Launch a 100-box tasting flight pre-order landing page with roast-date clock countdown.',
          timeline: '2 weeks',
          successSignal:
            '>= 4.2% click-to-order conversion rate and >= 35 tasting flight deposits.',
          stopIfCondition:
            'Less than 10 pre-orders after 800 targeted local coffee enthusiast visits.',
          status: 'pending',
        },
        {
          id: 'solstice-crit-02',
          riskLevel: 'MEDIUM RISK',
          assumption:
            'Tasting flight purchasers will convert to a recurring bi-weekly subscription at >= 30% rate.',
          howToTest:
            'Deliver tasting boxes with custom QR code offering a $5 subscription credit on Day 7.',
          timeline: '3 weeks',
          successSignal:
            '>= 30% first-month recurring subscription sign-ups from flight recipients.',
          stopIfCondition: 'Subscription opt-in rate below 12% across 50 sample deliveries.',
          status: 'pending',
        },
        {
          id: 'solstice-crit-03',
          riskLevel: 'MEDIUM RISK',
          assumption:
            'Local boutique design studios and co-working offices will buy 5kg monthly bulk supply at $110/mo.',
          howToTest:
            'Conduct direct outreach and in-office tastings for 15 boutique creative agencies in Banjara Hills & HITEC City.',
          timeline: '2 weeks',
          successSignal: 'At least 3 signed monthly studio recurring bean supply commitments.',
          stopIfCondition: 'Zero office commitments after 15 qualified on-site coffee tastings.',
          status: 'pending',
        },
      ],
      executiveSummary:
        'Specialty coffee consumption in Tier-1 Indian metros is expanding rapidly, driven by hybrid work and rising home-brewing equipment ownership. While café chains compete heavily on real estate and milk beverages, an underserved segment of discerning home brewers struggles with stale aggregator inventory and opaque roast dates. Launching with a 3-bag discovery flight that converts into a Tuesday roast-to-order subscription—supplemented by studio B2B accounts—offers attractive 55%+ gross margins and lower capital risk than opening multiple cafés upfront.',
      marketOverview: {
        text: 'India’s out-of-home and specialty coffee market has transitioned from instant coffee dominance toward freshly roasted whole-bean and pour-over culture. Rising adoption of domestic espresso machines, AeroPress, and cold-brew concentrates among 24–40 urban professionals creates durable repeat demand.',
        factType: 'verified',
        sources: [
          'Euromonitor Hot Drinks India Summary',
          'Coffee Board of India Consumption Brief',
        ],
      },
      tamSamSom: {
        tamLabel: '$2.4B – $2.9B',
        tamBasis:
          'Total urban branded & café coffee retail expenditure across India (annualized band).',
        samLabel: '$280M – $340M',
        samBasis:
          'Specialty roasted beans, home brewing, and urban artisan café segment in Tier-1 metros.',
        somLabel: '$1.8M – $2.6M',
        somBasis:
          '3-year serviceable capture across D2C metro subscriptions & 60–90 boutique B2B accounts.',
        assumptions: [
          {
            id: 'a-tam',
            label: 'Total Addressable Market (TAM)',
            value: 2.6,
            unit: '$B',
            min: 1.0,
            max: 6.0,
            step: 0.2,
          },
          {
            id: 'a-sam',
            label: 'Specialty & Metro Share (SAM %)',
            value: 12,
            unit: '%',
            min: 5,
            max: 30,
            step: 1,
          },
          {
            id: 'a-som',
            label: '3-Year Target Capture (SOM % of SAM)',
            value: 0.8,
            unit: '%',
            min: 0.2,
            max: 5,
            step: 0.2,
          },
        ],
      },
      marketDemand: {
        summary:
          'Search interest and social engagement around home pour-over workflows, café aesthetics, and single-estate Chikmagalur beans show sustained year-round growth rather than seasonal spikes.',
        signals: [
          {
            label: 'Home brewer equipment purchases (grinders, V60, AeroPress)',
            trend: '+28% YoY growth in specialty hardware retail',
            factType: 'verified',
          },
          {
            label: 'Subscription retention benchmarks for fresh-roasted D2C coffee',
            trend: '55%–65% 90-day retention when onboarding uses sample flights',
            factType: 'estimate',
          },
          {
            label: 'B2B creative studio & startup pantry upgrades',
            trend: 'Growing shift away from instant vending toward artisan beans',
            factType: 'estimate',
          },
        ],
      },
      customerSegments: [
        {
          name: 'Daily Home Ritualists',
          share: '50% – 55% of early revenue',
          need: 'Consistent freshness, clear flavor notes, grind matched to brewer',
          urgency: 'High — actively replacing stale marketplace bags',
        },
        {
          name: 'Curious Café Converts',
          share: '25% – 30% of early revenue',
          need: 'Approachable guidance to recreate $4 café drinks at home for <$0.80/cup',
          urgency: 'Moderate — needs tasting flight confidence',
        },
        {
          name: 'Boutique Offices & Studios',
          share: '15% – 25% of early revenue',
          need: 'Reliable weekly bean replenishment without admin overhead',
          urgency: 'High — immediate B2B hospitality win',
        },
      ],
      customerPainPoints: [
        {
          title: 'Stale inventory on quick-commerce & marketplaces',
          severity: 'high',
          evidence:
            'Customer interviews showed 14 of 18 brewers received bags roasted 60–120 days prior.',
        },
        {
          title: 'Intimidating specialty jargon without actionable brew ratios',
          severity: 'medium',
          evidence:
            'New brewers abandon whole-bean orders when water temperature/ratio feels unclear.',
        },
        {
          title: 'Subscription rigidity (inability to pause or swap origins cleanly)',
          severity: 'medium',
          evidence: 'Top complaint in competitor 3-star reviews.',
        },
      ],
      competitorLandscapeSummary:
        'Regional competitors cluster around physical cafés expanding into retail bags (Roastery House, Bigg Boss Cafe) or traditional catalog e-commerce brands (The Coffee Co.). Few brands combine digital roast-transparency, frictionless tasting flights, and cohesive editorial branding.',
      pricingAnalysis: {
        tiers: [
          {
            tier: 'Entry / Mass Specialty',
            range: '$8 – $11 / 250g',
            positioning: 'High-volume blends, older warehouse stock',
          },
          {
            tier: 'Target Solstice Core',
            range: '$12 – $16 / 250g',
            positioning: '48-hour post-roast dispatch, single-estate micro-lots',
          },
          {
            tier: 'Ultra-Reserve Microlots',
            range: '$20 – $28 / 250g',
            positioning: 'Limited competition/experimental anaerobic lots',
          },
        ],
        recommendation:
          'Anchor core subscription at $18/month (2 × 250g or flexible cadence) and price the 3×100g Discovery Flight at $15 with an automatic $5 credit toward the first subscription cycle.',
      },
      marketOpportunities: [
        '48-hour roast-to-door transparency badge with batch lot QR provenance',
        '1-click WhatsApp/web pause, skip, or origin-swap subscription control',
        'Co-branded studio hospitality kits for Hyderabad & Bengaluru tech/design offices',
      ],
      businessModelOptions: [
        {
          model: 'Pure D2C Subscription + Discovery Flight',
          pros: 'Lowest upfront capex, fast geographic scaling, predictable recurring cash flow',
          cons: 'Higher digital CAC initially without physical footfall trust',
          fit: 'Recommended Phase 1 (Days 1–90)',
        },
        {
          model: 'D2C + Neighborhood Tasting Room',
          pros: 'Physical brand halo, tasting bar doubles as pickup & content studio',
          cons: 'Lease & barista payroll overhead requires disciplined launch timing',
          fit: 'Recommended Phase 2 (Month 6+)',
        },
      ],
      revenuePotential: {
        year1Conservative: '$95k – $135k ARR (350 subscribers + 8 B2B studios)',
        year1Target: '$180k – $240k ARR (650 subscribers + 18 B2B studios)',
        unitEconomicsNote:
          'Estimated blended contribution margin ~41% after green bean cost, roasting, packaging, and metro courier.',
        factType: 'estimate',
      },
      startupCostEstimates: [
        {
          category: 'Initial Green Bean & Packaging Inventory',
          range: '$6,500 – $9,500',
          note: 'Compostable valved bags + 3-pack flight boxes',
        },
        {
          category: 'Contract Roasting / Shared Roastery Access',
          range: '$2,000 – $3,500',
          note: 'Avoids $45k roaster capex in first 6 months',
        },
        {
          category: 'Brand Identity, Storefront & Launch Content',
          range: '$2,500 – $4,500',
          note: 'Photography, brew cards, digital storefront',
        },
      ],
      risksAndChallenges: [
        {
          risk: 'Rising Arabica green bean commodity prices compressing margins',
          severity: 'high',
          mitigation:
            'Lock seasonal forward contracts directly with 2 Chikmagalur estates for 60% of volume.',
        },
        {
          risk: 'Paid social CAC inflation on Meta/Instagram',
          severity: 'medium',
          mitigation:
            'Pair behind-the-scenes roasting reels with B2B office sampling to acquire individual subscribers organically.',
        },
      ],
      validationExperiments: [
        {
          title: 'Pre-launch 100-Box Discovery Flight Drop',
          metric: 'Sell 100 flights in 14 days at <$9 CAC',
          timeframe: '2 weeks',
        },
        {
          title: 'Office Cupping Outreach (Hyderabad HITEC & Jubilee Hills)',
          metric: 'Book 8 studio tastings -> convert 3 monthly B2B accounts',
          timeframe: '3 weeks',
        },
      ],
      finalRecommendation: {
        verdict:
          'Proceed with Phase 1 D2C Discovery Flight + Tuesday Roast Subscription using contract roasting capacity before committing to a physical lease.',
        nextSteps: [
          'Benchmark pricing and positioning against Roastery House, Bigg Boss Cafe, and The Coffee Co.',
          'Finalize Solstice warm minimalist brand identity and Discovery Flight packaging.',
          'Launch 30-day founder execution roadmap focused on first 100 Discovery Flight orders.',
        ],
      },
      sources: [
        {
          title: 'Coffee Board of India Market Statistics 2026',
          publisher: 'Ministry of Commerce & Industry',
          date: '2026-09',
          reliability: 'Primary',
          url: 'https://coffeeboard.gov.in/database-reports/',
          domain: 'coffeeboard.gov.in',
          domainReputation: 'Gov / Statistical',
          authorityScore: 94,
          verificationStatus: 'verified_live',
          metricCited: 'Total Addressable Market (TAM)',
          metricValue: '$2.4B – $2.9B',
          statisticContext:
            'Total urban branded & café coffee retail expenditure across India (annualized band)',
        },
        {
          title: 'Specialty Beverage D2C Retention & Unit Economics',
          publisher: 'Statista Consumer Market Insights',
          date: '2026-10',
          reliability: 'Industry Report',
          url: 'https://www.statista.com/outlook/cmo/hot-drinks/coffee/india',
          domain: 'statista.com',
          domainReputation: 'Primary Benchmark',
          authorityScore: 92,
          verificationStatus: 'verified_live',
          metricCited: 'Specialty Coffee Serviceable Share (SAM)',
          metricValue: '$280M – $340M',
          statisticContext:
            'Artisan beans, home brewing, and urban premium café addressable expenditure in Tier-1 metros',
        },
        {
          title: 'Solstice Discovery Cohort Interviews (n=18)',
          publisher: 'Workspace Internal Knowledge Base',
          date: '2026-11',
          reliability: 'Primary',
          url: 'https://brainwise.internal/workspaces/solstice/interviews',
          domain: 'brainwise.internal',
          domainReputation: 'Academic / Institutional',
          authorityScore: 98,
          verificationStatus: 'verified_live',
          metricCited: 'Target Customer Retention & Churn Rate',
          metricValue: '3.0% Monthly Churn',
          statisticContext:
            'Tested pilot cohort 90-day retention curve with 11-month customer payback period',
        },
        {
          title: 'Indian Metro Coffee Consumption & Specialty Adoption',
          publisher: 'Bain & Company Consumer Products Study',
          date: '2026-08',
          reliability: 'Market Estimate',
          url: 'https://www.bain.com/insights/india-consumer-landscape/',
          domain: 'bain.com',
          domainReputation: 'Industry Leader',
          authorityScore: 96,
          verificationStatus: 'verified_live',
          metricCited: 'Category Demand Velocity (CAGR)',
          metricValue: '14.2% YoY Growth',
          statisticContext:
            'Rapidly compounding demand for fresh roasted single-origin bean varieties across Tier-1 metros',
        },
      ],
      scenarios: [
        {
          id: 'scen-regional-pilot',
          name: 'Regional Expansion (4-City Rollout)',
          tamBillion: 3.4,
          samSharePct: 18,
          somSharePct: 2.1,
          targetArpuUsd: 24,
          breakEvenMonths: 11,
          createdAt: '2026-11-12',
          notes:
            'Rollout into Mumbai, Bengaluru, Delhi NCR, and Hyderabad with studio hub pickup points.',
          isCustom: false,
        },
        {
          id: 'scen-vc-scale',
          name: 'Series Seed Scale Case ($500k)',
          tamBillion: 4.8,
          samSharePct: 24,
          somSharePct: 3.8,
          targetArpuUsd: 28,
          breakEvenMonths: 14,
          createdAt: '2026-11-15',
          notes: 'Aggressive marketing spend across digital and office tasting partnerships.',
          isCustom: true,
        },
      ],
    },
    {
      id: 'rep-2',
      title: 'Cold Brew Concentrate Ready-to-Pour Format (2027 Expansion)',
      ideaSummary:
        'Shelf-stable nitrogen-flushed specialty cold brew concentrate pouches for rapid iced coffee at home.',
      industry: 'RTD & Concentrate Coffee',
      targetMarket: 'Busy urban commuters & fitness-oriented professionals',
      geography: 'Pan-India Tier-1 & Tier-2 Metros',
      depth: 'Standard Validation',
      createdAt: '2026-11-05',
      overallConfidence: 'Moderate',
      viabilitySignal: 'Promising with Niche Focus',
      savedToBrain: false,
      executiveSummary:
        'Strong summer seasonality upside and high repeat convenience, though co-packing minimum order quantities suggest delaying until Solstice reaches 400+ active bean subscribers.',
      marketOverview: {
        text: 'Cold coffee accounts for over 45% of iced cafe orders among Gen-Z and younger millennials in warm metros.',
        factType: 'estimate',
        sources: ['QSR Beverage Format Trend Brief'],
      },
      tamSamSom: {
        tamLabel: '$900M – $1.2B',
        tamBasis: 'Urban ready-to-drink coffee & cold beverage formats.',
        samLabel: '$110M – $150M',
        samBasis: 'Premium unsweetened / low-sugar cold brew concentrates.',
        somLabel: '$450K – $800K',
        somBasis: 'Cross-sell capture across existing Solstice subscriber base.',
        assumptions: [
          { id: 'b-tam', label: 'TAM', value: 1.0, unit: '$B', min: 0.5, max: 3, step: 0.1 },
          { id: 'b-sam', label: 'SAM %', value: 13, unit: '%', min: 5, max: 25, step: 1 },
          { id: 'b-som', label: 'SOM %', value: 0.5, unit: '%', min: 0.1, max: 3, step: 0.1 },
        ],
      },
      marketDemand: {
        summary:
          'High social curiosity during March–August; lower retention without bundle discounts.',
        signals: [
          {
            label: 'Iced specialty coffee social search volume',
            trend: '+34% seasonal lift Q2–Q3',
            factType: 'verified',
          },
        ],
      },
      customerSegments: [
        {
          name: 'Iced Coffee Daily Drinkers',
          share: '70%',
          need: '30-second café-grade iced Americano or latte',
          urgency: 'Moderate',
        },
      ],
      customerPainPoints: [
        {
          title: 'Existing concentrates taste overly acidic or burnt',
          severity: 'medium',
          evidence: 'Marketplace review analysis.',
        },
      ],
      competitorLandscapeSummary:
        'Sleepy Owl & Blue Tokai hold retail shelf awareness; room exists for single-estate cold concentrates.',
      pricingAnalysis: {
        tiers: [
          {
            tier: '10-Serve Concentrate Bottle',
            range: '$11 – $14',
            positioning: 'Convenience premium',
          },
        ],
        recommendation: 'Introduce as a subscriber add-on before standalone retail.',
      },
      marketOpportunities: ['Subscriber summer add-on bundle'],
      businessModelOptions: [
        {
          model: 'Subscriber Add-On SKU',
          pros: 'Zero new acquisition cost',
          cons: 'Requires retort/HPP bottling partner',
          fit: 'Phase 2 Expansion',
        },
      ],
      revenuePotential: {
        year1Conservative: '$35k – $55k incremental ARR',
        year1Target: '$80k – $110k incremental ARR',
        unitEconomicsNote: 'Co-packer MOQ 3,000 units per run.',
        factType: 'estimate',
      },
      startupCostEstimates: [
        {
          category: 'Co-packing Trial Run',
          range: '$4,500 – $7,000',
          note: 'Shelf-life & stability testing included',
        },
      ],
      risksAndChallenges: [
        {
          risk: 'Cold-chain or shelf-life spoilage if velocity lags',
          severity: 'medium',
          mitigation: 'Pre-sell to existing subscribers first.',
        },
      ],
      validationExperiments: [
        {
          title: 'Waitlist landing page inside customer portal',
          metric: '15% opt-in from existing buyers',
          timeframe: '14 days',
        },
      ],
      finalRecommendation: {
        verdict:
          'Defer co-packing spend to Q2 2027; prioritize core whole-bean Discovery Flight launch first.',
        nextSteps: ['Keep in Research Repository as Phase 2 SKU expansion.'],
      },
      sources: [
        {
          title: 'Beverage Packaging & Co-Packing Capacity Benchmarks',
          publisher: 'Packaging Industry Association of India',
          date: '2026-10',
          reliability: 'Market Estimate',
          url: 'https://packaging.org.in/reports/cold-brew-formats',
          domain: 'packaging.org.in',
          domainReputation: 'Industry Leader',
          authorityScore: 89,
          verificationStatus: 'verified_live',
          metricCited: 'Ready-to-Drink Format Addressable Market (TAM)',
          metricValue: '$900M – $1.2B',
          statisticContext:
            'Urban ready-to-drink coffee & cold beverage commercial volume benchmarks',
        },
        {
          title: 'Ready-to-Drink Cold Coffee Retail Velocity Survey',
          publisher: 'Euromonitor International',
          date: '2026-09',
          reliability: 'Industry Report',
          url: 'https://www.euromonitor.com/rtd-beverage-india',
          domain: 'euromonitor.com',
          domainReputation: 'Primary Benchmark',
          authorityScore: 95,
          verificationStatus: 'verified_live',
          metricCited: 'Serviceable Cold Brew Share (SAM)',
          metricValue: '$110M – $150M',
          statisticContext:
            'Premium unsweetened cold brew concentrates in Tier-1 grocery and quick commerce channels',
        },
      ],
      scenarios: [
        {
          id: 'scen-cold-pilot',
          name: 'Summer Subscriber Drop Pilot',
          tamBillion: 1.1,
          samSharePct: 12,
          somSharePct: 1.5,
          targetArpuUsd: 14,
          breakEvenMonths: 8,
          createdAt: '2026-11-05',
          notes: 'Pre-order run exclusively offered to whole-bean active subscribers.',
          isCustom: false,
        },
      ],
    },
  ],
  activeReportId: 'rep-1',
  competitors: [
    {
      id: 'comp-1',
      name: 'Roastery House',
      website: 'https://roasteryhouse.example.com',
      category: 'Café-First Specialty Roaster',
      geography: 'Hyderabad, Kolkata, Delhi',
      discoveryMethod: 'AI Market Scan',
      positioning: 'Heritage bungalow cafés with approachable Indian estate coffees',
      priceRange: '$11 – $15 / 250g',
      researchStatus: 'Complete',
      lastResearched: '2026-11-15',
      threatLevel: 'high',
      marketShareBand: 'Strong regional café loyalty (Est. 22% local share)',
      xValueScore: 48,
      yDiffScore: 62,
      overview:
        'Roastery House enjoys deep consumer trust in Hyderabad and Kolkata thanks to warm courtyard café spaces. Their retail coffee bags are primarily bought as impulse souvenirs at cafés rather than optimized for D2C digital subscriptions.',
      productsAndServices: [
        { name: 'Mandalkhan Estate Whole Bean (250g)', price: '$12', notes: 'Bestseller in-café' },
        { name: 'Cascara & Cold Brew Bottles', price: '$4', notes: 'In-store only' },
        { name: 'Café Dine-In & Bakery Menu', price: '$5 – $12', notes: 'Primary revenue driver' },
      ],
      pricingModel: {
        summary:
          'Accessible specialty retail pricing subsidized by high-margin café food & beverage.',
        entryPrice: '$10.50 / 250g',
        flagshipPrice: '$15.00 / 250g',
        discounts: '10% off 1kg packs; minimal subscription incentives.',
      },
      brandPositioningDetail: {
        archetype: 'Warm Neighborhood Host',
        tagline: 'Coffee crafted with Indian heritage.',
        targetBuyer: 'Social café-goers and families seeking cozy third places.',
        visualTone: 'Earthy browns, rustic heritage architecture, photography-led.',
      },
      websiteAnalysis: {
        clarityScore: '6.8 / 10',
        primaryCTA: 'Explore Cafés & Menu',
        speedNote: 'Heavy imagery on menu pages; online bean checkout requires 5 steps.',
        conversionGaps: [
          'No roast-date guarantee displayed before checkout',
          'No guided grind or brewer matcher quiz',
          'Subscription management hidden inside account footer',
        ],
      },
      marketingStrategy: {
        channels: ['Instagram Reels', 'In-café community events', 'Word of mouth'],
        contentCadence: '4–5 posts/week focused on latte art & café ambience',
        paidSignals: 'Minimal paid search; occasional local store-opening boosts.',
      },
      customerReviews: {
        averageRating: '4.6 / 5',
        reviewCount: '3,400+ Google & social reviews',
        praisedFor: ['Courtyard ambience', 'Consistent cranberry coffee', 'Friendly baristas'],
        complaints: [
          'Weekend wait times',
          'Online bean shipping takes 5–7 days',
          'Bags sometimes lack recent roast stamps',
        ],
      },
      strengths: [
        'Iconic physical café footprint driving organic brand love',
        'Direct estate relationships across Karnataka',
      ],
      weaknesses: [
        'Digital D2C storefront feels secondary to hospitality',
        'No multi-origin tasting flight onboarding funnel',
        'Slow fulfillment turnaround for online orders',
      ],
      historicalChanges: [
        {
          date: '2026-11-11',
          change: 'Expanded weekend brunch menu in Jubilee Hills flagship',
          source: 'Instagram & Menu PDF',
        },
        {
          date: '2026-10-22',
          change: 'Increased 250g Mandalkhan price by +8%',
          source: 'Website Pricing Snapshot',
        },
      ],
      monitoringEnabled: true,
      monitoringFrequency: 'Daily',
      monitoredCategories: [
        'Pricing changes',
        'Product launches',
        'Website changes',
        'Public social media activity',
      ],
    },
    {
      id: 'comp-2',
      name: 'The Coffee Co.',
      website: 'https://thecoffeeco.example.com',
      category: 'Nationwide D2C Catalog Roaster',
      geography: 'Pan-India & Export',
      discoveryMethod: 'AI Market Scan',
      positioning: 'Wide-catalog specialty roaster with 18+ single-origin SKUs',
      priceRange: '$13 – $19 / 250g',
      researchStatus: 'Complete',
      lastResearched: '2026-11-14',
      threatLevel: 'high',
      marketShareBand: 'Market leader in D2C beans (Est. 31% online share)',
      xValueScore: 72,
      yDiffScore: 74,
      overview:
        'The Coffee Co. operates a mature national D2C engine and strong marketplace presence. While comprehensive, their 18-SKU catalog overwhelms newcomers and their packaging/messaging feels clinical and crowded.',
      productsAndServices: [
        {
          name: 'Customizer 250g Single Origins (18 SKUs)',
          price: '$13 – $19',
          notes: 'Broad roast spectrum',
        },
        { name: 'Easy Pour Drip Bags (Box of 10)', price: '$11', notes: 'Travel & convenience' },
        { name: 'B2B Office Espresso Supply', price: 'Custom quote', notes: 'Enterprise focus' },
      ],
      pricingModel: {
        summary: 'Mid-to-premium D2C pricing with 15% subscription discount.',
        entryPrice: '$11.00',
        flagshipPrice: '$19.50',
        discounts: '15% subscriber discount + seasonal marketplace promos.',
      },
      brandPositioningDetail: {
        archetype: 'Technical Specialist',
        tagline: 'Precision roasted across 18 estates.',
        targetBuyer: 'Experienced home espresso & V60 hobbyists.',
        visualTone: 'Muted slate & bold color-coded roast cards; dense informational layout.',
      },
      websiteAnalysis: {
        clarityScore: '7.5 / 10',
        primaryCTA: 'Shop All Coffees',
        speedNote: 'Fast checkout, though filter taxonomy is intimidating for beginners.',
        conversionGaps: [
          'Choice paralysis across 18 nearly identical estate names',
          'No B2B self-serve estimator for small 20–50 person studios',
        ],
      },
      marketingStrategy: {
        channels: ['Google Search Ads', 'Instagram', 'Amazon & Quick Commerce'],
        contentCadence: 'Daily product education & influencer unboxings',
        paidSignals: 'Heavy bidding on "best specialty coffee online" keywords.',
      },
      customerReviews: {
        averageRating: '4.4 / 5',
        reviewCount: '5,100+ verified reviews',
        praisedFor: ['Wide selection', 'Fast metro delivery', 'Consistent medium-dark roasts'],
        complaints: [
          'Confusing flavor wheel descriptions',
          'Occasional rigid subscription renewal reminders',
        ],
      },
      strengths: ['High SEO authority and marketplace distribution', 'Fast 24–48h metro logistics'],
      weaknesses: [
        'Catalog sprawl creates decision fatigue for new brewers',
        'Visual identity lacks warmth and collectible craft appeal',
      ],
      historicalChanges: [
        {
          date: '2026-11-14',
          change: 'Launched winter limited-edition Honey Process micro-lot ($19)',
          source: 'Homepage Hero Banner',
        },
        {
          date: '2026-11-02',
          change: 'Updated subscription discount from 12% to 15% on 500g bags',
          source: 'Pricing Page Diff',
        },
      ],
      monitoringEnabled: true,
      monitoringFrequency: 'Daily',
      monitoredCategories: [
        'Pricing changes',
        'Product launches',
        'Offers and promotions',
        'Search visibility',
      ],
      isTeaserGated: true,
      unlockCreditCost: 25,
      unlocked: false,
    },
    {
      id: 'comp-3',
      name: 'Bigg Boss Cafe',
      website: 'https://biggbosscafe.example.com',
      category: 'Lifestyle & Aesthetic Café Chain',
      geography: 'Hyderabad & Pune',
      discoveryMethod: 'Idea Research',
      positioning: 'Social-first café aesthetic & signature iced beverages',
      priceRange: '$9 – $14 / 250g',
      researchStatus: 'Complete',
      lastResearched: '2026-11-15',
      threatLevel: 'medium',
      marketShareBand: 'Fast-growing youth café footprint (Est. 14% local share)',
      xValueScore: 34,
      yDiffScore: 41,
      overview:
        'Bigg Boss Cafe excels at Instagram-driven foot traffic and trending café aesthetics, generating +12% weekly social momentum. However, their bean sourcing transparency and home-brew ecosystem are underdeveloped.',
      productsAndServices: [
        {
          name: 'House Signature Blend (250g)',
          price: '$10',
          notes: 'Dark chocolate & hazelnut profile',
        },
        {
          name: 'Iced Matcha & Espresso Tonics',
          price: '$4.50',
          notes: 'High social shareability',
        },
      ],
      pricingModel: {
        summary: 'Value-oriented retail bags acting as café merch.',
        entryPrice: '$9.50',
        flagshipPrice: '$14.00',
        discounts: 'Buy-2-get-1 café beverage combos.',
      },
      brandPositioningDetail: {
        archetype: 'Vibrant Social Creator',
        tagline: 'Your daily aesthetic ritual.',
        targetBuyer: 'Gen-Z students, creators, and casual weekend café visitors.',
        visualTone: 'High-contrast latte art photography, playful social captions.',
      },
      websiteAnalysis: {
        clarityScore: '5.9 / 10',
        primaryCTA: 'Find a Store',
        speedNote: 'Mobile-first linktree style; limited e-commerce depth.',
        conversionGaps: ['No subscription engine', 'Minimal origin or elevation transparency'],
      },
      marketingStrategy: {
        channels: ['Instagram Reels', 'TikTok/Shorts', 'Creator Collabs'],
        contentCadence: '1–2 reels daily showcasing behind-the-bar drinks',
        paidSignals: 'Local geo-fenced Instagram boosts.',
      },
      customerReviews: {
        averageRating: '4.3 / 5',
        reviewCount: '1,850 reviews',
        praisedFor: ['Aesthetic interiors', 'Creative seasonal iced drinks'],
        complaints: ['Inconsistent pour-over extraction', 'Limited whole-bean variety'],
      },
      strengths: [
        'Strong viral content engine (+12% weekly engagement)',
        'High Gen-Z brand recall',
      ],
      weaknesses: [
        'Low credibility among serious home brewers & offices',
        'No digital retention loop after café visits',
      ],
      historicalChanges: [
        {
          date: '2026-11-15',
          change: 'Behind-the-scenes barista pour video hit 2.3x average engagement',
          source: 'Public Social Feed',
        },
      ],
      monitoringEnabled: true,
      monitoringFrequency: 'Weekly',
      monitoredCategories: [
        'Public social media activity',
        'Offers and promotions',
        'Business expansion announcements',
      ],
      isTeaserGated: true,
      unlockCreditCost: 25,
      unlocked: false,
    },
    {
      id: 'comp-4',
      name: 'Monolith Brew Labs',
      website: 'https://monolithlabs.example.com',
      category: 'Boutique Design-Led Roaster',
      geography: 'Bengaluru',
      discoveryMethod: 'Manual Entry',
      positioning: 'Ultra-minimal experimental fermentation roaster for coffee purists',
      priceRange: '$19 – $30 / 250g',
      researchStatus: 'Complete',
      lastResearched: '2026-11-12',
      threatLevel: 'low',
      marketShareBand: 'Niche connoisseur segment (Est. 6% share)',
      xValueScore: 88,
      yDiffScore: 86,
      overview:
        'Monolith Brew Labs commands high prices with architectural packaging and rare anaerobic lots, but alienates everyday professionals with complex jargon and high price barriers.',
      productsAndServices: [
        { name: 'Anaerobic Natural Lot #09', price: '$24', notes: 'Small batch release' },
      ],
      pricingModel: {
        summary: 'Luxury scarcity pricing with limited drops.',
        entryPrice: '$19.00',
        flagshipPrice: '$30.00',
        discounts: 'None.',
      },
      brandPositioningDetail: {
        archetype: 'Avant-Garde Alchemist',
        tagline: 'Experimental terroir in monochrome.',
        targetBuyer: 'Coffee judges, collectors, and specialty baristas.',
        visualTone: 'Stark matte black, clinical typography.',
      },
      websiteAnalysis: {
        clarityScore: '7.1 / 10',
        primaryCTA: 'Shop Current Drop',
        speedNote: 'Clean minimalist storefront.',
        conversionGaps: ['Frequently sold out', 'Zero beginner onboarding'],
      },
      marketingStrategy: {
        channels: ['Newsletter drops', 'Minimalist Instagram'],
        contentCadence: '2 posts/week',
        paidSignals: 'None observed.',
      },
      customerReviews: {
        averageRating: '4.7 / 5',
        reviewCount: '420 reviews',
        praisedFor: ['Unique fruit-forward profiles', 'Packaging craft'],
        complaints: ['High price per cup', 'Frequent stockouts'],
      },
      strengths: ['Strong design prestige', 'High average order value'],
      weaknesses: ['Narrow addressable audience', 'Poor everyday subscription continuity'],
      historicalChanges: [
        {
          date: '2026-11-08',
          change: 'Sold out Lot #09 in 36 hours',
          source: 'Storefront Stock Monitor',
        },
      ],
      monitoringEnabled: false,
      monitoringFrequency: 'Weekly',
      monitoredCategories: ['Product launches', 'Website changes'],
    },
  ],
  selectedCompetitorId: 'comp-1',
  ownPositionScore: { x: 58, y: 80 },
  archivedEventIds: [],
  gapAnalysis: [
    {
      id: 'gap-1',
      dimension: 'Competitor Weaknesses',
      title: 'Delayed D2C freshness & opaque roast dates among café-first chains',
      observation:
        'Roastery House and Bigg Boss Cafe prioritize physical footfall; online bags often arrive 2–4 weeks post-roast without guaranteed batch dispatch.',
      opportunity:
        'Guarantee Tuesday roasting + 48-hour dispatch with batch lot numbers stamped prominently on every Solstice bag.',
      impact: 'high',
    },
    {
      id: 'gap-2',
      dimension: 'Underserved Customers',
      title: '20–80 person design, SaaS & creative studios ignored by B2B coffee suppliers',
      observation:
        'The Coffee Co. targets large 300+ corporate campuses while café brands ignore offices entirely.',
      opportunity:
        'Launch a turnkey "Studio Barista Program" with predictable weekly bags and a 45-minute team pour-over workshop.',
      impact: 'high',
    },
    {
      id: 'gap-3',
      dimension: 'Pricing Opportunities',
      title: 'Missing low-risk $15 multi-origin tasting entry point',
      observation:
        'Competitors force $13–$24 single-bag commitments upfront, creating hesitation for first-time online buyers.',
      opportunity:
        'Use the $15 3×100g Discovery Flight with a $5 first-subscription credit to lift trial-to-subscriber conversion.',
      impact: 'high',
    },
    {
      id: 'gap-4',
      dimension: 'Positioning Opportunities',
      title: 'Warm architectural clarity between clinical purism and noisy lifestyle cafés',
      observation:
        'Monolith feels intimidatingly stark; Bigg Boss Cafe feels purely aesthetic without craft depth.',
      opportunity:
        'Own "Warm Precision" — editorial design polish paired with approachable, jargon-free home brewing guidance.',
      impact: 'medium',
    },
    {
      id: 'gap-5',
      dimension: 'Product Opportunities',
      title: 'Equipment-calibrated grind & recipe pairing cards',
      observation:
        'Home brewers consistently complain about dialing in new beans on V60 or AeroPress.',
      opportunity:
        'Include an interactive QR brew card matched to the exact roast batch and the buyer’s chosen brewer.',
      impact: 'medium',
    },
    {
      id: 'gap-6',
      dimension: 'Distribution Opportunities',
      title: 'Behind-the-scenes roasting content driving organic D2C waitlists',
      observation:
        'Café-aesthetic reels generate 2.3x higher engagement in food & coffee categories right now.',
      opportunity:
        'Document Tuesday roasting batches & estate farmer stories to convert organic viewers directly to Discovery Flights.',
      impact: 'medium',
    },
  ],
  competitiveStrategy: {
    whereToCompete:
      'Focus on D2C Tuesday roast-to-order subscriptions in Tier-1 metros and self-serve B2B coffee programs for 15–80 person creative/tech studios.',
    whereToDifferentiate:
      '48-hour roast-to-door freshness guarantee, $15 3-origin Discovery Flight onboarding, and warm architectural packaging paired with jargon-free brew cards.',
    whatToAvoid:
      'Avoid signing expensive high-street café leases in Year 1 or competing on 18+ overwhelming SKU catalogs and steep marketplace discounting.',
    targetSegment:
      'Primary: Remote knowledge workers (25–38) upgrading their morning home ritual. Secondary: Boutique studios replacing generic office coffee.',
    potentialMoat:
      'Habitual Tuesday-roast subscription lock-in combined with personalized brewer calibration profiles and direct estate forward contracts.',
    nextMoves: [
      'Translate "Warm Precision" positioning into Solstice’s visual identity & packaging in Brand Studio',
      'Produce the 3×100g Discovery Flight box and Tuesday Roast batch stamp',
      'Run a 30-day launch campaign pairing behind-the-scenes roasting reels with B2B studio tasting drops',
    ],
    savedToBrain: true,
  },
  brand: {
    status: 'Approved',
    brandName: 'Solstice Craft Coffee',
    tagline: 'Roasted Tuesday. Brewed by Thursday.',
    industry: 'Specialty Coffee & D2C Beverage',
    positioningStatement:
      'Warm architectural minimalism meets radical roast-date transparency—making café-caliber single-origin rituals effortless at home and in the studio.',
    targetAudience: 'Design-conscious remote professionals & modern creative workspaces',
    personalityTraits: ['Warm', 'Precise', 'Unpretentious', 'Transparent', 'Tactile'],
    attributes: [
      '48h Freshness',
      'Single-Estate Traceable',
      'Guided Rituals',
      'Architectural Calm',
    ],
    visualDirection:
      'Warm Alabaster, Charcoal Roast & Ember Orange accents with editorial Manrope typography.',
    selectedConceptId: 'concept-1',
    concepts: [
      {
        id: 'concept-1',
        name: 'Solar Roast Horizon',
        rationale:
          'Clean geometric sunrise-over-bean emblem symbolizing Tuesday dawn roasting and warm morning rituals.',
        primaryColor: '#242424',
        secondaryColor: '#F8F8F6',
        accentColor: '#EE7542',
        surfaceColor: '#FFFFFF',
        headingFont: 'Manrope',
        bodyFont: 'Plus Jakarta Sans',
        personality: ['Editorial', 'Warm', 'Modern'],
        markStyle: 'geometric',
      },
      {
        id: 'concept-2',
        name: 'Monogram Craft Seal',
        rationale:
          'Interlocking SC architectural seal designed for wax-like batch stickers, coffee tins, and studio signage.',
        primaryColor: '#1E1D1B',
        secondaryColor: '#F2F2EF',
        accentColor: '#DB6334',
        surfaceColor: '#FFFFFF',
        headingFont: 'Manrope',
        bodyFont: 'Plus Jakarta Sans',
        personality: ['Architectural', 'Timeless', 'Tactile'],
        markStyle: 'monogram',
      },
      {
        id: 'concept-3',
        name: 'Origin Stamp Emblem',
        rationale:
          'Passport-inspired micro-lot coordinate frame built to showcase Chikmagalur & Araku elevation metadata.',
        primaryColor: '#252525',
        secondaryColor: '#FFF0E8',
        accentColor: '#EE7542',
        surfaceColor: '#F8F8F6',
        headingFont: 'Manrope',
        bodyFont: 'JetBrains Mono',
        personality: ['Traceable', 'Precise', 'Curated'],
        markStyle: 'emblem',
      },
    ],
    palette: [
      { name: 'Espresso Ink', hex: '#242424', role: 'Primary typography & dark packaging base' },
      { name: 'Alabaster Paper', hex: '#F8F8F6', role: 'Secondary canvas & carton stock' },
      { name: 'Ember Roast', hex: '#EE7542', role: 'Batch stamps, primary CTAs & focal accents' },
      { name: 'Stone Hairline', hex: '#EAEAE7', role: 'Dividers, grid borders & label frames' },
      { name: 'Muted Umber', hex: '#747474', role: 'Tasting notes & origin metadata' },
    ],
    typography: {
      heading: 'Manrope (SemiBold / Bold, -0.02em tracking)',
      body: 'Plus Jakarta Sans (Regular / Medium, 1.6 line-height)',
      mono: 'JetBrains Mono (Roast dates, elevation & brew ratios)',
    },
    guidelines: {
      logoUsage:
        'Maintain minimum 1x mark height clearspace on all sides. Use Espresso Ink on light stock and Pure White/Ember on dark cartons.',
      spacingRule:
        '8px spatial grid. Generous 32px+ margins on packaging front panels; avoid crowding tasting descriptors.',
      visualStyle:
        'Natural window-lit photography on travertine/oak surfaces paired with clean batch coordinate typography.',
      brandVoice:
        'Knowledgeable, calm, encouraging—never pretentious. Explain why a roast tastes bright without intimidating jargon.',
      messagingPillars: [
        'Roasted every Tuesday, at your door within 48 hours.',
        'Single-estate Indian coffee, calibrated for your home brewer.',
        'Start with three 100g origins before you ever subscribe.',
      ],
    },
  },
  assets: [
    {
      id: 'asset-1',
      title: 'Discovery Flight 3-Pack Sleeve',
      category: 'Packaging',
      folder: 'Print & Packaging',
      format: 'Print Carton · 240 × 110 mm',
      createdAt: '2026-11-15',
      status: 'Approved',
      headlineText: 'Three Indian Estates. Roasted Tuesday.',
      subtext: 'Chikmagalur Washed · Araku Natural · Ratnagiri Honey · 3 × 100g',
      accentHex: '#EE7542',
    },
    {
      id: 'asset-2',
      title: 'Solstice Master Logo Lockup',
      category: 'Logo',
      folder: 'Identity',
      format: 'SVG + Vector Pack',
      createdAt: '2026-11-15',
      status: 'Approved',
      headlineText: 'Solstice Craft Coffee',
      subtext: 'Primary Horizontal + Stacked Emblem (Light & Dark)',
      accentHex: '#EE7542',
    },
    {
      id: 'asset-3',
      title: '48-Hour Freshness Instagram Carousel',
      category: 'Carousel',
      folder: 'Social Media',
      format: '1080 × 1350 px (4:5)',
      createdAt: '2026-11-16',
      status: 'Approved',
      headlineText: 'Why your grocery coffee tastes flat.',
      subtext: 'Slide 1 of 5 · Most retail beans sit 90+ days before reaching your grinder.',
      accentHex: '#EE7542',
      darkVariant: true,
    },
    {
      id: 'asset-4',
      title: 'Studio Barista Program One-Pager',
      category: 'Brochure',
      folder: 'Print & Packaging',
      format: 'A4 Editorial Sheet',
      createdAt: '2026-11-16',
      status: 'Draft',
      headlineText: 'Better coffee for thoughtful teams.',
      subtext: 'Weekly Tuesday bean replenishment + quarterly team cupping session.',
      accentHex: '#EE7542',
    },
    {
      id: 'asset-5',
      title: 'Founder Business Card — Vishesh Kakar',
      category: 'Business Card',
      folder: 'Identity',
      format: '85 × 55 mm Matte Cotton',
      createdAt: '2026-11-14',
      status: 'Approved',
      headlineText: 'Vishesh Kakar · Founder',
      subtext: 'vishesh@solsticecoffee.example.com · Hyderabad / Bengaluru',
      accentHex: '#EE7542',
      darkVariant: true,
    },
    {
      id: 'asset-6',
      title: 'Tuesday Roast Batch Sticker Set',
      category: 'Sticker',
      folder: 'Print & Packaging',
      format: '50 mm Thermal Batch Seal',
      createdAt: '2026-11-15',
      status: 'Approved',
      headlineText: 'ROASTED NOV 17 · LOT #042',
      subtext: 'Peak window: Nov 20 – Dec 18',
      accentHex: '#EE7542',
    },
  ],
  marketEvents: [
    {
      id: 'evt-1',
      competitorOrSource: 'The Coffee Co.',
      category: 'Product launches',
      detectedChange:
        'Published new homepage banner for Winter Honey Process Micro-Lot priced at $19 / 250g.',
      detectedAt: '2 hours ago · 2026-11-16',
      sourceReference: 'thecoffeeco.example.com/collections/microlots',
      importance: 'high',
      aiInterpretation:
        'Competitor is pushing higher-margin seasonal drops ahead of December gifting. Their $19 single-bag threshold creates a clear price-anchoring contrast for Solstice’s $15 3-origin Discovery Flight.',
      potentialImpact: 'Validates strong appetite for seasonal micro-lot storytelling in Q4.',
      suggestedAction:
        'Launch a 48-hour early-access Discovery Flight campaign highlighting 3 seasonal harvests for $15.',
      isRead: false,
    },
    {
      id: 'evt-2',
      competitorOrSource: 'Bigg Boss Cafe',
      category: 'Public social media activity',
      detectedChange:
        'Behind-the-scenes barista pour & café aesthetic reel series achieved +12% weekly follower growth.',
      detectedAt: 'Yesterday · 2026-11-15',
      sourceReference: 'Instagram @biggbosscafe public feed',
      importance: 'medium',
      aiInterpretation:
        'Short-form behind-the-scenes craft clips are currently outperforming static product flat-lays by ~2.3x in regional coffee engagement.',
      potentialImpact: 'Organic reach opportunity for Solstice Tuesday roasting batch videos.',
      suggestedAction:
        'Film a 25-second Tuesday morning roaster drum + tasting flight packing reel for Instagram.',
      isRead: false,
    },
    {
      id: 'evt-3',
      competitorOrSource: 'Roastery House',
      category: 'Pricing changes',
      detectedChange:
        'Increased Mandalkhan Estate 250g retail bag from $11.00 to $12.00 (+9%) and raised free-shipping threshold to $25.',
      detectedAt: '3 days ago · 2026-11-13',
      sourceReference: 'roasteryhouse.example.com/shop',
      importance: 'high',
      aiInterpretation:
        'Rising green bean costs are forcing competitors to raise shipping thresholds. Solstice can highlight free metro courier on all bi-weekly subscriptions.',
      potentialImpact: 'Improves Solstice’s relative price-value perception for D2C subscribers.',
      suggestedAction:
        'Add "Free 48h Metro Dispatch on Subscriptions" callout to checkout and social ads.',
      isRead: true,
    },
    {
      id: 'evt-4',
      competitorOrSource: 'Regional Industry Brief',
      category: 'Market trends',
      detectedChange:
        'Specialty grinder & pour-over kettle sales rose 28% YoY in Bengaluru & Hyderabad.',
      detectedAt: '5 days ago · 2026-11-11',
      sourceReference: 'Urban Home Brewing Equipment Report Q4',
      importance: 'medium',
      aiInterpretation:
        'Expanding installed base of home pour-over gear directly increases demand for freshly roasted whole beans and grind-matched brew guides.',
      potentialImpact: 'Expands serviceable addressable market for Solstice home subscriptions.',
      suggestedAction:
        'Partner with 2 local specialty gear boutiques to slip Discovery Flight QR cards into grinder boxes.',
      isRead: true,
    },
  ],
  scheduledReports: {
    dailyDigest: true,
    weeklyIntelligence: true,
    monthlyReview: true,
    deliveryEmail: 'vishesh.kakar@gmail.com',
    includeCompetitorDiffs: true,
  },
  goals: [
    {
      id: 'goal-1',
      category: 'Customer Acquisition',
      title: 'Convert 100 Discovery Flight Buyers',
      targetValue: 100,
      currentValue: 42,
      unit: 'boxes',
      deadline: '2026-12-16',
      supportingTaskIds: ['task-1', 'task-2'],
    },
    {
      id: 'goal-2',
      category: 'Revenue',
      title: 'Reach $4,500 Monthly Recurring Subscription Revenue',
      targetValue: 4500,
      currentValue: 1680,
      unit: '$ MRR',
      deadline: '2027-01-31',
      supportingTaskIds: ['task-3', 'task-4'],
    },
    {
      id: 'goal-3',
      category: 'Marketing',
      title: 'Onboard 12 Boutique Studio B2B Accounts',
      targetValue: 12,
      currentValue: 4,
      unit: 'studios',
      deadline: '2027-02-15',
      supportingTaskIds: ['task-5'],
    },
    {
      id: 'goal-4',
      category: 'Customer Retention',
      title: 'Maintain 40% Flight-to-Subscription Conversion',
      targetValue: 40,
      currentValue: 36,
      unit: '%',
      deadline: '2026-12-31',
      supportingTaskIds: ['task-6'],
    },
  ],
  tasks: [
    {
      id: 'task-1',
      title: 'Publish 48-Hour Roast Freshness Carousel on Instagram',
      description:
        'Export the approved 5-slide carousel from Brand Studio and pair with link-in-bio $15 Discovery Flight offer.',
      whyItMatters:
        'Addresses #1 customer frustration discovered in research (stale 90-day marketplace coffee).',
      expectedOutcome: '18–25 Discovery Flight orders and 40+ email signups in 72 hours.',
      priority: 'high',
      estimatedMinutes: 25,
      dueDate: '2026-11-17',
      department: 'Brand Studio',
      status: 'pending',
      isTodayPriority: true,
      notes: 'Use Ember Orange slide 1 hook.',
    },
    {
      id: 'task-2',
      title: 'Send Studio Barista Tasting Kits to 5 Hyderabad Design Agencies',
      description:
        'Deliver complimentary 3-origin sample kits with the Studio Barista one-pager to pre-qualified creative studios.',
      whyItMatters:
        'B2B studio accounts deliver 10x higher LTV than single-bag retail orders with near-zero digital ad spend.',
      expectedOutcome:
        'Book 3 live cupping sessions and close 1–2 recurring $240/mo studio contracts.',
      priority: 'high',
      estimatedMinutes: 45,
      dueDate: '2026-11-17',
      department: 'Growth Director',
      status: 'pending',
      isTodayPriority: true,
    },
    {
      id: 'task-3',
      title: 'Add "Free 48h Metro Dispatch" Banner Following Roastery House Price Hike',
      description:
        'Highlight free metro subscription shipping above the fold after Roastery House raised their free-shipping floor to $25.',
      whyItMatters:
        'Capitalizes on a live Market Watch competitor pricing shift detected 3 days ago.',
      expectedOutcome: '+6% checkout completion lift on subscription landing page.',
      priority: 'high',
      estimatedMinutes: 15,
      dueDate: '2026-11-17',
      department: 'Market Watch',
      status: 'pending',
      isTodayPriority: true,
    },
    {
      id: 'task-4',
      title: 'Configure Automated Day-10 Discovery Flight Follow-Up Flow',
      description:
        'Send personalized brew check-in + $5 credit code 10 days after flight delivery while beans are at peak flavor.',
      whyItMatters:
        'Timing conversion outreach to peak tasting window drives 38–42% subscription conversion.',
      expectedOutcome: 'Consistent conversion from trial box to recurring Tuesday roasts.',
      priority: 'medium',
      estimatedMinutes: 35,
      dueDate: '2026-11-18',
      department: 'Growth Director',
      status: 'completed',
    },
    {
      id: 'task-5',
      title: 'Finalize Tuesday Batch QR Brew Card Templates',
      description: 'Generate scannable V60 & AeroPress recipe cards linked to Lot #042.',
      whyItMatters: 'Solves beginner extraction confusion identified in customer interviews.',
      expectedOutcome: 'Higher 2nd-cup satisfaction and lower churn.',
      priority: 'medium',
      estimatedMinutes: 30,
      dueDate: '2026-11-19',
      department: 'Brand Studio',
      status: 'completed',
    },
    {
      id: 'task-6',
      title: 'Review Chickmagalur Estate Harvest Lot #043 Sample',
      description: 'Cup washed & honey-process micro-lots for December subscriber rotation.',
      whyItMatters: 'Maintains product superiority over standard catalog roasters.',
      expectedOutcome: 'Lock December seasonal feature SKU.',
      priority: 'low',
      estimatedMinutes: 40,
      dueDate: '2026-11-20',
      department: 'Business Brain',
      status: 'pending',
    },
  ],
  experiments: [
    {
      id: 'exp-1',
      title: '$15 Discovery Flight + $5 Subscription Credit Funnel',
      hypothesis:
        'Offering a low-risk 3×100g flight with a $5 credit toward the first subscription will convert 2x better than direct $18 single-bag ads.',
      objective:
        'Acquire 100 trial buyers and convert >= 38% to recurring subscribers within 21 days.',
      targetAudience: 'Urban home brewers (24–38) in Hyderabad & Bengaluru',
      action:
        'Split Instagram & search traffic 50/50 between Discovery Flight landing page and standard whole-bean store.',
      successMetric: 'Flight-to-subscription conversion >= 38% at <$11 blended CAC',
      budget: '$450',
      startDate: '2026-11-01',
      endDate: '2026-11-30',
      status: 'Active',
      results: '42 flights sold in first 15 days; 36% of Day-10 cohort already converted.',
      learnings:
        'Customers overwhelmingly select V60 & AeroPress grind presets; add Moka Pot guide card next.',
    },
    {
      id: 'exp-2',
      title: 'Behind-the-Scenes Tuesday Roasting Reel Series',
      hypothesis:
        '25-second documentary clips of Tuesday roasting & batch stamping will achieve 2x engagement over studio flat-lays.',
      objective: 'Drive 1,500 qualified profile visits and 30 organic Discovery Flight orders.',
      targetAudience: 'Specialty café regulars & remote designers',
      action: 'Publish 2 raw roasting reels per week with origin provenance storytelling.',
      successMetric: '>= 4.5% engagement rate and 30 attributed link clicks/post',
      budget: '$120 (light boost)',
      startDate: '2026-11-10',
      endDate: '2026-12-10',
      status: 'Active',
      results: 'First reel reached 4,800 views (2.1x account baseline) with 19 flight clicks.',
      learnings: 'Captions mentioning exact roast date convert best.',
    },
    {
      id: 'exp-3',
      title: 'Free Grinder Calibration Card in Local Gear Shops',
      hypothesis:
        'Co-marketing with 2 specialty equipment boutiques converts high-intent buyers at near-zero CAC.',
      objective: 'Onboard 25 home espresso & pour-over enthusiasts.',
      targetAudience: 'New Baratza / Timemore grinder purchasers',
      action: 'Place 100 QR brew cards offering 20% off first Discovery Flight.',
      successMetric: '20+ redemptions within 30 days',
      budget: '$80 (print)',
      startDate: '2026-11-22',
      endDate: '2026-12-22',
      status: 'Planned',
      results: 'Awaiting card print batch.',
      learnings: 'Pending launch.',
    },
  ],
  recommendations: [
    {
      id: 'rec-1',
      whatToDo: 'Launch a "Founding 100 Roastery Club" tier with locked-in free Tuesday shipping',
      whyToDoIt:
        'Roastery House just raised their free-shipping threshold to $25, creating an immediate comparison hook.',
      supportingResearch: 'Market Watch Pricing Diff (Nov 13) & Idea Report Pricing Analysis',
      expectedBenefit: '+25–35 recurring subscribers before Dec 15',
      difficulty: 'Low',
      estimatedCost: '$0 (offer structure)',
      priority: 'high',
      status: 'pending',
    },
    {
      id: 'rec-2',
      whatToDo: 'Bundle a 15-minute virtual dial-in call for new whole-bean subscribers',
      whyToDoIt:
        'Interviewed brewers cited inconsistent grind/water ratios as their #1 fear when switching roasters.',
      supportingResearch: 'Business Brain Customer Interviews (n=18)',
      expectedBenefit: 'Reduces first-month subscription churn by est. 12%',
      difficulty: 'Medium',
      estimatedCost: 'Founder time (~2 hrs/wk)',
      priority: 'medium',
      status: 'accepted',
    },
    {
      id: 'rec-3',
      whatToDo: 'Delay Cold Brew Concentrate co-packing until 400 active subscribers',
      whyToDoIt:
        '3,000-unit MOQ ties up $5k+ working capital better deployed into Discovery Flight acquisition.',
      supportingResearch: 'Research Report #2 (Cold Brew Format Validation)',
      expectedBenefit: 'Preserves $5,500 runway for high-ROI customer acquisition',
      difficulty: 'Low',
      estimatedCost: '$0',
      priority: 'medium',
      status: 'pending',
    },
  ],
  notifications: [
    {
      id: 'notif-1',
      title: 'Competitor Launch: The Coffee Co.',
      description: 'New $19 Winter Honey Process Micro-Lot detected on homepage.',
      category: 'Competitor Alert',
      timestamp: '2h ago',
      read: false,
      targetRoute: 'market-watch',
    },
    {
      id: 'notif-2',
      title: '3 Today Priorities Ready in Growth Planner',
      description: 'Instagram freshness carousel & 5 studio tasting deliveries scheduled today.',
      category: 'Daily Task',
      timestamp: '4h ago',
      read: false,
      targetRoute: 'growth-director',
    },
    {
      id: 'notif-3',
      title: 'Research Report Saved to Business Brain',
      description:
        'Specialty Roast-on-Demand Subscription dossier (High confidence) synced across departments.',
      category: 'Research Complete',
      timestamp: 'Yesterday',
      read: true,
      targetRoute: 'idea-intelligence',
    },
    {
      id: 'notif-4',
      title: 'Opportunity: Free Shipping Comparison Hook',
      description:
        'Roastery House raised shipping threshold to $25 — suggested conversion experiment ready.',
      category: 'Opportunity',
      timestamp: '3d ago',
      read: true,
      targetRoute: 'tasks-experiments',
    },
  ],
};
