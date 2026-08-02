export type Gender = 'female' | 'male' | 'non-binary' | 'other';
export type LookingFor = 'relationship' | 'dating' | 'friendship' | 'casual';
export type UserStatus = 'active' | 'suspended' | 'banned';
export type ReportStatus = 'pending' | 'resolved' | 'dismissed';
export type NotificationType = 'match' | 'message' | 'like' | 'system';

export interface PrivacySettings {
  hideOnline: boolean;
  hideDistance: boolean;
  hideAge: boolean;
  profileVisibility: 'public' | 'matches_only' | 'hidden';
}

export interface User {
  id: string;
  userIdNumber?: string; // Auto-generated unique ID like 483883
  username?: string; // Unique handle like @john_doe
  email: string;
  phone?: string;
  password?: string;
  name: string;
  dateOfBirth?: string; // YYYY-MM-DD for auto age calculation
  age: number;
  gender: Gender;
  lookingFor: LookingFor;
  
  // Extended Personal & Cultural Details
  maritalStatus?: 'Single' | 'Married' | 'Divorced' | 'Widowed' | 'Separated';
  relationshipStatus?: 'Marriage' | 'Long-term Relationship' | 'Casual Dating' | 'Friendship';
  religion?: 'Islam' | 'Hinduism' | 'Christianity' | 'Buddhism' | 'Secular' | 'Other';
  height?: string; // e.g. "5'8"" or "173 cm"
  
  // Location & Address (Public vs Private Visibility)
  country?: string; // e.g. "Bangladesh" or "United States"
  countryFlag?: string; // e.g. "🇧🇩" or "🇺🇸"
  divisionCity?: string; // Division / District / City
  fullAddress?: string; // Private (Hidden by default unless matched or admin)
  postalCode?: string; // Private
  location: string; // Display location (e.g. "Dhaka, Bangladesh")
  distanceKm: number;
  
  // Background & Lifestyle
  education?: string;
  schoolCollege?: string; // School / College / University name
  profession?: string;
  familyDetails?: string; // Family background, members, details for marriage matchmaking
  languages?: string[];
  smoking?: 'Non-smoker' | 'Occasional' | 'Smoker';
  drinking?: 'Non-drinker' | 'Socially' | 'Regular';
  usernameLastChangedAt?: string; // Date string for 14-day username update rule
  
  // Bio & Media
  bio: string;
  avatar: string; // Real profile photo
  photos: string[]; // Up to 10 photos
  interests: string[];
  
  // Status, Roles & Completion
  status: UserStatus;
  isOnline: boolean;
  lastActive: string;
  verified: boolean;
  role: 'user' | 'admin';
  privacySettings: PrivacySettings;
  profileCompletionPercentage?: number; // 0 - 100
  createdAt: string;
}

export interface Like {
  id: string;
  fromUserId: string;
  toUserId: string;
  type: 'like' | 'pass';
  createdAt: string;
}

export interface Match {
  id: string;
  user1Id: string;
  user2Id: string;
  createdAt: string;
  lastMessageAt: string;
  lastMessage?: string;
  user1?: User;
  user2?: User;
}

export interface Message {
  id: string;
  matchId: string;
  senderId: string;
  receiverId: string;
  content: string;
  imageUrl?: string;
  replyTo?: {
    id: string;
    content: string;
    senderName?: string;
  };
  createdAt: string;
  isRead: boolean;
}

export type CallStatus = 'ringing' | 'accepted' | 'rejected' | 'ended' | 'missed';

export interface VoiceCall {
  id: string;
  channelName: string;
  callerId: string;
  callerName: string;
  callerAvatar: string;
  receiverId: string;
  receiverName?: string;
  receiverAvatar?: string;
  matchId: string;
  status: CallStatus;
  createdAt: string;
  startedAt?: string;
  endedAt?: string;
}


export interface NotificationItem {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  officialLogo?: string;
  officialTitle?: string;
  targetId?: string; // e.g. matchId or profileId
  senderUser?: Partial<User>;
  isRead: boolean;
  createdAt: string;
}

export interface Report {
  id: string;
  reporterId: string;
  reportedUserId: string;
  reporterName?: string;
  reportedUserName?: string;
  reason: string;
  details: string;
  status: ReportStatus;
  createdAt: string;
}

export interface Block {
  id: string;
  blockerId: string;
  blockedUserId: string;
  createdAt: string;
}

export interface SearchFilters {
  minAge: number;
  maxAge: number;
  gender: 'all' | Gender;
  maxDistanceKm: number;
  interests: string[];
  searchQuery: string;
}

export interface AdminStats {
  totalUsers: number;
  activeUsers: number;
  totalMatches: number;
  pendingReports: number;
  bannedUsers: number;
  newUsersToday: number;
  dailyRegistrations: { date: string; count: number }[];
  matchTrends: { date: string; matches: number }[];
  genderBreakdown: { name: string; value: number }[];
}

export type UnlockStatus = 'pending' | 'approved' | 'rejected';

export interface PaymentConfig {
  bkashNumber: string;
  nagadNumber: string;
  unlockFeeBdt: number;
}

export interface UnlockRequest {
  id: string;
  userId: string;
  userName: string;
  userEmail?: string;
  targetUserId: string;
  targetUserName: string;
  targetUserPhone?: string;
  paymentMethod: 'bkash' | 'nagad';
  trxId: string;
  senderPhone: string;
  amount: number;
  status: UnlockStatus;
  adminNote?: string;
  createdAt: string;
  updatedAt?: string;
}

export interface UnlockedNumber {
  id: string;
  userId: string; // The user who paid and gets access
  targetUserId: string; // The member whose phone is unlocked
  unlockedAt: string;
  targetPhone: string;
}

export interface SystemSettings {
  appTitle: string;
  defaultRadiusKm: number;
  minAgeLimit: number;
  maxAgeLimit: number;
  popularInterests: string[];
  termsText: string;
  privacyText: string;
  paymentConfig?: PaymentConfig;
}

export interface StoryViewer {
  userId: string;
  userName: string;
  userAvatar: string;
  viewedAt: string;
}

export interface StoryComment {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  content: string;
  createdAt: string;
}

export interface StoryReaction {
  id: string;
  userId: string;
  userName?: string;
  type: 'heart';
  createdAt: string;
}

export interface Story {
  id: string;
  userId: string;
  userName: string;
  userAvatar: string;
  imageUrl: string;
  caption?: string;
  createdAt: string;
  viewers: StoryViewer[];
  reactions: StoryReaction[];
  comments: StoryComment[];
}
