import React, { useState } from 'react';
import {
  FileImage,
  ExternalLink,
  Copy,
  Check,
  Search,
  HardDrive,
  Calendar,
  CheckCircle2,
} from 'lucide-react';
import type { ShopifyFile } from '../types';

interface ShopifyFilesModalProps {
  files: ShopifyFile[];
}

export const ShopifyFilesModal: React.FC<ShopifyFilesModalProps> = ({ files }) => {
  const [search, setSearch] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const filteredFiles = files.filter(
    (f) =>
      f.name.toLowerCase().includes(search.toLowerCase()) ||
      f.altText.toLowerCase().includes(search.toLowerCase())
  );

  const copyUrl = (id: string, url: string) => {
    navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className="max-w-7xl mx-auto space-y-6 pb-16">
      <div className="bg-white border border-[#e1e3e5] rounded-xl p-5 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="p-1.5 rounded-lg bg-[#008060]/10 text-[#008060]">
              <FileImage className="w-5 h-5" />
            </span>
            <h1 className="text-xl font-bold text-[#202223]">
              Shopify Content Files & CDN Assets
            </h1>
          </div>
          <p className="text-xs text-[#6d7175] mt-1">
            Browse images saved to your Shopify Files library. Generated images are hosted on Shopify's global CDN.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[#8c9196]" />
            <input
              type="text"
              placeholder="Search files by name or alt text..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 pr-4 py-1.5 text-xs bg-[#f9fafb] border border-[#d2d5d8] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#008060]"
            />
          </div>
          <span className="text-xs font-semibold px-2.5 py-1 bg-[#f1f2f4] rounded-md text-[#4a4a4a]">
            {filteredFiles.length} Assets
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
        {filteredFiles.map((file) => (
          <div
            key={file.id}
            className="bg-white border border-[#e1e3e5] rounded-xl overflow-hidden shadow-xs flex flex-col justify-between group"
          >
            <div className="relative aspect-square bg-[#f4f5f6] overflow-hidden">
              <img
                src={file.url}
                alt={file.altText}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition duration-300 group-hover:scale-105"
              />
              <div className="absolute bottom-2 right-2 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded font-mono">
                {file.sizeKb} KB
              </div>
            </div>

            <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
              <div>
                <span className="text-xs font-mono font-bold text-[#202223] truncate block" title={file.name}>
                  {file.name}
                </span>
                <p className="text-[11px] text-[#6d7175] line-clamp-2 mt-1 italic">
                  "{file.altText}"
                </p>
              </div>

              <div className="pt-2 border-t border-[#f1f2f4] flex items-center justify-between">
                <span className="text-[10px] text-[#8c9196] flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-[#008060]" />
                  <span>Used in products</span>
                </span>

                <button
                  onClick={() => copyUrl(file.id, file.url)}
                  className="p-1.5 text-[#6d7175] hover:text-[#202223] hover:bg-[#f1f2f4] rounded transition"
                  title="Copy CDN URL"
                >
                  {copiedId === file.id ? (
                    <Check className="w-3.5 h-3.5 text-[#008060]" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
