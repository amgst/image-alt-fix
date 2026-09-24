import React, { useEffect, useMemo, useState } from 'react';
import {
  Package,
  CheckCircle2,
  AlertTriangle,
  ImageOff,
  ArrowRight,
  Lightbulb,
} from 'lucide-react';
import type { ShopifyProduct } from '../types';
import { flattenProductImages, type ImageStatus } from '../utils/imageStatus';
import type { NavTarget } from '../App';
import { PageHeader } from './PageHeader';
import { Banner, type BannerData } from './Banner';

interface OverviewProps {
  products: ShopifyProduct[];
  banners: BannerData[];
  onDismissBanner: (id: string) => void;
  lastSyncedAt: Date | null;
  onRefresh: () => void;
  isRefreshing: boolean;
  onNavigate: (target: NavTarget) => void;
}

// Status fills for the breakdown bar, validated as a set (CVD and
// normal-vision separation pass). Amber is below 3:1 against white, so every
// segment is also named with its count in the legend.
const STATUS_META: Record<ImageStatus, { label: string; fill: string; hint: string }> = {
  missing: { label: 'Missing', fill: '#c5280c', hint: 'No ALT text at all' },
  poor: { label: 'Poor', fill: '#d49b00', hint: 'Fewer than 3 words' },
  duplicate: { label: 'Duplicate', fill: '#5c6ac4', hint: 'Same ALT as another image' },
  good: { label: 'Good', fill: '#008060', hint: 'Descriptive and unique' },
};
const STATUS_ORDER: ImageStatus[] = ['missing', 'poor', 'duplicate', 'good'];

function timeAgo(date: Date, now: number): string {
  const seconds = Math.max(0, Math.round((now - date.getTime()) / 1000));
  if (seconds < 45) return 'just now';
  const minutes = Math.round(seconds / 60);
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  return `${hours} hr ago`;
}

function scoreBand(score: number): { label: string; color: string } {
  if (score >= 90) return { label: 'Excellent', color: '#008060' };
  if (score >= 70) return { label: 'Good', color: '#008060' };
  if (score >= 40) return { label: 'Needs work', color: '#d49b00' };
  return { label: 'Poor', color: '#c5280c' };
}

const Card: React.FC<{ title?: string; action?: React.ReactNode; className?: string; children: React.ReactNode }> = ({
  title,
  action,
  className = '',
  children,
}) => (
  <section className={`bg-white border border-[#e1e3e5] rounded-xl shadow-xs ${className}`}>
    {title && (
      <div className="flex items-center justify-between px-5 pt-4">
        <h2 className="text-sm font-semibold text-[#202223]">{title}</h2>
        {action}
      </div>
    )}
    <div className="p-5">{children}</div>
  </section>
);

// Single headline value, so a gauge rather than a chart with axes.
const ScoreGauge: React.FC<{ score: number; color: string }> = ({ score, color }) => {
  const r = 52;
  const circumference = 2 * Math.PI * r;
  const filled = (Math.min(100, Math.max(0, score)) / 100) * circumference;
  return (
    <svg viewBox="0 0 128 128" className="w-32 h-32 shrink-0" role="img" aria-label={`ALT health score ${score} out of 100`}>
      <circle cx="64" cy="64" r={r} fill="none" stroke="#e1e3e5" strokeWidth="10" />
      {score > 0 && (
        <circle
          cx="64"
          cy="64"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="10"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${circumference}`}
          transform="rotate(-90 64 64)"
        />
      )}
      <text x="64" y="62" textAnchor="middle" className="fill-[#202223]" style={{ fontSize: 30, fontWeight: 700 }}>
        {score}
      </text>
      <text x="64" y="82" textAnchor="middle" className="fill-[#6d7175]" style={{ fontSize: 11 }}>
        out of 100
      </text>
    </svg>
  );
};

export const Overview: React.FC<OverviewProps> = ({
  products,
  banners,
  onDismissBanner,
  lastSyncedAt,
  onRefresh,
  isRefreshing,
  onNavigate,
}) => {
  const [now, setNow] = useState(Date.now());
  const [hovered, setHovered] = useState<ImageStatus | null>(null);

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(timer);
  }, []);

  const rows = useMemo(() => flattenProductImages(products), [products]);

  const stats = useMemo(() => {
    const counts: Record<ImageStatus, number> = { missing: 0, poor: 0, duplicate: 0, good: 0 };
    rows.forEach((r) => counts[r.status]++);

    const perProduct = products.map((product) => {
      const own = rows.filter((r) => r.product.id === product.id);
      const c: Record<ImageStatus, number> = { missing: 0, poor: 0, duplicate: 0, good: 0 };
      own.forEach((r) => c[r.status]++);
      return { product, total: own.length, counts: c, issues: own.length - c.good };
    });

    const withImages = perProduct.filter((p) => p.total > 0);
    return {
      total: rows.length,
      counts,
      score: rows.length ? Math.round((counts.good / rows.length) * 100) : 0,
      coverage: rows.length ? Math.round(((rows.length - counts.missing) / rows.length) * 100) : 0,
      productCount: products.length,
      optimized: withImages.filter((p) => p.issues === 0).length,
      attention: withImages.filter((p) => p.issues > 0),
      noImages: perProduct.filter((p) => p.total === 0).length,
    };
  }, [rows, products]);

  const band = scoreBand(stats.score);
  const topAttention = [...stats.attention]
    .sort((a, b) => b.counts.missing - a.counts.missing || b.issues - a.issues)
    .slice(0, 6);

  // Status banner driven by the store's own numbers.
  const statusBanner: { banner: BannerData; label: string; target: NavTarget } | null = (() => {
    const { total, counts } = stats;
    if (total === 0) return null;
    if (counts.missing > 0) {
      return {
        banner: {
          id: 'status',
          tone: counts.missing / total > 0.5 ? 'critical' : 'warning',
          title: `${counts.missing} of ${total} images have no ALT text`,
          message:
            "Screen readers and search engines can't describe these images. Fill them in per product, or start from the product title and refine.",
        },
        label: 'Review missing ALT',
        target: { tab: 'images', imageStatus: 'missing' },
      };
    }
    const weak = counts.poor + counts.duplicate;
    if (weak > 0) {
      return {
        banner: {
          id: 'status',
          tone: 'info',
          title: `Every image has ALT text. ${weak} could be more descriptive.`,
          message: 'Short or repeated ALT text tells shoppers and search engines little about each image.',
        },
        label: 'Review images',
        target: { tab: 'images', imageStatus: 'issues' },
      };
    }
    return {
      banner: {
        id: 'status',
        tone: 'success',
        title: 'All product images have good ALT text',
        message: 'Sync again after adding new products to keep it that way.',
      },
      label: 'View products',
      target: { tab: 'products' },
    };
  })();

  // Breakdown bar geometry: 2px gaps between segments, widths in % of the
  // remaining space.
  const visibleStatuses = STATUS_ORDER.filter((s) => stats.counts[s] > 0);
  let offset = 0;
  const segments = visibleStatuses.map((s) => {
    const pct = (stats.counts[s] / Math.max(1, stats.total)) * 100;
    const seg = { status: s, left: offset, width: pct };
    offset += pct;
    return seg;
  });
  const hoveredSeg = segments.find((s) => s.status === hovered);

  const kpis: { label: string; value: number; sub: string; Icon: React.ElementType; iconClass: string; target: NavTarget }[] = [
    {
      label: 'Products',
      value: stats.productCount,
      sub: `${stats.total} images in total`,
      Icon: Package,
      iconClass: 'text-[#4a4a4a] bg-[#f1f2f4]',
      target: { tab: 'products', productFilter: 'all' },
    },
    {
      label: 'Fully optimized',
      value: stats.optimized,
      sub: stats.productCount ? `${Math.round((stats.optimized / stats.productCount) * 100)}% of products` : '—',
      Icon: CheckCircle2,
      iconClass: 'text-[#008060] bg-[#e6f4ea]',
      target: { tab: 'products', productFilter: 'complete' },
    },
    {
      label: 'Need attention',
      value: stats.attention.length,
      sub: 'Products with ALT issues',
      Icon: AlertTriangle,
      iconClass: 'text-[#9a6700] bg-[#fff6e0]',
      target: { tab: 'products', productFilter: 'attention' },
    },
    {
      label: 'Without images',
      value: stats.noImages,
      sub: 'Products with no media',
      Icon: ImageOff,
      iconClass: 'text-[#6d7175] bg-[#f1f2f4]',
      target: { tab: 'products', productFilter: 'no_images' },
    },
  ];

  return (
    <div className="space-y-5 max-w-6xl mx-auto pb-12">
      <PageHeader
        title="Overview"
        description={
          lastSyncedAt
            ? `Image ALT text health across your catalog. Last synced ${timeAgo(lastSyncedAt, now)}.`
            : 'Image ALT text health across your catalog.'
        }
        onRefresh={onRefresh}
        isRefreshing={isRefreshing}
      />

      {(banners.length > 0 || statusBanner) && (
        <div className="space-y-3">
          {statusBanner && (
            <Banner
              banner={{ ...statusBanner.banner, dismissible: false }}
              onAction={() => onNavigate(statusBanner.target)}
              actionLabel={statusBanner.label}
            />
          )}
          {banners.map((b) => (
            <Banner key={b.id} banner={b} onDismiss={onDismissBanner} />
          ))}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <Card title="ALT health score">
          <div className="flex items-center gap-5">
            <ScoreGauge score={stats.score} color={band.color} />
            <div className="min-w-0">
              <div className="inline-flex items-center gap-1.5 text-sm font-semibold text-[#202223]">
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: band.color }} aria-hidden />
                {band.label}
              </div>
              <p className="mt-2 text-sm text-[#4a4a4a]">
                <strong className="text-[#202223]">{stats.counts.good}</strong> of {stats.total} images have good
                ALT text.
              </p>
              <p className="mt-1 text-xs text-[#6d7175]">{stats.coverage}% have some ALT text.</p>
            </div>
          </div>
        </Card>

        <Card title="ALT text breakdown" className="lg:col-span-2">
          {stats.total === 0 ? (
            <p className="text-sm text-[#6d7175]">No product images yet.</p>
          ) : (
            <>
              <div className="relative pt-1">
                <div
                  className="relative h-3 w-full"
                  role="img"
                  aria-label={STATUS_ORDER.map((s) => `${STATUS_META[s].label}: ${stats.counts[s]}`).join(', ')}
                >
                  {segments.map((seg) => (
                    <div
                      key={seg.status}
                      onMouseEnter={() => setHovered(seg.status)}
                      onMouseLeave={() => setHovered(null)}
                      className="absolute -top-2 -bottom-2 cursor-pointer"
                      style={{ left: `${seg.left}%`, width: `${seg.width}%` }}
                    >
                      <div
                        className="absolute inset-y-2 rounded transition-opacity"
                        style={{
                          left: seg.left === 0 ? 0 : 1,
                          right: seg.left + seg.width >= 99.999 ? 0 : 1,
                          minWidth: 4,
                          backgroundColor: STATUS_META[seg.status].fill,
                          opacity: hovered && hovered !== seg.status ? 0.35 : 1,
                        }}
                      />
                    </div>
                  ))}
                </div>
                {hoveredSeg && (
                  <div
                    className="pointer-events-none absolute bottom-6 z-10 -translate-x-1/2 whitespace-nowrap rounded-lg bg-[#202223] px-2.5 py-1.5 text-xs text-white shadow-lg"
                    style={{ left: `${Math.min(90, Math.max(10, hoveredSeg.left + hoveredSeg.width / 2))}%` }}
                  >
                    <span className="font-semibold">{STATUS_META[hoveredSeg.status].label}</span> ·{' '}
                    {stats.counts[hoveredSeg.status]} images ·{' '}
                    {Math.round((stats.counts[hoveredSeg.status] / stats.total) * 100)}%
                  </div>
                )}
              </div>

              <div className="mt-5 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {STATUS_ORDER.map((s) => (
                  <button
                    key={s}
                    onClick={() => onNavigate({ tab: 'images', imageStatus: s })}
                    onMouseEnter={() => setHovered(s)}
                    onMouseLeave={() => setHovered(null)}
                    className="group flex items-center gap-3 rounded-lg px-2 py-1.5 -mx-2 text-left hover:bg-[#f6f7f8] transition"
                  >
                    <span className="w-3 h-3 rounded-sm shrink-0" style={{ backgroundColor: STATUS_META[s].fill }} aria-hidden />
                    <span className="flex-1 min-w-0">
                      <span className="block text-sm font-medium text-[#202223]">{STATUS_META[s].label}</span>
                      <span className="block text-xs text-[#6d7175]">{STATUS_META[s].hint}</span>
                    </span>
                    <span className="text-right">
                      <span className="block text-sm font-semibold text-[#202223] tabular-nums">{stats.counts[s]}</span>
                      <span className="block text-xs text-[#6d7175] tabular-nums">
                        {Math.round((stats.counts[s] / stats.total) * 100)}%
                      </span>
                    </span>
                    <ArrowRight className="w-4 h-4 text-[#8c9196] opacity-0 group-hover:opacity-100 transition" aria-hidden />
                  </button>
                ))}
              </div>
            </>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((k) => (
          <button
            key={k.label}
            onClick={() => onNavigate(k.target)}
            className="bg-white border border-[#e1e3e5] rounded-xl p-4 shadow-xs text-left hover:border-[#c9cccf] hover:shadow-sm transition"
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-[#6d7175]">{k.label}</span>
              <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${k.iconClass}`}>
                <k.Icon className="w-4 h-4" aria-hidden />
              </span>
            </div>
            <div className="mt-2 text-2xl font-bold text-[#202223] tabular-nums">{k.value}</div>
            <div className="mt-0.5 text-xs text-[#6d7175]">{k.sub}</div>
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <section className="lg:col-span-2 bg-white border border-[#e1e3e5] rounded-xl shadow-xs overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-[#e1e3e5]">
            <h2 className="text-sm font-semibold text-[#202223]">Products needing attention</h2>
            {stats.attention.length > 0 && (
              <button
                onClick={() => onNavigate({ tab: 'products', productFilter: 'attention' })}
                className="text-sm font-medium text-[#008060] hover:underline"
              >
                View all {stats.attention.length}
              </button>
            )}
          </div>
          {topAttention.length === 0 ? (
            <div className="px-5 py-10 text-center text-sm text-[#6d7175]">
              <CheckCircle2 className="w-6 h-6 text-[#008060] mx-auto mb-2" aria-hidden />
              Nothing to fix. Every product's images have good ALT text.
            </div>
          ) : (
            <ul className="divide-y divide-[#e1e3e5]">
              {topAttention.map(({ product, total, counts }) => {
                const thumb = product.images[0];
                const goodPct = total ? Math.round((counts.good / total) * 100) : 0;
                const issueText = (['missing', 'poor', 'duplicate'] as ImageStatus[])
                  .filter((s) => counts[s] > 0)
                  .map((s) => `${counts[s]} ${STATUS_META[s].label.toLowerCase()}`)
                  .join(' · ');
                return (
                  <li key={product.id} className="flex items-center gap-4 px-5 py-3">
                    <div className="w-10 h-10 shrink-0 rounded-lg bg-[#f1f2f4] overflow-hidden border border-[#e1e3e5]">
                      {thumb && (
                        <img
                          src={thumb.url}
                          alt={thumb.altText || product.title}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-sm font-semibold text-[#202223] truncate">{product.title}</div>
                      <div className="text-xs text-[#6d7175] truncate">{issueText}</div>
                    </div>
                    <div className="hidden sm:block w-28 shrink-0">
                      <div className="flex justify-between text-[11px] text-[#6d7175] mb-1">
                        <span>Good ALT</span>
                        <span className="tabular-nums">
                          {counts.good}/{total}
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-[#e1e3e5] overflow-hidden">
                        <div className="h-full rounded-full bg-[#008060]" style={{ width: `${goodPct}%` }} />
                      </div>
                    </div>
                    <button
                      onClick={() =>
                        onNavigate({
                          tab: 'products',
                          productFilter: 'all',
                          search: product.title,
                          expandProductId: product.id,
                        })
                      }
                      className="shrink-0 px-3 py-1.5 text-sm font-semibold bg-white border border-[#d2d5d8] rounded-lg hover:bg-[#f1f2f4] transition"
                    >
                      Fix
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <Card
          title="Writing good ALT text"
          action={<Lightbulb className="w-4 h-4 text-[#9a6700]" aria-hidden />}
        >
          <ul className="space-y-3 text-sm text-[#4a4a4a]">
            <li>
              <span className="font-semibold text-[#202223]">Describe what's shown.</span> Name the product and
              the details a shopper would notice, like color, material or angle.
            </li>
            <li>
              <span className="font-semibold text-[#202223]">Keep it short.</span> One sentence, usually under
              125 characters.
            </li>
            <li>
              <span className="font-semibold text-[#202223]">Make each image unique.</span> Say how a second
              photo differs, such as "back view" or "in use".
            </li>
            <li>
              <span className="font-semibold text-[#202223]">Skip "image of".</span> Screen readers already
              announce it's an image.
            </li>
          </ul>
        </Card>
      </div>
    </div>
  );
};
