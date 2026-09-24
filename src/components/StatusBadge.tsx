import React from 'react';
import type { ImageStatus } from '../utils/imageStatus';

export const STATUS_LABEL: Record<ImageStatus, string> = {
  missing: 'Missing',
  poor: 'Poor',
  duplicate: 'Duplicate',
  good: 'Good',
};

export const STATUS_BADGE_CLASS: Record<ImageStatus, string> = {
  missing: 'bg-[#fef3c7] text-[#92400e]',
  poor: 'bg-[#f1f2f4] text-[#4a4a4a]',
  duplicate: 'bg-[#e0e7ff] text-[#3730a3]',
  good: 'bg-[#e6f4ea] text-[#006e52]',
};

export const StatusBadge: React.FC<{ status: ImageStatus; count?: number }> = ({ status, count }) => (
  <span
    className={`inline-block px-2 py-0.5 rounded text-xs font-semibold whitespace-nowrap ${STATUS_BADGE_CLASS[status]}`}
  >
    {count !== undefined ? `${count} ${STATUS_LABEL[status].toLowerCase()}` : STATUS_LABEL[status]}
  </span>
);
