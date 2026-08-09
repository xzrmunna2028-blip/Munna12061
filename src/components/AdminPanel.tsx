import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  MessageSquare,
  Sparkles,
  AlertTriangle,
  Ban,
  CheckCircle,
  XCircle,
  Search,
  Settings,
  Bell,
  BarChart3,
  Trash2,
  Lock,
  UserX,
  Send,
  Eye,
  RefreshCw,
  Heart,
  UploadCloud,
  Video,
  Upload,
  ShieldCheck,
  Camera,
  Edit,
  Save,
  Play
} from 'lucide-react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell
} from 'recharts';
import {
  User,
  Report,
  Match,
  AdminStats,
  SystemSettings,
  UserStatus,
  ReportStatus,
  UnlockRequest,
  PaymentConfig,
  Story
} from '../types';
import { VerificationBadge } from './VerificationBadge';
import { db } from '../lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';
import {
  subscribeToAllUnlockRequests,
  subscribeToPaymentConfig,
  approveUnlockRequestInFirestore,
  rejectUnlockRequestInFirestore,
  updatePaymentConfigInFirestore,
  DEFAULT_PAYMENT_CONFIG
} from '../services/unlockService';
import { customFetch as fetch } from '../lib/api';

interface AdminPanelProps {
  currentUser: User;
  onExitAdmin: () => void;
}

export const AdminPanel: React.FC<AdminPanelProps> = ({ currentUser, onExitAdmin }) => {
  const [adminTab, setAdminTab] = useState<'dashboard' | 'unlocks' | 'banners' | 'users' | 'stories' | 'chats' | 'reports' | 'matches' | 'notifications' | 'settings'>('dashboard');
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);
  const [stories, setStories] = useState<Story[]>([]);

  // Chat Monitoring & Moderation state
  const [adminChats, setAdminChats] = useState<any[]>([]);
  const [selectedAdminChat, setSelectedAdminChat] = useState<any | null>(null);
  const [selectedChatMessages, setSelectedChatMessages] = useState<any[]>([]);
  const [chatSearch, setChatSearch] = useState('');
  const [chatRestrictDays, setChatRestrictDays] = useState<number>(7);
  const [chatRestrictReason, setChatRestrictReason] = useState<string>('নীতিমালা লঙ্ঘন ও অনুপযুক্ত মেসেজ আদান-প্রদান');
  const [chatActionMsg, setChatActionMsg] = useState<string | null>(null);

  // User details modal sub-session state
  const [inspectTab, setInspectTab] = useState<'basic' | 'lifestyle' | 'photos' | 'activity' | 'notice' | 'edit'>('basic');

  // Landing Banners state
  const [banners, setBanners] = useState<any[]>([]);
  const [newBannerTitle, setNewBannerTitle] = useState('');
  const [newBannerSubtitle, setNewBannerSubtitle] = useState('');
  const [newBannerTag, setNewBannerTag] = useState('');
  const [newBannerImageUrl, setNewBannerImageUrl] = useState('');
  const [bannerSuccessMsg, setBannerSuccessMsg] = useState<string | null>(null);

  const bannerFileInputRef = React.useRef<HTMLInputElement>(null);

  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/landing-banners');
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleBannerFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setNewBannerImageUrl(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleAddBanner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newBannerTitle.trim() || !newBannerImageUrl) {
      alert('দয়া করে ব্যানারের শিরোনাম ও ছবির গ্যালারি অথবা লিংক প্রদান করুন');
      return;
    }
    try {
      const res = await fetch('/api/landing-banners', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newBannerTitle,
          subtitle: newBannerSubtitle,
          tag: newBannerTag || 'বিয়ের কনে/বর ফিচার',
          imageUrl: newBannerImageUrl
        })
      });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
        setNewBannerTitle('');
        setNewBannerSubtitle('');
        setNewBannerTag('');
        setNewBannerImageUrl('');
        setBannerSuccessMsg('নতুন ল্যান্ডিং পেজ স্লাইডার ব্যানার সফলভাবে তৈরি করা হয়েছে!');
        setTimeout(() => setBannerSuccessMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleDeleteBanner = async (id: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই স্লাইডার ব্যানারটি ডিলিট করতে চান?')) return;
    try {
      const res = await fetch(`/api/landing-banners/${id}`, { method: 'DELETE' });
      if (res.ok) {
        const data = await res.json();
        setBanners(data.banners || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Phone unlock requests & payment config state
  const [unlockRequests, setUnlockRequests] = useState<UnlockRequest[]>([]);
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [unlockFilter, setUnlockFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [requestTypeTab, setRequestTypeTab] = useState<'unlocks' | 'premium'>('unlocks');
  const [bkashInput, setBkashInput] = useState(DEFAULT_PAYMENT_CONFIG.bkashNumber);
  const [nagadInput, setNagadInput] = useState(DEFAULT_PAYMENT_CONFIG.nagadNumber);
  const [feeInput, setFeeInput] = useState(DEFAULT_PAYMENT_CONFIG.unlockFeeBdt);
  const [videoUrlInput, setVideoUrlInput] = useState('');
  const [isUploadingVideo, setIsUploadingVideo] = useState(false);
  const [paymentConfigSuccess, setPaymentConfigSuccess] = useState<string | null>(null);

  const [loading, setLoading] = useState(true);
  const [userSearch, setUserSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | UserStatus>('all');
  const [reportFilter, setReportFilter] = useState<'all' | ReportStatus>('all');

  // Broadcast & Targeted Notification state
  const [notifTargetType, setNotifTargetType] = useState<'all' | 'individual'>('all');
  const [notifTargetUserId, setNotifTargetUserId] = useState<string>('');
  const [notifOfficialTitle, setNotifOfficialTitle] = useState('True Love Connect Official (অফিশিয়াল সাপোর্ট)');
  const [notifOfficialLogo, setNotifOfficialLogo] = useState("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23ec4899' stroke='%23ffffff' stroke-width='1.5'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>");
  const [notifOfficialVerified, setNotifOfficialVerified] = useState(true);
  const [notifImageUrl, setNotifImageUrl] = useState('');
  const [broadcastTitle, setBroadcastTitle] = useState('');
  const [broadcastMessage, setBroadcastMessage] = useState('');
  const [broadcastSuccess, setBroadcastSuccess] = useState<string | null>(null);

  const handleLogoFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setNotifOfficialLogo(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Settings form state
  const [appTitle, setAppTitle] = useState('');
  const [appName, setAppName] = useState('True Love Connect');
  const [siteLogoUrl, setSiteLogoUrl] = useState('');
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  const [maintenanceMessage, setMaintenanceMessage] = useState('আমাদের ওয়েবসাইটটি বর্তমানে সার্ভার আপডেট ও নতুন ফিচার সংযোজনের জন্য সাময়িকভাবে বন্ধ রয়েছে। খুব শীঘ্রই আমরা নতুন আপডেট নিয়ে ফিরছি। ধন্যবাদ।');
  const [defaultRadius, setDefaultRadius] = useState(50);
  const [minAge, setMinAge] = useState(18);
  const [maxAge, setMaxAge] = useState(75);
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);

  useEffect(() => {
    fetchAdminData();
    fetchBanners();

    // Real-time Firestore subscriptions for Unlock Requests and Payment Config
    const unsubReqs = subscribeToAllUnlockRequests((reqs) => {
      setUnlockRequests(reqs);
    });

    const unsubConfig = subscribeToPaymentConfig((cfg) => {
      setPaymentConfig(cfg);
      setBkashInput(cfg.bkashNumber);
      setNagadInput(cfg.nagadNumber);
      setFeeInput(cfg.unlockFeeBdt);
      setVideoUrlInput(cfg.tutorialVideoUrl || '');
    });

    return () => {
      unsubReqs();
      unsubConfig();
    };
  }, []);

  const handleSavePaymentConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    const newConfig: PaymentConfig = {
      bkashNumber: bkashInput.trim() || '01647783682',
      nagadNumber: nagadInput.trim() || '01647783682',
      unlockFeeBdt: Number(feeInput) || 100,
      tutorialVideoUrl: videoUrlInput.trim()
    };
    await updatePaymentConfigInFirestore(newConfig);
    setPaymentConfigSuccess('Payment configuration and Tutorial Video settings updated successfully!');
    setTimeout(() => setPaymentConfigSuccess(null), 3000);
  };

  const handleAdminVideoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) { // limit to 10MB in UI
      alert('The video is too large. Please select a video smaller than 10MB.');
      return;
    }

    setIsUploadingVideo(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        const base64 = reader.result as string;
        const res = await fetch('/api/admin/upload-video', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ videoData: base64 })
        });
        if (res.ok) {
          const data = await res.json();
          setVideoUrlInput(data.url);
          alert('Tutorial video uploaded to server successfully! Click "Save Configuration" below to persist.');
        } else {
          alert('Failed to upload tutorial video.');
        }
      } catch (err) {
        console.error(err);
        alert('Error uploading video.');
      } finally {
        setIsUploadingVideo(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleApproveUnlock = async (req: UnlockRequest) => {
    const isPremium = req.targetUserId === 'premium_verification';
    const targetUser = users.find((u) => u.id === req.targetUserId);
    const targetPhone = targetUser?.phone || req.targetUserPhone || '01711223344';

    const confirmMsg = isPremium 
      ? `Approve ৳${req.amount} payment (TrxID: ${req.trxId}) from ${req.userName} for a 1-Month Premium Verification Badge?`
      : `Approve ৳${req.amount} payment (TrxID: ${req.trxId}) from ${req.userName}? This will unlock ${req.targetUserName}'s phone number (${targetPhone}) for ${req.userName}.`;

    if (!window.confirm(confirmMsg)) return;

    await approveUnlockRequestInFirestore(req, targetPhone);

    if (isPremium) {
      setUsers((prev) =>
        prev.map((u) => (u.id === req.userId ? { ...u, verified: true } : u))
      );
    }
  };

  const handleRejectUnlock = async (req: UnlockRequest) => {
    const note = window.prompt(`Reject unlock request from ${req.userName}? Enter rejection reason for user:`, 'Invalid Transaction ID / Amount mismatched');
    if (note === null) return;

    await rejectUnlockRequestInFirestore(req.id, note);
  };

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const [resStats, resUsers, resReports, resMatches, resSettings] = await Promise.all([
        fetch('/api/admin/stats'),
        fetch('/api/admin/users'),
        fetch('/api/admin/reports'),
        fetch('/api/admin/matches'),
        fetch('/api/admin/settings'),
      ]);

      if (resStats.ok) setStats((await resStats.json()).stats);
      if (resUsers.ok) setUsers((await resUsers.json()).users);
      if (resReports.ok) setReports((await resReports.json()).reports);
      if (resMatches.ok) setMatches((await resMatches.json()).matches);
      if (resSettings.ok) {
        const s = (await resSettings.json()).settings;
        setSettings(s);
        setAppTitle(s.appTitle || '');
        setAppName(s.appName || 'True Love Connect');
        setSiteLogoUrl(s.siteLogoUrl || '');
        setMaintenanceMode(!!s.maintenanceMode);
        if (s.maintenanceMessage) setMaintenanceMessage(s.maintenanceMessage);
        setDefaultRadius(s.defaultRadiusKm);
        setMinAge(s.minAgeLimit);
        setMaxAge(s.maxAgeLimit);
      }
    } catch (err) {
      console.error('Error fetching admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUserStatus = async (userId: string, newStatus: UserStatus) => {
    try {
      const res = await fetch(`/api/admin/users/${userId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });
      if (res.ok) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, status: newStatus } : u))
        );
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleToggleUserVerification = async (userId: string, currentVerified: boolean) => {
    const newVerified = !currentVerified;
    try {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { verified: newVerified });
      } catch (err) {
        console.log('Firestore update error (fallback to backend API):', err);
      }

      const res = await fetch(`/api/admin/users/${userId}/verification`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ verified: newVerified }),
      });

      if (res.ok || true) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, verified: newVerified } : u))
        );
        if (inspectUser && inspectUser.id === userId) {
          setInspectUser({ ...inspectUser, verified: newVerified });
        }
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error toggling user verification:', err);
    }
  };

  const handleUpdatePhotoStatus = async (userId: string, photoStatus: 'approved' | 'rejected' | 'pending', rejectionReason?: string) => {
    try {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, { photoStatus, rejectionReason: rejectionReason || '' });
      } catch (err) {
        console.log('Firestore photo update error (fallback to backend API):', err);
      }

      const res = await fetch(`/api/admin/users/${userId}/photo-status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ photoStatus, rejectionReason }),
      });

      if (res.ok || true) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, photoStatus, rejectionReason: rejectionReason || '' } : u))
        );
        if (inspectUser && inspectUser.id === userId) {
          setInspectUser({ ...inspectUser, photoStatus, rejectionReason: rejectionReason || '' });
        }
        fetchAdminData();
      }
    } catch (err) {
      console.error('Error updating photo status:', err);
    }
  };

  const handleDeleteUser = async (userId: string) => {
    if (!window.confirm('Are you sure you want to permanently delete this user account?')) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}`, { method: 'DELETE' });
      if (res.ok) {
        setUsers((prev) => prev.filter((u) => u.id !== userId));
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateReportStatus = async (reportId: string, status: ReportStatus, banReportedUser = false) => {
    try {
      const res = await fetch(`/api/admin/reports/${reportId}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, banReportedUser }),
      });
      if (res.ok) {
        setReports((prev) =>
          prev.map((r) => (r.id === reportId ? { ...r, status } : r))
        );
        fetchAdminData();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchAdminChats = async () => {
    try {
      const res = await fetch('/api/admin/chats');
      if (res.ok) {
        const data = await res.json();
        setAdminChats(data.chats || []);
      }
    } catch (err) {
      console.error('Error fetching admin chats:', err);
    }
  };

  const fetchAdminChatMessages = async (matchId: string) => {
    try {
      const res = await fetch(`/api/admin/chats/${matchId}/messages`);
      if (res.ok) {
        const data = await res.json();
        setSelectedChatMessages(data.messages || []);
      }
    } catch (err) {
      console.error('Error fetching chat messages:', err);
    }
  };

  const handleDeleteAdminMessage = async (msgId: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই মেসেজটি ডিলিট করতে চান?')) return;
    try {
      const res = await fetch(`/api/admin/messages/${msgId}`, { method: 'DELETE' });
      if (res.ok) {
        setSelectedChatMessages(prev => prev.filter(m => m.id !== msgId));
        setChatActionMsg('মেসেজটি সফলভাবে ডিলিট করা হয়েছে!');
        setTimeout(() => setChatActionMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleRestrictAdminChat = async (matchId: string, days: number) => {
    try {
      const res = await fetch(`/api/admin/chats/${matchId}/restrict`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ days, reason: chatRestrictReason })
      });
      if (res.ok) {
        const data = await res.json();
        setChatActionMsg(data.message || 'চ্যাট স্থগিতা অবস্থা আপডেট করা হয়েছে!');
        fetchAdminChats();
        if (selectedAdminChat) {
          setSelectedAdminChat((prev: any) => ({
            ...prev,
            chatRestrictedUntil: data.restrictedUntil,
            chatRestrictionReason: data.reason
          }));
        }
        setTimeout(() => setChatActionMsg(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleSendBroadcast = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!broadcastTitle || !broadcastMessage) return;
    if (notifTargetType === 'individual' && !notifTargetUserId) {
      alert('Please select a specific target user to send an individual notification.');
      return;
    }

    try {
      const res = await fetch('/api/admin/notifications/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          targetType: notifTargetType,
          targetUserId: notifTargetUserId,
          title: broadcastTitle,
          message: broadcastMessage,
          officialLogo: notifOfficialLogo,
          officialTitle: notifOfficialTitle,
          officialVerified: notifOfficialVerified,
          imageUrl: notifImageUrl || undefined
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastSuccess(data.message || 'Notification sent successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setNotifImageUrl('');
        setTimeout(() => setBroadcastSuccess(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
  };

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

  const handleDeleteStory = async (storyId: string) => {
    if (!window.confirm('আপনি কি সত্যিই এই ইউজার স্টোরিটি ডিলিট করতে চান?')) return;
    try {
      const res = await fetch(`/api/stories/${storyId}`, { method: 'DELETE' });
      if (res.ok) {
        setStories((prev) => prev.filter((s) => s.id !== storyId));
        alert('স্টোরি পোস্ট সফলভাবে মুছে ফেলা হয়েছে!');
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleUpdateUserFullDetails = async (userId: string, updatedFields: Partial<User>) => {
    try {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, updatedFields);
      } catch (e) {
        console.log('Firestore update user note:', e);
      }

      const res = await fetch(`/api/admin/users/${userId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedFields),
      });

      if (res.ok || true) {
        setUsers((prev) =>
          prev.map((u) => (u.id === userId ? { ...u, ...updatedFields } : u))
        );
        if (inspectUser && inspectUser.id === userId) {
          setInspectUser({ ...inspectUser, ...updatedFields });
        }
        fetchAdminData();
        alert('ইউজার প্রোফাইলের তথ্য সফলভাবে সেভ ও আপডেট করা হয়েছে!');
      }
    } catch (err) {
      console.error('Error updating user full details:', err);
    }
  };

  const handleDeleteUserPhoto = async (userId: string) => {
    if (!window.confirm('আপনি কি এই ইউজারের ছবি ডিলিট করে ডিফল্ট ছবি সেট করতে চান?')) return;
    const defaultPhoto = 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=800&q=80';
    await handleUpdateUserFullDetails(userId, {
      avatar: defaultPhoto,
      photos: [defaultPhoto],
      photoStatus: 'rejected',
      rejectionReason: 'এডমিন কর্তৃক অনুচিত/অনুপযুক্ত ছবি ডিলিট করা হয়েছে।'
    });
  };

  const handleSaveSettings = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          appTitle,
          appName,
          siteLogoUrl,
          maintenanceMode,
          maintenanceMessage,
          defaultRadiusKm: Number(defaultRadius),
          minAgeLimit: Number(minAge),
          maxAgeLimit: Number(maxAge),
        }),
      });
      if (res.ok) {
        setSettingsSuccess('সিস্টেম সেটিংস, ব্র্যান্ড নাম, লোগো এবং মেইনটেন্যান্স মোড সফলভাবে আপডেট করা হয়েছে! 💖');
        setTimeout(() => setSettingsSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [photoStatusFilter, setPhotoStatusFilter] = useState<'all' | 'pending' | 'approved' | 'rejected'>('all');
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      (u.name || '').toLowerCase().includes((userSearch || '').toLowerCase()) ||
      (u.email || '').toLowerCase().includes((userSearch || '').toLowerCase()) ||
      (u.username && typeof u.username === 'string' && u.username.toLowerCase().includes((userSearch || '').toLowerCase()));
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    
    const isComp = (u.profileCompletionPercentage || 0) >= 100;
    const matchesCompletion =
      completionFilter === 'all' ||
      (completionFilter === 'complete' && isComp) ||
      (completionFilter === 'incomplete' && !isComp);

    const userPhotoStatus = u.photoStatus || 'approved';
    const matchesPhotoStatus =
      photoStatusFilter === 'all' || userPhotoStatus === photoStatusFilter;

    return matchesQuery && matchesStatus && matchesCompletion && matchesPhotoStatus;
  });

  const filteredReports = reports.filter((r) => {
    return reportFilter === 'all' || r.status === reportFilter;
  });

  const COLORS = ['#f43f5e', '#ec4899', '#8b5cf6', '#06b6d4'];

  return (
    <div className="max-w-7xl mx-auto px-4 py-6 text-white pb-24 md:pb-12">
      
      {/* Admin Panel Header */}
      <div className="flex flex-wrap items-center justify-between gap-4 mb-6 bg-slate-900 border border-slate-800 p-4 rounded-3xl shadow-xl">
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 flex items-center justify-center shadow-lg shadow-rose-500/30">
            <Shield className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight flex items-center gap-2">
              Admin Portal Dashboard
              <span className="px-2 py-0.5 rounded text-[10px] uppercase font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                Superuser Access
              </span>
            </h1>
            <p className="text-xs text-slate-400">Manage members, reports, matches, notifications, and platform parameters</p>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <button
            onClick={fetchAdminData}
            className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700 text-xs font-semibold flex items-center gap-1.5"
            title="Refresh Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onExitAdmin}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 text-xs font-bold"
          >
            Exit Admin Panel
          </button>
        </div>
      </div>

      {/* Admin Navigation Tabs */}
      <div className="flex space-x-2 overflow-x-auto pb-3 mb-6">
        <button
          onClick={() => setAdminTab('dashboard')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'dashboard'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <BarChart3 className="w-4 h-4" />
          <span>Analytics & Stats</span>
        </button>

        <button
          onClick={() => setAdminTab('unlocks')}
          className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'unlocks'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Lock className="w-4 h-4 text-amber-400" />
          <span>Phone Unlock Payments</span>
          {unlockRequests.filter((r) => r.status === 'pending').length > 0 && (
            <span className="ml-1 px-2 py-0.5 rounded-full text-[10px] bg-rose-500 text-white font-extrabold animate-pulse">
              {unlockRequests.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('banners')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'banners'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Sparkles className="w-4 h-4 text-amber-400" />
          <span>Landing Page Banners</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-rose-300 font-extrabold rounded-full">
            {banners.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('users')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'users'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Users className="w-4 h-4" />
          <span>User Management</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('stories');
            fetchStories();
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'stories'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Camera className="w-4 h-4 text-pink-400" />
          <span>Member Stories (স্টোরি পোস্ট)</span>
          <span className="px-1.5 py-0.2 text-[10px] bg-slate-800 text-pink-300 font-extrabold rounded-full">
            {stories.length}
          </span>
        </button>

        <button
          onClick={() => setAdminTab('reports')}
          className={`relative flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'reports'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <AlertTriangle className="w-4 h-4 text-amber-400" />
          <span>Reports & Safety</span>
          {reports.filter((r) => r.status === 'pending').length > 0 && (
            <span className="px-1.5 py-0.2 text-[10px] bg-amber-500 text-slate-950 font-extrabold rounded-full">
              {reports.filter((r) => r.status === 'pending').length}
            </span>
          )}
        </button>

        <button
          onClick={() => setAdminTab('matches')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'matches'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Heart className="w-4 h-4" />
          <span>Match Records</span>
        </button>

        <button
          onClick={() => {
            setAdminTab('chats');
            fetchAdminChats();
          }}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'chats'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <MessageSquare className="w-4 h-4 text-sky-400" />
          <span>Chat Moderation & Control (চ্যাট মনিটরিং)</span>
        </button>

        <button
          onClick={() => setAdminTab('notifications')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'notifications'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Bell className="w-4 h-4" />
          <span>Broadcasting</span>
        </button>

        <button
          onClick={() => setAdminTab('settings')}
          className={`flex items-center space-x-2 px-4 py-2.5 rounded-2xl text-xs font-bold transition-all ${
            adminTab === 'settings'
              ? 'bg-gradient-to-r from-rose-500 to-pink-500 text-white shadow-lg shadow-rose-500/20'
              : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-white'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Platform Config</span>
        </button>
      </div>

      {loading ? (
        <div className="text-center py-20 text-slate-400 text-xs">Loading admin statistics and records...</div>
      ) : (
        <>
          {/* TAB 1: DASHBOARD & STATS */}
          {adminTab === 'dashboard' && stats && (
            <div className="space-y-6">
              
              {/* Stats Summary Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-slate-400 uppercase">Total Users</span>
                  <p className="text-2xl font-extrabold text-white mt-1">{stats.totalUsers}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-emerald-400 uppercase">Active Users</span>
                  <p className="text-2xl font-extrabold text-emerald-400 mt-1">{stats.activeUsers}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-rose-400 uppercase">Total Matches</span>
                  <p className="text-2xl font-extrabold text-rose-400 mt-1">{stats.totalMatches}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-amber-400 uppercase">Pending Reports</span>
                  <p className="text-2xl font-extrabold text-amber-400 mt-1">{stats.pendingReports}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-rose-500 uppercase">Banned Users</span>
                  <p className="text-2xl font-extrabold text-rose-500 mt-1">{stats.bannedUsers}</p>
                </div>
                <div className="p-4 bg-slate-900 border border-slate-800 rounded-2xl">
                  <span className="text-[10px] font-bold text-sky-400 uppercase">New Today</span>
                  <p className="text-2xl font-extrabold text-sky-400 mt-1">+{stats.newUsersToday}</p>
                </div>
              </div>

              {/* Charts Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                
                {/* User Registrations Chart */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Daily Member Registrations
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={stats.dailyRegistrations}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        />
                        <Bar dataKey="count" fill="#f43f5e" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Match Trends Line Chart */}
                <div className="p-5 bg-slate-900 border border-slate-800 rounded-3xl">
                  <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-4">
                    Weekly Match Rate Trends
                  </h3>
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={stats.matchTrends}>
                        <XAxis dataKey="date" stroke="#64748b" fontSize={11} />
                        <YAxis stroke="#64748b" fontSize={11} />
                        <Tooltip
                          contentStyle={{ backgroundColor: '#0f172a', borderColor: '#334155', borderRadius: '12px' }}
                        />
                        <Line type="monotone" dataKey="matches" stroke="#ec4899" strokeWidth={3} dot={{ fill: '#ec4899' }} />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

              </div>

            </div>
          )}

          {/* TAB: PHONE UNLOCK PAYMENTS */}
          {adminTab === 'unlocks' && (
            <div className="space-y-6">
              
              {/* Payment Config Box */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center">
                      <Settings className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider">
                        bKash & Nagad Payment Numbers & Fee Configuration
                      </h3>
                      <p className="text-xs text-slate-400">Set the official mobile banking cashout numbers and unlock price shown to users</p>
                    </div>
                  </div>
                </div>

                {paymentConfigSuccess && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4" />
                    <span>{paymentConfigSuccess}</span>
                  </div>
                )}

                <form onSubmit={handleSavePaymentConfig} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">bKash Number</label>
                      <input
                        type="text"
                        required
                        value={bkashInput}
                        onChange={(e) => setBkashInput(e.target.value)}
                        placeholder="e.g. 01647783682"
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-pink-400 font-bold focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Nagad Number</label>
                      <input
                        type="text"
                        required
                        value={nagadInput}
                        onChange={(e) => setNagadInput(e.target.value)}
                        placeholder="e.g. 01647783682"
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-mono text-amber-400 font-bold focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-bold text-slate-300 mb-1">Phone Unlock Fee (৳ BDT)</label>
                      <input
                        type="number"
                        required
                        min={1}
                        value={feeInput}
                        onChange={(e) => setFeeInput(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>

                  <div className="border-t border-slate-800 pt-4 mt-2 space-y-3">
                    <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <Video className="w-4 h-4 text-sky-400" />
                      <span>Payment Video Tutorial Settings (পেমেন্ট টিউটোরিয়াল ভিডিও গাইড সেটিংস)</span>
                    </span>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                      <div className="md:col-span-2">
                        <label className="block text-xs font-bold text-slate-400 mb-1">Tutorial Video URL / Direct Link</label>
                        <input
                          type="text"
                          value={videoUrlInput}
                          onChange={(e) => setVideoUrlInput(e.target.value)}
                          placeholder="e.g. https://yourdomain.com/video.mp4 or YouTube link"
                          className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-medium text-slate-200 focus:outline-none focus:border-rose-500"
                        />
                      </div>

                      <div className="flex flex-col gap-1">
                        <span className="text-[10px] font-bold text-slate-400">Or Select Video from Gallery</span>
                        <label className={`w-full py-2 rounded-xl border border-dashed border-slate-700 text-center text-xs font-bold transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
                          isUploadingVideo ? 'opacity-50' : 'bg-slate-800 hover:bg-slate-750 text-slate-300'
                        }`}>
                          <Upload className="w-4 h-4" />
                          <span>{isUploadingVideo ? 'Uploading...' : 'Choose File'}</span>
                          <input
                            type="file"
                            accept="video/*"
                            disabled={isUploadingVideo}
                            onChange={handleAdminVideoUpload}
                            className="hidden"
                          />
                        </label>
                      </div>
                    </div>

                    {videoUrlInput && (
                      <div className="bg-slate-950 p-3 rounded-2xl border border-slate-800 space-y-2">
                        <span className="text-[11px] font-bold text-slate-400 block">Preview Video Tutorial:</span>
                        <div className="relative max-w-sm rounded-xl overflow-hidden bg-black border border-slate-800 aspect-video flex items-center justify-center">
                          <video
                            src={videoUrlInput}
                            controls
                            className="w-full h-full object-contain"
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end pt-2">
                    <button
                      type="submit"
                      className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow-lg transition-all flex items-center gap-1.5 cursor-pointer"
                    >
                      <CheckCircle className="w-4 h-4" />
                      <span>Save Configuration</span>
                    </button>
                  </div>
                </form>
              </div>

              {/* Unlock Payment Verification List */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                
                {/* Request Type Selector (Separated Request Modules) */}
                <div className="flex border-b border-slate-800 pb-2 gap-4">
                  <button
                    onClick={() => {
                      setRequestTypeTab('unlocks');
                      setUnlockFilter('all');
                    }}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                      requestTypeTab === 'unlocks'
                        ? 'text-amber-400 font-extrabold border-b-2 border-amber-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    নাম্বার আনলক রিকোয়েস্ট (Phone Unlock Requests)
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-slate-850 text-slate-300 font-normal">
                      {unlockRequests.filter(r => r.targetUserId !== 'premium_verification').length}
                    </span>
                  </button>

                  <button
                    onClick={() => {
                      setRequestTypeTab('premium');
                      setUnlockFilter('all');
                    }}
                    className={`pb-2.5 px-4 text-xs font-bold transition-all relative cursor-pointer ${
                      requestTypeTab === 'premium'
                        ? 'text-sky-400 font-extrabold border-b-2 border-sky-500'
                        : 'text-slate-400 hover:text-slate-200'
                    }`}
                  >
                    ব্লু ভেরিফিকেশন ব্যাজ রিকোয়েস্ট (Blue Badge Requests)
                    <span className="ml-1.5 px-1.5 py-0.5 rounded-full text-[9px] bg-slate-850 text-slate-305 font-normal">
                      {unlockRequests.filter(r => r.targetUserId === 'premium_verification').length}
                    </span>
                  </button>
                </div>

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    {requestTypeTab === 'unlocks' ? (
                      <>
                        <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider flex items-center gap-2">
                          <Lock className="w-4 h-4 text-amber-400" />
                          Phone Unlock Verification Requests
                        </h3>
                        <p className="text-xs text-slate-400">Verify user TrxIDs and approve phone number access in real time</p>
                      </>
                    ) : (
                      <>
                        <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider flex items-center gap-2">
                          <ShieldCheck className="w-4 h-4 text-sky-400" />
                          Blue Verification Badge Requests
                        </h3>
                        <p className="text-xs text-slate-400">Verify premium subscription TrxIDs and grant blue verification badges</p>
                      </>
                    )}
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80">
                    <button
                      onClick={() => setUnlockFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({unlockRequests.filter(r => requestTypeTab === 'premium' ? r.targetUserId === 'premium_verification' : r.targetUserId !== 'premium_verification').length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('pending')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pending ({unlockRequests.filter(r => (requestTypeTab === 'premium' ? r.targetUserId === 'premium_verification' : r.targetUserId !== 'premium_verification') && r.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('approved')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Approved ({unlockRequests.filter(r => (requestTypeTab === 'premium' ? r.targetUserId === 'premium_verification' : r.targetUserId !== 'premium_verification') && r.status === 'approved').length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('rejected')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rejected ({unlockRequests.filter(r => (requestTypeTab === 'premium' ? r.targetUserId === 'premium_verification' : r.targetUserId !== 'premium_verification') && r.status === 'rejected').length})
                    </button>
                  </div>
                </div>

                {/* Table of Requests */}
                {unlockRequests.filter((r) => {
                  const matchesType = requestTypeTab === 'premium' 
                    ? r.targetUserId === 'premium_verification'
                    : r.targetUserId !== 'premium_verification';
                  const matchesStatus = unlockFilter === 'all' || r.status === unlockFilter;
                  return matchesType && matchesStatus;
                }).length > 0 ? (
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Requesting User</th>
                          <th className="p-3">{requestTypeTab === 'premium' ? 'Requested Item' : 'Target Member'}</th>
                          <th className="p-3">Method & TrxID</th>
                          <th className="p-3">Sender Phone</th>
                          <th className="p-3">Amount</th>
                          <th className="p-3">Submitted At</th>
                          <th className="p-3">Status</th>
                          <th className="p-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-800">
                        {unlockRequests
                          .filter((r) => {
                            const matchesType = requestTypeTab === 'premium' 
                              ? r.targetUserId === 'premium_verification'
                              : r.targetUserId !== 'premium_verification';
                            const matchesStatus = unlockFilter === 'all' || r.status === unlockFilter;
                            return matchesType && matchesStatus;
                          })
                          .map((req) => (
                            <tr key={req.id} className="hover:bg-slate-800/40 transition-colors">
                              <td className="p-3">
                                <div className="font-bold text-white">{req.userName}</div>
                                <div className="text-[10px] text-slate-400">{req.userEmail || req.userId}</div>
                              </td>

                              <td className="p-3">
                                <div className="font-bold text-rose-400">{req.targetUserName}</div>
                                <div className="text-[10px] text-slate-400 font-mono">
                                  {req.targetUserPhone || '017XXXXXXXX'}
                                </div>
                              </td>

                              <td className="p-3">
                                <div className="flex items-center space-x-1.5">
                                  <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold uppercase ${
                                    req.paymentMethod === 'bkash' ? 'bg-pink-500/20 text-pink-300' : 'bg-amber-500/20 text-amber-300'
                                  }`}>
                                    {req.paymentMethod}
                                  </span>
                                  <span className="font-mono font-bold text-amber-300 tracking-wider">
                                    {req.trxId}
                                  </span>
                                </div>
                              </td>

                              <td className="p-3 font-mono text-slate-200">
                                {req.senderPhone}
                              </td>

                              <td className="p-3 font-bold text-emerald-400">
                                ৳{req.amount}
                              </td>

                              <td className="p-3 text-[10px] text-slate-400">
                                {new Date(req.createdAt).toLocaleString()}
                              </td>

                              <td className="p-3">
                                <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                  req.status === 'pending'
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                    : req.status === 'approved'
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}>
                                  {req.status}
                                </span>
                              </td>

                              <td className="p-3 text-right">
                                {req.status === 'pending' ? (
                                  <div className="flex justify-end items-center space-x-2">
                                    <button
                                      onClick={() => handleRejectUnlock(req)}
                                      className="px-2.5 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-bold border border-rose-500/30 transition-colors"
                                    >
                                      Reject
                                    </button>
                                    <button
                                      onClick={() => handleApproveUnlock(req)}
                                      className="px-3 py-1.5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 text-white text-[11px] font-bold shadow transition-all"
                                    >
                                      Approve & Unlock
                                    </button>
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-slate-500 italic">Completed</span>
                                )}
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                ) : (
                  <div className="text-center py-10 text-slate-400 text-xs">
                    No unlock payment requests found for the selected filter.
                  </div>
                )}

              </div>
            </div>
          )}

          {/* TAB 1.5: LANDING PAGE BANNERS MANAGEMENT */}
          {adminTab === 'banners' && (
            <div className="space-y-6 animate-fade-in">
              {/* Form to Add New Banner */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-2xl">
                <div className="flex items-center space-x-2">
                  <Sparkles className="w-5 h-5 text-amber-400" />
                  <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider">
                    নতুন ল্যান্ডিং স্লাইডার ব্যানার যোগ করুন (Add Showcase Banner)
                  </h3>
                </div>
                <p className="text-xs text-slate-400">
                  এখানে পাত্র-পাত্রী, বিয়ে বা রোমান্টিক ডেমো ছবি গ্যালারি থেকে সিলেক্ট করুন অথবা ইমেজ লিংক দিয়ে আনলিমিটেড ব্যানার ফ্রন্ট পেজে যোগ করুন।
                </p>

                {bannerSuccessMsg && (
                  <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-bold">
                    {bannerSuccessMsg}
                  </div>
                )}

                <form onSubmit={handleAddBanner} className="space-y-4">
                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ব্যানার শিরোনাম (Title) <span className="text-rose-400">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      value={newBannerTitle}
                      onChange={(e) => setNewBannerTitle(e.target.value)}
                      placeholder="e.g. শুভ পরিণয় & মনের মতো পাত্র-পাত্রী মিলন"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      উপ-শিরোনাম (Subtitle / Description)
                    </label>
                    <input
                      type="text"
                      value={newBannerSubtitle}
                      onChange={(e) => setNewBannerSubtitle(e.target.value)}
                      placeholder="e.g. পারিবারিক পছন্দ ও ভেরিফাইড বায়োডাটা দেখে বিশ্বস্ত পাত্র-পাত্রী নির্বাচন করুন"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ক্যাটাগরি বা ব্যাজ ট্যাগ (Badge Tag)
                    </label>
                    <input
                      type="text"
                      value={newBannerTag}
                      onChange={(e) => setNewBannerTag(e.target.value)}
                      placeholder="e.g. পাত্র-পাত্রী সেন্টার / ম্যাট্রিমনি"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3.5 py-2.5 text-xs text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-slate-300 mb-1">
                      ব্যানার ছবি (গ্যালারি থেকে ফটো আপলোড করুন অথবা ইমেজ URL দিন) <span className="text-rose-400">*</span>
                    </label>
                    
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                      <input
                        type="file"
                        ref={bannerFileInputRef}
                        onChange={handleBannerFileUpload}
                        accept="image/*"
                        className="hidden"
                      />
                      <button
                        type="button"
                        onClick={() => bannerFileInputRef.current?.click()}
                        className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 text-xs font-bold flex items-center justify-center space-x-2 shadow"
                      >
                        <Sparkles className="w-4 h-4 text-pink-400" />
                        <span>📱 ডিভাইস গ্যালারি থেকে ফটো বাছুন</span>
                      </button>

                      <span className="text-xs text-slate-500 text-center sm:text-left">অথবা</span>

                      <input
                        type="url"
                        value={newBannerImageUrl}
                        onChange={(e) => setNewBannerImageUrl(e.target.value)}
                        placeholder="https://images.unsplash.com/photo-..."
                        className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    {newBannerImageUrl && (
                      <div className="mt-3 relative w-full h-36 rounded-2xl overflow-hidden border border-slate-700/80">
                        <img src={newBannerImageUrl} alt="Preview" className="w-full h-full object-cover" />
                        <span className="absolute top-2 left-2 px-2 py-0.5 bg-slate-950/80 text-[10px] text-emerald-300 rounded font-bold">
                          Image Selected Preview
                        </span>
                      </div>
                    )}
                  </div>

                  <button
                    type="submit"
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 text-white font-bold text-xs shadow-lg shadow-rose-500/20"
                  >
                    + নতুন স্লাইডার ব্যানার যোগ করুন
                  </button>
                </form>
              </div>

              {/* Banners List */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                <div className="flex justify-between items-center">
                  <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider">
                    সকল স্লাইডার ব্যানার ({banners.length}টি)
                  </h3>
                  <span className="text-xs text-slate-400">এখান থেকে যেকোনো সময় ব্যানার ডিলিট করতে পারবেন</span>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {banners.map((b) => (
                    <div key={b.id} className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-4 flex flex-col sm:flex-row gap-4 relative group">
                      <img
                        src={b.imageUrl}
                        alt={b.title}
                        className="w-full sm:w-32 h-28 rounded-xl object-cover border border-slate-700 flex-shrink-0"
                      />
                      <div className="flex-1 space-y-1">
                        <span className="inline-block px-2 py-0.5 rounded bg-pink-500/20 text-pink-300 text-[10px] font-bold border border-pink-500/30">
                          {b.tag}
                        </span>
                        <h4 className="text-xs font-bold text-white leading-snug">{b.title}</h4>
                        <p className="text-[11px] text-slate-300 line-clamp-2">{b.subtitle}</p>
                        <div className="pt-2 flex items-center justify-between">
                          <span className="text-[9px] text-slate-500 font-mono">ID: #{b.id}</span>
                          <button
                            onClick={() => handleDeleteBanner(b.id)}
                            className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[11px] font-bold border border-rose-500/30 transition-all flex items-center gap-1"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                            <span>ডিলিট করুন</span>
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: USER MANAGEMENT */}
          {adminTab === 'users' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-wrap items-center gap-3">
                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Completion Filter:</span>
                    <select
                      value={completionFilter}
                      onChange={(e) => setCompletionFilter(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="all">All Completion Levels</option>
                      <option value="complete">100% Complete Profiles</option>
                      <option value="incomplete">Incomplete Profiles (&lt;100%)</option>
                    </select>
                  </div>

                  <div className="flex items-center space-x-2">
                    <span className="text-xs text-slate-400">Photo Review Filter:</span>
                    <select
                      value={photoStatusFilter}
                      onChange={(e) => setPhotoStatusFilter(e.target.value as any)}
                      className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                    >
                      <option value="all">📷 All Photo Status</option>
                      <option value="pending">⏳ Pending Review (যাচাইয়ের অপেক্ষায়)</option>
                      <option value="approved">✅ Approved (অনুমোদিত)</option>
                      <option value="rejected">❌ Rejected (বাতিল করা হয়েছে)</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">User Member</th>
                      <th className="p-3">Photo Moderation</th>
                      <th className="p-3">Premium Badge</th>
                      <th className="p-3">Profile Completion</th>
                      <th className="p-3">Details</th>
                      <th className="p-3">Location</th>
                      <th className="p-3">Status</th>
                      <th className="p-3 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800">
                    {filteredUsers.map((u) => {
                      const comp = u.profileCompletionPercentage || 80;
                      const pStatus = u.photoStatus || 'approved';
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="p-3 flex items-center space-x-3">
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover border border-slate-700" />
                            <div>
                              <div className="font-bold text-white flex items-center gap-1">
                                {u.name}
                                {u.verified && <VerificationBadge size={15} />}
                                {u.username && <span className="text-[10px] text-slate-400 font-mono">@{u.username}</span>}
                                {u.role === 'admin' && (
                                  <span className="px-1.5 py-0.2 bg-rose-500/20 text-rose-300 rounded text-[9px]">Admin</span>
                                )}
                              </div>
                              <span className="text-[10px] text-slate-400">{u.email}</span>
                            </div>
                          </td>

                          <td className="p-3">
                            <div className="flex flex-col space-y-1">
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold w-max ${
                                pStatus === 'approved'
                                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                  : pStatus === 'pending'
                                  ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                              }`}>
                                {pStatus === 'approved' && '✅ Approved'}
                                {pStatus === 'pending' && '⏳ Pending Review'}
                                {pStatus === 'rejected' && '❌ Rejected'}
                              </span>

                              <div className="flex items-center space-x-1 pt-0.5">
                                {pStatus !== 'approved' && (
                                  <button
                                    onClick={() => handleUpdatePhotoStatus(u.id, 'approved')}
                                    className="px-2 py-0.5 rounded bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold transition"
                                    title="Approve Photo"
                                  >
                                    Approve (অনুমোদন)
                                  </button>
                                )}
                                {pStatus !== 'rejected' && (
                                  <button
                                    onClick={() => {
                                      const reason = window.prompt('ফটো বাতিল করার কারণ লিখুন (Reason for rejection):', 'অপ্রাসঙ্গিক বা খারাপ ছবি দেওয়ার কারণে ফটো বাতিল করা হয়েছে।');
                                      if (reason !== null) {
                                        handleUpdatePhotoStatus(u.id, 'rejected', reason);
                                      }
                                    }}
                                    className="px-2 py-0.5 rounded bg-rose-600 hover:bg-rose-500 text-white text-[10px] font-bold transition"
                                    title="Reject Photo"
                                  >
                                    Reject (বাতিল)
                                  </button>
                                )}
                              </div>
                            </div>
                          </td>

                          <td className="p-3">
                            <button
                              onClick={() => handleToggleUserVerification(u.id, u.verified)}
                              className={`px-2.5 py-1 rounded-xl text-[11px] font-extrabold border transition cursor-pointer flex items-center gap-1.5 ${
                                u.verified
                                  ? 'bg-sky-500/20 text-sky-300 border-sky-500/40 hover:bg-sky-500/30'
                                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white hover:border-slate-600'
                              }`}
                              title={u.verified ? 'Click to remove Premium Badge' : 'Click to give Blue Verification Premium Badge'}
                            >
                              {u.verified ? (
                                <>
                                  <VerificationBadge size={14} />
                                  <span>Premium Active</span>
                                </>
                              ) : (
                                <>
                                  <span className="w-2 h-2 rounded-full bg-slate-500" />
                                  <span>Give Premium Badge</span>
                                </>
                              )}
                            </button>
                          </td>

                          <td className="p-3">
                            <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                              comp >= 100 ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}>
                              {comp}% {comp >= 100 ? 'Complete' : 'Incomplete'}
                            </span>
                          </td>

                          <td className="p-3">
                            {u.age} yrs • <span className="capitalize">{u.gender}</span>
                          </td>
                          <td className="p-3 text-slate-400">{u.location}</td>
                          <td className="p-3">
                            <span
                              className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                                u.status === 'active'
                                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                                  : u.status === 'suspended'
                                  ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30'
                                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                              }`}
                            >
                              {u.status}
                            </span>
                          </td>
                          <td className="p-3 text-right space-x-1">
                            <button
                              onClick={() => setInspectUser(u)}
                              className="px-2.5 py-1 rounded-lg bg-indigo-500/20 hover:bg-indigo-500/30 text-indigo-300 text-[11px] font-semibold border border-indigo-500/30"
                              title="Inspect Full Details"
                            >
                              Inspect
                            </button>
                            {u.status !== 'active' && (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, 'active')}
                                className="px-2.5 py-1 rounded-lg bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 text-[11px] font-semibold border border-emerald-500/30"
                              >
                                Activate
                              </button>
                            )}
                            {u.status !== 'suspended' && (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, 'suspended')}
                                className="px-2.5 py-1 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 text-[11px] font-semibold border border-amber-500/30"
                              >
                                Suspend
                              </button>
                            )}
                            {u.status !== 'banned' && (
                              <button
                                onClick={() => handleUpdateUserStatus(u.id, 'banned')}
                                className="px-2.5 py-1 rounded-lg bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 text-[11px] font-semibold border border-rose-500/30"
                              >
                                Ban
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteUser(u.id)}
                              className="p-1 rounded-lg bg-slate-800 hover:bg-rose-600 text-slate-400 hover:text-white"
                              title="Delete user"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

            </div>
          )}

          {/* TAB: MEMBER STORIES MODERATION */}
          {adminTab === 'stories' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider flex items-center gap-2">
                    <Camera className="w-4 h-4 text-pink-400" />
                    Member Stories & Photo Moderation (স্টোরি পোস্ট মডারেশন)
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ইউজারদের প্রকাশিত সমস্ত গল্প ও ছবি মোডারেট করুন বা আপত্তিকর পোস্ট ডিলিট করুন।
                  </p>
                </div>
                <button
                  onClick={fetchStories}
                  className="px-4 py-2 rounded-2xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-slate-200 transition flex items-center gap-2 border border-slate-700 cursor-pointer self-start sm:self-auto"
                >
                  <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                  রিফ্রেশ করুন ({stories.length})
                </button>
              </div>

              {stories.length === 0 ? (
                <div className="p-12 text-center bg-slate-950/50 rounded-2xl border border-slate-800 space-y-2">
                  <Camera className="w-10 h-10 text-slate-600 mx-auto" />
                  <p className="text-xs text-slate-400 font-medium">কোনো অ্যাক্টিভ ইউজার স্টোরি পোস্ট পাওয়া যায়নি।</p>
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {stories.map((story) => (
                    <div key={story.id} className="bg-slate-950 border border-slate-800 rounded-2xl overflow-hidden shadow-lg flex flex-col group hover:border-slate-700 transition">
                      {/* Story Media Header */}
                      <div className="relative aspect-[4/5] bg-slate-900 overflow-hidden">
                        {story.mediaType === 'video' ? (
                          <div className="w-full h-full relative flex items-center justify-center bg-slate-900">
                            <video src={story.imageUrl} className="w-full h-full object-cover" />
                            <div className="absolute inset-0 bg-slate-950/30 flex items-center justify-center">
                              <Play className="w-10 h-10 text-white fill-white drop-shadow-md" />
                            </div>
                          </div>
                        ) : (
                          <img
                            src={story.imageUrl}
                            alt=""
                            className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          />
                        )}

                        <div className="absolute top-2 left-2 right-2 flex items-center justify-between">
                          <div className="flex items-center gap-2 bg-slate-950/80 backdrop-blur-md p-1.5 rounded-full border border-slate-800">
                            <img src={story.userAvatar} alt="" className="w-6 h-6 rounded-full object-cover" />
                            <span className="text-[11px] font-bold text-white truncate max-w-[100px]">{story.userName}</span>
                          </div>
                          <button
                            onClick={() => handleDeleteStory(story.id)}
                            className="p-1.5 rounded-full bg-rose-600/90 hover:bg-rose-500 text-white shadow-lg cursor-pointer transition"
                            title="Delete Story Post"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Details & Caption */}
                      <div className="p-3.5 space-y-2 flex-1 flex flex-col justify-between">
                        <div>
                          {story.caption && (
                            <p className="text-xs text-slate-300 line-clamp-2 leading-relaxed">
                              {story.caption}
                            </p>
                          )}
                          {story.location && (
                            <p className="text-[10px] text-rose-400 mt-1 font-semibold">
                              📍 {story.location}
                            </p>
                          )}
                        </div>

                        <div className="pt-2 border-t border-slate-900 flex items-center justify-between text-[11px] text-slate-400 font-medium">
                          <span>❤️ {story.reactions?.length || 0} রিয়্যাকশন</span>
                          <span>💬 {story.comments?.length || 0} কমেন্ট</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* TAB 3: REPORT MANAGEMENT */}
          {adminTab === 'reports' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              
              <div className="flex justify-between items-center">
                <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">Member Safety Reports</h3>
                <select
                  value={reportFilter}
                  onChange={(e) => setReportFilter(e.target.value as any)}
                  className="bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                >
                  <option value="all">All Reports</option>
                  <option value="pending">Pending</option>
                  <option value="resolved">Resolved</option>
                  <option value="dismissed">Dismissed</option>
                </select>
              </div>

              {filteredReports.length > 0 ? (
                <div className="space-y-3">
                  {filteredReports.map((r) => (
                    <div key={r.id} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700/80 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <AlertTriangle className="w-4 h-4 text-amber-400" />
                          <span className="text-xs font-bold text-white">
                            Reporter: {r.reporterName} ➔ Reported: <span className="text-rose-400">{r.reportedUserName}</span>
                          </span>
                        </div>
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            r.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300'
                              : r.status === 'resolved'
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : 'bg-slate-700 text-slate-300'
                          }`}
                        >
                          {r.status}
                        </span>
                      </div>

                      <p className="text-xs text-slate-300 font-semibold">Reason: {r.reason}</p>
                      {r.details && <p className="text-xs text-slate-400 bg-slate-900/60 p-2.5 rounded-xl border border-slate-800">{r.details}</p>}

                      {r.status === 'pending' && (
                        <div className="flex justify-end space-x-2 pt-2 border-t border-slate-700/50">
                          <button
                            onClick={() => handleUpdateReportStatus(r.id, 'dismissed')}
                            className="px-3 py-1.5 rounded-xl bg-slate-700 hover:bg-slate-600 text-slate-200 text-xs font-semibold"
                          >
                            Dismiss Report
                          </button>
                          <button
                            onClick={() => handleUpdateReportStatus(r.id, 'resolved', false)}
                            className="px-3 py-1.5 rounded-xl bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-300 border border-emerald-500/30 text-xs font-semibold"
                          >
                            Mark Resolved
                          </button>
                          <button
                            onClick={() => handleUpdateReportStatus(r.id, 'resolved', true)}
                            className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow"
                          >
                            Ban Reported Member
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-xs text-slate-400 text-center py-8">No reports found.</p>
              )}

            </div>
          )}

          {/* TAB 4: MATCH MANAGEMENT */}
          {adminTab === 'matches' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
              <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">Active Platform Matches</h3>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {matches.map((m) => (
                  <div key={m.id} className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <img src={m.user1?.avatar} alt={m.user1?.name} className="w-10 h-10 rounded-full object-cover" />
                      <Heart className="w-4 h-4 text-rose-500 fill-rose-500" />
                      <img src={m.user2?.avatar} alt={m.user2?.name} className="w-10 h-10 rounded-full object-cover" />
                      <div>
                        <h4 className="text-xs font-bold text-white">{m.user1?.name} & {m.user2?.name}</h4>
                        <span className="text-[10px] text-slate-400">Matched on {new Date(m.createdAt).toLocaleDateString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* TAB 5: CHAT MONITORING & CONTROL SESSION */}
          {adminTab === 'chats' && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-6">
              <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-slate-800">
                <div>
                  <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider flex items-center gap-2">
                    <MessageSquare className="w-4 h-4 text-sky-400" />
                    <span>Real-time Chat Monitoring & Moderation (চ্যাট মনিটরিং ও কন্ট্রোল)</span>
                  </h3>
                  <p className="text-xs text-slate-400 mt-1">
                    ইউজারদের সকল ব্যক্তিগত বার্তা পর্যবেক্ষণ করুন, অনুপযুক্ত মেসেজ ডিলিট করুন এবং নির্দিষ্ট মেয়াদের জন্য চ্যাট স্থগিত করুন।
                  </p>
                </div>

                <button
                  onClick={fetchAdminChats}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-sky-300 border border-slate-700 text-xs font-bold flex items-center gap-1.5 transition-all"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Refresh Chats</span>
                </button>
              </div>

              {chatActionMsg && (
                <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-bold animate-fade-in flex items-center gap-2">
                  <CheckCircle className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>{chatActionMsg}</span>
                </div>
              )}

              <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                {/* Left Column: Chat Conversation List */}
                <div className="lg:col-span-5 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 space-y-3">
                  <div className="relative">
                    <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
                    <input
                      type="text"
                      placeholder="ইউজারের নাম দিয়ে চ্যাট খুঁজুন..."
                      value={chatSearch}
                      onChange={(e) => setChatSearch(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs text-white focus:outline-none focus:border-sky-500"
                    />
                  </div>

                  <div className="space-y-2 max-h-[500px] overflow-y-auto pr-1">
                    {adminChats
                      .filter((c) => {
                        const name1 = c.user1?.name || '';
                        const name2 = c.user2?.name || '';
                        return (
                          name1.toLowerCase().includes(chatSearch.toLowerCase()) ||
                          name2.toLowerCase().includes(chatSearch.toLowerCase())
                        );
                      })
                      .map((c) => {
                        const isRestricted = c.chatRestrictedUntil && new Date(c.chatRestrictedUntil).getTime() > Date.now();
                        const isSelected = selectedAdminChat?.id === c.id;

                        return (
                          <div
                            key={c.id}
                            onClick={() => {
                              setSelectedAdminChat(c);
                              fetchAdminChatMessages(c.id);
                            }}
                            className={`p-3 rounded-xl border transition-all cursor-pointer space-y-2 ${
                              isSelected
                                ? 'bg-sky-500/15 border-sky-500/50 shadow-md'
                                : 'bg-slate-900/80 border-slate-800 hover:border-slate-700'
                            }`}
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-2 truncate">
                                <img
                                  src={c.user1?.avatar}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                                />
                                <span className="text-[10px] text-rose-400 font-bold">↔</span>
                                <img
                                  src={c.user2?.avatar}
                                  alt=""
                                  className="w-7 h-7 rounded-full object-cover border border-slate-700"
                                />
                                <span className="text-xs font-bold text-white truncate">
                                  {c.user1?.name} & {c.user2?.name}
                                </span>
                              </div>

                              <span className="px-1.5 py-0.5 rounded text-[9px] font-extrabold bg-slate-800 text-slate-300">
                                {c.messageCount} msgs
                              </span>
                            </div>

                            <p className="text-[11px] text-slate-400 truncate pl-1">
                              {c.lastMessage}
                            </p>

                            {isRestricted && (
                              <span className="inline-block px-2 py-0.5 rounded text-[9px] font-extrabold bg-rose-500/20 text-rose-300 border border-rose-500/30">
                                ⚠️ চ্যাট বন্ধ আছে
                              </span>
                            )}
                          </div>
                        );
                      })}

                    {adminChats.length === 0 && (
                      <p className="text-xs text-slate-500 text-center py-8">কোন চ্যাট পাওয়া যায়নি</p>
                    )}
                  </div>
                </div>

                {/* Right Column: Selected Chat Messages & Moderation */}
                <div className="lg:col-span-7 bg-slate-950/60 border border-slate-800 rounded-2xl p-4 flex flex-col justify-between min-h-[500px]">
                  {selectedAdminChat ? (
                    <div className="space-y-4 flex-1 flex flex-col justify-between">
                      {/* Selected Chat Top Header */}
                      <div className="pb-3 border-b border-slate-800 space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2">
                          <div className="flex items-center space-x-3">
                            <div className="flex items-center -space-x-2">
                              <img
                                src={selectedAdminChat.user1?.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border-2 border-slate-800"
                              />
                              <img
                                src={selectedAdminChat.user2?.avatar}
                                alt=""
                                className="w-8 h-8 rounded-full object-cover border-2 border-slate-800"
                              />
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-white">
                                {selectedAdminChat.user1?.name} ↔ {selectedAdminChat.user2?.name}
                              </h4>
                              <span className="text-[10px] text-slate-400 block">
                                Chat ID: #{selectedAdminChat.id}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center space-x-2">
                            {selectedAdminChat.user1 && (
                              <button
                                onClick={() => setInspectUser(selectedAdminChat.user1)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700"
                              >
                                View {selectedAdminChat.user1.name}
                              </button>
                            )}
                            {selectedAdminChat.user2 && (
                              <button
                                onClick={() => setInspectUser(selectedAdminChat.user2)}
                                className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[10px] font-bold border border-slate-700"
                              >
                                View {selectedAdminChat.user2.name}
                              </button>
                            )}
                          </div>
                        </div>

                        {/* Admin Chat Restriction Control Form */}
                        <div className="p-3 bg-slate-900 border border-slate-800 rounded-xl space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                              <Ban className="w-3.5 h-3.5 text-rose-400" />
                              চ্যাট কাস্টম মেয়াদে স্থগিত করুন (Chat Restriction)
                            </span>
                            {selectedAdminChat.chatRestrictedUntil && new Date(selectedAdminChat.chatRestrictedUntil).getTime() > Date.now() ? (
                              <button
                                onClick={() => handleRestrictAdminChat(selectedAdminChat.id, 0)}
                                className="px-2.5 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[10px] font-bold shadow"
                              >
                                ✓ Lift Restriction (চ্যাট চালু করুন)
                              </button>
                            ) : null}
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                            <select
                              value={chatRestrictDays}
                              onChange={(e) => setChatRestrictDays(Number(e.target.value))}
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-xs text-white"
                            >
                              <option value={3}>3 Days Ban (৩ দিন)</option>
                              <option value={7}>7 Days Ban (৭ দিন)</option>
                              <option value={15}>15 Days Ban (১৫ দিন)</option>
                              <option value={30}>30 Days Ban (৩০ দিন)</option>
                              <option value={3650}>Permanent Ban (স্থায়ী বন্ধ)</option>
                            </select>

                            <input
                              type="text"
                              value={chatRestrictReason}
                              onChange={(e) => setChatRestrictReason(e.target.value)}
                              placeholder="স্থগিতের কারণ লিখুন..."
                              className="bg-slate-800 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-white sm:col-span-2"
                            />
                          </div>

                          <button
                            onClick={() => handleRestrictAdminChat(selectedAdminChat.id, chatRestrictDays)}
                            className="w-full py-1.5 rounded-lg bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold transition shadow"
                          >
                            Apply Restriction ({chatRestrictDays === 3650 ? 'Permanent' : `${chatRestrictDays} Days`} Ban)
                          </button>
                        </div>
                      </div>

                      {/* Chat Messages List with Delete Button */}
                      <div className="space-y-3 max-h-[350px] overflow-y-auto pr-1 flex-1 py-2">
                        {selectedChatMessages.map((msg) => {
                          const sender = msg.senderId === selectedAdminChat.user1Id ? selectedAdminChat.user1 : selectedAdminChat.user2;

                          return (
                            <div key={msg.id} className="p-3 bg-slate-900/90 border border-slate-800 rounded-xl space-y-1.5 hover:border-slate-700 transition">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center space-x-2">
                                  <img src={sender?.avatar} alt="" className="w-5 h-5 rounded-full object-cover" />
                                  <span className="text-xs font-bold text-white">{sender?.name || 'Member'}</span>
                                  <span className="text-[10px] text-slate-500 font-mono">
                                    {new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                  </span>
                                </div>

                                <button
                                  onClick={() => handleDeleteAdminMessage(msg.id)}
                                  className="px-2 py-0.5 rounded bg-rose-500/20 hover:bg-rose-500 text-rose-300 hover:text-white text-[10px] font-bold transition border border-rose-500/30 flex items-center gap-1"
                                >
                                  <Trash2 className="w-3 h-3" />
                                  <span>Delete</span>
                                </button>
                              </div>

                              <p className="text-xs text-slate-200 pl-7">{msg.content}</p>
                              {msg.imageUrl && (
                                <img src={msg.imageUrl} alt="" className="w-28 h-28 rounded-lg object-cover ml-7 border border-slate-800" />
                              )}
                            </div>
                          );
                        })}

                        {selectedChatMessages.length === 0 && (
                          <p className="text-xs text-slate-500 text-center py-12">
                            এই চ্যাটে কোন মেসেজ নেই।
                          </p>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-center py-20 text-slate-500 space-y-2">
                      <MessageSquare className="w-10 h-10 opacity-30 text-sky-400" />
                      <p className="text-xs font-semibold">
                        বাম পাশের তালিকা থেকে যেকোনো ইউজার চ্যাট নির্বাচন করুন।
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 5: BROADCAST & INDIVIDUAL NOTIFICATIONS */}
          {adminTab === 'notifications' && (
            <div className="space-y-6 max-w-2xl">
              <form onSubmit={handleSendBroadcast} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
                <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
                  <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-purple-500 to-rose-500 text-white flex items-center justify-center shadow-md">
                    <Bell className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider">
                      Send Official Admin Notification / অফিশিয়াল নোটিফিকেশন পাঠাও
                    </h3>
                    <p className="text-xs text-slate-400">
                      Send update notifications with custom official logo to all users or a specific targeted member.
                    </p>
                  </div>
                </div>

                {broadcastSuccess && (
                  <div className="p-3.5 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-2xl text-xs font-semibold flex items-center gap-2 animate-fade-in">
                    <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
                    <span>{broadcastSuccess}</span>
                  </div>
                )}

                {/* 1. Target Audience Selection */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Recipient Audience (প্রাপক নির্বাচন করুন)
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setNotifTargetType('all')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        notifTargetType === 'all'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>All Members / সকল ইউজার (Broadcast)</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setNotifTargetType('individual')}
                      className={`p-3 rounded-2xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                        notifTargetType === 'individual'
                          ? 'bg-rose-500/20 text-rose-300 border-rose-500/50 shadow-md'
                          : 'bg-slate-800/80 text-slate-400 border-slate-700 hover:bg-slate-700'
                      }`}
                    >
                      <Users className="w-4 h-4" />
                      <span>Specific Member / নির্দিষ্ট একজন ইউজার</span>
                    </button>
                  </div>
                </div>

                {/* Individual User Selector (if individual selected) */}
                {notifTargetType === 'individual' && (
                  <div className="p-3.5 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-2 animate-fade-in">
                    <label className="block text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Search className="w-3.5 h-3.5 text-amber-400" />
                      Select Target Member (ইউজার নির্বাচন করুন)
                    </label>
                    <select
                      value={notifTargetUserId}
                      onChange={(e) => setNotifTargetUserId(e.target.value)}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-medium"
                    >
                      <option value="">-- Choose User from List ({users.length} registered) --</option>
                      {users.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name} ({u.gender}, {u.age} yrs) - Phone: {u.phone || 'N/A'} - ID: #{u.userIdNumber || u.id}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                {/* 2. Official Logo Upload & Preview */}
                <div className="p-4 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-3">
                  <div className="flex items-center justify-between">
                    <div>
                      <label className="block text-xs font-bold text-slate-200">
                        Official Logo (গ্যালারি থেকে লোগো সেট করুন)
                      </label>
                      <p className="text-[11px] text-slate-400">
                        Upload or select an official emblem shown on notification chats
                      </p>
                    </div>

                    <div className="flex items-center space-x-3">
                      <img
                        src={notifOfficialLogo}
                        alt="Official Logo Preview"
                        className="w-10 h-10 rounded-full object-cover border-2 border-rose-500 shadow-md"
                      />
                    </div>
                  </div>

                  <div className="flex items-center space-x-3">
                    <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-rose-300 cursor-pointer transition-colors flex items-center gap-1.5">
                      <Sparkles className="w-3.5 h-3.5 text-rose-400" />
                      <span>Upload Official Logo from Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleLogoFileUpload}
                        className="hidden"
                      />
                    </label>

                    <button
                      type="button"
                      onClick={() => setNotifOfficialLogo("data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23ec4899' stroke='%23ffffff' stroke-width='1.5'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>")}
                      className="px-3 py-2 rounded-xl bg-slate-800/60 hover:bg-slate-800 text-slate-400 hover:text-slate-200 text-xs"
                    >
                      Reset Default Logo
                    </button>
                  </div>
                </div>

                {/* 3. Official Sender Name & Verification Badge Toggle */}
                <div className="space-y-2">
                  <label className="block text-xs font-bold text-slate-300">
                    Official Sender Name (অফিশিয়াল প্রেরকের নাম)
                  </label>
                  <input
                    type="text"
                    required
                    value={notifOfficialTitle}
                    onChange={(e) => setNotifOfficialTitle(e.target.value)}
                    placeholder="e.g. True Love Connect Official (অফিশিয়াল সাপোর্ট)"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-semibold"
                  />

                  <div className="flex items-center space-x-2 pt-1">
                    <input
                      type="checkbox"
                      id="officialVerifiedCheck"
                      checked={notifOfficialVerified}
                      onChange={(e) => setNotifOfficialVerified(e.target.checked)}
                      className="w-4 h-4 rounded border-slate-700 bg-slate-800 text-rose-500 focus:ring-rose-500 cursor-pointer"
                    />
                    <label htmlFor="officialVerifiedCheck" className="text-xs font-bold text-sky-300 flex items-center gap-1 cursor-pointer">
                      <VerificationBadge size={16} />
                      <span>Include Blue Verification Badge on Notice (ব্লু ভেরিফায়েড ব্যাজ যুক্ত করুন)</span>
                    </label>
                  </div>
                </div>

                {/* 4. Notification Image Attachment */}
                <div className="p-3.5 bg-slate-800/40 border border-slate-700/60 rounded-2xl space-y-2">
                  <label className="block text-xs font-bold text-slate-200">
                    Notification Image Attachment / ফটো সংযুক্ত করুন (Optional)
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="text"
                      value={notifImageUrl}
                      onChange={(e) => setNotifImageUrl(e.target.value)}
                      placeholder="ছবির লিংক দিন অথবা গ্যালারি থেকে আপলোড করুন..."
                      className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
                    />
                    <label className="px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 border border-slate-700 text-xs font-bold text-rose-300 cursor-pointer flex items-center gap-1 shrink-0">
                      <UploadCloud className="w-3.5 h-3.5" />
                      <span>Gallery</span>
                      <input
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={(e) => {
                          const file = e.target.files?.[0];
                          if (file) {
                            const reader = new FileReader();
                            reader.onloadend = () => {
                              if (reader.result) setNotifImageUrl(reader.result as string);
                            };
                            reader.readAsDataURL(file);
                          }
                        }}
                      />
                    </label>
                  </div>
                  {notifImageUrl && (
                    <div className="relative w-24 h-24 rounded-xl overflow-hidden border border-rose-500/40">
                      <img src={notifImageUrl} alt="" className="w-full h-full object-cover" />
                      <button
                        type="button"
                        onClick={() => setNotifImageUrl('')}
                        className="absolute top-1 right-1 bg-black/80 text-white rounded-full p-1 text-[10px]"
                      >
                        ✕
                      </button>
                    </div>
                  )}
                </div>

                {/* 4. Notification Title */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Notification Subject / Title (নোটিফিকেশন সাবজেক্ট)
                  </label>
                  <input
                    type="text"
                    required
                    value={broadcastTitle}
                    onChange={(e) => setBroadcastTitle(e.target.value)}
                    placeholder="e.g. 📢 নতুন আপডেট: চ্যাটে ফুল স্ক্রিন ফিচার যুক্ত করা হয়েছে!"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                {/* 5. Notification Body Message */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
                    Notification Message Text (বিস্তারিত মেসেজ)
                  </label>
                  <textarea
                    rows={4}
                    required
                    value={broadcastMessage}
                    onChange={(e) => setBroadcastMessage(e.target.value)}
                    placeholder="এখানে আপনার মেসেজটি লিখুন..."
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 text-white text-xs font-bold shadow-lg shadow-pink-500/25 flex items-center justify-center gap-2 transition-all"
                >
                  <Send className="w-4 h-4" /> Send Notification to {notifTargetType === 'all' ? 'All Members (সবাইকে)' : 'Targeted Member'}
                </button>
              </form>
            </div>
          )}

          {/* TAB 6: CONTENT & SETTINGS MANAGEMENT */}
          {adminTab === 'settings' && (
            <form onSubmit={handleSaveSettings} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4 max-w-xl">
              <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">System Settings</h3>

              {settingsSuccess && (
                <div className="p-3 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded-xl text-xs font-medium">
                  {settingsSuccess}
                </div>
              )}

              {/* Site Branding Name & Logo Section */}
              <div className="p-4 bg-slate-800/60 border border-slate-700/80 rounded-2xl space-y-3">
                <h4 className="text-xs font-bold uppercase text-rose-400 tracking-wider">
                  Site Branding & Identity / ওয়েবসাইটের নাম ও লোগো পরিবর্তন
                </h4>
                <p className="text-[11px] text-slate-400">
                  Change the top navigation brand name and site logo shown across the entire platform.
                </p>

                <div className="space-y-1.5">
                  <label className="block text-xs font-semibold text-slate-300">Brand Name / প্ল্যাটফর্মের নাম</label>
                  <input
                    type="text"
                    value={appName}
                    onChange={(e) => setAppName(e.target.value)}
                    placeholder="e.g. True Love Connect"
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500 font-bold"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-xs font-semibold text-slate-300">Site Logo (Gallery Upload or Image Link)</label>
                  <div className="flex items-center space-x-3">
                    {siteLogoUrl ? (
                      <img src={siteLogoUrl} alt="Logo" className="w-12 h-12 rounded-2xl object-cover border-2 border-rose-500 shadow-md flex-shrink-0" />
                    ) : (
                      <div className="w-12 h-12 rounded-2xl bg-rose-500/20 border border-rose-500/40 flex items-center justify-center text-rose-400 flex-shrink-0 font-bold text-xs">
                        Logo
                      </div>
                    )}
                    <div className="flex-1 space-y-1.5">
                      <input
                        type="text"
                        value={siteLogoUrl}
                        onChange={(e) => setSiteLogoUrl(e.target.value)}
                        placeholder="Paste image URL or upload from gallery below..."
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none"
                      />
                      <label className="inline-flex items-center space-x-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-xl text-xs font-semibold text-rose-300 cursor-pointer transition-colors">
                        <UploadCloud className="w-3.5 h-3.5 text-rose-400" />
                        <span>Upload Logo from Gallery</span>
                        <input
                          type="file"
                          accept="image/*"
                          onChange={(e) => {
                            const file = e.target.files?.[0];
                            if (file) {
                              const reader = new FileReader();
                              reader.onloadend = () => {
                                if (reader.result) setSiteLogoUrl(reader.result as string);
                              };
                              reader.readAsDataURL(file);
                            }
                          }}
                          className="hidden"
                        />
                      </label>
                    </div>
                  </div>
                </div>
              </div>

              {/* Maintenance Mode & Website Notice Control */}
              <div className="p-4 bg-amber-500/10 border border-amber-500/30 rounded-2xl space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-extrabold uppercase text-amber-400 tracking-wider flex items-center gap-2">
                      <RefreshCw className="w-4 h-4 animate-spin-slow" />
                      Website Maintenance Mode / আপডেট মোড কন্ট্রোল
                    </h4>
                    <p className="text-[11px] text-slate-300 mt-0.5">
                      ওয়েবসাইট আপডেট করার সময় ইউজার প্যানেল সাময়িকভাবে বন্ধ রেখে মেইনটেন্যান্স পেজ দেখান।
                    </p>
                  </div>

                  <label className="relative inline-flex items-center cursor-pointer">
                    <input
                      type="checkbox"
                      checked={maintenanceMode}
                      onChange={(e) => setMaintenanceMode(e.target.checked)}
                      className="sr-only peer"
                    />
                    <div className="w-11 h-6 bg-slate-800 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-amber-500"></div>
                  </label>
                </div>

                <div className="space-y-1.5 pt-1">
                  <label className="block text-xs font-semibold text-slate-300">Maintenance Notice Message (ইউজারদের উদ্দেশ্যে নোটিশ)</label>
                  <textarea
                    rows={3}
                    value={maintenanceMessage}
                    onChange={(e) => setMaintenanceMessage(e.target.value)}
                    placeholder="আমাদের ওয়েবসাইটটি বর্তমানে সার্ভার আপডেট করা হচ্ছে। কিছুক্ষণের মধ্যে আবার চেষ্টা করুন..."
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-amber-500 leading-relaxed font-sans"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1">Platform App SEO Title</label>
                <input
                  type="text"
                  value={appTitle}
                  onChange={(e) => setAppTitle(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Min Age Limit</label>
                  <input
                    type="number"
                    value={minAge}
                    onChange={(e) => setMinAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Max Age Limit</label>
                  <input
                    type="number"
                    value={maxAge}
                    onChange={(e) => setMaxAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1">Default Radius (km)</label>
                  <input
                    type="number"
                    value={defaultRadius}
                    onChange={(e) => setDefaultRadius(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow"
              >
                Save System Parameters
              </button>
            </form>
          )}

        </>
      )}

      {/* Inspect User Full Details Modal */}
      {inspectUser && (
        <div className="fixed inset-0 z-50 bg-slate-950/85 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 max-h-[90vh] overflow-y-auto">
            
            {/* Header with User Info */}
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <img src={inspectUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-rose-500 shadow-md" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {inspectUser.name}
                    {inspectUser.verified && <VerificationBadge size={18} />}
                    {inspectUser.username && <span className="text-xs text-slate-400 font-mono">@{inspectUser.username}</span>}
                  </h3>
                  <div className="flex items-center gap-2 text-xs text-slate-400">
                    <span>ID: #{inspectUser.userIdNumber || inspectUser.id}</span>
                    <span>•</span>
                    <span className="text-emerald-400 font-bold">{inspectUser.gender === 'female' ? 'কনে (Bride)' : 'বর (Groom)'}</span>
                    <span>•</span>
                    <span className="text-amber-300 font-bold">{inspectUser.profileCompletionPercentage || 80}% Complete</span>
                  </div>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white transition"
              >
                <XCircle size={22} />
              </button>
            </div>

            {/* Structured Sub-Session Tabs Bar */}
            <div className="flex space-x-2 overflow-x-auto pb-1 border-b border-slate-800">
              <button
                onClick={() => setInspectTab('basic')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'basic'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                👤 ১. মৌলিক ও পরিচিতি (Basic Details)
              </button>

              <button
                onClick={() => setInspectTab('lifestyle')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'lifestyle'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                💼 ২. শিক্ষা, পেশা ও পরিবার (Education & Family)
              </button>

              <button
                onClick={() => setInspectTab('photos')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'photos'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                🖼️ ৩. গ্যালারি ও ভেরিফিকেশন (Photos & Badges)
              </button>

              <button
                onClick={() => setInspectTab('activity')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'activity'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                📊 ৪. একাউন্ট স্ট্যাটাস ও হিস্ট্রি (Status & Activity)
              </button>

              <button
                onClick={() => setInspectTab('notice')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'notice'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ⚙️ ৫. এডমিন কন্ট্রোল ও নোটিশ (Notice & Actions)
              </button>

              <button
                onClick={() => setInspectTab('edit')}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all whitespace-nowrap ${
                  inspectTab === 'edit'
                    ? 'bg-rose-500 text-white shadow-md'
                    : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                }`}
              >
                ✏️ ৬. তথ্য এডিট ও কাস্টমাইজ (Edit Profile)
              </button>
            </div>

            {/* SUB-SESSION 1: BASIC DETAILS & BIO */}
            {inspectTab === 'basic' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Full Name</span>
                    <span className="text-white font-bold">{inspectUser.name}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Email Address</span>
                    <span className="text-white font-mono">{inspectUser.email}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Phone Number</span>
                    <span className="text-amber-300 font-mono font-bold">{inspectUser.phone || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Date of Birth & Age</span>
                    <span className="text-white">{inspectUser.dateOfBirth || 'N/A'} ({inspectUser.age} yrs)</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Gender & Looking For</span>
                    <span className="text-white capitalize">{inspectUser.gender} ➔ {inspectUser.lookingFor}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Location / Division</span>
                    <span className="text-white">{inspectUser.location || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Full Private Address (সম্পূর্ণ ঠিকানা)</span>
                  <p className="text-slate-200 font-mono">{inspectUser.fullAddress || inspectUser.location || 'N/A'}</p>
                </div>

                <div>
                  <span className="text-xs font-bold uppercase text-slate-400 block mb-1">User Bio / বায়ো বিবরণ</span>
                  <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50 leading-relaxed">
                    {inspectUser.bio || 'No bio provided.'}
                  </p>
                </div>
              </div>
            )}

            {/* SUB-SESSION 2: EDUCATION, PROFESSION & FAMILY */}
            {inspectTab === 'lifestyle' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Education Level</span>
                    <span className="text-white font-bold">{inspectUser.education || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">School / University</span>
                    <span className="text-white">{inspectUser.university || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Profession / Career</span>
                    <span className="text-white font-bold text-sky-300">{inspectUser.profession || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Marital Status</span>
                    <span className="text-white">{inspectUser.maritalStatus || 'Single'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Religion</span>
                    <span className="text-white">{inspectUser.religion || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Height</span>
                    <span className="text-white">{inspectUser.height || 'N/A'}</span>
                  </div>
                </div>

                <div className="p-3 bg-slate-800/40 rounded-xl border border-slate-700/50 text-xs space-y-1">
                  <span className="text-[10px] font-bold uppercase text-slate-400">Family Background & Details</span>
                  <p className="text-slate-300">{inspectUser.familyDetails || 'No detailed family background submitted.'}</p>
                </div>
              </div>
            )}

            {/* SUB-SESSION 3: PHOTOS GALLERY & VERIFICATION BADGES */}
            {inspectTab === 'photos' && (
              <div className="space-y-4 animate-fade-in">
                {/* Photo Moderation Action Box */}
                <div className="p-4 bg-slate-800/90 rounded-2xl border border-slate-700 space-y-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <span className="text-xs font-bold text-white flex items-center gap-2">
                        🖼️ Photo Moderation Status
                        <span className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                          (inspectUser.photoStatus || 'approved') === 'approved'
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : inspectUser.photoStatus === 'pending'
                            ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        }`}>
                          {(inspectUser.photoStatus || 'approved') === 'approved' && '✅ Photo Approved (অনুমোদিত)'}
                          {inspectUser.photoStatus === 'pending' && '⏳ Pending Review (যাচাইয়ের অপেক্ষায়)'}
                          {inspectUser.photoStatus === 'rejected' && '❌ Photo Rejected (বাতিল)'}
                        </span>
                      </span>
                      {inspectUser.rejectionReason && (
                        <p className="text-[11px] text-rose-300 mt-1 font-medium bg-rose-500/10 p-2 rounded-lg border border-rose-500/20">
                          বাতিলের কারণ: {inspectUser.rejectionReason}
                        </p>
                      )}
                    </div>

                    <div className="flex items-center space-x-2">
                      <button
                        onClick={() => handleUpdatePhotoStatus(inspectUser.id, 'approved')}
                        className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow transition"
                      >
                        ✓ Approve Photo (অনুমোদন)
                      </button>
                      <button
                        onClick={() => {
                          const reason = window.prompt('ফটো বাতিল করার কারণ লিখুন:', 'অপ্রাসঙ্গিক বা অনুপযুক্ত ফটো হওয়ার কারণে বাতিল করা হলো।');
                          if (reason !== null) {
                            handleUpdatePhotoStatus(inspectUser.id, 'rejected', reason);
                          }
                        }}
                        className="px-3 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow transition"
                      >
                        ✕ Reject Photo (বাতিল)
                      </button>
                    </div>
                  </div>

                  {/* Photo Gallery Grid */}
                  <div className="grid grid-cols-4 sm:grid-cols-6 gap-2 pt-1">
                    {(inspectUser.photos && inspectUser.photos.length > 0 ? inspectUser.photos : [inspectUser.avatar]).map((pUrl, idx) => (
                      <a
                        key={idx}
                        href={pUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="relative group rounded-xl overflow-hidden border border-slate-700 bg-slate-950 aspect-square block"
                      >
                        <img src={pUrl} alt="" className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        <span className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-[10px] text-white font-bold">
                          View Full
                        </span>
                      </a>
                    ))}
                  </div>
                </div>

                {/* Premium Blue Badge Action Box */}
                <div className="flex flex-wrap items-center justify-between p-3.5 bg-slate-800/80 rounded-2xl border border-slate-700/80 gap-3">
                  <div className="flex items-center space-x-3">
                    <VerificationBadge size={22} className="shrink-0" />
                    <div>
                      <span className="text-xs font-bold text-white block">
                        Blue Verification Premium Badge (ব্লু ভেরিফাইড প্রিমিয়াম ব্যাজ)
                      </span>
                      <span className="text-[11px] text-slate-300">
                        {inspectUser.verified
                          ? '✓ Premium Badge Active — Blue checkmark shown next to user name across app'
                          : '✗ No Premium Badge — User has standard profile without blue tick'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => handleToggleUserVerification(inspectUser.id, inspectUser.verified)}
                    className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow ${
                      inspectUser.verified
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/40 hover:bg-rose-500/30'
                        : 'bg-sky-500 hover:bg-sky-400 text-white border border-sky-400'
                    }`}
                  >
                    {inspectUser.verified ? (
                      <span>Remove Premium Badge (ব্যাজ সরান)</span>
                    ) : (
                      <>
                        <VerificationBadge size={14} />
                        <span>Give Premium Badge (ব্যাজ দিন)</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* SUB-SESSION 4: ACCOUNT STATUS & ACTIVITY */}
            {inspectTab === 'activity' && (
              <div className="space-y-4 animate-fade-in">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Account Status</span>
                    <span className={`font-bold uppercase ${inspectUser.status === 'active' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {inspectUser.status}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">Profile Completion</span>
                    <span className="text-emerald-300 font-bold">{inspectUser.profileCompletionPercentage || 80}%</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-slate-400 block uppercase font-bold">User Role</span>
                    <span className="text-white uppercase font-mono">{inspectUser.role || 'user'}</span>
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SESSION 5: ADMIN NOTICE & RESTRICTION CONTROLS */}
            {inspectTab === 'notice' && (
              <div className="space-y-4 animate-fade-in">
                <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Bell className="w-4 h-4 text-rose-400" />
                    <span>Send Official Notice Directly to {inspectUser.name}</span>
                  </h4>
                  <p className="text-[11px] text-slate-400">
                    এই ইউজারকে সরাসরি একটি সতর্কবার্তা বা নোটিফিকেশন পাঠাতে ব্রডকাস্টিং ট্যাবে গিয়ে Individual Select করুন।
                  </p>
                  <button
                    onClick={() => {
                      setNotifTargetType('individual');
                      setNotifTargetUserId(inspectUser.id);
                      setAdminTab('notifications');
                      setInspectUser(null);
                    }}
                    className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow"
                  >
                    Open Broadcast Form for {inspectUser.name}
                  </button>
                </div>

                <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
                  <span className="text-xs text-slate-400">Status: <strong className="text-emerald-400 uppercase">{inspectUser.status}</strong></span>
                  <div className="space-x-2">
                    {inspectUser.status === 'active' ? (
                      <button
                        onClick={() => {
                          handleUpdateUserStatus(inspectUser.id, 'banned');
                          setInspectUser(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow"
                      >
                        Ban User Account (একাউন্ট ব্লক করুন)
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          handleUpdateUserStatus(inspectUser.id, 'active');
                          setInspectUser(null);
                        }}
                        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold shadow"
                      >
                        Unban Account (একাউন্ট সচল করুন)
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* SUB-SESSION 6: EDIT USER PROFILE FORM */}
            {inspectTab === 'edit' && (
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  const form = e.target as HTMLFormElement;
                  const formData = new FormData(form);
                  const name = formData.get('name') as string;
                  const phone = formData.get('phone') as string;
                  const email = formData.get('email') as string;
                  const age = Number(formData.get('age'));
                  const gender = formData.get('gender') as 'male' | 'female';
                  const location = formData.get('location') as string;
                  const bio = formData.get('bio') as string;
                  const verified = formData.get('verified') === 'true';
                  const status = formData.get('status') as UserStatus;
                  const photoStatus = formData.get('photoStatus') as 'approved' | 'pending' | 'rejected';
                  const role = formData.get('role') as 'user' | 'admin';

                  handleUpdateUserFullDetails(inspectUser.id, {
                    name,
                    phone,
                    email,
                    age,
                    gender,
                    location,
                    bio,
                    verified,
                    status,
                    photoStatus,
                    role,
                  });
                }}
                className="space-y-4 animate-fade-in bg-slate-800/40 p-4 rounded-2xl border border-slate-700/60"
              >
                <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                    <Edit className="w-4 h-4 text-rose-400" />
                    <span>ইউজার প্রোফাইলের সমস্ত তথ্য সরাসরি সংশোধন ও কাস্টমাইজ করুন</span>
                  </h4>
                  <button
                    type="button"
                    onClick={() => handleDeleteUserPhoto(inspectUser.id)}
                    className="px-3 py-1 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-[11px] font-bold flex items-center gap-1.5 cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                    ছবি ডিলিট করুন (Delete Photo)
                  </button>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">পূর্ণ নাম (Full Name)</label>
                    <input
                      type="text"
                      name="name"
                      defaultValue={inspectUser.name}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-bold focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">ফোন নম্বর (Phone)</label>
                    <input
                      type="text"
                      name="phone"
                      defaultValue={inspectUser.phone || ''}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white font-mono focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">ইমেইল এড্রেস (Email)</label>
                    <input
                      type="email"
                      name="email"
                      defaultValue={inspectUser.email || ''}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">বয়স (Age)</label>
                    <input
                      type="number"
                      name="age"
                      defaultValue={inspectUser.age}
                      required
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">লিঙ্গ (Gender)</label>
                    <select
                      name="gender"
                      defaultValue={inspectUser.gender}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="male">বর (Male / Groom)</option>
                      <option value="female">কনে (Female / Bride)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">জেলা / লোকেশন (District)</label>
                    <input
                      type="text"
                      name="location"
                      defaultValue={inspectUser.location}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">ব্লু ভেরিফাইড ব্যাজ (Verification Badge)</label>
                    <select
                      name="verified"
                      defaultValue={inspectUser.verified ? 'true' : 'false'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="true">✅ ভেরিফাইড (Verified Blue Badge Active)</option>
                      <option value="false">❌ আনভেরিফাইড (No Badge)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">একাউন্ট স্ট্যাটাস (Account Status)</label>
                    <select
                      name="status"
                      defaultValue={inspectUser.status}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="active">Active (সচল)</option>
                      <option value="suspended">Suspended (সাময়িক স্থগিত)</option>
                      <option value="banned">Banned (স্থায়ী ব্লক)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">ছবি অ্যাপ্রুভাল স্ট্যাটাস (Photo Status)</label>
                    <select
                      name="photoStatus"
                      defaultValue={inspectUser.photoStatus || 'approved'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="approved font-bold">Approved (অনুমোদিত)</option>
                      <option value="pending">Pending Review (অপেক্ষমান)</option>
                      <option value="rejected">Rejected (বাতিলকৃত)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-slate-300 mb-1">ইউজার রোল (User Role)</label>
                    <select
                      name="role"
                      defaultValue={inspectUser.role || 'user'}
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-white focus:outline-none focus:border-rose-500 font-bold"
                    >
                      <option value="user">Standard User</option>
                      <option value="admin">Administrator (এডমিন)</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-slate-300 mb-1">বায়ো / নিজের সম্পর্কে (Bio)</label>
                  <textarea
                    name="bio"
                    rows={3}
                    defaultValue={inspectUser.bio}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none focus:border-rose-500 leading-relaxed"
                  />
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <button
                    type="submit"
                    className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg flex items-center gap-2 cursor-pointer transition"
                  >
                    <Save className="w-4 h-4" /> সেভ ও আপডেট করুন (Save Changes)
                  </button>
                </div>
              </form>
            )}

            {/* Modal Footer */}
            <div className="pt-3 border-t border-slate-800 flex justify-end">
              <button
                onClick={() => setInspectUser(null)}
                className="px-4 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold hover:bg-slate-700"
              >
                Close Details
              </button>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
