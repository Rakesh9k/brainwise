/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type {
  BusinessBrainData,
  TruthCheckResult,
  TruthCheckItem,
  TruthViolation,
} from '../types/brainwise';

export interface GroundTruthFacts {
  businessName: string;
  website: string;
  location: string;
  approvedProducts: {
    id: string;
    name: string;
    priceRange: string;
    normalizedPrices: number[];
  }[];
  explicitExclusions: string[];
}

/**
 * Extracts numeric prices from a price string (e.g., "$18 – $26 / month" -> [18, 26]).
 */
export function extractNumericPrices(text: string): number[] {
  if (!text) return [];
  // Match currency patterns like $15, $15.50, ₹2999, €45, 15 USD
  const matches = text.match(/(?:[$₹€£]|USD\s?|INR\s?)(\d+(?:\.\d+)?)/gi) || [];
  const prices: number[] = [];

  for (const match of matches) {
    const num = parseFloat(match.replace(/[^\d.]/g, ''));
    if (!Number.isNaN(num) && !prices.includes(num)) {
      prices.push(num);
    }
  }

  return prices;
}

/**
 * Extracts the core forbidden phrases from an exclusion rule.
 * E.g. "Never state 100% organic without official estate certification" -> ["100% organic"]
 */
export function extractForbiddenPhrases(exclusion: string): string[] {
  const phrases: string[] = [];

  // Quoted phrases take precedence: "100% organic"
  const quoted = exclusion.match(/"([^"]+)"|'([^']+)'/g);
  if (quoted) {
    for (const q of quoted) {
      const clean = q.replace(/["']/g, '').trim();
      if (clean.length > 2) phrases.push(clean);
    }
  }

  // Extract phrase before conditions like "without", "unless", "except"
  const base = exclusion.split(/\b(?:without|unless|except)\b/i)[0] || exclusion;
  const stripped = base
    .replace(
      /^(?:never\s+(?:claim|state|say|use|mention|offer|promise|provide|feature|sell)?|do\s+not\s+(?:claim|state|say|use|mention|offer|promise|provide|feature|sell)?|don't\s+(?:claim|state|say|use|mention|offer|promise|provide|feature|sell)?|no\s+)/i,
      ''
    )
    .replace(/\s+/g, ' ')
    .trim();

  if (stripped.length > 2 && !phrases.some((p) => p.toLowerCase() === stripped.toLowerCase())) {
    phrases.push(stripped);
  }

  return phrases;
}

/**
 * Compiles verified ground truth facts from the BusinessBrain.
 */
export function extractGroundTruth(brain: BusinessBrainData): GroundTruthFacts {
  const products = (brain.products || []).map((p) => {
    const rawPrice = [p.priceRange, (p as any).price].filter(Boolean).join(' ');
    return {
      id: p.id,
      name: p.name,
      priceRange: p.priceRange || String((p as any).price || ''),
      normalizedPrices: extractNumericPrices(rawPrice),
    };
  });

  const exclusions = brain.strategicMemory?.explicitExclusions || [];

  return {
    businessName: brain.businessName || '',
    website: brain.website || '',
    location: brain.location || '',
    approvedProducts: products,
    explicitExclusions: exclusions,
  };
}

/**
 * Performs a deterministic truth check against verified BusinessBrain facts.
 */
export function executeTruthCheck(content: string, brain: BusinessBrainData): TruthCheckResult {
  const groundTruth = extractGroundTruth(brain);
  const checkedItems: TruthCheckItem[] = [];
  const violations: TruthViolation[] = [];
  let remediatedContent = content;

  // 1. Check Explicit Exclusions (Forbidden Claims - Literal Pass)
  const alreadyFlagged = new Set<string>();

  for (const exclusion of groundTruth.explicitExclusions) {
    const forbiddenPhrases = extractForbiddenPhrases(exclusion);

    for (const phrase of forbiddenPhrases) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i');
      if (regex.test(content)) {
        alreadyFlagged.add(phrase.toLowerCase());
        violations.push({
          type: 'EXCLUSION_BREACH',
          severity: 'critical',
          detectedText: phrase,
          expectedFact: `Prohibited by founder: "${exclusion}"`,
          explanation: `Generated copy contains phrase prohibited by explicit founder rules: "${phrase}".`,
        });
        checkedItems.push({
          factCategory: 'claims',
          status: 'fail',
          checkedClaim: phrase,
          groundTruth: `Forbidden rule: ${exclusion}`,
        });
      }
    }

    // 1B. Semantic Fuzzing Safety Check Pass (Subtle Euphemisms & Evasions)
    const semanticBreaches = detectSemanticExclusions(content, exclusion);
    for (const breach of semanticBreaches) {
      if (!alreadyFlagged.has(breach.detectedText.toLowerCase())) {
        alreadyFlagged.add(breach.detectedText.toLowerCase());
        violations.push({
          type: 'SEMANTIC_EXCLUSION_BREACH',
          severity: 'critical',
          detectedText: breach.detectedText,
          expectedFact: `Prohibited by founder: "${exclusion}"`,
          explanation: `Semantic safety check detected contextual euphemism / evasion ("${breach.detectedText}") violating explicit rule: "${exclusion}".`,
        });
        checkedItems.push({
          factCategory: 'claims',
          status: 'fail',
          checkedClaim: breach.detectedText,
          groundTruth: `Semantic exclusion rule: ${exclusion} [Cluster: ${breach.category}]`,
        });
      }
    }
  }

  // 2. Check Price Grounding
  const detectedPrices = extractNumericPrices(content);
  if (detectedPrices.length > 0) {
    const allApprovedPrices = groundTruth.approvedProducts.flatMap((p) => p.normalizedPrices);

    for (const detectedPrice of detectedPrices) {
      // Allow minor variations if an approved price exists or if price matches an approved product
      const isApproved = allApprovedPrices.some(
        (approved) => Math.abs(approved - detectedPrice) < 0.01
      );

      if (!isApproved && allApprovedPrices.length > 0) {
        // If price is completely ungrounded, check if it's an unapproved discount or price hallucination
        const closest = allApprovedPrices[0]!;
        violations.push({
          type: 'PRICE_HALLUCINATION',
          severity: 'critical',
          detectedText: `$${detectedPrice}`,
          expectedFact: `Approved pricing: ${groundTruth.approvedProducts.map((p) => p.priceRange).join(', ')}`,
          remediationApplied: `$${closest}`,
          explanation: `Generated price $${detectedPrice} does not exist in confirmed product pricing (${groundTruth.approvedProducts.map((p) => p.priceRange).join(', ')}).`,
        });

        checkedItems.push({
          factCategory: 'pricing',
          status: 'fail',
          checkedClaim: `$${detectedPrice}`,
          groundTruth: groundTruth.approvedProducts.map((p) => p.priceRange).join(', '),
        });

        // Apply auto-remediation to the text
        remediatedContent = remediatedContent.replace(
          new RegExp(`\\$${detectedPrice}\\b`, 'g'),
          `$${closest}`
        );
      } else {
        checkedItems.push({
          factCategory: 'pricing',
          status: 'pass',
          checkedClaim: `$${detectedPrice}`,
          groundTruth: 'Approved product price',
        });
      }
    }
  }

  // 3. Check Wild / Fabricated Guarantees
  const wildPatterns = [
    {
      pattern: /\b(guaranteed\s+(?:10x|100%|instant)\s+roi)\b/i,
      name: 'Unsubstantiated ROI guarantee',
    },
    {
      pattern: /\b(become\s+a\s+millionaire\s+overnight)\b/i,
      name: 'Misleading financial promise',
    },
    { pattern: /\b(100%\s+risk[\s-]free\s+profit)\b/i, name: 'Unsubstantiated risk-free claim' },
  ];

  for (const { pattern, name } of wildPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'FABRICATED_CLAIM',
        severity: 'critical',
        detectedText: match[0],
        expectedFact: 'Verifiable business claims only',
        explanation: `Generated text makes an unverified claim: "${match[0]}".`,
      });
      checkedItems.push({
        factCategory: 'claims',
        status: 'fail',
        checkedClaim: match[0],
        groundTruth: name,
      });
    }
  }

  // 4. Check Unsubstantiated Marketing Superlatives (#1 in the world, cheapest on earth)
  const superlativePatterns = [
    {
      pattern: /\b(?:#1|number\s+(?:1|one)|the\s+best)\b.*?\b(?:in\s+the\s+world|globally|on\s+earth|in\s+the\s+market|in\s+the\s+industry)\b/i,
      name: 'Unsubstantiated absolute market leader superlative',
    },
    {
      pattern: /\b(?:guaranteed|100%\s+guaranteed)\b.*?\b(?:satisfaction|success|results?|roi)\b/i,
      name: 'Absolute outcome guarantee without empirical verification',
    },
    {
      pattern: /\b(?:unbeatable\s+(?:prices?|rates?)|cheapest\s+(?:prices?|rates?|on\s+earth))\b/i,
      name: 'Unverified price superlative claim',
    },
  ];

  for (const { pattern, name } of superlativePatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'SUPERLATIVE_UNVERIFIED',
        severity: 'critical',
        detectedText: match[0],
        expectedFact: 'Factual, verifiable marketing claims',
        explanation: `Generated copy contains an unsubstantiated superlative: "${match[0]}".`,
      });
      checkedItems.push({
        factCategory: 'superlatives',
        status: 'fail',
        checkedClaim: match[0],
        groundTruth: name,
      });
    }
  }

  // 5. Check Fabricated Testimonials and Review Claims
  const fakeReviewPatterns = [
    {
      pattern: /\b(?:rated|reviewed|loved|trusted)\s+by\s+(?:over\s+)?(?:\d{2,}\+?|\d+k|\d+,\d+)\s+(?:5-star|happy|satisfied)?\s*customers?\b/i,
      name: 'Unsubstantiated mass review claim',
    },
    {
      pattern: /\b(?:5\.0|4\.9)\s+(?:stars?|average\s+rating|star\s+rating)\b/i,
      name: 'Unsubstantiated specific star rating',
    },
  ];

  for (const { pattern, name } of fakeReviewPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'FABRICATED_TESTIMONIAL',
        severity: 'critical',
        detectedText: match[0],
        expectedFact: 'Verifiable customer reviews from authenticated integrations',
        explanation: `Generated copy asserts customer reviews or ratings without primary proof: "${match[0]}".`,
      });
      checkedItems.push({
        factCategory: 'testimonials',
        status: 'fail',
        checkedClaim: match[0],
        groundTruth: name,
      });
    }
  }

  // 6. Check Unsupported Competitor Disparagement
  const competitorDisparagementPatterns = [
    {
      pattern: /\bunlike\s+([a-zA-Z0-9\s]+)\s+which\s+(?:uses|charges|delivers|has)\s+([a-zA-Z0-9\s]+)\b/i,
      name: 'Unsubstantiated comparative competitor assertion',
    },
    {
      pattern: /\b([a-zA-Z0-9\s]+)\s+(?:is\s+a\s+scam|is\s+failing|is\s+going\s+bankrupt)\b/i,
      name: 'Defamatory competitor assertion',
    },
    {
      pattern: /\ball\s+other\s+competitors\s+(?:are\s+inferior|rip\s+you\s+off|charge\s+5x\s+more)\b/i,
      name: 'Blanket competitor disparagement claim',
    },
  ];

  for (const { pattern, name } of competitorDisparagementPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'UNSUPPORTED_COMPETITOR_CLAIM',
        severity: 'critical',
        detectedText: match[0],
        expectedFact: 'Objective, evidence-backed competitor comparisons',
        explanation: `Generated copy makes an uncorroborated disparaging claim about competitors: "${match[0]}".`,
      });
      checkedItems.push({
        factCategory: 'competitors',
        status: 'fail',
        checkedClaim: match[0],
        groundTruth: name,
      });
    }
  }

  // 7. Check Uncited Macro Statistics
  const uncitedStatsPatterns = [
    {
      pattern: /\b(?:market\s+will\s+reach|market\s+is\s+worth)\s+\$\d+(?:\.\d+)?\s*(?:billion|trillion|B|T)\b(?![^(]*\([^)]*(?:source|report|202\d)[^)]*\))/i,
      name: 'Uncited macro market-size claim',
    },
    {
      pattern: /\b(?:growing|surging|exploding)\s+at\s+\d{3,}%\s+(?:cagr|yoy)\b/i,
      name: 'Implausible triple-digit compound growth assertion',
    },
  ];

  for (const { pattern, name } of uncitedStatsPatterns) {
    const match = content.match(pattern);
    if (match) {
      violations.push({
        type: 'UNCITED_STATISTIC',
        severity: 'critical',
        detectedText: match[0],
        expectedFact: 'Source-backed industry metrics with disclosed publisher and year',
        explanation: `Generated text asserts an uncited macro statistic: "${match[0]}".`,
      });
      checkedItems.push({
        factCategory: 'statistics',
        status: 'fail',
        checkedClaim: match[0],
        groundTruth: name,
      });
    }
  }

  // Calculate Truth Score (0 to 100)
  const criticalViolations = violations.filter((v) => v.severity === 'critical');
  const unremediatedCritical = criticalViolations.filter((v) => !v.remediationApplied);
  const remediatedCritical = criticalViolations.filter((v) => Boolean(v.remediationApplied));
  const warningViolations = violations.filter((v) => v.severity !== 'critical');

  const scoreDeductions =
    unremediatedCritical.length * 35 +
    remediatedCritical.length * 15 +
    warningViolations.length * 15;
  const truthScore = Math.max(0, Math.min(100, 100 - scoreDeductions));

  let status: TruthCheckResult['status'] = 'VERIFIED';
  let refundTriggered = false;
  let refundReason: string | undefined;

  if (unremediatedCritical.length > 0 || (criticalViolations.length > 0 && truthScore < 70)) {
    status = 'REJECTED';
    refundTriggered = true;
    refundReason = `Credit safeguard triggered: generation contained ${unremediatedCritical.length || criticalViolations.length} critical truth violation(s). Credits protected.`;
  } else if (remediatedCritical.length > 0) {
    status = 'REMEDIATED';
  } else if (violations.length > 0) {
    status = 'WARNING';
  }

  const hasUnremediatedViolations = unremediatedCritical.length > 0;
  const isValid = !refundTriggered && !hasUnremediatedViolations;

  return {
    isValid,
    truthScore,
    status,
    checkedItems,
    violations,
    remediatedContent: remediatedContent !== content ? remediatedContent : undefined,
    refundTriggered,
    refundReason,
    timestamp: new Date().toISOString(),
  };
}

function escapeRegExp(string: string): string {
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

export interface SemanticBreachResult {
  detectedText: string;
  category: string;
}

interface SemanticExclusionCluster {
  category: string;
  triggers: RegExp[];
  euphemisms: Array<{
    pattern: RegExp;
    label: string;
  }>;
}

const SEMANTIC_CLUSTERS: SemanticExclusionCluster[] = [
  {
    category: 'Discounting & Price Slashing',
    triggers: [/\b(?:discount|discounts|sale|markdown|cheap|promo|cut\s+price|price\s+drop)\b/i],
    euphemisms: [
      { pattern: /\b(?:slashed|slashing)\s+(?:prices?|rates?|costs?)\b/i, label: 'slashed prices' },
      {
        pattern: /\b(?:rock[\s-]bottom|dirt[\s-]cheap)\s*(?:pricing|rates?|costs?|prices?)?\b/i,
        label: 'rock-bottom pricing',
      },
      {
        pattern: /\b(?:bargain[\s-]basement|blowout)\s*(?:pricing|rates?|deals?|prices?)?\b/i,
        label: 'bargain basement / blowout',
      },
      {
        pattern:
          /\b(?:deep|heavy|steep|massive)\s+(?:discount|discounts|discounted|reductions?|price\s+cuts?)\b/i,
        label: 'deep/steep discounts',
      },
      { pattern: /\b(?:heavily|deeply|steeply)\s+discounted\b/i, label: 'heavily discounted' },
      {
        pattern: /\b(?:fraction\s+of\s+the\s+(?:price|cost|retail))\b/i,
        label: 'fraction of the price',
      },
      { pattern: /\b(?:crazy\s+low|unbelievable)\s+prices?\b/i, label: 'crazy low prices' },
      {
        pattern: /\b(?:cut\s+our\s+rates\s+in\s+half|half[\s-]price\s+blowout)\b/i,
        label: 'half-price cut',
      },
    ],
  },
  {
    category: 'Free Trials & Cost Evasions',
    triggers: [
      /\b(?:free\s+trials?|trials?|free\s+tiers?|complimentary|no\s+cost|free\s+plans?)\b/i,
    ],
    euphemisms: [
      { pattern: /\b(?:try|test[\s-]drive|experience)\s+(?:it\s+)?free\b/i, label: 'try free' },
      {
        pattern:
          /\b(?:complimentary|zero[\s-]cost|cost[\s-]free)\s+(?:access|trial|evaluation|period|membership)\b/i,
        label: 'complimentary access / zero-cost trial',
      },
      { pattern: /\b(?:100%\s+free\s+for\s+\d+\s+days?)\b/i, label: 'free evaluation period' },
      {
        pattern: /\b(?:no[\s-]obligation|risk[\s-]free)\s+(?:trial|evaluation)\b/i,
        label: 'risk-free trial',
      },
      {
        pattern: /\b(?:get\s+started\s+without\s+paying\s+a\s+(?:cent|dime|penny|rupee))\b/i,
        label: 'without paying evasion',
      },
    ],
  },
  {
    category: 'Purity, Natural & Organic Exaggerations',
    triggers: [/\b(?:organic|pesticide|chemical|all[\s-]natural)\b/i],
    euphemisms: [
      { pattern: /\b(?:purely|wholly|entirely)\s+organic\b/i, label: 'purely/wholly organic' },
      {
        pattern:
          /\b(?:completely|totally|100%|hundred\s+percent)\s+(?:chemical[\s-]free|pesticide[\s-]free)\b/i,
        label: '100% chemical/pesticide-free',
      },
      {
        pattern: /\b(?:zero\s+synthetic\s+additives|unadulterated\s+organic\s+purity)\b/i,
        label: 'synthetic-free / organic purity',
      },
      {
        pattern: /\b(?:all[\s-]natural\s+certified\s+organic)\b/i,
        label: 'all-natural certified organic',
      },
    ],
  },
  {
    category: 'Unverified Financial Returns & Guarantees',
    triggers: [/\b(?:roi|guarantee|profit|millionaire|returns|wealth|money[\s-]back)\b/i],
    euphemisms: [
      {
        pattern: /\b(?:guaranteed|foolproof|surefire)\s+(?:returns?|profits?|wealth|roi|income)\b/i,
        label: 'guaranteed returns/profits',
      },
      {
        pattern: /\b(?:passive\s+millions|get\s+rich\s+quick|overnight\s+wealth)\b/i,
        label: 'overnight wealth/passive millions',
      },
      {
        pattern: /\b(?:zero[\s-]risk|100%\s+risk[\s-]free)\s+(?:investment|gains?|profit)\b/i,
        label: 'risk-free financial returns',
      },
    ],
  },
  {
    category: 'Medical & Miracle Claims',
    triggers: [/\b(?:cure|heal|medical|miracle|disease|illness)\b/i],
    euphemisms: [
      {
        pattern: /\b(?:miracle\s+cure|cures?\s+all\s+(?:diseases?|ailments?)|magic\s+healing)\b/i,
        label: 'miracle cure',
      },
      {
        pattern: /\b(?:guaranteed\s+(?:health|medical)\s+(?:fix|breakthrough|transformation))\b/i,
        label: 'guaranteed medical transformation',
      },
    ],
  },
];

/**
 * Detects semantic evasions, subtle euphemisms, and fuzzy proximity breaches for an exclusion rule.
 */
export function detectSemanticExclusions(
  content: string,
  exclusion: string
): SemanticBreachResult[] {
  const breaches: SemanticBreachResult[] = [];
  if (!content || !exclusion) return breaches;

  const normalizedContent = content.toLowerCase();

  // 1. Check against taxonomy clusters if the exclusion triggers them
  for (const cluster of SEMANTIC_CLUSTERS) {
    const isTriggered = cluster.triggers.some((trigger) => trigger.test(exclusion));
    if (!isTriggered) continue;

    for (const euphemism of cluster.euphemisms) {
      const match = content.match(euphemism.pattern);
      if (match) {
        breaches.push({
          detectedText: match[0],
          category: cluster.category,
        });
      }
    }
  }

  // 2. Fuzzy Token Proximity Check (For custom, ad-hoc founder exclusions)
  // Extracts distinctive words (>= 4 chars) from exclusion
  const baseWords = extractForbiddenPhrases(exclusion)
    .join(' ')
    .toLowerCase()
    .replace(/[^\w\s]/g, '')
    .split(/\s+/)
    .filter(
      (w) =>
        w.length >= 4 &&
        !['never', 'state', 'claim', 'mention', 'offer', 'without', 'using'].includes(w)
    );

  const getStem = (w: string) => (w.length > 5 ? w.slice(0, 5) : w.slice(0, 4));

  if (baseWords.length >= 2) {
    const baseStems = baseWords.map(getStem);
    // Check if stems appear within a sliding 10-word window in the content
    const contentTokens = normalizedContent
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(Boolean);
    const contentStems = contentTokens.map(getStem);

    for (let i = 0; i < contentTokens.length; i++) {
      const windowTokens = contentTokens.slice(i, i + 10);
      const windowStems = contentStems.slice(i, i + 10);

      // Check if distinct stems match in the window
      const matchCount = baseStems.filter((bs) => windowStems.includes(bs)).length;
      if (matchCount >= Math.min(baseStems.length, 2) && matchCount >= 2) {
        const matchedText = windowTokens.join(' ');
        if (!breaches.some((b) => b.detectedText.toLowerCase() === matchedText.toLowerCase())) {
          breaches.push({
            detectedText: matchedText,
            category: 'Fuzzy Token Proximity',
          });
        }
        break;
      }
    }
  }

  return breaches;
}

/**
 * Calculates an explainable, transparent confidence score based on objective evidence criteria.
 * Omits numeric score if evidence is absent, unverified, or unavailable.
 * Never returns arbitrary 1.0 / 100% confidence.
 */
export function calculateTransparentConfidence(params: {
  classification: import('../types/brainwise').EvidenceClassification;
  sources?: Array<{
    sourceType?: string;
    publishedAt?: string;
    publishedDate?: string;
    relevanceScore?: number;
    relevance?: number;
    url?: string;
    domain?: string;
    verificationStatus?: string;
  }>;
  targetGeography?: string;
  sourceGeography?: string;
}): {
  score?: number;
  confidenceScore: number | null;
  level: 'HIGH' | 'MEDIUM' | 'LOW';
  classification: import('../types/brainwise').EvidenceClassification;
  explanation: string;
  methodology: string;
  limitations: string[];
} {
  // If evidence is unavailable or unverified, omit numerical score completely
  if (
    params.classification === 'UNAVAILABLE' ||
    params.classification === 'UNVERIFIED' ||
    !params.sources ||
    params.sources.length === 0
  ) {
    return {
      classification: params.classification,
      confidenceScore: null,
      level: 'LOW',
      explanation: 'Numerical score omitted due to absent or unverified primary sources.',
      methodology: 'Qualitative classification without numerical score due to absent or unverified primary sources.',
      limitations: [
        'No verified external primary or secondary sources retrieved.',
        'Claim represents an uncorroborated hypothesis or unverified assertion.',
      ],
    };
  }

  // Transparent scoring factors
  let qualityPoints: number;
  let corroborationPoints: number;
  let freshnessPoints: number;
  let geoPoints: number;
  const limitations: string[] = [];

  // 1. Source Quality (Max 35 points)
  const types = params.sources.map((s) => (s.sourceType || '').toUpperCase());
  if (types.some((t) => t.includes('GOV') || t.includes('OFFICIAL'))) {
    qualityPoints = 35;
  } else if (types.some((t) => t.includes('REPORT') || t.includes('INDUSTRY'))) {
    qualityPoints = 30;
  } else if (types.some((t) => t.includes('PUBLICATION') || t.includes('PRIMARY'))) {
    qualityPoints = 25;
  } else {
    qualityPoints = 15;
    limitations.push('Sources rely primarily on community or unclassified web pages.');
  }

  // 2. Corroboration (Max 25 points)
  if (params.sources.length >= 3) {
    corroborationPoints = 25;
  } else if (params.sources.length === 2) {
    corroborationPoints = 18;
  } else {
    corroborationPoints = 10;
    limitations.push('Single-source claim lacks independent cross-validation.');
  }

  // 3. Freshness (Max 25 points)
  const currentYear = new Date().getFullYear();
  const pubDates = params.sources
    .map((s) => {
      const d = s.publishedAt || s.publishedDate;
      return d ? new Date(d).getFullYear() : undefined;
    })
    .filter((y): y is number => typeof y === 'number' && !isNaN(y));

  if (pubDates.length > 0) {
    const oldest = Math.min(...pubDates);
    const age = currentYear - oldest;
    if (age <= 1) freshnessPoints = 25;
    else if (age <= 2) freshnessPoints = 20;
    else if (age <= 3) freshnessPoints = 15;
    else {
      freshnessPoints = 8;
      limitations.push(`Evidence includes sources from ${oldest} which may be outdated.`);
    }
  } else {
    freshnessPoints = 12;
    limitations.push('Source publication dates were not disclosed or could not be determined.');
  }

  // 4. Geographic Alignment (Max 15 points)
  if (params.targetGeography && params.sourceGeography) {
    const targetNorm = params.targetGeography.toLowerCase();
    const sourceNorm = params.sourceGeography.toLowerCase();
    if (sourceNorm.includes(targetNorm) || targetNorm.includes(sourceNorm)) {
      geoPoints = 15;
    } else {
      geoPoints = 5;
      limitations.push(
        `Geographic mismatch: source region (${params.sourceGeography}) does not match target (${params.targetGeography}).`
      );
    }
  } else {
    geoPoints = 10;
  }

  const rawScore = (qualityPoints + corroborationPoints + freshnessPoints + geoPoints) / 100;
  // Transparent confidence is strictly clamped: never 1.0! Max 0.95 for empirical evidence.
  const score = Math.max(0.15, Math.min(0.95, Number(rawScore.toFixed(2))));
  const level: 'HIGH' | 'MEDIUM' | 'LOW' = score >= 0.8 ? 'HIGH' : score >= 0.6 ? 'MEDIUM' : 'LOW';
  const explanation = `Multi-factor transparent confidence score (${score}): Quality (${qualityPoints}/35), Corroboration (${corroborationPoints}/25), Freshness (${freshnessPoints}/25), Geographic Alignment (${geoPoints}/15).`;

  return {
    score,
    confidenceScore: score,
    level,
    classification: params.classification,
    explanation,
    methodology: `Multi-factor evidence scoring: Quality (${qualityPoints}/35), Corroboration (${corroborationPoints}/25), Freshness (${freshnessPoints}/25), Geographic Alignment (${geoPoints}/15).`,
    limitations,
  };
}
