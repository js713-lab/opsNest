import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Bookmark, LogOut, Search, Tag, X, GitBranch, Link2, Clock3, CheckCircle2, MessageCircle, Inbox, ClipboardList, ShieldAlert, Eye, Loader2 } from 'lucide-react';
import { Link, useLocation, useSearchParams } from 'react-router-dom';

type ListingStatus = 'open' | 'assigned' | 'fixed';
type Severity = 'critical' | 'high' | 'medium' | 'low';

type Listing = {
  id: string;
  title: string;
  repo: string;
  branch: string;
  category: string;
  severity: Severity;
  status: ListingStatus;
  tags: string[];
  createdAt: string;
  summary: string;
  logsUrl?: string;
  cronRef?: string;
  author?: string;
};

const MARKETPLACE_SUBMISSION_KEY = 'opsnestMarketplaceSubmissions';

const listingsSeed: Listing[] = [
  {
    id: 'L-1048',
    title: 'Cron-based index job failing on secrets fetch',
    repo: 'opsnest/infra-api',
    branch: 'main',
    category: 'Backend',
    severity: 'high',
    status: 'open',
    tags: ['indexing', 'secrets', 'cron'],
    createdAt: '2h ago',
    summary: 'Nightly index job fails when vault token expires mid-run; need resilient refresh.',
    logsUrl: 'https://example.com/logs/index-1048',
    cronRef: '0 3 * * *',
    author: 'DevOps',
  },
  {
    id: 'L-1049',
    title: 'React hydration mismatch on dashboard widgets',
    repo: 'opsnest/web',
    branch: 'release/1.4',
    category: 'Frontend',
    severity: 'medium',
    status: 'assigned',
    tags: ['hydration', 'ssr', 'vite'],
    createdAt: '5h ago',
    summary: 'Widgets render differently between SSR and client; hydration warnings and flicker.',
    logsUrl: 'https://example.com/logs/hydration',
    cronRef: 'on deploy',
    author: 'UI Platform',
  },
  {
    id: 'L-1050',
    title: 'CI flaky e2e for repo linking',
    repo: 'opsnest/cli',
    branch: 'develop',
    category: 'Tooling',
    severity: 'low',
    status: 'open',
    tags: ['playwright', 'oauth', 'github'],
    createdAt: '1d ago',
    summary: 'GitHub OAuth sometimes 429s; retries missing leading to flaky job failures.',
    logsUrl: 'https://example.com/logs/e2e-oauth',
    cronRef: 'per PR',
    author: 'Automation',
  },
  {
    id: 'L-1051',
    title: 'API latency regression on search endpoint',
    repo: 'opsnest/infra-api',
    branch: 'main',
    category: 'Backend',
    severity: 'critical',
    status: 'open',
    tags: ['latency', 'postgres', 'perf'],
    createdAt: '3d ago',
    summary: 'p95 doubled after new trigram search; needs index tuning and plan review.',
    logsUrl: 'https://example.com/logs/search-latency',
    cronRef: 'every 15m',
    author: 'SRE',
  },
];

const badgeBySeverity: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800/70',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-800/70',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800/70',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/70',
};

const badgeByStatus: Record<ListingStatus, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-800/70',
  assigned: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-100 dark:border-purple-800/70',
  fixed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/70',
};
const badgeBase = 'inline-flex items-center justify-center rounded-full border px-2 py-1 text-[11px] min-w-[72px] text-center';

type ListingActionsProps = {
  listing: Listing;
  onOpen: (listing: Listing) => void;
  orientation?: 'row' | 'column';
  className?: string;
};

const ListingActions = ({ listing, onOpen, orientation = 'row', className }: ListingActionsProps) => {
  const containerClasses =
    orientation === 'column'
      ? 'flex w-full flex-col gap-2 sm:min-w-[240px]'
      : 'grid w-full grid-cols-2 gap-2';
  const buttonWidth = 'w-full';
  const combinedContainer = className ? `${containerClasses} ${className}` : containerClasses;

  return (
    <div className={combinedContainer}>
      <Button size="sm" variant="outline" className={`${buttonWidth} bg-black text-white hover:bg-slate-800 hover:text-white border-black`} onClick={(e) => e.stopPropagation()}>
        Fix it
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={buttonWidth}
        onClick={(e) => {
          e.stopPropagation();
          onOpen(listing);
        }}
      >
        <Eye size={14} className="mr-1.5" />
        View details
      </Button>
      <Button
        size="sm"
        asChild
        variant="outline"
        className={buttonWidth}
        onClick={(e) => e.stopPropagation()}
      >
        <Link
          to={`/dashboard/messages?listing=${listing.id}&owner=${listing.author || 'Owner'}`}
          className="flex w-full items-center justify-center gap-1.5 whitespace-nowrap"
        >
          <MessageCircle size={14} />
          Message
        </Link>
      </Button>
      <Button
        size="sm"
        variant="outline"
        className={`${buttonWidth} flex items-center justify-center gap-1.5 border-dashed`}
        onClick={(e) => e.stopPropagation()}
      >
        <Bookmark size={14} />
        Bookmark
      </Button>
    </div>
  );
};

const MarketplacePage = () => {
  const [listings, setListings] = useState<Listing[]>(listingsSeed);
  const [search, setSearch] = useState('');
  const [selectedCategories, setSelectedCategories] = useState<string[]>([]);
  const [selectedSeverity, setSelectedSeverity] = useState<Severity[]>([]);
  const [selectedStatus, setSelectedStatus] = useState<ListingStatus[]>([]);
  const [selectedListing, setSelectedListing] = useState<Listing | null>(null);
  const [activeTab, setActiveTab] = useState<'browse' | 'my' | 'messages'>('browse');
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [searchParams, setSearchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const location = useLocation();
  const { pathname, hash } = location;

  const loadListings = () => {
    try {
      const stored = JSON.parse(localStorage.getItem(MARKETPLACE_SUBMISSION_KEY) || '[]') as Listing[];
      setListings([...stored, ...listingsSeed]);
    } catch {
      setListings([...listingsSeed]);
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    setLoading(true);
    loadListings();
  };

  useEffect(() => {
    loadListings();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const myListings: Listing[] = (() => {
    const mine = listings.filter((l) => (l.author || '').toLowerCase() === 'you');
    if (mine.length > 0) return mine;
    return listings.slice(0, 2);
  })();
  const messages = [
    { id: 'm1', from: 'alice', listing: 'L-1048', preview: 'Can you attach last run logs?', time: '5m ago' },
    { id: 'm2', from: 'qa-team', listing: 'L-1050', preview: 'We saw similar OAuth flake, can pair?', time: '1h ago' },
  ];

  const categories = useMemo(
    () => Array.from(new Set(listings.map((l) => l.category))),
    [listings]
  );

  const filteredListings = useMemo(() => {
    return listings.filter((l) => {
      const matchesSearch =
        l.title.toLowerCase().includes(search.toLowerCase()) ||
        l.repo.toLowerCase().includes(search.toLowerCase()) ||
        l.tags.some((t) => t.toLowerCase().includes(search.toLowerCase()));
      const matchesCategory =
        selectedCategories.length === 0 || selectedCategories.includes(l.category);
      const matchesSeverity =
        selectedSeverity.length === 0 || selectedSeverity.includes(l.severity);
      const matchesStatus =
        selectedStatus.length === 0 || selectedStatus.includes(l.status);
      return matchesSearch && matchesCategory && matchesSeverity && matchesStatus;
    });
  }, [listings, search, selectedCategories, selectedSeverity, selectedStatus]);

  const toggle = <T extends string>(list: T[], value: T, setter: (next: T[]) => void) => {
    setter(list.includes(value) ? list.filter((v) => v !== value) : [...list, value]);
  };

  const hasActiveFilters =
    selectedCategories.length > 0 || selectedSeverity.length > 0 || selectedStatus.length > 0 || search.trim().length > 0;

  const resetFilters = () => {
    setSelectedSeverity([]);
    setSelectedCategories([]);
    setSelectedStatus([]);
    setSearch('');
    setFilterPanelOpen(false);
  };

  const openListing = (listing: Listing) => {
    setSelectedListing(listing);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.set('listing', listing.id);
      return next;
    });
  };

  const closeListing = () => {
    setSelectedListing(null);
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      next.delete('listing');
      return next;
    });
  };

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (listingId) {
      const match = listingsSeed.find((l) => l.id === listingId);
      if (match) {
        setSelectedListing(match);
        setActiveTab('browse');
      }
    }
  }, [searchParams]);

  useEffect(() => {
    if (hash) {
      const target = document.getElementById(hash.replace('#', ''));
      if (target) {
        target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        return;
      }
    }
    window.scrollTo({ top: 0, behavior: 'auto' });
  }, [pathname, hash]);

  return (
    <>
      <div id="marketplace-top" className="space-y-6">
        <section className="overflow-hidden rounded-none border border-border/60 shadow-sm bg-slate-950 text-white">
          <div
            className="relative px-6 md:px-12 lg:px-24 py-16 md:py-20"
            style={{
              backgroundImage:
                'linear-gradient(rgba(15,23,42,0.9), rgba(15,23,42,0.9)), repeating-linear-gradient(0deg, transparent, transparent 22px, rgba(148,163,184,0.08) 22px, rgba(148,163,184,0.08) 23px), repeating-linear-gradient(90deg, transparent, transparent 22px, rgba(148,163,184,0.08) 22px, rgba(148,163,184,0.08) 23px)',
              backgroundSize: '100% 100%, 100% 24px, 24px 100%',
            }}
          >
            <div className="max-w-6xl mx-auto space-y-8">
              <div className="space-y-3 text-center">
                <span className="inline-flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.28em] text-slate-200">
                  <span className="h-[1px] w-6 bg-slate-300/60" />
                  Community Powered Fixes
                  <span className="h-[1px] w-6 bg-slate-300/60" />
                </span>
                <h1 className="text-4xl md:text-5xl font-black tracking-tight leading-tight">
                  Find bugs. Fix them. Get paid.
                </h1>
                <p className="text-lg text-slate-200/90 max-w-3xl mx-auto">
                  The open marketplace for verified fixes. Browse issues from top repos, ship patches, and earn rewards.
                </p>
              </div>

              <div className="max-w-3xl mx-auto flex flex-col sm:flex-row gap-3 items-center justify-center">
                <Button className="h-12 px-6 bg-white text-slate-900 hover:bg-slate-100" onClick={() => setFilterPanelOpen(true)}>
                  Browse live issues
                </Button>
                <Button
                  variant="outline"
                  className="h-12 px-6 border-slate-200 text-white hover:bg-white/10"
                  onClick={() => setActiveTab('my')}
                >
                  View my submissions
                </Button>
              </div>
              <div className="max-w-3xl mx-auto flex flex-wrap justify-center gap-2 text-xs text-slate-200/90">
                {['#frontend', '#hydration', '#perf', '#security'].map((tag) => (
                  <span key={tag} className="px-3 py-1 rounded-full border border-slate-700/60 bg-white/5">
                    {tag}
                  </span>
                ))}
              </div>

              <div className="flex flex-wrap gap-6 justify-center text-sm text-slate-200/90">
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-emerald-400" />
                  1,200+ Repos
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-blue-400" />
                  5k+ Developers
                </div>
                <div className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-amber-300" />
                  Avg. fix time 4h
                </div>
              </div>
            </div>
          </div>
        </section>
      <section className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <p className="text-xs uppercase text-muted-foreground">Marketplace</p>
            <h1 className="text-2xl font-bold">Bugs, runs, and scan findings</h1>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" onClick={handleRefresh} disabled={loading}>
              {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span className={loading ? 'ml-2' : ''}>Refresh</span>
            </Button>
          </div>
        </div>

        <div className="bg-card p-4 rounded-lg border border-border shadow-sm space-y-3">
          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
                type="search"
                placeholder="Search listings..."
                className="pl-9"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
                onFocus={() => setFilterPanelOpen(true)}
              />
            </div>
            <div className="flex flex-wrap items-center gap-3">
              <Button size="sm" variant="outline" onClick={resetFilters}>
                Reset filters
              </Button>
              <Button size="sm" variant="ghost" onClick={() => setFilterPanelOpen((v) => !v)}>
                {filterPanelOpen ? 'Hide filters' : 'Show filters'}
              </Button>
            </div>
          </div>

          {(filterPanelOpen || hasActiveFilters) && (
            <div className="grid gap-3 md:grid-cols-3">
              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Category</span>
                  <span className="text-xs text-muted-foreground">Multi-select</span>
        </div>
                <div className="flex flex-wrap gap-2 mt-2">
            {categories.map((cat) => (
              <button
                key={cat}
                onClick={() => toggle(selectedCategories, cat, setSelectedCategories)}
                className={`px-3 py-1 rounded-full border text-sm transition ${
                  selectedCategories.includes(cat)
                    ? 'bg-black text-white border-black'
                    : 'bg-white text-foreground border-border hover:bg-muted dark:bg-slate-900 dark:text-foreground dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Severity</span>
                  <span className="text-xs text-muted-foreground">Multi-select</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
            {(['critical', 'high', 'medium', 'low'] as Severity[]).map((sev) => (
              <button
                key={sev}
                onClick={() => toggle(selectedSeverity, sev, setSelectedSeverity)}
                className={`px-3 py-1 rounded-full border text-sm capitalize transition ${
                  selectedSeverity.includes(sev)
                    ? `${badgeBySeverity[sev]} border-transparent`
                    : 'bg-white text-foreground border-border hover:bg-muted dark:bg-slate-900 dark:text-foreground dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                {sev}
              </button>
            ))}
          </div>
        </div>

              <div className="rounded-lg border bg-muted/40 p-3">
                <div className="flex items-center justify-between text-sm font-semibold">
                  <span>Status</span>
                  <span className="text-xs text-muted-foreground">Tap to toggle</span>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
            {(['open', 'assigned', 'fixed'] as ListingStatus[]).map((status) => (
              <button
                key={status}
                onClick={() => toggle(selectedStatus, status, setSelectedStatus)}
                className={`px-3 py-1 rounded-full border text-sm capitalize transition ${
                  selectedStatus.includes(status)
                    ? `${badgeByStatus[status]} border-transparent`
                    : 'bg-white text-foreground border-border hover:bg-muted dark:bg-slate-900 dark:text-foreground dark:border-slate-800 dark:hover:bg-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>
          </div>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setActiveTab('browse')}
            className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 ${activeTab === 'browse' ? 'bg-black text-white border-black' : 'bg-muted text-foreground border-border dark:bg-slate-900 dark:border-slate-800'}`}
          >
            <ClipboardList size={14} /> Browse
          </button>
          <button
            onClick={() => setActiveTab('my')}
            className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 ${activeTab === 'my' ? 'bg-black text-white border-black' : 'bg-muted text-foreground border-border dark:bg-slate-900 dark:border-slate-800'}`}
          >
            <GitBranch size={14} /> My listings
          </button>
          <button
            onClick={() => setActiveTab('messages')}
            className={`px-3 py-1.5 rounded-full border text-sm flex items-center gap-2 ${activeTab === 'messages' ? 'bg-black text-white border-black' : 'bg-muted text-foreground border-border dark:bg-slate-900 dark:border-slate-800'}`}
          >
            <Inbox size={14} /> Messages
          </button>
        </div>

        {activeTab === 'browse' && (
          <>
            <div className="flex flex-wrap gap-2">
              {['Backend', 'Frontend', 'Tooling', 'Data'].map((chip) => (
                <button
                  key={chip}
                  onClick={() => toggle(selectedCategories, chip, setSelectedCategories)}
                  className={`px-3 py-1 rounded-full border text-sm transition ${
                    selectedCategories.includes(chip)
                      ? 'bg-black text-white border-black'
                      : 'bg-white text-foreground border-border hover:bg-muted dark:bg-slate-900 dark:text-foreground dark:border-slate-800 dark:hover:bg-slate-800'
                  }`}
                >
                  {chip}
                </button>
              ))}
            </div>

            <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {filteredListings.map((listing) => (
                <div key={listing.id} className="rounded-xl border bg-card p-4 shadow-sm hover:shadow-md transition cursor-pointer" onClick={() => openListing(listing)}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <GitBranch size={14} /> {listing.branch}
                    </div>
                    <span className={`${badgeBase} ${badgeBySeverity[listing.severity]}`}>
                      {listing.severity}
                    </span>
                  </div>
                  <h3 className="mt-2 text-lg font-semibold leading-tight">{listing.title}</h3>
                  <p className="text-sm text-muted-foreground">{listing.repo}</p>
                  <p className="text-sm text-muted-foreground mt-2 line-clamp-3">{listing.summary}</p>
                  <div className="flex flex-wrap gap-2 mt-3">
                    {listing.tags.map((tag) => (
                      <span key={tag} className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground flex items-center gap-1">
                        <Tag size={12} /> {tag}
                      </span>
                    ))}
                  </div>
                  <div className="mt-3 flex items-center justify-between text-xs text-muted-foreground">
                    <span className={`${badgeBase} capitalize ${badgeByStatus[listing.status]}`}>{listing.status}</span>
                    <span className="flex items-center gap-1"><Clock3 size={12} /> {listing.createdAt}</span>
                  </div>
                  <ListingActions listing={listing} onOpen={openListing} className="mt-4" />
                </div>
              ))}
              {filteredListings.length === 0 && (
                <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                  No listings match your filters yet.
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'my' && (
          <div className="grid sm:grid-cols-2 xl:grid-cols-3 gap-4">
            {myListings.map((listing) => (
              <div key={listing.id} className="rounded-xl border bg-card p-4 shadow-sm space-y-2">
                <div className="flex items-center justify-between text-xs text-muted-foreground">
                  <div className="flex items-center gap-2"><GitBranch size={14} /> {listing.branch}</div>
                  <span className={`${badgeBase} ${badgeBySeverity[listing.severity]}`}>{listing.severity}</span>
                </div>
                <h3 className="text-lg font-semibold">{listing.title}</h3>
                <p className="text-sm text-muted-foreground">{listing.summary}</p>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline">View responses</Button>
                  <Button size="sm" variant="ghost">Edit</Button>
                </div>
              </div>
            ))}
            {myListings.length === 0 && (
              <div className="col-span-full rounded-xl border border-dashed p-6 text-center text-muted-foreground">
                No listings yet. Submit from Findings or here.
              </div>
            )}
          </div>
        )}

        {activeTab === 'messages' && (
          <div className="grid gap-3">
            {messages.map((m) => (
              <div key={m.id} className="rounded-lg border bg-card p-3 flex items-center justify-between">
                <div>
                  <div className="text-sm font-semibold flex items-center gap-2"><MessageCircle size={14} /> {m.from}</div>
                  <div className="text-xs text-muted-foreground">On listing {m.listing}: {m.preview}</div>
                </div>
                <div className="flex items-center gap-3 text-xs text-muted-foreground">
                  <span>{m.time}</span>
                  <Button size="sm" variant="outline">Reply</Button>
                </div>
              </div>
            ))}
            {messages.length === 0 && (
              <div className="rounded-lg border border-dashed p-6 text-center text-muted-foreground">
                No messages yet.
              </div>
            )}
          </div>
        )}
      </section>
      </div>

      {selectedListing && (
        <div className="fixed inset-0 w-screen h-screen z-50 m-0 p-0 !mt-0 !pt-0 bg-black/40 backdrop-blur-sm flex items-stretch justify-end">
          <div className="bg-white dark:bg-slate-900 w-full max-w-xl h-full overflow-y-auto shadow-2xl p-6 border-l border-border relative animate-in slide-in-from-right duration-200">
            <button className="absolute right-4 top-4 text-muted-foreground hover:text-foreground" onClick={closeListing}>
              <X size={18} />
            </button>
            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <GitBranch size={14} /> {selectedListing.branch}
              <span className={`${badgeBase} capitalize ml-auto ${badgeBySeverity[selectedListing.severity]}`}>
                {selectedListing.severity}
              </span>
            </div>
            <h2 className="text-2xl font-bold mt-3">{selectedListing.title}</h2>
            <p className="text-sm text-muted-foreground">{selectedListing.repo}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className={`${badgeBase} capitalize ${badgeByStatus[selectedListing.status]}`}>
                {selectedListing.status}
              </span>
              {selectedListing.cronRef && (
                <span className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground">
                  Cron: {selectedListing.cronRef}
                </span>
              )}
            </div>

            <div className="mt-4 space-y-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground">
                <Link2 size={14} /> Logs
                {selectedListing.logsUrl ? (
                  <a className="underline text-primary" href={selectedListing.logsUrl} target="_blank" rel="noreferrer">
                    {selectedListing.logsUrl}
                  </a>
                ) : (
                  <span>Not attached</span>
                )}
              </div>
              <p className="leading-relaxed">{selectedListing.summary}</p>
            </div>

            <div className="mt-4 space-y-1">
              <p className="text-xs uppercase text-muted-foreground">Tags</p>
              <div className="flex flex-wrap gap-2">
                {selectedListing.tags.map((tag) => (
                  <span key={tag} className="text-[11px] px-2 py-1 rounded-full border bg-muted text-muted-foreground">
                    #{tag}
                  </span>
                ))}
              </div>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-2 text-sm">
              <div className="flex items-center gap-2 text-muted-foreground"><ShieldAlert size={14} /> Severity: <span className="font-semibold capitalize">{selectedListing.severity}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><Clock3 size={14} /> Opened: <span className="font-semibold">{selectedListing.createdAt}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><CheckCircle2 size={14} /> Status: <span className="font-semibold capitalize">{selectedListing.status}</span></div>
              <div className="flex items-center gap-2 text-muted-foreground"><LogOut size={14} /> Owner: <span className="font-semibold">{selectedListing.author || 'Unknown'}</span></div>
            </div>

            <div className="mt-6 flex flex-wrap gap-2">
              <Button size="sm" className="min-w-[120px] bg-slate-900 text-white hover:bg-slate-800">
                Fix it
              </Button>
              <Button
                size="sm"
                variant="outline"
                className="min-w-[120px]"
                onClick={() => selectedListing.logsUrl && window.open(selectedListing.logsUrl, '_blank')}
              >
                <Link2 size={14} className="mr-1.5" />
                View logs
              </Button>
              <Button
                asChild
                size="sm"
                variant="outline"
                className="min-w-[120px] border-dashed text-muted-foreground hover:text-foreground"
              >
                <Link
                  to={`/dashboard/messages?listing=${selectedListing.id}&owner=${selectedListing.author || 'Owner'}&share=bug`}
                  className="inline-flex items-center gap-1.5 whitespace-nowrap"
                >
                  Message
                </Link>
              </Button>
              <Button
                asChild
                size="sm"
                variant="ghost"
                className="min-w-[160px] border border-dashed border-border text-muted-foreground hover:border-foreground/60 hover:text-foreground"
              >
                <Link to={`/dashboard/messages?listing=${selectedListing.id}&owner=${selectedListing.author || 'Owner'}&share=bug`}>
                  Send bug card to chat
                </Link>
              </Button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default MarketplacePage;

