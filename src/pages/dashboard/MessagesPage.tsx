import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Link, useSearchParams } from 'react-router-dom';
import { Bookmark, Clock3, GitBranch, Inbox, Link2, MessageCircle, SendHorizonal, Sparkles, Tag } from 'lucide-react';

type Severity = 'critical' | 'high' | 'medium' | 'low';
type Status = 'open' | 'assigned' | 'fixed';

type ChatMessage = {
  id: string;
  from: 'you' | string;
  body: string;
  time: string;
  type: 'text' | 'bug_card';
  bugCard?: {
    listingId: string;
    title: string;
    severity: Severity;
    status: Status;
    owner: string;
  };
};

type Conversation = {
  id: string;
  listingId: string;
  title: string;
  owner: string;
  severity: Severity;
  status: Status;
  lastActivity: string;
  bookmarked: boolean;
  messages: ChatMessage[];
};

const badgeBySeverity: Record<Severity, string> = {
  critical: 'bg-red-100 text-red-700 border-red-200 dark:bg-red-900/50 dark:text-red-100 dark:border-red-800/70',
  high: 'bg-orange-100 text-orange-700 border-orange-200 dark:bg-orange-900/50 dark:text-orange-100 dark:border-orange-800/70',
  medium: 'bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-900/50 dark:text-amber-100 dark:border-amber-800/70',
  low: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/70',
};

const badgeByStatus: Record<Status, string> = {
  open: 'bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-900/50 dark:text-blue-100 dark:border-blue-800/70',
  assigned: 'bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-900/50 dark:text-purple-100 dark:border-purple-800/70',
  fixed: 'bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-900/40 dark:text-emerald-100 dark:border-emerald-800/70',
};

const seedThreads: Conversation[] = [
  {
    id: 'conv-1051',
    listingId: 'L-1051',
    title: 'API latency regression on search endpoint',
    owner: 'SRE',
    severity: 'critical',
    status: 'open',
    lastActivity: '5m ago',
    bookmarked: true,
    messages: [
      { id: 'm-1', from: 'SRE', body: 'Can you share p95 graphs and plan of attack?', time: '5m ago', type: 'text' },
      { id: 'm-2', from: 'you', body: 'Attached flamegraph, suspect new index. Looping in search team.', time: '2m ago', type: 'text' },
    ],
  },
  {
    id: 'conv-1048',
    listingId: 'L-1048',
    title: 'Cron-based index job failing on secrets fetch',
    owner: 'DevOps',
    severity: 'high',
    status: 'open',
    lastActivity: '32m ago',
    bookmarked: true,
    messages: [
      { id: 'm-3', from: 'DevOps', body: 'Is vault refresh wired in the runner?', time: '32m ago', type: 'text' },
      { id: 'm-4', from: 'you', body: 'Sending bug card to chat with current repro.', time: '30m ago', type: 'bug_card', bugCard: { listingId: 'L-1048', title: 'Cron-based index job failing on secrets fetch', severity: 'high', status: 'open', owner: 'DevOps' } },
    ],
  },
  {
    id: 'conv-1050',
    listingId: 'L-1050',
    title: 'CI flaky e2e for repo linking',
    owner: 'qa-team',
    severity: 'medium',
    status: 'assigned',
    lastActivity: '1h ago',
    bookmarked: false,
    messages: [
      { id: 'm-5', from: 'qa-team', body: 'Can pair later today?', time: '1h ago', type: 'text' },
    ],
  },
];

const MessagesPage = () => {
  const [threads, setThreads] = useState<Conversation[]>(seedThreads);
  const [selectedId, setSelectedId] = useState<string | null>(seedThreads[0]?.id ?? null);
  const [draft, setDraft] = useState('');
  const [shareBugCard, setShareBugCard] = useState(false);
  const [searchParams] = useSearchParams();

  const selectedThread = useMemo(
    () => threads.find((t) => t.id === selectedId) || null,
    [selectedId, threads]
  );

  useEffect(() => {
    const listingId = searchParams.get('listing');
    if (!listingId) return;
    const owner = searchParams.get('owner') ?? 'Owner';
    const share = searchParams.get('share') === 'bug';
    let nextSelected: string | null = null;

    setThreads((prev) => {
      const existing = prev.find((t) => t.listingId === listingId);
      if (existing) {
        nextSelected = existing.id;
        return prev;
      }
      const newThread: Conversation = {
        id: `conv-${listingId}`,
        listingId,
        title: searchParams.get('title') || 'Shared from marketplace',
        owner,
        severity: 'high',
        status: 'open',
        lastActivity: 'just now',
        bookmarked: true,
        messages: [
          {
            id: `m-${listingId}-intro`,
            from: owner,
            body: 'Context shared from marketplace/bookmarks.',
            time: 'just now',
            type: 'text',
          },
        ],
      };
      nextSelected = newThread.id;
      return [newThread, ...prev];
    });

    if (nextSelected) {
      setSelectedId(nextSelected);
    }
    if (share) {
      setShareBugCard(true);
    }
  }, [searchParams]);

  const sendMessage = () => {
    if (!selectedThread) return;
    const messageText = draft.trim();
    if (!messageText && !shareBugCard) return;

    const newMessage: ChatMessage = {
      id: `local-${Date.now()}`,
      from: 'you',
      body: messageText || 'Shared bug card',
      time: 'now',
      type: shareBugCard ? 'bug_card' : 'text',
      bugCard: shareBugCard
        ? {
            listingId: selectedThread.listingId,
            title: selectedThread.title,
            severity: selectedThread.severity,
            status: selectedThread.status,
            owner: selectedThread.owner,
          }
        : undefined,
    };

    setThreads((prev) =>
      prev.map((thread) =>
        thread.id === selectedThread.id
          ? {
              ...thread,
              lastActivity: 'now',
              messages: [...thread.messages, newMessage],
            }
          : thread
      )
    );
    setDraft('');
    setShareBugCard(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-xs uppercase text-muted-foreground">Inbox</p>
          <h1 className="text-2xl font-bold">Messages</h1>
          <p className="text-sm text-muted-foreground">Keep marketplace owners in the loop and push bug cards into chats.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link to="/dashboard/marketplace">
            <Button variant="outline" size="sm" className="gap-1">
              <Link2 size={14} /> Marketplace
            </Button>
          </Link>
          <Link to="/dashboard/profile">
            <Button variant="outline" size="sm" className="gap-1">
              <Bookmark size={14} /> View bookmarks
            </Button>
          </Link>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[320px,1fr]">
        <div className="rounded-lg border bg-card p-4 shadow-sm space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-sm font-semibold">
              <Inbox size={14} /> Conversations
            </div>
            <span className="text-xs text-muted-foreground">{threads.length} open</span>
          </div>

          <div className="space-y-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                onClick={() => setSelectedId(thread.id)}
                className={`w-full text-left rounded-lg border p-3 transition ${
                  thread.id === selectedId ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/30' : 'border-border hover:bg-muted'
                }`}
              >
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch size={12} /> {thread.listingId}
                  {thread.bookmarked && (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-muted">
                      <Bookmark size={11} /> saved
                    </span>
                  )}
                  <span className="ml-auto">{thread.lastActivity}</span>
                </div>
                <div className="mt-1 font-semibold text-sm line-clamp-2">{thread.title}</div>
                <div className="mt-2 flex items-center gap-2 text-[11px] text-muted-foreground">
                  <span className={`px-2 py-1 rounded-full border capitalize ${badgeBySeverity[thread.severity]}`}>{thread.severity}</span>
                  <span className={`px-2 py-1 rounded-full border capitalize ${badgeByStatus[thread.status]}`}>{thread.status}</span>
                  <span className="inline-flex items-center gap-1"><MessageCircle size={11} /> {thread.messages.length}</span>
                </div>
              </button>
            ))}
            {threads.length === 0 && (
              <div className="rounded-lg border border-dashed p-4 text-center text-muted-foreground text-sm">
                No conversations yet. Start from Marketplace or Bookmarks.
              </div>
            )}
          </div>
        </div>

        <div className="rounded-lg border bg-card p-4 shadow-sm flex flex-col gap-4">
          {selectedThread ? (
            <>
              <div className="flex flex-col gap-1 border-b border-border pb-3">
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <GitBranch size={12} /> {selectedThread.listingId}
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-muted text-[11px] capitalize">
                    {selectedThread.status}
                  </span>
                  <span className={`inline-flex items-center gap-1 px-2 py-1 rounded-full border text-[11px] capitalize ${badgeBySeverity[selectedThread.severity]}`}>
                    {selectedThread.severity}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <h2 className="text-lg font-semibold leading-tight flex-1">{selectedThread.title}</h2>
                </div>
                <p className="text-xs text-muted-foreground">Owner: {selectedThread.owner}</p>
              </div>

              <div className="flex-1 space-y-3 overflow-y-auto pr-1">
                {selectedThread.messages.map((message) => {
                  const isSelf = message.from === 'you';
                  return (
                    <div key={message.id} className={`flex ${isSelf ? 'justify-end' : 'justify-start'}`}>
                      <div
                        className={`max-w-[75%] rounded-lg border p-3 ${
                          isSelf
                            ? 'bg-blue-50 border-blue-200 text-right'
                            : 'bg-background/70'
                        }`}
                      >
                        <div
                          className={`flex items-center gap-2 text-xs ${
                            isSelf ? 'justify-end text-blue-700' : 'text-muted-foreground'
                          }`}
                        >
                          {!isSelf && <span className="font-semibold text-foreground">{message.from}</span>}
                          <Clock3 size={12} />
                          {message.time}
                          {message.type === 'bug_card' && (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full border bg-muted text-[11px]">
                              <Sparkles size={11} /> bug card
                            </span>
                          )}
                        </div>
                        <p className="mt-1 text-sm leading-relaxed">{message.body}</p>

                        {message.type === 'bug_card' && message.bugCard && (
                          <div className="mt-3 rounded-md border bg-muted/50 p-3 space-y-2 text-xs text-left">
                            <div className="flex items-center gap-2">
                              <Tag size={12} /> Listing {message.bugCard.listingId}
                              <span className={`px-2 py-1 rounded-full border capitalize ${badgeBySeverity[message.bugCard.severity]}`}>
                                {message.bugCard.severity}
                              </span>
                              <span className={`px-2 py-1 rounded-full border capitalize ${badgeByStatus[message.bugCard.status]}`}>
                                {message.bugCard.status}
                              </span>
                            </div>
                            <p className="font-semibold text-foreground">{message.bugCard.title}</p>
                            <p className="text-muted-foreground">Owner: {message.bugCard.owner}</p>
                            <div className="flex gap-2">
                              <Button asChild size="sm" variant="outline">
                                <Link to={`/dashboard/marketplace?listing=${message.bugCard.listingId}`}>View in marketplace</Link>
                              </Button>
                              <Button asChild size="sm" variant="ghost">
                                <Link to={`/dashboard/profile`}>Open bookmark</Link>
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="space-y-2 border-t border-border pt-3">
                <label className="text-xs font-semibold text-muted-foreground">Send a message</label>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  rows={3}
                  className="w-full rounded-md border border-input bg-background p-3 text-sm outline-none focus:ring-1 focus:ring-ring"
                  placeholder="Update owner or add context..."
                />
                <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                  <div className="flex flex-wrap items-center gap-2">
                    <label className="inline-flex items-center gap-2 cursor-pointer">
                      <input
                        type="checkbox"
                        className="accent-primary h-3.5 w-3.5"
                        checked={shareBugCard}
                        onChange={(e) => setShareBugCard(e.target.checked)}
                      />
                      Share bug card with this message
                    </label>
                    <span className="text-muted-foreground/50">Adds listing context to chat</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button size="sm" className="bg-slate-900 text-white hover:bg-slate-800" onClick={sendMessage}>
                      <SendHorizonal className="h-4 w-4 mr-1" /> Send
                    </Button>
                    <Button size="sm" variant="outline" className="border-dashed" onClick={() => { setDraft(''); setShareBugCard(false); }}>
                      Clear
                    </Button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-2">
              <MessageCircle className="h-6 w-6" />
              <p className="text-sm">Select a conversation or open from the Marketplace.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default MessagesPage;

