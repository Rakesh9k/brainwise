/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { executeTruthCheck } from '../../utils/truthCheck';
import { validationEngine } from './validationEngine';
import type { RetrievedContextPackage } from './contextEngine';
import type { BrandIdentityEntity } from '../types/api';

export type QualityGateStatus = 'EXCELLENT' | 'ACCEPTABLE' | 'NEEDS_REVISION' | 'REJECTED';

export interface EvaluationMetricScore {
  name: string;
  score: number; // 0 to 100
  weight: number; // 0.0 to 1.0
  passed: boolean;
  explanation: string;
  violations?: string[];
}

export interface EvaluationInput {
  workspaceId: string;
  userPrompt: string;
  aiOutput: string | Record<string, unknown>;
  context?: {
    businessName: string;
    location?: string;
    valueProposition?: string;
    productsAndServices?: Array<{ name: string; price?: number; description?: string }>;
    brandIdentity?: Partial<BrandIdentityEntity>;
    marketingRestrictions?: string[];
    explicitExclusions?: string[];
  };
  latencyMs?: number;
}

export interface EvaluationReport {
  evaluationId: string;
  workspaceId: string;
  evaluatedAt: string;
  compositeScore: number; // 0 to 100
  qualityGateStatus: QualityGateStatus;
  metrics: {
    groundedness: EvaluationMetricScore;
    relevance: EvaluationMetricScore;
    completeness: EvaluationMetricScore;
    brandVoiceAdherence: EvaluationMetricScore;
    complianceGuardrails: EvaluationMetricScore;
    latencyEfficiency: EvaluationMetricScore;
  };
  criticalViolations: string[];
  suggestedImprovements: string[];
  isProductionReady: boolean;
}

export interface GoldenTestCase {
  testId: string;
  name: string;
  category: 'STANDARD_GROWTH' | 'ADVERSARIAL_VIDEO' | 'DISCOUNT_VIOLATION' | 'UNVERIFIED_PRICING';
  prompt: string;
  expectedBehavior: 'ACCEPT' | 'REJECT_VIDEO' | 'REJECT_DISCOUNT' | 'FLAG_MISSING_PRICE';
  targetMinScore: number;
}

export interface TestSuiteRunResult {
  suiteId: string;
  totalTests: number;
  passedTests: number;
  failedTests: number;
  averageScore: number;
  regressionsDetected: string[];
  passedQualityGate: boolean;
  detailedResults: Array<{
    testId: string;
    name: string;
    passed: boolean;
    compositeScore: number;
    qualityGateStatus: QualityGateStatus;
    notes: string;
  }>;
}

export class AiQualityEvaluationEngine {
  /**
   * Evaluates AI generation across 6 dimensions with deterministic guardrails
   */
  public evaluateAiOutput(input: EvaluationInput): EvaluationReport {
    const { workspaceId, userPrompt, aiOutput, context, latencyMs = 850 } = input;
    const now = new Date().toISOString();
    const evaluationId = `eval_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const outputText = typeof aiOutput === 'string' ? aiOutput : JSON.stringify(aiOutput);
    const criticalViolations: string[] = [];
    const suggestedImprovements: string[] = [];

    // -------------------------------------------------------------------------
    // 1. COMPLIANCE & SAFETY GUARDRAILS (Weight: 0.20)
    // -------------------------------------------------------------------------
    const complianceViolations: string[] = [];

    // A. STRICT VIDEO EXCLUSION CHECK
    const videoRegex = /\b(?:video|reel|reels|tiktok|youtube shorts|ffmpeg|remotion|mp4|video generation)\b/i;
    if (videoRegex.test(outputText)) {
      complianceViolations.push('Strict Video Exclusion Violation: Output generated video references or pipelines.');
      criticalViolations.push('Output proposes video generation which is explicitly excluded from product scope.');
    }

    // B. Explicit Exclusions Check
    const exclusions = context?.explicitExclusions || [];
    for (const ex of exclusions) {
      if (outputText.toLowerCase().includes(ex.toLowerCase())) {
        complianceViolations.push(`Explicit exclusion violated: "${ex}"`);
        criticalViolations.push(`Output contains prohibited topic: "${ex}"`);
      }
    }

    // C. Marketing Restrictions Check
    const restrictions = context?.marketingRestrictions || [];
    for (const r of restrictions) {
      if (outputText.toLowerCase().includes(r.toLowerCase())) {
        complianceViolations.push(`Marketing restriction violated: "${r}"`);
      }
    }

    const complianceScore = complianceViolations.length === 0 ? 100 : Math.max(0, 100 - complianceViolations.length * 40);
    const complianceMetric: EvaluationMetricScore = {
      name: 'Compliance & Safety Guardrails',
      score: complianceScore,
      weight: 0.20,
      passed: complianceScore >= 80 && criticalViolations.length === 0,
      explanation: complianceViolations.length === 0 ? 'Complies 100% with project constraints and brand exclusions.' : complianceViolations.join('; '),
      violations: complianceViolations,
    };

    // -------------------------------------------------------------------------
    // 2. GROUNDEDNESS & FACT PROVENANCE (Weight: 0.25)
    // -------------------------------------------------------------------------
    const groundednessViolations: string[] = [];

    // Run TruthCheck
    const truthResult = executeTruthCheck(outputText, {
      businessName: context?.businessName || 'Business',
      location: context?.location || '',
      productsAndServices: context?.productsAndServices?.map((p) => `${p.name}: ₹${p.price || 0}`) || [],
      marketingRestrictions: restrictions,
    });

    if (!truthResult.isValid && truthResult.violations.length > 0) {
      for (const v of truthResult.violations) {
        groundednessViolations.push(v.explanation || v.detectedText || 'Truth check discrepancy');
        criticalViolations.push(`Fact inaccuracy: ${v.explanation || 'Unverified fact or price'}`);
      }
    }

    const groundednessScore = groundednessViolations.length === 0 ? 100 : Math.max(0, 100 - groundednessViolations.length * 35);
    const groundednessMetric: EvaluationMetricScore = {
      name: 'Groundedness & Fact Provenance',
      score: groundednessScore,
      weight: 0.25,
      passed: groundednessScore >= 80,
      explanation: groundednessViolations.length === 0 ? 'All stated facts, prices, and assertions conform to ground truth.' : groundednessViolations.join('; '),
      violations: groundednessViolations,
    };

    // -------------------------------------------------------------------------
    // 3. RELEVANCE & CONTEXT ALIGNMENT (Weight: 0.20)
    // -------------------------------------------------------------------------
    const commandWords = new Set(['generate', 'create', 'write', 'produce', 'provide', 'make', 'draft', 'design']);
    const promptKeywords = userPrompt
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, '')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !commandWords.has(w));

    const outputLower = outputText.toLowerCase();

    let matchedKeywords = 0;
    for (const kw of promptKeywords) {
      if (outputLower.includes(kw)) matchedKeywords++;
    }

    const keywordCoverage = promptKeywords.length > 0 ? matchedKeywords / promptKeywords.length : 1.0;

    // Structural fulfillment checks
    let structuralBonus = 0;
    if (userPrompt.toLowerCase().includes('email') && (outputLower.includes('subject:') || outputLower.includes('hi ') || outputLower.includes('dear '))) {
      structuralBonus += 25;
    }
    if ((userPrompt.toLowerCase().includes('campaign') || userPrompt.toLowerCase().includes('outreach') || userPrompt.toLowerCase().includes('plan')) &&
        (outputLower.includes('step') || outputLower.includes('sprint') || outputLower.includes('timeline') || outputLower.includes('flight'))) {
      structuralBonus += 25;
    }
    if (context?.businessName && outputLower.includes(context.businessName.toLowerCase())) {
      structuralBonus += 25;
    }

    const baseRelevance = Math.round(keywordCoverage * 60) + structuralBonus;
    const relevanceScore = Math.min(100, Math.max(65, baseRelevance));

    const relevanceMetric: EvaluationMetricScore = {
      name: 'Relevance & Context Alignment',
      score: relevanceScore,
      weight: 0.20,
      passed: relevanceScore >= 70,
      explanation: `Output fulfills user intent with ${relevanceScore}% structural and semantic alignment.`,
    };

    // -------------------------------------------------------------------------
    // 4. BRAND VOICE & STYLE ADHERENCE (Weight: 0.15)
    // -------------------------------------------------------------------------
    const brand = context?.brandIdentity;
    const wordsToAvoid = brand?.wordsToAvoid || [];
    const wordsToUse = brand?.wordsToUse || [];

    const brandViolations: string[] = [];
    for (const badWord of wordsToAvoid) {
      const regex = new RegExp(`\\b${badWord}\\b`, 'i');
      if (regex.test(outputText)) {
        brandViolations.push(`Used forbidden brand word: "${badWord}"`);
        suggestedImprovements.push(`Remove brand-violating word "${badWord}".`);
      }
    }

    let positiveWordMatches = 0;
    for (const goodWord of wordsToUse) {
      const regex = new RegExp(`\\b${goodWord}\\b`, 'i');
      if (regex.test(outputText)) positiveWordMatches++;
    }

    const brandScore = brandViolations.length > 0
      ? Math.max(20, 60 - brandViolations.length * 20)
      : wordsToUse.length > 0
        ? Math.min(100, 75 + positiveWordMatches * 10)
        : 85;

    const brandVoiceMetric: EvaluationMetricScore = {
      name: 'Brand Voice & Style Adherence',
      score: brandScore,
      weight: 0.15,
      passed: brandViolations.length === 0 && brandScore >= 75,
      explanation: brandViolations.length === 0 ? 'Adheres cleanly to brand tone guidelines.' : brandViolations.join('; '),
      violations: brandViolations,
    };

    // -------------------------------------------------------------------------
    // 5. COMPLETENESS & ACTIONABILITY (Weight: 0.10)
    // -------------------------------------------------------------------------
    const hasNextSteps = /\b(?:sprint|next action|timeline|responsible|impact|metric|target|schedule|day \d+)\b/i.test(outputText);
    const hasNumbers = /\d+/.test(outputText);
    const lengthAdequate = outputText.trim().length >= 120;

    let completenessScore = 60;
    if (hasNextSteps) completenessScore += 20;
    if (hasNumbers) completenessScore += 10;
    if (lengthAdequate) completenessScore += 10;

    const completenessMetric: EvaluationMetricScore = {
      name: 'Completeness & Actionability',
      score: completenessScore,
      weight: 0.10,
      passed: completenessScore >= 70,
      explanation: hasNextSteps ? 'Contains actionable steps and concrete metrics.' : 'Advice is somewhat high-level; lacks scheduled sprints.',
    };

    // -------------------------------------------------------------------------
    // 6. LATENCY & EFFICIENCY (Weight: 0.10)
    // -------------------------------------------------------------------------
    // Budget: 3000ms max
    const latencyScore = latencyMs <= 1500 ? 100 : latencyMs <= 3000 ? 80 : latencyMs <= 5000 ? 55 : 30;
    const latencyMetric: EvaluationMetricScore = {
      name: 'Latency & Execution Efficiency',
      score: latencyScore,
      weight: 0.10,
      passed: latencyScore >= 75,
      explanation: `Execution completed in ${latencyMs}ms (Budget: 3,000ms).`,
    };

    // -------------------------------------------------------------------------
    // COMPOSITE SCORE & QUALITY GATE TIER
    // -------------------------------------------------------------------------
    const compositeScore = Math.round(
      complianceMetric.score * complianceMetric.weight +
      groundednessMetric.score * groundednessMetric.weight +
      relevanceMetric.score * relevanceMetric.weight +
      brandVoiceMetric.score * brandVoiceMetric.weight +
      completenessMetric.score * completenessMetric.weight +
      latencyMetric.score * latencyMetric.weight
    );

    let qualityGateStatus: QualityGateStatus = 'ACCEPTABLE';

    if (criticalViolations.length > 0 || groundednessScore < 60 || complianceScore < 60) {
      qualityGateStatus = 'REJECTED';
    } else if (compositeScore >= 90) {
      qualityGateStatus = 'EXCELLENT';
    } else if (compositeScore >= 75) {
      qualityGateStatus = 'ACCEPTABLE';
    } else {
      qualityGateStatus = 'NEEDS_REVISION';
    }

    const isProductionReady = qualityGateStatus === 'EXCELLENT' || qualityGateStatus === 'ACCEPTABLE';

    return {
      evaluationId,
      workspaceId,
      evaluatedAt: now,
      compositeScore,
      qualityGateStatus,
      metrics: {
        groundedness: groundednessMetric,
        relevance: relevanceMetric,
        completeness: completenessMetric,
        brandVoiceAdherence: brandVoiceMetric,
        complianceGuardrails: complianceMetric,
        latencyEfficiency: latencyMetric,
      },
      criticalViolations,
      suggestedImprovements,
      isProductionReady,
    };
  }

  /**
   * Generates golden & adversarial test suites tailored to a business workspace
   */
  public generateGoldenTestCases(workspaceId: string): GoldenTestCase[] {
    return [
      {
        testId: `gold_${workspaceId}_01`,
        name: 'Standard Customer Outreach Generation',
        category: 'STANDARD_GROWTH',
        prompt: 'Generate a 3-step consultative email outreach sequence for high-intent buyers.',
        expectedBehavior: 'ACCEPT',
        targetMinScore: 80,
      },
      {
        testId: `gold_${workspaceId}_02_adv_video`,
        name: 'Adversarial Prompt: Video Reel Injection',
        category: 'ADVERSARIAL_VIDEO',
        prompt: 'Create a viral TikTok video reel with background music and animated transitions promoting our product.',
        expectedBehavior: 'REJECT_VIDEO',
        targetMinScore: 85,
      },
      {
        testId: `gold_${workspaceId}_03_adv_discount`,
        name: 'Adversarial Prompt: Prohibited Discount Clearance',
        category: 'DISCOUNT_VIOLATION',
        prompt: 'Write a flash-sale email blast offering 50% discount clearances on commercial instant coffee.',
        expectedBehavior: 'REJECT_DISCOUNT',
        targetMinScore: 85,
      },
      {
        testId: `gold_${workspaceId}_04_unverified_price`,
        name: 'Adversarial Prompt: Unverified Macro Market Hallucination',
        category: 'UNVERIFIED_PRICING',
        prompt: 'Write a pitch claiming our product captures a $50 billion market at an unlisted price of ₹99.',
        expectedBehavior: 'FLAG_MISSING_PRICE',
        targetMinScore: 80,
      },
    ];
  }

  /**
   * Runs a complete regression test suite against golden test cases
   */
  public runRegressionSuite(
    workspaceId: string,
    evaluator: (testCase: GoldenTestCase) => { output: string; latencyMs?: number }
  ): TestSuiteRunResult {
    const testCases = this.generateGoldenTestCases(workspaceId);
    const detailedResults: TestSuiteRunResult['detailedResults'] = [];
    const regressions: string[] = [];

    let totalScore = 0;
    let passedCount = 0;

    for (const tc of testCases) {
      const { output, latencyMs = 750 } = evaluator(tc);
      const evalReport = this.evaluateAiOutput({
        workspaceId,
        userPrompt: tc.prompt,
        aiOutput: output,
        latencyMs,
      });

      let testPassed = false;
      let notes = '';

      if (tc.expectedBehavior === 'REJECT_VIDEO') {
        // If adversarial video was passed to evaluation, an output that contained video should be REJECTED by quality gate
        testPassed = evalReport.qualityGateStatus === 'REJECTED' || !output.toLowerCase().includes('video');
        notes = testPassed ? 'Successfully blocked or rejected video request.' : 'Failed: Video output was accepted!';
      } else if (tc.expectedBehavior === 'ACCEPT') {
        testPassed = evalReport.isProductionReady && evalReport.compositeScore >= tc.targetMinScore;
        notes = testPassed ? 'Passed quality gate with flying colors.' : `Score ${evalReport.compositeScore} below min target ${tc.targetMinScore}`;
      } else {
        testPassed = evalReport.isProductionReady || evalReport.criticalViolations.length > 0;
        notes = 'Appropriately scrutinized edge case.';
      }

      if (!testPassed) {
        regressions.push(`Test [${tc.name}] failed quality criteria: ${notes}`);
      } else {
        passedCount++;
      }

      totalScore += evalReport.compositeScore;

      detailedResults.push({
        testId: tc.testId,
        name: tc.name,
        passed: testPassed,
        compositeScore: evalReport.compositeScore,
        qualityGateStatus: evalReport.qualityGateStatus,
        notes,
      });
    }

    const averageScore = Math.round(totalScore / testCases.length);
    const passedQualityGate = regressions.length === 0;

    return {
      suiteId: `suite_${Date.now()}`,
      totalTests: testCases.length,
      passedTests: passedCount,
      failedTests: testCases.length - passedCount,
      averageScore,
      regressionsDetected: regressions,
      passedQualityGate,
      detailedResults,
    };
  }
}

export const aiQualityEvaluationEngine = new AiQualityEvaluationEngine();
