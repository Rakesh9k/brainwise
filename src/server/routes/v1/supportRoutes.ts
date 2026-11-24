/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { Router, type Request, type Response } from 'express';
import crypto from 'node:crypto';
import { authenticateToken } from '../../middleware/auth';
import { requireWorkspaceMember } from '../../middleware/workspace';
import { supportTicketRepository } from '../../repositories/supportTicketRepository';

const router = Router({ mergeParams: true });

router.use(authenticateToken);
router.use(requireWorkspaceMember);

/**
 * GET /api/v1/workspaces/:workspaceId/support/tickets
 */
router.get('/tickets', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.workspace!.workspaceId;
  const tickets = await supportTicketRepository.listTickets(workspaceId);
  res.json({ success: true, data: tickets });
});

/**
 * POST /api/v1/workspaces/:workspaceId/support/tickets
 */
router.post('/tickets', async (req: Request, res: Response): Promise<void> => {
  const workspaceId = req.workspace!.workspaceId;
  const { subject, message, category, customerEmail } = req.body;

  if (!message || typeof message !== 'string' || !message.trim()) {
    res.status(400).json({
      success: false,
      error: { code: 'INVALID_MESSAGE', message: 'Support ticket message is required.' },
    });
    return;
  }

  const now = new Date().toISOString();
  const ticketId = `tkt_${Date.now()}_${crypto.randomBytes(3).toString('hex')}`;

  const ticket = await supportTicketRepository.createTicket({
    ticketId,
    workspaceId,
    userId: req.user?.uid,
    customerEmail: customerEmail || req.user?.email || 'user@workspace.local',
    subject: subject || (message.length > 50 ? `${message.slice(0, 50)}...` : message),
    message: message.trim(),
    category: category || 'QUESTION',
    status: 'OPEN',
    createdAt: now,
    updatedAt: now,
  });

  res.status(201).json({
    success: true,
    data: ticket,
  });
});

export const supportRoutes = router;
