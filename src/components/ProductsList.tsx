import React, { useMemo, useState } from 'react';
import { Search, ChevronDown, Loader2, ImageOff, Wand2 } from 'lucide-react';
import type { ShopifyProduct } from '../types';
import type { AltSaveResult, AltUpdate } from '../App';
import { flattenProductImages, type FlatImageRow, type ImageStatus } from '../utils/imageStatus';
import { useAltEditor, productTitleAlt } from '../hooks/useAltEditor';
import { AltTextInput } from './AltTextInput';
import { StatusBadge } from './StatusBadge';
import { PageHeader } from './PageHeader';
import { Pagination } from './Pagination';

interface ProductsListProps {
  products: ShopifyProduct[];
  onSaveAltTexts: (updates: AltUpdate[]) => Promise<AltSaveResult>;
  onRefresh: () => void;
  isRefreshing: boolean;
  initialFilter?: ProductFilter;
  initialSearch?: string;
  initialExpandedId?: string;
}

export type ProductFilter = 'all' | 'attention' | 'complete' | 'no_images';

interface ProductGroup {
  product: ShopifyProduct;
  rows: FlatImageRow[];
  counts: Record<ImageStatus, number>;
}

const PAGE_SIZE = 10;
const ISSUE_STATUSES: ImageStatus[] = ['missing', 'poor', 'duplicate'];

const needsAttention = (g: ProductGroup) => g.rows.some((r) => r.status !== 'good');

export const ProductsList: React.FC<ProductsListProps> = ({
  products,
  onSaveAltTexts,
  onRefresh,
  isRefreshing,
  initialFilter = 'all',
  initialSearch = '',
  initialExpandedId,
}) => {
  const [searchQuery, setSearchQuery] = useState(initialSearch);
  const [filter, setFilter] = useState<ProductFilter>(initialFilter);
  const [page, setPage] = useState(1);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(
    () => new Set(initialExpandedId ? [initialExpandedId] : [])
  );
  const [fillingIds, setFillingIds] = useState<Set<string>>(new Set());
  const editor = useAltEditor(onSaveAltTexts);

  // Statuses come from the catalog-wide rows so "duplicate" still means a
  // match anywhere in the store, not just within one product.
  const groups = useMemo<ProductGroup[]>(() => {
    const byProduct = new Map<string, FlatImageRow[]>();
    for (const row of flattenProductImages(products)) {
      const list = byProduct.get(row.product.id) ?? [];
      list.push(row);
      byProduct.set(row.product.id, list);
    }
    return products.map((product) => {
      const rows = byProduct.get(product.id) ?? [];
      const counts: Record<ImageStatus, number> = { missing: 0, poor: 0, duplicate: 0, good: 0 };
      rows.forEach((r) => counts[r.status]++);
      return { product, rows, counts };
    });
  }, [products]);

  const filterCounts = useMemo(
    () => ({
      all: groups.length,
      attention: groups.filter(needsAttention).length,
      complete: groups.filter((g) => g.rows.length > 0 && !needsAttention(g)).length,
      no_images: groups.filter((g) => g.rows.length === 0).length,
    }),
    [groups]
  );

  const filtered = useMemo(() => {
    const query = searchQuery.trim().toLowerCase();
    return groups.filter((g) => {
      if (
        query &&
        !g.product.title.toLowerCase().includes(query) &&
        !g.product.vendor.toLowerCase().includes(query) &&
        !g.product.productType.toLowerCase().includes(query)
      ) {
        return false;
      }
      if (filter === 'attention') return needsAttention(g);
      if (filter === 'complete') return g.rows.length > 0 && !needsAttention(g);
      if (filter === 'no_images') return g.rows.length === 0;
      return true;
    });
  }, [groups, searchQuery, filter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageGroups = filtered.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const toggleExpanded = (id: string) =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allPageExpanded =
    pageGroups.length > 0 && pageGroups.every((g) => expandedIds.has(g.product.id));
  const toggleAllOnPage = () =>
    setExpandedIds((prev) => {
      const next = new Set(prev);
      pageGroups.forEach((g) => (allPageExpanded ? next.delete(g.product.id) : next.add(g.product.id)));
      return next;
    });

  // Fills only the images with no ALT text, using the product title.
  const fillMissing = async (group: ProductGroup) => {
    const missing = group.rows.filter((r) => r.status === 'missing');
    if (missing.length === 0) return;
    const id = group.product.id;
    setFillingIds((prev) => new Set(prev).add(id));
    await editor.save(
      missing.map((r) => ({ imageId: r.image.id, altText: productTitleAlt(group.product, r.image) }))
    );
    setFillingIds((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Products"
        description="See each product's images together and fix their ALT text in one place."
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-[#e1e3e5]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
            <input
              type="text"
              placeholder="Search by product, vendor or type"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:bg-white transition"
            />
          </div>
          <button
            onClick={toggleAllOnPage}
            disabled={pageGroups.length === 0}
            className="px-3 py-2 text-sm font-medium bg-white border border-[#d2d5d8] rounded-lg hover:bg-[#f1f2f4] disabled:opacity-50 transition"
          >
            {allPageExpanded ? 'Collapse all' : 'Expand all'}
          </button>
        </div>

        <div className="px-4 pt-3 flex flex-wrap items-center gap-1 border-b border-[#e1e3e5]">
          {(
            [
              ['all', 'All'],
              ['attention', 'Needs attention'],
              ['complete', 'Complete'],
              ['no_images', 'No images'],
            ] as [ProductFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setFilter(value);
                setPage(1);
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                filter === value
                  ? 'border-[#008060] text-[#202223]'
                  : 'border-transparent text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              {label} <span className="text-[#8c9196] font-normal">{filterCounts[value]}</span>
            </button>
          ))}
        </div>

        {pageGroups.length === 0 ? (
          <div className="py-12 text-center text-sm text-[#6d7175]">
            No products matched your search or filter.
          </div>
        ) : (
          <ul className="divide-y divide-[#e1e3e5]">
            {pageGroups.map((group) => {
              const { product, rows, counts } = group;
              const isOpen = expandedIds.has(product.id);
              const isFilling = fillingIds.has(product.id);
              const goodPct = rows.length ? Math.round((counts.good / rows.length) * 100) : 0;
              const thumb = rows[0]?.image;

              return (
                <li key={product.id}>
                  <div className="flex items-center gap-4 px-4 py-3 hover:bg-[#f6f7f8] transition-colors">
                    <button
                      onClick={() => toggleExpanded(product.id)}
                      aria-expanded={isOpen}
                      className="flex flex-1 min-w-0 items-center gap-4 text-left"
                    >
                      <div className="w-12 h-12 shrink-0 rounded-lg bg-[#f1f2f4] overflow-hidden border border-[#e1e3e5] flex items-center justify-center">
                        {thumb ? (
                          <img
                            src={thumb.url}
                            alt={thumb.altText || product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        ) : (
                          <ImageOff className="w-5 h-5 text-[#8c9196]" />
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <div className="font-semibold text-sm text-[#202223] truncate">{product.title}</div>
                        <div className="text-xs text-[#6d7175] truncate">
                          {product.vendor} · {product.productType || 'Product'} ·{' '}
                          {rows.length === 1 ? '1 image' : `${rows.length} images`}
                        </div>
                      </div>

                      <div className="hidden sm:flex items-center gap-1.5 shrink-0">
                        {rows.length === 0 ? (
                          <span className="text-xs text-[#6d7175]">No images</span>
                        ) : needsAttention(group) ? (
                          ISSUE_STATUSES.filter((s) => counts[s] > 0).map((s) => (
                            <StatusBadge key={s} status={s} count={counts[s]} />
                          ))
                        ) : (
                          <StatusBadge status="good" />
                        )}
                      </div>

                      {rows.length > 0 && (
                        <div className="hidden md:block w-28 shrink-0" title={`${counts.good} of ${rows.length} images have good ALT text`}>
                          <div className="flex justify-between text-[11px] text-[#6d7175] mb-1">
                            <span>Good ALT</span>
                            <span>
                              {counts.good}/{rows.length}
                            </span>
                          </div>
                          <div className="h-1.5 rounded-full bg-[#e1e3e5] overflow-hidden">
                            <div className="h-full bg-[#008060] rounded-full" style={{ width: `${goodPct}%` }} />
                          </div>
                        </div>
                      )}

                      <ChevronDown
                        className={`w-4 h-4 shrink-0 text-[#6d7175] transition-transform ${isOpen ? 'rotate-180' : ''}`}
                      />
                    </button>
                  </div>

                  {isOpen && (
                    <div className="px-4 pb-4 pt-1 bg-[#fafbfb] border-t border-[#e1e3e5]">
                      {rows.length === 0 ? (
                        <p className="py-6 text-center text-sm text-[#6d7175]">
                          This product has no images yet.
                        </p>
                      ) : (
                        <>
                          {counts.missing > 0 && (
                            <div className="flex justify-end py-2">
                              <button
                                onClick={() => fillMissing(group)}
                                disabled={isFilling}
                                className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold text-white bg-[#008060] rounded-lg hover:bg-[#006e52] disabled:opacity-60 transition"
                              >
                                {isFilling ? (
                                  <Loader2 className="w-4 h-4 animate-spin" />
                                ) : (
                                  <Wand2 className="w-4 h-4" />
                                )}
                                Fill {counts.missing} missing with product title
                              </button>
                            </div>
                          )}
                          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-2">
                            {rows.map((row, idx) => (
                              <div
                                key={row.image.id}
                                className="bg-white border border-[#e1e3e5] rounded-lg overflow-hidden"
                              >
                                <div className="relative aspect-[4/3] bg-[#f1f2f4]">
                                  <img
                                    src={row.image.url}
                                    alt={row.image.altText || product.title}
                                    referrerPolicy="no-referrer"
                                    loading="lazy"
                                    className="w-full h-full object-contain"
                                  />
                                  <span className="absolute top-2 left-2 px-1.5 py-0.5 rounded bg-white/90 text-[11px] font-semibold text-[#4a4a4a]">
                                    {idx === 0 ? 'Featured' : `#${idx + 1}`}
                                  </span>
                                  <span className="absolute top-2 right-2">
                                    <StatusBadge status={row.status} />
                                  </span>
                                </div>
                                <div className="p-3 space-y-1.5">
                                  <AltTextInput image={row.image} editor={editor} />
                                  <div className="text-[11px] text-[#8c9196] truncate" title={row.image.filename}>
                                    {row.image.width && row.image.height
                                      ? `${row.image.width}×${row.image.height} · `
                                      : ''}
                                    {row.image.filename}
                                  </div>
                                </div>
                              </div>
                            ))}
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        <Pagination
          page={currentPage}
          pageSize={PAGE_SIZE}
          total={filtered.length}
          onPageChange={setPage}
        />
      </div>
    </div>
  );
};
