import React, { useState, useEffect } from 'react';
import { Sidebar, type AppTab } from './components/Sidebar';
import { TopBar } from './components/TopBar';
import { Overview } from './components/Overview';
import { ImagesList } from './components/ImagesList';
import { Settings } from './components/Settings';
import type { ShopifyProduct } from './types';
import { shopifyFetch } from './utils/shopifyFetch';

export default function App() {
  const [currentTab, setCurrentTab] = useState<AppTab>('overview');
  const [products, setProducts] = useState<ShopifyProduct[]>([]);
  const [shopInfo, setShopInfo] = useState<{ shopName: string; shopDomain: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchData = async () => {
    try {
      setIsLoading(true);
      const [prodRes, shopRes] = await Promise.all([
        shopifyFetch('/api/products'),
        shopifyFetch('/api/shop'),
      ]);

      if (prodRes.ok) {
        const data = await prodRes.json();
        setProducts(data.products || []);
      }

      if (shopRes.ok) {
        const shopData = await shopRes.json();
        setShopInfo(
          shopData.connected ? { shopName: shopData.shopName, shopDomain: shopData.shopDomain } : null
        );
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

  const handleApplyFix = async (productId: string, imageId: string, field: string, value: string) => {
    try {
      const res = await shopifyFetch(`/api/products/${encodeURIComponent(productId)}/apply-fix`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ imageId, field, value }),
      });
      if (res.ok) {
        const updated = await res.json();
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      } else {
        console.error('Failed to apply fix: server responded', res.status, await res.text());
      }
    } catch (err) {
      console.error('Failed to apply fix:', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#f6f6f7] flex flex-col font-sans">
      <TopBar shopInfo={shopInfo} />

      <div className="flex flex-1">
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-24 space-y-3">
              <div className="w-10 h-10 border-4 border-[#008060] border-t-transparent rounded-full animate-spin"></div>
              <div className="font-semibold text-sm text-[#202223]">Loading Image SEO...</div>
            </div>
          ) : (
            <>
              {currentTab === 'overview' && <Overview products={products} />}
              {currentTab === 'images' && (
                <ImagesList products={products} onApplyFix={handleApplyFix} />
              )}
              {currentTab === 'settings' && <Settings shopInfo={shopInfo} />}
            </>
          )}
        </main>
      </div>
    </div>
  );
}
