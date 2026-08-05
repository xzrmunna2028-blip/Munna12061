import { User, Match, Message, NotificationItem, Report, SystemSettings } from '../types';

export const DEFAULT_AVATAR_PLACEHOLDER = "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%231e293b' stroke='%2364748b' stroke-width='1.5'><circle cx='12' cy='8' r='4'/><path d='M6 21v-2a4 4 0 0 1 4-4h4a4 4 0 0 1 4 4v2'/></svg>";

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  appTitle: 'True Love Connect',
  appName: 'True Love Connect',
  siteLogoUrl: "data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='200' height='200' viewBox='0 0 24 24' fill='%23ec4899' stroke='%23ffffff' stroke-width='1.5'><path d='M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z'/></svg>",
  defaultRadiusKm: 50,
  minAgeLimit: 18,
  maxAgeLimit: 75,
  popularInterests: [
    'Photography', 'Travel', 'Coffee', 'Hiking', 'Yoga', 'Art',
    'Music', 'Fitness', 'Cooking', 'Reading', 'Tech', 'Gaming',
    'Movies', 'Dancing'
  ],
  termsText: 'Welcome to True Love Connect. Please respect all community members. Fake profiles, harassment, or offensive content will lead to immediate account suspension.',
  privacyText: 'Your privacy is paramount. We do not sell your personal data. You can adjust profile visibility and location privacy in your settings at any time.'
};

export const SEED_USERS: User[] = [];

export const INITIAL_MATCHES: Match[] = [];
export const INITIAL_MESSAGES: Message[] = [];
export const INITIAL_NOTIFICATIONS: NotificationItem[] = [];
export const INITIAL_REPORTS: Report[] = [];
