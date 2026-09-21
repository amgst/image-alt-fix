import React, { useState } from 'react';
import { AlertTriangle, Info, ArrowUpRight } from 'lucide-react';
import type { ImageQualityAssessmentResult } from '../types';

interface ResolutionWarningBadgeProps {
  assessment?: ImageQualityAssessmentResult;
  reasons?: string[];
  size?: 'sm' | 'md' | 'lg';
  showDetailsOnHover?: boolean;
  showDetails?: boolean;
  compact?: boolean;
  onClick?: () => void;
  className?: string;
}

export const ResolutionWarningBadge: React.FC<ResolutionWarningBadgeProps> = ({
  assessment,
  reasons,
  size = 'md',
  showDetailsOnHover = true,
  showDetails,
  compact = false,
  onClick,
  className = '',
}) => {
  const [isTooltipOpen, setIsTooltipOpen] = useState(false);
  const allowTooltip = showDetails !== undefined ? showDetails : showDetailsOnHover;

  const displayReasons = reasons || assessment?.warningReasons || [
    'Image fails resolution or aspect ratio requirements.',
  ];

  const isLowRes = assessment?.isLowResolution ?? false;
  const failsRatio = assessment?.failsAspectRatio ?? false;

  // Choose tag label based on reasons if helpful, or strict 'Resolution Warning' as requested
  const label = 'Resolution Warning';

  return (
    <div
      className={`relative inline-flex items-center ${className}`}
      onMouseEnter={() => allowTooltip && setIsTooltipOpen(true)}
      onMouseLeave={() => allowTooltip && setIsTooltipOpen(false)}
    >
      <button
        type="button"
        onClick={(e) => {
          if (onClick) {
            e.stopPropagation();
            onClick();
          } else {
            setIsTooltipOpen((prev) => !prev);
          }
        }}
        className={`inline-flex items-center gap-1.5 font-bold rounded-md transition duration-150 border shadow-2xs ${
          compact
            ? 'p-1 text-[10px]'
            : size === 'sm'
            ? 'px-2 py-0.5 text-[10px]'
            : size === 'lg'
            ? 'px-3 py-1.5 text-xs'
            : 'px-2.5 py-1 text-xs'
        } ${
          isLowRes && failsRatio
            ? 'bg-[#fef2f2] text-[#b91c1c] border-[#fca5a5] hover:bg-[#fee2e2]'
            : isLowRes
            ? 'bg-[#fff1f2] text-[#be123c] border-[#fecdd3] hover:bg-[#ffe4e6]'
            : 'bg-[#fffbeb] text-[#b45309] border-[#fde68a] hover:bg-[#fef3c7]'
        } ${onClick ? 'cursor-pointer' : 'cursor-help'}`}
        title={displayReasons.join(' ')}
      >
        <AlertTriangle
          className={`shrink-0 ${
            size === 'sm' || compact ? 'w-3 h-3' : 'w-3.5 h-3.5'
          } ${
            isLowRes ? 'text-[#e11d48]' : 'text-[#d97706]'
          }`}
        />
        {!compact && <span>{label}</span>}
        {!compact && failsRatio && !isLowRes && size !== 'sm' && (
          <span className="text-[10px] opacity-85 font-normal ml-0.5">
            (Aspect Ratio)
          </span>
        )}
        {!compact && isLowRes && !failsRatio && size !== 'sm' && (
          <span className="text-[10px] opacity-85 font-normal ml-0.5">
            (Low-Res)
          </span>
        )}
        {onClick && !compact && <ArrowUpRight className="w-3 h-3 opacity-60 ml-0.5" />}
      </button>

      {/* Popover / Tooltip with specific diagnosis */}
      {isTooltipOpen && (
        <div className="absolute z-50 bottom-full left-0 mb-2 w-72 sm:w-80 bg-[#202223] text-white text-xs rounded-xl p-3.5 shadow-xl border border-[#323538] animate-fadeIn pointer-events-none">
          <div className="flex items-center gap-2 text-[#fbbf24] font-bold pb-2 border-b border-[#3b3d40]">
            <AlertTriangle className="w-4 h-4 text-[#fbbf24] shrink-0" />
            <span>Resolution & Aspect Ratio Warning</span>
          </div>

          <div className="space-y-2 mt-2 text-[#e4e5e7]">
            {displayReasons.map((reason, idx) => (
              <div key={idx} className="flex items-start gap-1.5 text-[11px] leading-relaxed">
                <span className="text-[#fbbf24] font-bold mt-0.5">•</span>
                <span>{reason}</span>
              </div>
            ))}
          </div>

          {assessment && (
            <div className="mt-3 pt-2 border-t border-[#3b3d40] grid grid-cols-2 gap-2 text-[10px] text-[#9ca3af]">
              <div>
                <span>Dimensions:</span>{' '}
                <span className="text-white font-mono font-medium">
                  {assessment.width} × {assessment.height}
                </span>
              </div>
              <div>
                <span>Aspect Ratio:</span>{' '}
                <span className="text-white font-medium">
                  {assessment.aspectRatioLabel}
                </span>
              </div>
            </div>
          )}

          {onClick && (
            <p className="mt-2 text-[10px] text-[#38bdf8] font-medium">
              Click to open Image Quality Assessment Tool →
            </p>
          )}

          {/* Tiny arrow pointing down */}
          <div className="absolute top-full left-6 -mt-1 border-4 border-transparent border-t-[#202223]" />
        </div>
      )}
    </div>
  );
};
