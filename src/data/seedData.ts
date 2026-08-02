import { User, Match, Message, NotificationItem, Report, SystemSettings } from '../types';

export const DEFAULT_AVATAR_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>";

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  appTitle: 'HeartSync Matrimony & Dating',
  appName: 'HeartSync',
  siteLogoUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23ec4899' stroke='%23ffffff' stroke-width='1.5'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>",
  defaultRadiusKm: 50,
  minAgeLimit: 18,
  maxAgeLimit: 75,
  popularInterests: [
    'Photography', 'Travel', 'Coffee', 'Hiking', 'Yoga', 'Art',
    'Music', 'Fitness', 'Cooking', 'Reading', 'Tech', 'Gaming',
    'Movies', 'Dancing'
  ],
  termsText: 'Welcome to HeartSync. Please respect all community members. Fake profiles, harassment, or offensive content will lead to immediate account suspension.',
  privacyText: 'Your privacy is paramount. We do not sell your personal data. You can adjust profile visibility and location privacy in your settings at any time.'
};

export const SEED_USERS: User[] = [
  {
    id: 'usr_admin',
    userIdNumber: '100001',
    username: 'admin_master',
    email: 'admin@dating.com',
    password: 'MUNNA12061',
    name: 'System Admin',
    dateOfBirth: '1996-05-12',
    age: 30,
    gender: 'female',
    lookingFor: 'friendship',
    maritalStatus: 'Single',
    relationshipStatus: 'Friendship',
    religion: 'Secular',
    height: "5'7\"",
    country: 'Bangladesh',
    countryFlag: '🇧🇩',
    divisionCity: 'Dhaka',
    fullAddress: 'Admin Office, Dhaka, Bangladesh',
    postalCode: '1200',
    phone: '+880 1700-000000',
    education: 'M.Sc. Computer Science',
    profession: 'Head of Platform Safety',
    languages: ['Bengali', 'English'],
    smoking: 'Non-smoker',
    drinking: 'Non-drinker',
    location: 'Dhaka, Bangladesh',
    distanceKm: 0,
    bio: 'Official Platform Administrator monitoring safety and platform operations.',
    avatar: DEFAULT_AVATAR_PLACEHOLDER,
    photos: [],
    interests: ['Tech', 'Security'],
    status: 'active',
    isOnline: true,
    lastActive: 'Just now',
    verified: true,
    role: 'admin',
    privacySettings: {
      hideOnline: false,
      hideDistance: false,
      hideAge: false,
      profileVisibility: 'public'
    },
    profileCompletionPercentage: 100,
    createdAt: '2026-01-01T00:00:00.000Z'
  },
  {
    id: 'usr_me',
    userIdNumber: '756861',
    username: 'google_user',
    email: 'user.google@gmail.com',
    phone: '+880 0171******',
    password: 'password123',
    name: 'Google User',
    dateOfBirth: '1998-05-15',
    age: 24,
    gender: 'female',
    lookingFor: 'relationship',
    maritalStatus: 'Single',
    relationshipStatus: 'Long-term Relationship',
    religion: 'Islam',
    height: "5'7\"",
    country: 'Bangladesh',
    countryFlag: '🇧🇩',
    divisionCity: 'Dhaka',
    fullAddress: 'Dhaka, Bangladesh',
    postalCode: '1200',
    education: 'Graduate',
    profession: 'Private Job',
    languages: ['English', 'Bengali'],
    smoking: 'Non-smoker',
    drinking: 'Non-drinker',
    location: 'San Francisco, CA',
    distanceKm: 0,
    bio: 'Logged in with Google. Excited to meet new people!',
    avatar: DEFAULT_AVATAR_PLACEHOLDER,
    photos: [],
    interests: ['Coffee', 'Music', 'Travel'],
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
    profileCompletionPercentage: 66,
    createdAt: '2026-02-15T10:30:00.000Z'
  }
];

export const INITIAL_MATCHES: Match[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_REPORTS: Report[] = [];
