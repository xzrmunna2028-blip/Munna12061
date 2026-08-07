import { User } from '../types';

export const FEMALE_AVATAR_FALLBACK = "https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80";
export const MALE_AVATAR_FALLBACK = "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80";

export function saveUserAvatarLocally(userId: string, avatarUrl: string) {
  if (!userId || !avatarUrl) return;
  try {
    localStorage.setItem(`user_avatar_${userId}`, avatarUrl);
  } catch (e) {
    console.warn('Failed to save avatar locally:', e);
  }
}

export function getSafeAvatar(user?: Partial<User> | null): string {
  if (!user) return FEMALE_AVATAR_FALLBACK;

  // 1. Check permanent localStorage override for user ID
  if (user.id && typeof window !== 'undefined') {
    try {
      const storedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
      if (storedAvatar && storedAvatar.trim() !== '') {
        return storedAvatar;
      }
    } catch (_) {}
  }

  // 2. Check user.avatar
  if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '') {
    if (user.id) saveUserAvatarLocally(user.id, user.avatar);
    return user.avatar;
  }

  // 3. Check user.photos
  if (user.photos && Array.isArray(user.photos) && user.photos.length > 0) {
    const firstPhoto = user.photos[0];
    if (firstPhoto && typeof firstPhoto === 'string' && firstPhoto.trim() !== '') {
      if (user.id) saveUserAvatarLocally(user.id, firstPhoto);
      return firstPhoto;
    }
  }

  if (user.gender === 'male') {
    return MALE_AVATAR_FALLBACK;
  }

  return FEMALE_AVATAR_FALLBACK;
}

