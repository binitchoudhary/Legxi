'use client';

import * as React from 'react';
import { PermissionGuard } from './PermissionGuard';
import { useAuthStore, UserRole } from '@/features/auth/store/authStore';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * RoleGuard specifically enforces role-based access control.
 * It wraps the generic PermissionGuard for explicit role validations.
 */
export function RoleGuard({ allowedRoles, children, fallback = null }: RoleGuardProps) {
  return (
    <PermissionGuard allowedRoles={allowedRoles} fallback={fallback}>
      {children}
    </PermissionGuard>
  );
}
