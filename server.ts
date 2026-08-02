import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { createServer as createViteServer } from 'vite';
import agoraTokenPkg from 'agora-token';
const { RtcTokenBuilder, RtcRole } = agoraTokenPkg as any;
import {
  SEED_USERS,
  INITIAL_MATCHES,
  INITIAL_MESSAGES,
  INITIAL_NOTIFICATIONS,
  INITIAL_REPORTS,
  INITIAL_SYSTEM_SETTINGS
} from './src/data/seedData';
import {
  User,
  Like,
  Match,
  Message,
  NotificationItem,
  Report,
  Block,
  SystemSettings,
  AdminStats,
  Story,
  StoryViewer,
  StoryComment,
  StoryReaction
} from './src/types';

const app = express();
const PORT = 3000;

app.use(express.json({ limit: '10mb' }));

// In-Memory Data Store with Initial Seed Data
let users: User[] = [...SEED_USERS];
let likes: Like[] = [
  { id: 'l_1', fromUserId: 'usr_1', toUserId: 'usr_me', type: 'like', createdAt: '2026-07-28T14:00:00.000Z' },
  { id: 'l_2', fromUserId: 'usr_me', toUserId: 'usr_1', type: 'like', createdAt: '2026-07-28T14:30:00.000Z' },
  { id: 'l_3', fromUserId: 'usr_2', toUserId: 'usr_me', type: 'like', createdAt: '2026-07-30T18:00:00.000Z' }
];
let matches: Match[] = [...INITIAL_MATCHES];
let messages: Message[] = [...INITIAL_MESSAGES];
let notifications: NotificationItem[] = [...INITIAL_NOTIFICATIONS];
let reports: Report[] = [...INITIAL_REPORTS];
let blocks: Block[] = [];
let systemSettings: SystemSettings = { ...INITIAL_SYSTEM_SETTINGS };
let unlockRequests: any[] = [];
let unlockedNumbers: any[] = [];
let paymentConfig = {
  bkashNumber: '01647783682',
  nagadNumber: '01647783682',
  unlockFeeBdt: 100
};

// Stories initial seed store
let stories: Story[] = [
  {
    id: 'story_1',
    userId: 'usr_1',
    userName: 'Sophia Chen',
    userAvatar: 'https://images.unsplash.com/photo-1524504388940-b1c1722653e1?auto=format&fit=crop&q=80&w=400',
    imageUrl: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=1000',
    caption: 'Golden hour at Dolores Park! 🌅✨',
    createdAt: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    viewers: [
      {
        userId: 'usr_admin',
        userName: 'System Admin',
        userAvatar: 'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?auto=format&fit=crop&q=80&w=400',
        viewedAt: new Date(Date.now() - 1 * 60 * 60 * 1000).toISOString()
      }
    ],
    reactions: [],
    comments: []
  },
  {
    id: 'story_2',
    userId: 'usr_2',
    userName: 'Elena Rostova',
    userAvatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&q=80&w=400',
    imageUrl: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&q=80&w=1000',
    caption: 'Weekend coastal drive 🌊🌴',
    createdAt: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    viewers: [],
    reactions: [],
    comments: []
  }
];

// Current session helper
let currentUserId = 'usr_me';

// ================= API ROUTES ================= //

// --- Auth Routes ---
app.post('/api/auth/login', (req: Request, res: Response) => {
  const { identity, password } = req.body; // identity can be email or phone
  if (!identity || !password) {
    return res.status(400).json({ error: 'Email/Phone and password are required' });
  }

  const user = users.find(
    u => (u.email.toLowerCase() === identity.toLowerCase() || u.phone === identity) && u.password === password
  );

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials. Please check your email/phone and password.' });
  }

  if (user.status === 'banned') {
    return res.status(403).json({ error: 'Your account has been permanently banned due to community guidelines violations.' });
  }

  if (user.status === 'suspended') {
    return res.status(403).json({ error: 'Your account is currently suspended. Please contact admin support.' });
  }

  currentUserId = user.id;
  res.json({ user, token: 'fake_jwt_token_' + user.id });
});

app.post('/api/auth/register', (req: Request, res: Response) => {
  const { email, phone, password, name, age, gender, location, lookingFor } = req.body;

  if (!name || !password || (!email && !phone)) {
    return res.status(400).json({ error: 'Name, password, and email or phone number are required.' });
  }

  if (email && users.some(u => u.email.toLowerCase() === email.toLowerCase())) {
    return res.status(400).json({ error: 'An account with this email already exists.' });
  }

  const newUser: User = {
    id: 'usr_' + Date.now(),
    email: email || `${name.toLowerCase().replace(/\s+/g, '')}@example.com`,
    phone: phone || '',
    password,
    name,
    age: Number(age) || 24,
    gender: gender || 'female',
    location: location || 'San Francisco, CA',
    distanceKm: Math.floor(Math.random() * 15) + 1,
    bio: 'Hey there! I am new here and looking forward to making genuine connections.',
    avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=400',
    photos: ['https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=800'],
    interests: ['Coffee', 'Music', 'Travel'],
    lookingFor: lookingFor || 'relationship',
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
    createdAt: new Date().toISOString()
  };

  users.push(newUser);
  currentUserId = newUser.id;

  // Add welcome notification
  notifications.push({
    id: 'notif_' + Date.now(),
    userId: newUser.id,
    type: 'system',
    title: 'Welcome to HeartSync! ✨',
    message: 'Your profile is ready. Start browsing to find your matches!',
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ user: newUser, token: 'fake_jwt_token_' + newUser.id });
});

app.get('/api/auth/me', (req: Request, res: Response) => {
  const user = users.find(u => u.id === currentUserId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  res.json({ user });
});

// Quick Switch user demo helper
app.post('/api/auth/switch-user', (req: Request, res: Response) => {
  const { userId } = req.body;
  const user = users.find(u => u.id === userId);
  if (!user) {
    return res.status(404).json({ error: 'User not found' });
  }
  currentUserId = user.id;
  res.json({ user });
});

// --- User Profiles & Browse Routes ---
app.get('/api/users', (req: Request, res: Response) => {
  const me = users.find(u => u.id === currentUserId);
  if (!me) return res.status(401).json({ error: 'Unauthorized' });

  // Get list of users current user has already acted on (liked/passed/blocked)
  const actedUserIds = new Set([
    me.id,
    ...likes.filter(l => l.fromUserId === me.id).map(l => l.toUserId),
    ...blocks.filter(b => b.blockerId === me.id || b.blockedUserId === me.id).map(b => b.blockerId === me.id ? b.blockedUserId : b.blockerId)
  ]);

  const { minAge, maxAge, gender, maxDistanceKm, interests, query } = req.query;

  let filtered = users.filter(u => u.status === 'active' && !actedUserIds.has(u.id));

  // Filters
  if (minAge) filtered = filtered.filter(u => u.age >= Number(minAge));
  if (maxAge) filtered = filtered.filter(u => u.age <= Number(maxAge));
  if (gender && gender !== 'all') filtered = filtered.filter(u => u.gender === gender);
  if (maxDistanceKm) filtered = filtered.filter(u => u.distanceKm <= Number(maxDistanceKm));
  if (interests) {
    const interestArr = (interests as string).split(',');
    filtered = filtered.filter(u => interestArr.some(i => u.interests.includes(i)));
  }
  if (query) {
    const q = (query as string).toLowerCase();
    filtered = filtered.filter(
      u => u.name.toLowerCase().includes(q) || u.bio.toLowerCase().includes(q) || u.location.toLowerCase().includes(q)
    );
  }

  res.json({ users: filtered });
});

app.get('/api/users/:id', (req: Request, res: Response) => {
  const user = users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json({ user });
});

app.put('/api/users/profile', (req: Request, res: Response) => {
  const index = users.findIndex(u => u.id === currentUserId);
  if (index === -1) return res.status(404).json({ error: 'User not found' });

  const { name, age, gender, location, bio, avatar, photos, interests, lookingFor, privacySettings } = req.body;

  users[index] = {
    ...users[index],
    ...(name && { name }),
    ...(age && { age: Number(age) }),
    ...(gender && { gender }),
    ...(location && { location }),
    ...(bio !== undefined && { bio }),
    ...(avatar && { avatar }),
    ...(photos && { photos }),
    ...(interests && { interests }),
    ...(lookingFor && { lookingFor }),
    ...(privacySettings && { privacySettings: { ...users[index].privacySettings, ...privacySettings } })
  };

  res.json({ user: users[index] });
});

// --- Likes & Match System ---
app.post('/api/likes', (req: Request, res: Response) => {
  const { toUserId, type } = req.body; // type: 'like' | 'pass'
  if (!toUserId || !type) return res.status(400).json({ error: 'Target user ID and action type are required' });

  const newLike: Like = {
    id: 'l_' + Date.now(),
    fromUserId: currentUserId,
    toUserId,
    type,
    createdAt: new Date().toISOString()
  };

  likes.push(newLike);

  if (type === 'pass') {
    return res.json({ isMatch: false });
  }

  // Check if target user has already liked current user
  const reciprocalLike = likes.find(
    l => l.fromUserId === toUserId && l.toUserId === currentUserId && l.type === 'like'
  );

  if (reciprocalLike) {
    // IT'S A MATCH!
    const targetUser = users.find(u => u.id === toUserId);
    const currentUser = users.find(u => u.id === currentUserId);

    const newMatch: Match = {
      id: 'match_' + Date.now(),
      user1Id: currentUserId,
      user2Id: toUserId,
      createdAt: new Date().toISOString(),
      lastMessageAt: new Date().toISOString(),
      lastMessage: "You matched! Say hello! 👋",
      user1: currentUser,
      user2: targetUser
    };

    matches.push(newMatch);

    // Create notifications for both users
    notifications.push({
      id: 'notif_' + Date.now() + '_1',
      userId: currentUserId,
      type: 'match',
      title: "It's a Match! 🎉",
      message: `You and ${targetUser?.name || 'a user'} liked each other! Start chatting now.`,
      targetId: newMatch.id,
      senderUser: targetUser,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    notifications.push({
      id: 'notif_' + Date.now() + '_2',
      userId: toUserId,
      type: 'match',
      title: "It's a Match! 🎉",
      message: `You and ${currentUser?.name || 'a user'} liked each other! Start chatting now.`,
      targetId: newMatch.id,
      senderUser: currentUser,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.json({ isMatch: true, match: newMatch, matchedUser: targetUser });
  } else {
    // Notify target user about new like
    const sender = users.find(u => u.id === currentUserId);
    notifications.push({
      id: 'notif_' + Date.now(),
      userId: toUserId,
      type: 'like',
      title: 'New Like! ❤️',
      message: `${sender?.name || 'Someone'} liked your profile!`,
      targetId: currentUserId,
      senderUser: sender,
      isRead: false,
      createdAt: new Date().toISOString()
    });

    return res.json({ isMatch: false });
  }
});

app.get('/api/likes-you', (req: Request, res: Response) => {
  // Get list of users who liked current user but current user hasn't acted on yet
  const userLikes = likes.filter(l => l.fromUserId === currentUserId).map(l => l.toUserId);
  const userBlocks = blocks.filter(b => b.blockerId === currentUserId || b.blockedUserId === currentUserId).map(b => b.blockerId === currentUserId ? b.blockedUserId : b.blockerId);

  const incomingLikes = likes.filter(
    l => l.toUserId === currentUserId && l.type === 'like' && !userLikes.includes(l.fromUserId) && !userBlocks.includes(l.fromUserId)
  );

  const likers = incomingLikes
    .map(l => users.find(u => u.id === l.fromUserId))
    .filter((u): u is User => u !== undefined && u.status === 'active');

  res.json({ likers });
});

app.get('/api/matches', (req: Request, res: Response) => {
  const userMatches = matches.filter(
    m => m.user1Id === currentUserId || m.user2Id === currentUserId
  );

  // Populate user data
  const populated = userMatches.map(m => {
    const otherUserId = m.user1Id === currentUserId ? m.user2Id : m.user1Id;
    const otherUser = users.find(u => u.id === otherUserId);
    return {
      ...m,
      otherUser
    };
  }).filter(m => m.otherUser && m.otherUser.status === 'active');

  res.json({ matches: populated });
});

// --- Private Chat System (Only for Matched Users) ---
app.get('/api/messages/:matchId', (req: Request, res: Response) => {
  const { matchId } = req.params;
  const match = matches.find(m => m.id === matchId && (m.user1Id === currentUserId || m.user2Id === currentUserId));

  if (!match) {
    return res.status(403).json({ error: 'Private chat is only accessible to matched users.' });
  }

  const matchMessages = messages.filter(m => m.matchId === matchId);

  // Mark messages as read
  matchMessages.forEach(m => {
    if (m.receiverId === currentUserId) m.isRead = true;
  });

  res.json({ messages: matchMessages });
});

app.post('/api/messages/:matchId', (req: Request, res: Response) => {
  const { matchId } = req.params;
  const { content, imageUrl, replyTo } = req.body;

  const match = matches.find(m => m.id === matchId && (m.user1Id === currentUserId || m.user2Id === currentUserId));

  if (!match) {
    return res.status(403).json({ error: 'Private chat is only accessible to matched users.' });
  }

  if (!content && !imageUrl) {
    return res.status(400).json({ error: 'Message content or image is required.' });
  }

  const receiverId = match.user1Id === currentUserId ? match.user2Id : match.user1Id;

  const newMessage: Message = {
    id: 'msg_' + Date.now(),
    matchId,
    senderId: currentUserId,
    receiverId,
    content: content || '📷 Photo attachment',
    imageUrl,
    replyTo,
    createdAt: new Date().toISOString(),
    isRead: false
  };

  messages.push(newMessage);

  // Update match last message
  match.lastMessageAt = newMessage.createdAt;
  match.lastMessage = newMessage.content;

  // Send notification to receiver
  const sender = users.find(u => u.id === currentUserId);
  notifications.push({
    id: 'notif_' + Date.now(),
    userId: receiverId,
    type: 'message',
    title: `New message from ${sender?.name || 'Match'}`,
    message: newMessage.content,
    targetId: matchId,
    senderUser: sender,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.status(201).json({ message: newMessage });
});

// --- STORIES API ROUTES (24h Real-time Expiration, Viewers, Reactions, 1-Comment DM) ---

// 1. Get all active stories (Filter out expired > 24 hours)
app.get('/api/stories', (req: Request, res: Response) => {
  const cutoff = Date.now() - 24 * 60 * 60 * 1000;
  // Automatically remove expired stories
  stories = stories.filter(s => new Date(s.createdAt).getTime() >= cutoff);
  res.json({ stories });
});

// 2. Post a new story
app.post('/api/stories', (req: Request, res: Response) => {
  const { imageUrl, caption } = req.body;
  if (!imageUrl) {
    return res.status(400).json({ error: 'Image URL/file is required to post a story.' });
  }

  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  const newStory: Story = {
    id: 'story_' + Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    imageUrl,
    caption: caption || '',
    createdAt: new Date().toISOString(),
    viewers: [],
    reactions: [],
    comments: []
  };

  stories.unshift(newStory);
  res.status(201).json({ story: newStory });
});

// 3. Track story view
app.post('/api/stories/:id/view', (req: Request, res: Response) => {
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const currentUser = users.find(u => u.id === currentUserId);
  if (currentUser && currentUser.id !== story.userId) {
    if (!story.viewers.some(v => v.userId === currentUser.id)) {
      story.viewers.push({
        userId: currentUser.id,
        userName: currentUser.name,
        userAvatar: currentUser.avatar,
        viewedAt: new Date().toISOString()
      });
    }
  }

  res.json({ story });
});

// 4. React to a story (Heart Love reaction)
app.post('/api/stories/:id/react', (req: Request, res: Response) => {
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  // Toggle or add reaction
  const existingIndex = story.reactions.findIndex(r => r.userId === currentUser.id);
  if (existingIndex >= 0) {
    story.reactions.splice(existingIndex, 1);
  } else {
    story.reactions.push({
      id: 'react_' + Date.now(),
      userId: currentUser.id,
      userName: currentUser.name,
      type: 'heart',
      createdAt: new Date().toISOString()
    });

    // Notify story owner
    if (story.userId !== currentUser.id) {
      notifications.unshift({
        id: 'notif_react_' + Date.now(),
        userId: story.userId,
        type: 'like',
        title: 'Story Love Reaction ❤️',
        message: `${currentUser.name} loved your story!`,
        targetId: story.id,
        senderUser: currentUser,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    }
  }

  res.json({ story });
});

// 5. Comment on a story (STRICT 1 Comment limit & sends to direct message box)
app.post('/api/stories/:id/comment', (req: Request, res: Response) => {
  const { content } = req.body;
  if (!content || !content.trim()) {
    return res.status(400).json({ error: 'Comment text is required.' });
  }

  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });

  const currentUser = users.find(u => u.id === currentUserId);
  if (!currentUser) return res.status(401).json({ error: 'Unauthorized' });

  // Check 1 comment limit per story!
  const hasCommented = story.comments.some(c => c.userId === currentUser.id);
  if (hasCommented) {
    return res.status(400).json({ error: 'You can only send ONE comment per story.' });
  }

  const newComment: StoryComment = {
    id: 'st_cmt_' + Date.now(),
    userId: currentUser.id,
    userName: currentUser.name,
    userAvatar: currentUser.avatar,
    content: content.trim(),
    createdAt: new Date().toISOString()
  };

  story.comments.push(newComment);

  // Send Direct Message to story owner's chat box!
  if (story.userId !== currentUser.id) {
    // Find or create match/chat between currentUser and story.userId
    let match = matches.find(
      m => (m.user1Id === currentUser.id && m.user2Id === story.userId) || (m.user1Id === story.userId && m.user2Id === currentUser.id)
    );

    if (!match) {
      const targetUser = users.find(u => u.id === story.userId);
      match = {
        id: 'match_story_' + Date.now(),
        user1Id: currentUser.id,
        user2Id: story.userId,
        createdAt: new Date().toISOString(),
        lastMessageAt: new Date().toISOString(),
        lastMessage: `💬 Story reply: ${content.trim()}`,
        user1: currentUser,
        user2: targetUser
      };
      matches.unshift(match);
    }

    const storyMessage: Message = {
      id: 'msg_st_' + Date.now(),
      matchId: match.id,
      senderId: currentUser.id,
      receiverId: story.userId,
      content: `💬 Replied to your story: "${content.trim()}"`,
      imageUrl: story.imageUrl,
      createdAt: new Date().toISOString(),
      isRead: false
    };

    messages.push(storyMessage);
    match.lastMessageAt = storyMessage.createdAt;
    match.lastMessage = storyMessage.content;

    // Send notification to story owner
    notifications.unshift({
      id: 'notif_st_cmt_' + Date.now(),
      userId: story.userId,
      type: 'message',
      title: `Story Comment from ${currentUser.name} 💬`,
      message: `"${content.trim()}" - Tap to view in chat.`,
      targetId: match.id,
      senderUser: currentUser,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  }

  res.status(201).json({ story, comment: newComment });
});

// Delete story
app.delete('/api/stories/:id', (req: Request, res: Response) => {
  const story = stories.find(s => s.id === req.params.id);
  if (!story) return res.status(404).json({ error: 'Story not found' });
  if (story.userId !== currentUserId) {
    return res.status(403).json({ error: 'You can only delete your own stories.' });
  }

  stories = stories.filter(s => s.id !== req.params.id);
  res.json({ success: true });
});

// --- Agora RTC Token Endpoint ---
app.get('/api/agora/token', (req: Request, res: Response) => {
  const channelName = (req.query.channelName as string) || 'dating_call_' + Date.now();
  const uid = Number(req.query.uid) || Math.floor(Math.random() * 100000);
  const builder = RtcTokenBuilder || (agoraTokenPkg as any)?.default?.RtcTokenBuilder;
  const roleVal = (RtcRole?.PUBLISHER !== undefined ? RtcRole.PUBLISHER : (agoraTokenPkg as any)?.default?.RtcRole?.PUBLISHER) ?? 1;

  const appId = process.env.AGORA_APP_ID || 'a1b2c3d4e5f678901234567890abcdef';
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || '';

  const expirationTimeInSeconds = 3600 * 2;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  try {
    let token = '';
    if (appId && appCertificate && builder) {
      token = builder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        roleVal,
        privilegeExpiredTs,
        privilegeExpiredTs
      );
    }
    res.json({ token, appId, channelName, uid });
  } catch (err: any) {
    console.error('Error generating Agora token:', err);
    res.json({ token: '', appId, channelName, uid });
  }
});


// --- Notifications Routes ---
app.get('/api/notifications', (req: Request, res: Response) => {
  const userNotifs = notifications
    .filter(n => n.userId === currentUserId)
    .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());

  res.json({ notifications: userNotifs });
});

app.post('/api/notifications/read', (req: Request, res: Response) => {
  notifications.forEach(n => {
    if (n.userId === currentUserId) n.isRead = true;
  });
  res.json({ success: true });
});

// --- Payment & Phone Unlock Routes ---
app.get('/api/payment-config', (req: Request, res: Response) => {
  res.json({ config: paymentConfig });
});

app.post('/api/admin/payment-config', (req: Request, res: Response) => {
  const { bkashNumber, nagadNumber, unlockFeeBdt } = req.body;
  if (bkashNumber) paymentConfig.bkashNumber = bkashNumber;
  if (nagadNumber) paymentConfig.nagadNumber = nagadNumber;
  if (unlockFeeBdt !== undefined) paymentConfig.unlockFeeBdt = Number(unlockFeeBdt);

  res.json({ success: true, config: paymentConfig });
});

app.get('/api/unlock-requests', (req: Request, res: Response) => {
  const currentUser = users.find(u => u.id === currentUserId);
  if (currentUser?.role === 'admin') {
    return res.json({ requests: unlockRequests });
  }
  const userReqs = unlockRequests.filter(r => r.userId === currentUserId);
  res.json({ requests: userReqs });
});

app.post('/api/unlock-requests', (req: Request, res: Response) => {
  const reqData = req.body;
  if (!reqData || !reqData.targetUserId || !reqData.trxId) {
    return res.status(400).json({ error: 'Target user and Transaction ID are required' });
  }

  const existingIndex = unlockRequests.findIndex(r => r.id === reqData.id);
  if (existingIndex >= 0) {
    unlockRequests[existingIndex] = reqData;
  } else {
    unlockRequests.unshift(reqData);
  }

  // Notify admins in real-time
  users.filter(u => u.role === 'admin').forEach(admin => {
    notifications.unshift({
      id: 'notif_' + Date.now() + '_' + Math.random().toString(36).substring(2, 5),
      userId: admin.id,
      type: 'system',
      title: '💳 New Phone Unlock Payment Request',
      message: `${reqData.userName} submitted a ৳${reqData.amount} ${reqData.paymentMethod?.toUpperCase()} payment (TrxID: ${reqData.trxId}) to unlock ${reqData.targetUserName}'s number.`,
      targetId: reqData.id,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  res.status(201).json({ success: true, request: reqData });
});

app.get('/api/unlocked-numbers', (req: Request, res: Response) => {
  const userUnlocks = unlockedNumbers.filter(u => u.userId === currentUserId);
  res.json({ unlocked: userUnlocks });
});

app.post('/api/unlock-requests/:id/approve', (req: Request, res: Response) => {
  const { id } = req.params;
  const { targetPhone } = req.body;
  const reqItem = unlockRequests.find(r => r.id === id);

  if (!reqItem) {
    return res.status(404).json({ error: 'Request not found' });
  }

  reqItem.status = 'approved';
  reqItem.updatedAt = new Date().toISOString();

  const targetUser = users.find(u => u.id === reqItem.targetUserId);
  const phoneToUnlock = targetPhone || targetUser?.phone || '01700000000';

  const unlockEntry = {
    id: `unlock_${reqItem.userId}_${reqItem.targetUserId}`,
    userId: reqItem.userId,
    targetUserId: reqItem.targetUserId,
    targetPhone: phoneToUnlock,
    unlockedAt: new Date().toISOString()
  };

  if (!unlockedNumbers.some(u => u.id === unlockEntry.id)) {
    unlockedNumbers.push(unlockEntry);
  }

  // Real-time Notification to requesting user
  notifications.unshift({
    id: 'notif_app_' + Date.now(),
    userId: reqItem.userId,
    type: 'system',
    title: '🎉 Payment Verified & Phone Number Unlocked!',
    message: `Your payment for ${reqItem.targetUserName}'s phone number was verified and approved by admin. Number: ${phoneToUnlock}`,
    targetId: reqItem.targetUserId,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, request: reqItem, unlock: unlockEntry });
});

app.post('/api/unlock-requests/:id/reject', (req: Request, res: Response) => {
  const { id } = req.params;
  const { adminNote } = req.body;
  const reqItem = unlockRequests.find(r => r.id === id);

  if (!reqItem) {
    return res.status(404).json({ error: 'Request not found' });
  }

  reqItem.status = 'rejected';
  reqItem.adminNote = adminNote || 'Transaction ID not verified';
  reqItem.updatedAt = new Date().toISOString();

  // Real-time Notification to requesting user
  notifications.unshift({
    id: 'notif_rej_' + Date.now(),
    userId: reqItem.userId,
    type: 'system',
    title: '❌ Payment Verification Failed',
    message: `Your unlock request for ${reqItem.targetUserName} was rejected. Reason: ${reqItem.adminNote}`,
    targetId: reqItem.targetUserId,
    isRead: false,
    createdAt: new Date().toISOString()
  });

  res.json({ success: true, request: reqItem });
});

// --- Reports & Blocks Routes ---
app.post('/api/reports', (req: Request, res: Response) => {
  const { reportedUserId, reason, details } = req.body;
  if (!reportedUserId || !reason) {
    return res.status(400).json({ error: 'Reported user ID and reason are required.' });
  }

  const reporter = users.find(u => u.id === currentUserId);
  const reportedUser = users.find(u => u.id === reportedUserId);

  const newReport: Report = {
    id: 'rep_' + Date.now(),
    reporterId: currentUserId,
    reportedUserId,
    reporterName: reporter?.name || 'Anonymous User',
    reportedUserName: reportedUser?.name || 'Unknown User',
    reason,
    details: details || '',
    status: 'pending',
    createdAt: new Date().toISOString()
  };

  reports.push(newReport);
  res.status(201).json({ report: newReport, message: 'Report submitted successfully. Our admin team will review it.' });
});

app.post('/api/blocks', (req: Request, res: Response) => {
  const { blockedUserId } = req.body;
  if (!blockedUserId) return res.status(400).json({ error: 'Target user ID is required' });

  const newBlock: Block = {
    id: 'blk_' + Date.now(),
    blockerId: currentUserId,
    blockedUserId,
    createdAt: new Date().toISOString()
  };

  blocks.push(newBlock);

  // Remove active matches if any
  matches = matches.filter(
    m => !( (m.user1Id === currentUserId && m.user2Id === blockedUserId) || (m.user2Id === currentUserId && m.user1Id === blockedUserId) )
  );

  res.status(201).json({ message: 'User blocked successfully.' });
});

app.get('/api/blocks', (req: Request, res: Response) => {
  const userBlocks = blocks.filter(b => b.blockerId === currentUserId);
  const blockedUsers = userBlocks.map(b => users.find(u => u.id === b.blockedUserId)).filter(Boolean);
  res.json({ blockedUsers });
});

app.delete('/api/blocks/:id', (req: Request, res: Response) => {
  blocks = blocks.filter(b => !(b.blockerId === currentUserId && b.blockedUserId === req.params.id));
  res.json({ message: 'User unblocked successfully.' });
});

// --- ADMIN PANEL API ENDPOINTS ---

// Middleware to check admin role
const requireAdmin = (req: Request, res: Response, next: any) => {
  const adminUser = users.find(u => u.id === currentUserId);
  if (!adminUser || adminUser.role !== 'admin') {
    return res.status(403).json({ error: 'Access denied. Admin privileges required.' });
  }
  next();
};

app.get('/api/admin/stats', requireAdmin, (req: Request, res: Response) => {
  const stats: AdminStats = {
    totalUsers: users.length,
    activeUsers: users.filter(u => u.status === 'active').length,
    totalMatches: matches.length,
    pendingReports: reports.filter(r => r.status === 'pending').length,
    bannedUsers: users.filter(u => u.status === 'banned' || u.status === 'suspended').length,
    newUsersToday: 3,
    dailyRegistrations: [
      { date: 'Mon', count: 12 },
      { date: 'Tue', count: 19 },
      { date: 'Wed', count: 15 },
      { date: 'Thu', count: 22 },
      { date: 'Fri', count: 28 },
      { date: 'Sat', count: 35 },
      { date: 'Sun', count: 30 }
    ],
    matchTrends: [
      { date: 'Mon', matches: 8 },
      { date: 'Tue', matches: 14 },
      { date: 'Wed', matches: 12 },
      { date: 'Thu', matches: 18 },
      { date: 'Fri', matches: 24 },
      { date: 'Sat', matches: 31 },
      { date: 'Sun', matches: 27 }
    ],
    genderBreakdown: [
      { name: 'Female', value: users.filter(u => u.gender === 'female').length },
      { name: 'Male', value: users.filter(u => u.gender === 'male').length },
      { name: 'Non-Binary', value: users.filter(u => u.gender === 'non-binary').length }
    ]
  };

  res.json({ stats });
});

app.get('/api/admin/users', requireAdmin, (req: Request, res: Response) => {
  res.json({ users });
});

app.put('/api/admin/users/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status } = req.body; // 'active' | 'suspended' | 'banned'

  const user = users.find(u => u.id === id);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.status = status;
  res.json({ user, message: `User status updated to ${status}.` });
});

app.delete('/api/admin/users/:id', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  users = users.filter(u => u.id !== id);
  matches = matches.filter(m => m.user1Id !== id && m.user2Id !== id);
  res.json({ message: 'User deleted successfully.' });
});

app.get('/api/admin/reports', requireAdmin, (req: Request, res: Response) => {
  res.json({ reports });
});

app.put('/api/admin/reports/:id/status', requireAdmin, (req: Request, res: Response) => {
  const { id } = req.params;
  const { status, banReportedUser } = req.body; // 'resolved' | 'dismissed'

  const report = reports.find(r => r.id === id);
  if (!report) return res.status(404).json({ error: 'Report not found' });

  report.status = status;

  if (banReportedUser) {
    const reported = users.find(u => u.id === report.reportedUserId);
    if (reported) reported.status = 'banned';
  }

  res.json({ report, message: 'Report updated successfully.' });
});

app.get('/api/admin/matches', requireAdmin, (req: Request, res: Response) => {
  const populatedMatches = matches.map(m => ({
    ...m,
    user1: users.find(u => u.id === m.user1Id),
    user2: users.find(u => u.id === m.user2Id)
  }));

  res.json({ matches: populatedMatches });
});

app.post('/api/admin/notifications/send', requireAdmin, (req: Request, res: Response) => {
  const { targetType, targetUserId, title, message, officialLogo, officialTitle } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  const logo = officialLogo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
  const senderName = officialTitle || 'HeartSync Official (অফিশিয়াল সাপোর্ট)';

  let targetCount = 0;

  if (targetType === 'individual' && targetUserId) {
    notifications.unshift({
      id: 'notif_' + Date.now() + '_' + targetUserId,
      userId: targetUserId,
      type: 'system',
      title: `📢 ${title}`,
      message,
      officialLogo: logo,
      officialTitle: senderName,
      isRead: false,
      createdAt: new Date().toISOString()
    });
    targetCount = 1;
  } else {
    // Broadcast to ALL users
    users.forEach(u => {
      notifications.unshift({
        id: 'notif_' + Date.now() + '_' + u.id,
        userId: u.id,
        type: 'system',
        title: `📢 ${title}`,
        message,
        officialLogo: logo,
        officialTitle: senderName,
        isRead: false,
        createdAt: new Date().toISOString()
      });
    });
    targetCount = users.length;
  }

  res.json({ success: true, count: targetCount, message: `Notification sent successfully to ${targetCount} member(s).` });
});

app.post('/api/admin/notifications/broadcast', requireAdmin, (req: Request, res: Response) => {
  const { title, message, officialLogo, officialTitle } = req.body;
  if (!title || !message) return res.status(400).json({ error: 'Title and message are required' });

  const logo = officialLogo || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&q=80&w=250';
  const senderName = officialTitle || 'HeartSync Official (অফিশিয়াল সাপোর্ট)';

  users.forEach(u => {
    notifications.unshift({
      id: 'notif_' + Date.now() + '_' + u.id,
      userId: u.id,
      type: 'system',
      title: `📢 ${title}`,
      message,
      officialLogo: logo,
      officialTitle: senderName,
      isRead: false,
      createdAt: new Date().toISOString()
    });
  });

  res.json({ message: `Broadcast sent to ${users.length} users.` });
});

app.get('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  res.json({ settings: systemSettings });
});

app.put('/api/admin/settings', requireAdmin, (req: Request, res: Response) => {
  systemSettings = { ...systemSettings, ...req.body };
  res.json({ settings: systemSettings, message: 'System settings updated.' });
});

// --- VITE MIDDLEWARE & STATIC SERVING ---
async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req: Request, res: Response) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Dating App Server listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
});
