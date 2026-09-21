export type StudioMode = 'hero' | 'variant' | 'lifestyle' | 'background' | 'banner';

export type AspectRatio = '1:1' | '4:3' | '16:9' | '3:4' | '9:16';

export interface ImageIssue {
  id: string;
  type: 'alt_missing' | 'alt_weak' | 'filename_generic' | 'variant_unassigned' | 'low_res' | 'aspect_ratio_mismatch' | 'no_translations' | 'missing_jsonld';
  severity: 'critical' | 'warning' | 'info';
  title: string;
  description: string;
  suggestedFix?: string;
}

export interface ImageQualityAssessmentResult {
  imageId: string;
  width: number;
  height: number;
  aspectRatio: number; // width / height
  aspectRatioLabel: string;
  isLowResolution: boolean;
  failsAspectRatio: boolean;
  hasResolutionWarning: boolean;
  warningReasons: string[];
  megapixels: number;
  zoomCapability: 'retina' | 'standard' | 'basic' | 'disabled';
}

export interface AltTextTranslations {
  en: string;
  es?: string;
  fr?: string;
  de?: string;
  ja?: string;
}

export interface ShopifyProductImage {
  id: string;
  url: string;
  altText: string;
  filename: string;
  width: number;
  height: number;
  format: string;
  fileSizeKb: number;
  variantIds: string[]; // Variant IDs this image is assigned to
  isHero: boolean;
  seoScore: number; // 0-100
  geoScore: number; // 0-100 (AI search readinessPerplexity/ChatGPT/Google SGE)
  issues: ImageIssue[];
  proposedAltText: string;
  proposedFilename: string;
  translations: AltTextTranslations;
  inShopifyFiles: boolean;
  createdAt: string;
}

export interface ShopifyProductVariant {
  id: string;
  title: string; // e.g. "Slate Grey / M"
  sku: string;
  price: string;
  options: {
    Color?: string;
    Size?: string;
    Material?: string;
    [key: string]: string | undefined;
  };
  imageId?: string; // ID of the image assigned to this variant
}

export interface ProductJsonLd {
  '@context': string;
  '@type': string;
  name: string;
  description: string;
  sku: string;
  mpn: string;
  brand: {
    '@type': string;
    name: string;
  };
  offers: {
    '@type': string;
    priceCurrency: string;
    price: string;
    availability: string;
    url: string;
  };
  image: Array<{
    '@type': string;
    contentUrl: string;
    caption: string;
    encodingFormat: string;
    width: number;
    height: number;
    name: string;
  }>;
}

export interface ShopifyProduct {
  id: string;
  title: string;
  handle: string;
  vendor: string;
  productType: string;
  status: 'active' | 'draft' | 'archived';
  description: string;
  priceRange: {
    min: string;
    max: string;
  };
  images: ShopifyProductImage[];
  variants: ShopifyProductVariant[];
  overallSeoScore: number;
  overallGeoScore: number;
  jsonLd: ProductJsonLd;
  lastAuditedAt: string;
  tags: string[];
  studioGenerations?: GeneratedImageResult[];
}

export interface ShopifyFile {
  id: string;
  name: string;
  url: string;
  sizeKb: number;
  contentType: string;
  altText: string;
  usedInProductsCount: number;
  createdAt: string;
}

export interface StudioGenerationConfig {
  mode: StudioMode;
  aspectRatio: AspectRatio;
  prompt: string;
  stylePreset: 'studio_minimal' | 'commercial_clean' | 'nordic_warm' | 'moody_editorial' | 'outdoor_natural' | 'cyber_high_tech';
  lightingPreset: 'softbox' | 'golden_hour' | 'rim_dramatic' | 'high_key_white' | 'ambient_neon';
  compositionPreset: 'centered' | 'flat_lay' | 'three_quarter' | 'close_up_detail' | 'wide_scenic';
  referenceImageId?: string;
  referenceImageUrl?: string;
  targetVariantId?: string;
  targetProductId?: string;
  colorwayTarget?: string; // For variant sets e.g. "Forest Green"
}

export interface GeneratedImageResult {
  id: string;
  url: string;
  prompt: string;
  mode: StudioMode;
  aspectRatio: AspectRatio;
  suggestedAltText: string;
  suggestedFilename: string;
  timestamp: string;
  sourceProductId?: string;
  sourceVariantId?: string;
  width?: number;
  height?: number;
  seoScore?: number;
  geoScore?: number;
  resolutionLabel?: string;
  qualityImprovements?: string[];
  referenceImageUrl?: string;
}

export interface AuditScoreHistoryPoint {
  date: string; // YYYY-MM-DD
  label: string; // e.g. "Sep 1"
  seoScore: number;
  geoScore: number;
  totalImages: number;
  resolvedIssues: number;
  note?: string;
}

export interface StoreAuditSummary {
  totalProducts: number;
  totalImages: number;
  averageSeoScore: number;
  averageGeoScore: number;
  missingAltCount: number;
  weakFilenameCount: number;
  unassignedVariantGaps: number;
  jsonLdIssuesCount: number;
  missingTranslationsCount: number;
  lastStoreAudit: string;
  history?: AuditScoreHistoryPoint[];
}
