import type { ShopifyProductImage, ImageQualityAssessmentResult } from '../types';

export interface QualityRequirementConfig {
  targetAspectRatio: '1:1' | '3:4' | '4:5' | '4:3' | '16:9' | 'any';
  tolerancePercent: number; // e.g. 3 for 3%
  minResolutionPx: number; // e.g. 1024
  retinaResolutionPx: number; // e.g. 1600
  strictShopifyZoomMin: number; // 800px
}

export const DEFAULT_QUALITY_CONFIG: QualityRequirementConfig = {
  targetAspectRatio: '1:1', // Shopify Standard Square
  tolerancePercent: 3,
  minResolutionPx: 1024,
  retinaResolutionPx: 1600,
  strictShopifyZoomMin: 800,
};

export const ASPECT_RATIO_TARGETS: {
  [key in QualityRequirementConfig['targetAspectRatio']]: {
    ratio: number;
    label: string;
    description: string;
  };
} = {
  '1:1': {
    ratio: 1.0,
    label: '1:1 Square (Shopify Standard)',
    description: 'Recommended for consistent e-commerce grids, search carousels, and swatch alignment.',
  },
  '3:4': {
    ratio: 0.75,
    label: '3:4 Portrait (Apparel & Fashion)',
    description: 'Optimal for full-body models and vertical clothing photography.',
  },
  '4:5': {
    ratio: 0.8,
    label: '4:5 Portrait (Social & Mobile Feed)',
    description: 'Maximized vertical screen real estate on mobile devices.',
  },
  '4:3': {
    ratio: 1.333,
    label: '4:3 Standard Landscape',
    description: 'Classic landscape product still life and desktop photography.',
  },
  '16:9': {
    ratio: 1.778,
    label: '16:9 Widescreen (Hero Banner)',
    description: 'Wide format for top-of-page editorial banners and video stills.',
  },
  any: {
    ratio: 0,
    label: 'Any Aspect Ratio (Flexible)',
    description: 'Disables aspect ratio mismatch enforcement; checks only resolution.',
  },
};

/**
 * Calculates human-readable aspect ratio text (e.g. 1:1, 16:9, 4:3, or decimal)
 */
export function getFormattedAspectRatio(width: number, height: number): string {
  if (!width || !height) return '1:1';
  const ratio = width / height;

  if (Math.abs(ratio - 1.0) < 0.04) return '1:1 (Square)';
  if (Math.abs(ratio - 16 / 9) < 0.05) return '16:9 (Widescreen)';
  if (Math.abs(ratio - 4 / 3) < 0.05) return '4:3 (Landscape)';
  if (Math.abs(ratio - 3 / 4) < 0.05) return '3:4 (Portrait)';
  if (Math.abs(ratio - 4 / 5) < 0.05) return '4:5 (Portrait)';
  if (Math.abs(ratio - 9 / 16) < 0.05) return '9:16 (Vertical)';

  return `${ratio.toFixed(2)}:1`;
}

/**
 * Assesses an image against resolution and aspect ratio requirements
 */
export function assessImageQuality(
  img: ShopifyProductImage,
  config: QualityRequirementConfig = DEFAULT_QUALITY_CONFIG
): ImageQualityAssessmentResult {
  const width = img.width || 1200;
  const height = img.height || 1200;
  const ratio = width / height;
  const minDimension = Math.min(width, height);
  const megapixels = Number(((width * height) / 1000000).toFixed(2));
  const warningReasons: string[] = [];

  // Check explicit issues from metadata
  const hasExplicitLowResIssue = img.issues.some((iss) => iss.type === 'low_res');
  const hasExplicitRatioIssue = img.issues.some((iss) => iss.type === 'aspect_ratio_mismatch');

  // 1. Resolution Check
  let isLowResolution = false;
  if (minDimension < config.minResolutionPx || hasExplicitLowResIssue) {
    isLowResolution = true;
    if (minDimension < config.strictShopifyZoomMin) {
      warningReasons.push(
        `Critical low resolution: ${width}×${height}px is below Shopify's 800px zoom threshold. Storefront hover-zoom will be disabled.`
      );
    } else {
      warningReasons.push(
        `Sub-optimal resolution: ${width}×${height}px is below the recommended ${config.minResolutionPx}px threshold for crisp display.`
      );
    }
  }

  // 2. Aspect Ratio Check
  let failsAspectRatio = false;
  if (config.targetAspectRatio !== 'any') {
    const target = ASPECT_RATIO_TARGETS[config.targetAspectRatio].ratio;
    const deviationPercent = Math.abs((ratio - target) / target) * 100;

    if (deviationPercent > config.tolerancePercent || hasExplicitRatioIssue) {
      failsAspectRatio = true;
      const actualLabel = getFormattedAspectRatio(width, height);
      warningReasons.push(
        `Fails ${config.targetAspectRatio} requirement: Current ratio is ${actualLabel} (${ratio.toFixed(2)}:1), deviating by ${deviationPercent.toFixed(1)}% from target.`
      );
    }
  }

  // 3. Zoom capability rating
  let zoomCapability: 'retina' | 'standard' | 'basic' | 'disabled';
  if (minDimension >= config.retinaResolutionPx) {
    zoomCapability = 'retina';
  } else if (minDimension >= config.minResolutionPx) {
    zoomCapability = 'standard';
  } else if (minDimension >= config.strictShopifyZoomMin) {
    zoomCapability = 'basic';
  } else {
    zoomCapability = 'disabled';
  }

  const hasResolutionWarning = isLowResolution || failsAspectRatio || hasExplicitLowResIssue || hasExplicitRatioIssue;

  return {
    imageId: img.id,
    width,
    height,
    aspectRatio: ratio,
    aspectRatioLabel: getFormattedAspectRatio(width, height),
    isLowResolution,
    failsAspectRatio,
    hasResolutionWarning,
    warningReasons,
    megapixels,
    zoomCapability,
  };
}
