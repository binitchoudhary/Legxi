import Image from 'next/image';
import { CameraOff } from 'lucide-react';
import { cn } from '@/utils/utils';

interface ImageResolverProps {
  src?: string | null;
  alt: string;
  fill?: boolean;
  width?: number;
  height?: number;
  className?: string;
  containerClassName?: string;
  priority?: boolean;
}

export function ImageResolver({
  src,
  alt,
  fill = true,
  width,
  height,
  className,
  containerClassName,
  priority = false,
}: ImageResolverProps) {
  // If no source is provided or source cannot be resolved, render Premium Branded Placeholder
  if (!src) {
    return (
      <div
        className={cn(
          'flex flex-col items-center justify-center bg-[#0a0a0a] text-primary border border-white/5 relative overflow-hidden',
          fill ? 'absolute inset-0 h-full w-full' : '',
          containerClassName
        )}
        style={!fill ? { width, height } : undefined}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-primary/10 via-transparent to-transparent opacity-50 mix-blend-overlay"></div>
        <div className="w-16 h-16 rounded-full border border-primary/30 bg-primary/5 flex items-center justify-center mb-3 shadow-[0_0_15px_rgba(212,175,55,0.15)] relative z-10">
          <span className="font-serif text-2xl font-bold tracking-tighter">L</span>
        </div>
        <span className="text-[10px] font-medium uppercase tracking-[0.2em] text-muted-foreground relative z-10">
          Asset Pending
        </span>
      </div>
    );
  }

  // Generate a solid gray placeholder for blur effect
  const blurDataURL =
    'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';

  return (
    <div
      className={cn(
        'relative overflow-hidden',
        fill ? 'h-full w-full absolute inset-0' : '',
        containerClassName
      )}
      style={!fill ? { width, height } : undefined}
    >
      <Image
        src={src}
        alt={alt}
        fill={fill}
        width={!fill ? width : undefined}
        height={!fill ? height : undefined}
        className={cn('object-cover transition-opacity duration-300', className)}
        placeholder="blur"
        blurDataURL={blurDataURL}
        priority={priority}
        loading={priority ? undefined : 'lazy'}
      />
    </div>
  );
}
