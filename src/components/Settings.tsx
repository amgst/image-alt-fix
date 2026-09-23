import React from 'react';
import { Store, Info } from 'lucide-react';

interface SettingsProps {
  shopInfo: { shopName: string; shopDomain: string } | null;
}

export const Settings: React.FC<SettingsProps> = ({ shopInfo }) => {
  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-[#202223]">Settings</h1>
        <p className="text-sm text-[#6d7175] mt-1">Connection details for this store.</p>
      </div>

      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs space-y-4">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-[#e6f4ea] flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-[#008060]" />
          </div>
          <div>
            <div className="font-semibold text-[#202223]">
              {shopInfo ? shopInfo.shopName : 'Not connected'}
            </div>
            <div className="text-xs text-[#6d7175] font-mono">
              {shopInfo ? shopInfo.shopDomain : 'Showing demo data'}
            </div>
          </div>
        </div>

        <div className="flex items-start gap-3 pt-3 border-t border-[#e1e3e5]">
          <Info className="w-4 h-4 text-[#8c9196] mt-0.5 shrink-0" />
          <p className="text-xs text-[#6d7175]">
            An image's status is based on its ALT text: <strong>Missing</strong> has none,{' '}
            <strong>Poor</strong> is under 3 words, <strong>Duplicate</strong> matches another
            image's ALT text elsewhere in your catalog, and <strong>Good</strong> is everything
            else.
          </p>
        </div>
      </div>
    </div>
  );
};
