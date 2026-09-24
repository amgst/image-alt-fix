import React from 'react';
import { Info, CheckCircle2, AlertTriangle, AlertOctagon, Megaphone, X, ExternalLink } from 'lucide-react';

export type BannerTone = 'info' | 'success' | 'warning' | 'critical' | 'promo';

export interface BannerData {
  id: string;
  tone: BannerTone;
  title: string;
  message: string;
  imageUrl?: string | null;
  action?: { label: string; url: string } | null;
  dismissible?: boolean;
}

const TONE: Record<BannerTone, { box: string; icon: string; Icon: React.ElementType; button: string }> = {
  info: {
    box: 'bg-[#eaf4ff] border-[#b4d5f5]',
    icon: 'text-[#0969da]',
    Icon: Info,
    button: 'bg-white border border-[#b4d5f5] text-[#202223] hover:bg-[#f6faff]',
  },
  success: {
    box: 'bg-[#e6f4ea] border-[#a8d8b9]',
    icon: 'text-[#008060]',
    Icon: CheckCircle2,
    button: 'bg-white border border-[#a8d8b9] text-[#202223] hover:bg-[#f3faf5]',
  },
  warning: {
    box: 'bg-[#fff6e0] border-[#f0d58c]',
    icon: 'text-[#9a6700]',
    Icon: AlertTriangle,
    button: 'bg-white border border-[#f0d58c] text-[#202223] hover:bg-[#fffbf0]',
  },
  critical: {
    box: 'bg-[#fdecea] border-[#f3b8b0]',
    icon: 'text-[#c5280c]',
    Icon: AlertOctagon,
    button: 'bg-white border border-[#f3b8b0] text-[#202223] hover:bg-[#fff6f5]',
  },
  promo: {
    box: 'bg-gradient-to-r from-[#1f2a37] to-[#23433a] border-transparent text-white',
    icon: 'text-[#7ee2b8]',
    Icon: Megaphone,
    button: 'bg-white text-[#202223] hover:bg-[#f1f2f4]',
  },
};

interface BannerProps {
  banner: BannerData;
  onDismiss?: (id: string) => void;
  // In-app action (e.g. jump to a filtered tab) shown instead of a link.
  onAction?: () => void;
  actionLabel?: string;
}

export const Banner: React.FC<BannerProps> = ({ banner, onDismiss, onAction, actionLabel }) => {
  const tone = TONE[banner.tone];
  const isPromo = banner.tone === 'promo';
  const Icon = tone.Icon;

  return (
    <div role="status" className={`relative flex gap-4 rounded-xl border p-4 shadow-xs ${tone.box}`}>
      {banner.imageUrl ? (
        <img
          src={banner.imageUrl}
          alt=""
          referrerPolicy="no-referrer"
          className="hidden sm:block w-20 h-20 shrink-0 rounded-lg object-cover"
        />
      ) : (
        <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${tone.icon}`} aria-hidden />
      )}

      <div className="flex-1 min-w-0 pr-6">
        <div className={`font-semibold text-sm ${isPromo ? 'text-white' : 'text-[#202223]'}`}>
          {banner.title}
        </div>
        {banner.message && (
          <p className={`mt-1 text-sm ${isPromo ? 'text-white/80' : 'text-[#4a4a4a]'}`}>{banner.message}</p>
        )}
        {onAction ? (
          <button
            onClick={onAction}
            className={`mt-3 px-3 py-1.5 text-sm font-semibold rounded-lg transition ${tone.button}`}
          >
            {actionLabel}
          </button>
        ) : banner.action ? (
          <a
            href={banner.action.url}
            target="_blank"
            rel="noopener noreferrer"
            className={`mt-3 inline-flex items-center gap-1.5 px-3 py-1.5 text-sm font-semibold rounded-lg transition ${tone.button}`}
          >
            {banner.action.label}
            <ExternalLink className="w-3.5 h-3.5" aria-hidden />
          </a>
        ) : null}
      </div>

      {banner.dismissible !== false && onDismiss && (
        <button
          onClick={() => onDismiss(banner.id)}
          aria-label="Dismiss"
          className={`absolute top-3 right-3 p-1 rounded-md transition ${
            isPromo ? 'text-white/70 hover:bg-white/10' : 'text-[#6d7175] hover:bg-black/5'
          }`}
        >
          <X className="w-4 h-4" />
        </button>
      )}
    </div>
  );
};

const DISMISSED_KEY = 'image-alt-fix:dismissed-banners';

export function readDismissedBanners(): Set<string> {
  try {
    const raw = localStorage.getItem(DISMISSED_KEY);
    return new Set(raw ? (JSON.parse(raw) as string[]) : []);
  } catch {
    return new Set();
  }
}

export function saveDismissedBanners(ids: Set<string>): void {
  try {
    localStorage.setItem(DISMISSED_KEY, JSON.stringify([...ids]));
  } catch {
    // Storage can be blocked in the admin iframe; the banner just reappears next load.
  }
}
