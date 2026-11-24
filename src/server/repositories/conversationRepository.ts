/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { db } from '../db/firestore';
import type { AskBusinessConversation, AskBusinessMessage } from '../types/api';

export class ConversationRepository {
  public async createConversation(
    conversation: AskBusinessConversation
  ): Promise<AskBusinessConversation> {
    await db
      .collection<AskBusinessConversation>(`workspaces/${conversation.workspaceId}/conversations`)
      .doc(conversation.conversationId)
      .set(conversation);
    return conversation;
  }

  public async getConversation(
    workspaceId: string,
    conversationId: string
  ): Promise<AskBusinessConversation | null> {
    const snap = await db
      .collection<AskBusinessConversation>(`workspaces/${workspaceId}/conversations`)
      .doc(conversationId)
      .get();
    return snap.exists && snap.data() ? (snap.data() as AskBusinessConversation) : null;
  }

  public async listConversations(
    workspaceId: string,
    limit: number = 20
  ): Promise<AskBusinessConversation[]> {
    const snap = await db
      .collection<AskBusinessConversation>(`workspaces/${workspaceId}/conversations`)
      .orderBy('updatedAt', 'desc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data()).filter((d): d is AskBusinessConversation => Boolean(d));
  }

  public async updateConversation(
    workspaceId: string,
    conversationId: string,
    patch: Partial<AskBusinessConversation>
  ): Promise<AskBusinessConversation> {
    const ref = db
      .collection<AskBusinessConversation>(`workspaces/${workspaceId}/conversations`)
      .doc(conversationId);

    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Conversation '${conversationId}' not found in workspace '${workspaceId}'`);
    }

    const updated: AskBusinessConversation = {
      ...(existing.data() as AskBusinessConversation),
      ...patch,
      updatedAt: new Date().toISOString(),
    };

    await ref.set(updated);
    return updated;
  }

  public async deleteConversation(workspaceId: string, conversationId: string): Promise<boolean> {
    await db.collection(`workspaces/${workspaceId}/conversations`).doc(conversationId).delete();
    return true;
  }

  public async addMessage(
    workspaceId: string,
    message: AskBusinessMessage
  ): Promise<AskBusinessMessage> {
    await db
      .collection<AskBusinessMessage>(
        `workspaces/${workspaceId}/conversations/${message.conversationId}/messages`
      )
      .doc(message.id)
      .set(message);

    // Update conversation message count and last snippet
    try {
      const conv = await this.getConversation(workspaceId, message.conversationId);
      if (conv) {
        await this.updateConversation(workspaceId, message.conversationId, {
          messageCount: (conv.messageCount || 0) + 1,
          lastMessageSnippet: message.content.slice(0, 100),
          updatedAt: new Date().toISOString(),
        });
      }
    } catch {
      // non-blocking
    }

    return message;
  }

  public async listMessages(
    workspaceId: string,
    conversationId: string,
    limit: number = 50
  ): Promise<AskBusinessMessage[]> {
    const snap = await db
      .collection<AskBusinessMessage>(
        `workspaces/${workspaceId}/conversations/${conversationId}/messages`
      )
      .orderBy('createdAt', 'asc')
      .limit(limit)
      .get();

    return snap.docs.map((d) => d.data()).filter((d): d is AskBusinessMessage => Boolean(d));
  }

  public async getMessage(
    workspaceId: string,
    conversationId: string,
    messageId: string
  ): Promise<AskBusinessMessage | null> {
    const snap = await db
      .collection<AskBusinessMessage>(
        `workspaces/${workspaceId}/conversations/${conversationId}/messages`
      )
      .doc(messageId)
      .get();
    return snap.exists && snap.data() ? (snap.data() as AskBusinessMessage) : null;
  }

  public async updateMessage(
    workspaceId: string,
    conversationId: string,
    messageId: string,
    patch: Partial<AskBusinessMessage>
  ): Promise<AskBusinessMessage> {
    const ref = db
      .collection<AskBusinessMessage>(
        `workspaces/${workspaceId}/conversations/${conversationId}/messages`
      )
      .doc(messageId);

    const existing = await ref.get();
    if (!existing.exists) {
      throw new Error(`Message '${messageId}' not found in conversation '${conversationId}'`);
    }

    const updated: AskBusinessMessage = {
      ...(existing.data() as AskBusinessMessage),
      ...patch,
    };

    await ref.set(updated);
    return updated;
  }
}

export const conversationRepository = new ConversationRepository();
