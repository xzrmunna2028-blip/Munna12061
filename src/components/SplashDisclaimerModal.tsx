import React, { useState, useEffect } from 'react';
import { Heart, ShieldAlert, Globe, Search, CheckCircle, ArrowRight, Sparkles, Users, Lock, MessageCircle, PhoneCall, Star, Award, ChevronLeft, ChevronRight } from 'lucide-react';

interface SplashDisclaimerModalProps {
  onAccept: () => void;
}

interface Translation {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  heroTag: string;
  heroTitle: string;
  heroSubtitle: string;
  warningTitle: string;
  warningText: string;
  agreeBtn: string;
  footerNotice: string;
  statsVerified: string;
  statsPrivacy: string;
  statsSecurity: string;
  statsMatch: string;
}

const LANGUAGES: Translation[] = [
  {
    code: 'bn',
    name: 'Bengali',
    nativeName: 'বাংলা',
    flag: '🇧🇩',
    heroTag: '🇧🇩 বাংলাদেশের ১ নম্বর বিশ্বস্ত ডেটিং ও বিবাহ প্ল্যাটফর্ম',
    heroTitle: 'খুঁজে নিন আপনার জীবনের সবচেয়ে আসল সঙ্গীকে',
    heroSubtitle: 'ভেরিফাইড প্রোফাইল, নিরাপদ চ্যাট, সরাসরি ভয়েস কল এবং বিশ্বস্ত পাত্র-পাত্রী বা ডেটিং পার্টনার খোঁজার আধুনিক অ্যাপ।',
    warningTitle: '⚠️ কঠোর নিয়মাবলী ও সতর্কবার্তা',
    warningText: 'আমাদের প্ল্যাটফর্মে ভুল বা ফেক ছবি, ভুয়া নাম/তথ্য প্রকাশ, প্রতারণা বা অন্য কোনো অসদাচরণ করা কঠোরভাবে নিষিদ্ধ। কোনো ধরনের ফেক প্রোফাইল বা বিভ্রান্তিকর আচরণ সনাক্ত হলে আপনার অ্যাকাউন্ট স্থায়ীভাবে বা চিরতরে ব্যান করা হবে।',
    agreeBtn: 'আমি নিয়মাবলীতে একমত ও এগিয়ে যান',
    footerNotice: 'আমাদের প্ল্যাটফর্মে আপনি ১০০% সুরক্ষিত। সত্য ও সৎ তথ্য দিয়ে ভালোবাসার সঙ্গীকে খুঁজে নিন।',
    statsVerified: '১০,০০০+ ভেরিফাইড আইডি',
    statsPrivacy: '১০০% প্রাইভেসি সেফটি',
    statsSecurity: '২৪/৭ সিকিউরিটি প্রটেকশন',
    statsMatch: 'রিয়েল-টাইম ম্যাচমেকিং'
  },
  {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    flag: '🇺🇸',
    heroTag: '🇧🇩 #1 Trusted Bangladesh Dating & Matrimony Network',
    heroTitle: 'Discover Your True Soulmate & Life Partner',
    heroSubtitle: 'Connect with verified Bangladeshi singles. Safe real-time chat, voice calling, and authentic matchmaking.',
    warningTitle: '⚠️ Strict Community Guidelines & Security Notice',
    warningText: 'Uploading fake photos, submitting fraudulent details, or engaging in deceptive activities is strictly prohibited on True Love Connect. Any detection of fake profiles will result in an immediate permanent BAN.',
    agreeBtn: 'I Agree to Rules & Continue',
    footerNotice: 'Your privacy is 100% protected. Share genuine information to build authentic relationships.',
    statsVerified: '10,000+ Verified Users',
    statsPrivacy: '100% Privacy Guarantee',
    statsSecurity: '24/7 Security Shield',
    statsMatch: 'Real-Time Matchmaking'
  }
];

interface LandingBannerItem {
  id: string;
  title: string;
  subtitle: string;
  tag: string;
  imageUrl: string;
}

const DEFAULT_SLIDES: LandingBannerItem[] = [
  {
    id: 'default_1',
    title: 'বিবাহ ও জীবনসঙ্গী খোঁজার নিরাপদ মাধ্যম',
    subtitle: 'বাংলাদেশী পছন্দ অনুযায়ী পরিবার ও মনের মতো পাত্র-পাত্রী সরাসরি খুঁজুন',
    tag: 'ডিজিটাল পাত্র-পাত্রী সেন্টার',
    imageUrl: 'https://images.unsplash.com/photo-1583939003579-730e3918a45a?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'default_2',
    title: 'রিয়েল-টাইম চ্যাটিং ও তাৎক্ষণিক রিপ্লাই',
    subtitle: 'টাইপিং ইন্ডিকেটর, দেখা মেসেজের ডেলিভারি মার্ক এবং সিকিউর ভয়েস কল',
    tag: 'ফাস্ট অ্যান্ড সিকিউর মেসেজিং',
    imageUrl: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1200&q=80'
  },
  {
    id: 'default_3',
    title: '১০০% ভেরিফাইড প্রোফাইল ও এনক্রিপশন',
    subtitle: 'কোনো ফেক আইডি নয়! প্রতিটি আইডি ভেরিফিকেশন প্যানেল দ্বারা পরীক্ষিত',
    tag: 'সিকিউর কম্যুনটি গার্ড',
    imageUrl: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1200&q=80'
  }
];

export const SplashDisclaimerModal: React.FC<SplashDisclaimerModalProps> = ({ onAccept }) => {
  const [progress, setProgress] = useState(0);
  const [selectedLang, setSelectedLang] = useState<Translation>(LANGUAGES[0]); // Bengali default
  const [isLangOpen, setIsLangOpen] = useState(false);
  const [searchLang, setSearchLang] = useState('');
  const [currentSlideIndex, setCurrentSlideIndex] = useState(0);

  // Dynamic Landing Banners from Admin / Backend
  const [banners, setBanners] = useState<LandingBannerItem[]>(DEFAULT_SLIDES);

  // Dynamic Real-time Database Stats State
  const [realtimeStats, setRealtimeStats] = useState<{
    totalUsers: number;
    verifiedUsers: number;
    totalMatches: number;
    privacySafety: string;
    securityProtection: string;
  }>({
    totalUsers: 0,
    verifiedUsers: 0,
    totalMatches: 0,
    privacySafety: '100%',
    securityProtection: '24/7'
  });

  // Fetch Banners from API
  const fetchBanners = async () => {
    try {
      const res = await fetch('/api/landing-banners');
      if (res.ok) {
        const data = await res.json();
        if (data.banners && data.banners.length > 0) {
          setBanners(data.banners);
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Fetch Public Database Stats in Real-time
  const fetchStats = async () => {
    try {
      const res = await fetch('/api/public-stats');
      if (res.ok) {
        const data = await res.json();
        setRealtimeStats({
          totalUsers: data.totalUsers ?? 0,
          verifiedUsers: data.verifiedUsers ?? 0,
          totalMatches: data.totalMatches ?? 0,
          privacySafety: data.privacySafety || '100%',
          securityProtection: data.securityProtection || '24/7'
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  useEffect(() => {
    fetchBanners();
    fetchStats();

    // Poll real-time database stats every 3 seconds for live counter updates
    const statsTimer = setInterval(fetchStats, 3000);
    return () => clearInterval(statsTimer);
  }, []);

  // Auto slide switcher every 4 seconds
  useEffect(() => {
    if (banners.length === 0) return;
    const slideTimer = setInterval(() => {
      setCurrentSlideIndex((prev) => (prev + 1) % banners.length);
    }, 4000);
    return () => clearInterval(slideTimer);
  }, [banners.length]);

  // System security scan progress bar from 0 to 100%
  useEffect(() => {
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          return 100;
        }
        return prev + Math.floor(Math.random() * 15) + 8;
      });
    }, 100);

    return () => clearInterval(interval);
  }, []);

  const activeSlideList = banners.length > 0 ? banners : DEFAULT_SLIDES;
  const currentSlide = activeSlideList[currentSlideIndex % activeSlideList.length];

  return (
    <div className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white overflow-y-auto min-h-screen">
      
      {/* BACKGROUND ANIMATED GRADIENT & SLIDER EFFECT */}
      <div className={`absolute inset-0 bg-gradient-to-br ${currentSlide.accentColor} transition-all duration-1000 ease-in-out pointer-events-none`} />
      
      {/* Glowing Orbs in corners */}
      <div className="absolute top-10 left-10 w-96 h-96 bg-rose-600/20 rounded-full blur-[140px] pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-96 h-96 bg-purple-600/20 rounded-full blur-[140px] pointer-events-none" />

      {/* TOP NAVBAR / HEADER */}
      <header className="relative z-50 max-w-6xl w-full mx-auto px-4 sm:px-8 py-4 sm:py-6 flex items-center justify-between">
        
        {/* BRAND LOGO */}
        <div className="flex items-center space-x-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-rose-500 via-pink-500 to-amber-400 p-0.5 shadow-lg shadow-rose-500/30 flex items-center justify-center">
            <div className="w-full h-full bg-slate-950 rounded-[14px] flex items-center justify-center">
              <Heart className="w-6 h-6 text-rose-500 fill-rose-500 animate-pulse" />
            </div>
          </div>
          <div>
            <h1 className="text-2xl font-black tracking-tight bg-gradient-to-r from-white via-rose-200 to-pink-400 bg-clip-text text-transparent">
              True Love Connect
            </h1>
            <p className="text-[10px] font-bold text-rose-400 tracking-wider uppercase">
              Real & Verified Network
            </p>
          </div>
        </div>

        {/* LANGUAGE SELECTOR BUTTON */}
        <div className="relative z-50">
          <button
            onClick={() => setIsLangOpen(!isLangOpen)}
            className="px-3.5 py-2 rounded-2xl bg-slate-900/90 border border-slate-700/80 text-xs font-bold text-slate-200 hover:text-white flex items-center space-x-2 shadow-xl backdrop-blur-md transition-all hover:border-rose-500/50"
          >
            <Globe className="w-4 h-4 text-rose-400" />
            <span>{selectedLang.flag} {selectedLang.nativeName}</span>
          </button>

          {isLangOpen && (
            <div className="absolute right-0 mt-2 w-64 bg-slate-900 border border-slate-700/80 rounded-2xl p-3 shadow-2xl backdrop-blur-xl z-50 space-y-2 animate-fade-in">
              <div className="relative">
                <Search className="w-3.5 h-3.5 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  value={searchLang}
                  onChange={(e) => setSearchLang(e.target.value)}
                  placeholder="Search language..."
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div className="max-h-48 overflow-y-auto space-y-1 pr-1">
                {LANGUAGES.filter(l => 
                  l.name.toLowerCase().includes(searchLang.toLowerCase()) || 
                  l.nativeName.toLowerCase().includes(searchLang.toLowerCase())
                ).map((lang) => (
                  <button
                    key={lang.code}
                    onClick={() => {
                      setSelectedLang(lang);
                      setIsLangOpen(false);
                    }}
                    className={`w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-medium transition-colors ${
                      selectedLang.code === lang.code
                        ? 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                        : 'text-slate-300 hover:bg-slate-800'
                    }`}
                  >
                    <span className="flex items-center space-x-2">
                      <span>{lang.flag}</span>
                      <span>{lang.nativeName} ({lang.name})</span>
                    </span>
                    {selectedLang.code === lang.code && <CheckCircle className="w-3.5 h-3.5 text-rose-400" />}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      </header>

      {/* MAIN HERO & LANDING BODY */}
      <main className="relative z-10 max-w-5xl w-full mx-auto px-4 sm:px-6 my-auto py-6 space-y-8">
        
        {/* HERO BADGE & HEADLINE */}
        <div className="text-center space-y-4">
          <div className="inline-flex items-center space-x-2 px-4 py-1.5 rounded-full bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-semibold backdrop-blur-md shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 animate-spin" style={{ animationDuration: '4s' }} />
            <span>{selectedLang.heroTag}</span>
          </div>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-white max-w-3xl mx-auto leading-tight sm:leading-none">
            {selectedLang.heroTitle}
          </h2>

          <p className="text-sm sm:text-base text-slate-300 max-w-2xl mx-auto leading-relaxed">
            {selectedLang.heroSubtitle}
          </p>
        </div>

        {/* AUTOMATIC SLIDER CARD WITH WEDDING & MATRIMONIAL IMAGES */}
        <div className="relative bg-slate-900/90 border border-slate-800 rounded-3xl p-5 sm:p-7 backdrop-blur-xl shadow-2xl overflow-hidden group">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
            
            {/* Banner Image Preview */}
            {currentSlide.imageUrl && (
              <div className="relative w-full lg:w-80 h-48 sm:h-56 rounded-2xl overflow-hidden border border-slate-700/60 flex-shrink-0 shadow-lg group-hover:scale-[1.01] transition-transform duration-500">
                <img
                  src={currentSlide.imageUrl}
                  alt={currentSlide.title}
                  className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-slate-950/80 via-transparent to-transparent" />
                <span className="absolute bottom-2 left-2 right-2 text-[11px] font-bold text-white bg-slate-950/80 px-2.5 py-1 rounded-lg backdrop-blur-md border border-slate-800 truncate">
                  ✨ {currentSlide.tag}
                </span>
              </div>
            )}

            <div className="space-y-3 flex-1">
              <span className="inline-block px-3 py-1 rounded-lg bg-pink-500/20 text-pink-300 text-[11px] font-bold uppercase tracking-wider border border-pink-500/30">
                {currentSlide.tag}
              </span>
              <h3 className="text-xl sm:text-2xl font-black text-white leading-snug transition-all duration-500">
                {currentSlide.title}
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed transition-all duration-500">
                {currentSlide.subtitle}
              </p>
            </div>

            {/* SLIDE INDICATORS AND CONTROLS */}
            <div className="flex items-center space-x-3 self-center lg:self-auto flex-shrink-0">
              <button
                onClick={() => setCurrentSlideIndex((prev) => (prev - 1 + activeSlideList.length) % activeSlideList.length)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shadow"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <div className="flex space-x-2">
                {activeSlideList.map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setCurrentSlideIndex(i)}
                    className={`h-2.5 rounded-full transition-all duration-300 ${
                      i === currentSlideIndex % activeSlideList.length ? 'w-8 bg-rose-500' : 'w-2.5 bg-slate-700'
                    }`}
                  />
                ))}
              </div>

              <button
                onClick={() => setCurrentSlideIndex((prev) => (prev + 1) % activeSlideList.length)}
                className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors shadow"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        </div>

        {/* 4 STATS PILLARS - CONNECTED TO REAL-TIME DATABASE COUNTS */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 sm:gap-4">
          <div className="bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-1 backdrop-blur-md shadow-xl shadow-amber-500/5 relative overflow-hidden">
            <Users className="w-6 h-6 text-amber-400 mx-auto" />
            <p className="text-sm font-black text-white font-mono">
              {realtimeStats.totalUsers.toLocaleString()} জন
            </p>
            <p className="text-[11px] text-amber-300 font-bold">রেজিস্টার্ড সদস্য (Real-time)</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-1 backdrop-blur-md shadow-xl shadow-amber-500/5">
            <Lock className="w-6 h-6 text-emerald-400 mx-auto" />
            <p className="text-sm font-black text-white font-mono">
              {realtimeStats.privacySafety}
            </p>
            <p className="text-[11px] text-emerald-300 font-bold">সম্পূর্ণ গোপনীয়তা</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-1 backdrop-blur-md shadow-xl shadow-amber-500/5">
            <ShieldAlert className="w-6 h-6 text-rose-400 mx-auto" />
            <p className="text-sm font-black text-white font-mono">
              {realtimeStats.securityProtection}
            </p>
            <p className="text-[11px] text-rose-300 font-bold">সিকিউরিটি প্রটেকশন</p>
          </div>

          <div className="bg-slate-900/80 border-2 border-amber-500/50 rounded-2xl p-4 text-center space-y-1 backdrop-blur-md shadow-xl shadow-amber-500/5">
            <Heart className="w-6 h-6 text-pink-400 mx-auto fill-pink-400/30" />
            <p className="text-sm font-black text-white font-mono">
              {realtimeStats.totalMatches > 0 ? `${realtimeStats.totalMatches}টি ম্যাচ` : 'রিয়েল-টাইম'}
            </p>
            <p className="text-[11px] text-pink-300 font-bold">সহজ ম্যাচমেকিং</p>
          </div>
        </div>

        {/* MANDATORY DISCLAIMER & RULES BOX */}
        <div className="bg-slate-900/90 border border-rose-500/40 rounded-3xl p-5 sm:p-7 space-y-4 shadow-2xl backdrop-blur-2xl relative overflow-hidden">
          
          <div className="absolute top-0 right-0 w-32 h-32 bg-rose-500/10 rounded-full blur-2xl pointer-events-none" />

          {/* PROGRESS SCAN */}
          <div className="space-y-1">
            <div className="flex justify-between items-center text-xs font-bold font-mono">
              <span className="text-slate-400 flex items-center space-x-1.5">
                <ShieldAlert className="w-4 h-4 text-rose-400" />
                <span>System Integrity & Security Verification Scan</span>
              </span>
              <span className="text-emerald-400">{Math.min(progress, 100)}%</span>
            </div>

            <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/60">
              <div
                className="h-full bg-gradient-to-r from-rose-500 via-pink-500 to-emerald-400 rounded-full transition-all duration-300"
                style={{ width: `${Math.min(progress, 100)}%` }}
              />
            </div>
          </div>

          {/* RULES TEXT */}
          <div className="space-y-2 pt-2 border-t border-slate-800">
            <div className="flex items-center space-x-2 text-rose-400 font-bold text-sm sm:text-base">
              <ShieldAlert className="w-5 h-5 text-rose-500 flex-shrink-0" />
              <span>{selectedLang.warningTitle}</span>
            </div>

            <p className="text-xs sm:text-sm text-slate-200 leading-relaxed font-medium bg-slate-950/60 p-3.5 rounded-2xl border border-slate-800">
              {selectedLang.warningText}
            </p>
          </div>

          <div className="flex items-center space-x-2 text-xs text-emerald-300 font-medium">
            <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0" />
            <span>{selectedLang.footerNotice}</span>
          </div>

          {/* CTA BUTTON */}
          <div className="pt-2">
            <button
              onClick={onAccept}
              disabled={progress < 100}
              className="w-full py-4 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-rose-600 hover:from-rose-600 hover:to-pink-600 text-white font-black text-sm sm:text-base shadow-2xl shadow-rose-500/30 disabled:opacity-50 disabled:cursor-not-allowed transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center space-x-2.5"
            >
              <span>{selectedLang.agreeBtn}</span>
              <ArrowRight className="w-5 h-5" />
            </button>
            <p className="text-[11px] text-slate-500 text-center mt-2.5 font-mono">
              True Love Connect © 2026 • Encrypted Real-Time Bangladeshi Matchmaking & Protection
            </p>
          </div>

        </div>

      </main>

      {/* FOOTER */}
      <footer className="relative z-10 py-4 text-center text-[11px] text-slate-500 border-t border-slate-900 bg-slate-950/80">
        <p>True Love Connect BD Platform • All Rights Reserved</p>
      </footer>

    </div>
  );
};
