import React, { useState, useEffect } from 'react';
import confetti from 'canvas-confetti';
import {
  X,
  ShieldCheck,
  Sparkles,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  Info,
  ArrowRight,
  UserCheck,
  Video,
  Lock,
  Zap,
  CheckCircle
} from 'lucide-react';
import { User, PaymentConfig } from '../types';
import {
  subscribeToPaymentConfig,
  submitPremiumSubscriptionRequest,
  DEFAULT_PAYMENT_CONFIG
} from '../services/unlockService';

interface PremiumSubscriptionModalProps {
  currentUser: User;
  onClose: () => void;
}

export const PremiumSubscriptionModal: React.FC<PremiumSubscriptionModalProps> = ({
  currentUser,
  onClose,
}) => {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderPhone, setSenderPhone] = useState(currentUser.phone || '');
  const [trxId, setTrxId] = useState('');
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [videoUrl, setVideoUrl] = useState<string>('');

  // Celebrate on mount with sky-blue and golden confetti!
  useEffect(() => {
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#0ea5e9', '#38bdf8', '#fbbf24', '#f59e0b', '#a855f7']
    });
  }, []);

  // Subscribe to real-time admin payment config
  useEffect(() => {
    const unsubscribe = subscribeToPaymentConfig((cfg) => {
      setPaymentConfig(cfg);
      if (cfg.tutorialVideoUrl) {
        setVideoUrl(cfg.tutorialVideoUrl);
      }
    });
    return () => unsubscribe();
  }, []);

  const currentNumber = selectedMethod === 'bkash' ? paymentConfig.bkashNumber : paymentConfig.nagadNumber;

  const handleCopy = () => {
    navigator.clipboard.writeText(currentNumber);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!trxId.trim()) {
      setErrorMsg('Please enter your Transaction ID (TrxID) / ট্রানজেকশন আইডি দিন');
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMsg('Please enter your sender mobile number / প্রেরক নাম্বার দিন');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      await submitPremiumSubscriptionRequest(
        currentUser,
        selectedMethod,
        trxId,
        senderPhone,
        50 // Fixed cost of 50 BDT
      );
      setSubmitted(true);
    } catch (err: any) {
      setErrorMsg('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-sky-500/30 rounded-3xl p-5 sm:p-8 text-white shadow-2xl shadow-sky-500/10 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer z-10"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submitted ? (
          /* SUCCESS STATE */
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-sky-500/20 to-emerald-500/20 text-sky-400 flex items-center justify-center mx-auto border border-sky-500/40 animate-pulse">
              <Clock className="w-10 h-10 animate-spin-slow" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">পেমেন্ট রিকোয়েস্ট জমা হয়েছে!</h3>
              <p className="text-sm text-slate-300 leading-relaxed max-w-md mx-auto">
                আপনার ১ মাসের প্রিমিয়াম ভেরিফিকেশন ব্যাজ (Blue Verification Badge) রিকোয়েস্টটি সফলভাবে এডমিন প্যানেলে পাঠানো হয়েছে। এডমিন ট্রানজেকশনটি যাচাই করে কিছুক্ষণের মধ্যে আপনার নামের পাশে ব্লু ব্যাজটি অ্যাক্টিভ করে দিবেন।
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3 font-medium">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">মেম্বার নাম:</span>
                <span className="font-extrabold text-white text-sm">{currentUser.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">পেমেন্ট মেথড:</span>
                <span className="font-bold uppercase text-sky-400">{selectedMethod.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">পেমেন্ট পরিমাণ:</span>
                <span className="font-extrabold text-emerald-400">৳৫০ BDT</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">প্রেরক নাম্বার:</span>
                <span className="font-bold text-white">{senderPhone}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Transaction ID (TrxID):</span>
                <span className="font-mono text-amber-300 font-extrabold text-sm">{trxId.toUpperCase()}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">স্ট্যাটাস:</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending Admin Approval (অনুমোদনের অপেক্ষায়)
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 font-extrabold text-xs text-white transition-all shadow-lg shadow-sky-500/25 cursor-pointer"
            >
              ঠিক আছে
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <div className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-800">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-sky-500/20 to-indigo-500/20 border border-sky-500/40 text-sky-400 flex items-center justify-center shrink-0">
                <UserCheck className="w-6 h-6 animate-pulse" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-1.5">
                  <span>Premium Verification Badge</span>
                  <span className="text-[10px] bg-sky-500/20 text-sky-300 border border-sky-500/30 px-2 py-0.5 rounded-full font-bold">1 Month</span>
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  ১ মাসের ভেরিফাইড মেম্বারশিপ নিয়ে আপনার নামের পাশে ব্লু ভেরিফিকেশন টিক চিহ্ন যুক্ত করুন!
                </p>
              </div>
            </div>

            {/* Interactive Luxury Premium Showcase with Live Rotating Verification Badge Demo */}
            <div className="relative overflow-hidden bg-gradient-to-br from-slate-950 via-indigo-950/40 to-slate-950 border border-sky-500/40 rounded-3xl p-5 shadow-2xl shadow-sky-500/10 space-y-4">
              {/* Background glowing aura */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-sky-500/10 rounded-full blur-3xl pointer-events-none animate-pulse" />
              
              <div className="relative flex flex-col sm:flex-row items-center gap-4 sm:justify-between pb-4 border-b border-slate-800/60">
                <div className="flex flex-col sm:flex-row items-center gap-3.5 text-center sm:text-left">
                  <div className="relative group shrink-0">
                    {/* Pulsing ring around avatar */}
                    <div className="absolute -inset-1 rounded-2xl bg-gradient-to-tr from-sky-400 to-indigo-500 opacity-60 blur-sm animate-pulse" />
                    
                    <img
                      src={currentUser.avatar}
                      alt={currentUser.name}
                      className="relative w-16 h-16 rounded-2xl object-cover border-2 border-slate-900 shrink-0"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    {/* Name with custom animated video-like shimmering Blue Verification Badge */}
                    <div className="flex flex-wrap items-center gap-2 justify-center sm:justify-start">
                      <span className="text-base font-black text-white px-3 py-1 bg-slate-900/90 border border-slate-700/80 rounded-xl shadow-inner">
                        {currentUser.name}
                      </span>

                      {/* Animated Blue Verification Badge with Glowing Video Shimmer Effect */}
                      <div className="relative inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-sky-500/20 via-blue-500/30 to-indigo-500/20 border border-sky-400/60 rounded-xl shadow-lg shadow-sky-500/20 animate-pulse">
                        <div className="relative flex items-center justify-center">
                          <span className="absolute -inset-1 rounded-full bg-sky-400 blur-sm animate-ping opacity-50" />
                          <svg viewBox="0 0 24 24" fill="none" className="w-5 h-5 relative z-10 text-sky-400 drop-shadow-[0_0_8px_rgba(56,189,248,0.8)]">
                            <path
                              d="M22.5 12.5c0-1.58-.875-2.95-2.148-3.688.438-1.531.156-3.281-.969-4.406s-2.875-1.406-4.406-.969C14.25 2.172 12.875 1.3 11.297 1.3s-2.953.875-3.688 2.148c-1.531-.438-3.281-.156-4.406.969s-1.406 2.875-.969 4.406C1 9.547.125 10.922.125 12.5s.875 2.953 2.109 3.688c-.438 1.531-.156 3.281.969 4.406s2.875 1.406 4.406.969c.734 1.273 2.109 2.148 3.688 2.148s2.953-.875 3.688-2.148c1.531.438 3.281.156 4.406-.969s1.406-2.875.969-4.406c1.273-.735 2.148-2.11 2.148-3.688z"
                              fill="#0ea5e9"
                            />
                            <path
                              d="M9.86 16.02L5.8 11.96l1.41-1.41 2.65 2.65 6.94-6.94 1.41 1.41-8.35 8.35z"
                              fill="#FFFFFF"
                            />
                          </svg>
                        </div>
                        <span className="text-[11px] font-extrabold text-sky-200 tracking-wide">VERIFIED</span>
                        <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin-slow" />
                      </div>
                    </div>

                    <p className="text-xs text-sky-300 font-bold flex items-center justify-center sm:justify-start gap-1 pt-0.5">
                      <Zap className="w-3.5 h-3.5 text-amber-400 fill-amber-400 animate-pulse" />
                      <span>প্রিমিয়াম ভেরিফাইড মেম্বার ডেমো</span>
                    </p>
                  </div>
                </div>

                <div className="text-center sm:text-right bg-sky-500/10 border border-sky-500/20 px-4 py-2.5 rounded-2xl shrink-0">
                  <span className="text-2xl font-black text-emerald-400 block tracking-tight">৳৫০ BDT</span>
                  <span className="text-[10px] text-slate-300 font-bold">১ মাস প্রি-অ্যাক্টিভ ফি</span>
                </div>
              </div>

              {/* Exclusive features they unlock */}
              <div className="space-y-2">
                <span className="text-[11px] uppercase tracking-wider text-indigo-300 font-bold block">প্রিমিয়াম মেম্বারশিপের এক্সক্লুসিভ সুবিধাসমূহ (Premium Benefits):</span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
                  <div className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <CheckCircle className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100 block">ব্লু ভেরিফাইড টিক চিহ্ন</strong>
                      <span className="text-slate-400 text-[11px]">প্রোফাইলে আকর্ষণ ও ১০০% বিশ্বস্ততা বাড়বে।</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <Zap className="w-4 h-4 text-amber-400 fill-amber-400/20 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100 block">প্রোফাইল বুস্টার (Profile Boost)</strong>
                      <span className="text-slate-400 text-[11px]">অন্য সবার উপরে আপনার প্রোফাইল শো করবে।</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <Sparkles className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100 block">আনলিমিটেড লাইক ও মেসেজ</strong>
                      <span className="text-slate-400 text-[11px]">পছন্দের পাত্র-পাত্রীকে আনলিমিটেড লাইক দিন।</span>
                    </div>
                  </div>

                  <div className="flex items-start gap-2 bg-slate-900/40 p-2.5 rounded-xl border border-slate-800">
                    <Lock className="w-4 h-4 text-pink-400 shrink-0 mt-0.5" />
                    <div>
                      <strong className="text-slate-100 block">নাম্বার আনলক অগ্রাধিকার</strong>
                      <span className="text-slate-400 text-[11px]">সহজে ও দ্রুত অন্যের যোগাযোগের নাম্বার পাবেন।</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">মোবাইল ব্যাংকিং পেমেন্ট মেথড সিলেক্ট করুন:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bkash')}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedMethod === 'bkash'
                      ? 'bg-pink-600/20 border-pink-500 text-pink-300 shadow-lg shadow-pink-500/20 ring-1 ring-pink-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-pink-500" />
                    <span className="font-extrabold text-xs tracking-wide">bKash</span>
                  </div>
                  {selectedMethod === 'bkash' && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('nagad')}
                  className={`p-3.5 rounded-2xl border flex items-center justify-between transition-all cursor-pointer ${
                    selectedMethod === 'nagad'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-lg shadow-amber-500/20 ring-1 ring-amber-500'
                      : 'bg-slate-950/60 border-slate-800 text-slate-400 hover:text-white hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center space-x-2.5">
                    <span className="w-3.5 h-3.5 rounded-full bg-amber-500" />
                    <span className="font-extrabold text-xs tracking-wide">Nagad</span>
                  </div>
                  {selectedMethod === 'nagad' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Merchant / Admin Payment Number Display Box */}
            <div className="bg-gradient-to-br from-slate-950 to-slate-900 border border-slate-700 rounded-2xl p-4 sm:p-5 space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-extrabold text-slate-200">
                  এডমিনের {selectedMethod.toUpperCase()} নাম্বারে টাকা পাঠান:
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Send Money (সেন্ট মানি)
                </span>
              </div>

              <div className="flex items-center justify-between bg-slate-950 border border-slate-700 rounded-2xl px-4 py-2.5">
                <span className="font-mono text-lg font-black text-amber-300 tracking-wider">
                  {currentNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
                >
                  {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4" />}
                  <span>{copied ? 'Copied!' : 'Copy'}</span>
                </button>
              </div>

              {/* Step by Step Instructions */}
              <div className="bg-slate-900/90 rounded-xl p-3 border border-slate-800 text-[11px] text-slate-300 space-y-1.5 font-medium">
                <div className="text-sky-300 font-bold flex items-center gap-1 text-[11px] mb-1">
                  <Info className="w-3.5 h-3.5" /> পেমেন্ট করার নিয়মাবলী:
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>আপনার <strong>{selectedMethod.toUpperCase()} App</strong> অথবা ডায়াল কোড ব্যবহার করে <strong>Send Money</strong> অপশন সিলেক্ট করুন।</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>প্রেরক নাম্বার হিসেবে এডমিনের পার্সোনাল নাম্বারটি দিন: <strong className="text-amber-300 font-mono">{currentNumber}</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>পেমেন্ট এর পরিমাণ দিন: <strong className="text-emerald-400 font-bold">৳৫০ BDT</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-sky-400 shrink-0 mt-0.5" />
                  <span>পেমেন্ট সম্পন্ন হওয়ার পর যে ফিরতি মেসেজ পাবেন তা থেকে <strong>Transaction ID (TrxID)</strong> কপি করে নিচে দিন।</span>
                </div>
              </div>
            </div>

            {/* Video Tutorial Section (Only shown if configured by admin) */}
            {videoUrl && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-sky-400 animate-pulse" />
                  <span>Payment Video Tutorial Guide (পেমেন্ট টিউটোরিয়াল ভিডিও গাইড)</span>
                </span>
                <div className="relative rounded-2xl overflow-hidden bg-black border border-slate-800 aspect-video flex items-center justify-center">
                  <video
                    src={videoUrl}
                    controls
                    className="w-full h-full object-contain"
                  />
                </div>
              </div>
            )}

            {/* Submission Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Your Sender Mobile Number / আপনার নাম্বার</label>
                  <input
                    type="text"
                    required
                    value={senderPhone}
                    onChange={(e) => setSenderPhone(e.target.value)}
                    placeholder="e.g. 017XXXXXXXX"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Transaction ID (TrxID) / ট্রানজেকশন আইডি</label>
                  <input
                    type="text"
                    required
                    value={trxId}
                    onChange={(e) => setTrxId(e.target.value)}
                    placeholder="e.g. 9J83HDK83"
                    className="w-full bg-slate-950 border border-slate-800 focus:border-sky-500 rounded-xl px-4 py-2.5 text-xs text-white placeholder-slate-600 focus:outline-none font-mono"
                  />
                </div>
              </div>

              {errorMsg && (
                <div className="p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 hover:from-sky-600 hover:to-indigo-700 font-extrabold text-xs text-white transition-all shadow-lg shadow-sky-500/20 active:scale-[0.98] disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
              >
                <Send className="w-4 h-4" />
                <span>{isSubmitting ? 'প্রসেসিং হচ্ছে...' : 'পেমেন্ট রিকোয়েস্ট পাঠান'}</span>
              </button>
            </form>
          </div>
        )}
      </div>
    </div>
  );
};
