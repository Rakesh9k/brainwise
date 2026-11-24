/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type {
  CompetitiveIntelligenceProjectEntity,
  CompetitorDetailedProfile,
  DiscoveredCompetitor,
  EvidenceClaimRecord,
  ComprehensiveCompetitiveReport,
  CompetitiveAdvisorMessage,
} from '../types/competitiveIntelligence';

export class CompetitiveIntelligenceRepository {
  // ---------------------------------------------------------------------------
  // Projects
  // ---------------------------------------------------------------------------
  public async saveProject(
    project: CompetitiveIntelligenceProjectEntity
  ): Promise<CompetitiveIntelligenceProjectEntity> {
    await db
      .doc<CompetitiveIntelligenceProjectEntity>(
        `workspaces/${project.workspaceId}/competitive_projects/${project.projectId}`
      )
      .set(project);
    return project;
  }

  public async getProject(
    workspaceId: string,
    projectId: string
  ): Promise<CompetitiveIntelligenceProjectEntity | null> {
    const snap = await db
      .doc<CompetitiveIntelligenceProjectEntity>(
        `workspaces/${workspaceId}/competitive_projects/${projectId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async getLatestProject(
    workspaceId: string
  ): Promise<CompetitiveIntelligenceProjectEntity | null> {
    const snap = await db
      .collection<CompetitiveIntelligenceProjectEntity>(
        `workspaces/${workspaceId}/competitive_projects`
      )
      .orderBy('updatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ?? null;
  }

  // ---------------------------------------------------------------------------
  // Detailed Competitor Profiles
  // ---------------------------------------------------------------------------
  public async saveCompetitorProfile(
    profile: CompetitorDetailedProfile
  ): Promise<CompetitorDetailedProfile> {
    await db
      .doc<CompetitorDetailedProfile>(
        `workspaces/${profile.workspaceId}/competitive_dossiers/${profile.competitorId}`
      )
      .set(profile);
    return profile;
  }

  public async getCompetitorProfile(
    workspaceId: string,
    competitorId: string
  ): Promise<CompetitorDetailedProfile | null> {
    const snap = await db
      .doc<CompetitorDetailedProfile>(
        `workspaces/${workspaceId}/competitive_dossiers/${competitorId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async listCompetitorProfiles(
    workspaceId: string
  ): Promise<CompetitorDetailedProfile[]> {
    const snap = await db
      .collection<CompetitorDetailedProfile>(
        `workspaces/${workspaceId}/competitive_dossiers`
      )
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is CompetitorDetailedProfile => Boolean(d));
  }

  public async deleteCompetitorProfile(
    workspaceId: string,
    competitorId: string
  ): Promise<void> {
    await db
      .doc(`workspaces/${workspaceId}/competitive_dossiers/${competitorId}`)
      .delete();
  }

  // ---------------------------------------------------------------------------
  // Discovered Competitors Registry
  // ---------------------------------------------------------------------------
  public async saveDiscoveredCompetitor(
    workspaceId: string,
    competitor: DiscoveredCompetitor
  ): Promise<DiscoveredCompetitor> {
    await db
      .doc<DiscoveredCompetitor>(
        `workspaces/${workspaceId}/discovered_competitors/${competitor.competitorId}`
      )
      .set(competitor);
    return competitor;
  }

  public async listDiscoveredCompetitors(
    workspaceId: string
  ): Promise<DiscoveredCompetitor[]> {
    const snap = await db
      .collection<DiscoveredCompetitor>(
        `workspaces/${workspaceId}/discovered_competitors`
      )
      .get();
    return snap.docs.map((d) => d.data()).filter((d): d is DiscoveredCompetitor => Boolean(d));
  }

  public async updateDiscoveredCompetitor(
    workspaceId: string,
    competitorId: string,
    patch: Partial<DiscoveredCompetitor>
  ): Promise<void> {
    await db
      .doc<DiscoveredCompetitor>(
        `workspaces/${workspaceId}/discovered_competitors/${competitorId}`
      )
      .update(patch);
  }

  // ---------------------------------------------------------------------------
  // Evidence Claims
  // ---------------------------------------------------------------------------
  public async saveEvidenceClaim(
    claim: EvidenceClaimRecord
  ): Promise<EvidenceClaimRecord> {
    await db
      .doc<EvidenceClaimRecord>(
        `workspaces/${claim.workspaceId}/competitive_evidence/${claim.evidenceId}`
      )
      .set(claim);
    return claim;
  }

  public async listEvidenceClaims(
    workspaceId: string,
    competitorId?: string
  ): Promise<EvidenceClaimRecord[]> {
    const snap = await db
      .collection<EvidenceClaimRecord>(
        `workspaces/${workspaceId}/competitive_evidence`
      )
      .get();
    const all = snap.docs.map((d) => d.data()).filter((d): d is EvidenceClaimRecord => Boolean(d));
    if (competitorId) {
      return all.filter((c) => c.competitorId === competitorId);
    }
    return all;
  }

  // ---------------------------------------------------------------------------
  // Reports
  // ---------------------------------------------------------------------------
  public async saveReport(
    report: ComprehensiveCompetitiveReport
  ): Promise<ComprehensiveCompetitiveReport> {
    await db
      .doc<ComprehensiveCompetitiveReport>(
        `workspaces/${report.workspaceId}/competitive_reports/${report.reportId}`
      )
      .set(report);
    return report;
  }

  public async getReport(
    workspaceId: string,
    reportId: string
  ): Promise<ComprehensiveCompetitiveReport | null> {
    const snap = await db
      .doc<ComprehensiveCompetitiveReport>(
        `workspaces/${workspaceId}/competitive_reports/${reportId}`
      )
      .get();
    return snap.exists && snap.data() ? snap.data()! : null;
  }

  public async getLatestReport(
    workspaceId: string
  ): Promise<ComprehensiveCompetitiveReport | null> {
    const snap = await db
      .collection<ComprehensiveCompetitiveReport>(
        `workspaces/${workspaceId}/competitive_reports`
      )
      .orderBy('generatedAt', 'desc')
      .limit(1)
      .get();
    return snap.docs[0]?.data() ?? null;
  }

  // ---------------------------------------------------------------------------
  // Conversational Advisor Messages
  // ---------------------------------------------------------------------------
  public async saveAdvisorMessage(
    msg: CompetitiveAdvisorMessage
  ): Promise<CompetitiveAdvisorMessage> {
    await db
      .doc<CompetitiveAdvisorMessage>(
        `workspaces/${msg.workspaceId}/competitive_advisor_messages/${msg.messageId}`
      )
      .set(msg);
    return msg;
  }

  public async listAdvisorMessages(
    workspaceId: string,
    projectId: string
  ): Promise<CompetitiveAdvisorMessage[]> {
    const snap = await db
      .collection<CompetitiveAdvisorMessage>(
        `workspaces/${workspaceId}/competitive_advisor_messages`
      )
      .orderBy('createdAt', 'asc')
      .get();
    const all = snap.docs.map((d) => d.data()).filter((d): d is CompetitiveAdvisorMessage => Boolean(d));
    return all.filter((m) => m.projectId === projectId);
  }
}

export const competitiveIntelligenceRepository = new CompetitiveIntelligenceRepository();
