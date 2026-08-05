'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';

interface ProfileCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  action?: React.ReactNode;
}

export function ProfileCard({ title, description, action, children, className, ...props }: ProfileCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      {(title || description || action) && (
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b">
          <div className="space-y-1">
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {action && <div>{action}</div>}
        </CardHeader>
      )}
      <CardContent className="pt-6">{children}</CardContent>
    </Card>
  );
}
