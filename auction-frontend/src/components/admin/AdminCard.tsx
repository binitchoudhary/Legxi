import * as React from 'react';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { cn } from '@/utils/utils';

interface AdminCardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
  headerAction?: React.ReactNode;
  footer?: React.ReactNode;
  noPadding?: boolean;
}

export function AdminCard({
  title,
  description,
  headerAction,
  footer,
  noPadding = false,
  children,
  className,
  ...props
}: AdminCardProps) {
  return (
    <Card className={cn('overflow-hidden', className)} {...props}>
      {(title || description || headerAction) && (
        <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4 border-b">
          <div className="space-y-1">
            {title && <CardTitle className="text-base font-semibold">{title}</CardTitle>}
            {description && <CardDescription>{description}</CardDescription>}
          </div>
          {headerAction && <div>{headerAction}</div>}
        </CardHeader>
      )}
      <CardContent className={cn('pt-6', noPadding && 'p-0')}>{children}</CardContent>
      {footer && <CardFooter className="border-t bg-muted/20 px-6 py-4">{footer}</CardFooter>}
    </Card>
  );
}
