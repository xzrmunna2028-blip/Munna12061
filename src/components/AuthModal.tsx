import React, { useState, useEffect, useRef } from 'react';
import { X, Mail, Phone, Lock, User as UserIcon, MapPin, Eye, EyeOff, Sparkles, Flame, CheckCircle, ArrowRight, ShieldCheck, RefreshCw } from 'lucide-react';
import {
  signInWithPopup,
  signInWithPhoneNumber,
  RecaptchaVerifier,
  ConfirmationResult,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../lib/firebase';
import { Gender, LookingFor, User } from '../types';
import { DEFAULT_AVATAR_PLACEHOLDER } from '../data/seedData';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
  }
}

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoginSuccess: (user: User) => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ isOpen, onClose, onLoginSuccess }) => {
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Phone OTP state
  const [otpSent, setOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);

  // Form Fields
  const [identity, setIdentity] = useState(''); // Email or Phone number
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>('female');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [lookingFor, setLookingFor] = useState<LookingFor>('relationship');
  const [avatar, setAvatar] = useState<string>('');

  const avatarInputRef = useRef<HTMLInputElement>(null);

  // Clean up reCAPTCHA on unmount or modal close
  useEffect(() => {
    if (!isOpen) {
      setOtpSent(false);
      setOtpCode('');
      setConfirmationResult(null);
      setError(null);
      setSuccessMsg(null);
    }
  }, [isOpen]);

  const formatPhoneNumber = (phone: string) => {
    let clean = phone.trim().replace(/\s+/g, '');
    if (!clean.startsWith('+')) {
      if (clean.startsWith('0')) {
        clean = '+88' + clean;
      } else {
        clean = '+' + clean;
      }
    }
    return clean;
  };

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          setAvatar(reader.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Helper to sync user to Firestore & Backend
  const syncAndFinalizeUser = async (firebaseUser: any, extraFields?: Partial<User>) => {
    const uid = firebaseUser.uid;
    const userDocRef = doc(db, 'users', uid);
    let userData: User;

    try {
      const snap = await getDoc(userDocRef);
      if (snap.exists()) {
        userData = snap.data() as User;
        // Update online status & last active
        userData.isOnline = true;
        userData.lastActive = 'Active now';
        await setDoc(userDocRef, { isOnline: true, lastActive: 'Active now' }, { merge: true });
      } else {
        const emailVal = firebaseUser.email || (loginMethod === 'email' ? identity : `${firebaseUser.phoneNumber || uid}@trueloveconnect.com`);
        const phoneVal = firebaseUser.phoneNumber || (loginMethod === 'phone' ? formatPhoneNumber(identity) : '');
        const nameVal = extraFields?.name || name || firebaseUser.displayName || 'True Love Connect Member';
        const avatarVal = extraFields?.avatar || avatar || firebaseUser.photoURL || DEFAULT_AVATAR_PLACEHOLDER;

        userData = {
          id: uid,
          userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
          username: (emailVal ? emailVal.split('@')[0] : 'user_' + uid.slice(0, 6)).toLowerCase().replace(/[^a-z0-9_]/g, ''),
          email: emailVal,
          phone: phoneVal,
          name: nameVal,
          age: extraFields?.age || age || 24,
          gender: extraFields?.gender || gender || 'female',
          location: extraFields?.location || location || 'Dhaka, Bangladesh',
          distanceKm: 2,
          bio: 'Glad to be here! Looking for genuine connections.',
          avatar: avatarVal,
          photos: avatarVal ? [avatarVal] : [],
          interests: ['Matchmaking', 'Music', 'Travel'],
          lookingFor: extraFields?.lookingFor || lookingFor || 'relationship',
          status: 'active',
          isOnline: true,
          lastActive: 'Active now',
          verified: true,
          role: 'user',
          privacySettings: {
            hideOnline: false,
            hideDistance: false,
            hideAge: false,
            profileVisibility: 'public'
          },
          createdAt: new Date().toISOString()
        };

        // Save real profile document to Firestore
        await setDoc(userDocRef, userData);
      }

      // Sync with backend memory
      try {
        await fetch('/api/auth/firebase-sync', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ user: userData }),
        });
      } catch (_) {}

      try {
        localStorage.setItem('heartsync_current_user', JSON.stringify(userData));
      } catch (_) {}

      onLoginSuccess(userData);
      onClose();
    } catch (err: any) {
      console.error('Firestore user sync error:', err);
      throw new Error(err.message || 'Failed to initialize profile in database');
    }
  };

  // Google Sign-In via Firebase Auth Popup (Displays Google account selection popup)
  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      googleProvider.setCustomParameters({
        prompt: 'select_account'
      });
      const result = await signInWithPopup(auth, googleProvider);
      if (result.user) {
        await syncAndFinalizeUser(result.user);
      }
    } catch (err: any) {
      console.error('Google Sign-In Error:', err);
      if (err.code === 'auth/popup-closed-by-user') {
        setError('Google sign in was cancelled.');
      } else if (err.code === 'auth/cancelled-popup-request') {
        setError('Popup request cancelled. Please try again.');
      } else {
        setError(err.message || 'Google sign-in failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Setup invisible reCAPTCHA for Phone OTP
  const setupRecaptcha = () => {
    if (!window.recaptchaVerifier) {
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        size: 'invisible',
        callback: () => {
          // reCAPTCHA solved
        },
        'expired-callback': () => {
          setError('reCAPTCHA expired. Please try sending OTP again.');
        }
      });
    }
  };

  // Send Phone SMS OTP Code via Firebase Auth
  const handleSendPhoneOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identity) {
      setError('Please enter your phone number.');
      return;
    }

    const formattedPhone = formatPhoneNumber(identity);
    setError(null);
    setLoading(true);

    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier!;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setOtpSent(true);
      setSuccessMsg(`OTP code has been sent to ${formattedPhone}. Please check your SMS.`);
    } catch (err: any) {
      console.error('Phone OTP Send Error:', err);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = undefined;
      }
      if (err.code === 'auth/invalid-phone-number') {
        setError('Invalid phone number format. Please include country code e.g. +8801700000000.');
      } else if (err.code === 'auth/too-many-requests') {
        setError('Too many requests. Please wait a few minutes before trying again.');
      } else {
        setError(err.message || 'Failed to send SMS OTP. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Verify Phone OTP
  const handleVerifyOTP = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!otpCode || otpCode.length < 6) {
      setError('Please enter the 6-digit OTP code received via SMS.');
      return;
    }

    if (!confirmationResult) {
      setError('Session expired. Please request a new OTP code.');
      return;
    }

    setError(null);
    setLoading(true);

    try {
      const userCredential = await confirmationResult.confirm(otpCode);
      if (userCredential.user) {
        await syncAndFinalizeUser(userCredential.user, {
          name,
          age,
          gender,
          location,
          lookingFor,
          avatar
        });
      }
    } catch (err: any) {
      console.error('OTP Verification Error:', err);
      if (err.code === 'auth/invalid-verification-code') {
        setError('Incorrect OTP code. Please double check the code sent to your phone.');
      } else {
        setError(err.message || 'OTP verification failed.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Submit Form for Email/Password or Phone
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // If Phone Login method and OTP not sent yet
    if (loginMethod === 'phone') {
      if (!otpSent) {
        return handleSendPhoneOTP(e);
      } else {
        return handleVerifyOTP(e);
      }
    }

    // Email & Password Auth
    setLoading(true);
    try {
      if (!identity || !password) {
        throw new Error('Email address and password are required.');
      }

      let firebaseUser: any = null;

      if (mode === 'login') {
        const userCred = await signInWithEmailAndPassword(auth, identity, password);
        firebaseUser = userCred.user;
      } else {
        // Register mode
        const userCred = await createUserWithEmailAndPassword(auth, identity, password);
        firebaseUser = userCred.user;
      }

      if (firebaseUser) {
        await syncAndFinalizeUser(firebaseUser, {
          name,
          age,
          gender,
          location,
          lookingFor,
          avatar
        });
      }
    } catch (err: any) {
      console.error('Email Auth Error:', err);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email address or password.');
      } else if (err.code === 'auth/email-already-in-use') {
        setError('An account with this email address already exists. Please log in instead.');
      } else if (err.code === 'auth/weak-password') {
        setError('Password should be at least 6 characters long.');
      } else {
        setError(err.message || 'Authentication failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in overflow-y-auto">
      {/* Invisible reCAPTCHA container for Firebase Phone Auth */}
      <div id="recaptcha-container"></div>

      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white my-8">
        
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-2 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="text-center mb-6">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-rose-500 to-pink-500 mx-auto flex items-center justify-center shadow-lg shadow-rose-500/30 mb-3">
            <Flame className="w-7 h-7 text-white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight">
            {mode === 'login' ? 'Welcome Back to True Love Connect' : 'Create Your True Love Connect Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Find genuine connections and start chatting with matches'
              : 'Sign up in seconds and discover people nearby'}
          </p>
        </div>

        {/* Success Alert */}
        {successMsg && (
          <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
            <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Continue with Google Button (Prompts Google account selection screen) */}
        {!otpSent && (
          <>
            <button
              type="button"
              onClick={handleGoogleLogin}
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-xl bg-white hover:bg-slate-100 text-slate-900 font-semibold text-xs flex items-center justify-center space-x-2 transition-all shadow-md active:scale-98 disabled:opacity-50 mb-4"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
            </button>

            <div className="relative flex py-1 items-center mb-4">
              <div className="flex-grow border-t border-slate-800"></div>
              <span className="flex-shrink mx-3 text-[10px] text-slate-500 font-medium uppercase tracking-wider">or continue with</span>
              <div className="flex-grow border-t border-slate-800"></div>
            </div>
          </>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Method Selector (Email vs Phone) */}
          {!otpSent && (
            <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
              <button
                type="button"
                onClick={() => { setLoginMethod('email'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  loginMethod === 'email' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Mail className="w-3.5 h-3.5" />
                <span>Email</span>
              </button>
              <button
                type="button"
                onClick={() => { setLoginMethod('phone'); setError(null); }}
                className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                  loginMethod === 'phone' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Phone className="w-3.5 h-3.5" />
                <span>Phone Number (Real OTP)</span>
              </button>
            </div>
          )}

          {/* Registration Extra Fields */}
          {mode === 'register' && !otpSent && (
            <>
              {/* Profile Photo Picker from Gallery */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  Profile Photo (Add photo from gallery)
                </label>
                <input
                  type="file"
                  ref={avatarInputRef}
                  onChange={handleAvatarChange}
                  accept="image/*"
                  className="hidden"
                />
                <div className="flex items-center space-x-3">
                  {avatar ? (
                    <img src={avatar} alt="Profile" className="w-14 h-14 rounded-full object-cover border-2 border-rose-500 shadow-md" />
                  ) : (
                    <div className="w-14 h-14 rounded-full bg-slate-700 border border-slate-600 flex items-center justify-center text-slate-400">
                      <UserIcon className="w-6 h-6" />
                    </div>
                  )}
                  <button
                    type="button"
                    onClick={() => avatarInputRef.current?.click()}
                    className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 text-white text-xs font-bold shadow flex items-center space-x-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    <span>Upload Photo from Gallery</span>
                  </button>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Full Name <span className="text-rose-400">*</span>
                </label>
                <div className="relative">
                  <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Jessica Parker"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Age <span className="text-rose-400">*</span></label>
                  <input
                    type="number"
                    min={18}
                    max={80}
                    required
                    value={age}
                    onChange={(e) => setAge(Number(e.target.value))}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Gender <span className="text-rose-400">*</span></label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                  >
                    <option value="female">Female</option>
                    <option value="male">Male</option>
                    <option value="non-binary">Non-Binary</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Location <span className="text-rose-400">*</span></label>
                <div className="relative">
                  <MapPin className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  <input
                    type="text"
                    required
                    value={location}
                    onChange={(e) => setLocation(e.target.value)}
                    placeholder="e.g. Dhaka, Bangladesh"
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Looking For <span className="text-rose-400">*</span></label>
                <select
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value as LookingFor)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
                >
                  <option value="relationship">Long-term Relationship</option>
                  <option value="dating">Casual Dating</option>
                  <option value="friendship">New Friends</option>
                  <option value="casual">Casual Hangout</option>
                </select>
              </div>
            </>
          )}

          {/* If OTP Sent -> Show OTP Verification UI */}
          {otpSent ? (
            <div className="space-y-4 animate-fade-in bg-slate-800/80 p-4 rounded-2xl border border-slate-700">
              <div className="flex items-center justify-between">
                <div>
                  <span className="text-xs font-bold text-slate-200">Phone Verification</span>
                  <p className="text-[11px] text-slate-400">Enter the 6-digit SMS code sent to {formatPhoneNumber(identity)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => { setOtpSent(false); setOtpCode(''); setError(null); }}
                  className="text-[11px] text-rose-400 hover:underline flex items-center gap-1"
                >
                  <RefreshCw className="w-3 h-3" />
                  <span>Change Number</span>
                </button>
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  required
                  value={otpCode}
                  onChange={(e) => setOtpCode(e.target.value)}
                  placeholder="123456"
                  className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-2.5 text-center text-lg tracking-widest font-mono text-white placeholder-slate-600 focus:outline-none focus:border-rose-500"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all transform active:scale-98 disabled:opacity-50 flex items-center justify-center space-x-2"
              >
                <span>{loading ? 'Verifying OTP...' : 'Verify OTP & Sign In'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <>
              {/* Identity Field (Email or Phone) */}
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  {loginMethod === 'email' ? 'Email Address' : 'Phone Number (With country code e.g. +8801700000000)'}
                </label>
                <div className="relative">
                  {loginMethod === 'email' ? (
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  ) : (
                    <Phone className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                  )}
                  <input
                    type={loginMethod === 'email' ? 'email' : 'tel'}
                    required
                    value={identity}
                    onChange={(e) => setIdentity(e.target.value)}
                    placeholder={loginMethod === 'email' ? 'alex@example.com' : '01700000000 or +8801700000000'}
                    className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                  />
                </div>
              </div>

              {/* Password Field (Only for Email method) */}
              {loginMethod === 'email' && (
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">Password</label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-3 text-slate-400 hover:text-slate-200"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              )}

              {/* Submit Button */}
              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all transform active:scale-98 disabled:opacity-50"
              >
                {loading
                  ? 'Processing...'
                  : loginMethod === 'phone'
                  ? 'Send SMS OTP Code'
                  : mode === 'login'
                  ? 'Sign In'
                  : 'Create Account'}
              </button>
            </>
          )}

        </form>

        {/* Toggle Mode Footer */}
        {!otpSent && (
          <div className="mt-5 text-center text-xs text-slate-400 border-t border-slate-800 pt-4">
            {mode === 'login' ? (
              <p>
                Don't have an account yet?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('register'); setError(null); }}
                  className="text-rose-400 font-semibold hover:underline"
                >
                  Sign Up
                </button>
              </p>
            ) : (
              <p>
                Already registered?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('login'); setError(null); }}
                  className="text-rose-400 font-semibold hover:underline"
                >
                  Log In
                </button>
              </p>
            )}
          </div>
        )}

      </div>
    </div>
  );
};
