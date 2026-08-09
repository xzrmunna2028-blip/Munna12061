import React from 'react';
import { Heart, MessageCircle, Sparkles, Bell, User as UserIcon, Shield, LogIn, UserCheck, Flame } from 'lucide-react';
import { User } from '../types';
import { getSafeAvatar } from '../lib/avatar';
import { VerificationBadge } from './VerificationBadge';

interface NavbarProps {
  currentUser: User | null;
  activeTab: 'landing' | 'discover' | 'likes' | 'matches' | 'chats' | 'notifications' | 'profile' | 'admin';
  setActiveTab: (tab: 'landing' | 'discover' | 'likes' | 'matches' | 'chats' | 'notifications' | 'profile' | 'admin') => void;
  unreadNotifsCount: number;
  unreadMatchesCount: number;
  likesCount: number;
  onOpenAuth: () => void;
  onQuickSwitchUser: (userId: string) => void;
  siteName?: string;
  siteLogo?: string;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentUser,
  activeTab,
  setActiveTab,
  unreadNotifsCount,
  unreadMatchesCount,
  likesCount,
  onOpenAuth,
  onQuickSwitchUser,
  siteName,
  siteLogo,
}) => {
  return (
    <header className="sticky top-0 z-40 bg-slate-900/90 backdrop-blur-md border-b border-slate-800 text-white transition-all">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        
        {/* Brand / Logo */}
        <div className="flex items-center space-x-3 cursor-pointer" onClick={() => setActiveTab('landing')}>
          {siteLogo ? (
            <img src={siteLogo} alt={siteName || 'True Love Connect'} className="w-10 h-10 rounded-2xl object-cover border border-rose-500/50 shadow-lg shadow-rose-500/20 transform hover:scale-105 transition-transform" />
          ) : (
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/20 transform hover:scale-105 transition-transform">
              <Flame className="w-6 h-6 text-white" />
            </div>
          )}
          <div>
            <span className="text-xl font-bold tracking-tight bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 bg-clip-text text-transparent">
              {siteName || 'True Love Connect'}
            </span>
            <span className="hidden sm:inline-block text-[10px] uppercase font-semibold tracking-wider text-rose-400/80 bg-rose-500/10 px-1.5 py-0.5 rounded ml-2">
              Matrimony
            </span>
          </div>
        </div>

        {/* Desktop Navigation Tabs */}
        {currentUser && (
          <nav className="hidden md:flex items-center space-x-1 bg-slate-800/60 p-1.5 rounded-full border border-slate-700/50">
            <button
              onClick={() => setActiveTab('discover')}
              className={`flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'discover'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Discover</span>
            </button>

            <button
              onClick={() => setActiveTab('likes')}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'likes'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Heart className="w-4 h-4" />
              <span>Likes You</span>
              {likesCount > 0 && (
                <span className="ml-1 px-1.5 py-0.5 text-xs font-bold bg-rose-500 text-white rounded-full">
                  {likesCount}
                </span>
              )}
            </button>

            <button
              onClick={() => setActiveTab('matches')}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'matches'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Sparkles className="w-4 h-4" />
              <span>Matches</span>
            </button>

            <button
              onClick={() => setActiveTab('chats')}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'chats'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <MessageCircle className="w-4 h-4" />
              <span>Chats</span>
              {unreadMatchesCount > 0 && (
                <span className="w-2 h-2 rounded-full bg-rose-500 animate-ping absolute top-2 right-2" />
              )}
            </button>

            <button
              onClick={() => setActiveTab('notifications')}
              className={`relative flex items-center space-x-2 px-4 py-2 rounded-full text-sm font-medium transition-all ${
                activeTab === 'notifications'
                  ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-md'
                  : 'text-slate-300 hover:text-white hover:bg-slate-700/50'
              }`}
            >
              <Bell className="w-4 h-4" />
              <span>Notifications</span>
              {unreadNotifsCount > 0 && (
                <span className="px-1.5 py-0.2 text-[10px] font-bold bg-rose-500 text-white rounded-full">
                  {unreadNotifsCount}
                </span>
              )}
            </button>
          </nav>
        )}

        {/* Right Section: Admin switch, User Profile or Auth Login */}
        <div className="flex items-center space-x-3">
          
          {/* Quick Demo Switcher Dropdown */}
          <div className="relative group hidden lg:block">
            <button className="flex items-center space-x-1.5 text-xs bg-slate-800 hover:bg-slate-700 px-3 py-1.5 rounded-lg border border-slate-700 text-slate-300 transition-colors">
              <UserCheck className="w-3.5 h-3.5 text-rose-400" />
              <span>Demo Persona</span>
            </button>
            <div className="absolute right-0 mt-1 w-48 bg-slate-800 border border-slate-700 rounded-xl shadow-xl py-2 hidden group-hover:block z-50">
              <div className="px-3 py-1 text-[10px] uppercase font-semibold text-slate-400 border-b border-slate-700/60 mb-1">
                Switch User Account
              </div>
              <button
                onClick={() => onQuickSwitchUser('usr_me')}
                className="w-full text-left px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700 flex items-center justify-between"
              >
                <span>Google User (User)</span>
                {currentUser?.id === 'usr_me' && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
              </button>
              <button
                onClick={() => onQuickSwitchUser('usr_admin')}
                className="w-full text-left px-3 py-1.5 text-xs text-rose-300 hover:bg-slate-700 flex items-center justify-between font-medium border-t border-slate-700/60 mt-1 pt-1.5"
              >
                <span className="flex items-center gap-1.5">
                  <Shield className="w-3 h-3 text-rose-400" /> Admin Portal
                </span>
                {currentUser?.id === 'usr_admin' && <span className="w-2 h-2 rounded-full bg-rose-500" />}
              </button>
            </div>
          </div>

          {/* Admin Panel Button */}
          {currentUser && (currentUser.role === 'admin' || currentUser.id === 'usr_admin') && (
            <button
              onClick={() => setActiveTab('admin')}
              className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                activeTab === 'admin'
                  ? 'bg-rose-500 text-white border-rose-400 shadow-lg shadow-rose-500/20'
                  : 'bg-rose-500/10 text-rose-300 border-rose-500/30 hover:bg-rose-500/20'
              }`}
            >
              <Shield className="w-3.5 h-3.5" />
              <span>Admin Panel</span>
            </button>
          )}

          {/* User Profile Avatar or Login Button */}
          {currentUser ? (
            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center space-x-2 p-1 rounded-full transition-all border ${
                activeTab === 'profile'
                  ? 'border-rose-500 ring-2 ring-rose-500/30'
                  : 'border-slate-700 hover:border-slate-500'
              }`}
            >
              <img
                src={getSafeAvatar(currentUser)}
                alt={currentUser.name}
                className="w-8 h-8 rounded-full object-cover border border-slate-700"
                onError={(e) => {
                  e.currentTarget.src = getSafeAvatar(currentUser);
                }}
              />
              <span className="hidden sm:inline-flex items-center gap-1 text-xs font-medium text-slate-200 pr-2">
                <span>{currentUser.name}</span>
                {currentUser.verified && <VerificationBadge size={14} />}
              </span>
            </button>
          ) : (
            <button
              onClick={onOpenAuth}
              className="flex items-center space-x-2 px-4 py-2 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-semibold shadow-md transition-all"
            >
              <LogIn className="w-4 h-4" />
              <span>Sign In / Register</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
