import { User, Match, Message, NotificationItem, Report, Block, SystemSettings } from '../types';

export const INITIAL_SYSTEM_SETTINGS: SystemSettings = {
  appTitle: 'HeartSync',
  defaultRadiusKm: 50,
  minAgeLimit: 18,
  maxAgeLimit: 75,
  popularInterests: [
    'Photography', 'Travel', 'Coffee', 'Hiking', 'Yoga', 'Art',
    'Music', 'Fitness', 'Cooking', 'Reading', 'Tech', 'Wine Tasting',
    'Gaming', 'Dogs', 'Cats', 'Movies', 'Dancing', 'Surfing'
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
    password: 'admin123',
    name: 'System Admin',
    dateOfBirth: '1996-05-12',
    age: 30,
    gender: 'female',
    lookingFor: 'friendship',
    maritalStatus: 'Single',
    relationshipStatus: 'Friendship',
    religion: 'Secular',
    height: "5'7\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'New York / Manhattan',
    fullAddress: '742 Broadway Suite 400, New York, NY',
    postalCode: '10003',
    phone: '+1 212-555-0100',
    education: 'M.Sc. Computer Science - NYU',
    profession: 'Head of Platform Safety',
    languages: ['English', 'Spanish'],
    smoking: 'Non-smoker',
    drinking: 'Non-drinker',
    location: 'New York, NY',
    distanceKm: 0,
    bio: 'Official Platform Administrator monitoring safety and profile completeness.',
    avatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
    photos: ['https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=800'],
    interests: ['Tech', 'Community', 'Security'],
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
    userIdNumber: '483883',
    username: 'alex_vance',
    email: 'alex@example.com',
    phone: '+1 555-0199',
    password: 'password123',
    name: 'Alex Vance',
    dateOfBirth: '2000-08-14',
    age: 26,
    gender: 'male',
    lookingFor: 'relationship',
    maritalStatus: 'Single',
    relationshipStatus: 'Long-term Relationship',
    religion: 'Secular',
    height: "5'11\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'California / San Francisco',
    fullAddress: '1288 Howard St, Apt 304, San Francisco',
    postalCode: '94103',
    education: 'B.Sc. Design & Interaction - Stanford University',
    profession: 'Senior Product Designer',
    languages: ['English', 'French'],
    smoking: 'Non-smoker',
    drinking: 'Socially',
    location: 'San Francisco, CA',
    distanceKm: 0,
    bio: 'Product designer by day, indie musician by night. Coffee snob, vinyl collector, and avid weekend hiker 🎧☕️🌲',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Coffee', 'Music', 'Hiking', 'Photography', 'Tech'],
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
    profileCompletionPercentage: 100,
    createdAt: '2026-02-15T10:30:00.000Z'
  },
  {
    id: 'usr_1',
    userIdNumber: '592102',
    username: 'sophia_chen',
    email: 'sophia@example.com',
    phone: '+1 555-0101',
    password: 'password123',
    name: 'Sophia Chen',
    dateOfBirth: '2001-03-22',
    age: 25,
    gender: 'female',
    lookingFor: 'relationship',
    maritalStatus: 'Single',
    relationshipStatus: 'Marriage',
    religion: 'Buddhism',
    height: "5'6\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'California / San Francisco',
    fullAddress: '450 Mission St, Apt 18B, San Francisco',
    postalCode: '94105',
    education: 'M.Arch Architecture - UC Berkeley',
    profession: 'Architect & Interior Designer',
    languages: ['English', 'Mandarin'],
    smoking: 'Non-smoker',
    drinking: 'Socially',
    location: 'San Francisco, CA',
    distanceKm: 3,
    bio: 'Architect, plant mom, and brunch enthusiast. Always looking for the best golden-hour rooftop spots in the city! 🌿🌆',
    avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Art', 'Coffee', 'Travel', 'Yoga', 'Photography'],
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
    profileCompletionPercentage: 100,
    createdAt: '2026-03-01T12:00:00.000Z'
  },
  {
    id: 'usr_2',
    userIdNumber: '831049',
    username: 'elena_cooks',
    email: 'elena@example.com',
    phone: '+1 555-0102',
    password: 'password123',
    name: 'Elena Rostova',
    dateOfBirth: '1999-11-05',
    age: 27,
    gender: 'female',
    lookingFor: 'dating',
    maritalStatus: 'Single',
    relationshipStatus: 'Casual Dating',
    religion: 'Christianity',
    height: "5'8\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'California / Oakland',
    fullAddress: '820 Grand Ave, Oakland',
    postalCode: '94610',
    education: 'Culinary Arts Diploma - Le Cordon Bleu',
    profession: 'Executive Chef & Food Blogger',
    languages: ['English', 'Russian'],
    smoking: 'Occasional',
    drinking: 'Socially',
    location: 'Oakland, CA',
    distanceKm: 8,
    bio: 'Food blogger & amateur chef. I promise to cook you pasta if you tell me a good joke. Wine connoisseur & dog lover 🍷🐶',
    avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1539571696357-5a69c17a67c6?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Cooking', 'Wine Tasting', 'Dogs', 'Travel', 'Reading'],
    status: 'active',
    isOnline: false,
    lastActive: '2h ago',
    verified: true,
    role: 'user',
    privacySettings: {
      hideOnline: false,
      hideDistance: false,
      hideAge: false,
      profileVisibility: 'public'
    },
    profileCompletionPercentage: 92,
    createdAt: '2026-03-10T14:20:00.000Z'
  },
  {
    id: 'usr_3',
    userIdNumber: '320914',
    username: 'marcus_m',
    email: 'marcus@example.com',
    phone: '+1 555-0103',
    password: 'password123',
    name: 'Marcus Miller',
    dateOfBirth: '1998-07-19',
    age: 28,
    gender: 'male',
    lookingFor: 'relationship',
    maritalStatus: 'Single',
    relationshipStatus: 'Long-term Relationship',
    religion: 'Secular',
    height: "6'1\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'California / San Jose',
    fullAddress: '300 S First St, San Jose',
    postalCode: '95113',
    education: 'B.S. Software Engineering - San Jose State',
    profession: 'Backend Systems Engineer',
    languages: ['English'],
    smoking: 'Non-smoker',
    drinking: 'Socially',
    location: 'San Jose, CA',
    distanceKm: 15,
    bio: 'Software engineer who loves rock climbing, craft beer, and sci-fi books. Looking for someone to explore mountain trails with 🧗‍♂️📚',
    avatar: 'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1506794778202-cad84cf45f1d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Hiking', 'Tech', 'Reading', 'Coffee', 'Gaming'],
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
    profileCompletionPercentage: 88,
    createdAt: '2026-03-12T09:15:00.000Z'
  },
  {
    id: 'usr_4',
    userIdNumber: '719022',
    username: 'chloe_b',
    email: 'chloe@example.com',
    phone: '+1 555-0104',
    password: 'password123',
    name: 'Chloe Bennett',
    dateOfBirth: '2002-01-30',
    age: 24,
    gender: 'female',
    lookingFor: 'casual',
    maritalStatus: 'Single',
    relationshipStatus: 'Casual Dating',
    religion: 'Other',
    height: "5'5\"",
    country: 'United States',
    countryFlag: '🇺🇸',
    divisionCity: 'California / San Francisco',
    fullAddress: '', // Incomplete profile!
    postalCode: '',
    education: 'Fashion Design Associate - FIDM',
    profession: 'Fitness & Pilates Instructor',
    languages: ['English'],
    smoking: 'Occasional',
    drinking: 'Regular',
    location: 'San Francisco, CA',
    distanceKm: 2,
    bio: 'Fashion creative & pilates instructor. Obsessed with 90s aesthetic, matcha lattes, and spontaneous road trips 🚗✨',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Fitness', 'Fashion', 'Coffee'],
    status: 'active',
    isOnline: true,
    lastActive: 'Active now',
    verified: false,
    role: 'user',
    privacySettings: {
      hideOnline: false,
      hideDistance: false,
      hideAge: false,
      profileVisibility: 'public'
    },
    profileCompletionPercentage: 58, // Low completion!
    createdAt: '2026-03-20T18:00:00.000Z'
  },
  {
    id: 'usr_bd_1',
    userIdNumber: '614209',
    username: 'tanvir_rahman',
    email: 'tanvir@example.com',
    phone: '+880 1711-889900',
    password: 'password123',
    name: 'Tanvir Rahman',
    dateOfBirth: '1997-09-10',
    age: 28,
    gender: 'male',
    lookingFor: 'relationship',
    maritalStatus: 'Single',
    relationshipStatus: 'Marriage',
    religion: 'Islam',
    height: "5'10\"",
    country: 'Bangladesh',
    countryFlag: '🇧🇩',
    divisionCity: 'Dhaka / Banani',
    fullAddress: 'Road 11, House 42, Block D, Banani, Dhaka',
    postalCode: '1213',
    education: 'B.Sc. Software Engineering - NSU',
    profession: 'Lead Mobile Developer',
    languages: ['Bengali', 'English'],
    smoking: 'Non-smoker',
    drinking: 'Non-drinker',
    location: 'Dhaka, Bangladesh',
    distanceKm: 5,
    bio: 'Tech enthusiast, cricket fanatic, and avid traveler. Looking for a meaningful life partner who values family and adventure! 🏏🇧🇩',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=400',
    photos: [
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&q=80&w=800',
      'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&q=80&w=800'
    ],
    interests: ['Tech', 'Travel', 'Cricket', 'Coffee', 'Reading'],
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
    profileCompletionPercentage: 100,
    createdAt: '2026-03-24T08:00:00.000Z'
  }
];

export const INITIAL_MATCHES: Match[] = [
  {
    id: 'match_1',
    user1Id: 'usr_me',
    user2Id: 'usr_1', // Sophia
    createdAt: '2026-07-28T14:30:00.000Z',
    lastMessageAt: '2026-08-01T14:10:00.000Z',
    lastMessage: 'Sounds great! How about that coffee shop near Dolores Park tomorrow around 2 PM?'
  },
  {
    id: 'match_2',
    user1Id: 'usr_me',
    user2Id: 'usr_2', // Elena
    createdAt: '2026-07-30T18:15:00.000Z',
    lastMessageAt: '2026-07-30T19:00:00.000Z',
    lastMessage: 'You matched with Elena! Send a message to start conversing.'
  }
];

export const INITIAL_MESSAGES: Message[] = [
  {
    id: 'msg_1',
    matchId: 'match_1',
    senderId: 'usr_me',
    receiverId: 'usr_1',
    content: "Hey Sophia! Loved your architectural photography on your profile. Where was that rooftop shot taken?",
    createdAt: '2026-08-01T11:00:00.000Z',
    isRead: true
  },
  {
    id: 'msg_2',
    matchId: 'match_1',
    senderId: 'usr_1',
    receiverId: 'usr_me',
    content: "Hi Alex! Thank you so much! That was at the SF MOMA rooftop garden! Are you into photography too?",
    createdAt: '2026-08-01T11:15:00.000Z',
    isRead: true
  },
  {
    id: 'msg_3',
    matchId: 'match_1',
    senderId: 'usr_me',
    receiverId: 'usr_1',
    content: "Yes! Mostly 35mm film street photography when I get time off work. We should grab a coffee and exchange camera stories!",
    createdAt: '2026-08-01T13:45:00.000Z',
    isRead: true
  },
  {
    id: 'msg_4',
    matchId: 'match_1',
    senderId: 'usr_1',
    receiverId: 'usr_me',
    content: "Sounds great! How about that coffee shop near Dolores Park tomorrow around 2 PM?",
    createdAt: '2026-08-01T14:10:00.000Z',
    isRead: false
  }
];

export const INITIAL_NOTIFICATIONS: NotificationItem[] = [
  {
    id: 'notif_1',
    userId: 'usr_me',
    type: 'match',
    title: "It's a Match!",
    message: 'You and Sophia Chen liked each other. Start a conversation now!',
    targetId: 'match_1',
    senderUser: {
      id: 'usr_1',
      name: 'Sophia Chen',
      avatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400'
    },
    isRead: false,
    createdAt: '2026-07-28T14:30:00.000Z'
  },
  {
    id: 'notif_2',
    userId: 'usr_me',
    type: 'like',
    title: 'New Like Received',
    message: 'Elena Rostova liked your profile!',
    targetId: 'usr_2',
    senderUser: {
      id: 'usr_2',
      name: 'Elena Rostova',
      avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400'
    },
    isRead: true,
    createdAt: '2026-07-30T18:00:00.000Z'
  }
];

export const INITIAL_REPORTS: Report[] = [
  {
    id: 'rep_1',
    reporterId: 'usr_1',
    reportedUserId: 'usr_6',
    reporterName: 'Sophia Chen',
    reportedUserName: 'Aria Taylor',
    reason: 'Inappropriate behavior',
    details: 'Received unwanted messages that violated terms.',
    status: 'pending',
    createdAt: '2026-07-29T09:00:00.000Z'
  }
];
