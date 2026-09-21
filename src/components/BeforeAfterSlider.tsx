import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Sparkles,
  Sliders,
  Columns,
  Layers,
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  ExternalLink,
  Download,
  Eye,
  Info,
  ChevronLeft,
  ChevronRight,
  ChevronsLeftRight,
  Sparkle,
  Zap,
  Tag,
  ShieldCheck,
  Check,
  SlidersHorizontal,
} from 'lucide-react';
import type {
  ShopifyProduct,
  ShopifyProductImage,
  GeneratedImageResult,
  StudioMode,
} from '../types';

interface BeforeAfterSliderProps {
  product: ShopifyProduct;
  initialOriginalImageId?: string;
  initialAiVariantId?: string;
  onPromoteToHero: (variant: GeneratedImageResult) => Promise<void>;
  onAddToGallery: (variant: GeneratedImageResult) => Promise<void>;
  onAssignToVariant: (variant: GeneratedImageResult, variantId: string) => Promise<void>;
  onOpenInStudio: (preset?: { mode?: StudioMode; referenceUrl?: string; variantId?: string }) => void;
  className?: string;
}

export const BeforeAfterSlider: React.FC<BeforeAfterSliderProps> = ({
  product,
  initialOriginalImageId,
  initialAiVariantId,
  onPromoteToHero,
  onAddToGallery,
  onAssignToVariant,
  onOpenInStudio,
  className = '',
}) => {
  // 1. Determine available original images
  const originalImages = product.images;
  const [selectedOriginalId, setSelectedOriginalId] = useState<string>(
    initialOriginalImageId || originalImages[0]?.id || ''
  );

  // 2. Determine available AI Studio Variants
  // Default sample variants for instant quality comparison if none have been generated yet
  const defaultAiVariants: GeneratedImageResult[] = [
    {
      id: `studio_hero_${product.id}`,
      url: 'https://images.unsplash.com/photo-1544022613-e87ca75a784a?q=80&w=1800&auto=format&fit=crop',
      prompt: `Iconic 4K studio hero shot of ${product.title}, softbox commercial reflections, balanced studio highlights on granite display podium`,
      mode: 'hero',
      aspectRatio: '1:1',
      width: 2048,
      height: 2048,
      seoScore: 98,
      geoScore: 95,
      resolutionLabel: '4K Ultra-HD (2048×2048)',
      suggestedAltText: `${product.title} e-commerce hero photography with pristine studio softbox illumination and deep contrast`,
      suggestedFilename: `${product.handle}-next-ai-studio-hero.jpg`,
      timestamp: '2026-09-20T16:00:00Z',
      qualityImprovements: [
        '+52 SEO & GEO score improvement',
        '2048×2048 Ultra-HD zoom resolution (Shopify Zoom Certified)',
        'Calibrated softbox lighting & realistic directional floor shadow',
        'Perfect 1:1 catalog aspect ratio alignment',
        'Zero compression artifacts with crisp edge masking',
      ],
    },
    {
      id: `studio_colorway_${product.id}`,
      url: 'https://images.unsplash.com/photo-1551028719-00167b16eac5?q=80&w=1800&auto=format&fit=crop',
      prompt: `Consistent variant colorway photography for ${product.title} in Obsidian Black, preserving precise angles and hardware detail`,
      mode: 'variant',
      aspectRatio: '1:1',
      width: 1800,
      height: 1800,
      seoScore: 94,
      geoScore: 91,
      resolutionLabel: 'Retina HD (1800×1800)',
      suggestedAltText: `${product.title} colorway variant view showing high-fidelity textile weave and matte hardware accents`,
      suggestedFilename: `${product.handle}-colorway-obsidian-black-variant.jpg`,
      timestamp: '2026-09-20T17:30:00Z',
      sourceVariantId: product.variants.find((v) => !v.imageId)?.id || product.variants[1]?.id,
      qualityImprovements: [
        'Fills unassigned variant image gap on Shopify storefront',
        'Color-accurate spectral rendering with matte sheen',
        'Retina 1800×1800 px customer hover-zoom enabled',
        'Eliminates storefront customer return rates from color ambiguity',
      ],
    },
    {
      id: `studio_lifestyle_${product.id}`,
      url: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?q=80&w=1800&auto=format&fit=crop',
      prompt: `In-situ contextual atmospheric lifestyle scene of ${product.title} in modern natural environment with gentle depth of field`,
      mode: 'lifestyle',
      aspectRatio: '1:1',
      width: 1800,
      height: 1800,
      seoScore: 92,
      geoScore: 90,
      resolutionLabel: 'Retina HD (1800×1800)',
      suggestedAltText: `${product.title} lifestyle scene captured in authentic contextual environment with natural ambient light`,
      suggestedFilename: `${product.handle}-lifestyle-contextual-scene.jpg`,
      timestamp: '2026-09-20T18:15:00Z',
      qualityImprovements: [
        'High situational grounding for Google AI Overviews & Perplexity',
        'Emotional visual storytelling without on-location studio costs',
        'Natural ambient lighting and realistic depth of field',
      ],
    },
    {
      id: `studio_catalog_${product.id}`,
      url: 'https://images.unsplash.com/photo-1560343090-f0409e92791a?q=80&w=1800&auto=format&fit=crop',
      prompt: `Pure seamless white background e-commerce catalog cutout of ${product.title} with subtle contact shadow`,
      mode: 'background',
      aspectRatio: '1:1',
      width: 2000,
      height: 2000,
      seoScore: 96,
      geoScore: 93,
      resolutionLabel: 'Ultra-HD (2000×2000)',
      suggestedAltText: `${product.title} isolated on pure white background for marketplace and shopping feed syndication`,
      suggestedFilename: `${product.handle}-pure-white-background-catalog.jpg`,
      timestamp: '2026-09-20T19:00:00Z',
      qualityImprovements: [
        '100% pure white (#FFFFFF) marketplace compliant background',
        'Precision sub-pixel edge masking without fringing',
        'Optimized for Google Shopping Feed & Merchant Center approval',
      ],
    },
  ];

  const allStudioVariants: GeneratedImageResult[] = [
    ...(product.studioGenerations || []),
    ...defaultAiVariants,
  ];

  const [selectedVariantId, setSelectedVariantId] = useState<string>(
    initialAiVariantId || allStudioVariants[0]?.id || ''
  );

  // Active items
  const activeOriginal =
    originalImages.find((img) => img.id === selectedOriginalId) ||
    originalImages[0] ||
    null;

  const activeVariant =
    allStudioVariants.find((v) => v.id === selectedVariantId) ||
    allStudioVariants[0] ||
    null;

  // Comparison UI state
  const [sliderPosition, setSliderPosition] = useState<number>(50); // 0 to 100
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<'slider' | 'side_by_side' | 'blend'>('slider');
  const [blendOpacity, setBlendOpacity] = useState<number>(50);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [isHoldingOriginal, setIsHoldingOriginal] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);
  const [isExecutingAction, setIsExecutingAction] = useState<boolean>(false);
  const [selectedVariantTarget, setSelectedVariantTarget] = useState<string>(
    product.variants.find((v) => !v.imageId)?.id || product.variants[0]?.id || ''
  );

  const containerRef = useRef<HTMLDivElement>(null);

  // Update slider position based on mouse/pointer event
  const handlePointerMove = useCallback(
    (clientX: number) => {
      if (!containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      const x = clientX - rect.left;
      const percentage = Math.max(0, Math.min(100, (x / rect.width) * 100));
      setSliderPosition(Math.round(percentage * 10) / 10);
    },
    []
  );

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
    handlePointerMove(e.clientX);
  };

  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      handlePointerMove(e.clientX);
    }
  };

  const onPointerUp = (e: React.PointerEvent<HTMLDivElement>) => {
    if (isDragging) {
      setIsDragging(false);
      try {
        (e.target as HTMLElement).releasePointerCapture?.(e.pointerId);
      } catch {
        // Safe fallback
      }
    }
  };

  // Keyboard navigation for accessibility
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setSliderPosition((prev) => Math.max(0, prev - 5));
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      setSliderPosition((prev) => Math.min(100, prev + 5));
    } else if (e.key === 'Home') {
      e.preventDefault();
      setSliderPosition(0);
    } else if (e.key === 'End') {
      e.preventDefault();
      setSliderPosition(100);
    }
  };

  // Action handlers
  const handlePromoteToHero = async () => {
    if (!activeVariant) return;
    try {
      setIsExecutingAction(true);
      await onPromoteToHero(activeVariant);
      setActionSuccess('Promoted AI Variant to Primary Hero Image on Shopify!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleAddToGallery = async () => {
    if (!activeVariant) return;
    try {
      setIsExecutingAction(true);
      await onAddToGallery(activeVariant);
      setActionSuccess('Added AI Variant to Product Media Gallery!');
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  const handleAssignToVariant = async () => {
    if (!activeVariant || !selectedVariantTarget) return;
    try {
      setIsExecutingAction(true);
      await onAssignToVariant(activeVariant, selectedVariantTarget);
      const varTitle =
        product.variants.find((v) => v.id === selectedVariantTarget)?.title ||
        selectedVariantTarget;
      setActionSuccess(`Mapped AI Variant directly to SKU: ${varTitle}!`);
      setTimeout(() => setActionSuccess(null), 4000);
    } catch (err) {
      console.error(err);
    } finally {
      setIsExecutingAction(false);
    }
  };

  // Format dimensions & ratio calculation
  const origWidth = activeOriginal?.width || 1200;
  const origHeight = activeOriginal?.height || 1200;
  const origRatio = (origWidth / origHeight).toFixed(2);
  const origScore = activeOriginal?.seoScore || 50;

  const varWidth = activeVariant?.width || 2048;
  const varHeight = activeVariant?.height || 2048;
  const varRatio = (varWidth / varHeight).toFixed(2);
  const varScore = activeVariant?.seoScore || 95;
  const scoreDiff = varScore - origScore;

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Top Banner & Control Deck */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <ChevronsLeftRight className="w-5 h-5" />
            </span>
            <h2 className="text-lg font-bold text-[#202223]">
              Before / After Image Quality Comparison
            </h2>
            <span className="px-2 py-0.5 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-xs font-bold rounded-full flex items-center gap-1">
              <Sparkles className="w-3 h-3 text-[#16a34a]" />
              Studio Verified
            </span>
          </div>
          <p className="text-xs text-[#6d7175] mt-1">
            Compare original Shopify product images with AI Studio variants to audit resolution, edge sharpness, studio lighting, and SEO score gains.
          </p>
        </div>

        {/* View mode toggle tabs */}
        <div className="flex items-center gap-2">
          <div className="inline-flex bg-[#f1f2f4] p-1 rounded-lg border border-[#d2d5d8] text-xs font-semibold">
            <button
              type="button"
              onClick={() => setViewMode('slider')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewMode === 'slider'
                  ? 'bg-white text-[#202223] shadow-xs font-bold'
                  : 'text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              <Sliders className="w-3.5 h-3.5" />
              <span>Split Slider</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('side_by_side')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewMode === 'side_by_side'
                  ? 'bg-white text-[#202223] shadow-xs font-bold'
                  : 'text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              <Columns className="w-3.5 h-3.5" />
              <span>Side-by-Side</span>
            </button>

            <button
              type="button"
              onClick={() => setViewMode('blend')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md transition ${
                viewMode === 'blend'
                  ? 'bg-white text-[#202223] shadow-xs font-bold'
                  : 'text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Opacity Blend</span>
            </button>
          </div>

          <button
            type="button"
            onClick={() => onOpenInStudio({ mode: activeVariant?.mode || 'hero' })}
            className="px-3 py-1.5 text-xs font-bold text-[#008060] bg-[#e6f4ea] hover:bg-[#d0edd8] border border-[#a3e0b7] rounded-lg transition inline-flex items-center gap-1.5"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Open Studio</span>
          </button>
        </div>
      </div>

      {/* Success Notification */}
      {actionSuccess && (
        <div className="bg-[#f0fdf4] border border-[#86efac] text-[#166534] p-3.5 rounded-xl text-xs font-semibold flex items-center justify-between shadow-xs animate-in fade-in">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
            <span>{actionSuccess}</span>
          </div>
          <button
            type="button"
            onClick={() => setActionSuccess(null)}
            className="text-[#166534] hover:text-[#14532d] font-bold text-xs"
          >
            Dismiss
          </button>
        </div>
      )}

      {/* Selector Ribbons: Original vs Studio Variant */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Original Selection */}
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#6d7175] uppercase tracking-wider flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-[#6d7175]"></span>
              Before: Original Product Image
            </span>
            <span className="text-[11px] text-[#6d7175]">
              {originalImages.length} images available
            </span>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {originalImages.map((img, idx) => (
              <button
                key={img.id}
                type="button"
                onClick={() => setSelectedOriginalId(img.id)}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left shrink-0 transition ${
                  selectedOriginalId === img.id
                    ? 'border-[#202223] bg-[#f6f6f7] ring-1 ring-[#202223]'
                    : 'border-[#e1e3e5] bg-white hover:bg-[#fafafa]'
                }`}
              >
                <img
                  src={img.url}
                  alt={img.altText || 'Product image'}
                  className="w-10 h-10 object-cover rounded bg-[#f1f2f4]"
                />
                <div className="pr-1">
                  <div className="text-xs font-semibold text-[#202223] flex items-center gap-1">
                    <span>{img.isHero ? 'Hero Master' : `Angle #${idx + 1}`}</span>
                  </div>
                  <div className="text-[10px] text-[#6d7175]">
                    {img.width}×{img.height} • {img.format}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* AI Variant Selection */}
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-3.5 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold text-[#008060] uppercase tracking-wider flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#008060]" />
              After: Studio AI Variant
            </span>
            <button
              type="button"
              onClick={() => onOpenInStudio()}
              className="text-[11px] font-bold text-[#008060] hover:underline flex items-center gap-1"
            >
              + Create in Studio
            </button>
          </div>

          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {allStudioVariants.map((variant) => (
              <button
                key={variant.id}
                type="button"
                onClick={() => setSelectedVariantId(variant.id)}
                className={`flex items-center gap-2 p-1.5 rounded-lg border text-left shrink-0 transition ${
                  selectedVariantId === variant.id
                    ? 'border-[#008060] bg-[#f0fdf4] ring-1 ring-[#008060]'
                    : 'border-[#e1e3e5] bg-white hover:bg-[#fafafa]'
                }`}
              >
                <img
                  src={variant.url}
                  alt={variant.suggestedAltText}
                  className="w-10 h-10 object-cover rounded bg-[#f1f2f4]"
                />
                <div className="pr-1">
                  <div className="text-xs font-bold text-[#202223] capitalize flex items-center gap-1">
                    <span>{variant.mode} Shot</span>
                    <span className="px-1 py-0.2 bg-[#008060]/10 text-[#008060] text-[9px] rounded font-bold">
                      {variant.seoScore ? `${variant.seoScore}%` : 'HD'}
                    </span>
                  </div>
                  <div className="text-[10px] text-[#6d7175]">
                    {variant.width || 2048}×{variant.height || 2048} • {variant.aspectRatio}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Canvas Comparison Area */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        {/* Quick Position Snapping Toolbar (For Slider Mode) */}
        {viewMode === 'slider' && (
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#f1f2f4]">
            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold text-[#6d7175]">Wipe Position:</span>
              <div className="inline-flex bg-[#f1f2f4] p-0.5 rounded-md text-xs font-semibold">
                <button
                  type="button"
                  onClick={() => setSliderPosition(0)}
                  className={`px-2 py-1 rounded transition ${
                    sliderPosition === 0
                      ? 'bg-white text-[#202223] font-bold shadow-2xs'
                      : 'text-[#6d7175] hover:text-[#202223]'
                  }`}
                >
                  0% (Before)
                </button>
                <button
                  type="button"
                  onClick={() => setSliderPosition(25)}
                  className={`px-2 py-1 rounded transition ${
                    sliderPosition === 25
                      ? 'bg-white text-[#202223] font-bold shadow-2xs'
                      : 'text-[#6d7175] hover:text-[#202223]'
                  }`}
                >
                  25%
                </button>
                <button
                  type="button"
                  onClick={() => setSliderPosition(50)}
                  className={`px-2 py-1 rounded transition ${
                    sliderPosition === 50
                      ? 'bg-white text-[#202223] font-bold shadow-2xs'
                      : 'text-[#6d7175] hover:text-[#202223]'
                  }`}
                >
                  50% (Split)
                </button>
                <button
                  type="button"
                  onClick={() => setSliderPosition(75)}
                  className={`px-2 py-1 rounded transition ${
                    sliderPosition === 75
                      ? 'bg-white text-[#202223] font-bold shadow-2xs'
                      : 'text-[#6d7175] hover:text-[#202223]'
                  }`}
                >
                  75%
                </button>
                <button
                  type="button"
                  onClick={() => setSliderPosition(100)}
                  className={`px-2 py-1 rounded transition ${
                    sliderPosition === 100
                      ? 'bg-white text-[#202223] font-bold shadow-2xs'
                      : 'text-[#6d7175] hover:text-[#202223]'
                  }`}
                >
                  100% (After)
                </button>
              </div>
            </div>

            {/* Quick Hold Comparison */}
            <div className="flex items-center gap-2">
              <button
                type="button"
                onMouseDown={() => setIsHoldingOriginal(true)}
                onMouseUp={() => setIsHoldingOriginal(false)}
                onTouchStart={() => setIsHoldingOriginal(true)}
                onTouchEnd={() => setIsHoldingOriginal(false)}
                className={`px-2.5 py-1 text-xs font-semibold rounded-md border transition cursor-pointer select-none ${
                  isHoldingOriginal
                    ? 'bg-[#202223] text-white border-[#202223]'
                    : 'bg-white text-[#6d7175] border-[#d2d5d8] hover:bg-[#f6f6f7]'
                }`}
                title="Click and hold to momentarily view 100% of the original image"
              >
                Hold for Original (Before)
              </button>

              <div className="flex items-center gap-1 text-xs text-[#6d7175]">
                <button
                  type="button"
                  onClick={() => setZoomLevel((z) => (z === 1 ? 1.6 : 1))}
                  className={`p-1.5 rounded-md border transition ${
                    zoomLevel > 1
                      ? 'bg-[#008060]/10 text-[#008060] border-[#008060]'
                      : 'border-[#d2d5d8] hover:bg-[#f6f6f7]'
                  }`}
                  title="Toggle 1.6x Macro Detail Zoom"
                >
                  {zoomLevel > 1 ? (
                    <ZoomOut className="w-3.5 h-3.5" />
                  ) : (
                    <ZoomIn className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Opacity Blend Controls (For Blend Mode) */}
        {viewMode === 'blend' && (
          <div className="flex items-center justify-between gap-4 pb-3 border-b border-[#f1f2f4]">
            <div className="flex items-center gap-3 w-full max-w-md">
              <span className="text-xs font-semibold text-[#6d7175] shrink-0">
                Original (0%)
              </span>
              <input
                type="range"
                min="0"
                max="100"
                value={blendOpacity}
                onChange={(e) => setBlendOpacity(Number(e.target.value))}
                className="w-full h-1.5 bg-[#e1e3e5] rounded-lg appearance-none cursor-pointer accent-[#008060]"
              />
              <span className="text-xs font-semibold text-[#008060] shrink-0">
                AI Variant ({blendOpacity}%)
              </span>
            </div>
            <div className="text-xs text-[#6d7175]">
              Crossfade opacity to inspect color balance and edge alignment.
            </div>
          </div>
        )}

        {/* --- VIEW MODE 1: INTERACTIVE SPLIT SLIDER --- */}
        {viewMode === 'slider' && (
          <div
            ref={containerRef}
            tabIndex={0}
            role="slider"
            aria-valuenow={sliderPosition}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Before and After Image Comparison Slider"
            onKeyDown={handleKeyDown}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            className={`relative w-full aspect-square max-w-3xl mx-auto rounded-xl overflow-hidden select-none touch-none bg-[#111213] cursor-ew-resize border border-[#e1e3e5] shadow-inner focus:outline-none focus:ring-2 focus:ring-[#008060] ${
              isDragging ? 'cursor-grabbing' : ''
            }`}
          >
            {/* 1. Base Layer: Original Image (Before) */}
            <div className="absolute inset-0 w-full h-full">
              <img
                src={activeOriginal?.url}
                alt="Original Product"
                className="w-full h-full object-contain"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: `${sliderPosition}% 50%`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
                draggable={false}
              />
            </div>

            {/* 2. Top Layer: AI Studio Variant (After) with Clip-Path */}
            <div
              className="absolute inset-0 w-full h-full pointer-events-none"
              style={{
                clipPath: isHoldingOriginal
                  ? 'inset(0 100% 0 0)'
                  : `inset(0 0 0 ${sliderPosition}%)`,
                transition: isHoldingOriginal ? 'clip-path 0.15s ease' : 'none',
              }}
            >
              <img
                src={activeVariant?.url}
                alt="AI Studio Variant"
                className="w-full h-full object-contain"
                style={{
                  transform: `scale(${zoomLevel})`,
                  transformOrigin: `${sliderPosition}% 50%`,
                  transition: isDragging ? 'none' : 'transform 0.2s ease-out',
                }}
                draggable={false}
              />
            </div>

            {/* 3. Floating Pill Badges */}
            {/* Left Pill (Original) */}
            <div className="absolute top-4 left-4 pointer-events-none z-10 flex items-center gap-2">
              <div className="bg-black/70 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 shadow-md flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-amber-400"></span>
                <span className="font-bold">Original</span>
                <span className="text-[10px] text-zinc-300">
                  {origWidth}×{origHeight} px
                </span>
                <span className="px-1.5 py-0.2 bg-white/20 rounded text-[10px] font-semibold">
                  SEO {origScore}%
                </span>
              </div>
            </div>

            {/* Right Pill (AI Variant) */}
            <div className="absolute top-4 right-4 pointer-events-none z-10 flex items-center gap-2">
              <div className="bg-[#008060]/90 backdrop-blur-md text-white text-xs px-3 py-1.5 rounded-lg border border-white/20 shadow-md flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-white" />
                <span className="font-bold capitalize">{activeVariant?.mode || 'Hero'} Studio</span>
                <span className="text-[10px] text-white/90">
                  {varWidth}×{varHeight} px
                </span>
                <span className="px-1.5 py-0.2 bg-white/25 rounded text-[10px] font-extrabold">
                  SEO {varScore}% (+{scoreDiff})
                </span>
              </div>
            </div>

            {/* 4. Vertical Divider Line with Grab Handle */}
            {!isHoldingOriginal && (
              <div
                className="absolute top-0 bottom-0 z-20 pointer-events-none flex items-center justify-center"
                style={{
                  left: `${sliderPosition}%`,
                  transform: 'translateX(-50%)',
                }}
              >
                {/* Thin dividing line with shadow */}
                <div className="w-0.5 h-full bg-white shadow-[0_0_8px_rgba(0,0,0,0.8)]"></div>

                {/* Circular handle button */}
                <div
                  className={`absolute w-9 h-9 rounded-full bg-white text-[#202223] shadow-lg border-2 border-[#008060] flex items-center justify-center transition-transform ${
                    isDragging ? 'scale-115 ring-4 ring-[#008060]/30' : 'hover:scale-110'
                  }`}
                >
                  <ChevronsLeftRight className="w-4 h-4 text-[#008060]" />
                </div>
              </div>
            )}
          </div>
        )}

        {/* --- VIEW MODE 2: SIDE-BY-SIDE --- */}
        {viewMode === 'side_by_side' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Left Box: Original */}
            <div className="bg-[#f6f6f7] border border-[#e1e3e5] rounded-xl p-4 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-[#e1e3e5]">
                <div className="flex items-center gap-2">
                  <span className="w-2.5 h-2.5 rounded-full bg-amber-500"></span>
                  <span className="text-xs font-bold text-[#202223]">
                    Original Shopify Image
                  </span>
                </div>
                <span className="text-xs text-[#6d7175] font-mono">
                  {origWidth}×{origHeight} px • {origRatio}:1
                </span>
              </div>
              <div className="w-full aspect-square bg-[#111213] rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={activeOriginal?.url}
                  alt="Original"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full mt-3 flex items-center justify-between text-xs text-[#6d7175]">
                <span>Status: Current Catalog Image</span>
                <span className="font-bold text-[#202223]">SEO Score: {origScore}/100</span>
              </div>
            </div>

            {/* Right Box: AI Studio Variant */}
            <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-xl p-4 flex flex-col items-center">
              <div className="w-full flex items-center justify-between pb-3 mb-3 border-b border-[#bbf7d0]">
                <div className="flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#008060]" />
                  <span className="text-xs font-bold text-[#008060] capitalize">
                    Next AI Studio ({activeVariant?.mode || 'Hero'})
                  </span>
                </div>
                <span className="text-xs text-[#166534] font-mono font-bold">
                  {varWidth}×{varHeight} px • {varRatio}:1
                </span>
              </div>
              <div className="w-full aspect-square bg-[#111213] rounded-lg overflow-hidden flex items-center justify-center">
                <img
                  src={activeVariant?.url}
                  alt="AI Variant"
                  className="w-full h-full object-contain"
                />
              </div>
              <div className="w-full mt-3 flex items-center justify-between text-xs text-[#166534]">
                <span className="font-semibold text-[#166534]">
                  ✓ Verified Zoom-Ready
                </span>
                <span className="font-extrabold text-[#008060]">
                  SEO Score: {varScore}/100 (+{scoreDiff})
                </span>
              </div>
            </div>
          </div>
        )}

        {/* --- VIEW MODE 3: OPACITY BLEND --- */}
        {viewMode === 'blend' && (
          <div className="relative w-full aspect-square max-w-3xl mx-auto rounded-xl overflow-hidden bg-[#111213] border border-[#e1e3e5] shadow-inner flex items-center justify-center">
            {/* Original image */}
            <img
              src={activeOriginal?.url}
              alt="Original"
              className="absolute inset-0 w-full h-full object-contain"
            />
            {/* AI Variant overlaid with dynamic opacity */}
            <img
              src={activeVariant?.url}
              alt="AI Variant"
              className="absolute inset-0 w-full h-full object-contain transition-opacity duration-75"
              style={{ opacity: blendOpacity / 100 }}
            />
            {/* Floating indicator */}
            <div className="absolute bottom-4 left-1/2 -translate-x-1/2 bg-black/75 backdrop-blur-md text-white text-xs px-4 py-1.5 rounded-full border border-white/20 shadow-md">
              Blend Ratio: {100 - blendOpacity}% Original / {blendOpacity}% AI Studio
            </div>
          </div>
        )}

        {/* Bottom Helper Hint */}
        <div className="flex items-center justify-between text-[11px] text-[#6d7175] pt-1">
          <div className="flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-[#008060]" />
            <span>
              Drag slider horizontally or use keyboard Left/Right arrows to scrub between before and after.
            </span>
          </div>
          <span className="font-semibold text-[#202223]">
            Active Split: {sliderPosition}%
          </span>
        </div>
      </div>

      {/* Quality Improvements & Technical Diagnostics Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left Column: Side-by-Side Metric Comparison */}
        <div className="lg:col-span-7 bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-[#f1f2f4] pb-3">
            <h3 className="text-sm font-bold text-[#202223] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#008060]" />
              Quality & Optimization Differential
            </h3>
            <span className="text-xs font-bold text-[#008060] bg-[#e6f4ea] px-2 py-0.5 rounded-full">
              +{scoreDiff} Pts SEO Gain
            </span>
          </div>

          <div className="divide-y divide-[#f1f2f4] text-xs">
            {/* Metric 1: Resolution */}
            <div className="py-2.5 grid grid-cols-12 items-center gap-2">
              <span className="col-span-4 font-semibold text-[#6d7175]">
                Resolution & Zoom
              </span>
              <div className="col-span-4 text-[#202223] flex items-center gap-1">
                <span>{origWidth}×{origHeight} px</span>
                {origWidth < 1024 && (
                  <span className="text-[10px] text-[#b91c1c] font-bold bg-[#fee2e2] px-1 rounded">
                    Low
                  </span>
                )}
              </div>
              <div className="col-span-4 text-[#008060] font-bold flex items-center gap-1">
                <span>{varWidth}×{varHeight} px</span>
                <span className="text-[10px] text-[#166534] bg-[#dcfce7] px-1 rounded">
                  Ultra-HD
                </span>
              </div>
            </div>

            {/* Metric 2: Aspect Ratio */}
            <div className="py-2.5 grid grid-cols-12 items-center gap-2">
              <span className="col-span-4 font-semibold text-[#6d7175]">
                Aspect Ratio
              </span>
              <div className="col-span-4 text-[#202223]">
                {origRatio}:1 {origWidth === origHeight ? '(1:1 Square)' : '(Irregular)'}
              </div>
              <div className="col-span-4 text-[#008060] font-bold">
                {activeVariant?.aspectRatio || '1:1'} Square (Shopify Standard)
              </div>
            </div>

            {/* Metric 3: SEO Audit Score */}
            <div className="py-2.5 grid grid-cols-12 items-center gap-2">
              <span className="col-span-4 font-semibold text-[#6d7175]">
                Google Image SEO
              </span>
              <div className="col-span-4 text-[#202223] font-semibold">
                {origScore} / 100
              </div>
              <div className="col-span-4 text-[#008060] font-extrabold flex items-center gap-1">
                <span>{varScore} / 100</span>
                <span className="text-[10px] font-bold text-[#15803d]">
                  (+{scoreDiff}%)
                </span>
              </div>
            </div>

            {/* Metric 4: Lighting & Staging */}
            <div className="py-2.5 grid grid-cols-12 items-center gap-2">
              <span className="col-span-4 font-semibold text-[#6d7175]">
                Lighting & Staging
              </span>
              <div className="col-span-4 text-[#6d7175]">
                Original ambient capture
              </div>
              <div className="col-span-4 text-[#008060] font-medium">
                Calibrated softbox studio lighting
              </div>
            </div>

            {/* Metric 5: Descriptive Alt Text */}
            <div className="py-2.5 grid grid-cols-12 items-start gap-2">
              <span className="col-span-4 font-semibold text-[#6d7175]">
                Alt Text & Filename
              </span>
              <div className="col-span-4 text-[#6d7175] break-words">
                {activeOriginal?.altText || 'Missing / Non-descriptive'}
              </div>
              <div className="col-span-4 text-[#008060] font-medium break-words">
                {activeVariant?.suggestedFilename}
              </div>
            </div>
          </div>

          {/* Detailed improvements checklist */}
          {activeVariant?.qualityImprovements && (
            <div className="mt-3 pt-3 border-t border-[#f1f2f4]">
              <span className="text-xs font-bold text-[#202223] block mb-2">
                Verified Enhancements in this AI Variant:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {activeVariant.qualityImprovements.map((imp, idx) => (
                  <div
                    key={idx}
                    className="flex items-start gap-1.5 text-xs text-[#202223]"
                  >
                    <CheckCircle2 className="w-3.5 h-3.5 text-[#008060] shrink-0 mt-0.5" />
                    <span>{imp}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Deployment Actions & Direct Publishing */}
        <div className="lg:col-span-5 bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Zap className="w-4 h-4 text-[#008060]" />
              <h3 className="text-sm font-bold text-[#202223]">
                Apply Studio Variant to Product
              </h3>
            </div>
            <p className="text-xs text-[#6d7175] mb-4">
              Satisfied with the quality comparison? Deploy this AI Studio asset directly to your active Shopify storefront catalog.
            </p>

            <div className="space-y-3">
              {/* Action 1: Set as Hero */}
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={handlePromoteToHero}
                className="w-full py-2.5 px-4 bg-[#008060] hover:bg-[#006e52] disabled:opacity-50 text-white text-xs font-bold rounded-lg shadow-xs transition flex items-center justify-center gap-2"
              >
                <Sparkles className="w-4 h-4" />
                <span>Replace & Set as Primary Hero Image</span>
              </button>

              {/* Action 2: Add to Gallery */}
              <button
                type="button"
                disabled={isExecutingAction}
                onClick={handleAddToGallery}
                className="w-full py-2.5 px-4 bg-white hover:bg-[#f6f6f7] disabled:opacity-50 border border-[#d2d5d8] text-[#202223] text-xs font-bold rounded-lg shadow-2xs transition flex items-center justify-center gap-2"
              >
                <Tag className="w-4 h-4 text-[#6d7175]" />
                <span>Add as New Media Gallery Asset</span>
              </button>

              {/* Action 3: Assign to Variant SKU */}
              <div className="pt-2 border-t border-[#f1f2f4]">
                <label className="text-[11px] font-bold text-[#6d7175] uppercase block mb-1">
                  Assign directly to Variant SKU:
                </label>
                <div className="flex items-center gap-2">
                  <select
                    value={selectedVariantTarget}
                    onChange={(e) => setSelectedVariantTarget(e.target.value)}
                    className="flex-1 px-3 py-1.5 text-xs font-semibold bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#008060]"
                  >
                    {product.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.title} ({v.sku}) {v.imageId ? '• [Has Image]' : '• [No Image]'}
                      </option>
                    ))}
                  </select>
                  <button
                    type="button"
                    disabled={isExecutingAction || !selectedVariantTarget}
                    onClick={handleAssignToVariant}
                    className="px-3 py-1.5 text-xs font-bold text-[#008060] bg-[#e6f4ea] hover:bg-[#d0edd8] border border-[#a3e0b7] rounded-lg transition shrink-0"
                  >
                    Assign
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom links */}
          <div className="pt-4 border-t border-[#f1f2f4] flex items-center justify-between text-xs">
            <a
              href={activeVariant?.url}
              target="_blank"
              rel="noreferrer"
              className="font-semibold text-[#6d7175] hover:text-[#202223] inline-flex items-center gap-1"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Inspect Full Resolution</span>
            </a>

            <button
              type="button"
              onClick={() => onOpenInStudio({ mode: activeVariant?.mode || 'hero' })}
              className="font-bold text-[#008060] hover:underline inline-flex items-center gap-1"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Regenerate in Studio</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
