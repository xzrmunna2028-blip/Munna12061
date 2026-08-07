import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, MessageCircle, X } from 'lucide-react';
import { User } from '../types';
import { getSafeAvatar } from '../lib/avatar';

interface MatchModalProps {
  matchedUser: User | null;
  currentUser: User;
  onClose: () => void;
  onStartChat: () => void;
}

export const MatchModal: React.FC<MatchModalProps> = ({
  matchedUser,
  currentUser,
  onClose,
  onStartChat,
}) => {
  useEffect(() => {
    if (matchedUser) {
      confetti({
        particleCount: 120,
        spread: 80,
        origin: { y: 0.6 },
        colors: ['#f43f5e', '#ec4899', '#f472b6', '#fb7185'],
      });
    }
  }, [matchedUser]);

  if (!matchedUser) return null;

  const myAvatar = getSafeAvatar(currentUser);
  const targetAvatar = getSafeAvatar(matchedUser);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-white shadow-2xl overflow-hidden">
        
        {/* Close Button */}
        <button
          type="button"
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition cursor-pointer"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Top Icon Badge */}
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4 animate-bounce">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        {/* English Title & Subtitle */}
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight bg-gradient-to-r from-rose-400 via-pink-400 to-purple-400 bg-clip-text text-transparent mb-1">
          It's a Match!
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          You and <strong className="text-rose-400 font-bold">{matchedUser.name}</strong> liked each other!
        </p>

        {/* User Avatars Comparison - Real Photos */}
        <div className="flex items-center justify-center space-x-[-12px] mb-6 py-2">
          {/* Current User */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={myAvatar}
                alt={currentUser.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-rose-500 shadow-xl"
                onError={(e) => {
                  e.currentTarget.src = getSafeAvatar(currentUser);
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-200 mt-2 truncate max-w-[85px]">
              You ({currentUser.name})
            </span>
          </div>

          {/* Heart Badge in Middle */}
          <div className="w-10 h-10 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 text-white flex items-center justify-center shadow-lg z-20 animate-pulse border-2 border-slate-900 shrink-0">
            <Heart className="w-5 h-5 fill-white text-white" />
          </div>

          {/* Matched Target User */}
          <div className="flex flex-col items-center">
            <div className="relative">
              <img
                src={targetAvatar}
                alt={matchedUser.name}
                className="w-20 h-20 rounded-full object-cover border-4 border-pink-500 shadow-xl"
                onError={(e) => {
                  e.currentTarget.src = getSafeAvatar(matchedUser);
                }}
              />
            </div>
            <span className="text-[11px] font-bold text-slate-200 mt-2 truncate max-w-[85px]">
              {matchedUser.name}
            </span>
          </div>
        </div>

        {/* Action Buttons in English */}
        <div className="space-y-2.5">
          <button
            type="button"
            onClick={onStartChat}
            className="w-full py-3 px-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center space-x-2 transition-all active:scale-98 cursor-pointer"
          >
            <MessageCircle className="w-4 h-4" />
            <span>Send Message</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors cursor-pointer"
          >
            Keep Swiping
          </button>
        </div>

      </div>
    </div>
  );
};

