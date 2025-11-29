import React from 'react';
// FIX: Added YAxis to recharts import to resolve 'Cannot find name 'YAxis'' error.
import { PieChart as RePieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip, BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts';
import { Job, JobStatus } from '../types';

const COLORS = ['#818cf8', '#34d399', '#ffb703', '#fb7185', '#94a3b8'];
const STATUS_LABELS = {
  [JobStatus.WISHLIST]: 'Wishlist',
  [JobStatus.APPLIED]: 'Applied',
  [JobStatus.INTERVIEWING]: 'Interviewing',
  [JobStatus.OFFER]: 'Offer',
  [JobStatus.REJECTED]: 'Rejected'
};

interface AnalyticsViewProps {
  jobs: Job[];
}

const AnalyticsView: React.FC<AnalyticsViewProps> = ({ jobs }) => {
  const statusCounts = Object.values(JobStatus).map(status => ({
    name: STATUS_LABELS[status],
    value: jobs.filter(j => j.status === status).length
  }));

  const activeData = statusCounts.filter(d => d.value > 0);

  return (
    <div className="space-y-6 max-w-6xl mx-auto animate-fade-in">
      <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Application Analytics</h2>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Total Applications</p>
          <p className="text-4xl font-bold text-gray-800 dark:text-white mt-2">{jobs.length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Active Interviews</p>
          <p className="text-4xl font-bold text-purple-600 dark:text-purple-400 mt-2">{jobs.filter(j => j.status === JobStatus.INTERVIEWING).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Offers</p>
          <p className="text-4xl font-bold text-emerald-600 dark:text-emerald-400 mt-2">{jobs.filter(j => j.status === JobStatus.OFFER).length}</p>
        </div>
        <div className="bg-white dark:bg-slate-800 p-6 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700">
          <p className="text-gray-500 dark:text-slate-400 text-xs font-bold uppercase tracking-wider">Rejection Rate</p>
          <p className="text-4xl font-bold text-red-500 dark:text-red-400 mt-2">
            {jobs.length > 0 ? Math.round((jobs.filter(j => j.status === JobStatus.REJECTED).length / jobs.length) * 100) : 0}%
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Pipeline Breakdown</h3>
          <ResponsiveContainer width="100%" height={300}>
            <RePieChart>
              <Pie
                data={activeData}
                innerRadius={80}
                outerRadius={120}
                paddingAngle={5}
                dataKey="value"
                label={({name, percent}) => `${name} ${(percent * 100).toFixed(0)}%`}
              >
                {activeData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <RechartsTooltip contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
            </RePieChart>
          </ResponsiveContainer>
        </div>

        <div className="bg-white dark:bg-slate-800 p-8 rounded-3xl shadow-sm border border-gray-100 dark:border-slate-700 min-h-[400px]">
          <h3 className="text-lg font-bold text-gray-800 dark:text-white mb-6">Status Distribution</h3>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={statusCounts}>
                <XAxis dataKey="name" fontSize={12} tickLine={false} axisLine={false} tick={{fill: '#9ca3af'}} />
                <YAxis hide />
                <Tooltip cursor={{fill: '#f3f4f6'}} contentStyle={{ borderRadius: '12px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.1)' }} />
                <Bar dataKey="value" fill="#6366f1" radius={[8, 8, 0, 0]} barSize={40} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
};

export default AnalyticsView;
