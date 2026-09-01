import React from 'react';
import LogoEmblem from '../LogoEmblem';

/**
 * BrandWatermark Component
 * Renders a high-end corporate watermark overlay on property images, project previews, and lightboxes.
 */
export default function BrandWatermark({
  size = 'md', // 'sm' | 'md' | 'lg'
  position = 'bottom-right', // 'bottom-right' | 'bottom-left' | 'top-right' | 'center' | 'bottom-center'
  variant = 'badge' // 'badge' | 'subtle' | 'emblem-only'
}) {
  const emblemSizes = {
    sm: 16,
    md: 20,
    lg: 28
  };

  return (
    <div className={`brand-watermark-overlay watermark-${size} watermark-${position} watermark-${variant}`}>
      <div className="watermark-content">
        <LogoEmblem size={emblemSizes[size] || 20} />
        {variant !== 'emblem-only' && (
          <div className="watermark-text-group">
            <span className="watermark-brand-name">ONE LINE</span>
            {size === 'lg' && (
              <span className="watermark-brand-sub">REAL ESTATE</span>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
