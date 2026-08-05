import { cn } from '@/utils/utils';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

interface SectionHeaderProps {
  title: string;
  subtitle?: string;
  actionHref?: string;
  actionLabel?: string;
  className?: string;
}

export function SectionHeader({ title, subtitle, actionHref, actionLabel = "View All", className }: SectionHeaderProps) {
  return (
    <div className={cn("flex flex-col md:flex-row md:items-end justify-between gap-4 mb-8", className)}>
      <div className="space-y-1">
        <h2 className="text-3xl font-bold tracking-tight">{title}</h2>
        {subtitle && <p className="text-muted-foreground">{subtitle}</p>}
      </div>
      {actionHref && (
        <Link 
          href={actionHref}
          className="inline-flex items-center text-sm font-medium text-primary hover:text-primary/80 transition-colors group"
        >
          {actionLabel}
          <ArrowRight className="ml-1 w-4 h-4 transition-transform group-hover:translate-x-1" />
        </Link>
      )}
    </div>
  );
}
