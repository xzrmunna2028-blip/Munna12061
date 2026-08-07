import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  Bell,
  Heart,
  ArrowLeft,
  Mic,
  Lock,
  Volume2,
  Eye,
  UserCheck,
  Plus,
  Camera,
  Smile,
  Copy,
  Trash2,
  MoreHorizontal,
  ThumbsUp,
  Paperclip,
  PhoneCall,
  SmilePlus
} from 'lucide-react';
import { Match, Message, User, NotificationItem } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { getSafeAvatar } from '../lib/avatar';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfileModal } from './UserProfileModal';
import {
  subscribeToMessages,
  sendFirestoreMessage,
  markFirestoreMessagesAsRead,
  setTypingStatus,
  subscribeToMatchTyping,
  subscribeToUserStatus,
  toggleMessageReaction,
  deleteFirestoreMessage
} from '../services/chatService';

interface MatchesViewProps {
  currentUser: User;
  matches: Match[];
  mode?: 'matches' | 'chats';
  initialMatch?: Match | null;
  onNavigateToChat?: (match: Match) => void;
  notifications?: NotificationItem[];
  unlockedMap?: Record<string, string>;
  onOpenUnlockModal?: (targetUser: User) => void;
  onReportUser: (user: User) => void;
  onBlockUser: (user: User) => void;
  onUnblockUser?: (user: User) => void;
  onStartVoiceCall?: (targetUser: User, matchId: string) => void;
}

export const MatchesView: React.FC<MatchesViewProps> = ({
  currentUser,
  matches,
  mode = 'matches',
  initialMatch = null,
  onNavigateToChat,
  notifications = [],
  unlockedMap = {},
  onOpenUnlockModal,
  onReportUser,
  onBlockUser,
  onUnblockUser,
  onStartVoiceCall,
}) => {
  const [activeThreadType, setActiveThreadType] = useState<'match' | 'official'>('match');
  const [activeInboxTab, setActiveInboxTab] = useState<'matches' | 'requests'>('matches');
  const [viewingProfileUser, setViewingProfileUser] = useState<User | null>(null);
  const [selectedMatch, setSelectedMatch] = useState<Match | null>(initialMatch || matches[0] || null);
  const [sentRequests, setSentRequests] = useState<User[]>([]);
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [newMessageText, setNewMessageText] = useState('');
  const [imageInputUrl, setImageInputUrl] = useState('');
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [replyingTo, setReplyingTo] = useState<Message | null>(null);
  const [selectedMsgForMenu, setSelectedMsgForMenu] = useState<Message | null>(null);
  const [showStickerDrawer, setShowStickerDrawer] = useState(false);
  const [activeStickerTab, setActiveStickerTab] = useState<'stickers' | 'gifs' | 'emojis'>('stickers');
  const [showPlusMenu, setShowPlusMenu] = useState(false);
  const [isDND, setIsDND] = useState(false);
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/blocks')
      .then(res => res.json())
      .then(data => {
        if (data?.blockedUsers) {
          setBlockedUsers(data.blockedUsers);
        }
      })
      .catch(() => {});
  }, []);

  const [candidates, setCandidates] = useState<User[]>([]);
  const [incomingRequests, setIncomingRequests] = useState<User[]>([]);
  const [actionSuccessMsg, setActionSuccessMsg] = useState<string | null>(null);

  // Unique Requests Memos (Guarantees zero duplicates)
  const uniqueSentRequests = useMemo(() => {
    const seen = new Set<string>();
    return sentRequests.filter((u) => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [sentRequests]);

  const uniqueIncomingRequests = useMemo(() => {
    const seen = new Set<string>();
    return incomingRequests.filter((u) => {
      if (!u || !u.id || seen.has(u.id)) return false;
      seen.add(u.id);
      return true;
    });
  }, [incomingRequests]);

  const openRequestChat = (u: User, isIncoming: boolean) => {
    const existingMatch = matches.find(m => (m.user1Id === u.id || m.user2Id === u.id));
    if (existingMatch) {
      setSelectedMatch(existingMatch);
    } else {
      const pendingMatch: Match = {
        id: [currentUser.id, u.id].sort().join('_'),
        user1Id: isIncoming ? u.id : currentUser.id,
        user2Id: isIncoming ? currentUser.id : u.id,
        user1: isIncoming ? u : currentUser,
        user2: isIncoming ? currentUser : u,
        status: 'pending',
        createdAt: new Date().toISOString()
      };
      setSelectedMatch(pendingMatch);
    }
    setActiveThreadType('match');
  };

  // Voice Note Recording State
  const [isRecordingVoice, setIsRecordingVoice] = useState(false);
  const [recordingTime, setRecordingTime] = useState(0);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const recordingTimerRef = useRef<any>(null);

  const startVoiceRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = reader.result as string;
          if (base64Audio && selectedMatch) {
            const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
            const content = `🎙️ Voice Note (${recordingTime}s)`;
            try {
              await sendFirestoreMessage(selectedMatch.id, currentUser.id, receiverId, content, base64Audio);
            } catch (_) {}
            try {
              await fetch(`/api/messages/${selectedMatch.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content, imageUrl: base64Audio }),
              });
            } catch (_) {}
          }
        };
        reader.readAsDataURL(audioBlob);
        stream.getTracks().forEach(track => track.stop());
      };

      mediaRecorder.start();
      setIsRecordingVoice(true);
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);
    } catch (err) {
      alert('Please allow microphone permissions.');
    }
  };

  const stopVoiceRecording = () => {
    if (mediaRecorderRef.current && isRecordingVoice) {
      mediaRecorderRef.current.stop();
      setIsRecordingVoice(false);
      if (recordingTimerRef.current) clearInterval(recordingTimerRef.current);
    }
  };

  const handleGalleryPhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (uploadEvent) => {
      const base64Url = uploadEvent.target?.result as string;
      if (base64Url) {
        setImageInputUrl(base64Url);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAcceptMatch = async () => {
    if (!selectedMatch) return;
    const matchedPartner = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2 : selectedMatch.user1;
    try {
      await fetch(`/api/matches/${selectedMatch.id}/accept`, { method: 'POST' });
      const matchRef = doc(db, 'matches', selectedMatch.id);
      await setDoc(matchRef, { status: 'accepted' }, { merge: true });
      setSelectedMatch(prev => prev ? { ...prev, status: 'accepted' } : null);
      setActionSuccessMsg(`Accepted request from ${matchedPartner?.name || 'User'}! You can chat now.`);
      setTimeout(() => setActionSuccessMsg(null), 4000);
      fetchIncomingRequests();
      fetchSentRequests();
    } catch (err) {
      console.error(err);
    }
  };

  const handleBlockMatch = async () => {
    if (!selectedMatch) return;
    const matchedPartner = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2 : selectedMatch.user1;
    if (!window.confirm(`Are you sure you want to block ${matchedPartner?.name || 'this user'}?`)) return;
    try {
      await fetch(`/api/matches/${selectedMatch.id}/block`, { method: 'POST' });
      setSelectedMatch(null);
      fetchIncomingRequests();
      fetchSentRequests();
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    if (initialMatch) {
      setSelectedMatch(initialMatch);
      setActiveThreadType('match');
    }
  }, [initialMatch]);

  useEffect(() => {
    fetchSentRequests();
    fetchCandidates();
    fetchIncomingRequests();
  }, [currentUser.id]);

  const fetchCandidates = async () => {
    try {
      const res = await fetch('/api/all-candidates');
      if (res.ok) {
        const data = await res.json();
        if (data.candidates) setCandidates(data.candidates);
      }
    } catch (err) {
      console.error('Failed to fetch candidates:', err);
    }
  };

  const fetchIncomingRequests = async () => {
    try {
      const res = await fetch('/api/likes-you');
      if (res.ok) {
        const data = await res.json();
        if (data.likers) setIncomingRequests(data.likers);
      }
    } catch (err) {
      console.error('Failed to fetch incoming requests:', err);
    }
  };

  const handleAcceptRequest = async (targetUser: User) => {
    try {
      const res = await fetch('/api/likes', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ toUserId: targetUser.id, type: 'like' }),
      });
      if (res.ok) {
        setActionSuccessMsg(`Accepted proposal from ${targetUser.name}!`);
        setTimeout(() => setActionSuccessMsg(null), 4000);
        fetchIncomingRequests();
        fetchSentRequests();
        window.location.reload();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchSentRequests = async () => {
    try {
      const res = await fetch('/api/sent-requests');
      const contentType = res.headers.get('content-type') || '';
      if (res.ok && contentType.includes('application/json')) {
        const data = await res.json();
        if (data.requests) {
          setSentRequests(data.requests);
        }
      }
    } catch (err) {
      console.error('Failed to fetch sent requests:', err);
    }
  };

  // Filter official system notifications
  const officialNotifs = notifications.filter(
    (n) => n.userId === currentUser.id || n.userId === 'all' || n.type === 'system'
  );
  const latestOfficialNotif = officialNotifs[0];
  const officialLogo = latestOfficialNotif?.officialLogo || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>";
  const officialTitle = latestOfficialNotif?.officialTitle || 'True Love Connect Official Support';

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

  const sendDirectMessage = async (content: string, imageUrl?: string) => {
    if (!selectedMatch || activeThreadType !== 'match') return;
    const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
    try {
      await sendFirestoreMessage(selectedMatch.id, currentUser.id, receiverId, content, imageUrl);
    } catch (_) {}
    try {
      await fetch(`/api/messages/${selectedMatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
      });
    } catch (_) {}
  };

  const handleReactionSelect = async (msg: Message, emoji: string) => {
    if (!selectedMatch) return;
    await toggleMessageReaction(selectedMatch.id, msg.id, currentUser.id, emoji);
    setSelectedMsgForMenu(null);
  };

  const handleCopyMessage = (msg: Message) => {
    if (msg.content) {
      navigator.clipboard.writeText(msg.content);
      setActionSuccessMsg('Copied message to clipboard!');
      setTimeout(() => setActionSuccessMsg(null), 3000);
    }
    setSelectedMsgForMenu(null);
  };

  const handleDeleteMessage = async (msg: Message) => {
    if (!selectedMatch) return;
    await deleteFirestoreMessage(selectedMatch.id, msg.id);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setSelectedMsgForMenu(null);
  };

  const filteredMatches = matches.filter((m) => {
    const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
    return other?.name.toLowerCase().includes(searchQuery.toLowerCase());
  });

  const isPartnerTyping = matchedUser ? !!typingMap[matchedUser.id] : false;

  // ==================== MODE 1: MATCHES LIST VIEW ====================
  if (mode === 'matches') {
    return (
      <div className="max-w-6xl mx-auto px-4 py-6 text-white pb-24 md:pb-12 space-y-6">
        
        {/* Top Header Banner */}
        <div className="bg-gradient-to-r from-rose-950 via-slate-900 to-purple-950 border border-rose-500/30 rounded-3xl p-5 sm:p-6 shadow-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center space-x-2 text-rose-400 font-extrabold text-lg sm:text-xl">
              <Sparkles className="w-6 h-6 text-rose-500 animate-pulse" />
              <span>My Matches</span>
            </div>
            <p className="text-xs text-slate-300 mt-1 max-w-xl">
              Here is your list of mutual matches. Click 'Chat & Call' to start communicating directly.
            </p>
          </div>
          <div className="flex items-center gap-2 bg-slate-950/80 px-4 py-2 rounded-2xl border border-slate-800 text-xs">
            <span className="text-slate-400">Total Matches:</span>
            <span className="font-extrabold text-pink-400 text-sm">{matches.length}</span>
          </div>
        </div>

        {/* Action Alert Banner */}
        {actionSuccessMsg && (
          <div className="p-3 rounded-2xl bg-gradient-to-r from-emerald-500/20 to-teal-500/20 border border-emerald-500/40 text-emerald-200 text-xs font-bold text-center shadow-lg animate-fade-in">
            ✨ {actionSuccessMsg}
          </div>
        )}

        {/* Search Input for Matched Profiles */}
        <div className="relative max-w-md">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search matched profiles..."
            className="w-full bg-slate-900 border border-slate-800 rounded-2xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500 shadow-md"
          />
        </div>

        {/* SECTION 1: MUTUAL MATCHES */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-slate-200 flex items-center justify-between px-1">
            <span className="flex items-center gap-2">
              <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
              <span>Mutual Matches ({filteredMatches.length})</span>
            </span>
          </h3>

          {filteredMatches.length === 0 ? (
            <div className="p-10 text-center bg-slate-900/80 border border-slate-800 rounded-3xl space-y-3">
              <div className="w-14 h-14 rounded-2xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                <Sparkles className="w-7 h-7" />
              </div>
              <h4 className="text-sm font-bold text-white">No Matches Found Yet</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Explore members in Discover and tap the heart icon to connect. When you both like each other, matches will appear here!
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredMatches.map((m) => {
                const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
                if (!other) return null;
                const unlockedNum = unlockedMap[other.id];

                return (
                  <div
                    key={m.id}
                    className="bg-slate-900 border border-slate-800 hover:border-rose-500/50 rounded-3xl p-4 flex flex-col justify-between shadow-xl transition-all group"
                  >
                    <div className="flex items-start space-x-3">
                      <div
                        className="relative shrink-0 cursor-pointer group-hover:opacity-90"
                        onClick={() => setViewingProfileUser(other)}
                      >
                        <img
                          src={getSafeAvatar(other)}
                          alt={other.name}
                          className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/40 group-hover:scale-105 transition-transform"
                          onError={(e) => {
                            e.currentTarget.src = getSafeAvatar(other);
                          }}
                        />
                        {other.isOnline && (
                          <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute -bottom-1 -right-1 shadow" />
                        )}
                      </div>

                      <div className="min-w-0 flex-1">
                        <div
                          className="flex items-center justify-between cursor-pointer"
                          onClick={() => setViewingProfileUser(other)}
                        >
                          <h4 className="text-sm font-extrabold text-white truncate flex items-center gap-1 hover:text-rose-300 transition-colors">
                            {other.name}
                            {other.verified && <VerificationBadge size={16} />}
                          </h4>
                        </div>

                        <p className="text-[11px] text-pink-300 font-medium truncate mt-0.5">
                          {other.age ? `${other.age} yrs • ` : ''}{other.location || 'Dhaka, Bangladesh'}
                        </p>

                        {/* Order of Badges: 1. Marital/Relationship Status -> 2. Matches -> 3. Pending */}
                        <div className="mt-1.5 flex items-center gap-1.5 flex-wrap">
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-purple-500/20 text-purple-300 border border-purple-500/30">
                            {other.maritalStatus || other.relationshipStatus || 'Single'}
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                            <Heart className="w-2.5 h-2.5 fill-rose-400" />
                            <span>Matches</span>
                          </span>

                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[9px] font-extrabold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                            <span>{m.status === 'pending' ? 'Pending' : 'Accepted'}</span>
                          </span>

                          {unlockedNum ? (
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                              <Phone className="w-2.5 h-2.5" />
                              <span>{unlockedNum}</span>
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => setViewingProfileUser(other)}
                        className="py-2.5 px-3 rounded-2xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 font-bold text-xs transition-all cursor-pointer flex items-center gap-1 shrink-0"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Profile</span>
                      </button>
                      <button
                        onClick={() => {
                          if (onNavigateToChat) {
                            onNavigateToChat(m);
                          } else {
                            setSelectedMatch(m);
                            setActiveThreadType('match');
                          }
                        }}
                        className="flex-1 py-2.5 px-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white font-bold text-xs shadow-lg shadow-rose-500/20 active:scale-95 transition-all flex items-center justify-center space-x-1.5 cursor-pointer"
                      >
                        <MessageCircle className="w-4 h-4" />
                        <span>Chat & Call</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* SECTION 2: INCOMING REQUESTS */}
        {uniqueIncomingRequests.length > 0 && (
          <div className="space-y-3 pt-4 border-t border-slate-800/60">
            <h3 className="text-sm font-bold text-emerald-300 flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Sparkles className="w-4 h-4" />
                <span>Incoming Proposals ({uniqueIncomingRequests.length})</span>
              </span>
              <span className="text-[10px] text-slate-400 font-normal">Accepting will add to your matches</span>
            </h3>

            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {uniqueIncomingRequests.map((user) => (
                <div
                  key={user.id}
                  className="p-3.5 bg-slate-900 border border-emerald-500/30 rounded-3xl flex flex-col justify-between space-y-3 shadow-md hover:border-emerald-500/60 transition-all"
                >
                  <div className="flex items-center space-x-3">
                    <img
                      src={getSafeAvatar(user)}
                      alt={user.name}
                      className="w-12 h-12 rounded-2xl object-cover border border-emerald-500/50 shrink-0 cursor-pointer"
                      onClick={() => setViewingProfileUser(user)}
                      onError={(e) => {
                        e.currentTarget.src = getSafeAvatar(user);
                      }}
                    />
                    <div className="min-w-0 flex-1">
                      <h4 className="text-xs font-bold text-white truncate flex items-center gap-1 cursor-pointer" onClick={() => setViewingProfileUser(user)}>
                        {user.name}
                        {user.verified && <VerificationBadge size={15} />}
                      </h4>
                      <p className="text-[10px] text-emerald-300 truncate">
                        {user.location || 'Dhaka'} • {user.distanceKm || 3.7} km away
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setViewingProfileUser(user)}
                      className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-300 border border-rose-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shrink-0"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      <span>Profile</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => openRequestChat(user, true)}
                      className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold hover:brightness-110 shadow active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-1"
                    >
                      <span>Chat & Accept</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* User Profile Details Modal */}
        {viewingProfileUser && (
          <UserProfileModal
            user={viewingProfileUser}
            onClose={() => setViewingProfileUser(null)}
            unlockedMap={unlockedMap}
            onOpenUnlockModal={onOpenUnlockModal}
            onLike={(targetUser) => handleAcceptRequest(targetUser)}
            onBlockUser={(targetUser) => onBlockUser(targetUser)}
          />
        )}

      </div>
    );
  }

  // ==================== MODE 2: CHATS INBOX & MESSAGING VIEW ====================
  return (
    <div className="w-full max-w-7xl mx-auto p-1 sm:p-2 md:p-4 text-white pb-20 md:pb-6 h-[calc(100vh-4.2rem)]">
      
      {matches.length === 0 && officialNotifs.length === 0 && uniqueIncomingRequests.length === 0 && uniqueSentRequests.length === 0 ? (
        <div className="text-center py-20 bg-slate-900 border border-slate-800 rounded-3xl p-8 max-w-md mx-auto">
          <div className="w-16 h-16 rounded-3xl bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto mb-4 border border-rose-500/20">
            <MessageCircle className="w-8 h-8" />
          </div>
          <h3 className="text-xl font-bold text-white mb-2">No Chat Conversations</h3>
          <p className="text-xs text-slate-400">
            Once you match or receive a request with any member, you can chat with them directly in real time from here!
          </p>
        </div>
      ) : (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl md:rounded-3xl overflow-hidden shadow-2xl h-full flex flex-col md:flex-row">
          
          {/* LEFT SIDEBAR: Conversations List */}
          <div
            className={`w-full md:w-80 border-r border-slate-800 flex flex-col h-full bg-slate-950/50 ${
              selectedMatch && activeThreadType === 'match' ? 'hidden md:flex' : 'flex'
            }`}
          >
            {/* Inbox Header */}
            <div className="p-4 border-b border-slate-800 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <MessageCircle className="w-5 h-5 text-rose-500" />
                  <h2 className="text-base font-extrabold text-white">Chat Inbox</h2>
                </div>
              </div>

              {/* Sub-Tabs: Matches vs Requests */}
              <div className="flex items-center gap-1.5 p-1 bg-slate-900 border border-slate-800 rounded-2xl">
                <button
                  type="button"
                  onClick={() => setActiveInboxTab('matches')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer ${
                    activeInboxTab === 'matches'
                      ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Heart className="w-3.5 h-3.5 fill-current" />
                  <span>Matches ({filteredMatches.length})</span>
                </button>
                <button
                  type="button"
                  onClick={() => setActiveInboxTab('requests')}
                  className={`flex-1 py-1.5 px-2.5 rounded-xl text-[11px] font-bold transition flex items-center justify-center gap-1 cursor-pointer relative ${
                    activeInboxTab === 'requests'
                      ? 'bg-gradient-to-r from-emerald-500 to-teal-500 text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Requests ({uniqueIncomingRequests.length + uniqueSentRequests.length})</span>
                  {uniqueIncomingRequests.length > 0 && (
                    <span className="w-2 h-2 rounded-full bg-rose-500 absolute top-1 right-1.5 animate-ping" />
                  )}
                </button>
              </div>

              {/* Search Bar */}
              <div className="relative">
                <Search className="w-3.5 h-3.5 text-slate-500 absolute left-3 top-2.5" />
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search messages..."
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>
            </div>

            {/* Conversation Threads Scroll List */}
            <div className="flex-1 overflow-y-auto p-2 space-y-1">
              
              {/* THREAD 1: Official System Announcements */}
              <div
                onClick={() => {
                  setActiveThreadType('official');
                  setSelectedMatch(null);
                }}
                className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer transition-all border ${
                  activeThreadType === 'official'
                    ? 'bg-purple-900/30 border-purple-500/50 shadow-md'
                    : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60'
                }`}
              >
                <div className="relative shrink-0">
                  <img
                    src={officialLogo}
                    alt={officialTitle}
                    className="w-11 h-11 rounded-full object-cover border-2 border-purple-500/60"
                  />
                  <span className="w-3.5 h-3.5 rounded-full bg-purple-500 text-white flex items-center justify-center absolute bottom-0 right-0 border border-slate-900 text-[8px]">
                    <Sparkles className="w-2 h-2" />
                  </span>
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between">
                    <h4 className="text-xs font-bold text-purple-200 truncate flex items-center gap-1">
                      {officialTitle}
                      <ShieldCheck className="w-3 h-3 text-purple-400" />
                    </h4>
                    {latestOfficialNotif && (
                      <span className="text-[9px] text-purple-300/70">
                        {new Date(latestOfficialNotif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </span>
                    )}
                  </div>
                  <p className="text-[11px] text-purple-300/80 truncate mt-0.5 font-medium">
                    {latestOfficialNotif ? latestOfficialNotif.message : 'Official Service Notification Center'}
                  </p>
                </div>
              </div>

              {/* TAB 1: MATCHES LIST */}
              {activeInboxTab === 'matches' && (
                <>
                  <div className="pt-2 pb-1 px-3">
                    <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                      Mutual Matches
                    </span>
                  </div>

                  {filteredMatches.length === 0 ? (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No matches found.
                    </div>
                  ) : (
                    filteredMatches.map((m) => {
                      const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
                      if (!other) return null;
                      const isSelected = activeThreadType === 'match' && selectedMatch?.id === m.id;

                      return (
                        <div
                          key={m.id}
                          onClick={() => {
                            setSelectedMatch(m);
                            setActiveThreadType('match');
                          }}
                          className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer transition-all border ${
                            isSelected
                              ? 'bg-gradient-to-r from-rose-500/20 to-purple-500/20 border-rose-500/50 shadow-md'
                              : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60'
                          }`}
                        >
                          <div
                            className="relative shrink-0 cursor-pointer"
                            onClick={(e) => {
                              e.stopPropagation();
                              setViewingProfileUser(other);
                            }}
                            title="Click to view profile"
                          >
                            <img
                              src={getSafeAvatar(other)}
                              alt={other.name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-700 hover:ring-2 hover:ring-rose-500 transition-all"
                              onError={(e) => {
                                e.currentTarget.src = getSafeAvatar(other);
                              }}
                            />
                            {other.isOnline && (
                              <span className="w-3 h-3 rounded-full bg-emerald-500 border-2 border-slate-950 absolute bottom-0 right-0 shadow" />
                            )}
                          </div>

                          <div className="min-w-0 flex-1">
                            <div className="flex items-center justify-between">
                              <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                {other.name}
                                {other.verified && <VerificationBadge size={15} />}
                              </h4>
                              <span className="text-[9px] text-slate-400">
                                {m.lastMessageAt ? new Date(m.lastMessageAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                              </span>
                            </div>
                            <p className="text-[11px] text-slate-400 truncate mt-0.5">
                              {typingMap[other.id] ? (
                                <span className="text-rose-400 font-bold animate-pulse">Typing...</span>
                              ) : (
                                m.lastMessage || 'Say hello!'
                              )}
                            </p>
                          </div>
                        </div>
                      );
                    })
                  )}
                </>
              )}

              {/* TAB 2: REQUESTS LIST (Incoming + Sent) */}
              {activeInboxTab === 'requests' && (
                <>
                  {/* INCOMING REQUESTS SECTION */}
                  {uniqueIncomingRequests.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <div className="pt-1 pb-1 px-3">
                        <span className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider flex items-center gap-1">
                          <Sparkles className="w-3 h-3" />
                          Incoming Requests ({uniqueIncomingRequests.length})
                        </span>
                      </div>

                      {uniqueIncomingRequests.map((u) => {
                        const isSelected = activeThreadType === 'match' && selectedMatch && (selectedMatch.user1Id === u.id || selectedMatch.user2Id === u.id);

                        return (
                          <div
                            key={u.id}
                            onClick={() => openRequestChat(u, true)}
                            className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-emerald-900/30 border-emerald-500/50 shadow-md'
                                : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60'
                            }`}
                          >
                            <img
                              src={getSafeAvatar(u)}
                              alt={u.name}
                              className="w-11 h-11 rounded-full object-cover border border-emerald-500/50 shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = getSafeAvatar(u);
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  {u.name}
                                  {u.verified && <VerificationBadge size={15} />}
                                </h4>
                                <span className="text-[9px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                                  Incoming
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                {u.location || 'Dhaka'} • Click to accept
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* SENT REQUESTS SECTION */}
                  {uniqueSentRequests.length > 0 && (
                    <div className="space-y-1 pt-2">
                      <div className="pt-1 pb-1 px-3">
                        <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider flex items-center gap-1">
                          <Heart className="w-3 h-3 text-rose-400" />
                          Sent Requests ({uniqueSentRequests.length})
                        </span>
                      </div>

                      {uniqueSentRequests.map((u) => {
                        const isSelected = activeThreadType === 'match' && selectedMatch && (selectedMatch.user1Id === u.id || selectedMatch.user2Id === u.id);

                        return (
                          <div
                            key={u.id}
                            onClick={() => openRequestChat(u, false)}
                            className={`p-3 rounded-2xl flex items-center space-x-3 cursor-pointer transition-all border ${
                              isSelected
                                ? 'bg-slate-800 border-rose-500/50 shadow-md'
                                : 'bg-slate-900/40 border-transparent hover:bg-slate-800/60'
                            }`}
                          >
                            <img
                              src={getSafeAvatar(u)}
                              alt={u.name}
                              className="w-11 h-11 rounded-full object-cover border border-slate-700 shrink-0"
                              onError={(e) => {
                                e.currentTarget.src = getSafeAvatar(u);
                              }}
                            />
                            <div className="min-w-0 flex-1">
                              <div className="flex items-center justify-between">
                                <h4 className="text-xs font-bold text-white truncate flex items-center gap-1">
                                  {u.name}
                                  {u.verified && <VerificationBadge size={15} />}
                                </h4>
                                <span className="text-[9px] font-bold text-amber-300 bg-amber-500/10 px-2 py-0.5 rounded-full border border-amber-500/20">
                                  Pending
                                </span>
                              </div>
                              <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                Chat will unlock when accepted
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {uniqueIncomingRequests.length === 0 && uniqueSentRequests.length === 0 && (
                    <div className="p-6 text-center text-xs text-slate-500">
                      No pending requests.
                    </div>
                  )}
                </>
              )}

            </div>
          </div>

          {/* RIGHT PANEL: Chat Conversation Room */}
          <div
            className={`flex-1 flex flex-col h-full bg-slate-900/90 relative ${
              selectedMatch || activeThreadType === 'official' ? 'flex' : 'hidden md:flex'
            }`}
          >
            {activeThreadType === 'official' ? (
              /* OFFICIAL SYSTEM CHAT STREAM */
              <div className="flex-1 flex flex-col h-full">
                {/* Header */}
                <div className="p-3.5 bg-slate-950 border-b border-purple-500/30 flex items-center justify-between shadow-md">
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => {
                        setActiveThreadType('match');
                        setSelectedMatch(matches[0] || null);
                      }}
                      className="md:hidden p-1.5 rounded-xl text-slate-300 hover:bg-slate-800"
                      title="Back to Inbox"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <img
                      src={officialLogo}
                      alt={officialTitle}
                      className="w-10 h-10 rounded-full object-cover border-2 border-purple-500"
                    />

                    <div>
                      <h3 className="text-xs font-bold text-purple-200 flex items-center gap-1.5">
                        {officialTitle}
                        <ShieldCheck className="w-3.5 h-3.5 text-purple-400" />
                      </h3>
                      <p className="text-[10px] text-purple-300/80">
                        Verified System Announcements
                      </p>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsFullScreen(true)}
                    className="px-3 py-1.5 rounded-xl bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/40 text-purple-200 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Maximize2 className="w-3.5 h-3.5 text-purple-300" />
                    <span className="hidden sm:inline">Full Screen</span>
                  </button>
                </div>

                {/* Announcement List */}
                <div className="flex-1 p-4 md:p-6 overflow-y-auto space-y-4">
                  {officialNotifs.length > 0 ? (
                    officialNotifs.map((notif) => (
                      <div
                        key={notif.id}
                        className="bg-slate-950 border border-purple-500/30 rounded-3xl p-4 sm:p-5 shadow-xl max-w-2xl mx-auto space-y-2"
                      >
                        <div className="flex items-center justify-between pb-2 border-b border-slate-800/80">
                          <div className="flex items-center space-x-2">
                            <ShieldCheck className="w-4 h-4 text-purple-400" />
                            <span className="text-xs font-bold text-purple-300">Official Notice</span>
                          </div>
                          <span className="text-[9px] text-slate-400">
                            {new Date(notif.createdAt).toLocaleString()}
                          </span>
                        </div>
                        <h4 className="text-sm font-bold text-white">{notif.title}</h4>
                        <p className="text-xs text-slate-300 leading-relaxed whitespace-pre-wrap">
                          {notif.message}
                        </p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 text-slate-500 text-xs">
                      No official notifications.
                    </div>
                  )}
                </div>
              </div>
            ) : selectedMatch && matchedUser ? (
              /* PRIVATE MATCH CHAT STREAM */
              <div className="flex-1 flex flex-col h-full relative">
                    {/* Chat Top Header - Prominent & Clear Design */}
                <div className="p-3.5 sm:p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between shadow-md">
                  <div
                    onClick={() => setViewingProfileUser(matchedUser)}
                    className="flex items-center space-x-3 cursor-pointer hover:opacity-95 transition-opacity"
                    title="Click to view full profile"
                  >
                    {/* Back Button on Mobile */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedMatch(null);
                      }}
                      className="md:hidden p-2 rounded-xl text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
                      title="Back to Conversations"
                    >
                      <ArrowLeft className="w-5 h-5" />
                    </button>

                    <div className="relative shrink-0">
                      <img
                        src={getSafeAvatar(matchedUser)}
                        alt={matchedUser.name}
                        className="w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover border-2 border-rose-500/80 shadow-md hover:scale-105 transition-transform"
                        onError={(e) => {
                          e.currentTarget.src = getSafeAvatar(matchedUser);
                        }}
                      />
                      {partnerStatus.isOnline ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute bottom-0 right-0 shadow-lg ring-2 ring-emerald-400/50" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-500 border-2 border-slate-950 absolute bottom-0 right-0 shadow" />
                      )}
                    </div>

                    <div>
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 hover:text-rose-400 transition-colors">
                        <span>{matchedUser.name}, {matchedUser.age}</span>
                        {matchedUser.verified && <VerificationBadge size={18} />}
                      </h3>
                      <div className="text-xs text-slate-300 font-semibold flex items-center gap-2 mt-0.5">
                        {partnerStatus.isOnline ? (
                          <span className="text-emerald-400 font-bold flex items-center gap-1.5 bg-emerald-500/10 px-2 py-0.5 rounded-full border border-emerald-500/20">
                            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                            Online Now
                          </span>
                        ) : (
                          <span className="text-slate-400">Active: {partnerStatus.lastActive}</span>
                        )}
                        <span className="text-slate-500">•</span>
                        <span className="text-rose-300 font-medium">{matchedUser.distanceKm || 2.5} km away</span>
                      </div>
                    </div>
                  </div>

                  {/* Header Quick Actions - Larger Prominent Buttons */}
                  <div className="flex items-center space-x-2">
                    {unlockedMap[matchedUser.id] && (
                      <div className="px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs font-bold font-mono flex items-center gap-1.5 shadow">
                        <Phone className="w-3.5 h-3.5 text-emerald-400" />
                        <span>{unlockedMap[matchedUser.id]}</span>
                      </div>
                    )}

                    {onStartVoiceCall && (
                      <button
                        onClick={() => onStartVoiceCall(matchedUser, selectedMatch.id)}
                        className="p-2.5 sm:p-3 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow hover:scale-105 transition"
                        title="Voice Call"
                      >
                        <Phone className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}

                    {/* DND / Status Toggle for Current User */}
                    <button
                      onClick={() => setIsDND(!isDND)}
                      className={`p-2.5 sm:p-3 rounded-2xl border text-xs font-bold flex items-center gap-1 cursor-pointer transition ${
                        isDND
                          ? 'bg-amber-500/20 border-amber-500/50 text-amber-300'
                          : 'bg-slate-800 hover:bg-slate-700 border-slate-700 text-slate-300'
                      }`}
                      title={isDND ? 'Do Not Disturb (Active)' : 'Toggle Do Not Disturb'}
                    >
                      <Bell className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400" />
                    </button>

                    <button
                      onClick={() => onReportUser(matchedUser)}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold cursor-pointer transition hover:scale-105"
                      title="Report User"
                    >
                      <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    {blockedUsers.some(b => b.id === matchedUser.id) ? (
                      <button
                        onClick={() => onUnblockUser && onUnblockUser(matchedUser)}
                        className="px-3 py-2 rounded-2xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold flex items-center gap-1 cursor-pointer shadow hover:scale-105 transition"
                        title="Unblock User"
                      >
                        <UserCheck className="w-4 h-4" />
                        <span className="hidden sm:inline">Unblock</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => onBlockUser(matchedUser)}
                        className="p-2.5 sm:p-3 rounded-2xl bg-slate-800 hover:bg-rose-950/60 border border-slate-700 hover:border-rose-500/40 text-rose-400 text-xs font-bold cursor-pointer transition hover:scale-105"
                        title="Block User"
                      >
                        <Ban className="w-4 h-4 sm:w-5 sm:h-5" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Recipient Accept/Block proposal Banner */}
                {(selectedMatch as any)?.status === 'pending' && selectedMatch.user2Id === currentUser.id && (
                  <div className="p-4 bg-gradient-to-r from-emerald-950 via-slate-900 to-emerald-950 border-b border-emerald-500/40 flex flex-col sm:flex-row items-center justify-between gap-3 shadow-xl">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                        <Sparkles className="w-5 h-5 text-emerald-300 animate-pulse" />
                      </div>
                      <div>
                        <h4 className="text-xs font-bold text-white">New Connection Request Received</h4>
                        <p className="text-[11px] text-emerald-200/80">
                          {matchedUser?.name} sent you a proposal message. Accept to start chatting or block.
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 w-full sm:w-auto shrink-0">
                      <button
                        type="button"
                        onClick={handleAcceptMatch}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white text-xs font-extrabold shadow-md active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        <span>Accept Request</span>
                      </button>
                      <button
                        type="button"
                        onClick={handleBlockMatch}
                        className="flex-1 sm:flex-initial px-4 py-2 rounded-xl bg-slate-800 hover:bg-rose-950 text-rose-300 border border-rose-500/30 hover:border-rose-500/60 text-xs font-extrabold active:scale-95 transition cursor-pointer flex items-center justify-center gap-1.5"
                      >
                        <Ban className="w-4 h-4" />
                        <span>Block User</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* Messages Chat Stream Area */}
                <div className="flex-1 p-4 overflow-y-auto space-y-3 bg-slate-950/60 relative">
                  {messages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-white">Start chatting with {matchedUser.name}!</p>
                      <p className="text-[11px] text-slate-400">Send a friendly greeting to start the conversation.</p>
                    </div>
                  ) : (
                    messages.map((msg, msgIdx) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isAudio = msg.imageUrl && (msg.imageUrl.startsWith('data:audio') || msg.content.includes('🎙️'));
                      const isAudioCallCard = msg.content.includes('Audio call') || msg.content.includes('Voice call') || msg.content.includes('Call back') || msg.content.includes('Call again');
                      const isLatestMessage = msgIdx === messages.length - 1;
                      const isSelected = selectedMsgForMenu?.id === msg.id;

                      return (
                        <div
                          key={msg.id}
                          className={`flex items-end gap-2 relative ${isMe ? 'justify-end' : 'justify-start'}`}
                        >
                          {!isMe && (
                            <img
                              src={getSafeAvatar(matchedUser)}
                              alt=""
                              className="w-7 h-7 rounded-full object-cover border border-slate-700 shrink-0 mb-1"
                            />
                          )}

                          <div className="relative max-w-[82%] group">
                            {/* FLOATING REACTION BAR DIRECTLY ABOVE MESSAGE ON CLICK/LONG-PRESS */}
                            {isSelected && (
                              <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-30 flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-slate-900 border border-slate-700/80 shadow-2xl animate-in fade-in zoom-in-90 duration-150">
                                {['😆', '❤️', '😮', '😢', '😡', '🥰', '👍'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={() => handleReactionSelect(msg, emoji)}
                                    className="text-lg hover:scale-130 transition-transform active:scale-95 cursor-pointer p-0.5"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={() => {
                                    const custom = prompt('Enter reaction emoji:');
                                    if (custom) handleReactionSelect(msg, custom);
                                  }}
                                  className="w-6 h-6 rounded-full bg-slate-800 text-slate-300 hover:text-white flex items-center justify-center text-xs font-bold border border-slate-700 cursor-pointer"
                                >
                                  +
                                </button>
                              </div>
                            )}

                            {/* MESSAGE BUBBLE */}
                            <div
                              onClick={() => setSelectedMsgForMenu(isSelected ? null : msg)}
                              className={`relative rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-lg transition-all cursor-pointer select-none ${
                                isMe
                                  ? 'bg-gradient-to-r from-blue-600 via-indigo-600 to-sky-600 text-white font-medium rounded-br-xs border border-sky-400/20'
                                  : 'bg-slate-800/95 text-slate-100 border border-slate-700/80 rounded-bl-xs'
                              } ${isSelected ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950' : ''}`}
                            >
                              {/* AUDIO CALL CARD (MESSENGER STYLE) */}
                              {isAudioCallCard ? (
                                <div className="space-y-2.5 p-1 min-w-[200px]">
                                  <div className="flex items-center space-x-3">
                                    <div className="w-10 h-10 rounded-full bg-slate-700/80 flex items-center justify-center shrink-0">
                                      <Phone className="w-5 h-5 text-sky-400" />
                                    </div>
                                    <div>
                                      <p className="text-xs font-bold text-white">Audio call</p>
                                      <p className="text-[11px] text-slate-300">
                                        {msg.content.includes('secs') ? msg.content.split('Audio call')[1] || 'Completed' : 'Completed call'}
                                      </p>
                                    </div>
                                  </div>
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (onStartVoiceCall) onStartVoiceCall(matchedUser, selectedMatch.id);
                                    }}
                                    className="w-full py-1.5 px-3 rounded-xl bg-slate-700/90 hover:bg-slate-600 text-white font-bold text-xs transition shadow cursor-pointer text-center"
                                  >
                                    {isMe ? 'Call again' : 'Call back'}
                                  </button>
                                </div>
                              ) : isAudio ? (
                                <div className="space-y-1">
                                  <p className="text-xs font-bold flex items-center gap-1">
                                    <Mic className="w-3.5 h-3.5 text-sky-300 animate-pulse" />
                                    <span>{msg.content}</span>
                                  </p>
                                  <audio controls src={msg.imageUrl} className="w-full h-8 rounded-lg mt-1" />
                                </div>
                              ) : (
                                <>
                                  {msg.replyTo && (
                                    <div className="mb-2 p-2 rounded-xl bg-slate-950/40 border-l-2 border-sky-400 text-[11px] opacity-90">
                                      <span className="font-bold text-sky-300 block">{msg.replyTo.senderName}</span>
                                      <span className="truncate block">{msg.replyTo.content}</span>
                                    </div>
                                  )}

                                  {msg.imageUrl && (
                                    <img
                                      src={msg.imageUrl}
                                      alt="Attachment"
                                      className="rounded-xl mb-2 max-h-60 w-full object-cover border border-slate-700/50"
                                    />
                                  )}
                                  <p className="whitespace-pre-wrap">{msg.content}</p>
                                </>
                              )}

                              {/* REACTION BADGE ON BOTTOM RIGHT */}
                              {msg.reactions && msg.reactions.length > 0 && (
                                <div className={`absolute -bottom-2.5 ${isMe ? 'left-2' : 'right-2'} flex items-center gap-0.5 px-1.5 py-0.5 rounded-full bg-slate-900 border border-slate-700 text-[11px] shadow-md z-10`}>
                                  {Array.from(new Set(msg.reactions.map(r => r.emoji))).map(e => (
                                    <span key={e}>{e}</span>
                                  ))}
                                  {msg.reactions.length > 1 && (
                                    <span className="text-[10px] text-slate-300 font-bold ml-0.5">{msg.reactions.length}</span>
                                  )}
                                </div>
                              )}

                              {/* MESSENGER TIME & DELIVERED / SEEN AVATAR */}
                              <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                                <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                
                                {isMe && (
                                  <div className="flex items-center gap-1 font-semibold">
                                    <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                  </div>
                                )}
                              </div>
                            </div>

                            {/* MESSENGER SEEN AVATAR INDICATOR AT BOTTOM RIGHT (SCREENSHOT 1 & 2) */}
                            {isMe && (msg.isRead || isLatestMessage) && (
                              <div className="flex justify-end mt-1">
                                <img
                                  src={getSafeAvatar(matchedUser)}
                                  alt="Seen"
                                  className="w-4 h-4 rounded-full object-cover border border-slate-900 shadow-sm"
                                  title={`Seen by ${matchedUser.name}`}
                                />
                              </div>
                            )}
                          </div>
                        </div>
                      );
                    })
                  )}

                  {isPartnerTyping && (
                    <div className="flex items-center space-x-2 text-rose-400 text-xs italic pl-2">
                      <span className="w-2 h-2 rounded-full bg-rose-400 animate-ping" />
                      <span>{matchedUser.name} is typing...</span>
                    </div>
                  )}

                  <div ref={messagesEndRef} />
                </div>

                {/* BOTTOM MESSENGER MESSAGE ACTION MENU BAR (SCREENSHOT 2) */}
                {selectedMsgForMenu && (
                  <div className="bg-slate-900 border-t border-slate-800 p-2.5 flex items-center justify-around shadow-2xl animate-in slide-in-from-bottom-5 duration-200 z-40">
                    <button
                      onClick={() => {
                        setReplyingTo(selectedMsgForMenu);
                        setSelectedMsgForMenu(null);
                      }}
                      className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer active:scale-95 text-xs font-semibold"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Reply className="w-4 h-4 text-sky-400" />
                      </div>
                      <span>Reply</span>
                    </button>

                    <button
                      onClick={() => handleCopyMessage(selectedMsgForMenu)}
                      className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer active:scale-95 text-xs font-semibold"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <Copy className="w-4 h-4 text-emerald-400" />
                      </div>
                      <span>Copy</span>
                    </button>

                    {selectedMsgForMenu.senderId === currentUser.id && (
                      <button
                        onClick={() => handleDeleteMessage(selectedMsgForMenu)}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-rose-400 cursor-pointer active:scale-95 text-xs font-semibold"
                      >
                        <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </div>
                        <span>Delete</span>
                      </button>
                    )}

                    <button
                      onClick={() => setSelectedMsgForMenu(null)}
                      className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer active:scale-95 text-xs font-semibold"
                    >
                      <div className="w-9 h-9 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <MoreHorizontal className="w-4 h-4 text-slate-400" />
                      </div>
                      <span>Close</span>
                    </button>
                  </div>
                )}

                {/* 3 Proposal Messages & 24 Hour Lock Rule Logic */}
                {(() => {
                  const isPending = (selectedMatch as any)?.status === 'pending' && selectedMatch.user1Id === currentUser.id;
                  const mySent = messages.filter(m => m.senderId === currentUser.id);
                  const sentCount = mySent.length;
                  const lastSentMsg = mySent[mySent.length - 1];
                  
                  let isLocked24h = false;
                  let hoursLeft = 24;

                  if (isPending && sentCount >= 3 && lastSentMsg) {
                    const elapsedMs = Date.now() - new Date(lastSentMsg.createdAt).getTime();
                    const hoursElapsed = elapsedMs / (1000 * 60 * 60);
                    if (hoursElapsed < 24) {
                      isLocked24h = true;
                      hoursLeft = Math.ceil(24 - hoursElapsed);
                    }
                  }

                  if (isPending && isLocked24h) {
                    return (
                      <div className="p-4 bg-slate-950 border-t border-slate-800 text-center space-y-1.5 shadow-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs font-bold">
                          <Lock className="w-4 h-4 text-amber-400" />
                          <span>Messaging Paused ({sentCount}/3 Messages Sent)</span>
                        </div>
                        <p className="text-[11px] text-slate-300 max-w-md mx-auto leading-relaxed">
                          You have sent {sentCount} proposal messages. You can send 1 message every 24 hours (next available in ~{hoursLeft} hours), or unlimited once {matchedUser.name} accepts your connection request!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-950 border-t border-slate-800/80 flex flex-col">
                      {isPending && (
                        <div className="text-[10px] text-rose-300 font-bold bg-rose-500/10 border-b border-rose-500/20 px-3 py-1 text-center">
                          💬 Request Pending: You can send {3 - (sentCount % 3)} proposal message(s) (Limit: 3 initial messages or 1 per 24h until accepted)
                        </div>
                      )}

                      {replyingTo && (
                        <div className="flex items-center justify-between px-3 py-1.5 bg-slate-900 border-b border-slate-800 text-xs">
                          <div className="flex items-center space-x-2 truncate">
                            <Reply className="w-3.5 h-3.5 text-sky-400 shrink-0" />
                            <span className="text-slate-400">Replying to:</span>
                            <span className="text-white font-medium truncate">{replyingTo.content}</span>
                          </div>
                          <button onClick={() => setReplyingTo(null)} className="text-slate-400 hover:text-white p-1">
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {imageInputUrl && (
                        <div className="p-2 relative inline-block w-20 h-20 rounded-xl overflow-hidden border border-sky-500 m-2">
                          <img src={imageInputUrl} alt="Preview" className="w-full h-full object-cover rounded-lg" />
                          <button
                            type="button"
                            onClick={() => setImageInputUrl('')}
                            className="absolute top-1 right-1 p-1 rounded-full bg-slate-950/80 text-white"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}

                      {/* MESSENGER STYLE INPUT TOOLBAR (SCREENSHOT 3) */}
                      <form onSubmit={handleSendMessage} className="p-2.5 flex items-center space-x-1.5">
                        {/* Plus Menu Button */}
                        <div className="relative">
                          <button
                            type="button"
                            onClick={() => setShowPlusMenu(!showPlusMenu)}
                            className="p-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white transition active:scale-95 cursor-pointer shrink-0"
                            title="More Options"
                          >
                            <Plus className="w-4 h-4" />
                          </button>

                          {showPlusMenu && (
                            <div className="absolute bottom-12 left-0 z-50 bg-slate-900 border border-slate-700 rounded-2xl p-2 shadow-2xl flex flex-col gap-1 w-44 animate-in fade-in zoom-in-95">
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPlusMenu(false);
                                  if (onStartVoiceCall) onStartVoiceCall(matchedUser, selectedMatch.id);
                                }}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-bold transition text-left cursor-pointer"
                              >
                                <PhoneCall className="w-4 h-4 text-sky-400" />
                                <span>Voice Call</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => {
                                  setShowPlusMenu(false);
                                  sendDirectMessage(`📍 Shared Location: Dhaka, Bangladesh`);
                                }}
                                className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-slate-800 text-slate-200 text-xs font-bold transition text-left cursor-pointer"
                              >
                                <Sparkles className="w-4 h-4 text-emerald-400" />
                                <span>Share Location</span>
                              </button>
                            </div>
                          )}
                        </div>

                        {/* Camera Button */}
                        <label
                          htmlFor="chat-camera-upload"
                          className="p-2 rounded-full text-sky-400 hover:bg-slate-900 transition cursor-pointer shrink-0"
                          title="Take or send Photo"
                        >
                          <Camera className="w-5 h-5" />
                        </label>
                        <input
                          id="chat-camera-upload"
                          type="file"
                          accept="image/*"
                          capture="environment"
                          className="hidden"
                          onChange={handleGalleryPhotoSelect}
                        />

                        {/* Gallery Photo Button */}
                        <label
                          htmlFor="chat-file-upload"
                          className="p-2 rounded-full text-sky-400 hover:bg-slate-900 transition cursor-pointer shrink-0"
                          title="Upload Photo from Gallery"
                        >
                          <ImageIcon className="w-5 h-5" />
                        </label>
                        <input
                          id="chat-file-upload"
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleGalleryPhotoSelect}
                        />

                        {/* Mic Voice Note Button */}
                        <button
                          type="button"
                          onClick={isRecordingVoice ? stopVoiceRecording : startVoiceRecording}
                          className={`p-2 rounded-full transition shrink-0 cursor-pointer ${
                            isRecordingVoice
                              ? 'bg-rose-600 text-white animate-pulse'
                              : 'text-sky-400 hover:bg-slate-900'
                          }`}
                          title={isRecordingVoice ? "Stop recording & send" : "Record Voice Note"}
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        {/* Input Box with Smiley Face inside */}
                        <div className="flex-1 relative flex items-center">
                          <input
                            type="text"
                            value={newMessageText}
                            onChange={handleInputChange}
                            placeholder={isRecordingVoice ? `Recording (${recordingTime}s)...` : `Message...`}
                            disabled={isRecordingVoice}
                            className="w-full bg-slate-900 border border-slate-800 rounded-full pl-4 pr-10 py-2 text-xs sm:text-sm text-white placeholder-slate-500 focus:outline-none focus:border-sky-500"
                          />

                          <button
                            type="button"
                            onClick={() => setShowStickerDrawer(!showStickerDrawer)}
                            className="absolute right-2.5 text-sky-400 hover:text-sky-300 p-1 cursor-pointer"
                            title="Stickers & Emojis"
                          >
                            <Smile className="w-5 h-5" />
                          </button>
                        </div>

                        {/* Rightmost Button: THUMBS UP 👍 (when empty) or SEND (when has content) */}
                        {!newMessageText.trim() && !imageInputUrl ? (
                          <button
                            type="button"
                            onClick={() => sendDirectMessage('👍')}
                            className="p-2 rounded-full text-sky-500 hover:text-sky-400 transition active:scale-90 cursor-pointer shrink-0"
                            title="Send Thumbs Up"
                          >
                            <ThumbsUp className="w-6 h-6 fill-sky-500" />
                          </button>
                        ) : (
                          <button
                            type="submit"
                            className="p-2.5 rounded-full bg-sky-600 hover:bg-sky-500 text-white font-bold transition-all shadow-md active:scale-95 cursor-pointer shrink-0"
                          >
                            <Send className="w-4 h-4" />
                          </button>
                        )}
                      </form>

                      {/* STICKER & EMOJI DRAWER PANEL (SCREENSHOT 3) */}
                      {showStickerDrawer && (
                        <div className="p-3 bg-slate-900 border-t border-slate-800 space-y-3 animate-in slide-in-from-bottom-10 duration-200">
                          {/* Drawer Header Tabs */}
                          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                            <div className="flex items-center space-x-2">
                              <button
                                type="button"
                                onClick={() => setActiveStickerTab('stickers')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                  activeStickerTab === 'stickers'
                                    ? 'bg-sky-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                🐰 Stickers
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveStickerTab('emojis')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                  activeStickerTab === 'emojis'
                                    ? 'bg-sky-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                😀 Emojis
                              </button>
                              <button
                                type="button"
                                onClick={() => setActiveStickerTab('gifs')}
                                className={`px-3 py-1 rounded-full text-xs font-bold transition cursor-pointer ${
                                  activeStickerTab === 'gifs'
                                    ? 'bg-sky-600 text-white'
                                    : 'text-slate-400 hover:text-white'
                                }`}
                              >
                                🎬 GIFs
                              </button>
                            </div>

                            <button
                              type="button"
                              onClick={() => setShowStickerDrawer(false)}
                              className="text-slate-400 hover:text-white p-1"
                            >
                              <X className="w-4 h-4" />
                            </button>
                          </div>

                          {/* Sticker Grid */}
                          {activeStickerTab === 'stickers' && (
                            <div className="grid grid-cols-4 sm:grid-cols-6 gap-3 max-h-48 overflow-y-auto p-1">
                              {[
                                '❤️ Love', '👍 Thumbs Up', '🔥 Fire', '🥰 Sweet',
                                '😊 Happy', '😮 Wow', '😭 Cry', '🎉 Party',
                                '💐 Flowers', '🌹 Rose', '🤗 Hugs', '✨ Sparkles'
                              ].map((sticker, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    sendDirectMessage(`[Sticker: ${sticker}]`);
                                    setShowStickerDrawer(false);
                                  }}
                                  className="p-3 bg-slate-800/80 hover:bg-slate-700/90 rounded-2xl border border-slate-700/60 flex flex-col items-center justify-center gap-1 transition active:scale-95 cursor-pointer"
                                >
                                  <span className="text-2xl">{sticker.split(' ')[0]}</span>
                                  <span className="text-[10px] text-slate-300 font-semibold">{sticker.split(' ')[1]}</span>
                                </button>
                              ))}
                            </div>
                          )}

                          {/* Emoji Grid */}
                          {activeStickerTab === 'emojis' && (
                            <div className="grid grid-cols-8 gap-2 max-h-48 overflow-y-auto p-1 text-xl">
                              {[
                                '😄', '😃', '😀', '😊', '😉', '😍', '🥰', '😘',
                                '😗', '😙', '😚', '😋', '😛', '😝', '😜', '🤪',
                                '🤨', '🧐', '🤓', '😎', '🤩', '🥳', '😏', '😒',
                                '😞', '😔', '😟', '😕', '🙁', '☹️', '😣', '😖',
                                '😫', '😩', '🥺', '😢', '😭', '😤', '😠', '😡',
                                '🤬', '🤯', '😳', '🥵', '🥶', '😱', '😨', '😰',
                                '😥', '😓', '🤗', '🤔', '🤭', '🤫', '🤥', '😶',
                                '😐', '😑', '😬', '🙄', '😯', '😦', '😧', '😮',
                                '👍', '👎', '👌', '✌️', '🤞', '🤟', '🤘', '👏'
                              ].map((e) => (
                                <button
                                  key={e}
                                  type="button"
                                  onClick={() => {
                                    setNewMessageText(prev => prev + e);
                                  }}
                                  className="p-1.5 hover:bg-slate-800 rounded-xl text-center cursor-pointer transition active:scale-95"
                                >
                                  {e}
                                </button>
                              ))}
                            </div>
                          )}

                          {/* GIFs Grid */}
                          {activeStickerTab === 'gifs' && (
                            <div className="grid grid-cols-3 gap-2 max-h-48 overflow-y-auto p-1">
                              {[
                                { label: 'Cute Hello', url: 'https://images.unsplash.com/photo-1533738363-b7f9aef128ce?w=300&auto=format&fit=crop&q=80' },
                                { label: 'Love Hearts', url: 'https://images.unsplash.com/photo-1518199266791-5375a83190b7?w=300&auto=format&fit=crop&q=80' },
                                { label: 'Funny Dance', url: 'https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=300&auto=format&fit=crop&q=80' },
                              ].map((gif, idx) => (
                                <button
                                  key={idx}
                                  type="button"
                                  onClick={() => {
                                    sendDirectMessage(`[GIF: ${gif.label}]`, gif.url);
                                    setShowStickerDrawer(false);
                                  }}
                                  className="relative h-20 rounded-xl overflow-hidden border border-slate-700 hover:border-sky-400 transition cursor-pointer group"
                                >
                                  <img src={gif.url} alt={gif.label} className="w-full h-full object-cover group-hover:scale-105 transition" />
                                  <span className="absolute bottom-1 left-1 px-1.5 py-0.5 rounded bg-slate-950/80 text-[9px] text-white font-bold">{gif.label}</span>
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })()}

              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500 text-xs">
                Select a conversation from the inbox to start chatting.
              </div>
            )}

          </div>

        </div>
      )}

      {/* FULL SCREEN OVERLAY CHAT MODAL */}
      {isFullScreen && (
        <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col p-2 sm:p-4 animate-fade-in">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl flex-1 flex flex-col overflow-hidden shadow-2xl max-w-5xl mx-auto w-full">
            
            {/* Modal Header */}
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {matchedUser && (
                  <img
                    src={getSafeAvatar(matchedUser)}
                    alt={matchedUser.name}
                    className="w-10 h-10 rounded-full object-cover border border-slate-700"
                  />
                )}
                <div>
                  <h3 className="text-sm font-bold text-white">
                    {activeThreadType === 'official' ? officialTitle : matchedUser?.name}
                  </h3>
                  <p className="text-[10px] text-slate-400">Full Screen Chat Mode</p>
                </div>
              </div>

              <button
                onClick={() => setIsFullScreen(false)}
                className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white"
              >
                <Minimize2 className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body Messages */}
            <div className="flex-1 p-6 overflow-y-auto space-y-4">
              {messages.map((msg) => {
                const isMe = msg.senderId === currentUser.id;
                return (
                  <div
                    key={msg.id}
                    className={`flex items-end gap-2 ${isMe ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-[75%] rounded-2xl p-4 text-xs sm:text-sm leading-relaxed ${
                        isMe
                          ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white rounded-br-none shadow-lg'
                          : 'bg-slate-800 text-slate-200 border border-slate-700 rounded-bl-none'
                      }`}
                    >
                      <p>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Modal Input Bar */}
            {activeThreadType === 'match' && matchedUser && (
              <form onSubmit={handleSendMessage} className="p-4 bg-slate-950 border-t border-slate-800 flex items-center space-x-3">
                <input
                  type="text"
                  value={newMessageText}
                  onChange={handleInputChange}
                  placeholder={`Write message to ${matchedUser.name}...`}
                  className="flex-1 bg-slate-900 border border-slate-800 rounded-2xl px-5 py-3 text-xs sm:text-sm text-white focus:outline-none focus:border-rose-500"
                />
                <button
                  type="submit"
                  disabled={!newMessageText.trim() && !imageInputUrl}
                  className="px-6 py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 text-white font-bold text-xs sm:text-sm disabled:opacity-40"
                >
                  Send
                </button>
              </form>
            )}

          </div>
        </div>
      )}

      {/* User Profile Details Modal */}
      {viewingProfileUser && (
        <UserProfileModal
          user={viewingProfileUser}
          onClose={() => setViewingProfileUser(null)}
          unlockedMap={unlockedMap}
          onOpenUnlockModal={onOpenUnlockModal}
          onLike={(targetUser) => handleAcceptRequest(targetUser)}
          onBlockUser={(targetUser) => onBlockUser(targetUser)}
          onUnblockUser={(targetUser) => {
            if (onUnblockUser) onUnblockUser(targetUser);
            setViewingProfileUser(null);
          }}
          isBlocked={blockedUsers.some(b => b.id === viewingProfileUser.id)}
          onStartChat={(targetUser) => {
            const existingMatch = matches.find(m => m.user1Id === targetUser.id || m.user2Id === targetUser.id);
            if (existingMatch) {
              setSelectedMatch(existingMatch);
              setActiveThreadType('match');
            }
          }}
        />
      )}

    </div>
  );
};
