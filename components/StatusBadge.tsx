
import React from 'react';
import { JobStatus } from '../types';

const STATUS_LABELS = {
  [JobStatus.WISHLIST]: 'Wishlist',
  [JobStatus.APPLIED]: 'Applied',
  [JobStatus.INTERVIEWING]: 'Interviewing',
  [JobStatus.OFFER]: 'Offer',
  [JobStatus.REJECTED]: 'Rejected'
};

const STATUS_COLORS = {
  [JobStatus.WISHLIST]: 'bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:border-slate-700',
  [JobStatus.APPLIED]: 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-900/30 dark:text-blue-300 dark:border-blue-800',
  [JobStatus.INTERVIEWING]: 'bg-purple-50 text-purple-700 border-purple-200 dark:bg-purple-900/30 dark:text-purple-300 dark:border-purple-800',
  [JobStatus.OFFER]: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-300 dark:border-emerald-800',
  [JobStatus.REJECTED]: 'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-300 dark:border-red-800',
};

export const StatusBadge = ({ status }: { status: JobStatus }) => {
  return (
    <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider border ${STATUS_COLORS[status]}`}>
      {STATUS_LABELS[status]}
    </span>
  );
};
