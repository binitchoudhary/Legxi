'use client';

import { useState } from 'react';
import { cn } from '@/utils/utils';
import { ImageResolver } from './ImageResolver';
import { Maximize2 } from 'lucide-react';
import { Dialog, DialogContent, DialogTrigger } from '@/components/ui/dialog';

interface GalleryProps {
  images?: string[];
  altTitle?: string;
}

export function Gallery({ images = [], altTitle = 'Product Image' }: GalleryProps) {
  const [activeIndex, setActiveIndex] = useState(0);

  // If no images exist, fallback to ImageResolver empty state
  if (!images || images.length === 0) {
    return (
      <div className="aspect-square w-full rounded-lg overflow-hidden border border-border bg-card">
        <ImageResolver src={null} alt="No image" />
      </div>
    );
  }

  const activeImage = images[activeIndex];

  return (
    <div className="flex flex-col gap-4">
      {/* Main Image Viewer */}
      <Dialog>
        <DialogTrigger asChild>
          <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-border bg-card cursor-zoom-in group">
            <ImageResolver src={activeImage} alt={altTitle} className="group-hover:scale-105 transition-transform duration-500" />
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors duration-300 flex items-center justify-center">
              <div className="bg-background/80 backdrop-blur-sm p-3 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 transform scale-95 group-hover:scale-100">
                <Maximize2 className="w-5 h-5 text-foreground" />
              </div>
            </div>
          </div>
        </DialogTrigger>
        <DialogContent className="max-w-screen-lg w-full h-[90vh] p-1 bg-black/95 border-none">
          <div className="relative w-full h-full flex items-center justify-center">
            <ImageResolver src={activeImage} alt={altTitle} fill={true} className="object-contain" />
          </div>
        </DialogContent>
      </Dialog>

      {/* Thumbnail Strip */}
      {images.length > 1 && (
        <div className="grid grid-cols-4 gap-4">
          {images.map((img, idx) => (
            <button
              key={idx}
              onClick={() => setActiveIndex(idx)}
              className={cn(
                "relative aspect-square rounded-md overflow-hidden border-2 transition-all",
                activeIndex === idx ? "border-primary" : "border-transparent hover:border-primary/50 opacity-70 hover:opacity-100"
              )}
            >
              <ImageResolver src={img} alt={`${altTitle} thumbnail ${idx + 1}`} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
