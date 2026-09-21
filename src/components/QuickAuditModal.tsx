import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  X,
  ArrowRight,
  ShieldCheck,
  RefreshCw,
} from 'lucide-react';
import type { StoreAuditSummary, ShopifyProduct } from '../types';

interface QuickAuditModalProps {
  isOpen: boolean;
  onClose: () => void;
  summary: StoreAuditSummary | null;
  products: ShopifyProduct[];
  onOpenProductWorkspace: (productId: string) => void;
  isAuditing: boolean;
}

export const QuickAuditModal: React.FC<QuickAuditModalProps> = ({
  isOpen,
  onClose,
  summary,
  products,
  onOpenProductWorkspace,
  isAuditing,
}) => {
  if (!isOpen) return null;

  // Find most critical product
  const criticalProduct = [...products].sort(
    (a, b) => a.overallSeoScore - b.overallSeoScore
  )[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs animate-fade-in">
      <div className="bg-white border border-[#d2d5d8] rounded-2xl max-w-lg w-full p-6 shadow-xl space-y-5">
        <div className="flex items-center justify-between border-b border-[#f1f2f4] pb-3">
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <Sparkles className="w-5 h-5" />
            </span>
            <h3 className="font-bold text-base text-[#202223]">
              Store-wide Image SEO & GEO Audit
            </h3>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-[#8c9196] hover:text-[#202223] rounded-md transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {isAuditing ? (
          <div className="py-8 text-center space-y-4">
            <RefreshCw className="w-10 h-10 text-[#008060] animate-spin mx-auto" />
            <div className="font-bold text-sm text-[#202223]">
              Running comprehensive catalog audit...
            </div>
            <p className="text-xs text-[#6d7175] max-w-xs mx-auto">
              Evaluating image alt text depth, filename keywords, variant mapping coverage, and Schema.org JSON-LD across all products.
            </p>
          </div>
        ) : summary ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-[#e6f4ea] rounded-xl border border-[#bbf7d0] text-center">
                <span className="text-[11px] font-bold text-[#166534] uppercase">
                  Image SEO Score
                </span>
                <div className="text-2xl font-extrabold text-[#15803d] mt-1">
                  {summary.averageSeoScore}/100
                </div>
              </div>

              <div className="p-3 bg-[#e0f2fe] rounded-xl border border-[#bae6fd] text-center">
                <span className="text-[11px] font-bold text-[#075985] uppercase">
                  GEO AI-Readiness
                </span>
                <div className="text-2xl font-extrabold text-[#0369a1] mt-1">
                  {summary.averageGeoScore}/100
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs border border-[#e1e3e5] rounded-xl p-3.5 bg-[#fafbfb]">
              <div className="font-bold text-[#202223] mb-1">
                Findings across {summary.totalProducts} products ({summary.totalImages} images):
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#f1f2f4]">
                <span className="text-[#6d7175]">Missing or weak alt text:</span>
                <span className="font-bold text-[#dc2626]">{summary.missingAltCount} images</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#f1f2f4]">
                <span className="text-[#6d7175]">Camera-default filenames:</span>
                <span className="font-bold text-[#d97706]">{summary.weakFilenameCount} images</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-[#f1f2f4]">
                <span className="text-[#6d7175]">Unassigned variant gaps:</span>
                <span className="font-bold text-[#b45309]">{summary.unassignedVariantGaps} SKUs</span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-[#6d7175]">Missing multi-language alt text:</span>
                <span className="font-bold text-[#4f46e5]">{summary.missingTranslationsCount} images</span>
              </div>
            </div>

            {criticalProduct && (
              <div className="p-3.5 bg-[#fffbeb] border border-[#fde68a] rounded-xl space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-[#92400e]">
                  <AlertTriangle className="w-4 h-4" />
                  <span>Top Priority for Immediate Fix:</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="text-xs font-semibold text-[#202223] truncate max-w-[240px]">
                    {criticalProduct.title}
                  </div>
                  <button
                    onClick={() => {
                      onOpenProductWorkspace(criticalProduct.id);
                      onClose();
                    }}
                    className="flex items-center gap-1 text-xs font-bold text-[#b45309] hover:underline"
                  >
                    <span>Fix in Workspace</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            )}

            <button
              onClick={onClose}
              className="w-full py-2.5 bg-[#202223] hover:bg-black text-white rounded-lg text-xs font-bold transition"
            >
              Close Summary
            </button>
          </div>
        ) : null}
      </div>
    </div>
  );
};
