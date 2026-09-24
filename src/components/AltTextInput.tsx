import React from 'react';
import { Loader2, Check } from 'lucide-react';
import type { ShopifyProductImage } from '../types';
import { MAX_ALT_LENGTH, type AltEditor } from '../hooks/useAltEditor';

interface AltTextInputProps {
  image: ShopifyProductImage;
  editor: AltEditor;
}

// ALT text field that saves to Shopify on blur or Enter, with a spinner while
// saving, a check once Shopify confirms, and Shopify's error if it rejects.
export const AltTextInput: React.FC<AltTextInputProps> = ({ image, editor }) => {
  const isSaving = editor.isSaving(image.id);
  const isSaved = editor.isSaved(image.id);
  const error = editor.errorFor(image.id);

  return (
    <div>
      <div className="relative">
        <input
          type="text"
          placeholder="Add ALT text"
          value={editor.valueFor(image)}
          maxLength={MAX_ALT_LENGTH}
          disabled={isSaving}
          onChange={(e) => editor.setDraft(image.id, e.target.value)}
          onBlur={() => editor.commit(image)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') e.currentTarget.blur();
          }}
          aria-invalid={Boolean(error)}
          className={`w-full pl-3 pr-8 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 disabled:bg-[#f9fafb] ${
            error ? 'border-[#d72c0d] focus:ring-[#d72c0d]' : 'border-[#d2d5d8] focus:ring-[#008060]'
          }`}
        />
        <span className="absolute right-2.5 top-1/2 -translate-y-1/2">
          {isSaving ? (
            <Loader2 className="w-4 h-4 animate-spin text-[#8c9196]" />
          ) : isSaved ? (
            <Check className="w-4 h-4 text-[#008060]" aria-label="Saved to Shopify" />
          ) : null}
        </span>
      </div>
      {error && <div className="mt-1 text-xs text-[#d72c0d]">{error}</div>}
    </div>
  );
};
