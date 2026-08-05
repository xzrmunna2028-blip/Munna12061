import React from 'react';
import { LayoutGrid, Sparkles, Heart, MessageCircle, User as UserIcon } from 'lucide-react';
import { User } from '../types';

interface MobileBottomNavProps {
  currentUser: User | null;
  activeTab: 'discover' | 'likes' | 'matches' | 'notifications' | 'profile' | 'admin';
  setActiveTab: (tab: 'discover' | 'likes' | 'matches' | 'notifications' | 'profile' | 'admin') => void;
  unreadNotifsCount: number;
  likesCount: number;
  onCenterHeartClick?: () => void;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  likesCount,
  onCenterHeartClick,
}) => {
  if (!currentUser) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800/80 px-3 py-2">
      <div className="max-w-md mx-auto flex items-center justify-around relative">
        
        {/* Tab 1: Blast */}
        <button
          onClick={() => setActiveTab('discover')}
          className={`flex flex-col items-center py-1 px-1.5 transition-all ${
            activeTab === 'discover' ? 'text-pink-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <LayoutGrid className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Blast</span>
        </button>

        {/* Tab 2: Matches */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`flex flex-col items-center py-1 px-1.5 transition-all ${
            activeTab === 'matches' ? 'text-pink-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Sparkles className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Matches</span>
        </button>

        {/* Center Floating Heart Button */}
        <button
          onClick={onCenterHeartClick || (() => setActiveTab('likes'))}
          className="relative -mt-6 p-1 rounded-full bg-slate-950 transition-transform active:scale-95 cursor-pointer"
          title="Like Member / লাইক করুন"
        >
          <div className="w-12 h-12 sm:w-13 sm:h-13 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 flex items-center justify-center shadow-lg shadow-pink-500/40 hover:shadow-pink-500/60 transition-shadow p-2.5">
            <Heart className="w-6 h-6 text-white fill-white" />
          </div>
          {likesCount > 0 && (
            <span className="absolute top-0 right-0 px-1.5 py-0.5 text-[9px] font-extrabold bg-rose-500 text-white rounded-full border border-slate-950 shadow">
              {likesCount}
            </span>
          )}
        </button>

        {/* Tab 4: Chats */}
        <button
          onClick={() => setActiveTab('matches')}
          className={`relative flex flex-col items-center py-1 px-1.5 transition-all ${
            activeTab === 'matches' ? 'text-pink-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <MessageCircle className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Chats</span>
          {unreadNotifsCount > 0 && (
            <span className="absolute top-1 right-2 w-2 h-2 rounded-full bg-pink-500 animate-pulse" />
          )}
        </button>

        {/* Tab 5: Profile */}
        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center py-1 px-1.5 transition-all ${
            activeTab === 'profile' ? 'text-pink-500 font-bold scale-105' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <UserIcon className="w-5 h-5" />
          <span className="text-[10px] mt-1 tracking-tight">Profile</span>
        </button>

      </div>
    </div>
  );
};

