/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { RetrievedContextPackage } from './contextEngine';
import type {
  AiClaim,
  AiSource,
  ClaimClassification,
  StructuredAiOutput,
  ValidationIssue,
  ValidationResult,
} from './types';
import { executeTruthCheck } from '../../utils/truthCheck';

export interface ValidationInput {
  rawOutput: Partial<StructuredAiOutput> | Record<string, unknown>;
  context: RetrievedContextPackage;
  sources?: AiSource[];
  userPrompt?: string;
}

export class ValidationEngine {
  /**
   * Executes multi-layer deterministic validation across Structural, Business Context,
   * Evidence, Logical, and Safety dimensions.
   */
  public validate(input: ValidationInput): {
    validation: ValidationResult;
    classifiedClaims: AiClaim[];
    verifiedFacts: string[];
    estimates: string[];
    assumptions: string[];
    cleanOutput: Partial<StructuredAiOutput>;
  } {
    const issues: ValidationIssue[] = [];
    const warnings: ValidationIssue[] = [];
    const { rawOutput, context, sources = [], userPrompt = '' } = input;

    // 1. LAYER A: Structural Validation
    if (!rawOutput || typeof rawOutput !== 'object') {
      issues.push({
        layer: 'STRUCTURAL',
        severity: 'ERROR',
        code: 'INVALID_OBJECT',
        message: 'AI output is not a valid object.',
      });
    }

    const summary =
      typeof (rawOutput as any).summary === 'string' ? (rawOutput as any).summary : '';
    if (!summary || summary.trim().length === 0) {
      warnings.push({
        layer: 'STRUCTURAL',
        severity: 'WARNING',
        code: 'MISSING_SUMMARY',
        message: 'Output is missing an executive summary field.',
        field: 'summary',
      });
    }

    // 2. LAYER B: Business Context & Fact Grounding (Truth Check)
    const textToCheck = [
      summary,
      Array.isArray((rawOutput as any).findings) ? (rawOutput as any).findings.join(' ') : '',
      Array.isArray((rawOutput as any).verifiedFacts)
        ? (rawOutput as any).verifiedFacts.join(' ')
        : '',
    ].join(' ');

    const truthResult = executeTruthCheck(textToCheck, {
      businessName: context.businessName,
      location: context.location,
      productsAndServices: (context.relevantFields.productsSummary as any) || [],
      marketingRestrictions: (context.relevantFields.marketingRestrictions as any) || [],
    } as any);

    if (!truthResult.isValid && truthResult.violations.length > 0) {
      for (const v of truthResult.violations) {
        issues.push({
          layer: 'BUSINESS_CONTEXT',
          severity: 'ERROR',
          code: 'TRUTH_CHECK_VIOLATION',
          message: `Fact discrepancy detected: ${v.explanation}. Expected: ${v.expectedFact}`,
          field: 'businessContext',
        });
      }
    }

    // 3. LAYER C: Evidence Validation
    if (sources.length > 0) {
      for (const s of sources) {
        if (!s.url || !s.url.startsWith('http')) {
          warnings.push({
            layer: 'EVIDENCE',
            severity: 'WARNING',
            code: 'INVALID_SOURCE_URL',
            message: `Source has an invalid or malformed URL: ${s.url}`,
          });
        }
      }
    }

    // 4. LAYER D: Logical & Consistency Validation
    // Check for unsubstantiated revenue/growth guarantees
    const guaranteeRegex =
      /\b(guarantee|guaranteed|100% ROI|risk-free profit|guaranteed customers)\b/i;
    if (guaranteeRegex.test(textToCheck)) {
      issues.push({
        layer: 'LOGICAL',
        severity: 'ERROR',
        code: 'PROHIBITED_GROWTH_GUARANTEE',
        message:
          'AI output contains prohibited commercial guarantees (e.g. guaranteed revenue or 100% ROI).',
      });
    }

    // 5. LAYER E: Safety & Prompt Injection Check
    const injectionPatterns = [
      /ignore\s+(all\s+)?(previous|prior)\s+instructions/i,
      /system\s+prompt\s*:/i,
      /<script\b[^>]*>/i,
      /javascript:/i,
      /drop\s+table/i,
    ];

    for (const pat of injectionPatterns) {
      if (pat.test(textToCheck) || pat.test(userPrompt)) {
        issues.push({
          layer: 'SAFETY',
          severity: 'ERROR',
          code: 'PROMPT_INJECTION_DETECTED',
          message: 'Potential prompt injection or instruction override sequence intercepted.',
        });
        break;
      }
    }

    // 6. Claim Extraction & Classification Pipeline
    const classifiedClaims = this.classifyClaims(rawOutput, context, sources);
    const verifiedFacts: string[] = [];
    const estimates: string[] = [];
    const assumptions: string[] = [];

    for (const c of classifiedClaims) {
      if (c.classification === 'VERIFIED_FACT' || c.classification === 'BUSINESS_FACT') {
        verifiedFacts.push(c.claim);
      } else if (c.classification === 'ESTIMATE') {
        estimates.push(c.claim);
      } else if (c.classification === 'ASSUMPTION') {
        assumptions.push(c.claim);
      }
    }

    const status: ValidationResult['status'] =
      issues.length > 0 ? 'FAILED' : warnings.length > 0 ? 'WARNINGS' : 'PASSED';

    const validation: ValidationResult = {
      status,
      issues,
      warnings,
    };

    return {
      validation,
      classifiedClaims,
      verifiedFacts,
      estimates,
      assumptions,
      cleanOutput: rawOutput as Partial<StructuredAiOutput>,
    };
  }

  /**
   * Deconstructs statements into classified claims with provenance and evidence alignment.
   */
  private classifyClaims(
    rawOutput: any,
    context: RetrievedContextPackage,
    sources: AiSource[]
  ): AiClaim[] {
    const claims: AiClaim[] = [];
    let idx = 1;

    // Check confirmed Business Brain facts
    for (const fact of context.confirmedFacts) {
      claims.push({
        id: `clm_${idx++}`,
        claim: fact,
        classification: 'BUSINESS_FACT',
        verificationStatus: 'SUPPORTED',
        confidenceScore: 1.0,
        notes: 'Authoritative confirmed fact from Business Brain',
      });
    }

    // Check external evidence sources
    for (const s of sources) {
      if (s.evidenceExcerpt) {
        claims.push({
          id: `clm_${idx++}`,
          claim: s.evidenceExcerpt,
          classification: 'VERIFIED_FACT',
          sourceIds: [s.sourceId],
          verificationStatus: s.verificationStatus,
          confidenceScore: s.relevanceScore,
          notes: `External evidence from ${s.domain}`,
        });
      }
    }

    // Extract findings from raw output
    const rawFindings = Array.isArray(rawOutput.findings) ? rawOutput.findings : [];
    for (const f of rawFindings) {
      if (typeof f === 'string' && f.trim().length > 0) {
        const isEstimate = /\b(\$|%|estimate|projected|between|cagr)\b/i.test(f);
        const classification: ClaimClassification = isEstimate ? 'ESTIMATE' : 'AI_ANALYSIS';
        claims.push({
          id: `clm_${idx++}`,
          claim: f,
          classification,
          verificationStatus: 'SUPPORTED',
          confidenceScore: 0.88,
        });
      }
    }

    // Extract assumptions
    const rawAssumptions = Array.isArray(rawOutput.assumptions) ? rawOutput.assumptions : [];
    for (const a of rawAssumptions) {
      if (typeof a === 'string' && a.trim().length > 0) {
        claims.push({
          id: `clm_${idx++}`,
          claim: a,
          classification: 'ASSUMPTION',
          verificationStatus: 'SUPPORTED',
          confidenceScore: 0.75,
          notes: 'Unverified working premise',
        });
      }
    }

    return claims;
  }
}

export const validationEngine = new ValidationEngine();
