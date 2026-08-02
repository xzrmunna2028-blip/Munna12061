import React, { useState, useEffect, useRef } from 'react';
import {
  MessageCircle,
  Send,
  Image as ImageIcon,
  CheckCircle2,
  ShieldAlert,
  Ban,
  Search,
  Sparkles,
  Phone,
  Reply,
  X,
  Check,
  CheckCheck,
  Maximize2,
  Minimize2,
  ShieldCheck,
  Bell
} from 'lucide-react';
import { Match, Message, User, NotificationItem } from '../types';
import {
  subscribeToMessages,
  sendFirestoreMessage,
  markFirestoreMessagesAsRead,
  setTypingStatus,
  subscribeToMatchTyping,
  subscribeToUserStatus
} from '../services/chatService';

interface MatchesViewProps {
  currentUser: User;
  matches: Match[];
  notifications?: NotificationItem[];
  unlockedMap?: Record<string, string>;
  onOpenUnlockModal?: (targetUser: User) => void;
  onReportUser: (user: User) => void;
  onBlockUser: (user: User) => void;
  onStartVoiceCall?: (targetUser: User, matchId: string) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  currentUser,
  matches,
  notifications = [],
  unlockedMap = {},
  onOpenUnlockModal,
  onReportUser,
  onBlockUser,
  onStartVoiceCall,
}) => {
  const [activeThreadType, setActiveThreadType] = useState<'match' | 'official'>('match');
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(matches[0] || null);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);

  // Filter official system notifications
  const officialNotifs = notifications.filter(
    (n) => n.userId === currentUser.id || n.userId === 'all' || n.type === 'system'
  );
  const latestOfficialNotif = officialNotifs[0];
  const officialLogo = latestOfficialNotif?.officialLogo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
  const officialTitle = latestOfficialNotif?.officialTitle || 'HeartSync Official (অফিশিয়াল সাপোর্ট)';

  // Real-time states
  const [typingMap, setTypingMap] = useState<Record<string, boolean>>({});
  const [partnerStatus, setPartnerStatus] = useState<{ isOnline: boolean; lastActive: string }>({
    isOnline: false,
    lastActive: 'Active recently',
  });

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const typingTimeoutRef = useRef<any>(null);

  const matchedUser = selectedMatch?.user1Id === currentUser.id ? selectedMatch?.user2 : selectedMatch?.user1;

  // Real-time Firestore Messages Subscription
  useEffect(() => {
    if (activeThreadType !== 'match' || !selectedMatch) return;

    fetchApiMessages(selectedMatch.id);

    const unsubscribeMsgs = subscribeToMessages(selectedMatch.id, (firestoreMsgs) => {
      if (firestoreMsgs.length > 0) {
        setMessages(firestoreMsgs);
      }
    });

    const unsubscribeTyping = subscribeToMatchTyping(selectedMatch.id, (typingData) => {
      setTypingMap(typingData);
    });

    markFirestoreMessagesAsRead(selectedMatch.id, currentUser.id);

    return () => {
      unsubscribeMsgs();
      unsubscribeTyping();
    };
  }, [selectedMatch?.id, currentUser.id, activeThreadType]);

  // Real-time Partner Presence Listener
  useEffect(() => {
    if (!matchedUser) return;
    setPartnerStatus({
      isOnline: !!matchedUser.isOnline,
      lastActive: matchedUser.lastActive || 'Active recently',
    });

    const unsubscribeStatus = subscribeToUserStatus(matchedUser.id, (status) => {
      setPartnerStatus(status);
    });

    return () => {
      unsubscribeStatus();
    };
  }, [matchedUser?.id]);

  // Auto-scroll on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typingMap, officialNotifs, activeThreadType]);

  const fetchApiMessages = async (matchId: string) => {
    try {
      const res = await fetch(`/api/messages/${matchId}`);
      const data = await res.json();
      if (res.ok && data.messages) {
        setMessages((prev) => (prev.length === 0 ? data.messages : prev));
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessageText(e.target.value);
    if (!selectedMatch || activeThreadType !== 'match') return;

    setTypingStatus(selectedMatch.id, currentUser.id, true);

    if (typingTimeoutRef.current) clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setTypingStatus(selectedMatch.id, currentUser.id, false);
    }, 2000);
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedMatch || activeThreadType !== 'match' || (!newMessageText.trim() && !imageInputUrl)) return;

    const content = newMessageText.trim();
    const imageUrl = imageInputUrl || undefined;
    const replyPayload = replyingTo
      ? {
          id: replyingTo.id,
          content: replyingTo.content,
          senderName: replyingTo.senderId === currentUser.id ? 'You' : matchedUser?.name,
        }
      : undefined;

    setNewMessageText('');
    setImageInputUrl('');
    setShowImagePicker(false);
    setReplyingTo(null);

    setTypingStatus(selectedMatch.id, currentUser.id, false);

    try {
      const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
      await sendFirestoreMessage(
        selectedMatch.id,
        currentUser.id,
        receiverId,
        content,
        imageUrl,
        replyPayload
      );
    } catch (err) {
      console.warn('Firestore send fallback to API:', err);
    }

    try {
      await fetch(`/api/messages/${selectedMatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content,
          imageUrl,
          replyTo: replyPayload,
        }),
      });
    } catch (err) {
      console.error(err);
    }
  };

  const filteredMatches = matches.filter((m) => {
    const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
    return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isPartnerTyping = matchedUser ? !!typingMap[matchedUser.id] : false;

  return (
    <div className="max-w-6xl mx-auto px-4 py-6 text-white pb-24 md:pb-12 h-[calc(100vh-5rem)]">
      
      {matches.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Matches Yet</h3>
          <p className="text-xs text-slate-400">
            When you and another member like each other's profile, your mutual match will appear here to unlock private messaging and voice calls!
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col md:flex-row">
          
          {/* LEFT SIDEBAR: Matches List */}
          <div className={`w-full md:w-80 border-r border-slate-800 flex flex-col bg-slate-900/60 ${selectedMatch ? 'hidden md:flex' : 'flex'}`}>
            
            <div className="p-4 border-b border-slate-800 space-y-3">
              <h2 className="text-lg font-extrabold tracking-tight text-white">Matches</h2>
              
              {/* Search Bar */}
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search for matches..."
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              {/* Horizontal Top Matches Cards Row (Matching Screenshot Screen 3) */}
              {matches.length > 0 && (
                <div className="pt-1">
                  <div className="flex space-x-2.5 overflow-x-auto pb-2 no-scrollbar">
                    {matches.map((m) => {
                      const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
                      if (!other) return null;
                      return (
                        <div
                          key={m.id}
                          onClick={() => setSelectedMatch(m)}
                          className="relative flex-shrink-0 w-20 aspect-[3/4] rounded-xl overflow-hidden bg-slate-800 border border-slate-700/80 cursor-pointer group shadow-sm hover:border-pink-500 transition-all"
                        >
                          <img src={other.avatar} alt={other.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                          
                          {/* Distance Badge Top Right */}
                          <span className="absolute top-1 right-1 px-1 py-0.5 rounded text-[8px] font-bold bg-slate-950/80 text-pink-300 backdrop-blur-sm">
                            {other.distanceKm || 3.7} km
                          </span>

                          <div className="absolute inset-x-0 bottom-0 p-1 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent">
                            <span className="text-[10px] font-bold text-white truncate block">{other.name}</span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Chats (28) & Requests (6) Filter Toggle Pills */}
              <div className="flex items-center space-x-2 pt-1">
                <button className="px-3.5 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 text-white shadow-sm">
                  Chats ({matches.length > 0 ? matches.length : 28})
                </button>
                <button className="px-3.5 py-1 rounded-full text-xs font-bold bg-slate-800 hover:bg-slate-700 text-slate-400 border border-slate-700/60">
                  Requests (6)
                </button>
              </div>

            </div>

            {/* Matches & Official Updates Scroll List */}
            <div className="flex-1 overflow-y-auto divide-y divide-slate-800/50">
              
              {/* OFFICIAL ADMIN ANNOUNCEMENTS THREAD ITEM */}
              <button
                onClick={() => setActiveThreadType('official')}
                className={`w-full p-3.5 flex items-center space-x-3 text-left transition-colors border-b border-purple-500/30 ${
                  activeThreadType === 'official'
                    ? 'bg-purple-500/20 border-l-4 border-purple-500'
                    : 'bg-gradient-to-r from-purple-950/40 via-slate-900 to-slate-900 hover:bg-slate-800/80'
                }`}
              >
                <div className="relative flex-shrink-0">
                  <img
                    src={officialLogo}
                    alt={officialTitle}
                    className="w-12 h-12 rounded-full object-cover border-2 border-purple-500 shadow-md"
                  />
                  <span className="w-4 h-4 rounded-full bg-purple-500 text-white text-[9px] font-bold flex items-center justify-center absolute -bottom-1 -right-1 border border-slate-950">
                    <Sparkles className="w-2.5 h-2.5" />
                  </span>
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between mb-1">
                    <h4 className="text-xs font-extrabold text-purple-200 truncate flex items-center gap-1">
                      {officialTitle}
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400 flex-shrink-0" />
                    </h4>
                    {latestOfficialNotif && (
                      <span className="text-[10px] text-purple-300 font-mono">
                        {new Date(latestOfficialNotif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-300/80 truncate font-medium">
                    {latestOfficialNotif ? `${latestOfficialNotif.title}: ${latestOfficialNotif.message}` : 'অফিশিয়াল সাপোর্ট ও প্লাটফর্ম আপডেটসমূহ...'}
                  </p>
                </div>
              </button>

              {/* USER MATCH CHATS LIST */}
              {filteredMatches.map((m) => {
                const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
                if (!other) return null;
                const isSelected = activeThreadType === 'match' && selectedMatch?.id === m.id;

                return (
                  <button
                    key={m.id}
                    onClick={() => {
                      setActiveThreadType('match');
                      setSelectedMatch(m);
                    }}
                    className={`w-full p-3.5 flex items-center space-x-3 text-left transition-colors ${
                      isSelected
                        ? 'bg-rose-500/10 border-l-4 border-rose-500'
                        : 'hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="relative flex-shrink-0">
                      <img
                        src={other.avatar}
                        alt={other.name}
                        className="w-12 h-12 rounded-full object-cover border border-slate-700"
                      />
                      {other.isOnline && (
                        <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-900 absolute bottom-0 right-0" />
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                          {other.name}
                          {other.verified && <CheckCircle2 className="w-3 h-3 text-sky-400" />}
                        </h4>
                        <span className="text-[10px] text-slate-400">
                          {new Date(m.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 truncate">
                        {m.lastMessage || 'Say hello 👋'}
                      </p>
                    </div>
                  </button>
                );
              })}
            </div>

          </div>

          {/* RIGHT MAIN PANEL: Private Chat or Official Updates Interface */}
          <div className={`flex-1 flex flex-col bg-slate-950 ${(!selectedMatch && activeThreadType === 'match') ? 'hidden md:flex items-center justify-center' : 'flex'}`}>
            
            {/* MODE 1: OFFICIAL ADMIN ANNOUNCEMENTS THREAD */}
            {activeThreadType === 'official' ? (
              <div className="flex-1 flex flex-col h-full bg-slate-950">
                {/* Official Header Bar (Clicking Header or Maximize Button triggers Full Screen!) */}
                <div className="p-3.5 bg-gradient-to-r from-purple-950/90 via-slate-900 to-slate-900 border-b border-purple-500/30 flex items-center justify-between shadow-lg">
                  <div
                    onClick={() => setIsFullScreen(true)}
                    className="flex items-center space-x-3 cursor-pointer group"
                    title="Click header to enter Full Screen View / ফুল স্ক্রিন করুন"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setActiveThreadType('match');
                      }}
                      className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      ←
                    </button>

                    <div className="relative">
                      <img
                        src={officialLogo}
                        alt={officialTitle}
                        className="w-10 h-10 rounded-full object-cover border-2 border-purple-500 group-hover:scale-105 transition-transform"
                      />
                      <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-white flex items-center justify-center absolute bottom-0 right-0 border border-slate-900">
                        <Sparkles className="w-2 h-2" />
                      </span>
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-purple-200 flex items-center gap-1.5 group-hover:text-purple-100 transition-colors">
                        {officialTitle}
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      </h3>
                      <p className="text-[10px] text-purple-300/80 flex items-center gap-1 font-medium">
                        Verified System Updates • (উপরে চাপ দিলে ফুল স্ক্রিন হবে)
                      </p>
                    </div>
                  </div>

                  {/* Header Actions: Full Screen Toggle Button */}
                  <div className="flex items-center space-x-2">
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5 transition-all shadow-md"
                      title="Open Full Screen / ফুল স্ক্রিন করুন"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-purple-300" />
                      <span className="hidden sm:inline">Full Screen / ফুল স্ক্রিন</span>
                    </button>
                  </div>
                </div>

                {/* Official Announcements Feed */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                  <div className="text-center my-2">
                    <span className="px-3.5 py-1 rounded-full text-[10px] font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center justify-center gap-1.5 max-w-max mx-auto">
                      <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      অফিশিয়াল সার্ভিস নোটিফিকেশন সেন্টার (HeartSync Official)
                    </span>
                  </div>

                  {officialNotifs.length > 0 ? (
                    officialNotifs.map((notif) => (
                      <div
                        key={notif.id}
                        className="bg-slate-900/90 border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-xl max-w-2xl mx-auto space-y-2.5 animate-fade-in"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="flex items-center space-x-2.5">
                            <img
                              src={notif.officialLogo || officialLogo}
                              alt="Official Emblem"
                              className="w-8 h-8 rounded-full object-cover border border-purple-500/50"
                            />
                            <div>
                              <h4 className="text-xs font-extrabold text-purple-200 flex items-center gap-1">
                                {notif.officialTitle || officialTitle}
                                <ShieldCheck className="w-3 h-3 text-purple-400" />
                              </h4>
                              <span className="text-[9px] text-slate-400">
                                {new Date(notif.createdAt).toLocaleString()}
                              </span>
                            </div>
                          </div>

                          <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 text-[9px] font-bold">
                            Official Announcement
                          </span>
                        </div>

                        <h4 className="text-sm font-bold text-white tracking-wide">
                          {notif.title}
                        </h4>

                        <p className="text-xs text-slate-200 leading-relaxed whitespace-pre-wrap">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-slate-900/40 border border-slate-800 rounded-3xl p-6">
                      <Bell className="w-10 h-10 text-slate-600 mx-auto mb-2" />
                      <p className="text-xs text-slate-400">কোন নোটিফিকেশন নেই।</p>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              </div>
            ) : selectedMatch && matchedUser ? (
              /* MODE 2: MATCH PRIVATE CHAT */
              <>
                {/* Chat Header Bar (Clicking Header or Maximize Button triggers Full Screen!) */}
                <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between shadow-md">
                  
                  <div
                    onClick={() => setIsFullScreen(true)}
                    className="flex items-center space-x-3 cursor-pointer group"
                    title="Click header to enter Full Screen View / ফুল স্ক্রিন করুন"
                  >
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMatch(null);
                      }}
                      className="md:hidden p-1 rounded-lg text-slate-400 hover:text-white"
                    >
                      ←
                    </button>

                    <div className="relative">
                      <img
                        src={matchedUser.avatar}
                        alt={matchedUser.name}
                        className="w-10 h-10 rounded-full object-cover group-hover:scale-105 transition-transform"
                      />
                      {partnerStatus.isOnline && (
                        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 border-2 border-slate-900 absolute bottom-0 right-0" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-xs font-bold text-white flex items-center gap-1 group-hover:text-rose-300 transition-colors">
                        {matchedUser.name}, {matchedUser.age}
                        {matchedUser.verified && <CheckCircle2 className="w-3.5 h-3.5 text-sky-400" />}
                      </h3>
                      <p className="text-[10px] text-slate-400 flex items-center gap-1">
                        {partnerStatus.isOnline ? (
                          <span className="text-emerald-400 font-medium">Active now</span>
                        ) : (
                          `Last active ${partnerStatus.lastActive}`
                        )}
                        <span className="text-slate-500">• (উপরে চাপ দিলে ফুল স্ক্রিন হবে)</span>
                      </p>
                    </div>
                  </div>

                  {/* Header Actions: Full Screen Toggle, Phone Unlock, Voice Call, Report, Block */}
                  <div className="flex items-center space-x-2">
                    {/* Full Screen Toggle Button */}
                    <button
                      onClick={() => setIsFullScreen(true)}
                      className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                      title="Open Full Screen / ফুল স্ক্রিন করুন"
                    >
                      <Maximize2 className="w-3.5 h-3.5 text-rose-400" />
                      <span className="hidden sm:inline text-[11px]">Full Screen / ফুল স্ক্রিন</span>
                    </button>

                    {/* Phone Number Unlock Display or Trigger */}
                    {unlockedMap[matchedUser.id] ? (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs font-bold font-mono flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{unlockedMap[matchedUser.id]}</span>
                        <span className="text-[9px] bg-emerald-500/20 text-emerald-300 px-1 rounded">Unlocked</span>
                      </div>
                    ) : (
                      onOpenUnlockModal && (
                        <button
                          onClick={() => onOpenUnlockModal(matchedUser)}
                          className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-md shadow-rose-500/20 flex items-center gap-1.5 transition-all"
                          title="Unlock Phone Number with bKash/Nagad"
                        >
                          <Phone className="w-3.5 h-3.5" />
                          <span className="hidden lg:inline">Unlock Number</span>
                        </button>
                      )
                    )}

                    {onStartVoiceCall && (
                      <button
                        onClick={() => onStartVoiceCall(matchedUser, selectedMatch.id)}
                        className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                        title="Start HD Voice Call"
                      >
                        <Phone className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Call</span>
                      </button>
                    )}
                    <button
                      onClick={() => onReportUser(matchedUser)}
                      className="p-1.5 rounded-lg text-amber-400 hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                      title="Report User"
                    >
                      <ShieldAlert className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onBlockUser(matchedUser)}
                      className="p-1.5 rounded-lg text-rose-400 hover:bg-slate-800 text-xs font-medium flex items-center gap-1"
                      title="Block User"
                    >
                      <Ban className="w-4 h-4" />
                    </button>
                  </div>

                </div>

                {/* Messages Thread Feed */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3">
                  <div className="text-center my-2">
                    <span className="px-3 py-1 rounded-full text-[10px] font-semibold bg-rose-500/10 text-rose-300 border border-rose-500/20">
                      🔒 Private encrypted match chat unlocked
                    </span>
                  </div>

                  {messages.map((msg) => {
                    const isMe = msg.senderId === currentUser.id;
                    return (
                      <div
                        key={msg.id}
                        className={`group flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                      >
                        {!isMe && (
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                            title="Reply to this message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}

                        <div
                          className={`max-w-[75%] rounded-2xl p-3 text-xs leading-relaxed ${
                            isMe
                              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none shadow-md'
                              : 'bg-slate-800 text-slate-200 border border-slate-700/80 rounded-bl-none'
                          }`}
                        >
                          {msg.replyTo && (
                            <div className={`p-2 rounded-lg mb-2 text-[10px] border-l-2 ${
                              isMe ? 'bg-rose-900/40 border-white/60 text-rose-100' : 'bg-slate-900/60 border-rose-400 text-slate-300'
                            }`}>
                              <span className="font-bold block mb-0.5">{msg.replyTo.senderName || 'Replied message'}:</span>
                              <p className="truncate">{msg.replyTo.content}</p>
                            </div>
                          )}

                          {msg.imageUrl && (
                            <img
                              src={msg.imageUrl}
                              alt="Attachment"
                              className="rounded-xl mb-2 max-h-48 w-full object-cover"
                            />
                          )}
                          <p>{msg.content}</p>

                          <div className={`flex items-center justify-end gap-1 text-[9px] mt-1 ${isMe ? 'text-rose-100' : 'text-slate-400'}`}>
                            <span>
                              {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                            {isMe && (
                              <span title={msg.isRead ? 'Read' : 'Delivered'}>
                                {msg.isRead ? (
                                  <CheckCheck className="w-3 h-3 text-sky-200" />
                                ) : (
                                  <Check className="w-3 h-3 text-rose-200/80" />
                                )}
                              </span>
                            )}
                          </div>
                        </div>

                        {isMe && (
                          <button
                            onClick={() => setReplyingTo(msg)}
                            className="opacity-0 group-hover:opacity-100 p-1 rounded-full bg-slate-800 text-slate-400 hover:text-white transition-opacity"
                            title="Reply to this message"
                          >
                            <Reply className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    );
                  })}

                  {isPartnerTyping && (
                    <div className="flex items-center space-x-2 text-slate-400 text-[11px] italic bg-slate-900/80 w-max px-3 py-1.5 rounded-full border border-slate-800">
                      <span className="flex space-x-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '0ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '150ms' }} />
                        <span className="w-1.5 h-1.5 rounded-full bg-rose-400 animate-bounce" style={{ animationDelay: '300ms' }} />
                      </span>
                      <span>{matchedUser.name} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* Reply Bar Preview */}
                {replyingTo && (
                  <div className="p-2.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between text-xs text-slate-300">
                    <div className="border-l-2 border-rose-500 pl-2">
                      <span className="font-bold text-[10px] text-rose-400 block">
                        Replying to {replyingTo.senderId === currentUser.id ? 'yourself' : matchedUser.name}:
                      </span>
                      <p className="truncate text-[11px] text-slate-400 max-w-md">{replyingTo.content}</p>
                    </div>
                    <button
                      onClick={() => setReplyingTo(null)}
                      className="p-1 rounded-full hover:bg-slate-800 text-slate-400 hover:text-white"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}

                {/* Image Picker Popup */}
                {showImagePicker && (
                  <div className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
                    <input
                      type="text"
                      value={imageInputUrl}
                      onChange={(e) => setImageInputUrl(e.target.value)}
                      placeholder="Paste image URL (e.g. https://...)"
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowImagePicker(false)}
                      className="text-xs text-slate-400 hover:text-white"
                    >
                      Done
                    </button>
                  </div>
                )}

                {/* Input Controls */}
                <form onSubmit={handleSendMessage} className="p-3 bg-slate-900 border-t border-slate-800 flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowImagePicker(!showImagePicker)}
                    className="p-2 rounded-xl bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
                  >
                    <ImageIcon className="w-4 h-4" />
                  </button>

                  <input
                    type="text"
                    value={newMessageText}
                    onChange={handleInputChange}
                    placeholder={`Message ${matchedUser.name}...`}
                    className="flex-1 bg-slate-800 border border-slate-700/80 rounded-xl px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />

                  <button
                    type="submit"
                    disabled={!newMessageText.trim() && !imageInputUrl}
                    className="p-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white font-bold disabled:opacity-40 transition-all shadow-md shadow-rose-500/20"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </form>

              </>
            ) : (
              <div className="text-center p-8 text-slate-500 text-xs">
                Select a match or official support thread from the left list to view messaging.
              </div>
            )}
          </div>

        </div>
      )}

      {/* FULL-SCREEN OVERLAY CHAT MODAL (FULL SCREEN VIEW) */}
      {isFullScreen && (
        <div className="fixed inset-0 z-[100] bg-slate-950 flex flex-col p-2 sm:p-6 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col max-w-5xl mx-auto w-full">
            
            {/* Full Screen Header */}
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {activeThreadType === 'official' ? (
                  <>
                    <img
                      src={officialLogo}
                      alt={officialTitle}
                      className="w-11 h-11 rounded-full object-cover border-2 border-purple-500"
                    />
                    <div>
                      <h3 className="text-sm font-extrabold text-purple-200 flex items-center gap-1.5">
                        {officialTitle}
                        <ShieldCheck className="w-4 h-4 text-purple-400" />
                      </h3>
                      <p className="text-xs text-purple-300/80">Full Screen Service Announcement Center</p>
                    </div>
                  </>
                ) : matchedUser ? (
                  <>
                    <img
                      src={matchedUser.avatar}
                      alt={matchedUser.name}
                      className="w-11 h-11 rounded-full object-cover border border-slate-700"
                    />
                    <div>
                      <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
                        {matchedUser.name}, {matchedUser.age}
                        {matchedUser.verified && <CheckCircle2 className="w-4 h-4 text-sky-400" />}
                      </h3>
                      <p className="text-xs text-emerald-400 font-medium">
                        {partnerStatus.isOnline ? 'Active now' : `Last active ${partnerStatus.lastActive}`}
                      </p>
                    </div>
                  </>
                ) : null}
              </div>

              {/* Exit Full Screen Button */}
              <button
                onClick={() => setIsFullScreen(false)}
                className="px-3.5 py-2 rounded-2xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/40 text-xs font-bold flex items-center gap-2 transition-all shadow-md"
              >
                <Minimize2 className="w-4 h-4" />
                <span>Exit Full Screen / ফুল স্ক্রিন নামাও</span>
              </button>
            </div>

            {/* Full Screen Feed Body */}
            <div className="flex-1 p-4 sm:p-6 overflow-y-auto space-y-4 bg-slate-950">
              {activeThreadType === 'official' ? (
                officialNotifs.length > 0 ? (
                  officialNotifs.map((notif) => (
                    <div
                      key={notif.id}
                      className="bg-slate-900 border border-purple-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl max-w-3xl mx-auto space-y-3"
                    >
                      <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                        <div className="flex items-center space-x-3">
                          <img
                            src={notif.officialLogo || officialLogo}
                            alt="Official Emblem"
                            className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                          />
                          <div>
                            <h4 className="text-sm font-extrabold text-purple-200 flex items-center gap-1">
                              {notif.officialTitle || officialTitle}
                              <ShieldCheck className="w-4 h-4 text-purple-400" />
                            </h4>
                            <span className="text-xs text-slate-400">
                              {new Date(notif.createdAt).toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <span className="px-2.5 py-1 rounded-full bg-purple-500/20 text-purple-300 text-xs font-bold border border-purple-500/30">
                          Official Notice
                        </span>
                      </div>

                      <h3 className="text-base font-bold text-white tracking-wide">
                        {notif.title}
                      </h3>

                      <p className="text-xs sm:text-sm text-slate-200 leading-relaxed whitespace-pre-wrap">
                        {notif.message}
                      </p>
                    </div>
                  ))
                ) : (
                  <div className="text-center py-16 text-slate-400 text-xs">
                    কোন নোটিফিকেশন নেই।
                  </div>
                )
              ) : (
                messages.map((msg) => {
                  const isMe = msg.senderId === currentUser.id;
                  return (
                    <div
                      key={msg.id}
                      className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[80%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                          isMe
                            ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none shadow-lg'
                            : 'bg-slate-900 text-slate-200 border border-slate-800 rounded-bl-none'
                        }`}
                      >
                        {msg.imageUrl && (
                          <img
                            src={msg.imageUrl}
                            alt="Attachment"
                            className="rounded-2xl mb-3 max-h-72 w-full object-cover"
                          />
                        )}
                        <p>{msg.content}</p>
                        <div className={`text-[10px] mt-2 text-right ${isMe ? 'text-rose-100' : 'text-slate-400'}`}>
                          {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Full Screen Input Bar if Match Chat */}
            {activeThreadType === 'match' && matchedUser && (
              <form onSubmit={handleSendMessage} className="p-4 bg-slate-900 border-t border-slate-800 flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={handleInputChange}
                  placeholder={`Message ${matchedUser.name}...`}
                  className="flex-1 bg-slate-800 border border-slate-700/80 rounded-2xl px-5 py-3 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() && !imageInputUrl}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs sm:text-sm disabled:opacity-40 transition-all shadow-lg"
                >
                  Send
                </button>
              </form>
            )}

          </div>
        </div>
      )}

    </div>
  );
};
