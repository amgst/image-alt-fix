import { useState } from 'react';
import type { AltSaveResult, AltUpdate } from '../App';
import type { ShopifyProduct, ShopifyProductImage } from '../types';

// Shopify's limit on media alt text length.
export const MAX_ALT_LENGTH = 512;

// ALT text built from the product title. Products with several images get a
// numbered suffix so the ALT texts stay unique.
export function productTitleAlt(product: ShopifyProduct, image: ShopifyProductImage): string {
  const position = product.images.findIndex((img) => img.id === image.id) + 1;
  const alt = product.images.length > 1 ? `${product.title} - image ${position}` : product.title;
  return alt.slice(0, MAX_ALT_LENGTH);
}

export interface AltEditor {
  valueFor: (image: ShopifyProductImage) => string;
  setDraft: (imageId: string, value: string) => void;
  commit: (image: ShopifyProductImage) => Promise<void>;
  save: (updates: AltUpdate[]) => Promise<AltSaveResult>;
  isSaving: (imageId: string) => boolean;
  isSaved: (imageId: string) => boolean;
  errorFor: (imageId: string) => string | undefined;
}

// Draft, saving, saved and error state for editing ALT text. Confirmed images
// drop their draft so the field shows Shopify's value; failed ones keep the
// draft and show the error so the merchant can retry.
export function useAltEditor(
  onSaveAltTexts: (updates: AltUpdate[]) => Promise<AltSaveResult>
): AltEditor {
  const [drafts, setDrafts] = useState<Record<string, string>>({});
  const [savingIds, setSavingIds] = useState<Set<string>>(new Set());
  const [savedIds, setSavedIds] = useState<Set<string>>(new Set());
  const [errors, setErrors] = useState<Record<string, string>>({});

  const withIds = (set: Set<string>, ids: string[], add: boolean) => {
    const next = new Set(set);
    ids.forEach((id) => (add ? next.add(id) : next.delete(id)));
    return next;
  };

  const clearDrafts = (ids: string[]) =>
    setDrafts((prev) => {
      const next = { ...prev };
      ids.forEach((id) => delete next[id]);
      return next;
    });

  const save = async (updates: AltUpdate[]) => {
    const ids = updates.map((u) => u.imageId);
    setSavingIds((prev) => withIds(prev, ids, true));
    setSavedIds((prev) => withIds(prev, ids, false));

    const result = await onSaveAltTexts(updates);

    const okIds = result.updated.map((u) => u.imageId);
    setSavingIds((prev) => withIds(prev, ids, false));
    setSavedIds((prev) => withIds(prev, okIds, true));
    clearDrafts(okIds);
    setErrors((prev) => {
      const next = { ...prev };
      okIds.forEach((id) => delete next[id]);
      result.failed.forEach((f) => (next[f.imageId] = f.message));
      return next;
    });
    return result;
  };

  const commit = async (image: ShopifyProductImage) => {
    const draft = drafts[image.id];
    if (draft === undefined || savingIds.has(image.id)) return;
    const value = draft.trim();
    if (value === image.altText) {
      clearDrafts([image.id]);
      return;
    }
    await save([{ imageId: image.id, altText: value }]);
  };

  return {
    valueFor: (image) => drafts[image.id] ?? image.altText,
    setDraft: (imageId, value) => setDrafts((prev) => ({ ...prev, [imageId]: value })),
    commit,
    save,
    isSaving: (imageId) => savingIds.has(imageId),
    isSaved: (imageId) => savedIds.has(imageId) && drafts[imageId] === undefined,
    errorFor: (imageId) => errors[imageId],
  };
}
