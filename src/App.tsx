import React, { useState, useEffect } from 'react';
import { ShopifyNav } from './components/ShopifyNav';
import { CatalogOverview } from './components/CatalogOverview';
import { ProductWorkspace } from './components/ProductWorkspace';
import { AiImageStudio } from './components/AiImageStudio';
import { ShopifyFilesModal } from './components/ShopifyFilesModal';
import { SettingsRulesModal } from './components/SettingsRulesModal';
import { QuickAuditModal } from './components/QuickAuditModal';
import type {
  ShopifyProduct,
  StoreAuditSummary,
  ShopifyFile,
  AspectRatio,
  GeneratedImageResult,
} from './types';

export default function App() {
  const [currentTab, setCurrentTab] = useState<
    'catalog' | 'workspace' | 'studio' | 'files' | 'settings'
  >('catalog');

  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [summary, setSummary] = useState<StoreAuditSummary | null>(null);
  const [selectedProductId, setSelectedProductId] = useState<string>('prod_1');
  const [studioTargetVariantId, setStudioTargetVariantId] = useState<string | undefined>(undefined);
  const [files, setFiles] = useState<ShopifyFile[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isAuditingStore, setIsAuditingStore] = useState(false);
  const [isAuditingProductId, setIsAuditingProductId] = useState<string | null>(null);
  const [isApplyingFix, setIsApplyingFix] = useState(false);
  const [isQuickAuditModalOpen, setIsQuickAuditModalOpen] = useState(false);

  // Fetch initial data
  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [prodRes, filesRes] = await Promise.all([
        fetch('/api/products'),
        fetch('/api/shopify/files'),
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
        setSummary(data.summary || null);
        if (data.products?.length > 0 && !selectedProductId) {
          setSelectedProductId(data.products[0].id);
        }
      }

      if (filesRes.ok) {
        const filesData = await filesRes.json();
        setFiles(filesData || []);
      }
    } catch (err) {
      console.error('Error fetching initial catalog data:', err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const selectedProduct =
    products.find((p) => p.id === selectedProductId) || products[0] || null;

  // Run Store Audit
  const handleTriggerStoreAudit = async () => {
    try {
      setIsAuditingStore(true);
      setIsQuickAuditModalOpen(true);
      const res = await fetch('/api/audit-all', { method: 'POST' });
      if (res.ok) {
        const data = await res.json();
        setSummary(data.summary);
        setProducts(data.products);
      }
    } catch (err) {
      console.error('Failed to run store audit:', err);
    } finally {
      setIsAuditingStore(false);
    }
  };

  // Run single Product Audit with Gemini
  const handleTriggerAuditProduct = async (productId: string) => {
    try {
      setIsAuditingProductId(productId);
      const res = await fetch(`/api/products/${productId}/audit`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        // Refresh summary
        const sumRes = await fetch('/api/products');
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.summary);
        }
      }
    } catch (err) {
      console.error('Failed to audit product:', err);
    } finally {
      setIsAuditingProductId(null);
    }
  };

  // Apply single fix to an image
  const handleApplyFix = async (imageId: string, field: string, value?: any) => {
    if (!selectedProduct) return;
    try {
      setIsApplyingFix(true);
      const res = await fetch(`/api/products/${selectedProduct.id}/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, field, value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        // Update summary
        const sumRes = await fetch('/api/products');
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.summary);
        }
      }
    } catch (err) {
      console.error('Failed to apply fix:', err);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Apply all pending fixes on product
  const handleApplyAllFixes = async () => {
    if (!selectedProduct) return;
    try {
      setIsApplyingFix(true);
      const res = await fetch(`/api/products/${selectedProduct.id}/apply-all`, {
        method: 'POST',
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        // Update summary
        const sumRes = await fetch('/api/products');
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.summary);
        }
      }
    } catch (err) {
      console.error('Failed to apply all fixes:', err);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Apply bulk fixes to selected images
  const handleApplyBulkFix = async (
    imageIds: string[],
    action: string,
    options?: {
      altPattern?: string;
      filenamePattern?: string;
      customFixes?: { imageId: string; altText?: string; filename?: string }[];
    }
  ) => {
    if (!selectedProduct) return;
    try {
      setIsApplyingFix(true);
      const res = await fetch(`/api/products/${selectedProduct.id}/bulk-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageIds,
          action,
          altPattern: options?.altPattern,
          filenamePattern: options?.filenamePattern,
          customFixes: options?.customFixes,
        }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        const sumRes = await fetch('/api/products');
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.summary);
        }
      }
    } catch (err) {
      console.error('Failed to apply bulk fix:', err);
    } finally {
      setIsApplyingFix(false);
    }
  };

  // Attach image to product (from Studio)
  const handleAttachToProduct = async (
    productId: string,
    data: {
      url: string;
      altText: string;
      filename: string;
      variantId?: string;
      isHero?: boolean;
      aspectRatio: AspectRatio;
    }
  ) => {
    try {
      const res = await fetch(`/api/products/${productId}/attach-image`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) =>
          prev.map((p) => (p.id === updated.id ? updated : p))
        );
        // Also refresh files
        const filesRes = await fetch('/api/shopify/files');
        if (filesRes.ok) {
          setFiles(await filesRes.json());
        }
        // Update summary
        const sumRes = await fetch('/api/products');
        if (sumRes.ok) {
          const sumData = await sumRes.json();
          setSummary(sumData.summary);
        }
      }
    } catch (err) {
      console.error('Failed to attach image to product:', err);
    }
  };

  const handleNewStudioGeneration = (productId: string, result: GeneratedImageResult) => {
    setProducts((prev) =>
      prev.map((p) => {
        if (p.id !== productId) return p;
        const prevGens = p.studioGenerations || [];
        if (prevGens.some((g) => g.id === result.id || g.url === result.url)) return p;
        return {
          ...p,
          studioGenerations: [result, ...prevGens],
        };
      })
    );
  };

  // Save image directly to Shopify Files
  const handleSaveToFiles = async (fileData: {
    name: string;
    url: string;
    altText: string;
    sizeKb: number;
  }) => {
    try {
      const res = await fetch('/api/shopify/files', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(fileData),
      });
      if (res.ok) {
        const newFile = await res.json();
        setFiles((prev) => [newFile, ...prev]);
      }
    } catch (err) {
      console.error('Failed to save to Shopify files:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex flex-col font-sans">
      {/* Polaris Navigation Shell */}
      <ShopifyNav
        currentTab={currentTab}
        onSelectTab={setCurrentTab}
        summary={summary}
        onTriggerStoreAudit={handleTriggerStoreAudit}
        isAuditing={isAuditingStore}
        selectedProductTitle={selectedProduct?.title}
      />

      {/* Main Content Area */}
      <main className="flex-1 p-4 sm:p-6 lg:p-8">
        {isLoading ? (
          <div className="flex flex-col items-center justify-center py-24 space-y-3">
            <div className="w-10 h-10 border-4 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
            <div className="font-semibold text-sm text-[#202223]">
              Loading Next AI Shopify Admin...
            </div>
          </div>
        ) : (
          <>
            {/* View 1: Catalog & SEO/GEO Monitor */}
            {currentTab === 'catalog' && (
              <CatalogOverview
                products={products}
                summary={summary}
                onSelectProduct={(id) => {
                  setSelectedProductId(id);
                  setCurrentTab('workspace');
                }}
                onOpenStudioForProduct={(prod) => {
                  setSelectedProductId(prod.id);
                  setCurrentTab('studio');
                }}
                onTriggerAuditProduct={handleTriggerAuditProduct}
                isAuditingId={isAuditingProductId}
              />
            )}

            {/* View 2: Product Deep-Dive Workspace */}
            {currentTab === 'workspace' && selectedProduct && (
              <ProductWorkspace
                product={selectedProduct}
                onBack={() => setCurrentTab('catalog')}
                onApplyFix={handleApplyFix}
                onApplyAllFixes={handleApplyAllFixes}
                onApplyBulkFix={handleApplyBulkFix}
                onTriggerAudit={() => handleTriggerAuditProduct(selectedProduct.id)}
                onOpenStudioForVariant={(varId) => {
                  setStudioTargetVariantId(varId);
                  setCurrentTab('studio');
                }}
                onOpenStudioForHero={() => {
                  setCurrentTab('studio');
                }}
                onOpenStudio={(preset) => {
                  if (preset?.variantId) setStudioTargetVariantId(preset.variantId);
                  setCurrentTab('studio');
                }}
                onAttachImageToProduct={handleAttachToProduct}
                isAuditing={isAuditingProductId === selectedProduct.id}
                isApplying={isApplyingFix}
              />
            )}

            {/* View 3: AI Product Image Studio */}
            {currentTab === 'studio' && (
              <AiImageStudio
                products={products}
                selectedProduct={selectedProduct}
                onSelectProduct={(p) => setSelectedProductId(p.id)}
                onSaveToFiles={handleSaveToFiles}
                onAttachToProduct={handleAttachToProduct}
                initialTargetVariantId={studioTargetVariantId}
                onNewStudioGeneration={handleNewStudioGeneration}
              />
            )}

            {/* View 4: Shopify Files Library */}
            {currentTab === 'files' && <ShopifyFilesModal files={files} />}

            {/* View 5: SEO & GEO Rules Settings */}
            {currentTab === 'settings' && <SettingsRulesModal />}
          </>
        )}
      </main>

      {/* Quick Store Audit Results Modal */}
      <QuickAuditModal
        isOpen={isQuickAuditModalOpen}
        onClose={() => setIsQuickAuditModalOpen(false)}
        summary={summary}
        products={products}
        onOpenProductWorkspace={(prodId) => {
          setSelectedProductId(prodId);
          setCurrentTab('workspace');
        }}
        isAuditing={isAuditingStore}
      />
    </div>
  );
}
