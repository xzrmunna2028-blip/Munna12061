import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  PhoneCall,
  Video,
  Info,
  ArrowRight
} from 'lucide-react';
import { User, PaymentConfig, UnlockRequest } from '../types';
import {
  subscribeToPaymentConfig,
  submitUnlockRequest,
  DEFAULT_PAYMENT_CONFIG
} from '../services/unlockService';

interface UnlockPaymentModalProps {
  currentUser: User;
  targetUser: User;
  onClose: () => void;
  onRequestSubmitted?: (req: UnlockRequest) => void;
}

export const UnlockPaymentModal: React.FC<UnlockPaymentModalProps> = ({
  currentUser,
  targetUser,
  onClose,
  onRequestSubmitted,
}) => {
  const [paymentConfig, setPaymentConfig] = useState<PaymentConfig>(DEFAULT_PAYMENT_CONFIG);
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad'>('bkash');
  const [senderPhone, setSenderPhone] = useState(currentUser.phone || '');
  const [trxId, setTrxId] = useState('');
  const [amount, setAmount] = useState<number>(DEFAULT_PAYMENT_CONFIG.unlockFeeBdt);
  const [copied, setCopied] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submittedReq, setSubmittedReq] = useState<UnlockRequest | null>(null);
  const [errorMsg, setErrorMsg] = useState('');

  // Video Tutorial state
  const [videoUrl, setVideoUrl] = useState<string>('');

  // Subscribe to real-time admin payment config
  useEffect(() => {
    const unsubscribe = subscribeToPaymentConfig((cfg) => {
      setPaymentConfig(cfg);
      setAmount(cfg.unlockFeeBdt);
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
      setErrorMsg('Please enter your Transaction ID (TrxID)');
      return;
    }
    if (!senderPhone.trim()) {
      setErrorMsg('Please enter your sender mobile number');
      return;
    }

    setErrorMsg('');
    setIsSubmitting(true);

    try {
      const req = await submitUnlockRequest(
        currentUser,
        targetUser,
        selectedMethod,
        trxId,
        senderPhone,
        amount
      );
      setSubmittedReq(req);
      if (onRequestSubmitted) onRequestSubmitted(req);
    } catch (err: any) {
      setErrorMsg('Failed to submit request. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-slate-950/90 backdrop-blur-xl animate-fade-in overflow-y-auto">
      <div className="relative w-full max-w-xl bg-slate-900 border border-pink-500/30 rounded-3xl p-5 sm:p-8 text-white shadow-2xl shadow-pink-500/10 max-h-[92vh] overflow-y-auto no-scrollbar">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-all cursor-pointer z-10"
          title="Close Modal"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedReq ? (
          /* SUCCESS STATE */
          <div className="text-center py-6 space-y-5">
            <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-emerald-500/20 to-teal-500/20 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/40 animate-pulse">
              <Clock className="w-10 h-10" />
            </div>

            <div className="space-y-2">
              <h3 className="text-2xl font-extrabold text-white tracking-tight">Payment Submitted Successfully!</h3>
              <p className="text-xs text-slate-300 leading-relaxed max-w-md mx-auto">
                Your unlock payment request for <strong className="text-pink-400 font-bold">{targetUser.name}</strong>'s contact number has been sent to the Admin. Once verified, the phone contact will be unlocked automatically!
              </p>
            </div>

            <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-5 text-left text-xs space-y-3 font-medium">
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Target Member:</span>
                <span className="font-extrabold text-white text-sm">{targetUser.name}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-bold uppercase text-pink-400">{submittedReq.paymentMethod}</span>
              </div>
              <div className="flex justify-between items-center pb-2 border-b border-slate-800">
                <span className="text-slate-400">Transaction ID (TrxID):</span>
                <span className="font-mono text-amber-300 font-extrabold text-sm">{submittedReq.trxId}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400">Verification Status:</span>
                <span className="px-3 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending Admin Approval
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 font-extrabold text-xs text-white transition-all shadow-lg shadow-pink-500/25 cursor-pointer"
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <div className="space-y-5">
            {/* Modal Header */}
            <div className="flex items-center space-x-3.5 pb-3 border-b border-slate-800">
              <div className="w-13 h-13 rounded-2xl bg-gradient-to-tr from-pink-500/20 to-purple-500/20 border border-pink-500/40 text-pink-400 flex items-center justify-center shrink-0">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-extrabold text-white tracking-tight">Unlock Phone Contact</h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Verify your payment to view <strong className="text-pink-300 font-bold">{targetUser.name}</strong>'s verified contact details
                </p>
              </div>
            </div>

            {/* Target User Card Preview */}
            <div className="bg-slate-950/80 border border-pink-500/20 rounded-2xl p-4 flex items-center space-x-3.5">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-14 h-14 rounded-2xl object-cover border-2 border-pink-500/40 shrink-0"
              />
              <div className="flex-1 min-w-0">
                <h4 className="text-sm font-extrabold text-white truncate">{targetUser.name}, {targetUser.age || 'N/A'}</h4>
                <p className="text-xs text-slate-400 font-mono flex items-center gap-1.5 mt-0.5">
                  <Lock className="w-3.5 h-3.5 text-pink-400 inline" /> 
                  <span className="blur-sm selection:bg-none font-bold">017XXXXXXXX</span>
                  <span className="text-[10px] text-pink-400 bg-pink-500/10 px-1.5 py-0.5 rounded border border-pink-500/20">(Hidden)</span>
                </p>
              </div>
              <div className="text-right shrink-0">
                <span className="text-base font-black text-emerald-400 block">৳{paymentConfig.unlockFeeBdt} BDT</span>
                <span className="text-[10px] text-slate-400 font-bold">Unlock Fee</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-200">Select Mobile Banking Method:</label>
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
                  Send Money to Admin {selectedMethod.toUpperCase()} Number:
                </span>
                <span className="text-[10px] font-extrabold text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2.5 py-0.5 rounded-full">
                  Personal Number / Send Money
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
                <div className="text-rose-300 font-bold flex items-center gap-1 text-[11px] mb-1">
                  <Info className="w-3.5 h-3.5" /> How to Complete Payment:
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                  <span>Open <strong>{selectedMethod.toUpperCase()} App</strong> and select <strong>Send Money</strong>.</span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                  <span>Enter Personal Number: <strong className="text-amber-300 font-mono">{currentNumber}</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                  <span>Enter Amount: <strong className="text-emerald-400 font-bold">৳{paymentConfig.unlockFeeBdt} BDT</strong></span>
                </div>
                <div className="flex items-start gap-1.5">
                  <ArrowRight className="w-3 h-3 text-pink-400 shrink-0 mt-0.5" />
                  <span>Confirm transaction and copy the received <strong>Transaction ID (TrxID)</strong>.</span>
                </div>
              </div>
            </div>

            {/* Video Tutorial Section (Only shown if set by admin) */}
            {videoUrl && (
              <div className="bg-slate-950/80 border border-slate-800 rounded-2xl p-4 space-y-2.5">
                <span className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                  <Video className="w-4 h-4 text-pink-400 animate-pulse" />
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

            {/* Submit Form */}
            <form onSubmit={handleSubmit} className="space-y-4 pt-1">
              {errorMsg && (
                <div className="p-3.5 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0 text-rose-400" />
                  <span className="font-bold">{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Your Mobile Number (Sender Number) *
                </label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 font-medium"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-200 mb-1.5">
                  Transaction ID (TrxID) *
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. 9A8B7C6D5E"
                  className="w-full bg-slate-950 border border-slate-800 rounded-2xl px-4 py-3 text-xs text-amber-300 font-mono tracking-wider font-extrabold placeholder-slate-500 focus:outline-none focus:border-pink-500 focus:ring-1 focus:ring-pink-500 uppercase"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-1 px-1">
                <span className="font-bold">Total Fee Paid:</span>
                <span className="font-extrabold text-emerald-400 text-base">৳{amount} BDT</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !trxId.trim()}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-rose-500 via-pink-500 to-purple-600 hover:from-rose-600 hover:to-purple-700 font-extrabold text-xs text-white shadow-xl shadow-pink-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                {isSubmitting ? (
                  <span>Submitting Payment...</span>
                ) : (
                  <>
                    <Send className="w-4 h-4" />
                    <span>Submit Payment for Approval</span>
                  </>
                )}
              </button>
            </form>

            <div className="pt-2 text-center">
              <span className="text-[10px] text-slate-400 font-semibold flex items-center justify-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-sky-400 inline" />
                Real-time Firebase Admin Verification Protocol
              </span>
            </div>
          </div>
        )}

      </div>
    </div>
  );
};
