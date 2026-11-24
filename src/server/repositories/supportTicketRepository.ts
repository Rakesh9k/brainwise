/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';

export interface SupportTicketEntity {
  ticketId: string;
  workspaceId: string;
  userId?: string;
  customerEmail?: string;
  subject: string;
  message: string;
  category?: 'QUESTION' | 'BUG' | 'FEATURE_REQUEST' | 'BILLING' | 'OTHER';
  status: 'OPEN' | 'IN_PROGRESS' | 'RESOLVED' | 'CLOSED';
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  resolutionSummary?: string;
  [key: string]: unknown;
}

export class SupportTicketRepository {
  public async createTicket(ticket: SupportTicketEntity): Promise<SupportTicketEntity> {
    await db
      .doc<SupportTicketEntity>(`workspaces/${ticket.workspaceId}/supportTickets/${ticket.ticketId}`)
      .set(ticket);
    return ticket;
  }

  public async getTicket(workspaceId: string, ticketId: string): Promise<SupportTicketEntity | null> {
    const snap = await db.doc<SupportTicketEntity>(`workspaces/${workspaceId}/supportTickets/${ticketId}`).get();
    return snap.exists && snap.data() ? (snap.data() as SupportTicketEntity) : null;
  }

  public async listTickets(workspaceId: string): Promise<SupportTicketEntity[]> {
    const snap = await db
      .collection<SupportTicketEntity>(`workspaces/${workspaceId}/supportTickets`)
      .orderBy('createdAt', 'desc')
      .get();
    return snap.docs.map((doc) => doc.data()).filter((t): t is SupportTicketEntity => Boolean(t));
  }

  public async updateTicket(
    workspaceId: string,
    ticketId: string,
    updates: Partial<SupportTicketEntity>
  ): Promise<SupportTicketEntity> {
    const ref = db.doc<SupportTicketEntity>(`workspaces/${workspaceId}/supportTickets/${ticketId}`);
    await ref.update(updates);
    const snap = await ref.get();
    return snap.data() as SupportTicketEntity;
  }
}

export const supportTicketRepository = new SupportTicketRepository();
