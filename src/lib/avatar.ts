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

  // 1. Direct user.avatar if valid
  if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '' && !user.avatar.includes('svg')) {
    if (user.id) saveUserAvatarLocally(user.id, user.avatar);
    return user.avatar;
  }

  // 2. First photo in user.photos array if valid
  if (user.photos && Array.isArray(user.photos) && user.photos.length > 0) {
    const firstPhoto = user.photos.find(p => p && typeof p === 'string' && p.trim() !== '' && !p.includes('svg'));
    if (firstPhoto) {
      if (user.id) saveUserAvatarLocally(user.id, firstPhoto);
      return firstPhoto;
    }
  }

  // 3. Any user.avatar even if SVG
  if (user.avatar && typeof user.avatar === 'string' && user.avatar.trim() !== '') {
    if (user.id) saveUserAvatarLocally(user.id, user.avatar);
    return user.avatar;
  }

  // 4. Cached localStorage avatar for user.id
  if (user.id && typeof window !== 'undefined') {
    try {
      const storedAvatar = localStorage.getItem(`user_avatar_${user.id}`);
      if (storedAvatar && storedAvatar.trim() !== '') {
        return storedAvatar;
      }
    } catch (_) {}
  }

  if (user.gender === 'male') {
    return MALE_AVATAR_FALLBACK;
  }

  return FEMALE_AVATAR_FALLBACK;
}

