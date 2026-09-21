import React from 'react';
import {
  Sparkles,
  ShoppingBag,
  Package,
  Layers,
  FileImage,
  Search,
  Bell,
  ExternalLink,
  ShieldCheck,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Sliders,
  Settings,
} from 'lucide-react';
import type { StoreAuditSummary } from '../types';

interface ShopifyNavProps {
  currentTab: 'catalog' | 'workspace' | 'studio' | 'files' | 'settings';
  onSelectTab: (tab: 'catalog' | 'workspace' | 'studio' | 'files' | 'settings') => void;
  summary: StoreAuditSummary | null;
  onTriggerStoreAudit: () => void;
  isAuditing: boolean;
  selectedProductTitle?: string;
}

export const ShopifyNav: React.FC<ShopifyNavProps> = ({
  currentTab,
  onSelectTab,
  summary,
  onTriggerStoreAudit,
  isAuditing,
  selectedProductTitle,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#1a1a1a] text-white border-b border-[#2d2d2d] shadow-sm">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2 text-xs">
        {/* Store selector & App Identity */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 px-2.5 py-1 bg-[#262626] rounded-md border border-[#3a3a3a]">
            <span className="w-2 h-2 rounded-full bg-[#008060] animate-pulse"></span>
            <span className="font-medium text-white">Aura Outdoor Gear</span>
            <span className="text-[#8c9196] font-mono text-[11px]">aura-store.myshopify.com</span>
          </div>

          <div className="h-4 w-px bg-[#3a3a3a]"></div>

          <div className="flex items-center gap-1.5 px-2 py-0.5 bg-[#008060]/20 text-[#10b981] border border-[#008060]/30 rounded text-[11px] font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Next AI Studio & Image SEO/GEO</span>
            <span className="px-1 py-0.2 bg-[#008060] text-white rounded text-[9px]">v2.4</span>
          </div>
        </div>

        {/* Global search & Health summary */}
        <div className="flex items-center gap-3">
          {summary && (
            <div className="hidden lg:flex items-center gap-3 px-3 py-1 bg-[#242424] border border-[#383838] rounded-md">
              <div className="flex items-center gap-1.5">
                <span className="text-[#a6acb2]">Store Image SEO:</span>
                <span className="font-bold text-[#10b981] bg-[#10b981]/15 px-1.5 py-0.5 rounded">
                  {summary.averageSeoScore}/100
                </span>
              </div>
              <div className="h-3 w-px bg-[#3e3e3e]"></div>
              <div className="flex items-center gap-1.5">
                <span className="text-[#a6acb2]">GEO AI-Readiness:</span>
                <span className="font-bold text-[#38bdf8] bg-[#38bdf8]/15 px-1.5 py-0.5 rounded">
                  {summary.averageGeoScore}/100
                </span>
              </div>
              {summary.unassignedVariantGaps > 0 && (
                <>
                  <div className="h-3 w-px bg-[#3e3e3e]"></div>
                  <div className="flex items-center gap-1 text-[#f59e0b]">
                    <AlertTriangle className="w-3 h-3" />
                    <span>{summary.unassignedVariantGaps} Variant Gaps</span>
                  </div>
                </>
              )}
            </div>
          )}

          {/* Quick Audit Button */}
          <button
            onClick={onTriggerStoreAudit}
            disabled={isAuditing}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2c2c2c] hover:bg-[#383838] text-white border border-[#444] rounded-md font-medium transition disabled:opacity-50"
            title="Run complete Image SEO & GEO audit across catalog"
          >
            <RefreshCw className={`w-3.5 h-3.5 text-[#38bdf8] ${isAuditing ? 'animate-spin' : ''}`} />
            <span>{isAuditing ? 'Auditing Store...' : 'Quick Store Audit'}</span>
          </button>

          <a
            href="https://aura-store.myshopify.com"
            target="_blank"
            rel="noopener noreferrer"
            className="hidden sm:flex items-center gap-1 text-[#8c9196] hover:text-white transition px-2 py-1"
          >
            <span>Live Store</span>
            <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      </div>

      {/* Primary Navigation Tabs */}
      <div className="flex items-center px-4 bg-[#202020] border-t border-[#2e2e2e] text-sm overflow-x-auto">
        <div className="flex items-center space-x-1">
          <button
            onClick={() => onSelectTab('catalog')}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              currentTab === 'catalog'
                ? 'text-white border-[#008060] bg-[#2a2a2a]'
                : 'text-[#999] border-transparent hover:text-white hover:bg-[#262626]'
            }`}
          >
            <Package className="w-4 h-4 text-[#8c9196]" />
            <span>Catalog SEO/GEO Monitor</span>
          </button>

          <button
            onClick={() => onSelectTab('workspace')}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              currentTab === 'workspace'
                ? 'text-white border-[#008060] bg-[#2a2a2a]'
                : 'text-[#999] border-transparent hover:text-white hover:bg-[#262626]'
            }`}
          >
            <Sliders className="w-4 h-4 text-[#8c9196]" />
            <span>Product Workspace</span>
            {selectedProductTitle && (
              <span className="max-w-[140px] truncate text-[11px] text-[#8c9196] bg-[#333] px-1.5 py-0.5 rounded">
                {selectedProductTitle}
              </span>
            )}
          </button>

          <button
            onClick={() => onSelectTab('studio')}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              currentTab === 'studio'
                ? 'text-white border-[#008060] bg-[#2a2a2a]'
                : 'text-[#999] border-transparent hover:text-white hover:bg-[#262626]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#38bdf8]" />
            <span>AI Image Studio</span>
            <span className="bg-[#38bdf8]/20 text-[#38bdf8] text-[10px] px-1.5 py-0.2 rounded font-semibold uppercase">
              Generate
            </span>
          </button>

          <button
            onClick={() => onSelectTab('files')}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              currentTab === 'files'
                ? 'text-white border-[#008060] bg-[#2a2a2a]'
                : 'text-[#999] border-transparent hover:text-white hover:bg-[#262626]'
            }`}
          >
            <FileImage className="w-4 h-4 text-[#8c9196]" />
            <span>Shopify Files Library</span>
          </button>

          <button
            onClick={() => onSelectTab('settings')}
            className={`flex items-center gap-2 px-3.5 py-2.5 font-medium border-b-2 transition whitespace-nowrap ${
              currentTab === 'settings'
                ? 'text-white border-[#008060] bg-[#2a2a2a]'
                : 'text-[#999] border-transparent hover:text-white hover:bg-[#262626]'
            }`}
          >
            <Settings className="w-4 h-4 text-[#8c9196]" />
            <span>SEO & GEO Rules</span>
          </button>
        </div>
      </div>
    </header>
  );
};
