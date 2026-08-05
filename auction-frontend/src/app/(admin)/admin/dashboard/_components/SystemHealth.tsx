'use client';

import * as React from 'react';
import { useQuery } from '@tanstack/react-query';
import { AdminCard } from '@/components/admin/AdminCard';
import { StatusBadge } from '@/components/admin/StatusBadge';
import { AlertCircle, CheckCircle2, Server, Database, Activity } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { customAxiosInstance } from '@/api/client/axios';

interface HealthData {
  status: string;
  version: string;
  timestamp: string;
  dependencies: {
    database: string;
    redis: string;
  };
}

const fetchHealth = async (): Promise<HealthData> => {
  const data = await customAxiosInstance<HealthData>({ url: '/health', method: 'GET' });
  return data;
};

export function SystemHealth() {
  const { data, isLoading, isError } = useQuery({
    queryKey: ['admin-system-health'],
    queryFn: fetchHealth,
    retry: false,
  });

  return (
    <AdminCard title="System Health" description="Live status of backend services">
      <div className="space-y-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <div key={i} className="flex justify-between items-center py-2 border-b last:border-0">
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-6 w-20 rounded-full" />
            </div>
          ))
        ) : isError || !data ? (
          <div className="flex justify-between items-center py-2 border-b text-sm">
            <span className="font-medium text-muted-foreground">Application</span>
            <StatusBadge status="Unavailable" variant="destructive" />
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="font-medium text-foreground">Application API</span>
              <div className="flex items-center gap-3">
                <span className="text-xs text-muted-foreground font-mono">v{data.version}</span>
                <StatusBadge status={data.status} variant={data.status === 'ok' ? 'success' : 'warning'} />
              </div>
            </div>
            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="font-medium text-foreground">Database</span>
              <StatusBadge 
                status={data.dependencies?.database || 'Unavailable'} 
                variant={data.dependencies?.database === 'ok' ? 'success' : 'destructive'} 
              />
            </div>
            <div className="flex justify-between items-center py-2 border-b text-sm">
              <span className="font-medium text-foreground">Redis Cache</span>
              <StatusBadge 
                status={data.dependencies?.redis || 'Unavailable'} 
                variant={data.dependencies?.redis === 'ok' ? 'success' : 'destructive'} 
              />
            </div>
            <div className="flex justify-between items-center py-2 text-sm">
              <span className="font-medium text-foreground">Transfer Service</span>
              <StatusBadge status="Unavailable" variant="secondary" />
            </div>
          </>
        )}
      </div>
    </AdminCard>
  );
}
