import React, { useState } from 'react';
import {
  Settings,
  Sparkles,
  CheckCircle2,
  Save,
  Globe,
  Tag,
  ShieldCheck,
  Bot,
} from 'lucide-react';

export const SettingsRulesModal: React.FC = () => {
  const [altTemplate, setAltTemplate] = useState(
    '{brand} {product_title} in {variant_color} - {angle_view} with {feature_highlight}'
  );
  const [filenameTemplate, setFilenameTemplate] = useState(
    '{handle}-{variant_color}-{angle}.jpg'
  );
  const [enableGeoGrounding, setEnableGeoGrounding] = useState(true);
  const [includeJsonLdDimensions, setIncludeJsonLdDimensions] = useState(true);
  const [targetMarkets, setTargetMarkets] = useState({
    es: true,
    fr: true,
    de: true,
    ja: true,
    it: false,
  });
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-16">
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <Settings className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#202223]">
              SEO & GEO Automation Rules
            </h1>
          </div>
          <p className="text-xs text-[#6d7175] mt-1">
            Configure how Next AI structures image metadata, multi-language alt text, and Schema.org Product JSON-LD across your Shopify store.
          </p>
        </div>

        <button
          onClick={handleSave}
          className="flex items-center gap-1.5 px-4 py-2 bg-[#008060] hover:bg-[#006e52] text-white rounded-lg text-xs font-bold transition shadow-xs"
        >
          {saved ? (
            <>
              <CheckCircle2 className="w-4 h-4" />
              <span>Saved Rules!</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>

      {/* Alt Text Template Card */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#202223]">
          <Tag className="w-4 h-4 text-[#008060]" />
          <span>Automated Alt Text Pattern</span>
        </div>
        <p className="text-xs text-[#6d7175]">
          Variables: <code className="bg-[#f1f2f4] px-1 py-0.5 rounded font-mono">{'{brand}'}</code>,{' '}
          <code className="bg-[#f1f2f4] px-1 py-0.5 rounded font-mono">{'{product_title}'}</code>,{' '}
          <code className="bg-[#f1f2f4] px-1 py-0.5 rounded font-mono">{'{variant_color}'}</code>,{' '}
          <code className="bg-[#f1f2f4] px-1 py-0.5 rounded font-mono">{'{angle_view}'}</code>,{' '}
          <code className="bg-[#f1f2f4] px-1 py-0.5 rounded font-mono">{'{feature_highlight}'}</code>
        </p>
        <input
          type="text"
          value={altTemplate}
          onChange={(e) => setAltTemplate(e.target.value)}
          className="w-full p-2.5 bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#008060]"
        />
        <div className="p-3 bg-[#fafbfb] rounded-lg border border-[#e1e3e5] text-xs">
          <span className="font-semibold text-[#6d7175] block mb-1">Preview Generation:</span>
          <span className="text-[#202223] italic">
            "Aura Expedition Apex Horizon 3-Layer All-Weather Shell in Slate Grey - front view with taped seams and storm hood"
          </span>
        </div>
      </div>

      {/* Filename Slug Pattern */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#202223]">
          <Tag className="w-4 h-4 text-[#0284c7]" />
          <span>SEO Filename Normalization Pattern</span>
        </div>
        <p className="text-xs text-[#6d7175]">
          Enforces clean URL slugs, removes camera timestamps, and injects primary keywords.
        </p>
        <input
          type="text"
          value={filenameTemplate}
          onChange={(e) => setFilenameTemplate(e.target.value)}
          className="w-full p-2.5 bg-[#f9fafb] border border-[#d2d5d8] rounded-lg text-xs font-mono focus:ring-2 focus:ring-[#0284c7]"
        />
      </div>

      {/* GEO AI Answer Engine Grounding Rules */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#202223]">
          <Bot className="w-4 h-4 text-[#7c3aed]" />
          <span>GEO (Generative Engine Optimization) Settings</span>
        </div>
        <div className="space-y-3 text-xs">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={enableGeoGrounding}
              onChange={(e) => setEnableGeoGrounding(e.target.checked)}
              className="w-4 h-4 text-[#008060] rounded focus:ring-[#008060]"
            />
            <div>
              <div className="font-semibold text-[#202223]">
                Enable Semantic Entity Enrichments for AI Answers
              </div>
              <div className="text-[#6d7175]">
                Injects precise materials, measurements, and manufacturing origins so ChatGPT & Perplexity cite your product images.
              </div>
            </div>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              checked={includeJsonLdDimensions}
              onChange={(e) => setIncludeJsonLdDimensions(e.target.checked)}
              className="w-4 h-4 text-[#008060] rounded focus:ring-[#008060]"
            />
            <div>
              <div className="font-semibold text-[#202223]">
                Embed Full Schema.org ImageObject Specifications
              </div>
              <div className="text-[#6d7175]">
                Includes width, height, encodingFormat, and caption for Google Visual Search.
              </div>
            </div>
          </label>
        </div>
      </div>

      {/* International Markets Translations */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-2 text-sm font-bold text-[#202223]">
          <Globe className="w-4 h-4 text-[#008060]" />
          <span>Multi-Market Language Targets</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
          {[
            { key: 'es', label: 'Spanish (Español)' },
            { key: 'fr', label: 'French (Français)' },
            { key: 'de', label: 'German (Deutsch)' },
            { key: 'ja', label: 'Japanese (日本語)' },
            { key: 'it', label: 'Italian (Italiano)' },
          ].map((item) => (
            <label
              key={item.key}
              className="flex items-center gap-2 p-2.5 rounded-lg border border-[#e1e3e5] bg-[#fafbfb] cursor-pointer"
            >
              <input
                type="checkbox"
                checked={(targetMarkets as any)[item.key]}
                onChange={(e) =>
                  setTargetMarkets({
                    ...targetMarkets,
                    [item.key]: e.target.checked,
                  })
                }
                className="w-4 h-4 text-[#008060] rounded"
              />
              <span className="font-medium text-[#202223]">{item.label}</span>
            </label>
          ))}
        </div>
      </div>
    </div>
  );
};
