import React, { useMemo, useState } from 'react';
import { Search, ChevronLeft, ChevronRight } from 'lucide-react';
import type { ShopifyProduct } from '../types';
import { flattenProductImages, type FlatImageRow, type ImageStatus } from '../utils/imageStatus';

interface ImagesListProps {
  products: ShopifyProduct[];
  onApplyFix: (productId: string, imageId: string, field: string, value: string) => Promise<void>;
}

const STATUS_LABEL: Record<ImageStatus, string> = {
  missing: 'Missing',
  poor: 'Poor',
  duplicate: 'Duplicate',
  good: 'Good',
};

const STATUS_BADGE_CLASS: Record<ImageStatus, string> = {
  missing: 'bg-[#fef3c7] text-[#92400e]',
  poor: 'bg-[#f1f2f4] text-[#4a4a4a]',
  duplicate: 'bg-[#e0e7ff] text-[#3730a3]',
  good: 'bg-[#e6f4ea] text-[#006e52]',
};

type StatusFilter = 'all' | 'issues' | 'missing' | 'duplicate' | 'good';

const PAGE_SIZE = 10;

export const ImagesList: React.FC<ImagesListProps> = ({ products, onApplyFix }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [formatFilter, setFormatFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [drafts, setDrafts] = useState<Record<string, string>>({});

  const allRows = useMemo(() => flattenProductImages(products), [products]);

  const formats = useMemo(
    () => Array.from(new Set(allRows.map((r) => r.image.format))).sort(),
    [allRows]
  );

  const filteredRows = useMemo(() => {
    return allRows.filter((row) => {
      const query = searchQuery.trim().toLowerCase();
      const matchesSearch =
        !query ||
        row.product.title.toLowerCase().includes(query) ||
        row.image.altText.toLowerCase().includes(query);
      if (!matchesSearch) return false;

      if (formatFilter !== 'all' && row.image.format !== formatFilter) return false;

      if (statusFilter === 'issues') return row.status !== 'good';
      if (statusFilter !== 'all') return row.status === statusFilter;
      return true;
    });
  }, [allRows, searchQuery, formatFilter, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRows.length / PAGE_SIZE));
  const currentPage = Math.min(page, totalPages);
  const pageRows = filteredRows.slice((currentPage - 1) * PAGE_SIZE, currentPage * PAGE_SIZE);

  const resetToFirstPage = () => setPage(1);

  const commitAltText = async (row: FlatImageRow, value: string) => {
    if (value === row.image.altText) return;
    await onApplyFix(row.product.id, row.image.id, 'altText', value);
  };

  const toggleSelectOne = (imageId: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(imageId)) next.delete(imageId);
      else next.add(imageId);
      return next;
    });
  };

  const allPageSelected = pageRows.length > 0 && pageRows.every((r) => selectedIds.has(r.image.id));
  const toggleSelectAllOnPage = () => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (allPageSelected) {
        pageRows.forEach((r) => next.delete(r.image.id));
      } else {
        pageRows.forEach((r) => next.add(r.image.id));
      }
      return next;
    });
  };

  return (
    <div className="space-y-4 max-w-6xl mx-auto pb-12">
      <div>
        <h1 className="text-2xl font-bold text-[#202223]">Images</h1>
        <p className="text-sm text-[#6d7175] mt-1">Review and improve ALT text across your catalog.</p>
      </div>

      <div className="bg-white border border-[#e1e3e5] rounded-xl shadow-xs overflow-hidden">
        <div className="p-4 flex flex-col md:flex-row gap-3 border-b border-[#e1e3e5]">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
            <input
              type="text"
              placeholder="Search products or ALT text"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                resetToFirstPage();
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060] focus:bg-white transition"
            />
          </div>
          <select
            value={formatFilter}
            onChange={(e) => {
              setFormatFilter(e.target.value);
              resetToFirstPage();
            }}
            className="px-3 py-2 text-sm bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]"
          >
            <option value="all">All image types</option>
            {formats.map((f) => (
              <option key={f} value={f}>
                {f}
              </option>
            ))}
          </select>
        </div>

        <div className="px-4 pt-3 flex items-center gap-1 border-b border-[#e1e3e5]">
          {(
            [
              ['all', 'All'],
              ['issues', 'Issues'],
              ['missing', 'Missing ALT'],
              ['duplicate', 'Duplicate'],
              ['good', 'Good'],
            ] as [StatusFilter, string][]
          ).map(([value, label]) => (
            <button
              key={value}
              onClick={() => {
                setStatusFilter(value);
                resetToFirstPage();
              }}
              className={`px-3 py-2 text-sm font-medium border-b-2 transition ${
                statusFilter === value
                  ? 'border-[#008060] text-[#202223]'
                  : 'border-transparent text-[#6d7175] hover:text-[#202223]'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-[#fafbfb] border-b border-[#e1e3e5] text-[11px] font-bold text-[#6d7175] uppercase tracking-wider">
                <th className="py-3 px-4 w-10">
                  <input
                    type="checkbox"
                    checked={allPageSelected}
                    onChange={toggleSelectAllOnPage}
                    aria-label="Select all on page"
                    className="w-4 h-4 rounded border-[#d2d5d8] text-[#008060] focus:ring-[#008060]"
                  />
                </th>
                <th className="py-3 px-4">Image</th>
                <th className="py-3 px-4">Product</th>
                <th className="py-3 px-4">ALT text</th>
                <th className="py-3 px-4">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#e1e3e5] text-sm">
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 text-center text-[#6d7175]">
                    No images matched your search or filter.
                  </td>
                </tr>
              ) : (
                pageRows.map((row) => {
                  const draft = drafts[row.image.id] ?? row.image.altText;
                  return (
                    <tr key={row.image.id} className="hover:bg-[#f6f7f8] transition-colors">
                      <td className="py-3 px-4">
                        <input
                          type="checkbox"
                          checked={selectedIds.has(row.image.id)}
                          onChange={() => toggleSelectOne(row.image.id)}
                          aria-label={`Select ${row.product.title} image`}
                          className="w-4 h-4 rounded border-[#d2d5d8] text-[#008060] focus:ring-[#008060]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <div className="w-12 h-12 rounded-lg bg-[#f1f2f4] overflow-hidden border border-[#e1e3e5]">
                          <img
                            src={row.image.url}
                            alt={row.image.altText || row.product.title}
                            referrerPolicy="no-referrer"
                            className="w-full h-full object-cover"
                          />
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-[#202223]">{row.product.title}</div>
                        <div className="text-xs text-[#6d7175]">
                          {row.product.vendor} · {row.product.productType || 'Product'}
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <input
                          type="text"
                          placeholder="Add ALT text"
                          value={draft}
                          onChange={(e) =>
                            setDrafts((prev) => ({ ...prev, [row.image.id]: e.target.value }))
                          }
                          onBlur={(e) => commitAltText(row, e.target.value)}
                          className="w-full px-3 py-1.5 text-sm border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2 py-0.5 rounded text-xs font-semibold ${STATUS_BADGE_CLASS[row.status]}`}
                        >
                          {STATUS_LABEL[row.status]}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        <div className="flex items-center justify-between px-4 py-3 border-t border-[#e1e3e5] text-sm text-[#6d7175]">
          <span>
            {filteredRows.length === 0
              ? 'Showing 0 of 0'
              : `Showing ${(currentPage - 1) * PAGE_SIZE + 1}–${Math.min(currentPage * PAGE_SIZE, filteredRows.length)} of ${filteredRows.length}`}
          </span>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              disabled={currentPage <= 1}
              className="p-1.5 rounded-lg border border-[#d2d5d8] disabled:opacity-40 hover:bg-[#f1f2f4] transition"
              aria-label="Previous page"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span>Page {currentPage}</span>
            <button
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              disabled={currentPage >= totalPages}
              className="p-1.5 rounded-lg border border-[#d2d5d8] disabled:opacity-40 hover:bg-[#f1f2f4] transition"
              aria-label="Next page"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
