import { User } from '../types';

export interface FieldRequirement {
  key: keyof User;
  label: string;
  category: 'basic' | 'personal' | 'location' | 'contact' | 'background' | 'lifestyle' | 'media';
  isRequired: boolean;
  weight: number; // percentage points
  description: string;
}

export const PROFILE_FIELDS: FieldRequirement[] = [
  { key: 'name', label: 'Full Name', category: 'basic', isRequired: true, weight: 5, description: 'Enter your real name for identity verification' },
  { key: 'username', label: 'Unique Username', category: 'basic', isRequired: true, weight: 4, description: 'Choose a unique username e.g. @john_doe' },
  { key: 'dateOfBirth', label: 'Date of Birth (18+)', category: 'basic', isRequired: true, weight: 5, description: 'Required to confirm you are 18+ years old' },
  { key: 'gender', label: 'Gender', category: 'basic', isRequired: true, weight: 4, description: 'Specify your gender identity' },
  { key: 'lookingFor', label: 'Looking For', category: 'basic', isRequired: true, weight: 4, description: 'Specify what relationship type you seek' },
  
  { key: 'maritalStatus', label: 'Marital Status', category: 'personal', isRequired: true, weight: 4, description: 'Single, Divorced, Widowed, etc.' },
  { key: 'relationshipStatus', label: 'Relationship Goals', category: 'personal', isRequired: true, weight: 4, description: 'Marriage, Serious, Casual, etc.' },
  { key: 'religion', label: 'Religion', category: 'personal', isRequired: true, weight: 4, description: 'Select your religion or faith' },
  { key: 'height', label: 'Height', category: 'personal', isRequired: true, weight: 4, description: 'Specify your height e.g. 5\'8"' },
  
  { key: 'country', label: 'Country with Flag', category: 'location', isRequired: true, weight: 4, description: 'Select your country e.g. Bangladesh 🇧🇩' },
  { key: 'divisionCity', label: 'Division / City', category: 'location', isRequired: true, weight: 4, description: 'Division, District, or City name' },
  { key: 'fullAddress', label: 'Full Address (Private)', category: 'location', isRequired: true, weight: 5, description: 'Street address (Keep private until matched)' },
  { key: 'postalCode', label: 'Postal Code', category: 'location', isRequired: true, weight: 3, description: 'Postal area zip code' },
  
  { key: 'phone', label: 'Phone Number', category: 'contact', isRequired: true, weight: 5, description: 'Primary contact phone number' },
  { key: 'email', label: 'Email Address', category: 'contact', isRequired: true, weight: 5, description: 'Primary contact email address' },
  
  { key: 'education', label: 'Education', category: 'background', isRequired: true, weight: 4, description: 'Highest degree or university' },
  { key: 'profession', label: 'Profession', category: 'background', isRequired: true, weight: 4, description: 'Current occupation or field' },
  { key: 'languages', label: 'Languages Spoken', category: 'background', isRequired: true, weight: 4, description: 'At least 1 language spoken' },
  
  { key: 'smoking', label: 'Smoking Habits', category: 'lifestyle', isRequired: true, weight: 3, description: 'Non-smoker, Occasional, or Smoker' },
  { key: 'drinking', label: 'Drinking Habits', category: 'lifestyle', isRequired: true, weight: 3, description: 'Non-drinker, Socially, or Regular' },
  { key: 'interests', label: 'Hobbies & Interests', category: 'lifestyle', isRequired: true, weight: 4, description: 'Select at least 2 hobbies or interests' },
  
  { key: 'bio', label: 'Bio / About Me', category: 'media', isRequired: true, weight: 5, description: 'Write a short bio describing yourself' },
  { key: 'avatar', label: 'Real Profile Photo', category: 'media', isRequired: true, weight: 5, description: 'Clear primary profile picture' },
  { key: 'photos', label: 'Multiple Gallery Photos', category: 'media', isRequired: true, weight: 4, description: 'Add at least 2 photos (up to 10)' },
];

export interface ProfileCompletionResult {
  percentage: number;
  is100Percent: boolean;
  completedFieldsCount: number;
  totalFieldsCount: number;
  missingFields: FieldRequirement[];
  nextSuggestedField: FieldRequirement | null;
  guidanceMessage: string;
}

export function calculateProfileCompletion(user: Partial<User>): ProfileCompletionResult {
  let score = 0;
  let totalMaxScore = 0;
  const missingFields: FieldRequirement[] = [];

  for (const field of PROFILE_FIELDS) {
    totalMaxScore += field.weight;
    let isFilled = false;

    if (field.key === 'dateOfBirth') {
      isFilled = !!(user.dateOfBirth && user.dateOfBirth.trim().length > 0) || (typeof user.age === 'number' && user.age >= 18);
    } else if (field.key === 'divisionCity') {
      isFilled = !!(user.divisionCity && user.divisionCity.trim().length > 0) || !!(user.location && user.location.trim().length > 0);
    } else if (field.key === 'fullAddress') {
      isFilled = !!(user.fullAddress && user.fullAddress.trim().length > 0) || !!(user.location && user.location.trim().length > 0);
    } else if (field.key === 'postalCode') {
      isFilled = !!(user.postalCode && user.postalCode.trim().length > 0) || !!(user.location && user.location.trim().length > 0);
    } else if (field.key === 'education') {
      isFilled = !!(user.education && user.education.trim().length > 0) || !!(user.schoolCollege && user.schoolCollege.trim().length > 0);
    } else if (field.key === 'profession') {
      isFilled = !!(user.profession && user.profession.trim().length > 0);
    } else if (field.key === 'photos') {
      const photoArr = user.photos || [];
      const hasAvatar = !!(user.avatar && typeof user.avatar === 'string' && user.avatar.trim().length > 0 && !user.avatar.includes('svg'));
      isFilled = photoArr.length >= 1 || hasAvatar;
    } else if (field.key === 'avatar') {
      const hasAvatar = !!(user.avatar && typeof user.avatar === 'string' && user.avatar.trim().length > 0 && !user.avatar.includes('svg'));
      const hasPhoto = !!(user.photos && user.photos.length > 0);
      isFilled = hasAvatar || hasPhoto;
    } else {
      const val = user[field.key];
      if (Array.isArray(val)) {
        isFilled = val.length > 0;
      } else if (typeof val === 'number') {
        isFilled = !isNaN(val) && val > 0;
      } else if (typeof val === 'string') {
        isFilled = val.trim().length > 0;
      } else if (val !== undefined && val !== null) {
        isFilled = true;
      }
    }

    if (isFilled) {
      score += field.weight;
    } else {
      missingFields.push(field);
    }
  }

  // Calculate percentage integer (0 - 100)
  let percentage = Math.min(100, Math.round((score / totalMaxScore) * 100));
  if (missingFields.length === 0) {
    percentage = 100;
  }
  const is100Percent = percentage === 100 && missingFields.length === 0;
  const completedFieldsCount = PROFILE_FIELDS.length - missingFields.length;
  
  const nextSuggestedField = missingFields.length > 0 ? missingFields[0] : null;

  let guidanceMessage = '🎉 Congratulations! Your profile is 100% complete!';
  if (!is100Percent && nextSuggestedField) {
    if (percentage < 50) {
      guidanceMessage = `🚀 Complete your profile to get 3x more matches! Next step: Add ${nextSuggestedField.label}.`;
    } else if (percentage < 80) {
      guidanceMessage = `⚡️ Almost there! Add ${nextSuggestedField.label} to reach 80%+ profile completion.`;
    } else {
      guidanceMessage = `✨ You're so close! Just fill in ${nextSuggestedField.label} to reach 100% profile completion!`;
    }
  }

  return {
    percentage,
    is100Percent,
    completedFieldsCount,
    totalFieldsCount: PROFILE_FIELDS.length,
    missingFields,
    nextSuggestedField,
    guidanceMessage,
  };
}

export function calculateAgeFromDOB(dobString: string): number {
  if (!dobString) return 18;
  const birthDate = new Date(dobString);
  const today = new Date();
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  return isNaN(age) ? 18 : age;
}

export function generateRandomUserId(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
