import React, { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Sliders,
  Sparkles,
  ExternalLink,
  ChevronRight,
  FileWarning,
  RefreshCw,
  Image as ImageIcon,
  Zap,
} from 'lucide-react';
import type { ShopifyProduct, StoreAuditSummary } from '../types';
import { ScoreAuditTrendChart } from './ScoreAuditTrendChart';

interface CatalogOverviewProps {
  products: ShopifyProduct[];
  summary: StoreAuditSummary | null;
  onSelectProduct: (productId: string) => void;
  onOpenStudioForProduct: (product: ShopifyProduct) => void;
  onTriggerAuditProduct: (productId: string) => void;
  isAuditingId: string | null;
}

export const CatalogOverview: React.FC<CatalogOverviewProps> = ({
  products,
  summary,
  onSelectProduct,
  onOpenStudioForProduct,
  onTriggerAuditProduct,
  isAuditingId,
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<
    'all' | 'needs_alt' | 'variant_gaps' | 'weak_filename' | 'high_score'
  >('all');

  const filteredProducts = useMemo(() => {
    return products.filter((p) => {
      const matchesSearch =
        p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.handle.toLowerCase().includes(searchQuery.toLowerCase()) ||
        p.vendor.toLowerCase().includes(searchQuery.toLowerCase());

      if (!matchesSearch) return false;

      if (filterType === 'needs_alt') {
        return p.images.some(
          (img) => !img.altText || img.altText.split(' ').length < 3
        );
      }
      if (filterType === 'variant_gaps') {
        return p.variants.some((v) => !v.imageId);
      }
      if (filterType === 'weak_filename') {
        return p.images.some((img) =>
          img.issues.some((iss) => iss.type === 'filename_generic')
        );
      }
      if (filterType === 'high_score') {
        return p.overallSeoScore >= 80;
      }
      return true;
    });
  }, [products, searchQuery, filterType]);

  return (
    <div className="space-y-6 max-w-7xl mx-auto pb-12">
      {/* Overview Metric Cards */}
      {summary && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Card 1: SEO Score */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7175]">
                Avg Image SEO Score
              </span>
              <span className="w-2.5 h-2.5 rounded-full bg-[#008060]"></span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#202223]">
                {summary.averageSeoScore}
              </span>
              <span className="text-xs text-[#6d7175]">/ 100</span>
            </div>
            <div className="mt-2 w-full bg-[#e4e5e7] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#008060] h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.averageSeoScore}%` }}
              ></div>
            </div>
            <p className="mt-2 text-[11px] text-[#6d7175]">
              Measures alt text depth, filename keywords, and image aspect ratio standards.
            </p>
          </div>

          {/* Card 2: GEO AI-Readiness */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7175]">
                GEO AI-Readiness
              </span>
              <span className="px-1.5 py-0.5 bg-[#0284c7]/10 text-[#0284c7] rounded text-[10px] font-bold">
                ChatGPT & Perplexity
              </span>
            </div>
            <div className="mt-2 flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-[#0284c7]">
                {summary.averageGeoScore}
              </span>
              <span className="text-xs text-[#6d7175]">/ 100</span>
            </div>
            <div className="mt-2 w-full bg-[#e4e5e7] h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-[#0284c7] h-full rounded-full transition-all duration-500"
                style={{ width: `${summary.averageGeoScore}%` }}
              ></div>
            </div>
            <p className="mt-2 text-[11px] text-[#6d7175]">
              Evaluates semantic entity grounding, Schema.org ImageObject, and visual search features.
            </p>
          </div>

          {/* Card 3: Variant Gaps */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7175]">
                Variant Image Gaps
              </span>
              <span className="px-2 py-0.5 bg-[#fef3c7] text-[#b45309] rounded-full text-xs font-semibold">
                {summary.unassignedVariantGaps} Missing
              </span>
            </div>
            <div className="mt-2 text-3xl font-extrabold text-[#b45309]">
              {summary.unassignedVariantGaps}
            </div>
            <p className="mt-3 text-[11px] text-[#6d7175]">
              SKUs without dedicated variant photos cause customer confusion and higher return rates.
            </p>
          </div>

          {/* Card 4: Quick Issues to Fix */}
          <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7175]">
                Pending Optimizations
              </span>
              <Zap className="w-4 h-4 text-[#f59e0b]" />
            </div>
            <div className="mt-2 flex items-center gap-3 text-xs">
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#dc2626]">
                  {summary.missingAltCount}
                </span>
                <span className="text-[10px] text-[#6d7175]">Weak/No Alt</span>
              </div>
              <div className="h-6 w-px bg-[#e1e3e5]"></div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#f59e0b]">
                  {summary.weakFilenameCount}
                </span>
                <span className="text-[10px] text-[#6d7175]">Raw Filenames</span>
              </div>
              <div className="h-6 w-px bg-[#e1e3e5]"></div>
              <div className="flex flex-col">
                <span className="text-lg font-bold text-[#4f46e5]">
                  {summary.missingTranslationsCount}
                </span>
                <span className="text-[10px] text-[#6d7175]">No Translations</span>
              </div>
            </div>
            <p className="mt-2 text-[11px] text-[#6d7175]">
              One-click AI fixes available in each product workspace.
            </p>
          </div>
        </div>
      )}

      {/* D3.js 30-Day Score Trend Visualization */}
      <ScoreAuditTrendChart
        history={summary?.history}
        currentSeoScore={summary?.averageSeoScore ?? 68}
        currentGeoScore={summary?.averageGeoScore ?? 61}
      />

      {/* Catalog Search & Filter Controls */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
          <input
            type="text"
            placeholder="Search products by title, handle, vendor..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-9 pr-4 py-2 text-sm bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:bg-white transition"
          />
        </div>

        <div className="flex items-center gap-2 overflow-x-auto pb-1 md:pb-0">
          <Filter className="w-4 h-4 text-[#8c9196] hidden sm:block" />
          <button
            onClick={() => setFilterType('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'all'
                ? 'bg-[#202223] text-white'
                : 'bg-[#f1f2f4] text-[#4a4a4a] hover:bg-[#e4e5e7]'
            }`}
          >
            All Products ({products.length})
          </button>
          <button
            onClick={() => setFilterType('variant_gaps')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'variant_gaps'
                ? 'bg-[#b45309] text-white'
                : 'bg-[#fef3c7] text-[#92400e] hover:bg-[#fde68a]'
            }`}
          >
            Variant Gaps
          </button>
          <button
            onClick={() => setFilterType('needs_alt')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'needs_alt'
                ? 'bg-[#dc2626] text-white'
                : 'bg-[#fee2e2] text-[#991b1b] hover:bg-[#fecaca]'
            }`}
          >
            Weak Alt Text
          </button>
          <button
            onClick={() => setFilterType('weak_filename')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'weak_filename'
                ? 'bg-[#4f46e5] text-white'
                : 'bg-[#e0e7ff] text-[#3730a3] hover:bg-[#c7d2fe]'
            }`}
          >
            Generic Filenames
          </button>
          <button
            onClick={() => setFilterType('high_score')}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap transition ${
              filterType === 'high_score'
                ? 'bg-[#008060] text-white'
                : 'bg-[#e6f4ea] text-[#006e52] hover:bg-[#ceead6]'
            }`}
          >
            Optimized (80+)
          </button>
        </div>
      </div>

      {/* Products Table */}
      <div className="bg-white border border-[#e1e3e5] rounded-xl overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-[#e1e3e5] text-[11px] font-bold text-[#6d7175] uppercase tracking-wider">
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">Images & Gallery</th>
                <th className="py-3 px-4">Variant Coverage</th>
                <th className="py-3 px-4">Image SEO</th>
                <th className="py-3 px-4">GEO (AI Answer)</th>
                <th className="py-3 px-4">Issues Found</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e5] text-sm">
              {filteredProducts.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 text-center text-[#6d7175]">
                    No products matched your search or filter.
                  </td>
                </tr>
              ) : (
                filteredProducts.map((product) => {
                  const heroImg = product.images.find((i) => i.isHero) || product.images[0];
                  const unassignedVariants = product.variants.filter((v) => !v.imageId);
                  const totalIssues = product.images.reduce(
                    (acc, img) => acc + img.issues.length,
                    0
                  );
                  const isAuditing = isAuditingId === product.id;

                  return (
                    <tr
                      key={product.id}
                      className="hover:bg-[#f6f7f8] transition-colors group cursor-pointer"
                      onClick={() => onSelectProduct(product.id)}
                    >
                      {/* Product details */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="relative w-14 h-14 rounded-lg bg-[#f1f2f4] overflow-hidden border border-[#e1e3e5] shrink-0">
                            {heroImg ? (
                              <img
                                src={heroImg.url}
                                alt={heroImg.altText || product.title}
                                referrerPolicy="no-referrer"
                                className="w-full h-full object-cover"
                              />
                            ) : (
                              <div className="w-full h-full flex items-center justify-center text-[#8c9196]">
                                <ImageIcon className="w-6 h-6" />
                              </div>
                            )}
                            <span className="absolute bottom-0 right-0 bg-[#202223]/80 text-white text-[9px] font-mono px-1 rounded-tl">
                              {product.images.length}
                            </span>
                          </div>

                          <div className="min-w-0">
                            <div className="font-semibold text-[#202223] group-hover:text-[#008060] transition truncate max-w-xs">
                              {product.title}
                            </div>
                            <div className="flex items-center gap-2 text-xs text-[#6d7175] mt-0.5">
                              <span>${product.priceRange.min}</span>
                              <span>•</span>
                              <span className="truncate">{product.vendor}</span>
                              <span>•</span>
                              <span className="text-[10px] uppercase font-semibold text-[#008060] bg-[#e6f4ea] px-1.5 py-0.2 rounded">
                                {product.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Image gallery strip */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center -space-x-2 overflow-hidden">
                          {product.images.slice(0, 4).map((img, idx) => (
                            <img
                              key={img.id}
                              src={img.url}
                              alt={img.altText}
                              referrerPolicy="no-referrer"
                              className="w-8 h-8 rounded-full border-2 border-white object-cover shadow-2xs"
                              title={img.altText || 'No alt text'}
                            />
                          ))}
                          {product.images.length > 4 && (
                            <div className="w-8 h-8 rounded-full bg-[#e4e5e7] border-2 border-white flex items-center justify-center text-[10px] font-semibold text-[#4a4a4a]">
                              +{product.images.length - 4}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Variant coverage */}
                      <td className="py-3.5 px-4">
                        {unassignedVariants.length === 0 ? (
                          <div className="inline-flex items-center gap-1 text-xs text-[#008060] bg-[#e6f4ea] px-2 py-0.5 rounded-full font-medium">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>All {product.variants.length} Mapped</span>
                          </div>
                        ) : (
                          <div className="inline-flex items-center gap-1 text-xs text-[#b45309] bg-[#fef3c7] px-2 py-0.5 rounded-full font-medium">
                            <AlertTriangle className="w-3.5 h-3.5" />
                            <span>{unassignedVariants.length} Missing</span>
                          </div>
                        )}
                      </td>

                      {/* Image SEO Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm px-2 py-0.5 rounded ${
                              product.overallSeoScore >= 80
                                ? 'bg-[#e6f4ea] text-[#006e52]'
                                : product.overallSeoScore >= 60
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#fee2e2] text-[#991b1b]'
                            }`}
                          >
                            {product.overallSeoScore}/100
                          </span>
                        </div>
                      </td>

                      {/* GEO AI Score */}
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-bold text-sm px-2 py-0.5 rounded ${
                              product.overallGeoScore >= 80
                                ? 'bg-[#e0f2fe] text-[#0369a1]'
                                : product.overallGeoScore >= 60
                                ? 'bg-[#fef3c7] text-[#92400e]'
                                : 'bg-[#fee2e2] text-[#991b1b]'
                            }`}
                          >
                            {product.overallGeoScore}/100
                          </span>
                        </div>
                      </td>

                      {/* Issues list pill */}
                      <td className="py-3.5 px-4">
                        {totalIssues === 0 && unassignedVariants.length === 0 ? (
                          <span className="text-xs text-[#008060] font-medium flex items-center gap-1">
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>Optimized</span>
                          </span>
                        ) : (
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {product.images.some((i) => !i.altText || i.altText.split(' ').length < 3) && (
                              <span className="px-1.5 py-0.5 bg-[#fee2e2] text-[#991b1b] rounded text-[10px] font-medium">
                                Alt Text
                              </span>
                            )}
                            {unassignedVariants.length > 0 && (
                              <span className="px-1.5 py-0.5 bg-[#fef3c7] text-[#92400e] rounded text-[10px] font-medium">
                                {unassignedVariants.length} Gaps
                              </span>
                            )}
                            {product.images.some((i) =>
                              i.issues.some((iss) => iss.type === 'filename_generic')
                            ) && (
                              <span className="px-1.5 py-0.5 bg-[#e0e7ff] text-[#3730a3] rounded text-[10px] font-medium">
                                Filenames
                              </span>
                            )}
                          </div>
                        )}
                      </td>

                      {/* Action buttons */}
                      <td className="py-3.5 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={() => onTriggerAuditProduct(product.id)}
                            disabled={isAuditing}
                            className="p-1.5 text-[#6d7175] hover:text-[#202223] hover:bg-[#e4e5e7] rounded-md transition disabled:opacity-50"
                            title="Run AI Image Audit"
                          >
                            <RefreshCw className={`w-4 h-4 ${isAuditing ? 'animate-spin text-[#008060]' : ''}`} />
                          </button>

                          <button
                            onClick={() => onOpenStudioForProduct(product)}
                            className="flex items-center gap-1 px-2.5 py-1.5 bg-[#f0f9ff] text-[#0284c7] hover:bg-[#e0f2fe] border border-[#bae6fd] rounded-lg text-xs font-semibold transition"
                            title="Generate images in AI Studio"
                          >
                            <Sparkles className="w-3.5 h-3.5" />
                            <span className="hidden sm:inline">Studio</span>
                          </button>

                          <button
                            onClick={() => onSelectProduct(product.id)}
                            className="flex items-center gap-1 px-3 py-1.5 bg-[#202223] text-white hover:bg-[#000] rounded-lg text-xs font-semibold transition shadow-2xs"
                          >
                            <span>Workspace</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
