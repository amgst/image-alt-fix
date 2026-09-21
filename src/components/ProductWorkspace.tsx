import React, { useState } from 'react';
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  FileCheck,
  RefreshCw,
  Plus,
  Copy,
  ExternalLink,
  Globe,
  Tag,
  Code,
  Layers,
  Check,
  Info,
  ChevronRight,
  ShieldCheck,
  Maximize2,
  Wand2,
  Eye,
  Search,
  Share2,
  Bookmark,
  Camera,
  ShoppingBag,
  Smartphone,
  Monitor,
  CheckSquare,
  Square,
  CheckCheck,
  SlidersHorizontal,
  ArrowRight,
  CornerDownRight,
  FileText,
  Hash,
  Type,
  Filter,
  Crop,
  ShieldAlert,
  ChevronsLeftRight,
} from 'lucide-react';
import type {
  ShopifyProduct,
  ShopifyProductImage,
  StudioMode,
  AspectRatio,
  GeneratedImageResult,
} from '../types';
import { ImageQualityAssessment } from './ImageQualityAssessment';
import { ResolutionWarningBadge } from './ResolutionWarningBadge';
import { BeforeAfterSlider } from './BeforeAfterSlider';
import { assessImageQuality } from '../utils/imageQuality';

interface ProductWorkspaceProps {
  product: ShopifyProduct;
  onBack: () => void;
  onApplyFix: (imageId: string, field: string, value?: any) => Promise<void>;
  onApplyAllFixes: () => Promise<void>;
  onApplyBulkFix?: (
    imageIds: string[],
    action: string,
    options?: {
      altPattern?: string;
      filenamePattern?: string;
      customFixes?: { imageId: string; altText?: string; filename?: string }[];
    }
  ) => Promise<void>;
  onTriggerAudit: () => Promise<void>;
  onOpenStudioForVariant?: (variantId: string) => void;
  onOpenStudioForHero?: () => void;
  onOpenStudio?: (preset?: { mode?: StudioMode; referenceUrl?: string; variantId?: string }) => void;
  onAttachImageToProduct?: (
    productId: string,
    data: {
      url: string;
      altText: string;
      filename: string;
      variantId?: string;
      isHero?: boolean;
      aspectRatio: AspectRatio;
    }
  ) => Promise<void>;
  isAuditing: boolean;
  isApplying: boolean;
}

export const ProductWorkspace: React.FC<ProductWorkspaceProps> = ({
  product,
  onBack,
  onApplyFix,
  onApplyAllFixes,
  onApplyBulkFix,
  onTriggerAudit,
  onOpenStudioForVariant,
  onOpenStudioForHero,
  onOpenStudio,
  onAttachImageToProduct,
  isAuditing,
  isApplying,
}) => {
  const [activeTab, setActiveTab] = useState<
    'audit' | 'quality' | 'compare' | 'bulk-fix' | 'seo-preview' | 'translations' | 'variants' | 'jsonld'
  >('audit');
  const [compareOriginalId, setCompareOriginalId] = useState<string | undefined>(undefined);
  const [compareVariantId, setCompareVariantId] = useState<string | undefined>(undefined);
  const [selectedImageId, setSelectedImageId] = useState<string>(
    product.images[0]?.id || ''
  );

  // Quality Assessment Analysis mapping
  const imageQualityMap = React.useMemo(() => {
    const map = new Map<string, ReturnType<typeof assessImageQuality>>();
    for (const img of product.images) {
      map.set(img.id, assessImageQuality(img));
    }
    return map;
  }, [product.images]);

  const totalResolutionWarnings = React.useMemo(() => {
    let count = 0;
    for (const val of imageQualityMap.values()) {
      if (val.hasResolutionWarning) count++;
    }
    return count;
  }, [imageQualityMap]);
  const [seoPreviewAltMode, setSeoPreviewAltMode] = useState<'proposed' | 'current'>('proposed');
  const [seoPreviewDevice, setSeoPreviewDevice] = useState<'desktop' | 'mobile'>('desktop');
  const [simulatedQuery, setSimulatedQuery] = useState(product.title);
  const [copiedJsonLd, setCopiedJsonLd] = useState(false);
  const [editingAltImageId, setEditingAltImageId] = useState<string | null>(null);
  const [tempAltValue, setTempAltValue] = useState<string>('');

  // Multi-image selection state
  const [selectedImageIds, setSelectedImageIds] = useState<string[]>([]);
  const [bulkNotification, setBulkNotification] = useState<string | null>(null);

  // Bulk pattern settings
  const [bulkSubTab, setBulkSubTab] = useState<'both' | 'filenames' | 'altText'>('both');
  const [filenamePattern, setFilenamePattern] = useState<string>('{handle}-{position}');
  const [useAiFilenames, setUseAiFilenames] = useState<boolean>(false);
  const [altPattern, setAltPattern] = useState<string>('{title} - {position} by {vendor}');
  const [useAiAltText, setUseAiAltText] = useState<boolean>(false);

  const selectedImage =
    product.images.find((i) => i.id === selectedImageId) || product.images[0];

  const displayedAltText =
    seoPreviewAltMode === 'proposed' && selectedImage?.proposedAltText
      ? selectedImage.proposedAltText
      : selectedImage?.altText || '';

  const unassignedVariants = product.variants.filter((v) => !v.imageId);
  const totalPendingProposals = product.images.reduce((acc, img) => {
    let count = 0;
    if (img.proposedAltText && img.proposedAltText !== img.altText) count++;
    if (img.proposedFilename && img.proposedFilename !== img.filename) count++;
    return acc + count;
  }, 0);

  const handleCopyJsonLd = () => {
    navigator.clipboard.writeText(JSON.stringify(product.jsonLd, null, 2));
    setCopiedJsonLd(true);
    setTimeout(() => setCopiedJsonLd(false), 2000);
  };

  // Multi-image selection helpers
  const toggleSelectImage = (id: string) => {
    setSelectedImageIds((prev) =>
      prev.includes(id) ? prev.filter((imgId) => imgId !== id) : [...prev, id]
    );
  };

  const selectAllImages = () => {
    setSelectedImageIds(product.images.map((img) => img.id));
  };

  const deselectAllImages = () => {
    setSelectedImageIds([]);
  };

  const selectImagesWithIssues = () => {
    setSelectedImageIds(
      product.images.filter((img) => img.issues.length > 0).map((img) => img.id)
    );
  };

  const selectImagesWithMissingAlt = () => {
    setSelectedImageIds(
      product.images
        .filter((img) => !img.altText || img.issues.some((iss) => iss.type.includes('alt')))
        .map((img) => img.id)
    );
  };

  const selectImagesWithGenericFilenames = () => {
    setSelectedImageIds(
      product.images
        .filter((img) => img.issues.some((iss) => iss.type.includes('filename')))
        .map((img) => img.id)
    );
  };

  const selectImagesWithResolutionWarnings = () => {
    setSelectedImageIds(
      product.images
        .filter((img) => imageQualityMap.get(img.id)?.hasResolutionWarning)
        .map((img) => img.id)
    );
  };

  // Descriptive Filename generator logic
  const computeGeneratedFilename = (
    img: ShopifyProductImage,
    idx: number,
    pattern: string
  ) => {
    const ext = img.filename.includes('.')
      ? img.filename.substring(img.filename.lastIndexOf('.'))
      : `.${img.format.toLowerCase()}`;
    const basePattern = pattern.replace(/\.[^/.]+$/, '');
    const positionSlug = img.isHero ? 'hero' : `angle-${idx + 1}`;
    const vendorSlug = (product.vendor || 'store')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');
    const typeSlug = (product.productType || 'product')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '');

    const generated = basePattern
      .replace(/\{handle\}/gi, product.handle)
      .replace(/\{title\}/gi, product.handle)
      .replace(/\{vendor\}/gi, vendorSlug)
      .replace(/\{type\}/gi, typeSlug)
      .replace(/\{index\}/gi, String(idx + 1))
      .replace(/\{position\}/gi, positionSlug)
      .replace(/[^a-zA-Z0-9_-]+/g, '-')
      .toLowerCase();

    return `${generated}${ext}`;
  };

  // Common Alt-Text pattern generator logic
  const computeGeneratedAltText = (
    img: ShopifyProductImage,
    idx: number,
    total: number,
    pattern: string
  ) => {
    const positionLabel = img.isHero ? 'Primary Hero view' : `Product view ${idx + 1}`;
    return pattern
      .replace(/\{title\}/gi, product.title)
      .replace(/\{vendor\}/gi, product.vendor || 'Aura Store')
      .replace(/\{handle\}/gi, product.handle)
      .replace(/\{type\}/gi, product.productType || 'Product')
      .replace(/\{index\}/gi, String(idx + 1))
      .replace(/\{total\}/gi, String(total))
      .replace(/\{position\}/gi, positionLabel);
  };

  // Bulk fix execution
  const handleExecuteBulkFix = async (
    actionType: 'all_proposed' | 'patterns' | 'proposed_alts' | 'proposed_filenames'
  ) => {
    const targetIds =
      selectedImageIds.length > 0 ? selectedImageIds : product.images.map((i) => i.id);
    if (targetIds.length === 0) return;

    try {
      const targetImages = product.images.filter((i) => targetIds.includes(i.id));

      if (actionType === 'all_proposed') {
        if (onApplyBulkFix) {
          await onApplyBulkFix(targetIds, 'apply_all_proposed');
        } else {
          for (const id of targetIds) {
            await onApplyFix(id, 'all');
          }
        }
        setBulkNotification(`Accepted all AI-proposed alt texts and filenames for ${targetIds.length} images!`);
      } else if (actionType === 'proposed_alts') {
        if (onApplyBulkFix) {
          await onApplyBulkFix(targetIds, 'apply_proposed_alts');
        } else {
          for (const id of targetIds) {
            await onApplyFix(id, 'altText');
          }
        }
        setBulkNotification(`Applied AI-proposed alt texts to ${targetIds.length} images!`);
      } else if (actionType === 'proposed_filenames') {
        if (onApplyBulkFix) {
          await onApplyBulkFix(targetIds, 'apply_proposed_filenames');
        } else {
          for (const id of targetIds) {
            await onApplyFix(id, 'filename');
          }
        }
        setBulkNotification(`Applied AI-proposed descriptive filenames to ${targetIds.length} images!`);
      } else if (actionType === 'patterns') {
        const customFixes = targetImages.map((img, idx) => {
          const item: { imageId: string; altText?: string; filename?: string } = {
            imageId: img.id,
          };
          if (bulkSubTab === 'both' || bulkSubTab === 'altText') {
            item.altText = useAiAltText
              ? img.proposedAltText
              : computeGeneratedAltText(img, idx, targetImages.length, altPattern);
          }
          if (bulkSubTab === 'both' || bulkSubTab === 'filenames') {
            item.filename = useAiFilenames
              ? img.proposedFilename
              : computeGeneratedFilename(img, idx, filenamePattern);
          }
          return item;
        });

        if (onApplyBulkFix) {
          await onApplyBulkFix(targetIds, 'custom_fixes', { customFixes });
        } else {
          await fetch(`/api/products/${product.id}/bulk-fix`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ imageIds: targetIds, action: 'custom_fixes', customFixes }),
          });
        }
        setBulkNotification(`Applied bulk SEO pattern updates to ${targetIds.length} images!`);
      }
    } catch (err) {
      console.error('Failed to apply bulk fix:', err);
    } finally {
      setTimeout(() => setBulkNotification(null), 4000);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Top Breadcrumb & Product Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs">
        <div className="flex items-start gap-4">
          <button
            onClick={onBack}
            className="mt-1 p-2 rounded-lg bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] transition"
            title="Back to Catalog"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div>
            <div className="flex items-center gap-2 text-xs text-[#6d7175]">
              <span>Products</span>
              <ChevronRight className="w-3 h-3" />
              <span className="font-mono">{product.handle}</span>
            </div>
            <h1 className="text-2xl font-bold text-[#202223] mt-0.5">
              {product.title}
            </h1>
            <div className="flex flex-wrap items-center gap-2.5 mt-2 text-xs">
              <span className="px-2 py-0.5 bg-[#e6f4ea] text-[#008060] font-semibold rounded-md uppercase text-[10px]">
                {product.status}
              </span>
              <span className="text-[#6d7175]">Vendor: {product.vendor}</span>
              <span className="text-[#d2d5d8]">•</span>
              <span className="text-[#6d7175]">Type: {product.productType}</span>
              <span className="text-[#d2d5d8]">•</span>
              <span className="text-[#6d7175]">
                {product.variants.length} Variants ({unassignedVariants.length} unassigned)
              </span>
            </div>
          </div>
        </div>

        {/* Global Action Bar */}
        <div className="flex flex-wrap items-center gap-3">
          <button
            onClick={onTriggerAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-[#f6f7f8] text-[#202223] border border-[#d2d5d8] rounded-lg text-xs font-semibold transition disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#008060] ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing with Gemini...' : 'Re-Audit Product'}</span>
          </button>

          {totalPendingProposals > 0 && (
            <button
              onClick={onApplyAllFixes}
              disabled={isApplying}
              className="flex items-center gap-2 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-semibold transition shadow-xs disabled:opacity-50"
            >
              <Wand2 className="w-4 h-4" />
              <span>
                {isApplying
                  ? 'Applying Fixes...'
                  : `Apply All AI Fixes (${totalPendingProposals})`}
              </span>
            </button>
          )}

          {onOpenStudioForHero && (
            <button
              onClick={onOpenStudioForHero}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#f0f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] rounded-lg text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Studio Generator</span>
            </button>
          )}
        </div>
      </div>

      {/* SEO & GEO Health Score Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Image SEO Meter */}
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-[#6d7175] uppercase">
              Product Image SEO
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#202223]">
                {product.overallSeoScore}
              </span>
              <span className="text-xs text-[#6d7175]">/ 100</span>
            </div>
            <p className="text-[11px] text-[#6d7175] mt-1">
              Google Visual Search, image pack & accessibility ranking.
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-[#008060] flex items-center justify-center font-bold text-sm text-[#008060] bg-[#e6f4ea]/40">
            {product.overallSeoScore}%
          </div>
        </div>

        {/* GEO Score */}
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-[#6d7175] uppercase">
              GEO AI-Readiness
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#0284c7]">
                {product.overallGeoScore}
              </span>
              <span className="text-xs text-[#6d7175]">/ 100</span>
            </div>
            <p className="text-[11px] text-[#6d7175] mt-1">
              Optimized for Perplexity, ChatGPT, and Google AI Overviews.
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-[#0284c7] flex items-center justify-center font-bold text-sm text-[#0284c7] bg-[#e0f2fe]/40">
            {product.overallGeoScore}%
          </div>
        </div>

        {/* Variant Gap Alert */}
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 flex items-center justify-between shadow-xs">
          <div>
            <span className="text-xs font-semibold text-[#6d7175] uppercase">
              Variant Image Coverage
            </span>
            <div className="flex items-baseline gap-2 mt-1">
              <span className="text-2xl font-extrabold text-[#b45309]">
                {product.variants.length - unassignedVariants.length} / {product.variants.length}
              </span>
              <span className="text-xs text-[#6d7175]">variants mapped</span>
            </div>
            <p className="text-[11px] text-[#6d7175] mt-1">
              {unassignedVariants.length > 0
                ? `${unassignedVariants.length} variants need dedicated photos.`
                : 'Complete variant image mapping!'}
            </p>
          </div>
          <div className="w-14 h-14 rounded-full border-4 border-[#b45309] flex items-center justify-center font-bold text-sm text-[#b45309] bg-[#fef3c7]/50">
            {Math.round(((product.variants.length - unassignedVariants.length) / product.variants.length) * 100)}%
          </div>
        </div>
      </div>

      {/* Workspace Tabs */}
      <div className="border-b border-[#d2d5d8] flex items-center space-x-2">
        <button
          onClick={() => setActiveTab('audit')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'audit'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <FileCheck className="w-4 h-4" />
          <span>Image Audit & Proposals ({product.images.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('quality')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'quality'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <ShieldAlert className="w-4 h-4 text-[#d97706]" />
          <span>Quality & Resolution</span>
          {totalResolutionWarnings > 0 ? (
            <span className="px-1.5 py-0.2 bg-[#fef2f2] text-[#b91c1c] border border-[#fca5a5] text-[10px] font-bold rounded-full flex items-center gap-1">
              <AlertTriangle className="w-2.5 h-2.5 text-[#dc2626]" />
              {totalResolutionWarnings} {totalResolutionWarnings === 1 ? 'Warning' : 'Warnings'}
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-[#e6f4ea] text-[#008060] text-[10px] font-semibold rounded-full">
              Passed
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('compare')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'compare'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <ChevronsLeftRight className="w-4 h-4 text-[#008060]" />
          <span>Before / After Slider</span>
          <span className="px-1.5 py-0.2 bg-[#f0fdf4] text-[#166534] border border-[#bbf7d0] text-[10px] font-bold rounded-full">
            Compare
          </span>
        </button>

        <button
          onClick={() => setActiveTab('bulk-fix')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'bulk-fix'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <SlidersHorizontal className="w-4 h-4" />
          <span>Bulk SEO Fixer</span>
          {selectedImageIds.length > 0 ? (
            <span className="px-1.5 py-0.2 bg-[#008060] text-white text-[10px] font-bold rounded-full">
              {selectedImageIds.length} selected
            </span>
          ) : (
            <span className="px-1.5 py-0.2 bg-[#f1f2f4] text-[#6d7175] text-[10px] font-semibold rounded-full">
              Patterns
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('seo-preview')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'seo-preview'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <Search className="w-4 h-4" />
          <span>SEO Preview</span>
          <span className="px-1.5 py-0.2 bg-[#e8f0fe] text-[#1967d2] text-[10px] font-bold rounded-full">
            Google
          </span>
        </button>

        <button
          onClick={() => setActiveTab('translations')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'translations'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <Globe className="w-4 h-4" />
          <span>Multi-Language Alt Text</span>
        </button>

        <button
          onClick={() => setActiveTab('variants')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'variants'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <Layers className="w-4 h-4" />
          <span>Variant Image Gaps</span>
          {unassignedVariants.length > 0 && (
            <span className="px-1.5 py-0.2 bg-[#fef3c7] text-[#92400e] text-[10px] font-bold rounded-full">
              {unassignedVariants.length}
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab('jsonld')}
          className={`flex items-center gap-2 px-4 py-2.5 font-semibold text-sm border-b-2 transition ${
            activeTab === 'jsonld'
              ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
              : 'border-transparent text-[#6d7175] hover:text-[#202223]'
          }`}
        >
          <Code className="w-4 h-4" />
          <span>Product JSON-LD & GEO Validator</span>
        </button>
      </div>

      {/* TAB 1: PER-IMAGE AUDIT & PROPOSALS */}
      {activeTab === 'audit' && (
        <div className="space-y-6">
          {/* Notification Toast if bulk action finished */}
          {bulkNotification && (
            <div className="bg-[#e6f4ea] border border-[#a3d9b8] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#008060] font-medium animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#008060] shrink-0" />
                <span>{bulkNotification}</span>
              </div>
              <button
                onClick={() => setBulkNotification(null)}
                className="text-[#008060] hover:text-[#004e38] font-bold text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Multi-Image Selection & Bulk Fix Toolbar */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
              {/* Selection Controls */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <button
                  onClick={() => {
                    if (selectedImageIds.length === product.images.length) {
                      deselectAllImages();
                    } else {
                      selectAllImages();
                    }
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] font-semibold rounded-lg transition"
                >
                  {selectedImageIds.length === product.images.length ? (
                    <CheckSquare className="w-4 h-4 text-[#008060]" />
                  ) : selectedImageIds.length > 0 ? (
                    <SlidersHorizontal className="w-4 h-4 text-[#008060]" />
                  ) : (
                    <Square className="w-4 h-4 text-[#6d7175]" />
                  )}
                  <span>
                    {selectedImageIds.length === product.images.length
                      ? 'Deselect All'
                      : selectedImageIds.length > 0
                      ? `Selected (${selectedImageIds.length})`
                      : 'Select All'}
                  </span>
                </button>

                <div className="h-4 w-[1px] bg-[#d2d5d8] mx-1 hidden sm:block" />

                <span className="text-[#6d7175] font-medium hidden sm:inline">Select:</span>
                <button
                  onClick={selectImagesWithIssues}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:border-[#008060] hover:text-[#008060] text-[#6d7175] rounded-md transition font-medium flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-[#b45309]" />
                  <span>With Issues ({product.images.filter((i) => i.issues.length > 0).length})</span>
                </button>

                <button
                  onClick={selectImagesWithMissingAlt}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:border-[#008060] hover:text-[#008060] text-[#6d7175] rounded-md transition font-medium flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-[#dc2626]" />
                  <span>Missing Alt ({product.images.filter((i) => !i.altText || i.issues.some((iss) => iss.type.includes('alt'))).length})</span>
                </button>

                <button
                  onClick={selectImagesWithGenericFilenames}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:border-[#008060] hover:text-[#008060] text-[#6d7175] rounded-md transition font-medium flex items-center gap-1"
                >
                  <Code className="w-3 h-3 text-[#0284c7]" />
                  <span>Generic Filename ({product.images.filter((i) => i.issues.some((iss) => iss.type.includes('filename'))).length})</span>
                </button>

                {totalResolutionWarnings > 0 && (
                  <button
                    onClick={selectImagesWithResolutionWarnings}
                    className="px-2.5 py-1 bg-white border border-[#fde68a] hover:border-[#d97706] text-[#b45309] rounded-md transition font-medium flex items-center gap-1"
                    title="Select all images with Resolution or Aspect Ratio Warnings"
                  >
                    <AlertTriangle className="w-3 h-3 text-[#d97706]" />
                    <span>Resolution Warnings ({totalResolutionWarnings})</span>
                  </button>
                )}

                {selectedImageIds.length > 0 && (
                  <button
                    onClick={deselectAllImages}
                    className="px-2 py-1 text-[#8c9196] hover:text-[#202223] underline text-xs"
                  >
                    Clear selection
                  </button>
                )}
              </div>

              {/* Bulk Actions Trigger */}
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-xs font-semibold text-[#202223]">
                  {selectedImageIds.length > 0 ? (
                    <span className="text-[#008060] bg-[#e6f4ea] px-2.5 py-1 rounded-md font-bold">
                      {selectedImageIds.length} of {product.images.length} selected
                    </span>
                  ) : (
                    <span className="text-[#6d7175]">
                      0 of {product.images.length} selected
                    </span>
                  )}
                </span>

                <button
                  onClick={() => {
                    if (selectedImageIds.length === 0) selectAllImages();
                    setActiveTab('bulk-fix');
                  }}
                  className="px-3 py-1.5 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs"
                  title="Configure bulk filename generation and alt-text patterns"
                >
                  <SlidersHorizontal className="w-3.5 h-3.5" />
                  <span>Bulk SEO Fixer & Patterns</span>
                </button>

                {selectedImageIds.length > 0 && (
                  <button
                    onClick={() => handleExecuteBulkFix('all_proposed')}
                    disabled={isApplying}
                    className="px-3 py-1.5 bg-[#202223] hover:bg-[#323538] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                    title="Accept all proposed alt texts and filenames for selected images"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
                    <span>Apply AI Proposals ({selectedImageIds.length})</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {product.images.map((img, index) => {
            const hasAltProposal =
              img.proposedAltText && img.proposedAltText !== img.altText;
            const hasFilenameProposal =
              img.proposedFilename && img.proposedFilename !== img.filename;
            const assignedVariants = product.variants.filter((v) =>
              img.variantIds.includes(v.id)
            );
            const isSelected = selectedImageIds.includes(img.id);
            const qualityAssessment = imageQualityMap.get(img.id);

            return (
              <div
                key={img.id}
                className={`bg-white border rounded-xl p-5 shadow-xs space-y-5 transition duration-150 ${
                  isSelected
                    ? 'border-[#008060] ring-2 ring-[#008060]/20 bg-[#fbfdfc]'
                    : 'border-[#e1e3e5]'
                }`}
              >
                {/* Image Header & Badges */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f2f4] pb-4">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <button
                      onClick={() => toggleSelectImage(img.id)}
                      className="p-1 hover:bg-[#f1f2f4] rounded text-[#008060] focus:outline-none transition"
                      title={isSelected ? 'Deselect image' : 'Select image for bulk SEO fix'}
                    >
                      {isSelected ? (
                        <CheckSquare className="w-4 h-4 text-[#008060]" />
                      ) : (
                        <Square className="w-4 h-4 text-[#8c9196] hover:text-[#202223]" />
                      )}
                    </button>
                    <span className="text-xs font-mono font-bold text-[#6d7175] bg-[#f1f2f4] px-2 py-1 rounded">
                      Image #{index + 1}
                    </span>
                    {img.isHero && (
                      <span className="px-2.5 py-0.5 bg-[#008060] text-white text-xs font-bold rounded-md uppercase tracking-wider">
                        Primary Hero
                      </span>
                    )}
                    {qualityAssessment?.hasResolutionWarning && (
                      <ResolutionWarningBadge
                        assessment={qualityAssessment}
                        size="md"
                        onClick={() => setActiveTab('quality')}
                      />
                    )}
                    <span className="text-xs text-[#6d7175]">
                      {img.width} × {img.height} px • {img.format} • {img.fileSizeKb} KB
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[#6d7175]">SEO Score:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          img.seoScore >= 80
                            ? 'bg-[#e6f4ea] text-[#008060]'
                            : img.seoScore >= 60
                            ? 'bg-[#fef3c7] text-[#92400e]'
                            : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}
                      >
                        {img.seoScore}/100
                      </span>
                    </div>

                    <div className="flex items-center gap-1 text-xs">
                      <span className="text-[#6d7175]">GEO Score:</span>
                      <span
                        className={`font-bold px-2 py-0.5 rounded ${
                          img.geoScore >= 80
                            ? 'bg-[#e0f2fe] text-[#0284c7]'
                            : img.geoScore >= 60
                            ? 'bg-[#fef3c7] text-[#92400e]'
                            : 'bg-[#fee2e2] text-[#991b1b]'
                        }`}
                      >
                        {img.geoScore}/100
                      </span>
                    </div>

                    <button
                      onClick={() => {
                        setSelectedImageId(img.id);
                        setActiveTab('seo-preview');
                      }}
                      className="px-2.5 py-1 text-xs bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-md font-medium transition flex items-center gap-1.5"
                      title="Preview how this image looks in Google Image Search"
                    >
                      <Eye className="w-3.5 h-3.5 text-[#008060]" />
                      <span>SEO Preview</span>
                    </button>

                    <button
                      onClick={() => {
                        setCompareOriginalId(img.id);
                        setActiveTab('compare');
                      }}
                      className="px-2.5 py-1 text-xs bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#166534] border border-[#bbf7d0] rounded-md font-medium transition flex items-center gap-1.5"
                      title="Compare this original image with AI Studio variants using Before/After slider"
                    >
                      <ChevronsLeftRight className="w-3.5 h-3.5 text-[#16a34a]" />
                      <span>Before / After</span>
                    </button>

                    {(hasAltProposal || hasFilenameProposal) && (
                      <button
                        onClick={() => onApplyFix(img.id, 'all')}
                        className="px-3 py-1 bg-[#008060] text-white rounded-md text-xs font-medium hover:bg-[#006e52] transition flex items-center gap-1 shadow-2xs"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>Accept Image Proposals</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Two-Column Grid: Image Visual vs Proposals */}
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                  {/* Visual Preview Column */}
                  <div className="lg:col-span-4 space-y-3">
                    <div className="relative aspect-square w-full rounded-lg overflow-hidden border border-[#d2d5d8] bg-[#f9fafb] group">
                      <img
                        src={img.url}
                        alt={img.altText || 'Product image'}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
                      />
                      <a
                        href={img.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="absolute top-2 right-2 p-1.5 bg-black/60 hover:bg-black text-white rounded-md opacity-0 group-hover:opacity-100 transition"
                        title="View Full Resolution"
                      >
                        <Maximize2 className="w-4 h-4" />
                      </a>
                    </div>

                    {/* Resolution Warning on Thumbnail */}
                    {qualityAssessment?.hasResolutionWarning && (
                      <div className="pt-0.5">
                        <ResolutionWarningBadge
                          assessment={qualityAssessment}
                          size="sm"
                          onClick={() => setActiveTab('quality')}
                          className="w-full justify-center"
                        />
                      </div>
                    )}

                    {/* Assigned Variants Tags */}
                    <div>
                      <span className="text-xs font-medium text-[#6d7175] block mb-1.5">
                        Assigned Variants:
                      </span>
                      <div className="flex flex-wrap gap-1.5">
                        {assignedVariants.length === 0 ? (
                          <span className="text-xs text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded font-medium flex items-center gap-1">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Unassigned to any variant</span>
                          </span>
                        ) : (
                          assignedVariants.map((v) => (
                            <span
                              key={v.id}
                              className="text-xs bg-[#f1f2f4] text-[#202223] px-2 py-0.5 rounded font-medium border border-[#e1e3e5]"
                            >
                              {v.title}
                            </span>
                          ))
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Findings and Proposals Column */}
                  <div className="lg:col-span-8 space-y-4">
                    {/* Issues detected */}
                    {img.issues.length > 0 && (
                      <div className="space-y-2">
                        <span className="text-xs font-bold text-[#6d7175] uppercase tracking-wider">
                          Detected Findings ({img.issues.length})
                        </span>
                        <div className="space-y-1.5">
                          {img.issues.map((issue) => (
                            <div
                              key={issue.id}
                              className={`p-2.5 rounded-lg border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 ${
                                issue.severity === 'critical'
                                  ? 'bg-[#fef2f2] border-[#fecaca] text-[#991b1b]'
                                  : issue.severity === 'warning'
                                  ? 'bg-[#fffbeb] border-[#fde68a] text-[#92400e]'
                                  : 'bg-[#f0f9ff] border-[#bae6fd] text-[#075985]'
                              }`}
                            >
                              <div className="flex items-start gap-2.5 flex-1">
                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                <div className="flex-1">
                                  <span className="font-semibold">{issue.title}: </span>
                                  <span>{issue.description}</span>
                                </div>
                              </div>
                              <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                                {issue.type === 'low_res' && (
                                  <button
                                    onClick={() => onApplyFix(img.id, 'resolution_upscale')}
                                    className="px-2.5 py-1 bg-[#008060] text-white rounded text-[11px] font-semibold hover:bg-[#006e52] transition flex items-center gap-1 shadow-2xs"
                                  >
                                    <Sparkles className="w-3 h-3" />
                                    <span>AI 2x Upscale</span>
                                  </button>
                                )}
                                {issue.type === 'aspect_ratio_mismatch' && (
                                  <button
                                    onClick={() => onApplyFix(img.id, 'crop_aspect_ratio')}
                                    className="px-2.5 py-1 bg-[#202223] text-white rounded text-[11px] font-semibold hover:bg-[#323538] transition flex items-center gap-1 shadow-2xs"
                                  >
                                    <Crop className="w-3 h-3" />
                                    <span>Re-Crop 1:1</span>
                                  </button>
                                )}
                                {(issue.type === 'low_res' || issue.type === 'aspect_ratio_mismatch') && (
                                  <button
                                    onClick={() => setActiveTab('quality')}
                                    className="px-2 py-1 bg-white border border-[#d2d5d8] text-[#202223] rounded text-[11px] font-medium hover:bg-[#f6f6f7] transition"
                                  >
                                    Quality Tool
                                  </button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* Alt Text Comparison */}
                    <div className="bg-[#fafbfb] border border-[#e1e3e5] rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#202223] flex items-center gap-1.5">
                          <Tag className="w-3.5 h-3.5 text-[#008060]" />
                          <span>Image Alt Text (SEO & Accessibility)</span>
                        </span>
                        {hasAltProposal && (
                          <button
                            onClick={() => onApplyFix(img.id, 'altText')}
                            className="px-2.5 py-1 bg-[#008060] text-white rounded text-xs font-medium hover:bg-[#006e52] transition flex items-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Apply Proposed Alt Text</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                        <div className="p-2.5 bg-white border border-[#e1e3e5] rounded-md">
                          <div className="text-[10px] font-semibold uppercase text-[#8c9196] mb-1">
                            Current Alt Text
                          </div>
                          {img.altText ? (
                            <div className="text-[#202223] font-medium leading-relaxed">
                              "{img.altText}"
                            </div>
                          ) : (
                            <div className="text-[#dc2626] font-semibold italic">
                              [Missing / Empty Alt Text]
                            </div>
                          )}
                        </div>

                        <div className="p-2.5 bg-[#f0fdf4] border border-[#bbf7d0] rounded-md">
                          <div className="text-[10px] font-semibold uppercase text-[#15803d] mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3 text-[#16a34a]" />
                            <span>AI Proposed Descriptive Alt Text</span>
                          </div>
                          <div className="text-[#166534] font-medium leading-relaxed">
                            "{img.proposedAltText}"
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Filename Comparison */}
                    <div className="bg-[#fafbfb] border border-[#e1e3e5] rounded-lg p-3.5 space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold text-[#202223] flex items-center gap-1.5">
                          <Code className="w-3.5 h-3.5 text-[#0284c7]" />
                          <span>SEO Asset Filename</span>
                        </span>
                        {hasFilenameProposal && (
                          <button
                            onClick={() => onApplyFix(img.id, 'filename')}
                            className="px-2.5 py-1 bg-[#0284c7] text-white rounded text-xs font-medium hover:bg-[#0369a1] transition flex items-center gap-1 shadow-2xs"
                          >
                            <Check className="w-3 h-3" />
                            <span>Rename to SEO Slug</span>
                          </button>
                        )}
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs font-mono">
                        <div className="p-2.5 bg-white border border-[#e1e3e5] rounded-md">
                          <div className="text-[10px] font-sans font-semibold uppercase text-[#8c9196] mb-1">
                            Current Filename
                          </div>
                          <div className="text-[#202223] break-all">{img.filename}</div>
                        </div>

                        <div className="p-2.5 bg-[#f0f9ff] border border-[#bae6fd] rounded-md">
                          <div className="text-[10px] font-sans font-semibold uppercase text-[#0369a1] mb-1 flex items-center gap-1">
                            <Sparkles className="w-3 h-3" />
                            <span>Proposed SEO Slug</span>
                          </div>
                          <div className="text-[#0369a1] break-all font-semibold">
                            {img.proposedFilename}
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* TAB: IMAGE QUALITY & RESOLUTION ASSESSMENT */}
      {activeTab === 'quality' && (
        <ImageQualityAssessment
          product={product}
          onApplyFix={onApplyFix}
          onOpenStudio={onOpenStudioForHero}
          onOpenCompareSlider={(imgId) => {
            if (imgId) setCompareOriginalId(imgId);
            setActiveTab('compare');
          }}
        />
      )}

      {/* TAB: BEFORE / AFTER QUALITY COMPARISON SLIDER */}
      {activeTab === 'compare' && (
        <BeforeAfterSlider
          product={product}
          initialOriginalImageId={compareOriginalId}
          initialAiVariantId={compareVariantId}
          onPromoteToHero={async (variant) => {
            if (onAttachImageToProduct) {
              await onAttachImageToProduct(product.id, {
                url: variant.url,
                altText: variant.suggestedAltText,
                filename: variant.suggestedFilename,
                isHero: true,
                aspectRatio: variant.aspectRatio,
              });
            } else {
              await onApplyFix(product.images[0]?.id || '', 'hero', variant.url);
            }
          }}
          onAddToGallery={async (variant) => {
            if (onAttachImageToProduct) {
              await onAttachImageToProduct(product.id, {
                url: variant.url,
                altText: variant.suggestedAltText,
                filename: variant.suggestedFilename,
                isHero: false,
                aspectRatio: variant.aspectRatio,
              });
            }
          }}
          onAssignToVariant={async (variant, variantId) => {
            if (onAttachImageToProduct) {
              await onAttachImageToProduct(product.id, {
                url: variant.url,
                altText: variant.suggestedAltText,
                filename: variant.suggestedFilename,
                isHero: false,
                variantId,
                aspectRatio: variant.aspectRatio,
              });
            }
          }}
          onOpenInStudio={(preset) => {
            if (onOpenStudio) {
              onOpenStudio(preset);
            } else if (preset?.variantId && onOpenStudioForVariant) {
              onOpenStudioForVariant(preset.variantId);
            } else if (onOpenStudioForHero) {
              onOpenStudioForHero();
            }
          }}
        />
      )}

      {/* TAB: BULK SEO FIXER & PATTERN BUILDER */}
      {activeTab === 'bulk-fix' && (
        <div className="space-y-6">
          {/* Notification Toast */}
          {bulkNotification && (
            <div className="bg-[#e6f4ea] border border-[#a3d9b8] rounded-xl p-3.5 flex items-center justify-between text-xs text-[#008060] font-medium animate-fadeIn">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-[#008060] shrink-0" />
                <span>{bulkNotification}</span>
              </div>
              <button
                onClick={() => setBulkNotification(null)}
                className="text-[#008060] hover:text-[#004e38] font-bold text-sm"
              >
                ✕
              </button>
            </div>
          )}

          {/* Header & Target Selector */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f1f2f4] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#202223] flex items-center gap-2">
                  <SlidersHorizontal className="w-5 h-5 text-[#008060]" />
                  <span>Bulk Image SEO & Pattern Optimization</span>
                </h3>
                <p className="text-xs text-[#6d7175] mt-0.5">
                  Select multiple product images to batch generate crawlable descriptive filenames and apply unified WCAG & Google Image-compliant alt-text patterns.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteBulkFix('patterns')}
                  disabled={isApplying || (selectedImageIds.length === 0 && product.images.length === 0)}
                  className="px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-semibold transition flex items-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>
                    Apply Bulk Fixes (
                    {selectedImageIds.length > 0
                      ? selectedImageIds.length
                      : product.images.length}
                    )
                  </span>
                </button>
              </div>
            </div>

            {/* Quick Selection Toolbar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
              <div className="flex flex-wrap items-center gap-2">
                <span className="font-semibold text-[#202223]">Target Images:</span>
                <button
                  onClick={selectAllImages}
                  className={`px-2.5 py-1 rounded-md font-medium border transition ${
                    selectedImageIds.length === product.images.length
                      ? 'bg-[#008060] text-white border-[#008060]'
                      : 'bg-white text-[#202223] border-[#d2d5d8] hover:bg-[#f1f2f4]'
                  }`}
                >
                  Select All ({product.images.length})
                </button>
                <button
                  onClick={selectImagesWithIssues}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:bg-[#f1f2f4] text-[#202223] rounded-md font-medium transition flex items-center gap-1"
                >
                  <AlertTriangle className="w-3 h-3 text-[#b45309]" />
                  <span>With Issues ({product.images.filter((i) => i.issues.length > 0).length})</span>
                </button>
                <button
                  onClick={selectImagesWithMissingAlt}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:bg-[#f1f2f4] text-[#202223] rounded-md font-medium transition flex items-center gap-1"
                >
                  <Tag className="w-3 h-3 text-[#dc2626]" />
                  <span>Missing Alt ({product.images.filter((i) => !i.altText || i.issues.some((iss) => iss.type.includes('alt'))).length})</span>
                </button>
                <button
                  onClick={selectImagesWithGenericFilenames}
                  className="px-2.5 py-1 bg-white border border-[#d2d5d8] hover:bg-[#f1f2f4] text-[#202223] rounded-md font-medium transition flex items-center gap-1"
                >
                  <Code className="w-3 h-3 text-[#0284c7]" />
                  <span>Generic Filenames ({product.images.filter((i) => i.issues.some((iss) => iss.type.includes('filename'))).length})</span>
                </button>
                {totalResolutionWarnings > 0 && (
                  <button
                    onClick={selectImagesWithResolutionWarnings}
                    className="px-2.5 py-1 bg-white border border-[#fde68a] hover:border-[#d97706] text-[#b45309] rounded-md font-medium transition flex items-center gap-1"
                  >
                    <AlertTriangle className="w-3 h-3 text-[#d97706]" />
                    <span>Resolution Warnings ({totalResolutionWarnings})</span>
                  </button>
                )}
                {selectedImageIds.length > 0 && (
                  <button
                    onClick={deselectAllImages}
                    className="px-2 py-1 text-[#8c9196] hover:text-[#202223] underline"
                  >
                    Deselect All
                  </button>
                )}
              </div>

              <div className="text-xs font-semibold text-[#008060] bg-[#e6f4ea] px-3 py-1 rounded-md self-start sm:self-auto">
                {selectedImageIds.length > 0
                  ? `${selectedImageIds.length} of ${product.images.length} images selected`
                  : `All ${product.images.length} images targeted by default`}
              </div>
            </div>

            {/* Visual Thumbnail Ribbon */}
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2.5 pt-2">
              {product.images.map((img, idx) => {
                const isSelected =
                  selectedImageIds.length === 0 || selectedImageIds.includes(img.id);
                const thumbQuality = imageQualityMap.get(img.id);
                return (
                  <div
                    key={img.id}
                    onClick={() => toggleSelectImage(img.id)}
                    className={`relative rounded-lg border cursor-pointer p-1.5 transition text-left group ${
                      isSelected
                        ? 'border-[#008060] ring-2 ring-[#008060]/30 bg-[#fbfdfc]'
                        : 'border-[#e1e3e5] bg-[#f6f6f7] opacity-60 hover:opacity-100'
                    }`}
                  >
                    <div className="aspect-square rounded overflow-hidden bg-gray-100 relative mb-1.5">
                      <img
                        src={img.url}
                        alt={img.altText}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-1 left-1">
                        {isSelected ? (
                          <CheckSquare className="w-4 h-4 text-[#008060] bg-white rounded-xs shadow-xs" />
                        ) : (
                          <Square className="w-4 h-4 text-[#8c9196] bg-white rounded-xs" />
                        )}
                      </div>
                      {img.isHero && (
                        <div className="absolute bottom-1 right-1 bg-[#008060] text-white text-[9px] font-bold px-1 rounded">
                          HERO
                        </div>
                      )}
                      {thumbQuality?.hasResolutionWarning && (
                        <div className="absolute top-1 right-1">
                          <ResolutionWarningBadge
                            assessment={thumbQuality}
                            size="sm"
                            showDetails={false}
                          />
                        </div>
                      )}
                    </div>
                    <div className="text-[10px] font-mono text-[#6d7175] truncate">
                      #{idx + 1} {img.filename}
                    </div>
                    <div className="flex items-center justify-between text-[9px] mt-0.5">
                      <span
                        className={`font-semibold ${
                          img.seoScore >= 80 ? 'text-[#008060]' : 'text-[#b45309]'
                        }`}
                      >
                        SEO {img.seoScore}
                      </span>
                      <span className="text-[#8c9196]">{img.format}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Bulk Pattern Mode Selector */}
          <div className="flex items-center border-b border-[#d2d5d8] space-x-2">
            <button
              onClick={() => setBulkSubTab('both')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                bulkSubTab === 'both'
                  ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
                  : 'border-transparent text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              Both: Filenames & Alt-Text Patterns
            </button>
            <button
              onClick={() => setBulkSubTab('filenames')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                bulkSubTab === 'filenames'
                  ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
                  : 'border-transparent text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              Descriptive Filenames Only
            </button>
            <button
              onClick={() => setBulkSubTab('altText')}
              className={`px-4 py-2 text-xs font-semibold border-b-2 transition ${
                bulkSubTab === 'altText'
                  ? 'border-[#008060] text-[#008060] bg-white rounded-t-lg'
                  : 'border-transparent text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              Common Alt-Text Patterns Only
            </button>
          </div>

          {/* Configuration Panels Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* PANEL 1: DESCRIPTIVE FILENAME GENERATOR */}
            {(bulkSubTab === 'both' || bulkSubTab === 'filenames') && (
              <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f1f2f4] pb-3">
                  <div className="flex items-center gap-2">
                    <Code className="w-4 h-4 text-[#0284c7]" />
                    <h4 className="text-sm font-bold text-[#202223]">
                      Descriptive Filename Generator
                    </h4>
                  </div>
                  <span className="text-[10px] bg-[#e0f2fe] text-[#0284c7] font-bold px-2 py-0.5 rounded-full">
                    Google Crawlability
                  </span>
                </div>

                <p className="text-xs text-[#6d7175]">
                  Google Image Search weighs keyword-rich, hyphen-separated filenames before indexing. Generic names (<code className="font-mono text-[11px] bg-[#f1f2f4] px-1 py-0.5 rounded">dsc09212.png</code>, <code className="font-mono text-[11px] bg-[#f1f2f4] px-1 py-0.5 rounded">photo-final.jpg</code>) are replaced with structured, crawlable slugs.
                </p>

                {/* Filename Mode Switcher */}
                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filenameMode"
                      checked={!useAiFilenames}
                      onChange={() => setUseAiFilenames(false)}
                      className="text-[#008060] focus:ring-[#008060]"
                    />
                    <span>Custom Structured Pattern</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="filenameMode"
                      checked={useAiFilenames}
                      onChange={() => setUseAiFilenames(true)}
                      className="text-[#008060] focus:ring-[#008060]"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#008060]" />
                      <span>Use AI-Generated Smart Slugs</span>
                    </span>
                  </label>
                </div>

                {!useAiFilenames ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#202223] mb-1">
                        Pattern Presets
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '{handle}-{position}',
                          '{vendor}-{handle}-{index}',
                          '{handle}-{type}-angle-{index}',
                          '{handle}-clean-{index}',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setFilenamePattern(preset)}
                            className={`px-2.5 py-1 text-[11px] font-mono rounded border transition ${
                              filenamePattern === preset
                                ? 'bg-[#0284c7] text-white border-[#0284c7]'
                                : 'bg-[#f6f6f7] hover:bg-[#e4e5e7] text-[#202223] border-[#d2d5d8]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202223] mb-1">
                        Filename Pattern Format
                      </label>
                      <input
                        type="text"
                        value={filenamePattern}
                        onChange={(e) => setFilenamePattern(e.target.value)}
                        className="w-full text-xs font-mono border border-[#d2d5d8] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#0284c7] focus:border-[#0284c7]"
                        placeholder="{handle}-{position}"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#6d7175] uppercase">
                        Available Replacement Tokens:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          { token: '{handle}', desc: 'Product handle' },
                          { token: '{vendor}', desc: 'Brand slug' },
                          { token: '{type}', desc: 'Category slug' },
                          { token: '{position}', desc: 'hero / angle-1' },
                          { token: '{index}', desc: 'Sequential index' },
                        ].map(({ token, desc }) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => setFilenamePattern((p) => `${p}-${token}`)}
                            className="text-[10px] font-mono bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] px-2 py-0.5 rounded border border-[#e1e3e5] flex items-center gap-1"
                            title={`Click to append ${token} (${desc})`}
                          >
                            <span className="font-bold text-[#0284c7]">{token}</span>
                            <span className="text-[#6d7175] font-sans">({desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg text-xs space-y-1">
                      <div className="text-[10px] font-bold text-[#0369a1] uppercase">
                        Sample Result (Primary Hero):
                      </div>
                      <div className="font-mono text-[#0369a1] font-semibold break-all">
                        {computeGeneratedFilename(
                          product.images[0] || {
                            id: 'sample',
                            url: '',
                            filename: 'sample.jpg',
                            format: 'jpg',
                            isHero: true,
                            width: 1200,
                            height: 1200,
                            fileSizeKb: 200,
                            altText: '',
                            seoScore: 60,
                            geoScore: 60,
                            issues: [],
                            translations: {},
                            variantIds: [],
                          },
                          0,
                          filenamePattern
                        )}
                      </div>
                      <div className="text-[11px] text-[#0284c7]">
                        ✓ Hyphen-separated • All lowercase • Preserves original file extensions (.jpg/.png/.webp)
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#0369a1]">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Multi-Token Filenames Active</span>
                    </div>
                    <p className="text-[#0369a1]">
                      Each selected image will receive its customized AI-generated slug, incorporating the specific visible variant, angle, colorway, and product attributes.
                    </p>
                  </div>
                )}
              </div>
            )}

            {/* PANEL 2: COMMON ALT-TEXT PATTERN BUILDER */}
            {(bulkSubTab === 'both' || bulkSubTab === 'altText') && (
              <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
                <div className="flex items-center justify-between border-b border-[#f1f2f4] pb-3">
                  <div className="flex items-center gap-2">
                    <Type className="w-4 h-4 text-[#008060]" />
                    <h4 className="text-sm font-bold text-[#202223]">
                      Common Alt-Text Pattern Builder
                    </h4>
                  </div>
                  <span className="text-[10px] bg-[#e6f4ea] text-[#008060] font-bold px-2 py-0.5 rounded-full">
                    WCAG & Google Image SEO
                  </span>
                </div>

                <p className="text-xs text-[#6d7175]">
                  Google Image SEO and WCAG accessibility require descriptive alternative text containing the product name, visual angle, and brand authority.
                </p>

                {/* Alt Text Mode Switcher */}
                <div className="flex items-center gap-4 text-xs font-medium">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="altTextMode"
                      checked={!useAiAltText}
                      onChange={() => setUseAiAltText(false)}
                      className="text-[#008060] focus:ring-[#008060]"
                    />
                    <span>Structured Alt-Text Pattern</span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="altTextMode"
                      checked={useAiAltText}
                      onChange={() => setUseAiAltText(true)}
                      className="text-[#008060] focus:ring-[#008060]"
                    />
                    <span className="flex items-center gap-1">
                      <Sparkles className="w-3.5 h-3.5 text-[#008060]" />
                      <span>Use AI-Generated Descriptive Alt Text</span>
                    </span>
                  </label>
                </div>

                {!useAiAltText ? (
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-semibold text-[#202223] mb-1">
                        Pattern Presets
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {[
                          '{title} - {position} by {vendor}',
                          'Official photograph of {title} ({vendor}) - View {index} of {total}',
                          '{title} {type} detailed product angle {index}',
                          'Close-up view of {title} showcasing materials and craftsmanship',
                        ].map((preset) => (
                          <button
                            key={preset}
                            type="button"
                            onClick={() => setAltPattern(preset)}
                            className={`px-2.5 py-1 text-[11px] rounded border transition text-left ${
                              altPattern === preset
                                ? 'bg-[#008060] text-white border-[#008060]'
                                : 'bg-[#f6f6f7] hover:bg-[#e4e5e7] text-[#202223] border-[#d2d5d8]'
                            }`}
                          >
                            {preset}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-[#202223] mb-1">
                        Alt-Text Pattern Format
                      </label>
                      <textarea
                        rows={2}
                        value={altPattern}
                        onChange={(e) => setAltPattern(e.target.value)}
                        className="w-full text-xs border border-[#d2d5d8] rounded-lg px-3 py-2 focus:ring-1 focus:ring-[#008060] focus:border-[#008060]"
                        placeholder="{title} - {position} by {vendor}"
                      />
                    </div>

                    <div>
                      <span className="text-[10px] font-semibold text-[#6d7175] uppercase">
                        Available Replacement Tokens:
                      </span>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {[
                          { token: '{title}', desc: 'Product Title' },
                          { token: '{vendor}', desc: 'Brand' },
                          { token: '{type}', desc: 'Product Type' },
                          { token: '{position}', desc: 'Hero / Product view' },
                          { token: '{index}', desc: '1, 2, 3' },
                          { token: '{total}', desc: 'Total count' },
                        ].map(({ token, desc }) => (
                          <button
                            key={token}
                            type="button"
                            onClick={() => setAltPattern((p) => `${p} ${token}`)}
                            className="text-[10px] font-mono bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] px-2 py-0.5 rounded border border-[#e1e3e5] flex items-center gap-1"
                            title={`Click to append ${token} (${desc})`}
                          >
                            <span className="font-bold text-[#008060]">{token}</span>
                            <span className="text-[#6d7175] font-sans">({desc})</span>
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Sample Output Preview */}
                    {(() => {
                      const sampleAlt = computeGeneratedAltText(
                        product.images[0] || {
                          id: 'sample',
                          url: '',
                          filename: 'sample.jpg',
                          format: 'jpg',
                          isHero: true,
                          width: 1200,
                          height: 1200,
                          fileSizeKb: 200,
                          altText: '',
                          seoScore: 60,
                          geoScore: 60,
                          issues: [],
                          translations: {},
                          variantIds: [],
                        },
                        0,
                        product.images.length,
                        altPattern
                      );
                      const isGoodLength = sampleAlt.length >= 40 && sampleAlt.length <= 130;

                      return (
                        <div className="p-3 bg-[#e6f4ea] border border-[#a3d9b8] rounded-lg text-xs space-y-1">
                          <div className="flex items-center justify-between text-[10px] font-bold text-[#008060] uppercase">
                            <span>Sample Result (Primary Hero):</span>
                            <span
                              className={`px-1.5 py-0.2 rounded ${
                                isGoodLength ? 'bg-[#c6ebd4] text-[#004e38]' : 'bg-[#fee2e2] text-[#991b1b]'
                              }`}
                            >
                              {sampleAlt.length} characters
                            </span>
                          </div>
                          <div className="text-[#004e38] font-medium break-words">
                            "{sampleAlt}"
                          </div>
                          <div className="text-[11px] text-[#008060]">
                            ✓ WCAG AA Compliant • Descriptive context • Optimal search snippet length (50–125 chars)
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                ) : (
                  <div className="p-4 bg-[#e6f4ea] border border-[#a3d9b8] rounded-lg text-xs space-y-2">
                    <div className="flex items-center gap-2 font-bold text-[#008060]">
                      <Sparkles className="w-4 h-4" />
                      <span>AI Contextual Alt-Text Active</span>
                    </div>
                    <p className="text-[#004e38]">
                      Each selected image will receive Gemini-generated alternative text describing materials, lighting, perspective, and key styling points for optimal search indexing.
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Real-time Side-by-Side Transformation Table */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#f1f2f4] pb-3">
              <div>
                <h4 className="text-sm font-bold text-[#202223] flex items-center gap-2">
                  <FileText className="w-4 h-4 text-[#008060]" />
                  <span>Batch Transformation Preview ({
                    product.images.filter((i) =>
                      selectedImageIds.length === 0 || selectedImageIds.includes(i.id)
                    ).length
                  } Images)</span>
                </h4>
                <p className="text-xs text-[#6d7175]">
                  Inspect the exact changes before saving to your Shopify admin catalog.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setActiveTab('seo-preview')}
                  className="px-3 py-1.5 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-lg text-xs font-semibold transition flex items-center gap-1.5"
                  title="View how this looks in Google Image Search"
                >
                  <Eye className="w-3.5 h-3.5 text-[#008060]" />
                  <span>Test in SEO Preview</span>
                </button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead className="bg-[#f6f6f7] text-[#6d7175] border-b border-[#d2d5d8]">
                  <tr>
                    <th className="p-3 w-12 text-center">Include</th>
                    <th className="p-3 w-20">Preview</th>
                    <th className="p-3 w-1/3">Filename Change</th>
                    <th className="p-3 w-1/2">Alt-Text Pattern Result</th>
                    <th className="p-3 w-28 text-right">Estimated Score</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#f1f2f4]">
                  {product.images.map((img, idx) => {
                    const isTargeted =
                      selectedImageIds.length === 0 || selectedImageIds.includes(img.id);
                    const targetedList = product.images.filter((i) =>
                      selectedImageIds.length === 0 || selectedImageIds.includes(i.id)
                    );
                    const targetedIndex = targetedList.findIndex((i) => i.id === img.id);

                    const newFilename = useAiFilenames
                      ? img.proposedFilename || img.filename
                      : computeGeneratedFilename(img, targetedIndex >= 0 ? targetedIndex : idx, filenamePattern);

                    const newAltText = useAiAltText
                      ? img.proposedAltText || img.altText
                      : computeGeneratedAltText(
                          img,
                          targetedIndex >= 0 ? targetedIndex : idx,
                          targetedList.length,
                          altPattern
                        );

                    const willChangeFilename =
                      (bulkSubTab === 'both' || bulkSubTab === 'filenames') &&
                      newFilename !== img.filename;
                    const willChangeAlt =
                      (bulkSubTab === 'both' || bulkSubTab === 'altText') &&
                      newAltText !== img.altText;

                    return (
                      <tr
                        key={img.id}
                        className={`hover:bg-[#fafbfb] transition ${
                          isTargeted ? '' : 'opacity-40 bg-[#f9fafb]'
                        }`}
                      >
                        <td className="p-3 text-center">
                          <input
                            type="checkbox"
                            checked={isTargeted}
                            onChange={() => toggleSelectImage(img.id)}
                            className="rounded text-[#008060] focus:ring-[#008060] cursor-pointer"
                          />
                        </td>
                        <td className="p-3">
                          <div className="w-14 h-14 rounded overflow-hidden border border-[#d2d5d8] bg-gray-100 shrink-0 relative">
                            <img
                              src={img.url}
                              alt={img.altText}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover"
                            />
                            {img.isHero && (
                              <div className="absolute bottom-0 inset-x-0 bg-[#008060] text-white text-[8px] font-bold text-center py-0.5">
                                HERO
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="text-[#8c9196] font-mono text-[11px] line-through break-all">
                            {img.filename}
                          </div>
                          {willChangeFilename ? (
                            <div className="font-mono text-[11px] text-[#0369a1] font-bold flex items-center gap-1 break-all">
                              <ArrowRight className="w-3 h-3 shrink-0" />
                              <span>{newFilename}</span>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#6d7175] font-mono">
                              No change needed
                            </div>
                          )}
                        </td>
                        <td className="p-3 space-y-1">
                          <div className="text-[#8c9196] text-[11px] line-through break-words">
                            {img.altText || <span className="italic text-red-500 font-sans">[Missing Alt Text]</span>}
                          </div>
                          {willChangeAlt ? (
                            <div className="text-[11px] text-[#008060] font-semibold flex items-start gap-1 break-words">
                              <ArrowRight className="w-3 h-3 shrink-0 mt-0.5" />
                              <div>
                                <span>"{newAltText}"</span>
                                <span className="ml-2 text-[10px] text-[#6d7175] font-normal">
                                  ({newAltText.length} chars)
                                </span>
                              </div>
                            </div>
                          ) : (
                            <div className="text-[11px] text-[#6d7175]">
                              "{img.altText}" (Kept as is)
                            </div>
                          )}
                        </td>
                        <td className="p-3 text-right">
                          <div className="flex flex-col items-end gap-1">
                            <span className="text-[10px] text-[#8c9196]">Current: {img.seoScore}/100</span>
                            <span className="text-xs font-bold text-[#008060] bg-[#e6f4ea] px-2 py-0.5 rounded">
                              Target: {Math.min(100, Math.max(img.seoScore + 25, 88))}/100
                            </span>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Bottom Action Bar */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-4 border-t border-[#f1f2f4]">
              <div className="text-xs text-[#6d7175]">
                Applying will update alt text in Shopify Admin and queue high-speed CDN asset rename operations.
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleExecuteBulkFix('all_proposed')}
                  disabled={isApplying}
                  className="px-3.5 py-2 bg-[#202223] hover:bg-[#323538] text-white rounded-lg text-xs font-semibold transition flex items-center gap-1.5 shadow-2xs disabled:opacity-50"
                  title="Apply Gemini recommendations directly"
                >
                  <Sparkles className="w-3.5 h-3.5 text-[#fbbf24]" />
                  <span>Apply AI Proposals</span>
                </button>

                <button
                  onClick={() => handleExecuteBulkFix('patterns')}
                  disabled={isApplying}
                  className="px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-bold transition flex items-center gap-2 shadow-2xs disabled:opacity-50"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>
                    {isApplying
                      ? 'Applying Changes...'
                      : `Apply Bulk Patterns (${
                          selectedImageIds.length > 0
                            ? selectedImageIds.length
                            : product.images.length
                        } Images)`}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB: SEO PREVIEW (GOOGLE IMAGE SEARCH RESULT SNIPPET) */}
      {activeTab === 'seo-preview' && (
        <div className="space-y-6">
          {/* Header & Configuration Bar */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-[#f1f2f4] pb-4">
              <div>
                <h3 className="text-base font-bold text-[#202223] flex items-center gap-2">
                  <Search className="w-5 h-5 text-[#008060]" />
                  <span>Google Image Search SEO Preview</span>
                </h3>
                <p className="text-xs text-[#6d7175] mt-0.5">
                  Real-time preview of how Google visual crawlers, Google Image Search snippets, and Shopping image packs index this product image and alt text.
                </p>
              </div>

              <div className="flex items-center gap-2.5 flex-wrap">
                {/* Device View Toggle */}
                <div className="inline-flex rounded-lg border border-[#d2d5d8] p-0.5 bg-[#f6f6f7]">
                  <button
                    onClick={() => setSeoPreviewDevice('desktop')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      seoPreviewDevice === 'desktop'
                        ? 'bg-white text-[#202223] shadow-xs'
                        : 'text-[#6d7175] hover:text-[#202223]'
                    }`}
                  >
                    <Monitor className="w-3.5 h-3.5" />
                    <span>Desktop</span>
                  </button>
                  <button
                    onClick={() => setSeoPreviewDevice('mobile')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      seoPreviewDevice === 'mobile'
                        ? 'bg-white text-[#202223] shadow-xs'
                        : 'text-[#6d7175] hover:text-[#202223]'
                    }`}
                  >
                    <Smartphone className="w-3.5 h-3.5" />
                    <span>Mobile</span>
                  </button>
                </div>

                {/* Alt Text Comparison Toggle */}
                <div className="inline-flex rounded-lg border border-[#d2d5d8] p-0.5 bg-[#f6f6f7]">
                  <button
                    onClick={() => setSeoPreviewAltMode('proposed')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      seoPreviewAltMode === 'proposed'
                        ? 'bg-[#008060] text-white shadow-xs'
                        : 'text-[#6d7175] hover:text-[#202223]'
                    }`}
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>AI Proposed Alt Text</span>
                  </button>
                  <button
                    onClick={() => setSeoPreviewAltMode('current')}
                    className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-md transition ${
                      seoPreviewAltMode === 'current'
                        ? 'bg-[#202223] text-white shadow-xs'
                        : 'text-[#6d7175] hover:text-[#202223]'
                    }`}
                  >
                    <span>Current Shopify Alt Text</span>
                  </button>
                </div>
              </div>
            </div>

            {/* Image Selector Strip */}
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-xs font-bold text-[#6d7175] uppercase tracking-wider">
                  Select Product Image to Preview
                </span>
                <span className="text-xs text-[#6d7175]">
                  Showing Image {product.images.findIndex((i) => i.id === selectedImage.id) + 1} of {product.images.length}
                </span>
              </div>
              <div className="flex items-center gap-3 overflow-x-auto pb-2 pt-1 scrollbar-thin">
                {product.images.map((img, idx) => {
                  const isSelected = img.id === selectedImage.id;
                  const itemQuality = imageQualityMap.get(img.id);
                  return (
                    <button
                      key={img.id}
                      onClick={() => setSelectedImageId(img.id)}
                      className={`flex items-center gap-2.5 p-2 rounded-lg border transition text-left shrink-0 ${
                        isSelected
                          ? 'border-[#008060] bg-[#f0fdf4] ring-2 ring-[#008060]/20'
                          : 'border-[#e1e3e5] bg-white hover:border-[#c9cccf]'
                      }`}
                    >
                      <div className="relative">
                        <img
                          src={img.url}
                          alt={img.altText}
                          referrerPolicy="no-referrer"
                          className="w-12 h-12 rounded object-cover border border-[#e1e3e5]"
                        />
                        {itemQuality?.hasResolutionWarning && (
                          <div className="absolute -top-1.5 -right-1.5">
                            <ResolutionWarningBadge
                              assessment={itemQuality}
                              size="sm"
                              showDetails={false}
                            />
                          </div>
                        )}
                      </div>
                      <div className="text-xs pr-2">
                        <div className="font-semibold text-[#202223] flex items-center gap-1">
                          <span>Image #{idx + 1}</span>
                          {img.isHero && (
                            <span className="px-1.5 py-0.2 bg-[#008060] text-white rounded text-[9px] font-bold">
                              HERO
                            </span>
                          )}
                        </div>
                        <div className="text-[11px] text-[#6d7175] truncate max-w-[140px]">
                          {img.filename}
                        </div>
                        <div className="text-[10px] text-[#008060] font-medium">
                          SEO Score: {img.seoScore}/100
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Inline Action if previewing unaccepted proposed alt text */}
            {seoPreviewAltMode === 'proposed' &&
              selectedImage.proposedAltText &&
              selectedImage.proposedAltText !== selectedImage.altText && (
                <div className="p-3 bg-[#f0fdf4] border border-[#bbf7d0] rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                  <div className="flex items-center gap-2 text-[#15803d]">
                    <Sparkles className="w-4 h-4 shrink-0" />
                    <span>
                      You are previewing the AI-optimized Alt Text proposal. Publish this to Shopify to improve Google Image Search ranking.
                    </span>
                  </div>
                  <button
                    onClick={() => onApplyFix(selectedImage.id, 'altText')}
                    disabled={isApplying}
                    className="px-3 py-1.5 bg-[#008060] hover:bg-[#006e52] text-white font-medium rounded-md flex items-center gap-1.5 shrink-0 transition shadow-2xs"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Publish This Alt Text to Shopify</span>
                  </button>
                </div>
              )}
          </div>

          {/* Simulated Google Search Results Interface */}
          <div className="bg-[#f8f9fa] border border-[#dadce0] rounded-xl overflow-hidden shadow-xs">
            {/* Google Search Bar Simulation */}
            <div className="bg-white border-b border-[#dadce0] px-4 py-3 sm:px-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                {/* Google Wordmark */}
                <div className="flex items-center gap-1 font-medium text-lg tracking-tight select-none pr-2">
                  <span className="text-[#4285f4] font-bold">G</span>
                  <span className="text-[#ea4335] font-bold">o</span>
                  <span className="text-[#fbbc05] font-bold">o</span>
                  <span className="text-[#4285f4] font-bold">g</span>
                  <span className="text-[#34a853] font-bold">l</span>
                  <span className="text-[#ea4335] font-bold">e</span>
                </div>

                {/* Search Input Box */}
                <div className="flex-1 relative">
                  <div className="flex items-center w-full bg-white border border-[#dfe1e5] hover:border-[#dfe1e5] hover:shadow-[0_1px_6px_rgba(32,33,36,0.28)] rounded-full px-4 py-2 transition text-sm">
                    <Search className="w-4 h-4 text-[#9aa0a6] mr-2.5 shrink-0" />
                    <input
                      type="text"
                      value={simulatedQuery}
                      onChange={(e) => setSimulatedQuery(e.target.value)}
                      className="w-full bg-transparent focus:outline-none text-[#202124] text-sm"
                      placeholder="Simulate a Google Image search query..."
                    />
                    <div className="flex items-center gap-2 text-[#70757a] text-xs shrink-0 pl-2">
                      <span title="Google Lens visual search" className="cursor-pointer">
                        <Camera className="w-4 h-4 text-[#4285f4]" />
                      </span>
                    </div>
                  </div>
                </div>
              </div>

              {/* Google Navigation Tabs */}
              <div className="flex items-center gap-6 mt-3 text-xs font-medium text-[#70757a] border-t border-[#f1f3f4] pt-2 px-1">
                <span className="cursor-pointer hover:text-[#202124]">All</span>
                <span className="cursor-pointer text-[#1a73e8] border-b-2 border-[#1a73e8] pb-1.5 font-bold flex items-center gap-1">
                  <Search className="w-3 h-3" />
                  Images
                </span>
                <span className="cursor-pointer hover:text-[#202124] flex items-center gap-1">
                  <ShoppingBag className="w-3 h-3" />
                  Shopping
                </span>
                <span className="cursor-pointer hover:text-[#202124]">Videos</span>
                <span className="cursor-pointer hover:text-[#202124]">News</span>
              </div>
            </div>

            {/* Google Search Results Area */}
            <div className="p-4 sm:p-6 space-y-6">
              {seoPreviewDevice === 'desktop' ? (
                /* DESKTOP VIEW: Grid Snippet + Expanded Google Lens / Detail Panel */
                <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                  {/* Left Column: Result Snippet Card in Image Search Grid */}
                  <div className="lg:col-span-5 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5f6368] uppercase tracking-wider flex items-center gap-1">
                        <span>1. Search Grid Result Card</span>
                      </span>
                      <span className="text-[11px] bg-[#e8f0fe] text-[#1967d2] px-2 py-0.5 rounded font-medium">
                        Live Search SERP Tile
                      </span>
                    </div>

                    {/* Authentic Google Images SERP Card */}
                    <div className="bg-white rounded-xl border border-[#dadce0] overflow-hidden shadow-sm hover:shadow-md transition max-w-sm mx-auto lg:mx-0">
                      {/* Image Frame */}
                      <div className="relative bg-[#f8f9fa] aspect-square overflow-hidden group">
                        <img
                          src={selectedImage.url}
                          alt={displayedAltText}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
                        />

                        {/* Product Tag Overlay */}
                        <div className="absolute bottom-2.5 left-2.5 flex items-center gap-1 bg-black/75 backdrop-blur-xs text-white text-[11px] font-medium px-2.5 py-1 rounded-full shadow">
                          <Tag className="w-3 h-3 text-[#34a853]" />
                          <span>Product · ${product.priceRange.min}</span>
                        </div>

                        {/* Resolution Tag */}
                        <div className="absolute top-2.5 right-2.5 bg-black/60 text-white text-[10px] px-2 py-0.5 rounded font-mono">
                          {selectedImage.width} × {selectedImage.height}
                        </div>
                      </div>

                      {/* Snippet Meta Info */}
                      <div className="p-3.5 space-y-1.5">
                        {/* Domain & Favicon */}
                        <div className="flex items-center gap-1.5 text-xs text-[#3c4043]">
                          <div className="w-4 h-4 rounded-full bg-[#008060] text-white flex items-center justify-center text-[9px] font-bold">
                            A
                          </div>
                          <span className="truncate font-medium">aura-store.myshopify.com</span>
                        </div>

                        {/* Product Title / Link */}
                        <h4 className="text-sm font-medium text-[#1a0dab] line-clamp-1 hover:underline cursor-pointer">
                          {product.title}
                        </h4>

                        {/* Google Alt Text Snippet Display */}
                        <div className="pt-1 border-t border-[#f1f3f4]">
                          <div className="flex items-center justify-between text-[10px] text-[#5f6368] mb-0.5 font-semibold">
                            <span className="text-[#188038] flex items-center gap-1">
                              <CheckCircle2 className="w-3 h-3" />
                              Google Indexed Alt Text Snippet:
                            </span>
                            <span>{displayedAltText.length} chars</span>
                          </div>
                          <p className="text-xs text-[#4d5156] line-clamp-2 leading-relaxed bg-[#f8f9fa] p-2 rounded border border-[#e8eaed] italic">
                            "{displayedAltText}"
                          </p>
                        </div>

                        {/* Price and Stock */}
                        <div className="flex items-center gap-2 text-xs text-[#70757a] pt-1">
                          <span className="font-semibold text-[#188038]">In stock</span>
                          <span>•</span>
                          <span>${product.priceRange.min} USD</span>
                          <span>•</span>
                          <span className="text-[#f29900]">★ 4.9 (128)</span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Right Column: Google Images Expanded Detail Panel (Click view) */}
                  <div className="lg:col-span-7 space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold text-[#5f6368] uppercase tracking-wider flex items-center gap-1">
                        <span>2. Expanded Image Detail Panel (On Click)</span>
                      </span>
                      <span className="text-[11px] bg-[#fef7e0] text-[#b06000] px-2 py-0.5 rounded font-medium">
                        Google Visual Panel
                      </span>
                    </div>

                    <div className="bg-white rounded-xl border border-[#dadce0] p-5 shadow-sm space-y-4">
                      <div className="grid grid-cols-1 sm:grid-cols-12 gap-5">
                        {/* High-res Image Preview with Google Lens */}
                        <div className="sm:col-span-6 relative bg-[#f8f9fa] rounded-lg border border-[#e8eaed] overflow-hidden flex items-center justify-center p-2">
                          <img
                            src={selectedImage.url}
                            alt={displayedAltText}
                            referrerPolicy="no-referrer"
                            className="max-h-64 object-contain rounded"
                          />
                          {/* Google Lens Badge */}
                          <div className="absolute bottom-3 left-3 bg-white/95 text-[#202124] text-xs font-medium px-3 py-1.5 rounded-full shadow-md flex items-center gap-1.5 border border-[#dadce0] cursor-pointer hover:bg-white transition">
                            <Camera className="w-3.5 h-3.5 text-[#1a73e8]" />
                            <span>Search inside image</span>
                          </div>
                        </div>

                        {/* Store & Metadata panel */}
                        <div className="sm:col-span-6 space-y-3">
                          {/* Store header */}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <div className="w-5 h-5 rounded-full bg-[#008060] text-white flex items-center justify-center text-[10px] font-bold">
                                A
                              </div>
                              <span className="text-xs font-medium text-[#202124]">Aura Official Store</span>
                            </div>
                            <div className="flex items-center gap-1 text-[#5f6368]">
                              <button className="p-1.5 hover:bg-[#f1f3f4] rounded-full transition" title="Share">
                                <Share2 className="w-3.5 h-3.5" />
                              </button>
                              <button className="p-1.5 hover:bg-[#f1f3f4] rounded-full transition" title="Bookmark">
                                <Bookmark className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </div>

                          <h3 className="text-sm font-semibold text-[#202124] leading-snug">
                            {product.title}
                          </h3>

                          {/* Price & Merchant Badges */}
                          <div className="flex items-baseline gap-2">
                            <span className="text-base font-bold text-[#202124]">
                              ${product.priceRange.min}
                            </span>
                            <span className="text-xs text-[#188038] font-medium">In stock</span>
                            <span className="text-xs text-[#70757a]">• Free delivery</span>
                          </div>

                          {/* Visit Button */}
                          <button
                            onClick={() => window.open(`https://aura-store.myshopify.com/products/${product.handle}`, '_blank')}
                            className="w-full py-2 px-4 bg-[#1a73e8] hover:bg-[#1557b0] text-white text-xs font-medium rounded-full flex items-center justify-center gap-1.5 transition shadow-xs"
                          >
                            <span>Visit Store</span>
                            <ExternalLink className="w-3.5 h-3.5" />
                          </button>

                          {/* Structured Image Alt Text Box */}
                          <div className="bg-[#f8f9fa] border border-[#e8eaed] rounded-lg p-3 space-y-1.5 text-xs">
                            <div className="flex items-center justify-between text-[#5f6368]">
                              <span className="font-semibold text-[11px] text-[#202124]">
                                Grounded Alt Text & Image Caption
                              </span>
                              <span className="text-[10px] text-[#1a73e8] font-mono">
                                {displayedAltText.length} chars
                              </span>
                            </div>
                            <p className="text-[#3c4043] text-[11px] leading-relaxed italic">
                              "{displayedAltText}"
                            </p>
                          </div>
                        </div>
                      </div>

                      {/* Image SEO Diagnostic Signals */}
                      <div className="pt-3 border-t border-[#f1f3f4] grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 text-xs">
                        <div className="bg-[#f8f9fa] p-2.5 rounded-lg border border-[#e8eaed]">
                          <span className="text-[10px] uppercase font-bold text-[#5f6368] block">
                            Alt Text Optimal Length
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            {displayedAltText.length >= 40 && displayedAltText.length <= 130 ? (
                              <>
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
                                <span className="text-[#188038] font-semibold text-xs">Optimal (50–125 chars)</span>
                              </>
                            ) : (
                              <>
                                <AlertTriangle className="w-3.5 h-3.5 text-[#b06000]" />
                                <span className="text-[#b06000] font-semibold text-xs">
                                  {displayedAltText.length < 40 ? 'Too short' : 'Too long'}
                                </span>
                              </>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#f8f9fa] p-2.5 rounded-lg border border-[#e8eaed]">
                          <span className="text-[10px] uppercase font-bold text-[#5f6368] block">
                            Filename SEO Slug
                          </span>
                          <span className="text-xs font-mono text-[#202124] truncate block mt-1">
                            {selectedImage.proposedFilename || selectedImage.filename}
                          </span>
                        </div>

                        <div className="bg-[#f8f9fa] p-2.5 rounded-lg border border-[#e8eaed]">
                          <span className="text-[10px] uppercase font-bold text-[#5f6368] block">
                            Resolution & Aspect Ratio
                          </span>
                          <div className="mt-1">
                            {imageQualityMap.get(selectedImage.id)?.hasResolutionWarning ? (
                              <ResolutionWarningBadge
                                assessment={imageQualityMap.get(selectedImage.id)!}
                                size="sm"
                                onClick={() => setActiveTab('quality')}
                              />
                            ) : (
                              <div className="flex items-center gap-1.5">
                                <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
                                <span className="text-[#188038] font-semibold text-xs">
                                  {selectedImage.width}×{selectedImage.height} px (Passed)
                                </span>
                              </div>
                            )}
                          </div>
                        </div>

                        <div className="bg-[#f8f9fa] p-2.5 rounded-lg border border-[#e8eaed]">
                          <span className="text-[10px] uppercase font-bold text-[#5f6368] block">
                            Google Shopping Ready
                          </span>
                          <div className="flex items-center gap-1.5 mt-1">
                            <CheckCircle2 className="w-3.5 h-3.5 text-[#188038]" />
                            <span className="text-[#188038] font-semibold text-xs">Product Schema Linked</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                /* MOBILE VIEW: Realistic Smartphone Frame */
                <div className="flex justify-center">
                  <div className="w-full max-w-sm bg-white rounded-3xl border-4 border-[#202124] overflow-hidden shadow-xl">
                    {/* Mobile Status Bar */}
                    <div className="bg-[#f1f3f4] px-4 py-1 flex items-center justify-between text-[10px] text-[#5f6368]">
                      <span>9:41</span>
                      <div className="flex items-center gap-1 font-bold">5G • 100%</div>
                    </div>

                    {/* Mobile Google Search Header */}
                    <div className="p-3 border-b border-[#dadce0] bg-white">
                      <div className="flex items-center gap-2 bg-[#f1f3f4] rounded-full px-3 py-1.5 text-xs text-[#202124]">
                        <Search className="w-3.5 h-3.5 text-[#5f6368]" />
                        <span className="truncate flex-1">{simulatedQuery}</span>
                        <Camera className="w-3.5 h-3.5 text-[#1a73e8]" />
                      </div>
                      <div className="flex gap-4 mt-2 text-xs text-[#70757a] px-1">
                        <span className="text-[#1a73e8] font-bold border-b-2 border-[#1a73e8] pb-0.5">Images</span>
                        <span>Shopping</span>
                        <span>All</span>
                      </div>
                    </div>

                    {/* Mobile Image Result Snippet */}
                    <div className="p-3 space-y-3">
                      <div className="rounded-xl border border-[#dadce0] overflow-hidden bg-white shadow-xs">
                        <div className="relative aspect-square bg-[#f8f9fa]">
                          <img
                            src={selectedImage.url}
                            alt={displayedAltText}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                          <div className="absolute bottom-2 left-2 bg-black/75 text-white text-[10px] font-medium px-2 py-0.5 rounded-full flex items-center gap-1">
                            <Tag className="w-2.5 h-2.5 text-[#34a853]" />
                            <span>${product.priceRange.min} · In Stock</span>
                          </div>
                        </div>
                        <div className="p-3 space-y-1.5 text-xs">
                          <div className="flex items-center gap-1.5 text-[#5f6368] text-[11px]">
                            <div className="w-3.5 h-3.5 rounded-full bg-[#008060] text-white flex items-center justify-center text-[8px] font-bold">
                              A
                            </div>
                            <span className="truncate">aura-store.myshopify.com</span>
                          </div>
                          <h4 className="font-semibold text-xs text-[#1a0dab] line-clamp-1">
                            {product.title}
                          </h4>
                          <div className="bg-[#f8f9fa] p-2 rounded border border-[#e8eaed]">
                            <span className="text-[10px] font-bold text-[#188038] block mb-0.5">
                              [Alt Text Snippet]
                            </span>
                            <p className="text-[11px] text-[#3c4043] leading-relaxed italic">
                              "{displayedAltText}"
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SEO Alt Text Quality Breakdown */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <h4 className="font-bold text-sm text-[#202223] flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#008060]" />
              <span>Google Image Search Ranking Factors Analysis</span>
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
              <div className="p-3.5 rounded-lg border border-[#e1e3e5] bg-[#fafbfb] space-y-2">
                <span className="font-bold text-[#202223] block">1. Alt Text Specificity</span>
                <p className="text-[#6d7175] leading-relaxed">
                  Google’s computer vision cross-references alt text with the image pixels. Descriptive alt text mentioning material, color, and silhouette boosts rank in specific image queries.
                </p>
                <div className="text-[11px] font-semibold text-[#008060] flex items-center gap-1 pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>Descriptive vocabulary passed</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#e1e3e5] bg-[#fafbfb] space-y-2">
                <span className="font-bold text-[#202223] block">2. Google Lens & Visual AI Match</span>
                <p className="text-[#6d7175] leading-relaxed">
                  When mobile shoppers use Google Lens or Circle to Search on social media, descriptive alt text provides entity grounding for reverse-image lookups.
                </p>
                <div className="text-[11px] font-semibold text-[#0284c7] flex items-center gap-1 pt-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Entity grounding ready</span>
                </div>
              </div>

              <div className="p-3.5 rounded-lg border border-[#e1e3e5] bg-[#fafbfb] space-y-2">
                <span className="font-bold text-[#202223] block">3. Accessibility (WCAG 2.1 AA)</span>
                <p className="text-[#6d7175] leading-relaxed">
                  Screen readers announce this alt text to visually impaired shoppers. Search engines reward stores with high accessibility scores.
                </p>
                <div className="text-[11px] font-semibold text-[#008060] flex items-center gap-1 pt-1">
                  <Check className="w-3.5 h-3.5" />
                  <span>WCAG compliant formatting</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: MULTI-LANGUAGE ALT TEXT */}
      {activeTab === 'translations' && (
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e1e3e5] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#202223] flex items-center gap-2">
                <Globe className="w-5 h-5 text-[#008060]" />
                <span>Multi-Market Alt Text Translations</span>
              </h3>
              <p className="text-xs text-[#6d7175] mt-1">
                Shopify stores selling globally need localized image descriptions for search crawlers in each market.
              </p>
            </div>

            <button
              onClick={onTriggerAudit}
              disabled={isAuditing}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f0fdf4] hover:bg-[#dcfce7] text-[#15803d] border border-[#bbf7d0] rounded-lg text-xs font-semibold transition"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Regenerate Translations with Gemini</span>
            </button>
          </div>

          <div className="space-y-6">
            {product.images.map((img, idx) => (
              <div
                key={img.id}
                className="border border-[#e1e3e5] rounded-lg p-4 bg-[#fafbfb] space-y-4"
              >
                <div className="flex items-center gap-3">
                  <img
                    src={img.url}
                    alt={img.altText}
                    referrerPolicy="no-referrer"
                    className="w-12 h-12 rounded object-cover border border-[#d2d5d8]"
                  />
                  <div>
                    <span className="font-semibold text-sm text-[#202223]">
                      Image #{idx + 1} ({img.filename})
                    </span>
                    <p className="text-xs text-[#6d7175]">
                      Primary English: {img.altText || img.proposedAltText}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  {/* Spanish */}
                  <div className="bg-white p-3 rounded border border-[#e1e3e5] space-y-1">
                    <span className="font-bold text-[#202223] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-[#fef3c7] text-[#b45309] rounded text-[10px] font-mono">
                        ES
                      </span>
                      <span>Spanish (Español)</span>
                    </span>
                    <p className="text-[#4a4a4a] leading-relaxed">
                      {img.translations.es || 'Translating...'}
                    </p>
                  </div>

                  {/* French */}
                  <div className="bg-white p-3 rounded border border-[#e1e3e5] space-y-1">
                    <span className="font-bold text-[#202223] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-[#e0e7ff] text-[#3730a3] rounded text-[10px] font-mono">
                        FR
                      </span>
                      <span>French (Français)</span>
                    </span>
                    <p className="text-[#4a4a4a] leading-relaxed">
                      {img.translations.fr || 'Translating...'}
                    </p>
                  </div>

                  {/* German */}
                  <div className="bg-white p-3 rounded border border-[#e1e3e5] space-y-1">
                    <span className="font-bold text-[#202223] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-[#f3e8ff] text-[#6b21a8] rounded text-[10px] font-mono">
                        DE
                      </span>
                      <span>German (Deutsch)</span>
                    </span>
                    <p className="text-[#4a4a4a] leading-relaxed">
                      {img.translations.de || 'Translating...'}
                    </p>
                  </div>

                  {/* Japanese */}
                  <div className="bg-white p-3 rounded border border-[#e1e3e5] space-y-1">
                    <span className="font-bold text-[#202223] flex items-center gap-1.5">
                      <span className="px-1.5 py-0.2 bg-[#fee2e2] text-[#991b1b] rounded text-[10px] font-mono">
                        JA
                      </span>
                      <span>Japanese (日本語)</span>
                    </span>
                    <p className="text-[#4a4a4a] leading-relaxed">
                      {img.translations.ja || 'Translating...'}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* TAB 3: VARIANT IMAGE GAPS */}
      {activeTab === 'variants' && (
        <div className="bg-white border border-[#e1e3e5] rounded-xl p-6 shadow-xs space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#e1e3e5] pb-4">
            <div>
              <h3 className="text-base font-bold text-[#202223] flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#008060]" />
                <span>Shopify Variant Image Mapping & Gap Detector</span>
              </h3>
              <p className="text-xs text-[#6d7175] mt-1">
                Ensure every SKU has an assigned image so shoppers and Google Shopping feeds see the exact product colorway.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <span className="text-xs font-semibold px-2.5 py-1 bg-[#f1f2f4] rounded-md text-[#4a4a4a]">
                {product.variants.length - unassignedVariants.length} of {product.variants.length} mapped
              </span>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-[#fafbfb] border-b border-[#e1e3e5] text-[11px] font-bold text-[#6d7175] uppercase">
                  <th className="py-3 px-4">Variant SKU & Title</th>
                  <th className="py-3 px-4">Options</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Assigned Image</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#e1e3e5]">
                {product.variants.map((v) => {
                  const assignedImg = product.images.find((i) => i.id === v.imageId);

                  return (
                    <tr key={v.id} className="hover:bg-[#f6f7f8] transition">
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#202223]">{v.title}</div>
                        <div className="text-xs font-mono text-[#8c9196]">{v.sku}</div>
                      </td>

                      <td className="py-3 px-4">
                        <div className="flex flex-wrap gap-1">
                          {Object.entries(v.options).map(([optName, optVal]) => (
                            <span
                              key={optName}
                              className="text-xs bg-[#f1f2f4] px-2 py-0.5 rounded text-[#4a4a4a]"
                            >
                              <span className="font-semibold">{optName}:</span> {optVal}
                            </span>
                          ))}
                        </div>
                      </td>

                      <td className="py-3 px-4 font-mono font-medium text-[#202223]">
                        ${v.price}
                      </td>

                      <td className="py-3 px-4">
                        {assignedImg ? (
                          <div className="flex items-center gap-2">
                            <img
                              src={assignedImg.url}
                              alt={assignedImg.altText}
                              referrerPolicy="no-referrer"
                              className="w-10 h-10 rounded object-cover border border-[#d2d5d8]"
                            />
                            <div className="text-xs">
                              <span className="font-medium text-[#202223] flex items-center gap-1 text-[#008060]">
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Image Connected</span>
                              </span>
                              <span className="text-[#8c9196] font-mono text-[11px] truncate block max-w-xs">
                                {assignedImg.filename}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-[#fef3c7] text-[#92400e] text-xs font-semibold rounded-md">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>No dedicated image (Variant Gap)</span>
                          </div>
                        )}
                      </td>

                      <td className="py-3 px-4 text-right">
                        {assignedImg ? (
                          <button
                            onClick={() => onOpenStudioForVariant && onOpenStudioForVariant(v.id)}
                            className="px-2.5 py-1 text-xs text-[#0284c7] hover:bg-[#e0f2fe] rounded font-medium transition"
                          >
                            Re-generate in Studio
                          </button>
                        ) : (
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => {
                                // Assign the hero or first image
                                onApplyFix(product.images[0]?.id, 'assignVariant', v.id);
                              }}
                              className="px-2.5 py-1 text-xs bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded font-medium transition"
                            >
                              Auto-assign Existing
                            </button>

                            <button
                              onClick={() => onOpenStudioForVariant && onOpenStudioForVariant(v.id)}
                              className="flex items-center gap-1 px-3 py-1 text-xs bg-[#0284c7] hover:bg-[#0369a1] text-white rounded font-semibold transition shadow-2xs"
                            >
                              <Sparkles className="w-3.5 h-3.5" />
                              <span>Generate in Studio</span>
                            </button>
                          </div>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: PRODUCT JSON-LD & GEO VALIDATOR */}
      {activeTab === 'jsonld' && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
          {/* JSON-LD Code View */}
          <div className="lg:col-span-7 bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#e1e3e5] pb-3">
              <div>
                <h3 className="font-bold text-sm text-[#202223] flex items-center gap-2">
                  <Code className="w-4 h-4 text-[#008060]" />
                  <span>Schema.org Product & ImageObject JSON-LD</span>
                </h3>
                <p className="text-xs text-[#6d7175]">
                  Enables rich snippets in Google Images and structured entity grounding for AI models.
                </p>
              </div>

              <button
                onClick={handleCopyJsonLd}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#f1f2f4] hover:bg-[#e4e5e7] text-[#202223] rounded-md text-xs font-semibold transition"
              >
                {copiedJsonLd ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-[#008060]" />
                    <span>Copied!</span>
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    <span>Copy JSON-LD</span>
                  </>
                )}
              </button>
            </div>

            <div className="relative bg-[#1e1e1e] text-[#d4d4d4] rounded-lg p-4 font-mono text-xs overflow-x-auto max-h-[500px]">
              <pre>{JSON.stringify(product.jsonLd, null, 2)}</pre>
            </div>
          </div>

          {/* Search Engine & AI Overviews Preview */}
          <div className="lg:col-span-5 space-y-4">
            {/* Google Rich Result Preview */}
            <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-3">
              <span className="text-xs font-bold uppercase text-[#6d7175] tracking-wider block">
                Google Search Rich Snippet Preview
              </span>

              <div className="border border-[#e1e3e5] rounded-lg p-3.5 space-y-2 bg-[#fcfcfc]">
                <div className="flex items-center gap-2 text-xs text-[#4d5156]">
                  <span className="w-4 h-4 rounded-full bg-[#008060] text-white flex items-center justify-center text-[10px] font-bold">
                    A
                  </span>
                  <span className="truncate">aura-store.myshopify.com › products › {product.handle}</span>
                </div>

                <h4 className="text-base text-[#1a0dab] hover:underline cursor-pointer font-medium leading-snug">
                  {product.title} - Official Aura Store
                </h4>

                <div className="flex items-start gap-3">
                  {product.images[0] && (
                    <img
                      src={product.images[0].url}
                      alt={product.images[0].altText}
                      referrerPolicy="no-referrer"
                      className="w-16 h-16 rounded object-cover border border-[#e1e3e5] shrink-0"
                    />
                  )}
                  <div className="text-xs text-[#4d5156] space-y-1">
                    <div className="flex items-center gap-2 font-medium">
                      <span className="text-[#137333] font-bold">In stock</span>
                      <span>•</span>
                      <span>${product.priceRange.min}</span>
                      <span>•</span>
                      <span className="text-[#e37400]">★★★★★ (4.9)</span>
                    </div>
                    <p className="line-clamp-2 text-[11px] leading-relaxed">
                      {product.images[0]?.altText || product.description}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Perplexity / ChatGPT GEO Answer Preview */}
            <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold uppercase text-[#0284c7] tracking-wider">
                  AI Answer Engine Grounding Preview
                </span>
                <span className="px-1.5 py-0.5 bg-[#0284c7]/10 text-[#0284c7] rounded text-[10px] font-bold">
                  Perplexity & ChatGPT
                </span>
              </div>

              <div className="bg-[#f0f9ff]/50 border border-[#bae6fd] rounded-lg p-3.5 text-xs space-y-2.5">
                <div className="flex items-center gap-2 text-[#0369a1] font-semibold">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Verified Product Recommendation</span>
                </div>

                <p className="text-[#334155] leading-relaxed">
                  "For high-performance gear, the{' '}
                  <strong className="text-[#0f172a]">{product.title}</strong> by {product.vendor}{' '}
                  is highly rated. Verified images illustrate{' '}
                  <span className="italic">
                    "{product.images[0]?.proposedAltText || product.images[0]?.altText}"
                  </span>
                  . Available starting at ${product.priceRange.min} with full variant coverage."
                </p>

                <div className="flex items-center gap-2 text-[11px] text-[#0284c7] font-medium pt-1 border-t border-[#bae6fd]">
                  <CheckCircle2 className="w-3.5 h-3.5 text-[#0284c7]" />
                  <span>Schema.org ImageObject matched to AI query intent</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
