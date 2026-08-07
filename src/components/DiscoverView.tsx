import React, { useState, useEffect, useRef, useMemo } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  Heart,
  X,
  Sparkles,
  MapPin,
  Filter,
  CheckCircle2,
  SlidersHorizontal,
  ChevronLeft,
  ChevronRight,
  ShieldAlert,
  Ban,
  Info,
  PhoneCall,
  Lock,
  Plus,
  Eye,
  MessageCircle,
  Image as ImageIcon,
  Send,
  Trash2,
  Video,
  Film,
  UploadCloud,
  Loader2,
  Pencil,
  Smile,
  Phone,
  Type,
  Maximize2,
  Minimize2,
  Pause,
  Play
} from 'lucide-react';
import { User, SearchFilters, Gender, Story, StoryComment } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { DEFAULT_AVATAR_PLACEHOLDER } from '../data/seedData';
import { getSafeAvatar } from '../lib/avatar';
import { maskPhoneNumber, maskEmail } from '../lib/contactUtils';

interface UserStoryGroup {
  userId: string;
  userName: string;
  userAvatar: string;
  stories: Story[];
}

interface DiscoverViewProps {
  profiles: User[];
  currentUser?: User;
  unlockedMap?: Record<string, string>;
  onOpenUnlockModal?: (targetUser: User) => void;
  onLike: (user: User) => void;
  onPass: (user: User) => void;
  onReportUser: (user: User) => void;
  onBlockUser: (user: User) => void;
  filters: SearchFilters;
  onApplyFilters: (filters: SearchFilters) => void;
  popularInterests: string[];
  onRegisterLikeCurrent?: (fn: () => void) => void;
}

export const DiscoverView: React.FC<DiscoverViewProps> = ({
  profiles,
  currentUser,
  unlockedMap = {},
  onOpenUnlockModal,
  onLike,
  onPass,
  onReportUser,
  onBlockUser,
  filters,
  onApplyFilters,
  popularInterests,
  onRegisterLikeCurrent,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedUserModal, setSelectedUserModal] = useState<User | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [showFilterDrawer, setShowFilterDrawer] = useState(false);

  // Swiped / Acted profile IDs tracking so profiles never reappear in discover after swipe/like
  const [swipedUserIds, setSwipedUserIds] = useState<string[]>(() => {
    try {
      const key = `heartsync_swiped_${currentUser?.id || 'guest'}`;
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : [];
    } catch (_) {
      return [];
    }
  });

  const addSwipedUser = (userId: string) => {
    if (!userId) return;
    setSwipedUserIds((prev) => {
      if (prev.includes(userId)) return prev;
      const updated = [...prev, userId];
      try {
        const key = `heartsync_swiped_${currentUser?.id || 'guest'}`;
        localStorage.setItem(key, JSON.stringify(updated));
      } catch (_) {}
      return updated;
    });
  };

  // Filter State
  const [minAge, setMinAge] = useState(filters.minAge || 18);
  const [maxAge, setMaxAge] = useState(filters.maxAge || 75);
  const [gender, setGender] = useState<'all' | Gender>(filters.gender || 'all');
  const [maritalFilter, setMaritalFilter] = useState<string>('all');
  const [religionFilter, setReligionFilter] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [maxDistanceKm, setMaxDistanceKm] = useState(filters.maxDistanceKm);
  const [selectedInterests, setSelectedInterests] = useState<string[]>(filters.interests);

  // Crush Toast state
  const [crushToast, setCrushToast] = useState<string | null>(null);

  // Discovery Sub-Pills Category
  const [activeSubPill, setActiveSubPill] = useState<'Popular' | 'Today' | 'For You' | 'Top Picks'>('Popular');

  // Stories State
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [stories, setStories] = useState<Story[]>([]);
  const [activeGroupIndex, setActiveGroupIndex] = useState<number | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState<number>(0);
  const [showCreateStoryModal, setShowCreateStoryModal] = useState(false);
  const [storyImageUrl, setStoryImageUrl] = useState('');
  const [storyMediaType, setStoryMediaType] = useState<'image' | 'video'>('image');
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isUploadingMedia, setIsUploadingMedia] = useState(false);
  const [publishProgress, setPublishProgress] = useState(0);
  const [storyCaption, setStoryCaption] = useState('');
  const [storyPosting, setStoryPosting] = useState(false);
  const [storyCommentText, setStoryCommentText] = useState('');
  const [storyCommentError, setStoryCommentError] = useState<string | null>(null);
  const [storyCommentSuccess, setStoryCommentSuccess] = useState<string | null>(null);
  const [showViewersModal, setShowViewersModal] = useState(false);

  // Story Customization & Playback State
  const [storyObjectFit, setStoryObjectFit] = useState<'cover' | 'contain'>('cover');
  const [storyLocation, setStoryLocation] = useState('');
  const [storyPhone, setStoryPhone] = useState('');
  const [storyOverlayText, setStoryOverlayText] = useState('');
  const [selectedEmojis, setSelectedEmojis] = useState<string[]>([]);
  const [showEditorTools, setShowEditorTools] = useState(false);

  // Fullscreen Viewer Timer & Hold-to-Pause
  const [isStoryPaused, setIsStoryPaused] = useState(false);
  const [storyProgress, setStoryProgress] = useState(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  // Group stories by userId with real-time user avatar & name sync
  const userStoryGroups = useMemo<UserStoryGroup[]>(() => {
    const map = new Map<string, UserStoryGroup>();
    const sorted = [...stories].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    for (const st of sorted) {
      const foundUser = (currentUser && currentUser.id === st.userId)
        ? currentUser
        : profiles.find(p => p.id === st.userId);

      const latestName = foundUser?.name || st.userName || 'Member';
      let latestAvatar = st.userAvatar;
      if (foundUser) {
        if (foundUser.avatar && !foundUser.avatar.includes('svg')) {
          latestAvatar = foundUser.avatar;
        } else if (foundUser.photos && foundUser.photos.length > 0 && !foundUser.photos[0].includes('svg')) {
          latestAvatar = foundUser.photos[0];
        } else if (foundUser.avatar) {
          latestAvatar = foundUser.avatar;
        }
      }

      if (!map.has(st.userId)) {
        map.set(st.userId, {
          userId: st.userId,
          userName: latestName,
          userAvatar: latestAvatar || DEFAULT_AVATAR_PLACEHOLDER,
          stories: [st],
        });
      } else {
        const group = map.get(st.userId)!;
        group.stories.push(st);
        if (latestAvatar) group.userAvatar = latestAvatar;
        if (latestName) group.userName = latestName;
      }
    }
    return Array.from(map.values());
  }, [stories, profiles, currentUser]);

  const currentUserStoryGroup = useMemo(() => {
    if (!currentUser) return null;
    return userStoryGroups.find(g => g.userId === currentUser.id) || null;
  }, [userStoryGroups, currentUser]);

  const otherUserStoryGroups = useMemo(() => {
    if (!currentUser) return userStoryGroups;
    return userStoryGroups.filter(g => g.userId !== currentUser.id);
  }, [userStoryGroups, currentUser]);

  const activeGroup = activeGroupIndex !== null && userStoryGroups[activeGroupIndex] ? userStoryGroups[activeGroupIndex] : null;
  const activeStoryModal = activeGroup && activeGroup.stories[activeStoryIndex] ? activeGroup.stories[activeStoryIndex] : null;

  // Fetch active stories on mount
  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        const data = await res.json();
        setStories(data.stories || []);
      }
    } catch (err) {
      console.error('Error fetching stories:', err);
    }
  };

  // Filter profiles based on Sub-Pill selection with real-time search & criteria filter
  const getSubPillFilteredProfiles = () => {
    let list = profiles.filter(
      (u) => u.id && u.id !== currentUser?.id && !swipedUserIds.includes(u.id)
    );

    // 1. Search Query (Name, Username, ID, Location, Profession, Education, Bio)
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase().trim();
      list = list.filter((u) => {
        const nameMatch = u.name?.toLowerCase().includes(q);
        const usernameMatch = u.username?.toLowerCase().includes(q);
        const idMatch = u.userIdNumber?.toLowerCase().includes(q) || u.id?.toLowerCase().includes(q);
        const locMatch = u.location?.toLowerCase().includes(q) || u.divisionCity?.toLowerCase().includes(q);
        const profMatch = u.profession?.toLowerCase().includes(q);
        const eduMatch = u.education?.toLowerCase().includes(q) || u.schoolCollege?.toLowerCase().includes(q);
        const relMatch = u.religion?.toLowerCase().includes(q);
        const bioMatch = u.bio?.toLowerCase().includes(q);
        return nameMatch || usernameMatch || idMatch || locMatch || profMatch || eduMatch || relMatch || bioMatch;
      });
    }

    // 2. Gender Filter (female, male, all)
    if (gender !== 'all') {
      list = list.filter((u) => u.gender === gender);
    }

    // 3. Age Range Filter
    list = list.filter((u) => {
      const userAge = u.age || 22;
      return userAge >= minAge && userAge <= maxAge;
    });

    // 4. Marital Status Filter
    if (maritalFilter !== 'all') {
      list = list.filter((u) => {
        if (!u.maritalStatus) return maritalFilter === 'Single';
        return u.maritalStatus.toLowerCase() === maritalFilter.toLowerCase();
      });
    }

    // 5. Religion Filter
    if (religionFilter !== 'all') {
      list = list.filter((u) => {
        if (!u.religion) return religionFilter === 'Islam';
        return u.religion.toLowerCase() === religionFilter.toLowerCase();
      });
    }

    // 6. Sub-Pills
    if (activeSubPill === 'Today') {
      return list.filter((u) => u.isOnline || (u.lastActive && u.lastActive.toLowerCase().includes('active')) || u.verified);
    }
    if (activeSubPill === 'For You') {
      return list.filter((u) => (u.profileCompletionPercentage || 0) >= 70 || (u.interests && u.interests.length > 0));
    }
    if (activeSubPill === 'Top Picks') {
      return list.filter((u) => u.verified || (u.photos && u.photos.length >= 2));
    }

    return list;
  };

  const filteredProfiles = getSubPillFilteredProfiles();

  // Adjust index if out of bounds
  useEffect(() => {
    if (currentIndex >= filteredProfiles.length && filteredProfiles.length > 0) {
      setCurrentIndex(0);
    }
  }, [filteredProfiles.length, currentIndex]);

  const currentProfile = filteredProfiles[currentIndex];

  // Register like function for external trigger (e.g. bottom navigation heart button)
  useEffect(() => {
    if (onRegisterLikeCurrent) {
      onRegisterLikeCurrent(() => {
        if (currentProfile) {
          handleAction('like');
        }
      });
    }
  }, [currentProfile, onRegisterLikeCurrent]);

  const cardPhotos = useMemo(() => {
    if (!currentProfile) return [];
    const mainAvatar = currentProfile.avatar;
    const list = currentProfile.photos || [];
    if (mainAvatar) {
      return [mainAvatar, ...list.filter(p => p !== mainAvatar)];
    }
    return list.length > 0 ? list : ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'];
  }, [currentProfile]);

  const handleAction = (action: 'like' | 'pass') => {
    if (!currentProfile) return;
    if (action === 'like') onLike(currentProfile);
    else onPass(currentProfile);

    addSwipedUser(currentProfile.id);

    if (currentIndex >= filteredProfiles.length - 1) {
      setCurrentIndex(0);
    }
    setActivePhotoIndex(0);
  };

  const handleCrushAction = () => {
    if (!currentProfile) return;
    setCrushToast(`Sent a Crush to ${currentProfile.name}! 💘✨`);
    setTimeout(() => setCrushToast(null), 3000);
    handleAction('like');
  };

  const handleNextProfile = () => {
    if (filteredProfiles.length === 0) return;
    if (currentIndex < filteredProfiles.length - 1) {
      setCurrentIndex((prev) => prev + 1);
    } else {
      setCurrentIndex(0);
    }
    setActivePhotoIndex(0);
  };

  const handlePrevProfile = () => {
    if (filteredProfiles.length === 0) return;
    if (currentIndex > 0) {
      setCurrentIndex((prev) => prev - 1);
    } else {
      setCurrentIndex(filteredProfiles.length - 1);
    }
    setActivePhotoIndex(0);
  };

  const handleInterestToggle = (interest: string) => {
    if (selectedInterests.includes(interest)) {
      setSelectedInterests(selectedInterests.filter((i) => i !== interest));
    } else {
      setSelectedInterests([...selectedInterests, interest]);
    }
  };

  const submitFilters = () => {
    onApplyFilters({
      minAge,
      maxAge,
      gender,
      maxDistanceKm,
      interests: selectedInterests,
      searchQuery,
    });
    setCurrentIndex(0);
    setShowFilterDrawer(false);
  };

  const resetFilters = () => {
    setMinAge(18);
    setMaxAge(75);
    setGender('all');
    setMaritalFilter('all');
    setReligionFilter('all');
    setSearchQuery('');
    setMaxDistanceKm(50);
    setSelectedInterests([]);
    onApplyFilters({
      minAge: 18,
      maxAge: 75,
      gender: 'all',
      maxDistanceKm: 50,
      interests: [],
      searchQuery: '',
    });
    setCurrentIndex(0);
  };

  // Story Creation (Gallery Upload Photos/Videos & Progress Bar)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isVideo = file.type.startsWith('video');
    setStoryMediaType(isVideo ? 'video' : 'image');
    setIsUploadingMedia(true);
    setUploadProgress(10);

    const progressTimer = setInterval(() => {
      setUploadProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressTimer);
          return 90;
        }
        return prev + Math.floor(Math.random() * 18) + 12;
      });
    }, 100);

    const reader = new FileReader();
    reader.onloadend = () => {
      clearInterval(progressTimer);
      setUploadProgress(100);
      setTimeout(() => {
        setStoryImageUrl(reader.result as string);
        setIsUploadingMedia(false);
        setUploadProgress(0);
      }, 350);
    };
    reader.readAsDataURL(file);
  };

  const handlePostStory = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!storyImageUrl || storyPosting) return;

    setStoryPosting(true);
    setPublishProgress(15);

    const publishTimer = setInterval(() => {
      setPublishProgress((prev) => {
        if (prev >= 95) {
          clearInterval(publishTimer);
          return 95;
        }
        return prev + 20;
      });
    }, 120);

    try {
      const res = await fetch('/api/stories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          imageUrl: storyImageUrl,
          caption: storyCaption,
          mediaType: storyMediaType,
          location: storyLocation,
          phone: storyPhone,
          customOverlayText: storyOverlayText,
          emojis: selectedEmojis,
          objectFit: storyObjectFit,
        }),
      });

      clearInterval(publishTimer);
      setPublishProgress(100);

      if (res.ok) {
        setTimeout(() => {
          setStoryImageUrl('');
          setStoryCaption('');
          setStoryLocation('');
          setStoryPhone('');
          setStoryOverlayText('');
          setSelectedEmojis([]);
          setStoryObjectFit('cover');
          setShowEditorTools(false);
          setShowCreateStoryModal(false);
          setPublishProgress(0);
          fetchStories();
        }, 400);
      }
    } catch (err) {
      console.error(err);
      clearInterval(publishTimer);
    } finally {
      setStoryPosting(false);
    }
  };

  // Helper to check if story item is a video
  const isVideoItem = (story: Story) => {
    return (
      story.mediaType === 'video' ||
      story.imageUrl?.startsWith('data:video') ||
      /\.(mp4|webm|mov|ogg|m4v)($|\?)/i.test(story.imageUrl || '')
    );
  };

  // View User Story Group
  const handleOpenUserStories = (userId: string) => {
    const groupIdx = userStoryGroups.findIndex(g => g.userId === userId);
    if (groupIdx !== -1) {
      setActiveGroupIndex(groupIdx);
      setActiveStoryIndex(0);
      setStoryCommentText('');
      setStoryCommentError(null);
      setStoryCommentSuccess(null);
      setShowViewersModal(false);
      setStoryProgress(0);
      setIsStoryPaused(false);

      const firstStory = userStoryGroups[groupIdx].stories[0];
      if (firstStory) {
        trackStoryView(firstStory.id);
      }
    }
  };

  const trackStoryView = async (storyId: string) => {
    try {
      await fetch(`/api/stories/${storyId}/view`, { method: 'POST' });
      fetchStories();
    } catch (err) {
      console.error(err);
    }
  };

  const handleNextStory = () => {
    if (!activeGroup) return;
    setStoryProgress(0);
    setIsStoryPaused(false);
    if (activeStoryIndex < activeGroup.stories.length - 1) {
      const nextIdx = activeStoryIndex + 1;
      setActiveStoryIndex(nextIdx);
      trackStoryView(activeGroup.stories[nextIdx].id);
    } else if (activeGroupIndex !== null && activeGroupIndex < userStoryGroups.length - 1) {
      const nextGroupIdx = activeGroupIndex + 1;
      setActiveGroupIndex(nextGroupIdx);
      setActiveStoryIndex(0);
      trackStoryView(userStoryGroups[nextGroupIdx].stories[0].id);
    } else {
      setActiveGroupIndex(null);
      setActiveStoryIndex(0);
    }
  };

  const handlePrevStory = () => {
    if (!activeGroup) return;
    setStoryProgress(0);
    setIsStoryPaused(false);
    if (activeStoryIndex > 0) {
      const prevIdx = activeStoryIndex - 1;
      setActiveStoryIndex(prevIdx);
      trackStoryView(activeGroup.stories[prevIdx].id);
    } else if (activeGroupIndex !== null && activeGroupIndex > 0) {
      const prevGroupIdx = activeGroupIndex - 1;
      const prevGroup = userStoryGroups[prevGroupIdx];
      setActiveGroupIndex(prevGroupIdx);
      setActiveStoryIndex(prevGroup.stories.length - 1);
      trackStoryView(prevGroup.stories[prevGroup.stories.length - 1].id);
    } else {
      setActiveStoryIndex(0);
    }
  };

  // Reset progress bar on active story modal change
  useEffect(() => {
    setStoryProgress(0);
    setIsStoryPaused(false);
  }, [activeGroupIndex, activeStoryIndex]);

  // Auto-play story timer (5.5s per image story with smooth progress bar)
  useEffect(() => {
    if (!activeStoryModal) return;
    if (isStoryPaused) return;

    if (!isVideoItem(activeStoryModal)) {
      const interval = setInterval(() => {
        setStoryProgress((prev) => {
          if (prev >= 100) {
            clearInterval(interval);
            handleNextStory();
            return 100;
          }
          return prev + (100 / 55); // ~5.5s total duration
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [activeGroupIndex, activeStoryIndex, activeStoryModal?.id, isStoryPaused]);

  // Touch and Mouse hold-to-pause handlers
  const handleHoldStart = () => {
    setIsStoryPaused(true);
    if (videoRef.current) {
      videoRef.current.pause();
    }
  };

  const handleHoldEnd = () => {
    setIsStoryPaused(false);
    if (videoRef.current) {
      videoRef.current.play().catch(() => {});
    }
  };

  // Story Reaction ❤️
  const handleReactToStory = async () => {
    if (!activeStoryModal) return;
    try {
      const res = await fetch(`/api/stories/${activeStoryModal.id}/react`, { method: 'POST' });
      if (res.ok) {
        setStoryCommentSuccess('Love reaction and match request sent directly to inbox! ❤️');
        fetchStories();
        setTimeout(() => setStoryCommentSuccess(null), 3500);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Delete Story (Creator or Admin)
  const handleDeleteActiveStory = async () => {
    if (!activeStoryModal) return;
    if (!window.confirm('Are you sure you want to delete this story?')) return;
    try {
      const res = await fetch(`/api/stories/${activeStoryModal.id}`, { method: 'DELETE' });
      if (res.ok) {
        await fetchStories();
        if (activeGroup && activeGroup.stories.length > 1) {
          if (activeStoryIndex >= activeGroup.stories.length - 1) {
            setActiveStoryIndex(Math.max(0, activeStoryIndex - 1));
          }
        } else {
          setActiveGroupIndex(null);
          setActiveStoryIndex(0);
        }
      }
    } catch (err) {
      console.error('Failed to delete story:', err);
    }
  };

  // Story Comment (Direct Message to Inbox with 1 comment limit)
  const handleSendStoryComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeStoryModal || !storyCommentText.trim()) return;

    setStoryCommentError(null);
    setStoryCommentSuccess(null);

    try {
      const res = await fetch(`/api/stories/${activeStoryModal.id}/comment`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: storyCommentText.trim() }),
      });

      const data = await res.json();

      if (!res.ok) {
        setStoryCommentError(data.error || 'Only 1 comment allowed per story.');
      } else {
        setStoryCommentText('');
        setStoryCommentSuccess('Comment sent directly to member inbox! 💬');
        fetchStories();
        setTimeout(() => setStoryCommentSuccess(null), 4000);
      }
    } catch (err) {
      console.error(err);
      setStoryCommentError('Failed to send story comment.');
    }
  };

  // Preset gallery photos for story creation
  const SAMPLE_PRESETS: string[] = [];

  return (
    <div className="max-w-4xl mx-auto px-4 py-4 text-white pb-24 md:pb-12 space-y-4">
      
      {/* Crush Toast Notification */}
      {crushToast && (
        <div className="fixed top-16 left-1/2 -translate-x-1/2 z-50 px-5 py-2.5 rounded-full bg-gradient-to-r from-purple-600 via-pink-600 to-rose-600 text-white font-bold text-xs shadow-2xl shadow-purple-500/50 animate-bounce flex items-center gap-2 border border-purple-400/50">
          <Sparkles className="w-4 h-4 text-amber-300 fill-amber-300" />
          <span>{crushToast}</span>
        </div>
      )}
      
      {/* Top Header Row: Clean title and Advanced filter button */}
      <div className="flex items-center justify-between px-1 py-1">
        <div className="flex items-center space-x-2">
          <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-md shadow-rose-500/30">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-base font-extrabold tracking-tight text-white">
            Discover Matches
          </h1>
        </div>

        {/* Filters Drawer Button with active status indicator */}
        <button
          onClick={() => setShowFilterDrawer(true)}
          className="relative flex items-center space-x-1.5 px-3.5 py-1.5 rounded-xl bg-slate-800/90 hover:bg-slate-700 border border-slate-700/80 text-xs font-bold text-slate-200 transition-all shadow-sm cursor-pointer active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 text-rose-400" />
          <span>Advanced</span>
          {(searchQuery || gender !== 'all' || maritalFilter !== 'all' || religionFilter !== 'all' || minAge > 18 || maxAge < 75 || selectedInterests.length > 0) && (
            <span className="w-2 h-2 rounded-full bg-rose-500 absolute -top-0.5 -right-0.5 ring-2 ring-slate-950 animate-pulse" />
          )}
        </button>
      </div>

      {/* Stories Row: Animated rotating gradient circle around story avatars */}
      <div className="flex items-center space-x-3 overflow-x-auto pb-2 no-scrollbar bg-slate-900/40 p-2.5 rounded-2xl border border-slate-800/60">
        
        {/* Your Story Button */}
        <div className="flex flex-col items-center flex-shrink-0 group">
          <div
            onClick={() => {
              if (currentUserStoryGroup) {
                handleOpenUserStories(currentUser!.id);
              } else {
                setShowCreateStoryModal(true);
              }
            }}
            className="relative w-14 h-14 rounded-full p-[2px] cursor-pointer group-hover:scale-105 transition-transform"
          >
            <div className={`w-full h-full rounded-full p-[2px] ${
              currentUserStoryGroup
                ? 'bg-gradient-to-tr from-pink-500 via-rose-500 to-purple-600 shadow-lg shadow-rose-500/30'
                : 'bg-slate-700'
            }`}>
              <img
                src={getSafeAvatar(currentUser)}
                alt="Your Story"
                className="w-full h-full rounded-full object-cover border-2 border-slate-900 bg-slate-800"
                onError={(e) => {
                  e.currentTarget.src = getSafeAvatar(currentUser);
                }}
              />
            </div>

            <button
              onClick={(e) => {
                e.stopPropagation();
                setShowCreateStoryModal(true);
              }}
              className="absolute bottom-0 right-0 w-5 h-5 bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 rounded-full text-white text-xs font-bold flex items-center justify-center border-2 border-slate-900 shadow transition-transform active:scale-90"
              title="Add new story"
            >
              +
            </button>
          </div>
          <span className="text-[11px] text-slate-200 mt-1 font-semibold truncate max-w-[68px] text-center">
            {currentUserStoryGroup ? (currentUser?.name || 'Your Story') : 'Your Story'}
          </span>
        </div>

        {/* Other Members' Stories - Exactly ONE circle per user! */}
        {otherUserStoryGroups.map((group) => {
          const hasMultiple = group.stories.length > 1;
          const hasVideo = group.stories.some(s => isVideoItem(s));

          return (
            <div
              key={group.userId}
              onClick={() => handleOpenUserStories(group.userId)}
              className="flex flex-col items-center flex-shrink-0 cursor-pointer group"
            >
              <div className="relative w-14 h-14 rounded-full p-[3px] flex items-center justify-center group-hover:scale-105 transition-transform shadow-lg shadow-pink-500/20">
                <div className="absolute inset-0 rounded-full bg-gradient-to-r from-pink-500 via-rose-500 to-purple-600 animate-[spin_4s_linear_infinite]" />
                <img
                  src={group.userAvatar && !group.userAvatar.includes('svg') ? group.userAvatar : getSafeAvatar({ name: group.userName })}
                  alt={group.userName}
                  className="relative z-10 w-full h-full rounded-full object-cover border-2 border-slate-900 bg-slate-800"
                  onError={(e) => {
                    e.currentTarget.src = getSafeAvatar({ name: group.userName });
                  }}
                />
                {hasVideo ? (
                  <span className="absolute bottom-0 right-0 z-20 w-4 h-4 bg-purple-600 rounded-full text-white flex items-center justify-center border border-slate-900 shadow text-[9px]">
                    ▶
                  </span>
                ) : hasMultiple ? (
                  <span className="absolute bottom-0 right-0 z-20 px-1.5 py-0.5 bg-rose-500 rounded-full text-white text-[9px] font-bold border border-slate-900 shadow">
                    {group.stories.length}
                  </span>
                ) : null}
              </div>
              <span className="text-[11px] text-slate-200 mt-1 font-semibold truncate max-w-[68px] text-center">
                {group.userName}
              </span>
            </div>
          );
        })}

        {stories.length === 0 && (
          <span className="text-xs text-slate-500 italic pl-2">
            No member stories yet. Be the first to share a story!
          </span>
        )}
      </div>

      {/* Category Sub-Pills Selector */}
      <div className="flex items-center space-x-2 overflow-x-auto pb-1 no-scrollbar">
        {[
          { id: 'Popular', label: 'Popular', icon: '🔥' },
          { id: 'Today', label: 'Today', icon: '⚡' },
          { id: 'For You', label: 'For You', icon: '✨' },
          { id: 'Top Picks', label: 'Top Picks', icon: '👑' },
        ].map((pill) => {
          const isActive = activeSubPill === pill.id;
          return (
            <button
              key={pill.id}
              onClick={() => {
                setActiveSubPill(pill.id as any);
                setCurrentIndex(0);
              }}
              className={`flex items-center space-x-1.5 px-4 py-1.5 rounded-full text-xs font-bold transition-all flex-shrink-0 cursor-pointer ${
                isActive
                  ? 'bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-lg shadow-pink-500/40 ring-2 ring-pink-400/40 scale-105'
                  : 'bg-slate-800/80 hover:bg-slate-700/90 text-slate-300 border border-slate-700/80 hover:text-white'
              }`}
            >
              <span>{pill.icon}</span>
              <span>{pill.label}</span>
            </button>
          );
        })}
      </div>

      {/* MAIN PROFILE CARD AREA WITH NAVIGATION ARROWS */}
      <div className="relative flex items-center justify-center w-full min-h-[500px] sm:min-h-[560px]">
        
        {/* LEFT NAVIGATION ARROW */}
        <button
          onClick={handlePrevProfile}
          className="absolute left-0 sm:-left-3 z-30 p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Previous Profile"
        >
          <ChevronLeft className="w-6 h-6 text-rose-400" />
        </button>

        {/* RIGHT NAVIGATION ARROW */}
        <button
          onClick={handleNextProfile}
          className="absolute right-0 sm:-right-3 z-30 p-3 rounded-full bg-slate-900/90 hover:bg-slate-800 border border-slate-700 text-white shadow-2xl hover:scale-110 active:scale-95 transition-all"
          title="Next Profile"
        >
          <ChevronRight className="w-6 h-6 text-rose-400" />
        </button>

        {/* Profile Card Container */}
        {currentProfile ? (
          <div className="relative w-full max-w-sm h-[520px] sm:h-[580px] rounded-[32px] overflow-hidden shadow-2xl bg-gradient-to-b from-slate-900 via-slate-900 to-slate-950 border border-slate-800/90 group transition-all">
            
            {/* Top Photo Segment Progress Bar */}
            <div className="absolute top-3 left-4 right-4 z-20 flex space-x-1.5">
              {cardPhotos.map((_, i) => (
                <div
                  key={i}
                  className={`h-1 flex-1 rounded-full transition-all ${
                    i === activePhotoIndex ? 'bg-white shadow' : 'bg-white/40'
                  }`}
                />
              ))}
            </div>

            {/* Profile Photo */}
            <img
              src={
                cardPhotos[activePhotoIndex] && !cardPhotos[activePhotoIndex].includes('svg')
                  ? cardPhotos[activePhotoIndex]
                  : getSafeAvatar(currentProfile)
              }
              alt={currentProfile.name}
              className="w-full h-full object-cover transition-all duration-300"
              onError={(e) => {
                e.currentTarget.src = getSafeAvatar(currentProfile);
              }}
            />

            {/* Left/Right Invisible Photo Taps */}
            {cardPhotos.length > 1 && (
              <>
                <button
                  onClick={() => setActivePhotoIndex((prev) => Math.max(0, prev - 1))}
                  className="absolute left-0 top-0 bottom-0 w-1/3 z-10 opacity-0 cursor-pointer"
                />
                <button
                  onClick={() =>
                    setActivePhotoIndex((prev) =>
                      Math.min(cardPhotos.length - 1, prev + 1)
                    )
                  }
                  className="absolute right-0 top-0 bottom-0 w-1/3 z-10 opacity-0 cursor-pointer"
                />
              </>
            )}

            {/* Bottom Details Overlay */}
            <div className="absolute inset-x-0 bottom-0 z-20 bg-gradient-to-t from-slate-950 via-slate-950/85 to-transparent pt-16 p-5 flex flex-col justify-end">
              <div className="flex items-center space-x-2">
                <h3 className="text-2xl font-extrabold text-white tracking-tight">
                  {currentProfile.name}, {currentProfile.age}
                </h3>
                {currentProfile.verified && (
                  <VerificationBadge size={22} className="shrink-0" />
                )}
                
                {/* YELLOW MARKED BUTTON (i icon): Triggers Report Modal to report member */}
                <button
                  onClick={() => onReportUser(currentProfile)}
                  className="p-1.5 rounded-full bg-amber-500/20 hover:bg-amber-500/40 text-amber-300 hover:text-amber-200 border border-amber-500/40 shadow transition-colors"
                  title="Report Profile / রিপোর্ট করুন"
                >
                  <ShieldAlert className="w-4 h-4 text-amber-300" />
                </button>
              </div>

              <p className="text-xs text-slate-300 mt-1 flex items-center gap-1 font-medium">
                <MapPin className="w-3.5 h-3.5 text-rose-400" />
                {currentProfile.location} • {currentProfile.distanceKm} km away
              </p>

              {currentProfile.profession && (
                <p className="text-[11px] text-slate-400 mt-1 truncate">
                  💼 {currentProfile.profession}
                </p>
              )}
            </div>

            {/* RIGHT SIDE FLOATING ACTION BUTTONS STACK */}
            <div className="absolute right-4 bottom-6 z-30 flex flex-col items-center space-y-3">
              {/* Like Button */}
              <button
                onClick={() => handleAction('like')}
                className="w-12 h-12 rounded-full bg-gradient-to-tr from-rose-500 via-pink-500 to-purple-600 text-white flex items-center justify-center shadow-lg shadow-pink-500/40 hover:scale-110 active:scale-95 transition-transform"
                title="Like Profile (লাইক)"
              >
                <Heart className="w-6 h-6 fill-white" />
              </button>

              {/* RED MARKED BUTTON (Sparkles icon button): Triggers Full Profile Details Modal */}
              <button
                onClick={() => setSelectedUserModal(currentProfile)}
                className="w-10 h-10 rounded-full bg-gradient-to-tr from-purple-600 to-indigo-600 text-amber-300 border border-purple-400/50 flex items-center justify-center shadow-lg shadow-purple-500/30 hover:scale-110 active:scale-95 transition-transform"
                title="View Full Profile Details / সকল ডিটেলস দেখুন"
              >
                <Sparkles className="w-5 h-5 text-amber-300 fill-amber-300" />
              </button>

              {/* Pass Button */}
              <button
                onClick={() => handleAction('pass')}
                className="w-10 h-10 rounded-full bg-slate-900/90 text-slate-300 hover:text-rose-400 border border-slate-700 flex items-center justify-center shadow-md hover:scale-110 active:scale-95 transition-transform"
                title="Pass (ক্রস)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

          </div>
        ) : (
          <div className="w-full max-w-sm p-8 text-center bg-slate-900 border border-slate-800 rounded-3xl shadow-xl space-y-3">
            <Sparkles className="w-10 h-10 text-rose-400 mx-auto animate-pulse" />
            <h3 className="text-lg font-extrabold text-white tracking-tight">No Profiles Available</h3>
            <p className="text-xs text-slate-300 leading-relaxed font-medium">
              You have viewed all available profiles for now. Please check back later when new members join!
            </p>
          </div>
        )}
      </div>

      {/* CREATE STORY MODAL */}
      {showCreateStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-5 sm:p-6 shadow-2xl space-y-4 max-h-[92vh] overflow-y-auto no-scrollbar">
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <h3 className="text-sm font-bold flex items-center gap-2 text-white">
                <Film className="w-4 h-4 text-pink-400" /> Upload Story (24h Story)
              </h3>
              <div className="flex items-center gap-2">
                {storyImageUrl && (
                  <button
                    onClick={() => setShowEditorTools(!showEditorTools)}
                    className={`p-1.5 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                      showEditorTools
                        ? 'bg-rose-500 text-white shadow-md'
                        : 'bg-slate-800 text-rose-400 hover:bg-slate-700'
                    }`}
                    title="Customize Canvas"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                )}
                <button
                  onClick={() => {
                    setShowCreateStoryModal(false);
                    setStoryImageUrl('');
                    setIsUploadingMedia(false);
                  }}
                  className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Hidden Gallery Input */}
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*,video/*"
              onChange={handleFileUpload}
              className="hidden"
            />

            {/* Media Upload Area */}
            {!storyImageUrl && !isUploadingMedia && (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-8 px-4 rounded-2xl bg-slate-950/90 border-2 border-dashed border-rose-500/40 hover:border-rose-500 hover:bg-slate-950 transition-all flex flex-col items-center justify-center space-y-3 group shadow-lg"
              >
                <div className="w-14 h-14 rounded-2xl bg-rose-500/10 border border-rose-500/30 flex items-center justify-center text-rose-400 group-hover:scale-110 transition-transform">
                  <UploadCloud className="w-7 h-7" />
                </div>
                <div className="text-center space-y-1">
                  <span className="block text-xs font-bold text-white">Choose Photo or Video from Device Gallery</span>
                </div>
              </button>
            )}

            {/* Uploading Progress Bar (0% to 100%) */}
            {isUploadingMedia && (
              <div className="p-6 bg-slate-950/90 rounded-2xl border border-slate-800 text-center space-y-3 shadow-inner">
                <div className="flex items-center justify-center gap-2 text-rose-400">
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span className="text-xs font-bold">Processing... {uploadProgress}%</span>
                </div>
                <div className="w-full h-3 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 transition-all duration-150"
                    style={{ width: `${uploadProgress}%` }}
                  />
                </div>
                <span className="text-[11px] text-slate-400 block font-mono">Media will display when 100% complete</span>
              </div>
            )}

            {/* Media Preview Box with Custom Overlay Preview */}
            {storyImageUrl && !isUploadingMedia && (
              <div className="space-y-3">
                <div className="relative w-full h-60 rounded-2xl overflow-hidden bg-black border border-slate-800 flex items-center justify-center">
                  {storyMediaType === 'video' ? (
                    <video
                      src={storyImageUrl}
                      controls
                      autoPlay
                      loop
                      playsInline
                      className={`w-full h-full ${
                        storyObjectFit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                    />
                  ) : (
                    <img
                      src={storyImageUrl}
                      alt="Story Preview"
                      className={`w-full h-full ${
                        storyObjectFit === 'contain' ? 'object-contain' : 'object-cover'
                      }`}
                    />
                  )}

                  {/* On-Media Badges Preview */}
                  <div className="absolute inset-x-2 bottom-2 z-10 flex flex-col items-center space-y-1 pointer-events-none">
                    {(storyLocation || storyPhone) && (
                      <div className="flex flex-wrap gap-1 justify-center max-w-[90%]">
                        {storyLocation && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-bold text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                            📍 {storyLocation}
                          </span>
                        )}
                        {storyPhone && (
                          <span className="px-2 py-0.5 rounded-full bg-slate-900/80 text-[10px] font-bold text-sky-400 border border-sky-500/30 backdrop-blur-sm">
                            📱 {storyPhone}
                          </span>
                        )}
                      </div>
                    )}
                    {storyOverlayText && (
                      <span className="max-w-[90%] break-words text-center font-extrabold text-xs text-rose-300 bg-slate-950/85 px-3 py-1 rounded-xl border border-rose-500/30 shadow">
                        {storyOverlayText}
                      </span>
                    )}
                    {selectedEmojis.length > 0 && (
                      <div className="flex gap-1 text-sm">
                        {selectedEmojis.map((e, idx) => (
                          <span key={idx}>{e}</span>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Top Buttons: Remove & Zoom/Fit Toggle */}
                  <div className="absolute top-2 right-2 flex items-center gap-1.5 z-20">
                    <button
                      type="button"
                      onClick={() => setStoryObjectFit(storyObjectFit === 'cover' ? 'contain' : 'cover')}
                      className="p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-slate-800 transition-colors shadow text-xs font-bold flex items-center gap-1 px-2 border border-slate-700"
                      title="মিডিয়া জুম/ফিট পরিবর্তন করুন"
                    >
                      {storyObjectFit === 'cover' ? <Minimize2 className="w-3.5 h-3.5 text-amber-400" /> : <Maximize2 className="w-3.5 h-3.5 text-emerald-400" />}
                      <span className="text-[10px]">{storyObjectFit === 'cover' ? 'Fit' : 'Zoom'}</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setStoryImageUrl('')}
                      className="p-1.5 rounded-full bg-slate-950/80 text-white hover:bg-rose-500 transition-colors shadow"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="flex-1 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-300 border border-slate-700 transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Film className="w-3.5 h-3.5 text-rose-400" /> Change Media
                  </button>

                  <button
                    type="button"
                    onClick={() => setShowEditorTools(!showEditorTools)}
                    className={`px-3 py-2 rounded-xl text-xs font-bold border transition-colors flex items-center gap-1.5 ${
                      showEditorTools
                        ? 'bg-rose-500 text-white border-rose-400'
                        : 'bg-slate-800 text-rose-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    <Pencil className="w-3.5 h-3.5" /> Customize
                  </button>
                </div>
              </div>
            )}

            {/* Customization Toolbar Drawer */}
            {storyImageUrl && showEditorTools && (
              <div className="p-3.5 bg-slate-950/90 rounded-2xl border border-slate-800 space-y-3 animate-fade-in text-xs">
                <div className="flex items-center justify-between pb-1.5 border-b border-slate-800 text-rose-400 font-bold">
                  <span className="flex items-center gap-1.5">
                    <Pencil className="w-3.5 h-3.5" /> Story Customization Tools
                  </span>
                  <span className="text-[10px] text-slate-400">Add phone, location, overlay text & emojis</span>
                </div>

                {/* Location Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    📍 Location
                  </label>
                  <input
                    type="text"
                    value={storyLocation}
                    onChange={(e) => setStoryLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Phone Number Input */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    📱 Phone Number
                  </label>
                  <input
                    type="text"
                    value={storyPhone}
                    onChange={(e) => setStoryPhone(e.target.value)}
                    placeholder="e.g. +8801700000000..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-sky-500"
                  />
                </div>

                {/* Overlay Text */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Type className="w-3.5 h-3.5 text-rose-400" /> Overlay Custom Text
                  </label>
                  <input
                    type="text"
                    value={storyOverlayText}
                    onChange={(e) => setStoryOverlayText(e.target.value)}
                    placeholder="e.g. Looking for soulmate in my city..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* Emojis Palette */}
                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1 flex items-center gap-1">
                    <Smile className="w-3.5 h-3.5 text-amber-400" /> Tap Emojis
                  </label>
                  <div className="flex flex-wrap gap-1.5 bg-slate-900 p-2 rounded-xl border border-slate-800">
                    {['❤️', '🔥', '🌸', '⚡', '👑', '💖', '📍', '📱', '👍', '💥', '✨', '😍', '🥰', '💯'].map((emoji) => {
                      const isSelected = selectedEmojis.includes(emoji);
                      return (
                        <button
                          key={emoji}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedEmojis(selectedEmojis.filter((e) => e !== emoji));
                            } else {
                              setSelectedEmojis([...selectedEmojis, emoji]);
                            }
                          }}
                          className={`p-1.5 rounded-lg text-base transition-transform active:scale-90 ${
                            isSelected
                              ? 'bg-rose-500/30 border border-rose-500 scale-110'
                              : 'bg-slate-800 hover:bg-slate-700'
                          }`}
                        >
                          {emoji}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}

            {/* Caption */}
            <div>
              <label className="block text-[11px] font-semibold text-slate-300 mb-1">
                Story Caption
              </label>
              <textarea
                value={storyCaption}
                onChange={(e) => setStoryCaption(e.target.value)}
                placeholder="Write a caption for your story..."
                rows={2}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 resize-none"
              />
            </div>

            {/* Publishing Progress */}
            {storyPosting && (
              <div className="space-y-1.5 bg-slate-950/80 p-3 rounded-xl border border-slate-800">
                <div className="flex justify-between items-center text-xs font-bold text-rose-400">
                  <span>Processing & Uploading Story...</span>
                  <span>{publishProgress}%</span>
                </div>
                <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden border border-slate-700">
                  <div
                    className="h-full bg-gradient-to-r from-rose-500 to-pink-500 transition-all duration-150"
                    style={{ width: `${publishProgress}%` }}
                  />
                </div>
              </div>
            )}

            <button
              onClick={handlePostStory}
              disabled={!storyImageUrl || storyPosting || isUploadingMedia}
              className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all disabled:opacity-50"
            >
              {storyPosting ? 'Publishing Story...' : 'Post 24h Story'}
            </button>
          </div>
        </div>
      )}

      {/* VIEW STORY FULLSCREEN MODAL */}
      {activeStoryModal && activeGroup && (
        <div className="fixed inset-0 z-50 w-full h-full bg-slate-950 flex flex-col justify-between overflow-hidden animate-fade-in select-none">
          <div className="relative w-full h-full flex flex-col justify-between overflow-hidden">
            
            {/* Top Segmented Story Continuous Animated Progress Bar */}
            <div className="absolute top-2.5 left-3 right-3 z-40 flex space-x-1.5 pointer-events-none">
              {activeGroup.stories.map((st, i) => (
                <div key={st.id} className="h-1 flex-1 bg-white/30 rounded-full overflow-hidden shadow-sm">
                  <div
                    className="h-full bg-gradient-to-r from-rose-400 via-pink-400 to-amber-300 transition-all duration-100 ease-linear"
                    style={{
                      width:
                        i < activeStoryIndex
                          ? '100%'
                          : i === activeStoryIndex
                          ? `${storyProgress}%`
                          : '0%',
                    }}
                  />
                </div>
              ))}
            </div>

            {/* Tap & Hold Container: Tap left (35%) prev, right (65%) next, hold to pause */}
            <div
              className="absolute inset-0 z-10 cursor-pointer"
              onMouseDown={handleHoldStart}
              onMouseUp={handleHoldEnd}
              onTouchStart={handleHoldStart}
              onTouchEnd={handleHoldEnd}
              onMouseLeave={handleHoldEnd}
            >
              <div
                className="absolute inset-y-0 left-0 w-1/3 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  handlePrevStory();
                }}
              />
              <div
                className="absolute inset-y-0 right-0 w-2/3 z-20"
                onClick={(e) => {
                  e.stopPropagation();
                  handleNextStory();
                }}
              />
            </div>

            {/* Left / Right Chevron Nav Buttons for Desktop */}
            {(activeStoryIndex > 0 || (activeGroupIndex !== null && activeGroupIndex > 0)) && (
              <button
                onClick={(e) => { e.stopPropagation(); handlePrevStory(); }}
                className="absolute left-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950/90 text-white border border-slate-700/80 transition-transform active:scale-90 shadow-lg"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {(activeStoryIndex < activeGroup.stories.length - 1 || (activeGroupIndex !== null && activeGroupIndex < userStoryGroups.length - 1)) && (
              <button
                onClick={(e) => { e.stopPropagation(); handleNextStory(); }}
                className="absolute right-2 top-1/2 -translate-y-1/2 z-40 p-2 rounded-full bg-slate-950/70 hover:bg-slate-950/90 text-white border border-slate-700/80 transition-transform active:scale-90 shadow-lg"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Background Story Video or Image */}
            {isVideoItem(activeStoryModal) ? (
              <video
                ref={videoRef}
                src={activeStoryModal.imageUrl}
                autoPlay
                playsInline
                onTimeUpdate={() => {
                  if (videoRef.current && videoRef.current.duration) {
                    setStoryProgress((videoRef.current.currentTime / videoRef.current.duration) * 100);
                  }
                }}
                onEnded={handleNextStory}
                className={`absolute inset-0 w-full h-full bg-black ${
                  activeStoryModal.objectFit === 'contain' ? 'object-contain' : 'object-cover'
                }`}
              />
            ) : (
              <img
                src={activeStoryModal.imageUrl}
                alt="Story"
                className={`absolute inset-0 w-full h-full ${
                  activeStoryModal.objectFit === 'contain' ? 'object-contain bg-black' : 'object-cover'
                }`}
              />
            )}
            <div className="absolute inset-0 bg-gradient-to-b from-slate-950/80 via-transparent to-slate-950/90 pointer-events-none z-10" />

            {/* Story Header */}
            <div className="relative z-40 p-4 pt-5 flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <img
                  src={
                    activeStoryModal.userAvatar ||
                    activeGroup.userAvatar ||
                    DEFAULT_AVATAR_PLACEHOLDER
                  }
                  alt=""
                  className="w-9 h-9 rounded-full object-cover border-2 border-rose-500 bg-slate-800 shadow"
                />
                <div>
                  <div className="flex items-center space-x-1.5">
                    <h4 className="text-xs font-bold text-white">{activeStoryModal.userName || activeGroup.userName}</h4>
                    {activeGroup.stories.length > 1 && (
                      <span className="text-[10px] text-rose-400 font-semibold bg-rose-500/20 px-1.5 py-0.2 rounded-full border border-rose-500/30">
                        {activeStoryIndex + 1}/{activeGroup.stories.length}
                      </span>
                    )}
                    {isStoryPaused && (
                      <span className="text-[10px] bg-amber-500/80 text-white font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow animate-pulse">
                        <Pause className="w-2.5 h-2.5" /> Paused
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] text-slate-300 block">
                    {new Date(activeStoryModal.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
              </div>

              <div className="flex items-center space-x-2">
                {/* Viewers count for story author */}
                {currentUser && currentUser.id === activeStoryModal.userId && (
                  <button
                    onClick={(e) => { e.stopPropagation(); setShowViewersModal(true); }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-slate-900/80 text-xs text-white border border-slate-700 shadow"
                  >
                    <Eye className="w-3.5 h-3.5 text-sky-400" />
                    <span>{activeStoryModal.viewers.length} views</span>
                  </button>
                )}

                {/* Delete story button for user */}
                {currentUser && (
                  <button
                    onClick={(e) => { e.stopPropagation(); handleDeleteActiveStory(); }}
                    className="flex items-center space-x-1 px-2.5 py-1 rounded-full bg-rose-600/90 hover:bg-rose-700 text-white text-xs font-bold transition-colors shadow-md border border-rose-500/50"
                    title="Delete Story"
                  >
                    <Trash2 className="w-3.5 h-3.5 text-white" />
                    <span>Delete</span>
                  </button>
                )}

                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setActiveGroupIndex(null);
                    setActiveStoryIndex(0);
                  }}
                  className="p-1.5 rounded-full bg-slate-900/80 text-white hover:bg-slate-800 transition-colors shadow"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            {/* Story Customization Overlay & Captions Container - Strictly Word-Wrapped Inside Screen */}
            <div className="relative z-40 p-4 space-y-2 mt-auto max-w-full overflow-hidden flex flex-col items-center" onClick={(e) => e.stopPropagation()}>
              
              {/* Badges for Location & Phone */}
              {(activeStoryModal.location || activeStoryModal.phone) && (
                <div className="flex flex-wrap items-center justify-center gap-1.5 max-w-[92%]">
                  {activeStoryModal.location && (
                    <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-emerald-400 font-bold text-xs border border-emerald-500/30 flex items-center gap-1 shadow-lg">
                      📍 {activeStoryModal.location}
                    </span>
                  )}
                  {activeStoryModal.phone && (
                    <span className="px-3 py-1 rounded-full bg-slate-950/85 backdrop-blur-md text-sky-400 font-bold text-xs border border-sky-500/30 flex items-center gap-1 shadow-lg">
                      📱 {activeStoryModal.phone}
                    </span>
                  )}
                </div>
              )}

              {/* Custom Overlay Text Sticker */}
              {activeStoryModal.customOverlayText && (
                <div className="max-w-[92%] break-words whitespace-pre-wrap text-center font-extrabold text-xs sm:text-sm text-rose-300 bg-slate-950/85 backdrop-blur-md px-4 py-2 rounded-2xl border border-rose-500/40 shadow-2xl leading-relaxed">
                  {activeStoryModal.customOverlayText}
                </div>
              )}

              {/* Emojis Sticker Bar */}
              {activeStoryModal.emojis && activeStoryModal.emojis.length > 0 && (
                <div className="flex flex-wrap items-center justify-center gap-1 text-lg drop-shadow-md">
                  {activeStoryModal.emojis.map((em, idx) => (
                    <span key={idx}>{em}</span>
                  ))}
                </div>
              )}

              {/* Story Main Caption Box - Guaranteed No Screen Overflow */}
              {activeStoryModal.caption && (
                <div className="w-full max-w-[92%] break-words whitespace-pre-wrap text-center text-xs sm:text-sm text-white font-medium bg-slate-950/80 backdrop-blur-md p-3.5 rounded-2xl border border-slate-700/80 shadow-2xl leading-relaxed">
                  {activeStoryModal.caption}
                </div>
              )}

              {/* Status alerts */}
              {storyCommentSuccess && (
                <div className="text-[11px] text-emerald-300 bg-emerald-500/20 p-2 rounded-xl border border-emerald-500/30 max-w-[92%] text-center">
                  {storyCommentSuccess}
                </div>
              )}

              {storyCommentError && (
                <div className="text-[11px] text-rose-300 bg-rose-500/20 p-2 rounded-xl border border-rose-500/30 max-w-[92%] text-center">
                  {storyCommentError}
                </div>
              )}

              {/* Bottom Actions Row: Heart Reaction & Direct Comment Input */}
              <div className="w-full max-w-[92%] flex items-center space-x-2 pt-1">
                
                {/* Heart Love Reaction Button */}
                <button
                  onClick={handleReactToStory}
                  className="p-2.5 rounded-full bg-rose-500/90 text-white hover:bg-rose-600 transition-all shadow-md flex-shrink-0"
                  title="Love Reaction"
                >
                  <Heart className="w-5 h-5 fill-white" />
                </button>

                {/* Direct Comment Input (1 Comment limit) */}
                <form onSubmit={handleSendStoryComment} className="flex-1 flex items-center space-x-1.5">
                  <input
                    type="text"
                    value={storyCommentText}
                    onChange={(e) => setStoryCommentText(e.target.value)}
                    placeholder="Comment sends DM to inbox (1 limit)..."
                    className="w-full bg-slate-900/90 border border-slate-700 rounded-full px-3.5 py-2 text-xs text-white placeholder-slate-400 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="submit"
                    disabled={!storyCommentText.trim()}
                    className="p-2 rounded-full bg-pink-500 text-white hover:bg-pink-600 disabled:opacity-40 transition-colors shadow"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </div>
            </div>

          </div>
        </div>
      )}

      {/* STORY VIEWERS MODAL (FOR STORY OWNER) */}
      {showViewersModal && activeStoryModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-xs bg-slate-900 border border-slate-800 rounded-3xl p-5 shadow-2xl space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <h4 className="text-xs font-bold uppercase text-slate-300 flex items-center gap-1.5">
                <Eye className="w-4 h-4 text-sky-400" /> Story Viewers ({activeStoryModal.viewers.length})
              </h4>
              <button onClick={() => setShowViewersModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="max-h-60 overflow-y-auto space-y-2">
              {activeStoryModal.viewers.map((v, i) => (
                <div key={i} className="flex items-center space-x-2.5 p-1.5 bg-slate-800/60 rounded-xl">
                  <img src={v.userAvatar} alt="" className="w-7 h-7 rounded-full object-cover" />
                  <div>
                    <span className="text-xs font-bold text-white block">{v.userName}</span>
                    <span className="text-[9px] text-slate-400">{new Date(v.viewedAt).toLocaleTimeString()}</span>
                  </div>
                </div>
              ))}
              {activeStoryModal.viewers.length === 0 && (
                <p className="text-xs text-slate-500 italic py-4 text-center">No views recorded yet.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* FULL USER PROFILE DETAIL MODAL */}
      {selectedUserModal && (() => {
        // Build robust photo list with main avatar at index 0
        const allUserPhotos = selectedUserModal.photos && selectedUserModal.photos.length > 0
          ? (selectedUserModal.photos.includes(selectedUserModal.avatar)
              ? [selectedUserModal.avatar, ...selectedUserModal.photos.filter(p => p !== selectedUserModal.avatar)]
              : [selectedUserModal.avatar, ...selectedUserModal.photos])
          : [selectedUserModal.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'];

        const currentActivePhoto = allUserPhotos[activePhotoIndex] || allUserPhotos[0];

        return (
        <div className="fixed inset-0 z-50 bg-slate-950/95 backdrop-blur-xl overflow-y-auto p-4 sm:p-6 md:p-8 flex justify-center items-start animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 my-auto">
            
            <button
              onClick={() => setSelectedUserModal(null)}
              className="absolute top-4 right-4 p-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition-colors border border-slate-700 z-10"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center pt-2">
              <div className="relative inline-block group cursor-pointer" onClick={() => setActivePhotoIndex((prev) => (prev + 1) % allUserPhotos.length)}>
                <div className="w-40 h-40 sm:w-48 sm:h-48 rounded-2xl p-1 bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-500 shadow-2xl shadow-rose-500/30 mx-auto overflow-hidden">
                  <img
                    src={currentActivePhoto}
                    alt={selectedUserModal.name}
                    className="w-full h-full object-cover rounded-xl border-2 border-slate-900 transition-all duration-300"
                  />
                </div>
                <span className="absolute bottom-2 left-2 bg-slate-950/80 text-white text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur border border-slate-700">
                  {activePhotoIndex === 0 ? '📸 Main Profile Photo' : `🖼️ Cover Photo #${activePhotoIndex}`}
                </span>
                {selectedUserModal.verified && (
                  <div className="absolute top-1 right-1 bg-slate-900/90 rounded-full p-1 shadow-lg border border-slate-800">
                    <VerificationBadge size={24} className="shrink-0" />
                  </div>
                )}
              </div>

              <h2 className="text-2xl sm:text-3xl font-extrabold text-white mt-3 flex items-center justify-center gap-2">
                <span>{selectedUserModal.name}, {selectedUserModal.age}</span>
                {selectedUserModal.username && (
                  <span className="text-xs text-slate-400 font-mono">@{selectedUserModal.username}</span>
                )}
              </h2>

              <p className="text-xs text-slate-400 flex items-center justify-center gap-1.5 mt-1">
                <MapPin className="w-4 h-4 text-rose-400" />
                <span>{selectedUserModal.location} • {selectedUserModal.distanceKm} km away</span>
              </p>
              
              <div className="mt-3 flex flex-wrap justify-center items-center gap-2">
                <span className="px-3.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  ✨ {selectedUserModal.profileCompletionPercentage || 100}% Profile Completed
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/30 capitalize">
                  Gender: {selectedUserModal.gender}
                </span>
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-pink-500/10 text-pink-300 border border-pink-500/30 capitalize">
                  Looking for: {selectedUserModal.lookingFor}
                </span>
              </div>
            </div>

            {/* 1. ABOUT ME SECTION */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Me</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
                {selectedUserModal.bio || "No bio added yet."}
              </p>
            </div>

            {/* 2. FULL DETAILED PROFILE INFORMATION (Serial, pure English) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Personal & Background Details</h4>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Religion</span>
                  <span className="text-white font-semibold">{selectedUserModal.religion || 'Islam'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Marital Status</span>
                  <span className="text-white font-semibold">{selectedUserModal.maritalStatus || 'Single'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Height</span>
                  <span className="text-white font-semibold">{selectedUserModal.height || "5' 7\""}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Education</span>
                  <span className="text-white font-semibold">{selectedUserModal.education || 'Graduate'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Profession</span>
                  <span className="text-white font-semibold">{selectedUserModal.profession || 'Private Job'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">District & City</span>
                  <span className="text-white font-semibold">{selectedUserModal.divisionCity || selectedUserModal.location}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Date of Birth</span>
                  <span className="text-white font-semibold">{selectedUserModal.dateOfBirth || '1998-05-15'} ({selectedUserModal.age} yrs)</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Relationship Goal</span>
                  <span className="text-white font-semibold capitalize">{selectedUserModal.relationshipStatus || selectedUserModal.lookingFor}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Languages</span>
                  <span className="text-white font-semibold">{selectedUserModal.languages?.join(', ') || 'English, Bengali'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Smoking & Drinking</span>
                  <span className="text-white font-semibold">{selectedUserModal.smoking || 'Non-smoker'} • {selectedUserModal.drinking || 'Non-drinker'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">User ID Number</span>
                  <span className="text-rose-400 font-mono font-bold">#{selectedUserModal.userIdNumber || '483883'}</span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-400 uppercase block font-bold">Country</span>
                  <span className="text-white font-semibold">{selectedUserModal.countryFlag || '🇧🇩'} {selectedUserModal.country || 'Bangladesh'}</span>
                </div>
              </div>
            </div>

            {/* 3. INTERESTS & HOBBIES */}
            {selectedUserModal.interests && selectedUserModal.interests.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interests & Hobbies</h4>
                <div className="flex flex-wrap gap-2">
                  {selectedUserModal.interests.map((interest) => (
                    <span
                      key={interest}
                      className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium"
                    >
                      {interest}
                    </span>
                  ))}
                </div>
              </div>
            )}

            {/* 4. PHOTOS GALLERY & COVER PHOTOS */}
            {allUserPhotos && allUserPhotos.length > 0 && (
              <div>
                <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 flex items-center justify-between">
                  <span>Photo Session & Cover Photos ({allUserPhotos.length})</span>
                  <span className="text-[10px] text-slate-400 font-normal">Tap any photo to view front</span>
                </h4>
                <div className="flex space-x-2.5 overflow-x-auto pb-2">
                  {allUserPhotos.map((photoUrl, idx) => (
                    <button
                      key={idx}
                      onClick={() => setActivePhotoIndex(idx)}
                      className={`relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden flex-shrink-0 border-2 transition-all ${
                        idx === activePhotoIndex ? 'border-amber-400 scale-105 shadow-lg shadow-amber-500/20' : 'border-slate-800 opacity-70 hover:opacity-100'
                      }`}
                    >
                      <img src={photoUrl} alt="" className="w-full h-full object-cover" />
                      <span className="absolute bottom-1 left-1 bg-slate-950/80 text-white text-[9px] font-bold px-1.5 py-0.5 rounded backdrop-blur">
                        {idx === 0 ? 'Main' : `Cover ${idx}`}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* 5. PRIVATE CONTACT INFO (First 4 digits of phone number visible) */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Private Contact Info (Premium Locked)</h4>
              <div className="space-y-2">
                
                {/* Phone Number Card */}
                <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                      <PhoneCall className="w-4 h-4" />
                    </div>
                    <div>
                      {unlockedMap[selectedUserModal.id] ? (
                        <div>
                          <span className="text-[10px] text-emerald-400 font-bold block">PHONE NUMBER UNLOCKED</span>
                          <span className="font-mono font-extrabold text-sm text-emerald-300 tracking-wider">
                            {unlockedMap[selectedUserModal.id]}
                          </span>
                        </div>
                      ) : (
                        <div>
                          <span className="text-[10px] text-slate-400 font-bold block">VERIFIED PHONE CONTACT</span>
                          <span className="font-mono text-xs text-white font-bold tracking-wider block mt-0.5">
                            {maskPhoneNumber(selectedUserModal.phone)}
                          </span>
                          <span className="text-[10px] text-amber-400 font-semibold block mt-0.5">Payment Required to Unlock</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {!unlockedMap[selectedUserModal.id] && onOpenUnlockModal && (
                    <button
                      onClick={() => {
                        onOpenUnlockModal(selectedUserModal);
                      }}
                      className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/20 transition-all flex items-center gap-1.5"
                    >
                      <Lock className="w-3.5 h-3.5" /> Unlock Number
                    </button>
                  )}
                </div>

                {/* Email Address Card */}
                <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-9 h-9 rounded-xl bg-slate-700/60 border border-slate-600 text-slate-400 flex items-center justify-center text-xs font-mono">
                      @
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-400 font-bold block">PRIMARY EMAIL ADDRESS</span>
                      <span className="font-mono text-xs text-slate-300">{maskEmail(selectedUserModal.email)}</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-700">
                    Account Email
                  </span>
                </div>

              </div>
            </div>

            {/* About Me */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Me</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
                {selectedUserModal.bio}
              </p>
            </div>

            {/* Interests */}
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interests & Hobbies</h4>
              <div className="flex flex-wrap gap-2">
                {selectedUserModal.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3.5 py-1.5 rounded-full text-xs font-medium bg-slate-800 text-slate-200 border border-slate-700 shadow-sm"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>

            {/* Action Buttons Footer */}
            <div className="pt-4 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex space-x-2">
                <button
                  onClick={() => {
                    onReportUser(selectedUserModal);
                    setSelectedUserModal(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <ShieldAlert className="w-4 h-4" /> Report
                </button>
                <button
                  onClick={() => {
                    onBlockUser(selectedUserModal);
                    setSelectedUserModal(null);
                  }}
                  className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 text-xs font-bold flex items-center gap-1.5 border border-slate-700 transition-colors"
                >
                  <Ban className="w-4 h-4" /> Block
                </button>
              </div>

              <div className="flex items-center space-x-3">
                <button
                  onClick={() => {
                    onPass(selectedUserModal);
                    addSwipedUser(selectedUserModal.id);
                    setSelectedUserModal(null);
                  }}
                  className="px-4 py-2.5 rounded-full bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold border border-slate-700 transition-colors"
                >
                  Pass
                </button>

                <button
                  onClick={() => {
                    onLike(selectedUserModal);
                    addSwipedUser(selectedUserModal.id);
                    setSelectedUserModal(null);
                  }}
                  className="px-6 py-2.5 rounded-full bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition-all"
                >
                  <Heart className="w-4 h-4 fill-white" /> Like Profile
                </button>
              </div>
            </div>

          </div>
        </div>
        );
      })()}

      {/* FILTER DRAWER MODAL */}
      {showFilterDrawer && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
          <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl overflow-y-auto max-h-[90vh]">
            <div className="flex items-center justify-between pb-4 border-b border-slate-800 mb-4">
              <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                <SlidersHorizontal className="w-5 h-5 text-rose-400" /> Advanced Discovery Filters
              </h3>
              <button
                onClick={() => setShowFilterDrawer(false)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-5">
              {/* Search Box inside Modal */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Search Query
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Search by Name, District, College, Profession, User ID..."
                    className="w-full pl-9 pr-8 py-2.5 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 transition-colors"
                  />
                  <Filter className="w-4 h-4 text-rose-400 absolute left-3 top-3" />
                  {searchQuery && (
                    <button
                      onClick={() => setSearchQuery('')}
                      className="absolute right-2.5 top-2.5 text-slate-400 hover:text-white cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Looking For (Gender) */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Looking For (Gender)
                </label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setGender('all')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      gender === 'all'
                        ? 'bg-rose-500 text-white border-rose-400 shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Any Gender
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('female')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      gender === 'female'
                        ? 'bg-rose-500 text-white border-rose-400 shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Girls (মেয়ে)
                  </button>
                  <button
                    type="button"
                    onClick={() => setGender('male')}
                    className={`py-2 text-xs font-bold rounded-xl border transition-all ${
                      gender === 'male'
                        ? 'bg-rose-500 text-white border-rose-400 shadow'
                        : 'bg-slate-800 text-slate-300 border-slate-700 hover:bg-slate-700'
                    }`}
                  >
                    Boys (ছেলে)
                  </button>
                </div>
              </div>

              {/* Marital Status & Religion side-by-side */}
              <div className="grid grid-cols-2 gap-3">
                {/* Marital Status */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Marital Status
                  </label>
                  <select
                    value={maritalFilter}
                    onChange={(e) => setMaritalFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="all">Any Status (All)</option>
                    <option value="Single">Single / Unmarried</option>
                    <option value="Married">Married</option>
                    <option value="Divorced">Divorced</option>
                    <option value="Widowed">Widowed</option>
                  </select>
                </div>

                {/* Religion */}
                <div>
                  <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                    Religion
                  </label>
                  <select
                    value={religionFilter}
                    onChange={(e) => setReligionFilter(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white font-semibold focus:outline-none focus:border-rose-500 cursor-pointer"
                  >
                    <option value="all">Any Religion</option>
                    <option value="Islam">Islam</option>
                    <option value="Hinduism">Hinduism</option>
                    <option value="Christianity">Christianity</option>
                    <option value="Buddhism">Buddhism</option>
                    <option value="Other">Other</option>
                  </select>
                </div>
              </div>

              {/* Age Range */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Age Range
                  </label>
                  <span className="text-xs font-bold text-rose-400">
                    {minAge} - {maxAge} years
                  </span>
                </div>
                <div className="flex items-center space-x-3">
                  <input
                    type="range"
                    min={18}
                    max={75}
                    value={minAge}
                    onChange={(e) => setMinAge(Math.min(Number(e.target.value), maxAge - 1))}
                    className="w-full accent-rose-500"
                  />
                  <input
                    type="range"
                    min={18}
                    max={75}
                    value={maxAge}
                    onChange={(e) => setMaxAge(Math.max(Number(e.target.value), minAge + 1))}
                    className="w-full accent-rose-500"
                  />
                </div>
              </div>

              {/* Maximum Distance */}
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-semibold text-slate-300 uppercase tracking-wider">
                    Maximum Distance
                  </label>
                  <span className="text-xs font-bold text-rose-400">{maxDistanceKm} km</span>
                </div>
                <input
                  type="range"
                  min={1}
                  max={100}
                  value={maxDistanceKm}
                  onChange={(e) => setMaxDistanceKm(Number(e.target.value))}
                  className="w-full accent-rose-500"
                />
              </div>

              {/* Interests & Hobbies */}
              <div>
                <label className="block text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">
                  Interests & Hobbies
                </label>
                <div className="flex flex-wrap gap-1.5">
                  {popularInterests.map((interest) => {
                    const isSelected = selectedInterests.includes(interest);
                    return (
                      <button
                        key={interest}
                        type="button"
                        onClick={() => handleInterestToggle(interest)}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
                          isSelected
                            ? 'bg-rose-500 text-white border-rose-400 shadow-sm'
                            : 'bg-slate-800 text-slate-300 border-slate-700 hover:border-slate-500'
                        }`}
                      >
                        {interest}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Results Preview Count */}
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800/80 text-center">
                <span className="text-xs font-bold text-rose-400 flex items-center justify-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5" /> Found {filteredProfiles.length} matching profile(s)
                </span>
              </div>

              {/* Action Buttons */}
              <div className="flex items-center space-x-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={resetFilters}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-bold transition-colors cursor-pointer"
                >
                  Reset All
                </button>
                <button
                  type="button"
                  onClick={submitFilters}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-lg shadow-rose-500/25 transition-all cursor-pointer"
                >
                  Apply Filters
                </button>
              </div>

            </div>
          </div>
        </div>
      )}

    </div>
  );
};
