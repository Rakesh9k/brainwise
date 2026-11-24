/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { evidenceLakeRepository } from '../repositories/evidenceLakeRepository';
import type {
  CustomerVoiceItem,
  CustomerVoiceAnalysis,
  CustomerObjectionType,
  EvidenceRecord,
} from '../types/evidence';

export class CustomerVoiceService {
  private objectionPatterns: Record<CustomerObjectionType, RegExp[]> = {
    PRICE_TOO_HIGH: [
      /too expensive/i,
      /overpriced/i,
      /price hike/i,
      /hidden fee/i,
      /costly/i,
      /not worth the money/i,
      /ridiculous pricing/i,
    ],
    ONBOARDING_COMPLEXITY: [
      /steep learning curve/i,
      /hard to set ?up/i,
      /confusing onboarding/i,
      /took weeks to (learn|implement)/i,
      /complicated interface/i,
      /not intuitive/i,
    ],
    POOR_SUPPORT: [
      /(terrible|awful|slow|no) (customer )?support/i,
      /waiting days for (a )?reply/i,
      /ignored (my )?ticket/i,
      /unhelpful response/i,
      /support is non-existent/i,
    ],
    MISSING_INTEGRATIONS: [
      /no (zapier|webhook|api|integration)/i,
      /doesn't connect to/i,
      /lacks integration/i,
      /can't sync with/i,
    ],
    RELIABILITY_BUGS: [
      /(frequent|constant) (crash|crashes|downtime)/i,
      /buggy/i,
      /slow loading/i,
      /data lost/i,
      /broken after update/i,
    ],
    CONTRACT_LOCK_IN: [
      /annual(ly)? lock-?in/i,
      /can't cancel/i,
      /refused (a )?refund/i,
      /cancellation (penalty|fee)/i,
      /trap(ped)? in contract/i,
    ],
    FEATURE_DEFICIT: [/lacks basic features/i, /missing essential/i, /half-baked/i, /bare bones/i],
  };

  /**
   * Ingests, analyzes, and categorizes unstructured customer voice feedback
   * into structured objections, unmet needs, and sentiment indicators.
   */
  public async analyzeAndIngest(
    workspaceId: string,
    rawReviews: Array<{
      platform?: CustomerVoiceItem['platform'];
      authorOrHandle?: string;
      content: string;
      rating?: number;
      competitorMentioned?: string;
    }>
  ): Promise<CustomerVoiceAnalysis> {
    const now = new Date().toISOString();
    const items: CustomerVoiceItem[] = [];
    const objectionCounts: Record<CustomerObjectionType, number> = {
      PRICE_TOO_HIGH: 0,
      ONBOARDING_COMPLEXITY: 0,
      POOR_SUPPORT: 0,
      MISSING_INTEGRATIONS: 0,
      RELIABILITY_BUGS: 0,
      CONTRACT_LOCK_IN: 0,
      FEATURE_DEFICIT: 0,
    };
    const unmetNeedsMap = new Map<string, number>();
    let totalSentimentScore = 0;

    for (const [idx, review] of rawReviews.entries()) {
      const content = review.content.trim();
      const detectedObjections = this.detectObjections(content);
      const unmetNeeds = this.extractUnmetNeeds(content);
      const sentiment = this.determineSentiment(content, review.rating);

      // Score: POSITIVE = +1, NEUTRAL = 0, NEGATIVE = -1
      totalSentimentScore += sentiment === 'POSITIVE' ? 1 : sentiment === 'NEGATIVE' ? -1 : 0;

      for (const obj of detectedObjections) {
        objectionCounts[obj]++;
      }
      for (const need of unmetNeeds) {
        unmetNeedsMap.set(need, (unmetNeedsMap.get(need) || 0) + 1);
      }

      items.push({
        id: `cvi_${Date.now()}_${idx}`,
        platform: review.platform || 'g2',
        authorOrHandle: review.authorOrHandle,
        sentiment,
        rating: review.rating,
        content,
        objectionsDetected: detectedObjections,
        unmetNeeds,
        competitorMentioned: review.competitorMentioned,
        publishedAt: now,
      });
    }

    const totalCount = Math.max(1, rawReviews.length);
    const avgSentiment = Math.round((totalSentimentScore / totalCount) * 100) / 100;

    // Compile ranked objections
    const topObjections = (Object.keys(objectionCounts) as CustomerObjectionType[])
      .map((obj) => ({
        objection: obj,
        count: objectionCounts[obj],
        percentage: Math.round((objectionCounts[obj] / totalCount) * 100),
      }))
      .filter((o) => o.count > 0)
      .sort((a, b) => b.count - a.count);

    // Compile ranked unmet needs
    const topUnmetNeeds = Array.from(unmetNeedsMap.entries())
      .map(([need, count]) => ({ need, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Extract urgent frictions (high frequency negative objections)
    const urgentFrictions = topObjections
      .filter((o) => o.percentage >= 20)
      .map(
        (o) =>
          `${o.percentage}% of reviewed users report friction around ${o.objection.replace(/_/g, ' ').toLowerCase()}`
      );

    // Propose strategic counter-messaging responses
    const suggestedProductResponses = topObjections.slice(0, 3).map((o) => {
      switch (o.objection) {
        case 'PRICE_TOO_HIGH':
          return 'Highlight transparent value pricing and fast payback ROI in top-of-funnel messaging.';
        case 'ONBOARDING_COMPLEXITY':
          return 'Emphasize 5-minute zero-setup onboarding and guided migration assistance.';
        case 'POOR_SUPPORT':
          return 'Feature dedicated priority support and guaranteed SLA response times in sales collateral.';
        case 'MISSING_INTEGRATIONS':
          return 'Showcase native Zapier/REST API integration readiness on product landing pages.';
        default:
          return `Position your offering directly against competitor weaknesses in ${o.objection.toLowerCase()}.`;
      }
    });

    const analysis: CustomerVoiceAnalysis = {
      workspaceId,
      totalReviewsAnalyzed: rawReviews.length,
      averageSentimentScore: avgSentiment,
      topObjections,
      topUnmetNeeds,
      urgentFrictions,
      suggestedProductResponses,
      analyzedAt: now,
    };

    // Ingest into Shared Evidence Lake
    await this.persistVoiceEvidence(workspaceId, items, analysis);

    return analysis;
  }

  /**
   * Scans text for explicit customer objection markers.
   */
  public detectObjections(text: string): CustomerObjectionType[] {
    const matched: CustomerObjectionType[] = [];

    for (const [objection, patterns] of Object.entries(this.objectionPatterns) as [
      CustomerObjectionType,
      RegExp[],
    ][]) {
      if (patterns.some((p) => p.test(text))) {
        matched.push(objection);
      }
    }

    return matched;
  }

  /**
   * Extracts explicit desires or missing feature requests from customer voice excerpts.
   */
  public extractUnmetNeeds(text: string): string[] {
    const needs: string[] = [];
    const needRegex =
      /(?:wish they had|need a way to|would love (?:to have)?|missing the ability to|why is there no)\s+([^.,;!?\n]+)/gi;

    let match: RegExpExecArray | null;
    while ((match = needRegex.exec(text)) !== null) {
      if (match[1] && match[1].trim().length > 5) {
        needs.push(match[1].trim().toLowerCase());
      }
    }

    return needs;
  }

  /**
   * Evaluates overall sentiment from rating and text tone.
   */
  public determineSentiment(text: string, rating?: number): 'POSITIVE' | 'NEUTRAL' | 'NEGATIVE' {
    if (rating !== undefined) {
      if (rating >= 4) return 'POSITIVE';
      if (rating <= 2) return 'NEGATIVE';
      return 'NEUTRAL';
    }

    const lower = text.toLowerCase();
    const negWords = [
      'terrible',
      'worst',
      'horrible',
      'waste',
      'frustrated',
      'scam',
      'annoying',
      'disappointed',
      'fail',
    ];
    const posWords = [
      'excellent',
      'amazing',
      'love',
      'fantastic',
      'best',
      'gamechanger',
      'seamless',
      'helpful',
    ];

    const hasNeg = negWords.some((w) => lower.includes(w));
    const hasPos = posWords.some((w) => lower.includes(w));

    if (hasNeg && !hasPos) return 'NEGATIVE';
    if (hasPos && !hasNeg) return 'POSITIVE';
    return 'NEUTRAL';
  }

  /**
   * Writes customer voice records and the overarching analysis into the Evidence Lake.
   */
  private async persistVoiceEvidence(
    workspaceId: string,
    items: CustomerVoiceItem[],
    analysis: CustomerVoiceAnalysis
  ): Promise<void> {
    const records: EvidenceRecord[] = [];
    const now = new Date().toISOString();

    // 1. Overall customer sentiment synthesis record
    records.push({
      evidenceId: `ev_voice_summary_${Date.now()}`,
      workspaceId,
      capability: 'CUSTOMER_VOICE',
      sourceType: 'CUSTOMER_REVIEW',
      title: 'Customer Voice & Objections Synthesis',
      domainOrPlatform: 'customer_voice_engine',
      rawExcerpt: `Analyzed ${analysis.totalReviewsAnalyzed} customer reviews. Top friction points: ${analysis.topObjections.map((o) => `${o.objection} (${o.percentage}%)`).join(', ')}.`,
      extractedMetrics: {
        sentimentScore: analysis.averageSentimentScore,
        reviewCount: analysis.totalReviewsAnalyzed,
        topObjection: analysis.topObjections[0]?.objection || 'NONE',
      },
      provenance: 'AI_INFERRED',
      confidence: 0.94,
      detectedAt: now,
      fingerprint: evidenceLakeRepository.generateFingerprint(
        workspaceId,
        'CUSTOMER_VOICE',
        `summary_${analysis.analyzedAt}`
      ),
      tags: ['customer_voice', 'objections', 'sentiment'],
    });

    // 2. High-value individual negative or competitor-specific reviews
    for (const item of items) {
      if (item.objectionsDetected.length > 0 || item.unmetNeeds.length > 0) {
        records.push({
          evidenceId: `ev_item_${item.id}`,
          workspaceId,
          capability: 'CUSTOMER_VOICE',
          sourceType: 'CUSTOMER_REVIEW',
          title: `Customer Feedback (${item.platform})`,
          domainOrPlatform: item.platform,
          rawExcerpt: item.content,
          extractedMetrics: {
            sentiment: item.sentiment,
            objections: item.objectionsDetected.join(', '),
            unmetNeeds: item.unmetNeeds.join(', '),
            competitorMentioned: item.competitorMentioned || 'N/A',
          },
          provenance: 'AI_INFERRED',
          confidence: 0.88,
          detectedAt: now,
          relatedEntityId: item.competitorMentioned,
          fingerprint: evidenceLakeRepository.generateFingerprint(
            workspaceId,
            'CUSTOMER_VOICE',
            item.id
          ),
          tags: ['customer_voice', ...item.objectionsDetected.map((o) => o.toLowerCase())],
        });
      }
    }

    await evidenceLakeRepository.saveBatch(workspaceId, records);
  }
}

export const customerVoiceService = new CustomerVoiceService();
