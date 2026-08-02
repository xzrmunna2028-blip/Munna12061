import React, { useState } from 'react';
import { X, ShieldAlert, Check, AlertTriangle, Send } from 'lucide-react';
import { User } from '../types';

interface ReportModalProps {
  reportedUser: User | null;
  onClose: () => void;
  onSubmitReport: (reportedUserId: string, reason: string, details: string) => Promise<void>;
}

const REPORT_PRESETS = [
  { label: '🔞 18+ / Inappropriate Photos (১৮+ ছবি বা খারাপ কন্টেন্ট)', value: '18+ Inappropriate Photos or Media' },
  { label: '🗣️ Abusive Language / Voice Abuse (গালিগালাজ বা ভয়েস অ্যাপবিউজ)', value: 'Abusive Language or Offensive Voice Messages' },
  { label: '🎭 Fake Profile / False Info (ভুয়া প্রোফাইল বা মিথ্যা তথ্য)', value: 'Fake Profile or False Information' },
  { label: '💰 Scam / Financial Fraud (স্ক্যাম বা টাকা-পয়সা চাওয়া)', value: 'Scam, Fraud or Commercial Solicitation' },
  { label: '🚫 Underage Member (অপ্রাপ্তবয়স্ক বা কম বয়সী ইউজার)', value: 'Underage User' },
  { label: '📱 Off-Platform Harassment (অফলাইন হয়রানি)', value: 'Off-platform Harassment or Solicitation' },
  { label: '📝 Other Guidelines Violation (অন্যান্য নিয়ম লঙ্ঘন)', value: 'Other Guideline Violation' },
];

export const ReportModal: React.FC<ReportModalProps> = ({
  reportedUser,
  onClose,
  onSubmitReport,
}) => {
  const [reason, setReason] = useState(REPORT_PRESETS[0].value);
  const [details, setDetails] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  if (!reportedUser) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await onSubmitReport(reportedUser.id, reason, details);
      setSuccess(true);
      setTimeout(() => {
        setSuccess(false);
        onClose();
      }, 2000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl space-y-4">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <div className="flex items-center space-x-3 pb-3 border-b border-slate-800">
          <div className="w-11 h-11 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/30 flex-shrink-0">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-white flex items-center gap-1.5">
              Report User / ইউজার রিপোর্ট করুন
            </h3>
            <p className="text-[11px] text-slate-400">
              Flagging <span className="text-rose-400 font-semibold">{reportedUser.name}</span> for Admin Panel review
            </p>
          </div>
        </div>

        {success ? (
          <div className="py-8 text-center space-y-3">
            <div className="w-14 h-14 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
              <Check className="w-7 h-7" />
            </div>
            <h4 className="text-base font-bold text-white">Report Sent to Admin Panel</h4>
            <p className="text-xs text-slate-300 max-w-xs mx-auto leading-relaxed">
              ধন্যবাদ! আপনার রিপোর্টটি এডমিন প্যানেলে জমা হয়েছে। আমাদের সেফটি টিম দ্রুত তদন্ত করবে।
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            
            {/* Preset Suggested Reasons */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-2 flex items-center gap-1">
                <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
                Select Report Reason (রিপোর্টের কারণ নির্বাচন করুন)
              </label>

              <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1 no-scrollbar">
                {REPORT_PRESETS.map((preset) => (
                  <button
                    key={preset.value}
                    type="button"
                    onClick={() => setReason(preset.value)}
                    className={`w-full text-left p-2.5 rounded-xl text-xs transition-all border ${
                      reason === preset.value
                        ? 'bg-rose-500/20 text-rose-200 border-rose-500/50 font-bold shadow-sm'
                        : 'bg-slate-800/80 text-slate-300 border-slate-700/80 hover:bg-slate-700'
                    }`}
                  >
                    {preset.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom Notes Message Textarea */}
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">
                Personal Message / Details (বিস্তারিত মেসেজ লিখুন)
              </label>
              <textarea
                rows={3}
                value={details}
                onChange={(e) => setDetails(e.target.value)}
                placeholder="এখানে আপনার ব্যক্তিগত অভিযোগ বা কি ধরনের সমস্যা তা লিখে দিন..."
                className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 via-pink-500 to-amber-500 hover:from-rose-600 hover:to-amber-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2 transition-all"
            >
              <Send className="w-4 h-4" />
              {loading ? 'Submitting to Admin...' : 'Submit Report to Admin (রিপোর্ট জমা দিন)'}
            </button>
          </form>
        )}

      </div>
    </div>
  );
};

