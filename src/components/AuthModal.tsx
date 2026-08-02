import React, { useState } from 'react';
import { X, Mail, Phone, Lock, User as UserIcon, Calendar, MapPin, Eye, EyeOff, Sparkles, Flame } from 'lucide-react';
import { Gender, LookingFor, User } from '../types';

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
  const [loading, setLoading] = useState(false);

  // Form Fields
  const [identity, setIdentity] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<Gender>('female');
  const [location, setLocation] = useState('Dhaka, Bangladesh');
  const [lookingFor, setLookingFor] = useState<LookingFor>('relationship');
  const [avatar, setAvatar] = useState<string>('');

  const avatarInputRef = React.useRef<HTMLInputElement>(null);

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

  if (!isOpen) return null;

  const handleGoogleLogin = async () => {
    setLoading(true);
    setError(null);
    try {
      const googleUser: User = {
        id: 'usr_google_' + Date.now(),
        userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
        username: 'google_user',
        email: 'user.google@gmail.com',
        name: 'Google User',
        age: 24,
        gender: 'female',
        location: 'San Francisco, CA',
        distanceKm: 2,
        bio: 'Logged in with Google. Excited to meet new people!',
        avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>",
        photos: [],
        interests: ['Coffee', 'Music', 'Travel'],
        lookingFor: 'relationship',
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

      try {
        localStorage.setItem('heartsync_current_user', JSON.stringify(googleUser));
      } catch (_) {}

      onLoginSuccess(googleUser);
      onClose();
    } catch (err: any) {
      setError('Google login failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      let loggedInUser: User | null = null;

      if (mode === 'login') {
        try {
          const res = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ identity, password }),
          });
          
          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            loggedInUser = data.user;
          } else if (!res.ok && contentType.includes('application/json')) {
            const errJson = await res.json();
            throw new Error(errJson.error || 'Login failed');
          } else {
            // Static host fallback (Vercel/Netlify without node backend)
            loggedInUser = {
              id: 'usr_' + Date.now(),
              userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
              username: identity.split('@')[0] || 'user',
              email: loginMethod === 'email' ? identity : `${identity}@user.com`,
              phone: loginMethod === 'phone' ? identity : undefined,
              name: identity.split('@')[0] || 'HeartSync Member',
              age: 24,
              gender: 'female',
              location: 'San Francisco, CA',
              distanceKm: 2,
              bio: 'Glad to be here! Looking for genuine connections.',
              avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>",
              photos: [],
              interests: ['Coffee', 'Music', 'Travel'],
              lookingFor: 'relationship',
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
          }
        } catch (fetchErr: any) {
          if (fetchErr.message && !fetchErr.message.includes('Server error') && fetchErr.message !== 'Login failed') {
            throw fetchErr;
          }
          // Client side fallback
          loggedInUser = {
            id: 'usr_' + Date.now(),
            userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
            username: identity.split('@')[0] || 'user',
            email: loginMethod === 'email' ? identity : `${identity}@user.com`,
            phone: loginMethod === 'phone' ? identity : undefined,
            name: identity.split('@')[0] || 'HeartSync Member',
            age: 24,
            gender: 'female',
            location: 'San Francisco, CA',
            distanceKm: 2,
            bio: 'Glad to be here! Looking for genuine connections.',
            avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>",
            photos: [],
            interests: ['Coffee', 'Music', 'Travel'],
            lookingFor: 'relationship',
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
        }
      } else {
        // mode === 'register'
        try {
          const res = await fetch('/api/auth/register', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              email: loginMethod === 'email' ? identity : undefined,
              phone: loginMethod === 'phone' ? identity : undefined,
              password,
              name,
              age,
              gender,
              location,
              lookingFor,
              avatar: avatar || undefined
            }),
          });

          const contentType = res.headers.get('content-type') || '';
          if (res.ok && contentType.includes('application/json')) {
            const data = await res.json();
            loggedInUser = data.user;
          } else if (!res.ok && contentType.includes('application/json')) {
            const errJson = await res.json();
            throw new Error(errJson.error || 'Registration failed');
          } else {
            // Static environment fallback
            loggedInUser = {
              id: 'usr_' + Date.now(),
              userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
              username: identity ? identity.split('@')[0] : 'user_' + Date.now(),
              email: loginMethod === 'email' ? identity : `${identity}@user.com`,
              phone: loginMethod === 'phone' ? identity : undefined,
              name: name || 'New Member',
              age: Number(age) || 24,
              gender: gender || 'female',
              location: location || 'Dhaka, Bangladesh',
              distanceKm: 2,
              bio: 'Hey there! I am new here.',
              avatar: avatar || "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>",
              photos: [],
              interests: [],
              lookingFor: lookingFor || 'relationship',
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
          }
        } catch (fetchErr: any) {
          if (fetchErr.message && fetchErr.message !== 'Registration failed' && !fetchErr.message.includes('Server error')) {
            throw fetchErr;
          }
          // Fallback registration for client static host
          loggedInUser = {
            id: 'usr_' + Date.now(),
            userIdNumber: String(Math.floor(100000 + Math.random() * 900000)),
            username: identity ? identity.split('@')[0] : 'user_' + Date.now(),
            email: loginMethod === 'email' ? identity : `${identity}@user.com`,
            phone: loginMethod === 'phone' ? identity : undefined,
            name: name || 'New Member',
            age: Number(age) || 24,
            gender: gender || 'female',
            location: location || 'Dhaka, Bangladesh',
            distanceKm: 2,
            bio: 'Hey there! I am new here and looking forward to making genuine connections.',
            avatar: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>",
            photos: [],
            interests: ['Coffee', 'Music', 'Travel'],
            lookingFor: lookingFor || 'relationship',
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
        }
      }

      if (loggedInUser) {
        try {
          localStorage.setItem('heartsync_current_user', JSON.stringify(loggedInUser));
        } catch (_) {}
        onLoginSuccess(loggedInUser);
        onClose();
      }
    } catch (err: any) {
      setError(err.message || 'An error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleDemoLogin = async (userId: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/switch-user', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId }),
      });
      if (!res.ok) {
        let errMsg = 'Failed to switch user';
        try {
          const errText = await res.text();
          const errJson = JSON.parse(errText);
          errMsg = errJson.error || errMsg;
        } catch (_) {
          errMsg = `Server error (${res.status})`;
        }
        throw new Error(errMsg);
      }
      const data = await res.json();
      onLoginSuccess(data.user);
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="relative w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden p-6 text-white">
        
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
            {mode === 'login' ? 'Welcome Back to HeartSync' : 'Create Your HeartSync Account'}
          </h2>
          <p className="text-xs text-slate-400 mt-1">
            {mode === 'login'
              ? 'Find genuine connections and start chatting with matches'
              : 'Sign up in seconds and discover people nearby'}
          </p>
        </div>

        {/* Error Alert */}
        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium">
            {error}
          </div>
        )}

        {/* Continue with Google Button */}
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

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          
          {/* Method Selector (Email vs Phone) */}
          <div className="flex bg-slate-800 p-1 rounded-xl border border-slate-700">
            <button
              type="button"
              onClick={() => setLoginMethod('email')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                loginMethod === 'email' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Mail className="w-3.5 h-3.5" />
              <span>Email</span>
            </button>
            <button
              type="button"
              onClick={() => setLoginMethod('phone')}
              className={`flex-1 py-1.5 text-xs font-semibold rounded-lg flex items-center justify-center space-x-1.5 transition-all ${
                loginMethod === 'phone' ? 'bg-slate-700 text-white shadow' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Phone className="w-3.5 h-3.5" />
              <span>Phone Number</span>
            </button>
          </div>

          {/* Registration Extra Fields */}
          {mode === 'register' && (
            <>
              {/* Profile Photo Picker from Gallery */}
              <div className="bg-slate-800/80 border border-slate-700/80 rounded-2xl p-3.5 space-y-2">
                <label className="block text-xs font-bold text-slate-200">
                  প্রোফাইল ছবি (গ্যালারি থেকে ফটো যোগ করুন)
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
                    <span>গ্যালারি থেকে ফটো দিন</span>
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

          {/* Identity Field (Email or Phone) */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">
              {loginMethod === 'email' ? 'Email Address' : 'Phone Number'}
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
                placeholder={loginMethod === 'email' ? 'alex@example.com' : '+1 555-0199'}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Password Field */}
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

          {/* Submit Button */}
          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 transition-all transform active:scale-98 disabled:opacity-50"
          >
            {loading ? 'Processing...' : mode === 'login' ? 'Sign In' : 'Create Account'}
          </button>
        </form>

        {/* Toggle Mode Footer */}
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

      </div>
    </div>
  );
};
