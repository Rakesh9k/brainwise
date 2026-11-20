/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { Request, Response, NextFunction } from 'express';
import { subscriptionEngine } from './subscriptionEngine';
import { getPlan } from './pricingConfig';
import type { EntitlementCheckResult, PlanFeatureLimits } from './types';

export class EntitlementEngine {
  public async checkEntitlement(
    workspaceId: string,
    featureKey: keyof PlanFeatureLimits | string,
    currentUsage = 0
  ): Promise<EntitlementCheckResult> {
    const subscription = await subscriptionEngine.getSubscription(workspaceId);

    // If subscription is expired or cancelled, fall back to free plan limits
    const planId =
      subscription.status === 'active' || subscription.status === 'cancellation_scheduled'
        ? subscription.planId
        : 'free';

    const plan = getPlan(planId);

    // 1. Check Department Access
    if (plan.departmentAccess.includes(featureKey)) {
      return {
        allowed: true,
        limit: 'unlimited',
      };
    }

    // 2. Check boolean features
    if (featureKey in plan.limits) {
      const limitVal = plan.limits[featureKey as keyof PlanFeatureLimits];

      if (typeof limitVal === 'boolean') {
        if (limitVal) {
          return { allowed: true };
        }
        return {
          allowed: false,
          reason: `Feature '${featureKey}' is not included in the ${plan.name} plan. Upgrade required.`,
          upgradeRequired: true,
          recommendedPlan: 'professional',
        };
      }

      // 3. Check numerical/unlimited limits
      if (limitVal === 'unlimited' || limitVal === 'all') {
        return {
          allowed: true,
          limit: 'unlimited',
          currentUsage,
        };
      }

      if (typeof limitVal === 'number') {
        if (currentUsage < limitVal) {
          return {
            allowed: true,
            limit: limitVal,
            currentUsage,
          };
        }
        return {
          allowed: false,
          reason: `Plan limit reached for '${featureKey}'. Current: ${currentUsage}, Limit: ${limitVal} in ${plan.name} plan.`,
          limit: limitVal,
          currentUsage,
          upgradeRequired: true,
          recommendedPlan: planId === 'starter' ? 'professional' : 'business',
        };
      }
    }

    // Default allow for unrecognized non-restricted keys
    return {
      allowed: true,
    };
  }

  public createMiddleware(featureKey: keyof PlanFeatureLimits | string) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const workspaceId =
          req.params.workspaceId ||
          (req.body && req.body.workspaceId) ||
          (req.query && (req.query.workspaceId as string));

        if (!workspaceId) {
          res.status(400).json({
            status: 'error',
            error: {
              code: 'MISSING_WORKSPACE_ID',
              message: 'Workspace ID required for entitlement check',
            },
          });
          return;
        }

        const result = await this.checkEntitlement(workspaceId, featureKey);
        if (!result.allowed) {
          res.status(403).json({
            status: 'error',
            error: {
              code: 'ENTITLEMENT_RESTRICTED',
              message: result.reason,
              details: {
                featureKey,
                upgradeRequired: result.upgradeRequired,
                recommendedPlan: result.recommendedPlan,
              },
            },
          });
          return;
        }

        next();
      } catch (err: unknown) {
        next(err);
      }
    };
  }
}

export const entitlementEngine = new EntitlementEngine();
