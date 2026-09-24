import React from 'react';
import { ImagePlus, Store } from 'lucide-react';

interface TopBarProps {
  shopInfo: { shopName: string; shopDomain: string } | null;
}

export const TopBar: React.FC<TopBarProps> = ({ shopInfo }) => {
  return (
    <header className="h-14 shrink-0 border-b border-[#e1e3e5] bg-white flex items-center justify-between px-5">
      <div className="flex items-center gap-2">
        <div className="w-7 h-7 rounded-md bg-[#008060] flex items-center justify-center">
          <ImagePlus className="w-4 h-4 text-white" />
        </div>
        <span className="font-bold text-[#202223]">Image Alt Fix</span>
      </div>

      {shopInfo && (
        <div className="flex items-center gap-1.5 text-sm text-[#4a4a4a]">
          <Store className="w-4 h-4 text-[#8c9196]" />
          <span>{shopInfo.shopName}</span>
        </div>
      )}
    </header>
  );
};
