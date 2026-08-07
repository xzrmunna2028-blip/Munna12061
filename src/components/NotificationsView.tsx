import React, { useState } from 'react';
import { Bell, Heart, MessageCircle, Sparkles, CheckCheck, ShieldCheck, Maximize2, Minimize2, X } from 'lucide-react';
import { NotificationItem } from '../types';

interface NotificationsViewProps {
  notifications: NotificationItem[];
  onMarkAllRead: () => void;
  onNotificationClick: (notif: NotificationItem) => void;
}

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllRead,
  onNotificationClick,
}) => {
  const [selectedNotif, setSelectedNotif] = useState<NotificationItem | null>(null);

  const handleCardClick = (notif: NotificationItem) => {
    onNotificationClick(notif);
    setSelectedNotif(notif);
  };

  return (
    <div className="max-w-3xl mx-auto px-4 py-6 text-white pb-24 md:pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Bell className="w-6 h-6 text-rose-500" /> Notifications
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Stay updated on new matches, likes, and official messages (Click to open full screen)
          </p>
        </div>
        {notifications.some((n) => !n.isRead) && (
          <button
            onClick={onMarkAllRead}
            className="flex items-center space-x-1 px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs text-slate-300 transition-colors"
          >
            <CheckCheck className="w-4 h-4 text-emerald-400" />
            <span>Mark all read</span>
          </button>
        )}
      </div>

      {notifications.length > 0 ? (
        <div className="space-y-3">
          {notifications.map((notif) => {
            const getIcon = () => {
              if (notif.type === 'match') return <Sparkles className="w-5 h-5 text-amber-400" />;
              if (notif.type === 'like') return <Heart className="w-5 h-5 text-rose-500 fill-rose-500" />;
              if (notif.type === 'message') return <MessageCircle className="w-5 h-5 text-sky-400" />;
              return <Bell className="w-5 h-5 text-purple-400" />;
            };

            const isOfficial = !!notif.officialLogo || !!notif.officialTitle || notif.type === 'system';

            return (
              <div
                key={notif.id}
                onClick={() => handleCardClick(notif)}
                className={`p-4 rounded-2xl border transition-all cursor-pointer flex items-center space-x-4 group ${
                  isOfficial
                    ? 'bg-purple-950/40 border-purple-500/40 hover:bg-purple-900/50 text-white shadow-xl'
                    : notif.isRead
                    ? 'bg-slate-900/60 border-slate-800/80 text-slate-300 hover:bg-slate-800/60'
                    : 'bg-rose-500/10 border-rose-500/30 text-white shadow-lg hover:bg-rose-500/20'
                }`}
              >
                {notif.officialLogo ? (
                  <img
                    src={notif.officialLogo}
                    alt="Official Logo"
                    className="w-11 h-11 rounded-full object-cover border-2 border-purple-500 flex-shrink-0 group-hover:scale-105 transition-transform"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-2xl bg-slate-800 border border-slate-700/80 flex items-center justify-center flex-shrink-0">
                    {getIcon()}
                  </div>
                )}

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-0.5">
                    <h4 className="text-xs font-bold truncate flex items-center gap-1.5 text-white">
                      {notif.officialTitle ? notif.officialTitle : notif.title}
                      {isOfficial && <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />}
                    </h4>
                    <span className="text-[10px] text-slate-400 font-mono">
                      {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                    </span>
                  </div>

                  {notif.officialTitle && (
                    <p className="text-[11px] font-bold text-purple-300 mb-0.5">{notif.title}</p>
                  )}

                  <p className="text-xs text-slate-300 line-clamp-1">{notif.message}</p>
                </div>

                <div className="flex items-center space-x-2">
                  <span className="text-[10px] bg-slate-800/80 text-slate-300 px-2 py-1 rounded-lg border border-slate-700/60 flex items-center gap-1 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                    <Maximize2 className="w-3 h-3" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </span>
                  {!notif.isRead && (
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-500 flex-shrink-0" />
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <Bell className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-bold text-white mb-1">No Notifications Yet</h3>
          <p className="text-xs text-slate-400">You are all caught up!</p>
        </div>
      )}

      {/* FULL-SCREEN NOTIFICATION OVERLAY MODAL */}
      {selectedNotif && (
        <div className="fixed inset-0 z-[100] bg-slate-950/95 backdrop-blur-md flex items-center justify-center p-4 animate-fade-in">
          <div className="bg-slate-900 border border-purple-500/40 rounded-3xl p-6 md:p-8 max-w-2xl w-full shadow-2xl space-y-5 relative">
            <button
              onClick={() => setSelectedNotif(null)}
              className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center space-x-4 pb-4 border-b border-slate-800">
              <img
                src={selectedNotif.officialLogo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>"}
                alt="Official Emblem"
                className="w-14 h-14 rounded-full object-cover border-2 border-purple-500 shadow-md"
              />
              <div>
                <h3 className="text-base font-extrabold text-purple-200 flex items-center gap-1.5">
                  {selectedNotif.officialTitle || 'True Love Connect Official'}
                  <ShieldCheck className="w-4 h-4 text-purple-400" />
                </h3>
                <span className="text-xs text-slate-400">
                  {new Date(selectedNotif.createdAt).toLocaleString()}
                </span>
              </div>
            </div>

            <div className="space-y-3">
              <h2 className="text-lg font-bold text-white tracking-wide">
                {selectedNotif.title}
              </h2>
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed whitespace-pre-wrap">
                {selectedNotif.message}
              </div>
            </div>

            <div className="flex justify-end pt-2">
              <button
                onClick={() => setSelectedNotif(null)}
                className="px-6 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold transition-all shadow-lg shadow-purple-600/30 flex items-center gap-2"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Close Full Screen</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
