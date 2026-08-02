import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Calendar, Heart, Globe, MapPin, Briefcase, 
  GraduationCap, Sparkles, Camera, Check, ChevronRight, ChevronLeft,
  Lock, AlertCircle, ShieldCheck, X, Image as ImageIcon
} from 'lucide-react';
import { User } from '../types';
import { calculateAgeFromDOB, calculateProfileCompletion, generateRandomUserId } from '../lib/profileCompletion';

interface OnboardingWizardProps {
  currentUser: User;
  onUpdateUser: (updatedData: Partial<User>) => Promise<void> | void;
  onComplete: () => void;
  onClose?: () => void;
  initialStage?: 'signup' | 'setup';
}

const COUNTRIES_LIST = [
  { name: 'Bangladesh', flag: '🇧🇩', code: '+880' },
  { name: 'United States', flag: '🇺🇸', code: '+1' },
  { name: 'United Kingdom', flag: '🇬🇧', code: '+44' },
  { name: 'Canada', flag: '🇨🇦', code: '+1' },
  { name: 'Australia', flag: '🇦🇺', code: '+61' },
  { name: 'India', flag: '🇮🇳', code: '+91' },
  { name: 'United Arab Emirates', flag: '🇦🇪', code: '+971' },
  { name: 'Saudi Arabia', flag: '🇸🇦', code: '+966' },
  { name: 'Germany', flag: '🇩🇪', code: '+49' },
  { name: 'Singapore', flag: '🇸🇬', code: '+65' },
];

const PRESET_HOBBIES = [
  'Photography', 'Travel', 'Coffee', 'Hiking', 'Yoga', 'Art',
  'Music', 'Fitness', 'Cooking', 'Reading', 'Tech', 'Gaming',
  'Dogs', 'Cats', 'Dancing', 'Cricket', 'Movies', 'Gardening'
];

export const OnboardingWizard: React.FC<OnboardingWizardProps> = ({
  currentUser,
  onUpdateUser,
  onComplete,
  onClose,
  initialStage = 'setup',
}) => {
  const [step, setStep] = useState<number>(1);
  const [isSaving, setIsSaving] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Form State
  const [formData, setFormData] = useState<Partial<User>>({
    name: currentUser.name || '',
    username: currentUser.username || currentUser.name?.toLowerCase().replace(/\s+/g, '_') || '',
    userIdNumber: currentUser.userIdNumber || generateRandomUserId(),
    dateOfBirth: currentUser.dateOfBirth || '2000-01-01',
    age: currentUser.age || 26,
    gender: currentUser.gender || 'female',
    lookingFor: currentUser.lookingFor || 'relationship',
    maritalStatus: currentUser.maritalStatus || 'Single',
    relationshipStatus: currentUser.relationshipStatus || 'Marriage',
    religion: currentUser.religion || 'Islam',
    height: currentUser.height || "5'6\"",
    country: currentUser.country || 'Bangladesh',
    countryFlag: currentUser.countryFlag || '🇧🇩',
    divisionCity: currentUser.divisionCity || 'Dhaka / Banani',
    fullAddress: currentUser.fullAddress || '',
    postalCode: currentUser.postalCode || '',
    phone: currentUser.phone || '',
    email: currentUser.email || '',
    education: currentUser.education || '',
    profession: currentUser.profession || '',
    languages: currentUser.languages || ['Bengali', 'English'],
    smoking: currentUser.smoking || 'Non-smoker',
    drinking: currentUser.drinking || 'Non-drinker',
    bio: currentUser.bio || '',
    avatar: currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    photos: currentUser.photos && currentUser.photos.length > 0 
      ? currentUser.photos 
      : [currentUser.avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400'],
    interests: currentUser.interests || ['Travel', 'Coffee', 'Music'],
  });

  const [newPhotoInput, setNewPhotoInput] = useState('');

  // Calculate live completion
  const completion = calculateProfileCompletion(formData);

  const handleInputChange = (field: keyof User, value: any) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value };
      if (field === 'dateOfBirth') {
        const calculatedAge = calculateAgeFromDOB(value);
        updated.age = calculatedAge;
      }
      return updated;
    });
    setErrorMessage(null);
  };

  const validateStep = (currentStep: number): boolean => {
    if (currentStep === 1) {
      if (!formData.name?.trim()) {
        setErrorMessage('Full name is required');
        return false;
      }
      if (!formData.username?.trim()) {
        setErrorMessage('Unique username is required');
        return false;
      }
      if (formData.dateOfBirth) {
        const age = calculateAgeFromDOB(formData.dateOfBirth);
        if (age < 18) {
          setErrorMessage('You must be at least 18 years old to join.');
          return false;
        }
      }
    } else if (currentStep === 2) {
      if (!formData.maritalStatus) {
        setErrorMessage('Please select your marital status');
        return false;
      }
      if (!formData.religion) {
        setErrorMessage('Please select your religion');
        return false;
      }
    } else if (currentStep === 3) {
      if (!formData.country) {
        setErrorMessage('Please select your country');
        return false;
      }
      if (!formData.divisionCity?.trim()) {
        setErrorMessage('Please specify your Division / District / City');
        return false;
      }
      if (!formData.fullAddress?.trim()) {
        setErrorMessage('Full street address is required for profile verification (kept private)');
        return false;
      }
      if (!formData.phone?.trim()) {
        setErrorMessage('Contact phone number is required');
        return false;
      }
    } else if (currentStep === 4) {
      if (!formData.education?.trim()) {
        setErrorMessage('Please specify your educational qualification');
        return false;
      }
      if (!formData.profession?.trim()) {
        setErrorMessage('Please specify your profession or occupation');
        return false;
      }
    } else if (currentStep === 5) {
      if (!formData.bio?.trim()) {
        setErrorMessage('Please write a short bio about yourself');
        return false;
      }
      if (!formData.avatar) {
        setErrorMessage('A main profile photo is required');
        return false;
      }
      if (!formData.photos || formData.photos.length < 2) {
        setErrorMessage('Please add at least 2 profile photos (up to 10)');
        return false;
      }
    }
    return true;
  };

  const handleNextStep = async () => {
    if (!validateStep(step)) return;

    if (step < 5) {
      setStep((prev) => prev + 1);
    } else {
      // Final Save
      setIsSaving(true);
      try {
        const calculatedAge = formData.dateOfBirth ? calculateAgeFromDOB(formData.dateOfBirth) : formData.age;
        const updatedCompletion = calculateProfileCompletion({ ...formData, age: calculatedAge });
        
        await onUpdateUser({
          ...formData,
          age: calculatedAge,
          location: `${formData.divisionCity || 'Dhaka'}, ${formData.country || 'Bangladesh'}`,
          profileCompletionPercentage: updatedCompletion.percentage,
        });
        setIsSaving(false);
        onComplete();
      } catch (err) {
        setIsSaving(false);
        setErrorMessage('Failed to save profile. Please try again.');
      }
    }
  };

  const handleAddPhoto = () => {
    if (!newPhotoInput.trim()) return;
    if ((formData.photos?.length || 0) >= 10) {
      setErrorMessage('Maximum 10 photos allowed.');
      return;
    }
    const current = formData.photos || [];
    handleInputChange('photos', [...current, newPhotoInput.trim()]);
    setNewPhotoInput('');
  };

  const handleRemovePhoto = (indexToRemove: number) => {
    const current = formData.photos || [];
    const updated = current.filter((_, idx) => idx !== indexToRemove);
    handleInputChange('photos', updated);
    if (updated.length > 0 && formData.avatar === current[indexToRemove]) {
      handleInputChange('avatar', updated[0]);
    }
  };

  const toggleInterest = (interest: string) => {
    const current = formData.interests || [];
    if (current.includes(interest)) {
      handleInputChange('interests', current.filter(i => i !== interest));
    } else {
      handleInputChange('interests', [...current, interest]);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 overflow-y-auto">
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 20 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 20 }}
        className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden my-8"
      >
        {/* Header Bar */}
        <div className="bg-gradient-to-r from-rose-600 via-pink-600 to-amber-600 p-6 text-white relative">
          {onClose && (
            <button 
              onClick={onClose}
              className="absolute top-4 right-4 text-white/80 hover:text-white bg-black/20 hover:bg-black/40 p-2 rounded-full transition"
            >
              <X size={18} />
            </button>
          )}

          <div className="flex items-center space-x-2 text-rose-200 text-xs font-semibold uppercase tracking-wider mb-1">
            <Sparkles size={14} className="animate-pulse" />
            <span>Smart Profile Guidance System</span>
          </div>
          <h2 className="text-2xl font-bold">Set Up Your Profile</h2>
          <p className="text-sm text-rose-100/90 mt-1">
            Complete all details to maximize matches & unlock verified status.
          </p>

          {/* Progress Bar */}
          <div className="mt-4 bg-black/20 backdrop-blur-sm rounded-xl p-3 border border-white/10">
            <div className="flex items-center justify-between text-xs mb-1.5 font-medium">
              <span>Step {step} of 5: {
                step === 1 ? 'Basic Info' :
                step === 2 ? 'Personal & Culture' :
                step === 3 ? 'Location & Address' :
                step === 4 ? 'Background & Lifestyle' : 'Photos & Bio'
              }</span>
              <span className="font-bold text-amber-300">{completion.percentage}% Complete</span>
            </div>
            <div className="w-full bg-black/30 h-2 rounded-full overflow-hidden">
              <motion.div 
                className="h-full bg-gradient-to-r from-amber-400 to-emerald-400"
                initial={{ width: 0 }}
                animate={{ width: `${completion.percentage}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>
            <p className="text-xs text-white/80 mt-2 flex items-center gap-1.5">
              <ShieldCheck size={14} className="text-emerald-300 shrink-0" />
              <span>{completion.guidanceMessage}</span>
            </p>
          </div>
        </div>

        {/* Step Indicator Bullets */}
        <div className="flex border-b border-slate-800 bg-slate-900/50 px-6 py-3 space-x-2 overflow-x-auto">
          {[1, 2, 3, 4, 5].map((s) => (
            <button
              key={s}
              onClick={() => {
                if (s < step || validateStep(step)) setStep(s);
              }}
              className={`flex-1 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center space-x-1.5 transition ${
                step === s
                  ? 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                  : step > s
                  ? 'bg-emerald-500/10 text-emerald-400'
                  : 'text-slate-500 hover:text-slate-400'
              }`}
            >
              <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${
                step === s ? 'bg-rose-500 text-white font-bold' : step > s ? 'bg-emerald-500 text-white' : 'bg-slate-800 text-slate-400'
              }`}>
                {step > s ? '✓' : s}
              </span>
              <span className="hidden sm:inline">
                {s === 1 ? 'Basic' : s === 2 ? 'Personal' : s === 3 ? 'Address' : s === 4 ? 'Lifestyle' : 'Photos'}
              </span>
            </button>
          ))}
        </div>

        {/* Form Body */}
        <div className="p-6 space-y-6 max-h-[60vh] overflow-y-auto">
          {errorMessage && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-400 text-sm flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <AnimatePresence mode="wait">
            {/* STEP 1: Basic Information */}
            {step === 1 && (
              <motion.div 
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <UserIcon size={18} className="text-rose-400" />
                    Basic Profile Information
                  </h3>
                  <p className="text-xs text-slate-400">Step 1 of 5 • Basic identity and account details</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Name <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.name || ''} 
                      onChange={(e) => handleInputChange('name', e.target.value)}
                      placeholder="e.g. Alex Vance"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Unique Username <span className="text-rose-400">*</span>
                    </label>
                    <div className="relative">
                      <span className="absolute left-3.5 top-2.5 text-slate-500 text-sm">@</span>
                      <input 
                        type="text" 
                        value={formData.username || ''} 
                        onChange={(e) => handleInputChange('username', e.target.value.toLowerCase().replace(/\s+/g, '_'))}
                        placeholder="alex_vance"
                        className="w-full bg-slate-800/80 border border-slate-700 rounded-xl pl-8 pr-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Date of Birth (18+ Required) <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="date" 
                      value={formData.dateOfBirth || ''} 
                      onChange={(e) => handleInputChange('dateOfBirth', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                    {formData.dateOfBirth && (
                      <p className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                        <Check size={12} />
                        Auto-calculated Age: {calculateAgeFromDOB(formData.dateOfBirth)} years old
                      </p>
                    )}
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Auto User ID Number
                    </label>
                    <input 
                      type="text" 
                      readOnly 
                      value={`#${formData.userIdNumber}`}
                      className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3.5 py-2.5 text-slate-400 text-sm font-mono"
                    />
                    <p className="text-[10px] text-slate-500 mt-1">Unique system identification code</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Gender <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.gender || 'female'} 
                      onChange={(e) => handleInputChange('gender', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="non-binary">Non-binary</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Looking For <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.lookingFor || 'relationship'} 
                      onChange={(e) => handleInputChange('lookingFor', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="relationship">Long-term Relationship</option>
                      <option value="dating">Dating</option>
                      <option value="friendship">Friendship</option>
                      <option value="casual">Casual</option>
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 2: Personal & Culture */}
            {step === 2 && (
              <motion.div 
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Heart size={18} className="text-rose-400" />
                    Personal & Cultural Background
                  </h3>
                  <p className="text-xs text-slate-400">Step 2 of 5 • Values, belief, and relationship goals</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Marital Status <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.maritalStatus || 'Single'} 
                      onChange={(e) => handleInputChange('maritalStatus', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="Single">Single</option>
                      <option value="Married">Married</option>
                      <option value="Divorced">Divorced</option>
                      <option value="Widowed">Widowed</option>
                      <option value="Separated">Separated</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Relationship Goal <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.relationshipStatus || 'Marriage'} 
                      onChange={(e) => handleInputChange('relationshipStatus', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="Marriage">Seeking Marriage</option>
                      <option value="Long-term Relationship">Long-term Relationship</option>
                      <option value="Casual Dating">Casual Dating</option>
                      <option value="Friendship">Friendship & Networking</option>
                    </select>
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Religion / Faith <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.religion || 'Islam'} 
                      onChange={(e) => handleInputChange('religion', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="Islam">Islam</option>
                      <option value="Hinduism">Hinduism</option>
                      <option value="Christianity">Christianity</option>
                      <option value="Buddhism">Buddhism</option>
                      <option value="Secular">Secular / Non-religious</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Height <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.height || ''} 
                      onChange={(e) => handleInputChange('height', e.target.value)}
                      placeholder='e.g. 5&#39;8" or 173 cm'
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 3: Location & Address */}
            {step === 3 && (
              <motion.div 
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <MapPin size={18} className="text-rose-400" />
                    Location & Contact Address
                  </h3>
                  <p className="text-xs text-slate-400">Step 3 of 5 • Public location & private verified address</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Country <span className="text-rose-400">*</span>
                    </label>
                    <select 
                      value={formData.country || 'Bangladesh'} 
                      onChange={(e) => {
                        const selectedC = COUNTRIES_LIST.find(c => c.name === e.target.value);
                        handleInputChange('country', e.target.value);
                        if (selectedC) {
                          handleInputChange('countryFlag', selectedC.flag);
                        }
                      }}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      {COUNTRIES_LIST.map((c) => (
                        <option key={c.name} value={c.name}>
                          {c.flag} {c.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Division / District / City <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.divisionCity || ''} 
                      onChange={(e) => handleInputChange('divisionCity', e.target.value)}
                      placeholder="e.g. Dhaka / Banani"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                {/* Private Section Box */}
                <div className="bg-slate-950/60 p-4 rounded-xl border border-rose-500/20 space-y-3">
                  <div className="flex items-center space-x-2 text-rose-400 text-xs font-semibold">
                    <Lock size={14} />
                    <span>Private Details (Hidden from public profile until matched)</span>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Full Street Address <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.fullAddress || ''} 
                      onChange={(e) => handleInputChange('fullAddress', e.target.value)}
                      placeholder="e.g. House 42, Road 11, Block D, Banani"
                      className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Postal Code <span className="text-rose-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.postalCode || ''} 
                        onChange={(e) => handleInputChange('postalCode', e.target.value)}
                        placeholder="e.g. 1213"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-300 mb-1">
                        Phone Number <span className="text-rose-400">*</span>
                      </label>
                      <input 
                        type="text" 
                        value={formData.phone || ''} 
                        onChange={(e) => handleInputChange('phone', e.target.value)}
                        placeholder="e.g. +880 1711-223344"
                        className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                      />
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 4: Background & Lifestyle */}
            {step === 4 && (
              <motion.div 
                key="step4"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Briefcase size={18} className="text-rose-400" />
                    Career, Education & Lifestyle
                  </h3>
                  <p className="text-xs text-slate-400">Step 4 of 5 • Education, job title & daily habits</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Education / Degree <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.education || ''} 
                      onChange={(e) => handleInputChange('education', e.target.value)}
                      placeholder="e.g. B.Sc. in Computer Science - NSU"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Profession / Job Title <span className="text-rose-400">*</span>
                    </label>
                    <input 
                      type="text" 
                      value={formData.profession || ''} 
                      onChange={(e) => handleInputChange('profession', e.target.value)}
                      placeholder="e.g. Software Engineer / Architect"
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Smoking Habits
                    </label>
                    <select 
                      value={formData.smoking || 'Non-smoker'} 
                      onChange={(e) => handleInputChange('smoking', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="Non-smoker">Non-smoker</option>
                      <option value="Occasional">Occasional</option>
                      <option value="Smoker">Smoker</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-slate-300 mb-1">
                      Drinking Habits
                    </label>
                    <select 
                      value={formData.drinking || 'Non-drinker'} 
                      onChange={(e) => handleInputChange('drinking', e.target.value)}
                      className="w-full bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2.5 text-white text-sm focus:outline-none focus:border-rose-500"
                    >
                      <option value="Non-drinker">Non-drinker</option>
                      <option value="Socially">Socially</option>
                      <option value="Regular">Regular</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Select Hobbies & Interests <span className="text-rose-400">*</span>
                  </label>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {PRESET_HOBBIES.map((hobby) => {
                      const isSelected = formData.interests?.includes(hobby);
                      return (
                        <button
                          key={hobby}
                          type="button"
                          onClick={() => toggleInterest(hobby)}
                          className={`px-3 py-1.5 rounded-full text-xs font-medium transition ${
                            isSelected 
                              ? 'bg-rose-500 text-white shadow-md shadow-rose-500/20' 
                              : 'bg-slate-800 text-slate-300 border border-slate-700 hover:border-slate-500'
                          }`}
                        >
                          {isSelected ? '✓ ' : '+ '}{hobby}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </motion.div>
            )}

            {/* STEP 5: Media & Bio */}
            {step === 5 && (
              <motion.div 
                key="step5"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="space-y-4"
              >
                <div className="border-b border-slate-800 pb-3">
                  <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                    <Camera size={18} className="text-rose-400" />
                    Profile Photos & Bio
                  </h3>
                  <p className="text-xs text-slate-400">Step 5 of 5 • Real profile picture, gallery photos (up to 10) & bio</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">
                    Short Bio / About Me <span className="text-rose-400">*</span>
                  </label>
                  <textarea 
                    rows={3}
                    value={formData.bio || ''} 
                    onChange={(e) => handleInputChange('bio', e.target.value)}
                    placeholder="Write a warm, authentic introduction about yourself..."
                    className="w-full bg-slate-800/80 border border-slate-700 rounded-xl p-3 text-white text-sm focus:outline-none focus:border-rose-500"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="text-xs font-medium text-slate-300">
                      Profile Gallery Photos (Add at least 2, up to 10) <span className="text-rose-400">*</span>
                    </label>
                    <span className="text-xs text-rose-400 font-semibold">
                      {formData.photos?.length || 0} / 10 Photos
                    </span>
                  </div>

                  {/* Photo Previews */}
                  <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 mb-3">
                    {formData.photos?.map((photo, index) => (
                      <div 
                        key={index} 
                        className={`relative group aspect-square rounded-xl overflow-hidden border-2 transition ${
                          formData.avatar === photo ? 'border-rose-500 shadow-md shadow-rose-500/20' : 'border-slate-700'
                        }`}
                      >
                        <img 
                          src={photo} 
                          alt={`Upload ${index + 1}`} 
                          className="w-full h-full object-cover"
                        />
                        {formData.avatar === photo && (
                          <div className="absolute top-1 left-1 bg-rose-500 text-white text-[9px] font-bold px-1.5 py-0.5 rounded-full">
                            Main
                          </div>
                        )}
                        <button
                          type="button"
                          onClick={() => handleRemovePhoto(index)}
                          className="absolute top-1 right-1 bg-black/60 hover:bg-rose-600 text-white p-1 rounded-full opacity-0 group-hover:opacity-100 transition"
                        >
                          <X size={12} />
                        </button>
                        {formData.avatar !== photo && (
                          <button
                            type="button"
                            onClick={() => handleInputChange('avatar', photo)}
                            className="absolute bottom-1 left-1 right-1 bg-slate-900/80 hover:bg-rose-500 text-white text-[9px] font-medium py-0.5 rounded text-center opacity-0 group-hover:opacity-100 transition"
                          >
                            Set Main
                          </button>
                        )}
                      </div>
                    ))}
                  </div>

                  {/* Add Photo Input */}
                  {(formData.photos?.length || 0) < 10 && (
                    <div className="flex items-center gap-2">
                      <input 
                        type="url"
                        value={newPhotoInput}
                        onChange={(e) => setNewPhotoInput(e.target.value)}
                        placeholder="Paste photo URL (e.g. https://images.unsplash.com/...)"
                        className="flex-1 bg-slate-800/80 border border-slate-700 rounded-xl px-3.5 py-2 text-white text-xs focus:outline-none focus:border-rose-500"
                      />
                      <button
                        type="button"
                        onClick={handleAddPhoto}
                        className="bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 px-4 py-2 rounded-xl text-xs font-medium transition flex items-center gap-1.5"
                      >
                        <ImageIcon size={14} />
                        Add Photo
                      </button>
                    </div>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Footer Actions */}
        <div className="border-t border-slate-800 bg-slate-900/80 p-4 px-6 flex items-center justify-between">
          {step > 1 ? (
            <button
              onClick={() => setStep((prev) => prev - 1)}
              className="px-4 py-2.5 rounded-xl border border-slate-700 text-slate-300 hover:bg-slate-800 text-xs font-medium flex items-center gap-1.5 transition"
            >
              <ChevronLeft size={16} />
              Previous
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={handleNextStep}
            disabled={isSaving}
            className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 hover:from-rose-600 hover:to-pink-700 text-white text-xs font-semibold shadow-lg shadow-rose-500/25 flex items-center gap-2 transition disabled:opacity-50"
          >
            {isSaving ? (
              <span>Saving Profile...</span>
            ) : step === 5 ? (
              <>
                <span>Complete & Save Profile</span>
                <Check size={16} />
              </>
            ) : (
              <>
                <span>Next Step</span>
                <ChevronRight size={16} />
              </>
            )}
          </button>
        </div>
      </motion.div>
    </div>
  );
};
