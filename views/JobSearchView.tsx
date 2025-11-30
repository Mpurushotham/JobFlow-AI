
import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
// FIX: Added RefreshCcw import from 'lucide-react'.
import { Search, MapPin, Building, ExternalLink, Plus, RotateCcw, Factory, Briefcase, AlertTriangle, ChevronLeft, ChevronRight, Sparkles, CheckCircle, XCircle, Info, RefreshCcw, TrendingUp } from 'lucide-react';
import { Job, JobStatus, SearchResult, SearchFilters, RecentSearchQuery, UserProfile, SubscriptionTier } from '../types';
import { geminiService } from '../services/geminiService';
import { useNotifications } from '../context/NotificationContext';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { storageService } from '../services/storageService';
import { useAuth } from '../context/AuthContext'; // Assuming AuthContext provides currentUser (username)
import { MatchAnalysisPopover } from '../components/MatchAnalysisPopover'; // New component for popover

interface JobSearchViewProps {
  onAddJobFound: (job: Job) => void;
  profile: UserProfile; // Pass user profile for resume content
  subscriptionTier: SubscriptionTier | null; // New: User's subscription tier
}

const JobSearchView: React.FC<JobSearchViewProps> = ({ onAddJobFound, profile, subscriptionTier }) => {
  const initialFilters: SearchFilters = {
    query: '',
    location: '',
    datePosted: 'any',
    experienceLevel: 'any',
    jobType: 'any',
    remote: 'any',
    industry: '',
    salaryRange: 'any', // New filter
    seniority: 'any',    // New filter
  };

  const [filters, setFilters] = useState<SearchFilters>(initialFilters);
  const [allSearchResults, setAllSearchResults] = useState<SearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [loadingMessage, setLoadingMessage] = useState("AI is searching the web...");
  const [fallbackActive, setFallbackActive] = useState(false); // New state for fallback search
  const [recentSearches, setRecentSearches] = useState<RecentSearchQuery[]>([]);
  const [analyzingJobId, setAnalyzingJobId] = useState<string | null>(null); // To track which job is being analyzed
  const [isFetchingLocation, setIsFetchingLocation] = useState(false); // New state for fetching location
  
  const [currentPage, setCurrentPage] = useState(1);
  const jobsPerPage = 10;
  const freeTierSearchLimit = 10; // Max jobs shown for free users
  const freeTierAnalysisLimit = 3; // Max analyses for free users per session
  const analysisCountRef = useRef(0); // Track analysis count for free users
  
  const { addNotification } = useNotifications();
  const { currentUser } = useAuth(); // Assuming useAuth provides the current user (if needed for profile access)

  // Load recent searches on component mount
  useEffect(() => {
    setRecentSearches(storageService.getRecentSearches());
  }, []);

  const handleFilterChange = (field: keyof SearchFilters, value: string) => {
    setFilters(prev => ({ ...prev, [field]: value }));
  };

  const handleSearch = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!filters.query.trim()) {
      addNotification('Please enter a search query.', 'error');
      return;
    }
    setLoading(true);
    setLoadingMessage("AI is searching for specific jobs...");
    setAllSearchResults([]); // Clear previous results
    setFallbackActive(false); // Reset fallback status
    setCurrentPage(1); // Reset to first page
    setAnalyzingJobId(null); // Clear any ongoing analysis

    try {
      const { results: newResults, wasFallback } = await geminiService.searchJobs(filters);
      let resultsToShow = newResults;

      if (subscriptionTier === SubscriptionTier.FREE && newResults.length > freeTierSearchLimit) {
        resultsToShow = newResults.slice(0, freeTierSearchLimit);
        addNotification(`Displaying first ${freeTierSearchLimit} results. Upgrade to AI Pro for unlimited search results!`, 'info');
      }

      setAllSearchResults(resultsToShow);
      setFallbackActive(wasFallback);
      
      if (resultsToShow.length > 0) {
        storageService.saveRecentSearch(filters.query); // Save successful query
        setRecentSearches(storageService.getRecentSearches()); // Reload recent searches
        addNotification(`Found ${resultsToShow.length} job(s)!`, 'success');
      } else {
        addNotification('No jobs found matching your criteria. Try adjusting filters or a broader search.', 'info');
      }
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit. Please wait a minute before trying again.", 'info');
      } else {
        addNotification(`Failed to search for jobs: ${e.message}`, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResetFilters = () => {
    setFilters(initialFilters);
    setAllSearchResults([]);
    setFallbackActive(false);
    setCurrentPage(1);
    setAnalyzingJobId(null);
    analysisCountRef.current = 0; // Reset analysis count
  };

  const handleRecentSearchClick = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
    // Optionally trigger search automatically or let user click search
    // handleSearch(); 
  };

  const handleAnalyzeJobMatch = async (searchResultId: string, jobTitle: string, jobSummary: string) => {
    if (!profile.resumeContent) {
      addNotification("Please upload your master resume in the Profile section to use AI match analysis.", 'info');
      return;
    }

    if (subscriptionTier === SubscriptionTier.FREE) {
      if (analysisCountRef.current >= freeTierAnalysisLimit) {
        addNotification(`Free tier limit reached for AI Match Analysis (${freeTierAnalysisLimit} per session). Upgrade to AI Pro for unlimited analyses!`, 'info');
        return;
      }
      addNotification(`Free tier analysis: ${analysisCountRef.current + 1}/${freeTierAnalysisLimit}`, 'info');
    }

    setAnalyzingJobId(searchResultId);
    try {
      const analysisResult = await geminiService.analyzeJob(profile.resumeContent, jobTitle, jobSummary);
      setAllSearchResults(prevResults => prevResults.map(jr => 
        jr.url + jr.title === searchResultId 
          ? { ...jr, matchScore: analysisResult.score, analysis: JSON.stringify(analysisResult) } 
          : jr
      ));
      addNotification('Match analysis complete!', 'success');
      if (subscriptionTier === SubscriptionTier.FREE) {
        analysisCountRef.current += 1; // Increment count only on success
      }
    } catch (e: any) {
      if (e.message === 'RATE_LIMIT_EXCEEDED') {
        addNotification("You've reached the free tier limit for AI analysis. Please wait a minute before trying again.", 'info');
      } else {
        addNotification("Failed to run AI match analysis. Please try again.", 'error');
      }
    } finally {
      setAnalyzingJobId(null);
    }
  };

  const handleUseCurrentLocation = async () => {
    setIsFetchingLocation(true);
    addNotification('Attempting to fetch your current location...', 'info');
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        async (position) => {
          const { latitude, longitude } = position.coords;
          try {
            const data = await geminiService.getWeatherByCoords(latitude, longitude);
            // FIX: Access `data.country` directly as its type has been updated in geminiService.ts
            if (data?.city && data?.country) {
              handleFilterChange('location', `${data.city}, ${data.country}`);
              addNotification(`Location set to ${data.city}, ${data.country}`, 'success');
            } else {
              addNotification('Could not determine city/country from coordinates.', 'info');
            }
          } catch (error: any) {
            if (error.message === 'RATE_LIMIT_EXCEEDED') {
              addNotification("Location API limit reached. Please wait a minute before trying again.", 'info');
            } else {
              console.error("Error fetching location data:", error);
              addNotification("Failed to fetch location. Please try again.", 'error');
            }
          } finally {
            setIsFetchingLocation(false);
          }
        },
        (error) => {
          console.error("Geolocation Error:", error);
          if (error.code === error.PERMISSION_DENIED) {
            addNotification("Geolocation permission denied. Please enable location services for this site.", 'error');
          } else {
            addNotification(`Failed to get your location: ${error.message}`, 'error');
          }
          setIsFetchingLocation(false);
        },
        { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
      );
    } else {
      addNotification("Geolocation is not supported by your browser.", 'error');
      setIsFetchingLocation(false);
    }
  };


  // Pagination calculations
  const indexOfLastJob = currentPage * jobsPerPage;
  const indexOfFirstJob = indexOfLastJob - jobsPerPage;
  const currentJobs = useMemo(() => allSearchResults.slice(indexOfFirstJob, indexOfLastJob), [allSearchResults, indexOfFirstJob, indexOfLastJob]);
  const totalPages = Math.ceil(allSearchResults.length / jobsPerPage);

  const paginate = (pageNumber: number) => setCurrentPage(pageNumber);

  return (
    <div className="flex flex-col h-full animate-fade-in max-w-7xl mx-auto">
      <div className="flex justify-between items-center mb-6 px-1">
        <div>
          <h2 className="text-3xl font-bold text-gray-800 dark:text-white">Job Search</h2>
          <p className="text-gray-500 dark:text-slate-400 mt-1">Find new opportunities with AI-powered search.</p>
        </div>
        <button
          onClick={handleResetFilters}
          className="bg-gray-100 dark:bg-slate-700 hover:bg-gray-200 dark:hover:bg-slate-600 text-gray-700 dark:text-slate-300 px-5 py-2.5 rounded-xl flex items-center gap-2 font-bold transition-colors shadow-sm"
        >
          <RotateCcw size={18} /> Reset Filters
        </button>
      </div>

      {/* Search Filters Section */}
      <div className="bg-white dark:bg-slate-800 p-8 rounded-[2rem] shadow-sm border border-gray-100 dark:border-slate-700 mb-8">
        <form onSubmit={handleSearch} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="lg:col-span-2">
            <label htmlFor="query" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Keywords</label>
            <div className="relative">
              <Search size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="query"
                type="text"
                value={filters.query}
                onChange={e => handleFilterChange('query', e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Software Engineer, Frontend, React"
                required
              />
            </div>
            {recentSearches.length > 0 && (
              <div className="mt-4">
                <p className="text-xs font-bold text-gray-500 dark:text-slate-400 uppercase tracking-wider mb-2">Recent Searches</p>
                <div className="flex flex-wrap gap-2">
                  {recentSearches.map((rs, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleRecentSearchClick(rs.query)}
                      className="px-3 py-1 bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-400 rounded-full text-xs font-bold hover:bg-indigo-200 dark:hover:bg-indigo-900/50 transition-colors"
                      title={`Last searched: ${new Date(rs.timestamp).toLocaleDateString()}`}
                    >
                      {rs.query}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
          <div>
            <label htmlFor="location" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Location</label>
            <div className="relative flex items-center">
              <MapPin size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="location"
                type="text"
                value={filters.location}
                onChange={e => handleFilterChange('location', e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. London, Remote"
              />
              {!filters.location && (
                <button
                  type="button"
                  onClick={handleUseCurrentLocation}
                  disabled={isFetchingLocation}
                  title="Use my current location"
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-2 rounded-full text-gray-500 dark:text-slate-400 hover:bg-gray-100 dark:hover:bg-slate-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isFetchingLocation ? <RefreshCcw size={18} className="animate-spin" /> : <MapPin size={18} />}
                </button>
              )}
            </div>
          </div>
          <div>
            <label htmlFor="industry" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Industry</label>
            <div className="relative">
              <Factory size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                id="industry"
                type="text"
                value={filters.industry}
                onChange={e => handleFilterChange('industry', e.target.value)}
                className="w-full pl-12 pr-4 py-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
                placeholder="e.g. Tech, Finance"
              />
            </div>
          </div>

          <div>
            <label htmlFor="datePosted" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Date Posted</label>
            <select
              id="datePosted"
              value={filters.datePosted}
              onChange={e => handleFilterChange('datePosted', e.target.value as SearchFilters['datePosted'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Anytime</option>
              <option value="24h">Past 24 hours</option>
              <option value="week">Past week</option>
              <option value="month">Past month</option>
            </select>
          </div>
          <div>
            <label htmlFor="experienceLevel" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Experience Level</label>
            <select
              id="experienceLevel"
              value={filters.experienceLevel}
              onChange={e => handleFilterChange('experienceLevel', e.target.value as SearchFilters['experienceLevel'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="internship">Internship</option>
              <option value="entry">Entry Level</option>
              <option value="associate">Associate</option>
              <option value="mid-senior">Mid-Senior Level</option>
              <option value="director">Director</option>
            </select>
          </div>
          <div>
            <label htmlFor="jobType" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Job Type</label>
            <select
              id="jobType"
              value={filters.jobType}
              onChange={e => handleFilterChange('jobType', e.target.value as SearchFilters['jobType'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="full-time">Full-time</option>
              <option value="part-time">Part-time</option>
              <option value="contract">Contract</option>
            </select>
          </div>
          <div>
            <label htmlFor="remote" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Work Arrangement</label>
            <select
              id="remote"
              value={filters.remote}
              onChange={e => handleFilterChange('remote', e.target.value as SearchFilters['remote'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="on-site">On-site</option>
              <option value="hybrid">Hybrid</option>
              <option value="remote">Remote</option>
            </select>
          </div>
          <div>
            <label htmlFor="salaryRange" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Salary Range</label>
            <select
              id="salaryRange"
              value={filters.salaryRange}
              onChange={e => handleFilterChange('salaryRange', e.target.value as SearchFilters['salaryRange'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="below_50k">Below $50K</option>
              <option value="50k_80k">$50K - $80K</option>
              <option value="80k_120k">$80K - $120K</option>
              <option value="120k_150k">$120K - $150K</option>
              <option value="150k_plus">$150K+</option>
            </select>
          </div>
          <div>
            <label htmlFor="seniority" className="block text-sm font-bold text-gray-700 dark:text-slate-300 mb-2">Seniority</label>
            <select
              id="seniority"
              value={filters.seniority}
              onChange={e => handleFilterChange('seniority', e.target.value as SearchFilters['seniority'])}
              className="w-full p-3 bg-gray-50 dark:bg-slate-900 border border-gray-200 dark:border-slate-700 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none"
            >
              <option value="any">Any</option>
              <option value="junior">Junior</option>
              <option value="mid">Mid</option>
              <option value="senior">Senior</option>
              <option value="lead_staff">Lead/Staff</option>
            </select>
          </div>

          <div className="lg:col-span-4 flex justify-end">
            <button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 text-white px-8 py-4 rounded-xl font-bold hover:bg-indigo-700 transition-colors flex items-center gap-2 shadow-lg disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? loadingMessage : <><Search size={20} /> Search Jobs</>}
            </button>
          </div>
        </form>
      </div>

      {/* Search Results Display */}
      {loading && <LoadingOverlay message={loadingMessage} />}
      {!loading && allSearchResults.length > 0 && (
        <div className="mt-8 flex-1 flex flex-col">
          <h3 className="text-xl font-bold text-gray-800 dark:text-white mb-2">Search Results ({allSearchResults.length}{subscriptionTier === SubscriptionTier.FREE ? ` (showing first ${freeTierSearchLimit})` : ''})</h3>
          <p className="text-sm text-gray-500 dark:text-slate-400 mb-4 flex items-center gap-2">
            <Info size={16} className="text-indigo-400 flex-shrink-0" />
            Job links are dynamic and may expire. "Date Posted" and "Application Deadline" are not available for generic search results.
          </p>
          
          {fallbackActive && (
            <div className="flex items-center gap-3 bg-amber-50 dark:bg-amber-900/20 p-4 rounded-xl border border-amber-100 dark:border-amber-800 text-amber-900 dark:text-amber-300 mb-6 animate-fade-in">
              <AlertTriangle size={20} className="text-amber-500 flex-shrink-0" />
              <p className="text-sm">No jobs found for your specific filters. Showing broader results for "{filters.query}".</p>
            </div>
          )}

          {subscriptionTier === SubscriptionTier.FREE && allSearchResults.length >= freeTierSearchLimit && (
            <div className="flex items-center gap-3 bg-purple-50 dark:bg-purple-900/20 p-4 rounded-xl border border-purple-100 dark:border-purple-800 text-purple-900 dark:text-purple-300 mb-6 animate-fade-in">
              <TrendingUp size={20} className="text-purple-500 flex-shrink-0" />
              <p className="text-sm">Only showing first {freeTierSearchLimit} results for Free users. <button onClick={() => {}} className="font-bold underline">Upgrade to AI Pro</button> for unlimited search results!</p>
            </div>
          )}


          <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-sm border border-gray-100 dark:border-slate-700 overflow-hidden flex-1 flex flex-col transition-colors">
            <div className="overflow-auto custom-scrollbar flex-1">
              <table className="w-full text-left border-collapse">
                <thead className="bg-gray-50/80 dark:bg-slate-900/80 sticky top-0 z-10 backdrop-blur-md shadow-sm">
                  <tr>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-12">No.</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-1/4">Role</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-1/6">Company</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-1/6">Location</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700 w-1/4">Description</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Link</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">AI Match</th>
                    <th className="p-4 text-xs font-bold text-gray-400 uppercase tracking-wider border-b border-gray-100 dark:border-slate-700">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50 dark:divide-slate-700">
                  {currentJobs.map((res, idx) => {
                    const uniqueId = res.url + res.title; // Simple unique ID for analysis tracking
                    const isAnalyzing = analyzingJobId === uniqueId;
                    const hasValidUrl = res.url && res.url !== 'N/A';
                    const analysisData = res.analysis ? JSON.parse(res.analysis) : null;

                    const isFreeTierAnalysisLimitReached = subscriptionTier === SubscriptionTier.FREE && analysisCountRef.current >= freeTierAnalysisLimit;

                    return (
                      <tr key={uniqueId} className="hover:bg-indigo-50/30 dark:hover:bg-indigo-900/10 transition-colors group">
                        <td className="p-4 text-sm text-gray-500 dark:text-slate-500 font-medium">{(currentPage - 1) * jobsPerPage + idx + 1}</td>
                        <td className="p-4">
                          <div className="font-bold text-gray-800 dark:text-white line-clamp-2">{res.title}</div>
                        </td>
                        <td className="p-4 text-sm text-gray-700 dark:text-slate-300 font-medium">
                          <div className="flex items-center gap-2">
                            <div className="w-6 h-6 rounded bg-gray-100 dark:bg-slate-700 flex items-center justify-center text-xs font-bold text-gray-500 dark:text-slate-400 shrink-0">
                              {res.company.charAt(0)}
                            </div>
                            {res.company}
                          </div>
                        </td>
                        <td className="p-4 text-sm text-gray-600 dark:text-slate-400">
                          <span className="bg-gray-100 dark:bg-slate-700 text-gray-600 dark:text-slate-300 px-2 py-0.5 rounded text-xs">{res.location || '-'}</span>
                        </td>
                        <td className="p-4 text-sm text-gray-700 dark:text-slate-400">
                          <p className="line-clamp-3" title={res.summary}>{res.summary}</p>
                        </td>
                        <td className="p-4">
                          {hasValidUrl ? (
                            <a href={res.url} target="_blank" rel="noreferrer" className="text-indigo-600 hover:text-indigo-800 dark:text-indigo-400 dark:hover:text-indigo-300 p-2 hover:bg-indigo-50 dark:hover:bg-indigo-900/30 rounded-lg transition-colors flex items-center justify-center" title="View Job Ad">
                              <ExternalLink size={18} />
                            </a>
                          ) : (
                            <span className="text-gray-400 dark:text-slate-600 opacity-60 cursor-not-allowed flex items-center justify-center p-2" title="No direct link available">
                              <ExternalLink size={18} />
                            </span>
                          )}
                        </td>
                        <td className="p-4 relative">
                          {isAnalyzing ? (
                            <div className="flex items-center justify-center">
                              <RefreshCcw size={16} className="animate-spin text-indigo-500" />
                            </div>
                          ) : res.matchScore !== undefined ? (
                            <MatchAnalysisPopover analysis={analysisData} score={res.matchScore}>
                              <span className={`px-3 py-1.5 rounded-full text-xs font-bold cursor-help border 
                                ${res.matchScore >= 80 ? 'bg-green-50 text-green-700 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800' :
                                res.matchScore >= 50 ? 'bg-yellow-50 text-yellow-700 border-yellow-200 dark:bg-yellow-900/30 dark:text-yellow-400 dark:border-yellow-800' :
                                'bg-red-50 text-red-700 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800'}`}>
                                {res.matchScore}%
                              </span>
                            </MatchAnalysisPopover>
                          ) : (
                            <button
                              onClick={() => handleAnalyzeJobMatch(uniqueId, res.title, res.summary)}
                              className={`bg-indigo-50 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-indigo-100 dark:hover:bg-indigo-900/50 flex items-center gap-1 transition-colors whitespace-nowrap
                                ${!profile.resumeContent || isFreeTierAnalysisLimitReached ? 'opacity-50 cursor-not-allowed' : ''}`}
                              title={!profile.resumeContent ? "Add your master resume in Profile to use this feature" : isFreeTierAnalysisLimitReached ? `Free tier limit reached for AI Match Analysis (${freeTierAnalysisLimit} per session). Upgrade to AI Pro for unlimited analyses!` : "Analyze match with your resume"}
                              disabled={!profile.resumeContent || isFreeTierAnalysisLimitReached}
                            >
                              <Sparkles size={14} /> Match
                            </button>
                          )}
                        </td>
                        <td className="p-4">
                          <button 
                            onClick={() => {
                              onAddJobFound({
                                id: uniqueId, // Using uniqueId for the job id
                                title: res.title,
                                company: res.company,
                                city: res.location,
                                description: res.summary + (hasValidUrl ? "\n\nSource URL: " + res.url : "\n\nSource: AI Search"),
                                status: JobStatus.WISHLIST,
                                dateAdded: Date.now(),
                                url: res.url,
                                source: 'AI Search',
                                matchScore: res.matchScore, // Carry over analysis if already done
                                analysis: res.analysis,
                              });
                              addNotification(`${res.title} added to your board!`, 'success');
                            }}
                            className="bg-gray-900 dark:bg-white text-white dark:text-gray-900 px-3 py-1.5 rounded-xl text-xs font-bold hover:bg-gray-800 dark:hover:bg-gray-200 flex items-center gap-1 whitespace-nowrap shadow-md hover:scale-105 transition-transform"
                            title="Add to My Job Board"
                          >
                            <Plus size={14} /> Add
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {allSearchResults.length > jobsPerPage && (
            <div className="flex justify-center items-center gap-4 mt-6">
              <button
                onClick={() => paginate(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Previous Page"
              >
                <ChevronLeft size={20} />
              </button>
              <span className="text-sm font-bold text-gray-700 dark:text-slate-300">
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => paginate(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-3 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                title="Next Page"
              >
                <ChevronRight size={20} />
              </button>
            </div>
          )}
        </div>
      )}
      {!loading && allSearchResults.length === 0 && filters.query && ( // Only show if a query was made and no results found
        <div className="text-center py-12 text-gray-400 dark:text-slate-500">
          <Briefcase size={48} className="mx-auto mb-4 opacity-10" />
          <p>No jobs found matching your criteria. Try adjusting your filters.</p>
        </div>
      )}
    </div>
  );
};

export default JobSearchView;