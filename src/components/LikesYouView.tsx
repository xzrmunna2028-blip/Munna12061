import React from 'react';
import { Heart, X, CheckCircle2, MapPin, Sparkles } from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { User } from '../types';
import { getSafeAvatar } from '../lib/avatar';

interface LikesYouViewProps {
  likers: User[];
  onLikeBack: (user: User) => void;
  onPass: (user: User) => void;
}

export const LikesYouView: React.FC<LikesYouViewProps> = ({ likers, onLikeBack, onPass }) => {
  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-white pb-24 md:pb-12">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold tracking-tight flex items-center gap-2">
            <Heart className="w-6 h-6 text-rose-500 fill-rose-500" /> People Who Liked You
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            Like them back to instantly create a mutual match and start chatting!
          </p>
        </div>
        <span className="px-3 py-1 rounded-full text-xs font-bold bg-rose-500/20 text-rose-300 border border-rose-500/30">
          {likers.length} Interested
        </span>
      </div>

      {likers.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
          {likers.map((user) => (
            <div
              key={user.id}
              className="relative aspect-[3/4] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-xl group hover:border-rose-500/50 transition-all flex flex-col justify-end p-3"
            >
              <img
                src={getSafeAvatar(user)}
                alt={user.name}
                className="absolute inset-0 w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={(e) => {
                  e.currentTarget.src = getSafeAvatar(user);
                }}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent" />

              <div className="relative z-10">
                <h4 className="text-sm font-bold text-white flex items-center gap-1">
                  {user.name}, {user.age}
                  {user.verified && <VerificationBadge size={16} />}
                </h4>
                <p className="text-[10px] text-slate-300 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3 text-rose-400" /> {user.location}
                </p>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => onPass(user)}
                    className="flex-1 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-800 text-slate-300 text-xs font-semibold flex items-center justify-center"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                  <button
                    onClick={() => onLikeBack(user)}
                    className="flex-1 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/30 flex items-center justify-center gap-1"
                  >
                    <Heart className="w-3.5 h-3.5 fill-white" /> Like Back
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-16 bg-slate-900 border border-slate-800 rounded-3xl p-8">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <Sparkles className="w-8 h-8" />
          </div>
          <h3 className="text-lg font-bold text-white mb-2">No Pending Likes Yet</h3>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            Keep browsing and engaging on the Discover feed! New people will appear here as soon as they like your profile.
          </p>
        </div>
      )}
    </div>
  );
};
