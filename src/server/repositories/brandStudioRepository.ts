/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db, DbQuery } from '../db/firestore';
import type {
  BrandProjectEntity,
  BrandProfileEntity,
  BrandStrategyEntity,
  BrandResearchEntity,
  CompetitorVisualAnalysisEntity,
  CreativeDirectionEntity,
  BrandAssetVersionEntity,
  BrandGuidelineEntity,
  BrandDesignTokenEntity,
  BrandGenerationEntity,
  BrandApprovalEntity,
  BrandExportEntity,
  BrandQualityReportEntity,
  VisualMoodboardEntity,
  BrandPositioningMap,
  BrandValidationResult,
  LogoConceptPresentation,
  LogoFamilyVariants,
  LogoQualityValidationReport,
  LogoPresentationDeck,
  LivingDesignToken,
  DesignRuleEntity,
  BrandConsistencyReport,
  BrandBookDocument,
  TokenCategory,
  ProductMockupEntity,
  PackagingArtworkEntity,
  EditableDesignDocument,
  SocialCreativeProject,
  CreativeCampaignPackage,
  CreativeOpportunityEntity,
  BrandLaunchKitEntity,
} from '../types/brandStudio';

export class BrandStudioRepository {
  // ---------------------------------------------------------------------------
  // 1. Brand Projects
  // ---------------------------------------------------------------------------
  public async saveProject(project: BrandProjectEntity): Promise<BrandProjectEntity> {
    await db
      .collection<BrandProjectEntity>(`workspaces/${project.workspaceId}/brandProjects`)
      .doc(project.projectId)
      .set(project);
    return project;
  }

  public async getProject(workspaceId: string, projectId: string): Promise<BrandProjectEntity | null> {
    const snap = await db
      .doc<BrandProjectEntity>(`workspaces/${workspaceId}/brandProjects/${projectId}`)
      .get();
    if (!snap.exists || !snap.data()) return null; const d = snap.data()!; (d as any).id = (d as any).mockupId || d.projectId || snap.id; return d;
  }

  public async listProjects(workspaceId: string): Promise<BrandProjectEntity[]> {
    const snap = await db
      .collection<BrandProjectEntity>(`workspaces/${workspaceId}/brandProjects`)
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandProjectEntity[];
  }

  // ---------------------------------------------------------------------------
  // 2. Brand Profile
  // ---------------------------------------------------------------------------
  public async saveProfile(profile: BrandProfileEntity): Promise<BrandProfileEntity> {
    await db
      .collection<BrandProfileEntity>(`workspaces/${profile.workspaceId}/brandProfiles`)
      .doc(profile.profileId)
      .set(profile);
    return profile;
  }

  public async getProfile(workspaceId: string): Promise<BrandProfileEntity | null> {
    const snap = await db
      .collection<BrandProfileEntity>(`workspaces/${workspaceId}/brandProfiles`)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandProfileEntity) : null;
  }

  // ---------------------------------------------------------------------------
  // 3. Brand Strategy
  // ---------------------------------------------------------------------------
  public async saveStrategy(strategy: BrandStrategyEntity): Promise<BrandStrategyEntity> {
    await db
      .collection<BrandStrategyEntity>(`workspaces/${strategy.workspaceId}/brandStrategies`)
      .doc(strategy.strategyId)
      .set(strategy);
    return strategy;
  }

  public async getLatestStrategy(workspaceId: string): Promise<BrandStrategyEntity | null> {
    const snap = await db
      .collection<BrandStrategyEntity>(`workspaces/${workspaceId}/brandStrategies`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandStrategyEntity) : null;
  }

  public async listStrategies(workspaceId: string): Promise<BrandStrategyEntity[]> {
    const snap = await db
      .collection<BrandStrategyEntity>(`workspaces/${workspaceId}/brandStrategies`)
      .orderBy('version', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandStrategyEntity[];
  }

  // ---------------------------------------------------------------------------
  // 4. Brand Research
  // ---------------------------------------------------------------------------
  public async saveResearch(research: BrandResearchEntity): Promise<BrandResearchEntity> {
    await db
      .collection<BrandResearchEntity>(`workspaces/${research.workspaceId}/brandResearch`)
      .doc(research.researchId)
      .set(research);
    return research;
  }

  public async getLatestResearch(workspaceId: string): Promise<BrandResearchEntity | null> {
    const snap = await db
      .collection<BrandResearchEntity>(`workspaces/${workspaceId}/brandResearch`)
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandResearchEntity) : null;
  }

  // ---------------------------------------------------------------------------
  // 5. Competitor Visual Analysis
  // ---------------------------------------------------------------------------
  public async saveCompetitorAnalysis(
    analysis: CompetitorVisualAnalysisEntity
  ): Promise<CompetitorVisualAnalysisEntity> {
    await db
      .collection<CompetitorVisualAnalysisEntity>(
        `workspaces/${analysis.workspaceId}/competitorVisualAnalyses`
      )
      .doc(analysis.analysisId)
      .set(analysis);
    return analysis;
  }

  public async listCompetitorAnalyses(
    workspaceId: string
  ): Promise<CompetitorVisualAnalysisEntity[]> {
    const snap = await db
      .collection<CompetitorVisualAnalysisEntity>(
        `workspaces/${workspaceId}/competitorVisualAnalyses`
      )
      .orderBy('observationDate', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as CompetitorVisualAnalysisEntity[];
  }

  // ---------------------------------------------------------------------------
  // 6. Creative Direction
  // ---------------------------------------------------------------------------
  public async saveCreativeDirection(
    direction: CreativeDirectionEntity
  ): Promise<CreativeDirectionEntity> {
    await db
      .collection<CreativeDirectionEntity>(`workspaces/${direction.workspaceId}/creativeDirections`)
      .doc(direction.directionId)
      .set(direction);
    return direction;
  }

  public async getLatestCreativeDirection(
    workspaceId: string
  ): Promise<CreativeDirectionEntity | null> {
    const snap = await db
      .collection<CreativeDirectionEntity>(`workspaces/${workspaceId}/creativeDirections`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as CreativeDirectionEntity) : null;
  }

  public async getCreativeDirection(
    workspaceId: string,
    directionId: string
  ): Promise<CreativeDirectionEntity | null> {
    const snap = await db
      .doc<CreativeDirectionEntity>(`workspaces/${workspaceId}/creativeDirections/${directionId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listCreativeDirections(workspaceId: string): Promise<CreativeDirectionEntity[]> {
    const snap = await db
      .collection<CreativeDirectionEntity>(`workspaces/${workspaceId}/creativeDirections`)
      .orderBy('version', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as CreativeDirectionEntity[];
  }

  // ---------------------------------------------------------------------------
  // 7. Brand Asset Versions
  // ---------------------------------------------------------------------------
  public async saveAssetVersion(
    version: BrandAssetVersionEntity
  ): Promise<BrandAssetVersionEntity> {
    await db
      .collection<BrandAssetVersionEntity>(`workspaces/${version.workspaceId}/brandAssetVersions`)
      .doc(version.versionId)
      .set(version);
    return version;
  }

  public async listAssetVersions(
    workspaceId: string,
    assetId: string
  ): Promise<BrandAssetVersionEntity[]> {
    const snap = await db
      .collection<BrandAssetVersionEntity>(`workspaces/${workspaceId}/brandAssetVersions`)
      .where('assetId', '==', assetId)
      .orderBy('version', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandAssetVersionEntity[];
  }

  // ---------------------------------------------------------------------------
  // 8. Brand Guidelines
  // ---------------------------------------------------------------------------
  public async saveGuideline(guideline: BrandGuidelineEntity): Promise<BrandGuidelineEntity> {
    await db
      .collection<BrandGuidelineEntity>(`workspaces/${guideline.workspaceId}/brandGuidelines`)
      .doc(guideline.guidelineId)
      .set(guideline);
    return guideline;
  }

  public async getLatestGuideline(workspaceId: string): Promise<BrandGuidelineEntity | null> {
    const snap = await db
      .collection<BrandGuidelineEntity>(`workspaces/${workspaceId}/brandGuidelines`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandGuidelineEntity) : null;
  }

  // ---------------------------------------------------------------------------
  // 9. Brand Design Tokens
  // ---------------------------------------------------------------------------
  public async saveDesignToken(token: BrandDesignTokenEntity): Promise<BrandDesignTokenEntity> {
    await db
      .collection<BrandDesignTokenEntity>(`workspaces/${token.workspaceId}/brandDesignTokens`)
      .doc(token.tokenId)
      .set(token);
    return token;
  }

  public async getLatestDesignToken(workspaceId: string): Promise<BrandDesignTokenEntity | null> {
    const snap = await db
      .collection<BrandDesignTokenEntity>(`workspaces/${workspaceId}/brandDesignTokens`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandDesignTokenEntity) : null;
  }

  // ---------------------------------------------------------------------------
  // 10. Brand Generations (Telemetry & Audit)
  // ---------------------------------------------------------------------------
  public async recordGeneration(
    generation: BrandGenerationEntity
  ): Promise<BrandGenerationEntity> {
    await db
      .collection<BrandGenerationEntity>(`workspaces/${generation.workspaceId}/brandGenerations`)
      .doc(generation.generationId)
      .set(generation);
    return generation;
  }

  public async listGenerations(
    workspaceId: string,
    limitCount = 20
  ): Promise<BrandGenerationEntity[]> {
    const snap = await db
      .collection<BrandGenerationEntity>(`workspaces/${workspaceId}/brandGenerations`)
      .orderBy('createdAt', 'desc')
      .limit(limitCount)
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandGenerationEntity[];
  }

  // ---------------------------------------------------------------------------
  // 11. Brand Approvals
  // ---------------------------------------------------------------------------
  public async recordApproval(approval: BrandApprovalEntity): Promise<BrandApprovalEntity> {
    await db
      .collection<BrandApprovalEntity>(`workspaces/${approval.workspaceId}/brandApprovals`)
      .doc(approval.approvalId)
      .set(approval);
    return approval;
  }

  public async listApprovals(workspaceId: string): Promise<BrandApprovalEntity[]> {
    const snap = await db
      .collection<BrandApprovalEntity>(`workspaces/${workspaceId}/brandApprovals`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandApprovalEntity[];
  }

  // ---------------------------------------------------------------------------
  // 12. Brand Exports
  // ---------------------------------------------------------------------------
  public async saveExport(exportItem: BrandExportEntity): Promise<BrandExportEntity> {
    await db
      .collection<BrandExportEntity>(`workspaces/${exportItem.workspaceId}/brandExports`)
      .doc(exportItem.exportId)
      .set(exportItem);
    return exportItem;
  }

  public async getExport(workspaceId: string, exportId: string): Promise<BrandExportEntity | null> {
    const snap = await db
      .doc<BrandExportEntity>(`workspaces/${workspaceId}/brandExports/${exportId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  // ---------------------------------------------------------------------------
  // 13. Brand Quality Reports
  // ---------------------------------------------------------------------------
  public async saveQualityReport(
    report: BrandQualityReportEntity
  ): Promise<BrandQualityReportEntity> {
    await db
      .collection<BrandQualityReportEntity>(`workspaces/${report.workspaceId}/brandQualityReports`)
      .doc(report.reportId)
      .set(report);
    return report;
  }

  public async getLatestQualityReport(
    workspaceId: string,
    resourceId?: string
  ): Promise<BrandQualityReportEntity | null> {
    let query: DbQuery<BrandQualityReportEntity> = db.collection<BrandQualityReportEntity>(
      `workspaces/${workspaceId}/brandQualityReports`
    );
    if (resourceId) {
      query = query.where('resourceId', '==', resourceId);
    }
    const snap = await query.orderBy('evaluatedAt', 'desc').limit(1).get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandQualityReportEntity) : null;
  }

  // ---------------------------------------------------------------------------
  // 14. Visual Moodboards
  // ---------------------------------------------------------------------------
  public async saveMoodboard(moodboard: VisualMoodboardEntity): Promise<VisualMoodboardEntity> {
    await db
      .collection<VisualMoodboardEntity>(`workspaces/${moodboard.workspaceId}/visualMoodboards`)
      .doc(moodboard.moodboardId)
      .set(moodboard);
    return moodboard;
  }

  public async getMoodboard(
    workspaceId: string,
    moodboardId: string
  ): Promise<VisualMoodboardEntity | null> {
    const snap = await db
      .doc<VisualMoodboardEntity>(`workspaces/${workspaceId}/visualMoodboards/${moodboardId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listMoodboards(
    workspaceId: string,
    directionId?: string
  ): Promise<VisualMoodboardEntity[]> {
    let query: DbQuery<VisualMoodboardEntity> = db.collection<VisualMoodboardEntity>(
      `workspaces/${workspaceId}/visualMoodboards`
    );
    if (directionId) {
      query = query.where('directionId', '==', directionId);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as VisualMoodboardEntity[];
  }

  // ---------------------------------------------------------------------------
  // 15. Brand Positioning Maps
  // ---------------------------------------------------------------------------
  public async savePositioningMap(map: BrandPositioningMap): Promise<BrandPositioningMap> {
    await db
      .collection<BrandPositioningMap>(`workspaces/${map.workspaceId}/brandPositioningMaps`)
      .doc(map.mapId)
      .set(map);
    return map;
  }

  public async getLatestPositioningMap(
    workspaceId: string
  ): Promise<BrandPositioningMap | null> {
    const snap = await db
      .collection<BrandPositioningMap>(`workspaces/${workspaceId}/brandPositioningMaps`)
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandPositioningMap) : null;
  }

  // ---------------------------------------------------------------------------
  // 16. Brand Validation Results
  // ---------------------------------------------------------------------------
  public async saveValidationResult(val: BrandValidationResult): Promise<BrandValidationResult> {
    await db
      .collection<BrandValidationResult>(`workspaces/${val.workspaceId}/brandValidationResults`)
      .doc(val.validationId)
      .set(val);
    return val;
  }

  public async getLatestValidationResult(
    workspaceId: string
  ): Promise<BrandValidationResult | null> {
    const snap = await db
      .collection<BrandValidationResult>(`workspaces/${workspaceId}/brandValidationResults`)
      .orderBy('evaluatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandValidationResult) : null;
  }

  // ---------------------------------------------------------------------------
  // 17. Logo Concepts
  // ---------------------------------------------------------------------------
  public async saveLogoConcept(
    concept: LogoConceptPresentation
  ): Promise<LogoConceptPresentation> {
    await db
      .collection<LogoConceptPresentation>(`workspaces/${concept.workspaceId}/logoConcepts`)
      .doc(concept.id)
      .set(concept);
    return concept;
  }

  public async getLogoConcept(
    workspaceId: string,
    conceptId: string
  ): Promise<LogoConceptPresentation | null> {
    const snap = await db
      .doc<LogoConceptPresentation>(`workspaces/${workspaceId}/logoConcepts/${conceptId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listLogoConcepts(workspaceId: string): Promise<LogoConceptPresentation[]> {
    const snap = await db
      .collection<LogoConceptPresentation>(`workspaces/${workspaceId}/logoConcepts`)
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as LogoConceptPresentation[];
  }

  public async getActiveLogo(workspaceId: string): Promise<LogoConceptPresentation | null> {
    const concepts = await this.listLogoConcepts(workspaceId);
    return concepts[0] || null;
  }

  // ---------------------------------------------------------------------------
  // 18. Logo Family Variants
  // ---------------------------------------------------------------------------
  public async saveLogoVariants(variants: LogoFamilyVariants): Promise<LogoFamilyVariants> {
    await db
      .collection<LogoFamilyVariants>(`workspaces/${variants.workspaceId}/logoVariants`)
      .doc(variants.conceptId)
      .set(variants);
    return variants;
  }

  public async getLogoVariants(
    workspaceId: string,
    conceptId: string
  ): Promise<LogoFamilyVariants | null> {
    const snap = await db
      .doc<LogoFamilyVariants>(`workspaces/${workspaceId}/logoVariants/${conceptId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  // ---------------------------------------------------------------------------
  // 19. Logo Quality Validation Reports
  // ---------------------------------------------------------------------------
  public async saveLogoQualityReport(
    report: LogoQualityValidationReport
  ): Promise<LogoQualityValidationReport> {
    await db
      .collection<LogoQualityValidationReport>(`workspaces/${report.workspaceId}/logoQualityReports`)
      .doc(report.reportId)
      .set(report);
    return report;
  }

  public async getLatestLogoQualityReport(
    workspaceId: string,
    conceptId?: string
  ): Promise<LogoQualityValidationReport | null> {
    let query: DbQuery<LogoQualityValidationReport> = db.collection<LogoQualityValidationReport>(
      `workspaces/${workspaceId}/logoQualityReports`
    );
    if (conceptId) {
      query = query.where('conceptId', '==', conceptId);
    }
    const snap = await query.orderBy('evaluatedAt', 'desc').limit(1).get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as LogoQualityValidationReport) : null;
  }

  // ---------------------------------------------------------------------------
  // 20. Logo Presentation Decks
  // ---------------------------------------------------------------------------
  public async saveLogoPresentation(
    deck: LogoPresentationDeck
  ): Promise<LogoPresentationDeck> {
    await db
      .collection<LogoPresentationDeck>(`workspaces/${deck.workspaceId}/logoPresentations`)
      .doc(deck.deckId)
      .set(deck);
    return deck;
  }

  public async getLatestLogoPresentation(
    workspaceId: string
  ): Promise<LogoPresentationDeck | null> {
    const snap = await db
      .collection<LogoPresentationDeck>(`workspaces/${workspaceId}/logoPresentations`)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as LogoPresentationDeck) : null;
  }

  // ---------------------------------------------------------------------------
  // 21. Living Design Tokens
  // ---------------------------------------------------------------------------
  public async saveLivingToken(token: LivingDesignToken): Promise<LivingDesignToken> {
    await db
      .collection<LivingDesignToken>(`workspaces/${token.workspaceId}/livingDesignTokens`)
      .doc(token.tokenId)
      .set(token);
    return token;
  }

  public async getLivingToken(
    workspaceId: string,
    tokenId: string
  ): Promise<LivingDesignToken | null> {
    const snap = await db
      .doc<LivingDesignToken>(`workspaces/${workspaceId}/livingDesignTokens/${tokenId}`)
      .get();
    if (snap.exists && snap.data()) return snap.data()!;

    const tokens = await this.listLivingTokens(workspaceId);
    return (
      tokens.find(
        (t) =>
          t.tokenId === tokenId ||
          t.semanticPath === tokenId ||
          t.name === tokenId
      ) || null
    );
  }

  public async listLivingTokens(
    workspaceId: string,
    category?: TokenCategory
  ): Promise<LivingDesignToken[]> {
    let query: DbQuery<LivingDesignToken> = db.collection<LivingDesignToken>(
      `workspaces/${workspaceId}/livingDesignTokens`
    );
    if (category) {
      query = query.where('category', '==', category);
    }
    const snap = await query.orderBy('updatedAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as LivingDesignToken[];
  }

  // ---------------------------------------------------------------------------
  // 22. Design Rules
  // ---------------------------------------------------------------------------
  public async saveDesignRule(rule: DesignRuleEntity): Promise<DesignRuleEntity> {
    await db
      .collection<DesignRuleEntity>(`workspaces/${rule.workspaceId}/designRules`)
      .doc(rule.ruleId)
      .set(rule);
    return rule;
  }

  public async listDesignRules(
    workspaceId: string,
    domain?: string
  ): Promise<DesignRuleEntity[]> {
    let query: DbQuery<DesignRuleEntity> = db.collection<DesignRuleEntity>(`workspaces/${workspaceId}/designRules`);
    if (domain) {
      query = query.where('domain', '==', domain);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as DesignRuleEntity[];
  }

  // ---------------------------------------------------------------------------
  // 23. Brand Consistency Reports
  // ---------------------------------------------------------------------------
  public async saveConsistencyReport(
    report: BrandConsistencyReport
  ): Promise<BrandConsistencyReport> {
    await db
      .collection<BrandConsistencyReport>(
        `workspaces/${report.workspaceId}/brandConsistencyReports`
      )
      .doc(report.evaluationId)
      .set(report);
    return report;
  }

  public async getLatestConsistencyReport(
    workspaceId: string,
    assetId?: string
  ): Promise<BrandConsistencyReport | null> {
    let query: DbQuery<BrandConsistencyReport> = db.collection<BrandConsistencyReport>(
      `workspaces/${workspaceId}/brandConsistencyReports`
    );
    if (assetId) {
      query = query.where('assetId', '==', assetId);
    }
    const snap = await query.orderBy('evaluatedAt', 'desc').limit(1).get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandConsistencyReport) : null;
  }

  // ---------------------------------------------------------------------------
  // 24. Brand Books
  // ---------------------------------------------------------------------------
  public async saveBrandBook(book: BrandBookDocument): Promise<BrandBookDocument> {
    await db
      .collection<BrandBookDocument>(`workspaces/${book.workspaceId}/brandBooks`)
      .doc(book.documentId)
      .set(book);
    return book;
  }

  public async getLatestBrandBook(workspaceId: string): Promise<BrandBookDocument | null> {
    const snap = await db
      .collection<BrandBookDocument>(`workspaces/${workspaceId}/brandBooks`)
      .orderBy('version', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ? (snap.docs[0].data() as BrandBookDocument) : null;
  }

  public async listBrandBooks(workspaceId: string): Promise<BrandBookDocument[]> {
    const snap = await db
      .collection<BrandBookDocument>(`workspaces/${workspaceId}/brandBooks`)
      .orderBy('version', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as BrandBookDocument[];
  }

  // ---------------------------------------------------------------------------
  // 25. Product Mockups
  // ---------------------------------------------------------------------------
  public async saveMockup(mockup: ProductMockupEntity): Promise<ProductMockupEntity> {
    await db
      .collection<ProductMockupEntity>(`workspaces/${mockup.workspaceId}/productMockups`)
      .doc(mockup.mockupId)
      .set(mockup);
    return mockup;
  }

  public async getMockup(
    workspaceId: string,
    mockupId: string
  ): Promise<ProductMockupEntity | null> {
    const snap = await db
      .doc<ProductMockupEntity>(`workspaces/${workspaceId}/productMockups/${mockupId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listMockups(
    workspaceId: string,
    productCategory?: string
  ): Promise<ProductMockupEntity[]> {
    let query: DbQuery<ProductMockupEntity> = db.collection<ProductMockupEntity>(`workspaces/${workspaceId}/productMockups`);
    if (productCategory) {
      query = query.where('productCategory', '==', productCategory);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => { const data = d.data(); if (!data) return null; (data as any).id = data.mockupId || d.id; return data; }).filter(Boolean) as ProductMockupEntity[];
  }

  // ---------------------------------------------------------------------------
  // 26. Packaging Artworks
  // ---------------------------------------------------------------------------
  public async savePackagingArtwork(
    artwork: PackagingArtworkEntity
  ): Promise<PackagingArtworkEntity> {
    await db
      .collection<PackagingArtworkEntity>(`workspaces/${artwork.workspaceId}/packagingArtworks`)
      .doc(artwork.packagingId)
      .set(artwork);
    return artwork;
  }

  public async getPackagingArtwork(
    workspaceId: string,
    packagingId: string
  ): Promise<PackagingArtworkEntity | null> {
    const snap = await db
      .doc<PackagingArtworkEntity>(`workspaces/${workspaceId}/packagingArtworks/${packagingId}`)
      .get();
    if (!snap.exists || !snap.data()) return null; const d = snap.data()!; (d as any).id = d.packagingId || snap.id; return d;
  }

  public async listPackagingArtworks(
    workspaceId: string,
    productCategory?: string
  ): Promise<PackagingArtworkEntity[]> {
    let query: DbQuery<PackagingArtworkEntity> = db.collection<PackagingArtworkEntity>(`workspaces/${workspaceId}/packagingArtworks`);
    if (productCategory) {
      query = query.where('productCategory', '==', productCategory);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => { const data = d.data(); if (!data) return null; (data as any).id = data.packagingId || d.id; return data; }).filter(Boolean) as PackagingArtworkEntity[];
  }

  // ---------------------------------------------------------------------------
  // 27. Editable Design Documents
  // ---------------------------------------------------------------------------
  public async saveEditableDocument(
    doc: EditableDesignDocument
  ): Promise<EditableDesignDocument> {
    await db
      .collection<EditableDesignDocument>(`workspaces/${doc.workspaceId}/editableDesignDocuments`)
      .doc(doc.documentId)
      .set(doc);
    return doc;
  }

  public async getEditableDocument(
    workspaceId: string,
    documentId: string
  ): Promise<EditableDesignDocument | null> {
    const snap = await db
      .doc<EditableDesignDocument>(`workspaces/${workspaceId}/editableDesignDocuments/${documentId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listEditableDocuments(workspaceId: string): Promise<EditableDesignDocument[]> {
    const snap = await db
      .collection<EditableDesignDocument>(`workspaces/${workspaceId}/editableDesignDocuments`)
      .orderBy('updatedAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as EditableDesignDocument[];
  }

  // ---------------------------------------------------------------------------
  // 28. Social Creative Projects
  // ---------------------------------------------------------------------------
  public async saveSocialProject(
    project: SocialCreativeProject
  ): Promise<SocialCreativeProject> {
    await db
      .collection<SocialCreativeProject>(`workspaces/${project.workspaceId}/socialCreativeProjects`)
      .doc(project.projectId)
      .set(project);
    return project;
  }

  public async getSocialProject(
    workspaceId: string,
    projectId: string
  ): Promise<SocialCreativeProject | null> {
    const snap = await db
      .doc<SocialCreativeProject>(`workspaces/${workspaceId}/socialCreativeProjects/${projectId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listSocialProjects(
    workspaceId: string,
    platform?: string
  ): Promise<SocialCreativeProject[]> {
    let query: DbQuery<SocialCreativeProject> = db.collection<SocialCreativeProject>(`workspaces/${workspaceId}/socialCreativeProjects`);
    if (platform) {
      query = query.where('platform', '==', platform);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as SocialCreativeProject[];
  }

  // ---------------------------------------------------------------------------
  // 29. Creative Campaign Packages
  // ---------------------------------------------------------------------------
  public async saveCampaignPackage(
    campaign: CreativeCampaignPackage
  ): Promise<CreativeCampaignPackage> {
    await db
      .collection<CreativeCampaignPackage>(`workspaces/${campaign.workspaceId}/creativeCampaigns`)
      .doc(campaign.campaignId)
      .set(campaign);
    return campaign;
  }

  public async getCampaignPackage(
    workspaceId: string,
    campaignId: string
  ): Promise<CreativeCampaignPackage | null> {
    const snap = await db
      .doc<CreativeCampaignPackage>(`workspaces/${workspaceId}/creativeCampaigns/${campaignId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listCampaignPackages(workspaceId: string): Promise<CreativeCampaignPackage[]> {
    const snap = await db
      .collection<CreativeCampaignPackage>(`workspaces/${workspaceId}/creativeCampaigns`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as CreativeCampaignPackage[];
  }

  // ---------------------------------------------------------------------------
  // 30. Creative Opportunities
  // ---------------------------------------------------------------------------
  public async saveCreativeOpportunity(
    opp: CreativeOpportunityEntity
  ): Promise<CreativeOpportunityEntity> {
    await db
      .collection<CreativeOpportunityEntity>(`workspaces/${opp.workspaceId}/creativeOpportunities`)
      .doc(opp.opportunityId)
      .set(opp);
    return opp;
  }

  public async getCreativeOpportunity(
    workspaceId: string,
    opportunityId: string
  ): Promise<CreativeOpportunityEntity | null> {
    const snap = await db
      .doc<CreativeOpportunityEntity>(`workspaces/${workspaceId}/creativeOpportunities/${opportunityId}`)
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listCreativeOpportunities(
    workspaceId: string,
    status?: 'ACTIVE' | 'DISMISSED' | 'EXECUTED'
  ): Promise<CreativeOpportunityEntity[]> {
    let query: DbQuery<CreativeOpportunityEntity> = db.collection<CreativeOpportunityEntity>(`workspaces/${workspaceId}/creativeOpportunities`);
    if (status) {
      query = query.where('status', '==', status);
    }
    const snap = await query.orderBy('createdAt', 'desc').get();
    return snap.docs.map((d) => d.data()).filter(Boolean) as CreativeOpportunityEntity[];
  }

  // ---------------------------------------------------------------------------
  // 31. Unified Brand Launch Kits
  // ---------------------------------------------------------------------------
  public async saveLaunchKit(kit: BrandLaunchKitEntity): Promise<BrandLaunchKitEntity> {
    await db
      .collection<BrandLaunchKitEntity>(`workspaces/${kit.workspaceId}/brandLaunchKits`)
      .doc(kit.launchId)
      .set(kit);
    return kit;
  }

  public async getLaunchKit(
    workspaceId: string,
    launchId: string
  ): Promise<BrandLaunchKitEntity | null> {
    const snap = await db
      .doc<BrandLaunchKitEntity>(`workspaces/${workspaceId}/brandLaunchKits/${launchId}`)
      .get();
    if (!snap.exists || !snap.data()) return null;
    const data = snap.data()!;
    (data as any).id = data.launchId || snap.id;
    return data;
  }

  public async getLatestLaunchKit(workspaceId: string): Promise<BrandLaunchKitEntity | null> {
    const snap = await db
      .collection<BrandLaunchKitEntity>(`workspaces/${workspaceId}/brandLaunchKits`)
      .orderBy('createdAt', 'desc')
      .limit(1)
      .get();
    if (snap.empty || !snap.docs[0]?.data()) return null;
    const data = snap.docs[0].data();
    if (!data) return null;
    (data as any).id = data.launchId || snap.docs[0].id;
    return data;
  }

  public async listLaunchKits(workspaceId: string): Promise<BrandLaunchKitEntity[]> {
    const snap = await db
      .collection<BrandLaunchKitEntity>(`workspaces/${workspaceId}/brandLaunchKits`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((d) => {
      const data = d.data();
      if (!data) return null;
      (data as any).id = data.launchId || d.id;
      return data;
    }).filter(Boolean) as BrandLaunchKitEntity[];
  }
}

export const brandStudioRepository = new BrandStudioRepository();
