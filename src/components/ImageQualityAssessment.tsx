import React, { useState, useMemo } from 'react';
import {
  ShieldAlert,
  ShieldCheck,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Maximize,
  Crop,
  Sparkles,
  RefreshCw,
  Info,
  Layers,
  ZoomIn,
  Eye,
  ArrowRight,
  Filter,
  Check,
  ExternalLink,
  ChevronDown,
  ChevronsLeftRight,
} from 'lucide-react';
import type { ShopifyProduct, ShopifyProductImage, ImageQualityAssessmentResult } from '../types';
import {
  DEFAULT_QUALITY_CONFIG,
  ASPECT_RATIO_TARGETS,
  assessImageQuality,
  QualityRequirementConfig,
} from '../utils/imageQuality';
import { ResolutionWarningBadge } from './ResolutionWarningBadge';

interface ImageQualityAssessmentProps {
  product: ShopifyProduct;
  onApplyFix?: (imageId: string, field: string, value?: any) => Promise<void>;
  onOpenStudio?: (image: ShopifyProductImage) => void;
  onOpenCompareSlider?: (imageId?: string) => void;
}

export const ImageQualityAssessment: React.FC<ImageQualityAssessmentProps> = ({
  product,
  onApplyFix,
  onOpenStudio,
  onOpenCompareSlider,
}) => {
  const [config, setConfig] = useState<QualityRequirementConfig>(DEFAULT_QUALITY_CONFIG);
  const [filterMode, setFilterMode] = useState<
    'all' | 'flagged' | 'low_res' | 'aspect_ratio' | 'compliant'
  >('all');
  const [isFixingImageId, setIsFixingImageId] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [selectedInspectImageId, setSelectedInspectImageId] = useState<string | null>(null);

  // Compute assessments for all images
  const assessments = useMemo(() => {
    return product.images.map((img) => ({
      image: img,
      result: assessImageQuality(img, config),
    }));
  }, [product.images, config]);

  const flaggedCount = assessments.filter((a) => a.result.hasResolutionWarning).length;
  const lowResCount = assessments.filter((a) => a.result.isLowResolution).length;
  const ratioMismatchCount = assessments.filter((a) => a.result.failsAspectRatio).length;
  const compliantCount = assessments.filter((a) => !a.result.hasResolutionWarning).length;
  const passRate = assessments.length ? Math.round((compliantCount / assessments.length) * 100) : 100;

  // Filtered list
  const filteredAssessments = useMemo(() => {
    switch (filterMode) {
      case 'flagged':
        return assessments.filter((a) => a.result.hasResolutionWarning);
      case 'low_res':
        return assessments.filter((a) => a.result.isLowResolution);
      case 'aspect_ratio':
        return assessments.filter((a) => a.result.failsAspectRatio);
      case 'compliant':
        return assessments.filter((a) => !a.result.hasResolutionWarning);
      case 'all':
      default:
        return assessments;
    }
  }, [assessments, filterMode]);

  // One-click AI Upscale Simulation
  const handleUpscaleImage = async (img: ShopifyProductImage) => {
    setIsFixingImageId(img.id);
    try {
      const targetSize = Math.max(1600, img.width * 2, img.height * 2);
      if (onApplyFix) {
        await onApplyFix(img.id, 'resolution_upscale', {
          width: targetSize,
          height: targetSize,
        });
      } else {
        await fetch(`/api/products/${product.id}/images/${img.id}/fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'resolution_upscale',
            value: { width: targetSize, height: targetSize },
          }),
        });
      }
      setSuccessToast(`Upscaled ${img.filename} to ${targetSize}×${targetSize} px HD resolution!`);
    } catch (e) {
      console.error('Failed to upscale:', e);
    } finally {
      setIsFixingImageId(null);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  // One-click Re-crop to target aspect ratio
  const handleCropToTargetRatio = async (img: ShopifyProductImage) => {
    setIsFixingImageId(img.id);
    try {
      const targetRatioObj = ASPECT_RATIO_TARGETS[config.targetAspectRatio];
      const targetRatio = targetRatioObj.ratio || 1.0;
      let newW = img.width;
      let newH = img.height;

      if (targetRatio === 1.0) {
        const sq = Math.min(img.width, img.height);
        newW = sq;
        newH = sq;
      } else {
        newW = Math.round(img.height * targetRatio);
      }

      if (onApplyFix) {
        await onApplyFix(img.id, 'crop_aspect_ratio', {
          width: newW,
          height: newH,
        });
      } else {
        await fetch(`/api/products/${product.id}/images/${img.id}/fix`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            field: 'crop_aspect_ratio',
            value: { width: newW, height: newH },
          }),
        });
      }
      setSuccessToast(`Re-cropped ${img.filename} to ${newW}×${newH} (${config.targetAspectRatio})!`);
    } catch (e) {
      console.error('Failed to crop:', e);
    } finally {
      setIsFixingImageId(null);
      setTimeout(() => setSuccessToast(null), 3500);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toast feedback */}
      {successToast && (
        <div className="bg-[#e6f4ea] border border-[#a3d9b8] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#008060] font-medium animate-fadeIn shadow-2xs">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-[#008060] shrink-0" />
            <span>{successToast}</span>
          </div>
          <button
            onClick={() => setSuccessToast(null)}
            className="text-[#008060] hover:text-[#004e38] font-bold text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* Main Tool Header & Requirements Configurator */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 border-b border-[#f1f2f4] pb-5">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 bg-[#fef3c7] text-[#92400e] text-[10px] font-bold uppercase rounded-md tracking-wider">
                Storefront Standards
              </span>
              <span className="text-xs text-[#6d7175]">Shopify Quality & Responsive Grid Standards</span>
            </div>
            <h2 className="text-xl font-bold text-[#202223] mt-1">
              Image Quality & Resolution Assessment
            </h2>
            <p className="text-xs text-[#6d7175] mt-1 max-w-2xl">
              Audits all product media against minimum resolution thresholds and aspect ratio guidelines to prevent storefront layout shifts (CLS), blurry zoom previews, and inconsistent catalog cards.
            </p>
          </div>

          {/* Quick Stats Metric Pills */}
          <div className="flex items-center gap-3">
            <div className="px-4 py-2.5 rounded-xl border border-[#e1e3e5] bg-[#f9fafb] text-center">
              <span className="text-[10px] uppercase font-bold text-[#6d7175]">Quality Score</span>
              <div className="text-xl font-extrabold text-[#202223]">{passRate}%</div>
            </div>

            <div className={`px-4 py-2.5 rounded-xl border text-center ${
              flaggedCount > 0
                ? 'bg-[#fef2f2] border-[#fca5a5] text-[#b91c1c]'
                : 'bg-[#e6f4ea] border-[#a3d9b8] text-[#008060]'
            }`}>
              <span className="text-[10px] uppercase font-bold">Warnings</span>
              <div className="text-xl font-extrabold flex items-center justify-center gap-1">
                {flaggedCount > 0 && <AlertTriangle className="w-4 h-4 text-[#dc2626]" />}
                <span>{flaggedCount}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Requirements Configuration Controls */}
        <div className="pt-4 grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Target Aspect Ratio */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#202223] flex items-center gap-1.5">
              <Crop className="w-3.5 h-3.5 text-[#008060]" />
              <span>Target Aspect Ratio</span>
            </label>
            <select
              value={config.targetAspectRatio}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  targetAspectRatio: e.target.value as any,
                }))
              }
              className="w-full bg-[#f9fafb] border border-[#d2d5d8] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] rounded-lg px-3 py-2 font-medium text-[#202223] text-xs transition"
            >
              <option value="1:1">1:1 Square (Shopify Recommended)</option>
              <option value="3:4">3:4 Portrait (Apparel / Lookbook)</option>
              <option value="4:5">4:5 Portrait (Mobile / Social Feed)</option>
              <option value="4:3">4:3 Standard (Classic Landscape)</option>
              <option value="16:9">16:9 Widescreen (Hero / Lifestyle)</option>
              <option value="any">Any Aspect Ratio (Disable Ratio Check)</option>
            </select>
            <p className="text-[11px] text-[#6d7175]">
              {ASPECT_RATIO_TARGETS[config.targetAspectRatio].description}
            </p>
          </div>

          {/* Minimum Resolution Threshold */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#202223] flex items-center gap-1.5">
              <Maximize className="w-3.5 h-3.5 text-[#008060]" />
              <span>Minimum Resolution Threshold</span>
            </label>
            <select
              value={config.minResolutionPx}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  minResolutionPx: Number(e.target.value),
                }))
              }
              className="w-full bg-[#f9fafb] border border-[#d2d5d8] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] rounded-lg px-3 py-2 font-medium text-[#202223] text-xs transition"
            >
              <option value={800}>800 × 800 px (Shopify Zoom Minimum)</option>
              <option value={1024}>1024 × 1024 px (Standard High-Res)</option>
              <option value={1400}>1400 × 1400 px (Enhanced Product Detail)</option>
              <option value={1600}>1600 × 1600 px (Retina 2x Displays)</option>
              <option value={2048}>2048 × 2048 px (Shopify 4K Max Quality)</option>
            </select>
            <p className="text-[11px] text-[#6d7175]">
              Images with either dimension under this threshold trigger a Resolution Warning.
            </p>
          </div>

          {/* Aspect Ratio Tolerance */}
          <div className="space-y-1.5">
            <label className="font-semibold text-[#202223] flex items-center gap-1.5">
              <Sliders className="w-3.5 h-3.5 text-[#008060]" />
              <span>Ratio Deviation Tolerance</span>
            </label>
            <select
              value={config.tolerancePercent}
              onChange={(e) =>
                setConfig((prev) => ({
                  ...prev,
                  tolerancePercent: Number(e.target.value),
                }))
              }
              className="w-full bg-[#f9fafb] border border-[#d2d5d8] focus:border-[#008060] focus:ring-1 focus:ring-[#008060] rounded-lg px-3 py-2 font-medium text-[#202223] text-xs transition"
            >
              <option value={1}>Strict (±1% deviation allowed)</option>
              <option value={3}>Standard (±3% deviation allowed)</option>
              <option value={5}>Relaxed (±5% deviation allowed)</option>
              <option value={10}>Permissive (±10% deviation allowed)</option>
            </select>
            <p className="text-[11px] text-[#6d7175]">
              Permits minor pixel rounding differences in production photography.
            </p>
          </div>
        </div>
      </div>

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <button
          onClick={() => setFilterMode('all')}
          className={`p-4 rounded-xl border text-left transition shadow-xs ${
            filterMode === 'all'
              ? 'bg-white border-[#008060] ring-2 ring-[#008060]/20'
              : 'bg-white border-[#e1e3e5] hover:border-[#b4b7ba]'
          }`}
        >
          <span className="text-xs font-semibold text-[#6d7175] uppercase">Total Images</span>
          <div className="text-2xl font-bold text-[#202223] mt-1">{assessments.length}</div>
          <p className="text-[11px] text-[#6d7175] mt-1">All catalog media</p>
        </button>

        <button
          onClick={() => setFilterMode('flagged')}
          className={`p-4 rounded-xl border text-left transition shadow-xs ${
            filterMode === 'flagged'
              ? 'bg-[#fffbeb] border-[#d97706] ring-2 ring-[#d97706]/20'
              : 'bg-white border-[#e1e3e5] hover:border-[#b4b7ba]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#b45309] uppercase">Resolution Warnings</span>
            <AlertTriangle className="w-4 h-4 text-[#d97706]" />
          </div>
          <div className="text-2xl font-bold text-[#b45309] mt-1">{flaggedCount}</div>
          <p className="text-[11px] text-[#92400e] mt-1">Require optimization</p>
        </button>

        <button
          onClick={() => setFilterMode('low_res')}
          className={`p-4 rounded-xl border text-left transition shadow-xs ${
            filterMode === 'low_res'
              ? 'bg-[#fef2f2] border-[#dc2626] ring-2 ring-[#dc2626]/20'
              : 'bg-white border-[#e1e3e5] hover:border-[#b4b7ba]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#b91c1c] uppercase">Low Resolution</span>
            <Maximize className="w-4 h-4 text-[#dc2626]" />
          </div>
          <div className="text-2xl font-bold text-[#b91c1c] mt-1">{lowResCount}</div>
          <p className="text-[11px] text-[#991b1b] mt-1">&lt; {config.minResolutionPx}px threshold</p>
        </button>

        <button
          onClick={() => setFilterMode('aspect_ratio')}
          className={`p-4 rounded-xl border text-left transition shadow-xs ${
            filterMode === 'aspect_ratio'
              ? 'bg-[#fff7ed] border-[#ea580c] ring-2 ring-[#ea580c]/20'
              : 'bg-white border-[#e1e3e5] hover:border-[#b4b7ba]'
          }`}
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-[#c2410c] uppercase">Ratio Mismatch</span>
            <Crop className="w-4 h-4 text-[#ea580c]" />
          </div>
          <div className="text-2xl font-bold text-[#c2410c] mt-1">{ratioMismatchCount}</div>
          <p className="text-[11px] text-[#9a3412] mt-1">Deviates from {config.targetAspectRatio}</p>
        </button>
      </div>

      {/* Filter Tabs & Search Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 bg-white border border-[#e1e3e5] rounded-xl p-3 shadow-xs">
        <div className="flex items-center gap-1.5 text-xs">
          <span className="text-[#6d7175] font-medium mr-1 flex items-center gap-1">
            <Filter className="w-3.5 h-3.5 text-[#6d7175]" /> Filter:
          </span>

          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'all'
                ? 'bg-[#202223] text-white'
                : 'bg-[#f1f2f4] text-[#6d7175] hover:text-[#202223]'
            }`}
          >
            All Images ({assessments.length})
          </button>

          <button
            onClick={() => setFilterMode('flagged')}
            className={`px-3 py-1.5 rounded-lg font-medium transition flex items-center gap-1 ${
              filterMode === 'flagged'
                ? 'bg-[#b45309] text-white'
                : 'bg-[#fffbeb] text-[#b45309] hover:bg-[#fef3c7]'
            }`}
          >
            <AlertTriangle className="w-3 h-3" />
            <span>Resolution Warnings ({flaggedCount})</span>
          </button>

          <button
            onClick={() => setFilterMode('low_res')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'low_res'
                ? 'bg-[#dc2626] text-white'
                : 'bg-[#fef2f2] text-[#b91c1c] hover:bg-[#fee2e2]'
            }`}
          >
            Low-Res Only ({lowResCount})
          </button>

          <button
            onClick={() => setFilterMode('aspect_ratio')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'aspect_ratio'
                ? 'bg-[#ea580c] text-white'
                : 'bg-[#fff7ed] text-[#c2410c] hover:bg-[#ffedd5]'
            }`}
          >
            Ratio Mismatches ({ratioMismatchCount})
          </button>

          <button
            onClick={() => setFilterMode('compliant')}
            className={`px-3 py-1.5 rounded-lg font-medium transition ${
              filterMode === 'compliant'
                ? 'bg-[#008060] text-white'
                : 'bg-[#e6f4ea] text-[#008060] hover:bg-[#cbead7]'
            }`}
          >
            Compliant ({compliantCount})
          </button>
        </div>

        <div className="text-xs text-[#6d7175]">
          Showing <span className="font-bold text-[#202223]">{filteredAssessments.length}</span> images
        </div>
      </div>

      {/* Assessed Images List */}
      <div className="space-y-4">
        {filteredAssessments.map(({ image, result }, idx) => {
          const isSelected = selectedInspectImageId === image.id;
          const isProcessing = isFixingImageId === image.id;

          return (
            <div
              key={image.id}
              className={`bg-white border rounded-xl p-5 shadow-xs transition duration-150 space-y-4 ${
                result.hasResolutionWarning
                  ? 'border-[#fca5a5]/80 bg-[#fdfaf8]'
                  : 'border-[#e1e3e5]'
              }`}
            >
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f2f4] pb-3">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-xs font-mono font-bold text-[#6d7175] bg-[#f1f2f4] px-2 py-0.5 rounded">
                    Image #{idx + 1}
                  </span>
                  <span className="text-xs font-medium text-[#202223] truncate max-w-[200px] sm:max-w-xs">
                    {image.filename}
                  </span>

                  {/* PROMINENT RESOLUTION WARNING BADGE */}
                  {result.hasResolutionWarning ? (
                    <ResolutionWarningBadge
                      assessment={result}
                      size="md"
                      showDetailsOnHover={true}
                    />
                  ) : (
                    <span className="px-2.5 py-0.5 bg-[#e6f4ea] text-[#008060] border border-[#a3d9b8] text-xs font-bold rounded-md flex items-center gap-1 shadow-2xs">
                      <CheckCircle2 className="w-3.5 h-3.5 text-[#008060]" />
                      Quality Compliant
                    </span>
                  )}

                  {image.isHero && (
                    <span className="px-2 py-0.5 bg-[#008060] text-white text-[10px] font-bold rounded-md uppercase">
                      Hero
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-2 text-xs">
                  <span className="text-[#6d7175]">Zoom Readiness:</span>
                  <span
                    className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                      result.zoomCapability === 'retina'
                        ? 'bg-[#e6f4ea] text-[#008060]'
                        : result.zoomCapability === 'standard'
                        ? 'bg-[#e0f2fe] text-[#0284c7]'
                        : result.zoomCapability === 'basic'
                        ? 'bg-[#fef3c7] text-[#92400e]'
                        : 'bg-[#fee2e2] text-[#991b1b]'
                    }`}
                  >
                    {result.zoomCapability === 'retina' && 'Retina 4K Zoom'}
                    {result.zoomCapability === 'standard' && 'Standard HD Zoom'}
                    {result.zoomCapability === 'basic' && 'Basic Zoom (800px)'}
                    {result.zoomCapability === 'disabled' && 'Zoom Disabled (Low-Res)'}
                  </span>
                </div>
              </div>

              {/* Card Body: Visual Comparison & Diagnostics */}
              <div className="grid grid-cols-1 md:grid-cols-12 gap-5 items-start">
                {/* Visual Thumbnail & Aspect Ratio Frame */}
                <div className="md:col-span-3 space-y-2">
                  <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#d2d5d8] bg-[#f1f2f4] flex items-center justify-center group">
                    <img
                      src={image.url}
                      alt={image.altText || 'Product visual'}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-contain"
                    />

                    {/* Frame overlay demonstrating aspect ratio */}
                    <div className="absolute inset-0 border-2 border-dashed border-[#008060]/40 pointer-events-none" />

                    <div className="absolute bottom-1.5 right-1.5 px-2 py-0.5 bg-black/75 text-white text-[10px] font-mono rounded">
                      {image.width} × {image.height}
                    </div>
                  </div>

                  <div className="text-center">
                    <span className="text-[11px] text-[#6d7175]">
                      Ratio: <strong className="text-[#202223]">{result.aspectRatioLabel}</strong> ({result.aspectRatio.toFixed(2)}:1)
                    </span>
                  </div>
                </div>

                {/* Diagnostics Matrix */}
                <div className="md:col-span-6 space-y-3">
                  {/* Detailed Warning Reasons Alert Box */}
                  {result.hasResolutionWarning && (
                    <div className="bg-[#fffbeb] border border-[#fde68a] rounded-lg p-3 space-y-2">
                      <div className="flex items-center gap-1.5 text-xs font-bold text-[#b45309]">
                        <AlertTriangle className="w-4 h-4 text-[#d97706] shrink-0" />
                        <span>Resolution & Aspect Ratio Findings:</span>
                      </div>
                      <ul className="space-y-1.5 text-xs text-[#78350f]">
                        {result.warningReasons.map((reason, rIdx) => (
                          <li key={rIdx} className="flex items-start gap-1.5 leading-relaxed">
                            <span className="text-[#d97706] font-bold">•</span>
                            <span>{reason}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {!result.hasResolutionWarning && (
                    <div className="bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg p-3 text-xs text-[#166534] flex items-center gap-2">
                      <CheckCircle2 className="w-4 h-4 text-[#16a34a] shrink-0" />
                      <span>
                        Meets all resolution (≥ {config.minResolutionPx}px) and aspect ratio ({config.targetAspectRatio}) standards.
                      </span>
                    </div>
                  )}

                  {/* Dimension & Spec Grid */}
                  <div className="grid grid-cols-3 gap-2 bg-[#f9fafb] border border-[#e1e3e5] rounded-lg p-3 text-xs">
                    <div>
                      <span className="text-[10px] text-[#6d7175] block uppercase font-medium">Resolution</span>
                      <span className={`font-bold ${result.isLowResolution ? 'text-[#dc2626]' : 'text-[#202223]'}`}>
                        {image.width} × {image.height} px
                      </span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6d7175] block uppercase font-medium">Megapixels</span>
                      <span className="font-bold text-[#202223]">{result.megapixels} MP</span>
                    </div>
                    <div>
                      <span className="text-[10px] text-[#6d7175] block uppercase font-medium">Target Ratio</span>
                      <span className={`font-bold ${result.failsAspectRatio ? 'text-[#ea580c]' : 'text-[#008060]'}`}>
                        {config.targetAspectRatio}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Remediation & Action Bar */}
                <div className="md:col-span-3 space-y-2">
                  <span className="text-[10px] uppercase font-bold text-[#6d7175] block">
                    Remediation Tools
                  </span>

                  {result.isLowResolution && (
                    <button
                      onClick={() => handleUpscaleImage(image)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-semibold transition shadow-2xs disabled:opacity-50"
                      title="AI Upscale to high-definition resolution"
                    >
                      <Sparkles className="w-3.5 h-3.5 text-[#a7f3d0]" />
                      <span>{isProcessing ? 'Upscaling...' : 'AI Upscale (2x Super-Res)'}</span>
                    </button>
                  )}

                  {result.failsAspectRatio && (
                    <button
                      onClick={() => handleCropToTargetRatio(image)}
                      disabled={isProcessing}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] border border-[#d2d5d8] rounded-lg text-xs font-semibold transition disabled:opacity-50"
                      title={`Re-crop center to ${config.targetAspectRatio}`}
                    >
                      <Crop className="w-3.5 h-3.5 text-[#008060]" />
                      <span>Re-Crop to {config.targetAspectRatio}</span>
                    </button>
                  )}

                  {onOpenStudio && (
                    <button
                      onClick={() => onOpenStudio(image)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f0f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] rounded-lg text-xs font-semibold transition"
                      title="Open in AI Studio to generate backgrounds or variants"
                    >
                      <Maximize className="w-3.5 h-3.5" />
                      <span>AI Studio Generator</span>
                    </button>
                  )}

                  {onOpenCompareSlider && (
                    <button
                      onClick={() => onOpenCompareSlider(image.id)}
                      className="w-full flex items-center justify-center gap-1.5 px-3 py-2 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-lg text-xs font-semibold transition"
                      title="Compare with AI Studio variants in interactive Before/After slider"
                    >
                      <ChevronsLeftRight className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Before / After Slider</span>
                    </button>
                  )}

                  {!result.hasResolutionWarning && (
                    <div className="py-2 text-center text-xs text-[#008060] font-medium flex items-center justify-center gap-1">
                      <Check className="w-3.5 h-3.5" />
                      <span>No action needed</span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Educational Callout: Why Resolution & Aspect Ratios Matter for SEO & GEO */}
      <div className="bg-[#f6f7f8] border border-[#e1e3e5] rounded-xl p-5 text-xs text-[#4a4d50] space-y-3">
        <div className="flex items-center gap-2 font-bold text-[#202223]">
          <Info className="w-4 h-4 text-[#008060]" />
          <span>Why Shopify & Google Require Uniform Resolutions & Aspect Ratios</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-[#6d7175] leading-relaxed">
          <div>
            <strong className="text-[#202223] block mb-1">1. Storefront Layout Stability (CLS)</strong>
            Mismatched aspect ratios cause layout jitter and Cumulative Layout Shifts as responsive product grids load, directly hurting Core Web Vitals rankings on Google.
          </div>
          <div>
            <strong className="text-[#202223] block mb-1">2. Hover-Zoom & Retina High DPI</strong>
            Images below 800px fail Shopify's native hover-zoom threshold. Premium buyers expect crisp 2x retina magnification without blur or pixelation.
          </div>
          <div>
            <strong className="text-[#202223] block mb-1">3. Google Visual Search & SGE</strong>
            Google Images, Google Lens, and Perplexity AI prefer square 1:1 or uniform catalog ratios when displaying product rich cards and shopping carousels.
          </div>
        </div>
      </div>
    </div>
  );
};
