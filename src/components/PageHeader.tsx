import React from 'react';
import { RefreshCw } from 'lucide-react';

interface PageHeaderProps {
  title: string;
  description: string;
  onRefresh: () => void;
  isRefreshing: boolean;
}

export const PageHeader: React.FC<PageHeaderProps> = ({ title, description, onRefresh, isRefreshing }) => (
  <div className="flex items-start justify-between gap-4">
    <div>
      <h1 className="text-2xl font-bold text-[#202223]">{title}</h1>
      <p className="text-sm text-[#6d7175] mt-1">{description}</p>
    </div>
    <button
      onClick={onRefresh}
      disabled={isRefreshing}
      className="shrink-0 flex items-center gap-1.5 px-3 py-2 text-sm font-medium bg-white border border-[#d2d5d8] rounded-lg hover:bg-[#f1f2f4] disabled:opacity-60 transition"
    >
      <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin' : ''}`} />
      {isRefreshing ? 'Syncing...' : 'Sync from Shopify'}
    </button>
  </div>
);
