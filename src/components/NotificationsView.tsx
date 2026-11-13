import React, { useState } from 'react';
import { Notification } from '../types';
import {
  Bell,
  Heart,
  MessageSquare,
  RefreshCw,
  CheckSquare,
  Trash2,
  UserPlus,
  AtSign,
  Users,
  Eye,
  Check
} from 'lucide-react';
import UserAvatar from './UserAvatar';

interface NotificationsViewProps {
  notifications: Notification[];
  onMarkRead: (id: string) => void;
  onClearAll: () => void;
  onMarkAllRead: () => void;
  onClearRead: () => void;
}

export default function NotificationsView({
  notifications,
  onMarkRead,
  onClearAll,
  onMarkAllRead,
  onClearRead
}: NotificationsViewProps) {

  const [filterCategory, setFilterCategory] = useState<string>('All');

  // Filter Categories: All, Comments, Likes, Followers, Story Updates, Community
  const categories = [
    { id: 'All', label: 'All', icon: Bell },
    { id: 'comments', label: 'Comments', icon: MessageSquare },
    { id: 'likes', label: 'Likes', icon: Heart },
    { id: 'followers', label: 'Followers', icon: UserPlus },
    { id: 'updates', label: 'Story Updates', icon: RefreshCw },
    { id: 'community', label: 'Community', icon: Users }
  ];

  // Map category to styles and icons
  const getCategoryTheme = (category: string) => {
    switch (category) {
      case 'comments':
        return {
          icon: MessageSquare,
          color: 'text-sky-450 bg-sky-505/10 border-sky-505/20',
          hoverColor: 'hover:border-sky-550/40'
        };
      case 'likes':
        return {
          icon: Heart,
          color: 'text-pink-400 bg-pink-500/10 border-pink-500/20',
          hoverColor: 'hover:border-pink-550/40'
        };
      case 'followers':
        return {
          icon: UserPlus,
          color: 'text-teal-400 bg-teal-500/10 border-teal-500/20',
          hoverColor: 'hover:border-teal-550/40'
        };
      case 'updates':
        return {
          icon: RefreshCw,
          color: 'text-violet-400 bg-violet-500/10 border-violet-500/20',
          hoverColor: 'hover:border-violet-550/40'
        };
      case 'community':
        return {
          icon: Users,
          color: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
          hoverColor: 'hover:border-amber-550/40'
        };
      default:
        return {
          icon: Bell,
          color: 'text-slate-400 bg-slate-500/10 border-slate-500/20',
          hoverColor: 'hover:border-slate-800'
        };
    }
  };

  const filteredNotis = notifications.filter(n => {
    if (filterCategory === 'All') return true;
    return n.category === filterCategory;
  });

  const unreadTotal = notifications.filter(n => !n.read).length;

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 space-y-6 select-none font-sans text-left" id="fictself-notifications-view">

      {/* Description Panel & Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-5 border-b border-slate-850/65 gap-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2.5">
            <h1 className="text-xl md:text-2xl font-extrabold text-white tracking-tight">
              Inbox Notifications
            </h1>
            {unreadTotal > 0 && (
              <span className="bg-violet-650 text-white font-mono text-xs px-2.5 py-0.5 rounded-full font-bold shadow animate-pulse">
                {unreadTotal} new
              </span>
            )}
          </div>
        </div>

        {/* Toolbar buttons */}
        <div className="flex items-center gap-2 select-none">
          {notifications.length > 0 && (
            <>
              <button
                onClick={onMarkAllRead}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-[#121522] border border-slate-800 text-[11px] font-bold text-slate-300 hover:text-white transition cursor-pointer flex items-center gap-1.5"
                id="mark-all-read-btn"
                title="Mark all notifications as read"
              >
                <CheckSquare size={13} />
                Mark All Read
              </button>

              <button
                onClick={onClearRead}
                className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-rose-950/20 border border-slate-800 text-[11px] font-bold text-rose-450 hover:text-rose-350 transition cursor-pointer flex items-center gap-1.5"
                id="clear-read-btn"
                title="Remove already read updates"
              >
                <Trash2 size={13} />
                Clear Read
              </button>
            </>
          )}
        </div>
      </div>

      {/* Tabs list scrollable trackers */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none select-none border-b border-slate-900/40 select-none">
        {categories.map((cat) => {
          const IconComponent = cat.icon;
          const isActive = filterCategory === cat.id;
          const catUnreadCount = notifications.filter(n => n.category === cat.id && !n.read).length;
          const showBadge = cat.id !== 'All' ? catUnreadCount > 0 : unreadTotal > 0;
          const badgeVal = cat.id !== 'All' ? catUnreadCount : unreadTotal;

          return (
            <button
              key={cat.id}
              onClick={() => setFilterCategory(cat.id)}
              className={`px-3.5 py-2.5 rounded-xl text-xs font-bold transition-all duration-150 whitespace-nowrap cursor-pointer flex items-center gap-2 border ${isActive
                  ? 'bg-violet-650/10 border-violet-500/50 text-violet-300 bg-[#16122d]'
                  : 'bg-[#0a0d16]/30 border-slate-900/60 text-slate-450 hover:bg-[#0c0f1b]/80 hover:text-slate-200'
                }`}
              id={`tab-noti-${cat.id}`}
            >
              <IconComponent
                size={13.5}
                className={isActive ? 'text-violet-405' : 'text-slate-500'}
              />
              <span>{cat.label}</span>
              {showBadge && (
                <span className={`text-[9px] font-bold px-1.5 py-0.1 space-x-0 font-mono rounded-full ${isActive ? 'bg-violet-600 text-white' : 'bg-slate-800 text-slate-400'
                  }`}>
                  {badgeVal}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {filteredNotis.length > 0 ? (
          filteredNotis.map(noti => {
            const theme = getCategoryTheme(noti.category);
            const Icon = theme.icon;

            const matchUser = noti.message.match(/@(\w+)/);
            const referredUser = matchUser ? matchUser[1] : null;

            return (
              <div
                key={noti.id}
                onClick={() => !noti.read && onMarkRead(noti.id)}
                className={`p-4 rounded-xl border flex items-center justify-between gap-4 transition duration-200 relative group text-left ${noti.read
                    ? 'bg-[#08090f]/70 border-slate-900/60 opacity-60'
                    : `bg-[#0e0f18]/90 border-slate-850/60 shadow-md ${theme.hoverColor}`
                  }`}
                id={`noti-item-card-${noti.id}`}
              >
                {/* Active violet marker left */}
                {!noti.read && (
                  <div className="absolute top-0 bottom-0 left-0 w-1 bg-violet-500 rounded-l-xl" />
                )}

                {/* Left profile info & details */}
                <div className="flex gap-4 items-center min-w-0 flex-1">

                  {/* Avatar Layout with sub-icon badge */}
                  <div className="relative shrink-0 select-none">
                    {referredUser ? (
                      <UserAvatar name={referredUser} size="sm" className="w-10 h-10 border border-slate-805" />
                    ) : (
                      <div className={`p-2 w-10 h-10 rounded-xl flex items-center justify-center border ${theme.color}`}>
                        <Icon size={16} />
                      </div>
                    )}
                    {referredUser && (
                      <div className={`absolute -bottom-1 -right-1 p-0.5 rounded-full border border-slate-950 bg-[#0c0d16] ${theme.color}`}>
                        <Icon size={10} />
                      </div>
                    )}
                  </div>

                  {/* Message body details */}
                  <div className="space-y-0.5 min-w-0 flex-1 font-sans">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-[10px] text-slate-500 font-mono capitalize tracking-wide select-none">
                        {noti.category === 'updates' ? 'story update' : noti.category}
                      </span>
                      <span className="text-[10px] text-slate-500 font-mono select-none">•</span>
                      <span className="text-[10px] text-slate-550 font-mono select-none">{noti.timestamp}</span>
                    </div>

                    <h4 className="font-bold text-[13px] text-slate-150 leading-tight">
                      {noti.title}
                    </h4>

                    <p className="text-xs text-slate-400 font-medium leading-relaxed pr-2 line-clamp-2">
                      {noti.message}
                    </p>
                  </div>
                </div>

                {/* Action button */}
                <div className="shrink-0 flex items-center select-none">
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onMarkRead(noti.id);
                    }}
                    className={`px-3 py-1.5 rounded-lg text-[10.5px] font-bold transition flex items-center gap-1.5 cursor-pointer ${noti.read
                        ? 'bg-slate-900/60 hover:bg-slate-900 border border-slate-850 text-slate-400'
                        : 'bg-violet-650 hover:bg-violet-605 text-white shadow'
                      }`}
                    id={`view-action-${noti.id}`}
                  >
                    <span>View</span>
                  </button>
                </div>

              </div>
            );
          })
        ) : (
          <div className="text-center py-16 bg-[#0a0c14]/40 border border-slate-900 rounded-2xl space-y-3" id="notifications-empty-state">
            <span className="text-3xl block">📥</span>
            <div className="space-y-1">
              <h3 className="font-bold text-sm text-slate-300">Clean Inbox</h3>
              <p className="text-xs text-slate-500 max-w-xs mx-auto leading-relaxed">
                No active notification alerts inside the "{filterCategory}" filter. You are fully sync\'d!
              </p>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
