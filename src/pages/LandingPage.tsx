import React, { useEffect, useState, useRef, useCallback } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/Button';
import { Moon, Sun, Workflow, CheckCircle2, Bot, Menu, X } from 'lucide-react';
import { supabase, submitContactForm, submitSubscription } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';
import FaultyTerminal from '@/components/ui/FaultyTerminal';
import { toast } from 'sonner';

const heroPrompts = [
  'with AI copilots baked in',
  'systems that do the work for me',
  'dashboards in minutes',
  'pipelines without babysitting',
];

const LandingPage = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [user, setUser] = useState<User | null>(null);
  const [terminalOk, setTerminalOk] = useState(true);
  const [isDark, setIsDark] = useState(false);
  const [promptIndex, setPromptIndex] = useState(0);
  const [promptVisible, setPromptVisible] = useState(true);
  const [showBackTop, setShowBackTop] = useState(false);
  const [showHeroBg, setShowHeroBg] = useState(true);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [contactForm, setContactForm] = useState({
    name: '',
    email: '',
    company: '',
    message: '',
  });
  const [isContactSubmitting, setIsContactSubmitting] = useState(false);
  const [subscriptionEmail, setSubscriptionEmail] = useState('');
  const [isSubscriptionSubmitting, setIsSubscriptionSubmitting] = useState(false);
  const revealRefs = useRef<HTMLDivElement[]>([]);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);
  const mobileMenuRef = useRef<HTMLDivElement | null>(null);

  const goTo = (path: string) => {
    setProfileMenuOpen(false);
    navigate(path);
  };

  useEffect(() => {
    supabase.auth.getUser().then(({ data: { user } }) => setUser(user));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    let fadeTimeout: number;
    const id = window.setInterval(() => {
      setPromptVisible(false);
      fadeTimeout = window.setTimeout(() => {
        setPromptIndex((prev) => (prev + 1) % heroPrompts.length);
        setPromptVisible(true);
      }, 250);
    }, 2400);
    return () => {
      window.clearInterval(id);
      window.clearTimeout(fadeTimeout);
    };
  }, []);

  // Scroll handlers for back-to-top and reveal animations
  const setRevealRef = useCallback((el: HTMLDivElement | null) => {
    if (el && !revealRefs.current.includes(el)) {
      revealRefs.current.push(el);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setShowBackTop(y > 200);
      // Hide the hero background once the hero is mostly out of view to avoid
      // it showing through lower sections.
      const heroHeight = window.innerHeight * 0.75;
      setShowHeroBg(y < heroHeight);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close profile menu on outside click (use pointerdown to beat React click handlers)
  useEffect(() => {
    if (!profileMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (profileMenuRef.current && !profileMenuRef.current.contains(e.target as Node)) {
        setProfileMenuOpen(false);
      }
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, [profileMenuOpen]);

  // Close mobile menu on outside click / Escape and lock body scroll while open
  useEffect(() => {
    if (!mobileMenuOpen) return;
    const handlePointerDown = (e: MouseEvent) => {
      if (mobileMenuRef.current && !mobileMenuRef.current.contains(e.target as Node)) {
        setMobileMenuOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setMobileMenuOpen(false);
      }
    };
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.body.style.overflow = originalOverflow;
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKey);
    };
  }, [mobileMenuOpen]);

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            entry.target.classList.add('reveal-visible');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.18 }
    );
    revealRefs.current.forEach(el => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  // Support deep links like "/#contact" when arriving from other pages.
  useEffect(() => {
    if (!location.hash) return;
    const id = location.hash.replace('#', '');
    const el = document.getElementById(id);
    if (el) {
      requestAnimationFrame(() => el.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    }
  }, [location.hash]);

  const handleLogout = async () => {
    await supabase.auth.signOut();
    setUser(null);
    navigate('/');
  };

  const toggleTheme = () => {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle('dark', next);
  };

  const handleContactSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (isContactSubmitting) return;

    setIsContactSubmitting(true);
    try {
      await submitContactForm({ ...contactForm, source: 'landing' });
      toast.success('Thanks! We will reach out within one business day.');
      setContactForm({ name: '', email: '', company: '', message: '' });
    } catch (error: any) {
      toast.error(error?.message || 'Failed to send message. Please try again.');
    } finally {
      setIsContactSubmitting(false);
    }
  };

  const handleSubscriptionSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!subscriptionEmail.trim()) {
      toast.error('Please enter an email address.');
      return;
    }

    setIsSubscriptionSubmitting(true);
    try {
      await submitSubscription(subscriptionEmail.trim(), 'landing');
      toast.success('Added to the waitlist.');
      setSubscriptionEmail('');
    } catch (error: any) {
      toast.error(error?.message || 'Could not add your email right now.');
    } finally {
      setIsSubscriptionSubmitting(false);
    }
  };

  return (
    <div className="bg-slate-100 flex flex-col relative overflow-x-hidden transition-colors duration-300 font-mono text-white scroll-smooth pt-20">
      {/* Full Screen Hero Background with FaultyTerminal + Fallback */}
      <div
        className={`fixed inset-0 z-0 pointer-events-none transition-opacity duration-500 ${showHeroBg ? 'opacity-100' : 'opacity-0'}`}
      >
        {terminalOk ? (
          <ErrorBoundary onError={() => setTerminalOk(false)}>
            <div className="w-full h-full">
              <FaultyTerminal 
                scale={1.2}
                gridMul={[2, 1]}
                digitSize={1.5}
                timeScale={0.08}
                pause={false}
                scanlineIntensity={0.18}
                glitchAmount={0.2}
                flickerAmount={0}
                noiseAmp={0.6}
                chromaticAberration={0}
                dither={0}
                curvature={0.1}
                tint="#00ff41"
                mouseReact={true}
                mouseStrength={0.16}
                pageLoadAnimation={false}
                brightness={1.1}
                className="w-full h-full opacity-85"
              />
            </div>
          </ErrorBoundary>
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-slate-950 via-slate-900 to-black opacity-90" />
        )}
        <div className="absolute inset-0 bg-white/15 backdrop-blur-[3px]" />
      </div>

      <header className="fixed inset-x-0 top-0 z-30 w-full px-4 sm:px-6 py-4 flex items-center justify-between border-b border-slate-200/80 bg-white/90 backdrop-blur-sm text-slate-900 shadow-sm">
        <div className="flex items-center gap-2">
          <div className="font-bold text-xl tracking-tighter text-slate-900">opsNest_</div>
        </div>

        <div className="flex items-center gap-3">
          <nav className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-900">
            <button onClick={() => document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-slate-700 transition-colors">[ABOUT]</button>
            <Link to="/marketplace" className="hover:text-slate-700 transition-colors">[MARKETPLACE]</Link>
            <button onClick={() => document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' })} className="hover:text-slate-700 transition-colors">CONTACT</button>
            
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
                      to="/dashboard"
                      role="menuitem"
                      onMouseDown={(e) => e.stopPropagation()}
                      onClick={() => setProfileMenuOpen(false)}
                      className="px-4 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                    >
                      Dashboard
                    </Link>
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
              <button
                className="py-3 text-left hover:text-slate-700"
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                [ABOUT]
              </button>
              <Link
                to="/marketplace"
                className="py-3 hover:text-slate-700"
                onClick={() => setMobileMenuOpen(false)}
              >
                [MARKETPLACE]
              </Link>
              <button
                className="py-3 text-left hover:text-slate-700"
                onClick={() => {
                  setMobileMenuOpen(false);
                  document.getElementById('contact')?.scrollIntoView({ behavior: 'smooth' });
                }}
              >
                CONTACT
              </button>
            </div>
            <div className="grid grid-cols-2 gap-3 pt-2">
              {user ? (
                <>
                  <Button className="w-full" onClick={() => { setMobileMenuOpen(false); navigate('/dashboard'); }}>
                    Dashboard
                  </Button>
                  <Button variant="outline" className="w-full" onClick={handleLogout}>
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

      <main className="relative z-10 flex-1 flex flex-col px-4 text-center pb-64">
        {/* Section 1: Hero */}
        <section
          id="marketplace"
          className="min-h-[calc(100vh-140px)] flex flex-col items-center justify-center py-16 reveal"
          ref={setRevealRef}
        >
          <div className="relative z-10">
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-black tracking-tight mb-12 max-w-4xl text-white">
          Ship software faster <br className="hidden md:block" />
              with <span className="text-white">opsNest_</span>
        </h1>
          </div>

          {/* Hero CTAs */}
          <div className="w-full max-w-2xl relative group mt-6">
          <div className="absolute -inset-0.5 bg-gradient-to-r from-primary to-secondary rounded-lg blur opacity-20 group-hover:opacity-40 transition duration-1000"></div>
            <div className="relative flex flex-col md:flex-row items-center gap-3 bg-black/50 rounded-lg border border-white/30 shadow-sm px-4 py-4">
              <div
                className="flex-1 w-full text-left bg-gradient-to-r from-white/5 via-white/10 to-white/5 border border-white/20 rounded-md px-4 py-3 text-base text-white font-mono tracking-tight shadow-inner"
                aria-live="polite"
              >
                Build{' '}
                <span
                  className={`text-secondary font-semibold transition-opacity duration-500 ease-in-out ${
                    promptVisible ? 'opacity-100' : 'opacity-0'
                  }`}
                >
                  {heroPrompts[promptIndex]}
                </span>
            </div>
              <div className="flex w-full md:w-auto gap-2">
                <Button className="rounded-md flex-1 md:flex-none" onClick={() => navigate(user ? '/dashboard' : '/login')}>
                  Get started
                </Button>
          </div>
        </div>
        </div>
        </section>
      </main>

      {/* Expanded Value Sections - on separate light layer from hero */}
        <div className="relative z-10 w-full text-slate-900 border-t border-slate-200 pb-64 bg-slate-100">
        
        {/* Section 2: Visual SDLC */}
        <section id="about" className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 py-20 border-b border-slate-100 bg-white reveal" ref={setRevealRef}>
          <div className="w-full max-w-6xl grid gap-10 lg:grid-cols-3 items-center text-center lg:text-left">
            <div className="lg:col-span-2 space-y-6 lg:pr-6">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 font-bold">Visual SDLC</p>
              <h2 className="text-4xl md:text-5xl font-bold leading-tight">Plan → Design → Code → Build → Test → Deploy → Monitor</h2>
              <p className="text-slate-600 text-lg leading-relaxed max-w-2xl">
                Keep the full lifecycle in view. OpsNest plots every run, approval, and script so you always know what’s green, what’s blocked, and what shipped.
              </p>
              <div className="grid grid-cols-2 gap-4 text-sm text-slate-700 mt-8">
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">Stage statuses + approvals</div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">Attached scripts per stage</div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">Real-time deploy/test signals</div>
                <div className="rounded-lg border border-slate-200 p-4 bg-slate-50 shadow-sm hover:shadow-md transition-shadow">Monitor health after ship</div>
              </div>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-8 space-y-6 shadow-lg h-fit mx-auto">
              <h3 className="text-xl font-bold">Feature checklist</h3>
              <ul className="space-y-3 text-slate-700 text-sm font-medium">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> GitHub OAuth, repo linking, issues</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Codebase indexing & route detection</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Cron jobs for tests, reviews, scans</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Test → Bug cards → Quote marketplace</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Slack + CodeRabbit + Anthropic hooks</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-primary" /> Auto-generated build/test/deploy scripts</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 3: AI & Automation */}
        <section className="min-h-screen flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 py-20 border-b border-slate-100 bg-slate-50 reveal" ref={setRevealRef}>
          <div className="w-full max-w-6xl grid gap-12 lg:grid-cols-2 h-full items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-xl transition-transform hover:-translate-y-1 duration-300 text-center lg:text-left">
              <div className="h-12 w-12 rounded-full bg-indigo-100 flex items-center justify-center text-indigo-600 mb-4">
                <Bot size={24} />
              </div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 font-bold">AI-in-the-loop</p>
              <h3 className="text-3xl font-bold">Anthropic + CodeRabbit where they matter</h3>
              <p className="text-slate-600 text-base leading-relaxed">
                Use Claude to explain failing logs, generate fixes, and draft missing tests. Pipe indexed summaries to CodeRabbit for PR-style reviews after each index job.
              </p>
              <ul className="text-slate-700 text-sm space-y-3 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Ask AI to summarize errors and propose patches</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> Auto-review after indexing to keep repos clean</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-indigo-500" /> One-click “Fix with AI” from Bug cards</li>
              </ul>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-white p-8 space-y-6 shadow-xl transition-transform hover:-translate-y-1 duration-300 delay-100 text-center lg:text-left">
              <div className="h-12 w-12 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 mb-4">
                <Workflow size={24} />
              </div>
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 font-bold">Automation</p>
              <h3 className="text-3xl font-bold">Cron the boring stuff</h3>
              <p className="text-slate-600 text-base leading-relaxed">
                Schedule indexing, tests, bug scans, and AI reviews with human-readable cron previews. Ship without babysitting pipelines.
              </p>
              <ul className="text-slate-700 text-sm space-y-3 pt-2">
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Re-index repos on a schedule</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Run Playwright + Jest and capture reports</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Auto-create Bug cards from failures</li>
                <li className="flex items-center gap-2"><CheckCircle2 className="w-4 h-4 text-orange-500" /> Notify Slack when tests fail or fixes merge</li>
              </ul>
            </div>
          </div>
        </section>

        {/* Section 4: Benefits */}
        <section className="min-h-[80vh] flex flex-col items-center justify-center px-6 md:px-12 lg:px-24 py-20 bg-slate-100 reveal" ref={setRevealRef}>
          <div className="max-w-4xl mx-auto w-full space-y-12 text-center">
            <div className="space-y-4">
              <p className="text-sm uppercase tracking-[0.25em] text-slate-500 font-bold">Key benefits</p>
              <h2 className="text-4xl font-bold">Why developers choose opsNest</h2>
            </div>
            <div className="grid md:grid-cols-3 gap-6 text-slate-700">
              <div className="rounded-xl border border-slate-200 p-6 bg-white hover:border-slate-400 transition-colors shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3 text-lg">Ship faster</h4>
                <p className="text-sm leading-relaxed">Scaffold projects, link repos, and see pipeline state in one place without juggling 10 tabs.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-6 bg-white hover:border-slate-400 transition-colors shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3 text-lg">Stay stable</h4>
                <p className="text-sm leading-relaxed">Tests flow into Bug cards with repro info, severity, and line hints so you fix things before users complain.</p>
              </div>
              <div className="rounded-xl border border-slate-200 p-6 bg-white hover:border-slate-400 transition-colors shadow-sm">
                <h4 className="font-bold text-slate-900 mb-3 text-lg">Monetize fixes</h4>
                <p className="text-sm leading-relaxed">Publish bugs to a quote marketplace; accept, verify, and pay on resolution. Open source sustainably.</p>
              </div>
            </div>
          </div>
        </section>

      </div>

      <div className="fixed inset-x-0 bottom-0 z-40 pointer-events-none">
        <div className="border-t border-slate-200 bg-black text-white py-3 overflow-hidden pointer-events-auto">
        <div className="flex whitespace-nowrap animate-marquee text-xs font-bold tracking-widest">
          {Array(10).fill("SAY HELLO AT hong@codecrafter.dev // ").map((text, i) => (
            <span key={i} className="mx-4">{text}</span>
          ))}
        </div>
        </div>

        {/* Subscription form */}
        <section className="w-full bg-white/95 text-slate-900 border-t border-slate-200 px-4 sm:px-6 md:px-12 lg:px-24 py-4 shadow-[0_-10px_30px_rgba(0,0,0,0.06)] backdrop-blur pointer-events-auto">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row items-center sm:justify-between gap-3 sm:gap-8">
            <div className="flex items-center gap-2 text-[11px] uppercase tracking-[0.25em] text-slate-500 w-full sm:w-auto justify-start">
              <span className="h-1.5 w-1.5 rounded-full bg-slate-400" />
              Loading status
            </div>
            <form className="flex items-center gap-2 w-full sm:w-auto sm:justify-end" onSubmit={handleSubscriptionSubmit}>
              <div className="flex items-center w-full sm:w-auto sm:min-w-[360px] gap-2 justify-end">
                <input
                  type="email"
                  required
                  placeholder="ENTER EMAIL..."
                  className="h-10 w-full sm:w-80 rounded-none border border-slate-200 bg-slate-50 px-4 text-[11px] uppercase tracking-[0.25em] text-slate-600 placeholder:text-slate-400 focus:outline-none focus:ring-1 focus:ring-slate-400"
                  value={subscriptionEmail}
                  onChange={(e) => setSubscriptionEmail(e.target.value)}
                />
                <Button
                  type="submit"
                  className="h-10 w-10 rounded-none bg-black text-white hover:bg-slate-800 p-0"
                  aria-label="Submit email"
                  disabled={isSubscriptionSubmitting}
                >
                  {isSubscriptionSubmitting ? '...' : '→'}
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>

      <div className="fixed bottom-20 right-6 z-50">
        <button 
          onClick={toggleTheme}
          className="w-12 h-12 rounded-md bg-black/50 border border-white/30 shadow-lg flex items-center justify-center hover:bg-white/10 transition-all text-white"
        >
          {isDark ? <Sun size={20} /> : <Moon size={20} />}
        </button>
      </div>
      {showBackTop && (
        <button
          aria-label="Back to top"
          onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
          className="fixed bottom-36 right-6 z-50 h-12 w-12 rounded-md bg-white/90 text-slate-900 border border-slate-200 shadow-lg hover:bg-white"
        >
          ↑
        </button>
      )}

      {/* Contact Section */}
      <section id="contact" className="relative z-10 w-full bg-slate-900 text-white border-t border-slate-800 px-6 md:px-12 lg:px-24 pt-20 pb-36 lg:pt-28 lg:pb-44 min-h-screen flex items-center">
        <div className="max-w-5xl mx-auto grid gap-10 lg:grid-cols-2 items-start w-full">
          <div className="space-y-4">
            <p className="text-sm uppercase tracking-[0.25em] text-slate-300">Contact</p>
            <h3 className="text-3xl font-bold">Talk to us</h3>
            <p className="text-slate-200">
              Tell us about your project or request a live walkthrough of opsNest. We respond within one business day.
            </p>
            <ul className="text-sm text-slate-200 space-y-2">
              <li>• Roadmapping & onboarding</li>
              <li>• GitHub/Slack/CodeRabbit/Anthropic setup</li>
              <li>• Pipelines, tests, and SDLC visualizations</li>
            </ul>
            <div className="pt-2">
              <Button
                className="bg-white text-slate-900 hover:bg-slate-100 rounded-md"
                onClick={() => document.getElementById('contact-form')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Contact us
              </Button>
            </div>
          </div>
          <form
            id="contact-form"
            className="space-y-4 bg-slate-800/60 border border-slate-700 rounded-2xl p-6 shadow-lg w-full"
            onSubmit={handleContactSubmit}
          >
            <div className="grid md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Name</label>
                <input
                  required
                  type="text"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="Jane Doe"
                  value={contactForm.name}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, name: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-200">Email</label>
                <input
                  required
                  type="email"
                  className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60"
                  placeholder="you@example.com"
                  value={contactForm.email}
                  onChange={(e) => setContactForm((prev) => ({ ...prev, email: e.target.value }))}
                />
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Company</label>
              <input
                type="text"
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="Acme Inc."
                value={contactForm.company}
                onChange={(e) => setContactForm((prev) => ({ ...prev, company: e.target.value }))}
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-200">Message</label>
              <textarea
                required
                rows={4}
                className="w-full rounded-lg border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-primary/60"
                placeholder="What would you like to achieve?"
                value={contactForm.message}
                onChange={(e) => setContactForm((prev) => ({ ...prev, message: e.target.value }))}
              />
            </div>
            <Button
              type="submit"
              className="w-full bg-white text-slate-900 hover:bg-slate-100"
              disabled={isContactSubmitting}
            >
              {isContactSubmitting ? 'Sending...' : 'Submit'}
            </Button>
          </form>
        </div>
      </section>
    </div>
  );
};

export default LandingPage;

class ErrorBoundary extends React.Component<{ children: React.ReactNode; onError?: () => void }, { hasError: boolean }> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch() {
    if (this.props.onError) this.props.onError();
  }
  render() {
    if (this.state.hasError) return null;
    return this.props.children;
  }
}
