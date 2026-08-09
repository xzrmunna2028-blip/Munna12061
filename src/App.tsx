import React, { useState, useEffect, useRef } from 'react';
import { Lock, Ban, RefreshCw } from 'lucide-react';
import { Navbar } from './components/Navbar';
import { MobileBottomNav } from './components/MobileBottomNav';
import { AuthModal } from './components/AuthModal';
import { DiscoverView } from './components/DiscoverView';
import { LikesYouView } from './components/LikesYouView';
import { MatchesView } from './components/MatchesView';
import { NotificationsView } from './components/NotificationsView';
import { ProfileView } from './components/ProfileView';
import { AdminPanel } from './components/AdminPanel';
import { MatchModal } from './components/MatchModal';
import { ReportModal } from './components/ReportModal';
import { VoiceCallModal } from './components/VoiceCallModal';
import { UnlockPaymentModal } from './components/UnlockPaymentModal';
import { PremiumSubscriptionModal } from './components/PremiumSubscriptionModal';
import { SplashDisclaimerModal } from './components/SplashDisclaimerModal';
import { LandingPage } from './components/LandingPage';
import {
  User,
  Match,
  NotificationItem,
  SearchFilters,
  VoiceCall,
  UnlockRequest
} from './types';
import { INITIAL_SYSTEM_SETTINGS, DEFAULT_AVATAR_PLACEHOLDER } from './data/seedData';
import {
  initiateVoiceCall,
  listenForIncomingCalls
} from './services/callService';
import { updateUserOnlineStatus } from './services/chatService';
import { compressUserPhotos } from './lib/imageUtils';
import { subscribeToUserUnlockedNumbers } from './services/unlockService';
import { onAuthStateChanged, signOut, getRedirectResult } from 'firebase/auth';
import { doc, setDoc, onSnapshot, collection, getDoc } from 'firebase/firestore';
import { auth, db, handleFirestoreError, OperationType } from './lib/firebase';
import { getSafeAvatar } from './lib/avatar';
import { customFetch as fetch } from './lib/api';

export default function App() {
  const [hasAcceptedSplash, setHasAcceptedSplash] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'landing' | 'discover' | 'likes' | 'matches' | 'chats' | 'notifications' | 'profile' | 'admin'>('landing');
  const [selectedChatMatch, setSelectedChatMatch] = useState<Match | null>(null);
  
  // Admin password states
  const [isAdminUnlocked, setIsAdminUnlocked] = useState(() => {
    return sessionStorage.getItem('isAdminUnlocked') === 'true';
  });
  const [adminPasswordInput, setAdminPasswordInput] = useState('');
  const [adminPasswordError, setAdminPasswordError] = useState<string | null>(null);

  const [discoverProfiles, setDiscoverProfiles] = useState<User[]>([]);
  const [likers, setLikers] = useState<User[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);

  // Phone Unlocks state
  const [unlockedMap, setUnlockedMap] = useState<Record<string, string>>({});
  const [userToUnlock, setUserToUnlock] = useState<User | null>(null);

  // Modals & Calls
  const [isAuthOpen, setIsAuthOpen] = useState(false);
  const [recentMatchUser, setRecentMatchUser] = useState<User | null>(null);
  const [userToReport, setUserToReport] = useState<User | null>(null);
  const [activeCall, setActiveCall] = useState<VoiceCall | null>(null);
  const [showPremiumModal, setShowPremiumModal] = useState(false);

  // Filters State
  const [filters, setFilters] = useState<SearchFilters>({
    minAge: 18,
    maxAge: 75,
    gender: 'all',
    maxDistanceKm: 50,
    interests: [],
    searchQuery: '',
  });

  // Site settings branding state
  const [siteSettings, setSiteSettings] = useState<{
    appName?: string;
    siteLogoUrl?: string;
    maintenanceMode?: boolean;
    maintenanceMessage?: string;
  }>({});

  // Initial loads & real-time sync
  useEffect(() => {
    fetchCurrentSession();
    fetchSettings();

    const interval = setInterval(() => {
      fetchSettings();
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  const fetchSettings = async () => {
    try {
      const res = await fetch('/api/settings');
      if (res.ok) {
        const data = await res.json();
        if (data.settings) {
          setSiteSettings({
            appName: data.settings.appName,
            siteLogoUrl: data.settings.siteLogoUrl,
            maintenanceMode: !!data.settings.maintenanceMode,
            maintenanceMessage: data.settings.maintenanceMessage,
          });
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // URL route detection for /admin
  useEffect(() => {
    const handleLocationCheck = () => {
      const path = window.location.pathname;
      const hash = window.location.hash;
      if (path === '/admin' || hash === '#/admin' || hash === '#admin') {
        setActiveTab('admin');
      }
    };
    handleLocationCheck();
    window.addEventListener('popstate', handleLocationCheck);
    window.addEventListener('hashchange', handleLocationCheck);
    return () => {
      window.removeEventListener('popstate', handleLocationCheck);
      window.removeEventListener('hashchange', handleLocationCheck);
    };
  }, []);

  useEffect(() => {
    const handleOpenPremium = () => {
      setShowPremiumModal(true);
    };
    window.addEventListener('open-premium-modal', handleOpenPremium);
    return () => {
      window.removeEventListener('open-premium-modal', handleOpenPremium);
    };
  }, []);

  useEffect(() => {
    if (currentUser) {
      fetchDiscoverProfiles();
      fetchLikers();
      fetchMatches();
      fetchNotifications();

      // Set user online status in Firestore
      updateUserOnlineStatus(currentUser.id, true);

      // Listen for incoming voice call requests
      const unsubscribeCalls = listenForIncomingCalls(currentUser.id, (incomingCall) => {
        setActiveCall(incomingCall);
      });

      // Listen for real-time approved phone unlocks for current user
      const unsubscribeUnlocks = subscribeToUserUnlockedNumbers(currentUser.id, (map) => {
        setUnlockedMap(map);
      });

      // Real-time synchronization polling (every 4 seconds) to ensure match lists,
      // likers lists, and notifications are synchronized across multiple browsers/devices
      const pollInterval = setInterval(() => {
        fetchLikers();
        fetchMatches();
        fetchNotifications();
      }, 4000);

      return () => {
        unsubscribeCalls();
        unsubscribeUnlocks();
        updateUserOnlineStatus(currentUser.id, false);
        clearInterval(pollInterval);
      };
    }
  }, [currentUser, filters]);

  // Subscribe to real-time users collection from Firestore for instant sync and instant UI rendering
  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const liveUsers: User[] = [];
      snapshot.forEach((d) => {
        if (d.exists()) {
          const data = d.data();
          const userId = d.id || data.id || data.uid;
          if (userId) {
            const cleanAvatar = data.avatar || data.photoURL || data.profilePhoto || '';
            const status = data.status || 'active';
            const photos = (data.photos && Array.isArray(data.photos) && data.photos.length > 0)
              ? data.photos
              : (cleanAvatar ? [cleanAvatar] : []);
            
            liveUsers.push({
              ...data,
              id: userId,
              uid: userId,
              avatar: cleanAvatar,
              photos: photos,
              status: status,
            } as any as User);
          }
        }
      });

      // 1. Instantly Sync Firestore Users to Server in the background
      fetch('/api/auth/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: liveUsers }),
      }).catch((err) => console.error('Sync users error:', err));

      // 2. For instant 1-second real-time responsiveness, we update the discoverProfiles locally
      if (currentUser) {
        // Real-time sync for current user document updates (e.g. photoStatus approved/rejected by admin)
        const updatedSelf = liveUsers.find(u => u.id === currentUser.id);
        if (updatedSelf && (
          updatedSelf.photoStatus !== currentUser.photoStatus ||
          updatedSelf.rejectionReason !== currentUser.rejectionReason ||
          updatedSelf.verified !== currentUser.verified ||
          updatedSelf.status !== currentUser.status
        )) {
          setCurrentUser(updatedSelf);
          localStorage.setItem('heartsync_current_user', JSON.stringify(updatedSelf));
        }

        // Exclude current user, non-active users, and rejected photos
        let localDiscover = liveUsers.filter(u => u.id !== currentUser.id && (u.status || 'active') === 'active' && u.photoStatus !== 'rejected');
        
        // Ensure every user has a valid avatar and photos
        localDiscover = localDiscover.map(u => {
          let cleanAvatar = u.avatar;
          if (!cleanAvatar || typeof cleanAvatar !== 'string' || cleanAvatar.trim() === '') {
            cleanAvatar = u.gender === 'female'
              ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80'
              : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=800&q=80';
          }
          const cleanPhotos = (u.photos && u.photos.length > 0)
            ? u.photos.filter(p => p && typeof p === 'string' && p.trim() !== '')
            : [cleanAvatar];

          return {
            ...u,
            avatar: cleanAvatar,
            photos: cleanPhotos.length > 0 ? cleanPhotos : [cleanAvatar]
          };
        });

        // Age filter
        if (filters.minAge) {
          localDiscover = localDiscover.filter(u => (u.age !== undefined ? Number(u.age) : 24) >= filters.minAge);
        }
        if (filters.maxAge) {
          localDiscover = localDiscover.filter(u => (u.age !== undefined ? Number(u.age) : 24) <= filters.maxAge);
        }
        // Gender filter
        if (filters.gender && filters.gender !== 'all') {
          localDiscover = localDiscover.filter(u => u.gender === filters.gender);
        }
        // Max distance filter
        if (filters.maxDistanceKm) {
          localDiscover = localDiscover.filter(u => (u.distanceKm !== undefined ? Number(u.distanceKm) : 2) <= filters.maxDistanceKm);
        }
        // Interests filter
        if (filters.interests && filters.interests.length > 0) {
          localDiscover = localDiscover.filter(u => u.interests && filters.interests.some(i => u.interests.includes(i)));
        }
        // Search query filter
        if (filters.searchQuery) {
          const q = filters.searchQuery.toLowerCase();
          localDiscover = localDiscover.filter(u => 
            (u.name && u.name.toLowerCase().includes(q)) || 
            (u.bio && u.bio.toLowerCase().includes(q)) ||
            (u.profession && u.profession.toLowerCase().includes(q)) ||
            (u.location && u.location.toLowerCase().includes(q))
          );
        }

        setDiscoverProfiles(localDiscover);
      }
    }, (err) => {
      console.error('Realtime users collection snapshot error:', err);
      try {
        handleFirestoreError(err, OperationType.LIST, 'users');
      } catch (e) {
        // Log the JSON error securely
      }
    });

    return () => unsubscribeUsers();
  }, [currentUser, filters]);

  // Handle Google Auth redirect result & subscribe to real-time Firebase Auth and Firestore user profile
  useEffect(() => {
    let unsubscribeDocSnapshot: (() => void) | null = null;

    // 1. Process Google sign-in redirect result (for mobile & WebViews)
    getRedirectResult(auth).then(async (result) => {
      if (result && result.user) {
        const fbUser = result.user;
        const userDocRef = doc(db, 'users', fbUser.uid);
        const docSnap = await getDoc(userDocRef);
        if (!docSnap.exists()) {
          const newUserData: User = {
            id: fbUser.uid,
            name: fbUser.displayName || 'True Love Connect Member',
            email: fbUser.email || '',
            phone: fbUser.phoneNumber || '01712345678',
            avatar: fbUser.photoURL || DEFAULT_AVATAR_PLACEHOLDER,
            photos: [fbUser.photoURL || DEFAULT_AVATAR_PLACEHOLDER],
            age: 24,
            gender: 'female',
            lookingFor: 'relationship',
            location: 'Dhaka, Bangladesh',
            distanceKm: 0,
            bio: '',
            interests: [],
            status: 'active',
            isOnline: true,
            lastActive: 'Active now',
            verified: false,
            role: 'user',
            privacySettings: {
              hideOnline: false,
              hideDistance: false,
              hideAge: false,
              profileVisibility: 'public'
            },
            profileCompletionPercentage: 70,
            createdAt: new Date().toISOString()
          };
          await setDoc(userDocRef, newUserData, { merge: true });
          fetch('/api/auth/firebase-sync', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(newUserData),
          }).catch(console.error);
        }
      }
    }).catch((err) => {
      if (err && (err.message?.includes('closing') || err.message?.includes('hidden') || err.message?.includes('IndexedDB') || err.message?.includes('closing/hidden'))) {
        console.warn('getRedirectResult non-critical IndexedDB error (expected in iframe):', err);
      } else {
        console.error('getRedirectResult error:', err);
      }
    });

    // 2. Auth state listener
    const unsubscribeAuth = onAuthStateChanged(auth, async (fbUser) => {
      if (fbUser) {
        const userDocRef = doc(db, 'users', fbUser.uid);

        // Ensure user document exists in Firestore
        try {
          const docSnap = await getDoc(userDocRef);
          if (!docSnap.exists()) {
            const newUserData: User = {
              id: fbUser.uid,
              name: fbUser.displayName || 'True Love Connect Member',
              email: fbUser.email || '',
              phone: fbUser.phoneNumber || '01712345678',
              avatar: fbUser.photoURL || DEFAULT_AVATAR_PLACEHOLDER,
              photos: [fbUser.photoURL || DEFAULT_AVATAR_PLACEHOLDER],
              age: 24,
              gender: 'female',
              lookingFor: 'relationship',
              location: 'Dhaka, Bangladesh',
              distanceKm: 0,
              bio: '',
              interests: [],
              status: 'active',
              isOnline: true,
              lastActive: 'Active now',
              verified: false,
              role: 'user',
              privacySettings: {
                hideOnline: false,
                hideDistance: false,
                hideAge: false,
                profileVisibility: 'public'
              },
              profileCompletionPercentage: 70,
              createdAt: new Date().toISOString()
            };
            await setDoc(userDocRef, newUserData, { merge: true });
            fetch('/api/auth/firebase-sync', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newUserData),
            }).catch(console.error);
          }
        } catch (e) {
          console.error('Check user doc error:', e);
        }

        unsubscribeDocSnapshot = onSnapshot(userDocRef, (docSnap) => {
          if (docSnap.exists()) {
            const liveUserData = docSnap.data() as User;
            const safeAvatar = getSafeAvatar(liveUserData);
            const sanitized = {
              ...liveUserData,
              avatar: safeAvatar,
              photos: (liveUserData.photos && liveUserData.photos.length > 0) ? liveUserData.photos : [safeAvatar],
            };
            setCurrentUser(sanitized);
            try {
              localStorage.setItem('heartsync_current_user', JSON.stringify(sanitized));
            } catch (_) {}
          }
        }, (err) => {
          console.error('Real-time user snapshot error:', err);
        });
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeDocSnapshot) unsubscribeDocSnapshot();
    };
  }, []);

  const fetchCurrentSession = async () => {
    try {
      const savedUser = localStorage.getItem('heartsync_current_user');
      if (savedUser) {
        try {
          const parsed = JSON.parse(savedUser);
          if (parsed && parsed.id) {
            const safeAvatar = getSafeAvatar(parsed);
            const sanitized = {
              ...parsed,
              avatar: safeAvatar,
              photos: (parsed.photos && parsed.photos.length > 0) ? parsed.photos : [safeAvatar],
            };
            setCurrentUser(sanitized);
            return;
          }
        } catch (_) {}
      }

      const res = await fetch('/api/auth/me');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.user) {
          const safeAvatar = getSafeAvatar(data.user);
          const sanitized = {
            ...data.user,
            avatar: safeAvatar,
            photos: (data.user.photos && data.user.photos.length > 0) ? data.user.photos : [safeAvatar],
          };
          setCurrentUser(sanitized);
          localStorage.setItem('heartsync_current_user', JSON.stringify(sanitized));
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchDiscoverProfiles = async () => {
    try {
      const queryParams = new URLSearchParams({
        minAge: filters.minAge.toString(),
        maxAge: filters.maxAge.toString(),
        gender: filters.gender,
        maxDistanceKm: filters.maxDistanceKm.toString(),
        interests: filters.interests.join(','),
        query: filters.searchQuery,
      });

      const res = await fetch(`/api/users?${queryParams.toString()}`);
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setDiscoverProfiles(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLikers = async () => {
    try {
      const res = await fetch('/api/likes-you');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const newLikers = data.likers || [];
        setLikers(prev => (JSON.stringify(prev) === JSON.stringify(newLikers) ? prev : newLikers));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const newMatches = data.matches || [];
        setMatches(prev => (JSON.stringify(prev) === JSON.stringify(newMatches) ? prev : newMatches));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        const newNotifs = data.notifications || [];
        setNotifications(prev => (JSON.stringify(prev) === JSON.stringify(newNotifs) ? prev : newNotifs));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const likeCurrentRef = useRef<(() => void) | null>(null);

  const handleCenterHeartClick = () => {
    if (activeTab !== 'discover') {
      setActiveTab('discover');
    } else if (likeCurrentRef.current) {
      likeCurrentRef.current();
    } else if (discoverProfiles.length > 0) {
      handleLike(discoverProfiles[0]);
    }
  };

  const handleLike = async (targetUser: User) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUser.id, type: 'like' }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setRecentMatchUser(targetUser);
        await fetchMatches();
        fetchLikers();
        fetchNotifications();
      } else {
        setRecentMatchUser(targetUser);
      }
    } catch (err) {
      console.error(err);
      setRecentMatchUser(targetUser);
    }
  };

  const handlePass = async (targetUser: User) => {
    try {
      await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUser.id, type: 'pass' }),
      });
      fetchLikers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockUser = async (targetUser: User) => {
    if (!window.confirm(`Block ${targetUser.name}? They will be removed from your matches and discovery feed.`)) return;
    try {
      const res = await fetch('/api/blocks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ blockedUserId: targetUser.id }),
      });
      if (res.ok) {
        setDiscoverProfiles((prev) => prev.filter((u) => u.id !== targetUser.id));
        fetchMatches();
        fetchLikers();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblockUser = async (targetUser: User) => {
    try {
      const res = await fetch(`/api/blocks/${targetUser.id}`, {
        method: 'DELETE',
      });
      if (res.ok) {
        fetchDiscoverProfiles();
        fetchMatches();
        fetchLikers();
        alert(`${targetUser.name} has been unblocked. You can now chat with them!`);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSubmitReport = async (reportedUserId: string, reason: string, details: string) => {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedUserId, reason, details }),
    });
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    try {
      const sanitizedData = await compressUserPhotos(updatedData);

      if (currentUser && currentUser.id) {
        try {
          const userDocRef = doc(db, 'users', currentUser.id);
          await setDoc(userDocRef, sanitizedData, { merge: true });
        } catch (fsErr) {
          console.warn('Firestore setDoc failed (e.g. document size limit), continuing with API update:', fsErr);
        }
      }

      const res = await fetch('/api/users/profile', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(sanitizedData),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user);
        localStorage.setItem('heartsync_current_user', JSON.stringify(data.user));
        fetchDiscoverProfiles();
      }
    } catch (err) {
      console.error('Error updating profile:', err);
    }
  };

  const handleMarkAllNotifsRead = async () => {
    await fetch('/api/notifications/read', { method: 'POST' });
    setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
  };

  const handleQuickSwitchUser = async (userId: string) => {
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        setCurrentUser(data.user);
        setActiveTab('discover');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleStartVoiceCall = async (targetUser: User, matchId: string) => {
    if (!currentUser) return;
    try {
      const { call } = await initiateVoiceCall(currentUser, targetUser, matchId);
      setActiveCall(call);
    } catch (err) {
      console.error('Failed to initiate voice call:', err);
    }
  };

  const handleLogout = async () => {
    if (currentUser) {
      updateUserOnlineStatus(currentUser.id, false);
    }
    try {
      await signOut(auth);
    } catch (_) {}
    try {
      localStorage.removeItem('heartsync_current_user');
    } catch (_) {}
    setCurrentUser(null);
    setIsAuthOpen(true);
  };

  const unreadNotifsCount = notifications.filter((n) => !n.isRead).length;

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 selection:bg-rose-500 selection:text-white font-sans">
      
      {activeTab === 'landing' ? (
        <LandingPage
          appName={siteSettings.appName}
          siteLogo={siteSettings.siteLogoUrl}
          onGetStarted={() => {
            if (currentUser) {
              setActiveTab('discover');
            } else {
              setIsAuthOpen(true);
            }
          }}
          onAdminLogin={() => setActiveTab('admin')}
          currentUser={currentUser}
          onGoToDashboard={() => setActiveTab('discover')}
        />
      ) : (
        <>
          {/* Header Navigation */}
          <Navbar
            currentUser={currentUser}
            activeTab={activeTab}
            setActiveTab={setActiveTab}
            unreadNotifsCount={unreadNotifsCount}
            unreadMatchesCount={0}
            likesCount={likers.length}
            onOpenAuth={() => setIsAuthOpen(true)}
            onQuickSwitchUser={handleQuickSwitchUser}
            siteName={siteSettings.appName}
            siteLogo={siteSettings.siteLogoUrl}
          />

      {/* Main Content Body */}
      <main className="transition-all duration-300">
        {siteSettings.maintenanceMode && currentUser?.role !== 'admin' ? (
          <div className="max-w-md mx-auto my-12 p-8 bg-slate-900 border border-amber-500/40 rounded-3xl text-center space-y-6 shadow-2xl relative overflow-hidden">
            <div className="relative inline-block mx-auto">
              {siteSettings.siteLogoUrl ? (
                <img src={siteSettings.siteLogoUrl} alt="" className="w-20 h-20 rounded-2xl object-cover border-2 border-amber-500 shadow-xl" />
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-amber-500/20 border-2 border-amber-500/40 text-amber-400 flex items-center justify-center font-bold text-2xl shadow-xl">
                  TLC
                </div>
              )}
              <span className="absolute -bottom-2 -right-2 bg-amber-500 text-slate-950 font-black p-1.5 rounded-full shadow-lg">
                <RefreshCw className="w-4 h-4 animate-spin" />
              </span>
            </div>

            <div className="space-y-2">
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs font-extrabold uppercase tracking-wide">
                <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                ওয়েবসাইট সিস্টেম আপডেট চলছে (Under Maintenance)
              </div>
              <h2 className="text-2xl font-black text-white">
                {siteSettings.appName || 'True Love Connect'}
              </h2>
            </div>

            <p className="text-xs text-slate-300 bg-slate-950 p-4 rounded-2xl border border-slate-800 leading-relaxed text-left font-sans">
              {siteSettings.maintenanceMessage || 'আমাদের প্ল্যাটফর্মটি বর্তমানে নতুন আপডেট ও মেইনটেন্যান্স এর জন্য সাময়িকভাবে বন্ধ রয়েছে। খুব শীঘ্রই আমরা নতুন সিস্টেম আপডেট নিয়ে ফিরছি। ধন্যবাদ।'}
            </p>

            <div className="pt-2 space-y-3">
              <button
                onClick={() => fetchSettings()}
                className="w-full py-3 rounded-2xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-extrabold text-xs shadow-lg transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" /> স্ট্যাটাস রিফ্রেশ করুন (Re-check Status)
              </button>

              <button
                onClick={() => {
                  setActiveTab('admin');
                }}
                className="w-full py-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white font-bold text-xs transition border border-slate-700 cursor-pointer"
              >
                এডমিন প্যানেল লগইন (Admin Panel)
              </button>
            </div>
          </div>
        ) : currentUser && currentUser.role !== 'admin' && (currentUser.status === 'suspended' || currentUser.status === 'banned') ? (
          <div className="max-w-md mx-auto my-12 p-6 bg-slate-900 border border-rose-500/40 rounded-3xl text-center space-y-4 shadow-2xl">
            <div className="w-16 h-16 mx-auto rounded-full bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center animate-pulse">
              <Ban className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-extrabold text-white">
              {currentUser.status === 'banned' ? 'অ্যাকাউন্ট ব্যান করা হয়েছে (Account Banned)' : 'অ্যাকাউন্ট স্থগিত করা হয়েছে (Account Suspended)'}
            </h2>
            <p className="text-xs text-slate-300 leading-relaxed">
              সামাজিক নির্দেশিকা অথবা ফেক আইডি প্রতিরোধের অংশ হিসেবে এডমিন কর্তৃক আপনার অ্যাকাউন্টটি {currentUser.status === 'banned' ? 'স্থায়ীভাবে ব্যান' : 'সাময়িকভাবে স্থগিত'} করা হয়েছে। 
            </p>
            <div className="bg-slate-950 p-4 rounded-2xl text-left text-xs space-y-2 border border-slate-800">
              <p className="text-slate-400"><strong className="text-white">মেম্বার নাম:</strong> {currentUser.name}</p>
              <p className="text-slate-400"><strong className="text-white">ইমেইল / ফোন:</strong> {currentUser.email || currentUser.phone}</p>
              <p className="text-slate-400"><strong className="text-white">স্ট্যাটাস:</strong> <span className="text-rose-400 font-bold uppercase">{currentUser.status}</span></p>
            </div>
            <button
              onClick={() => handleLogout()}
              className="w-full py-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-white font-bold text-xs transition cursor-pointer"
            >
              অন্য একাউন্টে লগইন করুন (Log Out)
            </button>
          </div>
        ) : (
          <>
            {activeTab === 'discover' && (
          <DiscoverView
            profiles={discoverProfiles}
            currentUser={currentUser || undefined}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={(u) => setUserToUnlock(u)}
            onLike={handleLike}
            onPass={handlePass}
            onReportUser={(u) => setUserToReport(u)}
            onBlockUser={handleBlockUser}
            filters={filters}
            onApplyFilters={(f) => setFilters(f)}
            popularInterests={INITIAL_SYSTEM_SETTINGS.popularInterests}
            onRegisterLikeCurrent={(fn) => { likeCurrentRef.current = fn; }}
          />
        )}

        {activeTab === 'likes' && (
          <LikesYouView
            likers={likers}
            onLikeBack={handleLike}
            onPass={handlePass}
          />
        )}

        {activeTab === 'matches' && currentUser && (
          <MatchesView
            currentUser={currentUser}
            matches={matches}
            mode="matches"
            onNavigateToChat={(match) => {
              setSelectedChatMatch(match);
              setActiveTab('chats');
            }}
            notifications={notifications}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={(u) => setUserToUnlock(u)}
            onReportUser={(u) => setUserToReport(u)}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onStartVoiceCall={handleStartVoiceCall}
          />
        )}

        {activeTab === 'chats' && currentUser && (
          <MatchesView
            currentUser={currentUser}
            matches={matches}
            mode="chats"
            initialMatch={selectedChatMatch}
            notifications={notifications}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={(u) => setUserToUnlock(u)}
            onReportUser={(u) => setUserToReport(u)}
            onBlockUser={handleBlockUser}
            onUnblockUser={handleUnblockUser}
            onStartVoiceCall={handleStartVoiceCall}
          />
        )}

        {activeTab === 'notifications' && (
          <NotificationsView
            notifications={notifications}
            onMarkAllRead={handleMarkAllNotifsRead}
            onNotificationClick={(n) => {
              if (n.type === 'match') setActiveTab('matches');
              else if (n.type === 'like') setActiveTab('likes');
              else if (n.type === 'message') setActiveTab('chats');
            }}
          />
        )}

        {activeTab === 'profile' && currentUser && (
          <ProfileView
            currentUser={currentUser}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
            popularInterests={INITIAL_SYSTEM_SETTINGS.popularInterests}
          />
        )}

        {activeTab === 'admin' && (!isAdminUnlocked ? (
          <div className="flex flex-col items-center justify-center min-h-[80vh] px-4 py-12">
            <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 mx-auto flex items-center justify-center mb-4">
                <Lock className="w-6 h-6 text-rose-500" />
              </div>
              <h2 className="text-xl font-bold tracking-tight text-white mb-2">Admin Panel Access</h2>
              <p className="text-xs text-slate-400 mb-6">Enter the admin password to continue.</p>
              
              <form onSubmit={async (e) => {
                e.preventDefault();
                if (adminPasswordInput === 'MUNNA12061') {
                  // Log in automatically as usr_admin if available
                  try {
                    const res = await fetch('/api/auth/switch-user', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ userId: 'usr_admin' }),
                    });
                    if (res.ok) {
                      const data = await res.json();
                      setCurrentUser(data.user);
                    }
                  } catch (err) {
                    console.error('Failed to automatically login admin user profile:', err);
                  }
                  setIsAdminUnlocked(true);
                  sessionStorage.setItem('isAdminUnlocked', 'true');
                  setAdminPasswordError(null);
                } else {
                  setAdminPasswordError('Incorrect password. Please try again.');
                }
              }} className="space-y-4">
                <input
                  type="password"
                  placeholder="Enter admin password"
                  value={adminPasswordInput}
                  onChange={(e) => setAdminPasswordInput(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-4 py-3 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 text-center tracking-widest"
                  autoFocus
                />
                {adminPasswordError && (
                  <p className="text-xs text-rose-500 font-medium">{adminPasswordError}</p>
                )}
                <button
                  type="submit"
                  className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all"
                >
                  Unlock Admin Panel
                </button>
              </form>
            </div>
          </div>
        ) : (
          currentUser && (
            <AdminPanel
              currentUser={currentUser}
              onExitAdmin={() => setActiveTab('discover')}
            />
          )
        ))}
          </>
        )}
      </main>

      {/* Floating Mobile Bottom Navigation */}
      {activeTab !== 'landing' && (
        <MobileBottomNav
          currentUser={currentUser}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          unreadNotifsCount={unreadNotifsCount}
          likesCount={likers.length}
          onCenterHeartClick={handleCenterHeartClick}
        />
      )}
    </>
  )}

      {/* Authentication Modal */}
      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => setIsAuthOpen(false)}
        onLoginSuccess={(u) => {
          setCurrentUser(u);
          setActiveTab('discover');
        }}
      />

      {/* Match Celebration Modal */}
      {recentMatchUser && currentUser && (
        <MatchModal
          matchedUser={recentMatchUser}
          currentUser={currentUser}
          onClose={() => setRecentMatchUser(null)}
          onStartChat={() => {
            setRecentMatchUser(null);
            setActiveTab('matches');
          }}
        />
      )}

      {/* Report User Modal */}
      {userToReport && (
        <ReportModal
          reportedUser={userToReport}
          onClose={() => setUserToReport(null)}
          onSubmitReport={handleSubmitReport}
        />
      )}

      {/* Phone Number Payment Unlock Modal */}
      {userToUnlock && currentUser && (
        <UnlockPaymentModal
          currentUser={currentUser}
          targetUser={userToUnlock}
          onClose={() => setUserToUnlock(null)}
          onRequestSubmitted={() => fetchNotifications()}
        />
      )}

      {/* Premium Verification Badge Subscription Modal */}
      {showPremiumModal && currentUser && (
        <PremiumSubscriptionModal
          currentUser={currentUser}
          onClose={() => setShowPremiumModal(false)}
        />
      )}

      {/* Agora Voice Call Modal / HUD */}
      {activeCall && currentUser && (
        <VoiceCallModal
          call={activeCall}
          currentUser={currentUser}
          onClose={() => setActiveCall(null)}
        />
      )}

      {/* Entry Splash Screen & Multi-Language Warning Disclaimer */}
      {!hasAcceptedSplash && (
        <SplashDisclaimerModal
          onAccept={() => {
            setHasAcceptedSplash(true);
            if (!currentUser) {
              setIsAuthOpen(true);
            }
          }}
        />
      )}

    </div>
  );
}
