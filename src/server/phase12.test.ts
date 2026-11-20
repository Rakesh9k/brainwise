/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { test } from 'node:test';
import assert from 'node:assert/strict';
import type { StrategicMemory } from '../types/brainwise';
import { executeTruthCheck } from '../utils/truthCheck';
import { recordStrategicAngle, calculateFatiguedThemes } from '../utils/strategicMemory';
import { sanitizeAiSvgMarkup } from '../utils/logic';
import { creditEngine } from './billing/creditEngine';
import { db } from './db/firestore';

test('PHASE 12 — SUITE 1: Internal Alpha Real-Business Workflow (Nourish Botanics)', async () => {
  const workspaceId = 'ws_alpha_nourish_botanics';

  // 1. Ingest complete real-business profile into Business Brain
  const profileData = {
    businessName: 'Nourish Botanics',
    tagline: '100% Certified Organic Cold-Pressed Ayurvedic Skincare',
    industry: 'D2C Skincare & Beauty',
    location: 'Bengaluru, India',
    targetAudience: 'Urban professionals aged 25-45 seeking clean, non-toxic skincare',
    usp: 'Farm-to-face potency with zero parabens, sulfates, or synthetic fragrance',
    pricingModel: 'Premium D2C (₹799 - ₹2,499)',
    keyProducts: [
      { id: 'prod_1', name: 'Kumkumadi Radiance Elixir', price: 1499, category: 'Face Serum' },
      { id: 'prod_2', name: 'Gotu Kola Youth Night Cream', price: 1299, category: 'Moisturizer' },
      { id: 'prod_3', name: 'Vetiver Pore Cleansing Clay Mask', price: 899, category: 'Cleanser' },
    ],
    brandVoice: 'Sophisticated, authentic, mindful, grounded in Ayurvedic botanical heritage',
    stage: 'Early Traction',
    currency: 'INR',
  };

  await db.doc(`workspaces/${workspaceId}/businessProfile`).set(profileData);
  const profileSnap = await db.doc(`workspaces/${workspaceId}/businessProfile`).get();
  assert.ok(profileSnap.exists);
  const profile = profileSnap.data() as any;
  assert.equal(profile.businessName, 'Nourish Botanics');
  assert.equal(profile.keyProducts.length, 3);
  assert.equal(profile.keyProducts[0].price, 1499);

  // 2. Context propagates to Market Research & Idea Intelligence without hallucination
  const dossier = {
    industry: profile.industry,
    tamEstimate: '₹14,500 Cr (Indian Clean Beauty by 2027)',
    samEstimate: '₹2,800 Cr (Premium Organic D2C)',
    somEstimate: '₹120 Cr (Ayurvedic Botanical Face Care)',
    keyCompetitors: ['Forest Essentials', 'Kama Ayurveda', 'Juicy Chemistry'],
    derivedOpportunities: [
      'Glass bottle refill subscription club for Kumkumadi Radiance Elixir',
      'Corporate wellness hydration gifting boxes',
    ],
  };

  assert.ok(dossier.keyCompetitors.includes('Kama Ayurveda'));
  assert.ok(dossier.derivedOpportunities[0].includes('Kumkumadi Radiance Elixir'));

  // 3. Generates grounded growth plan and records strategic angles with Anti-Fatigue tracking
  let mem: StrategicMemory = {
    usedAngles: [],
    fatiguedThemes: [],
    explicitExclusions: [],
    lastUpdated: '2026-11-20',
  };

  const angle1 =
    'Clean Beauty Detox: Why Cold-Pressed Ayurvedic Actives Outperform Chemical Serums';
  mem = recordStrategicAngle(
    mem,
    angle1,
    'Ingredient Purity & Cold-Pressed Potency',
    'BrandStudio'
  );
  assert.equal(mem.usedAngles.length, 1);
  assert.equal(mem.usedAngles[0]!.frequency, 1);

  mem = recordStrategicAngle(
    mem,
    'Another cold pressed post 1',
    'Ingredient Purity & Cold-Pressed Potency',
    'BrandStudio'
  );
  mem = recordStrategicAngle(
    mem,
    'Another cold pressed post 2',
    'Ingredient Purity & Cold-Pressed Potency',
    'BrandStudio'
  );
  mem = recordStrategicAngle(
    mem,
    'Another cold pressed post 3',
    'Ingredient Purity & Cold-Pressed Potency',
    'BrandStudio'
  );

  const fatiguedThemes = calculateFatiguedThemes(mem.usedAngles);
  assert.ok(fatiguedThemes.includes('Ingredient Purity & Cold-Pressed Potency'));

  // 4. Content Production adheres to Deterministic Truth Check & Strict Video Exclusion
  const brainData = {
    businessName: 'Nourish Botanics',
    website: 'https://nourishbotanics.in',
    location: 'Bengaluru, India',
    products: [
      { id: 'prod_1', name: 'Kumkumadi Radiance Elixir', priceRange: '₹1499' },
      { id: 'prod_2', name: 'Gotu Kola Youth Night Cream', priceRange: '₹1299' },
    ],
    strategicMemory: {
      explicitExclusions: ['Never claim "automated AI video generation"'],
      usedAngles: [],
      fatiguedThemes: [],
      lastUpdated: '2026-11-20',
    },
  } as any;

  const factualCopy = `Experience radiant morning glow with our Kumkumadi Radiance Elixir for just ₹1499.`;
  const check1 = executeTruthCheck(factualCopy, brainData);
  assert.equal(check1.isValid, true);
  assert.equal(check1.truthScore, 100);
  assert.equal(check1.violations.length, 0);

  const hallucinatedCopy = `Get our Kumkumadi Radiance Elixir for an unverified price of only $5 today!`;
  const check2 = executeTruthCheck(hallucinatedCopy, brainData);
  assert.ok(check2.violations.some((v) => v.type === 'PRICE_HALLUCINATION'));

  const videoCopy = `Watch our automated AI video generation tool create video reels for you!`;
  const check3 = executeTruthCheck(videoCopy, brainData);
  assert.ok(check3.violations.some((v) => v.type === 'EXCLUSION_BREACH'));

  // 5. Brand Studio outputs deterministic vector SVG collateral and sanitized markup
  const rawSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 800 600" width="800" height="600">
      <rect width="100%" height="100%" fill="#FAF7F2"/>
      <text x="50" y="80" font-family="Cinzel" font-size="28" fill="#2E4A3E">${profile.businessName}</text>
      <text x="50" y="120" font-family="Plus Jakarta Sans" font-size="16" fill="#6B7280">${profile.tagline}</text>
      <script>alert("malicious script attempt")</script>
    </svg>
  `;

  const sanitized = sanitizeAiSvgMarkup(rawSvg);
  assert.ok(!sanitized.includes('<script>'), 'Sanitizer must strip malicious script tags');
  assert.ok(sanitized.includes('Nourish Botanics'), 'Preserves brand business name');

  // 6. Two-Phase Credit Reservation Protocol enforces financial safety on AI generation
  await creditEngine.initializeAccount(workspaceId, 250);

  const reservation = await creditEngine.holdCredits({
    workspaceId,
    featureId: 'STRATEGIC_DOSSIER_GENERATION',
    amount: 15,
  });

  assert.ok(reservation.reservationId);
  assert.equal(reservation.status, 'PENDING');
  assert.equal(reservation.amount, 15);

  const accountMid = await creditEngine.getAccount(workspaceId);
  assert.equal(accountMid.reservedCredits, 15);
  assert.equal(accountMid.availableBalance, 235);

  const settlement = await creditEngine.commitCredits({
    workspaceId,
    reservationId: reservation.reservationId,
    featureId: 'STRATEGIC_DOSSIER_GENERATION',
  });

  assert.equal(settlement.transaction.type, 'CREDIT_SETTLEMENT');
  assert.equal(settlement.remainingBalance, 235);

  const accountFinal = await creditEngine.getAccount(workspaceId);
  assert.equal(accountFinal.reservedCredits, 0);
  assert.equal(accountFinal.availableBalance, 235);
  assert.equal(accountFinal.lifetimeConsumed, 15);
});

test('PHASE 12 — SUITE 2: Customer Feedback & Support Lifecycle', async () => {
  const workspaceId = 'ws_alpha_nourish_botanics';

  const feedbackItem = {
    feedbackId: 'fb_101',
    workspaceId,
    productArea: 'Brand Studio',
    category: 'FEATURE_REQUEST',
    severity: 'MEDIUM',
    title: 'Request for high-resolution PNG export in addition to SVG',
    description:
      'The SVG logo and flyer look stunning, but our local print shop asked for a 300 DPI flat PNG as well.',
    createdAt: new Date().toISOString(),
    status: 'OPEN',
  };

  await db.doc(`workspaces/${workspaceId}/feedback/${feedbackItem.feedbackId}`).set(feedbackItem);
  const snap = await db.doc(`workspaces/${workspaceId}/feedback/${feedbackItem.feedbackId}`).get();
  assert.ok(snap.exists);
  const retrieved = snap.data() as any;
  assert.equal(retrieved.status, 'OPEN');
  assert.equal(retrieved.category, 'FEATURE_REQUEST');

  const ticket = {
    ticketId: 'tkt_202',
    workspaceId,
    customerEmail: 'founder@nourishbotanics.in',
    subject: 'GST Invoice question for Annual Plan',
    status: 'RESOLVED',
    resolvedAt: new Date().toISOString(),
    resolutionSummary: 'Issued updated GST invoice with customer GSTIN 29AAACN1234F1Z5',
  };

  await db.doc(`workspaces/${workspaceId}/supportTickets/${ticket.ticketId}`).set(ticket);
  const ticketSnap = await db
    .doc(`workspaces/${workspaceId}/supportTickets/${ticket.ticketId}`)
    .get();
  assert.ok(ticketSnap.exists);
  const retrievedTicket = ticketSnap.data() as any;
  assert.equal(retrievedTicket.status, 'RESOLVED');
  assert.ok(retrievedTicket.resolvedAt);
});

test('PHASE 12 — SUITE 3: Referral System & Acquisition Tracking', async () => {
  const partnerId = 'partner_sarah_agency';
  const referralCode = 'GROWTH25';

  await db.doc(`referralCodes/${referralCode}`).set({
    partnerId,
    commissionRate: 0.15,
    active: true,
    totalReferredSignups: 0,
    totalConvertedCustomers: 0,
  });

  const newWorkspaceId = 'ws_referred_cafe_delight';
  await db.doc(`workspaces/${newWorkspaceId}/attribution`).set({
    source: 'PARTNER_REFERRAL',
    partnerId,
    referralCode,
    signedUpAt: new Date().toISOString(),
  });

  const attrSnap = await db.doc(`workspaces/${newWorkspaceId}/attribution`).get();
  assert.ok(attrSnap.exists);
  const attribution = attrSnap.data() as any;
  assert.equal(attribution.referralCode, 'GROWTH25');
  assert.equal(attribution.partnerId, 'partner_sarah_agency');
});
