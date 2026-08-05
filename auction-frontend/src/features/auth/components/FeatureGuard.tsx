'use client';

import * as React from 'react';

interface FeatureGuardProps {
  featureFlag: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

/**
 * FeatureGuard is responsible for verifying if a specific feature flag is enabled.
 * Currently, it always allows access per ADR v1.0 constraints, but remains in place
 * for future feature flag support.
 */
export function FeatureGuard({ featureFlag: _featureFlag, children, fallback = null }: FeatureGuardProps) {
  const isFeatureEnabled = true; 

  if (!isFeatureEnabled) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
