import React, { useState, useEffect, useRef } from 'react';
import { Lock } from 'lucide-react';
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
import { SplashDisclaimerModal } from './components/SplashDisclaimerModal';
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
import { auth, db } from './lib/firebase';
import { getSafeAvatar } from './lib/avatar';

export default function App() {
  const [hasAcceptedSplash, setHasAcceptedSplash] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'likes' | 'matches' | 'chats' | 'notifications' | 'profile' | 'admin'>('discover');
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
  const [siteSettings, setSiteSettings] = useState<{ appName?: string; siteLogoUrl?: string }>({});

  // Initial loads
  useEffect(() => {
    fetchCurrentSession();
    fetchSettings();
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

      return () => {
        unsubscribeCalls();
        unsubscribeUnlocks();
        updateUserOnlineStatus(currentUser.id, false);
      };
    }
  }, [currentUser, filters]);

  // Subscribe to real-time users collection from Firestore for instant sync
  useEffect(() => {
    const usersCol = collection(db, 'users');
    const unsubscribeUsers = onSnapshot(usersCol, (snapshot) => {
      const liveUsers: User[] = [];
      snapshot.forEach((d) => {
        if (d.exists()) {
          liveUsers.push(d.data() as User);
        }
      });
      fetch('/api/auth/sync-users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ users: liveUsers }),
      })
        .then(() => fetchDiscoverProfiles())
        .catch((err) => console.error('Sync users error:', err));
    }, (err) => {
      console.error('Realtime users collection snapshot error:', err);
    });

    return () => unsubscribeUsers();
  }, [filters]);

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
      console.error('getRedirectResult error:', err);
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
        setLikers(data.likers || []);
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
        setMatches(data.matches || []);
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
        setNotifications(data.notifications || []);
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
      </main>

      {/* Floating Mobile Bottom Navigation */}
      <MobileBottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifsCount={unreadNotifsCount}
        likesCount={likers.length}
        onCenterHeartClick={handleCenterHeartClick}
      />

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
