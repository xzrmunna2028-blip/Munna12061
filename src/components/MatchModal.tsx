import React, { useEffect } from 'react';
import confetti from 'canvas-confetti';
import { Heart, Sparkles, MessageCircle, X } from 'lucide-react';
import { User } from '../types';

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

  const DEFAULT_AVATAR = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
  const myAvatar = (currentUser.avatar && typeof currentUser.avatar === 'string' && !currentUser.avatar.includes('svg'))
    ? currentUser.avatar
    : (currentUser.photos?.[0] && !currentUser.photos[0].includes('svg') ? currentUser.photos[0] : DEFAULT_AVATAR);

  const targetAvatar = (matchedUser.avatar && typeof matchedUser.avatar === 'string' && !matchedUser.avatar.includes('svg'))
    ? matchedUser.avatar
    : (matchedUser.photos?.[0] && !matchedUser.photos[0].includes('svg') ? matchedUser.photos[0] : DEFAULT_AVATAR);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/90 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-sm bg-slate-900 border border-slate-800 rounded-3xl p-6 text-center text-white shadow-2xl overflow-hidden">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/30 mb-4 animate-bounce">
          <Sparkles className="w-6 h-6 text-white" />
        </div>

        <h2 className="text-2xl sm:text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-400 to-pink-400 bg-clip-text text-transparent mb-1">
          ম্যাচ হয়েছে! / It's a Match!
        </h2>
        <p className="text-xs text-slate-300 mb-6">
          আপনি এবং <strong className="text-rose-400">{matchedUser.name}</strong> একে অপরকে পছন্দ করেছেন!
        </p>

        {/* User Avatars Pair */}
        <div className="flex items-center justify-center space-x-[-16px] mb-6">
          <div className="flex flex-col items-center">
            <img
              src={myAvatar}
              alt={currentUser.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-rose-500 shadow-xl z-10"
            />
            <span className="text-[10px] text-slate-300 mt-1 font-semibold truncate max-w-[70px]">
              {currentUser.name}
            </span>
          </div>

          <div className="w-10 h-10 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg z-20 animate-pulse">
            <Heart className="w-5 h-5 fill-white" />
          </div>

          <div className="flex flex-col items-center">
            <img
              src={targetAvatar}
              alt={matchedUser.name}
              className="w-20 h-20 rounded-full object-cover border-4 border-pink-500 shadow-xl z-10"
            />
            <span className="text-[10px] text-slate-300 mt-1 font-semibold truncate max-w-[70px]">
              {matchedUser.name}
            </span>
          </div>
        </div>

        <div className="space-y-3">
          <button
            onClick={onStartChat}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/30 flex items-center justify-center space-x-2 transition-all transform active:scale-98"
          >
            <MessageCircle className="w-4 h-4" />
            <span>মেসেজ পাঠান / Send Message</span>
          </button>

          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold transition-colors"
          >
            আরও সোয়াইপ করুন / Keep Swiping
          </button>
        </div>

      </div>
    </div>
  );
};
