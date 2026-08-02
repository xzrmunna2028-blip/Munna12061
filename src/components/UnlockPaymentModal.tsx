import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  Lock,
  Copy,
  Check,
  CreditCard,
  Send,
  AlertCircle,
  Clock,
  CheckCircle2,
  PhoneCall
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

  // Subscribe to real-time admin payment config
  useEffect(() => {
    const unsubscribe = subscribeToPaymentConfig((cfg) => {
      setPaymentConfig(cfg);
      setAmount(cfg.unlockFeeBdt);
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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 text-white shadow-2xl overflow-hidden max-h-[90vh] overflow-y-auto">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full bg-slate-800 text-slate-400 hover:text-white hover:bg-slate-700 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {submittedReq ? (
          /* SUCCESS STATE */
          <div className="text-center py-6">
            <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-4 border border-emerald-500/20 animate-pulse">
              <Clock className="w-8 h-8" />
            </div>

            <h3 className="text-xl font-bold text-white mb-2">Payment Submitted!</h3>
            <p className="text-xs text-slate-300 mb-6 leading-relaxed max-w-sm mx-auto">
              your payment request for <strong className="text-rose-400">{targetUser.name}</strong>'s phone number has been sent to the Admin. As soon as the admin verifies your Transaction ID (<span className="font-mono text-amber-300">{submittedReq.trxId}</span>), the phone number will be unlocked instantly!
            </p>

            <div className="bg-slate-800/80 border border-slate-700 rounded-2xl p-4 text-left text-xs mb-6 space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-400">Target Member:</span>
                <span className="font-bold text-white">{targetUser.name}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Payment Method:</span>
                <span className="font-bold uppercase text-pink-400">{submittedReq.paymentMethod}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TrxID:</span>
                <span className="font-mono text-amber-300">{submittedReq.trxId}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Status:</span>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  Pending Verification
                </span>
              </div>
            </div>

            <button
              onClick={onClose}
              className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 font-bold text-xs hover:from-rose-600 transition-all shadow-lg shadow-rose-500/20"
            >
              Done & Return
            </button>
          </div>
        ) : (
          /* FORM STATE */
          <div>
            <div className="flex items-center space-x-3 mb-4">
              <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center">
                <PhoneCall className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-lg font-bold text-white">Unlock Phone Number</h3>
                <p className="text-xs text-slate-400">
                  Verify payment to unlock <strong className="text-white">{targetUser.name}</strong>'s phone contact
                </p>
              </div>
            </div>

            {/* Target User Card Preview */}
            <div className="bg-slate-800/60 border border-slate-700/80 rounded-2xl p-3 flex items-center space-x-3 mb-5">
              <img
                src={targetUser.avatar}
                alt={targetUser.name}
                className="w-12 h-12 rounded-xl object-cover border border-slate-700"
              />
              <div className="flex-1">
                <h4 className="text-xs font-bold text-white">{targetUser.name}, {targetUser.age}</h4>
                <p className="text-[11px] text-slate-400 font-mono flex items-center gap-1">
                  <Lock className="w-3 h-3 text-rose-400 inline" /> 
                  <span className="blur-sm selection:bg-none">017XXXXXXXX</span> (Hidden)
                </p>
              </div>
              <div className="text-right">
                <span className="text-xs font-extrabold text-emerald-400 block">৳{paymentConfig.unlockFeeBdt}</span>
                <span className="text-[9px] text-slate-400">Unlock Fee</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="mb-5">
              <label className="block text-xs font-bold text-slate-300 mb-2">Select Mobile Banking Method:</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setSelectedMethod('bkash')}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    selectedMethod === 'bkash'
                      ? 'bg-pink-600/20 border-pink-500 text-pink-300 shadow-md shadow-pink-500/10'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-pink-500" />
                    <span className="font-bold text-xs">bKash (বিকাশ)</span>
                  </div>
                  {selectedMethod === 'bkash' && <CheckCircle2 className="w-4 h-4 text-pink-400" />}
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedMethod('nagad')}
                  className={`p-3 rounded-2xl border flex items-center justify-between transition-all ${
                    selectedMethod === 'nagad'
                      ? 'bg-amber-600/20 border-amber-500 text-amber-300 shadow-md shadow-amber-500/10'
                      : 'bg-slate-800/50 border-slate-700/80 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="flex items-center space-x-2">
                    <span className="w-3 h-3 rounded-full bg-amber-500" />
                    <span className="font-bold text-xs">Nagad (নগদ)</span>
                  </div>
                  {selectedMethod === 'nagad' && <CheckCircle2 className="w-4 h-4 text-amber-400" />}
                </button>
              </div>
            </div>

            {/* Merchant / Admin Payment Number Display Box */}
            <div className="bg-gradient-to-r from-slate-800 to-slate-850 border border-slate-700 rounded-2xl p-4 mb-5">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[11px] font-bold text-slate-300">
                  Send ৳{paymentConfig.unlockFeeBdt} to Admin {selectedMethod.toUpperCase()} Number:
                </span>
                <span className="text-[10px] text-emerald-400 font-semibold">Personal / CashOut</span>
              </div>

              <div className="flex items-center justify-between bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2">
                <span className="font-mono text-base font-extrabold text-amber-300 tracking-wider">
                  {currentNumber}
                </span>
                <button
                  type="button"
                  onClick={handleCopy}
                  className="px-3 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
              <p className="text-[10px] text-slate-400 mt-2">
                পেমেন্ট সম্পূর্ণ করার পর প্রাপ্ত TrxID এবং পেমেন্টকৃত মোবাইল নাম্বারটি নিচে জমা দিন।
              </p>
            </div>

            {/* Submit Form */}
            <form onSubmit={handleSubmit} className="space-y-3.5">
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 flex-shrink-0" />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Your Mobile Number (প্রেরক মোবাইল নাম্বার) *
                </label>
                <input
                  type="text"
                  required
                  value={senderPhone}
                  onChange={(e) => setSenderPhone(e.target.value)}
                  placeholder="e.g. 01712345678"
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-300 mb-1">
                  Transaction ID (TrxID / ট্রানজেকশন আইডি) *
                </label>
                <input
                  type="text"
                  required
                  value={trxId}
                  onChange={(e) => setTrxId(e.target.value)}
                  placeholder="e.g. 9A8B7C6D5E"
                  className="w-full bg-slate-800 border border-slate-700/80 rounded-xl px-3.5 py-2 text-xs text-amber-300 font-mono tracking-wide placeholder-slate-500 focus:outline-none focus:border-rose-500 uppercase"
                />
              </div>

              <div className="flex justify-between items-center text-xs text-slate-400 pt-1">
                <span>Total Amount Paid:</span>
                <span className="font-bold text-emerald-400 text-sm">৳{amount} BDT</span>
              </div>

              <button
                type="submit"
                disabled={isSubmitting || !trxId.trim()}
                className="w-full py-3 rounded-2xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 font-bold text-xs text-white shadow-lg shadow-rose-500/20 disabled:opacity-40 transition-all flex items-center justify-center gap-2"
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

            <div className="mt-4 text-center">
              <span className="text-[10px] text-slate-400 flex items-center justify-center gap-1">
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
