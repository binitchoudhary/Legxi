import React from 'react';
import type { GalleryProps } from '../../engine/contracts';

export function CarouselGallery({ media, themeContext }: GalleryProps) {
  if (!media || media.length === 0) {
    return <div className="p-8 text-neutral-500">No media available.</div>;
  }
  
  // Simple full bleed image for the carousel
  return (
    <div className="w-full h-full relative group bg-neutral-900">
      <img
        src={media[0].url}
        alt="Product"
        className="w-full h-full object-cover"
      />
      
      {/* Fake UI for Carousel */}
      {media.length > 1 && (
        <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-2">
          {media.map((_, idx) => (
            <div 
              key={idx} 
              className={`w-2 h-2 rounded-full ${idx === 0 ? 'bg-white' : 'bg-white/30'}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
