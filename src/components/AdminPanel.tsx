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
  UploadCloud
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
  PaymentConfig
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
  const [adminTab, setAdminTab] = useState<'dashboard' | 'unlocks' | 'banners' | 'users' | 'reports' | 'matches' | 'notifications' | 'settings'>('dashboard');
  
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<User[]>([]);
  const [reports, setReports] = useState<Report[]>([]);
  const [matches, setMatches] = useState<Match[]>([]);
  const [settings, setSettings] = useState<SystemSettings | null>(null);

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
  const [bkashInput, setBkashInput] = useState(DEFAULT_PAYMENT_CONFIG.bkashNumber);
  const [nagadInput, setNagadInput] = useState(DEFAULT_PAYMENT_CONFIG.nagadNumber);
  const [feeInput, setFeeInput] = useState(DEFAULT_PAYMENT_CONFIG.unlockFeeBdt);
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
    };
    await updatePaymentConfigInFirestore(newConfig);
    setPaymentConfigSuccess('bKash and Nagad numbers updated successfully!');
    setTimeout(() => setPaymentConfigSuccess(null), 3000);
  };

  const handleApproveUnlock = async (req: UnlockRequest) => {
    const targetUser = users.find((u) => u.id === req.targetUserId);
    const targetPhone = targetUser?.phone || req.targetUserPhone || '01711223344';

    if (!window.confirm(`Approve ৳${req.amount} payment (TrxID: ${req.trxId}) from ${req.userName}? This will unlock ${req.targetUserName}'s phone number (${targetPhone}) for ${req.userName}.`)) return;

    await approveUnlockRequestInFirestore(req, targetPhone);
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
          officialTitle: notifOfficialTitle
        }),
      });
      const data = await res.json();
      if (res.ok) {
        setBroadcastSuccess(data.message || 'Notification sent successfully!');
        setBroadcastTitle('');
        setBroadcastMessage('');
        setTimeout(() => setBroadcastSuccess(null), 4000);
      }
    } catch (err) {
      console.error(err);
    }
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
          defaultRadiusKm: Number(defaultRadius),
          minAgeLimit: Number(minAge),
          maxAgeLimit: Number(maxAge),
        }),
      });
      if (res.ok) {
        setSettingsSuccess('System settings & platform branding updated successfully! 💖');
        setTimeout(() => setSettingsSuccess(null), 3000);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const [completionFilter, setCompletionFilter] = useState<'all' | 'complete' | 'incomplete'>('all');
  const [inspectUser, setInspectUser] = useState<User | null>(null);

  const filteredUsers = users.filter((u) => {
    const matchesQuery =
      u.name.toLowerCase().includes(userSearch.toLowerCase()) ||
      u.email.toLowerCase().includes(userSearch.toLowerCase()) ||
      (u.username && u.username.toLowerCase().includes(userSearch.toLowerCase()));
    const matchesStatus = statusFilter === 'all' || u.status === statusFilter;
    
    const isComp = (u.profileCompletionPercentage || 0) >= 100;
    const matchesCompletion =
      completionFilter === 'all' ||
      (completionFilter === 'complete' && isComp) ||
      (completionFilter === 'incomplete' && !isComp);

    return matchesQuery && matchesStatus && matchesCompletion;
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

                <form onSubmit={handleSavePaymentConfig} className="grid grid-cols-1 md:grid-cols-3 gap-4">
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
                    <div className="flex items-center space-x-2">
                      <input
                        type="number"
                        required
                        min={1}
                        value={feeInput}
                        onChange={(e) => setFeeInput(Number(e.target.value))}
                        className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3 py-2 text-xs font-bold text-emerald-400 focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="submit"
                        className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow flex-shrink-0"
                      >
                        Save Numbers
                      </button>
                    </div>
                  </div>
                </form>
              </div>

              {/* Unlock Payment Verification List */}
              <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
                
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <h3 className="text-sm font-bold uppercase text-slate-200 tracking-wider flex items-center gap-2">
                      <Lock className="w-4 h-4 text-amber-400" />
                      Phone Unlock Verification Requests
                    </h3>
                    <p className="text-xs text-slate-400">Verify user TrxIDs and approve phone number access in real time</p>
                  </div>

                  <div className="flex items-center space-x-1.5 bg-slate-800/80 p-1 rounded-2xl border border-slate-700/80">
                    <button
                      onClick={() => setUnlockFilter('all')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'all' ? 'bg-slate-700 text-white' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      All ({unlockRequests.length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('pending')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'pending' ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Pending ({unlockRequests.filter((r) => r.status === 'pending').length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('approved')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'approved' ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Approved ({unlockRequests.filter((r) => r.status === 'approved').length})
                    </button>
                    <button
                      onClick={() => setUnlockFilter('rejected')}
                      className={`px-3 py-1 rounded-xl text-xs font-bold transition-all ${
                        unlockFilter === 'rejected' ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      Rejected ({unlockRequests.filter((r) => r.status === 'rejected').length})
                    </button>
                  </div>
                </div>

                {/* Table of Requests */}
                {unlockRequests.filter((r) => unlockFilter === 'all' || r.status === unlockFilter).length > 0 ? (
                  <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                    <table className="w-full text-left text-xs text-slate-300">
                      <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                        <tr>
                          <th className="p-3">Requesting User</th>
                          <th className="p-3">Target Member</th>
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
                          .filter((r) => unlockFilter === 'all' || r.status === unlockFilter)
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
              </div>

              {/* Users Table */}
              <div className="overflow-x-auto border border-slate-800 rounded-2xl">
                <table className="w-full text-left text-xs text-slate-300">
                  <thead className="bg-slate-800/80 text-slate-400 uppercase text-[10px] tracking-wider border-b border-slate-800">
                    <tr>
                      <th className="p-3">User Member</th>
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
                      return (
                        <tr key={u.id} className="hover:bg-slate-800/40">
                          <td className="p-3 flex items-center space-x-3">
                            <img src={u.avatar} alt={u.name} className="w-9 h-9 rounded-full object-cover" />
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

                {/* 3. Official Sender Name */}
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">
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
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-md p-4 flex items-center justify-center animate-fade-in">
          <div className="relative w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between pb-3 border-b border-slate-800">
              <div className="flex items-center space-x-3">
                <img src={inspectUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover border-2 border-rose-500" />
                <div>
                  <h3 className="text-base font-bold text-white flex items-center gap-1.5">
                    {inspectUser.name}
                    {inspectUser.verified && <VerificationBadge size={18} />}
                    {inspectUser.username && <span className="text-xs text-slate-400 font-mono">@{inspectUser.username}</span>}
                  </h3>
                  <span className="text-xs text-slate-400">User ID: #{inspectUser.userIdNumber || inspectUser.id}</span>
                </div>
              </div>

              <button
                onClick={() => setInspectUser(null)}
                className="p-1.5 rounded-full bg-slate-800 text-slate-400 hover:text-white"
              >
                <XCircle size={20} />
              </button>
            </div>

            {/* Premium Badge Action Box */}
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

            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/60 p-4 rounded-2xl border border-slate-700/60 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Completion</span>
                <span className="text-emerald-300 font-bold">{inspectUser.profileCompletionPercentage || 80}%</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Email</span>
                <span className="text-white font-mono">{inspectUser.email}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Phone Number</span>
                <span className="text-amber-300 font-mono font-bold">{inspectUser.phone || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Date of Birth</span>
                <span className="text-white">{inspectUser.dateOfBirth || 'N/A'} ({inspectUser.age} yrs)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Gender & Looking</span>
                <span className="text-white capitalize">{inspectUser.gender} ➔ {inspectUser.lookingFor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Marital & Religion</span>
                <span className="text-white">{inspectUser.maritalStatus || 'Single'} • {inspectUser.religion || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Height</span>
                <span className="text-white">{inspectUser.height || "N/A"}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Profession</span>
                <span className="text-white">{inspectUser.profession || 'N/A'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 block uppercase font-bold">Education</span>
                <span className="text-white">{inspectUser.education || 'N/A'}</span>
              </div>
            </div>

            <div className="p-3 bg-slate-950/60 rounded-xl border border-slate-800 text-xs space-y-1">
              <span className="text-[10px] font-bold uppercase text-slate-400">Full Private Address</span>
              <p className="text-slate-200 font-mono">{inspectUser.fullAddress || inspectUser.location || 'N/A'}</p>
            </div>

            <div>
              <span className="text-xs font-bold uppercase text-slate-400 block mb-1">Bio</span>
              <p className="text-xs text-slate-300 bg-slate-800/40 p-3 rounded-xl border border-slate-700/50">
                {inspectUser.bio || 'No bio provided'}
              </p>
            </div>

            <div className="pt-3 border-t border-slate-800 flex justify-between items-center">
              <span className="text-xs text-slate-400">Status: <strong className="text-emerald-400 uppercase">{inspectUser.status}</strong></span>
              <div className="space-x-2">
                <button
                  onClick={() => {
                    handleUpdateUserStatus(inspectUser.id, 'banned');
                    setInspectUser(null);
                  }}
                  className="px-3 py-1.5 rounded-xl bg-rose-500 text-white text-xs font-bold shadow"
                >
                  Ban User for Fake Info
                </button>
                <button
                  onClick={() => setInspectUser(null)}
                  className="px-3 py-1.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold"
                >
                  Close
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
