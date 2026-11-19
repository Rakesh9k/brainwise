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
      /^(?:never\s+(?:claim|state|say|use|mention)?|do\s+not\s+(?:claim|state|say|use|mention)?|don't\s+(?:claim|state|say|use|mention)?|no\s+)/i,
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
  const products = (brain.products || []).map((p) => ({
    id: p.id,
    name: p.name,
    priceRange: p.priceRange,
    normalizedPrices: extractNumericPrices(p.priceRange),
  }));

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

  // 1. Check Explicit Exclusions (Forbidden Claims)
  for (const exclusion of groundTruth.explicitExclusions) {
    const forbiddenPhrases = extractForbiddenPhrases(exclusion);

    for (const phrase of forbiddenPhrases) {
      const regex = new RegExp(`\\b${escapeRegExp(phrase)}\\b`, 'i');
      if (regex.test(content)) {
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

  // Calculate Truth Score (0 to 100)
  const criticalViolations = violations.filter((v) => v.severity === 'critical');
  const scoreDeductions =
    criticalViolations.length * 35 + (violations.length - criticalViolations.length) * 15;
  const truthScore = Math.max(0, Math.min(100, 100 - scoreDeductions));

  const hasCritical = criticalViolations.length > 0;
  let status: TruthCheckResult['status'] = 'VERIFIED';
  let refundTriggered = false;
  let refundReason: string | undefined;

  if (hasCritical) {
    if (truthScore < 50) {
      status = 'REJECTED';
      refundTriggered = true;
      refundReason = `Credit safeguard triggered: generation contained ${criticalViolations.length} critical truth violation(s). Credits protected.`;
    } else {
      status = 'REMEDIATED';
    }
  } else if (violations.length > 0) {
    status = 'WARNING';
  }

  return {
    isValid: !refundTriggered,
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
