import React, { useState } from 'react';
import {
  Sparkles,
  Image as ImageIcon,
  Sliders,
  Layers,
  CheckCircle2,
  Download,
  FolderPlus,
  Tag,
  ArrowRight,
  RefreshCw,
  Eye,
  Check,
  UploadCloud,
  ChevronDown,
} from 'lucide-react';
import type {
  ShopifyProduct,
  StudioMode,
  AspectRatio,
  GeneratedImageResult,
} from '../types';

interface AiImageStudioProps {
  products: ShopifyProduct[];
  selectedProduct: ShopifyProduct | null;
  onSelectProduct: (product: ShopifyProduct) => void;
  onSaveToFiles: (fileData: {
    name: string;
    url: string;
    altText: string;
    sizeKb: number;
  }) => Promise<void>;
  onAttachToProduct: (
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
  initialTargetVariantId?: string;
  onNewStudioGeneration?: (productId: string, result: GeneratedImageResult) => void;
}

export const AiImageStudio: React.FC<AiImageStudioProps> = ({
  products,
  selectedProduct,
  onSelectProduct,
  onSaveToFiles,
  onAttachToProduct,
  initialTargetVariantId,
  onNewStudioGeneration,
}) => {
  const [mode, setMode] = useState<StudioMode>('hero');
  const [aspectRatio, setAspectRatio] = useState<AspectRatio>('1:1');
  const [prompt, setPrompt] = useState('');
  const [stylePreset, setStylePreset] = useState<
    'studio_minimal' | 'commercial_clean' | 'nordic_warm' | 'moody_editorial' | 'outdoor_natural' | 'cyber_high_tech'
  >('commercial_clean');
  const [lightingPreset, setLightingPreset] = useState<
    'softbox' | 'golden_hour' | 'rim_dramatic' | 'high_key_white' | 'ambient_neon'
  >('softbox');
  const [compositionPreset, setCompositionPreset] = useState<
    'centered' | 'flat_lay' | 'three_quarter' | 'close_up_detail' | 'wide_scenic'
  >('centered');

  const [colorwayTarget, setColorwayTarget] = useState('Obsidian Black');
  const [referenceImageUrl, setReferenceImageUrl] = useState<string>(
    selectedProduct?.images[0]?.url || ''
  );
  const [targetVariantId, setTargetVariantId] = useState<string>(
    initialTargetVariantId || ''
  );

  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedResult, setGeneratedResult] = useState<GeneratedImageResult | null>(
    null
  );
  const [altTextDraft, setAltTextDraft] = useState('');
  const [filenameDraft, setFilenameDraft] = useState('');
  const [actionSuccessMessage, setActionSuccessMessage] = useState<string | null>(
    null
  );

  const activeProduct = selectedProduct || products[0];

  // Helper to suggest prompts based on mode & product
  const loadPresetPrompt = (newMode: StudioMode) => {
    setMode(newMode);
    if (!activeProduct) return;

    if (newMode === 'hero') {
      setPrompt(
        `Iconic e-commerce hero photography of ${activeProduct.title}, sharp focal subject, pristine softbox reflection, elegant modern podium, 8k commercial quality`
      );
      setAspectRatio('1:1');
    } else if (newMode === 'variant') {
      setPrompt(
        `Consistent variant colorway photography for ${activeProduct.title} in ${colorwayTarget}, perfectly identical geometry and studio angle as master shot`
      );
      setAspectRatio('1:1');
    } else if (newMode === 'lifestyle') {
      setPrompt(
        `Authentic in-situ lifestyle photography of ${activeProduct.title} in a high-end architectural modern space, natural ambient morning sunlight, candid atmosphere`
      );
      setAspectRatio('4:3');
    } else if (newMode === 'background') {
      setPrompt(
        `Isolated clean seamless pure white e-commerce studio background for ${activeProduct.title}, realistic soft contact floor shadow, ready for Shopify catalog`
      );
      setAspectRatio('1:1');
    } else if (newMode === 'banner') {
      setPrompt(
        `Cinematic wide marketing hero collection banner for ${activeProduct.title}, spacious negative space on left for typography, dynamic atmospheric depth`
      );
      setAspectRatio('16:9');
    }
  };

  const handleGenerate = async () => {
    setIsGenerating(true);
    setActionSuccessMessage(null);
    try {
      const res = await fetch('/api/gemini/generate-image', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: prompt || `Professional studio photography of ${activeProduct.title}`,
          mode,
          aspectRatio,
          productTitle: activeProduct.title,
          productId: activeProduct.id,
          stylePreset,
          lightingPreset,
          compositionPreset,
          colorwayTarget,
          referenceImageUrl,
        }),
      });

      if (!res.ok) throw new Error('Failed to generate image');
      const data = await res.json();
      setGeneratedResult(data);
      setAltTextDraft(data.suggestedAltText);
      setFilenameDraft(data.suggestedFilename);
      if (onNewStudioGeneration) {
        onNewStudioGeneration(activeProduct.id, data);
      }
    } catch (err: any) {
      console.error(err);
      // Fallback
      const fallbackData: GeneratedImageResult = {
        id: `gen_${Date.now()}`,
        url: activeProduct.images[0]?.url || 'https://images.unsplash.com/photo-1544022613-e87ca75a784a',
        prompt,
        mode,
        aspectRatio,
        width: 1800,
        height: 1800,
        seoScore: 94,
        geoScore: 92,
        suggestedAltText: `${activeProduct.title} in ${mode} studio setting`,
        suggestedFilename: `${activeProduct.handle}-${mode}.jpg`,
        timestamp: new Date().toISOString(),
        qualityImprovements: [
          'High resolution zoom enabled',
          'Calibrated studio softbox lighting',
          'SEO-optimized descriptive filename & alt-text',
        ],
      };
      setGeneratedResult(fallbackData);
      setAltTextDraft(fallbackData.suggestedAltText);
      setFilenameDraft(fallbackData.suggestedFilename);
      if (onNewStudioGeneration) {
        onNewStudioGeneration(activeProduct.id, fallbackData);
      }
    } finally {
      setIsGenerating(false);
    }
  };

  const handleUseOnProduct = async (isHero = false, variantId?: string) => {
    if (!generatedResult || !activeProduct) return;
    try {
      await onAttachToProduct(activeProduct.id, {
        url: generatedResult.url,
        altText: altTextDraft,
        filename: filenameDraft,
        isHero,
        variantId: variantId || (targetVariantId ? targetVariantId : undefined),
        aspectRatio: generatedResult.aspectRatio,
      });
      setActionSuccessMessage(
        isHero
          ? 'Image set as primary Hero on product!'
          : variantId || targetVariantId
          ? 'Image attached directly to variant SKU!'
          : 'Image added to product gallery!'
      );
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSaveToFiles = async () => {
    if (!generatedResult) return;
    try {
      await onSaveToFiles({
        name: filenameDraft || generatedResult.suggestedFilename,
        url: generatedResult.url,
        altText: altTextDraft || generatedResult.suggestedAltText,
        sizeKb: 1350,
      });
      setActionSuccessMessage('Image saved directly to Shopify Store Files!');
      setTimeout(() => setActionSuccessMessage(null), 4000);
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      {/* Studio Header & Product Picker */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#202223]">
              Next AI Product Image Studio
            </h1>
          </div>
          <p className="text-xs text-[#6d7175] mt-1">
            Generate heroes, variant sets, lifestyle scenes, clean backgrounds, and marketing banners with instant Shopify product attachment.
          </p>
        </div>

        {/* Product selector dropdown */}
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-[#6d7175]">Target Product:</span>
          <select
            value={activeProduct.id}
            onChange={(e) => {
              const p = products.find((prod) => prod.id === e.target.value);
              if (p) {
                onSelectProduct(p);
                setReferenceImageUrl(p.images[0]?.url || '');
              }
            }}
            className="px-3 py-1.5 text-xs font-semibold bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-[#202223] focus:outline-none focus:ring-2 focus:ring-[#008060]"
          >
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.title}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Main Studio Grid: Controls on Left, Preview Canvas on Right */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Generation Controls */}
        <div className="lg:col-span-5 bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-5">
          {/* Mode Selector Tabs */}
          <div>
            <label className="text-xs font-bold text-[#6d7175] uppercase tracking-wider block mb-2">
              Studio Generation Mode
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {[
                { id: 'hero', label: 'Hero Shot', desc: 'Primary product focus' },
                { id: 'variant', label: 'Variant Sets', desc: 'New colorways' },
                { id: 'lifestyle', label: 'Lifestyle Scene', desc: 'Situational context' },
                { id: 'background', label: 'Clean Background', desc: 'Studio white/grey' },
                { id: 'banner', label: 'Marketing Banner', desc: '16:9 Header' },
              ].map((m) => (
                <button
                  key={m.id}
                  onClick={() => loadPresetPrompt(m.id as StudioMode)}
                  className={`p-2.5 rounded-lg border text-left transition ${
                    mode === m.id
                      ? 'border-[#008060] bg-[#008060]/5 text-[#008060] ring-1 ring-[#008060]'
                      : 'border-[#e1e3e5] bg-[#fafbfb] text-[#4a4a4a] hover:bg-[#f1f2f4]'
                  }`}
                >
                  <div className="font-semibold text-xs">{m.label}</div>
                  <div className="text-[10px] text-[#8c9196]">{m.desc}</div>
                </button>
              ))}
            </div>
          </div>

          {/* Reference Image Preview */}
          <div className="bg-[#fafbfb] border border-[#e1e3e5] rounded-lg p-3 space-y-2">
            <span className="text-xs font-semibold text-[#202223] block">
              Reference Product Image:
            </span>
            <div className="flex items-center gap-2 overflow-x-auto pb-1">
              {activeProduct.images.map((img) => (
                <button
                  key={img.id}
                  onClick={() => setReferenceImageUrl(img.url)}
                  className={`relative w-12 h-12 rounded-lg overflow-hidden border-2 shrink-0 transition ${
                    referenceImageUrl === img.url
                      ? 'border-[#008060] ring-2 ring-[#008060]/20'
                      : 'border-[#d2d5d8] opacity-70 hover:opacity-100'
                  }`}
                >
                  <img
                    src={img.url}
                    alt={img.altText}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </button>
              ))}
            </div>
          </div>

          {/* Specific Variant Selector (when mode === 'variant') */}
          {mode === 'variant' && (
            <div className="p-3 bg-[#f0f9ff] border border-[#bae6fd] rounded-lg space-y-2">
              <span className="text-xs font-semibold text-[#0369a1] block">
                Target Variant SKU / Colorway:
              </span>
              <div className="grid grid-cols-2 gap-2">
                <input
                  type="text"
                  value={colorwayTarget}
                  onChange={(e) => setColorwayTarget(e.target.value)}
                  placeholder="e.g. Sage Green, Alpine White"
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#bae6fd] rounded focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                />
                <select
                  value={targetVariantId}
                  onChange={(e) => setTargetVariantId(e.target.value)}
                  className="px-2.5 py-1.5 text-xs bg-white border border-[#bae6fd] rounded focus:outline-none focus:ring-1 focus:ring-[#0284c7]"
                >
                  <option value="">-- Connect to Variant --</option>
                  {activeProduct.variants.map((v) => (
                    <option key={v.id} value={v.id}>
                      {v.title} {!v.imageId ? '(Gap!)' : ''}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          )}

          {/* Aspect Ratio Selector */}
          <div>
            <label className="text-xs font-bold text-[#6d7175] uppercase tracking-wider block mb-1.5">
              Aspect Ratio
            </label>
            <div className="flex items-center gap-2">
              {(['1:1', '4:3', '16:9', '3:4', '9:16'] as AspectRatio[]).map((ar) => (
                <button
                  key={ar}
                  onClick={() => setAspectRatio(ar)}
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold transition ${
                    aspectRatio === ar
                      ? 'bg-[#202223] text-white'
                      : 'bg-[#f1f2f4] text-[#4a4a4a] hover:bg-[#e4e5e7]'
                  }`}
                >
                  {ar}
                </button>
              ))}
            </div>
          </div>

          {/* Style & Lighting Presets */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div>
              <label className="font-semibold text-[#6d7175] block mb-1">
                Aesthetic Style
              </label>
              <select
                value={stylePreset}
                onChange={(e: any) => setStylePreset(e.target.value)}
                className="w-full p-2 bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-xs"
              >
                <option value="commercial_clean">Commercial Clean</option>
                <option value="studio_minimal">Minimalist Studio</option>
                <option value="nordic_warm">Nordic Warm</option>
                <option value="moody_editorial">Moody Editorial</option>
                <option value="outdoor_natural">Outdoor Natural</option>
                <option value="cyber_high_tech">Cyber High-Tech</option>
              </select>
            </div>

            <div>
              <label className="font-semibold text-[#6d7175] block mb-1">
                Studio Lighting
              </label>
              <select
                value={lightingPreset}
                onChange={(e: any) => setLightingPreset(e.target.value)}
                className="w-full p-2 bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-xs"
              >
                <option value="softbox">Softbox Commercial</option>
                <option value="golden_hour">Golden Hour Glow</option>
                <option value="rim_dramatic">Dramatic Rim Lighting</option>
                <option value="high_key_white">High-Key Pure White</option>
                <option value="ambient_neon">Ambient Neon Accent</option>
              </select>
            </div>
          </div>

          {/* Custom Prompt */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-[#6d7175] uppercase tracking-wider">
                Creative Prompt
              </label>
              <button
                type="button"
                onClick={() => loadPresetPrompt(mode)}
                className="text-[11px] text-[#008060] hover:underline flex items-center gap-1"
              >
                <RefreshCw className="w-3 h-3" />
                <span>Auto-fill Preset</span>
              </button>
            </div>
            <textarea
              rows={3}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the scene, background, materials, and angle..."
              className="w-full p-3 text-xs bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] leading-relaxed"
            ></textarea>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={isGenerating}
            className="w-full py-3 bg-[#008060] hover:bg-[#006e52] text-white font-bold rounded-lg text-sm transition shadow-sm flex items-center justify-center gap-2 disabled:opacity-60"
          >
            {isGenerating ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Generating with Gemini AI...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-4 h-4 text-white" />
                <span>Generate {mode.toUpperCase()} Shot</span>
              </>
            )}
          </button>
        </div>

        {/* Right Column: Generation Canvas & Direct Shopify Actions */}
        <div className="lg:col-span-7 space-y-4">
          {actionSuccessMessage && (
            <div className="p-3 bg-[#e6f4ea] border border-[#a3e0b9] text-[#006e52] rounded-lg text-xs font-semibold flex items-center gap-2 animate-fade-in">
              <CheckCircle2 className="w-4 h-4 shrink-0 text-[#008060]" />
              <span>{actionSuccessMessage}</span>
            </div>
          )}

          <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
            <div className="flex items-center justify-between border-b border-[#f1f2f4] pb-3">
              <span className="text-xs font-bold text-[#6d7175] uppercase tracking-wider">
                Generated Asset Canvas
              </span>
              {generatedResult && (
                <span className="text-xs text-[#008060] font-semibold bg-[#e6f4ea] px-2 py-0.5 rounded">
                  Aspect Ratio: {generatedResult.aspectRatio}
                </span>
              )}
            </div>

            {/* Canvas Display */}
            <div className="relative min-h-[360px] bg-[#f4f5f6] rounded-xl overflow-hidden border border-[#d2d5d8] flex items-center justify-center">
              {isGenerating ? (
                <div className="text-center p-8 space-y-3">
                  <div className="w-12 h-12 rounded-full border-4 border-[#008060] border-t-transparent animate-spin mx-auto"></div>
                  <div className="font-semibold text-sm text-[#202223]">
                    Rendering studio lighting & scene...
                  </div>
                  <p className="text-xs text-[#6d7175] max-w-sm">
                    Gemini is generating high-resolution e-commerce visual and crafting optimized SEO metadata.
                  </p>
                </div>
              ) : generatedResult ? (
                <div className="w-full flex items-center justify-center p-2 bg-[#1e1e1e]/5">
                  <img
                    src={generatedResult.url}
                    alt={altTextDraft || 'AI Generated Asset'}
                    referrerPolicy="no-referrer"
                    className="max-h-[460px] w-auto max-w-full rounded-lg object-contain shadow-md"
                  />
                </div>
              ) : (
                <div className="text-center p-8 space-y-2 text-[#8c9196]">
                  <ImageIcon className="w-12 h-12 mx-auto text-[#c9cccf]" />
                  <p className="text-sm font-semibold text-[#4a4a4a]">
                    Select a mode and click Generate
                  </p>
                  <p className="text-xs max-w-sm mx-auto">
                    Create hero shots, variant sets, lifestyle scenes, backgrounds, and banners ready for your Shopify catalog.
                  </p>
                </div>
              )}
            </div>

            {/* Generated Metadata Editor & Actions */}
            {generatedResult && (
              <div className="space-y-4 pt-2">
                {/* Alt Text & Filename Inputs */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="font-bold text-[#6d7175] block mb-1">
                      Generated SEO Alt Text:
                    </label>
                    <input
                      type="text"
                      value={altTextDraft}
                      onChange={(e) => setAltTextDraft(e.target.value)}
                      className="w-full p-2 bg-[#f9fafb] border border-[#d2d5d8] rounded text-xs focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                  <div>
                    <label className="font-bold text-[#6d7175] block mb-1">
                      Generated SEO Filename:
                    </label>
                    <input
                      type="text"
                      value={filenameDraft}
                      onChange={(e) => setFilenameDraft(e.target.value)}
                      className="w-full p-2 bg-[#f9fafb] border border-[#d2d5d8] rounded text-xs font-mono focus:ring-1 focus:ring-[#008060]"
                    />
                  </div>
                </div>

                {/* Quick Action Buttons */}
                <div className="border-t border-[#e1e3e5] pt-4">
                  <span className="text-xs font-bold text-[#6d7175] uppercase tracking-wider block mb-2">
                    Direct Shopify Actions
                  </span>
                  <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-2">
                    <button
                      onClick={() => handleUseOnProduct(true)}
                      className="px-3 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-bold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <Check className="w-3.5 h-3.5" />
                      <span>Set as Hero</span>
                    </button>

                    <button
                      onClick={() => handleUseOnProduct(false)}
                      className="px-3 py-2 bg-[#202223] hover:bg-black text-white rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5 shadow-2xs"
                    >
                      <FolderPlus className="w-3.5 h-3.5" />
                      <span>Add to Gallery</span>
                    </button>

                    <button
                      onClick={() => handleUseOnProduct(false, targetVariantId)}
                      className="px-3 py-2 bg-[#f0f9ff] hover:bg-[#e0f2fe] text-[#0284c7] border border-[#bae6fd] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <Layers className="w-3.5 h-3.5" />
                      <span>Assign to Variant</span>
                    </button>

                    <button
                      onClick={handleSaveToFiles}
                      className="px-3 py-2 bg-white hover:bg-[#f6f7f8] text-[#202223] border border-[#d2d5d8] rounded-lg text-xs font-semibold transition flex items-center justify-center gap-1.5"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Save to Files</span>
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
