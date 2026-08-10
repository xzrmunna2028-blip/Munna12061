import React, { useState, useEffect } from 'react';
import {
  User as UserIcon,
  MapPin,
  Eye,
  EyeOff,
  Shield,
  Edit3,
  Camera,
  Plus,
  Trash2,
  Lock,
  LogOut,
  Ban,
  Check,
  Save,
  CheckCircle2,
  Sparkles,
  AlertCircle,
  Globe,
  Briefcase,
  GraduationCap,
  Heart,
  ChevronRight,
  ShieldCheck,
  ImageIcon
} from 'lucide-react';
import { User, Gender, LookingFor, PrivacySettings } from '../types';
import { VerificationBadge } from './VerificationBadge';
import { calculateProfileCompletion, calculateAgeFromDOB } from '../lib/profileCompletion';
import { OnboardingWizard } from './OnboardingWizard';
import { getSafeAvatar, saveUserAvatarLocally } from '../lib/avatar';
import { compressBase64Image } from '../lib/imageUtils';
import { maskPhoneNumber, maskEmail } from '../lib/contactUtils';
import { customFetch as fetch } from '../lib/api';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { db, clientQuotaExceeded, isQuotaError, setClientQuotaExceeded } from '../lib/firebase';

interface ProfileViewProps {
  currentUser: User;
  onUpdateProfile: (updatedData: Partial<User>) => Promise<void>;
  onLogout: () => void;
  popularInterests: string[];
}

export const ProfileView: React.FC<ProfileViewProps> = ({
  currentUser,
  onUpdateProfile,
  onLogout,
  popularInterests,
}) => {
  const [activeTab, setActiveTab] = useState<'profile' | 'edit' | 'privacy' | 'blocked'>('profile');
  const [loading, setLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isUsernameTaken, setIsUsernameTaken] = useState(false);
  const [showWizardModal, setShowWizardModal] = useState(false);

  // Edit Profile Form state (Fully extended)
  const [name, setName] = useState(currentUser.name || '');
  const [username, setUsername] = useState(currentUser.username || '');
  const [dateOfBirth, setDateOfBirth] = useState(currentUser.dateOfBirth || '');
  const [age, setAge] = useState(currentUser.age || 26);
  const [gender, setGender] = useState<Gender>(currentUser.gender || 'female');
  const [lookingFor, setLookingFor] = useState<LookingFor>(currentUser.lookingFor || 'relationship');
  
  const [maritalStatus, setMaritalStatus] = useState(currentUser.maritalStatus || 'Single');
  const [relationshipStatus, setRelationshipStatus] = useState(currentUser.relationshipStatus || 'Marriage');
  const [religion, setReligion] = useState(currentUser.religion || 'Islam');
  const [height, setHeight] = useState(currentUser.height || "5'6\"");
  
  const [country, setCountry] = useState(currentUser.country || 'Bangladesh');
  const [countryFlag, setCountryFlag] = useState(currentUser.countryFlag || '🇧🇩');
  const [divisionCity, setDivisionCity] = useState(currentUser.divisionCity || '');
  const [fullAddress, setFullAddress] = useState(currentUser.fullAddress || '');
  const [postalCode, setPostalCode] = useState(currentUser.postalCode || '');
  const [phone, setPhone] = useState(currentUser.phone || '');
  
  const [education, setEducation] = useState(currentUser.education || '');
  const [schoolCollege, setSchoolCollege] = useState(currentUser.schoolCollege || '');
  const [profession, setProfession] = useState(currentUser.profession || '');
  const [familyDetails, setFamilyDetails] = useState(currentUser.familyDetails || '');
  const [languages, setLanguages] = useState<string[]>(currentUser.languages || ['English', 'Bengali']);
  const [smoking, setSmoking] = useState(currentUser.smoking || 'Non-smoker');
  const [drinking, setDrinking] = useState(currentUser.drinking || 'Non-drinker');

  const [bio, setBio] = useState(currentUser.bio || '');
  const [avatar, setAvatar] = useState(currentUser.avatar || '');
  const [photos, setPhotos] = useState<string[]>(currentUser.photos || [currentUser.avatar]);
  const [newPhotoUrl, setNewPhotoUrl] = useState('');
  const [interests, setInterests] = useState<string[]>(currentUser.interests || []);
  const [customInterestInput, setCustomInterestInput] = useState('');

  // 14-Day Username Edit Lock calculation
  const lastUsernameChange = currentUser.usernameLastChangedAt ? new Date(currentUser.usernameLastChangedAt) : null;
  const daysSinceUsernameChange = lastUsernameChange
    ? Math.floor((new Date().getTime() - lastUsernameChange.getTime()) / (1000 * 3600 * 24))
    : 999;
  const isUsernameLocked = daysSinceUsernameChange < 14;
  const daysRemainingUsernameLock = 14 - daysSinceUsernameChange;

  // Privacy Settings state
  const [privacySettings, setPrivacySettings] = useState<PrivacySettings>(
    currentUser.privacySettings || {
      hideOnline: false,
      hideDistance: false,
      hideAge: false,
      profileVisibility: 'public',
    }
  );

  // Keep form state synced with currentUser prop
  useEffect(() => {
    if (currentUser) {
      if (currentUser.name) setName(currentUser.name);
      if (currentUser.username) setUsername(currentUser.username);
      if (currentUser.dateOfBirth) setDateOfBirth(currentUser.dateOfBirth);
      if (currentUser.age) setAge(currentUser.age);
      if (currentUser.gender) setGender(currentUser.gender);
      if (currentUser.lookingFor) setLookingFor(currentUser.lookingFor);
      if (currentUser.maritalStatus) setMaritalStatus(currentUser.maritalStatus);
      if (currentUser.relationshipStatus) setRelationshipStatus(currentUser.relationshipStatus);
      if (currentUser.religion) setReligion(currentUser.religion);
      if (currentUser.height) setHeight(currentUser.height);
      if (currentUser.country) setCountry(currentUser.country);
      if (currentUser.countryFlag) setCountryFlag(currentUser.countryFlag);
      if (currentUser.divisionCity) setDivisionCity(currentUser.divisionCity);
      if (currentUser.fullAddress) setFullAddress(currentUser.fullAddress);
      if (currentUser.postalCode) setPostalCode(currentUser.postalCode);
      if (currentUser.phone) setPhone(currentUser.phone);
      if (currentUser.education) setEducation(currentUser.education);
      if (currentUser.schoolCollege) setSchoolCollege(currentUser.schoolCollege);
      if (currentUser.profession) setProfession(currentUser.profession);
      if (currentUser.familyDetails) setFamilyDetails(currentUser.familyDetails);
      if (currentUser.languages) setLanguages(currentUser.languages);
      if (currentUser.smoking) setSmoking(currentUser.smoking);
      if (currentUser.drinking) setDrinking(currentUser.drinking);
      if (currentUser.bio) setBio(currentUser.bio);
      if (currentUser.avatar) setAvatar(currentUser.avatar);
      if (currentUser.photos && currentUser.photos.length > 0) setPhotos(currentUser.photos);
      if (currentUser.interests) setInterests(currentUser.interests);
    }
  }, [currentUser]);

  // Blocked Users list
  const [blockedUsers, setBlockedUsers] = useState<User[]>([]);

  // Calculate live completion
  const completion = calculateProfileCompletion({
    name, username, dateOfBirth, gender, lookingFor, maritalStatus,
    relationshipStatus, religion, height, country, divisionCity, fullAddress,
    postalCode, phone, email: currentUser.email, education, profession,
    languages, smoking, drinking, bio, avatar, photos, interests,
    age, location: currentUser.location || (divisionCity ? `${divisionCity}, ${country}` : ''),
    schoolCollege
  });

  useEffect(() => {
    if (activeTab === 'blocked') {
      fetchBlockedUsers();
    }
  }, [activeTab]);

  const fetchBlockedUsers = async () => {
    try {
      const res = await fetch('/api/blocks');
      const data = await res.json();
      if (res.ok) setBlockedUsers(data.blockedUsers || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleUnblock = async (blockedUserId: string) => {
    try {
      const res = await fetch(`/api/blocks/${blockedUserId}`, { method: 'DELETE' });
      if (res.ok) {
        setBlockedUsers((prev) => prev.filter((u) => u.id !== blockedUserId));
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Direct Avatar Change File Upload Handler
  const handleDirectAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (uploadEvent) => {
      const rawBase64 = uploadEvent.target?.result as string;
      if (rawBase64) {
        const base64Url = await compressBase64Image(rawBase64, 600, 600, 0.7);
        setAvatar(base64Url);
        if (currentUser?.id) saveUserAvatarLocally(currentUser.id, base64Url);
        const updatedPhotos = [base64Url, ...photos.filter((p) => p !== base64Url)];
        setPhotos(updatedPhotos);

        try {
          setLoading(true);
          await onUpdateProfile({
            avatar: base64Url,
            photos: updatedPhotos,
            photoStatus: 'pending',
            photoUpdatedAt: new Date().toISOString(),
            rejectionReason: '',
            profileCompletionPercentage: completion.percentage,
          });
          setSuccessMsg('Profile photo updated & submitted for admin review!');
          setTimeout(() => setSuccessMsg(null), 3000);
        } catch (err) {
          console.error(err);
        } finally {
          setLoading(false);
        }
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSetPrimaryPhoto = async (photoUrl: string) => {
    setAvatar(photoUrl);
    if (currentUser?.id) saveUserAvatarLocally(currentUser.id, photoUrl);
    const reordered = [photoUrl, ...photos.filter((p) => p !== photoUrl)];
    setPhotos(reordered);
    try {
      setLoading(true);
      await onUpdateProfile({
        avatar: photoUrl,
        photos: reordered,
        photoStatus: 'pending',
        photoUpdatedAt: new Date().toISOString(),
        rejectionReason: '',
        profileCompletionPercentage: completion.percentage,
      });
      setSuccessMsg('Set as primary profile photo & submitted for admin review!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    const newPhotos: string[] = [];
    let filesProcessed = 0;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = async (uploadEvent) => {
        const rawBase64 = uploadEvent.target?.result as string;
        if (rawBase64) {
          const compressed = await compressBase64Image(rawBase64, 600, 600, 0.7);
          newPhotos.push(compressed);
        }
        filesProcessed++;
        if (filesProcessed === files.length) {
          const updatedPhotos = [...photos, ...newPhotos].slice(0, 5);
          const newAvatar = avatar && !avatar.includes('svg') ? avatar : updatedPhotos[0];
          setPhotos(updatedPhotos);
          setAvatar(newAvatar);
          try {
            setLoading(true);
            await onUpdateProfile({
              avatar: newAvatar,
              photos: updatedPhotos,
              photoStatus: 'pending',
              photoUpdatedAt: new Date().toISOString(),
              rejectionReason: '',
            });
            setSuccessMsg('Cover photos uploaded successfully!');
            setTimeout(() => setSuccessMsg(null), 3000);
          } catch (err) {
            console.error(err);
          } finally {
            setLoading(false);
          }
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleQuickDeletePhoto = async (index: number) => {
    if (photos.length <= 1) return;
    const photoToDelete = photos[index];
    const updated = photos.filter((_, i) => i !== index);
    const newAvatar = avatar === photoToDelete ? updated[0] : avatar;
    setPhotos(updated);
    setAvatar(newAvatar);
    try {
      setLoading(true);
      await onUpdateProfile({
        avatar: newAvatar,
        photos: updated,
      });
      setSuccessMsg('Photo removed successfully');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Local Gallery Photo Upload Handler
  const handleLocalPhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    Array.from(files).forEach((file: File) => {
      if (photos.length >= 10) return;
      const reader = new FileReader();
      reader.onload = (uploadEvent) => {
        const base64Url = uploadEvent.target?.result as string;
        if (base64Url) {
          setPhotos((prev) => {
            if (prev.length >= 10) return prev;
            const updated = [...prev, base64Url];
            if (!avatar) setAvatar(base64Url);
            return updated;
          });
        }
      };
      reader.readAsDataURL(file);
    });
  };

  const handleAddPhoto = () => {
    if (!newPhotoUrl.trim()) return;
    if (photos.length >= 10) return;
    setPhotos([...photos, newPhotoUrl.trim()]);
    setNewPhotoUrl('');
  };

  const handleDeletePhoto = (index: number) => {
    if (photos.length <= 1) return;
    const updated = photos.filter((_, i) => i !== index);
    setPhotos(updated);
    if (avatar === photos[index]) {
      setAvatar(updated[0]);
    }
  };

  const handleToggleInterest = (interest: string) => {
    if (interests.includes(interest)) {
      setInterests(interests.filter((i) => i !== interest));
    } else {
      setInterests([...interests, interest]);
    }
  };

  const handleAddCustomInterest = () => {
    if (!customInterestInput.trim()) return;
    if (!interests.includes(customInterestInput.trim())) {
      setInterests([...interests, customInterestInput.trim()]);
    }
    setCustomInterestInput('');
  };

  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSuccessMsg(null);
    setErrorMsg(null);

    const computedAge = dateOfBirth ? calculateAgeFromDOB(dateOfBirth) : age;
    const isUsernameChanged = username !== currentUser.username;

    if (isUsernameChanged && username && !clientQuotaExceeded) {
      try {
        const usersCol = collection(db, 'users');
        const q = query(usersCol, where('username', '==', username.trim().toLowerCase()));
        const querySnap = await getDocs(q);
        let taken = false;
        querySnap.forEach((doc) => {
          if (doc.id !== currentUser.id) {
            taken = true;
          }
        });
        if (taken) {
          setErrorMsg('Username already taken. Please choose another unique username.');
          setIsUsernameTaken(true);
          setLoading(false);
          return;
        } else {
          setIsUsernameTaken(false);
        }
      } catch (err: any) {
        if (isQuotaError(err)) {
          setClientQuotaExceeded(true);
        }
        console.error('Error checking unique username:', err);
      }
    }

    try {
      await onUpdateProfile({
        name,
        username,
        usernameLastChangedAt: isUsernameChanged ? new Date().toISOString() : currentUser.usernameLastChangedAt,
        dateOfBirth,
        age: computedAge,
        gender,
        lookingFor,
        maritalStatus,
        relationshipStatus,
        religion,
        height,
        country,
        countryFlag,
        divisionCity,
        fullAddress,
        postalCode,
        phone,
        education,
        schoolCollege,
        profession,
        familyDetails,
        languages,
        smoking,
        drinking,
        bio,
        avatar: (photos && photos.length > 0 && photos[0] && !photos[0].includes('svg')) ? photos[0] : (avatar && !avatar.includes('svg') ? avatar : (photos[0] || avatar || currentUser.avatar)),
        photos: (photos && photos.length > 0) ? photos : (avatar ? [avatar] : []),
        interests,
        photoStatus: 'pending',
        photoUpdatedAt: new Date().toISOString(),
        rejectionReason: '',
        location: `${divisionCity || 'Dhaka'}, ${country || 'Bangladesh'}`,
        profileCompletionPercentage: completion.percentage,
      });
      setSuccessMsg('Profile updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
      setActiveTab('profile');
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleSavePrivacy = async () => {
    setLoading(true);
    setSuccessMsg(null);
    try {
      await onUpdateProfile({
        privacySettings,
      });
      setSuccessMsg('Privacy preferences updated successfully!');
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 text-white pb-24 md:pb-12">
      
      {/* Smart Guidance floating prompt banner */}
      {!completion.is100Percent && (
        <div className="mb-6 p-4 rounded-2xl bg-gradient-to-r from-amber-500/20 via-rose-500/20 to-purple-500/20 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center shrink-0">
              <Sparkles className="w-5 h-5 text-amber-300 animate-pulse" />
            </div>
            <div>
              <h4 className="text-sm font-bold text-amber-200">
                Profile {completion.percentage}% Complete
              </h4>
              <p className="text-xs text-amber-100/80">
                {completion.guidanceMessage}
              </p>
            </div>
          </div>
          <button
            onClick={() => setShowWizardModal(true)}
            className="px-4 py-2 rounded-xl bg-gradient-to-r from-amber-500 to-rose-500 hover:from-amber-600 hover:to-rose-600 text-white text-xs font-bold shadow-md flex items-center gap-1.5 shrink-0 transition"
          >
            <span>Complete Now</span>
            <ChevronRight size={14} />
          </button>
        </div>
      )}

      {/* Photo Rejection Warning Banner */}
      {currentUser.photoStatus === 'rejected' && (
        <div className="mb-6 bg-rose-500/10 border-2 border-rose-500/40 rounded-3xl p-5 text-rose-200 flex items-start space-x-3.5 shadow-2xl animate-fade-in">
          <AlertCircle className="w-6 h-6 text-rose-500 shrink-0 mt-0.5" />
          <div className="space-y-1.5 text-xs">
            <h4 className="font-bold text-sm text-rose-400 flex items-center gap-2">
              ❌ আপনার প্রোফাইল ফটোটি এডমিন কর্তৃক বাতিল করা হয়েছে!
            </h4>
            <p className="bg-rose-500/20 px-3 py-1.5 rounded-xl font-medium border border-rose-500/30">
              <strong>বাতিলের কারণ:</strong> {currentUser.rejectionReason || 'অনুপযুক্ত বা অপ্রাসঙ্গিক ছবি'}
            </p>
            <p className="text-slate-300 leading-relaxed">
              দয়া করে নিচে <strong>"Edit Profile"</strong> ক্লিক করে অথবা ছবির ওপর ক্যামেরায় চাপ দিয়ে একটি সঠিক ও সুন্দর ছবি আপলোড করুন। নতুন ছবি দেওয়ার পর এডমিন সাথে সাথে যাচাই করে এপ্রুভ করবেন।
            </p>
          </div>
        </div>
      )}

      {/* Photo Pending Review Banner */}
      {currentUser.photoStatus === 'pending' && (
        <div className="mb-6 bg-amber-500/10 border border-amber-500/30 rounded-3xl p-4 text-amber-200 flex items-center space-x-3 text-xs shadow-lg animate-fade-in">
          <Sparkles className="w-5 h-5 text-amber-400 shrink-0" />
          <span className="leading-relaxed">
            ⏳ আপনার নতুন প্রোফাইল ফটোটি এডমিন যাচাই-বাছাইয়ের অপেক্ষায় আছে। এডমিন যাচাই করে এপ্রুভ করা মাত্রই এটি সকল ইউজারের কাছে হোম পেজে দেখানো হবে।
          </span>
        </div>
      )}

      {/* Top Banner & User Card Header */}
      <div className="relative rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden shadow-2xl mb-6 p-6">
        <div className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-6">
          
          <div className="relative group shrink-0">
            <img
              src={getSafeAvatar({ avatar: avatar || currentUser.avatar, photos, gender })}
              alt={currentUser.name}
              className="w-24 h-24 sm:w-28 sm:h-28 rounded-full object-cover border-4 border-rose-500 shadow-xl"
              onError={(e) => {
                e.currentTarget.src = getSafeAvatar(currentUser);
              }}
            />
            <label
              htmlFor="main-avatar-file-input"
              className="absolute inset-0 rounded-full bg-slate-950/60 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center cursor-pointer text-white text-[10px] font-bold p-1 text-center"
              title="Change Profile Photo"
            >
              <Camera className="w-5 h-5 text-rose-400 mb-0.5" />
              <span>Change Photo</span>
            </label>
            <label
              htmlFor="main-avatar-file-input"
              className="absolute bottom-0 right-0 bg-gradient-to-tr from-rose-500 to-pink-500 hover:scale-110 text-white p-2 rounded-full border-2 border-slate-900 shadow-lg cursor-pointer transition-transform"
              title="Upload Avatar"
            >
              <Camera className="w-4 h-4" />
            </label>
            <input
              id="main-avatar-file-input"
              type="file"
              accept="image/*"
              onChange={handleDirectAvatarUpload}
              className="hidden"
            />
            {currentUser.verified && (
              <span className="absolute top-0 right-0 bg-slate-900/90 rounded-full p-1 border border-slate-700 shadow">
                <VerificationBadge size={22} className="shrink-0" />
              </span>
            )}
          </div>

          <div className="text-center sm:text-left flex-1">
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
              <h2 className="text-2xl font-bold tracking-tight flex items-center gap-1.5">
                <span>{currentUser.name}, {currentUser.age}</span>
                {currentUser.verified && <VerificationBadge size={22} className="shrink-0" />}
              </h2>
              {currentUser.username && (
                <span className="text-xs text-slate-400 font-mono">@{currentUser.username}</span>
              )}
              {currentUser.userIdNumber && (
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-800 text-slate-300 border border-slate-700">
                  ID: #{currentUser.userIdNumber}
                </span>
              )}
            </div>

            <p className="text-xs text-slate-400 flex items-center justify-center sm:justify-start gap-1 mb-2">
              <MapPin className="w-3.5 h-3.5 text-rose-400" /> {currentUser.countryFlag || '🇧🇩'} {currentUser.location}
            </p>

            {/* Profile Completion Badge */}
            <div className="inline-flex items-center space-x-2 bg-slate-800/80 px-3.5 py-1.5 rounded-full border border-slate-700">
              <div className="w-20 bg-slate-900 h-2 rounded-full overflow-hidden">
                <div 
                  className={`h-full ${completion.percentage === 100 ? 'bg-emerald-400' : 'bg-amber-400'}`}
                  style={{ width: `${completion.percentage}%` }}
                />
              </div>
              <span className={`text-xs font-bold ${completion.percentage === 100 ? 'text-emerald-400' : 'text-amber-300'}`}>
                {completion.percentage}% Profile Completed
              </span>
            </div>
          </div>

        </div>

        {/* Tab Navigation Navigation Bar */}
        <div className="flex border-t border-slate-800 mt-6 pt-4 gap-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('profile')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'profile' ? 'bg-rose-500 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon size={14} /> Profile Preview
          </button>
          <button
            onClick={() => setActiveTab('edit')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'edit' ? 'bg-rose-500 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Edit3 size={14} /> Edit Profile Data
          </button>
          <button
            onClick={() => setActiveTab('privacy')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'privacy' ? 'bg-rose-500 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Lock size={14} /> Privacy Settings
          </button>
          <button
            onClick={() => setActiveTab('blocked')}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 ${
              activeTab === 'blocked' ? 'bg-rose-500 text-white shadow' : 'bg-slate-800 text-slate-400 hover:text-white'
            }`}
          >
            <Ban size={14} /> Blocked Users
          </button>
        </div>

      </div>

      {successMsg && (
        <div className="mb-4 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs text-center font-medium flex items-center justify-center gap-2">
          <Check className="w-4 h-4" /> {successMsg}
        </div>
      )}

      {errorMsg && (
        <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs text-center font-medium flex items-center justify-center gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400" /> {errorMsg}
        </div>
      )}

      {/* TAB 1: PREVIEW PROFILE (Clean Serial Layout) */}
      {activeTab === 'profile' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          
          {/* Missing Fields Box */}
          {completion.missingFields.length > 0 && (
            <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4">
              <h4 className="text-xs font-bold text-amber-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                <AlertCircle size={14} /> Missing Required Information ({completion.missingFields.length})
              </h4>
              <div className="flex flex-wrap gap-2">
                {completion.missingFields.map((field) => (
                  <button
                    key={field.key}
                    onClick={() => setActiveTab('edit')}
                    className="px-2.5 py-1 rounded-lg bg-amber-500/20 text-amber-200 border border-amber-500/40 text-[11px] font-medium hover:bg-amber-500/30 transition"
                  >
                    + Fill {field.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Section 1: Personal & Background Details Grid */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Personal & Background Details</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 bg-slate-800/80 p-4 rounded-2xl border border-slate-700/80 text-xs">
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Religion</span>
                <span className="text-white font-semibold">{currentUser.religion || 'Islam'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Marital Status</span>
                <span className="text-white font-semibold">{currentUser.maritalStatus || 'Single'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Height</span>
                <span className="text-white font-semibold">{currentUser.height || "5' 7\""}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Education Degree</span>
                <span className="text-white font-semibold">{currentUser.education || 'Graduate'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">School / College</span>
                <span className="text-white font-semibold">{currentUser.schoolCollege || 'Not specified'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Profession</span>
                <span className="text-white font-semibold">{currentUser.profession || 'Private Job'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">District & City</span>
                <span className="text-white font-semibold">{currentUser.divisionCity || currentUser.location}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Date of Birth</span>
                <span className="text-white font-semibold">{currentUser.dateOfBirth || '1998-05-15'} ({currentUser.age} yrs)</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Relationship Goal</span>
                <span className="text-white font-semibold capitalize">{currentUser.relationshipStatus || currentUser.lookingFor}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Languages</span>
                <span className="text-white font-semibold">{currentUser.languages?.join(', ') || 'English, Bengali'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">Smoking & Drinking</span>
                <span className="text-white font-semibold">{currentUser.smoking || 'Non-smoker'} • {currentUser.drinking || 'Non-drinker'}</span>
              </div>
              <div>
                <span className="text-[10px] text-slate-400 uppercase block font-bold">User ID Number</span>
                <span className="text-rose-400 font-mono font-bold">#{currentUser.userIdNumber || '483883'}</span>
              </div>
            </div>
          </div>

          {/* Section 2: Family Details */}
          {currentUser.familyDetails && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Family Background & Details</h4>
              <p className="text-xs text-slate-200 leading-relaxed bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
                {currentUser.familyDetails}
              </p>
            </div>
          )}

          {/* Section 3: About Me */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">About Me</h4>
            <p className="text-xs text-slate-200 leading-relaxed bg-slate-800/60 p-4 rounded-2xl border border-slate-700/80">
              {currentUser.bio || "No bio added yet."}
            </p>
          </div>

          {/* Section 4: Interests & Hobbies */}
          {currentUser.interests && currentUser.interests.length > 0 && (
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Interests & Hobbies</h4>
              <div className="flex flex-wrap gap-2">
                {currentUser.interests.map((interest) => (
                  <span
                    key={interest}
                    className="px-3 py-1 rounded-xl bg-rose-500/10 text-rose-300 border border-rose-500/20 text-xs font-medium"
                  >
                    {interest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Section 5: Cover Photos Gallery Management */}
          <div className="bg-slate-950/60 p-5 rounded-2xl border border-rose-500/30 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-white flex items-center gap-2">
                  <Camera className="w-4 h-4 text-rose-400" /> Cover Photos ({photos?.length || 0}/5)
                </h4>
                <p className="text-[11px] text-slate-300 mt-0.5">
                  Upload up to 5 photos. You can tap any photo to set it as your main profile photo.
                </p>
              </div>
              <label
                htmlFor="quick-cover-photo-input"
                className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold cursor-pointer shadow-md shadow-rose-500/20 transition active:scale-95 shrink-0"
              >
                <Plus className="w-4 h-4" />
                <span>Upload Cover Photos</span>
              </label>
              <input
                id="quick-cover-photo-input"
                type="file"
                accept="image/*"
                multiple
                onChange={handleQuickPhotoUpload}
                className="hidden"
              />
            </div>

            {/* Photos Grid */}
            {photos && photos.length > 0 ? (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3.5 pt-1">
                {photos.map((photo, i) => {
                  const isMainAvatar = avatar === photo || (i === 0 && (!avatar || avatar.includes('svg')));
                  return (
                    <div
                      key={i}
                      className={`relative group rounded-2xl overflow-hidden border-2 shadow-lg transition-all ${
                        isMainAvatar ? 'border-amber-400 shadow-amber-500/20' : 'border-slate-800 hover:border-slate-700'
                      }`}
                    >
                      <img
                        src={photo}
                        alt={`Cover photo ${i + 1}`}
                        className="w-full h-44 object-cover cursor-pointer"
                        onClick={() => handleSetPrimaryPhoto(photo)}
                      />

                      {/* Main Avatar Badge */}
                      {isMainAvatar ? (
                        <span className="absolute top-2 left-2 bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 text-[10px] font-extrabold px-2 py-0.5 rounded-full shadow flex items-center gap-1">
                          <Sparkles className="w-3 h-3 fill-slate-950" /> Main Profile Photo
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleSetPrimaryPhoto(photo)}
                          className="absolute bottom-2 left-2 right-2 py-1 px-2 rounded-xl bg-slate-900/90 hover:bg-rose-600 text-white text-[10px] font-bold backdrop-blur opacity-0 group-hover:opacity-100 transition shadow text-center"
                        >
                          Make Main Photo
                        </button>
                      )}

                      {/* Delete Button */}
                      {photos.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleQuickDeletePhoto(i);
                          }}
                          className="absolute top-2 right-2 p-1.5 rounded-full bg-slate-900/80 hover:bg-rose-600 text-slate-300 hover:text-white transition shadow"
                          title="Delete Photo"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-2xl bg-slate-900/40">
                <ImageIcon className="w-10 h-10 text-slate-500 mx-auto mb-2" />
                <p className="text-xs text-slate-300 font-semibold mb-1">No cover photos uploaded yet</p>
                <p className="text-[11px] text-slate-500 mb-4">Upload 1 to 5 cover photos to customize your profile appearance</p>
                <div className="flex justify-center">
                  <label
                    htmlFor="quick-photo-file-input-empty-cover"
                    className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white text-xs font-bold cursor-pointer transition shadow"
                  >
                    <Plus className="w-4 h-4" /> Upload Cover Photos
                  </label>
                  <input
                    id="quick-photo-file-input-empty-cover"
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={handleQuickPhotoUpload}
                    className="hidden"
                  />
                </div>
              </div>
            )}
          </div>

          {/* Section 6: Private Contact Information */}
          <div>
            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Private Contact Information</h4>
            <div className="space-y-2">
              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">VERIFIED PHONE NUMBER</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs text-white font-bold tracking-wider">
                      {maskPhoneNumber(currentUser.phone)}
                    </span>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-300 text-[10px] font-mono border border-emerald-500/20">
                  Verified Owner
                </span>
              </div>

              <div className="bg-slate-800/90 p-3.5 rounded-2xl border border-slate-700 flex items-center justify-between">
                <div>
                  <span className="text-[10px] text-slate-400 font-bold block">PRIMARY EMAIL ADDRESS</span>
                  <span className="font-mono text-xs text-slate-300">{maskEmail(currentUser.email)}</span>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-slate-900 text-slate-400 text-[10px] font-mono border border-slate-700">
                  Account Email
                </span>
              </div>
            </div>
          </div>

          <div className="pt-4 border-t border-slate-800 flex justify-between items-center">
            <span className="text-xs text-slate-400">Account status: <strong className="text-emerald-400 uppercase">{currentUser.status}</strong></span>
            <button
              onClick={onLogout}
              className="px-4 py-2 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-300 border border-rose-500/30 text-xs font-bold flex items-center gap-2"
            >
              <LogOut className="w-4 h-4" /> Sign Out
            </button>
          </div>

        </div>
      )}

      {/* TAB 2: EDIT PROFILE FORM */}
      {activeTab === 'edit' && (
        <form onSubmit={handleSaveProfile} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          
          {/* Section: Basic Identity */}
          <div className="border-b border-slate-800 pb-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <UserIcon size={16} className="text-rose-400" /> Basic Account & Username
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Full Name *</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1 flex items-center justify-between">
                <span>Unique Username</span>
                <span className="text-[10px] text-amber-400 font-normal">14-Day Lock Rule</span>
              </label>
              <input
                type="text"
                disabled={isUsernameLocked}
                value={username}
                onChange={(e) => {
                  setUsername(e.target.value.toLowerCase().replace(/\s+/g, '_'));
                  setIsUsernameTaken(false);
                }}
                placeholder="e.g. alex_vance"
                className={`w-full bg-slate-800 border transition-all ${
                  isUsernameLocked 
                    ? 'border-amber-500/40 opacity-70 cursor-not-allowed' 
                    : isUsernameTaken
                      ? 'border-rose-500 ring-2 ring-rose-500/40 bg-rose-950/20 focus:ring-rose-500'
                      : 'border-slate-700 focus:border-rose-500'
                } rounded-xl px-3 py-2 text-xs text-white focus:outline-none`}
              />
              {isUsernameTaken && (
                <p className="text-[10px] text-rose-400 mt-1 flex items-center gap-1">
                  <AlertCircle size={10} /> এই ইউজার নেমটি ইতিমধ্যে ব্যবহার করা হয়েছে, অনুগ্রহ করে অন্য একটি দিন।
                </p>
              )}
              {isUsernameLocked ? (
                <p className="text-[10px] text-amber-400 mt-1 flex items-center gap-1">
                  <Lock size={10} /> Username can be changed again in {daysRemainingUsernameLock} days.
                </p>
              ) : (
                !isUsernameTaken && (
                  <p className="text-[10px] text-slate-400 mt-1">
                    Note: Updating username locks changes for 14 days.
                  </p>
                )
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Date of Birth *</label>
              <input
                type="date"
                required
                value={dateOfBirth}
                onChange={(e) => {
                  setDateOfBirth(e.target.value);
                  setAge(calculateAgeFromDOB(e.target.value));
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Gender *</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value as Gender)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="female">Female</option>
                <option value="male">Male</option>
                <option value="non-binary">Non-Binary</option>
              </select>
            </div>
          </div>

          {/* Section: Religion & Personal */}
          <div className="border-b border-slate-800 pb-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Heart size={16} className="text-rose-400" /> Religion & Personal Details
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Religion</label>
              <select
                value={religion}
                onChange={(e) => setReligion(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Islam">Islam</option>
                <option value="Hinduism">Hinduism</option>
                <option value="Christianity">Christianity</option>
                <option value="Buddhism">Buddhism</option>
                <option value="Secular">Secular</option>
                <option value="Other">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Marital Status</label>
              <select
                value={maritalStatus}
                onChange={(e) => setMaritalStatus(e.target.value as any)}
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              >
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Height</label>
              <input
                type="text"
                value={height}
                onChange={(e) => setHeight(e.target.value)}
                placeholder='e.g. 5&#39;7"'
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          {/* Section: Education, Career & Family */}
          <div className="border-b border-slate-800 pb-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <GraduationCap size={16} className="text-rose-400" /> Education, Career & Family
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Education Degree</label>
              <input
                type="text"
                value={education}
                onChange={(e) => setEducation(e.target.value)}
                placeholder="e.g. B.Sc. in Computer Science"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">School / College / University Name</label>
              <input
                type="text"
                value={schoolCollege}
                onChange={(e) => setSchoolCollege(e.target.value)}
                placeholder="e.g. Dhaka University / Ideal School"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">Profession / Job Title</label>
              <input
                type="text"
                value={profession}
                onChange={(e) => setProfession(e.target.value)}
                placeholder="e.g. Software Engineer / Govt Officer"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-300 mb-1">District / Division / City</label>
              <input
                type="text"
                value={divisionCity}
                onChange={(e) => setDivisionCity(e.target.value)}
                placeholder="e.g. Dhaka, Banani"
                className="w-full bg-slate-800 border border-slate-700 rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-rose-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Family Details & Background</label>
            <textarea
              rows={2}
              value={familyDetails}
              onChange={(e) => setFamilyDetails(e.target.value)}
              placeholder="e.g. Father is a retired govt officer, 2 brothers, nuclear family living in Dhaka..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white focus:outline-none focus:border-rose-500"
            />
          </div>

          {/* Section: Photos (Local Device Gallery Upload) */}
          <div className="border-b border-slate-800 pb-3 pt-2">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Camera size={16} className="text-rose-400" /> Photo Gallery & Uploads
            </h3>
          </div>

          <div className="space-y-3">
            <div className="p-4 bg-slate-800/80 rounded-2xl border border-slate-700 space-y-3">
              <label className="block text-xs font-bold text-white">
                Upload Real Photos from Local Gallery / Camera
              </label>
              <input
                type="file"
                accept="image/*"
                multiple
                onChange={handleLocalPhotoUpload}
                className="block w-full text-xs text-slate-300 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-bold file:bg-rose-500 file:text-white hover:file:bg-rose-600 cursor-pointer"
              />
              <p className="text-[10px] text-slate-400">
                You can select multiple real photos directly from your phone or computer gallery.
              </p>
            </div>

            <div className="flex space-x-2">
              <input
                type="url"
                value={newPhotoUrl}
                onChange={(e) => setNewPhotoUrl(e.target.value)}
                placeholder="Or paste external photo URL..."
                className="flex-1 bg-slate-800 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-white focus:outline-none focus:border-rose-500"
              />
              <button
                type="button"
                onClick={handleAddPhoto}
                className="px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white rounded-xl text-xs font-bold flex items-center gap-1"
              >
                <Plus className="w-4 h-4" /> Add URL
              </button>
            </div>

            {/* Gallery Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-3 pt-2">
              {photos.map((photo, i) => (
                <div key={i} className="relative group aspect-[3/4] rounded-xl overflow-hidden border border-slate-700">
                  <img src={photo} alt={`p-${i}`} className="w-full h-full object-cover" />
                  <button
                    type="button"
                    onClick={() => handleDeletePhoto(i)}
                    className="absolute top-1 right-1 p-1 bg-rose-600 text-white rounded-full opacity-80 hover:opacity-100"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Section: Bio */}
          <div>
            <label className="block text-xs font-medium text-slate-300 mb-1">Bio / About Me</label>
            <textarea
              rows={3}
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              placeholder="Tell potential matches about your values, personality, and life goals..."
              className="w-full bg-slate-800 border border-slate-700 rounded-xl p-3 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-rose-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 hover:from-rose-600 hover:to-pink-600 text-white font-bold text-xs shadow-lg shadow-rose-500/25 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" /> {loading ? 'Saving Changes...' : 'Save Profile Changes'}
          </button>

        </form>
      )}

      {/* TAB 3: PRIVACY SETTINGS */}
      {activeTab === 'privacy' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider">Privacy Preferences</h3>

          <div className="space-y-4 divide-y divide-slate-800">
            <div className="pt-2 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Hide Online Status</h4>
                <p className="text-[11px] text-slate-400">Prevent others from seeing when you are active</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.hideOnline}
                onChange={(e) => setPrivacySettings({ ...privacySettings, hideOnline: e.target.checked })}
                className="w-5 h-5 accent-rose-500 rounded"
              />
            </div>

            <div className="pt-4 flex items-center justify-between">
              <div>
                <h4 className="text-xs font-bold text-white">Hide Distance</h4>
                <p className="text-[11px] text-slate-400">Do not display exact location distance</p>
              </div>
              <input
                type="checkbox"
                checked={privacySettings.hideDistance}
                onChange={(e) => setPrivacySettings({ ...privacySettings, hideDistance: e.target.checked })}
                className="w-5 h-5 accent-rose-500 rounded"
              />
            </div>
          </div>

          <button
            onClick={handleSavePrivacy}
            disabled={loading}
            className="w-full py-2.5 rounded-xl bg-gradient-to-r from-rose-500 to-pink-500 text-white text-xs font-bold shadow"
          >
            {loading ? 'Saving...' : 'Save Privacy Preferences'}
          </button>
        </div>
      )}

      {/* TAB 4: BLOCKED USERS */}
      {activeTab === 'blocked' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h3 className="text-sm font-bold uppercase text-slate-300 tracking-wider mb-4">Blocked Users</h3>
          {blockedUsers.length > 0 ? (
            <div className="space-y-3">
              {blockedUsers.map((user) => (
                <div key={user.id} className="p-3 bg-slate-800/80 rounded-2xl flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <img src={user.avatar} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                    <div>
                      <h4 className="text-xs font-bold text-white">{user.name}</h4>
                      <span className="text-[10px] text-slate-400">{user.location}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => handleUnblock(user.id)}
                    className="px-3 py-1.5 rounded-xl bg-rose-500/20 hover:bg-rose-500/30 text-rose-300 border border-rose-500/30 text-xs font-semibold"
                  >
                    Unblock
                  </button>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center py-8">No blocked users.</p>
          )}
        </div>
      )}

      {/* Onboarding Wizard Modal overlay */}
      {showWizardModal && (
        <OnboardingWizard
          currentUser={currentUser}
          onUpdateUser={onUpdateProfile}
          onComplete={() => setShowWizardModal(false)}
          onClose={() => setShowWizardModal(false)}
        />
      )}

    </div>
  );
};
