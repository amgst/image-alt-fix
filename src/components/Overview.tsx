import React, { useMemo } from 'react';
import { Image as ImageIcon, AlertTriangle, Copy, CheckCircle2, FileWarning } from 'lucide-react';
import type { ShopifyProduct } from '../types';
import { flattenProductImages } from '../utils/imageStatus';

interface OverviewProps {
  products: ShopifyProduct[];
}

export const Overview: React.FC<OverviewProps> = ({ products }) => {
  const rows = useMemo(() => flattenProductImages(products), [products]);

  const counts = useMemo(
    () => ({
      total: rows.length,
      missing: rows.filter((r) => r.status === 'missing').length,
      poor: rows.filter((r) => r.status === 'poor').length,
      duplicate: rows.filter((r) => r.status === 'duplicate').length,
      good: rows.filter((r) => r.status === 'good').length,
    }),
    [rows]
  );

  const cards = [
    { label: 'Total Images', value: counts.total, icon: ImageIcon, color: 'text-[#202223]' },
    { label: 'Missing ALT', value: counts.missing, icon: FileWarning, color: 'text-[#b45309]' },
    { label: 'Poor ALT', value: counts.poor, icon: AlertTriangle, color: 'text-[#dc2626]' },
    { label: 'Duplicate ALT', value: counts.duplicate, icon: Copy, color: 'text-[#4f46e5]' },
    { label: 'Good ALT', value: counts.good, icon: CheckCircle2, color: 'text-[#008060]' },
  ];

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#202223]">Overview</h1>
        <p className="text-sm text-[#6d7175] mt-1">
          A quick summary of your catalog's image ALT text health.
        </p>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
        {cards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.label}
              className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold uppercase tracking-wider text-[#6d7175]">
                  {card.label}
                </span>
                <Icon className={`w-4 h-4 ${card.color}`} />
              </div>
              <div className={`mt-2 text-2xl font-bold ${card.color}`}>{card.value}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
