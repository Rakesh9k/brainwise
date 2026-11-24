/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import type { WorkspaceRole, StandardDepartmentType } from '../types/api';

export interface DepartmentPermissionRule {
  allowedRoles: WorkspaceRole[];
  canAccessSensitiveFinancials: boolean;
  canExecuteConsequentialActions: boolean;
  canApproveActions: boolean;
}

export class DepartmentPermissionService {
  private readonly rules: Record<StandardDepartmentType, DepartmentPermissionRule> = {
    STRATEGY: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: true,
      canExecuteConsequentialActions: true,
      canApproveActions: true,
    },
    FINANCE: {
      allowedRoles: ['owner', 'admin'],
      canAccessSensitiveFinancials: true,
      canExecuteConsequentialActions: true,
      canApproveActions: true,
    },
    MARKETING: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
    RESEARCH: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
    CREATIVE: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
    SALES: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
    ANALYTICS: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
    CUSTOMER_SUCCESS: {
      allowedRoles: ['owner', 'admin', 'member', 'viewer'],
      canAccessSensitiveFinancials: false,
      canExecuteConsequentialActions: false,
      canApproveActions: false,
    },
  };

  /**
   * Verifies if a user role can access the specified department
   */
  public canAccessDepartment(
    role: WorkspaceRole,
    department: StandardDepartmentType | string
  ): boolean {
    const deptUpper = department.toUpperCase() as StandardDepartmentType;
    const rule = this.rules[deptUpper];
    if (!rule) {
      // Default to allowing owner/admin/member for custom departments
      return ['owner', 'admin', 'member'].includes(role);
    }
    return rule.allowedRoles.includes(role);
  }

  /**
   * Checks if user has permission to view sensitive financial margins/unit costs
   */
  public canAccessFinancialMargins(
    role: WorkspaceRole,
    department: StandardDepartmentType | string
  ): boolean {
    if (role === 'viewer') return false;
    const deptUpper = department.toUpperCase() as StandardDepartmentType;
    if (deptUpper === 'FINANCE' || deptUpper === 'STRATEGY') {
      return role === 'owner' || role === 'admin';
    }
    return false;
  }

  /**
   * Checks if role can execute tasks in department
   */
  public canExecuteTask(
    role: WorkspaceRole,
    department: StandardDepartmentType | string,
    isConsequential: boolean
  ): boolean {
    if (role === 'viewer') return false;
    if (isConsequential && role !== 'owner' && role !== 'admin') {
      return false;
    }
    return this.canAccessDepartment(role, department);
  }

  /**
   * Checks if role can approve or reject recommendations and tasks
   */
  public canApprove(role: WorkspaceRole): boolean {
    return role === 'owner' || role === 'admin';
  }

  /**
   * Validates cross-tenant isolation
   */
  public assertTenantAccess(
    callerWorkspaceId: string | undefined,
    targetWorkspaceId: string
  ): void {
    if (!callerWorkspaceId || callerWorkspaceId !== targetWorkspaceId) {
      const err = new Error(
        `TENANT_ISOLATION_VIOLATION: Cross-tenant data access blocked. Caller (${callerWorkspaceId}) cannot access tenant (${targetWorkspaceId}).`
      );
      (err as any).statusCode = 403;
      throw err;
    }
  }
}

export const departmentPermissionService = new DepartmentPermissionService();
