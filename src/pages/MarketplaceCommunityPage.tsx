import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Bookmark, Clock3, Filter, GitBranch, MessageCircle, Search, Tag, ThumbsUp, ArrowRight, Sparkles, Globe, Users, CheckCircle2, Menu, X } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import GridScan from '@/components/ui/GridScan';
import type { User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { isDemoMode } from '@/lib/demo';

type Severity = 'critical' | 'high' | 'medium' | 'low';

type CommunityListing = {
  id: string;
  title: string;
  repo: string;
  severity: Severity;
  tags: string[];
  summary: string;
  author: string;
  createdAt: string;
  upvotes: number;
  comments: number;
};

const seed: CommunityListing[] = [
  {
    id: 'C-120',
    title: 'DX issue: hydration mismatch on filters',
    repo: 'opsnest/web',
    severity: 'medium',
    tags: ['frontend', 'hydration', 'vite'],
    summary: 'Hydration warning on marketplace filters in Safari 17.2. Suspect optional chaining during SSR. Needs immediate attention for the new release candidate.',
    author: 'alice',
    createdAt: '1h ago',
    upvotes: 24,
    comments: 5
  },
  {
    id: 'C-121',
    title: 'Cron scan: slow GHA runners on nightly index',
    repo: 'opsnest/infra-api',
    severity: 'high',
    tags: ['ci', 'indexing', 'perf'],
    summary: 'Nightly index exceeding 20m on ubuntu-latest; caching missing for pnpm store. We need to switch to larger runners or optimize the cache strategy.',
    author: 'sre-bot',
    createdAt: '6h ago',
    upvotes: 12,
    comments: 2
  },
  {
    id: 'C-122',
    title: 'Flaky Playwright: repo linking OAuth popup',
    repo: 'opsnest/cli',
    severity: 'low',
    tags: ['playwright', 'oauth', 'flaky'],
    summary: 'Popup occasionally blocked by browser policy in headless mode; need reliable bypass.',
    author: 'qa-team',
    createdAt: '1d ago',
    upvotes: 8,
    comments: 1
  },
  {
    id: 'C-123',
    title: 'Memory leak in websocket subscriber',
    repo: 'opsnest/realtime',
    severity: 'critical',
    tags: ['backend', 'websocket', 'memory'],
    summary: 'RSS growing linearly with active connections. Heap dump points to orphaned subscription objects.',
    author: 'backend-lead',
    createdAt: '2d ago',
    upvotes: 45,
    comments: 12
  }
];

const severityChip: Record<Severity, string> = {
  critical: 'bg-red-50 text-red-700 border-red-200 ring-red-100',
  high: 'bg-orange-50 text-orange-700 border-orange-200 ring-orange-100',
  medium: 'bg-amber-50 text-amber-700 border-amber-200 ring-amber-100',
  low: 'bg-emerald-50 text-emerald-700 border-emerald-200 ring-emerald-100',
};

const MarketplaceCommunityPage = () => {
  const forceDemoMode = isDemoMode();
  const [search, setSearch] = useState('');
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const navigate = useNavigate();
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileFiltersRef = useRef<HTMLDivElement | null>(null);
  const [isDark, setIsDark] = useState<boolean>(() => window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches);
  const [showBackTop, setShowBackTop] = useState(false);

  const listings = useMemo(() => (forceDemoMode ? seed : []), [forceDemoMode]);
  const tags = useMemo(() => Array.from(new Set(listings.flatMap((s) => s.tags))), [listings]);

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(event.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    const onScroll = () => setShowBackTop(window.scrollY > 240);
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close mobile menu/filters on outside click or Escape; lock body scroll when overlays are open.
  useEffect(() => {
    if (!mobileMenuOpen && !mobileFiltersOpen) return;
    const handlePointerDown = (event: MouseEvent) => {
      const target = event.target as Node;
      const menuContains = mobileMenuRef.current?.contains(target);
      const filtersContains = mobileFiltersRef.current?.contains(target);
      if (!menuContains && !filtersContains) {
        setMobileMenuOpen(false);
        setMobileFiltersOpen(false);
      }
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setMobileMenuOpen(false);
        setMobileFiltersOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [mobileMenuOpen, mobileFiltersOpen]);

  const bgBase = isDark ? 'bg-slate-900 text-white' : 'bg-slate-50 text-slate-900';
  const headerBg = isDark ? 'bg-slate-900/90 border-slate-800 text-white' : 'bg-white/90 border-slate-200 text-slate-900';

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
  };

  const filtered = useMemo(() => {
    return listings.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.repo.toLowerCase().includes(search.toLowerCase()) ||
        item.summary.toLowerCase().includes(search.toLowerCase());
      const matchTags =
        selectedTags.length === 0 || selectedTags.every((t) => item.tags.includes(t));
      return matchSearch && matchTags;
    });
  }, [search, selectedTags, listings]);

  const hasListings = listings.length > 0;

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) => (prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]));
  };

  return (
    <div className="min-h-screen bg-slate-50 font-mono text-slate-900 pb-24">
      <header className="sticky top-0 z-30 w-full px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm">
        <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
          <div className="font-bold text-xl tracking-tighter text-slate-900">opsNest_</div>
          <span className="text-slate-400">/</span>
          <span className="text-slate-600">Marketplace</span>
        </div>
        
        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-900">
            <Link to={{ pathname: '/', hash: '#about' }} className="hover:text-slate-700 transition-colors">[ABOUT]</Link>
            <Link to="/marketplace" className="hover:text-slate-700 transition-colors">[MARKETPLACE]</Link>
            <Link to={{ pathname: '/', hash: '#contact' }} className="hover:text-slate-700 transition-colors">CONTACT</Link>
            
            <span className="text-slate-400">|</span>
            {user ? (
              <div className="relative" ref={profileMenuRef}>
                <button
                  type="button"
                  aria-haspopup="menu"
                  aria-expanded={profileMenuOpen}
                  className="flex items-center gap-2 hover:text-slate-700 transition-colors outline-none"
                  onPointerDown={(e) => e.stopPropagation()}
                  onClick={(e) => {
                    e.stopPropagation();
                    setProfileMenuOpen((v) => !v);
                  }}
                >
                  <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-800 ring-2 ring-slate-100">
                    {user.email?.[0].toUpperCase() || 'U'}
                  </div>
                </button>
                {profileMenuOpen && (
                  <div
                    role="menu"
                    className="absolute right-0 top-full mt-2 w-44 bg-white border border-slate-200 rounded-md shadow-lg flex flex-col py-1 z-50 pointer-events-auto"
                    onClick={(e) => e.stopPropagation()}
                    onPointerDown={(e) => e.stopPropagation()}
                  >
                    <Link
                      to="/dashboard/profile"
                      role="menuitem"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setProfileMenuOpen(false)}
                      className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Profile
                    </Link>
                    <div className="h-px bg-slate-100 my-1" />
                    <Link
                      to="/dashboard"
                      role="menuitem"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setProfileMenuOpen(false)}
                      className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
                    <div className="h-px bg-slate-100 my-1" />
                    <button
                      type="button"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={handleLogout}
                      className="px-4 py-2 text-sm text-red-600 hover:bg-red-50 text-left w-full"
                    >
                      Sign out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <>
                <Link to="/login" className="hover:text-slate-700 transition-colors">[login]</Link>
                <Link to="/register" className="hover:text-slate-700 transition-colors">[sign up]</Link>
              </>
            )}
          </nav>

          <div className="flex items-center gap-2 md:hidden">
            {user && (
              <div className="h-8 w-8 bg-slate-100 rounded-full flex items-center justify-center text-xs font-bold text-slate-800 ring-2 ring-slate-100">
                {user.email?.[0].toUpperCase() || 'U'}
              </div>
            )}
            <button
              type="button"
              aria-label={mobileMenuOpen ? 'Close menu' : 'Open menu'}
              aria-expanded={mobileMenuOpen}
              onClick={() => setMobileMenuOpen((v) => !v)}
              className="p-2 rounded-md border border-slate-200 bg-white text-slate-800 shadow-sm hover:bg-slate-50"
            >
              {mobileMenuOpen ? <X size={18} /> : <Menu size={18} />}
            </button>
          </div>
        </div>
      </header>

      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 md:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            ref={mobileMenuRef}
            className="absolute top-20 inset-x-4 rounded-2xl bg-white text-slate-900 shadow-xl border border-slate-200 p-4 space-y-4"
          >
            <div className="flex items-center justify-between">
              <div className="font-semibold text-lg">Menu</div>
              <button
                type="button"
                aria-label="Close menu"
                className="p-2 rounded-md hover:bg-slate-100"
                onClick={() => setMobileMenuOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-col divide-y divide-slate-200 text-sm font-semibold">
              <Link
                to={{ pathname: '/', hash: '#about' }}
                className="py-3 hover:text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                [ABOUT]
              </Link>
              <Link
                to="/marketplace"
                className="py-3 hover:text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                [MARKETPLACE]
              </Link>
              <Link
                to={{ pathname: '/', hash: '#contact' }}
                className="py-3 hover:text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                CONTACT
              </Link>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {user ? (
                <>
                  <Button className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}>
                    Dashboard
                  </Button>
                  <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); handleLogout(); }}>
                    Sign out
                  </Button>
                </>
              ) : (
                <>
                  <Button variant="outline" className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/login'); }}>
                    Login
                  </Button>
                  <Button className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/register'); }}>
                    Sign up
                  </Button>
                </>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Hero Section */}
      <div
        id="about"
        className="relative bg-gradient-to-br from-black via-slate-900 to-black text-white border-b border-white/10 overflow-hidden"
      >
        <GridScan
          className="opacity-80"
          linesColor="#7BDCB5"
          scanColor="#C8FFE2"
          scanOpacity={0.5}
          gridScale={0.12}
          lineThickness={1}
        />
        <div className="absolute inset-0 bg-[radial-gradient(#1f2937_1px,transparent_1px)] [background-size:16px_16px] opacity-20" />
        <div className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-16 md:py-24 relative z-10 text-center">
           <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/10 text-white text-xs font-semibold border border-white/20 mb-6">
             <Sparkles size={14} /> Community Powered Fixes
           </div>
           <h1 className="text-4xl md:text-5xl lg:text-6xl font-black tracking-tight text-white mb-6">
             Find bugs. Fix them. Get paid.
           </h1>
           <p className="text-lg text-white/80 max-w-2xl mx-auto mb-10 leading-relaxed">
             The open marketplace for verified fixes. Browse issues from top repos, ship patches, and earn rewards.
           </p>
           
          <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
              <div className="relative w-full sm:w-96 group">
                <div className="absolute -inset-0.5 bg-gradient-to-r from-white/40 to-white/10 rounded-lg blur opacity-30 group-hover:opacity-50 transition duration-200"></div>
                <div className="relative bg-black/60 border border-white/20 rounded-lg flex items-center shadow-sm backdrop-blur">
                  <Search size={18} className="absolute left-3 text-white/60" />
                  <input 
                    className="w-full bg-transparent h-12 pl-10 pr-4 rounded-lg outline-none text-white placeholder:text-white/50"
                    placeholder="Search for issues, repos, or tags..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
              </div>
              <Button size="lg" className="h-12 px-8 rounded-lg bg-white text-black hover:bg-white/90 w-full sm:w-auto">Search</Button>
           </div>

           <div className="flex flex-col md:flex-row items-center justify-center gap-4 md:gap-6 mt-10 text-white/70 text-sm font-medium">
              <div className="flex items-center gap-2"><Globe size={16} /> 1,200+ Repos</div>
              <div className="flex items-center gap-2"><Users size={16} /> 5k+ Developers</div>
              <div className="flex items-center gap-2"><Clock3 size={16} /> Avg. fix time 4h</div>
           </div>
        </div>
      </div>

      <main className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 py-12">
        <div className="grid lg:grid-cols-[280px_1fr] gap-8 items-start">
          {/* Sidebar */}
          <aside className="hidden lg:block space-y-8 sticky top-24">
            <div>
               <h3 className="font-semibold text-slate-900 mb-4 flex items-center gap-2">
                 <Filter size={16} /> Filters
               </h3>
               <div className="space-y-3">
                 <div className="flex flex-wrap gap-2">
                   {tags.map((tag) => (
                    <button
                     key={tag}
                     onClick={() => toggleTag(tag)}
                     className={`px-3 py-1.5 rounded-md text-sm transition-colors text-left w-full flex items-center justify-between group ${selectedTags.includes(tag) ? 'bg-slate-900 text-white' : 'bg-white border border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                    >
                     <span>#{tag}</span>
                     {selectedTags.includes(tag) && <CheckCircle2 size={14} />}
                    </button>
                   ))}
                 </div>
                 {selectedTags.length > 0 && (
                   <button 
                     onClick={() => setSelectedTags([])}
                     className="text-xs text-red-600 hover:underline mt-2 block"
                   >
                     Clear all filters
                   </button>
                 )}
               </div>
            </div>

            <div className="rounded-none bg-black border border-slate-900 p-5 text-white">
              <h4 className="font-semibold text-white mb-2">Post a Bounty</h4>
              <p className="text-sm text-slate-100/80 mb-4">Found a bug? Post it here and get community help.</p>
              <Button className="w-full bg-white text-black hover:bg-slate-100 border border-white/30 shadow-sm">Create Listing</Button>
            </div>
          </aside>

          {/* Listings */}
          <div className="space-y-6">
             <div className="flex items-center justify-between pb-4 border-b border-slate-200 lg:hidden">
               <h2 className="font-bold text-lg">Listings</h2>
               <Button variant="outline" size="sm" onClick={() => setMobileFiltersOpen(true)} className="flex items-center gap-2">
                 <Filter size={14} /> Filter
               </Button>
             </div>

             {!hasListings ? (
               <div className="text-center py-20">
                 <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                   <Search size={24} />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">No marketplace listings</h3>
                 <p className="text-slate-500 max-w-sm mx-auto mt-2">
                   Connect your backend/Supabase to load listings. Demo listings only appear when demo mode is enabled.
                 </p>
               </div>
             ) : filtered.length === 0 ? (
               <div className="text-center py-20">
                 <div className="h-16 w-16 bg-slate-100 rounded-full flex items-center justify-center mx-auto mb-4 text-slate-400">
                   <Search size={24} />
                 </div>
                 <h3 className="text-lg font-semibold text-slate-900">No listings found</h3>
                 <p className="text-slate-500 max-w-sm mx-auto mt-2">Try adjusting your search or filters to find what you're looking for.</p>
                 <Button variant="outline" className="mt-6" onClick={() => { setSearch(''); setSelectedTags([]); }}>Clear filters</Button>
               </div>
             ) : (
               <div className="grid gap-4">
                 {filtered.map((item) => (
                   <div key={item.id} className="group rounded-xl border border-slate-200 bg-white p-5 shadow-sm hover:shadow-md hover:border-indigo-200 transition-all duration-200 cursor-pointer">
                      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                        <div className="space-y-2 flex-1">
                           <div className="flex items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5 text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded-md">
                                <GitBranch size={12} />
                                {item.repo}
                              </div>
                              <span className={`px-2.5 py-0.5 rounded-full border text-[10px] font-semibold uppercase tracking-wide ring-1 ring-inset ${severityChip[item.severity]}`}>
                                {item.severity}
                              </span>
                              <span className="text-slate-400 ml-auto sm:ml-0">•</span>
                              <span className="text-slate-500">{item.createdAt}</span>
                           </div>
                           
                           <h3 className="text-xl font-bold text-slate-900 group-hover:text-indigo-600 transition-colors">
                             {item.title}
                           </h3>
                           <p className="text-slate-600 leading-relaxed text-sm line-clamp-2">
                             {item.summary}
                           </p>

                           <div className="flex flex-wrap gap-2 pt-2">
                              {item.tags.map((tag) => (
                                <span key={tag} className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 bg-slate-50 px-2 py-1 rounded-md border border-slate-100">
                                   <Tag size={10} /> {tag}
                                </span>
                              ))}
                           </div>
                        </div>

                        <div className="flex sm:flex-col items-center sm:items-end gap-3 sm:gap-2 min-w-[100px] border-t sm:border-t-0 border-slate-100 pt-4 sm:pt-0">
                           <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
                              <ThumbsUp size={14} className="text-slate-400" /> {item.upvotes}
                           </div>
                           <div className="flex items-center gap-1.5 text-slate-600 font-medium text-sm">
                              <MessageCircle size={14} className="text-slate-400" /> {item.comments}
                           </div>
                           <Button size="sm" variant="ghost" className="ml-auto sm:ml-0 sm:mt-2 h-8 w-8 p-0 rounded-full hover:bg-slate-100 hover:text-indigo-600">
                             <Bookmark size={16} />
                           </Button>
                        </div>
                      </div>
                   </div>
                 ))}
               </div>
             )}
          </div>
        </div>
      </main>

      <section
        id="contact"
        className="max-w-7xl mx-auto px-4 md:px-6 lg:px-8 pb-16"
      >
        <div className="border border-slate-200 bg-white/80 backdrop-blur shadow-sm p-8 md:p-12 rounded-none">
          <div className="grid gap-8 md:grid-cols-[1.2fr_0.8fr] items-center">
            <div className="space-y-4">
              <p className="text-xs font-semibold uppercase tracking-[0.2em] text-indigo-600">
                Contact
              </p>
              <h2 className="text-3xl md:text-4xl font-black text-slate-900">
                Need a specific fix or want to feature your repo?
              </h2>
              <p className="text-slate-600 text-lg leading-relaxed">
                Tell us what you&apos;re shipping and we&apos;ll curate the right builders.
                Drop a note and we&apos;ll respond within one business day.
              </p>
              <div className="flex flex-wrap gap-3 items-center">
                <Button size="lg" className="bg-slate-900 hover:bg-slate-800 text-white">
                  Message the team
                </Button>
                <a
                  href="mailto:hong@codecrafter.dev"
                  className="text-indigo-700 font-semibold hover:underline text-sm"
                >
                  hong@codecrafter.dev
                </a>
              </div>
            </div>

            <div className="space-y-3 rounded-none border border-slate-100 bg-slate-50 p-6 text-sm text-slate-700">
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-green-500" />
                <div>
                  <p className="font-semibold text-slate-900">Curated bounty briefs</p>
                  <p className="text-slate-600">We scope the issue and publish it in minutes.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-indigo-500" />
                <div>
                  <p className="font-semibold text-slate-900">Verified builders</p>
                  <p className="text-slate-600">Trusted community contributors with repo history.</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="mt-1 h-2 w-2 rounded-full bg-amber-500" />
                <div>
                  <p className="font-semibold text-slate-900">Fast response</p>
                  <p className="text-slate-600">Expect a reply within 1 business day.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Sticky bottom status + landing CTA */}
      <div className="fixed bottom-0 inset-x-0 z-30 bg-white/95 text-slate-900 border-t border-slate-200 px-4 sm:px-6 md:px-12 lg:px-24 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.08)] backdrop-blur">
        <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-8">
          <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500 w-full sm:w-auto justify-start">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Loading status
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto sm:justify-end text-xs font-semibold uppercase tracking-[0.25em] text-slate-700">
            <Link to={{ pathname: '/', hash: '#contact' }} className="hover:text-slate-900">
              Say hello
            </Link>
            <span className="text-slate-300">|</span>
            <Link to={{ pathname: '/', hash: '#about' }} className="hover:text-slate-900">
              Go to landing
            </Link>
          </div>
        </div>
      </div>

      {mobileFiltersOpen && (
        <div className="fixed inset-0 z-40 lg:hidden">
          <div className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm" />
          <div
            ref={mobileFiltersRef}
            className="absolute bottom-0 left-0 right-0 bg-white rounded-t-2xl shadow-2xl p-6 space-y-4"
          >
            <div className="flex items-center justify-between">
              <h3 className="font-semibold text-lg">Filters</h3>
              <button
                type="button"
                aria-label="Close filters"
                className="p-2 rounded-md hover:bg-slate-100"
                onClick={() => setMobileFiltersOpen(false)}
              >
                <X size={18} />
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              {tags.map((tag) => (
                <button
                  key={tag}
                  onClick={() => toggleTag(tag)}
                  className={`px-3 py-1.5 rounded-md text-sm transition-colors border ${selectedTags.includes(tag) ? 'bg-slate-900 text-white border-slate-900' : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'}`}
                >
                  #{tag}
                </button>
              ))}
            </div>
            {selectedTags.length > 0 && (
              <button
                onClick={() => setSelectedTags([])}
                className="text-xs text-red-600 hover:underline"
              >
                Clear all filters
              </button>
            )}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <Button variant="outline" className="w-full" onClick={() => { setSelectedTags([]); }}>
                Reset
              </Button>
              <Button className="w-full" onClick={() => setMobileFiltersOpen(false)}>
                Apply
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MarketplaceCommunityPage;
