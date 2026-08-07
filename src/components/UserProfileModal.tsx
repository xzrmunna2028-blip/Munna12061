import React, { useState } from 'react';
import {
  X,
  MapPin,
  CheckCircle2,
  PhoneCall,
  Lock,
  Heart,
  Ban,
  ShieldAlert,
  Sparkles,
  UserCheck
} from 'lucide-react';
import { VerificationBadge } from './VerificationBadge';
import { User } from '../types';
import { getSafeAvatar } from '../lib/avatar';
import { maskPhoneNumber, maskEmail } from '../lib/contactUtils';

interface UserProfileModalProps {
  user: User | null;
  onClose: () => void;
  unlockedMap?: Record<string, string>;
  onOpenUnlockModal?: (targetUser: User) => void;
  onLike?: (targetUser: User) => void;
  onBlockUser?: (targetUser: User) => void;
  onUnblockUser?: (targetUser: User) => void;
  isBlocked?: boolean;
  onStartChat?: (targetUser: User) => void;
}

export const UserProfileModal: React.FC<UserProfileModalProps> = ({
  user,
  onClose,
  unlockedMap = {},
  onOpenUnlockModal,
  onLike,
  onBlockUser,
  onUnblockUser,
  isBlocked = false,
  onStartChat,
}) => {
  if (!user) return null;

  const [activePhotoIndex, setActivePhotoIndex] = useState(0);

  const mainAvatar = getSafeAvatar(user);
  const rawPhotos = (user.photos && user.photos.length > 0) ? user.photos : [mainAvatar];
  const allUserPhotos = Array.from(new Set([mainAvatar, ...rawPhotos])).filter(p => p && typeof p === 'string' && p.trim() !== '');

  const unlockedNum = unlockedMap[user.id];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl my-auto max-h-[92vh] flex flex-col">
        
        {/* Header Image / Cover Preview */}
        <div className="relative h-64 sm:h-80 bg-slate-950 shrink-0">
          <img
            src={allUserPhotos[activePhotoIndex] || mainAvatar}
            alt={user.name}
            className="w-full h-full object-cover"
            onError={(e) => {
              e.currentTarget.src = mainAvatar;
            }}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-slate-900/20 to-transparent" />

          {/* Close Button */}
          <button
            type="button"
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950 text-white backdrop-blur border border-slate-700 transition cursor-pointer z-10"
          >
            <X className="w-5 h-5" />
          </button>

          {/* Name & Basic Info Overlay */}
          <div className="absolute bottom-4 left-4 right-4 text-white">
            <div className="flex items-center space-x-2">
              <h2 className="text-2xl font-black">{user.name}, {user.age}</h2>
              {user.verified && <VerificationBadge size={22} className="shrink-0" />}
            </div>
            <div className="flex items-center space-x-3 text-xs text-slate-300 mt-1">
              <span className="flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {user.location || 'Dhaka, Bangladesh'}
              </span>
              <span>•</span>
              <span>{user.distanceKm || 2.5} km away</span>
              {user.isOnline && (
                <>
                  <span>•</span>
                  <span className="text-emerald-400 font-bold flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    Online
                  </span>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable Details Body */}
        <div className="p-5 overflow-y-auto space-y-5 flex-1 text-slate-200 text-xs">
          
          {/* Bio Section */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">About Me</h4>
            <p className="p-3.5 bg-slate-800/60 rounded-2xl border border-slate-700/70 text-slate-200 leading-relaxed text-xs">
              {user.bio || 'No bio added yet.'}
            </p>
          </div>

          {/* Comprehensive Personal & Background Details Table */}
          <div>
            <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">PERSONAL & BACKGROUND DETAILS</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5 bg-slate-800/60 p-3.5 rounded-2xl border border-slate-700/80">
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Religion</span>
                <span className="text-white font-extrabold">{user.religion || 'Islam'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Marital Status</span>
                <span className="text-white font-extrabold">{user.maritalStatus || 'Single'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Height</span>
                <span className="text-white font-extrabold">{user.height || "5'6\""}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Education Degree</span>
                <span className="text-white font-extrabold truncate block">{user.education || "Graduate"}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">School / College</span>
                <span className="text-white font-extrabold truncate block">{user.schoolCollege || 'Not specified'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Profession</span>
                <span className="text-white font-extrabold">{user.profession || 'Private Job'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">District & City</span>
                <span className="text-white font-extrabold">{user.divisionCity || user.location || 'Dhaka, Bangladesh'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Date of Birth</span>
                <span className="text-white font-extrabold">{user.dateOfBirth || '2003-08-07'} ({user.age} yrs)</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Relationship Goal</span>
                <span className="text-white font-extrabold capitalize">{user.relationshipStatus || user.lookingFor || 'Marriage'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Languages</span>
                <span className="text-white font-extrabold">{user.languages?.join(', ') || 'English, Bengali'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Smoking & Drinking</span>
                <span className="text-white font-extrabold">{user.smoking || 'Non-smoker'} • {user.drinking || 'Non-drinker'}</span>
              </div>
              <div className="bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">
                <span className="text-[10px] text-slate-400 block uppercase font-bold">User ID Number</span>
                <span className="text-rose-400 font-mono font-bold">#{user.userIdNumber || user.id.slice(0, 6)}</span>
              </div>
            </div>
          </div>

          {/* Interests Badges */}
          {user.interests && user.interests.length > 0 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Interests</h4>
              <div className="flex flex-wrap gap-1.5">
                {user.interests.map((interest, idx) => (
                  <span
                    key={idx}
                    className="px-3 py-1 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-semibold"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Photos Gallery */}
          {allUserPhotos.length > 1 && (
            <div>
              <h4 className="text-[11px] font-bold text-slate-400 uppercase tracking-wider mb-2">Photo Gallery ({allUserPhotos.length})</h4>
              <div className="flex space-x-2.5 overflow-x-auto pb-1">
                {allUserPhotos.map((photoUrl, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => setActivePhotoIndex(idx)}
                    className={`relative w-20 h-20 rounded-xl overflow-hidden shrink-0 border-2 transition ${
                      idx === activePhotoIndex ? 'border-amber-400 scale-105 shadow' : 'border-slate-800 opacity-70 hover:opacity-100'
                    }`}
                  >
                    <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Contact Number & Email Lock Section */}
          <div className="space-y-2">
            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <PhoneCall className="w-4 h-4" />
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">VERIFIED PHONE NUMBER</span>
                  {unlockedNum ? (
                    <span className="font-mono font-extrabold text-sm text-emerald-300 tracking-wider">
                      {unlockedNum}
                    </span>
                  ) : (
                    <span className="font-mono text-xs text-white font-bold tracking-wider">
                      {maskPhoneNumber(user.phone)}
                    </span>
                  )}
                </div>
              </div>

              {!unlockedNum && onOpenUnlockModal && (
                <button
                  type="button"
                  onClick={() => {
                    onClose();
                    onOpenUnlockModal(user);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow transition flex items-center gap-1 cursor-pointer shrink-0"
                >
                  <Lock className="w-3.5 h-3.5" /> Unlock Number
                </button>
              )}
            </div>

            <div className="p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between gap-3">
              <div className="flex items-center space-x-3">
                <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-400 flex items-center justify-center shrink-0 text-xs font-mono">
                  @
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">PRIMARY EMAIL ADDRESS</span>
                  <span className="font-mono text-xs text-slate-300">{maskEmail(user.email)}</span>
                </div>
              </div>
              <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-700 shrink-0">
                Account Email
              </span>
            </div>
          </div>

        </div>

        {/* Modal Action Buttons Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2 shrink-0">
          {isBlocked ? (
            onUnblockUser && (
              <button
                type="button"
                onClick={() => {
                  onUnblockUser(user);
                }}
                className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1.5 cursor-pointer shadow-lg active:scale-95 transition"
              >
                <UserCheck className="w-4 h-4" /> Unblock User
              </button>
            )
          ) : (
            onBlockUser && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onBlockUser(user);
                }}
                className="px-3.5 py-2 rounded-xl bg-slate-900 border border-rose-500/30 text-rose-400 hover:bg-rose-950 text-xs font-bold flex items-center gap-1 cursor-pointer"
              >
                <Ban className="w-3.5 h-3.5" /> Block User
              </button>
            )
          )}

          <div className="flex items-center gap-2 ml-auto">
            {onStartChat && !isBlocked && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onStartChat(user);
                }}
                className="px-4 py-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 hover:from-teal-600 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Sparkles className="w-4 h-4" /> Start Chat
              </button>
            )}

            {onLike && !isBlocked && (
              <button
                type="button"
                onClick={() => {
                  onClose();
                  onLike(user);
                }}
                className="px-5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs shadow-lg flex items-center gap-1.5 cursor-pointer"
              >
                <Heart className="w-4 h-4 fill-white" /> Like / Connect
              </button>
            )}
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold hover:bg-slate-700 cursor-pointer"
            >
              Close
            </button>
          </div>
        </div>

      </div>
    </div>
  );
};
