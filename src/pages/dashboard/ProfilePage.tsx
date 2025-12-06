import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Link } from 'react-router-dom';
import { Mail, UserCircle2, ShieldCheck, BellRing, ArrowRight, Bookmark, MessageCircle, Link2, Loader2, Camera, Pencil, X as XIcon, Save } from 'lucide-react';
import { getProfile, updateProfile, uploadAvatar, Profile, supabase } from '@/lib/supabase';

const ProfilePage = () => {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [authEmail, setAuthEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [isEditing, setIsEditing] = useState(false);

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

  useEffect(() => {
    loadProfile();
  }, []);

  const loadProfile = async () => {
    setLoading(true);
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setAuthEmail(user.email || '');
      }
      const p = await getProfile();
      if (p) {
        setProfile(p);
        setFullName(p.full_name || '');
      } else if (user) {
          // If no profile row but user exists (should trigger, but fallback)
          setFullName(user.user_metadata?.full_name || '');
      }
    } catch (e) {
      console.error('Failed to load profile', e);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: fullName });
      // Reload to confirm
      const p = await getProfile();
      if (p) setProfile(p);
      setIsEditing(false);
    } catch (e) {
      console.error('Failed to save profile', e);
    } finally {
      setSaving(false);
    }
  };

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return;
    setUploading(true);
    setUploadError(null);
    try {
      const file = e.target.files[0];
      const url = await uploadAvatar(file);
      await updateProfile({ avatar_url: url });
      const p = await getProfile();
      if (p) setProfile(p);
    } catch (e: any) {
      console.error('Avatar upload failed', e);
      setUploadError(
        e?.message ||
          'Failed to upload avatar. Ensure the "avatars" bucket exists, storage policies allow authenticated uploads, and CORS is allowed for this origin.'
      );
    } finally {
      setUploading(false);
    }
  };

  if (loading) {
    return <div className="flex items-center justify-center h-96"><Loader2 className="animate-spin text-muted-foreground" /></div>;
  }

  return (
    <div className="space-y-8">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Profile</h2>
          <p className="text-muted-foreground">Workspace identity and AI integrations.</p>
        </div>
        <div className="flex items-center gap-2">
          {!isEditing ? (
            <Button size="sm" variant="outline" onClick={() => setIsEditing(true)}>
              <Pencil className="h-4 w-4 mr-1" /> Edit
            </Button>
          ) : (
            <>
              <Button size="sm" variant="outline" onClick={() => { setFullName(profile?.full_name || ''); setIsEditing(false); }}>
                <XIcon className="h-4 w-4 mr-1" /> Cancel
              </Button>
              <Button size="sm" onClick={handleSave} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-1 animate-spin" /> : <Save className="h-4 w-4 mr-1" />} Save
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-6">
          <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
              <UserCircle2 className="text-primary h-6 w-6" />
            <div>
              <h3 className="text-lg font-semibold">Workspace</h3>
              <p className="text-sm text-muted-foreground">Update your display info.</p>
            </div>
          </div>
          </div>

          <div className="flex items-center gap-6">
             <div className="relative group">
                <div className="h-20 w-20 rounded-full bg-muted overflow-hidden border-2 border-border flex items-center justify-center relative">
                    {profile?.avatar_url ? (
                        <img src={profile.avatar_url} alt="Avatar" className="h-full w-full object-cover" />
                    ) : (
                        <UserCircle2 className="h-12 w-12 text-muted-foreground" />
                    )}
                    {uploading && (
                        <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                            <Loader2 className="h-6 w-6 animate-spin text-white" />
                        </div>
                    )}
                </div>
                <label className="absolute bottom-0 right-0 bg-primary text-primary-foreground rounded-full p-1.5 cursor-pointer shadow-md hover:bg-primary/90 transition">
                    <Camera size={14} />
                    <input type="file" accept="image/*" className="hidden" onChange={handleAvatarUpload} disabled={uploading} />
                </label>
             </div>
             <div className="flex-1 space-y-1">
                 <h4 className="font-medium">Profile Photo</h4>
                 <p className="text-xs text-muted-foreground">Click the camera icon to upload a new photo.</p>
                 {uploadError && <p className="text-xs text-red-600">{uploadError}</p>}
             </div>
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Display name</label>
              <Input 
                value={fullName} 
                onChange={(e) => setFullName(e.target.value)} 
                disabled={!isEditing}
                placeholder="Your Name"
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Contact email</label>
              <Input value={authEmail} disabled className="bg-muted/50 text-muted-foreground" />
            </div>
          </div>
          <div className="space-y-2">
            <label className="text-sm font-medium">Notifications</label>
            <Input placeholder="alerts@opsnest.dev" defaultValue={authEmail} disabled />
            <p className="text-xs text-muted-foreground">Where we send reports and billing notices.</p>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-muted-foreground pt-2">
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
              <ShieldCheck size={12} /> MFA recommended
            </span>
            <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted">
              <Mail size={12} /> Email verified
            </span>
             {saving && <span className="text-primary flex items-center gap-1"><Loader2 size={12} className="animate-spin" /> Saving...</span>}
          </div>
        </div>

        <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
          <div className="flex items-center gap-3">
            <BellRing className="text-primary h-6 w-6" />
            <div>
              <h3 className="text-lg font-semibold">Notification preferences</h3>
              <p className="text-sm text-muted-foreground">Where and how we alert you.</p>
            </div>
          </div>
          <div className="grid gap-3">
            <div className="rounded-lg border border-dashed p-4 bg-muted/40 space-y-2">
              <p className="text-sm font-semibold">Primary email</p>
              <p className="text-sm text-muted-foreground">{authEmail || 'No email set'}</p>
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
              <Button asChild size="sm" variant="outline" className="mt-2">
                <a href="/dashboard/integrations" className="flex items-center gap-2 w-fit">
                  Open Integrations <ArrowRight className="h-4 w-4" />
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
            <Bookmark className="text-primary h-6 w-6" />
          <div>
            <h3 className="text-lg font-semibold">Bookmarks</h3>
            <p className="text-sm text-muted-foreground">Saved marketplace findings you’re tracking.</p>
          </div>
          </div>
          <div className="flex items-center gap-2">
             <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/marketplace" className="inline-flex items-center gap-2">
                   <Link2 className="h-4 w-4" /> <span>Go to marketplace</span>
            </Link>
             </Button>
             <Button asChild variant="outline" size="sm">
                <Link to="/dashboard/messages" className="inline-flex items-center gap-2">
                   <MessageCircle className="h-4 w-4" /> <span>Messages</span>
            </Link>
             </Button>
          </div>
        </div>

        <div className="grid gap-3 md:grid-cols-2 pt-2">
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
                  <Link to={`/dashboard/marketplace?listing=${bookmark.id}`} className="inline-flex items-center gap-2">
                    <Link2 className="h-4 w-4" /> <span>Open in marketplace</span>
                  </Link>
                </Button>
                <Button asChild size="sm" variant="secondary">
                  <Link to={`/dashboard/messages?listing=${bookmark.id}&owner=${bookmark.owner}`} className="inline-flex items-center gap-2">
                    <MessageCircle className="h-4 w-4" /> <span>Message owner</span>
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
