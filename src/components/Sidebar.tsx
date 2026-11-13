import { useState } from 'react';
import Logo from './Logo';
import UserAvatar from './UserAvatar';
import { 
  Home, 
  Compass, 
  Users, 
  Library, 
  BookOpen, 
  FileText, 
  Star, 
  PenTool, 
  Bell, 
  User, 
  Settings as SettingsIcon, 
  ChevronLeft, 
  ChevronRight, 
  Menu, 
  X,
  Sparkles,
  LogOut,
  Shield,
  Activity,
  VenetianMask
} from 'lucide-react';
import { UserProfile } from '../types';

interface SidebarProps {
  currentView: string;
  setView: (view: string) => void;
  isExpanded: boolean;
  setIsExpanded: (expanded: boolean) => void;
  unreadNotifications: number;
  currentUser: UserProfile | null;
  onLogout: () => void;
  onSimulateExpiry?: () => void;
  themeMode?: 'light' | 'dark';
}

export default function Sidebar({ 
  currentView, 
  setView, 
  isExpanded, 
  setIsExpanded,
  unreadNotifications,
  currentUser,
  onLogout,
  onSimulateExpiry,
  themeMode = 'dark'
}: SidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false);

  const menuItems = [
    { id: 'home', label: 'Home', icon: Home, category: 'Main' },
    { id: 'communities', label: 'Communities', icon: Users, category: 'Main' },
    { id: 'library', label: 'Library', icon: Library, category: 'Main' },
    
    { id: 'my-stories', label: 'My Stories', icon: BookOpen, category: 'Writer' },
    { id: 'personas', label: 'Personas', icon: VenetianMask, category: 'Writer' },
    
    { id: 'notifications', label: 'Notifications', icon: Bell, category: 'Account', badge: unreadNotifications },
    { id: 'profile', label: 'Profile', icon: User, category: 'Account' },
    { id: 'settings', label: 'Settings', icon: SettingsIcon, category: 'Account' },
  ];

  const handleNav = (id: string) => {
    setView(id);
    setIsMobileOpen(false);
  };

  const SidebarContent = () => (
    <div className={`flex flex-col h-full border-r transition-all duration-300 ${
      themeMode === 'light' 
        ? 'bg-[#f4f5f6] border-slate-250/90 text-slate-805' 
        : 'bg-[#090a10] border-slate-800/60 text-[#f3f4f6]'
    }`} id="fictself-sidebar">
      {/* Brand Header */}
      <div className={`flex items-center justify-between p-4 border-b h-16 transition-colors duration-300 ${
        themeMode === 'light' ? 'border-slate-250/90' : 'border-slate-800/60'
      }`}>
        <div className="cursor-pointer" onClick={() => handleNav('home')}>
          <Logo 
            size={isExpanded || isMobileOpen ? 'md' : 'sm'} 
            showText={isExpanded || isMobileOpen} 
            orientation="horizontal" 
          />
        </div>
        {!isMobileOpen && (
          <button 
            onClick={() => setIsExpanded(!isExpanded)} 
            className={`hidden md:flex items-center justify-center w-6 h-6 rounded-md border transition-all cursor-pointer ${
              themeMode === 'light'
                ? 'bg-slate-200/50 hover:bg-slate-200 hover:text-violet-600 border-slate-300/80'
                : 'bg-slate-900/80 hover:bg-[#252525] hover:text-violet-404 border-slate-805/40'
            }`}
            id="toggle-sidebar-btn"
          >
            {isExpanded ? <ChevronLeft size={14} /> : <ChevronRight size={14} />}
          </button>
        )}
      </div>

      {/* Trigger Button "Write Story" */}
      <div className="px-3 pt-4">
        <button
          onClick={() => handleNav('new-story-flow')}
          className={`flex items-center justify-center gap-2 w-full py-2.5 px-3 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-semibold text-sm transition-all duration-200 cursor-pointer shadow active:scale-95 group overflow-hidden relative`}
          id="write-story-quick-btn"
        >
          <PenTool size={16} className="group-hover:rotate-12 transition-transform" />
          {(isExpanded || isMobileOpen) && <span className="truncate">Write Story</span>}
        </button>
      </div>

      {/* Navigation Groups */}
      <div className="flex-1 overflow-y-auto px-2 py-4 space-y-6 scrollbar-thin">
        {['Main', 'Writer', 'Account'].map((group) => {
          const items = menuItems.filter(item => item.category === group);
          if (items.length === 0) return null;
          return (
            <div key={group} className="space-y-1.5">
              {(isExpanded || isMobileOpen) && (
                <div className={`px-3.5 text-[10px] font-bold tracking-wider uppercase select-none ${
                   themeMode === 'light' ? 'text-slate-450' : 'text-slate-500'
                }`}>
                  {group}
                </div>
              )}
              <div className="space-y-1">
                {items.map((item) => {
                  const Icon = item.icon;
                  const isActive = currentView === item.id || 
                    (item.id === 'my-stories' && ['story-dashboard', 'story-reader', 'drafts', 'favorites', 'character-manager'].includes(currentView));
                  
                  return (
                    <button
                      key={item.id}
                      onClick={() => handleNav(item.id)}
                      className={`flex items-center gap-3 w-full py-2.5 px-3.5 rounded-xl text-sm font-semibold transition-all duration-150 relative group cursor-pointer ${
                        isActive 
                          ? themeMode === 'light'
                            ? 'bg-violet-100/90 text-violet-700 border-l-2 border-violet-600 font-semibold shadow-sm'
                            : 'bg-violet-950/15 text-violet-400 border-l-2 border-violet-500 font-semibold' 
                          : themeMode === 'light'
                            ? 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900'
                            : 'text-slate-400 hover:bg-slate-950/40 hover:text-slate-100'
                      }`}
                      id={`nav-${item.id}`}
                    >
                      <Icon size={18} className={`flex-shrink-0 ${
                        isActive 
                          ? 'text-violet-600 dark:text-violet-400' 
                          : 'text-slate-450 group-hover:text-slate-900 dark:group-hover:text-slate-200 transition-colors'
                      }`} />
                      {(isExpanded || isMobileOpen) && (
                        <span className="truncate relative flex-1 text-left">{item.label}</span>
                      )}
                      
                      {item.badge && item.badge > 0 && (isExpanded || isMobileOpen) && (
                        <span className="flex-shrink-0 bg-violet-650 text-white font-mono text-[10px] px-1.5 py-0.5 rounded-full font-bold">
                          {item.badge}
                        </span>
                      )}
                      
                      {/* Tooltip for collapsed mode */}
                      {!isExpanded && !isMobileOpen && (
                        <div className={`absolute left-14 top-1/2 -translate-y-1/2 text-xs font-semibold px-2 py-1.5 rounded-md opacity-0 group-hover:opacity-100 pointer-events-none transition-all duration-200 shadow-xl whitespace-nowrap z-50 border ${
                          themeMode === 'light' 
                            ? 'bg-white text-slate-800 border-slate-250/90' 
                            : 'bg-[#0f0f0f] text-[#f3f4f6] border-[#1a1a1a]'
                        }`}>
                          {item.label}
                          {item.badge && item.badge > 0 ? ` (${item.badge})` : ''}
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>

      {/* User Quick footer card */}
      <div className={`border-t p-3.5 flex flex-col gap-2 shrink-0 select-none transition-colors duration-300 ${
        themeMode === 'light' 
          ? 'border-slate-250/90 bg-slate-200/20' 
          : 'border-slate-805/40 bg-[#06070a]'
      }`}>
        {currentUser ? (
          <>
            <div className="flex items-center gap-3 overflow-hidden" id="sidebar-user-info-card">
              <UserAvatar src={currentUser.profileImage} name={currentUser.displayName} size="sm" />
              {(isExpanded || isMobileOpen) && (
                <div className="flex flex-col min-w-0 flex-1">
                  <span className={`font-bold text-xs truncate flex items-center gap-1 ${
                    themeMode === 'light' ? 'text-slate-800' : 'text-slate-100'
                  }`}>
                    {currentUser.displayName}
                    {currentUser.role === 'Admin' && (
                      <span className="bg-red-500/10 border border-red-500/30 text-red-500 font-mono text-[8px] px-1 rounded uppercase font-bold tracking-tight">R00T</span>
                    )}
                  </span>
                  <span className={`text-[10px] truncate font-mono flex items-center gap-1 font-bold tracking-wider ${
                    themeMode === 'light' ? 'text-violet-700' : 'text-violet-400'
                  }`}>
                    {currentUser.role} Creator
                  </span>
                </div>
              )}
              
              {/* Quick Logout Button */}
              {(isExpanded || isMobileOpen) && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onLogout();
                  }}
                  title="Terminate Auth Session Token"
                  className={`p-1.5 rounded-lg border transition cursor-pointer select-none ${
                    themeMode === 'light'
                      ? 'bg-slate-200/80 hover:bg-red-50 text-slate-600 hover:text-red-550 border-slate-300 hover:border-red-200'
                      : 'bg-[#141620] hover:bg-red-950/20 text-slate-400 hover:text-red-400 border-slate-800 hover:border-red-900/40'
                  }`}
                  id="quick-sidebar-logout-btn"
                >
                  <LogOut size={13} />
                </button>
              )}
            </div>

            {/* Sandbox Dev Session Expiry Simulation Button */}
            {(isExpanded || isMobileOpen) && onSimulateExpiry && (
              <div className={`pt-2 border-t flex justify-between gap-1 select-none ${
                themeMode === 'light' ? 'border-slate-200' : 'border-slate-900'
              }`}>
                <button
                  type="button"
                  onClick={onSimulateExpiry}
                  className={`text-[9px] font-bold font-mono uppercase py-1 px-2 rounded-md transition cursor-pointer w-full text-center flex items-center justify-center gap-1 ${
                    themeMode === 'light'
                      ? 'text-slate-500 hover:text-amber-600 bg-slate-200/60 hover:bg-amber-50 border border-slate-300 hover:border-amber-200'
                      : 'text-slate-500 hover:text-amber-400 bg-slate-950/40 hover:bg-amber-950/10 border border-slate-900/20 hover:border-amber-900/30'
                  }`}
                  title="Trigger mock security session expiration coordinates"
                >
                  <Activity size={10} className="animate-pulse" />
                  Simulate Token Expiry
                </button>
              </div>
            )}
          </>
        ) : null}
      </div>
    </div>
  );

  return (
    <>
      {/* Mobile Top Header Indicator */}
      <div className={`md:hidden flex items-center justify-between w-full h-15 border-b px-4 shrink-0 z-40 transition-colors duration-300 ${
        themeMode === 'light' ? 'bg-[#f4f5f6] border-slate-250/90' : 'bg-[#0a0a0a] border-[#1a1a1a]'
      }`} id="fictself-mobile-header">
        <button 
          onClick={() => setIsMobileOpen(true)}
          className={`p-1.5 rounded-lg ${
            themeMode === 'light' ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-[#141414] text-slate-300 hover:text-white'
          }`}
          id="mobile-drawer-trigger"
        >
          <Menu size={20} />
        </button>
        <div className="cursor-pointer" onClick={() => setView('home')}>
          <Logo size="sm" showText={true} />
        </div>
        <button 
          onClick={() => setView('notifications')} 
          className={`p-1.5 rounded-lg relative ${
            themeMode === 'light' ? 'bg-slate-200 text-slate-700 border border-slate-300' : 'bg-[#141414] text-slate-300'
          }`}
          id="mobile-notification-trigger"
        >
          <Bell size={20} />
          {unreadNotifications > 0 && (
            <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-violet-500 rounded-full animate-pulse" />
          )}
        </button>
      </div>

      {/* Desktop Sidebar (Persistent) */}
      <div className={`hidden md:block select-none flex-shrink-0 transition-all duration-300 ${isExpanded ? 'w-64' : 'w-18'}`}>
        <div className="fixed inset-y-0 left-0 transition-all duration-300 z-30" style={{ width: isExpanded ? '16rem' : '4.5rem' }}>
          <SidebarContent />
        </div>
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileOpen && (
        <div 
          className="md:hidden fixed inset-0 bg-black/80 backdrop-blur-sm z-50 transition-opacity"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Mobile Drawer (Sliding menu) */}
      <div className={`md:hidden fixed inset-y-0 left-0 w-72 max-w-[80vw] z-50 transform transition-transform duration-300 h-full ${
        isMobileOpen ? 'translate-x-0' : '-translate-x-full'
      }`}>
        <div className="relative h-full">
          <SidebarContent />
          <button 
            onClick={() => setIsMobileOpen(false)}
            className="absolute top-4 right-4 p-1.5 rounded-lg bg-slate-900 text-white border border-[#1a1a1a] hover:bg-slate-800"
            id="close-mobile-drawer-btn"
          >
            <X size={16} />
          </button>
        </div>
      </div>
    </>
  );
}
