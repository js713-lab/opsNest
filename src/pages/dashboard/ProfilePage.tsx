import React, { useMemo } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router-dom';
import { Mail, UserCircle2, ShieldCheck, Sparkles, BellRing, ArrowRight, Bookmark, MessageCircle, Link2 } from 'lucide-react';

const ProfilePage = () => {
  const bookmarks = useMemo(
    () => [
      {
        id: 'L-1051',
        title: 'API latency regression on search endpoint',
        repo: 'opsnest/infra-api',
        severity: 'critical',
        status: 'open',
        summary: 'p95 doubled after new trigram search; needs index tuning and plan review.',
        owner: 'SRE',
      },
      {
        id: 'L-1048',
        title: 'Cron-based index job failing on secrets fetch',
        repo: 'opsnest/infra-api',
        severity: 'high',
        status: 'open',
        summary: 'Nightly index job fails when vault token expires mid-run; need resilient refresh.',
        owner: 'DevOps',
      },
    ],
    []
  );

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">Workspace identity and AI integrations.</p>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Sparkles size={14} /> Changes auto-save when you update fields.
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <UserCircle2 className="text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Workspace</h3>
              <p className="text-sm text-muted-foreground">Update your display info.</p>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input defaultValue="opsNest_" />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact email</label>
              <Input defaultValue="admin@opsnest.dev" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notifications</label>
            <Input placeholder="alerts@opsnest.dev" defaultValue="alerts@opsnest.dev" />
            <p className="text-xs text-muted-foreground">Where we send reports and billing notices.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
              <ShieldCheck size={12} /> MFA recommended
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
              <Mail size={12} /> Email verified
            </span>
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <BellRing className="text-primary" />
            <div>
              <h3 className="text-lg font-semibold">Notification preferences</h3>
              <p className="text-sm text-muted-foreground">Where and how we alert you.</p>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-dashed p-4 bg-muted/40 space-y-2">
              <p className="text-sm font-semibold">Primary email</p>
              <p className="text-sm text-muted-foreground">alerts@opsnest.dev</p>
              <p className="text-xs text-muted-foreground">Delivery for reports, builds, and billing.</p>
            </div>
            <div className="rounded-lg border border-dashed p-4 bg-muted/40 space-y-2">
              <p className="text-sm font-semibold">Signal types</p>
              <ul className="text-sm text-muted-foreground space-y-1 list-disc list-inside">
                <li>Build & deploy summaries</li>
                <li>Test failures and flakiness</li>
                <li>Security or access alerts</li>
              </ul>
            </div>
            <div className="rounded-lg border border-dashed p-4 bg-muted/40 space-y-2">
              <p className="text-sm font-semibold">Change routing</p>
              <p className="text-xs text-muted-foreground">To update notification routing, edit the emails above or configure providers in Integrations.</p>
              <Button asChild size="sm" variant="outline">
                <a href="/dashboard/integrations" className="flex items-center gap-2">
                  Open Integrations <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex items-center gap-3">
          <Bookmark className="text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Bookmarks</h3>
            <p className="text-sm text-muted-foreground">Saved marketplace findings you’re tracking.</p>
          </div>
          <div className="ml-auto flex items-center gap-2 text-xs text-muted-foreground">
            <Link to="/dashboard/marketplace" className="inline-flex items-center gap-1 hover:underline">
              <Link2 size={12} /> Go to marketplace
            </Link>
            <span className="text-muted-foreground/50">•</span>
            <Link to="/dashboard/messages" className="inline-flex items-center gap-1 hover:underline">
              <MessageCircle size={12} /> Messages
            </Link>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2">
          {bookmarks.map((bookmark) => (
            <div key={bookmark.id} className="rounded-lg border bg-background/60 p-4 space-y-3 shadow-sm">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-muted capitalize">
                  {bookmark.severity}
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border bg-muted capitalize">
                  {bookmark.status}
                </span>
              </div>
              <div className="space-y-1">
                <p className="text-[13px] text-muted-foreground">Listing {bookmark.id}</p>
                <h4 className="text-base font-semibold leading-tight">{bookmark.title}</h4>
                <p className="text-sm text-muted-foreground line-clamp-2">{bookmark.summary}</p>
                <p className="text-xs text-muted-foreground flex items-center gap-1">
                  <UserCircle2 size={12} /> Owner: {bookmark.owner}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button asChild size="sm" variant="outline">
                  <Link to={`/dashboard/marketplace?listing=${bookmark.id}`}>
                    <Link2 className="h-4 w-4 mr-1" /> Open in marketplace
                  </Link>
                </Button>
                <Button asChild size="sm" variant="ghost">
                  <Link to={`/dashboard/messages?listing=${bookmark.id}&owner=${bookmark.owner}`}>
                    <MessageCircle className="h-4 w-4 mr-1" /> Message owner
                  </Link>
                </Button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;


