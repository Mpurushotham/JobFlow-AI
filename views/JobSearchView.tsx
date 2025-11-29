
import React, { useState } from 'react';
import { Search, MapPin, Building, ExternalLink, Plus, RotateCcw, Factory } from 'lucide-react';
import { Job, JobStatus, SearchResult, SearchFilters } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';

interface JobSearchViewProps {
  onAddJobFound: (job: Job) => void;
}

export const JobSearchView: React.FC<JobSearchViewProps> = ({ onAddJobFound }) => {
  const initialFilters: SearchFilters = {
    query: '',
    location: '',
    datePosted: 'any',
    experienceLevel: 'any',
    jobType: 'any',
    remote: 'any',
    industry: ''
  };

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const { addNotification } = useNotifications();

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async () => {
    if (!filters.query.trim()) return;
    setLoading(true);
    setSearched(true);
    try {
      const { results } = await geminiService.searchJobs(filters);
      setResults(results);
    } catch (e) {
      console.error(e);
      addNotification("Search failed. Please try again later.", 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleReset = () => {
    setFilters(initialFilters);
    setResults([]);
    setSearched(false);
  };

  return (
    <div className="h-full flex flex-col space-y-6 max-w-6xl mx-auto animate-fade-in">
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 relative overflow-hidden transition-colors">
        <div className="absolute top-0 left-0 w-full h-2 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500"></div>
        <h2 className="text-3xl font-bold text-gray-800 dark:text-white mb-2 text-center">Find Your Next Dream Role</h2>
        <p className="text-gray-500 dark:text-slate-400 mb-6 max-w-2xl mx-auto text-center">Enter a job title, then refine with the filters below.</p>
        
        {/* Main Search Bar */}
        <div className="relative flex-1 group mb-4">
            <Search className="absolute left-5 top-1/2 -translate-y-1/2 text-gray-400 group-focus-within:text-indigo-500 transition-colors" size={20} />
            <input 
              type="text" 
              placeholder="e.g. Senior Frontend Engineer..." 
              className="w-full pl-14 pr-4 py-3.5 rounded-2xl border border-gray-200 dark:border-slate-600 focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 bg-white dark:bg-slate-900 text-gray-900 dark:text-white text-base transition-all"
              value={filters.query}
              onChange={(e) => handleFilterChange('query', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
            />
        </div>

        {/* Filter Panel */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mb-6">
           {/* Location */}
           <div className="group">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Location</label>
             <div className="relative mt-1">
               <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="City, Country" value={filters.location} onChange={e => handleFilterChange('location', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 pl-9 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
             </div>
           </div>
           {/* Date Posted */}
           <div className="group">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Date Posted</label>
             <select value={filters.datePosted} onChange={e => handleFilterChange('datePosted', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 mt-1 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value="any">Any time</option>
                <option value="24h">Past 24 hours</option>
                <option value="week">Past week</option>
                <option value="month">Past month</option>
             </select>
           </div>
           {/* Experience Level */}
           <div className="group">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Experience</label>
             <select value={filters.experienceLevel} onChange={e => handleFilterChange('experienceLevel', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 mt-1 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value="any">Any</option>
                <option value="internship">Internship</option>
                <option value="entry">Entry-level</option>
                <option value="associate">Associate</option>
                <option value="mid-senior">Mid-Senior</option>
                <option value="director">Director</option>
             </select>
           </div>
           {/* Job Type */}
           <div className="group">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Job Type</label>
             <select value={filters.jobType} onChange={e => handleFilterChange('jobType', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 mt-1 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value="any">Any</option>
                <option value="full-time">Full-time</option>
                <option value="part-time">Part-time</option>
                <option value="contract">Contract</option>
             </select>
           </div>
           {/* Remote */}
           <div className="group">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Remote</label>
             <select value={filters.remote} onChange={e => handleFilterChange('remote', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 mt-1 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500 appearance-none">
                <option value="any">Any</option>
                <option value="on-site">On-site</option>
                <option value="hybrid">Hybrid</option>
                <option value="remote">Remote</option>
             </select>
           </div>
           {/* Industry */}
           <div className="group col-span-2 md:col-span-3 lg:col-span-full">
             <label className="text-xs font-bold text-gray-400 dark:text-slate-500 uppercase">Industry</label>
             <div className="relative mt-1">
               <Factory size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
               <input type="text" placeholder="e.g. Software Development, IT Services" value={filters.industry} onChange={e => handleFilterChange('industry', e.target.value)} className="w-full bg-gray-50 dark:bg-slate-700/50 border border-gray-200 dark:border-slate-700 rounded-lg p-2 pl-9 text-sm text-gray-800 dark:text-slate-200 outline-none focus:ring-2 focus:ring-indigo-500" />
             </div>
           </div>
        </div>

        {/* Action Buttons */}
        <div className="flex gap-4 justify-center">
          <button 
            onClick={handleReset}
            className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-8 py-3 rounded-2xl font-bold hover:bg-gray-200 dark:hover:bg-slate-600 transition-all border border-transparent shadow-sm flex items-center justify-center gap-2"
            title="Clear Search & Results"
          >
            <RotateCcw size={16} /> Reset
          </button>
          <button 
            onClick={handleSearch}
            disabled={loading}
            className="bg-indigo-600 text-white px-10 py-3 rounded-2xl font-bold hover:bg-indigo-700 transition-all disabled:opacity-50 hover:shadow-xl hover:-translate-y-0.5 shadow-indigo-200 dark:shadow-none flex items-center gap-2"
          >
            {loading ? 'Searching...' : 'Find Jobs'}
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto pr-2 custom-scrollbar">
        {loading && (
          <div className="flex flex-col items-center justify-center h-64">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mb-6 shadow-lg shadow-indigo-100 dark:shadow-none"></div>
            <p className="text-indigo-800 dark:text-indigo-300 animate-pulse font-bold text-lg">Searching LinkedIn for opportunities...</p>
          </div>
        )}

        {!loading && searched && results.length === 0 && (
          <div className="text-center py-20 bg-white dark:bg-slate-800 rounded-3xl border border-dashed border-gray-200 dark:border-slate-700 text-gray-500 dark:text-slate-400">
            No jobs found matching your criteria. Try refining your keywords or filters.
          </div>
        )}

        <div className="grid grid-cols-1 gap-4 pb-10">
          {results.map((res, idx) => (
            <div key={idx} className="bg-white dark:bg-slate-800 p-6 rounded-2xl border border-gray-100 dark:border-slate-700 shadow-sm hover:shadow-lg hover:border-indigo-100 dark:hover:border-indigo-900 transition-all group animate-slide-in" style={{animationDelay: `${idx * 0.1}s`}}>
              <div className="flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="flex-1">
                  <h3 className="text-xl font-bold text-gray-900 dark:text-white group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">{res.title}</h3>
                  <div className="flex flex-wrap items-center gap-4 text-gray-600 dark:text-slate-400 mt-2 text-sm">
                    <div className="flex items-center gap-1.5"><Building size={16} className="text-gray-400"/> {res.company}</div>
                    <div className="flex items-center gap-1.5"><MapPin size={16} className="text-gray-400"/> {res.location}</div>
                  </div>
                  <p className="mt-4 text-gray-600 dark:text-slate-300 text-sm leading-relaxed bg-gray-50/50 dark:bg-slate-900/50 p-4 rounded-xl border border-gray-100 dark:border-slate-700">{res.summary}</p>
                  
                  <div className="flex items-center gap-4 mt-4">
                    {res.url && res.url !== 'N/A' && (
                        <a href={res.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 text-sm font-medium hover:underline bg-indigo-50 dark:bg-indigo-900/30 px-3 py-1 rounded-lg">
                        Visit on LinkedIn <ExternalLink size={12} />
                        </a>
                    )}
                  </div>
                </div>
                
                <button 
                  onClick={() => {
                    onAddJobFound({
                      id: Date.now().toString() + idx,
                      title: res.title,
                      company: res.company,
                      city: res.location,
                      description: res.summary + "\n\nSource: " + (res.url || 'Search'),
                      status: JobStatus.WISHLIST,
                      dateAdded: Date.now(),
                      url: res.url,
                      source: 'LinkedIn (AI Search)'
                    });
                    addNotification(`${res.title} added to your board!`, 'success');
                  }}
                  className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-5 py-3 rounded-xl text-sm font-bold hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-2 whitespace-nowrap shadow-md hover:scale-105 transition-transform"
                >
                  <Plus size={18} /> Add to Board
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
