import React, { useState, useEffect, useCallback } from 'react';
import { AlertCircle } from 'lucide-react';
import { Sidebar, type AppTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Overview } from './components/Overview';
import { ImagesList, type StatusFilter } from './components/ImagesList';
import { ProductsList, type ProductFilter } from './components/ProductsList';
import { readDismissedBanners, saveDismissedBanners, type BannerData } from './components/Banner';
import { Settings } from './components/Settings';
import type { ShopifyProduct } from './types';
import { shopifyFetch, showToast } from './utils/shopifyFetch';

export interface AltUpdate {
  imageId: string;
  altText: string;
}

// Where a dashboard link sends the merchant, with the filters to open on.
export interface NavTarget {
  tab: AppTab;
  imageStatus?: StatusFilter;
  productFilter?: ProductFilter;
  search?: string;
  expandProductId?: string;
}

export interface AltSaveResult {
  updated: AltUpdate[];
  failed: { imageId: string; message: string }[];
}

async function readError(res: Response): Promise<string> {
  try {
    const body = await res.json();
    if (body?.message) return body.detail ? `${body.message} (${body.detail})` : body.message;
  } catch {
    // Fall through to the generic message.
  }
  return `Request failed (${res.status}).`;
}

export default function App() {
  // navKey remounts the target tab so it opens with the requested filters.
  const [nav, setNav] = useState<NavTarget & { navKey: number }>({ tab: 'overview', navKey: 0 });
  const currentTab = nav.tab;
  const navigate = useCallback(
    (target: NavTarget) => setNav((prev) => ({ ...target, navKey: prev.navKey + 1 })),
    []
  );
  const [banners, setBanners] = useState<BannerData[]>([]);
  const [dismissedBanners, setDismissedBanners] = useState<Set<string>>(() => readDismissedBanners());
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shopInfo, setShopInfo] = useState<{ shopName: string; shopDomain: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const fetchData = useCallback(async (mode: 'initial' | 'refresh') => {
    if (mode === 'initial') setIsLoading(true);
    else setIsRefreshing(true);
    try {
      const [prodRes, shopRes] = await Promise.all([
        shopifyFetch('/api/products'),
        shopifyFetch('/api/shop'),
      ]);

      if (!prodRes.ok) {
        setLoadError(await readError(prodRes));
        return;
      }
      const data = await prodRes.json();
      setProducts(data.products || []);
      setLoadError(null);
      setLastSyncedAt(new Date());

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShopInfo({ shopName: shopData.shopName, shopDomain: shopData.shopDomain });
      }
      if (mode === 'refresh') showToast('Catalog synced with Shopify');
    } catch (err) {
      console.error('Error fetching catalog:', err);
      setLoadError('Could not reach the app server. Check your connection and try again.');
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, []);

  useEffect(() => {
    fetchData('initial');
  }, [fetchData]);

  // Banners are optional extras: a failure here never blocks the dashboard.
  useEffect(() => {
    shopifyFetch('/api/banners')
      .then((res) => (res.ok ? res.json() : { banners: [] }))
      .then((data) => setBanners(Array.isArray(data?.banners) ? data.banners : []))
      .catch(() => setBanners([]));
  }, []);

  const dismissBanner = useCallback((id: string) => {
    setDismissedBanners((prev) => {
      const next = new Set(prev).add(id);
      saveDismissedBanners(next);
      return next;
    });
  }, []);

  // Saves ALT text to Shopify and applies only the changes Shopify confirmed.
  const saveAltTexts = useCallback(async (updates: AltUpdate[]): Promise<AltSaveResult> => {
    const failAll = (message: string): AltSaveResult => ({
      updated: [],
      failed: updates.map((u) => ({ imageId: u.imageId, message })),
    });

    let result: AltSaveResult;
    try {
      const res = await shopifyFetch('/api/images/alt', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ updates }),
      });
      result = res.ok ? await res.json() : failAll(await readError(res));
    } catch {
      result = failAll('Could not reach the app server.');
    }

    if (result.updated.length > 0) {
      const saved = new Map(result.updated.map((u) => [u.imageId, u.altText]));
      setProducts((prev) =>
        prev.map((p) =>
          p.images.some((img) => saved.has(img.id))
            ? {
                ...p,
                images: p.images.map((img) =>
                  saved.has(img.id) ? { ...img, altText: saved.get(img.id)! } : img
                ),
              }
            : p
        )
      );
    }

    if (result.failed.length === 0) {
      showToast(
        result.updated.length === 1
          ? 'ALT text saved to Shopify'
          : `${result.updated.length} ALT texts saved to Shopify`
      );
    } else {
      showToast(
        result.updated.length > 0
          ? `${result.updated.length} saved, ${result.failed.length} failed`
          : result.failed[0].message,
        true
      );
    }
    return result;
  }, []);

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex flex-col font-sans">
      <TopBar shopInfo={shopInfo} />

      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onSelectTab={(tab) => navigate({ tab })} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
              <div className="font-semibold text-sm text-[#202223]">Loading your catalog from Shopify...</div>
            </div>
          ) : loadError ? (
            <div className="max-w-lg mx-auto mt-16 bg-white border border-[#e1e3e5] rounded-xl p-6 shadow-xs text-center space-y-4">
              <AlertCircle className="w-8 h-8 text-[#d72c0d] mx-auto" />
              <div>
                <div className="font-semibold text-[#202223]">Couldn't load your store</div>
                <p className="text-sm text-[#6d7175] mt-1">{loadError}</p>
              </div>
              <button
                onClick={() => fetchData('initial')}
                className="px-4 py-2 text-sm font-semibold text-white bg-[#008060] rounded-lg hover:bg-[#006e52] transition"
              >
                Try again
              </button>
            </div>
          ) : (
            <>
              {currentTab === 'overview' && (
                <Overview
                  products={products}
                  banners={banners.filter((b) => !dismissedBanners.has(b.id))}
                  onDismissBanner={dismissBanner}
                  lastSyncedAt={lastSyncedAt}
                  onRefresh={() => fetchData('refresh')}
                  isRefreshing={isRefreshing}
                  onNavigate={navigate}
                />
              )}
              {currentTab === 'products' && (
                <ProductsList
                  key={nav.navKey}
                  initialFilter={nav.productFilter}
                  initialSearch={nav.search}
                  initialExpandedId={nav.expandProductId}
                  products={products}
                  onSaveAltTexts={saveAltTexts}
                  onRefresh={() => fetchData('refresh')}
                  isRefreshing={isRefreshing}
                />
              )}
              {currentTab === 'images' && (
                <ImagesList
                  key={nav.navKey}
                  initialStatusFilter={nav.imageStatus}
                  products={products}
                  onSaveAltTexts={saveAltTexts}
                  onRefresh={() => fetchData('refresh')}
                  isRefreshing={isRefreshing}
                />
              )}
              {currentTab === 'settings' && <Settings shopInfo={shopInfo} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
