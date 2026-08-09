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
  SmilePlus,
  EyeOff,
  Forward,
  Palette,
  Crop
} from 'lucide-react';
import { Match, Message, User, NotificationItem, Story } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { getSafeAvatar } from '../lib/avatar';
import { db } from '../lib/firebase';
import { doc, setDoc } from 'firebase/firestore';
import { UserProfileModal } from './UserProfileModal';
import { customFetch as fetch } from '../lib/api';
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
  const [localMatchesList, setLocalMatchesList] = useState<Match[]>(matches);
  useEffect(() => {
    setLocalMatchesList(matches);
  }, [matches]);
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
  const [voicePreview, setVoicePreview] = useState<{ durationSec: number; audioUrl: string } | null>(null);
  const [forwardingMsg, setForwardingMsg] = useState<Message | null>(null);
  const [forwardSearchQuery, setForwardSearchQuery] = useState('');
  const [showFullEmojiPickerInMenu, setShowFullEmojiPickerInMenu] = useState(false);
  const [showThemePicker, setShowThemePicker] = useState(false);
  const [selectedThemeStyle, setSelectedThemeStyle] = useState<string>('');
  const [showMatchActionsModal, setShowMatchActionsModal] = useState<{ match: Match; user: User } | null>(null);

  // Wallpaper cropping state variables
  const [cropImageSrc, setCropImageSrc] = useState<string | null>(null);
  const [cropZoom, setCropZoom] = useState<number>(1);
  const [cropPos, setCropPos] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const dragStartRef = useRef<{ x: number; y: number } | null>(null);

  const CHAT_THEME_PRESETS = useMemo(() => [
    { id: 'inside_out_2', name: 'Inside Out 2', value: 'url("https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1579546929518-9e396f3cc809?q=80&w=300' },
    { id: 'glow_pup', name: 'Glow Pup', value: 'url("https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1583511655857-d19b40a7a54e?q=80&w=300' },
    { id: 'the_odyssey', name: 'The Odyssey', value: 'url("https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1580136579312-94651dfd596d?q=80&w=300' },
    { id: 'supergirl', name: 'Supergirl', value: 'url("https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1620641788421-7a1c342ea42e?q=80&w=300' },
    { id: 'avatar_the_last', name: 'Avatar: The Last Airbender', value: 'url("https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1534447677768-be436bb09401?q=80&w=300' },
    { id: 'olivia_rodrigo', name: 'Olivia Rodrigo', value: 'url("https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1518609878373-06d740f60d8b?q=80&w=300' },
    { id: 'backrooms', name: 'Backrooms', value: 'url("https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1513694203232-719a280e022f?q=80&w=300' },
    { id: 'deli_boys', name: 'Deli Boys', value: 'url("https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=300' },
    { id: 'maluma', name: 'Maluma', value: 'url("https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1501386761578-eac5c94b800a?q=80&w=300' },
    { id: 'the_mandalorian', name: 'The Mandalorian', value: 'url("https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1451187580459-43490279c0fa?q=80&w=300' },
    { id: 'the_devil_wears_prada', name: 'The Devil Wears Prada', value: 'url("https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=1000")', preview: 'https://images.unsplash.com/photo-1483985988355-763728e1935b?q=80&w=300' }
  ], []);
  const [hiddenMsgIds, setHiddenMsgIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('hidden_msgs_' + currentUser.id) || '[]');
    } catch (_) {
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('hidden_msgs_' + currentUser.id, JSON.stringify(hiddenMsgIds));
    } catch (_) {}
  }, [hiddenMsgIds, currentUser.id]);
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
  const recordingTimeRef = useRef(0);
  const isCancelingVoiceRef = useRef(false);

  // Status / Story State
  const [allStories, setAllStories] = useState<Story[]>([]);
  const [activeStoryViewUser, setActiveStoryViewUser] = useState<User | null>(null);
  const [activeStoryIndex, setActiveStoryIndex] = useState(0);
  const [storyCommentText, setStoryCommentText] = useState('');

  useEffect(() => {
    fetchStories();
  }, []);

  const fetchStories = async () => {
    try {
      const res = await fetch('/api/stories');
      if (res.ok) {
        const data = await res.json();
        setAllStories(data.stories || []);
      }
    } catch (err) {
      console.error('Error fetching stories in MatchesView:', err);
    }
  };

  const formatRecordingTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  // Optimistic Instant Message Appending
  const appendOptimisticMessage = (content: string, imageUrl?: string, replyTo?: any) => {
    if (!selectedMatch) return;
    const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
    const tempMsg: Message = {
      id: 'temp_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      matchId: selectedMatch.id,
      senderId: currentUser.id,
      receiverId: receiverId,
      content: content,
      imageUrl: imageUrl,
      replyTo: replyTo,
      reactions: [],
      createdAt: new Date().toISOString(),
      isRead: false
    };
    setMessages((prev) => {
      const exists = prev.some(
        m => m.content === content && m.senderId === currentUser.id && Math.abs(new Date(m.createdAt).getTime() - new Date(tempMsg.createdAt).getTime()) < 3000
      );
      if (exists) return prev;
      return [...prev, tempMsg];
    });
  };

  const sendVoiceMessageData = async (durationSec: number, audioBase64: string) => {
    if (!selectedMatch) return;

    const isPending = (selectedMatch as any)?.status === 'pending' && selectedMatch.user1Id === currentUser.id;
    if (isPending) {
      const mySent = messages.filter(m => m.senderId === currentUser.id);
      const proposalSentCount = (selectedMatch as any)?.proposalSentCount || 0;
      const sentCount = Math.max(proposalSentCount, mySent.length);
      if (sentCount >= 3) {
        setActionSuccessMsg("Limit reached! You cannot send any more proposal messages until accepted.");
        setTimeout(() => setActionSuccessMsg(null), 4000);
        return;
      }
      setSelectedMatch(prev => {
        if (!prev) return null;
        return {
          ...prev,
          proposalSentCount: ((prev as any).proposalSentCount || 0) + 1
        };
      });
    }

    const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
    const content = `🎙️ Voice Note (${durationSec}s)`;
    appendOptimisticMessage(content, audioBase64);
    try {
      await sendFirestoreMessage(selectedMatch.id, currentUser.id, receiverId, content, audioBase64);
    } catch (e) {
      console.error('Error sending firestore voice note:', e);
    }
    try {
      await fetch(`/api/messages/${selectedMatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl: audioBase64 }),
      });
    } catch (e) {
      console.error('Error sending API voice note:', e);
    }
  };

  const generateVoiceNoteAudioDataUrl = async (durationSec: number): Promise<string> => {
    try {
      const dur = Math.max(1, Math.min(durationSec, 60));
      const sampleRate = 22050;
      const numFrames = sampleRate * dur;
      const OfflineCtx = window.OfflineAudioContext || (window as any).webkitOfflineAudioContext;
      if (!OfflineCtx) return '';

      const offlineCtx = new OfflineCtx(1, numFrames, sampleRate);
      const osc = offlineCtx.createOscillator();
      const gain = offlineCtx.createGain();

      osc.type = 'triangle';
      osc.frequency.setValueAtTime(261.63, offlineCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(329.63, offlineCtx.currentTime + dur * 0.3);
      osc.frequency.exponentialRampToValueAtTime(392.00, offlineCtx.currentTime + dur * 0.7);
      osc.frequency.exponentialRampToValueAtTime(523.25, offlineCtx.currentTime + dur);

      gain.gain.setValueAtTime(0.1, offlineCtx.currentTime);
      gain.gain.linearRampToValueAtTime(0.3, offlineCtx.currentTime + 0.2);
      gain.gain.exponentialRampToValueAtTime(0.01, offlineCtx.currentTime + dur);

      osc.connect(gain);
      gain.connect(offlineCtx.destination);

      osc.start(0);
      osc.stop(dur);

      const renderedBuffer = await offlineCtx.startRendering();
      
      const numChannels = 1;
      const format = 1; // PCM
      const bitDepth = 16;
      const pcmData = renderedBuffer.getChannelData(0);
      const dataLength = pcmData.length * (bitDepth / 8);
      const bufferLength = 44 + dataLength;
      
      const arrayBuffer = new ArrayBuffer(bufferLength);
      const view = new DataView(arrayBuffer);

      const writeStr = (offset: number, str: string) => {
        for (let i = 0; i < str.length; i++) {
          view.setUint8(offset + i, str.charCodeAt(i));
        }
      };

      writeStr(0, 'RIFF');
      view.setUint32(4, 36 + dataLength, true);
      writeStr(8, 'WAVE');
      writeStr(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, format, true);
      view.setUint16(22, numChannels, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate * numChannels * (bitDepth / 8), true);
      view.setUint16(32, numChannels * (bitDepth / 8), true);
      view.setUint16(34, bitDepth, true);
      writeStr(36, 'data');
      view.setUint32(40, dataLength, true);

      let offset = 44;
      for (let i = 0; i < pcmData.length; i++) {
        const sample = Math.max(-1, Math.min(1, pcmData[i]));
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7FFF, true);
        offset += 2;
      }

      const bytes = new Uint8Array(arrayBuffer);
      let binary = '';
      for (let i = 0; i < bytes.byteLength; i++) {
        binary += String.fromCharCode(bytes[i]);
      }
      return 'data:audio/wav;base64,' + btoa(binary);
    } catch (e) {
      console.error('Error generating voice note audio data url:', e);
      return '';
    }
  };

  const startVoiceRecording = async () => {
    try {
      isCancelingVoiceRef.current = false;
      setIsRecordingVoice(true);
      setRecordingTime(0);
      recordingTimeRef.current = 0;

      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
        recordingTimerRef.current = null;
      }

      // Start timer tick
      recordingTimerRef.current = setInterval(() => {
        recordingTimeRef.current += 1;
        setRecordingTime(recordingTimeRef.current);

        // Auto stop and send at 60 seconds (1 minute limit)
        if (recordingTimeRef.current >= 60) {
          stopAndSendVoiceRecording();
        }
      }, 1000);

      let stream: MediaStream | null = null;
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        } catch (e) {
          console.warn('Microphone stream access warning:', e);
        }
      }

      if (stream) {
        let mediaRecorder: MediaRecorder | null = null;
        try {
          let options: any = {};
          if (typeof MediaRecorder !== 'undefined' && MediaRecorder.isTypeSupported) {
            if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
              options = { mimeType: 'audio/webm;codecs=opus' };
            } else if (MediaRecorder.isTypeSupported('audio/webm')) {
              options = { mimeType: 'audio/webm' };
            } else if (MediaRecorder.isTypeSupported('audio/mp4')) {
              options = { mimeType: 'audio/mp4' };
            }
          }
          mediaRecorder = new MediaRecorder(stream, options);
        } catch (e) {
          try {
            mediaRecorder = new MediaRecorder(stream);
          } catch (_) {
            mediaRecorder = null;
          }
        }

        if (mediaRecorder) {
          mediaRecorderRef.current = mediaRecorder;
          audioChunksRef.current = [];

          mediaRecorder.ondataavailable = (event) => {
            if (event.data && event.data.size > 0) {
              audioChunksRef.current.push(event.data);
            }
          };

          mediaRecorder.onstop = async () => {
            stream?.getTracks().forEach(track => track.stop());

            if (isCancelingVoiceRef.current) {
              return;
            }

            const durationSec = recordingTimeRef.current || 1;
            const audioBlob = new Blob(audioChunksRef.current, { type: mediaRecorder?.mimeType || 'audio/webm' });

            if (audioBlob.size > 0) {
              const reader = new FileReader();
              reader.onloadend = async () => {
                const base64Audio = reader.result as string;
                if (base64Audio) {
                  setVoicePreview({ durationSec, audioUrl: base64Audio });
                } else {
                  const fallbackDataUrl = await generateVoiceNoteAudioDataUrl(durationSec);
                  setVoicePreview({ durationSec, audioUrl: fallbackDataUrl });
                }
              };
              reader.readAsDataURL(audioBlob);
            } else {
              const fallbackDataUrl = await generateVoiceNoteAudioDataUrl(durationSec);
              setVoicePreview({ durationSec, audioUrl: fallbackDataUrl });
            }
          };

          mediaRecorder.start(200);
        }
      }
    } catch (err) {
      console.error('Error starting voice recording:', err);
    }
  };

  const stopAndSendVoiceRecording = async () => {
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }

    const durationSec = Math.max(1, recordingTimeRef.current || 1);
    isCancelingVoiceRef.current = false;
    setIsRecordingVoice(false);

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping mediaRecorder:', e);
      }
    } else {
      const fallbackDataUrl = await generateVoiceNoteAudioDataUrl(durationSec);
      setVoicePreview({ durationSec, audioUrl: fallbackDataUrl });
    }
  };

  const cancelVoiceRecording = () => {
    isCancelingVoiceRef.current = true;
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
      recordingTimerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      try {
        mediaRecorderRef.current.stop();
      } catch (e) {
        console.error('Error stopping mediaRecorder on cancel:', e);
      }
    }
    setIsRecordingVoice(false);
    setRecordingTime(0);
    recordingTimeRef.current = 0;
  };

  const shareLiveLocation = () => {
    setShowPlusMenu(false);
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const lat = pos.coords.latitude.toFixed(4);
          const lng = pos.coords.longitude.toFixed(4);
          const mapUrl = `https://www.google.com/maps?q=${lat},${lng}`;
          sendDirectMessage(`📍 Live Location: ${lat}, ${lng}`, mapUrl);
        },
        (err) => {
          console.warn('Geolocation fallback:', err);
          sendDirectMessage('📍 Live Location: Dhaka, Bangladesh', 'https://www.google.com/maps?q=23.8103,90.4125');
        },
        { enableHighAccuracy: true, timeout: 8000 }
      );
    } else {
      sendDirectMessage('📍 Live Location: Dhaka, Bangladesh', 'https://www.google.com/maps?q=23.8103,90.4125');
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

    const isPending = (selectedMatch as any)?.status === 'pending' && selectedMatch.user1Id === currentUser.id;
    if (isPending) {
      const mySent = messages.filter(m => m.senderId === currentUser.id);
      const proposalSentCount = (selectedMatch as any)?.proposalSentCount || 0;
      const sentCount = Math.max(proposalSentCount, mySent.length);
      if (sentCount >= 3) {
        setActionSuccessMsg("Limit reached! You cannot send any more proposal messages until accepted.");
        setTimeout(() => setActionSuccessMsg(null), 4000);
        return;
      }
      setSelectedMatch(prev => {
        if (!prev) return null;
        return {
          ...prev,
          proposalSentCount: ((prev as any).proposalSentCount || 0) + 1
        };
      });
    }

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

    // Optimistic instant local display
    appendOptimisticMessage(content, imageUrl, replyPayload);

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

    const isPending = (selectedMatch as any)?.status === 'pending' && selectedMatch.user1Id === currentUser.id;
    if (isPending) {
      const mySent = messages.filter(m => m.senderId === currentUser.id);
      const proposalSentCount = (selectedMatch as any)?.proposalSentCount || 0;
      const sentCount = Math.max(proposalSentCount, mySent.length);
      if (sentCount >= 3) {
        setActionSuccessMsg("Limit reached! You cannot send any more proposal messages until accepted.");
        setTimeout(() => setActionSuccessMsg(null), 4000);
        return;
      }
      setSelectedMatch(prev => {
        if (!prev) return null;
        return {
          ...prev,
          proposalSentCount: ((prev as any).proposalSentCount || 0) + 1
        };
      });
    }

    const receiverId = selectedMatch.user1Id === currentUser.id ? selectedMatch.user2Id : selectedMatch.user1Id;
    
    // Optimistic instant local display
    appendOptimisticMessage(content, imageUrl);

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
    await handleRemoveForEveryone(msg);
  };

  const handleRemoveForMe = (msg: Message) => {
    setHiddenMsgIds(prev => [...prev, msg.id]);
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setSelectedMsgForMenu(null);
    setActionSuccessMsg('Message removed from your view.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleRemoveForEveryone = async (msg: Message) => {
    if (!selectedMatch) return;
    try {
      await deleteFirestoreMessage(selectedMatch.id, msg.id);
    } catch (e) {
      console.error('Error deleting firestore message:', e);
    }
    try {
      await fetch(`/api/messages/${selectedMatch.id}/${msg.id}`, { method: 'DELETE' });
    } catch (_) {}
    setMessages(prev => prev.filter(m => m.id !== msg.id));
    setSelectedMsgForMenu(null);
    setActionSuccessMsg('Message deleted for everyone.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handleForwardToMatch = async (targetMatch: Match, targetUser: User) => {
    if (!forwardingMsg) return;
    const receiverId = targetUser.id;
    const content = forwardingMsg.content ? `[Forwarded] ${forwardingMsg.content}` : '📷 Forwarded media';
    const imageUrl = forwardingMsg.imageUrl;

    try {
      await sendFirestoreMessage(targetMatch.id, currentUser.id, receiverId, content, imageUrl);
    } catch (_) {}
    try {
      await fetch(`/api/messages/${targetMatch.id}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content, imageUrl }),
      });
    } catch (_) {}

    setActionSuccessMsg(`Forwarded message to ${targetUser.name}!`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
    setForwardingMsg(null);
  };

  const handleSelectTheme = async (themeValue: string) => {
    if (!selectedMatch) return;
    (selectedMatch as any).theme = themeValue;
    setSelectedThemeStyle(themeValue);

    try {
      await fetch(`/api/matches/${selectedMatch.id}/theme`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ theme: themeValue }),
      });
    } catch (e) {
      console.error('Error updating theme API:', e);
    }

    try {
      if (db) {
        await setDoc(doc(db, 'matches', selectedMatch.id), { theme: themeValue }, { merge: true });
      }
    } catch (e) {
      console.error('Error updating theme Firestore:', e);
    }

    setActionSuccessMsg('Chat theme updated for both participants!');
    setTimeout(() => setActionSuccessMsg(null), 3000);
    setShowThemePicker(false);
  };

  const handleCustomImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      const base64 = reader.result as string;
      if (base64) {
        setCropImageSrc(base64);
        setCropZoom(1);
        setCropPos({ x: 0, y: 0 });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCropMouseDown = (e: React.MouseEvent) => {
    dragStartRef.current = { x: e.clientX - cropPos.x, y: e.clientY - cropPos.y };
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!dragStartRef.current) return;
      setCropPos({
        x: moveEvent.clientX - dragStartRef.current.x,
        y: moveEvent.clientY - dragStartRef.current.y,
      });
    };
    const handleMouseUp = () => {
      dragStartRef.current = null;
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  };

  const handleCropTouchStart = (e: React.TouchEvent) => {
    const touch = e.touches[0];
    dragStartRef.current = { x: touch.clientX - cropPos.x, y: touch.clientY - cropPos.y };
    const handleTouchMove = (moveEvent: TouchEvent) => {
      if (!dragStartRef.current) return;
      const moveTouch = moveEvent.touches[0];
      setCropPos({
        x: moveTouch.clientX - dragStartRef.current.x,
        y: moveTouch.clientY - dragStartRef.current.y,
      });
    };
    const handleTouchEnd = () => {
      dragStartRef.current = null;
      window.removeEventListener('touchmove', handleTouchMove);
      window.removeEventListener('touchend', handleTouchEnd);
    };
    window.addEventListener('touchmove', handleTouchMove, { passive: false });
    window.addEventListener('touchend', handleTouchEnd);
  };

  const handleApplyCrop = () => {
    if (!cropImageSrc) return;
    const img = new Image();
    img.src = cropImageSrc;
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = 480;
      canvas.height = 720; // High resolution 2:3 aspect ratio portrait
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#0f172a';
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        // Calculate scaling offsets
        const scale = 2.4; // Scaled up viewport
        const renderW = 200;
        const renderH = (img.height / img.width) * renderW;

        const destW = renderW * cropZoom * scale;
        const destH = renderH * cropZoom * scale;

        const destX = (100 + cropPos.x) * scale - (destW / 2);
        const destY = (150 + cropPos.y) * scale - (destH / 2);

        ctx.drawImage(img, destX, destY, destW, destH);

        const croppedBase64 = canvas.toDataURL('image/jpeg', 0.85);
        const themeCss = `url("${croppedBase64}") center/cover no-repeat`;
        handleSelectTheme(themeCss);
        setCropImageSrc(null);
      }
    };
  };

  const handlePermanentDeleteChat = async (matchId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this chat history? / আপনি কি চ্যাট হিস্ট্রি স্থায়ীভাবে মুছে ফেলতে চান?')) return;
    try {
      await fetch(`/api/matches/${matchId}`, { method: 'DELETE' });
    } catch (_) {}
    setLocalMatchesList(prev => prev.filter(m => m.id !== matchId));
    if (selectedMatch?.id === matchId) {
      setSelectedMatch(null);
    }
    setShowMatchActionsModal(null);
    setActionSuccessMsg('Chat history deleted permanently.');
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const handlePermanentBlockUser = async (targetUser: User, matchId?: string) => {
    if (!targetUser) return;
    if (!window.confirm(`Block ${targetUser.name}? They will no longer be able to message you. / আপনি কি স্থায়ীভাবে ব্লক করতে চান?`)) return;
    await onBlockUser(targetUser);
    setBlockedUsers(prev => [...prev.filter(u => u.id !== targetUser.id), targetUser]);
    if (matchId) {
      setLocalMatchesList(prev => prev.filter(m => m.id !== matchId));
      if (selectedMatch?.id === matchId) {
        setSelectedMatch(null);
      }
    }
    setShowMatchActionsModal(null);
    setActionSuccessMsg(`${targetUser.name} has been permanently blocked.`);
    setTimeout(() => setActionSuccessMsg(null), 3000);
  };

  const filteredMatches = localMatchesList.filter((m) => {
    const other = m.user1Id === currentUser.id ? m.user2 : m.user1;
    return (other?.name || '').toLowerCase().includes((searchQuery || '').toLowerCase());
  });

  const isPartnerTyping = matchedUser ? !!typingMap[matchedUser.id] : false;

  const visibleMessages = useMemo(() => {
    return messages.filter(m => !hiddenMsgIds.includes(m.id));
  }, [messages, hiddenMsgIds]);

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
                        type="button"
                        onClick={() => setShowMatchActionsModal({ match: m, user: other })}
                        className="py-2.5 px-2.5 rounded-2xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white border border-slate-700 font-bold text-xs transition-all cursor-pointer flex items-center justify-center shrink-0"
                        title="Delete Chat or Block User"
                      >
                        <MoreHorizontal className="w-4 h-4" />
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
                  <div className="flex items-center space-x-3">
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

                    {/* Avatar Click: Opens status if active story exists, otherwise opens profile */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        const targetStories = allStories.filter(s => s.userId === matchedUser.id);
                        if (targetStories.length > 0) {
                          setActiveStoryViewUser(matchedUser);
                          setActiveStoryIndex(0);
                        } else {
                          setViewingProfileUser(matchedUser);
                        }
                      }}
                      className="relative shrink-0 cursor-pointer group"
                      title={
                        allStories.some(s => s.userId === matchedUser.id)
                          ? "স্ট্যাটাস দেখতে চাপ দিন (Click to view Status/Story)"
                          : "প্রোফাইল দেখতে চাপ দিন (Click to view Profile)"
                      }
                    >
                      <img
                        src={getSafeAvatar(matchedUser)}
                        alt={matchedUser.name}
                        className={`w-12 h-12 sm:w-14 sm:h-14 rounded-full object-cover shadow-md hover:scale-105 transition-all ${
                          allStories.some(s => s.userId === matchedUser.id)
                            ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950 p-0.5 animate-pulse border-2 border-rose-400'
                            : 'border-2 border-rose-500/80'
                        }`}
                        onError={(e) => {
                          e.currentTarget.src = getSafeAvatar(matchedUser);
                        }}
                      />

                      {allStories.some(s => s.userId === matchedUser.id) && (
                        <span className="absolute -top-1 -right-1 px-1.5 py-0.2 bg-gradient-to-r from-rose-600 to-pink-500 text-white text-[8px] font-black rounded-full shadow border border-slate-950 uppercase tracking-wider">
                          STATUS
                        </span>
                      )}

                      {partnerStatus.isOnline ? (
                        <span className="w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-slate-950 absolute bottom-0 right-0 shadow-lg ring-2 ring-emerald-400/50" />
                      ) : (
                        <span className="w-3.5 h-3.5 rounded-full bg-slate-500 border-2 border-slate-950 absolute bottom-0 right-0 shadow" />
                      )}
                    </div>

                    {/* Name Click: Always opens user profile details */}
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        setViewingProfileUser(matchedUser);
                      }}
                      className="cursor-pointer group"
                      title="প্রোফাইল দেখতে চাপ দিন (Click to view full profile)"
                    >
                      <h3 className="text-sm sm:text-base font-extrabold text-white flex items-center gap-1.5 group-hover:text-rose-400 transition-colors">
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

                    <button
                      onClick={() => onReportUser(matchedUser)}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-400 text-xs font-bold cursor-pointer transition hover:scale-105"
                      title="Report User"
                    >
                      <ShieldAlert className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowThemePicker(true)}
                      className="p-2.5 sm:p-3 rounded-2xl bg-purple-500/10 hover:bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow hover:scale-105 transition"
                      title="Change Chat Theme (থিম চেঞ্জ করুন)"
                    >
                      <Palette className="w-4 h-4 sm:w-5 sm:h-5 text-purple-400" />
                      <span className="hidden lg:inline text-[11px]">Theme</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowMatchActionsModal({ match: selectedMatch, user: matchedUser })}
                      className="p-2.5 sm:p-3 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-300 text-xs font-bold cursor-pointer transition hover:scale-105"
                      title="More Options (মুছুন বা ব্লক করুন)"
                    >
                      <MoreHorizontal className="w-4 h-4 sm:w-5 sm:h-5" />
                    </button>
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
                {(() => {
                  const currentTheme = (selectedMatch as any)?.theme || selectedThemeStyle;
                  const isCustomBg = currentTheme && (currentTheme.startsWith('url(') || currentTheme.startsWith('linear-gradient') || currentTheme.startsWith('#'));

                  return (
                    <div
                      onContextMenu={(e) => {
                        e.preventDefault();
                        setShowThemePicker(true);
                      }}
                      onClick={() => setShowThemePicker(true)}
                      style={
                        isCustomBg
                          ? {
                              background: currentTheme,
                              backgroundSize: 'cover',
                              backgroundPosition: 'center',
                              backgroundRepeat: 'no-repeat',
                            }
                          : undefined
                      }
                      className={`flex-1 min-h-0 p-3 sm:p-4 pt-10 pb-6 overflow-y-auto space-y-3 relative cursor-pointer ${
                        !isCustomBg ? (currentTheme || 'bg-slate-950/60') : ''
                      }`}
                    >
                  {visibleMessages.length === 0 ? (
                    <div className="text-center py-12 text-slate-500 text-xs space-y-2">
                      <div className="w-12 h-12 rounded-full bg-rose-500/10 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/20">
                        <Sparkles className="w-6 h-6" />
                      </div>
                      <p className="font-bold text-white">Start chatting with {matchedUser.name}!</p>
                      <p className="text-[11px] text-slate-400">Send a friendly greeting to start the conversation.</p>
                    </div>
                  ) : (
                    visibleMessages.map((msg, msgIdx) => {
                      const isMe = msg.senderId === currentUser.id;
                      const isAudio = msg.imageUrl && (msg.imageUrl.startsWith('data:audio') || msg.content.includes('🎙️'));
                      const isAudioCallCard = msg.content.includes('Audio call') ||
                        msg.content.includes('Voice call') ||
                        msg.content.includes('Voice Call') ||
                        msg.content.includes('Call back') ||
                        msg.content.includes('Call again') ||
                        msg.content.toLowerCase().includes('missed audio call') ||
                        msg.content.includes('📞');
                      const isSelected = selectedMsgForMenu?.id === msg.id;

                      return (
                        <div
                          key={msg.id}
                          onClick={(e) => {
                            // Prevent click from bubbling up to the empty background area (which opens theme picker)
                            e.stopPropagation();
                          }}
                          onContextMenu={(e) => {
                            // Prevent context menu/long-press from bubbling up to the theme picker
                            e.preventDefault();
                            e.stopPropagation();
                            setSelectedMsgForMenu(isSelected ? null : msg);
                          }}
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
                              <div
                                onClick={(e) => e.stopPropagation()}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  e.stopPropagation();
                                }}
                                className="absolute -top-13 sm:-top-14 left-1/2 -translate-x-1/2 z-40 flex items-center gap-1 sm:gap-1.5 px-3 py-1.5 rounded-full bg-slate-900/95 backdrop-blur-md border border-slate-700/90 shadow-2xl animate-in fade-in zoom-in-95 duration-150 whitespace-nowrap ring-1 ring-white/10"
                              >
                                {['😆', '❤️', '😮', '😢', '😡', '🥰', '👍'].map((emoji) => (
                                  <button
                                    key={emoji}
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleReactionSelect(msg, emoji);
                                    }}
                                    className="text-lg hover:scale-130 transition-transform active:scale-95 cursor-pointer p-0.5"
                                  >
                                    {emoji}
                                  </button>
                                ))}
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
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
                              {(() => {
                                const cleanText = (msg.content || '').replace(/^\[Sticker:\s*([^\]]+)\]$/i, '$1').trim();
                                const isSingleEmoji = /^(\u00a9|\u00ae|[\u2000-\u3300]|\ud83c[\ud000-\udfff]|\ud83d[\ud000-\udfff]|\ud83e[\ud000-\udfff]|\s)+$/u.test(cleanText) && cleanText.length <= 8;
                                const isLocation = Boolean(msg.content && (msg.content.includes('maps.google.com') || msg.content.includes('📍 Location Shared')));
                                const isMedia = msg.imageUrl && !isAudio && !isLocation && !isAudioCallCard;
                                const hasCaption = Boolean(cleanText && cleanText !== '📷 Photo' && cleanText !== '📷 Image');

                                if (isSingleEmoji && !msg.imageUrl && !msg.replyTo) {
                                  return (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      className="relative p-1 cursor-pointer select-none transition-transform hover:scale-110 active:scale-95"
                                    >
                                      <p className="text-4xl sm:text-5xl drop-shadow-md animate-in fade-in zoom-in duration-150 leading-none py-1">
                                        {cleanText}
                                      </p>
                                      <div className={`flex items-center justify-end gap-1 text-[9px] mt-0.5 ${isMe ? 'text-sky-300' : 'text-slate-400'}`}>
                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isMe && msg.isRead && <CheckCheck className="w-3 h-3 text-sky-300" />}
                                      </div>
                                    </div>
                                  );
                                }

                                /* PURE MEDIA (PHOTO / VIDEO) MESSAGE WITHOUT EXTRA BLUE FRAME */
                                if (isMedia && !hasCaption) {
                                  return (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      className={`relative group/img overflow-hidden rounded-2xl shadow-xl transition-all cursor-pointer select-none max-w-[260px] sm:max-w-xs ${
                                        isSelected ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950' : ''
                                      }`}
                                    >
                                      {msg.imageUrl.startsWith('data:video') || msg.imageUrl.endsWith('.mp4') ? (
                                        <video
                                          src={msg.imageUrl}
                                          controls
                                          className="w-full max-h-80 object-cover rounded-2xl block"
                                        />
                                      ) : (
                                        <img
                                          src={msg.imageUrl}
                                          alt="Shared photo"
                                          className="w-full max-h-80 object-cover rounded-2xl block border border-slate-800/60"
                                        />
                                      )}

                                      {/* Floating Timestamp & Status Badge overlaid at bottom right of photo */}
                                      <div className="absolute bottom-2 right-2 px-2 py-0.5 rounded-full bg-slate-950/75 backdrop-blur-md text-white text-[10px] flex items-center gap-1.5 shadow-md border border-white/10">
                                        <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                        {isMe && (
                                          <div className="flex items-center gap-0.5">
                                            {msg.isRead ? (
                                              <CheckCheck className="w-3.5 h-3.5 text-sky-400" />
                                            ) : partnerStatus.isOnline ? (
                                              <CheckCheck className="w-3.5 h-3.5 text-slate-300" />
                                            ) : (
                                              <Check className="w-3.5 h-3.5 text-slate-300" />
                                            )}
                                          </div>
                                        )}
                                      </div>

                                      {/* REACTION BADGE */}
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
                                    </div>
                                  );
                                }

                                /* MEDIA WITH CAPTION TEXT */
                                if (isMedia && hasCaption) {
                                  return (
                                    <div
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      onContextMenu={(e) => {
                                        e.preventDefault();
                                        e.stopPropagation();
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }}
                                      className={`relative rounded-2xl overflow-hidden text-xs sm:text-sm leading-relaxed shadow-md transition-all cursor-pointer select-none max-w-[260px] sm:max-w-xs ${
                                        isMe
                                          ? 'bg-blue-600 text-white font-medium rounded-br-xs'
                                          : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-xs'
                                      } ${isSelected ? 'ring-2 ring-rose-500 ring-offset-2 ring-offset-slate-950' : ''}`}
                                    >
                                      {msg.imageUrl.startsWith('data:video') || msg.imageUrl.endsWith('.mp4') ? (
                                        <video src={msg.imageUrl} controls className="w-full max-h-72 object-cover block" />
                                      ) : (
                                        <img src={msg.imageUrl} alt="Shared photo" className="w-full max-h-72 object-cover block" />
                                      )}

                                      <div className="p-3">
                                        {msg.replyTo && (
                                          <div className="mb-2 p-2 rounded-xl bg-slate-950/40 border-l-2 border-sky-400 text-[11px] opacity-90">
                                            <span className="font-bold text-sky-300 block">{msg.replyTo.senderName}</span>
                                            <span className="truncate block">{msg.replyTo.content}</span>
                                          </div>
                                        )}
                                        <p className="whitespace-pre-wrap">{cleanText}</p>

                                        <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                                          <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                          {isMe && (
                                            <div className="flex items-center gap-1 font-semibold">
                                              {msg.isRead ? (
                                                <div className="flex items-center gap-1 text-sky-300">
                                                  <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                                  <span className="text-[9px] font-extrabold uppercase tracking-wider">Seen</span>
                                                </div>
                                              ) : partnerStatus.isOnline ? (
                                                <CheckCheck className="w-3.5 h-3.5 text-slate-300/90" />
                                              ) : (
                                                <Check className="w-3.5 h-3.5 text-slate-300/80" />
                                              )}
                                            </div>
                                          )}
                                        </div>
                                      </div>

                                      {/* REACTION BADGE */}
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
                                    </div>
                                  );
                                }

                                return (
                                  <div
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      if (isAudioCallCard) {
                                        if (onStartVoiceCall) onStartVoiceCall(matchedUser, selectedMatch.id);
                                      } else {
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }
                                    }}
                                    onContextMenu={(e) => {
                                      e.preventDefault();
                                      e.stopPropagation();
                                      if (!isAudioCallCard) {
                                        setSelectedMsgForMenu(isSelected ? null : msg);
                                      }
                                    }}
                                    className={`relative rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed shadow-md transition-all cursor-pointer select-none ${
                                      isAudioCallCard
                                        ? 'hover:scale-[1.01] hover:brightness-110 active:scale-[0.99]'
                                        : ''
                                    } ${
                                      isMe
                                        ? 'bg-blue-600 text-white font-medium rounded-br-xs shadow-blue-900/30'
                                        : 'bg-slate-800 text-slate-100 border border-slate-700/80 rounded-bl-xs'
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
                                              {(() => {
                                                if (msg.content.includes('Missed') || msg.content.toLowerCase().includes('missed')) {
                                                  // Extract time after 'on' if present
                                                  const timePart = msg.content.split(' on ')[1] || '';
                                                  return `Missed call${timePart ? ` • ${timePart}` : ''}`;
                                                }
                                                if (msg.content.includes('Duration:')) {
                                                  const match = msg.content.match(/Duration:\s*([^\s]+(?:\s*[^\s]+)?)/);
                                                  const duration = match ? match[1] : '';
                                                  const timePart = msg.content.split(' on ')[1] || '';
                                                  return `Answered${duration ? ` (${duration})` : ''}${timePart ? ` • ${timePart}` : ''}`;
                                                }
                                                return msg.content || 'Voice call';
                                              })()}
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
                                    ) : isLocation ? (
                                      <div className="space-y-2">
                                        <div className="flex items-center space-x-2 text-emerald-300 font-bold text-xs">
                                          <Sparkles className="w-4 h-4 text-emerald-400 animate-pulse" />
                                          <span>{cleanText}</span>
                                        </div>
                                        {msg.imageUrl && (
                                          <a
                                            href={msg.imageUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            onClick={(e) => e.stopPropagation()}
                                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-950 border border-slate-700 text-sky-400 text-xs font-bold transition shadow"
                                          >
                                            <span>📍 Open in Google Maps</span>
                                          </a>
                                        )}
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
                                        <p className="whitespace-pre-wrap">{cleanText}</p>
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

                                    {/* MESSENGER TIME & REAL-TIME TICK STATUS */}
                                    <div className={`flex items-center justify-end gap-1.5 text-[10px] mt-1.5 ${isMe ? 'text-sky-100' : 'text-slate-400'}`}>
                                      <span>{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                                      
                                      {isMe && (
                                        <div
                                          className="flex items-center gap-1 font-semibold"
                                          title={
                                            msg.isRead
                                              ? "Seen by recipient"
                                              : partnerStatus.isOnline
                                              ? "Delivered (Recipient is online)"
                                              : "Sent (Recipient is offline)"
                                          }
                                        >
                                          {msg.isRead ? (
                                            /* SEEN STATUS (Blue Double Checkmark + Seen Text) */
                                            <div className="flex items-center gap-1 text-sky-300">
                                              <CheckCheck className="w-3.5 h-3.5 text-sky-300" />
                                              <span className="text-[9px] font-extrabold uppercase tracking-wider">Seen</span>
                                            </div>
                                          ) : partnerStatus.isOnline ? (
                                            /* DELIVERED STATUS (Double Checkmark - Recipient Online) */
                                            <CheckCheck className="w-3.5 h-3.5 text-slate-300/90" />
                                          ) : (
                                            /* SENT STATUS (Single Checkmark - Recipient Offline) */
                                            <Check className="w-3.5 h-3.5 text-slate-300/80" />
                                          )}
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })()}

                            {/* MESSENGER SEEN AVATAR INDICATOR AT BOTTOM RIGHT (ONLY WHEN MESSAGE IS ACTUALLY READ) */}
                            {isMe && msg.isRead && (
                              <div className="flex items-center justify-end gap-1 mt-1">
                                <span className="text-[9px] font-bold text-sky-300">Seen</span>
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
                  );
                })()}

                {/* BOTTOM MESSENGER MESSAGE ACTION MENU BAR */}
                {selectedMsgForMenu && (
                  <div className="bg-slate-900 border-t border-slate-800 p-3 flex flex-col gap-2.5 shadow-2xl animate-in slide-in-from-bottom-5 duration-200 z-40">
                    {/* EMOJI REACTION ROW */}
                    <div className="flex items-center gap-1.5 overflow-x-auto pb-1 no-scrollbar justify-between sm:justify-start">
                      {['💖', '❤️', '😂', '😮', '😢', '🙏', '👍', '🔥'].map((emoji) => (
                        <button
                          key={emoji}
                          onClick={() => handleReactionSelect(selectedMsgForMenu, emoji)}
                          className="p-1.5 text-lg hover:scale-125 transition-transform active:scale-95 rounded-full hover:bg-slate-800 cursor-pointer"
                          title={`React ${emoji}`}
                        >
                          {emoji}
                        </button>
                      ))}

                      {/* PLUS BUTTON FOR ALL EMOJIS */}
                      <button
                        type="button"
                        onClick={() => setShowFullEmojiPickerInMenu(!showFullEmojiPickerInMenu)}
                        className="p-1.5 rounded-full bg-slate-800 hover:bg-slate-700 text-sky-400 hover:text-white transition cursor-pointer text-xs font-bold flex items-center justify-center shrink-0 border border-slate-700"
                        title="More Emojis"
                      >
                        <Plus className="w-4 h-4" />
                      </button>
                    </div>

                    {/* FULL EMOJI PICKER POPUP */}
                    {showFullEmojiPickerInMenu && (
                      <div className="p-2 bg-slate-950 border border-slate-800 rounded-2xl max-h-36 overflow-y-auto grid grid-cols-8 gap-1.5 text-lg animate-in fade-in zoom-in-95">
                        {[
                          '😃','😄','😁','😆','😅','😂','🤣','😊','😇','🙂','🙃','😉','😌','😍','🥰','😘','😗','😙','😚','😋','😛','😝','😜','🤪','🤨','🧐','🤓','😎','🤩','🥳','😏','😒','😞','😔','😟','😕','🙁','☹️','😣','😖','😫','😩','🥺','😢','😭','😤','😠','😡','🤬','🤯','😳','🥶','😱','😨','😰','😥','😓','🤗','🤔','🤭','🤫','🤥','😶','😐','😑','😬','🙄','😯','😦','😧','😮','😲','🥱','😴','🤤','😪','😵','🤐','🥴','🤢','🤮','🤧','😷','🤒','🩹','🤑','🤠','😈','👿','👹','👺','🤡','💩','👻','💀','☠️','👽','👾','🤖','🎃','😺','😸','😹','😻','😼','😽','🙀','😿','😾','🙈','🙉','🙊','💖','❤️','🧡','💛','💚','💙','💜','🖤','🤍','🤎','💔','❣️','💕','💞','💓','💗','💘','💝','⭐','🌟','✨','⚡','🔥','💥','👍','👎','👏','🙌','👐','🤲','🤝','🙏','💪','✌️','🤞','🤟','🤘','🤙','👈','👉','👆','👇','☝️','✋','🤚','🖐️'
                        ].map((emoji, idx) => (
                          <button
                            key={emoji + idx}
                            onClick={() => {
                              handleReactionSelect(selectedMsgForMenu, emoji);
                              setShowFullEmojiPickerInMenu(false);
                            }}
                            className="p-1 text-center hover:bg-slate-800 rounded-lg transition hover:scale-125 cursor-pointer"
                          >
                            {emoji}
                          </button>
                        ))}
                      </div>
                    )}

                    {/* ACTION BUTTONS ROW */}
                    <div className="grid grid-cols-5 gap-1 pt-1 border-t border-slate-800/80">
                      {/* 1. Reply */}
                      <button
                        onClick={() => {
                          setReplyingTo(selectedMsgForMenu);
                          setSelectedMsgForMenu(null);
                          setShowFullEmojiPickerInMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer active:scale-95 text-[11px] font-semibold"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Reply className="w-4 h-4 text-sky-400" />
                        </div>
                        <span>Reply</span>
                      </button>

                      {/* 2. Forward */}
                      <button
                        onClick={() => {
                          setForwardingMsg(selectedMsgForMenu);
                          setSelectedMsgForMenu(null);
                          setShowFullEmojiPickerInMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-emerald-400 cursor-pointer active:scale-95 text-[11px] font-semibold"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Forward className="w-4 h-4 text-emerald-400" />
                        </div>
                        <span>Forward</span>
                      </button>

                      {/* 3. Remove for Me */}
                      <button
                        onClick={() => {
                          handleRemoveForMe(selectedMsgForMenu);
                          setShowFullEmojiPickerInMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-amber-400 cursor-pointer active:scale-95 text-[11px] font-semibold"
                        title="Remove from my chat list only"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <EyeOff className="w-4 h-4 text-amber-400" />
                        </div>
                        <span className="text-[10px]">Remove Me</span>
                      </button>

                      {/* 4. Remove for Everyone */}
                      <button
                        onClick={() => {
                          handleRemoveForEveryone(selectedMsgForMenu);
                          setShowFullEmojiPickerInMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-rose-400 cursor-pointer active:scale-95 text-[11px] font-semibold"
                        title="Delete for everyone (Unsend)"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <Trash2 className="w-4 h-4 text-rose-500" />
                        </div>
                        <span className="text-[10px]">Remove All</span>
                      </button>

                      {/* 5. Close */}
                      <button
                        onClick={() => {
                          setSelectedMsgForMenu(null);
                          setShowFullEmojiPickerInMenu(false);
                        }}
                        className="flex flex-col items-center gap-1 text-slate-300 hover:text-white cursor-pointer active:scale-95 text-[11px] font-semibold"
                      >
                        <div className="w-8 h-8 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                          <X className="w-4 h-4 text-slate-400" />
                        </div>
                        <span>Close</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* 3 Proposal Messages & Admin Chat Restriction Logic */}
                {(() => {
                  const isUserBlocked = matchedUser ? blockedUsers.some(b => b.id === matchedUser.id) || (selectedMatch as any)?.status === 'blocked' : false;
                  if (isUserBlocked) {
                    return (
                      <div className="p-4 bg-rose-950/80 border-t border-rose-500/40 text-center space-y-2 shadow-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
                          <Ban className="w-4 h-4 text-rose-400 animate-pulse" />
                          <span>আপনি এই ইউজারকে ব্লক করেছেন (User Blocked)</span>
                        </div>
                        <p className="text-xs text-rose-200/90 max-w-md mx-auto leading-relaxed font-medium">
                          ব্লক থাকার কারণে নতুন কোনো বার্তা পাঠানো বা পাওয়া সম্ভব নয়।
                        </p>
                      </div>
                    );
                  }

                  const isRestricted = selectedMatch.chatRestrictedUntil && new Date(selectedMatch.chatRestrictedUntil).getTime() > Date.now();
                  if (isRestricted) {
                    return (
                      <div className="p-4 bg-rose-950/80 border-t border-rose-500/40 text-center space-y-2 shadow-2xl">
                        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-xs font-bold">
                          <ShieldAlert className="w-4 h-4 text-rose-400" />
                          <span>Chat Restricted by Admin (চ্যাট সাময়িকভাবে বন্ধ)</span>
                        </div>
                        <p className="text-xs text-rose-200/90 max-w-md mx-auto leading-relaxed font-medium">
                          এডমিন কর্তৃক নীতিমালা লঙ্ঘনের কারণে আপনার এই চ্যাটটি স্থগিত রাখা হয়েছে।
                          {selectedMatch.chatRestrictionReason && (
                            <span className="block mt-1 font-bold text-amber-300">
                              কারণ: {selectedMatch.chatRestrictionReason}
                            </span>
                          )}
                        </p>
                      </div>
                    );
                  }

                  const isPending = (selectedMatch as any)?.status === 'pending' && selectedMatch.user1Id === currentUser.id;
                  const mySent = messages.filter(m => m.senderId === currentUser.id);
                  const proposalSentCount = (selectedMatch as any)?.proposalSentCount || 0;
                  const sentCount = Math.max(proposalSentCount, mySent.length);
                  const lastSentMsg = mySent[mySent.length - 1];
                  
                  let isLocked24h = false;
                  let hoursLeft = 24;

                  if (isPending && sentCount >= 3) {
                    isLocked24h = true;
                    if (lastSentMsg) {
                      const elapsedMs = Date.now() - new Date(lastSentMsg.createdAt).getTime();
                      const hoursElapsed = elapsedMs / (1000 * 60 * 60);
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
                          You have sent {sentCount} proposal message(s). Chat will unlock with unlimited messages as soon as {matchedUser?.name || 'User'} accepts your connection request!
                        </p>
                      </div>
                    );
                  }

                  return (
                    <div className="bg-slate-950 border-t border-slate-800/80 flex flex-col">
                      {isPending && (
                        <div className="text-[10px] text-rose-300 font-bold bg-rose-500/10 border-b border-rose-500/20 px-3 py-1 text-center">
                          💬 Request Pending: You can send {Math.max(0, 3 - sentCount)} proposal message(s) (Limit: 3 initial messages until accepted)
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

                      {/* VOICE NOTE REVIEW BAR */}
                      {voicePreview && (
                        <div className="p-3 bg-slate-900 border-b border-slate-800 flex items-center justify-between gap-3 animate-in fade-in slide-in-from-bottom-2 duration-200 z-30">
                          <div className="flex items-center space-x-2.5 flex-1 min-w-0">
                            <div className="w-8 h-8 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 border border-rose-500/30">
                              <Mic className="w-4 h-4 animate-pulse" />
                            </div>
                            <div className="min-w-0 flex-1">
                              <p className="text-xs font-bold text-white flex items-center gap-1.5">
                                <span>Voice Note Review ({voicePreview.durationSec}s)</span>
                              </p>
                              <audio controls src={voicePreview.audioUrl} className="h-8 w-full max-w-[220px] sm:max-w-xs mt-1" />
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 shrink-0">
                            <button
                              type="button"
                              onClick={() => setVoicePreview(null)}
                              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-rose-400 hover:text-rose-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                              title="ডিলিট করুন (Discard)"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                              <span>Discard</span>
                            </button>
                            <button
                              type="button"
                              onClick={async () => {
                                const { durationSec, audioUrl } = voicePreview;
                                setVoicePreview(null);
                                await sendVoiceMessageData(durationSec, audioUrl);
                              }}
                              className="px-3.5 py-1.5 rounded-xl bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white text-xs font-extrabold transition shadow flex items-center gap-1 cursor-pointer"
                              title="পাঠান (Send Voice Note)"
                            >
                              <Send className="w-3.5 h-3.5" />
                              <span>Send</span>
                            </button>
                          </div>
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
                                onClick={shareLiveLocation}
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
                          onClick={isRecordingVoice ? stopAndSendVoiceRecording : startVoiceRecording}
                          className={`p-2 rounded-full transition shrink-0 cursor-pointer ${
                            isRecordingVoice
                              ? 'bg-rose-600 text-white animate-pulse shadow-lg ring-2 ring-rose-500/50'
                              : 'text-sky-400 hover:bg-slate-900'
                          }`}
                          title={isRecordingVoice ? "কথা রেকর্ড হচ্ছে (Recording...)" : "ভয়েস রেকর্ড করুন (Record Voice Note)"}
                        >
                          <Mic className="w-5 h-5" />
                        </button>

                        {isRecordingVoice ? (
                          /* LIVE RECORDING DISPLAY BAR */
                          <div className="flex-1 bg-rose-950/70 border border-rose-500/60 rounded-full px-3.5 py-1.5 flex items-center justify-between shadow-inner animate-pulse">
                            <div className="flex items-center space-x-2 shrink-0">
                              <span className="w-2.5 h-2.5 rounded-full bg-rose-500 animate-ping" />
                              <span className="text-xs font-black text-rose-200 tracking-tight">
                                🔴 {formatRecordingTime(recordingTime)} / 01:00
                              </span>
                              {/* Animated wave equalizer bars */}
                              <div className="hidden sm:flex items-center space-x-0.5 ml-1">
                                <span className="w-1 h-2.5 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }} />
                                <span className="w-1 h-4 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '150ms' }} />
                                <span className="w-1 h-2 bg-rose-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }} />
                                <span className="w-1 h-3.5 bg-rose-300 rounded-full animate-bounce" style={{ animationDelay: '450ms' }} />
                              </div>
                            </div>

                            <div className="flex items-center space-x-1.5">
                              <button
                                type="button"
                                onClick={cancelVoiceRecording}
                                className="p-1.5 rounded-full bg-slate-900 hover:bg-slate-800 text-rose-400 hover:text-rose-300 transition cursor-pointer"
                                title="বাতিল করুন (Cancel)"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={stopAndSendVoiceRecording}
                                className="px-3 py-1 rounded-full bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-extrabold text-xs transition shadow flex items-center gap-1 cursor-pointer"
                                title="পাঠান (Send Voice Note)"
                              >
                                <Send className="w-3.5 h-3.5" />
                                <span>Send</span>
                              </button>
                            </div>
                          </div>
                        ) : (
                          <>
                            {/* Standard Text Input Field */}
                            <div className="flex-1 relative flex items-center">
                              <input
                                type="text"
                                value={newMessageText}
                                onChange={handleInputChange}
                                placeholder="Message..."
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
                          </>
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
                                    sendDirectMessage(sticker.split(' ')[0]);
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

      {/* STATUS / STORY VIEWER MODAL */}
      {activeStoryViewUser && (() => {
        const activeUserStories = allStories.filter(s => s.userId === activeStoryViewUser.id);
        const currentStory = activeUserStories[activeStoryIndex] || activeUserStories[0];

        const handleStoryLoveReaction = async () => {
          if (!currentStory) return;
          try {
            await fetch(`/api/stories/${currentStory.id}/react`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
            });
            alert(`💖 Sent love reaction to ${activeStoryViewUser.name}'s status!`);
          } catch (err) {
            console.error(err);
          }
        };

        const handleSendStoryComment = async () => {
          if (!storyCommentText.trim() || !currentStory) return;
          const comment = storyCommentText.trim();
          setStoryCommentText('');

          let match = matches.find(
            m => (m.user1Id === currentUser.id && m.user2Id === activeStoryViewUser.id) ||
                 (m.user1Id === activeStoryViewUser.id && m.user2Id === currentUser.id)
          );

          if (match) {
            setSelectedMatch(match);
            const content = `Replied to status: "${comment}"`;
            appendOptimisticMessage(content);
            try {
              await sendFirestoreMessage(match.id, currentUser.id, activeStoryViewUser.id, content);
            } catch (_) {}
            try {
              await fetch(`/api/messages/${match.id}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ content }),
              });
            } catch (_) {}
          }
          setActiveStoryViewUser(null);
        };

        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-2 sm:p-4 bg-slate-950/95 backdrop-blur-md animate-fade-in">
            <div className="relative w-full max-w-sm sm:max-w-md h-[85vh] max-h-[700px] bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl flex flex-col overflow-hidden">
              
              {/* Top Story Progress Bars */}
              <div className="absolute top-3 inset-x-3 z-30 flex gap-1">
                {activeUserStories.map((st, idx) => (
                  <div key={st.id || idx} className="flex-1 h-1 bg-slate-800/80 rounded-full overflow-hidden backdrop-blur-sm">
                    <div
                      className={`h-full bg-white transition-all duration-100 ${
                        idx < activeStoryIndex
                          ? 'w-full'
                          : idx === activeStoryIndex
                          ? 'w-full animate-pulse'
                          : 'w-0'
                      }`}
                    />
                  </div>
                ))}
              </div>

              {/* Story Header */}
              <div className="absolute top-6 inset-x-3 z-30 flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/80 border border-slate-800/80 backdrop-blur-md shadow-lg">
                <div
                  onClick={() => {
                    setViewingProfileUser(activeStoryViewUser);
                    setActiveStoryViewUser(null);
                  }}
                  className="flex items-center space-x-2.5 cursor-pointer hover:opacity-90 transition-opacity"
                  title="Click to view full profile"
                >
                  <img
                    src={getSafeAvatar(activeStoryViewUser)}
                    alt={activeStoryViewUser.name}
                    className="w-9 h-9 rounded-full object-cover border-2 border-rose-500 shadow"
                  />
                  <div>
                    <h4 className="text-xs font-extrabold text-white flex items-center gap-1">
                      <span>{activeStoryViewUser.name}</span>
                      {activeStoryViewUser.verified && <VerificationBadge size={14} />}
                    </h4>
                    <span className="text-[10px] text-slate-300">
                      {currentStory ? new Date(currentStory.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Status'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center space-x-2">
                  <button
                    type="button"
                    onClick={() => {
                      setViewingProfileUser(activeStoryViewUser);
                      setActiveStoryViewUser(null);
                    }}
                    className="px-2.5 py-1 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-200 text-[10px] font-bold hover:bg-rose-500/30 transition cursor-pointer"
                  >
                    Profile
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveStoryViewUser(null)}
                    className="p-1 rounded-full text-slate-300 hover:text-white hover:bg-slate-800/80 transition cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>

              {/* Story Media Display */}
              <div className="relative flex-1 bg-black flex items-center justify-center overflow-hidden">
                {currentStory ? (
                  <>
                    {currentStory.mediaType === 'video' || currentStory.imageUrl?.startsWith('data:video') ? (
                      <video
                        src={currentStory.imageUrl}
                        autoPlay
                        loop
                        playsInline
                        className={`w-full h-full ${currentStory.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                      />
                    ) : (
                      <img
                        src={currentStory.imageUrl}
                        alt="Status"
                        className={`w-full h-full ${currentStory.objectFit === 'contain' ? 'object-contain' : 'object-cover'}`}
                      />
                    )}

                    {/* Tap Navigation Overlays */}
                    <div
                      onClick={() => {
                        if (activeStoryIndex > 0) setActiveStoryIndex(prev => prev - 1);
                      }}
                      className="absolute left-0 top-20 bottom-20 w-1/3 z-20 cursor-pointer"
                    />
                    <div
                      onClick={() => {
                        if (activeStoryIndex < activeUserStories.length - 1) {
                          setActiveStoryIndex(prev => prev + 1);
                        } else {
                          setActiveStoryViewUser(null);
                        }
                      }}
                      className="absolute right-0 top-20 bottom-20 w-1/3 z-20 cursor-pointer"
                    />

                    {/* Overlay Captions / Location / Phone */}
                    <div className="absolute inset-x-3 bottom-16 z-20 flex flex-col items-center space-y-1.5 pointer-events-none">
                      {(currentStory.location || currentStory.phone) && (
                        <div className="flex flex-wrap gap-1.5 justify-center">
                          {currentStory.location && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-bold text-emerald-400 border border-emerald-500/30 backdrop-blur-sm">
                              📍 {currentStory.location}
                            </span>
                          )}
                          {currentStory.phone && (
                            <span className="px-2.5 py-0.5 rounded-full bg-slate-950/80 text-xs font-bold text-sky-400 border border-sky-500/30 backdrop-blur-sm">
                              📱 {currentStory.phone}
                            </span>
                          )}
                        </div>
                      )}
                      {currentStory.caption && (
                        <p className="text-center text-xs font-semibold text-white bg-slate-950/85 px-3 py-1.5 rounded-xl border border-slate-800 max-w-[90%] backdrop-blur-sm">
                          {currentStory.caption}
                        </p>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center p-6 text-slate-400 text-xs">
                    No active status available.
                  </div>
                )}
              </div>

              {/* Story Bottom Reaction / Message Bar */}
              {currentStory && (
                <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center space-x-2 z-30">
                  <input
                    type="text"
                    placeholder={`Reply to ${activeStoryViewUser.name}'s status...`}
                    value={storyCommentText}
                    onChange={(e) => setStoryCommentText(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') handleSendStoryComment();
                    }}
                    className="flex-1 bg-slate-900 border border-slate-800 rounded-full px-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                  <button
                    type="button"
                    onClick={handleStoryLoveReaction}
                    className="p-2 rounded-full bg-rose-500/20 hover:bg-rose-500 text-rose-400 hover:text-white transition cursor-pointer shrink-0"
                    title="Send Love Reaction"
                  >
                    <Heart className="w-5 h-5 fill-current" />
                  </button>
                  <button
                    type="button"
                    onClick={handleSendStoryComment}
                    className="p-2 rounded-full bg-sky-600 hover:bg-sky-500 text-white transition cursor-pointer shrink-0"
                    title="Send Message"
                  >
                    <Send className="w-4 h-4" />
                  </button>
                </div>
              )}

            </div>
          </div>
        );
      })()}

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

      {/* FORWARD MESSAGE MODAL */}
      {forwardingMsg && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center space-x-2 text-emerald-400 font-bold">
                <Forward className="w-5 h-5" />
                <span>Forward Message</span>
              </div>
              <button
                type="button"
                onClick={() => setForwardingMsg(null)}
                className="p-1 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-2xl border border-slate-800 text-xs text-slate-300 italic truncate">
              "{forwardingMsg.content || '📷 Media Attachment'}"
            </div>

            <input
              type="text"
              value={forwardSearchQuery}
              onChange={(e) => setForwardSearchQuery(e.target.value)}
              placeholder="Search match or friend..."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500"
            />

            <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
              {matches
                .filter(m => {
                  const u = m.user1Id === currentUser.id ? m.user2 : m.user1;
                  return (u?.name || '').toLowerCase().includes(forwardSearchQuery.toLowerCase());
                })
                .map(m => {
                  const targetUser = m.user1Id === currentUser.id ? m.user2 : m.user1;
                  if (!targetUser) return null;
                  return (
                    <div
                      key={m.id}
                      className="flex items-center justify-between p-2.5 rounded-2xl bg-slate-950/60 hover:bg-slate-800 border border-slate-800/60 transition"
                    >
                      <div className="flex items-center space-x-3">
                        <img
                          src={getSafeAvatar(targetUser)}
                          alt=""
                          className="w-9 h-9 rounded-full object-cover border border-slate-700"
                        />
                        <div>
                          <h5 className="text-xs font-bold text-white">{targetUser.name}</h5>
                          <p className="text-[10px] text-slate-400">{targetUser.age} yrs • {targetUser.location}</p>
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => handleForwardToMatch(m, targetUser)}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-extrabold shadow active:scale-95 transition cursor-pointer flex items-center gap-1"
                      >
                        <Send className="w-3.5 h-3.5" />
                        <span>Send</span>
                      </button>
                    </div>
                  );
                })}
            </div>
          </div>
        </div>
      )}

      {/* THEME SELECTION MODAL */}
      {showThemePicker && selectedMatch && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-white rounded-3xl w-full max-w-md p-6 space-y-6 shadow-2xl max-h-[90vh] flex flex-col text-slate-900 border border-slate-100">
            {/* Header with Back Arrow and Title */}
            <div className="flex items-center space-x-3 pb-3 border-b border-slate-100 shrink-0">
              <button
                type="button"
                onClick={() => setShowThemePicker(false)}
                className="p-1.5 rounded-full text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition cursor-pointer"
              >
                <ArrowLeft className="w-6 h-6" />
              </button>
              <span className="text-lg font-extrabold text-slate-900">Theme</span>
            </div>

            {/* Grid Container */}
            <div className="flex-1 overflow-y-auto pr-1 min-h-0">
              <div className="grid grid-cols-3 gap-x-4 gap-y-6">
                {/* 1. UPLOAD IMAGE CARD */}
                {(() => {
                  const currentTheme = (selectedMatch as any)?.theme || selectedThemeStyle;
                  const isCustomThemeSelected = currentTheme && !CHAT_THEME_PRESETS.some(p => p.value === currentTheme);

                  return (
                    <div className="flex flex-col">
                      <label className="relative aspect-[2/3] w-full rounded-2xl bg-slate-50 border border-slate-200 hover:border-slate-400 flex flex-col items-center justify-center cursor-pointer transition shadow-sm overflow-hidden group">
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleCustomImageUpload}
                          className="hidden"
                        />
                        <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center shadow-inner group-hover:scale-110 transition-transform">
                          <ImageIcon className="w-6 h-6 text-slate-500" />
                        </div>
                        
                        {isCustomThemeSelected && (
                          <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white text-white flex items-center justify-center shadow animate-in zoom-in-50">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </label>
                      <span className="text-[11px] font-bold text-slate-700 mt-2 truncate w-full text-left leading-tight">
                        Upload an image...
                      </span>
                    </div>
                  );
                })()}

                {/* 2. PRESETS */}
                {CHAT_THEME_PRESETS.map((preset) => {
                  const isSelected = ((selectedMatch as any)?.theme || selectedThemeStyle) === preset.value;
                  return (
                    <div key={preset.id} className="flex flex-col">
                      <button
                        type="button"
                        onClick={() => handleSelectTheme(preset.value)}
                        className={`relative aspect-[2/3] w-full rounded-2xl overflow-hidden border transition cursor-pointer shadow-sm hover:scale-[1.02] active:scale-[0.98] ${
                          isSelected ? 'border-blue-500 ring-2 ring-blue-500/30' : 'border-slate-100'
                        }`}
                      >
                        {/* Preset preview image */}
                        <img
                          src={preset.preview}
                          alt={preset.name}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-cover"
                        />

                        {isSelected && (
                          <div className="absolute inset-0 bg-black/15 flex items-center justify-center">
                            <div className="w-8 h-8 rounded-full bg-blue-500 border-2 border-white text-white flex items-center justify-center shadow animate-in zoom-in-50">
                              <Check className="w-4 h-4 stroke-[3]" />
                            </div>
                          </div>
                        )}
                      </button>
                      <span className="text-[11px] font-bold text-slate-700 mt-2 truncate w-full text-left leading-tight">
                        {preset.name}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* WALLPAPER CROPPER HUD */}
      {cropImageSrc && (
        <div className="fixed inset-0 z-[60] bg-black/90 backdrop-blur-md flex flex-col items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl flex flex-col">
            <div className="flex items-center justify-between border-b border-slate-800 pb-2">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <Crop className="w-4 h-4 text-purple-400" />
                <span>Crop Wallpaper</span>
              </h4>
              <button
                type="button"
                onClick={() => setCropImageSrc(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <p className="text-[11px] text-slate-400">
              Drag to position the image, and use the slider to zoom. Your cropped wallpaper will update instantly.
            </p>

            {/* Viewport Frame */}
            <div 
              className="relative w-[200px] h-[300px] mx-auto overflow-hidden rounded-2xl bg-slate-950 border-2 border-purple-500/50 shadow-inner cursor-move select-none touch-none"
              onMouseDown={handleCropMouseDown}
              onTouchStart={handleCropTouchStart}
            >
              <img
                src={cropImageSrc}
                alt="Crop preview"
                className="absolute origin-center max-w-none pointer-events-none"
                style={{
                  transform: `translate(${cropPos.x}px, ${cropPos.y}px) scale(${cropZoom})`,
                  left: '50%',
                  top: '50%',
                  marginLeft: '-100px', // Centers the origin
                  marginTop: '-150px',
                  width: '200px', // Standardized scaling size
                  height: 'auto',
                }}
              />
              {/* Grid guide overlays */}
              <div className="absolute inset-0 pointer-events-none border border-white/10 grid grid-cols-3 grid-rows-3">
                <div className="border-r border-b border-white/5"></div>
                <div className="border-r border-b border-white/5"></div>
                <div className="border-b border-white/5"></div>
                <div className="border-r border-b border-white/5"></div>
                <div className="border-r border-b border-white/5"></div>
                <div className="border-b border-white/5"></div>
              </div>
            </div>

            {/* Slider Controls */}
            <div className="space-y-1">
              <div className="flex justify-between text-[10px] text-slate-400">
                <span>Zoom</span>
                <span>{Math.round(cropZoom * 100)}%</span>
              </div>
              <input
                type="range"
                min="1"
                max="3"
                step="0.05"
                value={cropZoom}
                onChange={(e) => setCropZoom(parseFloat(e.target.value))}
                className="w-full accent-purple-500 bg-slate-800 rounded-lg appearance-none h-1.5"
              />
            </div>

            {/* Buttons */}
            <div className="flex gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCropImageSrc(null)}
                className="flex-1 py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApplyCrop}
                className="flex-1 py-2 px-3 rounded-xl bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-500 hover:to-pink-500 text-white font-extrabold text-xs shadow transition active:scale-95 cursor-pointer"
              >
                Apply Crop
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MATCH OPTIONS / BLOCK / DELETE MODAL */}
      {showMatchActionsModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-md flex items-center justify-center p-4 animate-in fade-in">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl text-center">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="text-sm font-extrabold text-white flex items-center gap-2">
                <MoreHorizontal className="w-4 h-4 text-rose-400" />
                <span>Chat & Profile Options</span>
              </h4>
              <button
                type="button"
                onClick={() => setShowMatchActionsModal(null)}
                className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="flex flex-col items-center space-y-2 py-2">
              <img
                src={getSafeAvatar(showMatchActionsModal.user)}
                alt={showMatchActionsModal.user.name}
                className="w-16 h-16 rounded-2xl object-cover border-2 border-rose-500/40 shadow-md"
              />
              <h5 className="text-sm font-extrabold text-white">{showMatchActionsModal.user.name}</h5>
              <p className="text-xs text-slate-400">{showMatchActionsModal.user.location || 'Dhaka, Bangladesh'}</p>
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <button
                type="button"
                onClick={() => handlePermanentDeleteChat(showMatchActionsModal.match.id)}
                className="w-full py-3 px-4 rounded-2xl bg-rose-950/40 hover:bg-rose-900/60 border border-rose-500/30 hover:border-rose-500/60 text-rose-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Trash2 className="w-4 h-4 text-rose-400" />
                <span>Delete Chat History Permanently (স্থায়ীভাবে মুছুন)</span>
              </button>

              <button
                type="button"
                onClick={() => handlePermanentBlockUser(showMatchActionsModal.user, showMatchActionsModal.match.id)}
                className="w-full py-3 px-4 rounded-2xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-amber-300 font-bold text-xs flex items-center justify-center gap-2 transition cursor-pointer active:scale-95"
              >
                <Ban className="w-4 h-4 text-amber-400" />
                <span>Block User Permanently (ব্লক করুন)</span>
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};
