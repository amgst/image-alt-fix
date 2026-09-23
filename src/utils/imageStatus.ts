import type { ShopifyProduct, ShopifyProductImage } from '../types';

export type ImageStatus = 'missing' | 'poor' | 'duplicate' | 'good';

export interface FlatImageRow {
  product: ShopifyProduct;
  image: ShopifyProductImage;
  status: ImageStatus;
}

export function flattenProductImages(products: ShopifyProduct[]): FlatImageRow[] {
  const altCounts = new Map<string, number>();
  for (const product of products) {
    for (const img of product.images) {
      const key = img.altText.trim().toLowerCase();
      if (!key) continue;
      altCounts.set(key, (altCounts.get(key) || 0) + 1);
    }
  }

  const rows: FlatImageRow[] = [];
  for (const product of products) {
    for (const img of product.images) {
      rows.push({ product, image: img, status: getImageStatus(img, altCounts) });
    }
  }
  return rows;
}

function getImageStatus(img: ShopifyProductImage, altCounts: Map<string, number>): ImageStatus {
  const alt = img.altText.trim();
  if (!alt) return 'missing';
  if ((altCounts.get(alt.toLowerCase()) || 0) > 1) return 'duplicate';
  if (alt.split(/\s+/).length < 3) return 'poor';
  return 'good';
}
