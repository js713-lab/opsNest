import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Puzzle, 
  UserCircle2,
  MessageCircle,
  Menu,
  X,
  Bell,
  Search,
  Moon,
  Sun,
  Code2,
  BarChart,
  PanelLeftClose,
  PanelLeftOpen,
  LogOut,
  Store,
  BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { cn } from '@/lib/utils';
import { supabase } from '@/lib/supabase';

const sidebarItems = [
  { icon: LayoutDashboard, label: 'Overview', path: '/dashboard' },
  { icon: FolderGit2, label: 'Projects', path: '/dashboard/projects' },
  { icon: BookOpen, label: 'Repositories', path: '/dashboard/repositories' },
  { icon: Store, label: 'Marketplace', path: '/dashboard/marketplace' },
  { icon: MessageCircle, label: 'Messages', path: '/dashboard/messages' },
  { icon: Puzzle, label: 'Integrations', path: '/dashboard/integrations' },
  { icon: BarChart, label: 'Reports', path: '/dashboard/reports' },
  { icon: UserCircle2, label: 'Profile', path: '/dashboard/profile' },
];

const DashboardLayout = () => {
  const navigate = useNavigate();
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isDark, setIsDark] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [hoveredItem, setHoveredItem] = useState<{ label: string, top: number } | null>(null);
  const [profilePopoverOpen, setProfilePopoverOpen] = useState(false);
  const [profilePopoverPos, setProfilePopoverPos] = useState<{ top: number; left: number } | null>(null);
  const location = useLocation();
  const searchInputRef = useRef<HTMLInputElement>(null);
  const profileAnchorRef = useRef<HTMLDivElement | null>(null);
  const profileHoverTimeout = useRef<number | null>(null);
  const notificationsRef = useRef<HTMLDivElement | null>(null);
  const profileMenuRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (document.documentElement.classList.contains('dark')) {
      setIsDark(true);
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      // Check if we are pressing '/' and not typing in an input
      if (e.key === '/' && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        // Use a small timeout to ensure the ref is available and UI is ready
        setTimeout(() => {
          searchInputRef.current?.focus();
        }, 0);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  const toggleTheme = () => {
    const newDark = !isDark;
    setIsDark(newDark);
    if (newDark) {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    navigate('/login');
  };

  const setProfileHover = (open: boolean) => {
    if (!isCollapsed) return;

    if (profileHoverTimeout.current) {
      window.clearTimeout(profileHoverTimeout.current);
      profileHoverTimeout.current = null;
    }

    if (open) {
      const rect = profileAnchorRef.current?.getBoundingClientRect();
      if (rect) {
        const popoverHeight = 120;
        const viewportHeight = window.innerHeight;
        const idealTop = rect.top + (rect.height / 2) - (popoverHeight / 2);
        const clampedTop = Math.max(12, Math.min(idealTop, viewportHeight - popoverHeight - 12));

        setProfilePopoverPos({
          top: clampedTop,
          left: rect.right + 12
        });
      }
      setProfilePopoverOpen(true);
    } else {
      profileHoverTimeout.current = window.setTimeout(() => setProfilePopoverOpen(false), 140);
    }
  };

  useEffect(() => {
    return () => {
      if (profileHoverTimeout.current) {
        window.clearTimeout(profileHoverTimeout.current);
      }
    };
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (!showNotifications) return;
      const target = e.target as Node;
      if (notificationsRef.current && !notificationsRef.current.contains(target)) {
        setShowNotifications(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showNotifications]);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      const target = e.target as Node;
      if (profileMenuRef.current && !profileMenuRef.current.contains(target)) {
        setShowProfileMenu(false);
      }
    };
    document.addEventListener('pointerdown', handleClickOutside);
    return () => document.removeEventListener('pointerdown', handleClickOutside);
  }, []);

  const currentSection =
    sidebarItems.find((item) =>
      item.path === '/dashboard'
        ? location.pathname === item.path
        : location.pathname.startsWith(item.path)
    )?.label || 'Overview';

  return (
    <div className="min-h-screen bg-background font-mono flex">
      {/* Sidebar */}
      <aside 
        className={cn(
          "fixed inset-y-0 left-0 z-50 h-screen bg-white dark:bg-slate-950 lg:bg-card border-r border-border transform transition-all duration-300 ease-in-out flex flex-col",
          !isSidebarOpen && "-translate-x-full lg:translate-x-0",
          isCollapsed ? "w-[70px]" : "w-64"
        )}
      >
        <div className={cn("h-14 flex items-center border-b border-border transition-all duration-300", isCollapsed ? "justify-center px-0" : "px-6")}>
          <div className={cn("flex items-center min-w-0", isCollapsed ? "justify-center w-full" : "flex-1")}>
             {isCollapsed ? (
                <Button 
                  variant="ghost" 
                  size="icon" 
                  onClick={() => setIsCollapsed(false)}
                  className="text-primary hover:text-primary/80"
                >
                  <PanelLeftOpen size={24} />
                </Button>
             ) : (
               <>
                 <Code2 className="text-primary transition-all flex-shrink-0 mr-2" size={24} />
                 <span className="font-bold text-lg tracking-tight truncate">opsNest_</span>
               </>
             )}
          </div>
          
          {!isCollapsed && (
            <Button 
                variant="ghost" 
                size="icon" 
                onClick={() => setIsCollapsed(!isCollapsed)}
                className="ml-auto h-8 w-8 text-muted-foreground hover:text-foreground hidden lg:flex"
            >
                <PanelLeftClose size={16} />
            </Button>
          )}
          
          <button 
            className="ml-auto lg:hidden" 
            onClick={() => setIsSidebarOpen(false)}
          >
            <X size={20} />
          </button>
        </div>

        <div className="flex-1 py-4 space-y-1 overflow-y-auto overflow-x-hidden">
          {!isCollapsed && (
            <div className="px-6 py-2 text-xs font-semibold text-muted-foreground uppercase tracking-wider truncate">
              DevOps Hub
            </div>
          )}
          <div className="px-3 space-y-1">
            {sidebarItems.map((item) => {
              const isActive = item.path === '/dashboard' 
                ? location.pathname === '/dashboard' 
                : location.pathname.startsWith(item.path);
                
              return (
                <div 
                  key={item.path} 
                  className="relative group"
                  onMouseEnter={(e) => {
                    if (isCollapsed) {
                      const rect = e.currentTarget.getBoundingClientRect();
                      setHoveredItem({ label: item.label, top: rect.top + (rect.height / 2) });
                    }
                  }}
                  onMouseLeave={() => setHoveredItem(null)}
                >
                  <Link
                    to={item.path}
                    className={cn(
                      "flex items-center gap-3 py-2 rounded-md text-sm font-medium transition-all duration-200 relative",
                      isCollapsed ? "justify-center px-0" : "px-3",
                      isActive 
                        ? "bg-blue-600 text-white shadow-md" 
                        : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
                    )}
                  >
                    <item.icon size={20} strokeWidth={isActive ? 2.5 : 2} />
                    {!isCollapsed && <span className="truncate">{item.label}</span>}
                  </Link>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tooltip Portal */}
        {isCollapsed && hoveredItem && createPortal(
          <div 
            className="fixed z-[100] left-[74px] px-3 py-1.5 bg-white dark:bg-slate-900 text-popover-foreground text-xs font-medium rounded-md shadow-md border border-border dark:border-slate-800 whitespace-nowrap animate-in fade-in slide-in-from-left-2 duration-200 pointer-events-none"
            style={{ top: `${hoveredItem.top}px`, transform: 'translateY(-50%)' }}
          >
            {hoveredItem.label}
          </div>,
          document.body
        )}

        {isCollapsed && profilePopoverOpen && profilePopoverPos && createPortal(
          <div
            onMouseEnter={() => setProfileHover(true)}
            onMouseLeave={() => setProfileHover(false)}
            className="fixed z-[120] min-w-[200px] max-w-[220px] bg-white dark:bg-slate-900 border border-border dark:border-slate-800 rounded-lg shadow-lg py-2 px-2 animate-in fade-in slide-in-from-left-2 duration-150"
            style={{ top: `${profilePopoverPos.top}px`, left: `${profilePopoverPos.left}px` }}
          >
            <button
              className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-muted"
              onClick={() => {
                setProfileHover(false);
                navigate('/dashboard/profile');
              }}
            >
              Profile
            </button>
            <button
              className="w-full px-3 py-2 text-sm text-left rounded-md hover:bg-red-50 text-red-600"
              onClick={() => {
                setProfileHover(false);
                handleLogout();
              }}
            >
              Logout
            </button>
          </div>,
          document.body
        )}

        <div className={cn("p-4 border-t border-border transition-all duration-300", isCollapsed ? "items-center flex flex-col" : "")}>
          <div
            ref={profileAnchorRef}
            onMouseEnter={() => setProfileHover(true)}
            onMouseLeave={() => setProfileHover(false)}
            className={cn("mt-2 flex items-center gap-3", isCollapsed ? "justify-center px-0" : "px-3")}
          >
            <div className="h-8 w-8 min-w-[2rem] rounded-full bg-primary text-primary-foreground flex items-center justify-center font-bold text-xs ring-2 ring-background">
              JS
            </div>
            {!isCollapsed && (
              <div className="flex flex-col overflow-hidden flex-1">
                <span className="text-xs font-bold truncate">js07ink</span>
                <span
                  className="text-[10px] text-muted-foreground truncate cursor-pointer hover:underline"
                  onClick={() => navigate('/dashboard/profile')}
                >
                  View Profile
                </span>
              </div>
            )}
            {!isCollapsed && (
              <Button variant="ghost" size="icon" className="h-8 w-8 ml-auto text-muted-foreground hover:text-destructive" onClick={handleLogout}>
                 <LogOut size={16} />
              </Button>
            )}
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className={cn(
        "flex-1 flex flex-col min-w-0 transition-all duration-300",
        isCollapsed ? "lg:ml-[70px]" : "lg:ml-64"
      )}>
        {/* Header */}
        <header className="h-14 border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 px-6 flex items-center justify-between sticky top-0 z-40">
          <div className="flex items-center gap-4">
            <button 
              className="lg:hidden" 
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="hidden md:flex items-center text-sm text-muted-foreground">
               <span className="hover:text-foreground cursor-pointer" onClick={() => navigate('/dashboard')}>
                 Dashboard
               </span>
               <span className="mx-2">/</span>
               <span className="text-foreground font-medium">{currentSection}</span>
            </div>
          </div>

          <div className="flex items-center gap-4">
             <div className="relative hidden sm:block">
               <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground pointer-events-none" />
               <input
                 ref={searchInputRef}
                 type="search"
                 placeholder="Search projects... (/)"
                 className="h-9 w-64 rounded-md border border-input bg-background pl-9 pr-4 text-sm outline-none focus:ring-1 focus:ring-ring"
               />
             </div>
             <div className="relative" ref={notificationsRef}>
               <Button 
                 variant="ghost" 
                 size="icon" 
                 className="relative"
                 onClick={() => setShowNotifications(!showNotifications)}
               >
                 <Bell size={20} />
                 <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-red-500" />
               </Button>
               
               {/* Notifications Dropdown */}
               {showNotifications && (
                 <div className="absolute right-0 top-full mt-2 w-80 rounded-md border border-border bg-white dark:bg-slate-900 p-4 shadow-md z-50 animate-in fade-in zoom-in-95 duration-200">
                   <div className="flex items-center justify-between mb-4">
                     <h4 className="font-semibold text-sm">Notifications</h4>
                     <span className="text-xs text-muted-foreground">2 new</span>
                   </div>
                   <div className="space-y-3">
                     <div className="flex gap-3 text-sm">
                       <div className="h-2 w-2 mt-1.5 rounded-full bg-blue-500 flex-shrink-0" />
                       <div>
                         <p className="font-medium">Deployment Successful</p>
                         <p className="text-xs text-muted-foreground mt-1">Production deployment completed 2m ago</p>
                       </div>
                     </div>
                     <div className="flex gap-3 text-sm">
                       <div className="h-2 w-2 mt-1.5 rounded-full bg-yellow-500 flex-shrink-0" />
                       <div>
                         <p className="font-medium">Test Suite Failed</p>
                         <p className="text-xs text-muted-foreground mt-1">E2E tests failed on branch 'feature/auth'</p>
                       </div>
                     </div>
                   </div>
                   <div className="mt-4 pt-3 border-t border-border flex items-center justify-between">
                     <Button variant="ghost" size="sm" className="px-3 py-1 h-auto text-xs">
                       Mark all as read
                     </Button>
                     <Link to="/dashboard/notifications" className="text-xs font-semibold text-primary hover:underline">
                       View all
                     </Link>
                   </div>
                 </div>
               )}
             </div>
             <Button variant="ghost" size="icon" onClick={toggleTheme}>
                {isDark ? <Sun size={20} /> : <Moon size={20} />}
             </Button>
          </div>
        </header>

        {/* Page Content */}
        <main className="flex-1 p-6 overflow-y-auto">
          <Outlet />
        </main>
      </div>
      
      {/* Overlay for mobile sidebar */}
      {isSidebarOpen && (
        <div 
          className="fixed inset-0 bg-black/50 z-40 lg:hidden backdrop-blur-sm"
          onClick={() => setIsSidebarOpen(false)}
        />
      )}
    </div>
  );
};

export default DashboardLayout;
