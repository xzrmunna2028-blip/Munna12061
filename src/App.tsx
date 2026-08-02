import React, { useState, useEffect } from 'react';
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
import { INITIAL_SYSTEM_SETTINGS } from './data/seedData';
import {
  initiateVoiceCall,
  listenForIncomingCalls
} from './services/callService';
import { updateUserOnlineStatus } from './services/chatService';
import { subscribeToUserUnlockedNumbers } from './services/unlockService';

export default function App() {
  const [hasAcceptedSplash, setHasAcceptedSplash] = useState(false);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeTab, setActiveTab] = useState<'discover' | 'likes' | 'matches' | 'notifications' | 'profile' | 'admin'>('discover');
  
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

  // Initial loads
  useEffect(() => {
    fetchCurrentSession();
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

  const fetchCurrentSession = async () => {
    try {
      const res = await fetch('/api/auth/me');
      const data = await res.json();
      if (res.ok && data.user) {
        setCurrentUser(data.user);
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
      const data = await res.json();
      if (res.ok) {
        setDiscoverProfiles(data.users || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchLikers = async () => {
    try {
      const res = await fetch('/api/likes-you');
      const data = await res.json();
      if (res.ok) {
        setLikers(data.likers || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMatches = async () => {
    try {
      const res = await fetch('/api/matches');
      const data = await res.json();
      if (res.ok) {
        setMatches(data.matches || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchNotifications = async () => {
    try {
      const res = await fetch('/api/notifications');
      const data = await res.json();
      if (res.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLike = async (targetUser: User) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUser.id, type: 'like' }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.isMatch) {
          setRecentMatchUser(targetUser);
          fetchMatches();
        }
        fetchLikers();
        fetchNotifications();
      }
    } catch (err) {
      console.error(err);
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

  const handleSubmitReport = async (reportedUserId: string, reason: string, details: string) => {
    await fetch('/api/reports', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reportedUserId, reason, details }),
    });
  };

  const handleUpdateProfile = async (updatedData: Partial<User>) => {
    const res = await fetch('/api/users/profile', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(updatedData),
    });
    const data = await res.json();
    if (res.ok) {
      setCurrentUser(data.user);
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
      const data = await res.json();
      if (res.ok) {
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

  const handleLogout = () => {
    if (currentUser) {
      updateUserOnlineStatus(currentUser.id, false);
    }
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
      />

      {/* Main Content Body */}
      <main className="transition-all duration-300">
        {activeTab === 'discover' && (
          <DiscoverView
            profiles={discoverProfiles}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={(u) => setUserToUnlock(u)}
            onLike={handleLike}
            onPass={handlePass}
            onReportUser={(u) => setUserToReport(u)}
            onBlockUser={handleBlockUser}
            filters={filters}
            onApplyFilters={(f) => setFilters(f)}
            popularInterests={INITIAL_SYSTEM_SETTINGS.popularInterests}
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
            notifications={notifications}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={(u) => setUserToUnlock(u)}
            onReportUser={(u) => setUserToReport(u)}
            onBlockUser={handleBlockUser}
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
              else if (n.type === 'message') setActiveTab('matches');
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

        {activeTab === 'admin' && currentUser && (
          <AdminPanel
            currentUser={currentUser}
            onExitAdmin={() => setActiveTab('discover')}
          />
        )}
      </main>

      {/* Floating Mobile Bottom Navigation */}
      <MobileBottomNav
        currentUser={currentUser}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        unreadNotifsCount={unreadNotifsCount}
        likesCount={likers.length}
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
          onAccept={() => setHasAcceptedSplash(true)}
        />
      )}

    </div>
  );
}
